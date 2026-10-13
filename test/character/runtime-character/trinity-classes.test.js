import { getRegisteredClassName } from "../../../npm/dist/global/compose/className.js";
import { blue, NotifyModified } from "../../../npm/dist/global/blue/index.js";
import * as distBlue from "../../../npm/dist/global/blue/index.js";
import { TriGeometryRes } from "../../../npm/dist/resource/index.js";
import { Tr2Mesh } from "../../../npm/dist/trinity/index.js";
import { StubResMan } from "../../support/stubResMan.js";
import "../../../npm/dist/trinity/index.js";
import { finalizeReaderObject } from "../../../npm/dist/global/schema/hydration.js";
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import {
  ITr2AnimationUpdater,
  ITr2SkinnedObject,
  Tr2InteriorPlaceable,
  Tr2InteriorLightSet,
  Tr2InteriorLightSource,
  Tr2InteriorPerLightPSData,
  Tr2InteriorPerObjectLightData,
  Tr2InteriorPerObjectPSData,
  Tr2InteriorScene,
  Tr2IntKeyGenerator,
  Tr2IntSkinnedObject,
  Tr2Model,
  Tr2SkinnedModel,
  Tr2SkinnedObject,
  Tr2SkinnedObjectLod,
  TriMatrix,
  WodBakingScene
} from "../../../npm/dist/character/index.js";

const NO_PARENT = 0xffffffff;

/** A prepared geometry resource whose payload holds these skeletons and one mesh binding the first skeleton's bones. */
function SkeletonGeometry(skeletons)
{
  const geometry = new TriGeometryRes();
  geometry.SetPayload({
    skeletons,
    meshes: [ { areas: [], boneBindings: (skeletons[0]?.bones ?? []).map(name => ({ name, bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] } })) } ]
  });
  geometry.MarkPrepared();
  return geometry;
}

/** A real Tr2Mesh on geometry whose BindToRig calls are recorded and still run. */
function RecordingMesh(geometry, calls)
{
  const mesh = new Tr2Mesh();
  mesh.SetGeometryRes(geometry);
  const bind = mesh.BindToRig.bind(mesh);
  mesh.BindToRig = (...args) => { calls.push(args); return bind(...args); };
  return mesh;
}

class FakeLodProxy
{
  constructor(name, options = {})
  {
    this.name = name;
    // A real model, so the object's calls on it are the ones it declares.
    this.model = options.model ?? Object.assign(new Tr2SkinnedModel(), { name });
    this.temporary = options.temporary === true;
    this.resident = options.resident !== false;
    this.selected = 0;
    this.updates = [];
    this.builderObjects = [];
    this.objects = [];
  }

  GetObject()
  {
    return this.model;
  }

  IsTemporary()
  {
    return this.temporary;
  }

  IsResident()
  {
    return this.resident;
  }

  OnSelected()
  {
    this.selected++;
  }

  Update(time, timeout)
  {
    this.updates.push([ time, timeout ]);
    return true;
  }

  SetObject(value)
  {
    this.objects.push(value);
    this.model = value;
  }

  SetObjectFromBuilder(value)
  {
    this.builderObjects.push(value);
    this.model = value;
  }
}


test("verified Trinity classes are exported from src/character/trinity with their source families", () =>
{
  const expectations = [
    [Tr2InteriorScene, "Tr2InteriorScene", "interior"],
    [Tr2InteriorPlaceable, "Tr2InteriorPlaceable", "interior"],
    [Tr2IntSkinnedObject, "Tr2IntSkinnedObject", "interior"],
    [Tr2Model, "Tr2Model", "trinityCore"],
    [Tr2SkinnedModel, "Tr2SkinnedModel", "trinityCore"],
    [Tr2SkinnedObject, "Tr2SkinnedObject", "trinityCore"],
    [WodBakingScene, "WodBakingScene", "wod"]
  ];

  for (const [Constructor, className, family] of expectations)
  {
    assert.equal(CjsSchema.getClassName(Constructor), className, `${className} schema className`);
    assert.equal(CjsSchema.getClassFamily(Constructor), family, `${className} family`);
  }

  // Tr2SkinnedModel keeps its base-class relationship after the move.
  assert.ok(new Tr2SkinnedModel() instanceof Tr2Model, "Tr2SkinnedModel extends Tr2Model");
});

test("the character layer owns ITr2InteriorLight as a field-free nominal Carbon contract", () =>
{
  new Tr2InteriorScene();
  assert.equal(
    existsSync(new URL("../../../src/character/trinity/interior/ITr2InteriorLight.js", import.meta.url)),
    true
  );
  assert.equal(getRegisteredClassName(CjsSchema.GetConstructor("ITr2InteriorLight")), "ITr2InteriorLight");
  assert.equal(CjsSchema.getSchema(CjsSchema.GetConstructor("ITr2InteriorLight")).fields.length, 0);
  assert.equal(CjsSchema.getField(Tr2InteriorScene, "lights")?.type?.itemType, "ITr2InteriorLight");
});

test("the character layer owns the WOD baking scene contract without engine realization", () =>
{
  const scene = new WodBakingScene();
  const source = readFileSync(
    new URL("../../../src/character/trinity/wod/WodBakingScene.js", import.meta.url),
    "utf8"
  );

  assert.equal(scene.Avatar, null);
  assert.equal(CjsSchema.getField(WodBakingScene, "Avatar")?.type?.className, "Tr2SkinnedObject");
  assert.equal(CjsSchema.getField(WodBakingScene, "visualizeMethod")?.enum?.enumType, "VisualizeMethod");
  assert.equal(CjsSchema.getMethod(WodBakingScene, "Render")?.impl?.status, "notImplemented");
  assert.equal(CjsSchema.getMethod(WodBakingScene, "Update")?.impl?.status, "notImplemented");
  assert.equal(source.includes("Generated by format-carbon carbon-class --emit"), false);
  assert.match(source, /trinity\/trinity\/Wod\/WodBakingScene\.cpp/);
});

test("the character layer exports the nominal animation-updater contract", () =>
{
  assert.equal(CjsSchema.GetConstructor("ITr2AnimationUpdater"), ITr2AnimationUpdater);
  const updater = new ITr2AnimationUpdater();
  for (const method of [ "PrePhysicsAnimation", "PostPhysicsAnimation", "GetAnimationTransforms", "GetAnimationBoneList" ])
  {
    assert.equal(CjsSchema.getMethod(ITr2AnimationUpdater, method).impl.status, "abstract");
    assert.throws(() => updater[method](), /must be implemented by a pose provider/);
  }
});

test("the character layer exports the nominal skinned-object transform contract", () =>
{
  assert.equal(CjsSchema.GetConstructor("ITr2SkinnedObject"), ITr2SkinnedObject);
  const object = new ITr2SkinnedObject();
  for (const method of [ "GetScaling", "GetRotation", "GetPosition" ])
  {
    assert.equal(CjsSchema.getMethod(ITr2SkinnedObject, method).impl.status, "abstract");
    assert.throws(() => object[method](), /must be implemented by a skinned object/);
  }
});

test("character interior classes retain their source-backed inheritance and scalar bounds", () =>
{
  const object = new Tr2IntSkinnedObject();
  const placeable = new Tr2InteriorPlaceable();

  assert.ok(object instanceof Tr2SkinnedObject);
  assert.equal(object.boundingSphereRadius, 0);
  assert.equal(placeable.boundingSphereRadius, 0);
  assert.equal(CjsSchema.getField(Tr2IntSkinnedObject, "boundingSphereRadius")?.type?.kind, "float32");
  assert.equal(CjsSchema.getField(Tr2InteriorPlaceable, "boundingSphereRadius")?.type?.kind, "float32");
  assert.equal(CjsSchema.getField(Tr2IntSkinnedObject, "visualModel")?.type?.className, "Tr2SkinnedModel");
});

test("native skinned-object LOD helper selects whole models at exact thresholds", () =>
{
  new Tr2SkinnedObjectLod();
  // Every class registers its name (class-ownership.md, Class-shape rules), native helpers included.
  assert.equal(CjsSchema.GetConstructor("Tr2SkinnedObjectLod"), Tr2SkinnedObjectLod);
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObjectLod, "SetLOD")?.carbon?.method, true);
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObjectLod, "SetLOD")?.impl?.status, "implemented");

  const select = diameter =>
  {
    const lod = new Tr2SkinnedObjectLod();
    const high = new FakeLodProxy("high");
    const medium = new FakeLodProxy("medium");
    const low = new FakeLodProxy("low");
    lod.highDetailProxy = high;
    lod.mediumDetailProxy = medium;
    lod.lowDetailProxy = low;
    lod.PopulateLods();
    return { lod, high, medium, low, model: lod.SetLOD(null, diameter) };
  };

  const low = select(150);
  assert.equal(low.model, low.low.model);
  assert.equal(low.lod.GetCurrentLod(), 2);
  assert.equal(low.low.selected, 1);

  const medium = select(500);
  assert.equal(medium.model, medium.medium.model);
  assert.equal(medium.lod.GetCurrentLod(), 1);

  const high = select(501);
  assert.equal(high.model, high.high.model);
  assert.equal(high.lod.GetCurrentLod(), 0);
});

// The unload units below are Carbon's (ticks), which arrive with BlueObjectProxy.
const lodUnitsSkip = "BlueObjectProxy" in distBlue ? false
  : "npm/dist predates BlueObjectProxy and the tick-based LOD unload; rebuild npm/dist";

test("native skinned-object LOD helper preserves proxy fallback and lifecycle rules", { skip: lodUnitsSkip }, () =>
{
  const lod = new Tr2SkinnedObjectLod();
  assert.equal(lod.HaveLodSetup(), false);
  assert.equal(lod.GetCurrentLod(), -1);
  assert.equal(lod.SetLOD(null, 1000), null);
  assert.equal(lod.IsCastingShadow(), true);
  assert.equal(lod.IsSimulatingCloth(0), true);

  const temporaryHigh = new FakeLodProxy("temporary-high", {
    temporary: true,
    resident: false
  });
  const residentMedium = new FakeLodProxy("resident-medium");
  const residentLow = new FakeLodProxy("resident-low");
  lod.highDetailProxy = temporaryHigh;
  lod.mediumDetailProxy = residentMedium;
  lod.lowDetailProxy = residentLow;
  lod.PopulateLods();

  assert.equal(lod.SetLOD(null, 1000), residentMedium.model);
  assert.equal(lod.GetCurrentLod(), 1);
  assert.equal(residentMedium.selected, 1);
  assert.equal(lod.IsCastingShadow(), false);
  assert.equal(lod.IsSimulatingCloth(0), false);
  assert.equal(lod.IsSimulatingCloth(1), true);

  // Tr2SkinnedObjectLOD.cpp:75-80: deltaTime is Blue ticks compared as float
  // seconds against g_unloadLODMaxFrametime (0.1f, cpp:12); the timeout is
  // TimeFromDouble(10.0) ticks (cpp:21).
  assert.equal(lod.UnloadLodIfNeeded(20, 1000000), false);
  assert.deepEqual(temporaryHigh.updates, [[ 20, 100000000 ]]);
  assert.deepEqual(residentMedium.updates, [[ 20, 0 ]]);
  assert.deepEqual(residentLow.updates, [[ 20, 100000000 ]]);
  assert.equal(lod.UnloadLodIfNeeded(30, 1001000), false);
  assert.equal(residentMedium.updates.length, 1);

  const changedModel = { name: "changed" };
  lod.OnModelChanged(changedModel);
  assert.deepEqual(residentMedium.builderObjects, [ changedModel ]);
});

test("Tr2IntSkinnedObject delegates LOD as one whole-model identity", () =>
{
  const object = new Tr2IntSkinnedObject();
  const high = new FakeLodProxy("high");
  const medium = new FakeLodProxy("medium");
  const low = new FakeLodProxy("low");
  const boneUpdates = [];
  object.highDetailModel = high;
  object.mediumDetailModel = medium;
  object.lowDetailModel = low;
  object.UpdateBones = (...args) => boneUpdates.push(args);
  object.Initialize();

  // The maintained native base has no working bounding-sphere override, so
  // its retained estimate remains zero and selects low after initialization.
  object.SetLOD({});
  assert.equal(object.visualModel, low.model);
  assert.equal(object.currentLod, 2);
  assert.equal(object.skinningMatrixCount, 0);
  assert.deepEqual(boneUpdates, [[ 0, null ]]);

  object.GetBoundingSphere = out =>
  {
    out[3] = 1;
    return true;
  };
  object.SetLOD({
    IsSphereVisible: () => true,
    GetPixelSizeAccross: () => 501
  });
  assert.equal(object.visualModel, high.model);
  assert.equal(object.currentLod, 0);
  assert.equal(object.estimatedPixelDiameter, 501);
  assert.deepEqual(boneUpdates, [[ 0, null ], [ 0, null ]]);
});

test("Tr2SkinnedModel selects exact resource skeletons and resets bindings", () =>
{
  const skeletons = [
    { name: "Other", bones: [ "Root" ], parents: Uint32Array.of(NO_PARENT) },
    { name: "Hero", bones: [ "Root" ], parents: Uint32Array.of(NO_PARENT) }
  ];
  const geometryRes = SkeletonGeometry(skeletons);
  const model = new Tr2SkinnedModel();

  // What Initialize's acquisition sets; the resource then notifies RebuildCachedData.
  model.geometryRes = geometryRes;
  model.skeletonName = "Hero";
  model.RebuildCachedData(geometryRes);
  assert.equal(model.GetSkeleton(), skeletons[1]);

  model.skeletonName = "hero";
  model.RebuildCachedData(geometryRes);
  assert.equal(model.GetSkeleton(), null, "native skeleton selection is case-sensitive");

  model.skeletonName = "Other";
  model.RebuildCachedData(geometryRes);
  assert.equal(model.GetSkeleton(), skeletons[0]);
  model.ReleaseCachedData(geometryRes);
  assert.equal(model.GetSkeleton(), null);
  model.RebuildCachedData(geometryRes);
  assert.equal(model.GetSkeleton(), skeletons[0]);

  const bindCalls = [];
  const boneNames = [ "Root" ];
  model.meshes.push(RecordingMesh(geometryRes, bindCalls));
  model.BindToRig(boneNames, 1, false);
  model.BindToRig(boneNames, 1, false);
  assert.equal(bindCalls.length, 1);
  assert.equal(bindCalls[0][3], true, "an initially dirty model forces its first mesh bind");
  model.ResetBindings();
  model.BindToRig(boneNames, 1, false);
  assert.equal(bindCalls.length, 2);
  assert.equal(bindCalls[1][3], true, "reset is consumed by the next mesh bind");

  let resets = 0;
  model.ResetBindings = () => { resets++; };
  model.ResetAnimationBindings();
  assert.equal(resets, 1);
  assert.equal(CjsSchema.getMethod(Tr2SkinnedModel, "GetSkeleton")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2SkinnedModel, "BindToRig")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2SkinnedModel, "ResetBindings")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2SkinnedModel, "ResetAnimationBindings")?.impl?.status, "implemented");
});

test("Tr2SkinnedObject exposes the verified binding reset and skeleton tag", () =>
{
  const object = new Tr2SkinnedObject();
  let resets = 0;

  assert.equal(object.GetSkeletonTag(), 0);
  object.ResetAnimationBindings();
  object.visualModel = { ResetBindings: () => { resets++; } };
  object.ResetAnimationBindings();
  assert.equal(resets, 1);
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObject, "ResetAnimationBindings")?.impl?.status,
    "implemented");
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObject, "GetSkeletonTag")?.impl?.status,
    "implemented");
});

test("Tr2SkinnedObject rebuilds immediate CPU rig mappings and skinning palettes", () =>
{
  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
  const headWorld = new Float32Array(identity);
  headWorld[12] = 5;
  headWorld[13] = 6;
  headWorld[14] = 7;

  const skeleton = {
    name: "Hero",
    bones: [ "Root", "Head" ],
    parents: Uint32Array.of(NO_PARENT, 0),
    invBindTransforms: [ identity, identity ]
  };
  const geometryRes = SkeletonGeometry([ skeleton ]);
  const model = new Tr2SkinnedModel();
  const meshBinds = [];
  model.geometryRes = geometryRes;
  model.skeletonName = "Hero";
  model.meshes.push(RecordingMesh(geometryRes, meshBinds));
  model.RebuildCachedData(geometryRes);

  const object = new Tr2SkinnedObject();
  const animationBoneNames = [ "Root", "Head" ];
  let transforms = [ identity, headWorld ];
  object.visualModel = model;
  object.animationUpdater = {
    GetAnimationBoneList: () => animationBoneNames,
    GetAnimationTransforms: () => transforms
  };

  object.UpdateBones(1, null);
  assert.equal(object.GetSkeletonTag(), 1);
  assert.equal(object.renderRigBoneCount, 2);
  assert.equal(object.skinningMatrixCount, 2);
  const palette = object.GetSkinningMatrices();
  assert.equal(palette.length, 24);
  assert.deepEqual(Array.from(palette.slice(12, 24)), [
    1, 0, 0, 5,
    0, 1, 0, 6,
    0, 0, 1, 7
  ]);
  palette.fill(99);
  assert.notEqual(object.GetSkinningMatrices()[0], 99);

  object.UpdateBones(2, null);
  assert.equal(object.GetSkeletonTag(), 1, "an unchanged mapping keeps the native tag stable");
  assert.equal(meshBinds.length, 2, "the mapping reset is consumed by the following mesh bind");

  transforms = [ identity ];
  animationBoneNames.pop();
  object.UpdateBones(3, null);
  assert.equal(object.GetSkeletonTag(), 2);
  assert.equal(object.skinningMatrixCount, 1);
  assert.equal(object.GetSkinningMatrices().length, 12);

  const tagBeforeReset = object.GetSkeletonTag();
  object.ResetAnimationBindings();
  assert.equal(object.GetSkeletonTag(), tagBeforeReset, "reset alone does not rebuild the mapping");
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObject, "UpdateBones")?.impl?.status, "adapted");
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObject, "GetSkinningMatrices")?.impl?.status,
    "adapted");
});

test("whole-model LOD swaps rebuild valid rig mappings but ignore missing skeletons", () =>
{
  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
  const skeleton = { name: "Hero", bones: [ "Root" ], parents: Uint32Array.of(NO_PARENT), invBindTransforms: [ identity ] };
  const model = new Tr2SkinnedModel();
  model.geometryRes = SkeletonGeometry([ skeleton ]);
  model.skeletonName = "Hero";
  model.RebuildCachedData(model.geometryRes);

  const object = new Tr2SkinnedObject();
  object.highDetailModel = new FakeLodProxy("high", { model });
  object.lod.PopulateLods();
  object.SetLOD({});
  assert.equal(object.currentLod, 0);
  assert.equal(object.GetSkeletonTag(), 1);
  assert.equal(object.skinningMatrixCount, 1);

  const missing = new Tr2SkinnedObject();
  missing.highDetailModel = new FakeLodProxy("high", { model: new Tr2SkinnedModel() });
  missing.lod.PopulateLods();
  missing.SetLOD({});
  assert.equal(missing.currentLod, 0);
  assert.equal(missing.GetSkeletonTag(), 0);
  assert.equal(missing.skinningMatrixCount, 0);
});

test("Tr2SkinnedObject exposes verified animation-updater bone queries", () =>
{
  const object = new Tr2SkinnedObject();
  const head = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    10, 20, 30, 1
  ]);
  object.animationUpdater = {
    GetAnimationBoneList: () => [ "Root", "Head" ],
    GetAnimationTransforms: () => [ new Float32Array(16), head ]
  };

  assert.equal(object.GetBoneIndex("Head"), 1);
  assert.equal(object.GetBoneIndex("Missing"), 0xffffffff);
  assert.equal(object.GetBoneTransform(1), head);
  assert.equal(object.GetBoneTransform(2), null);

  const out = new Float32Array(3);
  assert.equal(object.GetBonePosition(1, out), out);
  assert.deepEqual(Array.from(out), [ 10, 20, 30 ]);
  assert.deepEqual(Array.from(object.GetBonePosition(99)), [ 0, 0, 0 ]);
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObject, "GetBoneIndex")?.carbon?.method, true);
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObject, "GetBonePosition")?.impl?.status, "adapted");
  assert.equal(CjsSchema.getMethod(Tr2SkinnedObject, "GetBoneTransform")?.impl?.status, "adapted");
});

test("interior constant-buffer records preserve native fixed-array cardinalities", () =>
{
  const perObject = new Tr2InteriorPerObjectPSData();
  const perLight = new Tr2InteriorPerLightPSData();

  assert.deepEqual(perObject.padding, [ 0, 0, 0 ]);
  assert.equal(CjsSchema.getField(Tr2InteriorPerObjectPSData, "padding")?.type?.kind, "array");
  assert.equal(perObject.pointLights.length, 10);
  assert.ok(perObject.pointLights.every(value => value instanceof Tr2InteriorPerObjectLightData));
  assert.equal(CjsSchema.getField(Tr2InteriorPerObjectPSData, "pointLights")?.type?.kind, "array");
  assert.equal(perObject.spotLights.length, 4);
  assert.notStrictEqual(perObject.spotLights[0], perObject.spotLights[1]);
  assert.equal(CjsSchema.getField(Tr2InteriorPerObjectPSData, "spotLights")?.type?.kind, "array");
  assert.ok(perLight.lightData instanceof Tr2InteriorPerObjectLightData);
  assert.equal(perLight.shadowMatrix.length, 6);
  assert.equal(perLight.shadowRect.length, 6);
  assert.equal(perLight.shadowInfluence.length, 6);
  assert.equal(CjsSchema.getField(Tr2InteriorPerLightPSData, "shadowMatrix")?.type?.kind, "array");
  assert.notStrictEqual(perLight.shadowMatrix[0], perLight.shadowMatrix[1]);
  assert.notStrictEqual(perLight.shadowRect[0], perLight.shadowRect[1]);
  assert.notStrictEqual(perLight.shadowInfluence[0], perLight.shadowInfluence[1]);
  assert.equal(CjsSchema.getField(Tr2InteriorPerObjectPSData, "pointLights")?.type?.itemType?.kind,
    "root");
  assert.equal(CjsSchema.getField(Tr2InteriorPerObjectPSData, "pointLights")?.type?.itemType?.className,
    "Tr2InteriorPerObjectLightData");

  const normalizedObject = CjsSchema.from("Tr2InteriorPerObjectPSData", {
    padding: [ 4 ],
    pointLights: [ { radius: 3 } ],
    spotLights: [ new Array(16).fill(2), new Array(16).fill(3), new Array(16).fill(4), new Array(16).fill(5), new Array(16).fill(6) ]
  });
  assert.deepEqual(normalizedObject.padding, [ 4, 0, 0 ]);
  assert.equal(normalizedObject.pointLights.length, 10);
  assert.equal(normalizedObject.pointLights[0].radius, 3);
  assert.ok(normalizedObject.pointLights.every(value => value instanceof Tr2InteriorPerObjectLightData));
  assert.equal(normalizedObject.spotLights.length, 4);

  const normalizedLight = CjsSchema.from("Tr2InteriorPerLightPSData", {
    shadowMatrix: [],
    shadowRect: [[ 1, 2, 3, 4 ]],
    shadowInfluence: Array.from({ length: 8 }, () => [ 5, 6, 7, 8 ])
  });
  assert.equal(normalizedLight.shadowMatrix.length, 6);
  assert.equal(normalizedLight.shadowRect.length, 6);
  assert.deepEqual(Array.from(normalizedLight.shadowRect[0]), [ 1, 2, 3, 4 ]);
  assert.equal(normalizedLight.shadowInfluence.length, 6);
});

test("interior light sets and sort keys expose only their real source surface", () =>
{
  const lights = new Tr2InteriorLightSet();
  lights.AddLight({ name: "first" });
  lights.AddLight({ name: "second" });
  assert.equal(lights.GetNumOfActiveLights(), 2);
  assert.equal(CjsSchema.getField(Tr2InteriorLightSet, "lightSource"), null);
  assert.equal(CjsSchema.getField(Tr2InteriorLightSet, "lightDataValid"), null);
  assert.equal(CjsSchema.getField(Tr2InteriorLightSet, "lightData"), null);
  assert.throws(() => lights.PopulateLightData(), /not implemented/);
  assert.equal(CjsSchema.getMethod(Tr2InteriorLightSet, "AddLight")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2InteriorLightSet, "Clear")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2InteriorLightSet, "GetNumOfActiveLights")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2InteriorLightSet, "PopulateLightData")?.impl?.status, "notImplemented");
  lights.Clear();
  assert.equal(lights.GetNumOfActiveLights(), 0);

  assert.equal(Tr2IntKeyGenerator.ALLOW_GDPR, false);
  assert.equal(Tr2IntKeyGenerator.GetSortType(), 2);
  assert.equal(Tr2IntKeyGenerator.Less({ renderingMode: 4, depth: 1 }, { renderingMode: 4, depth: 2 }), true);
  assert.equal(Tr2IntKeyGenerator.Less({ renderingMode: 4, depth: 3 }, { renderingMode: 4, depth: 2 }), false);
  assert.equal(Tr2IntKeyGenerator.Less({ renderingMode: 1, depth: 1 }, { renderingMode: 1, depth: 2 }), false);
  assert.equal(Object.hasOwn(new Tr2IntKeyGenerator(), "ALLOW_GDPR"), false);
  assert.equal(CjsSchema.getMethod(Tr2IntKeyGenerator, "Less")?.carbon?.method, true);
  assert.equal(CjsSchema.getMethod(Tr2IntKeyGenerator, "Less")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(Tr2IntKeyGenerator, "GetSortType")?.impl?.status, "implemented");

  const source = new Tr2InteriorLightSource();
  assert.equal(source.IsSpotLight(), false);
  source.coneAlphaOuter = 88.9;
  assert.equal(source.IsSpotLight(), true);
});

test("TriMatrix persists its matrix elements, and PTriMatrix members hold the mat4 itself", () =>
{
  const matrix = new TriMatrix();
  assert.equal(CjsSchema.GetConstructor("TriMatrix"), TriMatrix);
  assert.deepEqual(CjsSchema.getSchema(TriMatrix).members.slice(0, 2).map(({ name, key, index }) => [ name, key, index ]),
    [ [ "_11", "_matrix", 0 ], [ "_12", "_matrix", 1 ] ]);
  assert.deepEqual(Array.from(matrix.GetMatrix()), [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]);
  matrix.Translation(1, 2, 3);
  const other = new TriMatrix();
  other.Scaling(2, 2, 2);
  // Carbon this * other applies this first: the translation is then scaled.
  matrix.Multiply(other);
  assert.deepEqual(Array.from(matrix.GetMatrix().subarray(12, 15)), [ 2, 4, 6 ]);
  for (const Owner of [ Tr2InteriorPlaceable, Tr2SkinnedObject ])
  {
    const type = CjsSchema.getField(Owner, "transform")?.type;
    assert.equal(type?.kind, "mat4");
    assert.equal(type?.wrapped, "TriMatrix");
  }
});


test("batched model and LOD proxy replacements share native helper storage", () =>
{
  const object = new Tr2IntSkinnedObject();
  const previous = new FakeLodProxy("previous");
  object.highDetailModel = previous;
  object.Initialize();
  object.SetLOD({});
  const replacement = new FakeLodProxy("replacement");
  const model = new Tr2SkinnedModel();
  object.visualModel = model;
  object.highDetailModel = replacement;
  object.OnModified("visualModel");
  object.OnModified("highDetailModel");
  assert.equal(object.lod.highDetailProxy, replacement);
  assert.deepEqual(replacement.builderObjects, [model]);
  assert.deepEqual(previous.builderObjects, []);
  assert.equal(object.currentLod, object.GetCurrentLod());
});


test("real character model subtree survives plain skinned owner hydration and LOD initialization", (t) =>
{
  const manager = blue.resMan;
  blue.resMan = new StubResMan();
  t.after(() => { blue.resMan = manager; });
  const modelValues = JSON.parse(readFileSync(new URL("../../support/skinnedModelAsset.json", import.meta.url), "utf8")).object;
  const owner = CjsSchema.from("Tr2IntSkinnedObject", { visualModel: modelValues });
  assert.ok(owner.visualModel instanceof Tr2SkinnedModel);
  assert.equal(owner.visualModel.meshes.length, 14);
  assert.equal(owner.visualModel.skeletonName, "Root");
  assert.equal("UpdateValues" in owner, false);
  assert.equal("GetValues" in owner, false);
  // The real asset has no LOD proxies. Wrap its model in the existing CPU proxy
  // seam to isolate native Initialize from editing notifications.
  const proxy = new FakeLodProxy("real model", { model: owner.visualModel });
  const control = new Tr2IntSkinnedObject();
  control.highDetailModel = proxy;
  finalizeReaderObject(control, { initialize: false });
  assert.equal(control.lod.HaveLodSetup(), false);
  assert.equal(control.lod.SetLOD({}, 1000), null,
    "negative control: suppressed initialization leaves LOD unavailable");
  const initialized = new Tr2IntSkinnedObject();
  initialized.highDetailModel = proxy;
  finalizeReaderObject(initialized);
  assert.equal(initialized.lod.HaveLodSetup(), true);
  assert.equal(initialized.lod.SetLOD({}, 1000), owner.visualModel);
});
