# @rwillians/doctests

> Your documentation examples, executed as tests. If a `@example` in
> your JSDoc drifts out of sync with the code, your test suite fails.

Doctests — as loved in [Elixir](https://hexdocs.pm/ex_unit/ExUnit.DocTest.html),
Python and Rust — are code examples that live in your documentation and
run as part of your test suite. They keep docs honest: an example that
stops working stops the build. This library brings them to JavaScript
and TypeScript with zero dependencies and no custom test runner —
doctests become regular [`bun:test`](https://bun.sh/docs/cli/test) cases.

## Getting started

Install as a dev dependency:

```sh
bun add -d @rwillians/doctests
```

Write examples in your JSDoc using `@example` tags with fenced code
blocks. The `//=` marker asserts what an expression evaluates to:

````ts
// src/fib.ts

/**
 * Returns the number at a given position of the fibonacci sequence.
 *
 * @example The position is zero-based.
 * ```
 * fib(0) //= 0
 * ```
 *
 * @example The first and second numbers of the sequence are equal to one.
 * ```
 * fib(1) //= 1
 * fib(2) //= 1
 * ```
 *
 * @example Every other number is the sum of the two preceding ones.
 * ```
 * fib(5) //= fib(3) + fib(4)
 * ```
 */
export const fib = (position: number): number => {
  if (position < 0) throw new Error(`position cannot be less than 0, got ${position}`);
  if (position < 2) return position;

  return fib(position - 2) + fib(position - 1);
};
````

Then register your doctests from a regular spec file:

```ts
// test/doctests.spec.ts
import { doctest } from '@rwillians/doctests';

doctest({
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.d.ts', 'src/**/*.{test,spec}.ts'],
});
```

That's it — `bun test` now runs every example:

```
bun test

test/doctests.spec.ts:
✓ src/fib.ts > fib > The position is zero-based
✓ src/fib.ts > fib > The first and second numbers of the sequence are equal to one
✓ src/fib.ts > fib > Every other number is the sum of the two preceding ones

3 pass
0 fail
```

Each file becomes a `describe`, each documented symbol a nested
`describe`, and each `@example` an `it` named by its description.

## Writing doctests

### Asserting values

`expression //= expected` asserts deep equality — under the hood it's
`expect(expression).toEqual(expected)`. Both sides are real expressions
evaluated in the same scope:

```
fib(5)                     //= fib(3) + fib(4)
fib(5) === fib(3) + fib(4) //= true
```

### Multi-step examples

Lines without a marker just execute, in order, sharing scope with the
lines below. Declarations on assertion lines bind the value *and*
assert it:

```
const primes = [2, 3, 5, 7]
primes.length              //= 4
const last = primes.at(-1) //= 7
last * 2                   //= 14
```

`await` works anywhere — examples run inside an async function.

### Asserting errors

When the expected "value" is `** (ErrorType)`, the assertion becomes
"this expression throws" (a nod to how Elixir prints errors). Text
after the closing parenthesis — no quotes needed — must appear in the
error message:

```
fib(-1) //= ** (Error)
fib(-2) //= ** (Error) position cannot be less than 0, got -2
```

The error name must match exactly: a thrown `RangeError` does not
satisfy `** (Error)`.

### Descriptions and prose

The test name is the text from `@example` up to the first blank line or
code block. Everything else is prose for your readers — it's ignored:

````ts
/**
 * @example The position is zero-based.
 *
 * Zero-based indexing means the first element of the sequence
 * is at position 0 — this paragraph is documentation, not code.
 *
 * ```
 * fib(0) //= 0
 * ```
 */
````

An `@example` can interleave as many code blocks and prose paragraphs
as it needs. Each code block becomes its own test case — when there's
more than one, the test names are numbered:

```
✓ src/fib.ts > fib > The position is zero-based (1)
✓ src/fib.ts > fib > The position is zero-based (2)
```

Blocks are independent tests, so variables declared in one block are
not visible in the next — multi-step setups belong in a single block.

## Good to know

- **Runs on Bun.** Doctests register through `bun:test` — run them with
  `bun test`.
- **Only exported symbols run.** Doctests on private functions are
  skipped — they can't be exercised from the outside, and examples
  should show your public API anyway.
- **Examples run against your real module.** Exports are imported and
  in scope inside every example; TypeScript syntax in code blocks is
  supported.
- **Failures read like any other test failure**, with the usual
  expected/received diff, under the test named by your example.

## License

[MIT](LICENSE) © [Rafael Willians](https://github.com/rwillians)
