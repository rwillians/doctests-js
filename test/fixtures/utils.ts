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
 *
 * @example There can be more than one code block in an example.
 *
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
 * eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
 * ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
 * aliquip ex ea commodo consequat.
 *
 * ```
 * fib(1) //= 1
 * ```
 *
 * Duis aute irure dolor in reprehenderit in voluptate velit esse
 * cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
 * cupidatat non proident, sunt in culpa qui officia deserunt mollit
 * anim id est laborum.
 *
 * ```
 * fib(2) //= 1
 * ```
 *
 * Sed ut perspiciatis unde omnis iste natus error sit voluptatem
 * accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
 * quae ab illo inventore veritatis et quasi architecto beatae vitae
 * dicta sunt explicabo.
 *
 * ```
 * fib(3) //= 2
 * ```
 *
 * Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit
 * aut fugit, sed quia consequuntur magni dolores eos qui ratione
 * voluptatem sequi nesciunt.
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
