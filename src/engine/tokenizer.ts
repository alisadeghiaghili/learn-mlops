/**
 * POSIX-compliant shell-words tokenizer for LearnDVC simulator CLI.
 * Handles single quotes, double quotes, and escaped characters robustly.
 */

export function tokenize(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  let hasToken = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escaped) {
      current += char;
      hasToken = true;
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingle) {
      escaped = true;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      hasToken = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      hasToken = true;
      continue;
    }

    if (/\s/.test(char) && !inDouble && !inSingle) {
      if (hasToken) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }

    current += char;
    hasToken = true;
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
}
