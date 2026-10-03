import { Tr2RenderContextALStub, Tr2TextureAL, Tr2BitmapDimensions } from "../../npm/dist/trinityal/index.js";
import { PixelFormat, TextureType, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
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
  assert.equal(trinity.ITr2FroxelFogSettings, eve.ITr2FroxelFogSettings);
  assert.equal("ITr2FroxelFogSettings" in generatedCore, false);
  assert.ok(new eve.EveChildFogVolume() instanceof eve.ITr2FroxelFogSettings);
  const fogContract = new eve.ITr2FroxelFogSettings();
  assert.equal(CjsSchema.getMethod(eve.ITr2FroxelFogSettings, "GetFroxelFogSettings")?.impl?.status, "abstract");
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
  assert.ok(renderer.mieEnvironmentMap instanceof core.Tr2TextureReference);
  for (const name of [
    "EveSceneFogVolumeMap",
    "VolumetricDepthMap",
    "EveSceneMieEnvironmentMap",
    "EveSceneFroxelFogMap"
  ])
  {
    assert.ok(core.Tr2VariableStore.globalStore().FindLocalVariable(name), `${name} reserved`);
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
    [ "getEmptyVolumetricTexture", "adapted" ],
    [ "UpdateFogSettings", "adapted" ],
    [ "HasFog", "implemented" ],
    [ "RenderFog", "notImplemented" ],
    [ "RenderFogIntoReflectionMap", "notImplemented" ],
    [ "getEmptyFogTexture", "adapted" ],
    [ "UpdateFogEnvironmentMap", "notImplemented" ],
    [ "UpdateVariableStore", "implemented" ],
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


test("positive-density fog and fog reflection remain explicit gaps", () =>
{
  const renderer = new core.Tr2VolumetricsRenderer();
  renderer.thickness = 1;
  for (const method of ["RenderFog", "RenderFogIntoReflectionMap", "UpdateFogEnvironmentMap"])
    assert.throws(() => renderer[method](), /unported/u, method);
});

test("UpdateVariableStore publishes the Mie map, taking no arguments", () =>
{
  // Carbon's is one line and takes nothing; the port had grown a renderContext
  // parameter that existed only to reach the executor.
  const renderer = new core.Tr2VolumetricsRenderer();

  assert.equal(renderer.UpdateVariableStore.length, 0);
  renderer.UpdateVariableStore();

  const variable = core.Tr2VariableStore.globalStore().GetVariable("EveSceneMieEnvironmentMap");

  assert.ok(variable, "registers under the name effects sample it by");
});

/** Stub AL with real native pool handles; fullscreen draws are recorded, not GPU-executed. */
function volumeFixture()
{
  const context = new core.Tr2RenderContext();
  const al = new Tr2RenderContextALStub();
  al.CreateDevice({ mode: { width: 80, height: 40 } });
  context.SetRenderContextAL(al);
  const pool = new core.Tr2GpuResourcePool().SetRenderContext(context);
  const depth = context.CreateTexture(new Tr2BitmapDimensions({ type: TextureType.TEX_TYPE_2D,
    width: 80, height: 40, depth: 1, mipCount: 1, arraySize: 1,
    format: PixelFormat.PIXEL_FORMAT_R32_FLOAT }), { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE | Tr2GpuUsage.RENDER_TARGET });
  return { context, pool, depth, close() { depth.Destroy(); pool.Destroy(); context.Destroy(); } };
}

/** Implements the native registry iteration contract over test renderables. */
function volumeRegistry(clouds)
{
  return {
    ComponentCount() { return clouds.length; },
    ProcessComponents(_type, fn) { for (const cloud of clouds) fn(cloud); },
    ProcessComponentsUntil(_type, fn) { for (const cloud of clouds) if (fn(cloud)) break; }
  };
}

test("empty volumes have Carbon dimensions, persistent identity and no-fog fallback", () =>
{
  const f = volumeFixture();
  try
  {
    const a = core.Tr2VolumetricsRenderer.getEmptyVolumetricTexture(f.pool);
    const b = core.Tr2VolumetricsRenderer.getEmptyVolumetricTexture(f.pool);
    const fog = new core.Tr2VolumetricsRenderer().RenderFog(f.context, f.pool);
    assert.equal(a.Get().GetArraySize(), 4);
    assert.equal(a.Get().GetWidth(), 1);
    assert.equal(a.Get()._texture, b.Get()._texture);
    assert.equal(fog.Get().GetType(), TextureType.TEX_TYPE_3D);
    for (const h of [a, b, fog]) f.pool.Free(h);
  }
  finally { f.close(); }
});

test("cloud pass sorts stably, budgets one lightmap, binds four slices, blurs and composites", () =>
{
  const f = volumeFixture(), renderer = new core.Tr2VolumetricsRenderer();
  const log = [], draws = [], clears = [];
  const originalDraw = core.Tr2Renderer.drawScreenQuad;
  core.Tr2Renderer.drawScreenQuad = (_context, effect) => { draws.push(effect); return true; };
  const clear = f.context.Clear.bind(f.context);
  f.context.Clear = options => { clears.push(options.slot); return clear(options); };
  f.context.RenderBatches = accumulator => log.push(...accumulator.GetBatches().map(x => x.name));
  const cloud = (name, sort, updates) => ({
    SetSceneInformation(info) { assert.equal(info.targetWidth, 56); assert.equal(info.targetHeight, 28); },
    UpdateVolumetricLightmap() { log.push("update:" + name); return updates; },
    GetSortValue() { return sort; },
    GetVolumetricBatches(_frustum, acc) { acc.batches.push({ name }); }
  });
  const registry = volumeRegistry([cloud("near", 1, true), cloud("far-a", 3, true), cloud("far-b", 3, true)]);
  try
  {
    const fog = core.Tr2VolumetricsRenderer.getEmptyFogTexture(f.pool);
    const result = renderer.RenderVolumetrics(registry, {}, f.depth, fog.Get(), [0, -1, 0], [1, 2, 3, 4], false, f.pool, f.context);
    assert.deepEqual(log, ["update:near", "far-a", "far-b", "near"]);
    assert.deepEqual(clears, [0, 1, 2, 3]);
    assert.deepEqual(draws, [renderer.downsampleDepth, renderer.hBlur, renderer.vBlur, renderer.volumeBlit]);
    assert.equal(result.Get().GetArraySize(), 4);
    assert.equal(result.Get().GetWidth(), 56);
    assert.equal(renderer.batches.GetBatchCount(), 0);
    for (const name of ["EveSceneFroxelFogMap", "VolumetricDepthMap"])
      assert.equal(core.Tr2VariableStore.globalStore().GetVariable(name).GetValue().GetTexture().IsValid(), false);
    f.pool.Free(result); f.pool.Free(fog);
  }
  finally { core.Tr2Renderer.drawScreenQuad = originalDraw; f.close(); }
});

test("cloud shadows obey cast/target gates and submit Shadow technique", () =>
{
  const f = volumeFixture(), renderer = new core.Tr2VolumetricsRenderer();
  const log = [];
  const registry = volumeRegistry([{ GetVolumetricShadowBatches(acc) { log.push("gather"); acc.batches.push({}); } }]);
  f.context.RenderBatches = (_acc, technique) => log.push(technique);
  try
  {
    renderer.RenderShadows(registry, f.depth, f.context);
    assert.deepEqual(log, []);
    renderer.castShadows = true;
    renderer.RenderShadows(registry, new Tr2TextureAL(), f.context);
    assert.deepEqual(log, []);
    renderer.RenderShadows(registry, f.depth, f.context);
    assert.deepEqual(log, ["gather", "Shadow"]);
    assert.equal(renderer.batches.GetBatchCount(), 0);
  }
  finally { f.close(); }
});

test("raw texture registration copies ownership, reuses the global reference, and does not broadcast", () =>
{
  const f = volumeFixture();
  const name = "test_cloud_raw_texture";
  const global = core.Tr2VariableStore.globalStore(), local = new core.Tr2VariableStore();
  try
  {
    const variable = global.RegisterVariable(name, f.depth);
    const reference = variable.GetValue();
    let changes = 0;
    const owner = {};
    reference.OnTextureChange().RegisterListener(owner, () => changes++);
    assert.equal(local.RegisterVariable(name, new Tr2TextureAL()), variable, "native global lookup quirk");
    assert.equal(variable.GetValue(), reference);
    assert.equal(reference.GetTexture().IsValid(), false);
    assert.equal(f.depth.IsValid(), true, "registration did not take the caller's ownership");
    assert.equal(changes, 0);
  }
  finally { global.UnregisterVariable(name); f.close(); }
});
