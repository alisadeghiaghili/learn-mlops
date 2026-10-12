import type { GoalCheck, MlopsState } from './types';

export interface GoalStatus {
  met: boolean;
  label: string;
  detail: string;
  /** Optional concrete command learners can type next. */
  command?: string;
}

function checkOne(state: MlopsState, check: GoalCheck): GoalStatus {
  switch (check.kind) {
    case 'initialized': {
      const want = check.value !== false;
      const met = state.initialized === want;
      return {
        met,
        label: want ? 'MLOps project initialized' : 'MLOps project not initialized',
        detail: met ? 'ok' : want ? 'run `ml init`' : 'already initialized',
        command: want && !met ? 'ml init' : undefined,
      };
    }
    case 'datasetVersioned': {
      const d = state.datasets[check.name];
      const current = d?.current ?? 0;
      const met = current >= (check.minVersion ?? 1);
      return {
        met,
        label: `Dataset '${check.name}' versioned${check.minVersion ? ` (≥ v${check.minVersion})` : ''}`,
        detail: met ? `v${current}` : 'no versioned dataset yet',
        command: met ? undefined : `ml data add ${d?.path ?? 'data/train.csv'}`,
      };
    }
    case 'datasetDriftClean': {
      const d = state.datasets[check.name];
      const drift = d?.drift;
      const met = !!drift && drift.enabled && drift.score <= drift.threshold;
      return {
        met,
        label: `Drift on '${check.name}' is clean`,
        detail: drift ? `score=${drift.score.toFixed(2)} (threshold ${drift.threshold})` : 'no drift signal',
      };
    }
    case 'datasetDriftDetected': {
      const d = state.datasets[check.name];
      const drift = d?.drift;
      const met = !!drift && drift.score > drift.threshold;
      return {
        met,
        label: `Drift detected on '${check.name}'`,
        detail: drift ? `score=${drift.score.toFixed(2)} (threshold ${drift.threshold})` : 'no drift signal',
        command: met ? undefined : 'ml predict --n 50',
      };
    }
    case 'runExists': {
      const met = state.runs.length >= check.min;
      return {
        met,
        label: `At least ${check.min} run(s)`,
        detail: `current=${state.runs.length}`,
        command: met ? undefined : 'ml train run -n exp-1',
      };
    }
    case 'runUsesData': {
      const ref = `${check.name}@${check.version}`;
      const met = state.runs.some((r) => r.datasetRef === ref);
      return {
        met,
        label: `A run trained on ${ref}`,
        detail: met ? 'lineage ok' : `runs: ${state.runs.map((r) => r.datasetRef ?? '—').join(', ') || '(none)'}`,
        command: met ? undefined : 'ml train run -n exp-1',
      };
    }
    case 'modelRegistered': {
      const m = state.registry[check.name];
      const count = m?.versions.length ?? 0;
      const met = count >= (check.minVersion ?? 1);
      return {
        met,
        label: `Model '${check.name}' registered${check.minVersion ? ` (≥ v${check.minVersion})` : ''}`,
        detail: met ? `v${m!.current}` : 'nothing registered yet',
        command: met ? undefined : 'ml model register exp-1',
      };
    }
    case 'endpointLive': {
      const e = state.endpoints[check.name];
      const met = !!e?.live;
      return {
        met,
        label: `Endpoint '${check.name}' is live`,
        detail: met ? `→ ${e!.modelRef?.name}:v${e!.modelRef?.version}` : 'endpoint is offline',
        command: met ? undefined : 'ml deploy exp-1',
      };
    }
    case 'endpointServes': {
      const e = state.endpoints[check.name];
      const met = !!e?.live && e.modelRef?.name === check.ref.name && e.modelRef.version === check.ref.version;
      return {
        met,
        label: `${check.name} serves ${check.ref.name}:v${check.ref.version}`,
        detail: met ? 'ok' : `serving ${e?.modelRef ? `${e.modelRef.name}:v${e.modelRef.version}` : 'nothing'}`,
        command: met ? undefined : `ml deploy ${check.ref.name}:${check.ref.version}`,
      };
    }
    case 'notDeployed': {
      const e = state.endpoints[check.name];
      const met = !e?.live;
      return {
        met,
        label: `Endpoint '${check.name}' is NOT live`,
        detail: met ? 'offline (as required)' : `currently live on ${e!.modelRef?.name}:v${e!.modelRef?.version}`,
      };
    }
    case 'monitoringOn': {
      const e = state.endpoints[check.name];
      const met = !!e?.monitoring.enabled;
      return {
        met,
        label: `Monitoring on for '${check.name}'`,
        detail: met ? 'on' : 'monitoring is off',
        command: met ? undefined : 'ml monitor on',
      };
    }
    case 'rollbackAvailable': {
      const t = state.rollbackTargets[check.name];
      const met = !!t;
      return {
        met,
        label: `Rollback target available for '${check.name}'`,
        detail: met ? `→ ${t.modelRef.name}:v${t.modelRef.version}` : 'no previous live model recorded',
        command: met ? undefined : `ml deploy <newer model>`,
      };
    }
    case 'predictionsServed': {
      const e = state.endpoints[check.name];
      const n = e?.predictionsServed ?? 0;
      const met = n >= check.min;
      return {
        met,
        label: `${check.min}+ prediction(s) served by '${check.name}'`,
        detail: `served=${n}`,
        command: met ? undefined : 'ml predict --n 10',
      };
    }
    case 'metricsAtLeast': {
      const v = state.metrics[check.key];
      const met = v !== undefined && v >= check.value;
      return {
        met,
        label: `${check.key} ≥ ${check.value}`,
        detail: v === undefined ? 'metric not produced' : `current=${v}`,
        command: met ? undefined : 'ml train run -n exp-1',
      };
    }
    case 'metricsExact': {
      const v = state.metrics[check.key];
      const met = v !== undefined && Math.abs(v - check.value) < 1e-9;
      return {
        met,
        label: `${check.key} = ${check.value}`,
        detail: v === undefined ? 'metric not produced' : `current=${v}`,
      };
    }
    case 'paramsAt': {
      const v = state.params[check.key];
      return {
        met: v === check.value,
        label: `${check.key} = ${check.value}`,
        detail: `current=${v}`,
        command: v === check.value ? undefined : `ml params set ${check.key}=${check.value}`,
      };
    }
    case 'stageExists': {
      const met = state.pipeline.some((s) => s.name === check.name);
      return {
        met,
        label: `Stage '${check.name}' exists`,
        detail: met ? 'ok' : 'no lifecycle rail yet',
      };
    }
    case 'stageUpToDate': {
      const s = state.pipeline.find((x) => x.name === check.name);
      return {
        met: !!s?.upToDate,
        label: `Stage '${check.name}' complete`,
        detail: s?.upToDate ? 'ok' : s ? 'not run yet' : 'stage missing',
      };
    }
    case 'allOf': {
      const results = check.checks.map((c) => checkOne(state, c));
      return {
        met: results.every((r) => r.met),
        label: results.map((r) => r.label).join(' · '),
        detail: results.filter((r) => !r.met).map((r) => r.detail).join('; ') || 'ok',
      };
    }
    default: {
      return { met: false, label: 'Unknown goal', detail: 'unknown check' };
    }
  }
}

export function evaluateGoal(state: MlopsState, goal: GoalCheck): { solved: boolean; statuses: GoalStatus[] } {
  if (goal.kind === 'allOf') {
    const statuses = goal.checks.map((c) => checkOne(state, c));
    return { solved: statuses.every((s) => s.met), statuses };
  }
  const single = checkOne(state, goal);
  return { solved: single.met, statuses: [single] };
}

export function flattenGoal(goal: GoalCheck): GoalCheck[] {
  return goal.kind === 'allOf' ? goal.checks : [goal];
}
