import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/engine/tokenizer';

describe('tokenize', () => {
  it('splits simple whitespace separated words', () => {
    expect(tokenize('ml model register exp-1 --name churn-model')).toEqual([
      'ml',
      'model',
      'register',
      'exp-1',
      '--name',
      'churn-model',
    ]);
  });

  it('preserves spaces inside double quotes', () => {
    expect(tokenize('ml model register exp-1 --name "churn model"')).toEqual([
      'ml',
      'model',
      'register',
      'exp-1',
      '--name',
      'churn model',
    ]);
  });

  it('preserves spaces inside single quotes', () => {
    expect(tokenize("ml train run -n exp-1 -p 'lr=0.01 depth=40'")).toEqual([
      'ml',
      'train',
      'run',
      '-n',
      'exp-1',
      '-p',
      'lr=0.01 depth=40',
    ]);
  });

  it('handles multiple consecutive whitespace characters', () => {
    expect(tokenize('ml   data   add   data/train.csv')).toEqual([
      'ml',
      'data',
      'add',
      'data/train.csv',
    ]);
  });

  it('handles empty or whitespace only input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });

  it('handles empty quotes and escaped characters', () => {
    expect(tokenize('ml model register exp-1 --name ""')).toEqual(['ml', 'model', 'register', 'exp-1', '--name', '']);
    expect(tokenize('echo "hello \\"world\\""')).toEqual(['echo', 'hello "world"']);
  });
});
