/**
 * Unique-visitor counter client.
 *
 * The number lives only on the server. A browser is counted once, ever: a
 * per-course localStorage flag decides between `hit` (increment) and `get`
 * (read only). The cached value is a first-paint placeholder and is always
 * replaced by whatever the server returns.
 */

export const COUNTER_API = 'https://abacus.jasoncameron.dev';
export const COUNTER_NAMESPACE = 'alisadeghiaghili.github.io';
export const COURSE_SLUG = 'learn-mlops';
export const COUNTER_KEY = `${COURSE_SLUG}-unique-visitors`;
export const REQUEST_TIMEOUT_MS = 5000;

export const COUNTED_FLAG_KEY = `${COURSE_SLUG}:visitor-counted:v1`;
export const CACHE_KEY = `${COURSE_SLUG}:visitor-count:v2`;

/** Keys written by earlier counter implementations; removed on load. */
const LEGACY_KEYS = [
  `${COURSE_SLUG}:visitor-count-cache`,
  `${COURSE_SLUG}:last-visit-date`,
];

export interface CachedCount {
  count: number;
  at: number;
}

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function removeLegacyKeys(): void {
  const store = storage();
  if (!store) return;
  for (const key of LEGACY_KEYS) {
    try {
      store.removeItem(key);
    } catch {
      // storage unavailable
    }
  }
}

export function getCachedVisitorCount(): number | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedCount>;
    return isCount(cached.count) ? cached.count : null;
  } catch {
    return null;
  }
}

function writeCache(count: number): void {
  const store = storage();
  if (!store) return;
  try {
    const entry: CachedCount = { count, at: Date.now() };
    store.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota or private mode
  }
}

type Outcome = { kind: 'ok'; value: number } | { kind: 'missing' } | { kind: 'error' };

async function request(action: 'get' | 'hit'): Promise<Outcome> {
  const url = `${COUNTER_API}/${action}/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (res.status === 404) return { kind: 'missing' };
    if (!res.ok) return { kind: 'error' };
    const body = (await res.json()) as { value?: unknown };
    return isCount(body?.value) ? { kind: 'ok', value: body.value } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

function toCount(outcome: Outcome): number | null {
  if (outcome.kind === 'ok') return outcome.value;
  if (outcome.kind === 'missing') return 0;
  return null;
}

/**
 * Registers this browser (once) and resolves the server's visitor count.
 * Returns null when the server value could not be obtained.
 */
export async function loadVisitorCount(): Promise<number | null> {
  removeLegacyKeys();

  const store = storage();
  let canHit = false;
  if (store) {
    try {
      canHit = store.getItem(COUNTED_FLAG_KEY) === null;
      if (canHit) store.setItem(COUNTED_FLAG_KEY, new Date().toISOString());
    } catch {
      canHit = false;
    }
  }

  let count: number | null = null;
  if (canHit) {
    const hit = await request('hit');
    if (hit.kind === 'ok') {
      count = hit.value;
    } else {
      try {
        store?.removeItem(COUNTED_FLAG_KEY);
      } catch {
        // storage unavailable
      }
    }
  }

  if (count === null) count = toCount(await request('get'));

  if (count !== null) writeCache(count);
  return count;
}
