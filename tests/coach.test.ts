import { describe, expect, it } from 'vitest';
import { emptyMlopsState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete, solutionProgress } from '../src/engine/solution';
import { getLevel, allLevels } from '../src/levels';

describe('solution checklist mirrors goals', () => {
  it('init-1 checklist: ml init', () => {
    const level = getLevel('init-1');
    expect(level).toBeTruthy();
    expect(level!.solution).toEqual(['ml init']);

    let state = emptyMlopsState();
    let steps = solutionProgress(state, level!.solution);
    expect(steps[0].done).toBe(false);
    expect(steps[0].command).toBe('ml init');

    state = executeCommand(state, 'ml init').state;
    steps = solutionProgress(state, level!.solution);
    expect(steps[0].done).toBe(true);
    expect(solutionComplete(state, level!.solution)).toBe(true);
  });

  it('every level solution command appears in the checklist UI list', () => {
    for (const level of allLevels) {
      const steps = solutionProgress(level.startState, level.solution);
      expect(steps.map((s) => s.command)).toEqual(level.solution);
    }
  });

  it('level solutions complete their checklists', () => {
    for (const level of allLevels) {
      let state = structuredClone(level.startState);
      for (const cmd of level.solution) {
        state = executeCommand(state, cmd).state;
      }
      expect(
        solutionComplete(state, level.solution),
        `checklist incomplete for ${level.id}: ${JSON.stringify(solutionProgress(state, level.solution))}`,
      ).toBe(true);
    }
  });
});
