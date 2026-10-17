import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { ITr2MultiPassScene, ITr2VisualizationModeRenderer } from "../../npm/dist/trinity/core/index.js";
import { PassType, RenderPassResult } from "../../npm/dist/trinity/generated/include/enums.js";

test("multi-pass scene exposes the native enums and requires RenderPass", () =>
{
  assert.equal(ITr2MultiPassScene.PassType, PassType);
  assert.equal(ITr2MultiPassScene.RenderPassResult, RenderPassResult);
  assert.throws(() => new ITr2MultiPassScene().RenderPass(0, null), /ITr2MultiPassScene\.RenderPass\([^)]*\) must be implemented/);
  class Scene extends ITr2MultiPassScene
  {
    RenderPass() { return RenderPassResult.PASS_RESULT_TERMINATE; }
  }
  const scene = new Scene();
  assert.equal(CjsSchema.cast(scene, ITr2MultiPassScene), scene);
  assert.equal(scene.RenderPass(), 1);
});

test("visualization renderer requires its native mode setter", () =>
{
  assert.throws(() => new ITr2VisualizationModeRenderer().SetVisualizationMode(0), /ITr2VisualizationModeRenderer\.SetVisualizationMode\(visualizationMode\) must be implemented/);
  class Renderer extends ITr2VisualizationModeRenderer
  {
    SetVisualizationMode(mode) { this.mode = mode; }
  }
  const renderer = new Renderer();
  assert.equal(CjsSchema.cast(renderer, ITr2VisualizationModeRenderer), renderer);
  renderer.SetVisualizationMode(4);
  assert.equal(renderer.mode, 4);
});
