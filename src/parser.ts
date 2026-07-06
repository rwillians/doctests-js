/**
 * Dependency-free doctest parser. Scans JSDoc blocks for `@example`
 * tags and turns their fenced code blocks into executable steps. Text
 * scanning only — no TypeScript compiler API — so it works the same
 * for `.js` and `.ts` sources.
 */

export type Step =
  | { kind: 'exec'; code: string }
  | { kind: 'equal'; binding: string | null; expression: string; expected: string }
  | { kind: 'throws'; expression: string; error: string; message: string | null };

export type Example = {
  description: string;
  blocks: Step[][];
};

export type Doc = {
  subject: string;
  exported: boolean;
  examples: Example[];
};

const COMMENT = /\/\*\*([\s\S]*?)\*\//g;
const STAR_PREFIX = /^\s*\* ?/;
const TAG = /^@(\w+)\s*/;
const FENCE = /^```/;
const DECLARATION = /^(export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|enum)\s+([A-Za-z_$][\w$]*)/;
const BINDING = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;
const THROWS = /^\*\*\s*\(([^)]+)\)\s*(.*)$/;

const cleanLine = (line: string): string => line.replace(STAR_PREFIX, '').trimEnd();

/**
 * The symbol a JSDoc block documents: the first declaration after the
 * comment (blank lines and `//` comments in between are skipped).
 */
const declarationAfter = (source: string, index: number): { subject: string; exported: boolean } | null => {
  for (const line of source.slice(index).split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('//')) continue;

    const match = DECLARATION.exec(trimmed);
    if (!match) return null;

    return { subject: match[2]!, exported: match[1] !== undefined };
  }

  return null;
};

/**
 * Splits a cleaned JSDoc body into `@example` sections. A section runs
 * from its `@example` line to the next `@tag` (or the end of the
 * block). Tag-looking lines inside code fences are left alone.
 */
const splitExamples = (lines: string[]): string[][] => {
  const sections: string[][] = [];
  let current: string[] | null = null;
  let fenced = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (FENCE.test(trimmed)) {
      fenced = !fenced;
      current?.push(line);
      continue;
    }

    const tag = fenced ? null : TAG.exec(trimmed);

    if (tag) {
      current = tag[1] === 'example' ? [trimmed.replace(TAG, '')] : null;
      if (current) sections.push(current);
      continue;
    }

    current?.push(line);
  }

  return sections;
};

const classify = (line: string): Step => {
  const at = line.indexOf('//=');

  if (at < 0) return { kind: 'exec', code: line };

  const expression = line.slice(0, at).trim().replace(/;$/, '');
  const rest = line.slice(at + 3).trim();

  if (rest === '') throw new Error(`malformed doctest assertion, expected a value after \`//=\`: ${line}`);

  // No expression can start with `**` (exponentiation is infix), so a
  // `** (ErrorType)` right-hand side unambiguously marks a throws
  // assertion. The optional message is raw text up to the end of the
  // line, ExUnit-style — no quoting.
  if (rest.startsWith('**')) {
    const throws = THROWS.exec(rest);
    if (!throws) throw new Error(`malformed doctest assertion, expected \`//= ** (ErrorType) optional message\`: ${line}`);

    return { kind: 'throws', expression, error: throws[1]!.trim(), message: throws[2]!.trim() || null };
  }

  const binding = BINDING.exec(expression);
  return { kind: 'equal', binding: binding?.[1] ?? null, expression, expected: rest };
};

/**
 * Parses one `@example` section. The description is the text from the
 * tag up to the first blank line or code fence; prose paragraphs after
 * that are ignored. Each fenced code block becomes its own group of
 * steps — the runner registers one test per block.
 */
const parseExample = (lines: string[]): Example => {
  const description: string[] = [];
  const blocks: Step[][] = [];
  let block: Step[] | null = null;
  let describing = true;

  for (const line of lines) {
    const trimmed = line.trim();

    if (FENCE.test(trimmed)) {
      describing = false;

      if (block === null) {
        block = [];
      } else {
        if (block.length > 0) blocks.push(block);
        block = null;
      }

      continue;
    }

    if (block !== null) {
      if (trimmed !== '') block.push(classify(trimmed));
      continue;
    }

    if (describing && trimmed === '') {
      describing = false;
      continue;
    }

    if (describing) description.push(trimmed);
  }

  return { description: description.join(' ').replace(/\s+/g, ' ').trim(), blocks };
};

export const parse = (source: string): Doc[] => {
  const docs: Doc[] = [];

  for (const match of source.matchAll(COMMENT)) {
    const declaration = declarationAfter(source, match.index + match[0].length);
    if (!declaration) continue;

    const lines = match[1]!.split('\n').map(cleanLine);
    const examples = splitExamples(lines).map(parseExample).filter((example) => example.blocks.length > 0);
    if (examples.length === 0) continue;

    docs.push({ ...declaration, examples });
  }

  return docs;
};
