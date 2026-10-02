import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { blue, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { EveSOFDataParameter as Parameter } from "../../../npm/dist/sof/shared/EveSOFDataParameter.js";
import { EveSOFDataParameterBool as Bool } from "../../../npm/dist/sof/shared/EveSOFDataParameterBool.js";
import { EveSOFDataParameterInt as Int } from "../../../npm/dist/sof/shared/EveSOFDataParameterInt.js";
import { EveSOFDataParameterFloat as Float } from "../../../npm/dist/sof/shared/EveSOFDataParameterFloat.js";
import { EveSOFDataParameterVector2 as Vector2 } from "../../../npm/dist/sof/shared/EveSOFDataParameterVector2.js";
import { EveSOFDataParameterVector3 as Vector3 } from "../../../npm/dist/sof/shared/EveSOFDataParameterVector3.js";
import { EveSOFDataParameterColor as Color } from "../../../npm/dist/sof/shared/EveSOFDataParameterColor.js";
import { EveSOFDataAreaMaterial as AreaMaterial } from "../../../npm/dist/sof/shared/EveSOFDataAreaMaterial.js";
import { EveSOFDataMaterial } from "../../../npm/dist/sof/shared/EveSOFDataMaterial.js";
import { EveSOFDataArea } from "../../../npm/dist/sof/shared/EveSOFDataArea.js";
import { EveSOFDataGeneric } from "../../../npm/dist/sof/generic/EveSOFDataGeneric.js";
import { EveSOFData } from "../../../npm/dist/sof/EveSOFData.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/EveSOFDataMgr.js";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";

const cases = [
  [Parameter, "vec4", [1, 2, 3, 4], [1, 2, 3, 4]],
  [Bool, "boolean", true, [1, 1, 1, 1]],
  [Int, "int32", -7, [-7, -7, -7, -7]],
  [Float, "float32", 0.5, [0.5, 0.5, 0.5, 0.5]],
  [Vector2, "vec2", [2, 3], [2, 3, 0, 0]],
  [Vector3, "vec3", [2, 3, 4], [2, 3, 4, 0]],
  [Color, "color", [0.25, 0.5, 0.75, 1], [0.25, 0.5, 0.75, 1]]
];

function parameters()
{
  const adapter = createSofHydrationAdapter();
  return cases.map(([Class, , value], index) => {
    const record = new Class(); adapter.applyValues(record, {name: "P" + index, value});
    adapter.finalize(record, {kind: CjsSchema.getClassName(Class)}); return record;
  });
}

function areaMaterial()
{
  const record = new AreaMaterial(), adapter = createSofHydrationAdapter();
  adapter.applyValues(record, {material1: "steel", material2: "paint", material3: "glass", material4: "trim", colorType: 0});
  adapter.finalize(record, {kind: "EveSOFDataAreaMaterial"}); return record;
}

test("plain SOF bases and all typed parameters retain exact native self and base queries", () =>
{
  for (const Class of [Parameter, AreaMaterial, ...cases.slice(1).map(item => item[0])])
  {
    const record = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    const typed = Class !== Parameter && Class !== AreaMaterial;
    assert.equal(Object.getPrototypeOf(Class.prototype), typed ? Parameter.prototype : Object.prototype);
    assert.deepEqual([...mappedInterfaces(Class)], typed ? [Class, Parameter] : [Class]);
    assert.equal(CjsSchema.cast(record, Class), record);
    if (typed) assert.equal(CjsSchema.cast(record, Parameter), record);
    assert.equal(CjsSchema.cast(record, IInitialize), null); assert.equal(CjsSchema.cast(record, INotify), null);
    for (const name of ["Copy", "GetValues", "SetValues", "Clone", "OnEvent", "__state"]) assert.equal(name in record, false);
    assert.equal("from" in Class, false); assert.deepEqual(GetResources(record), []);
  }
});

test("native declarations and independent defaults preserve typed values and material chooser", () =>
{
  assert.deepEqual(CjsSchema.getSchema(Parameter).members.map(field => field.name), ["name", "value"]);
  for (const [Class, kind] of cases)
  {
    const a = new Class(), b = new Class(); assert.equal(a.name, "");
    assert.equal(CjsSchema.getField(Class, "value").type.kind, kind);
    assert.deepEqual(Array.from(a.GetValue()), [0, 0, 0, 0]);
    if (ArrayBuffer.isView(a.value)) assert.notEqual(a.value, b.value);
    const fields = CjsSchema.getSchema(Class).members;
    assert.deepEqual([...new Set(fields.map(field => field.name))].sort(), ["name", "value"]);
    for (const field of fields) assert.deepEqual(field.edit, {read: true, write: true, persist: true});
  }
  assert.deepEqual(CjsSchema.getSchema(AreaMaterial).members.map(field => field.name), ["material1", "material2", "material3", "material4", "colorType"]);
  const area = new AreaMaterial(); assert.equal(area.colorType, 12);
  for (const name of ["material1", "material2", "material3", "material4"]) assert.equal(area[name], "");
  assert.equal(CjsSchema.getField(AreaMaterial, "colorType").enum.identity, "trinity.SOFDataFactionColorChooser.ColorType");
  assert.equal(CjsSchema.getField(AreaMaterial, "colorType").enum.members, AreaMaterial.ColorType);
  assert.deepEqual(AreaMaterial.MaterialType, {MATERIAL1: 0, MATERIAL2: 1, MATERIAL3: 2, MATERIAL4: 3, MATERIAL_MAX: 4});
});

test("actual hydration and virtual Assign preserve every typed conversion and independent return values", () =>
{
  const records = parameters();
  records.forEach((record, index) => {
    const expected = cases[index][3], vector = record.GetValue();
    assert.deepEqual(Array.from(vector), expected);
    assert.deepEqual(record.Assign({}, "Prefix"), {["PrefixP" + index]: expected});
    vector[0] = 99; assert.deepEqual(Array.from(record.GetValue()), expected);
  });
  assert.equal(areaMaterial().Assign().colorType, 0);
});

test("Blue roundtrip and copier retain concrete typed payloads and independent buffers", () =>
{
  for (const record of [...parameters(), areaMaterial()])
  {
    const values = new DictWriter().WriteObject(record, {}, {persistOnly: true, forceTypeTags: true});
    if (record.constructor !== AreaMaterial) assert.deepEqual(Object.keys(values).sort(), ["_type", "name", "value"]);
    for (const copy of [new DictReader({declarations: true}).CreateObject(values), new Copier().CloneTo(record)])
    {
      assert.equal(copy.constructor, record.constructor); assert.deepEqual(copy.Assign(), record.Assign());
      if (ArrayBuffer.isView(record.value)) assert.notEqual(copy.value, record.value);
      for (const field of CjsSchema.getSchema(record.constructor).members)
      {
        assert.ok(Object.hasOwn(values, field.name), field.name + " is persisted");
        assert.deepEqual(copy[field.name], record[field.name]);
      }
    }
  }
});

test("material AssignParameters and Blue copy/values retain typed parameter children", () =>
{
  const owner = new EveSOFDataMaterial(); owner.name = "testMaterial"; owner.parameters.push(...parameters());
  const copy = new EveSOFDataMaterial(); new Copier().CopyTo(owner, copy);
  const assigned = copy.AssignParameters({}, "Prefix"), values = new DictWriter().WriteObject(copy, {}, {refs: true, forceTypeTags: true});
  cases.forEach(([Class, , input, projected], index) => {
    assert.equal(copy.parameters[index].constructor, Class); assert.notEqual(copy.parameters[index], owner.parameters[index]);
    if (ArrayBuffer.isView(owner.parameters[index].value)) assert.notEqual(copy.parameters[index].value, owner.parameters[index].value);
    assert.deepEqual(assigned["PrefixP" + index], projected);
    assert.deepEqual(values.parameters[index].value, input);
  });
});

test("vector-record composition retains name filtering, overrides and reusable independent storage", () =>
{
  const [base] = parameters(), override = new Parameter(); override.name = base.name; override.value.set([4, 3, 2, 1]);
  const ignored = new Parameter(); ignored.name = "ignored";
  const stale = new Parameter(); stale.name = "stale";
  const reused = new Parameter(); reused.name = base.name; const out = [stale, reused];
  assert.equal(Parameter.combineArrays([base], [override, ignored], out), out);
  assert.deepEqual(out.map(record => record.name), [base.name]); assert.equal(out[0], reused);
  assert.deepEqual(Array.from(out[0].GetValue()), [4, 3, 2, 1]); assert.notEqual(out[0].value, override.value);
  override.value[0] = 99; assert.equal(out[0].value[0], 4);
  Parameter.combineArrays([base], null, out); assert.deepEqual(Array.from(out[0].GetValue()), [1, 2, 3, 4]);
});

test("area material helpers and Blue area copy/values preserve zero selectors and slot overrides", () =>
{
  const base = areaMaterial(), overrides = new AreaMaterial(); overrides.colorType = 0; overrides.material2 = "override";
  base.colorType = 12;
  const reused = new AreaMaterial(); assert.equal(AreaMaterial.combine(base, overrides, reused), reused);
  assert.deepEqual(reused.Assign(), {colorType: 0, material1: "steel", material2: "override", material3: "glass", material4: "trim"});
  assert.equal(AreaMaterial.combine(null, overrides), null);
  assert.deepEqual(new AreaMaterial().Assign({material1: "keep"}), {material1: "keep", colorType: 12});
  const owner = new EveSOFDataArea(); owner.Primary = reused;
  const copy = new EveSOFDataArea(); new Copier().CopyTo(owner, copy);
  assert.equal(copy.Primary.constructor, AreaMaterial); assert.notEqual(copy.Primary, reused);
  assert.equal(copy.Get(0), copy.Primary);
  const values = new DictWriter().WriteObject(copy, {}, {refs: true, forceTypeTags: true}); assert.equal(values.Primary.material2, "override"); assert.equal(values.Primary.colorType, 0);
});

test("actual manager projects typed parameter vec4s and generic wreck material slots", () =>
{
  const material = new EveSOFDataMaterial(); material.name = "testMaterial"; material.parameters.push(...parameters());
  const data = new EveSOFData(); data.material.push(material); data.generic = new EveSOFDataGeneric(); data.generic.genericWreckMaterial = areaMaterial();
  const manager = new EveSOFDataMgr(); assert.equal(manager.SetData(data), true);
  const projected = manager.GetMaterialData("testMaterial");
  cases.forEach(([, , , value], index) => assert.deepEqual(Array.from(projected.parameters.get("P" + index)), value));
  const wreck = manager.GetGenericData().genericWreckMaterialData;
  assert.deepEqual([...wreck.materialNames], [["5:0", "steel"], ["5:1", "paint"], ["5:2", "glass"], ["5:3", "trim"]]);
  assert.equal(wreck.glowColor.get("5:GeneralGlowColor"), 0);
});
