import assert from "node:assert/strict";
import { box3 } from "../../npm/dist/global/math/box3.js";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import {
  EveHazeSetItem,
  EvePlaneSetItem,
  EveSpotlightSetItem,
  EveSpriteSetItem,
} from "../../npm/dist/trinity/index.js";


function assertVec(actual, expected, tolerance = 1e-5)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= tolerance,
      `component ${index}: expected ${expected[index]}, got ${actual[index]}`
    );
  }
}

test("EveHazeSetItem preserves Carbon TRS bounds and bone lookup", () => {
  const item = new EveHazeSetItem();
  item.position.set([10, 20, 30]);
  item.rotation.set([0, 0, Math.SQRT1_2, Math.SQRT1_2]);
  item.scaling.set([2, 3, 4]);
  item.boneIndex = 17;

  const bounds = item.GetBounds(box3.create());
  assertVec(box3.$min(bounds), [8.5, 19, 28]);
  assertVec(box3.$max(bounds), [11.5, 21, 50]);
  assert.equal(item.GetBoneIndex(), 17);
});

test("EveSpotlightSetItem transforms Carbon's unit box", () => {
  const item = new EveSpotlightSetItem();
  const rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
  mat4.fromRotationTranslationScale(item.transform, rotation, [5, 6, 7], [2, 4, 6]);
  item.boneIndex = 23;

  const bounds = item.GetBounds(box3.create());
  assertVec(box3.$min(bounds), [3, 5, 4]);
  assertVec(box3.$max(bounds), [7, 7, 10]);
  assert.equal(item.GetBoneIndex(), 23);
});

test("EvePlaneSetItem transforms Carbon's unit box with authored TRS", () => {
  const item = new EvePlaneSetItem();
  item.position.set([5, 6, 7]);
  item.rotation.set([0, 0, Math.SQRT1_2, Math.SQRT1_2]);
  item.scaling.set([2, 4, 6]);
  item.boneIndex = 31;

  const bounds = item.GetBounds(box3.create());
  assertVec(box3.$min(bounds), [3, 5, 4]);
  assertVec(box3.$max(bounds), [7, 7, 10]);
  assert.equal(item.GetBoneIndex(), 31);
});

test("EveSpriteSetItem exposes Carbon sphere bounds and bone lookup", () => {
  const item = new EveSpriteSetItem();
  item.position.set([1, 2, 3]);
  item.maxScale = 4;
  item.boneIndex = 29;
  // Carbon returns Sphere(position, maxScale); the port fills its enclosing box.
  const out = box3.create();

  assert.equal(item.GetBounds(out), out);
  assertVec(box3.$min(out), [-3, -2, -1]);
  assertVec(box3.$max(out), [5, 6, 7]);
  assert.equal(item.GetBoneIndex(), 29);
});

test("maintained attachment set items replace generated fallbacks", () => {
  const promoted = [
    ["haze", "EveHazeSetItem"],
    ["spotlights", "EveSpotlightSetItem"],
    ["sprites", "EveSpriteSetItem"],
  ];

  for (const [family, className] of promoted)
  {
    assert.equal(
      existsSync(new URL(`../../src/trinity/generated/eve/attachment/${family}/${className}.js`, import.meta.url)),
      false,
      className
    );
  }

  const summary = JSON.parse(readFileSync(new URL("../../src/trinity/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry => promoted.some(([, className]) => entry.className === className));
  assert.deepEqual(
    skipped.map(entry => entry.className).sort(),
    promoted.map(([, className]) => className).sort()
  );
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);
});
