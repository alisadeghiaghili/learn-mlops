import type { CommandResult, MlopsState, ModelRef, Run, ServiceEndpoint } from './types';
import { fakeMd5, shortMd5 } from './hash';
import { teachAfterCommand } from './teach';
import { findConcept, formatConcepts } from './glossary';
import { tokenize } from './tokenizer';
import {
  cloneState,
  currentVersion,
  datasetRefOf,
  lightStage,
  lifecycleRail,
  logEvent,
  parseKeyValue,
  setParam,
  stubStage,
} from './state';

/** Golf count: only the lifecycle/config mutations count toward the clean-run target. */
const COUNTING =
  /^(ml (init|data add|train run|model register|deploy|monitor|rollback|params set|predict)\b|edit |rm )/;

export function commandCountsForGolf(raw: string): boolean {
  return COUNTING.test(raw.trim());
}

function ok(output: string): CommandResult {
  return { ok: true, output };
}

function fail(error: string): CommandResult {
  return { ok: false, output: '', error };
}

function requireInit(state: MlopsState): CommandResult | null {
  if (!state.initialized) {
    return fail('ERROR: this is not an MLOps project. Run `ml init` first.');
  }
  return null;
}

const DEFAULT_ENDPOINT = 'prod';

function resolveEndpoint(state: MlopsState, name?: string): string {
  const e = name ?? DEFAULT_ENDPOINT;
  if (!state.endpoints[e]) {
    // Lazily create the canonical endpoint if a level didn't seed it.
    state.endpoints[e] = {
      name: e,
      live: false,
      modelRef: null,
      predictionsServed: 0,
      monitoring: { enabled: false, window: [], driftAlert: false },
    };
  }
  return e;
}

function findRun(state: MlopsState, id: string): Run | undefined {
  return state.runs.find((r) => r.id === id || r.id.startsWith(id));
}

/** The registered model version that a run produced, if any. */
function modelRefForRun(state: MlopsState, run: Run): ModelRef | undefined {
  for (const model of Object.values(state.registry)) {
    const v = model.versions.find((mv) => mv.runId === run.id);
    if (v) return { name: model.name, version: v.version };
  }
  return undefined;
}

/** Resolve a deploy target given either a run id or a `model:version` ref. */
function resolveDeployTarget(state: MlopsState, arg: string): { ref: ModelRef; run?: Run } | null {
  if (arg.includes(':')) {
    const [name, vstr] = arg.split(':');
    const model = state.registry[name];
    if (!model) return null;
    const version = Number(vstr);
    if (!model.versions.some((v) => v.version === version)) return null;
    return { ref: { name, version } };
  }
  const run = findRun(state, arg);
  if (!run) return null;
  const ref = modelRefForRun(state, run);
  if (!ref) return null;
  return { ref, run };
}

function syntheticMetrics(state: MlopsState, params: Record<string, string | number>): Record<string, number> {
  const lr = Number(params.lr ?? 0.1);
  const depth = Number(params.depth ?? params.n_estimators ?? 10);
  const dv = currentVersion(state, 'train') * 0.005;
  const acc = Math.min(0.99, 0.5 + Math.min(0.45, depth * 0.02) + (lr > 0 && lr < 0.3 ? 0.08 : 0) + dv);
  return {
    acc: Number(acc.toFixed(4)),
    loss: Number((1 - acc).toFixed(4)),
    f1: Number(Math.max(0, acc - 0.01).toFixed(4)),
  };
}

function statusLines(state: MlopsState): string {
  if (!state.initialized) return 'ERROR: not an MLOps project.';
  const lines: string[] = ['project: initialized'];
  for (const d of Object.values(state.datasets)) {
    const drift = d.drift && d.drift.enabled ? ` drift=${d.drift.score.toFixed(2)}` : '';
    lines.push(`dataset ${d.name}: ${d.current !== null ? `v${d.current}` : 'unversioned'}${drift}`);
  }
  for (const model of Object.values(state.registry)) {
    lines.push(`model ${model.name}: v${model.current} (${model.versions.length} version(s))`);
  }
  for (const e of Object.values(state.endpoints)) {
    const mon = e.monitoring.enabled ? ' monitoring=on' : ' monitoring=off';
    const ref = e.modelRef ? ` → ${e.modelRef.name}:v${e.modelRef.version}` : ' cold';
    lines.push(`endpoint ${e.name}: ${e.live ? 'live' : 'offline'}${ref}${mon}`);
  }
  for (const [name, t] of Object.entries(state.rollbackTargets)) {
    lines.push(`rollback ${name}: → ${t.modelRef.name}:v${t.modelRef.version}`);
  }
  if (state.runs.length) lines.push(`runs: ${state.runs.map((r) => r.id).join(', ')}`);
  return lines.join('\n');
}

function ensureEndpoint(state: MlopsState, name?: string): ServiceEndpoint {
  return state.endpoints[resolveEndpoint(state, name)];
}

export function executeCommand(prev: MlopsState, rawInput: string): { state: MlopsState; result: CommandResult } {
  const raw = rawInput.trim();
  const out = executeCommandInner(prev, rawInput);
  if (out.result.ok && raw) {
    out.state.commandHistory.push(raw);
  }
  return out;
}

function executeCommandInner(prev: MlopsState, rawInput: string): { state: MlopsState; result: CommandResult } {
  const state = cloneState(prev);
  const raw = rawInput.trim();
  if (!raw) return { state, result: ok('') };

  const finish = (st: MlopsState, res: CommandResult): { state: MlopsState; result: CommandResult } => {
    if (!res.ok || !res.output) return { state: st, result: res };
    const teach = teachAfterCommand(raw, st);
    return { state: st, result: ok(res.output + (teach ? `\n${teach}` : '')) };
  };

  // `;` chains
  if (raw.includes(';') && !raw.startsWith('echo')) {
    const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
    let lastState = state;
    const outs: string[] = [];
    for (const part of parts) {
      const step = executeCommand(lastState, part);
      if (step.result.error) return { state: prev, result: step.result };
      lastState = step.state;
      if (step.result.output) outs.push(step.result.output);
    }
    return { state: lastState, result: ok(outs.join('\n')) };
  }

  const tokens = tokenize(raw);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  if (cmd === 'help' || cmd === '?') {
    return {
      state,
      result: ok(
        [
          'MLOps commands:',
          '  ml init                     — bootstrap the project + lifecycle rail',
          '  ml data add <path>          — version a dataset (ingest)',
          '  ml train run -n <name> -p k=v … — train + evaluate a run',
          '  ml model register <run> [--name <model>] — promote a run to the registry',
          '  ml deploy <run|model:version> [--endpoint <e>] — go live (records rollback target)',
          '  ml monitor on [--threshold t] — turn on monitoring + drift',
          '  ml rollback [--endpoint <e>] — restore the previous live model',
          '  ml params set k=v / ml predict [--n N]',
          'Inspect (do not count): ml status, ml service status, ml registry, ml runs,',
          '  ml metrics show, ml params show, ml drift show, ml version, ml help',
          'Workspace simulators: ls, cat <pipeline.yaml|model.yaml|<dataset>>, edit params.yaml k=v, rm <name>',
          'Meta: levels, help/ui/tour, curriculum, concepts, quiz, steps, hint, show goal, reset, undo, sandbox, clear',
        ].join('\n'),
      ),
    };
  }

  if (cmd === 'concepts' || cmd === 'glossary') {
    if (args.length) {
      const c = findConcept(args.join(' '));
      return c
        ? { state, result: ok(`${c.title}\n${c.body}`) }
        : { state, result: fail(`Unknown concept '${args.join(' ')}'. Type \`concepts\`.`) };
    }
    return { state, result: ok(['MLOps mental models (type `concepts <term>` for one):', '', formatConcepts()].join('\n')) };
  }

  if (cmd === 'ls') {
    const lines: string[] = [];
    for (const d of Object.values(state.datasets)) lines.push(`${d.path}${d.current !== null ? `  [v${d.current}]` : '  [unversioned]'}`);
    for (const r of state.runs) lines.push(`run:${r.id}  [${r.status}]`);
    for (const m of Object.values(state.registry)) lines.push(`model:${m.name}  [v${m.current}]`);
    for (const e of Object.values(state.endpoints)) lines.push(`endpoint:${e.name}  [${e.live ? 'live' : 'offline'}]`);
    return { state, result: ok(lines.join('\n') || '(empty project)') };
  }

  if (cmd === 'cat') {
    const path = args[0];
    if (!path) return { state, result: fail('Usage: cat <path>') };
    if (path === 'pipeline.yaml') {
      if (!state.pipeline.length) return { state, result: ok('no lifecycle rail (run `ml init`)') };
      const yaml: string[] = ['stages:'];
      for (const s of state.pipeline) yaml.push(`  ${s.name}:`, `    cmd: ${s.cmd}`, `    done: ${s.upToDate}`);
      return { state, result: ok(yaml.join('\n')) };
    }
    if (path === 'model.yaml') {
      if (!Object.keys(state.registry).length) return { state, result: ok('registry is empty') };
      const y: string[] = ['models:'];
      for (const m of Object.values(state.registry)) {
        y.push(`  ${m.name}:  current=v${m.current}`);
        for (const v of m.versions) y.push(`    v${v.version}: run=${v.runId} ${v.stage} acc=${v.metrics.acc ?? '—'}`);
      }
      return { state, result: ok(y.join('\n')) };
    }
    const d = Object.values(state.datasets).find((x) => x.path === path || x.name === path);
    if (d) {
      const lines = [`${d.path}  current=${d.current !== null ? `v${d.current}` : 'none'}`];
      for (const v of d.versions) lines.push(`  v${v.version}: ${shortMd5(v.contentId)}…  from ${v.source}`);
      if (d.featureCols?.length) lines.push(`features: ${d.featureCols.join(', ')}`);
      return { state, result: ok(lines.join('\n')) };
    }
    return { state, result: fail(`cat: ${path}: No such file`) };
  }

  if (cmd === 'edit') {
    const path = args[0];
    if (!path) return { state, result: fail('Usage: edit <path> [k=v]') };
    if (path === 'params.yaml' && args[1]) {
      const kv = parseKeyValue(args[1]);
      if (!kv) return { state, result: fail('Usage: edit params.yaml key=value') };
      const err = requireInit(state);
      if (err) return { state, result: err };
      setParam(state, kv.key, kv.value);
      stubStage(state, 'train');
      logEvent(state, 'params', `${kv.key}=${kv.value}`);
      return finish(state, ok(`Updated params.yaml: ${kv.key}=${kv.value}\nThe train stage is now dirty — re-run \`ml train run\`.`));
    }
    return { state, result: fail(`edit: only \`edit params.yaml k=v\` is supported here.`) };
  }

  if (cmd === 'rm') {
    const name = args[0];
    if (!name) return { state, result: fail('Usage: rm <dataset|run|model|endpoint>') };
    if (state.datasets[name]) {
      delete state.datasets[name];
      return { state, result: ok(`Removed dataset '${name}'.`) };
    }
    const ri = state.runs.findIndex((r) => r.id === name);
    if (ri >= 0) {
      state.runs.splice(ri, 1);
      return { state, result: ok(`Removed run '${name}'.`) };
    }
    if (state.registry[name]) {
      delete state.registry[name];
      return { state, result: ok(`Removed model '${name}' from the registry.`) };
    }
    if (state.endpoints[name]) {
      delete state.endpoints[name];
      return { state, result: ok(`Removed endpoint '${name}'.`) };
    }
    return { state, result: fail(`rm: '${name}' not found`) };
  }

  // ── ml ──────────────────────────────────────────────────────
  if (cmd !== 'ml') {
    return { state, result: fail(`command not found: ${cmd}. Type \`help\`.`) };
  }

  const sub = args[0];
  if (!sub || sub === '--help' || sub === '-h') {
    return { state, result: ok('usage: ml <command> [...] — type `help` for the short list.') };
  }
  if (sub === 'version' || sub === '--version') {
    return { state, result: ok('1.0 (LearnMLOps simulator)') };
  }
  if (sub === 'help') {
    return { state, result: ok('type `help` for the full command list.') };
  }

  // ── inspect (do not count toward golf) ─────────────────────
  if (sub === 'status' || sub === 'service') {
    if (sub === 'service') {
      const e = state.endpoints[resolveEndpoint(state, args[1] === '--endpoint' ? args[2] : args[1])];
      if (!e) return { state, result: fail(`no endpoint '${args[1] ?? 'prod'}'`) };
      const ref = e.modelRef ? `${e.modelRef.name}:v${e.modelRef.version}` : 'cold';
      return finish(state, ok(
        [
          `endpoint ${e.name}: ${e.live ? 'LIVE' : 'OFFLINE'} → ${ref}`,
          `  url: ${e.url ?? '—'}`,
          `  predictions served: ${e.predictionsServed}`,
          `  monitoring: ${e.monitoring.enabled ? 'on' : 'off'}${e.monitoring.driftAlert ? ' (drift ALERT)' : ''}`,
          state.rollbackTargets[e.name]
            ? `  rollback target: ${state.rollbackTargets[e.name].modelRef.name}:v${state.rollbackTargets[e.name].modelRef.version}`
            : '  rollback target: none',
        ].join('\n'),
      ));
    }
    return finish(state, ok(statusLines(state)));
  }

  if (sub === 'registry' || sub === 'model' || sub === 'runs' || sub === 'metrics' || sub === 'params' || sub === 'drift') {
    if (sub === 'registry' || (sub === 'model' && args[1] !== 'register')) {
      const list = args[1] === 'list';
      if (!list && sub === 'model' && args[1] !== 'list' && args[1] !== 'register') {
        return { state, result: fail('Usage: ml model register <run> [--name <model>]  (or `ml registry`)') };
      }
      if (!Object.keys(state.registry).length) return { state, result: ok('registry is empty') };
      const lines = Object.values(state.registry).map((m) => {
        const v = m.versions.find((x) => x.version === m.current)!;
        return `${m.name}:v${m.current}  ${v.stage}  acc=${v.metrics.acc ?? '—'}  (run ${v.runId})`;
      });
      return finish(state, ok(lines.join('\n')));
    }
    if (sub === 'runs') {
      if (!state.runs.length) return { state, result: ok('no runs yet — `ml train run`') };
      const header = ['run', 'data', 'status', ...Object.keys(state.params), ...Object.keys(state.metrics)].join('\t');
      const rows = state.runs.map((r) =>
        [r.id, r.datasetRef ?? '—', r.status, ...Object.values(r.params).map(String), ...Object.values(r.metrics).map(String)].join('\t'),
      );
      return finish(state, ok([header, ...rows].join('\n')));
    }
    if (sub === 'metrics') {
      if (!Object.keys(state.metrics).length) return { state, result: ok('no metrics yet — `ml train run`') };
      return finish(state, ok(Object.entries(state.metrics).map(([k, v]) => `${k}: ${v}`).join('\n')));
    }
    if (sub === 'params') {
      if (args[1] === 'set') {
        const kv = parseKeyValue(args[2] ?? '');
        if (!kv) return { state, result: fail('Usage: ml params set key=value') };
        const err = requireInit(state);
        if (err) return { state, result: err };
        setParam(state, kv.key, kv.value);
        stubStage(state, 'train');
        logEvent(state, 'params', `${kv.key}=${kv.value}`);
        return finish(state, ok(`Set ${kv.key}=${kv.value}. Train stage is now dirty.`));
      }
      return finish(state, ok(Object.entries(state.params).map(([k, v]) => `${k}: ${v}`).join('\n') || 'No params.'));
    }
    if (sub === 'drift') {
      const lines = Object.values(state.datasets)
        .filter((d) => d.drift)
        .map((d) => `${d.name}: ${d.drift!.enabled ? `score=${d.drift!.score.toFixed(2)} (threshold ${d.drift!.threshold})` : 'monitoring off'}`);
      return finish(state, ok(lines.join('\n') || 'no drift signals'));
    }
  }

  if (sub === 'init') {
    if (state.initialized) return { state, result: fail('ERROR: MLOps project already initialized.') };
    state.initialized = true;
    state.pipeline = lifecycleRail();
    state.endpoints[DEFAULT_ENDPOINT] = {
      name: DEFAULT_ENDPOINT,
      live: false,
      modelRef: null,
      predictionsServed: 0,
      monitoring: { enabled: false, window: [], driftAlert: false },
    };
    logEvent(state, 'init', 'Initialized MLOps project (lifecycle rail seeded)');
    return finish(state, ok(
      [
        'Initialized MLOps project.',
        '',
        'Seeded the lifecycle rail:  ingest → train → eval → register → deploy → monitor',
        '  (each command lights the next stage on the board)',
        '',
        'Created endpoint: prod (offline).',
      ].join('\n'),
    ));
  }

  if (sub === 'data') {
    const dsub = args[1];
    if (dsub !== 'add') return { state, result: fail('Usage: ml data add <path>') };
    const err = requireInit(state);
    if (err) return { state, result: err };
    const path = args[2];
    if (!path) return { state, result: fail('Usage: ml data add <path>') };
    const name = path.split('/').pop()!.replace(/\.[^.]+$/, '') || 'data';
    const existing = state.datasets[name];
    const ds = existing ?? {
      name,
      path,
      versions: [],
      current: null as number | null,
      featureCols: undefined as string[] | undefined,
      drift: { enabled: false, score: 0.1, threshold: 0.3 },
    };
    state.datasets[name] = ds;
    const version = (existing ? existing.versions.length : 0) + 1;
    const contentId = fakeMd5(`ds:${path}:v${version}`);
    ds.versions.push({ version, contentId, source: path });
    ds.current = version;
    ds.path = path;
    lightStage(state, 'ingest');
    logEvent(state, 'ingest', `${path} → v${version}`);
    return finish(state, ok(
      [
        `100% ${path}  →  ${name}@v${version}`,
        `  content_id: ${contentId}`,
        `  versions kept: ${ds.versions.map((v) => `v${v.version}`).join(', ')}`,
        'Ingest stage done. Train against this version with `ml train run`.',
      ].join('\n'),
    ));
  }

  if (sub === 'train') {
    const tsub = args[1];
    if (tsub !== 'run') return { state, result: fail('Usage: ml train run -n <name> [-p k=v …]') };
    const err = requireInit(state);
    if (err) return { state, result: err };
    let name = '';
    const runParams: Record<string, string | number> = {};
    for (let i = 2; i < args.length; i++) {
      const a = args[i];
      if (a === '-n' || a === '--name') name = args[++i] ?? '';
      else if (a === '-p' || a === '--param') {
        const kv = parseKeyValue(args[++i] ?? '');
        if (kv) runParams[kv.key] = kv.value;
      }
    }
    if (!name) return { state, result: fail('Usage: ml train run -n <name> [-p k=v …]') };
    // params: run params override + merge over current
    for (const [k, v] of Object.entries(runParams)) state.params[k] = v;
    const ref = datasetRefOf(state, 'train');
    if (!ref) {
      return { state, result: fail('No versioned training dataset. Run `ml data add data/train.csv` first.') };
    }
    const metrics = syntheticMetrics(state, state.params);
    const run: Run = {
      id: name,
      params: { ...state.params },
      metrics,
      datasetRef: ref,
      status: 'succeeded',
      artifactId: fakeMd5(`model:${name}:${ref}:${JSON.stringify(state.params)}`),
      createdAt: state.runs.length + 1,
    };
    // replace a re-run with the same name
    state.runs = state.runs.filter((r) => r.id !== name);
    state.runs.push(run);
    state.metrics = { ...metrics };
    lightStage(state, 'train');
    lightStage(state, 'eval');
    logEvent(state, 'train', `${name} on ${ref}`);
    return finish(state, ok(
      [
        `run ${name}  (data=${ref})`,
        `  params: ${Object.entries(state.params).map(([k, v]) => `${k}=${v}`).join(' ')}`,
        `  metrics: acc=${metrics.acc}  loss=${metrics.loss}  f1=${metrics.f1}`,
        'train + eval stages done. Register it with `ml model register ' + name + '`.',
      ].join('\n'),
    ));
  }

  if (sub === 'model') {
    const msub = args[1];
    if (msub !== 'register') return { state, result: fail('Usage: ml model register <run> [--name <model>]') };
    const err = requireInit(state);
    if (err) return { state, result: err };
    const runId = args[2];
    if (!runId) return { state, result: fail('Usage: ml model register <run> [--name <model>]') };
    const nameIdx = args.indexOf('--name');
    const model = nameIdx >= 0 ? args[nameIdx + 1] : `m-${runId}`;
    const run = findRun(state, runId);
    if (!run) return { state, result: fail(`run '${runId}' not found. Run \`ml train run\` first.`) };
    const reg = state.registry[model] ?? { name: model, versions: [], current: 0 };
    state.registry[model] = reg;
    const version = reg.versions.length + 1;
    reg.versions.push({
      version,
      runId: run.id,
      params: { ...run.params },
      metrics: { ...run.metrics },
      datasetRef: run.datasetRef,
      artifactId: run.artifactId ?? fakeMd5(`model:${model}:v${version}`),
      stage: 'Staging',
    });
    reg.current = version;
    lightStage(state, 'register');
    logEvent(state, 'register', `${model}:v${version} from ${run.id}`);
    return finish(state, ok(
      [
        `Registered ${model}:v${version} from run ${run.id}`,
        `  lineage: data=${run.datasetRef}  acc=${run.metrics.acc}`,
        `  stage: Staging  (deploy to promote to Production)`,
        `Deploy with: ml deploy ${run.id}`,
      ].join('\n'),
    ));
  }

  if (sub === 'deploy') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const targetArg = args.slice(1).find((a) => !a.startsWith('-'));
    if (!targetArg) return { state, result: fail('Usage: ml deploy <run | model:version> [--endpoint <e>]') };
    const eIdx = args.indexOf('--endpoint');
    const endpoint = eIdx >= 0 ? args[eIdx + 1] : DEFAULT_ENDPOINT;
    const ep = ensureEndpoint(state, endpoint);
    const resolved = resolveDeployTarget(state, targetArg);
    if (!resolved) {
      return { state, result: fail(`cannot resolve deploy target '${targetArg}'. Register the run, or use model:version.`) };
    }
    const { ref } = resolved;
    // The signature safety net: record the previous live model before swapping.
    if (ep.live && ep.modelRef) {
      state.rollbackTargets[endpoint] = { endpoint, modelRef: { ...ep.modelRef }, setAt: state.events.length + 1 };
    }
    const prev = ep.modelRef ? `${ep.modelRef.name}:v${ep.modelRef.version}` : 'nothing';
    ep.live = true;
    ep.modelRef = { ...ref };
    ep.url = `https://api.example.com/${endpoint}`;
    // promote the deployed version to Production in the registry
    const reg = state.registry[ref.name];
    if (reg) {
      const mv = reg.versions.find((v) => v.version === ref.version);
      if (mv) mv.stage = 'Production';
      reg.current = ref.version;
    }
    lightStage(state, 'deploy');
    logEvent(state, 'deploy', `${endpoint} → ${ref.name}:v${ref.version}`);
    return finish(state, ok(
      [
        `Deployed ${ref.name}:v${ref.version} → ${endpoint}  (was ${prev})`,
        state.rollbackTargets[endpoint]
          ? `Rollback target saved: ${state.rollbackTargets[endpoint].modelRef.name}:v${state.rollbackTargets[endpoint].modelRef.version}`
          : 'No previous live model — nothing to roll back to yet.',
        `Endpoint is LIVE: ${ep.url}`,
      ].join('\n'),
    ));
  }

  if (sub === 'monitor') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    if (args[1] !== 'on') return { state, result: fail('Usage: ml monitor on [--endpoint <e>] [--threshold t]') };
    const eIdx = args.indexOf('--endpoint');
    const endpoint = eIdx >= 0 ? args[eIdx + 1] : DEFAULT_ENDPOINT;
    const ep = ensureEndpoint(state, endpoint);
    const tIdx = args.indexOf('--threshold');
    const threshold = tIdx >= 0 ? Number(args[tIdx + 1]) : 0.3;
    ep.monitoring.enabled = true;
    if (ep.monitoring.window.length === 0) ep.monitoring.window = [state.metrics.acc ?? 0];
    // drift is watched on the training dataset
    for (const d of Object.values(state.datasets)) {
      if (d.drift) {
        d.drift.enabled = true;
        d.drift.threshold = threshold;
      }
    }
    lightStage(state, 'monitor');
    logEvent(state, 'monitor', `${endpoint} monitoring on`);
    return finish(state, ok(
      [
        `Monitoring ON for ${endpoint} (drift threshold ${threshold}).`,
        'You are now observing the live endpoint — the loop is closed.',
      ].join('\n'),
    ));
  }

  if (sub === 'rollback') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const eIdx = args.indexOf('--endpoint');
    const endpoint = eIdx >= 0 ? args[eIdx + 1] : DEFAULT_ENDPOINT;
    const target = state.rollbackTargets[endpoint];
    if (!target) return { state, result: fail(`no rollback target for '${endpoint}'. Deploy a newer model first to record one.`) };
    const ep = ensureEndpoint(state, endpoint);
    const from = ep.modelRef ? `${ep.modelRef.name}:v${ep.modelRef.version}` : '—';
    ep.modelRef = { ...target.modelRef };
    ep.live = true;
    // promote the rolled-back version, demote the current
    const reg = state.registry[target.modelRef.name];
    if (reg) {
      reg.current = target.modelRef.version;
      for (const v of reg.versions) v.stage = v.version === target.modelRef.version ? 'Production' : 'Staging';
    }
    delete state.rollbackTargets[endpoint];
    logEvent(state, 'rollback', `${endpoint}: ${from} → ${target.modelRef.name}:v${target.modelRef.version}`);
    return finish(state, ok(
      [
        `Rolled back ${endpoint}:  ${from}  →  ${target.modelRef.name}:v${target.modelRef.version}`,
        'The endpoint stays live on the previous model. The one-shot target is consumed.',
      ].join('\n'),
    ));
  }

  if (sub === 'predict') {
    const err = requireInit(state);
    if (err) return { state, result: err };
    const nIdx = args.indexOf('--n');
    const n = nIdx >= 0 ? Math.max(1, Number(args[nIdx + 1]) || 1) : 10;
    const eIdx = args.indexOf('--endpoint');
    const endpoint = eIdx >= 0 ? args[eIdx + 1] : DEFAULT_ENDPOINT;
    const ep = ensureEndpoint(state, endpoint);
    if (!ep.live || !ep.modelRef) return { state, result: fail(`endpoint '${endpoint}' is not live — deploy first.`) };
    ep.predictionsServed += n;
    // live quality wobbles around the deployed model's accuracy; drift creeps up
    const base = state.metrics.acc ?? 0.8;
    const wobble = Math.abs(fakeMd5(`pred:${endpoint}:${ep.predictionsServed}`.repeat(1)).charCodeAt(0) % 5) / 100;
    ep.monitoring.window.push(Number((base - wobble).toFixed(3)));
    if (ep.monitoring.window.length > 24) ep.monitoring.window.shift();
    for (const d of Object.values(state.datasets)) {
      if (d.drift && d.drift.enabled) {
        d.drift.score = Math.min(1, d.drift.score + 0.06);
        if (d.drift.score > d.drift.threshold) ep.monitoring.driftAlert = true;
      }
    }
    return finish(state, ok(
      [
        `Served ${n} prediction(s) from ${ep.modelRef.name}:v${ep.modelRef.version}.`,
        `  total served: ${ep.predictionsServed}  acc≈${(base - wobble).toFixed(3)}`,
        ...Object.values(state.datasets)
          .filter((d) => d.drift?.enabled)
          .map((d) => `  drift[${d.name}]: ${d.drift!.score.toFixed(2)}${d.drift!.score > d.drift!.threshold ? '  ⚠ ABOVE THRESHOLD' : ''}`),
      ].join('\n'),
    ));
  }

  return { state, result: fail(`ERROR: unknown command 'ml ${sub}'. Type \`help\`.`) };
}
