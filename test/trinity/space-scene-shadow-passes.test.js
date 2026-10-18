// EveSpaceScene's cloud and light shadow passes on the stub backend:
// RenderIntoCloudShadowMap / RenderVolumetricShadowMap (EveSpaceScene.cpp:2369-2446)
// and RenderShadowMapForSpotLight / RenderShadowMapForLight / GetLightMatrices
// with the atlas bracket (cpp:2490-2627, 4175-4193).
import assert from "node:assert/strict";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import * as core from "../../npm/dist/trinity/core/index.js";
import * as trinity from "../../npm/dist/trinity/index.js";
import * as alStub from "../../npm/dist/trinityal/index.js";
import * as consts from "../../npm/dist/global/consts/renderContext/index.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { Tr2RenderReason } from "../../npm/dist/trinity/generated/trinityCore/enums.js";
import { TriFrustumOrtho } from "../../npm/dist/trinity/core/view/TriFrustumOrtho.js";
import { Tr2LightManager } from "../../npm/dist/trinity/core/lighting/Tr2LightManager.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";

const EPSILON = 1e-5;

function assertArrayNear(actual, expected, message, epsilon = EPSILON)
{
  assert.equal(actual.length, expected.length, `${message}: length`);
  for (let i = 0; i < expected.length; i++)
  {
    assert.ok(Math.abs(actual[i] - expected[i]) <= epsilon, `${message}[${i}]: ${actual[i]} != ${expected[i]}`);
  }
}

/** A context with the stub backend, which is the device without webgpu or webgl. */
function stubShadowContext()
{
  const al = new alStub.Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });

  const context = new core.Tr2RenderContext();

  context.SetRenderContextAL(al);
  return context;
}

/** A real R8 surface borrowed from a pool. */
function poolSurface(pool, name, width, height)
{
  return pool.GetTempTexture__WidthHeight(name, width, height, consts.PixelFormat.PIXEL_FORMAT_R8_UNORM,
    consts.Tr2GpuUsage.RENDER_TARGET | consts.Tr2GpuUsage.SHADER_RESOURCE).Get();
}

/** A registry component with the bookkeeping EveEntity gives a real one. */
function component(methods)
{
  const state = new Map();

  return {
    GetComponentIndex: bit => state.get(bit),
    SetComponentState: (bit, index) => state.set(bit, index),
    RemoveComponentState: bit => state.delete(bit),
    ...methods
  };
}

/** A space scene with an identity camera (near 1, far 100000) on a stub context. */
function shadowScene()
{
  const context = stubShadowContext();
  const pool = new core.Tr2GpuResourcePool().SetRenderContext(context);
  const scene = new trinity.EveSpaceScene();
  const projection = new trinity.TriProjection();
  const view = mat4.create();
  const frustum = new trinity.TriFrustum();

  core.Tr2Renderer.prepareDeviceResources(context);
  projection.PerspectiveFov(Math.PI / 4, 1, 1, 100000);
  Tr2Renderer.SetProjectionTransform(projection.GetTransform());
  Tr2Renderer.SetViewTransform(view);
  context.SetTriPoolAllocator({ Allocate: () => ({}), Clear() {} });
  frustum.DeriveFrustum(view, vec3.create(), projection.GetTransform(), { x: 0, y: 0, width: 256, height: 256 });
  scene.StampFrameContext({ frustum });

  return { context, pool, scene };
}

/** The bracket depths a pass must leave as it found them. */
function stackSizes(context)
{
  return {
    rt: context.GetStackSizeRT(0),
    ds: context.GetStackSizeDS(),
    viewport: context.GetEffectStateManager().GetStackSizeViewport()
  };
}

/** A rotating, non-uniformly scaling, translating matrix: no composition order hides behind it. */
function asymmetricMatrix()
{
  const rotation = [ 0.1825742, 0.3651484, 0.5477226, 0.7302967 ];

  return mat4.fromRotationTranslationScale(mat4.create(), rotation, [ 3, -7, 11 ], [ 2, 0.5, 1.5 ]);
}

/** Casters recording each call, and the viewport at each ask; `size` is what IsCastingShadow writes, or undefined to write nothing. */
function recordingCasters(scene, esm, calls, specs)
{
  for (const spec of specs)
  {
    scene.componentRegistry.RegisterComponent("ShadowCaster", component({
      IsCastingShadow__ShadowFrustum: (camera, shadowFrustum, reason, sizeInShadow) =>
      {
        calls.push({ call: "IsCastingShadow", id: spec.id, camera, shadowFrustum, reason, viewport: { ...esm.GetViewport() } });
        if (spec.size === undefined) return false;
        sizeInShadow[0] = spec.size;
        return true;
      },
      GetShadowPerObjectData: batches =>
      {
        calls.push({ call: "GetShadowPerObjectData", id: spec.id, batches });
        return { id: spec.id };
      },
      GetShadowBatches: (batches, perObjectData, size) =>
      {
        calls.push({ call: "GetShadowBatches", id: spec.id, batches, perObjectData, size });
        batches.GetBatchCount = () => 1;
      }
    }));
  }
}

test("RenderIntoCloudShadowMap gathers into the first shadow accumulator and draws it with Shadow (EveSpaceScene.cpp:2387-2446)", () =>
{
  const { context, scene } = shadowScene();
  const esm = context.GetEffectStateManager();
  const camera = scene.updateContext.GetFrustum();
  const batches = scene._shadowBatches[0];
  const calls = [];
  const instanced = [];
  const drawn = [];

  // A at 12 and C at 3 write their sizes; B returns before writing, so
  // Carbon's one shared sizeInShadow hands it A's 12 (cpp:2405-2414).
  recordingCasters(scene, esm, calls, [ { id: "A", size: 12 }, { id: "B" }, { id: "C", size: 3 } ]);

  scene.instancedMeshManager.GetShadowBatches = (...args) => { instanced.push(args); return 0; };
  context.RenderBatches = (drawnBatches, technique) =>
  {
    drawn.push({ batches: drawnBatches, technique, inverted: esm.IsDepthTestInverted() });
    return true;
  };

  const shadowFrustum = new TriFrustumOrtho();

  shadowFrustum.DeriveFrustum(mat4.create(), vec3.fromValues(-10, -10, -10), vec3.fromValues(10, 10, 10));

  const info = {
    shadowFrustum,
    lightViewProj: asymmetricMatrix(),
    aabbMax: vec3.fromValues(0, 0, -500),
    shadowMapSize: 256
  };

  // What the cloud's PrepareCloudShadowMap pushes (EveChildCloud2.cpp:774-808).
  const before = stackSizes(context);

  esm.SetInvertedDepthTest(true);
  esm.PushViewport();
  esm.PushRenderTarget__Current();
  esm.PushDepthStencilBuffer__Current();

  scene.RenderIntoCloudShadowMap(context, info, scene.componentRegistry.GetComponents("ShadowCaster"));

  // Each caster is asked, then gathered when over the threshold, in turn.
  assert.deepEqual(calls.map(entry => `${entry.call}:${entry.id}`), [
    "IsCastingShadow:A", "GetShadowPerObjectData:A", "GetShadowBatches:A",
    "IsCastingShadow:B", "GetShadowPerObjectData:B", "GetShadowBatches:B",
    "IsCastingShadow:C"
  ]);
  assert.deepEqual(calls.filter(entry => entry.call === "GetShadowBatches").map(entry => entry.size), [ 12, 12 ]);
  for (const entry of calls.filter(entry => entry.call !== "IsCastingShadow")) assert.equal(entry.batches, batches);

  // The casters' camera is a fresh frustum whose far plane sits at the cloud
  // distance, 500 from the eye at the origin (cpp:2391-2400).
  const asked = calls.filter(entry => entry.call === "IsCastingShadow");
  const casterCamera = asked[0].camera;
  const back = casterCamera.planes[trinity.TriFrustum.PLANE_BACK];

  assert.notEqual(casterCamera, camera);
  assert.ok(Math.abs(vec4.dot(back, [ 0, 0, -500, 1 ])) < 1, `far plane through z = -500: ${Array.from(back)}`);
  assert.ok(Math.abs(vec4.dot(back, [ 0, 0, -100000, 1 ])) > 1000, "not the update context's far plane");

  // The ortho shadow frustum copies the cloud's, its size and the sun.
  const casterShadowFrustum = asked[0].shadowFrustum;

  assert.equal(casterShadowFrustum.shadowMapSize, 256);
  assert.notEqual(casterShadowFrustum.shadow, shadowFrustum);
  assertArrayNear(casterShadowFrustum.sunDir, scene.sunDirection, "sunDir");
  for (const entry of asked) assert.equal(entry.reason, Tr2RenderReason.TR2RENDERREASON_NORMAL);

  // The instanced meshes take the update context's frustum, the same shadow
  // frustum, and the first accumulator as the opaque batches (cpp:2416).
  assert.equal(instanced.length, 1);
  assert.equal(instanced[0].length, 4, "Carbon's default render reason");
  assert.equal(instanced[0][0], camera);
  assert.equal(instanced[0][1], casterShadowFrustum);
  assert.equal(instanced[0][2], scene.updateContext.GetInvLodFactor());
  assert.equal(instanced[0][3].length, 1);
  assert.equal(instanced[0][3][0][0], TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.equal(instanced[0][3][0][1], batches);

  // Transpose( lightViewProj ) (cpp:2421).
  const expected = mat4.transpose(mat4.create(), info.lightViewProj);

  assertArrayNear(Array.from(scene._shadowPerFrameVS.Get("ViewProjectionMat")), Array.from(expected), "ViewProjectionMat");

  // Drawn forward-depth with Shadow, the reversed test restored after (cpp:2431-2437).
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0].batches, batches);
  assert.equal(drawn[0].technique, "Shadow");
  assert.equal(drawn[0].inverted, false);
  assert.equal(esm.IsDepthTestInverted(), true);

  // The three pushes are popped (cpp:2443-2445).
  assert.deepEqual(stackSizes(context), before);
});

test("RenderIntoCloudShadowMap draws nothing when no caster passes the threshold", () =>
{
  const { context, scene } = shadowScene();
  const esm = context.GetEffectStateManager();
  const calls = [];
  let drawn = 0;

  recordingCasters(scene, esm, calls, [ { id: "A", size: 5 } ]);
  scene.instancedMeshManager.GetShadowBatches = () => 0;
  context.RenderBatches = () => { drawn++; return true; };

  const before = stackSizes(context);

  esm.PushViewport();
  esm.PushRenderTarget__Current();
  esm.PushDepthStencilBuffer__Current();

  scene.RenderIntoCloudShadowMap(context, {
    shadowFrustum: new TriFrustumOrtho(),
    lightViewProj: mat4.create(),
    aabbMax: vec3.fromValues(0, 0, -500),
    shadowMapSize: 128
  }, scene.componentRegistry.GetComponents("ShadowCaster"));

  // 5 is not over the threshold of 5 (cpp:2410).
  assert.deepEqual(calls.map(entry => entry.call), [ "IsCastingShadow" ]);
  assert.equal(drawn, 0);
  assert.deepEqual(stackSizes(context), before);
});

test("RenderVolumetricShadowMap renders into each cloud that prepares its map, then publishes it (cpp:2369-2385)", () =>
{
  const { context, scene } = shadowScene();
  const esm = context.GetEffectStateManager();
  const sequence = [];
  const infos = [];
  const rendered = [];

  scene.componentRegistry.RegisterComponent("ShadowCaster", component({
    IsCastingShadow__ShadowFrustum: () => false,
    GetShadowPerObjectData: () => null,
    GetShadowBatches() {}
  }));

  for (const [ id, prepares ] of [ [ 1, false ], [ 2, true ] ])
  {
    // A real ITr2VolumetricRenderable; the registry casts nominally. The three
    // methods the pass calls are overridden on the instance to record them.
    const cloud = new trinity.EveChildCloud2();
    Object.assign(cloud, {
      GetVolumetricShadowInfo: (shadowInfo, sunDir) =>
      {
        sequence.push(`info:${id}`);
        infos.push({ keys: Object.keys(shadowInfo).sort(), shadowInfo, sunDir: Array.from(sunDir) });
        // As EveChildCloud2.SetupShadowFrustum, which assigns all four.
        shadowInfo.shadowFrustum = new TriFrustumOrtho();
        shadowInfo.lightViewProj = mat4.create();
        shadowInfo.aabbMax = vec3.create();
        shadowInfo.shadowMapSize = 64 * id;
      },
      PrepareCloudShadowMap: renderContext =>
      {
        sequence.push(`prepare:${id}`);
        assert.equal(renderContext, context);
        if (!prepares) return false;
        esm.PushViewport();
        esm.PushRenderTarget__Current();
        esm.PushDepthStencilBuffer__Current();
        return true;
      },
      SetCloudShadowMapHandle: () => sequence.push(`handle:${id}`)
    });
    scene.componentRegistry.RegisterComponent("VolumetricRenderable", cloud);
  }

  scene.RenderIntoCloudShadowMap = (renderContext, shadowInfo, shadowCasters) =>
  {
    sequence.push(`render:${shadowInfo.shadowMapSize / 64}`);
    rendered.push({ renderContext, shadowInfo, shadowCasters });
    esm.PopRenderTarget();
    esm.PopDepthStencilBuffer();
    esm.PopViewport();
  };

  scene.RenderVolumetricShadowMap(context);

  assert.deepEqual(sequence, [ "info:1", "prepare:1", "info:2", "prepare:2", "render:2", "handle:2" ]);

  // ITr2VolumetricRenderable::ShadowInfo's four fields, and the scene's sun.
  for (const { keys, sunDir } of infos)
  {
    assert.deepEqual(keys, [ "aabbMax", "lightViewProj", "shadowFrustum", "shadowMapSize" ]);
    assertArrayNear(sunDir, scene.sunDirection, "sunDir");
  }
  assert.notEqual(infos[0].shadowInfo, infos[1].shadowInfo, "a fresh ShadowInfo per renderable");

  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].renderContext, context);
  assert.equal(rendered[0].shadowInfo, infos[1].shadowInfo);
  assert.equal(rendered[0].shadowCasters, scene.componentRegistry.GetComponents("ShadowCaster"));
});

/** A rotating light camera and an off-centre reversed-depth projection. */
function spotCamera()
{
  const lightPosition = vec3.fromValues(3, 4, 10);
  const view = mat4.lookAtCarbon(mat4.create(), lightPosition, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
  const projection = mat4.perspectiveZO(mat4.create(), Math.PI / 3, 1, 100, 0.1);

  // Off-centre terms, so a margin applied before the projection would differ.
  projection[8] = 0.2;
  projection[9] = -0.1;
  return { lightPosition, view, projection };
}

test("RenderShadowMapForSpotLight culls in its atlas cell and draws DynamicLightShadow (EveSpaceScene.cpp:2505-2572)", () =>
{
  const { context, pool, scene } = shadowScene();
  const esm = context.GetEffectStateManager();
  const camera = scene.updateContext.GetFrustum();
  const batches = scene._shadowBatches[0];
  const atlas = poolSurface(pool, "atlas", 256, 256);
  const { lightPosition, view, projection } = spotCamera();
  const calls = [];
  const instanced = [];
  const drawn = [];

  // A's 100 is capped at the 64 texel cell; B's 20 is not (cpp:2539).
  recordingCasters(scene, esm, calls, [ { id: "A", size: 100 }, { id: "B", size: 20 } ]);
  scene.instancedMeshManager.GetShadowBatches = (...args) => { instanced.push(args); return 0; };
  context.RenderBatches = (drawnBatches, technique) =>
  {
    drawn.push({ batches: drawnBatches, technique, inverted: esm.IsDepthTestInverted() });
    return true;
  };

  esm.SetInvertedDepthTest(true);
  esm.SetViewport({ x: 0, y: 0, width: 256, height: 256, minZ: 0, maxZ: 1 });

  const before = stackSizes(context);
  const viewportBefore = { ...esm.GetViewport() };

  scene.RenderShadowMapForSpotLight(context, scene.componentRegistry.GetComponents("ShadowCaster"), 64, 64, 128, lightPosition, view, projection, atlas);

  // Gathered in the light's cell, against the update context's frustum.
  const asked = calls.filter(entry => entry.call === "IsCastingShadow");

  assert.equal(asked.length, 2);
  for (const entry of asked)
  {
    assert.equal(entry.camera, camera);
    assert.equal(entry.reason, Tr2RenderReason.TR2RENDERREASON_NORMAL);
    assert.deepEqual([ entry.viewport.x, entry.viewport.y, entry.viewport.width, entry.viewport.height ], [ 64, 128, 64, 64 ]);
  }
  assert.deepEqual(calls.filter(entry => entry.call === "GetShadowBatches").map(entry => entry.size), [ 64, 20 ]);

  // The shadow frustum is derived from the light camera and the cell viewport (cpp:2527-2528).
  const shadow = asked[0].shadowFrustum.shadow;

  assertArrayNear(shadow.viewPos, lightPosition, "viewPos");
  assert.ok(Math.abs(shadow.halfWidthProjection - projection[0] * 64 * 0.5) < 1e-4, "halfWidthProjection from the cell");

  // The instanced meshes see the same frustum (cpp:2543).
  assert.equal(instanced.length, 1);
  assert.equal(instanced[0].length, 4);
  assert.equal(instanced[0][0], camera);
  assert.equal(instanced[0][2], scene.updateContext.GetInvLodFactor());
  assert.equal(instanced[0][3][0][0], TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.equal(instanced[0][3][0][1], batches);
  for (let i = 0; i < 6; i++)
  {
    assertArrayNear(instanced[0][1].shadow.planes[i], shadow.planes[i], `instanced plane ${i}`);
  }

  // view * projection * marginMatrix, applied in that order to a world point,
  // with a 1 - 16 / 64 margin (cpp:2522-2525); stored transposed (cpp:2548).
  const logical = mat4.transpose(mat4.create(), scene._shadowPerFrameVS.Get("ViewProjectionMat"));
  const point = vec4.fromValues(1, -2, 3, 1);
  const stepwise = vec4.transformMat4(vec4.create(), point, view);

  vec4.transformMat4(stepwise, stepwise, projection);
  vec4.transformMat4(stepwise, stepwise, mat4.fromScaling(mat4.create(), [ 0.75, 0.75, 1 ]));
  assertArrayNear(Array.from(vec4.transformMat4(vec4.create(), point, logical)), Array.from(stepwise), "viewProj", 1e-4);

  // Already reversed, the test stays reversed for the draw.
  assert.equal(drawn.length, 1);
  assert.equal(drawn[0].batches, batches);
  assert.equal(drawn[0].technique, "DynamicLightShadow");
  assert.equal(drawn[0].inverted, true);
  assert.equal(esm.IsDepthTestInverted(), true);

  // Only the viewport was pushed, and it is restored.
  assert.deepEqual(stackSizes(context), before);
  assert.deepEqual({ ...esm.GetViewport() }, viewportBefore);
});

test("RenderShadowMapForSpotLight's inverted-depth guard ends before the draw (cpp:2560-2564, Carbon quirk)", () =>
{
  const { context, pool, scene } = shadowScene();
  const esm = context.GetEffectStateManager();
  const { lightPosition, view, projection } = spotCamera();
  const drawn = [];

  recordingCasters(scene, esm, [], [ { id: "A", size: 30 } ]);
  scene.instancedMeshManager.GetShadowBatches = () => 0;
  context.RenderBatches = () => { drawn.push(esm.IsDepthTestInverted()); return true; };

  esm.SetInvertedDepthTest(false);
  scene.RenderShadowMapForSpotLight(context, scene.componentRegistry.GetComponents("ShadowCaster"), 64, 0, 0, lightPosition, view, projection, poolSurface(pool, "atlas", 256, 256));

  // The ON_BLOCK_EXIT restore runs at the inner block's end, so the draw
  // sees the test as it was found.
  assert.deepEqual(drawn, [ false ]);
  assert.equal(esm.IsDepthTestInverted(), false);
});

/** Runs `body` with a light manager whose cells are fixed, restoring the real instance. */
function withLightManager(cell, body)
{
  const previous = Tr2LightManager._instance;

  Tr2LightManager._instance = {
    GetUnpackedShadowMapData: (record, out = {}) =>
    {
      out.shadowMapScale = cell.scale;
      out.shadowMapOffsetX = cell.x;
      out.shadowMapOffsetY = cell.y;
      return out;
    }
  };

  try
  {
    body();
  }
  finally
  {
    Tr2LightManager._instance = previous;
  }
}

/** Replaces the scene's spot pass with a recorder of copies of its arguments. */
function recordSpotPasses(scene)
{
  const passes = [];

  scene.RenderShadowMapForSpotLight = (renderContext, shadowCasters, scale, x, y, position, view, projection, shadowMap) =>
  {
    passes.push({ renderContext, shadowCasters, scale, x, y, position: Array.from(position), view: mat4.clone(view), projection: mat4.clone(projection), shadowMap });
  };
  return passes;
}

test("RenderShadowMapForLight draws a point light as six cube faces in a 3x2 block of cells (cpp:2578-2603)", () =>
{
  const { context, scene } = shadowScene();
  const passes = recordSpotPasses(scene);
  const casters = [];
  const atlas = { id: "atlas" };
  const light = { position: vec3.fromValues(1, 2, 3), direction: vec3.fromValues(0, 0, -1), radius: 50, innerAngle: 0, projectionPlaneDistance: 0 };

  withLightManager({ scale: 32, x: 64, y: 96 }, () => scene.RenderShadowMapForLight(context, casters, light, atlas));

  assert.deepEqual(passes.map(pass => [ pass.scale, pass.x, pass.y ]), [
    [ 32, 64, 96 ], [ 32, 96, 96 ], [ 32, 128, 96 ],
    [ 32, 64, 128 ], [ 32, 96, 128 ], [ 32, 128, 128 ]
  ]);

  // 90 degrees, aspect 1, near the radius and far a thousandth of it.
  const zn = 50;
  const zf = 0.05;

  for (const pass of passes)
  {
    assert.equal(pass.renderContext, context);
    assert.equal(pass.shadowCasters, casters);
    assert.equal(pass.shadowMap, atlas);
    assertArrayNear(pass.position, [ 1, 2, 3 ], "position");
    assertArrayNear([ pass.projection[0], pass.projection[5], pass.projection[10], pass.projection[11], pass.projection[14], pass.projection[15] ],
      [ 1, 1, zf / (zn - zf), -1, (zf * zn) / (zn - zf), 0 ], "projection", 1e-5);
  }

  // Each face looks from the light toward position - direction.
  const directions = [ [ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 1 ], [ -1, 0, 0 ], [ 0, -1, 0 ], [ 0, 0, -1 ] ];

  passes.forEach((pass, face) =>
  {
    const target = vec3.subtract(vec3.create(), light.position, directions[face]);

    assertArrayNear(Array.from(vec3.transformMat4(vec3.create(), light.position, pass.view)), [ 0, 0, 0 ], `face ${face} eye`);
    assertArrayNear(Array.from(vec3.transformMat4(vec3.create(), target, pass.view)), [ 0, 0, -1 ], `face ${face} target`);
  });
});

test("RenderShadowMapForLight draws a spot light once with GetLightMatrices' camera (cpp:2604-2617, 4175-4193)", () =>
{
  const { context, scene } = shadowScene();
  const passes = recordSpotPasses(scene);
  const atlas = { id: "atlas" };

  for (const [ direction, up ] of [ [ [ 0, 0, -1 ], [ 0, 1, 0 ] ], [ [ 0, 1, 0 ], [ 1, 0, 0 ] ] ])
  {
    const light = { position: vec3.fromValues(5, -6, 7), direction: vec3.fromValues(...direction), radius: 100, innerAngle: 0.5, projectionPlaneDistance: 2 };

    passes.length = 0;
    withLightManager({ scale: 16, x: 32, y: 48 }, () => scene.RenderShadowMapForLight(context, [], light, atlas));

    assert.equal(passes.length, 1);
    assert.deepEqual([ passes[0].scale, passes[0].x, passes[0].y ], [ 16, 32, 48 ]);
    assertArrayNear(Array.from(passes[0].projection), [
      2, 0, 0, 0,
      0, 2, 0, 0,
      0, 0, 0.1 / (100 - 0.1), -1,
      0, 0, (0.1 * 100) / (100 - 0.1), 0
    ], "projection");

    const expectedView = mat4.lookAtCarbon(mat4.create(), light.position, vec3.subtract(vec3.create(), light.position, light.direction), up);

    assertArrayNear(Array.from(passes[0].view), Array.from(expectedView), `view, up ${up}`);
  }

  // GetLightMatrices fills the record it is given and returns it.
  const out = { projection: mat4.create(), view: mat4.create() };
  const light = { position: vec3.fromValues(0, 0, 0), direction: vec3.fromValues(0, 0, -1), radius: 10, innerAngle: 1, projectionPlaneDistance: 3 };

  assert.equal(scene.GetLightMatrices(light, out), out);
  assert.equal(out.projection[0], 3);
});

test("PrepareShadowMapForLights and FinishRenderingShadowMapForLights bracket the atlas (cpp:2490-2503, 2620-2627)", () =>
{
  const { context, pool, scene } = shadowScene();
  const atlas = poolSurface(pool, "atlas", 256, 256);
  const clears = [];
  const readOnly = [];
  let applied = 0;

  const clear = context.Clear.bind(context);
  const setReadOnlyDepth = context.SetReadOnlyDepth.bind(context);

  context.Clear = options => { clears.push(options); return clear(options); };
  context.SetReadOnlyDepth = enable => { readOnly.push(enable); return setReadOnlyDepth(enable); };
  scene.ApplyPerFrameData = renderContext => { assert.equal(renderContext, context); applied++; };

  const before = stackSizes(context);

  assert.equal(scene.PrepareShadowMapForLights(context, atlas), true);
  assert.deepEqual(stackSizes(context), { ...before, rt: before.rt + 1, ds: before.ds + 1 });
  assert.equal(context.GetRenderContextAL().GetRenderTarget(0), null, "no colour target");
  assert.notEqual(context.GetRenderContextAL().GetDepthStencil(), null, "the atlas is the depth-stencil");
  // CLEARFLAGS_ZBUFFER to 0, the reversed-depth far value.
  assert.deepEqual(clears, [ { clearDepth: true, color: 0, depth: 0, stencil: 0 } ]);

  scene.FinishRenderingShadowMapForLights(context);

  assert.deepEqual(stackSizes(context), before);
  assert.deepEqual(readOnly, [ false, true ]);
  assert.equal(applied, 1);
});
