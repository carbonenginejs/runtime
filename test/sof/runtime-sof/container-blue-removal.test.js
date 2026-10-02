import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { blue, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { EveSOFDataMaterial as Material } from "../../../npm/dist/sof/shared/EveSOFDataMaterial.js";
import { EveSOFDataArea as Area } from "../../../npm/dist/sof/shared/EveSOFDataArea.js";
import { EveSOFDataParameter as Parameter } from "../../../npm/dist/sof/shared/EveSOFDataParameter.js";
import { EveSOFDataParameterFloat as Float } from "../../../npm/dist/sof/shared/EveSOFDataParameterFloat.js";
import { EveSOFDataParameterVector2 as Vector2 } from "../../../npm/dist/sof/shared/EveSOFDataParameterVector2.js";
import { EveSOFDataAreaMaterial as AreaMaterial } from "../../../npm/dist/sof/shared/EveSOFDataAreaMaterial.js";
import { EveSOFDataFaction } from "../../../npm/dist/sof/faction/EveSOFDataFaction.js";
import { EveSOFData } from "../../../npm/dist/sof/EveSOFData.js";
import { EveSOFDataGeneric } from "../../../npm/dist/sof/generic/EveSOFDataGeneric.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/EveSOFDataMgr.js";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";

const areaNames = ["Primary", "Glass", "Sails", "Reactor", "Darkhull", "Rock", "Monument", "Ornament", "SimplePrimary", "Turret"];

function records()
{
  const adapter = createSofHydrationAdapter(), material = new Material(), area = new Area();
  adapter.applyValues(material, {name: "testMaterial", parameters: [
    {_type: "EveSOFDataParameter", name: "Paint", value: [1, 2, 3, 4]},
    {_type: "EveSOFDataParameterFloat", name: "Roughness", value: 0.5},
    {_type: "EveSOFDataParameterVector2", name: "Scale", value: [2, 3]}
  ]});
  adapter.applyValues(area, {Primary: {material1: "testMaterial", material2: "paint", colorType: 0}, Turret: {material4: "trim", colorType: 12}});
  for (const record of [material, area]) adapter.finalize(record, {kind: CjsSchema.getClassName(record.constructor)});
  return {material, area};
}

function catalog()
{
  const {material, area} = records(), data = new EveSOFData(), faction = new EveSOFDataFaction();
  faction.name = "testFaction"; faction.areaTypes = area; data.material.push(material); data.faction.push(faction); data.generic = new EveSOFDataGeneric();
  return {data, material, area, faction};
}

test("SOF material and area containers expose native self-only tables without model helpers", () =>
{
  for (const Class of [Material, Area])
  {
    const record = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    assert.equal(record.constructor, Class); assert.equal(Object.getPrototypeOf(Class.prototype), Object.prototype);
    assert.deepEqual([...mappedInterfaces(Class)], [Class]); assert.equal(CjsSchema.cast(record, Class), record);
    assert.equal(CjsSchema.cast(record, IInitialize), null); assert.equal(CjsSchema.cast(record, INotify), null);
    for (const name of ["Copy", "GetValues", "SetValues", "Clone", "OnEvent", "__state"]) assert.equal(name in record, false);
    assert.equal("from" in Class, false); assert.deepEqual(GetResources(record), []);
  }
});

test("native declaration order and area chooser preserve omitted Wreck slot and no-overwrite alias", () =>
{
  assert.deepEqual(CjsSchema.getSchema(Material).members.map(field => field.name), ["name", "parameters"]);
  assert.deepEqual(CjsSchema.getField(Material, "name").edit, {read: true, write: true, persist: true});
  assert.equal(CjsSchema.getField(Material, "parameters").edit.read, true);
  assert.equal(CjsSchema.getField(Material, "parameters").edit.write === true, false);
  assert.equal(CjsSchema.getField(Material, "parameters").edit.persist, true);
  assert.notEqual(new Material().parameters, new Material().parameters); assert.equal(new Material().name, "");
  assert.deepEqual(CjsSchema.getSchema(Area).members.map(field => field.name), areaNames);
  for (const field of CjsSchema.getSchema(Area).members)
  {
    assert.deepEqual(field.edit, {read: true, write: true, persist: true}); assert.equal(new Area()[field.name], null);
  }
  assert.equal("Wreck" in new Area(), false); assert.equal(Area.Types[5], null); assert.equal(Object.isFrozen(Area.Types), false);
  assert.equal(Area.AreaType.TYPE_WRECK, 5); assert.equal(Area.AreaType.TYPE_NO_OVERWRITE, 11); assert.equal(Area.AreaType.TYPE_MAX, 11);
  const info = blue.enums.GetEnumInfo("trinity.EveSOFDataArea.AreaType");
  assert.equal(blue.enums.GetEnum("trinity.EveSOFDataArea.AreaType"), Area.AreaType);
  assert.equal(info.exposedName, "EveSOFDataAreaType");
  assert.deepEqual(info.chooser.map(value => value.name), ["Primary", "Glass", "Sails", "Reactor", "Darkhull", "Wreck", "Rock", "Monument", "Ornament", "SimplePrimary", "Turret", "NoOverwrite"]);
});

test("actual hydration creates model-free containers and concrete typed authored children", () =>
{
  const {material, area} = records();
  assert.deepEqual(material.parameters.map(record => record.constructor), [Parameter, Float, Vector2]);
  assert.equal(area.Primary.constructor, AreaMaterial); assert.equal(area.Turret.constructor, AreaMaterial);
  assert.equal(area.Primary.material1, "testMaterial"); assert.equal(area.Primary.colorType, 0);
  assert.equal(area.Glass, null); assert.deepEqual(GetResources(area), []);
  assert.equal("Copy" in material.parameters[0], false); assert.equal("Copy" in area.Primary, false);
});

test("retained material helper forwards prefix and virtual parameter conversion with independent output", () =>
{
  const {material} = records(), out = {Existing: [8]};
  assert.equal(material.AssignParameters(out, "M1"), out);
  assert.deepEqual(out, {Existing: [8], M1Paint: [1, 2, 3, 4], M1Roughness: [0.5, 0.5, 0.5, 0.5], M1Scale: [2, 3, 0, 0]});
  out.M1Paint[0] = 99; assert.equal(material.parameters[0].value[0], 1);
});

test("actual faction lookup uses preserved area helpers and fallback behavior", () =>
{
  const {area, faction} = catalog();
  assert.equal(area.GetTypeByIndex(0), area.Primary); assert.equal(area.Has(0), true); assert.equal(area.Get(10), area.Turret);
  for (const index of [1, 5, 11, -1, 99])
  {
    assert.equal(area.GetTypeByIndex(index), null); assert.equal(area.Has(index), false); assert.throws(() => area.Get(index));
  }
  assert.equal(faction.HasAreaType(0), true); assert.equal(faction.GetAreaType(0), area.Primary);
  assert.equal(faction.GetAreaType(5, 10), area.Turret); assert.equal(faction.GetAreaType(5), null);
});

test("Blue copy and persisted roundtrip preserve material parameter types and area records", () =>
{
  for (const record of Object.values(records()))
  {
    const values = new DictWriter().WriteObject(record, {}, {persistOnly: true, forceTypeTags: true});
    for (const copy of [new DictReader({declarations: true}).CreateObject(values), new Copier().CloneTo(record)])
    {
      assert.equal(copy.constructor, record.constructor);
      if (record.constructor === Material)
      {
        assert.deepEqual(copy.AssignParameters(), record.AssignParameters());
        assert.equal(copy.parameters[1].constructor, Float); assert.equal(copy.parameters[2].constructor, Vector2);
        assert.notEqual(copy.parameters[0], record.parameters[0]); assert.notEqual(copy.parameters[0].value, record.parameters[0].value);
      }
      else
      {
        assert.equal(copy.Primary.constructor, AreaMaterial); assert.notEqual(copy.Primary, record.Primary);
        assert.deepEqual(copy.Primary.Assign(), record.Primary.Assign()); assert.equal(copy.Turret.material4, "trim");
      }
      for (const field of CjsSchema.getSchema(record.constructor).members) assert.ok(Object.hasOwn(values, field.name), field.name + " is persisted");
    }
  }
});

test("actual catalog Copy and GetValues preserve model-free containers and typed children", () =>
{
  const {data, material, area} = catalog(), copy = new EveSOFData();
  // Existing type-tags option is required for polymorphic base-declared lists.
  copy.Copy(data, {typeTags: true});
  assert.equal(copy.material[0].constructor, Material); assert.notEqual(copy.material[0], material);
  assert.equal(copy.material[0].parameters[2].constructor, Vector2); assert.notEqual(copy.material[0].parameters[2].value, material.parameters[2].value);
  assert.equal(copy.faction[0].areaTypes.constructor, Area); assert.notEqual(copy.faction[0].areaTypes, area);
  assert.equal(copy.faction[0].GetAreaType(0).constructor, AreaMaterial); assert.notEqual(copy.faction[0].GetAreaType(0), area.Primary);
  const values = copy.GetValues({refs: true, forceTypeTags: true});
  assert.deepEqual(values.material[0].parameters[2].value, [2, 3]); assert.equal(values.material[0].parameters[1].value, 0.5);
  assert.equal(values.faction[0].areaTypes.Primary.material1, "testMaterial"); assert.equal(values.faction[0].areaTypes.Primary.colorType, 0);
});

test("actual manager consumes model-free material and faction area containers", () =>
{
  const {data} = catalog(), manager = new EveSOFDataMgr(); assert.equal(manager.SetData(data), true);
  const material = manager.GetMaterialData("testMaterial");
  assert.deepEqual(material.parameters.get("Paint"), [1, 2, 3, 4]); assert.deepEqual(material.parameters.get("Scale"), [2, 3, 0, 0]);
  assert.deepEqual(material.parameters.get("Roughness"), [0.5, 0.5, 0.5, 0.5]);
  const area = manager.GetFactionData("testFaction").areaMaterials;
  assert.equal(area.materialNames.get("0:0"), "testMaterial"); assert.equal(area.materialNames.get("0:1"), "paint");
  assert.equal(area.materialNames.get("10:3"), "trim"); assert.equal(area.glowColor.get("0:GeneralGlowColor"), 0);
  assert.equal(area.materialNames.has("5:0"), false);
});
