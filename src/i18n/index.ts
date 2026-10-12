/** Locale runtime: switch language, localize level copy, document dir. */

import type { Catalog, Locale, LevelCopy, UiCopy } from './types';
import { LOCALES } from './types';
export { LOCALES };
export type { Locale, LevelCopy, UiCopy, Catalog };
import type { LevelDef } from '../engine/types';
import { en } from './en';
import { de } from './de';
import { fa } from './fa';

const STORAGE_KEY = 'learnmlops-locale';

const catalogs: Record<Locale, Catalog> = { en, de, fa };

let current: Locale = 'en';

function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as string[]).includes(v);
}

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* private mode */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  if (nav.toLowerCase().startsWith('de')) return 'de';
  if (nav.toLowerCase().startsWith('fa') || nav.toLowerCase().startsWith('pe')) return 'fa';
  return 'en';
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  applyDocumentLocale();
}

export function getCatalog(): Catalog {
  return catalogs[current];
}

export function ui(): UiCopy {
  return catalogs[current].ui;
}

export function getDir(): 'ltr' | 'rtl' {
  return catalogs[current].dir;
}

export function applyDocumentLocale(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current;
  document.documentElement.dir = getDir();
}

export function initLocale(): Locale {
  current = detectLocale();
  applyDocumentLocale();
  return current;
}

/**
 * Overlay localized teaching copy onto a level.
 * Never touches `hint`, `solution`, `goal`, or `startState` — those stay English/structural.
 */
export function localizeLevel(level: LevelDef): LevelDef {
  const copy = catalogs[current].levels[level.id];
  if (!copy || current === 'en') return level;
  return {
    ...level,
    seriesTitle: copy.seriesTitle,
    name: copy.name,
    objective: copy.objective,
    learning: copy.learning,
    fieldNotes: copy.fieldNotes ?? level.fieldNotes,
    startDialog: copy.startDialog.length ? copy.startDialog : level.startDialog,
  };
}

export function levelCopy(level: LevelDef): LevelCopy {
  return {
    seriesTitle: level.seriesTitle,
    name: level.name,
    objective: level.objective,
    learning: level.learning,
    fieldNotes: level.fieldNotes,
    startDialog: level.startDialog,
  };
}

export function teachEntry(key: string) {
  return catalogs[current].teach[key] ?? catalogs.en.teach[key];
}

export function glossaryEntry(id: string) {
  return catalogs[current].glossary[id] ?? catalogs.en.glossary[id];
}

export function quizItems(): UiCopy['quiz'] {
  return catalogs[current].ui.quiz;
}
