# CLAUDE.md

`@rwillians/doctests` — ExUnit-style doctests for JavaScript/TypeScript.
JSDoc `@example` blocks are parsed out of source files and registered as
regular `bun:test` cases. No custom runner, no dependencies.

## Commands

- `bun test` — full suite (parser unit tests + the fixture's own doctests).
- `bun run build` — emits `dist/cjs`, `dist/esm`, `dist/types` via tsc.
- `bun run --bun tsc --noEmit` — typecheck against the dev tsconfig.

## Architecture

Data flows `parser → compiler → index`, one file each in `src/`:

- `src/parser.ts` — pure, dependency-free text scanner (no TypeScript
  compiler API, works identically for `.js`/`.ts`). `parse(source)` →
  `Doc[]` of `{ subject, exported, examples }`, where each example has a
  description and a list of steps.
- `src/compiler.ts` — `compile(example)` → the body of an async function
  made of `expect()` assertions.
- `src/index.ts` — `doctest({ include, exclude })` globs files
  (`Bun.Glob`, relative to cwd), and registers
  `describe(file) > describe(symbol) > it(example description)`.
  The target module is imported lazily inside each `it`, its exports are
  destructured into the compiled function's scope, and ```` ```ts ````
  blocks are stripped of type syntax with `Bun.Transpiler`.

## Doctest syntax

`//=` is the ONLY assertion marker. The right-hand side decides the kind:

```
fib(3) //= 2                          equality: expect(fib(3)).toEqual(2)
fib(5) //= fib(3) + fib(4)            both sides are raw expressions
const a = fib(1) //= 1                binding: declares a, asserts it, a stays in scope
fib(-1) //= ** (Error)                throws: error name must match exactly
fib(-2) //= ** (Error) some message   message is raw UNQUOTED text to EOL, substring match
new Map()                             no marker: plain exec step, runs in order
```

Rules the implementation relies on:

- A right-hand side starting with `**` is unambiguously a throws
  assertion — no JS expression can start with `**` (exponentiation is
  infix). Do not introduce syntax that breaks this invariant.
- Throws match by error *name* (`error.name` or `constructor.name`,
  exact — a thrown `RangeError` does NOT satisfy `** (Error)`). Don't
  switch to `expect(fn).toThrow()`: it can't match a name string plus a
  message in a single evaluation, and instanceof matching isn't exact.
- The example description is the text from `@example` up to the first
  blank line or code fence; prose paragraphs around fences are ignored;
  the trailing period is trimmed from the `it` name.
- Only `export`ed symbols run; the subject is the first declaration
  after the JSDoc block. Malformed markers throw at parse time — never
  fall back to silently executing a bad assertion line.
- Compiled bodies are async, so `await` works in any step.

## Constraints

- **Public API is `doctest/1` only.** Nothing else is exported from
  `src/index.ts` — no parser, no types. This is deliberate (v0 keeps the
  compatibility surface minimal); do not add exports without being asked.
  The project's own tests import internals directly (`../src/parser`).
- **Zero runtime dependencies.** Only Bun builtins and `node:` modules.
  Text scanning over compiler APIs.
- `test/fixtures/utils.ts` is both a test fixture and the living spec of
  the syntax — parser changes usually mean updating it and
  `test/parser.spec.ts` together, and `README.md` if syntax changed.

## Verifying changes

Green tests are not enough for assertion-related changes: also prove the
failure paths. Point a scratch spec at a fixture with a wrong value, a
wrong error name, a wrong message, and a non-throwing expression, and
check each fails with a readable diff (use a directory outside the repo;
`doctest` resolves globs against cwd, so run `bun test` from there).
