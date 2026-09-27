// EveSpaceScene.RenderDistortionBatches (EveSpaceScene.cpp:1224-1250) and the
// driver's distortion-map rule (EveSpaceSceneRenderDriver.cpp:644-651).
import assert from "node:assert/strict";
import test from "node:test";

import { EveSpaceScene, EveSpaceSceneRenderDriver } from "../../npm/dist/trinity/index.js";
import { RenderingMode, TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";

function recordingContext(calls)
{
  const esm = {
    PushRenderTarget: target => calls.push([ "PushRenderTarget", target ]),
    PushDepthStencilBuffer: () => calls.push([ "PushDepthStencilBuffer" ]),
    SetDepthStencilBuffer: depth => calls.push([ "SetDepthStencilBuffer", depth ]),
    ApplyStandardStates: mode => calls.push([ "ApplyStandardStates", mode ]),
    PopDepthStencilBuffer: () => calls.push([ "PopDepthStencilBuffer" ]),
    PopRenderTarget: () => calls.push([ "PopRenderTarget" ])
  };
  return {
    GetEffectStateManager: () => esm,
    Clear: options => calls.push([ "Clear", options.clearColor, options.color ]),
    RenderBatches: accumulator => calls.push([ "RenderBatches", accumulator ])
  };
}

test("distortion batches draw additively into a map cleared to Carbon's 0x007f7f00, over the scene depth", () =>
{
  const scene = new EveSpaceScene();
  scene.ApplyPerFrameData = () => calls.push([ "ApplyPerFrameData" ]);
  const calls = [];
  const accumulator = { GetBatchCount: () => 1 };
  const batches = { GetAccumulator: type => (type === TriBatchType.TRIBATCHTYPE_DISTORTION ? accumulator : null) };

  assert.equal(scene.RenderDistortionBatches(batches, "distortionMap", "depthMap", recordingContext(calls)), true);
  assert.deepEqual(calls, [
    [ "PushRenderTarget", "distortionMap" ],
    [ "PushDepthStencilBuffer" ],
    [ "SetDepthStencilBuffer", "depthMap" ],
    [ "Clear", true, [ 0x7f / 255, 0x7f / 255, 0, 0 ] ],
    [ "ApplyPerFrameData" ],
    [ "ApplyStandardStates", RenderingMode.RM_ALPHA_ADDITIVE ],
    [ "RenderBatches", accumulator ],
    [ "PopDepthStencilBuffer" ],
    [ "PopRenderTarget" ]
  ]);
});

test("no distortion batches: nothing is bound and the driver does not apply (cpp:1228-1231)", () =>
{
  const scene = new EveSpaceScene();
  const calls = [];
  const batches = { GetAccumulator: () => ({ GetBatchCount: () => 0 }) };

  assert.equal(scene.RenderDistortionBatches(batches, "distortionMap", "depthMap", recordingContext(calls)), false);
  assert.deepEqual(calls, []);
});

test("the driver borrows a distortion map only while distortion is enabled", () =>
{
  const driver = new EveSpaceSceneRenderDriver();
  assert.equal(driver.enableDistortion, false, "Carbon's default");
  assert.equal(driver._GetDistortionMapIfNeeded({ width: 4, height: 4 }), null);
});
