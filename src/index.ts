import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'bun:test';

import { compile } from './compiler';
import { parse, type Step } from './parser';

type Exports = Record<string, unknown>;
type ErrorName = (error: unknown, expected: string) => string;
type Compiled = (exports: Exports, expect: unknown, errorName: ErrorName) => Promise<void>;

const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
  ...source: string[]
) => Compiled;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Matches a thrown value against an expected error name. Returns the
 * expected name on a match (by `error.name` or constructor name), or
 * the closest description of what was actually thrown — so a mismatch
 * reads as `expect(received).toBe(expected)` with both names visible.
 */
const errorName: ErrorName = (error, expected) => {
  if (error === null || typeof error !== 'object') return String(error);

  const names = [(error as Error).name, error.constructor?.name];
  if (names.includes(expected)) return expected;

  return names.find((name) => typeof name === 'string') ?? String(error);
};

let transpiler: Bun.Transpiler | undefined;

/** Strips TypeScript syntax so ```ts blocks run through `new Function`. */
const transpile = (code: string): string => {
  if (typeof Bun === 'undefined') return code;

  transpiler ??= new Bun.Transpiler({ loader: 'ts', deadCodeElimination: false });
  return transpiler.transformSync(code);
};

const run = async (exports: Exports, steps: Step[]): Promise<void> => {
  const names = Object.keys(exports).filter((name) => IDENTIFIER.test(name));
  const header = names.length > 0 ? `const { ${names.join(', ')} } = __exports__;` : '';
  const body = transpile(compile(steps));
  const compiled = new AsyncFunction('__exports__', 'expect', '__errorName', `"use strict";\n${header}\n${body}`);

  await compiled(exports, expect, errorName);
};

const title = (description: string): string => description.replace(/\.$/, '') || 'doctest';

const register = (root: string, path: string): void => {
  const source = readFileSync(resolve(root, path), 'utf8');
  const docs = parse(source).filter((doc) => doc.exported);
  if (docs.length === 0) return;

  describe(path, () => {
    for (const doc of docs) {
      describe(doc.subject, () => {
        for (const example of doc.examples) {
          const name = title(example.description);

          for (const [index, block] of example.blocks.entries()) {
            const label = example.blocks.length === 1 ? name : `${name} (${index + 1})`;

            it(label, async () => {
              const exports = (await import(resolve(root, path))) as Exports;
              await run(exports, block);
            });
          }
        }
      });
    }
  });
};

type DoctestOptions = {
  include: string[];
  exclude?: string[];
};

/**
 * Registers every doctest found in the files matched by the `include`
 * globs (relative to the current working directory, minus any matched
 * by `exclude`) as regular `bun:test` cases:
 * `describe(file) > describe(symbol) > it(example)`.
 * Doctests on symbols that are not exported are skipped. A bare array
 * of globs is accepted as shorthand for `{ include }`.
 */
export const doctest = (options: string[] | DoctestOptions): void => {
  const { include, exclude = [] } = Array.isArray(options) ? { include: options } : options;
  const root = process.cwd();
  const paths = new Set<string>();

  for (const pattern of include) {
    for (const path of new Bun.Glob(pattern).scanSync({ cwd: root })) {
      paths.add(path);
    }
  }

  const excluded = exclude.map((pattern) => new Bun.Glob(pattern));

  for (const path of [...paths].sort()) {
    if (excluded.some((glob) => glob.match(path))) continue;
    register(root, path);
  }
};
