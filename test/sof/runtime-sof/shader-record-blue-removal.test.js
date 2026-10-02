import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { blue, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { EveSOFDataGenericShader as Shader } from "../../../npm/dist/sof/generic/EveSOFDataGenericShader.js";
import { EveSOFDataGenericDecalShader as Decal } from "../../../npm/dist/sof/generic/EveSOFDataGenericDecalShader.js";
import { EveSOFDataGenericString } from "../../../npm/dist/sof/generic/EveSOFDataGenericString.js";
import { EveSOFDataTexture } from "../../../npm/dist/sof/shared/EveSOFDataTexture.js";
import { EveSOFDataParameter } from "../../../npm/dist/sof/shared/EveSOFDataParameter.js";
import { EveSOFDataGeneric } from "../../../npm/dist/sof/generic/EveSOFDataGeneric.js";
import { EveSOFData } from "../../../npm/dist/sof/EveSOFData.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/EveSOFDataMgr.js";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";

function records()
{
  const adapter = createSofHydrationAdapter(), shader = new Shader(), decal = new Decal();
  adapter.applyValues(shader, {
    shader: "area.fx", transparencyTextureName: "AlphaMap", doGenerateDepthArea: false,
    parameters: [{str: "Paint"}, {str: "Fallback"}],
    defaultParameters: [{name: "Default", value: [1, 2, 3, 4]}],
    defaultTextures: [{name: "PatternMask1Map", resFilePath: "res:/mask.dds"}, {name: "AlbedoMap", resFilePath: "res:/albedo.dds"}]
  });
  adapter.applyValues(decal, {
    shader: "decal.fx", additive: true, parameters: [{str: "DecalPaint"}, {str: "Fallback"}],
    defaultTextures: [{name: "AlbedoMap", resFilePath: "res:/decal.dds"}],
    parentTextures: [{str: "NormalMap"}, {str: "MissingMap"}]
  });
  for (const record of [shader, decal]) adapter.finalize(record, {kind: CjsSchema.getClassName(record.constructor)});
  return {shader, decal};
}

test("shader records retain exact native tables, exposure order, flags and independent defaults", () =>
{
  for (const [Class, names, writable] of [
    [Shader, ["shader", "transparencyTextureName", "doGenerateDepthArea", "parameters", "defaultTextures", "defaultParameters"], ["shader", "transparencyTextureName", "doGenerateDepthArea"]],
    [Decal, ["shader", "parameters", "defaultTextures", "parentTextures", "additive"], ["shader"]]
  ])
  {
    const a = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class)), b = new Class();
    assert.equal(a.constructor, Class); assert.equal(Object.getPrototypeOf(Class.prototype), Object.prototype);
    for (const name of ["Copy", "GetValues", "SetValues", "Clone", "OnEvent", "__state"]) assert.equal(name in a, false);
    assert.equal("from" in Class, false); assert.deepEqual([...mappedInterfaces(Class)], [Class]);
    assert.equal(CjsSchema.cast(a, Class), a); assert.equal(CjsSchema.cast(a, IInitialize), null); assert.equal(CjsSchema.cast(a, INotify), null);
    assert.deepEqual(GetResources(a), []);
    assert.deepEqual(CjsSchema.getSchema(Class).members.map(field => field.name), names);
    assert.deepEqual(CjsSchema.getSchema(Class).properties, []);
    for (const field of CjsSchema.getSchema(Class).members)
    {
      assert.equal(field.edit.read, true); assert.equal(field.edit.persist, true);
      assert.equal(field.edit.write === true, writable.includes(field.name));
      if (Array.isArray(a[field.name])) { assert.deepEqual(a[field.name], []); assert.notEqual(a[field.name], b[field.name]); }
    }
    assert.equal(a.shader, "");
  }
  assert.equal(new Shader().transparencyTextureName, ""); assert.equal(new Shader().doGenerateDepthArea, true);
  assert.equal(new Decal().additive, false);
  assert.deepEqual(Shader.PatternMaskMaps, ["PatternMask1Map", "PatternMask2Map"]);
  assert.equal(Object.isFrozen(Shader.PatternMaskMaps), false);
});

test("actual hydration constructs concrete string, parameter and texture helper receivers", () =>
{
  const {shader, decal} = records();
  assert.equal(shader.parameters[0].constructor, EveSOFDataGenericString);
  assert.equal(decal.parentTextures[0].constructor, EveSOFDataGenericString);
  assert.equal(shader.defaultTextures[0].constructor, EveSOFDataTexture);
  assert.equal(decal.defaultTextures[0].constructor, EveSOFDataTexture);
  assert.equal(shader.defaultParameters[0].constructor, EveSOFDataParameter);
  assert.equal(shader.doGenerateDepthArea, false); assert.equal(decal.additive, true);
  assert.deepEqual(GetResources(shader), []);
  assert.equal(shader.hasPatternMaskMaps, true); assert.equal(new Shader().hasPatternMaskMaps, false);
});

test("generic shader helpers retain defaults, supplied parameter copies and unrestricted texture overlay", () =>
{
  const {shader} = records(), paint = new Float32Array([4, 3, 2, 1]);
  const config = {parameters: {Existing: [9]}, textures: {ExistingMap: "res:/existing.dds"}};
  const parameters = config.parameters, textures = config.textures;
  assert.equal(shader.Assign(config, {parameters: {Paint: paint, Unused: [6]}, textures: {AlbedoMap: "res:/override.dds", ExtraMap: "res:/extra.dds"}}), config);
  assert.equal(config.parameters, parameters); assert.equal(config.textures, textures);
  assert.deepEqual(config.parameters, {Existing: [9], Default: [1, 2, 3, 4], Paint: [4, 3, 2, 1], Fallback: [0, 0, 0, 1]});
  paint[0] = 99; assert.equal(config.parameters.Paint[0], 4);
  assert.equal(config.textures.AlbedoMap, "res:/override.dds"); assert.equal(config.textures.ExtraMap, "res:/extra.dds");
  assert.equal(config.textures.PatternMask1Map, "res:/mask.dds"); assert.equal(config.textures.ExistingMap, "res:/existing.dds");
  assert.deepEqual(shader.Assign(null, null).parameters.Paint, [0, 0, 0, 1]);
  for (const key of ["AlphaMap", "Default", "Paint", "AlbedoMap"]) assert.equal(shader.HasUsage(key), true);
  assert.equal(shader.HasUsage("missing"), false); assert.equal(shader.HasUsage(""), false);
});

test("decal helpers retain parent-only texture overrides and absent declaration fallbacks", () =>
{
  const {decal} = records(), paint = [1, 3, 5, 7], config = {parameters: {Fallback: [8]}, textures: {KeptMap: "res:/kept.dds"}};
  assert.equal(decal.Assign(config, {parameters: {DecalPaint: paint, Unused: [9]}, textures: {NormalMap: "res:/normal.dds", AlbedoMap: "ignored", ExtraMap: "ignored"}}), config);
  assert.deepEqual(config.parameters, {Fallback: [8], DecalPaint: [1, 3, 5, 7]});
  paint[0] = 99; assert.equal(config.parameters.DecalPaint[0], 1);
  assert.deepEqual(config.textures, {KeptMap: "res:/kept.dds", AlbedoMap: "res:/decal.dds", NormalMap: "res:/normal.dds", MissingMap: ""});
  assert.deepEqual(decal.Assign(null, null).parameters.Fallback, [0, 0, 0, 1]);
  for (const key of ["DecalPaint", "AlbedoMap", "NormalMap"]) assert.equal(decal.HasUsage(key), true);
  assert.equal(decal.HasUsage("missing"), false);
});

test("actual generic lookup keeps decal precedence and calls retained HasUsage helpers", () =>
{
  const {shader, decal} = records(), owner = new EveSOFDataGeneric(); owner.areaShaders.push(shader); owner.decalShaders.push(decal);
  assert.equal(owner.GetAreaShader("area.fx"), shader); assert.equal(owner.GetDecalShader("decal.fx"), decal);
  assert.equal(owner.HasShaderUsage("area.fx", "Paint"), true); assert.equal(owner.HasShaderUsage("decal.fx", "NormalMap"), true);
  assert.equal(owner.HasUnpackedTextures(), true);
  decal.shader = "area.fx";
  assert.equal(owner.HasShaderUsage("area.fx", "Paint"), false); assert.equal(owner.HasShaderUsage("area.fx", "DecalPaint"), true);
  assert.equal(owner.HasShaderUsage("missing", "Paint"), false); assert.equal(owner.HasShaderUsage("area.fx", ""), false);
});

test("actual Generic Copy and GetValues preserve banner struct and shader list children", () =>
{
  const {shader, decal} = records(), owner = new EveSOFDataGeneric();
  owner.areaShaders.push(shader); owner.decalShaders.push(decal);
  new Copier().CopyTo(shader, owner.bannerShader);
  const copy = new EveSOFDataGeneric(), banner = copy.bannerShader; copy.Copy(owner);
  assert.equal(copy.bannerShader, banner); assert.equal(copy.bannerShader.constructor, Shader);
  assert.notEqual(copy.bannerShader, owner.bannerShader);
  assert.equal(copy.areaShaders[0].constructor, Shader); assert.notEqual(copy.areaShaders[0], shader);
  assert.equal(copy.decalShaders[0].constructor, Decal); assert.notEqual(copy.decalShaders[0], decal);
  assert.notEqual(copy.areaShaders[0].defaultParameters[0].value, shader.defaultParameters[0].value);
  assert.notEqual(copy.decalShaders[0].parentTextures[0], decal.parentTextures[0]);
  const values = copy.GetValues({refs: true, forceTypeTags: true});
  assert.equal(values.bannerShader.shader, "area.fx"); assert.equal(values.bannerShader.doGenerateDepthArea, false);
  assert.deepEqual(values.areaShaders[0].defaultParameters[0].value, [1, 2, 3, 4]);
  assert.equal(values.areaShaders[0].defaultTextures[0].resFilePath, "res:/mask.dds");
  assert.equal(values.decalShaders[0].parentTextures[0].str, "NormalMap"); assert.equal(values.decalShaders[0].additive, true);
});

test("actual manager projects area, banner and decal records with declared defaults", () =>
{
  const {shader, decal} = records(), data = new EveSOFData(); data.generic = new EveSOFDataGeneric();
  data.generic.areaShaders.push(shader); data.generic.decalShaders.push(decal); new Copier().CopyTo(shader, data.generic.bannerShader);
  const manager = new EveSOFDataMgr(); assert.equal(manager.SetData(data), true); const generic = manager.GetGenericData();
  for (const area of [generic.areaShaderData.get("area.fx"), generic.bannerShader])
  {
    assert.deepEqual(area.parameters, ["Paint", "Fallback"]); assert.equal(area.transparencyTextureName, "AlphaMap"); assert.equal(area.doGenerateDepthArea, false);
    assert.deepEqual(area.defaultParameters.get("Default"), [1, 2, 3, 4]); assert.equal(area.defaultTextures.get("AlbedoMap").resFilePath, "res:/albedo.dds");
  }
  const projected = generic.decalShaderData.get("decal.fx"); assert.equal(projected.additive, true);
  assert.deepEqual(projected.parameters, ["DecalPaint", "Fallback"]); assert.deepEqual(projected.parentTextures, ["NormalMap", "MissingMap"]);
  assert.equal(projected.defaultTextures.get("AlbedoMap").resFilePath, "res:/decal.dds");
});

test("Blue roundtrip and clone retain shader helper behavior and detached declared children", () =>
{
  for (const record of Object.values(records()))
  {
    const values = new DictWriter().WriteObject(record, {}, {persistOnly: true, forceTypeTags: true});
    const roundtrip = new DictReader({declarations: true}).CreateObject(values);
    const clone = new Copier().CloneTo(record);
    for (const copy of [roundtrip, clone])
    {
      assert.equal(copy.constructor, record.constructor); assert.deepEqual(copy.Assign(), record.Assign());
      assert.notEqual(copy.parameters[0], record.parameters[0]); assert.notEqual(copy.defaultTextures[0], record.defaultTextures[0]);
      assert.equal(copy.defaultTextures[0].constructor, EveSOFDataTexture);
    }
    for (const field of CjsSchema.getSchema(record.constructor).members) assert.ok(Object.hasOwn(values, field.name), field.name + " is persisted");
  }
});
