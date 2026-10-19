import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CjsLibrary, TnyOutlineHelper } from "../../npm/dist/core/index.js";
import { EveSpaceScene, EveSpaceSceneRenderDriver, TriView, TriProjection, TriRenderJob,
  Tr2StepExecuteRenderNode, Tr2RenderTarget, Tr2Renderer, Tr2RenderBatch } from "../../npm/dist/trinity/index.js";
import { TriGeometryRes, Tr2EffectRes } from "../../npm/dist/resource/index.js";
import { PixelFormat, TextureType, Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { TriBatchType, RenderingMode } from "../../npm/dist/global/consts/graphics/index.js";
import { SetEffectPathDefaults } from "../../npm/dist/global/utils/effectPath.js";
import { CompileEffectFile } from "../../src/shadercompiler/ShaderCompiler/shaderCompiler.js";
import { CjsFxEffectCompilerWebGPU } from "../../src/shadercompiler/EffectCompilerWebGPU/index.js";
import { Platform } from "../../src/shadercompiler/platforms.js";
import { LIBRARY_ROOT } from "../../scripts/shadercompiler/cbuffer-headers.mjs";
import { StubContext } from "../support/stubContext.js";
import { composeStubResMan, StubResMan } from "../support/stubResMan.js";

const compiled = new Map();

/** Compiles the actual selection shaders into resources without a GPU or byte fetcher. */
function resource(path)
{
  const name = path.split("/").at(-1).replace(/\.sm_\w+$/u, ".fx");
  if (!compiled.has(name))
  {
    const read = p => existsSync(join(LIBRARY_ROOT, p)) ? readFileSync(join(LIBRARY_ROOT, p), "utf8") : null;
    const result = CompileEffectFile(`selection/${name}`, {
      read, compilers: new Map([[Platform.PLATFORM_WEBGPU, session => new CjsFxEffectCompilerWebGPU(session)]])
    });
    assert.deepEqual(result.messages, []);
    assert.ok(result.bytes);
    compiled.set(name, result.bytes);
  }
  const result = new Tr2EffectRes().DoLoad(compiled.get(name));
  result.MarkGood();
  result.SetObjectLoader(() => result);
  return result;
}

/** A nonempty hull whose real geometry batch is drawn with the mask override. */
function hull(name, draws, skinned = false)
{
  const geometry = new TriGeometryRes();
  geometry.SetPayload({ meshes: [{
    decl: [{ usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 }],
    vertex: { position: [0, 0, 0, 1, 0, 0, 0, 1, 0] },
    indices: [{ faces: [0, 1, 2] }], areas: [{ firstElement: 0, elementCount: 1 }]
  }] });
  return {
    mesh: { opaqueAreas: [{ effect: { effectFilePath: skinned ? "res:/skinned_quadv5.fx" : "res:/quadv5.fx" } }] },
    GetPerObjectData() { return null; },
    GetBatches(accumulator, type)
    {
      if (type !== TriBatchType.TRIBATCHTYPE_OPAQUE) return;
      draws.push(name);
      const batch = new Tr2RenderBatch();
      batch.shader = {};
      batch.renderingMode = RenderingMode.RM_ANY;
      batch.topology = Topology.TOP_TRIANGLES;
      batch.instanceCount = 1;
      batch.SetGeometrySource(geometry, 0, 0, 1, false, geometry.GetMeshLod__LodIndex(0, 0));
      accumulator.Commit(batch);
    }
  };
}

/** A real render job over a fake device: driver mask node, then outline composite. */
async function fixture(t, options = {})
{
  const fallback = new StubResMan();
  const resMan = composeStubResMan((path, request) => path.includes("/cjs/selection/") ? resource(path) : fallback.GetResource(path, request));
  SetEffectPathDefaults({ platformName: "webgpu", quality: "high" });
  const outline = new CjsLibrary().CreateOutlineHelper(options);
  assert.equal(await outline.loading, true, outline.error?.stack);
  const context = StubContext();
  const al = context.GetRenderContextAL();
  al.BeginScene();
  const target = new Tr2RenderTarget();
  target.Create(64, 48, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 1, 0, 0, TextureType.TEX_TYPE_2D, context);
  const driver = new EveSpaceSceneRenderDriver();
  driver.scene = new EveSpaceScene();
  driver.scene.display = false;
  driver.view = new TriView();
  driver.projection = new TriProjection();
  driver.antiAliasingQuality = EveSpaceSceneRenderDriver.AntiAliasingQuality.Disabled;
  driver.sceneOverlay = outline;
  const driverStep = new Tr2StepExecuteRenderNode();
  driverStep.node = driver;
  driverStep.destinationTarget = target;
  driverStep.clearTargetOnFailure = false;
  const compositeStep = new Tr2StepExecuteRenderNode();
  compositeStep.node = outline.compositeNode;
  compositeStep.destinationTarget = target;
  compositeStep.clearTargetOnFailure = false;
  const job = new TriRenderJob();
  job.steps.push(driverStep, compositeStep);
  t.after(() => { outline.Destruct(); driver.Destruct(); target.Destroy(); resMan.restore(); SetEffectPathDefaults(null); });
  return { outline, context, al, driver, target, job, resMan };
}

for (const compositePlacement of ["afterPost", "beforePost"])
{
  test(`outline ${compositePlacement} runs real mask and composite draws through a job`, async t =>
  {
    const f = await fixture(t, { compositePlacement });
    const { outline, context, al, driver, job } = f;
    const objects = [];
    outline.hovered = hull("hover", objects);
    outline.selected.add(hull("selected", objects));
    outline.hoveredWidth = 0;
    outline.selectedWidth = 20;
    const trace = [], styles = [];
    const clear = al.Clear.bind(al);
    t.mock.method(al, "Clear", options =>
    {
      if (context.GetRenderTarget(0).GetFormat() === PixelFormat.PIXEL_FORMAT_R8G8_UNORM)
      {
        trace.push("mask-clear");
        assert.deepEqual(options, { clearColor: true, color: [0, 0, 0, 0] });
        assert.ok(context.GetDepthStencil().IsValid(), "mask reuses scene depth");
      }
      return clear(options);
    });
    const override = context.RenderBatchesWithOverride.bind(context);
    t.mock.method(context, "RenderBatchesWithOverride", (...args) =>
    {
      const before = al.GetDrawCount();
      const result = override(...args);
      assert.equal(al.GetDrawCount() - before, 1, "real geometry and compiled override reach backend draw");
      trace.push("mask-draw");
      return result;
    });
    const quad = Tr2Renderer.drawScreenQuad;
    t.mock.method(Tr2Renderer, "drawScreenQuad", (ctx, effect) =>
    {
      const before = al.GetDrawCount();
      const result = quad(ctx, effect);
      if (effect === outline._effects.outline)
      {
        assert.equal(al.GetDrawCount() - before, 1, "compiled composite reaches the backend");
        trace.push("composite");
        const value = name => Array.from(effect.parameters.find(p => p.name === name).value);
        styles.push({ colour: value("OutlineColour"), settings: value("OutlineSettings"), channel: value("SelectionChannel") });
      }
      return result;
    });
    const post = driver._PostProcess.bind(driver);
    t.mock.method(driver, "_PostProcess", (...args) => { trace.push("post"); return post(...args); });
    assert.equal(job.Run(11, 13, context), TriRenderJob.Status.RJ_DONE);
    assert.deepEqual(objects, ["hover", "selected"]);
    assert.deepEqual(trace, compositePlacement === "afterPost"
      ? ["mask-clear", "mask-draw", "mask-draw", "post", "composite", "composite"]
      : ["mask-clear", "mask-draw", "mask-draw", "composite", "composite", "post"]);
    assert.deepEqual(styles.map(s => s.settings[1]), [1, 8]);
    assert.deepEqual(styles.map(s => s.channel), [[1, 0, 0, 0], [0, 1, 0, 0]]);
    assert.deepEqual(styles[1].colour, [1, 1, 1, 1]);
    assert.equal(outline._frame, null, "mask consumed once");
    assert.equal(outline._mask.GetWidth(), 64);
    assert.equal(outline._mask.GetHeight(), 48);
    assert.ok(f.resMan.requests.filter(r => r.path.includes("/cjs/selection/")).every(r => r.path.endsWith(".sm_depth")));
  });
}

test("mode precedence, disabled modes and empty selection control mask draws", async t =>
{
  const { outline, job, context } = await fixture(t);
  const drawn = [];
  const shared = hull("shared", drawn);
  outline.hovered = shared;
  outline.selected.add(shared);
  assert.deepEqual(outline._Modes().map(m => m.channel), [1]);
  job.Run(1, 1, context);
  assert.deepEqual(drawn, ["shared"]);
  drawn.length = 0;
  outline.selectedWins = false;
  assert.deepEqual(outline._Modes().map(m => m.channel), [0]);
  job.Run(2, 2, context);
  assert.deepEqual(drawn, ["shared"]);
  drawn.length = 0;
  outline.hoveredEnabled = false;
  outline.selectedEnabled = false;
  job.Run(3, 3, context);
  assert.deepEqual(drawn, []);
  assert.equal(outline._frame, null);
});

test("mask resize destroys the old texture and failed validation cannot composite a stale frame", async t =>
{
  const { outline, job, context, target, driver } = await fixture(t);
  outline.hovered = hull("hover", []);
  job.Run(1, 1, context);
  const previous = outline._mask;
  target.Create(96, 32, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 1, 0, 0, TextureType.TEX_TYPE_2D, context);
  job.Run(2, 2, context);
  assert.equal(previous.IsValid(), false);
  assert.deepEqual([outline._mask.GetWidth(), outline._mask.GetHeight()], [96, 32]);
  driver.background = { Validate: () => false, Execute() { assert.fail("background must not run"); } };
  t.mock.method(outline.compositeNode, "Execute", () => assert.fail("job must stop before composite"));
  assert.equal(job.Run(3, 3, context), TriRenderJob.Status.RJ_FAILED);
});

test("destroyed outline rejects validation and disposes its owned mask", async t =>
{
  const { outline, job, context } = await fixture(t);
  assert.equal(outline.constructor, TnyOutlineHelper);
  outline.hovered = hull("hover", []);
  job.Run(1, 2, context);
  const mask = outline._mask;
  outline.Destruct();
  assert.equal(mask.IsValid(), false);
  assert.equal(job.Run(2, 3, context), TriRenderJob.Status.RJ_FAILED);
});



test("mask overrides follow skinned and unpacked-skinned area shader prefixes", async t =>
{
  const { outline, context, job, al } = await fixture(t);
  const skinned = hull("skinned", [], true);
  const unpacked = hull("unpacked", []);
  unpacked.mesh.opaqueAreas[0].effect.effectFilePath = "res:/graphics/effect/unpackedskinned_quadv5.fx";
  outline.selected.add(skinned);
  outline.selected.add(unpacked);
  outline.selected.add(hull("plain", []));
  const used = [];
  const override = context.RenderBatchesWithOverride.bind(context);
  t.mock.method(context, "RenderBatchesWithOverride", (batches, effect) =>
  {
    used.push(effect);
    const before = al.GetDrawCount();
    const result = override(batches, effect);
    assert.equal(al.GetDrawCount() - before, 1);
    return result;
  });
  assert.equal(job.Run(1, 2, context), TriRenderJob.Status.RJ_DONE);
  assert.deepEqual(used, [outline._effects.skinnedMask, outline._effects.skinnedMask, outline._effects.mask]);
});

test("an interrupted mask pass restores targets and clears pending frame state", async t =>
{
  const { outline, context, job } = await fixture(t);
  outline.hovered = hull("broken", []);
  outline.hovered.GetBatches = () => { throw new Error("synthetic geometry failure"); };
  const before = [context.GetStackSizeRT(), context.GetStackSizeDS()];
  const execute = outline.Execute.bind(outline);
  t.mock.method(outline, "Execute", (...args) =>
  {
    const targets = [context.GetRenderTarget(0), context.GetRenderTarget(1), context.GetDepthStencil()].map(texture => texture?.TrinityALImpl_GetObject());
    try { return execute(...args); }
    finally
    {
      assert.deepEqual([context.GetRenderTarget(0), context.GetRenderTarget(1), context.GetDepthStencil()].map(texture => texture?.TrinityALImpl_GetObject()), targets);
    }
  });
  assert.throws(() => job.Run(1, 2, context), /synthetic geometry failure/u);
  assert.deepEqual([context.GetStackSizeRT(), context.GetStackSizeDS()], before);
  assert.equal(outline._frame, null);
  assert.equal(outline._step.renderable, null);
  assert.equal(outline._step.effectOverride, null);
});
