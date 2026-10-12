import './style.css';
import { App } from './ui/app';
import { allLevels } from './levels';
import { showModal, renderMarkdown } from './ui/dialog';
import { initLocale, ui, applyDocumentLocale } from './i18n';
import { COFFEE_BUTTON_HTML } from './ui/share';

initLocale();
applyDocumentLocale();

const root = document.querySelector('#app');
if (!root) throw new Error('#app root missing');

const app = new App(root as HTMLElement);

const params = new URLSearchParams(window.location.search);
if (!params.has('NODEMO')) {
  const u = ui();
  showModal({
    title: u.welcomeTitle,
    titleHtml: u.welcomeTitleHtml,
    bodyHtml: renderMarkdown(
      [
        u.welcomeIntro,
        '',
        u.welcomeBoard,
        '',
        u.welcomeTracks,
        '',
        u.welcomeMeta,
        '',
        u.welcomeLevelsCount(allLevels.length),
        '',
        u.welcomeWhat,
        u.welcomeWhatBody,
        '',
        u.welcomePublisher,
        u.welcomePublisherBody,
        '',
        u.welcomeGithub,
        '',
        u.welcomeCoffee,
        '',
        COFFEE_BUTTON_HTML,
      ].join('\n'),
    ),
    actions: [
      {
        label: u.sandbox,
        className: 'ghost',
        onClick: () => undefined,
      },
      {
        label: u.openLevels,
        className: 'primary',
        onClick: () => {
          const btn = document.querySelector<HTMLButtonElement>('[data-action="levels"]');
          btn?.click();
        },
      },
    ],
  });
}

// expose for debugging in console
(window as unknown as { learnMlopsApp: App }).learnMlopsApp = app;
