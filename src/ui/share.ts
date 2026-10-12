import type { CurriculumSummary } from './progress';
import { ui } from '../i18n';

export const LIVE_URL = 'https://alisadeghiaghili.github.io/learn-mlops/';
export const SHARE_URL = 'https://alisadeghiaghili.github.io/learn-mlops/';
export const REPO_URL = 'https://github.com/alisadeghiaghili/learn-mlops';
export const COFFEE_URL = 'https://www.buymeacoffee.com/alisadeghil';
export const PUBLISHER = 'Ali Sadeghi Aghili';
export const COFFEE_BUTTON_HTML = `<a href="${COFFEE_URL}" target="_blank" rel="noopener noreferrer"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=alisadeghil&button_colour=2a3a4a&font_colour=ffffff&font_family=Cookie&outline_colour=ffffff&coffee_colour=FFDD00" alt="Buy me a coffee" /></a>`;

export interface ShareContext {
  levelName: string;
  levelId: string;
  commands: number | null;
  par: number;
  curriculum: CurriculumSummary;
}

function bulletList(items: { name: string; seriesTitle: string }[], limit?: number): string[] {
  const list = limit ? items.slice(0, limit) : items;
  const lines = list.map((l) => `• ${l.seriesTitle}: ${l.name}`);
  if (limit && items.length > limit) lines.push(`• …and ${items.length - limit} more`);
  return lines;
}

export function shareMessageLinkedIn(ctx: ShareContext): string {
  const u = ui();
  const c = ctx.curriculum;
  const learned = c.learned.length ? bulletList(c.learned) : [];
  const parts = [
    u.shareLinkedInHead,
    '',
    c.solvedCount > 0
      ? `${u.shareLatestWin(ctx.levelName, ctx.levelId)}${
          ctx.commands !== null ? u.shareCommands(ctx.commands, ctx.par) : ''
        }`
      : u.shareStarting,
    '',
    learned.length ? u.shareLearnedSoFar : '',
    ...learned,
    '',
    u.shareProgress(c.solvedCount, c.total),
    '',
    u.shareCta,
    SHARE_URL,
    '',
    u.shareSupport,
    COFFEE_URL,
  ];
  return parts.filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
}

export function shareMessageX(ctx: ShareContext): string {
  const u = ui();
  const c = ctx.curriculum;
  const head = u.shareXHead(c.solvedCount, c.total);
  const first = c.learned[0] ? `• ${c.learned[0].name}` : u.shareXFirst;
  let text = `${head}\n${first}\n${SHARE_URL}`;
  if (text.length > 275) text = `${head}\n${SHARE_URL}`;
  return text;
}

export interface ShareTargets {
  linkedin: string;
  x: string;
  facebook: string;
  text: string;
  shortText: string;
  url: string;
  learnedLines: string[];
}

export function buildShareTargets(ctx: ShareContext): ShareTargets {
  const u = ui();
  const longText = shareMessageLinkedIn(ctx);
  const shortText = shareMessageX(ctx);
  const url = SHARE_URL;
  return {
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(u.titleLearnDvc)}&summary=${encodeURIComponent(longText)}&source=LearnMLOps`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(longText)}`,
    text: longText,
    shortText,
    url,
    learnedLines: bulletList(ctx.curriculum.learned),
  };
}

export function openShareWindow(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer,width=720,height=640');
}

export async function copySharePayload(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Open LinkedIn/X/Facebook with a ready post; clipboard is fallback only. */
export async function shareWithClipboard(
  kind: 'linkedin' | 'facebook' | 'x' | 'copy',
  targets: ShareTargets,
): Promise<{ opened: boolean; copied: boolean }> {
  if (kind === 'copy') {
    return { opened: false, copied: await copySharePayload(targets.text) };
  }
  const copied = await copySharePayload(kind === 'x' ? targets.shortText : targets.text);
  const href =
    kind === 'linkedin' ? targets.linkedin : kind === 'facebook' ? targets.facebook : targets.x;
  openShareWindow(href);
  return { opened: true, copied };
}
