import assert from "node:assert/strict";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { Float4x3 } from "../../npm/dist/trinity/utilities/index.js";

// A transform with a rotation, a non-uniform scale and a translation, so a
// transpose error or a dropped row shows up rather than cancelling out.
function transform()
{
  const out = mat4.create();
  mat4.translate(out, out, [ 10, 20, 30 ]);
  mat4.rotateZ(out, out, 0.7);
  mat4.scale(out, out, [ 2, 3, 4 ]);
  return out;
}

test("packing drops only the constant fourth column", () =>
{
  const matrix = transform();
  const packed = Float4x3.fromMat4(matrix);

  assert.equal(packed.length, 12);

  // gl-matrix stores column-major, so the translation sits at 12, 13, 14 and
  // must survive as the last element of each packed row.
  assert.equal(packed[3], matrix[12]);
  assert.equal(packed[7], matrix[13]);
  assert.equal(packed[11], matrix[14]);
});

test("unpacking restores the original transform exactly", () =>
{
  const matrix = transform();
  const restored = Float4x3.toMat4(Float4x3.fromMat4(matrix));

  for (let index = 0; index < 16; index++)
  {
    assert.ok(Math.abs(restored[index] - matrix[index]) < 1e-6,
      `element ${index}: ${restored[index]} !== ${matrix[index]}`);
  }
});

test("a packed transform still moves a point the same way", () =>
{
  const matrix = transform();
  const point = [ 1, -2, 3 ];

  const direct = vec3.transformMat4(vec3.create(), point, matrix);
  const roundTripped = vec3.transformMat4(vec3.create(), point, Float4x3.toMat4(Float4x3.fromMat4(matrix)));

  for (let axis = 0; axis < 3; axis++)
  {
    assert.ok(Math.abs(direct[axis] - roundTripped[axis]) < 1e-6, `axis ${axis}`);
  }
});

test("the packing is its own inverse mapping", () =>
{
  const elements = Float32Array.from({ length: 12 }, (value, index) => index + 1);
  const round = Float4x3.fromMat4(Float4x3.toMat4(elements));

  assert.deepEqual(Array.from(round), Array.from(elements));
});

test("the record form packs and unpacks through its own elements", () =>
{
  const matrix = transform();
  const record = new Float4x3().SetFromMat4(matrix);

  assert.equal(record.elements.length, 12);

  const restored = record.GetMat4();
  assert.ok(Math.abs(restored[12] - 10) < 1e-6, "translation x survives the round trip");
  assert.equal(restored[15], 1, "the reconstructed fourth column is (0,0,0,1)");
  assert.equal(restored[3], 0);
});

test("mat4.getAffineCarbon and fromAffineCarbon round-trip a rotation, scale and translation (MatrixUtils.cpp:6-26)", () =>
{
  const matrix = transform();
  const packed = mat4.getAffineCarbon(new Float32Array(12), matrix);

  // Carbon's elements[0..3] are _11, _21, _31, _41: column one, translation x last.
  assert.deepEqual(Array.from(packed.subarray(0, 4)), [ matrix[0], matrix[4], matrix[8], matrix[12] ]);
  assert.deepEqual(Array.from(packed), Array.from(Float4x3.fromMat4(matrix)), "one implementation");

  const restored = mat4.fromAffineCarbon(mat4.create(), packed);
  assert.deepEqual(Array.from(restored), Array.from(matrix));
  assert.deepEqual([ restored[3], restored[7], restored[11], restored[15] ], [ 0, 0, 0, 1 ]);
});
