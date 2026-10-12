import type { MlopsState, PipelineStage } from './types';
import { fakeMd5 } from './hash';

export function emptyMlopsState(): MlopsState {
  return {
    initialized: false,
    datasets: {},
    runs: [],
    registry: {},
    endpoints: {},
    rollbackTargets: {},
    pipeline: [],
    metrics: {},
    params: {},
    events: [],
    commandHistory: [],
  };
}

export function cloneState(state: MlopsState): MlopsState {
  return structuredClone(state);
}

/**
 * The six-stage lifecycle status rail, rendered as the DAG strip.
 * Seeded at `ml init`; each lifecycle command lights its stage.
 * Reuses LearnDVC's PipelineStage verbatim so board.ts renderDag is free.
 */
export function lifecycleRail(): PipelineStage[] {
  const make = (name: string, cmd: string): PipelineStage => ({
    name,
    deps: [],
    outs: [],
    cmd,
    params: [],
    metrics: [],
    frozen: false,
    upToDate: false,
  });
  return [
    make('ingest', 'ml data add'),
    make('train', 'ml train run'),
    make('eval', 'ml train run'),
    make('register', 'ml model register'),
    make('deploy', 'ml deploy'),
    make('monitor', 'ml monitor on'),
  ];
}

/** Light a lifecycle stage once its command has run. */
export function lightStage(state: MlopsState, name: string): void {
  const stage = state.pipeline.find((s) => s.name === name);
  if (stage) stage.upToDate = true;
}

/** Stub a lifecycle stage back to not-done (e.g. a param change dirties train). */
export function stubStage(state: MlopsState, name: string): void {
  const stage = state.pipeline.find((s) => s.name === name);
  if (stage) stage.upToDate = false;
}

export function logEvent(state: MlopsState, kind: string, detail: string): void {
  state.events.push({ t: state.events.length + 1, kind, detail });
}

/** The version number a dataset currently points at, or 0 when unversioned. */
export function currentVersion(state: MlopsState, datasetName: string): number {
  return state.datasets[datasetName]?.current ?? 0;
}

/** The lineage ref string for a dataset at its current version, e.g. `train@1`. */
export function datasetRefOf(state: MlopsState, datasetName: string): string | undefined {
  const v = currentVersion(state, datasetName);
  return v > 0 ? `${datasetName}@${v}` : undefined;
}

export function setParam(state: MlopsState, key: string, value: string | number): void {
  state.params[key] = value;
}

/** Nested keys use dots (train.lr) like real MLOps params files. */
export function parseKeyValue(token: string): { key: string; value: string | number } | null {
  const i = token.indexOf('=');
  if (i <= 0) return null;
  const key = token.slice(0, i);
  const raw = token.slice(i + 1);
  return { key, value: Number.isNaN(Number(raw)) ? raw : Number(raw) };
}

/**
 * The sandbox is an initialized project with a dataset on disk, a live
 * baseline endpoint, and the lifecycle rail — so the loop is visible from the
 * first command. It deliberately mirrors the flagship level's start state.
 */
export function sandboxMlopsState(): MlopsState {
  const state = emptyMlopsState();
  state.initialized = true;
  state.pipeline = lifecycleRail();

  state.datasets.train = {
    name: 'train',
    path: 'data/train.csv',
    versions: [],
    current: null,
    featureCols: ['age', 'spend', 'tenure'],
    drift: { enabled: false, score: 0.1, threshold: 0.3 },
  };

  state.registry['churn-model'] = {
    name: 'churn-model',
    current: 1,
    versions: [
      {
        version: 1,
        runId: 'exp-legacy',
        artifactId: fakeMd5('model:churn:v1'),
        params: { lr: 0.2, depth: 20 },
        metrics: { acc: 0.71 },
        datasetRef: 'train@1',
        stage: 'Production',
      },
    ],
  };
  state.runs = [
    {
      id: 'exp-legacy',
      params: { lr: 0.2, depth: 20 },
      metrics: { acc: 0.71 },
      datasetRef: 'train@1',
      status: 'succeeded',
      artifactId: fakeMd5('model:churn:v1'),
      createdAt: 1,
    },
  ];

  state.endpoints.prod = {
    name: 'prod',
    live: true,
    modelRef: { name: 'churn-model', version: 1 },
    url: 'https://api.example.com/predict',
    predictionsServed: 1200,
    monitoring: { enabled: false, window: [], driftAlert: false },
  };

  state.metrics = { acc: 0.71 };
  state.params = { lr: 0.2, depth: 20 };
  logEvent(state, 'init', 'Initialized MLOps project (baseline endpoint already live)');
  return state;
}
