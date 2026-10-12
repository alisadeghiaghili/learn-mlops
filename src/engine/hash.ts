/**
 * Deterministic fake content hashes for the MLOps simulator.
 * Not cryptographic — stable ids so levels and goals stay comparable.
 */

export function fakeMd5(seed: string): string {
  // 32 hex chars — looks like a real content hash in dataset/model refs.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  let h3 = 0xdeadbeef;
  let h4 = 0x8badf00d;
  const s = "learnmlops:" + seed;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + c * (i + 1)) >>> 0;
    h3 = (h3 ^ (c << (i % 24))) >>> 0;
    h4 = Math.imul(h4 ^ c, 0x85ebca6b) >>> 0;
  }
  const part = (n: number) => n.toString(16).padStart(8, "0");
  return part(h1) + part(h2) + part(h3) + part(h4);
}

export function shortMd5(md5: string): string {
  return md5.slice(0, 8);
}

export function commitHash(seed: string): string {
  return fakeMd5("commit:" + seed).slice(0, 7);
}

export function expId(seed: string): string {
  return "exp-" + fakeMd5("exp:" + seed).slice(0, 6);
}
