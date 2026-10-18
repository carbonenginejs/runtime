import test from "node:test";
import assert from "node:assert/strict";
import { EveSmartLightAttributeModifierCameraDependency, EveSmartLightQuad, EveUpdateContext, EveChildUpdateParams, Tr2RenderContext_GetMainThreadRenderContext, Tr2QuadRenderer, Tr2Effect } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";

test("camera-dependent lights read the Tr2Renderer view (cpp:56, 97)", () =>
{
  const modifier = new EveSmartLightAttributeModifierCameraDependency();
  modifier.useCameraLookAt = true;
  Tr2Renderer.SetViewTransform(mat4.create());
  // Identity view: GetViewLookAt is +Z, so an object straight down -Z is fully looked at.
  assert.equal(modifier._GetLookAtAmplitude([0, 0, -1]), 1);
  assert.equal(modifier._GetLookAtAmplitude([0, 0, 1]), 0);
});

test("camera-dependent lights preserve the disabled look-at branch and read the real view", () =>
{
  const modifier = new EveSmartLightAttributeModifierCameraDependency();
  assert.equal(modifier._GetLookAtAmplitude([0, 0, -1]), 1);
  const update = new EveUpdateContext();
  modifier.UpdateSyncronous(update, new EveChildUpdateParams(), 1);
  modifier.useCameraLookAt = true;
  modifier.lookAtVisionCone = 90;
  assert.equal(modifier._GetLookAtAmplitude([0, 0, -1]), 1);
});

test("smart-light edit mode registers changed effects with the shared quad renderer", t =>
{
  const renderer = new Tr2QuadRenderer();
  t.mock.method(Tr2QuadRenderer, "Instance", () => renderer);
  const effect = new Tr2Effect();
  effect.GetHashValue = () => 0x1234;
  const quad = new EveSmartLightQuad();
  quad.editMode = true;
  quad.effect = effect;
  const update = new EveUpdateContext();
  const params = new EveChildUpdateParams();
  quad.UpdateSyncronous__Distribution(update, params, null);
  assert.equal(renderer.GetEffectRecords().get(0x1234).effect, effect);
  effect.GetHashValue = () => 0x5678;
  quad.UpdateSyncronous__Distribution(update, params, null);
  assert.ok(renderer.GetEffectRecords().has(0x5678));
  quad.effect = null;
  quad.UpdateSyncronous__Distribution(update, params, null);
  assert.equal(quad._effectKey, 0);
});

test("noise modifier samples Blue's frame time in seconds while processing, not at update", async t =>
{
  // EveSmartLightAttributeModifierNoise.cpp:26 reads TimeAsDouble( BeOS->GetCurrentFrameTime() )
  // inside ProcessAttributeModifier; UpdateSyncronous only advances activation (cpp:14-17).
  const { EveSmartLightAttributeModifierNoise } = await import("../../npm/dist/trinity/index.js");
  const { be, CcpTime } = await import("../../npm/dist/global/blue/index.js");
  const { noise } = await import("../../npm/dist/global/math/noise.js");
  const modifier = new EveSmartLightAttributeModifierNoise();
  modifier.noiseAmplitude = 1;
  modifier.noiseFrequency = 3;
  t.mock.method(modifier, "GetActivationStrength", () => 1);
  let frameTime = 12_345_678;
  t.mock.method(be.os, "GetCurrentFrameTime", () => frameTime);
  const expected = time =>
  {
    const value = noise.carbonPerlin1D(CcpTime.timeAsDouble(time) * 3, 2, 2, 1);
    return 1 + ((value + 1) / 2 - 1);
  };
  const update = new EveUpdateContext();
  modifier.UpdateSyncronous(update, new EveChildUpdateParams(), 1);
  frameTime = 98_765_432;
  const attribute = [1, 1, 1];
  modifier.ProcessAttributeModifier(attribute, {}, null, null, 1);
  assert.ok(Math.abs(attribute[0] - expected(98_765_432)) < 1e-12, "the frame time read during processing wins");
  assert.notEqual(expected(98_765_432), expected(12_345_678));
});
