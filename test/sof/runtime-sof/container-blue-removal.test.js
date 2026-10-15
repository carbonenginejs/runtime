import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { be, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
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

const areaNames = ["Primary", "Glass", "Sails", "Reactor", "Darkhull", "Rock", "Monument", "Ornament", "SimplePrimary", "Turret"];
const areaIndices = {Primary: 0, Glass: 1, Sails: 2, Reactor: 3, Darkhull: 4, Rock: 6, Monument: 7, Ornament: 8, SimplePrimary: 9, Turret: 10};

function records()
{
  const material = new Material(), area = new Area();
  CjsSchema.setValues(material, {name: "testMaterial", parameters: [
    {_type: "EveSOFDataParameter", name: "Paint", value: [1, 2, 3, 4]},
    {_type: "EveSOFDataParameterFloat", name: "Roughness", value: 0.5},
    {_type: "EveSOFDataParameterVector2", name: "Scale", value: [2, 3]}
  ]});
  CjsSchema.setValues(area, {Primary: {material1: "testMaterial", material2: "paint", colorType: 0}, Turret: {material4: "trim", colorType: 12}});
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
    const record = be.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
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
    assert.deepEqual(field.edit, {read: true, write: true, persist: true});
    assert.equal(field.key, "materials"); assert.equal(field.index, areaIndices[field.name]);
  }
  assert.deepEqual(new Area().materials, new Array(Area.AreaType.TYPE_MAX).fill(null));
  assert.equal(CjsSchema.getSchema(Area).members.some(field => field.index === Area.AreaType.TYPE_WRECK), false);
  assert.equal(Area.AreaType.TYPE_WRECK, 5); assert.equal(Area.AreaType.TYPE_NO_OVERWRITE, 11); assert.equal(Area.AreaType.TYPE_MAX, 11);
  const info = be.enums.GetEnumInfo("trinity.EveSOFDataArea.AreaType");
  assert.equal(be.enums.GetEnum("trinity.EveSOFDataArea.AreaType"), Area.AreaType);
  assert.equal(info.exposedName, "EveSOFDataAreaType");
  assert.deepEqual(info.chooser.map(value => value.name), ["Primary", "Glass", "Sails", "Reactor", "Darkhull", "Wreck", "Rock", "Monument", "Ornament", "SimplePrimary", "Turret", "NoOverwrite"]);
});

test("actual hydration creates model-free containers and concrete typed authored children", () =>
{
  const {material, area} = records();
  assert.deepEqual(material.parameters.map(record => record.constructor), [Parameter, Float, Vector2]);
  assert.equal(area.materials[0].constructor, AreaMaterial); assert.equal(area.materials[10].constructor, AreaMaterial);
  assert.equal(area.materials[0].material1, "testMaterial"); assert.equal(area.materials[0].colorType, 0);
  assert.equal(area.materials[1], null); assert.deepEqual(GetResources(area), []);
  assert.equal("Copy" in material.parameters[0], false); assert.equal("Copy" in area.materials[0], false);
});

test("retained material helper forwards prefix and virtual parameter conversion with independent output", () =>
{
  const {material} = records(), out = {Existing: [8]};
  assert.equal(material.AssignParameters(out, "M1"), out);
  assert.deepEqual(out, {Existing: [8], M1Paint: [1, 2, 3, 4], M1Roughness: [0.5, 0.5, 0.5, 0.5], M1Scale: [2, 3, 0, 0]});
  out.M1Paint[0] = 99; assert.equal(material.parameters[0].value[0], 1);
});

test("faction area lookup indexes m_materials by AreaType, as Carbon does", () =>
{
  const {area, faction} = catalog(), {AreaType} = Area;
  assert.equal(faction.areaTypes.materials[AreaType.TYPE_PRIMARY], area.materials[0]);
  assert.equal(faction.areaTypes.materials[AreaType.TYPE_TURRET].material4, "trim");
  for (const index of [1, AreaType.TYPE_WRECK]) assert.equal(faction.areaTypes.materials[index], null);
  for (const name of ["GetTypeByIndex", "Has", "Get"]) assert.equal(name in area, false);
  for (const name of ["HasAreaType", "GetAreaType"]) assert.equal(name in faction, false);
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
        assert.equal(copy.materials[0].constructor, AreaMaterial); assert.notEqual(copy.materials[0], record.materials[0]);
        assert.deepEqual(copy.materials[0].Assign(), record.materials[0].Assign()); assert.equal(copy.materials[10].material4, "trim");
        assert.equal(copy.materials[1], null);
      }
      // Empty area slots are not persisted; every other member is.
      for (const field of CjsSchema.getSchema(record.constructor).members)
      {
        const empty = field.index !== undefined && record[field.key][field.index] === null;
        assert.equal(Object.hasOwn(values, field.name), !empty, field.name + (empty ? " is omitted" : " is persisted"));
      }
      assert.equal("materials" in values, false);
    }
  }
});

test("actual catalog schema copy and export preserve model-free containers and typed children", () =>
{
  const {data, material, area} = catalog(), copy = new EveSOFData();
  // Existing type-tags option is required for polymorphic base-declared lists.
  CjsSchema.copy(copy, data, {typeTags: true});
  assert.equal(copy.material[0].constructor, Material); assert.notEqual(copy.material[0], material);
  assert.equal(copy.material[0].parameters[2].constructor, Vector2); assert.notEqual(copy.material[0].parameters[2].value, material.parameters[2].value);
  assert.equal(copy.faction[0].areaTypes.constructor, Area); assert.notEqual(copy.faction[0].areaTypes, area);
  assert.equal(copy.faction[0].areaTypes.materials[0].constructor, AreaMaterial); assert.notEqual(copy.faction[0].areaTypes.materials[0], area.materials[0]);
  const values = CjsSchema.getValues(copy, {}, {refs: true, forceTypeTags: true});
  assert.deepEqual(values.material[0].parameters[2].value, [2, 3]); assert.equal(values.material[0].parameters[1].value, 0.5);
  assert.equal(values.faction[0].areaTypes.Primary.material1, "testMaterial"); assert.equal(values.faction[0].areaTypes.Primary.colorType, 0);
  assert.deepEqual(Object.keys(values.faction[0].areaTypes).filter(key => !key.startsWith("_")), ["Primary", "Turret"]);
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
