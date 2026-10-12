import type { GoalCheck, LevelDef, MlopsState, SolutionStepStatus } from './types';
import { parseKeyValue } from './state';

function normalizeWs(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function commandInHistory(state: MlopsState, matcher: (cmd: string) => boolean): boolean {
  return (state.commandHistory ?? []).some((c) => matcher(normalizeWs(c)));
}

function parseArgs(cmd: string): string[] {
  return normalizeWs(cmd).split(' ');
}

function flagValues(cmd: string, flag: string): string[] {
  const parts = parseArgs(cmd);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === flag && parts[i + 1]) out.push(parts[i + 1]!);
  }
  return out;
}

function positional(cmd: string): string[] {
  return parseArgs(cmd).filter((t) => !t.startsWith('-'));
}

function setParamsOf(cmd: string): Record<string, string | number> {
  const parts = parseArgs(cmd);
  const out: Record<string, string | number> = {};
  for (let i = 0; i < parts.length; i++) {
    if ((parts[i] === '-p' || parts[i] === '--param' || parts[i] === '-S' || parts[i] === '--set-param') && parts[i + 1]) {
      const kv = parseKeyValue(parts[i + 1]!);
      if (kv) out[kv.key] = kv.value;
    }
  }
  return out;
}

/** The endpoint a command targets, defaulting to `prod`. */
function endpointOf(cmd: string): string {
  const e = flagValues(cmd, '--endpoint')[0];
  return e ?? 'prod';
}

/** True when historyCmd successfully covers the solution command (possibly more specific). */
function matchSolutionCommand(historyCmd: string, solutionCmd: string): boolean {
  const h = normalizeWs(historyCmd);
  const s = normalizeWs(solutionCmd);
  if (h === s) return true;
  if (h.startsWith(`${s} `) || s.startsWith(`${h} `)) return true;

  if (/^ml\s+data\s+add\b/i.test(s) && /^ml\s+data\s+add\b/i.test(h)) {
    const sp = positional(s).pop();
    const hp = positional(h).pop();
    return !sp || sp === hp;
  }
  if (/^ml\s+train\s+run\b/i.test(s) && /^ml\s+train\s+run\b/i.test(h)) {
    const sn = flagValues(s, '-n')[0];
    const hn = flagValues(h, '-n')[0];
    if (sn && hn) return sn === hn;
    const sSets = setParamsOf(s);
    const hSets = setParamsOf(h);
    return Object.entries(sSets).every(([k, v]) => hSets[k] === v || hSets[k] === String(v));
  }
  if (/^ml\s+model\s+register\b/i.test(s) && /^ml\s+model\s+register\b/i.test(h)) {
    const sp = positional(s).slice(1)[0];
    const hp = positional(h).slice(1)[0];
    return !sp || sp === hp;
  }
  if (/^ml\s+deploy\b/i.test(s) && /^ml\s+deploy\b/i.test(h)) {
    return endpointOf(s) === endpointOf(h);
  }
  if (/^ml\s+rollback\b/i.test(s) && /^ml\s+rollback\b/i.test(h)) {
    return endpointOf(s) === endpointOf(h);
  }
  if (/^ml\s+monitor\s+on\b/i.test(s) && /^ml\s+monitor\s+on\b/i.test(h)) {
    return true;
  }
  if (/^ml\s+params\s+set\b/i.test(s) && /^ml\s+params\s+set\b/i.test(h)) {
    const sk = positional(s).pop();
    const hk = positional(h).pop();
    return !sk || sk === hk;
  }
  if (/^edit\b/i.test(s) && /^edit\b/i.test(h)) {
    const sPath = parseArgs(s)[1];
    const hPath = parseArgs(h)[1];
    if (sPath !== hPath) return false;
    const sKv = parseArgs(s)[2];
    const hKv = parseArgs(h)[2];
    if (sKv?.includes('=') && hKv?.includes('=')) return sKv === hKv;
    return true;
  }

  const verb = (c: string) => c.split(' ').slice(0, 2).join(' ').toLowerCase();
  return verb(h) === verb(s) && (h.startsWith(s) || s.startsWith(h));
}

/**
 * Steps whose live effect can legitimately disappear and require re-running.
 * History alone must NOT keep them checked when the effect is clearly gone.
 */
function liveEffectContradicts(state: MlopsState, cmd: string): boolean {
  const c = normalizeWs(cmd);

  if (/^ml\s+data\s+add\b/i.test(c)) {
    const path = positional(c).pop();
    const name = path ? path.split('/').pop()!.replace(/\.[^.]+$/, '') : undefined;
    const d = name ? state.datasets[name] : undefined;
    return !d || d.current === null;
  }
  if (/^ml\s+train\s+run\b/i.test(c)) {
    const name = flagValues(c, '-n')[0];
    return !name || !state.runs.some((r) => r.id === name);
  }
  if (/^ml\s+model\s+register\b/i.test(c)) {
    const run = positional(c).slice(1)[0];
    const nameIdx = c.indexOf('--name');
    const model = nameIdx >= 0 ? c.split(' ')[nameIdx + 1] : undefined;
    // A register step is undone if the named model has no version from that run.
    if (model && run) {
      const reg = state.registry[model];
      return !reg?.versions.some((v) => v.runId === run);
    }
    return Object.keys(state.registry).length === 0;
  }
  if (/^ml\s+deploy\b/i.test(c)) {
    const e = endpointOf(c);
    return !(state.endpoints[e]?.live ?? false);
  }
  if (/^ml\s+monitor\s+on\b/i.test(c)) {
    const e = endpointOf(c);
    return !(state.endpoints[e]?.monitoring.enabled ?? false);
  }
  if (/^edit\b/i.test(c) || /^ml\s+params\s+set\b/i.test(c)) {
    let kv: string | undefined;
    if (/^edit\b/i.test(c)) kv = parseArgs(c)[2];
    else kv = positional(c).pop();
    const parsed = kv ? parseKeyValue(kv) : null;
    if (!parsed) return false;
    return state.params[parsed.key] !== parsed.value;
  }
  return false;
}

function liveStatus(state: MlopsState, cmd: string, _solution: string[] = [cmd]): SolutionStepStatus {
  const fail = (note: string): SolutionStepStatus => ({ command: cmd, done: false, note });
  const ok = (note: string): SolutionStepStatus => ({ command: cmd, done: true, note });

  if (/^ml\s+init\b/.test(cmd)) {
    return state.initialized ? ok('MLOps project initialized') : fail('run `ml init`');
  }

  if (/^ml\s+data\s+add\b/.test(cmd)) {
    const path = positional(cmd).pop();
    const name = path ? path.split('/').pop()!.replace(/\.[^.]+$/, '') : undefined;
    const d = name ? state.datasets[name] : undefined;
    return d && d.current !== null ? ok(`versioned ${d.path} → v${d.current}`) : fail(`version the dataset \`${path ?? '…'}\``);
  }

  if (/^ml\s+train\s+run\b/.test(cmd)) {
    const name = flagValues(cmd, '-n')[0] || 'a run';
    const run = state.runs.find((r) => r.id === name);
    return run ? ok(`run ${run.id} (acc=${run.metrics.acc ?? '—'}, data=${run.datasetRef ?? '—'})`) : fail(`train run \`${name}\``);
  }

  if (/^ml\s+model\s+register\b/.test(cmd)) {
    const run = positional(cmd).slice(1)[0];
    const nameIdx = cmd.indexOf('--name');
    const model = nameIdx >= 0 ? cmd.split(' ')[nameIdx + 1] : undefined;
    if (model) {
      const reg = state.registry[model];
      const hit = reg?.versions.find((v) => v.runId === run);
      return hit ? ok(`${model}:v${hit.version} from ${run}`) : fail(`register ${run} as \`${model}\``);
    }
    const anyFromRun = run ? state.runs.some((r) => r.id === run) && Object.values(state.registry).some((m) => m.versions.some((v) => v.runId === run)) : false;
    return anyFromRun ? ok('model registered') : fail('register the run');
  }

  if (/^ml\s+deploy\b/.test(cmd)) {
    const e = endpointOf(cmd);
    const ep = state.endpoints[e];
    return ep?.live && ep.modelRef ? ok(`${e} live → ${ep.modelRef.name}:v${ep.modelRef.version}`) : fail(`deploy to \`${e}\``);
  }

  if (/^ml\s+rollback\b/.test(cmd)) {
    // A rollback step is complete once history shows it ran (the target is consumed on success).
    return commandInHistory(state, (h) => /^ml\s+rollback\b/i.test(h))
      ? ok('rolled back to previous model')
      : fail('run `ml rollback`');
  }

  if (/^ml\s+monitor\s+on\b/.test(cmd)) {
    const e = endpointOf(cmd);
    return state.endpoints[e]?.monitoring.enabled ? ok(`monitoring on (${e})`) : fail('turn on monitoring');
  }

  if (/^ml\s+predict\b/.test(cmd)) {
    const e = endpointOf(cmd);
    const ep = state.endpoints[e];
    return ep && ep.predictionsServed > 0 ? ok(`${ep.predictionsServed} served`) : fail('serve predictions');
  }

  if (/^ml\s+params\s+set\b/.test(cmd)) {
    const kv = positional(cmd).pop();
    const parsed = kv ? parseKeyValue(kv) : null;
    if (!parsed) return fail(cmd);
    return state.params[parsed.key] === parsed.value ? ok(`${parsed.key}=${parsed.value}`) : fail(cmd);
  }

  if (/^edit\b/.test(cmd)) {
    const path = parseArgs(cmd)[1];
    if (path === 'params.yaml') {
      const kv = parseArgs(cmd)[2]?.split('=');
      if (kv?.length === 2) {
        const key = kv[0]!;
        const raw = kv[1]!;
        const val = Number.isNaN(Number(raw)) ? raw : Number(raw);
        return state.params[key] === val ? ok(`${key}=${val}`) : fail(cmd);
      }
    }
    return fail(cmd);
  }

  // Inspect-only commands never block completion.
  if (/^ml\s+(status|service|registry|model|runs|metrics|params|drift|version|help|predict)\b/.test(cmd) ||
      /^ml\s+model\s+list\b/.test(cmd) || /^ls\b/.test(cmd) || /^cat\b/.test(cmd)) {
    return { command: cmd, done: true, note: 'inspect (does not block completion)', optional: true };
  }

  return fail(cmd);
}

/**
 * Checklist completion:
 * 1) live effects win when they hold
 * 2) otherwise, if the solution command already ran successfully this session,
 *    keep it checked — unless later work clearly contradicted that effect
 * 3) intermediate param edits (later solution step rewrites the same key) stay sticky once run
 */
function stepStatus(state: MlopsState, command: string, solution: string[] = [command], index = 0): SolutionStepStatus {
  const cmd = command.trim();
  const live = liveStatus(state, cmd, solution);
  if (live.done || live.optional) return live;

  const ran = commandInHistory(state, (h) => matchSolutionCommand(h, cmd));
  const intermediateParamEdit = isIntermediateParamEdit(solution, index);
  if (ran && (intermediateParamEdit || !liveEffectContradicts(state, cmd))) {
    return {
      command: cmd,
      done: true,
      note: intermediateParamEdit ? 'ran (probe/round-trip step)' : 'already completed earlier',
    };
  }
  return live;
}

function isIntermediateParamEdit(solution: string[], index: number): boolean {
  const cmd = (solution[index] ?? '').trim();
  let key: string | undefined;
  if (/^edit\b/i.test(cmd)) key = parseKeyValue(parseArgs(cmd)[2] ?? '')?.key;
  else if (/^ml\s+params\s+set\b/i.test(cmd)) key = parseKeyValue(positional(cmd).pop() ?? '')?.key;
  if (!key) return false;
  return solution.slice(index + 1).some((c) => {
    const cc = c.trim();
    if (/^edit\b/i.test(cc)) return parseKeyValue(parseArgs(cc)[2] ?? '')?.key === key;
    if (/^ml\s+params\s+set\b/i.test(cc)) return parseKeyValue(positional(cc).slice(1)[0] ?? '')?.key === key;
    return false;
  });
}

export function solutionProgress(state: MlopsState, solution: string[]): SolutionStepStatus[] {
  return solution.map((command, index) => stepStatus(state, command, solution, index));
}

export function solutionComplete(state: MlopsState, solution: string[]): boolean {
  return solutionProgress(state, solution).every((s) => s.done || s.optional);
}

export function goalChecklist(state: MlopsState, level: LevelDef): SolutionStepStatus[] {
  return solutionProgress(state, level.solution);
}

export function suggestFromSolution(state: MlopsState, level: LevelDef | null): string | null {
  if (!level) return null;
  const steps = solutionProgress(state, level.solution);
  const next = steps.find((s) => !s.done);
  return next?.command ?? null;
}

export function flattenGoalChecks(goal: GoalCheck): GoalCheck[] {
  return goal.kind === 'allOf' ? goal.checks : [goal];
}
