import { describe, expect, it } from 'vitest';
import { allLevels, curriculumOutcomes, getLevel } from '../src/levels';
import { emptyMlopsState } from '../src/engine/state';
import { executeCommand } from '../src/engine/commands';
import { solutionComplete } from '../src/engine/solution';
import { formatConcepts, CONCEPT_IDS, findConcept } from '../src/engine/glossary';
import { en } from '../src/i18n/en';

function runLevel(levelId: string, cmds?: string[]) {
  const level = getLevel(levelId)!;
  let state = structuredClone(level.startState);
  const commands = cmds ?? level.solution;
  for (const c of commands) state = executeCommand(state, c).state;
  return state;
}

describe('field practice levels', () => {
  it('rollback-1 upgrade-then-rollback completes and returns prod to v1', () => {
    const level = getLevel('rollback-1')!;
    const s = runLevel('rollback-1');
    expect(solutionComplete(s, level.solution)).toBe(true);
    expect(s.endpoints.prod.modelRef).toEqual({ name: 'churn-model', version: 1 });
  });

  it('ship-1 capstone solution completes into a guarded ship', () => {
    const s = runLevel('ship-1');
    expect(solutionComplete(s, getLevel('ship-1')!.solution)).toBe(true);
    expect(s.endpoints.prod.monitoring.enabled).toBe(true);
    expect(s.rollbackTargets.prod).toBeDefined();
  });

  it('glossary is dense and non-empty', () => {
    const text = formatConcepts();
    expect(text.length).toBeGreaterThan(400);
    expect(text).toContain('Dataset version');
    expect(text).toContain('Lineage');
    expect(text).toContain('Rollback target');
    expect(CONCEPT_IDS).toHaveLength(12);
  });

  it('curriculum outcomes name MLOps lifecycle skills', () => {
    const outcomes = curriculumOutcomes().join('\n');
    expect(outcomes).toMatch(/ingest/i);
    expect(outcomes).toMatch(/monitoring/i);
    expect(outcomes).toMatch(/rollback/i);
    expect(outcomes).toMatch(/shipped/i);
    expect(outcomes).toMatch(/concepts/i);
  });

  it('every level has learning bullets and at least 2 dialog slides', () => {
    for (const level of allLevels) {
      expect(level.learning.length, level.id).toBeGreaterThan(0);
      expect(level.startDialog.length, level.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('concepts command resolves a MLOps concept', () => {
    const result = executeCommand(emptyMlopsState(), 'concepts drift').result;
    expect(result.ok).toBe(true);
    const out = result.output || result.error || '';
    expect(out.toLowerCase()).toContain('drift');
  });

  it('concepts with an unknown term fails cleanly', () => {
    const result = executeCommand(emptyMlopsState(), 'concepts not-a-concept').result;
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('every concept carries an ELI-PHD deep-dive (en is the source of truth)', () => {
    for (const id of CONCEPT_IDS) {
      const dd = en.glossary[id]?.deepdive;
      expect(dd, `en deep-dive missing for ${id}`).toBeTruthy();
      expect(dd!.length, `en deep-dive too thin for ${id}`).toBeGreaterThanOrEqual(3);
      expect(dd!.every((l) => l.length > 20), `en deep-dive line too short for ${id}`).toBe(true);
    }
  });

  it('the single-term concepts command surfaces the deep-dive', () => {
    const result = executeCommand(emptyMlopsState(), 'concepts drift').result;
    const out = result.output || '';
    expect(out).toContain('Deep dive');
    const concept = findConcept('drift')!;
    expect(concept.deepdive).toBeTruthy();
  });
});
