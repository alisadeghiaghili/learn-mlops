import { describe, expect, it } from 'vitest';
import { emptyMlopsState } from '../src/engine/state';
import type { MlopsState } from '../src/engine/types';
import { executeCommand } from '../src/engine/commands';
import { solutionProgress, solutionComplete } from '../src/engine/solution';
import { getLevel } from '../src/levels';

function doneFor(state: MlopsState, solution: string[], includes: string): boolean | undefined {
  return solutionProgress(state, solution).find((s) => s.command.includes(includes))?.done;
}

describe('checklist sticky completion', () => {
  it('keeps the deploy step checked after a failed deploy retry', () => {
    const level = getLevel('rollback-1');
    const solution = level!.solution;
    let state = structuredClone(level!.startState);

    state = executeCommand(state, 'ml deploy churn-model:2').state;
    expect(doneFor(state, solution, 'deploy churn-model:2')).toBe(true);
    expect(doneFor(state, solution, 'ml rollback')).toBe(false);
    expect(solutionComplete(state, solution)).toBe(false);

    // A failed deploy (no such version) does not change state — deploy step stays checked.
    const failed = executeCommand(state, 'ml deploy churn-model:9');
    expect(failed.result.error).toBeTruthy();
    state = failed.state;
    expect(doneFor(state, solution, 'deploy churn-model:2')).toBe(true);
    expect(doneFor(state, solution, 'ml rollback')).toBe(false);
    expect(solutionComplete(state, solution)).toBe(false);

    // The rollback finishes the level without redoing the deploy.
    state = executeCommand(state, 'ml rollback').state;
    expect(doneFor(state, solution, 'deploy churn-model:2')).toBe(true);
    expect(solutionComplete(state, solution)).toBe(true);
  });

  it('an edit step unchecks when the param value drifts away again', () => {
    const solution = ['ml init', 'edit params.yaml lr=0.1'];
    let state = emptyMlopsState();
    state = executeCommand(state, 'ml init').state;

    state = executeCommand(state, 'edit params.yaml lr=0.1').state;
    expect(doneFor(state, solution, 'edit params.yaml')).toBe(true);

    state = executeCommand(state, 'edit params.yaml lr=0.5').state;
    expect(doneFor(state, solution, 'edit params.yaml')).toBe(false);
  });
});
