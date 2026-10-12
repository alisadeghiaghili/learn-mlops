import { describe, expect, it } from 'vitest';
import { parseVisitorBadgeSvg } from '../src/ui/visitor-counter';

describe('parseVisitorBadgeSvg', () => {
  it('parses visitor count from visitorbadge title', () => {
    const svg = `<svg role="img" aria-label="VISITORS: 10 / 25"><title>VISITORS: 10 / 25</title></svg>`;
    expect(parseVisitorBadgeSvg(svg)).toBe(10);
  });

  it('parses formatted count with commas', () => {
    const svg = `<svg><title>VISITORS: 1,450</title></svg>`;
    expect(parseVisitorBadgeSvg(svg)).toBe(1450);
  });

  it('parses abbreviations like K and M', () => {
    const svgK = `<svg><title>VISITORS: 2.5K</title></svg>`;
    expect(parseVisitorBadgeSvg(svgK)).toBe(2500);

    const svgM = `<svg><title>VISITORS: 1.2M</title></svg>`;
    expect(parseVisitorBadgeSvg(svgM)).toBe(1200000);
  });

  it('returns null on invalid title', () => {
    const svg = `<svg><title>NO COUNT HERE</title></svg>`;
    expect(parseVisitorBadgeSvg(svg)).toBeNull();
  });
});
