import assert from "node:assert/strict";
import test from "node:test";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";
import { CjsSchema } from "../../../npm/dist/global/schema/CjsSchema.js";
import { Tr2Effect } from "../../../npm/dist/trinity/shader/Tr2Effect.js";
import { Tr2FloatParameter } from "../../../npm/dist/trinity/shader/parameter/Tr2FloatParameter.js";
import { TriTextureParameter } from "../../../npm/dist/trinity/shader/parameter/TriTextureParameter.js";
import { Tr2CurveConstant } from "../../../npm/dist/trinity/curves/curve/Tr2CurveConstant.js";

test("SOF compatibility hydration preserves Tr2Effect's map setters and textures alias", () =>
{
  const adapter = createSofHydrationAdapter();
  const effect = new Tr2Effect();
  assert.equal(CjsSchema.isModelInstance(effect), true);
  const parameters = effect.parameters;
  const resources = effect.resources;
  assert.equal(adapter.applyValues(effect, {
    parameters: { Gain: 2.5 }, textures: { DiffuseMap: "" }
  }, { options: { skipUpdate: true, skipEvents: true } }), effect);
  assert.equal(effect.parameters, parameters);
  assert.equal(effect.resources, resources);
  assert.equal(parameters.length, 1);
  const gain = effect.GetParameterByName("Gain");
  assert.equal(CjsSchema.cast(gain, Tr2FloatParameter), gain);
  assert.equal(gain.GetValue(), 2.5);
  assert.equal(resources.length, 1);
  const diffuse = effect.GetResourceByName("DiffuseMap");
  assert.equal(CjsSchema.cast(diffuse, TriTextureParameter), diffuse);
  assert.equal(diffuse.resourcePath, "");
  assert.equal(Object.hasOwn(effect, "textures"), false);
  adapter.applyValues(effect, { parameters: { Gain: 4 } }, { options: { skipUpdate: true, skipEvents: true } });
  assert.equal(effect.GetParameterByName("Gain"), gain);
  assert.equal(gain.GetValue(), 4);
});

test("SOF compatibility hydration assigns a model-free curve through the existing schema transport", () =>
{
  const adapter = createSofHydrationAdapter();
  const curve = new Tr2CurveConstant();
  assert.equal(CjsSchema.isModelInstance(curve), false);
  assert.equal("SetValues" in curve, false);
  const value = curve.value;
  assert.equal(adapter.applyValues(curve, { name: "ColorCurve", value: [2, 3, 4, 5] }, {
    options: { skipUpdate: true, skipEvents: true }
  }), curve);
  assert.equal(curve.name, "ColorCurve");
  assert.equal(curve.value, value);
  assert.equal(curve.currentValue, value);
  assert.deepEqual(Array.from(value), [2, 3, 4, 5]);
});
