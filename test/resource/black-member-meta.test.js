// What BlackReader reads each member as, from the class's compiled ClassInfo (ClassInfo.meta): the VARTYPE,
// where an IROOT value goes, and a structure list's layout, as Carbon's BlueStructureDefinitions give it.
// The facts the retired plain-data reader pinned for its own registry (blue/dropped/black/test).
import assert from "node:assert/strict";
import test from "node:test";

import "../../npm/dist/trinity/index.js";
import "../../npm/dist/sof/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/CjsSchema.js";
import { type } from "../../npm/dist/blue/schema/index.js";
import { ClassInfo } from "../../npm/dist/global/model/graph/ClassInfo.js";
import { BLACK_DESTINATION } from "../../npm/dist/global/model/graph/VarEntry.js";
import { declaredMemberType, structureLayout } from "../../npm/dist/blue/schema/compileClassInfo.js";
import { VARTYPE } from "../../npm/dist/global/consts/blue.js";
import { exposure as be } from "../../npm/dist/blue/exposure/be.js";

const entry = (className, name) =>
{
  const found = ClassInfo.exposeToBlue(CjsSchema.getConstructor(className)).entries.get(name);
  assert.ok(found, `${className}.${name} is persisted`);
  return found;
};
const layout = (className, name) => entry(className, name).structure;
const offsets = structure => structure.fields.map(field => [ field.name, field.offset ]);

test("declared kinds give Carbon's VARTYPE and destination", () =>
{
  assert.equal(declaredMemberType({ kind: "root" }).type, VARTYPE.IROOT);
  assert.equal(declaredMemberType({ kind: "rootRef" }).type, VARTYPE.IROOTPTR);
  assert.equal(declaredMemberType({ kind: "rootWeak" }).type, VARTYPE.IROOTWEAKREF);
  assert.equal(declaredMemberType({ kind: "list", itemType: { kind: "rootRef" } }).destination, BLACK_DESTINATION.LIST);
  assert.equal(declaredMemberType({ kind: "map", valueType: { kind: "rootRef" } }).destination, BLACK_DESTINATION.DICT);
  assert.equal(declaredMemberType({ kind: "set", itemType: { kind: "rootRef" } }).destination, BLACK_DESTINATION.SET);
  assert.equal(declaredMemberType({ kind: "path" }).type, VARTYPE.STDSTRING);
  assert.equal(declaredMemberType({ kind: "wpath" }).type, VARTYPE.STDWSTRING);
  // MAP_ATTRIBUTE_AS_CUSTOM_BINARY_BLOCK is the only binary block (BlueExposureMacros.h:157-161).
  assert.equal(declaredMemberType({ kind: "uint8", binary: true }).type, VARTYPE.BINARYBLOCK);
  assert.equal(declaredMemberType({ kind: "typedArray", arrayType: "Uint32Array" }).type, VARTYPE.UINT32ARRAY);
  // A runtime-only member has no VARTYPE, so a file naming it fails with Carbon's "Invalid attribute type".
  assert.equal(declaredMemberType({ kind: "rootRef", runtimeOnly: true }).type, VARTYPE.INVALID);
});

test("persisted members keep their declared key and table order", () =>
{
  class Owner { _boosters = null; baseName = ""; }
  CjsSchema.be.define(Owner, { name: "BlackMetaFirstPersisted", members: [
    { exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, name: "boosters", key: "_boosters", type: { kind: "rootRef" }, edit: { persist: true } },
    { exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, name: "baseName", key: "baseName", type: { kind: "wstring" }, edit: { persist: true } }
  ] });
  const { entries } = ClassInfo.exposeToBlue(Owner);
  assert.deepEqual([ ...entries.keys() ], [ "boosters", "baseName" ]);
  assert.equal(entries.get("boosters").key, "_boosters");
  assert.equal(entries.get("boosters").type, VARTYPE.IROOTPTR);
  assert.equal(entries.get("baseName").type, VARTYPE.STDWSTRING);
});

test("a structure list's item class must be registered and declare a structure", () =>
{
  class Item { value = 0; }
  CjsSchema.be.define(Item, { name: "BlackMetaNoStructItem", fields: { value: [ type.uint32, be.mapAttribute(be.PERSIST) ] } });
  assert.throws(() => structureLayout("BlackMetaNoStructItem"), /BlackMetaNoStructItem has no structureDefinition/);
  assert.throws(() => structureLayout("BlackMetaNeverRegisteredItem"), /BlackMetaNeverRegisteredItem is not registered \(import its package\)/);
});

test("structure-list offsets match Carbon's BlueStructureDefinitions", () =>
{
  // LocatorStructureDef, EveLocatorSets.cpp:32-39 (partTag from trinity a9a60056).
  const locator = layout("EveLocatorSets", "locators");
  assert.equal(entry("EveLocatorSets", "locators").destination, BLACK_DESTINATION.STRUCTURELIST);
  assert.deepEqual(offsets(locator), [ [ "position", 0 ], [ "direction", 12 ], [ "scale", 28 ], [ "boneIndex", 40 ], [ "partTag", 44 ] ]);
  assert.equal(locator.size, 48);
  // The list before a9a60056 ends at 44, a member boundary (EveDistributionPlacementGeneratorLocators.cpp:6-12).
  assert.ok(locator.boundaries.includes(44));
  assert.deepEqual(offsets(layout("EveDistributionPlacementGeneratorLocators", "locators")).slice(0, 4), offsets(locator).slice(0, 4));
  // Tr2CurveScalarKeyDef (Tr2CurveScalar.cpp:11-20), Tr2CurveQuaternionKeyDef (Tr2CurveQuaternion.cpp:11-17).
  assert.deepEqual(offsets(layout("Tr2CurveScalar", "keys")),
    [ [ "time", 0 ], [ "value", 4 ], [ "leftTangent", 8 ], [ "rightTangent", 12 ], [ "id", 16 ], [ "interpolation", 18 ], [ "tangentType", 19 ] ]);
  assert.deepEqual(offsets(layout("Tr2CurveQuaternion", "keys")), [ [ "time", 0 ], [ "value", 4 ], [ "id", 20 ], [ "interpolation", 22 ] ]);
});

test("Tr2Effect's structure lists use 8-byte shared strings, as Carbon's definitions give", () =>
{
  // Tr2ShaderOptionStructureDef (Tr2Effect.cpp:110-114), Tr2EffectParameterStructureDef (:33-37).
  assert.deepEqual(offsets(layout("Tr2Effect", "options")), [ [ "name", 0 ], [ "value", 8 ] ]);
  assert.equal(layout("Tr2Effect", "options").size, 16);
  assert.deepEqual(offsets(layout("Tr2Effect", "constParameters")), [ [ "name", 0 ], [ "value", 8 ] ]);
  assert.equal(layout("Tr2Effect", "constParameters").size, 24);
  // Tr2SamplerOverrideStructureDef (Tr2Effect.cpp:84-95); the size includes the trailing Tr2SamplerStateAL shared_ptr (Tr2Effect.h:37).
  assert.deepEqual(offsets(layout("Tr2Effect", "samplerOverrides")), [
    [ "name", 0 ], [ "addressU", 8 ], [ "addressV", 12 ], [ "addressW", 16 ], [ "filter", 20 ],
    [ "mipFilter", 24 ], [ "lodBias", 28 ], [ "maxMipLevel", 32 ], [ "maxAnisotropy", 36 ]
  ]);
  assert.equal(layout("Tr2Effect", "samplerOverrides").size, 56);
});

// EveBannerSet.cpp:22-30, EveChildInstanceContainer.cpp:13-19, EveSOFData.cpp:123-129, Tr2TimelineController.cpp:24-28.
// Sizes include C++ storage the definition does not list.
test("banner, child, SOF and timeline layouts match their donor definitions", () =>
{
  for (const [ owner, field, size, expected ] of [
    [ "EveBannerSet", "banners", 56, [ [ "bone", 0 ], [ "position", 4 ], [ "rotation", 16 ], [ "scaling", 32 ], [ "angleX", 44 ], [ "angleY", 48 ] ] ],
    [ "EveChildInstanceContainer", "transforms", 44, [ [ "scale", 0 ], [ "rotation", 12 ], [ "translation", 28 ], [ "boneIndex", 40 ] ] ],
    [ "EveSOFDataInstancedMesh", "instances", 44, [ [ "rotation", 0 ], [ "scaling", 16 ], [ "translation", 28 ], [ "boneIndex", 40 ] ] ],
    [ "Tr2TimelineController", "entries", 12, [ [ "startTime", 0 ], [ "endTime", 4 ], [ "trackID", 8 ] ] ]
  ])
  {
    assert.equal(layout(owner, field).size, size, `${owner}.${field}`);
    assert.deepEqual(offsets(layout(owner, field)), expected, `${owner}.${field}`);
  }
  assert.ok(!layout("EveBannerSet", "banners").fields.some(field => field.name === "reference"));
});

test("resource paths are plain strings to the reader; a wide path reads from the wide table", () =>
{
  assert.equal(entry("Tr2Mesh", "geometryResPath").type, VARTYPE.STDSTRING);
  assert.equal(entry("EveSOFDataHullLightSetTexturedPointLight", "texturePath").type, VARTYPE.STDWSTRING);
});
