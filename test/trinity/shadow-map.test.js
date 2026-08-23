import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import * as core from "../../npm/dist/trinity/core/index.js";
import * as generatedCore from "../../npm/dist/trinity/generated/trinityCore/index.js";
import * as trinity from "../../npm/dist/trinity/index.js";


const EPSILON = 1e-5;

function assertArrayNear(actual, expected, message, epsilon = EPSILON)
{
  assert.equal(actual.length, expected.length, `${message} length`);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `${message}[${index}]: expected ${expected[index]}, received ${actual[index]}`);
  }
}

test("Tr2ShadowMap is one maintained CPU producer with Carbon defaults", () =>
{
  const shadowMap = new core.Tr2ShadowMap();
  assert.equal(trinity.Tr2ShadowMap, core.Tr2ShadowMap);
  assert.equal("Tr2ShadowMap" in generatedCore, false);
  assert.equal(
    existsSync(new URL("../../src/trinity/generated/trinityCore/Tr2ShadowMap.js", import.meta.url)),
    false
  );

  assert.equal(shadowMap.size, 2048);
  assert.equal(shadowMap.splitCount, 16);
  assert.equal(shadowMap.disableShimmer, true);
  assert.equal(shadowMap.debugColorSplit, false);
  assert.equal(shadowMap.shadowSplitMode, core.Tr2ShadowMap.ShadowSplitMode.STATIC);
  assert.deepEqual(
    Array.from({ length: 16 }, (_value, index) => shadowMap[`SplitNr${index}`]),
    [
      25, 75, 150, 300, 600, 1200, 2400, 4800,
      9600, 19200, 38400, 76800, 153600, 307200, 614400, 1228800
    ]
  );
  assert.equal(shadowMap.GetShadowMapWidth(), 8);
  assert.equal(shadowMap.GetShadowMapHeight(), 2);
  assert.equal(shadowMap.GetUseDenoiser(), true);
  assert.equal(shadowMap.cascadeEffect.GetEffectPathName(),
    "res:/graphics/effect/managed/space/system/ShadowDepth.fx");
  assert.ok(shadowMap.cascadeEffect.GetResourceByName("EveSpaceSceneCascadedShadowMap"));
  assert.ok(shadowMap.cascadeEffect.GetResourceByName("DepthMap"));
  assert.equal(CjsSchema.getField(core.Tr2ShadowMap, "size")?.type.kind, "uint32");
  const globalStore = core.Tr2VariableStore.GlobalStore();
  assert.ok(globalStore.FindLocalVariable("EveSpaceSceneShadowMap"));
  assert.ok(globalStore.FindLocalVariable("EveSpaceSceneCascadedShadowMap"));

  const data = shadowMap.perSplitData;
  assert.equal(data.ShadowMapValues.length, 4);
  assert.equal(data.ShadowMatrixVal.length, 16);
  assert.equal(data.CascadeRanges.length, 16);
  assert.deepEqual(Array.from(data.SplitInfo), [ 0, 0, 0, 0 ], "constructor does not stamp split count");
  for (const matrix of data.ShadowMatrixVal)
  {
    assert.deepEqual(Array.from(matrix), Array.from(mat4.create()));
  }
});

test("setup, notification, and dynamic split transitions preserve Carbon behavior", () =>
{
  const shadowMap = new core.Tr2ShadowMap();
  shadowMap.Setup(1024, 4, false);
  assert.equal(shadowMap.size, 1024);
  assert.equal(shadowMap.splitCount, 4);
  assert.equal(shadowMap.perSplitData.SplitInfo[0], 4);
  assert.equal(shadowMap.denoiser, null);
  assert.equal(shadowMap.GetUseDenoiser(), false);

  shadowMap.Setup(1024, 4, true);
  assert.equal(shadowMap.GetUseDenoiser(), true);
  assert.equal(shadowMap.denoiser, null, "Setup never recreates a discarded denoiser");
  assert.throws(() => shadowMap.Setup(1024, 17, true), /at most 16/u);

  shadowMap.debugColorSplit = true;
  shadowMap.shadowSplitMode = core.Tr2ShadowMap.ShadowSplitMode.DYNAMIC;
  shadowMap.OnModified();
  assert.equal(shadowMap.cascadeEffect.GetOption("SHADOW_DEBUG_MODE"), "SDM_COLOR");
  shadowMap.UpdateSplitValues(25, 400);
  assertArrayNear(
    [ shadowMap.SplitNr0, shadowMap.SplitNr1, shadowMap.SplitNr2, shadowMap.SplitNr3 ],
    [ 50, 100, 200, 400 ],
    "geometric splits"
  );

  shadowMap.shadowSplitMode = core.Tr2ShadowMap.ShadowSplitMode.MANUAL;
  shadowMap.OnModified();
  shadowMap.SplitNr0 = 123;
  shadowMap.UpdateSplitValues(10, 1000);
  assert.equal(shadowMap.SplitNr0, 123, "manual mode preserves authored values");

  shadowMap.shadowSplitMode = core.Tr2ShadowMap.ShadowSplitMode.STATIC;
  shadowMap.debugColorSplit = false;
  shadowMap.OnModified();
  assert.equal(shadowMap.SplitNr0, 25);
  assert.equal(shadowMap.cascadeEffect.GetOption("SHADOW_DEBUG_MODE"), "SDM_NONE");
});

test("SetupShadowSplit keeps logical matrices and reverses Carbon compositions", () =>
{
  const shadowMap = new core.Tr2ShadowMap();
  shadowMap.Setup(1024, 4, true);
  shadowMap.shadowSplitMode = core.Tr2ShadowMap.ShadowSplitMode.DYNAMIC;
  shadowMap.OnModified();
  shadowMap.UpdateSplitValues(25, 400);
  shadowMap.disableShimmer = false;

  const rotation = quat.setAxisAngle(
    quat.create(),
    vec3.normalize(vec3.create(), [ 0.3, 1, -0.2 ]),
    0.47
  );
  const inverseView = mat4.fromRotationTranslation(mat4.create(), rotation, [ 11, -7, 23 ]);
  const setup = shadowMap.SetupShadowSplit(
    0,
    inverseView,
    [ 0.3, -1, 0.4 ],
    2,
    -0.8,
    1.2,
    0.9,
    -1.1
  );

  assert.equal(shadowMap.perSplitData.ShadowMapValues[0][0], 50);
  assertArrayNear(setup.aabb.min,
    [ -61.905731201171875, -71.11385345458984, -42.22289276123047 ], "aabb min", 1e-4);
  assertArrayNear(setup.aabb.max,
    [ 62.21284103393555, 18.7183780670166, 52.9122428894043 ], "aabb max", 1e-4);
  assertArrayNear(shadowMap.perSplitData.CascadeRanges[0],
    [ 124.11857604980469, 89.83222961425781, 95.1351318359375, 0 ], "range", 1e-4);
  assertArrayNear(setup.lightViewProjection, [
    0.015522697940468788, 1.288559120515842e-10, 0.002820494817569852, 0,
    0.0040144906379282475, -0.008268539793789387, -0.009401649236679077, 0,
    -0.0016057962784543633, -0.02067134901881218, 0.0037606596015393734, 0,
    0.0024743261747062206, -0.5832592248916626, 0.5561798214912415, 1
  ], "logical light-view projection", 1e-5);
  assertArrayNear(
    shadowMap.perSplitData.ShadowMatrixVal[0],
    setup.lightViewProjection,
    "stored matrix is logical, not pre-transposed"
  );
  const projection = mat4.fromValues(
    2 * 2 / (1.2 * 2 - -0.8 * 2), 0, 0, 0,
    0, -2 * 2 / (-1.1 * 2 - 0.9 * 2), 0, 0,
    1 + 2 * (-0.8 * 2) / (1.2 * 2 - -0.8 * 2),
    -1 - 2 * (0.9 * 2) / (-1.1 * 2 - 0.9 * 2),
    50 / (2 - 50), -1,
    0, 0, 2 * 50 / (2 - 50), 0
  );
  const expectedInvViewProj = mat4.multiply(
    mat4.create(),
    inverseView,
    mat4.invert(mat4.create(), projection)
  );
  assertArrayNear(
    setup.invViewProj,
    expectedInvViewProj,
    "Carbon inverse-projection * inverse-view reverses for gl-matrix"
  );
  assertArrayNear(setup.shadowFrustum.boundsMin, setup.aabb.min, "frustum min");
  assertArrayNear(setup.shadowFrustum.boundsMax, setup.aabb.max, "frustum max");
  const sameBorrowedSetup = shadowMap.SetupShadowSplit(
    0,
    inverseView,
    [ 0.3, -1, 0.4 ],
    2,
    -0.8,
    1.2,
    0.9,
    -1.1
  );
  assert.equal(sameBorrowedSetup, setup, "one allocation-free result is reused per split");
  assert.throws(() => shadowMap.SetupShadowSplit(4, inverseView, [ 0, -1, 0 ], 1, -1, 1, 1, -1),
    /invalid split index/u);
});

test("disableShimmer snaps each split to a texel-aligned cube", () =>
{
  const shadowMap = new core.Tr2ShadowMap();
  shadowMap.Setup(2048, 1, true);
  shadowMap.shadowSplitMode = core.Tr2ShadowMap.ShadowSplitMode.MANUAL;
  shadowMap.OnModified();
  shadowMap.SplitNr0 = 200;
  const setup = shadowMap.SetupShadowSplit(0, mat4.create(), [ 0.25, -1, 0.5 ], 2, -1, 1, 1, -1);
  const range = shadowMap.perSplitData.CascadeRanges[0];
  assert.ok(range[0] > 0);
  assertArrayNear(range, [ range[0], range[0], range[0], 0 ], "cube range", 1e-4);
  const texelSize = range[0] / shadowMap.size;
  const centerX = (setup.aabb.min[0] + setup.aabb.max[0]) * 0.5;
  const centerY = (setup.aabb.min[1] + setup.aabb.max[1]) * 0.5;
  assert.ok(Math.abs(centerX / texelSize - Math.round(centerX / texelSize)) <= 1e-4);
  assert.ok(Math.abs(centerY / texelSize - Math.round(centerY / texelSize)) <= 1e-4);
});

test("shadow realization uses one nominal executor and fails loudly when absent", () =>
{
  const calls = [];
  class RecordingExecutor extends core.CjsShadowMapExecutor
  {
    PrepareShadowRendering(...args) { calls.push([ "prepare", ...args ]); return "atlas"; }
    BeginShadowRendering(...args) { calls.push([ "begin", ...args ]); }
    EndShadowRendering(...args) { calls.push([ "end", ...args ]); }
    DrawToShadowMapResult(...args) { calls.push([ "draw", ...args ]); return "result"; }
  }

  const shadowMap = new core.Tr2ShadowMap();
  const context = new core.Tr2RenderContext();
  assert.throws(() => context.SetShadowMapExecutor({}), /CjsShadowMapExecutor/u);
  assert.throws(() => shadowMap.PrepareShadowRendering(context), /no CjsShadowMapExecutor/u);

  const base = new core.CjsShadowMapExecutor();
  assert.throws(() => base.PrepareShadowRendering(shadowMap, context), /must be implemented/u);
  assert.throws(() => base.BeginShadowRendering(shadowMap, 0, context), /must be implemented/u);
  assert.throws(() => base.EndShadowRendering(shadowMap, context), /must be implemented/u);
  assert.throws(() => base.DrawToShadowMapResult(shadowMap, null, null, 1, context), /must be implemented/u);

  const executor = new RecordingExecutor();
  context.SetShadowMapExecutor(executor);
  assert.equal(shadowMap.PrepareShadowRendering(context), "atlas");
  shadowMap.BeginShadowRendering(context, 3);
  shadowMap.EndShadowRendering(context);
  assert.equal(shadowMap.DrawToShadowMapResult(context, "depth", "atlas", 0.75), "result");
  assert.deepEqual(calls.map(call => call[0]), [ "prepare", "begin", "end", "draw" ]);
  assert.deepEqual(calls[0].slice(1), [ shadowMap, context ]);
  assert.deepEqual(calls[1].slice(1), [ shadowMap, 3, context ]);
  assert.deepEqual(calls[3].slice(1), [ shadowMap, "depth", "atlas", 0.75, context ]);
});

test("debug getters preserve Carbon values", () =>
{
  const shadowMap = new core.Tr2ShadowMap();
  assert.equal(shadowMap.GetShadowSplitCount(), 16);
  assert.equal(shadowMap.GetShadowMapSize(), 2048);
  assert.equal(shadowMap.GetShadowEffect(), shadowMap.cascadeEffect);
  assert.equal(shadowMap.GetDebugSplitValue(), false);
  assert.deepEqual(
    Array.from({ length: 9 }, (_value, index) => shadowMap.GetDebugColors(index)),
    [
      0xffffffff, 0xffff0000, 0xff00ff00, 0xff0000ff, 0xffffff00,
      0xff00ffff, 0x2200ffff, 0xff555555, 0xff888888
    ]
  );
  assert.equal(shadowMap.GetDebugColors(9), undefined);
});
