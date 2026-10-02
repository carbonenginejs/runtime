import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { blue, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { ReflectionMode } from "../../../npm/dist/global/consts/graphics/index.js";
import { EveSOFDataVisibilityGroup as Visibility } from "../../../npm/dist/sof/generic/EveSOFDataVisibilityGroup.js";
import { EveSOFDataGenericHullCategory as Category } from "../../../npm/dist/sof/generic/EveSOFDataGenericHullCategory.js";
import { EveSOFDataGenericHullDamage as Damage } from "../../../npm/dist/sof/generic/EveSOFDataGenericHullDamage.js";
import { EveSOFDataGeneric } from "../../../npm/dist/sof/generic/EveSOFDataGeneric.js";
import { EveSOFData } from "../../../npm/dist/sof/EveSOFData.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/EveSOFDataMgr.js";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";

const damageValues = {
  hullParticleRate: 7, hullParticleAngle: 2, hullParticleColorMidpoint: 0.75,
  hullParticleInnerAngle: 1, hullParticleMinMaxSpeed: [4, 8],
  hullParticleMinMaxLifeTime: [2, 6], hullParticleSizes: [1, 2, 3, 4],
  hullParticleColor0: [1, 0, 0, 0.5], hullParticleColor1: [0, 1, 0, 0.25],
  hullParticleColor2: [0, 0, 1, 0.75], hullParticleColor3: [1, 1, 1, 1],
  hullParticleTextureIndex: 3, hullParticleVelocityStretchRotation: 4,
  hullParticleDrag: 0.5, hullParticleTurbulenceAmplitude: 6,
  hullParticleTurbulenceFrequency: 8
};

function records()
{
  const adapter = createSofHydrationAdapter();
  const visibility = new Visibility(), category = new Category(), damage = new Damage();
  adapter.applyValues(visibility, {name: "engine", description: "Engine geometry"});
  adapter.applyValues(category, {name: "frigate", reflectionMode: ReflectionMode.REFLECT_HIGH});
  adapter.applyValues(damage, damageValues);
  for (const record of [visibility, category, damage]) adapter.finalize(record, {kind: CjsSchema.getClassName(record.constructor)});
  return {visibility, category, damage};
}

test("generic SOF records construct without model APIs and expose self-only native tables", () =>
{
  for (const Class of [Visibility, Category, Damage])
  {
    const record = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    assert.equal(record.constructor, Class);
    assert.equal(Object.getPrototypeOf(Class.prototype), Object.prototype);
    for (const name of ["GetValues", "SetValues", "Copy", "Clone", "OnEvent", "__state"]) assert.equal(name in record, false);
    assert.equal("from" in Class, false);
    assert.deepEqual([...mappedInterfaces(Class)], [Class]);
    assert.equal(CjsSchema.cast(record, Class), record);
    assert.equal(CjsSchema.cast(record, IInitialize), null);
    assert.equal(CjsSchema.cast(record, INotify), null);
    assert.deepEqual(GetResources(record), []);
  }
});

test("native exposure order, persistence flags and reflection chooser survive model removal", () =>
{
  const names = Class => CjsSchema.getSchema(Class).members.map(field => field.name);
  assert.deepEqual(names(Visibility), ["name", "description"]);
  assert.deepEqual(names(Category), ["name", "reflectionMode"]);
  assert.deepEqual(names(Damage), Object.keys(damageValues));
  for (const Class of [Visibility, Category, Damage])
    for (const field of CjsSchema.getSchema(Class).members)
      assert.deepEqual(field.edit, field.name === "reflectionMode" ? {read: true, write: true, persist: true, enum: true} : {read: true, write: true, persist: true});
  const field = CjsSchema.getField(Category, "reflectionMode");
  assert.equal(field.enum.identity, "trinity.EntityComponents.ReflectionMode");
  assert.equal(field.enum.members, ReflectionMode);
  assert.equal(Category.ReflectionMode, ReflectionMode);
  assert.deepEqual(field.enum.chooser.map(entry => entry.name), ["Never", "LowMediumAndHigh", "MediumAndHigh", "High"]);
});

test("native construction defaults include zero alpha, midpoint and frequency with independent storage", () =>
{
  assert.equal(new Visibility().name, "");
  assert.equal(new Visibility().description, "");
  assert.equal(new Category().name, "");
  assert.equal(new Category().reflectionMode, 3);
  const a = new Damage(), b = new Damage();
  for (const [name, sample] of Object.entries(damageValues))
  {
    if (Array.isArray(sample))
    {
      assert.deepEqual(Array.from(a[name]), Array(sample.length).fill(0));
      assert.notEqual(a[name], b[name]);
      a[name][0] = 9;
      assert.equal(b[name][0], 0);
    }
    else assert.equal(a[name], name === "hullParticleColorMidpoint" ? 0.5 : name === "hullParticleTurbulenceFrequency" ? 1 : 0);
  }
});

test("real SOF hydration adapter populates every record without model helpers", () =>
{
  const {visibility, category, damage} = records();
  assert.equal(visibility.name, "engine");
  assert.equal(visibility.description, "Engine geometry");
  assert.equal(category.name, "frigate");
  assert.equal(category.reflectionMode, ReflectionMode.REFLECT_HIGH);
  for (const [name, value] of Object.entries(damageValues))
    assert.deepEqual(Array.isArray(value) ? Array.from(damage[name]) : damage[name], value);
});

test("Blue writer, reader and copier roundtrip persisted records and independent vectors", () =>
{
  for (const record of Object.values(records()))
  {
    const values = new DictWriter().WriteObject(record, {}, {persistOnly: true, forceTypeTags: true});
    const roundtrip = new DictReader({declarations: true}).CreateObject(values);
    const clone = new Copier().CloneTo(record);
    assert.equal(roundtrip.constructor, record.constructor);
    assert.equal(clone.constructor, record.constructor);
    for (const field of CjsSchema.getSchema(record.constructor).members)
    {
      assert.ok(Object.hasOwn(values, field.name), field.name + " is persisted");
      assert.deepEqual(roundtrip[field.name], record[field.name]);
      assert.deepEqual(clone[field.name], record[field.name]);
      if (ArrayBuffer.isView(record[field.name]))
      {
        assert.notEqual(roundtrip[field.name], record[field.name]);
        assert.notEqual(clone[field.name], record[field.name]);
      }
    }
  }
});

test("existing Generic owner Copy and GetValues handle nested model-free records", () =>
{
  const {visibility, category, damage} = records();
  const owner = new EveSOFDataGeneric();
  owner.visibilityGroups.push(visibility); owner.hullCategoriesData.push(category); owner.hullDamage = damage;
  const copy = new EveSOFDataGeneric(); copy.Copy(owner);
  assert.equal(copy.visibilityGroups[0].constructor, Visibility);
  assert.equal(copy.hullCategoriesData[0].constructor, Category);
  assert.equal(copy.hullDamage.constructor, Damage);
  assert.notEqual(copy.visibilityGroups[0], visibility);
  assert.notEqual(copy.hullCategoriesData[0], category);
  assert.notEqual(copy.hullDamage.hullParticleColor0, damage.hullParticleColor0);
  const values = copy.GetValues({refs: true, forceTypeTags: true});
  assert.equal(values.visibilityGroups[0].name, "engine");
  assert.equal(values.visibilityGroups[0].description, "Engine geometry");
  assert.equal(values.hullCategoriesData[0].name, "frigate");
  assert.equal(values.hullCategoriesData[0].reflectionMode, 0);
  for (const [name, value] of Object.entries(damageValues)) assert.deepEqual(values.hullDamage[name], value);
});

test("actual manager projects hull reflection and damage from model-free catalog children", () =>
{
  const {visibility, category, damage} = records();
  const data = new EveSOFData(); data.generic = new EveSOFDataGeneric();
  data.generic.visibilityGroups.push(visibility); data.generic.hullCategoriesData.push(category); data.generic.hullDamage = damage;
  const manager = new EveSOFDataMgr(); assert.equal(manager.SetData(data), true);
  const generic = manager.GetGenericData();
  assert.equal(generic.categoryData.get("frigate"), ReflectionMode.REFLECT_HIGH);
  assert.equal(generic.visibilityGroups[0].description, "Engine geometry");
  for (const [name, value] of Object.entries(damageValues))
  {
    const color = /^hullParticleColor([0-3])$/.exec(name);
    assert.deepEqual(color ? generic.hullDamage.hullParticleColors[Number(color[1])] : generic.hullDamage[name], value);
  }
  damage.hullParticleColor0[0] = 99;
  assert.equal(generic.hullDamage.hullParticleColors[0][0], 1);
});

test("declared enum population retains canonical numeric values without model SetValues", () =>
{
  const reader = new DictReader({declarations: true});
  for (const mode of Object.values(ReflectionMode))
  {
    const category = new Category();
    reader.ReadInto(category, {reflectionMode: mode});
    assert.equal(category.reflectionMode, mode);
  }
});
