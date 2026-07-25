import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import {
  EveHazeSetItem,
  EvePlaneSetItem,
  EveSpotlightSetItem,
  EveSpriteSetItem,
} from "../npm/dist/index.js";


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

  const bounds = item.GetBounds();
  assertVec(bounds.min, [8.5, 19, 28]);
  assertVec(bounds.max, [11.5, 21, 50]);
  assert.equal(item.GetBoneIndex(), 17);
});

test("EveSpotlightSetItem transforms Carbon's unit box", () => {
  const item = new EveSpotlightSetItem();
  const rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
  mat4.fromRotationTranslationScale(item.transform, rotation, [5, 6, 7], [2, 4, 6]);
  item.boneIndex = 23;

  const bounds = item.GetBounds();
  assertVec(bounds.min, [3, 5, 4]);
  assertVec(bounds.max, [7, 7, 10]);
  assert.equal(item.GetBoneIndex(), 23);
});

test("EvePlaneSetItem transforms Carbon's unit box with authored TRS", () => {
  const item = new EvePlaneSetItem();
  item.position.set([5, 6, 7]);
  item.rotation.set([0, 0, Math.SQRT1_2, Math.SQRT1_2]);
  item.scaling.set([2, 4, 6]);
  item.boneIndex = 31;

  const bounds = item.GetBounds();
  assertVec(bounds.min, [3, 5, 4]);
  assertVec(bounds.max, [7, 7, 10]);
  assert.equal(item.GetBoneIndex(), 31);
});

test("EveSpriteSetItem exposes Carbon sphere bounds and bone lookup", () => {
  const item = new EveSpriteSetItem();
  item.position.set([1, 2, 3]);
  item.maxScale = 4;
  item.boneIndex = 29;
  const out = new Float32Array(4);

  assert.equal(item.GetBounds(out), out);
  assertVec(out, [1, 2, 3, 4]);
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
      existsSync(new URL(`../src/generated/eve/attachment/${family}/${className}.js`, import.meta.url)),
      false,
      className
    );
  }

  const summary = JSON.parse(readFileSync(new URL("../src/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry => promoted.some(([, className]) => entry.className === className));
  assert.deepEqual(
    skipped.map(entry => entry.className).sort(),
    promoted.map(([, className]) => className).sort()
  );
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);
});
