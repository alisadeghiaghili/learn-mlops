import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  CACHE_KEY,
  COUNTED_FLAG_KEY,
  COUNTER_KEY,
  getCachedVisitorCount,
  loadVisitorCount,
} from '../src/ui/visitor-counter';

const NS = 'alisadeghiaghili.github.io';
const BASE = 'https://abacus.jasoncameron.dev';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.has(k) ? (this.data.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, String(v));
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

let store: MemoryStorage;
let fetchMock: ReturnType<typeof vi.fn>;

function calls(): string[] {
  return fetchMock.mock.calls.map((c) => String(c[0]));
}

beforeEach(() => {
  store = new MemoryStorage();
  fetchMock = vi.fn();
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('visitor counter', () => {
  it('first visit hits once, sets the flag and returns the hit value', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { value: 1301 }));
    const value = await loadVisitorCount();
    expect(value).toBe(1301);
    expect(calls()).toEqual([`${BASE}/hit/${NS}/${COUNTER_KEY}`]);
    expect(store.getItem(COUNTED_FLAG_KEY)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(getCachedVisitorCount()).toBe(1301);
  });

  it('second visit only reads and never increments', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { value: 10 }));
    await loadVisitorCount();
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(json(200, { value: 12 }));
    const value = await loadVisitorCount();
    expect(value).toBe(12);
    expect(calls()).toEqual([`${BASE}/get/${NS}/${COUNTER_KEY}`]);
  });

  it('failed hit clears the flag, falls back to get, and the next visit hits again', async () => {
    fetchMock
      .mockResolvedValueOnce(json(500, { error: 'boom' }))
      .mockResolvedValueOnce(json(200, { value: 77 }));
    const value = await loadVisitorCount();
    expect(value).toBe(77);
    expect(calls().map((u) => u.split('/')[3])).toEqual(['hit', 'get']);
    expect(store.getItem(COUNTED_FLAG_KEY)).toBeNull();

    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(json(200, { value: 78 }));
    await loadVisitorCount();
    expect(calls().map((u) => u.split('/')[3])).toEqual(['hit']);
    expect(store.getItem(COUNTED_FLAG_KEY)).not.toBeNull();
  });

  it('network error on hit also clears the flag and falls back to get', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(json(200, { value: 5 }));
    expect(await loadVisitorCount()).toBe(5);
    expect(store.getItem(COUNTED_FLAG_KEY)).toBeNull();
  });

  it('malformed hit body counts as a failed hit', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('not json', { status: 200 }))
      .mockResolvedValueOnce(json(200, { value: 9 }));
    expect(await loadVisitorCount()).toBe(9);
    expect(store.getItem(COUNTED_FLAG_KEY)).toBeNull();
  });

  it('get 404 resolves to 0', async () => {
    store.setItem(COUNTED_FLAG_KEY, '2026-01-01T00:00:00.000Z');
    fetchMock.mockResolvedValueOnce(json(404, { error: 'not found' }));
    expect(await loadVisitorCount()).toBe(0);
  });

  it('replaces a stale or inflated cache with the lower server value', async () => {
    store.setItem(COUNTED_FLAG_KEY, '2026-01-01T00:00:00.000Z');
    store.setItem(CACHE_KEY, JSON.stringify({ count: 99999, at: 1 }));
    expect(getCachedVisitorCount()).toBe(99999);
    fetchMock.mockResolvedValueOnce(json(200, { value: 42 }));
    expect(await loadVisitorCount()).toBe(42);
    expect(getCachedVisitorCount()).toBe(42);
  });

  it('never hits when localStorage is unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('denied');
      },
      removeItem() {
        throw new Error('denied');
      },
    });
    fetchMock.mockResolvedValueOnce(json(200, { value: 8 }));
    expect(await loadVisitorCount()).toBe(8);
    expect(calls().map((u) => u.split('/')[3])).toEqual(['get']);
  });

  it('uses the exact namespace and course key, with no-store and an abort signal', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { value: 1 }));
    await loadVisitorCount();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/hit/alisadeghiaghili.github.io/${COUNTER_KEY}`);
    expect(COUNTER_KEY).toBe('learn-mlops-unique-visitors');
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('removes legacy keys on load', async () => {
    const slug = COUNTER_KEY.replace(/-unique-visitors$/, '');
    store.setItem(`${slug}:visitor-count-cache`, '{"count":1240,"at":1}');
    store.setItem(`${slug}:last-visit-date`, '2025-01-01');
    store.setItem(COUNTED_FLAG_KEY, '2026-01-01T00:00:00.000Z');
    fetchMock.mockResolvedValueOnce(json(200, { value: 3 }));
    await loadVisitorCount();
    expect(store.getItem(`${slug}:visitor-count-cache`)).toBeNull();
    expect(store.getItem(`${slug}:last-visit-date`)).toBeNull();
  });

  it('returns null when the server value cannot be obtained', async () => {
    store.setItem(COUNTED_FLAG_KEY, '2026-01-01T00:00:00.000Z');
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    expect(await loadVisitorCount()).toBeNull();
  });
});
