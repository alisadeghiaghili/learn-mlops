import { describe, expect, it } from 'vitest';
import type { MlopsState } from '../src/engine/types';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete, solutionProgress } from '../src/engine/solution';
import { getLevel } from '../src/levels';

function doneFor(state: MlopsState, solution: string[], includes: string): boolean | undefined {
  return solutionProgress(state, solution).find((s) => s.command.includes(includes))?.done;
}

describe('sticky checklist across MLOps levels', () => {
  it('ship-1: the full solution completes every step and leaves prod live + monitored + rollback-ready', () => {
    const level = getLevel('ship-1')!;
    let s = structuredClone(level.startState);
    for (const c of level.solution) s = executeCommand(s, c).state;
    expect(solutionComplete(s, level.solution)).toBe(true);
    expect(s.endpoints.prod.live).toBe(true);
    expect(s.endpoints.prod.monitoring.enabled).toBe(true);
    expect(s.rollbackTargets.prod).toBeDefined();
  });

  it('ship-1: the data-add step stays checked after an inspect command', () => {
    const level = getLevel('ship-1')!;
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'ml data add data/train.csv').state;
    expect(doneFor(s, level.solution, 'ml data add')).toBe(true);
    s = executeCommand(s, 'ml status').state;
    expect(doneFor(s, level.solution, 'ml data add')).toBe(true);
  });

  it('rollback-1: the deploy step stays checked across inspect noise, then rollback completes', () => {
    const level = getLevel('rollback-1')!;
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'ml deploy churn-model:2').state;
    expect(doneFor(s, level.solution, 'ml deploy churn-model:2')).toBe(true);
    expect(doneFor(s, level.solution, 'ml rollback')).toBe(false);
    s = executeCommand(s, 'ml service status').state;
    expect(doneFor(s, level.solution, 'ml deploy churn-model:2')).toBe(true);
    s = executeCommand(s, 'ml rollback').state;
    expect(solutionComplete(s, level.solution)).toBe(true);
  });

  it('a params step unchecks when the value drifts away again', () => {
    const level = getLevel('train-1')!;
    const solution = ['ml params set lr=0.1'];
    let s = structuredClone(level.startState);
    s = executeCommand(s, 'ml params set lr=0.1').state;
    expect(doneFor(s, solution, 'ml params set')).toBe(true);
    s = executeCommand(s, 'ml params set lr=0.9').state;
    expect(doneFor(s, solution, 'ml params set')).toBe(false);
  });
});
