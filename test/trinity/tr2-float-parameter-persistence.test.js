import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { DictReader, DictWriter, YamlWriter } from "../../npm/dist/blue/blue/index.js";
import { YamlReader } from "../../npm/dist/blue/blue/YamlReader.js";
import "../../npm/dist/trinity/index.js";
import { Tr2FloatParameter } from "../../npm/dist/trinity/shader/parameter/Tr2FloatParameter.js";

// Tr2FloatParameter keeps its float in a one-element Float32Array (Carbon's &m_value) and persists it as a scalar.

test("a persisted value reaches the typed storage and GetDestination hands out that storage", () =>
{
  // A black payload reaches CjsSchema.from as plain values, as CjsBlackFormat.readPayload returns them.
  const parameter = CjsSchema.from("Tr2FloatParameter", { _type: "Tr2FloatParameter", name: "Glow", value: 2.5 });
  assert.equal(parameter.constructor, Tr2FloatParameter);
  assert.equal(parameter.GetValue(), 2.5);
  const { dest, size } = parameter.GetDestination();
  assert.ok(dest instanceof Float32Array);
  assert.equal(size, 4);
  assert.equal(dest[0], 2.5);
  dest[0] = 4;
  assert.equal(parameter.GetValue(), 4, "the destination is the parameter's own storage");
});

test("the value row writes a scalar to values and to red text and reads back", () =>
{
  const parameter = new Tr2FloatParameter();
  parameter.name = "Glow";
  parameter.SetValue(0.75);
  const values = new DictWriter().WriteObject(parameter, {}, { persistOnly: true });
  assert.equal(values.value, 0.75);
  assert.equal(typeof values.value, "number");

  const text = new YamlWriter().WriteObjectToString(parameter);
  assert.match(text, /value: 0\.75/);
  const restored = new YamlReader().CreateObjectFromString(text);
  assert.equal(restored.GetValue(), 0.75);

  const again = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2FloatParameter", name: "Glow", value: 3 });
  assert.equal(again.GetValue(), 3);
});
