import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier, DictReader, IInitialize } from "../../npm/dist/global/blue/index.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2ExpressionTermInfo, TriFloat, TriVariable, Tr2VariableStore } from "../../npm/dist/trinity/index.js";
import { ITr2EffectValue, ResourceFlags } from "../../npm/dist/trinity/shader/index.js";

test("variable records remove model behavior and retain exact native base/query distinctions", () =>
{
  for (const Type of [Tr2ExpressionTermInfo, TriFloat])
    assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal(Object.getPrototypeOf(TriVariable.prototype), ITr2EffectValue.prototype);
  for (const Type of [Tr2ExpressionTermInfo, TriFloat, TriVariable])
  {
    assert.deepEqual([...mappedInterfaces(Type)], [Type]);
    assert.equal(CjsSchema.cast(new Type(), IInitialize), null);
    for (const method of ["SetValues", "UpdateValues", "OnEvent", "Traverse", "GetResources"])
      assert.equal(method in new Type(), false, Type.name + "." + method);
  }
  const variable = new TriVariable();
  assert.equal(CjsSchema.cast(variable, ITr2EffectValue), variable);
  assert.equal(mappedInterfaces(TriVariable).has(ITr2EffectValue), false);
});

test("canonical effect-value interface preserves native inert defaults and resource flags", () =>
{
  const value = new ITr2EffectValue(), bytes = [1, 2], resources = {};
  assert.equal(CjsSchema.GetConstructor("ITr2EffectValue"), ITr2EffectValue);
  assert.equal(value.CopyValueToEffect(0, bytes, 8, {}), undefined);
  assert.deepEqual(bytes, [1, 2]);
  assert.equal(value.CopyToResourceSet(resources, 0, 1, 0), false);
  assert.equal(value.ApplyUav(resources, 0, 1), false);
  assert.equal(value.AddUsedTexture(resources), undefined);
  assert.deepEqual(resources, {});
  assert.deepEqual(ResourceFlags, { RESOURCE_FLAG_NONE: 0, RESOURCE_FLAG_SRGB: 1 });
});

test("term and float declarations retain native order and persistence flags", () =>
{
  const members = CjsSchema.getSchema(Tr2ExpressionTermInfo).members;
  assert.deepEqual(members.map(field => field.name), ["type", "category", "name", "description"]);
  for (const member of members)
  {
    assert.equal(member.edit.read, true);
    assert.equal(member.edit.write, true);
    assert.notEqual(member.edit.persist, true);
  }
  assert.equal(CjsSchema.getField(TriFloat, "value").type.kind, "float32");
  assert.equal(CjsSchema.getField(TriFloat, "value").edit.persist, true);
  assert.equal(new TriFloat().value, 0);
  assert.deepEqual(Tr2ExpressionTermInfo.TermType, { VARIABLE: 0, FUNCTION: 1, STRING_FUNCTION: 2 });
});

test("lowercamel term factories retain argument isolation and native categories", () =>
{
  const variable = Tr2ExpressionTermInfo.variable("Math", "Time", "Clock");
  const fn = Tr2ExpressionTermInfo.function("Math", "Clamp", "x", "min", "max", "Clamp value");
  const string = Tr2ExpressionTermInfo.stringFunction("Object", "Find", "name", "Find by name");
  assert.equal(variable.type, Tr2ExpressionTermInfo.TermType.VARIABLE);
  assert.equal(fn.type, Tr2ExpressionTermInfo.TermType.FUNCTION);
  assert.equal(string.type, Tr2ExpressionTermInfo.TermType.STRING_FUNCTION);
  assert.deepEqual(variable.GetArguments(), []);
  assert.deepEqual(fn.GetArguments(), ["x", "min", "max"]);
  fn.GetArguments().push("caller change");
  assert.deepEqual(fn.GetArguments(), ["x", "min", "max"]);
  assert.deepEqual(string.GetArguments(), ["name"]);
  assert.equal(Tr2ExpressionTermInfo.Function, undefined);
  assert.equal(Tr2ExpressionTermInfo.Variable, undefined);
  assert.equal(Tr2ExpressionTermInfo.StringFunction, undefined);
});

test("declared reader populates term metadata without inventing persisted arguments", () =>
{
  const term = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2ExpressionTermInfo", name: "Sample", category: "Math", type: 1, description: "Help" });
  assert.equal(term.name, "Sample");
  assert.equal(term.type, 1);
  assert.deepEqual(term.GetArguments(), []);
  const authored = Tr2ExpressionTermInfo.function("Math", "Fn", "a", "help");
  const copy = new Copier().CopyTo(authored);
  assert.equal(copy.name, "");
  assert.deepEqual(copy.GetArguments(), []);
});

test("float reader and Copier keep scalar storage independent", () =>
{
  const source = new DictReader({ declarations: true }).CreateObject({ _type: "TriFloat", value: 12 });
  const copy = new Copier().CopyTo(source);
  assert.equal(CjsSchema.cast(copy, TriFloat), copy);
  assert.equal(copy.value, 12);
  copy.value = 20;
  assert.equal(source.value, 12);
  assert.deepEqual(GetResources(copy), []);
});

test("real variable store retains model-free local value behavior and native value size", () =>
{
  const store = new Tr2VariableStore();
  const variable = store.RegisterVariable("phase2LocalFloat", 2.5);
  assert.equal(CjsSchema.cast(variable, TriVariable), variable);
  assert.equal(variable.GetValue(), 2.5);
  assert.equal(variable.GetType(), TriVariable.ContentType.TRIVARIABLE_FLOAT);
  assert.equal(variable.GetValueSize(), 4);
  assert.equal(variable.GetValueSize(), variable.GetTypeSize());
  variable.SetValue(8);
  assert.equal(variable.GetValue(), 8);
  assert.equal(variable.GetType(), TriVariable.ContentType.TRIVARIABLE_FLOAT);
  variable.Clear();
  assert.equal(variable.GetValue(), 0);
  variable.Invalidate();
  assert.equal(variable.GetValue(), null);
  assert.equal(variable.GetValueSize(), 64);
});

test("variable constant copying preserves matrix transposition and byte limits", () =>
{
  const variable = new TriVariable();
  variable.contentType = TriVariable.ContentType.TRIVARIABLE_FLOAT4X4;
  variable.SetValue(Array.from({ length: 16 }, (_, index) => index + 1));
  const destination = [0, 0, 0, 0, 0, 0];
  assert.equal(variable.CopyValueToEffect(0, destination, 16), true);
  assert.deepEqual(destination, [1, 5, 9, 13, 0, 0]);
  assert.equal(TriVariable.getTypeName(variable.GetType()), "TRIVARIABLE_FLOAT4X4");
  assert.equal(TriVariable.getTypeSize(variable.GetType()), 64);
  assert.equal(TriVariable.GetTypeSize, undefined);
});

test("variable resource adapter preserves binding while its discovery gap remains explicit", () =>
{
  const variable = new TriVariable(), texture = {}, provider = { isResource: true, GetTexture: () => texture };
  variable.contentType = TriVariable.ContentType.TRIVARIABLE_TEXTURE_RES;
  variable.SetValue(provider);
  const calls = [], resourceDesc = { SetSrv: (...args) => { calls.push(args); return true; } };
  assert.equal(variable.CopyToResourceSet(resourceDesc, 1, 2, 0), true);
  assert.equal(calls[0][2], texture);
  assert.deepEqual(GetResources(variable), [], "held mixed-slot discovery gap; no false conditional descriptor");
  const copy = new Copier().CopyTo(variable);
  assert.equal(copy.value, null);
  variable.Clear();
  assert.equal(variable.value, null);
});
