// EveChildCloud2 - the 12 ECS duck bodies plus their update prerequisites.
// Carbon source: trinity/Eve/SpaceObject/Children/EveChildCloud2.cpp -
// UpdateSyncronous cpp:621-685, UpdateAsyncronous cpp:687-708, GetSortValue
// cpp:237-242 + cpp:914-917, GetVolumetricBatches cpp:244-284,
// UpdateVolumetricLightmap cpp:319-382, SetSceneInformation cpp:384-424,
// GetLights cpp:732-746, GetVolumetricShadowBatches cpp:759-785,
// SetupShadowFrustum cpp:886-907, PrepareCloudShadowMap cpp:792-826,
// SetCloudShadowMapHandle cpp:829-835, IsVisible cpp:837-852, GetBatches
// cpp:854-884, PopulatePerObjectData cpp:544-619; math Sphere.cpp:10-17,
// Matrix_inline.h:531-546 / 749-765; Tr2Light::GetLight Tr2Light.cpp:152-163.
import test from "node:test";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import assert from "node:assert/strict";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import {
  EveChildCloud2,
  Tr2PointLight,
  Tr2RenderReason
} from "../npm/dist/index.js";


const EPSILON = 1e-5;

function assertClose(actual, expected, message, epsilon = EPSILON)
{
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, got ${actual}`
  );
}

function assertVecClose(actual, expected, message, epsilon = EPSILON)
{
  for (let index = 0; index < expected.length; index++)
  {
    assertClose(actual[index], expected[index], `${message}[${index}]`, epsilon);
  }
}

function MakeAccumulator()
{
  const committed = [];
  return {
    committed,
    Commit(batch)
    {
      committed.push(batch);
      return true;
    }
  };
}

test("UpdateAsyncronous composes world = local * parent with the operand swap (cpp:693)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  vec3.set(cloud.translation, 1, 0, 0);

  // Column-major parent applying R_y(90deg) first, then translation (5,6,7).
  const parent = mat4.create();
  mat4.translate(parent, parent, [5, 6, 7]);
  mat4.rotateY(parent, parent, Math.PI / 2);

  cloud.UpdateAsyncronous(null, { localToWorldTransform: parent });

  // Local translation (1,0,0) rotated to (0,0,-1), then offset: (5,6,6).
  // The wrong operand order would land at (6, 6, 7) territory instead.
  assertVecClose(
    [cloud.worldTransform[12], cloud.worldTransform[13], cloud.worldTransform[14]],
    [5, 6, 6],
    "world translation"
  );
  assert.equal(cloud.hasUpdated, true, "hasUpdated stamped (cpp:707)");
});

test("UpdateAsyncronous bounding sphere is Carbon's cheap two-corner form (math Sphere.cpp:10-17)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  const parent = mat4.fromYRotation(mat4.create(), Math.PI / 4);

  cloud.UpdateAsyncronous(null, { localToWorldTransform: parent });

  // Two-corner form: radius = |R(max) - R(min)| / 2 = sqrt(3)/2, NOT the
  // 8-corner AABB sphere (~1.118) a "corrected" implementation would produce.
  assertVecClose(cloud.boundingSphere.center, [0, 0, 0], "sphere center");
  assertClose(cloud.boundingSphere.radius, Math.sqrt(3) / 2, "two-corner radius");
});

test("UpdateAsyncronous map-offset scroll preserves the .z-by-tiling.y Carbon bug (cpp:701-703)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  vec3.set(cloud.textureTiling, 2, 3, 4);
  vec3.set(cloud.translation, 0.25, 0.35, 0.45);

  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });

  // shift = world movement (0.25, 0.35, 0.45) in local space (identity basis).
  // x scrolls by tiling.x (0.25*2 % 1), y by tiling.y (0.35*3 % 1) and z ALSO
  // by tiling.y (0.45*3 % 1) - NOT tiling.z.
  assertVecClose(cloud.mapOffset0, [0.5, 1.05 % 1, 1.35 % 1], "mapOffset0", 1e-4);
});

test("UpdateAsyncronous stamps adjustedMinScreenSize from the context lodFactor (cpp:706)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  cloud.minScreenSize = 40;
  cloud.UpdateAsyncronous({ GetLodFactor: () => 2.5 }, { localToWorldTransform: mat4.create() });
  assertClose(cloud.adjustedMinScreenSize, 100, "minScreenSize * lodFactor");
});

test("GetSortValue: frustum overload distance minus |scaling| * modifier (cpp:237-242), zero-arg float32 max (cpp:914-917)", () =>
{
  const cloud = new EveChildCloud2();
  cloud.worldTransform[12] = 10;
  cloud.worldTransform[13] = 0;
  cloud.worldTransform[14] = 0;
  vec3.set(cloud.scaling, 2, 3, 6); // |scaling| = 7
  cloud.sortingModifier = 2;

  const value = cloud.GetSortValue({ viewPos: [10, 4, 3] }); // distance 5
  assertClose(value, 5 - 14, "frustum sort value");

  const renderableValue = cloud.GetSortValue();
  assert.equal(renderableValue, 3.4028234663852886e38, "finite float32 max, not Infinity");
});

test("GetVolumetricBatches: gate order, one batch, renderedLastFrame stamp (cpp:244-284)", () =>
{
  const cloud = new EveChildCloud2();
  const frustum = {
    IsSphereVisible: () => true,
    GetPixelSizeAccross: () => 250
  };

  // Quality gate (cpp:246).
  cloud.minVisibleQuality = 3;
  assert.equal(cloud.GetVolumetricBatches(frustum, MakeAccumulator()), false, "quality-gated");
  cloud.minVisibleQuality = 0;

  // display && hasUpdated && frustum (cpp:250).
  assert.equal(cloud.GetVolumetricBatches(frustum, MakeAccumulator()), false, "display/hasUpdated-gated");
  cloud.display = true;
  vec3.set(cloud.scaling, 1, 1, 1);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });

  // Screen-size gate (cpp:256-260).
  cloud.adjustedMinScreenSize = 1000;
  assert.equal(cloud.GetVolumetricBatches(frustum, MakeAccumulator()), false, "screen-size-gated");
  cloud.adjustedMinScreenSize = 0;

  // Effect gate (cpp:271-274).
  assert.equal(cloud.GetVolumetricBatches(frustum, MakeAccumulator()), false, "effect-gated");

  cloud.effect = { name: "cloudEffect" };
  cloud.renderedLastFrame = false;
  const accumulator = MakeAccumulator();
  assert.equal(cloud.GetVolumetricBatches(frustum, accumulator), true, "committed");
  assert.equal(accumulator.committed.length, 1, "exactly one batch");
  const batch = accumulator.committed[0];
  assert.equal(batch.material, cloud.effect, "material is the cloud effect");
  assert.equal(batch.indexCountPerInstance, 36, "12*3 indices (cpp:280)");
  assert.equal(batch.instanceCount, 1, "single instance");
  assert.equal(batch.objectData.object, cloud, "per-object record carries the object");
  assertClose(batch.objectData.screenSize, 250, "real screen size threaded (cpp:278)");
  assert.equal(cloud.renderedLastFrame, true, "renderedLastFrame stamped (cpp:283)");

  // Singular transform gate (cpp:262-265) - zero-scale world.
  vec3.set(cloud.scaling, 0, 0, 0);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });
  assert.equal(cloud.GetVolumetricBatches(frustum, MakeAccumulator()), false, "singular-transform-gated");
});

test("UpdateVolumetricLightmap: budget contract and slice arithmetic (cpp:319-382)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });
  cloud.effect = {};
  cloud.lightmapSizeScale = 0.25;

  // lightmapWidth 0 fail-closes (cpp:325).
  assert.equal(cloud.UpdateVolumetricLightmap(null), false, "no dimensions - false");

  cloud.lightmapWidth = 64;
  cloud.lightmapHeight = 64;
  cloud.lightmapDepth = 64;

  // No compute duck - failure resets the offset and returns false.
  cloud.lightmapDirtyOffset = 7;
  assert.equal(cloud.UpdateVolumetricLightmap(null), false, "no duck - false");
  assert.equal(cloud.lightmapDirtyOffset, 0, "failure resets offset (cpp:378)");

  // Success: VOXELS = floor(6400000 * 0.25^3) = 100000; scaled dims 16;
  // slices = floor(100000 / 256) = 390; groups use the UNSCALED dims
  // ((64+7)/8 = 8) - the cpp:359-361 quirk.
  const calls = [];
  const renderContext = {
    RunComputeShader(effect, name, x, y, z)
    {
      calls.push([effect, name, x, y, z]);
      return true;
    }
  };
  assert.equal(cloud.UpdateVolumetricLightmap(renderContext), true, "budget consumed");
  assert.deepEqual(calls, [[cloud.effect, "GenerateLightmap", 390, 8, 8]], "dispatch arguments");
  assert.equal(cloud.lightmapDirty, false, "completed (390 >= scaledWidth 16)");
  assert.equal(cloud.lightmapDirtyOffset, 0, "offset reset on completion (cpp:369)");
  assert.equal(cloud.UpdateVolumetricLightmap(renderContext), false, "clean lightmap - false");
});

test("SetSceneInformation: scale map, dirty asymmetry, sun threshold quirk, effect options (cpp:384-424)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  const parent = mat4.fromYRotation(mat4.create(), Math.PI / 2);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: parent });

  const options = [];
  cloud.effect = { SetOption: (name, value) => options.push([name, value]) };
  cloud.receiveShadows = true;

  // Quality Low -> 0.1; the scale change sets dirty WITHOUT resetting the
  // offset (cpp:398-402)... but the sun moving from prev (0,0,0) also
  // triggers MarkLightmapDirty which DOES reset it - so pin the asymmetry
  // with an unchanged-sun second call below.
  cloud.SetSceneInformation({
    quality: EveChildCloud2.Tr2VolumerticQuality.Low,
    depthSlices: [10, 20, 30, 40],
    sunDirection: [1, 0, 0],
    targetWidth: 800,
    targetHeight: 600,
    receiveShadows: true,
    raytracedShadows: true
  });
  assertClose(cloud.lightmapSizeScale, 0.1, "Low quality scale");
  assert.equal(cloud.currentQuality, EveChildCloud2.Tr2VolumerticQuality.Low, "quality stamped");
  assert.deepEqual(Array.from(cloud.depthSlices), [10, 20, 30, 40], "depth slices copied");
  // World is R_y(90): world sun (1,0,0) in cloud-local space is (0,0,1).
  assertVecClose(cloud.localSunDirection, [0, 0, 1], "local sun direction");
  assert.equal(cloud.targetWidth, 800, "target width");
  assert.deepEqual(options, [
    ["CLOUD_SHADOWS", "CLOUD_SHADOWS_RECEIVE"],
    ["CLOUD_SHADOW_ALGORITHM", "CLOUD_SHADOWS_RAYTRACED"]
  ], "effect options");

  // Scale change with an UNCHANGED sun: dirty set, offset NOT reset (cpp:398-402).
  cloud.lightmapDirty = false;
  cloud.lightmapDirtyOffset = 5;
  cloud.SetSceneInformation({
    quality: EveChildCloud2.Tr2VolumerticQuality.Medium,
    depthSlices: [10, 20, 30, 40],
    sunDirection: [1, 0, 0],
    targetWidth: 800,
    targetHeight: 600,
    receiveShadows: false,
    raytracedShadows: false
  });
  assertClose(cloud.lightmapSizeScale, 0.15, "Medium quality scale");
  assert.equal(cloud.lightmapDirty, true, "scale change dirties");
  assert.equal(cloud.lightmapDirtyOffset, 5, "offset NOT reset by the scale path");

  // Sun-motion threshold is cos(5/180) ~ 0.99961 (missing degree conversion -
  // the QUIRK): a 2-degree move re-dirties, a 0.05-degree move does not.
  cloud.lightmapDirty = false;
  const twoDegrees = 2 * Math.PI / 180;
  cloud.SetSceneInformation({
    quality: EveChildCloud2.Tr2VolumerticQuality.Medium,
    depthSlices: [10, 20, 30, 40],
    sunDirection: [Math.cos(twoDegrees), Math.sin(twoDegrees), 0],
    targetWidth: 800,
    targetHeight: 600,
    receiveShadows: false,
    raytracedShadows: false
  });
  assert.equal(cloud.lightmapDirty, true, "2-degree sun move re-dirties (~1.59 deg threshold)");

  cloud.lightmapDirty = false;
  const tinyAngle = 0.05 * Math.PI / 180;
  cloud.SetSceneInformation({
    quality: EveChildCloud2.Tr2VolumerticQuality.Medium,
    depthSlices: [10, 20, 30, 40],
    sunDirection: [Math.cos(twoDegrees + tinyAngle), Math.sin(twoDegrees + tinyAngle), 0],
    targetWidth: 800,
    targetHeight: 600,
    receiveShadows: false,
    raytracedShadows: false
  });
  assert.equal(cloud.lightmapDirty, false, "0.05-degree sun move stays clean");
});

test("SetupShadowFrustum: basis, mirrored ortho, magic z extension, world-first composition (cpp:886-907)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });

  const shadowInfo = {};
  cloud.GetVolumetricShadowInfo(shadowInfo, [0, 0, 1]);

  assert.equal(shadowInfo.shadowMapSize, 512, "shadow map size (cpp:101)");
  // lightView = diag(-1, 1, -1) for sunDir +z; unit cube stays symmetric and
  // max.z gains the 2,500,000 sun-ray extension (cpp:895).
  assertVecClose(shadowInfo.aabbMax, [0.5, 0.5, 2500000.5], "aabb max", 1e-2);
  assertVecClose(shadowInfo.shadowFrustum.boundsMin, [-0.5, -0.5, -0.5], "frustum bounds min");

  // The D3D off-center ortho with Carbon's mirrored (max, min) arguments maps
  // world (0.5, 0.5, 0.5) -> light (-0.5, 0.5, -0.5) -> NDC (1, -1, 1).
  const projected = vec3.transformMat4(vec3.create(), [0.5, 0.5, 0.5], shadowInfo.lightViewProj);
  assertVecClose(projected, [1, -1, 1], "mirrored NDC corner", 1e-4);

  // World-first composition proof (cpp:893): translate the cloud +100 x; light
  // view negates x, so the light-space bounds must land at [-100.5, -99.5] -
  // the swapped-operand mistake would land at [99.5, 100.5].
  const parent = mat4.fromTranslation(mat4.create(), [100, 0, 0]);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: parent });
  const movedInfo = {};
  cloud.GetVolumetricShadowInfo(movedInfo, [0, 0, 1]);
  assertClose(movedInfo.shadowFrustum.boundsMin[0], -100.5, "world applied before lightView");
  assertClose(movedInfo.shadowFrustum.boundsMax[0], -99.5, "world applied before lightView (max)");
});

test("GetVolumetricShadowBatches: gates and the declaration-less alpha triangle (cpp:759-785)", () =>
{
  const cloud = new EveChildCloud2();
  assert.equal(cloud.GetVolumetricShadowBatches(MakeAccumulator()), false, "display gate");

  cloud.display = true;
  cloud.effect = {};
  assert.equal(cloud.GetVolumetricShadowBatches(MakeAccumulator()), false, "castShadows gate");

  cloud.castShadows = true;
  const accumulator = MakeAccumulator();
  assert.equal(cloud.GetVolumetricShadowBatches(accumulator), true, "committed");
  const batch = accumulator.committed[0];
  assert.equal(batch.renderingMode, 4, "RM_ALPHA (cpp:781)");
  assert.equal(batch.vertexDeclaration, 0, "NULL_DECLARATION (cpp:782)");
  assert.equal(batch.indexCountPerInstance, 3, "one triangle (cpp:783)");
  assertClose(batch.objectData.screenSize, 1, "screenSize 1 (cpp:780)");
});

test("GetBatches: reflection-transparent only, screenSize 10000, no renderedLastFrame stamp (cpp:854-884)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });
  cloud.reflectionEffect = { name: "reflection" };
  cloud.renderedLastFrame = false;

  const reflection = Tr2RenderReason.TR2RENDERREASON_REFLECTION;
  const transparent = TriBatchType.TRIBATCHTYPE_TRANSPARENT;

  assert.equal(
    cloud.GetBatches(MakeAccumulator(), TriBatchType.TRIBATCHTYPE_OPAQUE, null, reflection),
    false,
    "opaque leg is a silent no-op"
  );
  assert.equal(
    cloud.GetBatches(MakeAccumulator(), transparent, null, Tr2RenderReason.TR2RENDERREASON_NORMAL),
    false,
    "normal reason is a silent no-op"
  );

  const accumulator = MakeAccumulator();
  assert.equal(cloud.GetBatches(accumulator, transparent, null, reflection), true, "committed");
  const batch = accumulator.committed[0];
  assert.equal(batch.material, cloud.reflectionEffect, "reflection effect");
  assert.equal(batch.renderingMode, 4, "RM_ALPHA (cpp:881)");
  assertClose(batch.objectData.screenSize, 10000, "hardcoded 10000 (cpp:878)");
  assert.equal(cloud.renderedLastFrame, false, "reflection does NOT stamp renderedLastFrame");
});

test("HasTransparentBatches is unconditionally true (cpp:909-912)", () =>
{
  assert.equal(new EveChildCloud2().HasTransparentBatches(), true);
});

test("IsVisible: display + frustum + live lod pixel gate (cpp:837-852)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 1, 1, 1);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });
  cloud.minScreenSize = 100;

  const MakeContext = (pixelSize, lodFactor) => ({
    GetFrustum: () => ({
      IsSphereVisible: () => true,
      GetPixelSizeAccross: () => pixelSize
    }),
    GetLodFactor: () => lodFactor
  });

  assert.equal(cloud.IsVisible(MakeContext(250, 2)), false, "display gate");
  cloud.display = true;
  assert.equal(cloud.IsVisible(MakeContext(250, 2)), true, "250 >= 100*2");
  assert.equal(cloud.IsVisible(MakeContext(150, 2)), false, "150 < 100*2 (LIVE lodFactor, not adjusted)");
});

test("GetLights: display gate, average basis scaling, duck submission (cpp:732-746)", () =>
{
  const cloud = new EveChildCloud2();
  const calls = [];
  cloud.lights.push({ AddLight: (...args) => calls.push(args) });

  cloud.GetLights({});
  assert.equal(calls.length, 0, "display-gated");

  cloud.display = true;
  vec3.set(cloud.scaling, 2, 3, 4);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: mat4.create() });
  const manager = {};
  cloud.GetLights(manager);
  assert.equal(calls.length, 1, "one submission per light");
  assert.equal(calls[0][0], manager, "manager threaded");
  assert.equal(calls[0][1], cloud.worldTransform, "world transform threaded");
  assertClose(calls[0][2], 3, "average of basis row lengths (2+3+4)/3");
});

test("UpdateSyncronous: effect-hash invalidation and the renderedLastFrame animation gate (cpp:621-685)", () =>
{
  const cloud = new EveChildCloud2();
  let hash = 1;
  cloud.effect = { GetHashValue: () => hash };
  cloud.lightmapDirty = false;
  cloud.lightmapWidth = 64;

  cloud.UpdateSyncronous(null, {});
  assert.equal(cloud.lightmapDirty, true, "first hash observation invalidates");
  assert.equal(cloud.lightmapWidth, 0, "dimensions zeroed (cpp:630-632)");

  cloud.lightmapDirty = false;
  cloud.UpdateSyncronous(null, {});
  assert.equal(cloud.lightmapDirty, false, "stable hash leaves the lightmap alone");
  hash = 2;
  cloud.UpdateSyncronous(null, {});
  assert.equal(cloud.lightmapDirty, true, "hash change invalidates");

  // Animation advances while renderedLastFrame is set, then the flag clears.
  const advances = [];
  cloud.animation = {
    UpdateOnlyWhenRendered: () => true,
    AdvanceTime: dt => advances.push(dt)
  };
  cloud.renderedLastFrame = true;
  cloud.UpdateSyncronous({ GetDeltaT: () => 0.25 }, {});
  assert.deepEqual(advances, [0.25], "advanced while rendered");
  assert.equal(cloud.renderedLastFrame, false, "flag cleared (cpp:684)");
  cloud.UpdateSyncronous({ GetDeltaT: () => 0.25 }, {});
  assert.deepEqual(advances, [0.25], "not advanced while unrendered");
});

test("PopulatePerObjectData: swapped world*view product, element-read consumers, light block (cpp:544-619)", () =>
{
  const cloud = new EveChildCloud2();
  vec3.set(cloud.scaling, 2, 1, 3);
  const parent = mat4.create();
  mat4.translate(parent, parent, [10, 20, 30]);
  mat4.rotateY(parent, parent, 0.6);
  cloud.UpdateAsyncronous(null, { localToWorldTransform: parent });
  cloud.depthSlices[0] = 7;
  cloud.depthSlices[1] = 11;
  cloud.minScreenSize = 50;
  cloud.noiseTextureSize = 0; // schema default - modulo-by-zero guard

  const view = mat4.lookAt(mat4.create(), [3, 5, -7], [10, 2, 4], [0, 1, 0]);
  const renderContext = {
    GetViewTransform: () => view,
    GetViewPosition: () => vec3.fromValues(3, 5, -7)
  };

  const data = cloud.PopulatePerObjectData({}, 150, renderContext);

  // Carbon: worldViewInv = Inverse(world * view), world applies FIRST - the
  // gl-matrix expression is multiply(WV, view, world).
  const wv = mat4.multiply(mat4.create(), view, cloud.worldTransform);
  const expectedInv = mat4.invert(mat4.create(), wv);
  mat4.transpose(expectedInv, expectedInv);
  assertVecClose(data.worldViewInv, expectedInv, "worldViewInv (swapped product + packing transpose)", 1e-4);

  // viewDirection = -(column 2 of WV); depthSliceN = -WV[14] - slice*WV[15].
  assertVecClose(data.viewDirection, [-wv[2], -wv[6], -wv[10]], "view direction", 1e-4);
  assertClose(data.depthSlice0, -wv[14] - 7 * wv[15], "depth slice 0", 1e-3);
  assertClose(data.depthSlice1, -wv[14] - 11 * wv[15], "depth slice 1", 1e-3);

  // relativeScaling = scale / max component: (2,1,3)/3.
  assertVecClose(data.relativeScaling, [2 / 3, 1 / 3, 1], "relative scaling", 1e-4);

  // lodFactor = max(0, screenSize / max(1, minScreenSize) - 1) = 150/50 - 1.
  assertClose(data.lodFactor, 2, "lod factor");

  // The zero noise size guard (Carbon's ctor default 32 never hits the UB).
  assert.deepEqual(data.noiseConfig, [0, 0, 0, 0], "noise guard");

  // Light block: radius > 0 scales color by multiplier * (inner*2+1)^3 and
  // the remaining slots zero-fill (cpp:585-614).
  cloud.lights.push({
    GetLight: out =>
    {
      vec3.set(out.position, 1, 2, 3);
      out.radius = 4;
      vec3.set(out.color, 0.5, 0.25, 1);
      return out;
    },
    GetLightData: () => ({ innerRadius: 2 }),
    GetBrightnessMultiplier: () => 3
  });
  const withLights = cloud.PopulatePerObjectData({}, 1, renderContext);
  assert.equal(withLights.lights.length, 4, "always four slots");
  const light = withLights.lights[0];
  assertVecClose(light.position, [1, 2, 3], "light position");
  assertClose(light.radius, 4, "light radius");
  assertClose(light.innerRadius, 0.5, "innerRadius = clamp(2/4)");
  // boost = (0.5*2 + 1)^3 = 8; color = base * 3 * 8.
  assertVecClose(light.color, [12, 6, 24], "boosted color");
  assertClose(withLights.lights[1].radius, 0, "unused slots zeroed");
});

test("PrepareCloudShadowMap / SetCloudShadowMapHandle contract (cpp:792-835)", () =>
{
  const cloud = new EveChildCloud2();
  assert.equal(cloud.PrepareCloudShadowMap(null), false, "receiveShadows gate");

  cloud.receiveShadows = true;
  const prepared = [];
  assert.equal(cloud.PrepareCloudShadowMap({ PrepareCloudShadowMap: c => prepared.push(c) }), true, "prepared");
  assert.deepEqual(prepared, [cloud], "engine duck receives the cloud");

  const published = [];
  cloud.depthShadowMapHandle = { SetValue: value => published.push(value) };
  cloud.SetCloudShadowMapHandle();
  assert.equal(published.length, 0, "invalid DS publishes nothing");
  cloud.shadowMapDS = { IsValid: () => true };
  cloud.SetCloudShadowMapHandle();
  assert.deepEqual(published, [cloud.shadowMapDS], "valid DS published to the handle");
});

test("Tr2Light.GetLight returns lightData position/radius and brightness-scaled rgb (Tr2Light.cpp:152-163)", () =>
{
  const light = new Tr2PointLight();
  light.SetLightData({ position: [1, 2, 3], radius: 5, brightness: 2, color: [0.5, 0.25, 1, 1] });
  const out = light.GetLight();
  assertVecClose(out.position, [1, 2, 3], "position");
  assertClose(out.radius, 5, "radius");
  assertVecClose(out.color, [1, 0.5, 2], "rgb * brightness");
});
