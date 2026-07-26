import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { makePerObjectStore } from "./helpers/perObjectStore.js";
import {
  EveBoosterSet2,
  EveBoosterSet2Item,
  EveBoosterSet2Renderable,
  EveSpriteSet,
  EveTrailsSet
} from "../npm/dist/index.js";


const assertVecNear = (actual, expected, epsilon = 1e-6) =>
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `component ${index}: expected ${expected[index]}, received ${actual[index]}`);
  }
};

test("EveTrailsSet preserves Carbon trail records without realizing geometry", () =>
{
  const trails = new EveTrailsSet();
  const transform = mat4.fromTranslation(mat4.create(), [1, 2, 3]);
  const effect = {};
  const geometry = {};
  assert.equal(trails.GetFadeSpeed(), 1);
  trails.SetEffect(effect);
  trails.SetMeshResPath("res:/trail.gr2");
  trails.SetGeometryResource(geometry);
  trails.Add(transform, 4);
  transform[12] = 99;

  assert.equal(trails.effect, effect);
  assert.equal(trails.geometryResPath, "res:/trail.gr2");
  assert.equal(trails.geometryResource, geometry);
  assert.equal(trails.GetTrailData()[0].transform[12], 1);
  assert.equal(trails.GetTrailData()[0].size, 4);
  const snapshot = trails.GetTrailData();
  snapshot[0].transform[12] = 500;
  assert.equal(trails.GetTrailData()[0].transform[12], 1);
  assert.equal(trails.Initialize(), true);
  trails.Update(1);
  trails.Clear();
  assert.deepEqual(trails.GetTrailData(), []);
});

test("EveBoosterSet2 builds Carbon booster, glow, trail, light, and bounds CPU data", () =>
{
  const boosters = new EveBoosterSet2();
  const glows = new EveSpriteSet();
  const trails = new EveTrailsSet();
  boosters.SetGlow(glows);
  boosters.SetTrail(trails);
  boosters.SetData(
    2,
    [1, 0, 0, 1],
    [0, 1, 0, 1],
    3,
    4,
    5,
    [0, 0, 1, 1],
    [1, 1, 0, 1],
    false
  );
  boosters.SetLightData(2, 0.25, 3, 10, [1, 2, 3, 4], 20, [5, 6, 7, 8]);

  const transform = mat4.fromRotationTranslationScale(
    mat4.create(),
    [0, 0, 0, 1],
    [10, 20, 30],
    [2, 3, 1]
  );
  assert.equal(boosters.Add(transform, [0, 1, 1, 1], true, 6, 7, 2), 0);
  transform[12] = 999;

  assert.equal(CjsSchema.getField(EveBoosterSet2, "items")?.type.itemType, "EveBoosterSet2Item");
  assert.equal(boosters.items[0] instanceof EveBoosterSet2Item, true);
  assert.equal(boosters.items[0].transform[12], 10);
  assert.deepEqual(Array.from(boosters.items[0].functionality), [0, 1, 1, 1]);
  assert.equal(boosters.items[0].hasTrail, true);
  assert.equal(boosters.items[0].atlasIndex0, 6);
  assert.equal(boosters.items[0].atlasIndex1, 7);
  assert.equal(boosters.items[0].lightScale, 2);

  const data = boosters.GetBoosterData();
  assert.equal(data.length, 1);
  assert.equal(data[0].transform[12], 10);
  assert.deepEqual(Array.from(data[0].functionality), [0, 1, 1, 1]);
  assertVecNear(data[0].lightPosition, [10, 20, 28]);
  assert.equal(data[0].lightRadius, 6);
  assert.equal(data[0].atlasIndex0, 6);
  assert.equal(data[0].atlasIndex1, 7);
  assert.equal(boosters.maxSize, 3);
  assert.equal(glows.sprites.length, 3);
  assertVecNear(glows.sprites[0].position, [10, 20, 27.5]);
  assert.equal(glows.sprites[0].minScale, 6);
  assert.equal(glows.sprites[1].minScale, 9);
  assert.equal(glows.sprites[2].minScale, 12);
  assert.equal(glows.sprites[2].maxScale, 15);
  assert.equal(trails.GetTrailData().length, 1);
  assertVecNear(trails.GetTrailData()[0].transform.slice(12, 15), [10, 20, 29.5]);

  boosters.SetValues({ staticTrailLength: 40 });
  assertVecNear(boosters.trailsStaticOffsets0, [0, 0, 0]);
  assertVecNear(boosters.trailsStaticOffsets4, [0, 0, -40]);
  boosters.SetValues({ glowScale: 2.5 });
  assert.equal(glows.sprites.length, 3);

  boosters.SetValues({ flareLodEnabled: false });
  assert.equal(glows.sprites.length, 3);

  const dataSnapshot = boosters.GetBoosterData();
  dataSnapshot[0].transform[12] = 500;
  assert.equal(boosters.GetBoosterData()[0].transform[12], 10);
  assert.equal(typeof boosters.boosterBoundingSphereRadius, "number");
  assert.equal(boosters.boosterBoundingSphereCenter.length, 3);
  assert.deepEqual(EveBoosterSet2.Shape, { STAR: 0, BOX: 1, SHAPE_COUNT: 2 });
  assert.equal(Object.isFrozen(EveBoosterSet2.Shape), true);

  const values = boosters.GetValues({ persistOnly: true });
  assert.equal(values.items.length, 1);
  assert.equal(values.items[0].lightScale, 2);
  const restored = EveBoosterSet2.from({
    lightOffset: values.lightOffset,
    items: values.items
  });
  assert.equal(restored.items[0] instanceof EveBoosterSet2Item, true);
  assert.equal(restored.GetBoosterData().length, 1);
  assertVecNear(restored.GetBoosterData()[0].lightPosition, [10, 20, 28]);
  assert.equal(restored.GetBoosterData()[0].lightRadius, 6);

  boosters.Clear();
  assert.deepEqual(boosters.items, []);
  assert.deepEqual(boosters.GetBoosterData(), []);
  assert.equal(glows.sprites.length, 0);
  assert.deepEqual(trails.GetTrailData(), []);
  assert.equal(boosters.maxSize, 0);
  assert.equal(boosters.boosterBoundingSphereRadius, 0);
});

test("EveBoosterSet2Renderable follows Carbon intensity damping and owner update lifecycle", () =>
{
  const boosters = new EveBoosterSet2();
  boosters.maxVel = 100;
  boosters.alwaysOn = false;
  boosters.SetCount(2);
  assert.equal(boosters.instances.length, 2);
  assert.equal(boosters.instances[0] instanceof EveBoosterSet2Renderable, true);

  assert.equal(boosters.Update(
    1,
    0,
    mat4.create(),
    50,
    [0, 0, 1],
    [0, 0, 0, 1],
    0
  ), true);
  assert.ok(Math.abs(boosters.GetBoosterIntensity(0) - 0.084) < 1e-6);
  assert.ok(Math.abs(boosters.GetBoosterIntensity() - 0.042) < 1e-6);
  assert.equal(boosters.Update(1, 0, mat4.create(), 0, [0, 0, 0], [0, 0, 0, 1], 2), false);

  boosters.alwaysOn = true;
  boosters.alwaysOnIntensity = 1.25;
  boosters.Update(1, 0, mat4.create(), 0, [0, 0, 0], [0, 0, 0, 1], 1);
  assert.equal(boosters.GetBoosterIntensity(1), 1.25);
  assert.equal(boosters.Initialize(), true);
  assert.doesNotThrow(() => JSON.stringify(boosters.GetValues()));
});

test("EveBoosterSet2Renderable maintains Carbon trail spline CPU data", () =>
{
  const boosters = new EveBoosterSet2();
  boosters.SetTrail(new EveTrailsSet());
  boosters.SetCount(1);
  boosters.physicsUpdate = false;
  boosters.alwaysOn = true;
  boosters.SetValues({ staticTrailLength: 40 });
  boosters.Add(mat4.create(), [0, 1, 1, 1], true, 0, 0, 1);

  const parentTransform = mat4.fromTranslation(mat4.create(), [10, 20, 30]);
  boosters.Update(1, 0, parentTransform, 0, [0, 0, 0], [0, 0, 0, 1]);
  assert.equal(boosters.UpdateTrails(1, 0), true);

  const spline = boosters.instances[0].GetTrailSplineData();
  assert.equal(spline.positions.length, 5);
  assertVecNear(spline.positions[0], [10, 20, 30, 0]);
  assertVecNear(spline.positions[4], [10, 20, -10, 0.25]);
  assert.ok(Math.abs(spline.totalLength - 40) < 1e-6);
  assert.equal(spline.intensity, 1);
  assertVecNear(spline.positions.map(position => position[3]), [0, 0.25, 0.25, 0.25, 0.25]);
  assertVecNear(spline.normals[0], [0, 0, -10, 1]);
  assertVecNear(spline.normals[4], [0, 0, -5, 1]);

  spline.positions[0][0] = 500;
  assert.equal(boosters.instances[0].GetTrailSplineData().positions[0][0], 10);
  assert.equal(boosters.UpdateTrails(0, 0), true);

  // GetPerObjectData (cpp:260-289): the { vs, ps } composite - two structs,
  // two constant buffers (cpp:1325-1329). shipMatrix stored TRANSPOSED; both
  // 5-slot trail arrays fully written from the spline state above.
  const store = makePerObjectStore();
  const pod = boosters.instances[0].GetPerObjectData({ Alloc: name => store.Alloc(name) });

  assert.deepEqual([...pod.vs.GetLayout().stages], ["vs"], "vs half binds the vertex slot");
  assert.deepEqual([...pod.ps.GetLayout().stages], ["ps"], "ps half binds the pixel slot");
  assert.equal(pod.vs.GetData()[3], 10, "shipMatrix transposed - translation x at [3]");
  assert.equal(pod.ps.Copy("trailIntensity", new Float32Array(1))[0], 1, "trail intensity in the ps half");
  assertVecNear(pod.vs.Copy("trailsControlPositions", new Float32Array(4), 0), [10, 20, 30, 0]);
  assertVecNear(pod.vs.Copy("trailsControlPositions", new Float32Array(4), 4), [10, 20, -10, 0.25]);
  assertVecNear(pod.vs.Copy("trailsControlNormals", new Float32Array(4), 0), [0, 0, -10, 1]);
});

test("EveBoosterSet2Renderable preserves Carbon trail fades and fixed-step motion", () =>
{
  const boosters = new EveBoosterSet2();
  boosters.SetTrail(new EveTrailsSet());
  boosters.SetCount(1);
  boosters.physicsUpdate = false;

  const samples = [
    [199, 0],
    [200, 1],
    [400, 0.09549150281252627],
    [1200, 1],
    [30000, 1],
    [40000, 0.5],
    [50000, 1],
    [50001, 0]
  ];
  for (const [length, intensity] of samples)
  {
    boosters.SetValues({ staticTrailLength: length });
    boosters.UpdateTrails(1, 0);
    assert.ok(Math.abs(boosters.instances[0].trailIntensity - intensity) < 1e-6,
      `length ${length}`);
  }

  boosters.SetValues({ staticTrailLength: 400 });
  boosters.UpdateTrails(1, 0);
  const before = boosters.instances[0].GetTrailSplineData();
  boosters.SetValues({ staticTrailLength: 100 });
  boosters.UpdateTrails(0, 0);
  const after = boosters.instances[0].GetTrailSplineData();
  assert.deepEqual(after.positions, before.positions);
  assert.ok(Math.abs(after.intensity - before.intensity) < 1e-6);

  const moving = new EveBoosterSet2();
  moving.SetTrail(new EveTrailsSet());
  moving.SetCount(1);
  moving.physicsUpdate = true;
  moving.Update(0.0167, 0, mat4.create(), 1000, [0, 0, 0], [0, 0, 0, 1]);
  moving.UpdateTrails(0.0167, 0);
  const movingSpline = moving.instances[0].GetTrailSplineData();
  assert.ok(Math.abs(movingSpline.totalLength - 16.7) < 1e-4);
  assertVecNear(movingSpline.positions[0].slice(0, 3), [0, 0, 0], 1e-4);
  assertVecNear(movingSpline.positions[1].slice(0, 3), [0, 0, -16.7], 1e-4);
});

test("maintained booster and trail classes replace generated fallbacks", () =>
{
  const classNames = ["EveBoosterSet2", "EveBoosterSet2Renderable", "EveTrailsSet"];
  for (const className of classNames)
  {
    const generated = new URL(`../src/generated/eve/attachment/boosters/${className}.js`, import.meta.url);
    assert.equal(existsSync(generated), false);
  }

  const summary = JSON.parse(readFileSync(new URL("../src/generated/summary.json", import.meta.url), "utf8"));
  const skipped = summary.skipped.filter(entry => classNames.includes(entry.className));
  assert.deepEqual(skipped.map(entry => entry.className).sort(), classNames.slice().sort());
  assert.equal(skipped.every(entry => entry.reason === "hand-maintained source exists"), true);
});
