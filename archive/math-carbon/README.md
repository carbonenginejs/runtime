# Archived: the literal Carbon math port

Archived from `src/global/math/carbon/` on 2026-09-08 (operator decision).
Built as a testing bed and to ease a possible maths migration; it is NOT
part of the runtime. Nothing in `src` may import it, it is not exported
from any barrel, and its tests are not in the package suite.

What it is: a line-for-line JS port of Carbon's `math` library — twelve
modules keeping Carbon's names, argument order and arithmetic exactly,
with Carbon's own gtest suites ported alongside as the numeric oracle and
`test/gl-equivalence.test.mjs` executing the carbon-math-conventions
translation table against the live gl-matrix build.

Run its suite on demand:

```sh
npm run build:npm            # gl-equivalence compares against npm/dist
node --test archive/math-carbon/test/*.test.mjs
```

History and rulings:

- No piecemeal adoption: production code uses gl-matrix. Adopting this port
  would have to be one migration of every order-sensitive site at once,
  because mixing Carbon-order and gl-order compositions makes a `multiply`
  ambiguous to a reviewer.
- It pins two upstream Carbon defects: AABB box-box `Intersects` is
  inverted, and the box-ray slab test is scaled by 1/|direction|.
- Replacing gl-matrix with this port was costed and rejected.
- The half-float lesson (2026-09-08): two ports adopted `carbon.float16`
  for "Carbon's exact rounding" without checking `num.toHalfFloat`, which
  already rounds identically for every in-range value. The runtime's half
  codec is `num.toHalfFloat`/`num.fromHalfFloat`.
