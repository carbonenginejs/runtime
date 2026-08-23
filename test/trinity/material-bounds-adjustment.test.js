import assert from "node:assert/strict";
import { test } from "node:test";

import { box3 } from "../../npm/dist/global/math/box3.js";
import { Tr2MaterialBoundsAdjustment } from "../../npm/dist/trinity/utilities/index.js";

function adjustment({ maxLocalScale = 1, maxLocalDisplacement = 0, rotatesVertices = false } = {})
{
  const value = new Tr2MaterialBoundsAdjustment();
  value.maxLocalScale = maxLocalScale;
  value.maxLocalDisplacement = maxLocalDisplacement;
  value.rotatesVertices = rotatesVertices;
  return value;
}

test("an inert material leaves the bounds alone", () =>
{
  const box = box3.fromValues(-1, -2, -3, 4, 5, 6);
  const out = adjustment().AdjustBounds(box);

  assert.deepEqual(Array.from(out), [ -1, -2, -3, 4, 5, 6 ]);
  assert.deepEqual(Array.from(box), [ -1, -2, -3, 4, 5, 6 ], "the input is not mutated");
});

test("displacement grows the box on every side", () =>
{
  const out = adjustment({ maxLocalDisplacement: 2 }).AdjustBounds(box3.fromValues(-1, -1, -1, 1, 1, 1));

  assert.deepEqual(Array.from(out), [ -3, -3, -3, 3, 3, 3 ]);
});

test("scaling is about the ORIGIN, so an off-centre box also moves", () =>
{
  // Carbon multiplies both corners rather than scaling about the centre, which
  // is what a shader scaling object-space positions actually does.
  const out = adjustment({ maxLocalScale: 2 }).AdjustBounds(box3.fromValues(10, 0, 0, 12, 1, 1));

  assert.deepEqual(Array.from(out), [ 20, 0, 0, 24, 2, 2 ]);
  assert.notDeepEqual(Array.from(box3.getCenter([ 0, 0, 0 ], out)), [ 11, 0.5, 0.5 ],
    "a centre-preserving scale would be the wrong answer here");
});

test("scale applies before displacement, as Carbon orders them", () =>
{
  const out = adjustment({ maxLocalScale: 2, maxLocalDisplacement: 1 })
    .AdjustBounds(box3.fromValues(-1, -1, -1, 1, 1, 1));

  // Scale first: [-2,2]; then grow by 1: [-3,3]. The other order gives [-4,4].
  assert.deepEqual(Array.from(out), [ -3, -3, -3, 3, 3, 3 ]);
});

test("a rotating material replaces the box with the origin cube of its furthest corner", () =>
{
  const out = adjustment({ rotatesVertices: true }).AdjustBounds(box3.fromValues(0, 0, 0, 3, 4, 0));

  // The furthest corner is (3,4,0), radius 5, so any corner can land anywhere
  // on that sphere and the bounds become the cube around it.
  assert.deepEqual(Array.from(out), [ -5, -5, -5, 5, 5, 5 ]);
});

test("an empty box stays empty rather than growing out of nothing", () =>
{
  const empty = box3.create();
  const out = adjustment({ maxLocalScale: 4, maxLocalDisplacement: 9, rotatesVertices: true })
    .AdjustBounds(empty);

  assert.equal(box3.isEmpty(out), true);
});
