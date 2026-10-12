/** Dense mental-model reference — `concepts` / `glossary` in the terminal. */

import { glossaryEntry } from '../i18n';

export interface Concept {
  id: string;
  title: string;
  body: string;
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
    return { id, title: copy.title, body: copy.body };
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
