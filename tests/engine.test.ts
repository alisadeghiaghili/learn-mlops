import { describe, expect, it } from 'vitest';
import { executeCommand } from '../src/engine/commands';
import { emptyMlopsState } from '../src/engine/state';
import { evaluateGoal } from '../src/engine/compare';
import { allLevels } from '../src/levels';

function runAll(state = emptyMlopsState(), commands: string[]) {
  let s = state;
  const outputs: string[] = [];
  for (const c of commands) {
    const step = executeCommand(s, c);
    s = step.state;
    outputs.push(step.result.error ?? step.result.output);
  }
  return { state: s, outputs };
}

describe('engine basics', () => {
  it('ml init seeds the lifecycle rail and a cold prod endpoint', () => {
    const { state } = runAll(emptyMlopsState(), ['ml init']);
    expect(state.initialized).toBe(true);
    expect(state.pipeline.map((p) => p.name)).toEqual(['ingest', 'train', 'eval', 'register', 'deploy', 'monitor']);
    expect(state.pipeline.every((p) => !p.upToDate)).toBe(true);
    expect(state.endpoints.prod).toBeDefined();
    expect(state.endpoints.prod.live).toBe(false);
  });

  it('happy path: data → run → register → deploy leaves prod live in Production', () => {
    const { state } = runAll(emptyMlopsState(), [
      'ml init',
      'ml data add data/train.csv',
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
      'ml model register exp-1 --name churn-model',
      'ml deploy exp-1',
    ]);
    expect(state.datasets.train.current).toBe(1);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0].datasetRef).toBe('train@1');
    expect(Object.keys(state.metrics).length).toBeGreaterThan(0);
    expect(state.registry['churn-model'].versions).toHaveLength(1);
    expect(state.registry['churn-model'].versions[0]!.stage).toBe('Production');
    expect(state.endpoints.prod.live).toBe(true);
    expect(state.endpoints.prod.modelRef).toEqual({ name: 'churn-model', version: 1 });
  });

  it('deploy records the previous live model as the rollback target, then rollback restores it', () => {
    let state = runAll(emptyMlopsState(), [
      'ml init',
      'ml data add data/train.csv',
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
      'ml model register exp-1 --name churn-model',
      'ml deploy exp-1',
    ]).state;
    state = runAll(state, [
      'ml train run -n exp-2 -p lr=0.05 -p depth=60',
      'ml model register exp-2 --name churn-model',
      'ml deploy churn-model:2',
    ]).state;
    expect(state.endpoints.prod.modelRef).toEqual({ name: 'churn-model', version: 2 });
    expect(state.rollbackTargets.prod?.modelRef).toEqual({ name: 'churn-model', version: 1 });

    state = runAll(state, ['ml rollback']).state;
    expect(state.endpoints.prod.modelRef).toEqual({ name: 'churn-model', version: 1 });
    expect(state.rollbackTargets.prod).toBeUndefined();
  });

  it('monitor arms drift; predict nudges it past a live model', () => {
    const { state } = runAll(emptyMlopsState(), [
      'ml init',
      'ml data add data/train.csv',
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
      'ml model register exp-1 --name churn-model',
      'ml deploy exp-1',
      'ml monitor on',
    ]);
    expect(state.endpoints.prod.monitoring.enabled).toBe(true);
    expect(state.datasets.train.drift?.enabled).toBe(true);
    const before = state.datasets.train.drift!.score;
    const after = runAll(state, ['ml predict --n 10']).state;
    expect(after.endpoints.prod.predictionsServed).toBeGreaterThan(0);
    expect(after.datasets.train.drift!.score).toBeGreaterThan(before);
  });

  it('inspect commands run without error and report state', () => {
    const { outputs } = runAll(emptyMlopsState(), [
      'ml init',
      'ml data add data/train.csv',
      'ml status',
      'ml runs',
      'ml registry',
      'ml metrics show',
      'ml drift show',
    ]);
    expect(outputs.find((o) => o.includes('endpoint prod'))).toBeTruthy();
    expect(outputs.find((o) => /dataset train: v1/i.test(o))).toBeTruthy();
  });

  it('ml params set stubs the train stage dirty', () => {
    const { state } = runAll(emptyMlopsState(), [
      'ml init',
      'ml data add data/train.csv',
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
    ]);
    expect(state.pipeline.find((p) => p.name === 'train')?.upToDate).toBe(true);
    const after = runAll(state, ['ml params set lr=0.2']).state;
    expect(after.params.lr).toBe(0.2);
    expect(after.pipeline.find((p) => p.name === 'train')?.upToDate).toBe(false);
  });
});

describe('level solutions solve goals', () => {
  for (const level of allLevels) {
    it(`solution works for ${level.id}`, () => {
      let state = structuredClone(level.startState);
      for (const cmd of level.solution) {
        state = executeCommand(state, cmd).state;
      }
      const result = evaluateGoal(state, level.goal);
      expect(result.solved, `Level ${level.id} failed: ${result.statuses.map((s) => s.detail).join('; ')}`).toBe(true);
    });
  }
});
