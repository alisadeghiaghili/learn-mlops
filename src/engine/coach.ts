import type { GoalCheck, LevelDef, MlopsState } from './types';
import { evaluateGoal } from './compare';
import { solutionProgress, suggestFromSolution } from './solution';
import { ui } from '../i18n';

export interface NextStep {
  label: string;
  command: string | null;
}

/**
 * Remaining work, authored from the level solution itself.
 * Goal checks and solution steps stay aligned on purpose.
 * Solution notes stay English (command verification labels).
 */
export function nextSteps(state: MlopsState, goal: GoalCheck, level?: LevelDef | null): NextStep[] {
  if (level?.solution?.length) {
    return solutionProgress(state, level.solution)
      .filter((s) => !s.done)
      .map((s) => ({ label: s.note, command: s.command }));
  }
  const { statuses } = evaluateGoal(state, goal);
  const steps: NextStep[] = [];
  statuses.forEach((st, i) => {
    if (st.met) return;
    const cmd =
      suggestFromSolution(state, (level ?? null) as LevelDef | null) ??
      (st.command ?? null);
    steps.push({ label: st.label, command: i === 0 ? cmd : null });
  });
  return steps;
}

export function formatNextSteps(steps: NextStep[], level: LevelDef | null): string {
  const u = ui();
  if (!steps.length) {
    return u.coachAllDone;
  }
  const lines = [u.coachNextSteps(steps.length, level ? level.id : '')];
  steps.forEach((s, i) => {
    const cmd = s.command ? `\n      ${s.command}` : '';
    lines.push(`  ${i + 1}. [ ] ${s.label}${cmd}`);
  });
  lines.push(u.coachFooter);
  return lines.join('\n');
}

/** Coach text after every real command in a level. */
export function coachLine(state: MlopsState, level: LevelDef | null): string | null {
  if (!level) return null;
  if (level.solution.length && solutionProgress(state, level.solution).every((s) => s.done)) {
    return null;
  }
  const { solved } = evaluateGoal(state, level.goal);
  if (solved && !level.solution.length) return null;
  return formatNextSteps(nextSteps(state, level.goal, level), level);
}
