/**
 * Compiles a parsed example into the body of an async function. The
 * runner provides `expect` (from the test framework) and `__errorName`
 * (error-name matcher) as parameters, and destructures the target
 * module's exports above this body — so steps can call them directly.
 */

import type { Example, Step } from './parser';

const compileStep = (step: Step): string => {
  switch (step.kind) {
    case 'exec':
      return step.code;

    case 'equal':
      return step.binding === null
        ? `expect(${step.expression}).toEqual(${step.expected});`
        : `${step.expression};\nexpect(${step.binding}).toEqual(${step.expected});`;

    case 'throws': {
      const error = JSON.stringify(step.error);
      const lines = [
        '{',
        '  let __thrown = undefined;',
        '  let __threw = false;',
        `  try { ${step.expression}; } catch (error) { __thrown = error; __threw = true; }`,
        `  if (!__threw) throw new Error('expected \`' + ${JSON.stringify(step.expression)} + '\` to throw ' + ${error} + ', but nothing was thrown');`,
        `  expect(__errorName(__thrown, ${error})).toBe(${error});`,
      ];

      if (step.message !== null) {
        lines.push(`  expect(String(__thrown.message)).toContain(${JSON.stringify(step.message)});`);
      }

      lines.push('}');
      return lines.join('\n');
    }
  }
};

export const compile = (example: Example): string => example.steps.map(compileStep).join('\n');
