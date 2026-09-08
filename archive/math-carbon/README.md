# Archived: the literal Carbon math port

Archived from `src/global/math/carbon/` on 2026-09-08 (operator decision).
Built as a testing bed and to ease a possible maths migration; it is NOT
part of the runtime. Nothing in `src` may import it, it is not exported
from any barrel, and its tests are not in the package suite.

What it is: a line-for-line JS port of `e:\carbonengine\math` — twelve
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

- `/docs/internal/decisions/carbon-math-port.md` — why it was built, the
  no-piecemeal-adoption rule, the two upstream Carbon defects it pins
  (AABB box-box Intersects inverted; box-ray slab scaled by 1/|direction|).
- `/docs/research/carbon-math-library-evaluation.md` — the costing that
  rejected replacing gl-matrix.
- The half-float lesson (2026-09-08): two ports adopted `carbon.float16`
  for "Carbon's exact rounding" without checking `num.toHalfFloat`, which
  already rounds identically for every in-range value. The runtime's half
  codec is `num.toHalfFloat`/`num.fromHalfFloat`.
