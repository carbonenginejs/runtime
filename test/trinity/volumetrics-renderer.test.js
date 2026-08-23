import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import * as core from "../../npm/dist/trinity/core/index.js";
import * as eve from "../../npm/dist/trinity/eve/index.js";
import * as generatedCore from "../../npm/dist/trinity/generated/trinityCore/index.js";
import * as trinity from "../../npm/dist/trinity/index.js";


function assertArrayNear(actual, expected, message, epsilon = 1e-5)
{
  assert.equal(actual.length, expected.length, `${message} length`);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `${message}[${index}]: expected ${expected[index]}, received ${actual[index]}`);
  }
}


function addFog(scene, {
  priority,
  intensity,
  thickness,
  fogColor,
  backgroundVisibility = 0,
  backgroundVisibilityEnabled = false
})
{
  const fog = new eve.EveChildFogVolume();
  fog.priority = priority;
  fog.intensity = intensity;
  fog.thickness = thickness;
  fog.thicknessEnabled = true;
  vec4.copy(fog.fogColor, fogColor);
  fog.fogColorEnabled = true;
  fog.backgroundVisibility = backgroundVisibility;
  fog.backgroundVisibilityEnabled = backgroundVisibilityEnabled;
  fog.UpdateAsyncronous(scene.updateContext, { localToWorldTransform: mat4.create() });
  fog.Register(scene.componentRegistry);
  return fog;
}


test("Tr2VolumetricsRenderer is maintained with Carbon defaults and scene ownership", () =>
{
  const renderer = new core.Tr2VolumetricsRenderer();
  assert.equal(trinity.Tr2VolumetricsRenderer, core.Tr2VolumetricsRenderer);
  assert.equal(trinity.CjsVolumetricsExecutor, core.CjsVolumetricsExecutor);
  assert.equal(trinity.ITr2FroxelFogSettings, eve.ITr2FroxelFogSettings);
  assert.equal("ITr2FroxelFogSettings" in generatedCore, false);
  assert.ok(new eve.EveChildFogVolume() instanceof eve.ITr2FroxelFogSettings);
  const fogContract = new eve.ITr2FroxelFogSettings();
  assert.equal(CjsSchema.getMethod(eve.ITr2FroxelFogSettings, "GetFroxelFogSettings")?.impl?.status, "notImplemented");
  assert.throws(() => fogContract.GetFroxelFogSettings(), /must be implemented/u);
  assert.equal("Tr2VolumetricsRenderer" in generatedCore, false);
  assert.equal(
    existsSync(new URL("../../src/trinity/generated/trinityCore/Tr2VolumetricsRenderer.js", import.meta.url)),
    false
  );
  assert.equal(renderer.quality, core.Tr2VolumetricsRenderer.Tr2VolumerticQuality.High);
  assert.equal(renderer.scaleFactor, 0.7);
  assert.equal(renderer.blur, true);
  assert.equal(renderer.castShadows, false, "constructor High does not apply SetQuality");
  assert.equal(renderer.receiveShadows, false);
  assert.equal(renderer.gameBackClip, 1e6);
  assert.equal(renderer.logBlending, true);
  assert.equal(renderer.logBlendingSmoothness, 4);
  assert.ok(renderer.mieEnvironmentMap instanceof generatedCore.Tr2TextureReference);
  for (const name of [
    "EveSceneFogVolumeMap",
    "VolumetricDepthMap",
    "EveSceneMieEnvironmentMap",
    "EveSceneFroxelFogMap"
  ])
  {
    assert.ok(core.Tr2VariableStore.GlobalStore().FindLocalVariable(name), `${name} reserved`);
  }
  assert.equal(CjsSchema.getField(core.Tr2VolumetricsRenderer, "fogColor")?.type.kind, "color");
  assert.equal(CjsSchema.getField(core.Tr2VolumetricsRenderer, "fogNoiseMovementSpeed")?.type.kind, "vec3");

  const scene = new eve.EveSpaceScene();
  assert.ok(scene.volumetricsRenderer instanceof core.Tr2VolumetricsRenderer);
  assertArrayNear(scene.fogColor, [ 0.25, 0.25, 0.25, 1 ], "fog default");
  assertArrayNear(scene.ambientColor, [ 0.25, 0.25, 0.25, 1 ], "ambient default");
  assertArrayNear(scene.sunDirection, [ 0, -1, 0 ], "sun direction default");
  assertArrayNear(scene.currentSunColor, [ 1, 1, 1, 1 ], "current sun default");
  assert.equal(scene.reflectionIntensity, 1);
  assert.equal(scene.currentReflectionIntensity, 1);
  assert.equal(scene.currentNebulaIntensity, 1);

  const out = scene.GetPerFramePSData();
  renderer.PopulatePerFrameData(out);
  assertArrayNear(out.Copy("FroxelPlanets", new Float32Array(4), 0), [ 0, 0, 0, -1 ], "empty planet 0");
  assertArrayNear(out.Copy("FroxelPlanets", new Float32Array(4), 1), [ 0, 0, 0, -1 ], "empty planet 1");

  const carbonMethods = new Map([
    [ "RenderVolumetrics", "adapted" ],
    [ "GetEmptyVolumetricTexture", "adapted" ],
    [ "UpdateFogSettings", "adapted" ],
    [ "HasFog", "implemented" ],
    [ "RenderFog", "adapted" ],
    [ "RenderFogIntoReflectionMap", "adapted" ],
    [ "GetEmptyFogTexture", "adapted" ],
    [ "UpdateFogEnvironmentMap", "adapted" ],
    [ "UpdateVariableStore", "adapted" ],
    [ "SetPlanets", "adapted" ],
    [ "SetSunAngle", "implemented" ],
    [ "RenderShadows", "adapted" ],
    [ "PopulatePerFrameData", "adapted" ],
    [ "SetQuality", "implemented" ]
  ]);
  for (const [ method, status ] of carbonMethods)
  {
    assert.equal(CjsSchema.getMethod(core.Tr2VolumetricsRenderer, method)?.impl?.status, status, method);
  }
  assert.equal(trinity.AccumulatePriorityAttribute, core.AccumulatePriorityAttribute);
});


test("fog attributes blend independently across exact priority bands", () =>
{
  const scene = new eve.EveSpaceScene();
  const renderer = scene.volumetricsRenderer;
  renderer.logBlending = false;
  const first = addFog(scene, {
    priority: 3,
    intensity: 0.2,
    thickness: 10,
    fogColor: [ 1, 0, 0, 1 ]
  });
  addFog(scene, {
    priority: 3,
    intensity: 0.3,
    thickness: 20,
    fogColor: [ 0, 1, 0, 1 ]
  });
  addFog(scene, {
    priority: 2,
    intensity: 1,
    thickness: 4,
    fogColor: [ 0, 0, 1, 1 ],
    backgroundVisibility: 0.8,
    backgroundVisibilityEnabled: true
  });

  const stable = first.GetFroxelFogSettings();
  scene.UpdateFogSettings();
  assert.equal(first.GetFroxelFogSettings(), stable, "the producer record is stable");
  assert.ok(stable.fogNoiseMovementSpeed.value instanceof Float32Array);
  assert.equal(stable.fogNoiseMovementSpeed.enabled, false);
  assert.ok("logThickness" in stable);
  assert.ok(Math.abs(renderer.thickness - 10) <= 1e-5);
  assertArrayNear(renderer.fogColor, [ 0.2, 0.3, 0.5, 1 ], "color bands");
  assert.ok(Math.abs(renderer.backgroundVisibility - 0.8) <= 1e-5,
    "disabled higher-priority attributes do not consume lower-priority weight");
  assert.equal(renderer.HasFog(), true);

  renderer.logBlending = true;
  scene.UpdateFogSettings();
  const expectedLog = Math.log1p(10 * 4) * 0.2 +
    Math.log1p(20 * 4) * 0.3 + Math.log1p(4 * 4) * 0.5;
  assert.ok(Math.abs(renderer.thickness - Math.expm1(expectedLog) / 4) <= 1e-5);
  assert.throws(() => renderer.UpdateFogSettings({}, scene.updateContext), /GetComponents/u);

  const oversubscribed = core.AccumulatePriorityAttribute([
    { priority: 3, intensity: 2, value: { enabled: true, value: 10 } },
    { priority: 2, intensity: 1, value: { enabled: true, value: 100 } }
  ], source => source.value);
  assert.equal(oversubscribed, 10, "an overfull high-priority band suppresses lower bands");

  assert.throws(
    () => scene.componentRegistry.RegisterComponent(eve.EveComponentType.FroxelFogSettings, {
      GetFroxelFogSettings() {}
    }),
    /ITr2FroxelFogSettings/u
  );
});


test("fog animation state advances once in Trinity and is copied to engines", () =>
{
  const scene = new eve.EveSpaceScene();
  const fog = addFog(scene, {
    priority: 3,
    intensity: 1,
    thickness: 1,
    fogColor: [ 1, 1, 1, 1 ]
  });
  const settings = fog.GetFroxelFogSettings();
  settings.fogNoiseMovementSpeed.value.set([ 1, 2, 3 ]);
  settings.fogNoiseMovementSpeed.enabled = true;
  fog.godRayNoiseAnimationSpeed = 96;
  fog.godRayNoiseAnimationSpeedEnabled = true;

  const renderer = scene.volumetricsRenderer;
  renderer.UpdateFogSettings(scene.componentRegistry, { GetDeltaT: () => 1 });
  assert.equal(renderer.GetGodRayNoiseAnimation(), 0.5);
  assertArrayNear(renderer.GetFogNoiseMovement(new Float64Array(3)), [ 1, 2, 3 ], "first movement");

  fog.godRayNoiseAnimationSpeed = -80;
  renderer.UpdateFogSettings(scene.componentRegistry, { GetDeltaT: () => 1 });
  assert.equal(renderer.GetGodRayNoiseAnimation(), 0.25, "negative phase wraps into 0..1");
  assertArrayNear(renderer.GetFogNoiseMovement(new Float64Array(3)), [ 2, 4, 6 ], "second movement");

  renderer.SetSunAngle(0.75);
  assert.equal(renderer.GetSunAngle(), 0.75);
  assertArrayNear(renderer.GetPlanet(0, vec4.create()), [ 0, 0, 0, -1 ], "copied planet");
  assert.throws(() => renderer.GetPlanet(2, vec4.create()), /0 or 1/u);
});


test("quality presets and per-frame fog values preserve Carbon behavior", () =>
{
  const renderer = new core.Tr2VolumetricsRenderer();
  const quality = core.Tr2VolumetricsRenderer.Tr2VolumerticQuality;
  renderer.SetQuality(quality.Ultra);
  assert.deepEqual([ renderer.scaleFactor, renderer.castShadows, renderer.receiveShadows ], [ 1, true, true ]);
  renderer.SetQuality(quality.High);
  assert.deepEqual([ renderer.scaleFactor, renderer.castShadows, renderer.receiveShadows ], [ 0.7, true, false ]);
  renderer.SetQuality(quality.Medium);
  assert.deepEqual([ renderer.scaleFactor, renderer.castShadows, renderer.receiveShadows ], [ 0.5, false, false ]);
  renderer.SetQuality(quality.Low);
  assert.deepEqual([ renderer.scaleFactor, renderer.castShadows, renderer.receiveShadows ], [ 0.3, false, false ]);

  renderer.thickness = 2;
  renderer.backgroundVisibility = 2;
  renderer.environmentIntensity = 0.75;
  renderer.environmentDirectionality = 0;
  renderer.fogColor.set([ 0.1, 0.2, 0.3, 0.4 ]);
  const planets = [
    vec4.fromValues(1, 2, 3, 4),
    vec4.fromValues(5, 6, 7, 8)
  ];
  renderer.SetPlanets(planets);
  planets[0][0] = 99;
  const out = new eve.EveSpaceScene().GetPerFramePSData();
  renderer.PopulatePerFrameData(out);
  assertArrayNear(out.Copy("FroxelFogColor", new Float32Array(3)), [ 0.1, 0.2, 0.3 ], "fog color");
  assertArrayNear(out.Copy("FroxelBackgroundVisibility", new Float32Array(1)), [ 1 ], "visibility clamp");
  assertArrayNear(out.Copy("FroxelBaseDensity", new Float32Array(1)), [ 2e-6 ], "base density");
  assertArrayNear(out.Copy("FroxelMaxDistance", new Float32Array(1)), [ 1e6 ], "max distance");
  assertArrayNear(out.Copy("FroxelMaxDistanceVisibility", new Float32Array(1)), [ Math.exp(-2) ], "distance visibility");
  assertArrayNear(out.Copy("FroxelEnvironmentIntensity", new Float32Array(1)), [ 0.75 ], "environment intensity");
  assertArrayNear(out.Copy("FroxelEnvironmentG", new Float32Array(1)), [ -0.001 ], "environment G clamp");
  assertArrayNear(out.Copy("FroxelPlanets", new Float32Array(4), 0), [ 1, 2, 3, 4 ], "first planet copied");
  assertArrayNear(out.Copy("FroxelPlanets", new Float32Array(4), 1), [ 5, 6, 7, 8 ], "second planet copied");
  assert.throws(() => renderer.SetPlanets([ vec4.create() ]), /exactly two/u);

  renderer.thickness = 0;
  assert.equal(renderer.HasFog(), false);
  renderer.thickness = -1;
  assert.equal(renderer.HasFog(), false);
});


test("physical volumetric methods delegate only through a nominal executor", () =>
{
  const renderer = new core.Tr2VolumetricsRenderer();
  const base = new core.CjsVolumetricsExecutor();
  for (const method of [
    "RenderVolumetrics",
    "RenderFog",
    "RenderFogIntoReflectionMap",
    "UpdateFogEnvironmentMap",
    "UpdateVariableStore",
    "RenderShadows"
  ])
  {
    assert.throws(() => base[method](), /must be implemented by an engine/u, method);
  }
  assert.throws(() => base.GetEmptyVolumetricTexture(), /must be implemented by an engine/u);
  assert.throws(() => base.GetEmptyFogTexture(), /must be implemented by an engine/u);

  class TestExecutor extends core.CjsVolumetricsExecutor
  {
    RenderShadows(...args)
    {
      return args;
    }

    GetEmptyFogTexture(pool)
    {
      return pool;
    }
  }

  const context = new core.Tr2RenderContext();
  assert.throws(() => context.SetVolumetricsExecutor({}), /CjsVolumetricsExecutor/u);
  const executor = new TestExecutor();
  context.SetVolumetricsExecutor(executor);
  assert.equal(context.GetVolumetricsExecutor(), executor);
  const args = renderer.RenderShadows("registry", "shadow", context);
  assert.deepEqual(args, [ renderer, "registry", "shadow", context ]);
  assert.equal(core.Tr2VolumetricsRenderer.GetEmptyFogTexture("pool", executor), "pool");
  assert.throws(
    () => core.Tr2VolumetricsRenderer.GetEmptyVolumetricTexture("pool", {}),
    /CjsVolumetricsExecutor/u
  );
});
