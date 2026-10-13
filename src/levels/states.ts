/**
 * Shared level start-state builders, used by both the core curriculum and the
 * Toolbox series. Kept out of index.ts so toolbox.ts can reuse them without a
 * circular import.
 */

import type { MlopsState, ServiceEndpoint } from '../engine/types';
import { emptyMlopsState, lifecycleRail, logEvent } from '../engine/state';
import { fakeMd5 } from '../engine/hash';

/** The `ml $` prompt + a cold prod endpoint — what `ml init` produces. */
function coldEndpoint(name = 'prod', live = false): ServiceEndpoint {
  return { name, live, modelRef: live ? { name: 'churn-model', version: 1 } : null, predictionsServed: 0, monitoring: { enabled: false, window: [], driftAlert: false } };
}

/** A freshly `ml init`'d project: rail seeded, prod endpoint cold. */
export function initProject(): MlopsState {
  const s = emptyMlopsState();
  s.initialized = true;
  s.pipeline = lifecycleRail();
  s.endpoints.prod = coldEndpoint('prod', false);
  logEvent(s, 'init', 'Initialized MLOps project');
  return s;
}

/** init + a versioned `train` dataset at v1 (what `ml data add` leaves behind). */
export function versionedTrain(): MlopsState {
  const s = initProject();
  s.datasets.train = {
    name: 'train',
    path: 'data/train.csv',
    versions: [{ version: 1, contentId: fakeMd5('ds:data/train.csv:v1'), source: 'data/train.csv' }],
    current: 1,
    featureCols: ['age', 'spend', 'tenure'],
    drift: { enabled: false, score: 0.1, threshold: 0.3 },
  };
  s.params = { lr: 0.2, depth: 20 };
  s.metrics = {};
  const ingest = s.pipeline.find((p) => p.name === 'ingest');
  if (ingest) ingest.upToDate = true;
  return s;
}

const EXP1 = { lr: 0.1, depth: 40 };
const EXP1_METRICS = { acc: 0.907, loss: 0.093, f1: 0.897 };

/** versionedTrain + a completed `exp-1` run (no registration yet). */
export function trainedState(): MlopsState {
  const s = versionedTrain();
  s.runs.push({
    id: 'exp-1',
    params: { ...EXP1 },
    metrics: { ...EXP1_METRICS },
    datasetRef: 'train@1',
    status: 'succeeded',
    artifactId: fakeMd5('model:exp-1:train@1'),
    createdAt: 1,
  });
  s.params = { ...EXP1 };
  s.metrics = { ...EXP1_METRICS };
  for (const n of ['train', 'eval']) {
    const st = s.pipeline.find((p) => p.name === n);
    if (st) st.upToDate = true;
  }
  return s;
}

const EXP2 = { lr: 0.05, depth: 60 };
const EXP2_METRICS = { acc: 0.937, loss: 0.063, f1: 0.927 };

/** trainedState + `churn-model` v1 registered (Staging), prod still cold. */
export function registeredState(): MlopsState {
  const s = trainedState();
  s.registry['churn-model'] = {
    name: 'churn-model',
    current: 1,
    versions: [
      {
        version: 1,
        runId: 'exp-1',
        params: { ...EXP1 },
        metrics: { ...EXP1_METRICS },
        datasetRef: 'train@1',
        artifactId: fakeMd5('model:churn:v1'),
        stage: 'Staging',
      },
    ],
  };
  const reg = s.pipeline.find((p) => p.name === 'register');
  if (reg) reg.upToDate = true;
  return s;
}

/** registeredState + prod live on churn-model:1 (Production), monitoring off. */
export function deployedState(): MlopsState {
  const s = registeredState();
  s.endpoints.prod = { ...coldEndpoint('prod', true), url: 'https://api.example.com/prod', predictionsServed: 350 };
  s.registry['churn-model'].versions[0]!.stage = 'Production';
  const dep = s.pipeline.find((p) => p.name === 'deploy');
  if (dep) dep.upToDate = true;
  return s;
}

/**
 * A v1 already serving in prod and a better v2 waiting in Staging — the exact
 * position before a monitored upgrade that must be roll-backable.
 */
export function twoVersionLiveState(): MlopsState {
  const s = deployedState();
  s.endpoints.prod = { ...s.endpoints.prod, predictionsServed: 1200 };
  s.runs.push({
    id: 'exp-2',
    params: { ...EXP2 },
    metrics: { ...EXP2_METRICS },
    datasetRef: 'train@1',
    status: 'succeeded',
    artifactId: fakeMd5('model:exp-2:train@1'),
    createdAt: 2,
  });
  s.registry['churn-model'].versions.push({
    version: 2,
    runId: 'exp-2',
    params: { ...EXP2 },
    metrics: { ...EXP2_METRICS },
    datasetRef: 'train@1',
    artifactId: fakeMd5('model:exp-2:train@1'),
    stage: 'Staging',
  });
  return s;
}
