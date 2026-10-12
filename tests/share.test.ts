import { describe, expect, it } from 'vitest';
import { buildShareTargets, shareMessageLinkedIn, shareMessageX } from '../src/ui/share';
import { summarizeCurriculum } from '../src/ui/progress';
import { allLevels } from '../src/levels';

function fakeProgress(ids: string[]): Record<string, { solved: boolean; bestCommands?: number }> {
  const p: Record<string, { solved: boolean; bestCommands?: number }> = {};
  for (const id of ids) p[id] = { solved: true, bestCommands: 3 };
  return p;
}

describe('curriculum share messages', () => {
  it('lists learned levels in the LinkedIn post', () => {
    const curriculum = summarizeCurriculum(fakeProgress(['init-1', 'data-1']));
    const text = shareMessageLinkedIn({
      levelName: 'Version the training dataset',
      levelId: 'data-1',
      commands: 3,
      par: 1,
      curriculum,
    });
    expect(text).toContain('I am really happy');
    expect(curriculum.solvedCount).toBe(2);
    expect(curriculum.learned).toHaveLength(2);
    expect(text).toContain('Basics: Initialize the MLOps project');
    expect(text).toContain('Basics: Version the training dataset');
    expect(text).toContain('What I have learned so far');
    expect(text).toContain('learn-mlops');
  });

  it('X text stays short and mentions progress', () => {
    const ids = allLevels.map((l) => l.id);
    const curriculum = summarizeCurriculum(fakeProgress(ids.slice(0, 5)));
    const short = shareMessageX({
      levelName: 'x',
      levelId: ids[4],
      commands: 2,
      par: 5,
      curriculum,
    });
    expect(short).toContain('5/');
    expect(short.length).toBeLessThanOrEqual(280);
  });

  it('share targets include the MLOps title and learned levels', () => {
    const curriculum = summarizeCurriculum(fakeProgress(['init-1']));
    const targets = buildShareTargets({
      levelName: 'Initialize the MLOps project',
      levelId: 'init-1',
      commands: 3,
      par: 1,
      curriculum,
    });
    expect(targets.linkedin).toContain('linkedin.com');
    expect(decodeURIComponent(targets.linkedin)).toContain('Initialize the MLOps project');
    expect(targets.learnedLines.join(' ')).toContain('Initialize the MLOps project');
  });
});
