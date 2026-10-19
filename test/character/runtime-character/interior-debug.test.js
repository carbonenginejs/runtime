// Tr2InteriorScene's debug entry points (Tr2InteriorScene.cpp:831-883, 1428-1449).
import test from "node:test";
import assert from "node:assert/strict";
import { Tr2InteriorScene } from "../../../npm/dist/character/index.js";
import { TriStepRenderSceneDebug } from "../../../npm/dist/trinity/renderJob/index.js";
import {
  Tr2RenderContext,
  Tr2DebugRenderer,
  Tr2RenderTarget,
  Tr2Renderer,
  Tr2RenderContext_GetMainThreadRenderContext
} from "../../../npm/dist/trinity/core/index.js";
import { mat4 } from "../../../npm/dist/global/math/mat4.js";

/** The main-thread context with a stub device, as a frame would have it. */
function MainContext()
{
  const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
  renderContext.GetRenderContextAL().CreateDevice({ mode: { width: 64, height: 64 } });
  return renderContext;
}

test("the render-job debug step skips an interior scene with no debug renderer (cpp:833-845)", () =>
{
  const scene = new Tr2InteriorScene();
  const step = new TriStepRenderSceneDebug();
  step.scene = scene;
  assert.doesNotThrow(() => step.Execute(0, 0, new Tr2RenderContext()));
  assert.equal(scene.debugRenderer, null, "no renderer is created unless shadow maps are shown");
});

test("showing shadow maps creates the debug renderer and runs the debug pass (cpp:833-882)", () =>
{
  const renderContext = MainContext();
  Tr2Renderer.SetViewTransform(mat4.create());
  const projection = mat4.perspective(mat4.create(), 1, 1, 1, 100);
  Tr2Renderer.SetProjectionTransform(projection);
  const rawBefore = Array.from(Tr2Renderer.GetProjectionRawTransform());

  const scene = new Tr2InteriorScene();
  scene.debugRenderShadowMaps = true;
  scene.RenderDebugInfo__RenderContext(renderContext);

  assert.notEqual(scene.debugRenderer, null);
  assert.ok(scene._perFrameVSBuffer.IsValid(), "the debug per-frame block was uploaded");
  assert.deepEqual(Array.from(Tr2Renderer.GetProjectionRawTransform()), rawBefore,
    "the projection is restored after the draws (ON_BLOCK_EXIT, cpp:861)");
});

test("GetDebugOptions offers Shadow Maps; the renderer form draws nothing without light targets (cpp:1428-1449)", () =>
{
  const scene = new Tr2InteriorScene();
  const options = new Set();
  scene.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Shadow Maps" ]);
  scene.debugRenderShadowMaps = true;
  assert.doesNotThrow(() => scene.RenderDebugInfo__Renderer(new Tr2DebugRenderer()));
});

test("bare RenderDebugInfo routes a context to __RenderContext and a renderer to __Renderer (rule 11)", () =>
{
  const scene = new Tr2InteriorScene();
  scene.debugRenderShadowMaps = true;
  scene.lightRenderTargets.push(new Tr2RenderTarget());
  const renderContext = MainContext();
  const esm = renderContext.GetEffectStateManager();
  esm.SetViewport({ x: 0, y: 0, width: 64, height: 64, minZ: 0, maxZ: 1 });
  const before = { ...esm.viewport };
  // The context form runs past its early out; the renderer form tiles the
  // light target and pops the viewport it pushed (cpp:1437-1447).
  assert.doesNotThrow(() => scene.RenderDebugInfo(renderContext));
  assert.doesNotThrow(() => scene.RenderDebugInfo(new Tr2DebugRenderer()));
  assert.deepEqual({ ...esm.viewport }, before);
  assert.throws(() => scene.RenderDebugInfo({}), TypeError, "neither: it cannot tell");
});
