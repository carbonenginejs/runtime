import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { blue, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { EveSOFDataGenericSwarm as Swarm } from "../../../npm/dist/sof/generic/EveSOFDataGenericSwarm.js";
import { EveSOFDataGenericVariant as Variant } from "../../../npm/dist/sof/generic/EveSOFDataGenericVariant.js";
import { EveSOFDataGenericDamage as Damage } from "../../../npm/dist/sof/generic/EveSOFDataGenericDamage.js";
import { EveSOFDataHullArea } from "../../../npm/dist/sof/hull/EveSOFDataHullArea.js";
import { EveSOFDataGeneric } from "../../../npm/dist/sof/generic/EveSOFDataGeneric.js";
import { EveSOFData } from "../../../npm/dist/sof/EveSOFData.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/EveSOFDataMgr.js";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";

// Native exposed behavior order and defaults, including the authored alias
// weightDeceleration for BehaviorProperties::m_weightDecelerate.
const swarmDefaults = {
  speedMultiplier: 1.1, speedMinimum: 10, maxDistance0: 500, maxDistance1: 125,
  maxTime: 0.2, speed0: 700, speed1: 1000, weightFormation: 1,
  weightCohesion: 0.1, weightSeparation: 0.1, weightAlign: 50, weightWander: 0.33,
  weightAnchor: 0.5, anchorRadius0: 75, anchorRadius1: 250,
  weightDeceleration: 0.1, maxDeceleration: 200, separationDistance: 250,
  formationDistance: 50, wanderFluctuation: 0.05, wanderDistance: 100, wanderRadius: 80
};
const swarmValues = Object.fromEntries(Object.keys(swarmDefaults).map((name, index) => [name, index + 3]));
const damageValues = {
  flickerPerlinSpeed: 2, flickerPerlinAlpha: 1.5, flickerPerlinBeta: 3, flickerPerlinN: 4,
  armorParticleRate: 7, armorParticleAngle: 2, armorParticleMinMaxSpeed: [4, 8],
  armorParticleMinMaxLifeTime: [2, 6], armorParticleSizes: [1, 2, 3, 4],
  armorParticleColor0: [1, 0, 0, 0.5], armorParticleColor1: [0, 1, 0, 0.25],
  armorParticleColor2: [0, 0, 1, 0.75], armorParticleColor3: [1, 1, 1, 1],
  armorParticleTextureIndex: 3, armorParticleVelocityStretchRotation: 4,
  armorParticleDrag: 0.5, armorParticleTurbulenceAmplitude: 6,
  armorParticleTurbulenceFrequency: 8, armorParticleColorMidPoint: 0.75,
  armorShader: "armor.fx", shieldShaderEllipsoid: "shield_ellipsoid.fx",
  shieldShaderHull: "shield_hull.fx", shieldGeometryResFilePath: "res:/shield.gr2"
};

function records()
{
  const adapter = createSofHydrationAdapter();
  const swarm = new Swarm(), variant = new Variant(), damage = new Damage();
  adapter.applyValues(swarm, swarmValues);
  adapter.applyValues(variant, {name: "damaged", isTransparent: true, hullArea: {_type: "EveSOFDataHullArea", name: "overlay", shader: "overlay.fx", index: 7, count: 2}});
  adapter.applyValues(damage, damageValues);
  for (const record of [swarm, variant, damage]) adapter.finalize(record, {kind: CjsSchema.getClassName(record.constructor)});
  return {swarm, variant, damage};
}

test("SOF behavior records construct without model APIs and expose self-only native tables", () =>
{
  for (const Class of [Swarm, Variant, Damage])
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

test("native exposure order and persistence retain flat swarm fields, variant references and authored paths", () =>
{
  const names = Class => CjsSchema.getSchema(Class).members.map(field => field.name);
  assert.deepEqual(names(Swarm), Object.keys(swarmDefaults));
  assert.deepEqual(names(Variant), ["name", "isTransparent", "hullArea"]);
  assert.deepEqual(names(Damage), Object.keys(damageValues));
  for (const Class of [Swarm, Variant, Damage])
    for (const field of CjsSchema.getSchema(Class).members) assert.deepEqual(field.edit, {read: true, write: true, persist: true});
  for (const name of Object.keys(swarmDefaults)) assert.equal(CjsSchema.getField(Swarm, name).type.kind, "float32");
  for (const name of ["armorShader", "shieldShaderEllipsoid", "shieldShaderHull", "shieldGeometryResFilePath"])
    assert.equal(CjsSchema.getField(Damage, name).type.kind, "string");
  assert.equal(CjsSchema.getField(Damage, "flickerPerlinN").type.kind, "int32");
  assert.equal(CjsSchema.getField(Damage, "armorParticleTurbulenceFrequency").type.kind, "uint32");
});

test("native defaults preserve swarm behavior, empty variant and independent zero-alpha damage storage", () =>
{
  const swarm = new Swarm();
  for (const [name, value] of Object.entries(swarmDefaults)) assert.equal(swarm[name], value);
  const variant = new Variant(); assert.equal(variant.name, ""); assert.equal(variant.isTransparent, false); assert.equal(variant.hullArea, null);
  const a = new Damage(), b = new Damage();
  const nonzero = {flickerPerlinSpeed: 1, flickerPerlinAlpha: 1.1, flickerPerlinBeta: 2, flickerPerlinN: 3, armorParticleTurbulenceFrequency: 1, armorParticleColorMidPoint: 0.5};
  for (const [name, sample] of Object.entries(damageValues))
  {
    if (Array.isArray(sample))
    {
      assert.deepEqual(Array.from(a[name]), Array(sample.length).fill(0));
      assert.notEqual(a[name], b[name]); a[name][0] = 9; assert.equal(b[name][0], 0);
    }
    else assert.equal(a[name], typeof sample === "string" ? "" : nonzero[name] ?? 0);
  }
});

test("real SOF hydration populates records and creates a declared nested hull area", () =>
{
  const {swarm, variant, damage} = records();
  for (const [name, value] of Object.entries(swarmValues)) assert.equal(swarm[name], value);
  assert.equal(variant.name, "damaged"); assert.equal(variant.isTransparent, true);
  assert.equal(variant.hullArea.constructor, EveSOFDataHullArea); assert.equal(variant.hullArea.shader, "overlay.fx");
  for (const [name, value] of Object.entries(damageValues)) assert.deepEqual(Array.isArray(value) ? Array.from(damage[name]) : damage[name], value);
  assert.deepEqual(GetResources(damage), []);
});

test("Blue persisted roundtrip and copier preserve nested area and independent vectors", () =>
{
  for (const record of Object.values(records()))
  {
    const values = new DictWriter().WriteObject(record, {}, {persistOnly: true, forceTypeTags: true});
    const roundtrip = new DictReader({declarations: true}).CreateObject(values);
    const clone = new Copier().CloneTo(record);
    for (const copy of [roundtrip, clone])
    {
      assert.equal(copy.constructor, record.constructor);
      for (const field of CjsSchema.getSchema(record.constructor).members)
      {
        const name = field.name;
        assert.ok(Object.hasOwn(values, name), name + " is persisted");
        if (name === "hullArea")
        {
          assert.equal(copy.hullArea.constructor, EveSOFDataHullArea);
          assert.notEqual(copy.hullArea, record.hullArea);
          assert.equal(copy.hullArea.shader, "overlay.fx"); assert.equal(copy.hullArea.index, 7);
        }
        else
        {
          assert.deepEqual(copy[name], record[name]);
          if (ArrayBuffer.isView(record[name])) assert.notEqual(copy[name], record[name]);
        }
      }
    }
  }
});

test("existing Generic Copy and GetValues preserve nested model-free swarm, variant and damage", () =>
{
  const {swarm, variant, damage} = records(), owner = new EveSOFDataGeneric();
  owner.swarm = swarm; owner.variants.push(variant); owner.damage = damage;
  const copy = new EveSOFDataGeneric(); copy.Copy(owner);
  assert.equal(copy.swarm.constructor, Swarm); assert.notEqual(copy.swarm, swarm);
  assert.equal(copy.variants[0].constructor, Variant); assert.notEqual(copy.variants[0], variant);
  assert.notEqual(copy.variants[0].hullArea, variant.hullArea);
  assert.equal(copy.damage.constructor, Damage); assert.notEqual(copy.damage.armorParticleColor0, damage.armorParticleColor0);
  const values = copy.GetValues({refs: true, forceTypeTags: true});
  for (const [name, value] of Object.entries(swarmValues)) assert.equal(values.swarm[name], value);
  for (const [name, value] of Object.entries(damageValues)) assert.deepEqual(values.damage[name], value);
  assert.equal(values.variants[0].name, "damaged"); assert.equal(values.variants[0].isTransparent, true);
  assert.equal(values.variants[0].hullArea.index, 7);
});

test("actual manager projects authored swarm aliases and damage fields without model helpers", () =>
{
  const {swarm, damage} = records(), data = new EveSOFData(); data.generic = new EveSOFDataGeneric();
  data.generic.swarm = swarm; data.generic.damage = damage;
  const manager = new EveSOFDataMgr(); assert.equal(manager.SetData(data), true);
  const generic = manager.GetGenericData();
  for (const [name, value] of Object.entries(swarmValues)) assert.equal(generic.swarmBehavior[name === "weightDeceleration" ? "weightDecelerate" : name], value);
  for (const [name, value] of Object.entries(damageValues))
  {
    const color = /^armorParticleColor([0-3])$/.exec(name);
    assert.deepEqual(color ? generic.damage.armorParticleColors[Number(color[1])] : generic.damage[name], value);
  }
  damage.armorParticleColor0[0] = 99; assert.equal(generic.damage.armorParticleColors[0][0], 1);
});

test("actual manager projects a model-free variant and omits variants without hull areas", () =>
{
  const {variant} = records(), absent = new Variant(); absent.name = "absent";
  const data = new EveSOFData(); data.generic = new EveSOFDataGeneric(); data.generic.variants.push(variant, absent);
  const manager = new EveSOFDataMgr(); assert.equal(manager.SetData(data), true);
  const variants = manager.GetGenericData().variants;
  assert.equal(variants.has("absent"), false);
  const selected = variants.get("damaged");
  assert.equal(selected.isTransparent, true); assert.equal(selected.hullAreaData.name, "overlay");
  assert.equal(selected.hullAreaData.index, 7); assert.equal(selected.hullAreaData.count, 2);
  assert.equal(selected.hullAreaData.shader, "overlay.fx");
});
