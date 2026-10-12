import { describe, expect, it } from 'vitest';
import { emptyMlopsState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete } from '../src/engine/solution';
import { getLevel } from '../src/levels';

function run(state = emptyMlopsState(), cmds: string[]) {
  let s = state;
  const outputs: string[] = [];
  for (const c of cmds) {
    const r = executeCommand(s, c);
    s = r.state;
    outputs.push(r.result.output || r.result.error || '');
  }
  return { state: s, outputs };
}

const HAPPY = [
  'ml init',
  'ml data add data/train.csv',
  'ml train run -n exp-1 -p lr=0.1 -p depth=40',
  'ml model register exp-1 --name churn-model',
  'ml deploy exp-1',
];

describe('lifecycle gap pack', () => {
  it('deploy promotes the registered version to Production', () => {
    const { state } = run(emptyMlopsState(), HAPPY);
    const model = state.registry['churn-model'];
    expect(model.versions).toHaveLength(1);
    expect(model.versions[0]!.stage).toBe('Production');
    expect(model.current).toBe(1);
  });

  it('a second register + deploy records the previous version as the rollback target', () => {
    let { state } = run(emptyMlopsState(), HAPPY);
    const { state: after } = run(state, [
      'ml train run -n exp-2 -p lr=0.05 -p depth=60',
      'ml model register exp-2 --name churn-model',
      'ml deploy churn-model:2',
    ]);
    expect(after.registry['churn-model'].versions).toHaveLength(2);
    expect(after.registry['churn-model'].versions[1]!.stage).toBe('Production');
    expect(after.endpoints.prod.modelRef).toEqual({ name: 'churn-model', version: 2 });
    expect(after.rollbackTargets.prod?.modelRef).toEqual({ name: 'churn-model', version: 1 });
  });

  it('rollback restores the recorded target and clears it', () => {
    let { state } = run(emptyMlopsState(), HAPPY);
    state = run(state, ['ml train run -n exp-2 -p lr=0.05 -p depth=60']).state;
    state = run(state, ['ml model register exp-2 --name churn-model']).state;
    state = run(state, ['ml deploy churn-model:2']).state;
    const { state: rolled } = run(state, ['ml rollback']);
    expect(rolled.endpoints.prod.modelRef).toEqual({ name: 'churn-model', version: 1 });
    expect(rolled.registry['churn-model'].versions[0]!.stage).toBe('Production');
    expect(rolled.rollbackTargets.prod).toBeUndefined();
  });

  it('predict serves traffic, accrues predictions, and nudges drift upward', () => {
    let { state } = run(emptyMlopsState(), [...HAPPY, 'ml monitor on']);
    const before = state.datasets.train.drift!.score;
    const { state: after, outputs } = run(state, ['ml predict --n 20']);
    expect(after.endpoints.prod.predictionsServed).toBeGreaterThan(0);
    expect(after.datasets.train.drift!.score).toBeGreaterThan(before);
    expect(outputs[0]).toMatch(/Served 20 prediction/i);
  });

  it('cat pipeline.yaml / model.yaml expose the lifecycle rail and registry', () => {
    const { outputs } = run(emptyMlopsState(), [...HAPPY, 'cat pipeline.yaml', 'cat model.yaml']);
    const all = outputs.join('\n');
    expect(all).toMatch(/stages:/);
    expect(all).toMatch(/ingest:/);
    expect(all).toMatch(/models:/);
    expect(all).toMatch(/churn-model/);
  });

  it('ls surfaces datasets, runs, models, and endpoints', () => {
    const { outputs } = run(emptyMlopsState(), [...HAPPY, 'ls']);
    expect(outputs[outputs.length - 1]).toMatch(/data\/train\.csv/);
    expect(outputs[outputs.length - 1]).toMatch(/run:exp-1/);
    expect(outputs[outputs.length - 1]).toMatch(/model:churn-model/);
    expect(outputs[outputs.length - 1]).toMatch(/endpoint:prod/);
  });
});

describe('capstone ship-1', () => {
  it('solution completes and the board reflects a shipped, guarded model', () => {
    const level = getLevel('ship-1')!;
    const { state } = run(structuredClone(level.startState), level.solution);
    expect(solutionComplete(state, level.solution)).toBe(true);
    expect(state.datasets.train.current).toBe(1);
    expect(state.registry['churn-model'].versions.some((v) => v.stage === 'Production')).toBe(true);
    expect(state.endpoints.prod.live).toBe(true);
    expect(state.endpoints.prod.monitoring.enabled).toBe(true);
    expect(state.rollbackTargets.prod).toBeDefined();
  });
});
