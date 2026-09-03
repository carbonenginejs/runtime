import assert from "node:assert/strict";
import test from "node:test";

import { mat4 } from "../../npm/dist/global/math/index.js";
import {
  BuildDecalGeometry,
  DecalWorldBounds,
  BuildStaticDecalGeometry,
  FindCachedDecalGeometry,
  SelectDecalTriangles
} from "../../src/trinity/eve/attachment/decal/decalIndices.js";

const DECL = Object.freeze([ Object.freeze({ usage: "Position", usageIndex: 0, elementCount: 3 }) ]);

/** A decal volume: the unit box scaled and moved. */
function volumeOf(scale, translation = [ 0, 0, 0 ])
{
  const matrix = mat4.create();

  mat4.fromRotationTranslationScale(matrix, [ 0, 0, 0, 1 ], translation, scale);

  return { matrix, inverse: mat4.invert(mat4.create(), matrix) };
}

/**
 * Two triangles ten units apart, so a decal can select one and not the other.
 * Positions are a flat channel, which is how a decoded CMF payload holds them.
 */
const lodOf = () => ({
  vertex: {
    position: [
      0, 0, 0, 1, 0, 0, 0, 1, 0,
      20, 0, 0, 21, 0, 0, 20, 1, 0
    ]
  },
  indices: [ { faces: [ 0, 1, 2, 3, 4, 5 ] } ]
});

test("only the triangles a decal covers are selected", () =>
{
  const { matrix, inverse } = volumeOf([ 2, 2, 2 ]);

  const selected = SelectDecalTriangles(lodOf(), matrix, inverse, null, DECL);

  assert.deepEqual(selected, [ 0, 1, 2 ]);
});

test("moving the volume selects the other triangle", () =>
{
  const { matrix, inverse } = volumeOf([ 2, 2, 2 ], [ 20, 0, 0 ]);

  assert.deepEqual(SelectDecalTriangles(lodOf(), matrix, inverse, null, DECL), [ 3, 4, 5 ]);
});

test("the original indices are kept, never new vertices", () =>
{
  // The decal shares the hull's vertex buffer. An index outside the hull's
  // range would mean geometry was rebuilt, which Carbon never does.
  const { matrix, inverse } = volumeOf([ 40, 40, 40 ]);

  const selected = SelectDecalTriangles(lodOf(), matrix, inverse, null, DECL);

  assert.deepEqual(selected, [ 0, 1, 2, 3, 4, 5 ]);
  assert.ok(selected.every(index => index >= 0 && index <= 5));
});

test("a volume touching nothing selects nothing rather than failing", () =>
{
  const { matrix, inverse } = volumeOf([ 1, 1, 1 ], [ 500, 500, 500 ]);

  assert.deepEqual(SelectDecalTriangles(lodOf(), matrix, inverse, null, DECL), []);
});

test("geometry that has not arrived is not an error", () =>
{
  // The ordinary first frame. Carbon returns from a dozen such conditions and
  // commits no batch.
  const { matrix, inverse } = volumeOf([ 2, 2, 2 ]);

  assert.deepEqual(SelectDecalTriangles({}, matrix, inverse, null, DECL), []);
  assert.deepEqual(SelectDecalTriangles({ vertex: { position: [] } }, matrix, inverse, null, DECL), []);
});

test("the position stride comes from the declaration", () =>
{
  // A float4 position channel with the same two triangles. Read at stride 3
  // this would sample across vertex boundaries and select the wrong triangles.
  const lod = {
    vertex: {
      position: [
        0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1,
        20, 0, 0, 1, 21, 0, 0, 1, 20, 1, 0, 1
      ]
    },
    indices: [ { faces: [ 0, 1, 2, 3, 4, 5 ] } ]
  };
  const { matrix, inverse } = volumeOf([ 2, 2, 2 ]);
  const wide = [ { usage: "Position", usageIndex: 0, elementCount: 4 } ];

  assert.deepEqual(SelectDecalTriangles(lod, matrix, inverse, null, wide), [ 0, 1, 2 ]);
});

test("world bounds transform the corners, not the extremes", () =>
{
  // A rotated volume: taking min and max through the matrix would give a box
  // that is too small and would reject triangles the decal reaches.
  const rotated = mat4.create();

  const fortyFiveAboutZ = [ 0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8) ];

  mat4.fromRotationTranslationScale(rotated, fortyFiveAboutZ, [ 0, 0, 0 ], [ 1, 1, 1 ]);

  const { min, max } = DecalWorldBounds(rotated);

  assert.ok(max[0] > 1.3, `a 45-degree rotation widens x beyond 1, got ${max[0]}`);
  assert.ok(min[0] < -1.3, `and symmetrically, got ${min[0]}`);
});

test("every LOD gets a start index, and an uncovered one reads as zero primitives", () =>
{
  // Carbon records the start even for a LOD that selected nothing, which is
  // why GetBatches tests the primitive count rather than the buffer.
  const mesh = {
    decl: DECL,
    lods: [
      lodOf(),
      { vertex: { position: [ 900, 0, 0, 901, 0, 0, 900, 1, 0 ] }, indices: [ { faces: [ 0, 1, 2 ] } ] }
    ]
  };
  const { matrix, inverse } = volumeOf([ 2, 2, 2 ]);

  const built = BuildDecalGeometry(mesh, matrix, inverse);

  assert.equal(built.lods.length, 2);
  assert.deepEqual(built.lods[0], { startIndex: 0, primitiveCount: 1 });
  assert.deepEqual(built.lods[1], { startIndex: 3, primitiveCount: 0 });
});

test("the built index buffer is 32-bit whatever the source indexed at", () =>
{
  // Carbon collects into a vector<uint32_t> and allocates stride 4 even for a
  // mesh that indexes at 16 bits, so a decal on a small mesh is still wide.
  const { matrix, inverse } = volumeOf([ 40, 40, 40 ]);

  const built = BuildDecalGeometry({ decl: DECL, lods: [ lodOf() ] }, matrix, inverse);

  assert.ok(built.indices instanceof Uint32Array);
  assert.equal(built.indices.length, 6);
});

test("a volume already built is reused rather than reselected", () =>
{
  // A hull carries eleven decals and the selection walks every triangle of
  // every LOD, so matching volumes must share.
  const { inverse } = volumeOf([ 2, 2, 2 ]);
  const other = volumeOf([ 3, 3, 3 ]).inverse;
  const entry = { inverseDecalMatrix: mat4.clone(inverse) };

  assert.equal(FindCachedDecalGeometry([ entry ], inverse), entry);
  assert.equal(FindCachedDecalGeometry([ entry ], other), null);
  assert.equal(FindCachedDecalGeometry([], inverse), null);
  assert.equal(FindCachedDecalGeometry(null, inverse), null);
});

test("the static path concatenates the SOF's own index lists", () =>
{
  // This is the path a ship takes. Carbon checks for these FIRST and only
  // falls back to selection behind a global flag.
  const mesh = { decl: DECL, lods: [ {}, {}, {} ] };
  const buffers = [ [ 0, 1, 2 ], [ 3, 4, 5, 6, 7, 8 ], [ 9, 10, 11 ] ];

  const built = BuildStaticDecalGeometry(mesh, buffers);

  assert.deepEqual(built.lods, [
    { startIndex: 0, primitiveCount: 1 },
    { startIndex: 3, primitiveCount: 2 },
    { startIndex: 9, primitiveCount: 1 }
  ]);
  assert.deepEqual([ ...built.indices ], [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]);
});

test("a mesh with more LODs than precomputed lists stops rather than skipping", () =>
{
  // Carbon breaks here, and says why: precomputed decal LODs OMIT any LOD whose
  // index buffer came out empty, so a missing entry marks the end of the set
  // rather than a hole in it. Skipping would pair later LODs with the wrong
  // lists.
  const mesh = { decl: DECL, lods: [ {}, {}, {}, {} ] };

  const built = BuildStaticDecalGeometry(mesh, [ [ 0, 1, 2 ], [ 3, 4, 5 ] ]);

  assert.equal(built.lods.length, 2);
});

test("the static path indexes by original LOD index, not by position", () =>
{
  // LOD generation can drop parts of a model, so the two diverge. Using the
  // position would pair a LOD with another LOD's triangles.
  const mesh = { decl: DECL, lods: [ { originalLodIndex: 1 }, { originalLodIndex: 2 } ] };
  const buffers = [ [ 90, 91, 92 ], [ 0, 1, 2 ], [ 3, 4, 5 ] ];

  const built = BuildStaticDecalGeometry(mesh, buffers);

  assert.deepEqual([ ...built.indices ], [ 0, 1, 2, 3, 4, 5 ]);
});

test("no static lists yields nothing rather than throwing", () =>
{
  const built = BuildStaticDecalGeometry({ decl: DECL, lods: [ {} ] }, null);

  assert.deepEqual(built.lods, []);
  assert.equal(built.indices.length, 0);
});
