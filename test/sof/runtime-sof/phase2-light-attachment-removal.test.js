import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { Copier, DictReader, IInitialize } from "../../../npm/dist/global/blue/index.js";
import { EnumerateChildren, Traverse } from "../../../npm/dist/global/blue/find.js";
import { GetResources } from "../../../npm/dist/global/blue/getResources.js";
import {
  EveSOF, EveSOFDataPointLightAttachment, EveSOFDataSpotLightAttachment,
  EveSOFDataHullSpriteSetItem, EveSOFDataHullSpotlightSetItem,
  EveSOFDataHullPlaneSetItem, EveSOFDataHullHazeSetItem,
  EveSOFDataHullBannerSetItem, EveSOFDataHullSpriteLineSetItem,
} from "../../../npm/dist/sof/index.js";

const classes = [EveSOFDataPointLightAttachment, EveSOFDataSpotLightAttachment];
const declarations = [
  { saturation: 1, intensity: 1, translation: [0, 0, 0], rotation: [0, 0, 0, 1], innerScaleMultiplier: 1, outerScaleMultiplier: 2, noiseAmplitude: 0, noiseFrequency: 1, noiseOctaves: 1, lightProfilePath: "" },
  { saturation: 1, intensity: 1, translation: [0, 0, 0], innerAngleMultiplier: 0.5, outerAngleMultiplier: 1, innerScaleMultiplier: 1, outerScaleMultiplier: 1, noiseAmplitude: 0, noiseFrequency: 1, noiseOctaves: 1, lightProfilePath: "" },
];

test("light attachments retain self-only queries without model or lifecycle behavior", () =>
{
  for (const Type of classes)
  {
    const value = new Type();
    assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
    assert.deepEqual([...mappedInterfaces(Type)], [Type]);
    assert.equal(CjsSchema.cast(value, Type), value);
    assert.equal(CjsSchema.cast(value, IInitialize), null);
    assert.equal(CjsSchema.GetConstructor(Type.name), Type);
    for (const method of ["SetValues", "UpdateValues", "OnEvent", "Traverse", "GetResources", "Initialize", "OnModified", "Destroy"])
      assert.equal(method in value, false, Type.name + "." + method);
  }
});

test("light attachment declarations preserve native order types flags and defaults", () =>
{
  for (const [index, Type] of classes.entries())
  {
    const value = new Type(), defaults = declarations[index];
    const members = CjsSchema.getSchema(Type).members;
    assert.deepEqual(members.map(member => member.name), Object.keys(defaults));
    for (const member of members)
    {
      const name = member.name;
      assert.equal(member.role, "member");
      assert.equal(member.edit.read, true);
      assert.equal(member.edit.write, true);
      assert.equal(member.edit.persist, true);
      assert.equal(member.type.kind, name === "translation" ? "vec3" : name === "rotation" ? "quat" : name === "noiseOctaves" ? "int32" : name === "lightProfilePath" ? "path" : "float32");
      assert.deepEqual(ArrayBuffer.isView(value[name]) ? Array.from(value[name]) : value[name], defaults[name]);
    }
    assert.notEqual(value.translation, new Type().translation);
  }
  assert.equal("rotation" in new EveSOFDataSpotLightAttachment(), false);
});

function read(type, fields)
{
  return new DictReader({ declarations: true }).CreateObject({ _type: type, ...fields });
}

test("declared parent references and lists construct and traverse typed light records", () =>
{
  for (const [Type, field, Light] of [
    [EveSOFDataHullSpriteSetItem, "light", classes[0]],
    [EveSOFDataHullSpriteLineSetItem, "light", classes[0]],
    [EveSOFDataHullBannerSetItem, "light", classes[0]],
    [EveSOFDataHullPlaneSetItem, "lights", classes[0]],
    [EveSOFDataHullHazeSetItem, "lights", classes[0]],
    [EveSOFDataHullSpotlightSetItem, "light", classes[1]],
  ])
  {
    const values = { _type: Light.name, intensity: 7, translation: [2, 3, 4], lightProfilePath: "res:/typed.profile" };
    const parent = read(Type.name, { [field]: field === "lights" ? [values] : values });
    const light = field === "lights" ? parent[field][0] : parent[field];
    assert.equal(light.constructor, Light);
    assert.equal(light.intensity, 7);
    const children = [];
    EnumerateChildren(parent, child => children.push(child));
    assert.ok(children.includes(light));
    const visited = [];
    Traverse(parent, child => visited.push(child));
    assert.equal(visited.filter(child => child === light).length, 1);
    const leafChildren = [];
    EnumerateChildren(light, child => leafChildren.push(child));
    assert.deepEqual(leafChildren, []);
    assert.deepEqual(GetResources(light), []);
  }
});

test("Copier preserves attached records and independent vector storage", () =>
{
  for (const [index, Type] of classes.entries())
  {
    const source = read(Type.name, { ...declarations[index], intensity: 9, translation: [4, 5, 6], lightProfilePath: "res:/copied.profile" });
    const copy = new Copier().CloneTo(source);
    assert.equal(copy.constructor, Type);
    assert.notEqual(copy, source);
    for (const name of Object.keys(declarations[index]))
    {
      assert.deepEqual(copy[name], source[name]);
      if (ArrayBuffer.isView(source[name])) assert.notEqual(copy[name], source[name]);
    }
    copy.translation[0] = 100;
    assert.equal(source.translation[0], 4);
    const Parent = index === 0 ? EveSOFDataHullPlaneSetItem : EveSOFDataHullSpotlightSetItem;
    const parent = new Parent();
    if (index === 0) parent.lights.push(source, source);
    else parent.light = source;
    const clonedParent = new Copier().CloneTo(parent);
    const nested = index === 0 ? clonedParent.lights[0] : clonedParent.light;
    assert.equal(nested.constructor, Type);
    assert.notEqual(nested, source);
    assert.equal(nested.intensity, 9);
    if (index === 0) assert.equal(clonedParent.lights[1], nested);
  }
});

function createGraph()
{
  return read("EveSOFData", {
    hull: [{ _type: "EveSOFDataHull", name: "lighthull", sof6: true, geometryResFilePath: "res:/model/light.gr2",
      spriteSets: [{ _type: "EveSOFDataHullSpriteSet", visibilityGroup: "primary", items: [{ _type: "EveSOFDataHullSpriteSetItem", position: [2, 0, 0], colorType: 0,
        light: { _type: "EveSOFDataPointLightAttachment", translation: [0.5, 1, 0], intensity: 4, innerScaleMultiplier: 2, outerScaleMultiplier: 5, noiseAmplitude: 0.25, noiseFrequency: 3, noiseOctaves: 2, lightProfilePath: "res:/point.profile" } }] }],
      spotlightSets: [{ _type: "EveSOFDataHullSpotlightSet", visibilityGroup: "primary", items: [{ _type: "EveSOFDataHullSpotlightSetItem", colorType: 0, coneIntensity: 2,
        transform: [2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 8, 0, 3, 0, 0, 1],
        light: { _type: "EveSOFDataSpotLightAttachment", translation: [0, 2, 0], intensity: 4, innerAngleMultiplier: 0.5, outerAngleMultiplier: 1.5, innerScaleMultiplier: 2, outerScaleMultiplier: 3, noiseAmplitude: 0.25, noiseFrequency: 5, noiseOctaves: 3, lightProfilePath: "res:/spot.profile" } }] }],
    }],
    faction: [{ _type: "EveSOFDataFaction", name: "lightfaction", visibilityGroupSet: { _type: "EveSOFDataFactionVisibilityGroupSet", visibilityGroups: [{ _type: "EveSOFDataGenericString", str: "primary" }] } }],
    race: [{ _type: "EveSOFDataRace", name: "lightrace" }],
    generic: { _type: "EveSOFDataGeneric" },
  });
}

test("actual SOF manager snapshots typed light attachments without retaining their arrays", () =>
{
  const data = createGraph(), sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const hull = sof.dataMgr.GetHullData("lighthull");
  for (const key of ["spriteSets", "spotlightSets"])
  {
    const source = data.hull[0][key][0].items[0].light;
    const projected = hull[key][0].items[0].light;
    assert.equal(source.constructor, key === "spriteSets" ? classes[0] : classes[1]);
    for (const field of Object.keys(declarations[key === "spriteSets" ? 0 : 1]))
      assert.deepEqual(projected[field], ArrayBuffer.isView(source[field]) ? Array.from(source[field]) : source[field]);
    source.translation[0] = 99;
    assert.notEqual(projected.translation[0], 99);
    if (source.rotation) { source.rotation[0] = 1; assert.equal(projected.rotation[0], 0); }
  }
});

test("typed parent graph feeds existing CPU sprite and spotlight generation", () =>
{
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(createGraph()), true);
  const values = sof.BuildValuesFromDNA("lighthull:lightfaction:lightrace");
  const sprite = values.attachments.find(value => value._type === "EveSpriteSet").lights[0];
  const spot = values.attachments.find(value => value._type === "EveSpotlightSet").lights[0];
  assert.equal(sprite._type, "EveSpriteLight");
  assert.equal(sprite.lightProfilePath, "res:/point.profile");
  assert.deepEqual(sprite.lightData.position, [2.5, 1, 0]);
  assert.equal(sprite.lightData.radius, 5);
  assert.equal(sprite.lightData.innerRadius, 2);
  assert.equal(sprite.lightData.brightness, 4);
  assert.equal(spot._type, "EveSpotlightLight");
  assert.equal(spot.lightProfilePath, "res:/spot.profile");
  assert.deepEqual(spot.lightData.position, [3, 2, 0]);
  assert.equal(spot.lightData.radius, 24);
  assert.equal(spot.lightData.innerRadius, 16);
  assert.equal(spot.lightData.brightness, 8);
  assert.equal(spot.lightData.texturePath, "res:/spot.profile");
  const angle = Math.atan(4 / 16) * 180 / Math.PI;
  assert.ok(Math.abs(spot.lightData.innerAngle - angle * 0.5) < 1e-12);
  assert.ok(Math.abs(spot.lightData.outerAngle - angle * 1.5) < 1e-12);
});
