import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/ui/dialog';

const underHood = [
  'After `ml deploy`:',
  '',
  '| Zone | Content |',
  '| --- | --- |',
  '| Dataset | still has `train@1` (versioned) |',
  '| Model Registry | the registered `churn-model:v2` promoted to Production |',
  '| Service | `prod` live → `churn-model:v2`, v1 held as rollback target |',
  '',
  'One loop, three zones:',
  '',
  '- **Dataset** → versioned, lineage-bearing',
  '- **Registry** → bottled, deployable versions',
].join('\n');

describe('markdown tables', () => {
  it('renders GFM pipe tables as real HTML tables', () => {
    const md = [
      'After `ml deploy`:',
      '',
      '| Zone | Content |',
      '| --- | --- |',
      '| Dataset | still has `train@1` |',
      '| Registry | the registered version |',
    ].join('\n');
    const html = renderMarkdown(md);
    expect(html).toContain('<table');
    expect(html).toContain('<th>Zone</th>');
    expect(html).toContain('<th>Content</th>');
    expect(html).toContain('<td>');
    expect(html).toContain('<code>train@1</code>');
    expect(html).toContain('the registered version');
    expect(html).not.toContain('| --- |');
  });

  it('renders the deploy under-the-hood slide as a table + list', () => {
    const html = renderMarkdown(underHood);
    expect(html).toContain('<table');
    expect(html).toContain('<th>Zone</th>');
    expect(html).toContain('<td>Dataset</td>');
    expect(html).toContain('rollback target');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).not.toContain('| Zone |');
    expect(html).not.toContain('| --- |');
  });

  it('still renders code fences and bold around tables', () => {
    const html = renderMarkdown('**Note**\n\n```\nml deploy exp-1\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<strong>Note</strong>');
    expect(html).toContain('<pre>');
    expect(html).toContain('<table');
  });
});
