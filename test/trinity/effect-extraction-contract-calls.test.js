import test from "node:test";
import assert from "node:assert/strict";
import { Tr2Effect, Tr2Vector4Parameter, extractTr2EffectConstantValues } from "../../npm/dist/trinity/index.js";

function extractionFixture()
{
  const effect = new Tr2Effect();
  const parameter = new Tr2Vector4Parameter();
  parameter.name = "Value";
  parameter.SetValue([1, 2, 3, 4]);
  effect.parameters = [parameter];
  return { effect, parameter, reflected: [{ name: "Value", type: 0, dimension: 4, elements: 0 }] };
}

test("dynamic constant extraction requires GetParameterName", () =>
{
  const { effect, parameter, reflected } = extractionFixture();
  parameter.GetParameterName = undefined;
  assert.throws(() => extractTr2EffectConstantValues(effect, reflected), /GetParameterName/);
});

test("dynamic constant extraction does not replace an absent returned name", () =>
{
  const { effect, parameter, reflected } = extractionFixture();
  parameter.GetParameterName = () => undefined;
  assert.throws(() => extractTr2EffectConstantValues(effect, reflected), { code: "CJS_TRINITY_EFFECT_CONSTANT_MISSING" });
});

test("dynamic constant extraction requires the native constant writer", () =>
{
  const { effect, parameter, reflected } = extractionFixture();
  parameter.CopyValueToEffect = undefined;
  assert.throws(() => extractTr2EffectConstantValues(effect, reflected), /CopyValueToEffect/);
});

test("dynamic constant extraction consumes a nominal parameter", () =>
{
  const { effect, reflected } = extractionFixture();
  assert.deepEqual(extractTr2EffectConstantValues(effect, reflected).Value, [1, 2, 3, 4]);
});
