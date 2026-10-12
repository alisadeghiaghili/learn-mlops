import type { LevelDef, MlopsState } from '../engine/types';
import { cloneState, sandboxMlopsState } from '../engine/state';
import { commandCountsForGolf, executeCommand } from '../engine/commands';
import { evaluateGoal } from '../engine/compare';
import { solutionComplete, solutionProgress } from '../engine/solution';
import { coachLine, nextSteps } from '../engine/coach';
import { allLevels, getNextLevel, seriesOf, curriculumOutcomes } from '../levels';
import { renderBoardHtml } from './board';
import { TerminalView, type LogLine } from './terminal';
import { renderMarkdown, showModal } from './dialog';
import { buildShareTargets, COFFEE_BUTTON_HTML, REPO_URL, shareWithClipboard } from './share';
import { getLocale, localizeLevel, setLocale, ui, LOCALES } from '../i18n';
import type { Locale } from '../i18n/types';
import { launchConfetti, playFanfare } from './confetti';
import { loadProgress, resumeLine, saveProgress, summarizeCurriculum } from './progress';
import { formatUiHelpText, startUiTour, uiHelpModalHtml } from './ui-help';
import { getVisitorCount } from './visitor-counter';

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Five equal-size dots; filled count = difficulty 1–5. */
function renderDiffDots(difficulty: number): string {
  const n = Math.max(0, Math.min(5, difficulty));
  return Array.from({ length: 5 }, (_, i) => `<i class="diff-dot${i < n ? ' on' : ''}"></i>`).join('');
}

export class App {
  private root: HTMLElement;
  private state: MlopsState;
  private level: LevelDef | null = null;
  private startSnapshot: MlopsState;
  private golf: string[] = [];
  private log: LogLine[] = [];
  private solvedFlash = false;
  private progress = loadProgress();
  private terminal!: TerminalView;
  private boardEl!: HTMLElement;
  private dockEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private undoStack: MlopsState[] = [];
  private lastWasMeta = false;
  private lastWasSolution = false;
  private cachedVisitorCount: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = sandboxMlopsState();
    this.startSnapshot = cloneState(this.state);
    this.mount();
    this.renderAll();
    this.initVisitorCounter();
    this.pushMeta(ui().appWelcome);
    const summary = summarizeCurriculum(this.progress);
    if (summary.solvedCount > 0) {
      this.pushOut('');
      this.pushOut(resumeLine(summary));
    } else {
      this.pushMeta(ui().sandboxSeeded);
      this.pushMeta(ui().progressSaved);
    }
  }

  private mount(): void {
    const u = ui();
    const current = getLocale();
    const langItems = LOCALES.map(
      (loc) =>
        `<button type="button" class="lang-option${current === loc ? ' on' : ''}" data-lang="${loc}" role="menuitem" aria-checked="${current === loc}">${loc.toUpperCase()}</button>`,
    ).join('');
    this.root.innerHTML = `
      <div class="app-main">
        <header class="toolbar">
          <div class="brand" data-help-id="brand">Learn<span>MLOps</span></div>
          <div class="level-title" id="level-title" data-help-id="level-title"></div>
          <div class="toolbar-actions" data-help-id="toolbar">
            <div class="lang-menu">
              <button type="button" class="lang-btn" data-action="lang-toggle" aria-haspopup="menu" aria-expanded="false" aria-label="${escapeHtml(u.language)}">
                <span data-lang-label>${current.toUpperCase()}</span>
                <span class="lang-caret" aria-hidden="true"></span>
              </button>
              <div class="lang-dropdown" id="lang-dropdown" role="menu" hidden>
                ${langItems}
              </div>
            </div>
            <button type="button" class="nav-toggle" data-action="nav-toggle" aria-label="${escapeHtml(u.menuLabel)}" aria-expanded="false" aria-controls="nav-drawer">
              <span class="nav-bars" aria-hidden="true"></span>
            </button>
            <div class="nav-drawer" id="nav-drawer" hidden>
              <button type="button" data-action="levels">${escapeHtml(u.levels)}</button>
              <button type="button" data-action="lesson" title="${escapeHtml(u.lessonTitle)}">${escapeHtml(u.lesson)}</button>
              <button type="button" data-action="goal">${escapeHtml(u.guide)}</button>
              <button type="button" data-action="hint">${escapeHtml(u.hint)}</button>
              <button type="button" data-action="solution">${escapeHtml(u.solution)}</button>
              <button type="button" data-action="undo">${escapeHtml(u.undo)}</button>
              <button type="button" data-action="reset">${escapeHtml(u.reset)}</button>
              <button type="button" data-action="sandbox" class="ghost">${escapeHtml(u.sandboxBtn)}</button>
              <button type="button" class="help-btn" data-action="help" title="${escapeHtml(u.uiGuideTitle)}" aria-label="${escapeHtml(u.help)}">?</button>
            </div>
            <span class="tb-stat visitors" id="visitor-stat" data-help-id="links" title="${escapeHtml(u.visitorsTitle)}" hidden>
              <svg class="visitor-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0-2.21-2.69-4-6-4s-6 1.79-6 4v1h12v-1zm-1.07 0H3.07C3.56 11.83 5.48 11 8 11s4.44.83 4.93 2z"/></svg>
              <span class="visitor-count" id="visitor-count"></span>
            </span>
            <a class="tb-link gh" data-help-id="links" href="https://github.com/alisadeghiaghili/learn-mlops" target="_blank" rel="noopener noreferrer" title="${escapeHtml(u.githubTitle)}" aria-label="GitHub repository"><svg class="gh-mark" viewBox="0 0 16 16" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>
            <a class="tb-link support" data-help-id="links" href="https://www.buymeacoffee.com/alisadeghil" target="_blank" rel="noopener noreferrer" title="${escapeHtml(u.supportTitle)}">${escapeHtml(u.support)}</a>
          </div>
        </header>
        <div class="board-wrap" id="board-wrap"></div>
        <div class="terminal" id="terminal" data-help-id="term-log"></div>
      </div>
      <aside class="dock" id="dock" data-help-id="dock" aria-label="${escapeHtml(u.guidePanel)}"></aside>
    `;
    this.boardEl = this.root.querySelector('#board-wrap')!;
    this.dockEl = this.root.querySelector('#dock')!;
    this.titleEl = this.root.querySelector('#level-title')!;
    this.terminal = new TerminalView(this.root.querySelector('#terminal')!, (cmd) =>
      this.handleCommand(cmd),
    );
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'nav-toggle') {
          this.toggleNav();
          return;
        }
        if (action === 'lang-toggle') {
          this.toggleLang();
          return;
        }
        this.closeNav();
        this.closeLang();
        if (action === 'levels') this.openLevels();
        if (action === 'goal') this.focusGuide();
        if (action === 'hint') this.handleCommand('hint');
        if (action === 'solution') this.handleCommand('show solution');
        if (action === 'undo') this.handleCommand('undo');
        if (action === 'reset') this.handleCommand('reset');
        if (action === 'sandbox') this.handleCommand('sandbox');
        if (action === 'help') this.openUiHelp(true);
        if (action === 'lesson') this.replayLesson();
        this.terminal.focus();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const loc = btn.dataset.lang as Locale | undefined;
        if (!loc || loc === getLocale()) {
          this.closeLang();
          return;
        }
        setLocale(loc);
        this.remountAfterLocale();
      });
    });
  }

  private toggleNav(): void {
    const drawer = this.root.querySelector<HTMLElement>('#nav-drawer');
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="nav-toggle"]');
    if (!drawer || !btn) return;
    const open = drawer.classList.toggle('is-open');
    drawer.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) this.closeLang();
  }

  private closeNav(): void {
    const drawer = this.root.querySelector<HTMLElement>('#nav-drawer');
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="nav-toggle"]');
    if (!drawer || !btn) return;
    drawer.classList.remove('is-open');
    drawer.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  private toggleLang(): void {
    const menu = this.root.querySelector<HTMLElement>('#lang-dropdown');
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="lang-toggle"]');
    if (!menu || !btn) return;
    const open = menu.classList.toggle('is-open');
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) this.closeNav();
  }

  private closeLang(): void {
    const menu = this.root.querySelector<HTMLElement>('#lang-dropdown');
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="lang-toggle"]');
    if (!menu || !btn) return;
    menu.classList.remove('is-open');
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  private remountAfterLocale(): void {
    const levelId = this.level?.id ?? null;
    this.mount();
    if (levelId) {
      const raw = allLevels.find((l) => l.id === levelId);
      if (raw) this.level = localizeLevel(raw);
    }
    // Re-seed the log in the active locale — previous lines were captured in the old language.
    this.log = [];
    if (this.level) {
      this.pushMeta(ui().levelMeta(this.level.id, this.level.name));
      this.pushOut(this.level.objective);
      const coach = coachLine(this.state, this.level);
      if (coach) this.pushMeta(coach);
    } else {
      this.pushMeta(ui().appWelcome);
      const summary = summarizeCurriculum(this.progress);
      if (summary.solvedCount > 0) {
        this.pushOut('');
        this.pushOut(resumeLine(summary));
      } else {
        this.pushMeta(ui().sandboxSeeded);
        this.pushMeta(ui().progressSaved);
      }
    }
    this.renderAll();
    this.renderVisitorBadge();
    this.terminal.focus();
  }

  private async initVisitorCounter(): Promise<void> {
    const count = await getVisitorCount();
    if (count !== null) {
      this.cachedVisitorCount = count;
      this.renderVisitorBadge();
    }
  }

  private renderVisitorBadge(): void {
    if (this.cachedVisitorCount === null) return;
    const statEl = this.root.querySelector<HTMLElement>('#visitor-stat');
    const countEl = this.root.querySelector<HTMLElement>('#visitor-count');
    if (!statEl || !countEl) return;

    const u = ui();
    statEl.title = u.visitorsTitle;
    countEl.textContent = this.cachedVisitorCount.toLocaleString('en-US');
    statEl.hidden = false;
  }

  /** Guide panel is always visible — this only scrolls/flashes it. */
  private focusGuide(): void {
    this.dockEl.classList.remove('dock-pulse');
    void this.dockEl.offsetWidth;
    this.dockEl.classList.add('dock-pulse');
    this.dockEl.scrollTop = 0;
  }

  /** Explain every on-screen region; optional highlight tour. */
  private helpReopenTimer: number | null = null;

  private openUiHelp(runTour = false): void {
    if (runTour) startUiTour(this.root);
    const modal = showModal({
      title: ui().uiGuideTitle,
      bodyHtml: uiHelpModalHtml(),
      actions: [{ label: ui().close, className: 'ghost', onClick: () => modal.close() }],
      onClose: () => {
        if (this.helpReopenTimer !== null) {
          window.clearTimeout(this.helpReopenTimer);
          this.helpReopenTimer = null;
        }
        this.terminal.focus();
      },
    });
    modal.el.querySelectorAll<HTMLButtonElement>('[data-focus-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.focusId;
        if (!id) return;
        modal.close();
        startUiTour(this.root, id, 3000);
        if (this.helpReopenTimer !== null) window.clearTimeout(this.helpReopenTimer);
        this.helpReopenTimer = window.setTimeout(() => {
          this.helpReopenTimer = null;
          this.openUiHelp(false);
        }, 3000);
      });
    });
  }

  private pushMeta(text: string): void {
    this.log.push({ kind: 'meta', text });
    this.terminal.setLog(this.log);
  }

  private pushOut(text: string): void {
    if (!text) return;
    this.log.push({ kind: 'out', text });
    this.terminal.setLog(this.log);
  }

  private pushErr(text: string): void {
    this.log.push({ kind: 'err', text });
    this.terminal.setLog(this.log);
  }

  private renderAll(): void {
    this.boardEl.innerHTML = renderBoardHtml(this.state);
    this.titleEl.textContent = this.level
      ? ui().titleLine(this.level.id, this.level.name, this.level.par)
      : ui().sandboxTitle;
    this.renderDock();
    this.syncTerminalHints();
    // Guide panel is always mounted — never hidden.
    this.dockEl.hidden = false;
  }

  private syncTerminalHints(): void {
    if (!this.level) {
      this.terminal.setHint('ml data add data/train.csv');
      this.terminal.setExtraCompletions([]);
      return;
    }
    const steps = solutionProgress(this.state, this.level.solution);
    const next = steps.find((s) => !s.done && !s.optional);
    this.terminal.setHint(next?.command ?? null);
    this.terminal.setExtraCompletions([
      ...this.level.solution,
      ...this.level.hint.split(';').map((s) => s.trim()).filter(Boolean),
    ]);
  }

  private renderDock(): void {
    if (!this.level) {
      this.dockEl.innerHTML = `
        <h2>${escapeHtml(ui().learningGuide)}</h2>
        <p class="objective">${escapeHtml(ui().guideAlwaysOn)}</p>
        <div class="learning-box">
          <div class="next-title">${escapeHtml(ui().startHere)}</div>
          <ul>
            ${ui()
              .startHereItems.map((item) => `<li>${renderMarkdown(item)}</li>`)
              .join('')}
          </ul>
        </div>
        <div class="learning-box">
          <div class="next-title">${escapeHtml(ui().sandboxTip)}</div>
          <ul>
            ${ui()
              .sandboxTipItems.map((item) => `<li>${escapeHtml(item)}</li>`)
              .join('')}
          </ul>
        </div>
        <ul class="goal-list">
          <li class="met"><div class="g-label">${escapeHtml(ui().noActiveLevel)}</div><div class="g-detail">${escapeHtml(ui().noActiveLevelDetail)}</div></li>
        </ul>
        <div class="par-note">${ui().guideFlashNote}</div>
      `;
      return;
    }
    const level = this.level;
    const steps = solutionProgress(this.state, level.solution);
    const solved = solutionComplete(this.state, level.solution);
    const { statuses } = evaluateGoal(this.state, level.goal);
    const currentId = steps.findIndex((s) => !s.done && !s.optional);
    const items = steps.map((s, i) => {
      const isCurrent = !solved && !s.done && !s.optional && i === currentId;
      return `<li class="${s.done ? 'met' : ''}${s.optional ? ' optional' : ''}${isCurrent ? ' current' : ''}">
        <div class="g-label" dir="ltr">${s.done ? '✓' : isCurrent ? '▶' : '○'} <code>${escapeHtml(s.command)}</code>${
          s.optional ? ` <span class="chip">${escapeHtml(ui().optionalChip)}</span>` : ''
        }${isCurrent ? ` <span class="chip current-chip">${escapeHtml(ui().nowChip)}</span>` : ''}</div>
        <div class="g-detail" dir="ltr">${escapeHtml(s.note)}</div>
      </li>`;
    });
    const remaining = nextSteps(this.state, level.goal, level);
    const firstNext = remaining[0]?.command;
    const nextBlock = solved
      ? `<div class="next-box met">${escapeHtml(ui().allSolutionMet)}</div>`
      : `<div class="next-box">
            <div class="next-title">${escapeHtml(ui().typeNextTitle)}</div>
            <div class="next-row"><span class="g-label">${escapeHtml(ui().remainingLabel)}</span>${
              firstNext ? `<code class="g-cmd">${escapeHtml(firstNext)}</code>` : ''
            }</div>
            <div class="par-note">${escapeHtml(ui().wrongCommandNote)}</div>
          </div>`;
    const extra = statuses.filter((s) => !s.met);
    const prog = this.progress[level.id];
    const golfNote =
      prog?.bestCommands !== undefined
        ? ui().bestSoFar(prog.bestCommands, level.par)
        : ui().idealSolution(level.par);
    this.dockEl.innerHTML = `
      <h2>${escapeHtml(level.name)}</h2>
      <p class="objective">${escapeHtml(level.objective)}</p>
      ${
        level.learning?.length
          ? `<div class="learning-box">
              <div class="next-title">${escapeHtml(ui().youAreLearning)}</div>
              <ul>${level.learning.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
            </div>`
          : ''
      }
      ${
        level.fieldNotes?.length
          ? `<div class="field-box">
              <div class="next-title">${escapeHtml(ui().fieldNotesTitle)}</div>
              <ul>${level.fieldNotes.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
            </div>`
          : ''
      }
      <div class="par-note">${escapeHtml(golfNote)}</div>
      ${this.solvedFlash ? `<div class="solved-banner">${escapeHtml(ui().solvedBanner(this.golf.length || null))}</div>` : ''}
      ${nextBlock}
      <ul class="goal-list">${items.join('')}</ul>
      ${extra.length && !solved ? `<div class="par-note">${escapeHtml(ui().stateNotes)} ${extra.map((s) => escapeHtml(s.label)).join(' · ')}</div>` : ''}
    `;
  }

  private toggleGoal(force?: boolean): void {
    // Guide panel stays visible by default; this command only jumps attention to it.
    void force;
    this.dockEl.hidden = false;
    this.renderAll();
    this.focusGuide();
    this.pushMeta(ui().guideAlwaysRight);
  }

  private openLevels(): void {
    const series = seriesOf();
    const body = series
      .map((s) => {
        const rows = s.levels
          .map((l) => {
            const p = this.progress[l.id];
            return `<button type="button" class="level-row ${p?.solved ? 'solved' : ''}" data-level="${l.id}">
              <span class="id">${l.id}</span>
              <span class="name">${l.name}</span>
              <span class="par-note">ideal ${l.par} cmd${l.par === 1 ? '' : 's'}</span>
              <span class="chip ${p?.solved ? 'ok' : ''}" title="${escapeHtml(ui().difficultyOf(l.difficulty))}">
                ${p?.solved ? `${escapeHtml(ui().solvedLabel)} ${p.bestCommands ?? ''}` : `<span class="diff-dots" aria-label="${escapeHtml(ui().difficultyOf(l.difficulty))}">${renderDiffDots(l.difficulty)}</span>`}
              </span>
            </button>`;
          })
          .join('');
        return `<div class="series-block"><h3>${escapeHtml(s.title)}</h3><div class="level-list">${rows}</div></div>`;
      })
      .join('');

    const modal = showModal({
      title: ui().levelsTitle,
      bodyHtml: `<p>${escapeHtml(ui().pickChallenge)}</p>
        <div class="legend-box">
          <div class="next-title">${escapeHtml(ui().howToRead)}</div>
          <ul class="legend-list">
            <li>
              <span class="diff-dots" aria-hidden="true">${renderDiffDots(3)}</span>
              ${renderMarkdown(ui().difficultyLegend)}
            </li>
            <li><span class="par-note">ideal 3 cmds</span> ${renderMarkdown(ui().idealLegend)}</li>
            <li><span class="chip ok">${escapeHtml(ui().solvedLabel)} 3</span> ${renderMarkdown(ui().solvedLegend)}</li>
          </ul>
        </div>
        ${body}`,
      actions: [{ label: ui().close, className: 'ghost', onClick: () => modal.close() }],
    });

    modal.el.querySelectorAll('[data-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.level!;
        modal.close();
        this.startLevel(id);
      });
    });
  }

  private startLevel(id: string): void {
    const raw = allLevels.find((l) => l.id === id);
    if (!raw) {
      this.pushErr(ui().unknownLevel(id));
      return;
    }
    const level = localizeLevel(raw);
    this.level = level;
    this.state = cloneState(level.startState);
    this.startSnapshot = cloneState(level.startState);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.log = [];
    this.pushMeta(ui().levelMeta(level.id, level.name));
    this.pushOut(level.objective);
    const coach = coachLine(this.state, level);
    if (coach) this.pushMeta(coach);
    this.renderAll();
    this.showIntro(level);
    this.dockEl.hidden = false;
    this.renderAll();
    this.terminal.focus();
  }

  /** Replay this level's intro lesson, or the publisher/about card in sandbox. */
  private replayLesson(): void {
    if (this.level?.startDialog?.length) {
      this.showIntro(this.level);
      this.pushMeta(ui().lessonReplayed);
      this.terminal.focus();
      return;
    }
    showModal({
      title: ui().aboutTitle,
      bodyHtml: renderMarkdown(
        [
          ui().welcomeIntro,
          ui().aboutPublished,
          '',
          ui().aboutBoard,
          '',
          ui().aboutOpenLevels,
          '',
          `- [GitHub](${REPO_URL})`,
          '',
          ui().aboutSupport,
          COFFEE_BUTTON_HTML,
        ].join('\n'),
      ),
      actions: [{ label: ui().close, className: 'ghost', onClick: () => this.terminal.focus() }],
      onClose: () => this.terminal.focus(),
    });
  }

  private showIntro(level: LevelDef): void {
    if (!level.startDialog.length) return;
    let idx = 0;
    const show = () => {
      const slide = level.startDialog[idx];
      const actions = [];
      const modalRef: { close: () => void } = { close: () => undefined };
      if (idx > 0) {
        actions.push({
          label: ui().back,
          className: 'ghost',
          onClick: () => {
            idx -= 1;
            modalRef.close();
            show();
          },
        });
      }
      if (idx < level.startDialog.length - 1) {
        actions.push({
          label: ui().next,
          className: 'primary',
          onClick: () => {
            idx += 1;
            modalRef.close();
            show();
          },
        });
      } else {
        actions.push({
          label: ui().startLevel,
          className: 'primary',
          onClick: () => {
            modalRef.close();
            this.terminal.focus();
          },
        });
      }
      const m = showModal({
        title: slide.title ?? ui().levelMeta(level.id, ''),
        bodyHtml: renderMarkdown(slide.markdown),
        actions,
        onClose: () => this.terminal.focus(),
      });
      modalRef.close = m.close;
    };
    show();
  }

  private enterSandbox(): void {
    this.level = null;
    this.state = sandboxMlopsState();
    this.startSnapshot = cloneState(this.state);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.log = [];
    this.pushMeta(ui().sandboxMode);
    this.renderAll();
    this.terminal.focus();
  }

  private resetLevel(): void {
    this.state = cloneState(this.startSnapshot);
    this.golf = [];
    this.undoStack = [];
    this.solvedFlash = false;
    this.pushMeta(this.level ? ui().resetLevel(this.level.id) : ui().resetSandbox);
    if (this.level) {
      const coach = coachLine(this.state, this.level);
      if (coach) this.pushMeta(coach);
    }
    this.renderAll();
    this.terminal.focus();
  }

  private showSolution(): void {
    if (!this.level) {
      this.pushMeta(ui().noSolutionSandbox);
      return;
    }
    const cmds = this.level.solution;
    showModal({
      title: ui().solutionTitle(this.level.id),
      bodyHtml: renderMarkdown(
        [
          ui().solutionCommands,
          '',
          '```',
          cmds.join('\n'),
          '```',
          '',
          ui().solutionWarn,
        ].join('\n'),
      ),
      actions: [
        { label: ui().cancel, className: 'ghost', onClick: () => this.terminal.focus() },
        {
          label: ui().runSolution,
          className: 'primary',
          onClick: () => {
            this.resetLevel();
            for (const c of cmds) this.runCommand(c, { fromSolution: true });
            this.terminal.focus();
          },
        },
      ],
    });
  }

  private handleCommand(raw: string): void {
    const cmd = raw.trim();
    if (!cmd) return;
    this.lastWasMeta = true;
    this.log.push({ kind: 'cmd', text: cmd });
    this.terminal.setLog(this.log);

    // meta
    const lower = cmd.toLowerCase();
    if (lower === 'levels' || lower === 'level') {
      this.openLevels();
      return;
    }
    if (lower === 'sandbox' || lower === 'exit level') {
      this.enterSandbox();
      return;
    }
    if (lower === 'hint') {
      this.pushOut(this.level?.hint ?? ui().noHintSandbox);
      if (this.level) {
        const coach = coachLine(this.state, this.level);
        if (coach) this.pushMeta(coach);
      }
      return;
    }
    if (lower === 'steps' || lower === 'next') {
      if (!this.level) {
        this.pushMeta(ui().noGoalSandbox);
        return;
      }
      const coach = coachLine(this.state, this.level);
      this.pushOut(coach ?? ui().allStepsMet);
      this.dockEl.hidden = false;
      this.renderAll();
      return;
    }
    if (lower === 'show goal' || lower === 'goal') {
      this.toggleGoal(true);
      return;
    }
    if (lower === 'hide goal') {
      this.toggleGoal(false);
      return;
    }
    if (lower === 'show solution' || lower === 'solution') {
      this.showSolution();
      return;
    }
    if (lower === 'reset') {
      this.resetLevel();
      return;
    }
    if (lower === 'undo') {
      if (!this.undoStack.length) {
        this.pushErr(ui().nothingToUndo);
        return;
      }
      this.state = this.undoStack.pop()!;
      if (this.golf.length) this.golf.pop();
      this.pushMeta(ui().undoMeta);
      this.afterStateChange();
      return;
    }
    if (lower === 'clear') {
      this.log = [];
      this.terminal.clear();
      return;
    }
    if (lower === 'lesson' || lower === 'intro' || lower === 'about') {
      this.replayLesson();
      return;
    }
    if (
      lower === 'help' ||
      lower === '?' ||
      lower === 'help ui' ||
      lower === 'help page' ||
      lower === 'tour'
    ) {
      if (lower === 'help' || lower === '?') {
        this.pushOut(
          [
            'help ui | tour     — explain every UI region (and highlight them)',
            'lesson | intro | about — replay level lesson or publisher/about card',
            ui().helpLinks,
            'curriculum         — learning outcomes',
            'concepts           — MLOps mental models glossary',
            'levels             — challenge browser',
          ].join('\n'),
        );
      }
      if (lower === 'help ui' || lower === 'help page' || lower === 'tour') {
        this.pushOut(formatUiHelpText());
        this.openUiHelp(true);
      } else if (lower === 'help' || lower === '?') {
        this.pushOut(formatUiHelpText());
        this.openUiHelp(false);
      }
      this.terminal.focus();
      return;
    }

    if (lower === 'curriculum' || lower === 'outcomes' || lower === 'syllabus') {
      const lines = curriculumOutcomes().map((o, i) => `${String(i + 1).padStart(2, ' ')}. ${o}`);
      const summary = summarizeCurriculum(this.progress);
      this.pushOut(ui().curriculumOutcomes);
      this.pushOut(lines.join('\n'));
      this.pushMeta(ui().progressLevels(summary.solvedCount, summary.total));
      this.pushMeta(ui().fieldGlossary);
      this.terminal.focus();
      return;
    }
    if (lower === 'concepts' || lower === 'glossary' || lower.startsWith('concepts ') || lower.startsWith('glossary ')) {
      // Engine handles concepts content; meta only re-focuses terminal after.
      this.runCommand(cmd, { fromSolution: false });
      this.terminal.focus();
      return;
    }

    if (lower === 'quiz' || lower.startsWith('quiz ')) {
      this.runQuiz(lower.slice(4).trim());
      return;
    }

    this.runCommand(cmd, { fromSolution: false });
  }

  private get quizItems() {
    return ui().quiz;
  }

  private quizIndex = 0;

  private runQuiz(arg: string): void {
    if (!arg) {
      this.quizIndex = 0;
      this.askQuiz();
      return;
    }
    const pick = arg.toUpperCase();
    const item = this.quizItems[this.quizIndex];
    if (!item) return;
    const idx = pick === 'A' ? 0 : pick === 'B' ? 1 : pick === 'C' ? 2 : -1;
    if (idx < 0) {
      this.pushErr(ui().quizAnswerUsage);
      return;
    }
    if (idx === item.correct) {
      this.pushOut(ui().correct);
    } else {
      this.pushOut(`✗ Not quite. Best answer: ${['A', 'B', 'C'][item.correct]} — ${item.a[item.correct]}`);
    }
    this.quizIndex += 1;
    this.askQuiz();
    this.terminal.focus();
  }

  private askQuiz(): void {
    const item = this.quizItems[this.quizIndex];
    if (!item) {
      this.pushOut(ui().quizFinished);
      this.quizIndex = 0;
      return;
    }
    this.pushOut(
      [
        `${ui().quizHeader(this.quizIndex + 1, this.quizItems.length)}: ${item.q}`,
        ...item.a.map((a, i) => `  ${['A', 'B', 'C'][i]}) ${a}`),
        ui().quizAnswerUsage,
      ].join('\n'),
    );
    this.terminal.focus();
  }

  private runCommand(cmd: string, opts: { fromSolution: boolean }): void {
    this.lastWasMeta = false;
    this.lastWasSolution = opts.fromSolution;
    const prev = cloneState(this.state);
    const { state, result } = executeCommand(this.state, cmd);

    if (result.error) {
      // Wrong command: keep every completed step — never bounce the level.
      this.state = prev;
      this.pushErr(result.error);
      if (this.level) {
        const steps = solutionProgress(this.state, this.level.solution);
        const next = steps.find((s) => !s.done && !s.optional);
        if (next?.command) {
          this.pushMeta(ui().progressKept(next.command));
        }
      }
    } else {
      this.state = state;
      if (result.output) this.pushOut(result.output);
    }

    const counts = commandCountsForGolf(cmd) && !result.error;
    if (counts && !opts.fromSolution) {
      this.undoStack.push(prev);
      this.golf.push(cmd);
    } else if (counts && opts.fromSolution) {
      this.undoStack.push(prev);
    }

    this.afterStateChange();

    // Keep the caret in the terminal prompt unless a modal (celebration) took focus.
    if (!document.querySelector('.overlay .modal')) {
      this.terminal.focus();
    }
  }

  private afterStateChange(): void {
    if (this.level) {
      const solved = solutionComplete(this.state, this.level.solution);
      if (solved && !this.solvedFlash) {
        this.solvedFlash = true;
        const num = this.golf.length;
        const best = this.progress[this.level.id]?.bestCommands;
        const nextBest = best === undefined ? num : Math.min(best, num);
        this.progress[this.level.id] = { solved: true, bestCommands: nextBest };
        saveProgress(this.progress);
        this.pushOut('');
        this.pushOut(ui().levelSolvedBanner + ' ' + this.level.name);
        this.pushOut(
          num > 0
            ? ui().commandsUsed(num, this.level.par)
            : ui().idealCommands(this.level.par),
        );
        this.pushOut(ui().partyMode);
        this.dockEl.hidden = false;
      } else if (!solved && this.solvedFlash) {
        this.solvedFlash = false;
      }
      // After a real command in a level, always surface the next concrete step.
      if (this.level && !solved && !this.lastWasMeta && !this.lastWasSolution) {
        const coach = coachLine(this.state, this.level);
        if (coach) {
          const first = nextSteps(this.state, this.level.goal, this.level)[0];
          if (first?.command) {
            this.pushMeta(ui().nextMeta(first.command));
          } else {
            this.pushMeta(coach.split('\n')[0] ?? ui().continueGoal);
          }
        }
      }
    }
    this.renderAll();
    if (this.solvedFlash && this.level) this.maybeOfferNext();
  }

  private offered = false;

  private maybeOfferNext(): void {
    if (!this.level || this.offered) return;
    this.offered = true;

    const level = this.level;
    const next = getNextLevel(level.id);
    const cmds = this.golf.length || null;
    const curriculum = summarizeCurriculum(this.progress);
    const share = buildShareTargets({
      levelName: level.name,
      levelId: level.id,
      commands: cmds,
      par: level.par,
      curriculum,
    });
    const total = allLevels.length;
    const solvedCount = curriculum.solvedCount;
    const underPar = cmds !== null && cmds <= level.par;
    const golfLine =
      cmds === null
        ? ui().idealForLevel(level.par)
        : underPar
          ? `**${cmds}** ${ui().idealForLevelShort(level.par)}`
          : `**${cmds}** command${cmds === 1 ? '' : 's'}. Ideal is ${level.par}. Still counts — you got there.`;

    const cheers = ui().cheers;
    const cheer = cheers[Math.floor(Math.random() * cheers.length)]!;

    const learnedPreview = curriculum.learned
      .map((l) => `<li>${escapeHtml(l.seriesTitle)}: ${escapeHtml(l.name)}</li>`)
      .join('');

    const bodyHtml = `
      <div class="celebrate" aria-live="polite">
        <div class="celebrate-visual" aria-hidden="true">
          <div class="celebrate-ring"></div>
          <div class="celebrate-star">★</div>
        </div>
        <div class="celebrate-badge">LEVEL CLEARED</div>
        <h3 class="celebrate-title">${escapeHtml(level.name)}</h3>
        <p class="celebrate-sub">${escapeHtml(level.seriesTitle)} · <code>${escapeHtml(level.id)}</code></p>
        <p class="celebrate-cheer">${escapeHtml(cheer)}</p>
        <div class="celebrate-stats">${renderMarkdown(golfLine)}</div>
        <div class="celebrate-progress">
          <div class="prog-track"><div class="prog-fill" style="width:${curriculum.percent}%"></div></div>
          <div class="par-note">${solvedCount} / ${total} levels solved · progress saved in this browser</div>
        </div>
        <div class="share-block">
          <div class="next-title">${escapeHtml(ui().shareTitle)}</div>
          <div class="learned-preview">
            <div class="par-note">${escapeHtml(ui().styleList)}</div>
            <ul>${learnedPreview || `<li>${escapeHtml(ui().solveMoreLevels)}</li>`}</ul>
          </div>
          <div class="share-row" role="group" aria-label="${escapeHtml(ui().shareGroupLabel)}">
            <button type="button" class="share-btn linkedin" data-share="linkedin">${escapeHtml(ui().linkedin)}</button>
            <button type="button" class="share-btn x" data-share="x">${escapeHtml(ui().xTwitter)}</button>
            <button type="button" class="share-btn facebook" data-share="facebook">${escapeHtml(ui().facebook)}</button>
            <button type="button" class="share-btn copy" data-share="copy">${escapeHtml(ui().copyPost)}</button>
          </div>
          <div class="share-status" data-share-status hidden></div>
        </div>
        ${
          next
            ? `<div class="celebrate-next">${renderMarkdown(ui().nextCelebration(next.id, next.name))}</div>`
            : `<div class="celebrate-next">${renderMarkdown(ui().lastInPack)}</div>`
        }
      </div>
    `;

    const actions = [
      {
        label: ui().baskInIt,
        className: 'ghost',
        onClick: () => {
          this.offered = false;
          this.terminal.focus();
        },
      },
    ];
    if (next) {
      actions.push({
        label: ui().celebrateOn(next.id),
        className: 'primary',
        onClick: () => {
          this.offered = false;
          this.startLevel(next.id);
        },
      });
    } else {
      actions.push({
        label: ui().browseLevels,
        className: 'primary',
        onClick: () => {
          this.offered = false;
          this.openLevels();
        },
      });
    }

    // Party first — then the modal.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const confetti = launchConfetti(4800);
    playFanfare();

    const modal = showModal({
      title: ui().levelComplete,
      bodyHtml,
      variant: 'celebrate',
      actions: actions.map((a) => ({
        ...a,
        onClick: () => {
          confetti?.stop();
          modal.close();
          a.onClick();
        },
      })),
      onClose: () => {
        confetti?.stop();
        this.offered = false;
        this.terminal.focus();
      },
    });

    modal.el.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const kind = (btn.dataset.share ?? 'copy') as 'linkedin' | 'facebook' | 'x' | 'copy';
        const status = modal.el.querySelector<HTMLElement>('[data-share-status]');
        const result = await shareWithClipboard(kind, share);
        if (!status) return;
        status.hidden = false;
        if (kind === 'copy') {
          status.textContent = result.copied ? ui().copyOk : ui().copyFail;
          return;
        }
        status.textContent = result.copied ? ui().shareCopied : ui().shareOpened;
      });
    });

    modal.el.querySelector('.modal')?.addEventListener('keydown', (ev) => {
      const key = (ev as KeyboardEvent).key;
      if (key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
  }
}
