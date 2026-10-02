import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { blue, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { EveSOFDataTransform as Transform } from "../../../npm/dist/sof/shared/EveSOFDataTransform.js";
import { EveSofDataMeshInstance as Instance } from "../../../npm/dist/sof/shared/EveSofDataMeshInstance.js";
import { EveSOFDataInstancedMesh } from "../../../npm/dist/sof/shared/EveSOFDataInstancedMesh.js";
import { EveSOFDataHullLocatorSet } from "../../../npm/dist/sof/hull/EveSOFDataHullLocatorSet.js";
import { EveSOFDataHull } from "../../../npm/dist/sof/hull/EveSOFDataHull.js";
import { EveSOFData } from "../../../npm/dist/sof/EveSOFData.js";
import { EveSOFDataGeneric } from "../../../npm/dist/sof/generic/EveSOFDataGeneric.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/EveSOFDataMgr.js";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";

const rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
const position = [5, 7, 11], scaling = [2, 3, 4];

function near(actual, expected)
{
  assert.equal(actual.length, expected.length);
  expected.forEach((value, index) => assert.ok(Math.abs(actual[index] - value) < 1e-5, `component ${index}: ${actual[index]} != ${value}`));
}

function records()
{
  const adapter = createSofHydrationAdapter(), transform = new Transform(), instance = new Instance();
  adapter.applyValues(transform, {position, rotation, scaling, boneIndex: -1});
  adapter.applyValues(instance, {translation: position, rotation, scaling, boneIndex: 6});
  for (const record of [transform, instance]) adapter.finalize(record, {kind: CjsSchema.getClassName(record.constructor)});
  return {transform, instance};
}

function catalog()
{
  const data = new EveSOFData();
  createSofHydrationAdapter().applyValues(data, {
    hull: [{
      _type: "EveSOFDataHull", name: "fixtureHull",
      locatorSets: [{_type: "EveSOFDataHullLocatorSet", name: "hardpoints", locators: [
        {_type: "EveSOFDataTransform", position, rotation, scaling, boneIndex: -1}
      ]}],
      instancedMeshes: [{_type: "EveSOFDataInstancedMesh", name: "antenna", geometryResPath: "res:/test/antenna.gr2", instances: [
        {_type: "EveSofDataMeshInstance", translation: position, rotation, scaling, boneIndex: 6}
      ]}]
    }],
    generic: {_type: "EveSOFDataGeneric"}
  });
  return data;
}

function children(data)
{
  const hull = data.hull[0];
  return {hull, locatorSet: hull.locatorSets[0], mesh: hull.instancedMeshes[0], transform: hull.locatorSets[0].locators[0], instance: hull.instancedMeshes[0].instances[0]};
}

test("SOF transform exposes its native self table while the packed instance remains a plain registered struct", () =>
{
  for (const Class of [Transform, Instance])
  {
    const record = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    assert.equal(record.constructor, Class);
    assert.equal(Object.getPrototypeOf(Class.prototype), Object.prototype);
    assert.deepEqual([...mappedInterfaces(Class)], Class === Transform ? [Transform] : []);
    assert.equal(CjsSchema.cast(record, Class), record);
    assert.equal(CjsSchema.cast(record, IInitialize), null); assert.equal(CjsSchema.cast(record, INotify), null);
    for (const name of ["Copy", "GetValues", "SetValues", "Clone", "OnEvent", "__state", "Update", "Initialize", "OnModified"])
      assert.equal(name in record, false, name);
    assert.equal("from" in Class, false); assert.deepEqual(GetResources(record), []);
  }
});

test("transform native declaration order and editor flags stay distinct from struct transport declarations", () =>
{
  const transformFields = CjsSchema.getSchema(Transform).members;
  assert.deepEqual(transformFields.map(field => field.name), ["position", "rotation", "scaling", "boneIndex"]);
  for (const field of transformFields) assert.deepEqual(field.edit, {read: true, write: true, persist: true});
  assert.equal(CjsSchema.getField(Transform, "boneIndex").jessica.widget, "boneindex");
  assert.deepEqual(CjsSchema.getSchema(Instance).members.map(field => field.name), ["rotation", "scaling", "translation", "boneIndex"]);
  for (const field of CjsSchema.getSchema(Instance).members) assert.deepEqual(field.edit, {persist: true});
  assert.equal(CjsSchema.getSchema(Transform).methods.find(method => method.name === "GetTransform").impl.custom, true);
});

test("native transform defaults and retained JavaScript struct defaults own independent buffers", () =>
{
  for (const Class of [Transform, Instance])
  {
    const first = new Class(), second = new Class(), translationName = Class === Transform ? "position" : "translation";
    assert.deepEqual(Array.from(first.rotation), [0, 0, 0, 1]); assert.deepEqual(Array.from(first.scaling), [1, 1, 1]);
    assert.deepEqual(Array.from(first[translationName]), [0, 0, 0]); assert.equal(first.boneIndex, Class === Transform ? -1 : 0);
    for (const name of ["rotation", "scaling", translationName]) assert.notEqual(first[name], second[name]);
    first.rotation[0] = 5; first.scaling[0] = 9; first[translationName][0] = 8;
    assert.equal(second.rotation[0], 0); assert.equal(second.scaling[0], 1); assert.equal(second[translationName][0], 0);
  }
});

test("retained transform convenience preserves nonidentity rotation scale and output ownership", () =>
{
  const {transform} = records(), out = new Float32Array(16);
  assert.equal(transform.GetTransform(out), out);
  near(out, [0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 5, 7, 11, 1]);
  transform.boneIndex = 17;
  assert.equal(transform.GetTransform(out), out);
  near(out, [0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 5, 7, 11, 1]);
});

test("actual hydration adapter populates the registered records through their owning hull graph", () =>
{
  const data = catalog(), {hull, locatorSet, mesh, transform, instance} = children(data);
  assert.equal(data.generic.constructor, EveSOFDataGeneric); assert.equal(hull.constructor, EveSOFDataHull);
  assert.equal(locatorSet.constructor, EveSOFDataHullLocatorSet); assert.equal(mesh.constructor, EveSOFDataInstancedMesh);
  assert.equal(transform.constructor, Transform); assert.equal(instance.constructor, Instance);
  near(transform.rotation, rotation); near(instance.rotation, rotation);
  assert.deepEqual(Array.from(transform.position), position); assert.deepEqual(Array.from(instance.translation), position);
  assert.equal(transform.boneIndex, -1); assert.equal(instance.boneIndex, 6);
  assert.equal("Copy" in transform, false); assert.equal("Copy" in instance, false);
});

test("Blue copy and persisted dictionary roundtrip detach every transform and struct component", () =>
{
  for (const record of Object.values(records()))
  {
    const values = new DictWriter().WriteObject(record, {}, {persistOnly: true, forceTypeTags: true});
    for (const field of CjsSchema.getSchema(record.constructor).members) assert.ok(Object.hasOwn(values, field.name), field.name);
    for (const copy of [new DictReader({declarations: true}).CreateObject(values), new Copier().CloneTo(record)])
    {
      assert.equal(copy.constructor, record.constructor); assert.equal(copy.boneIndex, record.boneIndex);
      for (const name of ["rotation", "scaling", record.constructor === Transform ? "position" : "translation"])
      {
        assert.notEqual(copy[name], record[name]); assert.deepEqual(Array.from(copy[name]), Array.from(record[name]));
      }
    }
  }
});

test("actual catalog schema copy and export retain concrete locator and instance records", () =>
{
  const data = catalog(), copy = new EveSOFData(); CjsSchema.copy(copy, data, {typeTags: true});
  const source = children(data), copied = children(copy);
  for (const name of ["transform", "instance"])
  {
    assert.equal(copied[name].constructor, source[name].constructor); assert.notEqual(copied[name], source[name]);
    assert.notEqual(copied[name].rotation, source[name].rotation); near(copied[name].rotation, rotation);
  }
  const values = CjsSchema.getValues(copy, {}, {refs: true, forceTypeTags: true});
  assert.deepEqual(values.hull[0].locatorSets[0].locators[0].position, position);
  assert.deepEqual(values.hull[0].instancedMeshes[0].instances[0].translation, position);
  assert.equal(values.hull[0].locatorSets[0].locators[0].boneIndex, -1);
  assert.equal(values.hull[0].instancedMeshes[0].instances[0].boneIndex, 6);
});

test("actual manager projects detached locators and nonidentity packed instance transforms", () =>
{
  const data = catalog(), {transform, instance} = children(data), manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const hull = manager.GetHullData("fixtureHull"), locator = hull.locatorSets.get("hardpoints")[0], packed = hull.instancedMeshes[0].instances[0];
  assert.deepEqual(locator.position, position); near(locator.rotation, rotation); assert.deepEqual(locator.scaling, scaling);
  assert.equal(locator.boneIndex, -1); assert.equal(locator.uniqueID, 0);
  near(packed.transform0, [0, -3, 0, 5]); near(packed.transform1, [2, 0, 0, 7]); near(packed.transform2, [0, 0, 4, 11]);
  assert.equal(packed.boneIndex, 6);
  for (const suffix of ["0", "1", "2"])
  {
    assert.deepEqual(packed["lastTransform" + suffix], packed["transform" + suffix]);
    assert.notEqual(packed["lastTransform" + suffix], packed["transform" + suffix]);
  }
  transform.position[0] = 99; instance.translation[0] = 99; instance.rotation[2] = 0;
  assert.equal(locator.position[0], 5); near(packed.transform0, [0, -3, 0, 5]);
});
