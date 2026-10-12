import { describe, expect, it } from 'vitest';
import { emptyMlopsState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { allLevels, curriculumOutcomes } from '../src/levels';
import { CONCEPTS } from '../src/engine/glossary';

function run(state = emptyMlopsState(), cmds: string[]) {
  let s = state;
  const out: string[] = [];
  for (const c of cmds) {
    const r = executeCommand(s, c);
    s = r.state;
    out.push(r.result.output || r.result.error || '');
  }
  return { state: s, out };
}

const RAMP = [
  'ml init',
  'ml data add data/train.csv',
  'ml train run -n exp-1 -p lr=0.1 -p depth=40',
  'ml model register exp-1 --name churn-model',
  'ml deploy exp-1',
  'ml monitor on',
];

describe('MLOps lifecycle coverage', () => {
  it('the six lifecycle stages all light up after the full ramp', () => {
    const { state } = run(emptyMlopsState(), RAMP);
    expect(state.pipeline.map((p) => p.upToDate)).toEqual([true, true, true, true, true, true]);
    expect(state.pipeline.map((p) => p.name)).toEqual(['ingest', 'train', 'eval', 'register', 'deploy', 'monitor']);
  });

  it('runs carry params, metrics, and lineage to the registry', () => {
    const { state, out } = run(emptyMlopsState(), RAMP);
    expect(state.runs[0].datasetRef).toBe('train@1');
    expect(Object.keys(state.runs[0].metrics).sort()).toEqual(['acc', 'f1', 'loss']);
    expect(state.registry['churn-model'].versions[0]!.datasetRef).toBe('train@1');
    expect(out.join('\n')).toMatch(/acc=/);
  });

  it('monitor + predict drive a live drift signal and can trip an alert', () => {
    let { state } = run(emptyMlopsState(), RAMP);
    for (let i = 0; i < 10; i++) state = executeCommand(state, 'ml predict --n 5').state;
    expect(state.endpoints.prod.monitoring.driftAlert).toBe(true);
    expect(state.datasets.train.drift!.score).toBeGreaterThan(state.datasets.train.drift!.threshold);
  });

  it('glossary covers the core MLOps surface', () => {
    const ids = CONCEPTS.map((c) => c.id).join(' ');
    for (const id of ['dataset-version', 'lineage', 'run', 'registry', 'champion', 'endpoint', 'deploy-swap', 'rollback', 'monitoring', 'drift', 'params', 'loop']) {
      expect(ids).toContain(id);
    }
  });

  it('every level has ≥2 dialog slides and learning bullets', () => {
    for (const l of allLevels) {
      expect(l.learning.length, l.id).toBeGreaterThan(0);
      expect(l.startDialog.length, l.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('curriculum outcomes name the lifecycle skills', () => {
    const t = curriculumOutcomes().join('\n');
    for (const kw of ['lineage', 'monitoring', 'rollback', 'shipped', 'endpoint']) {
      expect(t.toLowerCase()).toContain(kw);
    }
  });
});
