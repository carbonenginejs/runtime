// The frame driver. Carbon's EveSpaceScene::Render is an empty function body and
// TriStepRenderScene calls it anyway, so that path draws nothing in Carbon
// either; EveSpaceSceneRenderDriver is the class that actually drives a frame.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveSpaceSceneRenderDriver,
  Tr2ShLightingManager,
  Tr2PostProcess2,
  Tr2RenderContext,
  Tr2SSAO,
  TriProjection,
  TriView
} from "../../npm/dist/trinity/index.js";
import { RenderingMode, TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { StubContext, StubTarget } from "../support/stubContext.js";

/**
 * A stub-backed context whose backend calls are recorded in order.
 *
 * These assertions used to read the intent queue. The queue is gone, so they
 * read what the backend was actually asked to do - the same claims, one layer
 * closer to the truth.
 */
function recordingContext()
{
  const context = StubContext();
  const al = context.GetRenderContextAL();
  const calls = [];
  const clear = al.Clear.bind(al);

  al.Clear = (options) => { calls.push({ type: "clear" }); return clear(options); };

  // The walk is Trinity's (Carbon declares RenderBatches on Tr2RenderContext,
  // not on the AL), so the submission is recorded where it happens: the
  // context's own walk, which these stand-in accumulators need not satisfy.
  context.RenderBatchesInOrder = (batches) =>
  {
    calls.push({ type: "render-batches", batches });
    return 0;
  };

  return { context, calls };
}

const OPAQUE = TriBatchType.TRIBATCHTYPE_OPAQUE;
const DECAL = TriBatchType.TRIBATCHTYPE_DECAL;

/** Records the order the driver calls the scene's CPU steps in. */
function sceneRecording(calls)
{
  return {
    calls,
    Update(realTime, simTime) { calls.push([ "Update", realTime, simTime ]); },
    BlendLightingOverrides() { calls.push([ "BlendLightingOverrides" ]); },
    UpdateFogSettings() { calls.push([ "UpdateFogSettings" ]); },
    UpdateVisibility() { calls.push([ "UpdateVisibility" ]); },
    GetRenderables(out) { calls.push([ "GetRenderables" ]); return out; },
    PopulatePerFramePSData() { calls.push([ "PopulatePerFramePSData" ]); },
    PopulatePerFrameVSData() { calls.push([ "PopulatePerFrameVSData" ]); },
    ApplyPerFrameData() { calls.push([ "ApplyPerFrameData" ]); },
    RenderBackgroundPass() { calls.push([ "RenderBackgroundPass" ]); return false; },
    StampFrameContext(values) { calls.push([ "StampFrameContext", values ]); },
    // BeginRender's jitter and EndRender's last-frame store (cpp:1329, 2866-2868),
    // with the matrices the driver hands in and out around them.
    Jitter() { calls.push([ "Jitter" ]); },
    EndRender() { calls.push([ "EndRender" ]); },
    RunLensflareOcclusionQueries() { calls.push([ "RunLensflareOcclusionQueries" ]); },
    RenderDepthPass(depthMap, normalMap, customStencil, renderContext, techniqueName) { calls.push([ "RenderDepthPass", normalMap, techniqueName ]); },
    RenderShadows() { calls.push([ "RenderShadows" ]); return null; },
    UpdateVariableStore() { calls.push([ "UpdateVariableStore" ]); },
    // EveSpaceScene.h:522-525; no GPU particle system in these frames.
    GetGpuParticleSystem() { return null; },
    viewLast: new Float32Array(16),
    projectionLast: new Float32Array(16),
    jitteredProjection: Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),
    postprocess: null,
    // EveSpaceScene's m_updateContext; the driver stamps its render context.
    updateContext: { renderContext: null },
    // No post-process effects: the chain runs copy, sharpening and tonemapping.
    GetPostProcess() { return null; }
  };
}

/** A batch manager whose map hands back a distinct accumulator per type. */
function batchManager(calls)
{
  // Real enough for Trinity's own walk to run over them and draw nothing.
  const accumulators = new Map([
    [ OPAQUE, { id: "opaque", GetBatches: () => [] } ],
    [ DECAL, { id: "decal", GetBatches: () => [] } ]
  ]);

  return {
    Collect(renderables, reason, renderContext)
    {
      calls.push([ "Collect", renderables, renderContext ]);
    },
    GetBatchMap()
    {
      return { GetAccumulator: type => accumulators.get(type) ?? null };
    }
  };
}

function driverOver(calls, { enableRendering = true } = {})
{
  const driver = new EveSpaceSceneRenderDriver();

  driver.scene = sceneRecording(calls);
  // Carbon's holders (SetCameraToRenderer, cpp:384-391), not stand-ins: the
  // driver reads their transforms.
  driver.view = new TriView();
  driver.projection = new TriProjection();
  driver.enableRendering = enableRendering;
  driver.SetBatchManager(batchManager(calls));

  return driver;
}

test("a driver with no scene, or no camera and no view, does not draw", () =>
{
  // Carbon returns rather than failing: a driver with nothing to draw is a
  // legitimate frame (EveSpaceSceneRenderDriver.cpp:406-425).
  const driver = new EveSpaceSceneRenderDriver();

  assert.equal(driver.Validate(), false);

  driver.scene = sceneRecording([]);
  assert.equal(driver.Validate(), false, "a scene alone is not enough");

  driver.view = {};
  driver.projection = {};
  assert.equal(driver.Validate(), true);
});

test("the frame runs Carbon's order", () =>
{
  const calls = [];
  const driver = driverOver(calls);

  assert.equal(driver.Execute([ StubTarget() ], null, 1, 2, null, StubContext()), true);

  assert.deepEqual(calls.map(([ name ]) => name), [
    "StampFrameContext",
    "Update",
    // BeginRender jitters first (EveSpaceScene.cpp:1329), then blends lighting (:1360).
    "Jitter",
    "BlendLightingOverrides",
    "UpdateFogSettings",
    "UpdateVisibility",
    "GetRenderables",
    "Collect",
    // After the gather: the scene's global textures (cpp:1390-1397).
    "UpdateVariableStore",
    // AFTER the gather: the blended sun colour is only current once lights have
    // been gathered (EveSpaceScene.cpp:1396-1426).
    "PopulatePerFramePSData",
    "PopulatePerFrameVSData",
    // EveSpaceScene::ApplyPerFrameData (cpp:818-828): the scene binds its own
    // blocks, the vertex one for compute too.
    "ApplyPerFrameData",
    // The background pass (driver cpp:502-511): the nebula, before the depth pass.
    "RenderBackgroundPass",
    // The depth pass (driver cpp:514-521), before SSAO and the main pass.
    "RenderDepthPass",
    // The shadows, after the depth pass and before SSAO (driver cpp:529-532).
    "RenderShadows",
    // After the main pass, on the scene target with read-only depth: lens-flare
    // occlusion and the occlusion buffer's compute (driver cpp:587-592).
    "RunLensflareOcclusionQueries",
    // Then the last-frame store (cpp:2866-2868, driver :597-598).
    "EndRender"
  ]);
});

test("a GPU particle system updates after the scene and renders in the main pass", () =>
{
  // UpdateGpuParticleSystem (EveSpaceSceneRenderDriver.cpp:634-642), called
  // after the scene update (:479-481); the render after the transparent and
  // distortion batches (EveSpaceScene.cpp:2766-2771). The order test above,
  // with no system, is the negative control: neither call appears there.
  const calls = [];
  const driver = driverOver(calls);
  const ps = {
    Update(time, originShift) { calls.push([ "ParticlesUpdate", time, originShift ]); },
    Render() { calls.push([ "ParticlesRender" ]); }
  };
  driver.scene.GetGpuParticleSystem = () => ps;
  driver.scene.PopulateAndApplyPerFrameData = () => calls.push([ "PopulateAndApplyPerFrameData" ]);
  driver.scene.updateTime = 2;
  driver.scene.updateContext.GetOriginShift = () => "shift";

  assert.equal(driver.Execute([ StubTarget() ], null, 1, 2, null, StubContext()), true);

  const names = calls.map(([ name ]) => name);
  const update = names.indexOf("Update");
  assert.deepEqual(names.slice(update, update + 3), [ "Update", "PopulateAndApplyPerFrameData", "ParticlesUpdate" ]);
  assert.deepEqual(calls[update + 2], [ "ParticlesUpdate", 2, "shift" ], "the scene's update time and origin shift");
  assert.equal(names.filter(name => name === "ParticlesRender").length, 1);
  assert.ok(names.indexOf("ParticlesRender") < names.indexOf("EndRender"), "within the frame, before EndRender");
});

test("the camera reaches the renderer before the scene updates", () =>
{
  // Carbon's order (cpp:476 -> 479), so the scene's own update reads this
  // frame's view rather than the previous one's.
  const calls = [];

  driverOver(calls).Execute(null, null, 0, 0, null, StubContext());

  assert.ok(
    calls.findIndex(([ name ]) => name === "StampFrameContext")
      < calls.findIndex(([ name ]) => name === "Update")
  );
});

test("opaque and decal are submitted, in that order", () =>
{
  const { context, calls } = recordingContext();

  driverOver([]).Execute(null, null, 0, 0, null, context);

  const submissions = calls.filter(call => call.type === "render-batches");

  assert.deepEqual(submissions.map(call => call.batches.id), [ "opaque", "decal" ]);
});

test("transparent then additive follow the opaque family, under RM_ALPHA and RM_ALPHA_ADDITIVE with read-only depth (EveSpaceScene.cpp:1156-1178)", () =>
{
  const { context, calls } = recordingContext();
  const driver = driverOver([]);
  const accumulators = new Map([
    [ OPAQUE, { id: "opaque", GetBatches: () => [] } ],
    [ DECAL, { id: "decal", GetBatches: () => [] } ],
    [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, { id: "transparent", GetBatches: () => [] } ],
    [ TriBatchType.TRIBATCHTYPE_ADDITIVE, { id: "additive", GetBatches: () => [] } ]
  ]);
  driver.SetBatchManager({ Collect() {}, GetBatchMap: () => ({ GetAccumulator: type => accumulators.get(type) ?? null }) });

  const esm = context.GetEffectStateManager();
  const apply = esm.ApplyStandardStates.bind(esm);
  esm.ApplyStandardStates = mode => { calls.push({ type: "states", mode }); return apply(mode); };
  const readOnly = context.SetReadOnlyDepth.bind(context);
  context.SetReadOnlyDepth = enable => { calls.push({ type: "readOnly", enable }); return readOnly(enable); };

  driver.Execute(null, null, 0, 0, null, context);

  const trace = calls.map(call =>
    call.type === "render-batches" ? call.batches.id
      : call.type === "states" ? `states:${call.mode}`
        : call.type === "readOnly" ? `readOnly:${call.enable}` : null).filter(Boolean);
  const afterDecal = trace.slice(trace.indexOf("decal") + 1);

  assert.deepEqual(afterDecal.slice(0, 6), [
    "readOnly:true",
    `states:${RenderingMode.RM_ALPHA}`,
    "transparent",
    `states:${RenderingMode.RM_ALPHA_ADDITIVE}`,
    "additive",
    "readOnly:false"
  ]);
});

test("the target and a clear are recorded before anything is submitted", () =>
{
  const { context, calls } = recordingContext();
  const target = StubTarget();

  driverOver([]).Execute([ target ], null, 0, 0, null, context);

  const types = calls.map(call => call.type);

  assert.ok(types.indexOf("clear") < types.indexOf("render-batches"));
});

test("rendering disabled still updates the scene", () =>
{
  // Not a no-op in Carbon either (cpp:408-419): simulation keeps running while
  // nothing is drawn, so a paused view does not freeze the world.
  const calls = [];
  const { context, calls: backend } = recordingContext();

  assert.equal(
    driverOver(calls, { enableRendering: false }).Execute(null, null, 0, 0, null, context),
    false
  );

  assert.ok(calls.some(([ name ]) => name === "Update"), "the scene still updated");
  assert.equal(calls.some(([ name ]) => name === "Collect"), false, "but nothing gathered");
  assert.equal(backend.filter(call => call.type === "render-batches").length, 0);
});

test("no batch manager means nothing is submitted, not a throw", () =>
{
  const { context, calls } = recordingContext();
  const driver = driverOver([]);

  driver.SetBatchManager(null);

  assert.equal(driver.Execute(null, null, 0, 0, null, context), false);
  assert.equal(calls.filter(call => call.type === "render-batches").length, 0);
});

test("the collect sees the render context it will be submitted through", () =>
{
  const calls = [];
  const context = StubContext();

  driverOver(calls).Execute(null, null, 0, 0, null, context);

  const [ , , passed ] = calls.find(([ name ]) => name === "Collect");

  assert.equal(passed, context);
});

test("with a destination, the scene renders off-screen and the post process draws it in", () =>
{
  // Carbon renders into customBackBuffer and depthBuffer (cpp:461, 471), then
  // binds the destination and runs the post process into it (cpp:602-609).
  const context = StubContext();
  const target = StubTarget();
  const driver = driverOver([]);
  const before = context.GetRenderTarget(0);

  driver.Execute([ target ], null, 0, 0, null, context);

  const tonemapping = driver.postProcess.tonemappingEffect;
  assert.equal(tonemapping.GetOption("TONE_MAPPING_METHOD"), "TONE_MAPPING_DISABLED", "the tonemapper ran");

  // Carbon pushes RT0, RT1 and the depth stencil for the frame and pops them
  // on every exit (cpp:450-457): the caller's binding comes back, not the
  // destination the post process drew into.
  assert.equal(context.GetRenderTarget(0), before, "the caller's target is restored when the frame ends");
});

test("the frame is reverse-Z: depth clears to 0 under an inverted depth test, restored after", () =>
{
  const driver = driverOver([]);
  const context = StubContext();
  const al = context.GetRenderContextAL();
  const esm = context.GetEffectStateManager();
  const clears = [];
  const clear = al.Clear.bind(al);

  al.Clear = options =>
  {
    clears.push({ depth: options?.depth, inverted: esm.IsDepthTestInverted() });
    return clear(options);
  };

  driver.Execute([ StubTarget() ], null, 1, 2, null, context);

  // Carbon: SetInvertedDepthTest( true ) for the frame (cpp:446-447) and the
  // scene target cleared to depth 0 (cpp:474).
  assert.deepEqual(clears[0], { depth: 0, inverted: true });
  assert.equal(esm.IsDepthTestInverted(), false, "restored on exit");
});

test("rendering disabled updates the scene and borrows, binds and clears nothing", () =>
{
  const calls = [];
  const driver = driverOver(calls, { enableRendering: false });
  const context = StubContext();
  const al = context.GetRenderContextAL();
  let cleared = 0;
  const clear = al.Clear.bind(al);

  al.Clear = options => { cleared++; return clear(options); };

  assert.equal(driver.Execute([ StubTarget() ], null, 1, 2, null, context), false);

  // Carbon's disabled branch (cpp:408-419): camera to renderer, scene update.
  assert.deepEqual(calls.map(([ name ]) => name), [ "StampFrameContext", "Update" ]);
  assert.equal(cleared, 0);
});

/** Runs one off-screen frame at an anti-aliasing quality, recording what the post process received. */
function taaFrame(antiAliasingQuality)
{
  const calls = [];
  const driver = driverOver(calls);
  const received = [];

  driver.scene.postprocess = new Tr2PostProcess2();
  driver.antiAliasingQuality = antiAliasingQuality;

  const execute = driver.postProcess.Execute.bind(driver.postProcess);

  driver.postProcess.Execute = (...args) =>
  {
    received.push({ velocity: args[3]?.Get() ?? null, opaque: args[4]?.Get() ?? null });
    return execute(...args);
  };

  driver.Execute([ StubTarget() ], null, 0, 0, null, StubContext());

  return { driver, received };
}

test("ambient occlusion: the depth pass gets a normal map, and the SSAO filters it", () =>
{
  const calls = [];
  const driver = driverOver(calls);
  const filtered = [];

  driver.scene.display = true;
  driver.SSAO = new Tr2SSAO();
  // The filter's own work is Tr2SSAO's; here, only what the driver hands it.
  // An invalid answer is Carbon's failed filter: the empty SSAO goes in.
  driver.SSAO.Filter = (depth, normal, pool, renderContext, temporal) =>
  {
    filtered.push({ normal, temporal, enabled: driver.SSAO.enabled, quality: driver.SSAO.quality });
    return { IsValid: () => false };
  };

  // High (cpp:257-280): enabled at HIGHEST, full resolution, and a normal map
  // for the depth pass (GetNormalMapIfNeeded, cpp:672-685).
  driver.aoQuality = EveSpaceSceneRenderDriver.AmbientOcclusionQuality.High;
  driver.Execute([ StubTarget() ], null, 0, 0, null, StubContext());

  const [ , normalMap, techniqueName ] = calls.find(([ name ]) => name === "RenderDepthPass");

  assert.notEqual(normalMap, null);
  assert.equal(techniqueName, "Depth");
  assert.deepEqual(filtered, [ { normal: normalMap, temporal: false, enabled: true, quality: Tr2SSAO.SSAOQuality.HIGHEST } ]);

  // Low: LOW, downsampled.
  driver.aoQuality = EveSpaceSceneRenderDriver.AmbientOcclusionQuality.Low;
  driver.Execute([ StubTarget() ], null, 0, 0, null, StubContext());
  assert.equal(driver.SSAO.quality, Tr2SSAO.SSAOQuality.LOW);
  assert.equal(driver.SSAO.downsampled, true);

  // Disabled: the SSAO is switched off and the depth pass draws depth only.
  calls.length = 0;
  driver.aoQuality = EveSpaceSceneRenderDriver.AmbientOcclusionQuality.Disabled;
  driver.Execute([ StubTarget() ], null, 0, 0, null, StubContext());
  assert.equal(driver.SSAO.enabled, false);
  assert.equal(calls.find(([ name ]) => name === "RenderDepthPass")[1], null);
});

test("PropagateSettings puts TAA on the scene's default post process at the setting's quality", () =>
{
  // cpp:212-231: created when absent, its quality the AntiAliasingQuality value.
  const { driver } = taaFrame(3);
  const taa = driver.scene.postprocess.GetTaaIfAvailable();

  assert.notEqual(taa, null);
  assert.equal(taa.quality, 3);

  // Disabled removes it.
  driver.antiAliasingQuality = 0;
  driver.Execute([ StubTarget() ], null, 0, 0, null, StubContext());
  assert.equal(driver.scene.postprocess.GetTaaIfAvailable(), null);
});

test("anti-aliasing borrows the velocity map, and from Medium the opaque copy, for the post process", () =>
{
  // Off: neither (GetVelocityMapIfNeeded cpp:653-668, GetOpaqueColorMapIfNeeded cpp:702-719).
  assert.deepEqual(taaFrame(0).received, [ { velocity: null, opaque: null } ]);

  // Low: velocity only, R16G16_FLOAT.
  const [ low ] = taaFrame(1).received;
  assert.notEqual(low.velocity, null);
  assert.equal(low.opaque, null);

  // Medium and above: both.
  const [ high ] = taaFrame(3).received;
  assert.notEqual(high.velocity, null);
  assert.notEqual(high.opaque, null);
});

test("the last frame's camera is handed to the scene and back, around EndRender", () =>
{
  // cpp:431-432 in, 597-598 out: the driver owns viewLast/projectionLast.
  const calls = [];
  const driver = driverOver(calls);
  const stored = Float32Array.of(2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1);

  driver.scene.EndRender = () => driver.scene.viewLast.set(stored);
  driver.Execute(null, null, 0, 0, null, StubContext());
  assert.deepEqual(Array.from(driver._viewLast), Array.from(stored), "handed out after EndRender");

  driver.scene.viewLast.fill(0);
  driver.scene.EndRender = () => {};
  driver.Execute(null, null, 0, 0, null, StubContext());
  assert.deepEqual(Array.from(driver.scene.viewLast), Array.from(stored), "handed in at the next frame");
});

test("Jitter offsets the projection by Carbon's 4-sample pattern with TAA, and not without", async () =>
{
  const { EveSpaceScene } = await import("../../npm/dist/trinity/index.js");
  const scene = new EveSpaceScene();
  const context = StubContext();
  const esm = context.GetEffectStateManager();
  const identity = Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

  context.SetProjection(identity);
  esm.renderTargetWidth = 200;
  esm.renderTargetHeight = 100;

  // No TAA: identity jitter, the projection unchanged (cpp:1285-1290).
  scene.Jitter(context);
  assert.deepEqual(Array.from(scene.jitteredProjection), Array.from(identity));
  assert.equal(scene.jitter[0], 0);

  // TAA on the default post process: sample frame % 4, 2 * sample / size (cpp:1265-1283).
  scene.postprocess = new Tr2PostProcess2();
  scene.postprocess.SetTaa(new (await import("../../npm/dist/trinity/postProcess/index.js")).Tr2PPTaaEffect());
  scene.Jitter(context);

  const sample = [ [ 0.125, -0.375 ], [ -0.125, 0.375 ], [ 0.375, 0.125 ], [ -0.375, -0.125 ] ][context.GetRecordingFrameNumber() % 4];
  const [ jx, jy ] = [ Math.fround(2 * sample[0] / 200), Math.fround(2 * sample[1] / 100) ];

  assert.equal(scene.jitter[0], jx);
  assert.equal(scene.jitter[1], jy);
  // A clip-space translation applied after the projection: column-major [12], [13].
  assert.equal(scene.jitteredProjection[12], jx);
  assert.equal(scene.jitteredProjection[13], jy);

  // EndRender stores the UNJITTERED projection for next frame (cpp:2867-2868).
  context.SetViewTransform(identity);
  scene.EndRender(context);
  assert.deepEqual(Array.from(scene.projectionLast), Array.from(identity));
});

test("EndRender draws the lens flares additively with depth read-only, then stores the last frame (cpp:2839-2868)", async () =>
{
  const { EveSpaceScene } = await import("../../npm/dist/trinity/index.js");
  const scene = new EveSpaceScene();
  const context = StubContext();
  const calls = [];
  const identity = Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

  context.SetViewTransform(identity);
  context.SetTriPoolAllocator({ Allocate: () => ({}), Clear() {} });

  const readOnly = context.SetReadOnlyDepth.bind(context);
  context.SetReadOnlyDepth = enable => { calls.push(`readOnly:${enable}`); return readOnly(enable); };
  context.RenderBatches = batches => { calls.push(`render:${batches.constructor.name}`); return true; };
  const esm = context.GetEffectStateManager();
  const apply = esm.ApplyStandardStates.bind(esm);
  esm.ApplyStandardStates = mode => { calls.push(`states:${mode}`); return apply(mode); };

  const renderable = {
    GetPerObjectData: () => { calls.push("perObject"); return { id: "flare" }; },
    GetBatches: (_batches, batchType) => calls.push(`batches:${batchType}`)
  };
  scene.lensflares.push({ GetRenderables: (_frustum, visible) => { visible.push(renderable); return visible; } });

  scene.EndRender(context);

  assert.deepEqual(calls, [
    "readOnly:true",
    "perObject",
    `batches:${TriBatchType.TRIBATCHTYPE_ADDITIVE}`,
    `states:${RenderingMode.RM_ALPHA_ADDITIVE}`,
    "render:TriRenderBatchAccumulator",
    "readOnly:false"
  ]);

  // No flare, no draw; the last-frame store still runs.
  calls.length = 0;
  scene.lensflares.length = 0;
  scene.EndRender(context);
  assert.deepEqual(calls, []);
  assert.deepEqual(Array.from(scene.viewLast), Array.from(identity));
});

test("RenderDepthPass draws opaque, decal and depth with the depth technique (EveSpaceScene.cpp:2201-2326)", async () =>
{
  const { EveSpaceScene } = await import("../../npm/dist/trinity/index.js");
  const scene = new EveSpaceScene();
  const context = StubContext();
  const esm = context.GetEffectStateManager();
  const color = StubTarget();
  const depth = StubTarget();
  const normal = StubTarget();
  const calls = [];
  const batchMap = { GetAccumulator: type => ({ type }) };

  esm.SetRenderTarget(0, color);
  esm.SetDepthStencilBuffer(depth);

  context.RenderBatches = (accumulator, techniqueName) => { calls.push(`render:${accumulator.type}:${techniqueName}`); return true; };
  const apply = esm.ApplyStandardStates.bind(esm);
  esm.ApplyStandardStates = mode => { calls.push(`states:${mode}`); return apply(mode); };

  // With a normal map: it is slot 0 for the pass, drawn RM_OPAQUE.
  let boundDuringPass = null;
  const render = context.RenderBatches;
  context.RenderBatches = (...args) => { boundDuringPass ??= context.GetRenderTarget(0); return render(...args); };

  scene.RenderDepthPass(depth, normal, null, context, "Depth", batchMap);

  const opaque = RenderingMode.RM_OPAQUE;
  assert.deepEqual(calls, [
    `states:${opaque}`, `render:${TriBatchType.TRIBATCHTYPE_OPAQUE}:Depth`,
    `states:${opaque}`, `render:${TriBatchType.TRIBATCHTYPE_DECAL}:Depth`,
    `states:${opaque}`, `render:${TriBatchType.TRIBATCHTYPE_DEPTH}:Depth`
  ]);
  assert.equal(boundDuringPass, normal);
  assert.equal(context.GetRenderTarget(0), color, "the scene colour is back in slot 0");

  // Without one: depth only.
  calls.length = 0;
  scene.RenderDepthPass(depth, null, null, context, "Depth", batchMap);
  assert.equal(calls[0], `states:${RenderingMode.RM_DEPTH_ONLY}`);

  // Not displayed: nothing.
  calls.length = 0;
  scene.display = false;
  scene.RenderDepthPass(depth, normal, null, context, "Depth", batchMap);
  assert.deepEqual(calls, []);
});


test("SH directional/source refresh precedes textures, and receivers follow batch collection", () => {
  for(const mode of ["active","hidden","absent"]) {
    const calls=[],driver=driverOver(calls),scene=driver.scene;
    const manager=new Tr2ShLightingManager(),refresh=manager.UpdateWithDirectionalLight.bind(manager),sources=manager.UpdateSourceData.bind(manager);
    manager.UpdateWithDirectionalLight=(direction,color)=>{calls.push(["SHSun",Array.from(direction),Array.from(color)]);return refresh(direction,color);};
    manager.UpdateSourceData=()=>{calls.push(["SHSources"]);return sources();};
    scene.display=mode!=="hidden";scene.shLightingManager=mode==="absent"?null:manager;
    const object={},cameraParent={},flattened={},planet={};
    scene.objects=[object];scene.cameraAttachmentParent=cameraParent;scene.planets=[planet];scene.sunDirection=[0,-1,0];
    scene.GetRenderables=out=>{calls.push(["GetRenderables"]);out.push(flattened);return out;};
    scene.UpdateShLighting=objects=>calls.push(["SHReceivers",objects]);
    scene.dataTextureMgr={SetVariables(){calls.push(["DataTextures"]);}};
    driver.Execute(null,null,0,0,null,StubContext());
    const names=calls.map(([name])=>name);
    if(mode!=="active") {assert.ok(!names.includes("SHSun"));assert.ok(!names.includes("SHReceivers"));continue;}
    assert.deepEqual(calls.find(([name])=>name==="SHSun"),["SHSun",[0,-1,0],[1,1,1]]);
    assert.equal(names.filter(name=>name==="SHSources").length,1);
    assert.ok(names.indexOf("SHSun")<names.indexOf("SHSources"));
    assert.ok(names.indexOf("SHSources")<names.indexOf("DataTextures"));
    assert.ok(names.indexOf("Collect")<names.indexOf("SHReceivers"));
    assert.ok(names.indexOf("SHReceivers")<names.indexOf("UpdateVariableStore"));
    assert.deepEqual(calls.find(([name])=>name==="SHReceivers")[1],[object,cameraParent]);
  }
});
