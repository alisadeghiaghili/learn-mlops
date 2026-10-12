/** Locale and copy shapes for LearnDVC. Commands and CLI output stay English. */

import type { DialogSlide } from '../engine/types';

export type Locale = 'en' | 'de' | 'fa';

export const LOCALES: Locale[] = ['en', 'de', 'fa'];

export interface LevelCopy {
  seriesTitle: string;
  name: string;
  objective: string;
  learning: string[];
  fieldNotes?: string[];
  startDialog: DialogSlide[];
}

export interface TeachEntry {
  title: string;
  lines: string[];
}

export interface GlossaryCopy {
  title: string;
  body: string;
}

export interface QuizItemCopy {
  q: string;
  a: [string, string, string];
  correct: number;
}

export interface UiCopy {
  appWelcome: string;
  sandboxSeeded: string;
  progressSaved: string;
  lesson: string;
  lessonTitle: string;
  help: string;
  levels: string;
  guide: string;
  hint: string;
  solution: string;
  undo: string;
  reset: string;
  sandboxBtn: string;
  titleLine: (id: string, name: string, par: number) => string;
  sandboxTitle: string;
  learningGuide: string;
  guideAlwaysOn: string;
  startHere: string;
  startHereItems: string[];
  uiTourMeta: string;
  youAreLearning: string;
  fieldNotesTitle: string;
  typeNext: string;
  checklist: string;
  objectiveLabel: string;
  sandboxTip: string;
  sandboxTipItems: string[];
  noActiveLevel: string;
  noActiveLevelDetail: string;
  guideFlashNote: string;
  allSolutionMet: string;
  typeNextTitle: string;
  remainingLabel: string;
  wrongCommandNote: string;
  inProduction: string;
  solvedBanner: (n: number | null) => string;
  stateNotes: string;
  pickChallenge: string;
  howToRead: string;
  difficultyLegend: string;
  idealLegend: string;
  solvedLegend: string;
  optionalChip: string;
  nowChip: string;
  undoMeta: string;
  correct: string;
  levelSolvedBanner: string;
  partyMode: string;
  github: string;
  githubTitle: string;
  visitors: (count: string) => string;
  visitorsTitle: string;
  support: string;
  supportTitle: string;
  guidePanel: string;
  uiGuideTitle: string;
  close: string;
  highlightRegions: string;
  highlightThis: string;
  bestSoFar: (commands: number, par: number) => string;
  idealSolution: (par: number) => string;
  guideAlwaysRight: string;
  difficultyOf: (n: number) => string;
  solvedLabel: string;
  levelsTitle: string;
  aboutTitle: string;
  aboutPublished: string;
  aboutBoard: string;
  aboutOpenLevels: string;
  aboutSupport: string;
  back: string;
  next: string;
  startLevel: string;
  solutionTitle: (id: string) => string;
  solutionCommands: string;
  solutionWarn: string;
  cancel: string;
  runSolution: string;
  noHintSandbox: string;
  noGoalSandbox: string;
  allStepsMet: string;
  nothingToUndo: string;
  helpLinks: string;
  curriculumOutcomes: string;
  progressLevels: (solved: number, total: number) => string;
  fieldGlossary: string;
  quizAnswerUsage: string;
  quizFinished: string;
  quizHeader: (i: number, n: number) => string;
  progressKept: (cmd: string) => string;
  commandsUsed: (n: number, par: number) => string;
  idealCommands: (par: number) => string;
  nextMeta: (cmd: string) => string;
  continueGoal: string;
  idealForLevel: (par: number) => string;
  idealForLevelShort: (par: number) => string;
  cheers: string[];
  shareTitle: string;
  styleList: string;
  shareGroupLabel: string;
  linkedin: string;
  xTwitter: string;
  facebook: string;
  copyPost: string;
  baskInIt: string;
  celebrateOn: (id: string) => string;
  browseLevels: string;
  levelComplete: string;
  copyOk: string;
  copyFail: string;
  shareOpened: string;
  shareCopied: string;
  unknownLevel: (id: string) => string;
  levelMeta: (id: string, name: string) => string;
  lessonReplayed: string;
  sandboxMode: string;
  resetLevel: (id: string) => string;
  resetSandbox: string;
  noSolutionSandbox: string;
  nextCelebration: (id: string, name: string) => string;
  lastInPack: string;
  solvedCountLabel: (n: number, total: number) => string;
  learnMoreList: string;
  solveMoreLevels: string;
  tabFillsWord: string;
  nextPrompt: string;
  nextPlaceholder: (hint: string) => string;
  termAriaLabel: string;
  workspaceEmpty: string;
  cacheEmpty: string;
  remoteEmpty: string;
  remoteEmptyCmd: string;
  remoteNoObjects: string;
  rollbackEmpty: string;
  flowCaption: string;
  flowArrow: string;
  workspaceHint: string;
  workspaceWhy: string;
  cacheHint: string;
  cacheWhy: string;
  remoteHint: string;
  remoteWhy: string;
  pipelineTitle: string;
  language: string;
  menuLabel: string;
  workspace: string;
  cache: string;
  remote: string;
  coachAllDone: string;
  coachNextSteps: (n: number, id: string) => string;
  coachFooter: string;
  shareLinkedInHead: string;
  shareStarting: string;
  shareLatestWin: (name: string, id: string) => string;
  shareCommands: (n: number, par: number) => string;
  shareLearnedSoFar: string;
  shareProgress: (solved: number, total: number) => string;
  shareCta: string;
  shareSupport: string;
  shareXHead: (solved: number, total: number) => string;
  shareXFirst: string;
  shareHandson: string;
  titleLearnDvc: string;
  welcomeTitle: string;
  welcomeTitleHtml?: string;
  welcomeIntro: string;
  welcomeBoard: string;
  welcomeTracks: string;
  welcomeMeta: string;
  welcomeLevelsCount: (n: number) => string;
  welcomeWhat: string;
  welcomeWhatBody: string;
  welcomePublisher: string;
  welcomePublisherBody: string;
  welcomeGithub: string;
  welcomeCoffee: string;
  sandbox: string;
  openLevels: string;
  useIt: string;
  uiHelpMapTitle: string;
  uiHelpCommands: string;
  helpSections: { id: string; selector: string; title: string; what: string; how: string }[];
  quiz: QuizItemCopy[];
}

export interface Catalog {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  ui: UiCopy;
  teach: Record<string, TeachEntry>;
  glossary: Record<string, GlossaryCopy>;
  levels: Record<string, LevelCopy>;
}
