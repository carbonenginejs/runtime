// Tr2InteriorScene's debug entry points (Tr2InteriorScene.cpp:831-883, 1428-1449).
import test from "node:test";
import assert from "node:assert/strict";
import { Tr2InteriorScene } from "../../../npm/dist/character/index.js";
import { TriStepRenderSceneDebug } from "../../../npm/dist/trinity/renderJob/index.js";

test("the render-job debug step skips an interior scene with no debug renderer (cpp:833-845)", () =>
{
  const scene = new Tr2InteriorScene();
  const step = new TriStepRenderSceneDebug();
  step.scene = scene;
  assert.doesNotThrow(() => step.Execute(0, 0, null));
  assert.equal(scene.debugRenderer, null, "no renderer is created unless shadow maps are shown");
});

test("showing shadow maps creates the debug renderer, then waits on R9", () =>
{
  const scene = new Tr2InteriorScene();
  scene.debugRenderShadowMaps = true;
  assert.throws(() => scene.RenderDebugInfo(null), /R9/);
  assert.notEqual(scene.debugRenderer, null);
});

test("GetDebugOptions offers Shadow Maps; the renderer form draws nothing without light targets (cpp:1428-1449)", () =>
{
  const scene = new Tr2InteriorScene();
  const options = new Set();
  scene.GetDebugOptions(options);
  assert.deepEqual([ ...options ], [ "Shadow Maps" ]);
  const renderer = { HasOption: (_owner, option) => option === "Shadow Maps" };
  assert.doesNotThrow(() => scene.RenderDebugInfo__Renderer(renderer));
});
