/**
 * @example Returns a number of the fibonacci sequence by its given
 *          position.
 * ```
 * fib(3) //= 2
 * fib(4) //= 3
 * fib(5) //= 5
 * ```
 *
 * @example The value of a position in the fibonacci sequence is equal
 *          to the sum of the two preceding numbers.
 * ```
 * fib(5)                     //= fib(3) + fib(4)
 * fib(3) + fib(4)            //= fib(5)
 * fib(5) === fib(3) + fib(4) //= true
 * ```
 *
 * @example The position is zero-based.
 *
 * Zero-based indexing means that the first element of a sequence is
 * at position 0, the second element is at position 1, and so on. This
 * is a common convention in programming and mathematics.
 *
 * ```
 * fib(0); //= 0
 * ```
 *
 * As you can see, the first number of the fibonacci sequence is 0,
 * which is at position 0.
 *
 * @example The first and second numbers of the sequence are equal to
 *          one.
 * ```ts
 * const a = fib(1) //= 1
 * const b = fib(2) //= 1
 * ```
 *
 * @example The given position cannot be less than zero.
 *
 * ```js
 * fib(-1) //= ** (Error)
 * fib(-2) //= ** (Error) position cannot be less than 0, got -2
 * ```
 *
 * @example Assertions are optional, as long as the example doesn't
 *          throw an error the test will pass.
 * ```
 * fib(1)
 * ```
 */
export const fib = (position: number): number => {
  if (position < 0) throw new Error(`position cannot be less than 0, got ${position}`);
  if (position < 2) return position;

  return fib(position - 2) + fib(position - 1);
};

/**
 * @example Notice that doctests on private functions get ignored.
 * ```
 * foo() //= 'bar'
 * ```
 */
const foo = () => 'bar';
