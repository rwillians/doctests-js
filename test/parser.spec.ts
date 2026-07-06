import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

import { parse } from '../src/parser';

const fixture = readFileSync('test/fixtures/utils.ts', 'utf8');

describe('parse', () => {
  describe('test/fixtures/utils.ts', () => {
    const docs = parse(fixture);

    it('finds documented symbols with their export status', () => {
      expect(docs.map(({ subject, exported }) => ({ subject, exported }))).toEqual([
        { subject: 'fib', exported: true },
        { subject: 'foo', exported: false },
      ]);
    });

    it('collects only @doctest-marked examples', () => {
      expect(docs[1]!.examples).toHaveLength(1);
    });

    it('keeps examples in source order with collapsed descriptions', () => {
      expect(docs[0]!.examples.map((example) => example.description)).toEqual([
        'Returns a number of the fibonacci sequence by its given position.',
        'The value of a position in the fibonacci sequence is equal to the sum of the two preceding numbers.',
        'The position is zero-based.',
        'The first and second numbers of the sequence are equal to one.',
        'The given position cannot be less than zero.',
        "Assertions are optional, as long as the example doesn't throw an error the test will pass.",
        'There can be more than one code block in an example.',
      ]);
    });

    it('keeps each code block of an example as its own step group, ignoring prose in between', () => {
      expect(docs[0]!.examples[6]!.blocks).toEqual([
        [{ kind: 'equal', binding: null, expression: 'fib(1)', expected: '1' }],
        [{ kind: 'equal', binding: null, expression: 'fib(2)', expected: '1' }],
        [{ kind: 'equal', binding: null, expression: 'fib(3)', expected: '2' }],
      ]);
    });

    it('parses `//=` lines into equal steps with raw expressions', () => {
      expect(docs[0]!.examples[0]!.blocks).toEqual([
        [
          { kind: 'equal', binding: null, expression: 'fib(3)', expected: '2' },
          { kind: 'equal', binding: null, expression: 'fib(4)', expected: '3' },
          { kind: 'equal', binding: null, expression: 'fib(5)', expected: '5' },
        ],
      ]);
    });

    it('keeps expected values as expressions', () => {
      expect(docs[0]!.examples[1]!.blocks).toEqual([
        [
          { kind: 'equal', binding: null, expression: 'fib(5)', expected: 'fib(3) + fib(4)' },
          { kind: 'equal', binding: null, expression: 'fib(3) + fib(4)', expected: 'fib(5)' },
          { kind: 'equal', binding: null, expression: 'fib(5) === fib(3) + fib(4)', expected: 'true' },
        ],
      ]);
    });

    it('ignores prose around code blocks and strips trailing semicolons', () => {
      expect(docs[0]!.examples[2]!.blocks).toEqual([
        [{ kind: 'equal', binding: null, expression: 'fib(0)', expected: '0' }],
      ]);
    });

    it('captures const bindings on assertion lines', () => {
      expect(docs[0]!.examples[3]!.blocks).toEqual([
        [
          { kind: 'equal', binding: 'a', expression: 'const a = fib(1)', expected: '1' },
          { kind: 'equal', binding: 'b', expression: 'const b = fib(2)', expected: '1' },
        ],
      ]);
    });

    it('parses `//= ** (Type)` lines into throws steps with optional unquoted messages', () => {
      expect(docs[0]!.examples[4]!.blocks).toEqual([
        [
          { kind: 'throws', expression: 'fib(-1)', error: 'Error', message: null },
          { kind: 'throws', expression: 'fib(-2)', error: 'Error', message: 'position cannot be less than 0, got -2' },
        ],
      ]);
    });
  });

  describe('edge cases', () => {
    it('treats plain code lines as exec steps', () => {
      const source = `
        /**
         * @doctest
         * @example Adds up.
         * \`\`\`
         * const numbers = [1, 2, 3]
         * sum(numbers) //= 6
         * \`\`\`
         */
        export const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
      `;

      expect(parse(source)[0]!.examples[0]!.blocks).toEqual([
        [
          { kind: 'exec', code: 'const numbers = [1, 2, 3]' },
          { kind: 'equal', binding: null, expression: 'sum(numbers)', expected: '6' },
        ],
      ]);
    });

    it('ends an example section at the next jsdoc tag', () => {
      const source = `
        /**
         * @doctest
         * @example One.
         * \`\`\`
         * one() //= 1
         * \`\`\`
         * @param nothing - not part of the example
         * \`\`\`
         * two() //= 2
         * \`\`\`
         */
        export const one = () => 1;
      `;

      expect(parse(source)[0]!.examples[0]!.blocks).toEqual([
        [{ kind: 'equal', binding: null, expression: 'one()', expected: '1' }],
      ]);
    });

    it('drops jsdoc blocks without examples or without a following declaration', () => {
      const source = `
        /** Just a description, no examples. */
        export const a = 1;

        /**
         * @doctest
         * @example Dangling.
         * \`\`\`
         * a //= 1
         * \`\`\`
         */
      `;

      expect(parse(source)).toEqual([]);
    });

    it('treats @example without a preceding @doctest as plain documentation', () => {
      const source = `
        /**
         * @example Not a test — never parsed, even with bogus markers.
         * \`\`\`
         * one() //= ** broken beyond repair
         * one() //=
         * \`\`\`
         */
        export const one = () => 1;
      `;

      expect(parse(source)).toEqual([]);
    });

    it('only marks the @example immediately following a @doctest tag', () => {
      const source = `
        /**
         * @doctest
         * @param nothing - a tag in between disarms the @doctest
         * @example Not a test.
         * \`\`\`
         * one() //= 2
         * \`\`\`
         *
         * @doctest
         * @example A test.
         * \`\`\`
         * one() //= 1
         * \`\`\`
         */
        export const one = () => 1;
      `;

      expect(parse(source)[0]!.examples.map((example) => example.description)).toEqual(['A test.']);
    });

    it('rejects malformed assertion markers', () => {
      const missing = `
        /**
         * @doctest
         * @example Broken.
         * \`\`\`
         * one() //=
         * \`\`\`
         */
        export const one = () => 1;
      `;

      const throws = `
        /**
         * @doctest
         * @example Broken.
         * \`\`\`
         * one() //= ** Error
         * \`\`\`
         */
        export const one = () => 1;
      `;

      const legacy = `
        /**
         * @doctest
         * @example Broken.
         * \`\`\`
         * one() //= **Error**
         * \`\`\`
         */
        export const one = () => 1;
      `;

      expect(() => parse(missing)).toThrow('expected a value after `//=`');
      expect(() => parse(throws)).toThrow('expected `//= ** (ErrorType) optional message`');
      expect(() => parse(legacy)).toThrow('expected `//= ** (ErrorType) optional message`');
    });
  });
});
