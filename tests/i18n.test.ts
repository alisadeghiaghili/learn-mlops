import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { fa } from '../src/i18n/fa';
import { en } from '../src/i18n/en';
import { allLevels } from '../src/levels';
import { CONCEPT_IDS } from '../src/engine/glossary';

describe('i18n locale completeness', () => {
  it('covers every level id in de and fa', () => {
    for (const level of allLevels) {
      expect(de.levels[level.id], `de missing ${level.id}`).toBeTruthy();
      expect(fa.levels[level.id], `fa missing ${level.id}`).toBeTruthy();
    }
  });

  it('keeps solution and hint in English structural form (not empty)', () => {
    for (const level of allLevels) {
      expect(level.solution.length).toBeGreaterThan(0);
      expect(level.hint.length).toBeGreaterThan(0);
    }
  });

  it('translates level name/objective/dialog away from empty', () => {
    for (const level of allLevels) {
      const d = de.levels[level.id];
      const f = fa.levels[level.id];
      if (!d || !f) continue;
      expect(d.name.length).toBeGreaterThan(0);
      expect(f.name.length).toBeGreaterThan(0);
      expect(d.objective.length).toBeGreaterThan(0);
      expect(f.objective.length).toBeGreaterThan(0);
      expect(d.startDialog.length).toBeGreaterThan(0);
      expect(f.startDialog.length).toBeGreaterThan(0);
    }
  });

  it('covers every glossary concept in de and fa', () => {
    for (const id of CONCEPT_IDS) {
      expect(de.glossary[id], `de glossary ${id}`).toBeTruthy();
      expect(fa.glossary[id], `fa glossary ${id}`).toBeTruthy();
    }
  });

  it('covers every teach key in de and fa', () => {
    for (const key of Object.keys(en.teach)) {
      expect(de.teach[key], `de teach ${key}`).toBeTruthy();
      expect(fa.teach[key], `fa teach ${key}`).toBeTruthy();
    }
  });

  it('covers every help section id in de and fa', () => {
    for (const s of en.ui.helpSections) {
      expect(de.ui.helpSections.some((x) => x.id === s.id)).toBe(true);
      expect(fa.ui.helpSections.some((x) => x.id === s.id)).toBe(true);
    }
  });

  it('marks fa as rtl and de as ltr', () => {
    expect(fa.dir).toBe('rtl');
    expect(de.dir).toBe('ltr');
    expect(en.dir).toBe('ltr');
  });
});
