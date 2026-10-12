import type { MlopsState } from './types';
import { teachEntry } from '../i18n';

/**
 * Short "why this command matters" blocks appended to simulator output.
 * Goal: learners leave with mental models, not only muscle memory.
 * Command names stay English; explanation lines are localized.
 */

export function teachBlock(title: string, lines: string[]): string {
  return ['', `── Why: ${title} ──`, ...lines.map((l) => `  ${l}`)].join('\n');
}

function teachFromKey(key: string): string | null {
  const entry = teachEntry(key);
  if (!entry) return null;
  return teachBlock(entry.title, entry.lines);
}

export function teachAfterCommand(raw: string, _state: MlopsState): string | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  if (/^ml\s+init\b/.test(cmd)) return teachFromKey('ml-init');
  if (/^ml\s+data\s+add\b/.test(cmd)) return teachFromKey('ml-data-add');
  if (/^ml\s+train\s+run\b/.test(cmd)) return teachFromKey('ml-train-run');
  if (/^ml\s+model\s+register\b/.test(cmd)) return teachFromKey('ml-model-register');
  if (/^ml\s+deploy\b/.test(cmd)) return teachFromKey('ml-deploy');
  if (/^ml\s+monitor\s+on\b/.test(cmd)) return teachFromKey('ml-monitor-on');
  if (/^ml\s+rollback\b/.test(cmd)) return teachFromKey('ml-rollback');
  if (/^ml\s+predict\b/.test(cmd)) return teachFromKey('ml-predict');
  if (/^ml\s+params\s+set\b/.test(cmd)) return teachFromKey('ml-params-set');
  if (/^ml\s+status\b/.test(cmd) || /^ml\s+service\b/.test(cmd)) return teachFromKey('ml-status');

  return null;
}
