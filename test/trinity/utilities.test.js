import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { Obb, Range } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";


function assertEquals(actual, expected)
{
  if (!Object.is(actual, expected))
  {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
}

test("Range follows Carbon setup, center, and uniform behavior", () =>
{
  const range = new Range();
  assertEquals(range.GetIsUniform(), true);
  range.Setup(10, 4, 0, 20);
  assertEquals(range.GetCenterPoint(), 10);
  assertEquals(range.GetMinRangePoint(), 0);
  assertEquals(range.GetMaxRangePoint(), 14);
  range.SetCenterPoint(12);
  assertEquals(range.minRangePoint, 0);
  assertEquals(range.maxRangePoint, 16);
  range.SetMinRangePoint(9);
  assertEquals(range.minRangePoint, 0);
  assertEquals(range.maxRangePoint, 15);
  range.SetMaxRangePoint(18);
  assertEquals(range.minRangePoint, 0);
  assertEquals(range.maxRangePoint, 18);
  assertEquals(CjsSchema.GetConstructor("Range"), Range);
});

test("Range preserves Carbon slider and uniformity edge behavior", () =>
{
  const range = new Range();
  range.Setup(10, 6, 5, 14);
  range.SetIsUniform(false);
  range.SetMinRangePoint(7);
  range.SetMaxRangePoint(15);
  range.SetIsUniform(true);
  assertEquals(range.minRangePoint, 5);
  assertEquals(range.maxRangePoint, 13);
  assertEquals(range.GetMinRangePoint(), 5);
  assertEquals(range.GetMaxRangePoint(), 13);
  range.SetSliderMin(8);
  range.SetSliderMax(12);
  assertEquals(range.GetSliderMin(), 8);
  assertEquals(range.GetSliderMax(), 12);
  assertEquals(range.GetMinRangePoint(), 7);
  assertEquals(range.GetMaxRangePoint(), 12);
  range.ToggleIsUniform();
  assertEquals(range.GetIsUniform(), false);
});

test("Obb preserves Carbon corner order and computes transformed AABBs", () =>
{
  const box = new Obb();
  vec3.set(box.center, 10, 20, 30);
  vec3.set(box.sizes, 2, 3, 4);
  vec3.set(box.x, 1, 0, 0);
  vec3.set(box.y, 0, 2, 0);
  vec3.set(box.z, 0, 0, 3);

  const signs = [
    [1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1],
    [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1]
  ];
  for (let index = 0; index < signs.length; index++)
  {
    const [sx, sy, sz] = signs[index];
    assert.deepEqual(Array.from(box.GetPoint(index)), [10 + sx * 2, 20 + sy * 6, 30 + sz * 12]);
  }
  assert.throws(() => box.GetPoint(8), RangeError);

  const transform = mat4.fromValues(
    1, 0, 0, 0,
    0, 0, 2, 0,
    0, -1, 0, 0,
    5, 7, 11, 1
  );
  const expectedMin = vec3.fromValues(Infinity, Infinity, Infinity);
  const expectedMax = vec3.fromValues(-Infinity, -Infinity, -Infinity);
  const transformed = vec3.create();
  for (let index = 0; index < 8; index++)
  {
    vec3.transformMat4(transformed, box.GetPoint(index), transform);
    vec3.min(expectedMin, expectedMin, transformed);
    vec3.max(expectedMax, expectedMax, transformed);
  }

  const actualMin = vec3.create();
  const actualMax = vec3.create();
  box.ComputeAABB(actualMin, actualMax, transform);
  assert.deepEqual(Array.from(actualMin), Array.from(expectedMin));
  assert.deepEqual(Array.from(actualMax), Array.from(expectedMax));
});

test("Obb builds Carbon world bases and clips one side against a frustum plane", () =>
{
  const box = new Obb();
  const localToWorld = mat4.fromValues(
    0, 2, 0, 0,
    -3, 0, 0, 0,
    0, 0, 4, 0,
    10, 20, 30, 1
  );
  box.CreateClippedWorldBoundingObb([-1, -2, -3], [3, 4, 5], localToWorld, null);
  assert.deepEqual(Array.from(box.center), [7, 22, 34]);
  assert.deepEqual(Array.from(box.sizes), [2, 3, 4]);
  assert.deepEqual(Array.from(box.x), [0, 2, 0]);
  assert.deepEqual(Array.from(box.y), [-3, 0, 0]);
  assert.deepEqual(Array.from(box.z), [0, 0, 4]);

  const clipped = new Obb();
  const insidePlane = vec4.fromValues(0, 0, 0, 1);
  clipped.CreateClippedWorldBoundingObb(
    [-1, -1, -1],
    [1, 1, 1],
    mat4.create(),
    {
      planes: [
        vec4.fromValues(1, 0, 0, 0),
        insidePlane,
        insidePlane,
        insidePlane,
        insidePlane,
        insidePlane
      ]
    }
  );
  assert.deepEqual(Array.from(clipped.center), [0.5, 0, 0]);
  assert.deepEqual(Array.from(clipped.sizes), [0.5, 1, 1]);
});

test("Obb is maintained utility source and remains generator-protected", () =>
{
  assert.equal(existsSync(new URL("../../src/trinity/generated/utilities/Obb.js", import.meta.url)), false);
  const summary = JSON.parse(readFileSync(new URL("../../src/trinity/generated/summary.json", import.meta.url), "utf8"));
  const disposition = summary.skipped.find(entry => entry.className === "Obb");
  assert.equal(disposition?.family, "utilities");
  assert.equal(disposition?.reason, "hand-maintained source exists");
  assert.equal(CjsSchema.GetConstructor("Obb"), Obb);
});
