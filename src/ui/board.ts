import type { MlopsState } from '../engine/types';
import { getLocale, ui } from '../i18n';

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Translated zone name plus the English term so learners keep the MLOps vocabulary. */
function zoneTitle(translated: string, english: string): string {
  if (getLocale() === 'en' || translated === english) return translated;
  return `${translated} (${english})`;
}

/** Simple inline markdown for board notes (code + bold only). */
function note(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderDataset(state: MlopsState): string {
  const u = ui();
  const datasets = Object.values(state.datasets);
  if (!datasets.length) {
    return `<div class="empty-note">${note(u.workspaceEmpty)}</div>`;
  }
  const cards = datasets
    .map((d) => {
      const chips: string[] = [];
      if (d.current !== null) {
        chips.push(`<span class="chip dvc">${esc(d.name)}@${d.current}</span>`);
        chips.push('<span class="chip">versioned</span>');
      } else {
        chips.push('<span class="chip warn">unversioned</span>');
      }
      if (d.drift?.enabled) {
        const alert = d.drift.score > d.drift.threshold;
        chips.push(
          `<span class="chip ${alert ? 'err' : 'cache'}">drift ${d.drift.score.toFixed(2)}${alert ? ' ⚠' : ''}</span>`,
        );
      }
      return `<div class="card">
        <div class="path">${esc(d.path)}</div>
        <div class="meta"><span class="chip dataset">${esc(d.name)}</span>${chips.join('')}</div>
      </div>`;
    })
    .join('');
  return `<div class="cards">${cards}</div>`;
}

function renderRegistry(state: MlopsState): string {
  const u = ui();
  const runs = state.runs;
  const models = Object.values(state.registry);
  if (!runs.length && !models.length) {
    return `<div class="empty-note">${note(u.cacheEmpty)}</div>`;
  }
  const runCards = runs
    .map(
      (r) => `<div class="card">
        <div class="path">${esc(r.id)}</div>
        <div class="meta"><span class="chip cache">run</span><span>${esc(r.datasetRef ?? 'no data')}</span><span>${esc(r.status)}</span></div>
      </div>`,
    )
    .join('');
  const modelCards = models
    .map((m) => {
      const vs = m.versions
        .map((v) => {
          const stageChip =
            v.stage === 'Production' ? 'dvc' : v.stage === 'Staging' ? 'cache' : '';
          return `<span class="chip ${stageChip}">v${v.version} ${esc(v.stage)}</span>`;
        })
        .join('');
      return `<div class="card">
        <div class="path">${esc(m.name)}</div>
        <div class="meta">${vs}</div>
      </div>`;
    })
    .join('');
  return `<div class="cards">${runCards}${modelCards}</div>`;
}

function renderService(state: MlopsState): string {
  const u = ui();
  const endpoints = Object.values(state.endpoints);
  const targets = Object.values(state.rollbackTargets);
  if (!endpoints.length) {
    return `<div class="empty-note">${note(u.remoteEmpty)}</div>`;
  }
  const endpointCards = endpoints
    .map((e) => {
      const ref = e.modelRef ? `${esc(e.modelRef.name)}:v${e.modelRef.version}` : 'cold';
      const stateChip = e.live ? 'remote ok' : 'remote err';
      const monChip = e.monitoring.enabled
        ? `<span class="chip ${e.monitoring.driftAlert ? 'err' : 'cache'}">monitoring ${e.monitoring.driftAlert ? '⚠ drift' : 'on'}</span>`
        : '<span class="chip warn">monitoring off</span>';
      return `<div class="card">
        <div class="path">${esc(e.name)}${e.url ? ` → ${esc(e.url)}` : ''}</div>
        <div class="meta"><span class="chip ${stateChip}">${e.live ? 'live' : 'offline'}</span><span class="chip remote">${ref}</span>${monChip}<span>${e.predictionsServed} served</span></div>
      </div>`;
    })
    .join('');

  const targetCards = targets.length
    ? targets
        .map(
          (t) => `<div class="card">
            <div class="path">rollback · ${esc(t.endpoint)}</div>
            <div class="meta"><span class="chip dvc">${esc(t.modelRef.name)}:v${t.modelRef.version}</span><span>safety net</span></div>
          </div>`,
        )
        .join('')
    : `<div class="empty-note">${note(u.rollbackEmpty)}</div>`;

  return `<div class="cards">${endpointCards}${targetCards}</div>`;
}

function renderDag(state: MlopsState): string {
  const u = ui();
  if (!state.pipeline.length) return '';
  const nodes = state.pipeline
    .map((s, i) => {
      const sep = i ? '<span class="arrow">→</span>' : '';
      return `${sep}<div class="stage-node ${s.upToDate ? 'up' : 'stale'}">
        <div><strong>${esc(s.name)}</strong>${s.frozen ? ' [frozen]' : ''}</div>
        <div class="cmd">${esc(s.cmd)}</div>
      </div>`;
    })
    .join('');
  return `<div class="dag" data-help-id="dag"><h2>${esc(u.pipelineTitle)}</h2><div class="stages">${nodes}</div>
    ${
      Object.keys(state.metrics).length
        ? `<div class="flow-arrow">metrics: ${esc(
            Object.entries(state.metrics)
              .map(([k, v]) => `${k}=${v}`)
              .join(' · '),
          )}</div>`
        : ''
    }
  </div>`;
}

export function renderBoardHtml(state: MlopsState): string {
  const u = ui();
  const datasetCount = Object.values(state.datasets).filter((d) => d.current !== null).length;
  const modelCount = Object.values(state.registry).length;
  const liveCount = Object.values(state.endpoints).filter((e) => e.live).length;
  return `
    <div class="status-bar" data-help-id="status-pills">
      <div class="pill ${state.initialized ? 'ok' : 'err'}">ml <strong>${state.initialized ? 'init' : 'not initialized'}</strong></div>
      <div class="pill">datasets <strong>${datasetCount}</strong></div>
      <div class="pill">runs <strong>${state.runs.length}</strong></div>
      <div class="pill">models <strong>${modelCount}</strong></div>
      <div class="pill">live endpoints <strong>${liveCount}</strong></div>
    </div>
    <div class="board">
      <section class="zone workspace" data-help-id="workspace-zone" aria-label="${esc(zoneTitle(u.workspace, 'Dataset'))}">
        <h2><span class="dot" style="color:var(--text)"></span> ${esc(zoneTitle(u.workspace, 'Dataset'))}</h2>
        <p class="zone-hint">${esc(u.workspaceHint)}</p>
        <p class="zone-why">${note(u.workspaceWhy)}</p>
        ${renderDataset(state)}
      </section>
      <section class="zone cache" data-help-id="cache-zone" aria-label="${esc(zoneTitle(u.cache, 'Model Registry'))}">
        <h2><span class="dot"></span> ${esc(zoneTitle(u.cache, 'Model Registry'))}</h2>
        <p class="zone-hint">${esc(u.cacheHint)}</p>
        <p class="zone-why">${note(u.cacheWhy)}</p>
        ${renderRegistry(state)}
      </section>
      <section class="zone remote" data-help-id="remote-zone" aria-label="${esc(zoneTitle(u.remote, 'Service'))}">
        <h2><span class="dot"></span> ${esc(zoneTitle(u.remote, 'Service'))}</h2>
        <p class="zone-hint">${esc(u.remoteHint)}</p>
        <p class="zone-why">${note(u.remoteWhy)}</p>
        ${renderService(state)}
      </section>
    </div>
    <div class="flow-arrow" data-help-id="flow-arrow">${note(u.flowArrow)}</div>
    ${renderDag(state)}
  `;
}
