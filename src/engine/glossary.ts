/** Dense mental-model reference — `concepts` / `glossary` in the terminal. */

import { glossaryEntry } from '../i18n';

export interface Concept {
  id: string;
  title: string;
  body: string;
  /** The ELI-PHD on-ramp (explicit result + theory + open frontiers), if any. */
  deepdive?: string[];
}

export const CONCEPT_IDS = [
  'dataset-version',
  'lineage',
  'run',
  'registry',
  'champion',
  'endpoint',
  'deploy-swap',
  'rollback',
  'monitoring',
  'drift',
  'params',
  'loop',
] as const;

export function localizedConcepts(): Concept[] {
  return CONCEPT_IDS.map((id) => {
    const copy = glossaryEntry(id);
    const concept: Concept = { id, title: copy.title, body: copy.body };
    if (copy.deepdive?.length) concept.deepdive = copy.deepdive;
    return concept;
  });
}

/** Back-compat alias for tests and callers expecting CONCEPTS. */
export const CONCEPTS: Concept[] = localizedConcepts();

export function formatConcepts(): string {
  return localizedConcepts()
    .map((c, i) => `${i + 1}. ${c.title}\n   ${c.body}`)
    .join('\n\n');
}

export function findConcept(query: string): Concept | undefined {
  const q = query.trim().toLowerCase();
  return localizedConcepts().find((c) => c.id === q || c.title.toLowerCase().includes(q));
}

/** A concept plus its ELI-PHD deep-dive, for a single-term lookup. */
export function formatConceptFull(c: Concept): string {
  const parts = [`${c.title}\n${c.body}`];
  if (c.deepdive?.length) {
    parts.push('─ Deep dive (the result behind the intuition) ─');
    parts.push(...c.deepdive);
  }
  return parts.join('\n');
}
