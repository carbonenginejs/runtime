import assert from "node:assert/strict";
import test from "node:test";

import { mat4, tri3, vec3 } from "../../../npm/dist/global/math/index.js";

/** The unit box Carbon's oriented test works in, as an explicit transform. */
const UNIT = mat4.create();

const triangleOf = (a, b, c) => tri3.fromVertices(tri3.create(), a, b, c);

/** A box transform: scale then translate, then inverted for the test. */
function inverseBoxOf(scale, translation)
{
  const box = mat4.create();

  mat4.fromRotationTranslationScale(box, [ 0, 0, 0, 1 ], translation, scale);

  return mat4.invert(mat4.create(), box);
}

test("a triangle inside the unit box intersects it", () =>
{
  const inside = triangleOf([ 0, 0, 0 ], [ 0.2, 0, 0 ], [ 0, 0.2, 0 ]);

  assert.equal(tri3.intersectsOrientedBox(inside, UNIT), true);
});

test("a triangle wholly outside on one axis does not", () =>
{
  const far = triangleOf([ 5, 0, 0 ], [ 6, 0, 0 ], [ 5, 1, 0 ]);

  assert.equal(tri3.intersectsOrientedBox(far, UNIT), false);
});

test("a triangle spanning the box intersects it", () =>
{
  // No vertex is inside, and no box face separates it: this is the case a
  // vertex-containment test would miss, and the reason a separating-axis test
  // is used at all.
  const spanning = triangleOf([ -5, 0, 0 ], [ 5, 0, 0 ], [ 0, 5, 0 ]);

  assert.equal(tri3.intersectsOrientedBox(spanning, UNIT), true);
});

test("the triangle's own plane can separate it", () =>
{
  // Parallel to a box face and clear of it. Only the triangle-plane axis
  // rejects this one; every face slab overlaps.
  const above = triangleOf([ -5, 0, 2 ], [ 5, 0, 2 ], [ 0, 5, 2 ]);

  assert.equal(tri3.intersectsOrientedBox(above, UNIT), false);
});

test("the box orientation is what decides, not the world position", () =>
{
  // The same triangle against a box moved away from it.
  const triangle = triangleOf([ 0, 0, 0 ], [ 0.5, 0, 0 ], [ 0, 0.5, 0 ]);

  assert.equal(tri3.intersectsOrientedBox(triangle, inverseBoxOf([ 1, 1, 1 ], [ 0, 0, 0 ])), true);
  assert.equal(tri3.intersectsOrientedBox(triangle, inverseBoxOf([ 1, 1, 1 ], [ 10, 0, 0 ])), false);
});

test("a box scaled up reaches a triangle a unit box does not", () =>
{
  const triangle = triangleOf([ 3, 0, 0 ], [ 4, 0, 0 ], [ 3, 1, 0 ]);

  assert.equal(tri3.intersectsOrientedBox(triangle, UNIT), false);
  assert.equal(tri3.intersectsOrientedBox(triangle, inverseBoxOf([ 5, 5, 5 ], [ 0, 0, 0 ])), true);
});

test("the bounds test rejects only on a separating slab", () =>
{
  const min = vec3.fromValues(-1, -1, -1);
  const max = vec3.fromValues(1, 1, 1);

  assert.equal(tri3.intersectsBounds(triangleOf([ 0, 0, 0 ], [ 0.5, 0, 0 ], [ 0, 0.5, 0 ]), min, max), true);
  assert.equal(tri3.intersectsBounds(triangleOf([ 5, 0, 0 ], [ 6, 0, 0 ], [ 5, 1, 0 ]), min, max), false);
  assert.equal(tri3.intersectsBounds(triangleOf([ 0, -9, 0 ], [ 1, -9, 0 ], [ 0, -8, 0 ]), min, max), false);
});

test("the bounds test is a broad phase and admits a corner straddle", () =>
{
  // Deliberately pinned: no slab separates this triangle, so the cheap test
  // says true while the oriented test says false. A caller that used the
  // bounds test alone would cover a hull triangle a decal never reaches.
  //
  // Found by search rather than by reasoning: two hand-picked "obvious"
  // straddles turned out to intersect after all, one of them through the
  // origin. The separating axis here is an edge cross product, which is
  // exactly the part no slab test can see.
  const straddle = triangleOf([ 2.5, 3, 1.5 ], [ -2.5, 2, -2.5 ], [ -0.5, 1, -1.5 ]);
  const min = vec3.fromValues(-1, -1, -1);
  const max = vec3.fromValues(1, 1, 1);

  assert.equal(tri3.intersectsBounds(straddle, min, max), true);
  assert.equal(tri3.intersectsOrientedBox(straddle, UNIT), false);
});

test("neither test allocates per call", () =>
{
  // A decal runs these over every triangle of a hull, so a per-call allocation
  // here is thousands of objects a frame.
  const triangle = triangleOf([ 0, 0, 0 ], [ 0.5, 0, 0 ], [ 0, 0.5, 0 ]);
  const before = process.memoryUsage().heapUsed;

  for (let i = 0; i < 20000; i++) tri3.intersectsOrientedBox(triangle, UNIT);

  const grew = process.memoryUsage().heapUsed - before;

  assert.ok(grew < 2_000_000, `heap grew ${grew} bytes across 20000 calls`);
});
