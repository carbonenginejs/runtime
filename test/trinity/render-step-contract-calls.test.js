import test from "node:test";
import assert from "node:assert/strict";
import { ITr2Scene, ITr2MultiPassScene, ITr2VisualizationModeRenderer, Tr2RenderContext, Tr2RenderTarget, Tr2LineGraph } from "../../npm/dist/trinity/core/index.js";
import { TriRenderStep, TriStepRenderScene, TriStepRenderPass, TriStepSetVisualizationMode, TriStepRenderTexture, TriStepRenderLineGraph } from "../../npm/dist/trinity/renderJob/index.js";
import { CjsScriptCallback } from "../../npm/dist/global/blue/CjsScriptCallback.js";
import { StubContext, StubTarget } from "../support/stubContext.js";

for (const [Step, Receiver, property, method] of [
  [TriStepRenderScene, ITr2Scene, "scene", "Render"],
  [TriStepRenderPass, ITr2MultiPassScene, "scene", "RenderPass"],
  [TriStepSetVisualizationMode, ITr2VisualizationModeRenderer, "object", "SetVisualizationMode"]
])
{
  test(`${Step.name} requires ${method} on a present receiver`, () =>
  {
    const step = new Step();
    step[property] = new Receiver();
    step[property][method] = undefined;
    assert.throws(() => step.Execute(0, 0, new Tr2RenderContext()), TypeError);
  });

  test(`${Step.name} preserves its native absent-receiver branch`, () =>
  {
    assert.equal(new Step().Execute(0, 0, new Tr2RenderContext()), TriRenderStep.Result.RS_OK);
  });
}

test("render-pass observes termination and forwards pass/context", () =>
{
  const step = new TriStepRenderPass();
  const context = new Tr2RenderContext();
  const calls = [];
  step.scene = Object.assign(new ITr2MultiPassScene(), {
    RenderPass: (...args) => { calls.push(args); return ITr2MultiPassScene.RenderPassResult.PASS_RESULT_TERMINATE; }
  });
  step.passType = ITr2MultiPassScene.PassType.RP_DEPTH_PASS;
  assert.equal(step.Execute(0, 0, context), TriRenderStep.Result.RS_TERMINATE);
  assert.deepEqual(calls, [[step.passType, context]]);
});

test("render-texture requires the provider's GetTexture", () =>
{
  const step = new TriStepRenderTexture();
  step.texture = new Tr2RenderTarget();
  step.texture.GetTexture = undefined;
  assert.throws(() => step.Execute(0, 0, new Tr2RenderContext()), /GetTexture/);
});

test("render-texture skips a provider without a texture", () =>
{
  const step = new TriStepRenderTexture();
  const context = new Tr2RenderContext();
  context.GetBlitter = () => { throw new Error("Must not draw an absent texture"); };
  assert.equal(step.Execute(0, 0, context), TriRenderStep.Result.RS_OK);
  step.texture = new Tr2RenderTarget();
  assert.equal(step.Execute(0, 0, context), TriRenderStep.Result.RS_OK);
});

test("render-texture passes the borrowed texture to the blitter and preserves textureSize", t =>
{
  const context = StubContext();
  t.after(() => context.GetRenderContextAL().Destroy());
  const texture = StubTarget(64, 32);
  t.after(() => texture.Destroy());
  const provider = new Tr2RenderTarget();
  let getters = 0;
  provider.GetTexture = () => { getters++; return texture; };
  provider.GetWidth = () => { throw new Error("Not part of ITr2TextureProvider"); };
  provider.GetHeight = provider.GetWidth;
  const blitter = context.GetBlitter();
  const calls = [];
  blitter.Draw__Texture = (...args) => { calls.push(args); return true; };
  const step = new TriStepRenderTexture();
  step.texture = provider;
  step.textureSize.set([7, 8]);
  assert.equal(step.Execute(0, 0, context), TriRenderStep.Result.RS_OK);
  assert.equal(getters, 2);
  assert.deepEqual(calls, [[context, texture, step.tlTexCoord, step.brTexCoord]]);
  assert.deepEqual([...step.textureSize], [7, 8]);
});

function graphStep()
{
  const graph = new Tr2LineGraph();
  graph.SetSize(2);
  graph.Add(12);
  const step = new TriStepRenderLineGraph();
  step.lineGraphs.push(graph);
  return step;
}

test("line-graph scaling requires a present Blue callback's CallVoid", () =>
{
  const step = graphStep();
  step.scaleChangeCallback = new CjsScriptCallback(() => {});
  step.scaleChangeCallback.CallVoid = undefined;
  assert.throws(() => step.Execute(0, 0, new Tr2RenderContext()), /CallVoid/);
});

test("line-graph scaling preserves function, Blue and absent callbacks before its drawing refusal", () =>
{
  let called = 0;
  for (const callback of [() => called++, new CjsScriptCallback(() => called++), null])
  {
    const step = graphStep();
    step.scaleChangeCallback = callback;
    assert.throws(() => step.Execute(0, 0, new Tr2RenderContext()), /drawing the graphs needs/);
    assert.equal(step.scale, 0.05);
  }
  assert.equal(called, 2);
});
