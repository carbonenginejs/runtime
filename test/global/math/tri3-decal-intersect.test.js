import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// The two triangle-versus-box tests a decal needs, both ported from Carbon:
// `IntersectTriangleAABB` (BoundingBox.cpp:569-588) as the broad phase and
// `IntersectTriangleOrientedBox` (:626-732) behind it. They exist for
// `decalIndices.js`, which selects the hull triangles a decal covers the way
// `EveSpaceObjectDecal.cpp:592-809` does.
//
// `tri3` ITSELF IS NOT A CARBON TYPE - it is this package's own triangle,
// shared in shape with ccpwgl's, which is why the file looks foreign next to
// the `Tr2*` tree. The Carbon-derived functions inside it carry their citations
// on the function rather than in a file header, because most of the module is
// not a port.
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

  // MEASURED IN A CHILD PROCESS, and that is the whole point of the test. Two
  // earlier versions of this probe sampled process.memoryUsage().heapUsed in
  // THIS process and both flaked, because that number is process-wide: the test
  // runner and the eight tests above allocate on the same heap inside the
  // measurement window. The failures were not noise either - a steady ~320 KB,
  // reproduced independently at 325,976 and 328,704 bytes - so the probe was
  // reporting the runner, not tri3. A warm-up run fixed the first-call compile
  // cost and a forced collection fixed the stale-garbage baseline; neither
  // touched the real confounder.
  //
  // A child with --expose-gc runs the loop with nothing else in it. Even there
  // a single delta is not enough: heapUsed occasionally jumps by the SAME ~320
  // KB in the child too, which is V8 growing its heap a page and not anything
  // this loop did. So the child takes five collected samples and reports the
  // MINIMUM - a one-off page growth lands in one sample, a per-call allocation
  // lands in every one.
  const source = [
    `import { tri3 } from "${pathToFileURL(resolve("src/global/math/tri3.js")).href}";`,
    `import { vec3 } from "${pathToFileURL(resolve("src/global/math/vec3.js")).href}";`,
    "const UNIT = { center: vec3.fromValues(0, 0, 0), halfExtents: vec3.fromValues(1, 1, 1),",
    "  axes: [ vec3.fromValues(1, 0, 0), vec3.fromValues(0, 1, 0), vec3.fromValues(0, 0, 1) ] };",
    "const t = { a: vec3.fromValues(0, 0, 0), b: vec3.fromValues(0.5, 0, 0), c: vec3.fromValues(0, 0.5, 0) };",
    "const run = n => { for (let i = 0; i < n; i++) { tri3.intersectsOrientedBox(t, UNIT); tri3.intersectsBounds(t, UNIT.center, UNIT.halfExtents); } };",
    "run(20000);",
    "const samples = [];",
    "for (let s = 0; s < 5; s++) {",
    "  gc();",
    "  const before = process.memoryUsage().heapUsed;",
    "  run(20000);",
    "  samples.push(process.memoryUsage().heapUsed - before);",
    "}",
    "console.log(Math.min(...samples));"
  ].join("\n");

  const child = spawnSync(process.execPath,
    [ "--expose-gc", "--input-type=module", "-e", source ],
    { encoding: "utf8" });

  assert.equal(child.status, 0, `probe child failed: ${child.stderr}`);

  const grew = Number(child.stdout.trim());

  // Calibrated against a negative control rather than guessed. Min of five, in
  // the child: tri3 reads 3.3 KB, and a stand-in allocating one vec3 per call
  // reads 202 KB - itself a FLOOR, since V8 collects mid-loop and the true
  // figure would be nearer 2 MB. 100 KB sits thirty times under the regression
  // and thirty times over the signal. The old 200 KB threshold was touching the
  // regression, which is why it had to be measured rather than picked.
  assert.ok(grew < 100_000, `heap grew ${grew} bytes across 40000 warm calls`);
});