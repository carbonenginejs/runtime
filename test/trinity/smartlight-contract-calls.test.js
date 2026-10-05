import test from "node:test";
import assert from "node:assert/strict";
import { EveSmartLightAttributeModifierCameraDependency, EveSmartLightQuad, EveUpdateContext, EveChildUpdateParams, Tr2RenderContext, Tr2QuadRenderer, Tr2Effect } from "../../npm/dist/trinity/index.js";

test("camera-dependent lights require the captured view transform method", () =>
{
  const modifier = new EveSmartLightAttributeModifierCameraDependency();
  modifier.useCameraLookAt = true;
  modifier._renderContext = new Tr2RenderContext();
  modifier._renderContext.GetViewTransform = undefined;
  assert.throws(() => modifier._GetLookAtAmplitude([0, 0, -1]), /GetViewTransform/);
});

test("camera-dependent lights do not replace missing view results with neutral strength", () =>
{
  const modifier = new EveSmartLightAttributeModifierCameraDependency();
  modifier.useCameraLookAt = true;
  modifier._renderContext = new Tr2RenderContext();
  modifier._renderContext.GetViewTransform = () => null;
  assert.throws(() => modifier._GetLookAtAmplitude([0, 0, -1]), TypeError);
  modifier._renderContext.GetViewPosition = () => null;
  assert.throws(() => modifier._GetActivationValue([0, 0, -1], [0, 0, 1]), TypeError);
});

test("camera-dependent lights preserve the disabled look-at branch and read the real view", () =>
{
  const modifier = new EveSmartLightAttributeModifierCameraDependency();
  assert.equal(modifier._GetLookAtAmplitude([0, 0, -1]), 1);
  const update = new EveUpdateContext();
  update.renderContext = new Tr2RenderContext();
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
  quad.UpdateSyncronous_Distribution(update, params, null);
  assert.equal(renderer.GetEffectRecords().get(0x1234).effect, effect);
  effect.GetHashValue = () => 0x5678;
  quad.UpdateSyncronous_Distribution(update, params, null);
  assert.ok(renderer.GetEffectRecords().has(0x5678));
  quad.effect = null;
  quad.UpdateSyncronous_Distribution(update, params, null);
  assert.equal(quad._effectKey, 0);
});
