import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { AudioGameObject, BackAndForthData, CjsEveThrottleableState, CjsLightData, DecalVSPerObjectData, EveBannerItem, EveBannerLight, EveBannerSet, EveBezierCurve, EveBoxVolume, EveChildAudio, EveChildFogVolume, EveChildLightingOverride, EveChildModifierSRT, EveChildSpherePinPerObjectData, EveChildTransform, EveChildUpdateParams, EveCircle, EveCustomMask, EveDistanceField, EveEllipseDefinition, EveEllipseSet, EveEllipsoidVolume, EveHazeSet, EveHazeSetLight, EveImpactOverlay, EveLODHelper, EveLineData, EveLocator2, EveLocatorSets, EvePerObjectPSData, EvePerObjectVSData, EvePlaneLight, EvePlaneSet, EvePlaneSetItem, EveRemotePositionCurve, EveSpaceObjectDecal, EveSpaceObjectPSData, EveSpaceObjectVSData, EveSpacePerObjectData, EveSpherePinPerObjectData, EveSphereVolume, EveSpotlightLight, EveSpotlightSet, EveSpotlightSetItem, EveSpriteLight, EveSpriteLineSet, EveSpriteLineSetItem, EveSpriteSet, EveSpriteSetItem, EveThrottleable, EveVirtualCamera, EveVirtualCameraBehaviourFloatAdd, EveVirtualCameraBehaviourFloatBase, EveVirtualCameraBehaviourFloatDamping, EveVirtualCameraBehaviourFloatNoise, EveVirtualCameraBehaviourFloatSet, EveVirtualCameraBehaviourVector3Base, EveVirtualCameraBehaviourVector3Damping, EveVirtualCameraBehaviourVector3Inertia, EveVirtualCameraBehaviourVector3MoveBetween, EveVirtualCameraBehaviourVector3MoveForward, EveVirtualCameraBehaviourVector3MoveRight, EveVirtualCameraBehaviourVector3MoveUp, EveVirtualCameraBehaviourVector3Offset, EveVirtualCameraBehaviourVector3Orbit, EveVirtualCameraBehaviourVector3Shake, EveVirtualCameraSystem, EveVirtualCameraTransitionCut, EveVirtualCameraTransitionLerp, FollowASplineData, FormationData, InertiaData, Locator, LocatorData, PlacementDataWithIdentifier, PlayFXData, ProcessLifetimeData, SeekTargetData, Tr2CurveExtrapolation, Tr2Light, Tr2Lod, Tr2PointLight, Tr2ScalarFader, Tr2SpotLight, Tr2TexturedPointLight, TriPerlinCurve } from "../npm/dist/index.js";
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}
function assertEquals(actual, expected, message)
{
  if (actual !== expected)
  {
    throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
  }
}
function assertAlmostEquals(actual, expected, epsilon = 1e-6)
{
  if (Math.abs(actual - expected) > epsilon)
  {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
}

test("ellipse definitions keep Carbon defaults and dirty their owning set", () =>
{
  const definition = new EveEllipseDefinition();
  assertEquals(definition.center[0], 0);
  assertEquals(definition.planeNormal[0], 0);
  assertEquals(definition.planeNormal[1], 1);
  assertEquals(definition.planeNormal[2], 0);
  assertEquals(definition.semiMajor, 1);
  assertEquals(definition.semiMinor, 1);
  assertEquals(CjsSchema.getField(EveEllipseDefinition, "center")?.type.kind, "vec3");
  assertEquals(CjsSchema.getField(EveEllipseDefinition, "planeNormal")?.type.kind, "vec3");

  let dirtied = 0;
  definition.SetDirtyFlag(() => dirtied++);
  assertEquals(definition.OnModified(), true);
  assertEquals(dirtied, 1);
  definition.SetDirtyFlag(null);
  definition.OnModified();
  assertEquals(dirtied, 1);

  const set = new EveEllipseSet();
  assertEquals(set.AddEllipse([1, 2, 3], 4, 2, [0, 0, 1], 30), true);
  assertEquals(set.ellipses.length, 1);
  assertEquals(set.ellipses[0] instanceof EveEllipseDefinition, true);
  assertEquals(set.ellipses[0].center[2], 3);
  assertEquals(set.ellipses[0].planeNormal[2], 1);
  set.ClearEllipses();
  assertEquals(set.ellipses.length, 0);
});

test("scene audio wrappers delegate through an optional runtime-audio emitter", () =>
{
  const calls = [];
  const emitter = {
    Mute: () => calls.push("mute"),
    Unmute: () => calls.push("unmute"),
    SendEvent: name => { calls.push(`event:${name}`); return 42; },
    SetName: name => calls.push(`name:${name}`),
    SetPosition: (_front, _top, position) => calls.push(`position:${position.join(",")}`)
  };

  const object = new AudioGameObject();
  object.audioEmitter = emitter;
  vec3.set(object.translation, 1, 2, 3);
  assertEquals(object.__init__(), true);
  assertEquals(object.GetAudioEmitter(), emitter);
  object.SetEmitterName("beacon");
  assertEquals(object.PlayAudioEvent("play_beacon"), 42);
  object.UpdateSyncronous({ time: 0 });
  object.mute = true;
  object.OnModified("mute");
  assert(calls.includes("name:beacon"));
  assert(calls.includes("event:play_beacon"));
  assert(calls.includes("position:1,2,3"));
  assert(calls.includes("mute"));

  const child = new EveChildAudio();
  child.audioEmitter = emitter;
  child.SetEmitterName("child");
  child.UpdateSyncronous(null, { localToWorldTransform: mat4.fromTranslation(mat4.create(), [4, 5, 6]) });
  assert(calls.includes("name:child"));
  assert(calls.includes("position:4,5,6"));
  assertEquals(child.GetBoundingSphere(vec4.create()), false);
});

test("lighting overrides combine Carbon volume bounds and camera intensity", () =>
{
  const volume = new EveSphereVolume();
  vec3.set(volume.position, 1, 0, 0);
  volume.radius = 4;
  volume.innerRadius = 2;

  const override = new EveChildLightingOverride();
  override.volumes.push(volume);
  assertEquals(override.priority, EveChildLightingOverride.Priority.MEDIUM_PRIORITY);
  assertEquals(override.Initialize(), true);
  const sphere = vec4.create();
  assertEquals(override.GetBoundingSphere(sphere), true);
  assertEquals(sphere[0], 1);
  assertEquals(sphere[3], 4);

  override.UpdateAsyncronous({ renderContext: { GetViewPosition: () => [1, 0, 0] } }, { localToWorldTransform: mat4.create() });
  const values = override.GetOverrides();
  assertEquals(values.intensity, 1);
  assertEquals(values.value.backgroundIntensity, 1);
  assertEquals(values.value.sunColor[3], 1);
  assertEquals(CjsSchema.getField(EveChildLightingOverride, "sunColor")?.type.kind, "color");

  override.UpdateAsyncronous({ renderContext: { GetViewPosition: () => [20, 0, 0] } }, { localToWorldTransform: mat4.create() });
  assertEquals(override.GetOverrides().intensity, 0);
  assertEquals(override.IsAlwaysOn(), true);
});

test("fog volumes expose Carbon settings, bounds, and camera intensity", () =>
{
  const volume = new EveSphereVolume();
  vec3.set(volume.position, 2, 0, 0);
  volume.radius = 5;
  volume.innerRadius = 1;

  const fog = new EveChildFogVolume();
  fog.volumes.push(volume);
  fog.thickness = 3;
  fog.thicknessEnabled = true;
  assertEquals(fog.priority, EveChildFogVolume.Priority.MEDIUM_PRIORITY);
  assertEquals(fog.Initialize(), true);

  const sphere = vec4.create();
  assertEquals(fog.GetBoundingSphere(sphere), true);
  assertEquals(sphere[0], 2);
  assertEquals(sphere[3], 5);
  assertEquals(fog.boundingSphereCenter[0], 2);
  assertEquals(fog.boundingSphereRadius, 5);

  fog.UpdateAsyncronous({ renderContext: { GetViewPosition: () => [2, 0, 0] } }, { localToWorldTransform: mat4.create() });
  let settings = fog.GetFroxelFogSettings();
  assertEquals(settings.intensity, 1);
  assertEquals(settings.thickness.value, 3);
  assertEquals(settings.thickness.enabled, true);
  assertEquals(settings.godRayNoiseFrequency.value, 15);

  fog.UpdateAsyncronous({ renderContext: { GetViewPosition: () => [20, 0, 0] } }, { localToWorldTransform: mat4.create() });
  settings = fog.GetFroxelFogSettings();
  assertEquals(settings.intensity, 0);
  assertEquals(CjsSchema.getField(EveChildFogVolume, "fogColor")?.type.kind, "color");
});

test("promoted Eve data classes expose source-backed metadata and defaults", async () =>
{
  const backAndForth = new BackAndForthData();
  const params = new EveChildUpdateParams();
  const decalVS = new DecalVSPerObjectData();
  const childSpherePin = new EveChildSpherePinPerObjectData();
  new EvePerObjectVSData();
  new EvePerObjectPSData();
  new EveRemotePositionCurve();
  new EveSpaceObjectPSData();
  new EveSpaceObjectVSData();
  new EveSpacePerObjectData();
  new EveCustomMask();
  new EveImpactOverlay();
  new EveSpaceObjectDecal();
  const spherePin = new EveSpherePinPerObjectData();
  const line = new EveLineData();
  const followSpline = new FollowASplineData();
  const formation = new FormationData();
  const inertia = new InertiaData();
  new EveThrottleable();
  new EveLocator2();
  new EveLocatorSets();
  new Locator();
  new LocatorData();
  const placement = new PlacementDataWithIdentifier();
  const playFx = new PlayFXData();
  const lifetime = new ProcessLifetimeData();
  const seekTarget = new SeekTargetData();
  assertEquals(CjsSchema.GetConstructor("BackAndForthData"), BackAndForthData);
  assertEquals(CjsSchema.GetConstructor("EveChildUpdateParams"), EveChildUpdateParams);
  assertEquals(CjsSchema.GetConstructor("DecalVSPerObjectData"), DecalVSPerObjectData);
  assertEquals(CjsSchema.GetConstructor("EveChildSpherePinPerObjectData"), EveChildSpherePinPerObjectData);
  assertEquals(CjsSchema.GetConstructor("EveLineData"), EveLineData);
  assertEquals(CjsSchema.GetConstructor("EvePerObjectVSData"), EvePerObjectVSData);
  assertEquals(CjsSchema.GetConstructor("EvePerObjectPSData"), EvePerObjectPSData);
  assertEquals(CjsSchema.GetConstructor("EveRemotePositionCurve"), EveRemotePositionCurve);
  assertEquals(CjsSchema.GetConstructor("EveSpaceObjectPSData"), EveSpaceObjectPSData);
  assertEquals(CjsSchema.GetConstructor("EveSpaceObjectVSData"), EveSpaceObjectVSData);
  assertEquals(CjsSchema.GetConstructor("EveSpacePerObjectData"), EveSpacePerObjectData);
  assertEquals(CjsSchema.GetConstructor("EveCustomMask"), EveCustomMask);
  assertEquals(CjsSchema.GetConstructor("EveImpactOverlay"), EveImpactOverlay);
  assertEquals(CjsSchema.GetConstructor("EveSpaceObjectDecal"), EveSpaceObjectDecal);
  assertEquals(CjsSchema.GetConstructor("EveSpherePinPerObjectData"), EveSpherePinPerObjectData);
  assertEquals(CjsSchema.GetConstructor("EveThrottleable"), EveThrottleable);
  assertEquals(CjsSchema.GetConstructor("FollowASplineData"), FollowASplineData);
  assertEquals(CjsSchema.GetConstructor("FormationData"), FormationData);
  assertEquals(CjsSchema.GetConstructor("InertiaData"), InertiaData);
  assertEquals(CjsSchema.GetConstructor("EveLocator2"), EveLocator2);
  assertEquals(CjsSchema.GetConstructor("EveLocatorSets"), EveLocatorSets);
  assertEquals(CjsSchema.GetConstructor("Locator"), Locator);
  assertEquals(CjsSchema.GetConstructor("LocatorData"), LocatorData);
  assertEquals(CjsSchema.GetConstructor("PlacementDataWithIdentifier"), PlacementDataWithIdentifier);
  assertEquals(CjsSchema.GetConstructor("PlayFXData"), PlayFXData);
  assertEquals(CjsSchema.GetConstructor("ProcessLifetimeData"), ProcessLifetimeData);
  assertEquals(CjsSchema.GetConstructor("SeekTargetData"), SeekTargetData);
  assertEquals(CjsSchema.GetConstructor("CjsEveThrottleableState"), null);
  assertEquals(backAndForth.locatorIndex, -1);
  assertEquals(backAndForth.seek, true);
  assertEquals(backAndForth.arrived, true);
  assertEquals(params.activationStrength, 1);
  assertEquals(params.controllerUpdateFrequency, 0.5);
  assertEquals(params.isVisible, true);
  assertVec3(params.worldVelocity, [0, 0, 0]);
  assertMat4(params.localToWorldTransform, mat4.create());
  assertMat4(decalVS.worldMatrix, mat4.create());
  assertMat4(decalVS.invWorldMatrix, mat4.create());
  assertMat4(decalVS.parentBoneMatrix, mat4.create());
  assertMat4(childSpherePin.worldMatrix, mat4.create());
  assertVec4(childSpherePin.pinRotation, [0, 0, 0, 0]);
  assertMat4(spherePin.worldMatrix, mat4.create());
  assertQuat(spherePin.pinRotation, [0, 0, 0, 1]);
  assertVec3(line.position1, [0, 0, 0]);
  assertVec3(line.position2, [0, 0, 0]);
  assertEquals(followSpline.tunnelLock, -1);
  assertEquals(followSpline.tunnelPoint, 0);
  assertEquals(formation.assignedSlot, -1);
  assertVec3(inertia.agentAccel, [0, 0, 0]);
  assertVec3(placement.initialTranslation, [0, 0, 0]);
  assertQuat(placement.initialRotation, [0, 0, 0, 1]);
  assertVec3(placement.initialScale, [1, 1, 1]);
  assertVec3(placement.additionalTranslation, [0, 0, 0]);
  assertQuat(placement.additionalRotation, [0, 0, 0, 1]);
  assertVec3(placement.additionalScale, [1, 1, 1]);
  assertEquals(placement.boneIndex, -1);
  assertEquals(placement.initialPlacementID, -1);
  assertEquals(playFx.effectPlaying, false);
  assertVec3(playFx.oldTarget, [0, 0, 0]);
  assertEquals(lifetime.hasUsedEntryTunnel, false);
  assertEquals(lifetime.hasUsedExitTunnel, false);
  assertEquals(lifetime.assignedLifeTimeTunnel, 0);
  assertEquals(lifetime.tunnelPoint, 0);
  assertEquals(lifetime.hasSpawned, false);
  assertEquals(seekTarget.bucketId, -1);
  assertEquals(seekTarget.locatorIndex, -1);
  assertEquals(seekTarget.arrived, true);
  assertEquals(CjsSchema.getField(BackAndForthData, "timePassed")?.type.kind, "float32");
  assertEquals(CjsSchema.getField(EveChildUpdateParams, "localToWorldTransform")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(DecalVSPerObjectData, "inverseDecalMatrix")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(EveChildSpherePinPerObjectData, "pinColor")?.type.kind, "color");
  assertEquals(CjsSchema.getField(EveRemotePositionCurve, "startPositionCurve")?.type.className, "ITriVectorFunction");
  assertEquals(CjsSchema.getField(EveSpaceObjectVSData, "worldTransform")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(EveSpaceObjectVSData, "activeMorphTargetsCount")?.type.kind, "uint32");
  assertEquals(CjsSchema.getField(EveSpaceObjectPSData, "clipSphereCenter")?.type.kind, "vec3");
  assertEquals(CjsSchema.getField(EveSpacePerObjectData, "clipRadiusSq")?.type.kind, "float32");
  assertEquals(CjsSchema.getField(EveSpherePinPerObjectData, "pinUV")?.type.kind, "vec4");
  assertEquals(CjsSchema.getField(EveLineData, "color1")?.type.kind, "color");
  assertEquals(CjsSchema.getField(EveLocator2, "transform")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(PlacementDataWithIdentifier, "uniqueID")?.type.kind, "uint32");
  assertEquals(CjsSchema.getField(PlacementDataWithIdentifier, "boneIndex")?.type.kind, "int32");
  assertEquals(CjsSchema.getField(ProcessLifetimeData, "hasSpawned")?.type.kind, "boolean");
  assertEquals(CjsSchema.getField(ProcessLifetimeData, "tunnelPoint")?.type.kind, "int32");
  assertEquals(CjsSchema.getField(SeekTargetData, "position")?.type.kind, "vec3");
  const summary = JSON.parse(await readFile("src/generated/summary.json", "utf8"));
  const skipped = new Map((summary.skipped || []).map(item => [item.className, item]));
  for (const className of ["BackAndForthData", "EveBasicPerObjectData", "DecalVSPerObjectData", "EveChildSpherePinPerObjectData", "EveChildUpdateParams", "EveCustomMask", "EveLineData", "EvePerObjectPSData", "EvePerObjectVSData", "EveRemotePositionCurve", "EveSpaceObjectDecal", "EveSpaceObjectPSData", "EveSpaceObjectVSData", "EveSpacePerObjectData", "EveSpherePinPerObjectData", "EveThrottleable", "FollowASplineData", "FormationData", "InertiaData", "EveLocator2", "EveLocatorSets", "Locator", "LocatorData", "PlacementDataWithIdentifier", "PlayFXData", "ProcessLifetimeData", "SeekTargetData"])
  {
    const item = skipped.get(className);
    assert(item && item.family.startsWith("eve"), `${className} should be skipped by generated output`);
  }
});

test("custom-mask per-object data preserves Carbon fixed array layouts", () =>
{
  const vs = new EveSpaceObjectVSData();
  const ps = new EveSpaceObjectPSData();
  const perObject = new EveSpacePerObjectData();
  assertEquals(vs.customMaskMatrix.length, 2);
  assertEquals(vs.customMaskData.length, 2);
  assertEquals(vs.boneOffsets.length, 4);
  assertEquals(ps.shLightingCoefficients.length, 7);
  assertEquals(ps.customMaskMaterialIDs.length, 2);
  assertEquals(ps.customMaskTargets.length, 2);
  assertEquals(perObject.customMaskMatrix.length, 2);
  assertEquals(perObject.shLighting.length, 7);
  assert(vs.customMaskMatrix[0] !== vs.customMaskMatrix[1]);
  assert(ps.customMaskTargets[0] !== ps.customMaskTargets[1]);
  assertEquals(CjsSchema.getField(EveSpaceObjectVSData, "customMaskMatrix")?.type.kind, "array");
  assertEquals(CjsSchema.getField(EveSpaceObjectVSData, "customMaskMatrix")?.type.itemType, "mat4");

  const hydrated = EveSpaceObjectVSData.from({
    customMaskData: [[1, 2, 3, 4]],
    boneOffsets: [1, 2, 3, 4, 5]
  });
  assert(hydrated.customMaskData[0] instanceof Float32Array);
  assert(hydrated.customMaskData[1] instanceof Float32Array);
  assertVec4(hydrated.customMaskData[0], [1, 2, 3, 4]);
  assertVec4(hydrated.customMaskData[1], [0, 0, 0, 0]);
  assertEquals(hydrated.boneOffsets.join(","), "1,2,3,4");
});

test("EveCustomMask fills and clears both Carbon per-object mask slots", () =>
{
  const mask = new EveCustomMask();
  const position = [1, 2, 3];
  const scaling = [9, 2, 3];
  const rotation = [0, 0, 0, 1];
  const targets = [1, 0, 1, 0];
  assertEquals(mask.Setup(position, scaling, rotation, true, true, false, 258, targets), true);
  position[0] = 99;
  targets[0] = 0;
  assertVec3(mask.position, [1, 2, 3]);
  assertVec4(mask.targetMaterials, [1, 0, 1, 0]);
  assertEquals(mask.materialIndex, 2);

  const debug = mask.GetDebugDrawMatrix(mat4.create(), 10);
  assertAlmostEquals(debug[0], 1);
  assertAlmostEquals(debug[5], 20);
  assertAlmostEquals(debug[10], 30);
  assertVec3([debug[12], debug[13], debug[14]], [1, 2, 3]);

  const vs = new EveSpaceObjectVSData();
  const ps = new EveSpaceObjectPSData();
  assertEquals(mask.FillPerObjectData(1, vs, ps), true);
  const expected = mat4.transpose(mat4.create(), mat4.invert(mat4.create(), mat4.fromRotationTranslationScale(mat4.create(), mask.rotation, mask.position, mask.scaling)));
  assertMat4(vs.customMaskMatrix[1], expected);
  assertVec4(vs.customMaskData[1], [1, 1, 0, 0]);
  assertVec4(ps.customMaskMaterialIDs[1], [2, 0, 0, 0]);
  assertVec4(ps.customMaskTargets[1], [1, 0, 1, 0]);
  assertVec4(ps.customMaskClamps, [0, 0, 1, 0]);

  assertEquals(EveCustomMask.ZeroPerObjectData(1, vs, ps), true);
  assertMat4(vs.customMaskMatrix[1], mat4.create());
  assertVec4(vs.customMaskData[1], [0, 0, 0, 0]);
  assertVec4(ps.customMaskMaterialIDs[1], [0, 0, 0, 0]);
  assertVec4(ps.customMaskTargets[1], [0, 0, 0, 0]);
  assertVec4(ps.customMaskClamps, [0, 0, 1, 0]);
  assertEquals(mask.FillPerObjectData(2, vs, ps), false);
});

test("EveSpaceObjectDecal keeps Carbon graph state and private SOF indices CPU-only", () =>
{
  const decal = new EveSpaceObjectDecal();
  assertEquals(decal.batchType, 1);
  assertEquals(decal.parentBoneIndex, -1);
  assertEquals(decal.display, true);
  assertEquals(CjsSchema.getField(EveSpaceObjectDecal, "batchType")?.io?.read, true);
  assertEquals(CjsSchema.getField(EveSpaceObjectDecal, "display")?.io?.write, true);
  assertEquals(CjsSchema.getField(EveSpaceObjectDecal, "display")?.io?.persist, undefined);

  const position = [1, 2, 3];
  const scaling = [2, 3, 4];
  decal.SetPosition(position);
  decal.SetScaling(scaling);
  decal.SetRotation([0, 0, 0, 1]);
  position[0] = 99;
  scaling[0] = 99;
  assertVec3(decal.GetPosition(), [1, 2, 3]);
  assertVec3(decal.GetScaling(), [2, 3, 4]);
  assertEquals(decal.Initialize(), true);
  const expectedMatrix = mat4.fromRotationTranslationScale(mat4.create(), decal.rotation, decal.position, decal.scaling);
  assertMat4(decal.GetDecalMatrix(), expectedMatrix);
  assertMat4(mat4.multiply(mat4.create(), decal.GetInverseDecalMatrix(), decal.GetDecalMatrix()), mat4.create());

  const indices = [[0, 1, 2, 3, 4, 5], new Uint32Array([7, 8, 9, 10])];
  decal.SetIndices(indices);
  indices[0][0] = 99;
  assertEquals(decal.hasStaticIndexBuffers, true);
  assertEquals(decal.GetDecalPrimitiveCounts().join(","), "2,1");
  const copied = decal.GetStaticIndexBuffers();
  copied[0][0] = 88;
  assertEquals(decal.GetStaticIndexBuffers()[0][0], 0);

  const optionCalls = [];
  const effect = { SetOption: (...args) => optionCalls.push(args) || true };
  decal.SetEffect(effect);
  assertEquals(decal.SetShaderOption("SKINNED", "1"), true);
  assertEquals(optionCalls[0].join(","), "SKINNED,1");

  const clone = new EveSpaceObjectDecal();
  clone.SetIndices([[1, 2, 3]]);
  assertEquals(clone.CopyFrom(decal), true);
  assertEquals(clone.hasStaticIndexBuffers, true, "CopyFrom preserves the destination's private SOF indices");
  assertVec3(clone.position, [1, 2, 3]);
  decal.SetIndices(null);
  assertEquals(decal.hasStaticIndexBuffers, false);
});

test("EveSpriteSet builds the authored SOF sprite graph without renderer buffers", () =>
{
  const set = new EveSpriteSet();
  assertEquals(set.display, true);
  assertEquals(set.skinned, false);
  assertEquals(set.intensity, 1);
  assertEquals(CjsSchema.getField(EveSpriteSet, "sprites")?.type.kind, "list");
  assertEquals(CjsSchema.getField(EveSpriteSet, "lights")?.type.kind, "list");

  const existing = new EveSpriteSetItem();
  assertEquals(set.Add(existing), existing);
  const simple = set.Add(vec3.fromValues(1, 2, 3), 4, vec4.fromValues(1, 0, 0, 1), vec4.fromValues(0, 1, 0, 1));
  assertVec3(simple.position, [1, 2, 3]);
  assertEquals(simple.minScale, 4);
  assertEquals(simple.maxScale, 4);
  assertEquals(simple.blinkRate, 0);

  const full = set.Add(vec3.fromValues(4, 5, 6), 0.25, 0.5, 2, 8, 0.75, vec4.fromValues(0.1, 0.2, 0.3, 0.4), vec4.fromValues(0.5, 0.6, 0.7, 0.8));
  assertEquals(full.blinkRate, 0.25);
  assertEquals(full.blinkPhase, 0.5);
  assertEquals(full.minScale, 2);
  assertEquals(full.maxScale, 8);
  assertEquals(full.falloff, 0.75);
  assertEquals(set.GetSprites().length, 3);

  const effect = {};
  set.SetName("Engine Glow");
  set.SetEffect(effect);
  set.SetSkinned(true);
  assertEquals(set.GetName(), "Engine Glow");
  assertEquals(set.GetEffect(), effect);
  assertEquals(set.skinned, true);
  assertEquals(set.Initialize(), true);
  set.AddLightFromSOF({ index: 1, boneMatrix: mat4.create() });
  assertEquals(set.lights.length, 1);
  assertEquals(set.lights[0].index, 1);
  set.Clear();
  assertEquals(set.GetSprites().length, 0);
});

test("EveBannerSet preserves the authored physical attachment graph", () =>
{
  const set = new EveBannerSet();
  const source = new EveBannerItem();
  assertEquals(set.display, true);
  assertEquals(set.isPickable, false);
  assertEquals(set.key, 0);
  assertEquals(CjsSchema.getField(EveBannerSet, "banners")?.type.kind, "list");
  assertEquals(CjsSchema.getField(EveBannerSet, "lights")?.type.kind, "list");
  assertEquals(CjsSchema.getField(EveBannerSet, "primaryTextureParameter")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(EveBannerSet, "primaryTextureParameter")?.io?.persist, true);
  assertEquals(CjsSchema.getField(EveBannerItem, "reference")?.type.kind, "int32");
  assertEquals(CjsSchema.getField(EveBannerItem, "reference")?.io?.persist, true);

  source.bone = 3;
  source.position.set([1, 2, 3]);
  source.scaling.set([4, 5, 6]);
  source.reference = 42;
  const banner = set.AddBanner(source);
  assert(banner instanceof EveBannerItem);
  assert(banner !== source, "Carbon structure-list append copies the banner value");
  assertVec3(banner.position, [1, 2, 3]);
  source.position[0] = 99;
  assertVec3(banner.position, [1, 2, 3]);
  assertEquals(set.GetReference(0), 42);
  const restoredBanner = EveBannerItem.from(banner.GetValues({ persistOnly: true }));
  assertEquals(restoredBanner.reference, 42);

  const options = [];
  const effect = { SetOption: (...args) => options.push(args) };
  set.SetEffect(effect);
  set.SetShaderOption("BANNER", "1");
  assertEquals(options[0].join(","), "BANNER,1");
  set.SetKey(-102);
  assertEquals(set.GetPickingID(), 0xffffffff);
  set.SetPrimaryTextureParameter({ resourcePath: "res:/banner.dds" });
  set.AddLightFromSOF({ index: 0, boneMatrix: mat4.create() });
  assert(set.lights[0] instanceof EveBannerLight);
  const bannerLight = EveBannerLight.FromSOF({ lightData: { flags: 1 }, saturation: 0.5 });
  assert(bannerLight.lightData instanceof CjsLightData);
  assertEquals(bannerLight.saturation, 0.5);
  assertEquals(new EveBannerLight().saturation, 1);
  assertEquals(set.Initialize(), true);
  assertEquals(CjsSchema.getField(EveBannerLight, "lightProfilePath")?.type.kind, "string");
});

test("EvePlaneSet preserves authored quad and SOF-light intent without GPU state", () =>
{
  const set = new EvePlaneSet();
  const item = new EvePlaneSetItem();
  assertEquals(set.display, true);
  assertEquals(set.hideOnLowQuality, false);
  assertEquals(set.skinned, false);
  assertEquals(set.pickBufferID, 0);
  assertVec4(item.color, [1, 1, 1, 1]);
  assertVec4(item.layer1Transform, [1, 1, 0, 0]);
  assertVec4(item.blinkData, [1, 0, 1, 0]);
  assertEquals(CjsSchema.getField(EvePlaneSetItem, "blinkData")?.type.kind, "vec4");
  assertEquals(CjsSchema.getField(EvePlaneSetItem, "blinkData")?.io?.persist, true);
  item.blinkData.set([0.25, 0.5, 0.75, 1]);
  const restoredItem = EvePlaneSetItem.from(item.GetValues({ persistOnly: true }));
  assertVec4(restoredItem.blinkData, [0.25, 0.5, 0.75, 1]);
  assertEquals(CjsSchema.getField(EvePlaneSet, "planes")?.type.kind, "list");

  set.AddPlaneItem(item);
  assertEquals(set.GetPlanes()[0], item, "Carbon plane vectors preserve item identity");
  set.SetPickBufferID(258);
  assertEquals(set.pickBufferID, 2);
  set.SetIsSkinned(true);
  assertEquals(set.skinned, true);

  const options = [];
  set.SetEffect({ SetOption: (...args) => options.push(args) });
  set.SetShaderOption("SKINNED", "1");
  assertEquals(options[0].join(","), "SKINNED,1");
  set.SetImageMapParameter({ name: "ImageMap" });
  set.SetLayerMap1Parameter({ name: "LayerMap1" });
  set.SetLayerMap2Parameter({ name: "LayerMap2" });
  set.SetMaskMapParameter({ name: "MaskMap" });
  set.AddLightFromSOF({ index: 0, boneMatrix: mat4.create() });
  assert(set.lights[0] instanceof EvePlaneLight);
  const planeLight = EvePlaneLight.FromSOF({ lightData: { flags: 1 }, fadeType: EvePlaneLight.FT_FADEINOUT });
  assert(planeLight.lightData instanceof CjsLightData);
  assertEquals(planeLight.saturation, 1);
  assertEquals(planeLight.fadeType, 4);
  assertEquals(EvePlaneLight.FadeType.FT_BLINK, 1);
  assertEquals(CjsSchema.getField(EvePlaneLight, "lightProfilePath")?.type.kind, "string");
  assertEquals(CjsSchema.getField(EvePlaneSet, "lights")?.type.kind, "list");
  assertEquals(CjsSchema.getField(EvePlaneSet, "imageMapParameter")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(EvePlaneSet, "maskMapParameter")?.io?.persist, true);
  assertEquals(set.Initialize(), true);
});

test("EveSpotlightSet preserves authored cone, glow, and SOF-light intent", () =>
{
  const set = new EveSpotlightSet();
  const item = new EveSpotlightSetItem();
  assertEquals(item.boneIndex, 0);
  assertVec4(item.coneColor, [1, 1, 1, 1]);
  assertVec4(item.flareColor, [1, 1, 1, 1]);
  assertVec4(item.spriteColor, [1, 1, 1, 1]);
  assertVec3(item.spriteScale, [1, 1, 1]);

  set.AddSpotlightItem(item);
  assert(set.GetSpotlightItems()[0] === item, "Carbon retains spotlight item identity");
  set.SetName("spotlights");
  set.SetSkinned(true);
  assertEquals(set.GetName(), "spotlights");
  assertEquals(set.skinned, true);

  const options = [];
  const coneEffect = { SetOption: (...args) => options.push(["cone", ...args]) };
  const glowEffect = { SetOption: (...args) => options.push(["glow", ...args]) };
  set.SetConeEffect(coneEffect);
  set.SetGlowEffect(glowEffect);
  assert(set.GetConeEffect() === coneEffect);
  assert(set.GetGlowEffect() === glowEffect);
  set.SetShaderOption("SKINNED", "1");
  assertEquals(options.map(value => value.join(",")).join(";"), "cone,SKINNED,1;glow,SKINNED,1");

  const rawLight = {
    lightData: { position: [1, 2, 3], brightness: 2, flags: 1 },
    index: 7,
    lightProfilePath: "res:/profile.lp",
    boosterGainInfluence: true
  };
  const light = EveSpotlightLight.FromSOF(rawLight);
  assert(light.lightData instanceof CjsLightData);
  assertVec3(light.lightData.position, [1, 2, 3]);
  assertEquals(light.index, 7);
  assertEquals(light.lightProfilePath, "res:/profile.lp");
  assertEquals(light.boosterGainInfluence, true);
  assertEquals(CjsSchema.getField(EveSpotlightLight, "lightProfilePath")?.type.kind, "string");
  set.AddLightFromSOF(rawLight);
  assert(set.lights[0] instanceof EveSpotlightLight);
  assertEquals(CjsSchema.getField(EveSpotlightSet, "lights")?.type.kind, "list");
  assertEquals(CjsSchema.getField(EveSpotlightSet, "spotlightItems")?.type.kind, "list");
  assertEquals(set.Initialize(), true);
});

test("EveSpriteLineSet expands Carbon line and circle positions without renderer buffers", () =>
{
  const line = new EveSpriteLineSetItem();
  vec3.set(line.position, 1, 2, 3);
  vec3.set(line.scaling, 3, 1, 1);
  line.spacing = 2;
  quat.setAxisAngle(line.rotation, [0, 0, 1], Math.PI * 0.5);
  const positions = line.GetPositions();
  assertEquals(positions.length, 3);
  assertVec3(positions[0], [1, 2, 3]);
  assertVec3(positions[1], [1, 4, 3]);
  assertVec3(positions[2], [1, 6, 3]);
  // Carbon returns Sphere(center, halfLength); the port fills its enclosing box.
  assertVec3(box3.$min(line.GetBounds(box3.create())), [-2, 2, 0]);
  assertVec3(box3.$max(line.GetBounds(box3.create())), [4, 8, 6]);
  assertEquals(line.GetBoneIndex(), 0);

  const circle = new EveSpriteLineSetItem();
  circle.isCircle = true;
  vec3.set(circle.scaling, 2, 4, 1);
  circle.spacing = 4;
  const circlePositions = circle.GetPositions();
  assertEquals(circlePositions.length, 4);
  assertVec3(circlePositions[0], [0, 0, 4]);
  assertVec3(circlePositions[1], [2, 0, 0]);
  assertVec3(circlePositions[2], [0, 0, -4]);
  assertVec3(circlePositions[3], [-2, 0, 0]);
  assertVec3(box3.$min(circle.GetBounds(box3.create())), [-4, -4, -4]);
  assertVec3(box3.$max(circle.GetBounds(box3.create())), [4, 4, 4]);

  const set = new EveSpriteLineSet();
  const options = [];
  const effect = { SetOption: (...args) => options.push(args) };
  set.Setup(effect, true);
  set.Add(line);
  assert(set.spriteLines[0] === line, "Carbon retains sprite-line identity");
  set.SetShaderOption("SKINNED", "1");
  assertEquals(options[0].join(","), "SKINNED,1");
  assertEquals(set.effectHash, 0, "effect identity remains adapter-owned");

  const rawLight = {
    lightData: { position: [4, 5, 6], brightness: 3, flags: 1 },
    blinkPhase: 0.25,
    blinkRate: 2,
    minScale: 1,
    maxScale: 5,
    index: 2,
    lightProfilePath: "res:/sprite-profile.lp"
  };
  const light = EveSpriteLight.FromSOF(rawLight);
  assert(light.lightData instanceof CjsLightData);
  assertVec3(light.lightData.position, [4, 5, 6]);
  assertEquals(light.index, 2);
  assertEquals(light.lightProfilePath, "res:/sprite-profile.lp");
  assertEquals(CjsSchema.getField(EveSpriteLight, "lightProfilePath")?.type.kind, "string");
  set.AddLightFromSOF(rawLight);
  assert(set.lights[0] instanceof EveSpriteLight);
  assertEquals(CjsSchema.getField(EveSpriteLineSet, "lights")?.type.kind, "list");
  assertEquals(set.display, true);
  assertEquals(set.Initialize(), true);
});

test("EveHazeSet exposes authored SOF lights through its public graph", () =>
{
  const set = new EveHazeSet();
  set.AddLightFromSOF({
    lightData: { position: [7, 8, 9], flags: 1 },
    index: 3,
    lightProfilePath: "res:/haze-profile.lp"
  });
  assert(set.lights[0] instanceof EveHazeSetLight);
  assertVec3(set.lights[0].lightData.position, [7, 8, 9]);
  assertEquals(set.lights[0].lightProfilePath, "res:/haze-profile.lp");
  assertEquals(CjsSchema.getField(EveHazeSet, "lights")?.type.kind, "list");
  assertEquals(CjsSchema.getField(EveHazeSetLight, "lightProfilePath")?.type.kind, "string");
});

test("Tr2Light subclasses preserve Carbon graph defaults without resource realization", () =>
{
  const base = new Tr2Light();
  const point = new Tr2PointLight();
  const spot = new Tr2SpotLight();
  const textured = new Tr2TexturedPointLight();

  assert(base.lightData instanceof CjsLightData);
  assertEquals(base.type, Tr2Light.UNDEFINED_LIGHT);
  assertEquals(point.type, Tr2Light.POINT_LIGHT);
  assertEquals(spot.type, Tr2Light.SPOT_LIGHT);
  assertEquals(textured.type, Tr2Light.POINT_LIGHT);
  assertEquals(point.isDynamic, false);
  assertEquals(spot.isDynamic, false);
  assertEquals(textured.isDynamic, true);
  assertEquals(textured.texture, null);
  assertEquals(textured.Initialize(), true);

  // Flattened storage (2026-07-23 decision): the Blue-mapped LightData
  // members are real decorated fields on the concrete light classes.
  assertEquals(point.flags, 1);
  assertEquals(spot.flags, 1);
  assertEquals(textured.flags, 1);
  assertEquals(point.brightness, 1);
  assertEquals(point.noiseFrequency, 1);
  assertEquals(point.noiseOctaves, 1);
  assertEquals(point.boneIndex, -1);
  assertVec4(point.color, [0, 0, 0, 1]);
  assertEquals(Object.hasOwn(point, "position"), true, "flat fields are the real instance storage");
  assertEquals(Object.hasOwn(spot, "outerAngle"), true, "flat fields are the real instance storage");
  // The compat view shares the owner's math buffers and mirrors its values.
  assert(point.position === point.lightData.position, "the compat view returns the flat math buffer");
  assert(point.color === point.lightData.color, "the compat view returns the flat math buffer");
  point.SetValues({ position: [1, 2, 3] });
  assertVec3(point.lightData.position, [1, 2, 3]);
  point.SetValues({ brightness: 2.5 });
  assertEquals(point.lightData.brightness, 2.5);
  // The flat fields carry the Carbon Blue persistence flags: this is what
  // fixes the light round-trip asymmetry (CARBON-PARITY-REVIEW §3.2).
  assertEquals(CjsSchema.getField(Tr2PointLight, "position")?.io?.persist, true);
  assertEquals(CjsSchema.getField(Tr2PointLight, "brightness")?.io?.persist, true);
  assertEquals(CjsSchema.getField(Tr2SpotLight, "outerAngle")?.io?.persist, true);
  assertEquals(CjsSchema.getField(Tr2TexturedPointLight, "texturePath")?.io?.persist, true);
  assertEquals(CjsSchema.getField(Tr2Light, "lightData"), null, "the separate node is a compat view, not a schema field");
  assertEquals(CjsSchema.getField(Tr2TexturedPointLight, "texture")?.io?.read, true);

  const lightDataIdentity = point.lightData;
  const positionIdentity = point.position;
  const data = new CjsLightData();
  data.radius = 12;
  data.position.set([9, 8, 7]);
  point.SetLightData(data);
  data.radius = 99;
  data.position[0] = 99;
  assertEquals(point.lightData, lightDataIdentity, "SetLightData retains the stable compat view");
  assertEquals(point.position, positionIdentity, "SetLightData coerces into the existing math buffers");
  assertEquals(point.GetLightData().radius, 12, "Carbon SetLightData copies the value struct");
  assertVec3(point.position, [9, 8, 7]);
  assertEquals(point.GetLightData(), point.lightData, "Carbon GetLightData returns the stable value member");
  point.SetBrightnessMultiplier(0.25);
  assertEquals(point.GetBrightnessMultiplier(), 0.25);
  point.ChangeLightColor([0.1, 0.2, 0.3, 0.4]);
  assertVec4(point.color, [0.1, 0.2, 0.3, 0.4]);
  assertVec4(point.lightData.color, [0.1, 0.2, 0.3, 0.4]);

  const hydrated = Tr2PointLight.from({ position: [4, 5, 6], brightness: 3 });
  assertVec3(hydrated.position, [4, 5, 6]);
  assertVec3(hydrated.lightData.position, [4, 5, 6]);
  assertEquals(hydrated.brightness, 3);
  assert(hydrated.position !== point.position, "light instances keep independent mutable values");
  // The pre-flatten nested shape still hydrates (runtime-sof compat).
  const nested = Tr2PointLight.from({ lightData: { position: [7, 8, 9], radius: 5 } });
  assertVec3(nested.position, [7, 8, 9]);
  assertEquals(nested.radius, 5);
  const values = hydrated.GetValues();
  assertEquals(Object.hasOwn(values, "lightData"), false, "flattened fields serialize flat");
  assertVec3(values.position, [4, 5, 6]);
});

test("EveImpactOverlay constructs the CPU graph required by SOF", () =>
{
  const overlay = new EveImpactOverlay();
  const faders = [overlay.shieldHardening, overlay.shieldBoosting, overlay.armorRepairing, overlay.armorHardening, overlay.hullRepairing];
  assertEquals(faders.every(fader => fader instanceof Tr2ScalarFader), true);
  assertEquals(new Set(faders).size, 5, "Carbon creates five independent faders");
  assertEquals(overlay.configuration, 0);
  assertEquals(CjsSchema.getField(EveImpactOverlay, "configuration")?.type?.kind, "int32");
  assertEquals(CjsSchema.getField(EveImpactOverlay, "configuration")?.enum?.enumType, "ImpactConfiguration");
  assertEquals(overlay.GetArmorImpactLifeTime(), 10);
  assertVec3(overlay.GetLastDamageState(), [1, 1, 1]);
  assertEquals(overlay.GetDataTextureOffset(), -1);
  assertEquals(overlay.GetDamageLocatorCount(), 0);

  const curve = {};
  const armorEmitter = {};
  const hullEmitter = {};
  const shader = {};
  const mesh = {};
  assertEquals(overlay.Set(curve, armorEmitter, hullEmitter, shader, mesh, false), true);
  assertEquals(overlay.hullDamageFlickerCurve, curve);
  assertEquals(overlay.armorImpactEmitter, armorEmitter);
  assertEquals(overlay.hullImpactEmitter, hullEmitter);
  assertEquals(overlay.armorDamageShader, shader);
  assertEquals(overlay.mesh, mesh);
  assertEquals(overlay.HasShieldEllipsoid(), false);

  overlay.SetSeed(-1);
  overlay.SetDamageLocatorCount(-1);
  assertEquals(overlay.seed, 0xffffffff);
  assertEquals(overlay.GetDamageLocatorCount(), 0xffffffff);
  assertEquals(overlay.Initialize(), true);

  assertEquals(overlay.ToggleEffect("shieldboost", true, 8), true);
  assertEquals(overlay.shieldBoosting.kickInLength, 2);
  assertEquals(overlay.shieldBoosting.fading, 0.5);
  assertEquals(overlay.shieldHardening.fading, 0);
  assertEquals(overlay.ToggleEffect("ShieldBoost", true, 8), false);
});

test("EveLocator2 exposes Carbon name and transform helpers", () =>
{
  const locator = new EveLocator2();
  assertEquals(locator.GetName(), "");
  assertMat4(locator.GetTransform(), mat4.create());
  locator.SetName("locator_turret_01");
  assertEquals(locator.GetName(), "locator_turret_01");
  const transform = mat4.create();
  mat4.setTranslationFromValues(transform, 4, 5, 6);
  locator.SetTransform(transform);
  assertMat4(locator.GetTransform(), transform);
  transform[12] = 99;
  assertAlmostEquals(locator.GetTransform()[12], 4);
});
test("EveLocatorSets translates and copies locator lists", () =>
{
  const set = new EveLocatorSets();
  const first = makeLocator([1, 2, 3], [0, 0, 0, 1], [1, 1, 1], 7);
  const second = makeLocator([4, 5, 6], [0, 0, 1, 0], [2, 2, 2], 8);
  set.Set("damage", [first]);
  assertEquals(set.GetName(), "damage");
  assert(set.HasName("damage"));
  assertEquals(set.GetLocators().length, 1);
  assertVec3(set.GetLocators()[0].position, [1, 2, 3]);
  assertEquals(set.GetLocators()[0].boneIndex, 7);
  first.position[0] = 99;
  assertVec3(set.GetLocators()[0].position, [1, 2, 3]);
  set.Append([second]);
  assertEquals(set.GetLocators().length, 2);
  assertVec3(set.GetLocators()[1].position, [4, 5, 6]);
  const replacement = {
    position: [7, 8, 9],
    direction: [0, 0, 0, 1],
    boneIndex: 4
  };
  set.SetLocator(1, replacement);
  assertVec3(set.GetLocators()[1].position, [7, 8, 9]);
  assertVec3(set.GetLocators()[1].scale, [0, 0, 0]);
  assertEquals(set.GetLocators()[1].boneIndex, 4);
  replacement.position[0] = 99;
  assertVec3(set.GetLocators()[1].position, [7, 8, 9]);
  const zero = vec3.create();
  set.Translate(zero);
  assertVec3(set.GetLocators()[0].position, [1, 2, 3]);
  set.Translate(vec3.fromValues(10, 20, 30));
  assertVec3(set.GetLocators()[0].position, [11, 22, 33]);
  assertVec3(set.GetLocators()[1].position, [17, 28, 39]);
});
test("EveThrottleable mirrors Carbon update skipping", () =>
{
  const host = {
    updateThrottle: true,
    minUpdateFrequency: 2,
    maxUpdateFrequency: 20,
    currentUpdateFrequency: 10
  };
  const throttle = new CjsEveThrottleableState();
  assertEquals(throttle.ShouldSkipUpdate(host, 1, 100), false);
  assertEquals(host.currentUpdateFrequency, 20);
  assertEquals(throttle.ShouldSkipUpdate(host, 0, 100.01), true);
  assertEquals(host.currentUpdateFrequency, 20);
  assertEquals(throttle.ShouldSkipUpdate(host, 0, 100.06), false);
  assertEquals(host.currentUpdateFrequency, 2);
  host.maxUpdateFrequency = -10;
  host.minUpdateFrequency = -20;
  assertEquals(throttle.ShouldSkipUpdate(host, 0.5, 101), false);
  assertEquals(host.currentUpdateFrequency, 0.1);
  host.updateThrottle = false;
  assertEquals(throttle.ShouldSkipUpdate(host, 1, 101.01), false);
});
test("EveThrottleable exposes the source-backed class wrapper", () =>
{
  const throttle = new EveThrottleable();
  assertEquals(throttle.currentUpdateFrequency, 10);
  assertEquals(throttle.minUpdateFrequency, 2);
  assertEquals(throttle.maxUpdateFrequency, 20);
  assertEquals(throttle.updateThrottle, true);
  assertEquals(throttle.ShouldSkipUpdate(1, 5), false);
  assertEquals(throttle.currentUpdateFrequency, 20);
  assertEquals(throttle.ShouldSkipUpdate(0.5, 5.01), true);
});
test("EveRemotePositionCurve caches Carbon remote sweep values", () =>
{
  const curve = new EveRemotePositionCurve();
  curve.startPositionCurve = makeVectorFunction((time, out) =>
  {
    out[0] = time;
    out[1] = time * 2;
    out[2] = time * 3;
    return out;
  });
  curve.offsetDir1[0] = 1;
  curve.offsetDir1[1] = 2;
  curve.offsetDir1[2] = 3;
  curve.offsetDir2[0] = 5;
  curve.offsetDir2[1] = 6;
  curve.offsetDir2[2] = 7;
  curve.delayTime = 1;
  curve.sweepTime = 4;
  const out = vec3.create();
  curve.Update(10, out);
  assertVec3(out, [11, 22, 33]);
  assertVec3(curve.value, [11, 22, 33]);
  curve.Update(13, out);
  assertVec3(out, [16, 30, 44]);
  assertVec3(curve.value, [16, 30, 44]);
  const cached = vec3.create();
  curve.GetValueAt(999, cached);
  assertVec3(cached, [16, 30, 44]);
});
test("EveRemotePositionCurve preserves Carbon no-start and derivative behavior", () =>
{
  const curve = new EveRemotePositionCurve();
  curve.value[0] = 9;
  curve.value[1] = 8;
  curve.value[2] = 7;
  const out = vec3.fromValues(1, 1, 1);
  curve.Update(3, out);
  assertVec3(out, [0, 0, 0]);
  assertVec3(curve.value, [9, 8, 7]);
  curve.GetValueDotAt(3, out);
  assertVec3(out, [0, 0, 0]);
  out[0] = 4;
  out[1] = 5;
  out[2] = 6;
  curve.GetValueDoubleDotAt(3, out);
  assertVec3(out, [4, 5, 6]);
});
test("EveLODHelper follows Carbon update and merge thresholds", () =>
{
  assertEquals(EveLODHelper.ShouldUpdate(Tr2Lod.TR2_LOD_LOW, 0.99), false);
  assertEquals(EveLODHelper.ShouldUpdate(Tr2Lod.TR2_LOD_LOW, 1), true);
  assertEquals(EveLODHelper.ShouldUpdate(Tr2Lod.TR2_LOD_MEDIUM, 0.1), true);
  assertEquals(EveLODHelper.ShouldUpdate(Tr2Lod.TR2_LOD_HIGH, 0), true);
  assertEquals(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_UNSPECIFIED, Tr2Lod.TR2_LOD_MEDIUM), Tr2Lod.TR2_LOD_MEDIUM);
  assertEquals(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_LOW, Tr2Lod.TR2_LOD_HIGH), Tr2Lod.TR2_LOD_HIGH);

  const sphere = vec4.fromValues(1, 2, 3, 4);
  const context = {
    GetFrustum()
    {
      return {
        IsSphereVisible: value => value === sphere,
        GetPixelSizeAccross: () => 15
      };
    },
    GetLowDetailThreshold: () => 10,
    GetMediumDetailThreshold: () => 20
  };
  assertEquals(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_LOW, sphere, context), Tr2Lod.TR2_LOD_MEDIUM);
  context.GetFrustum = () => ({
    IsSphereVisible: () => false,
    GetPixelSizeAccross: () => 100
  });
  assertEquals(EveLODHelper.MergeLOD(Tr2Lod.TR2_LOD_HIGH, sphere, context), Tr2Lod.TR2_LOD_UNSPECIFIED);
});

test("virtual camera float behaviours follow Carbon update semantics", () =>
{
  const base = new EveVirtualCameraBehaviourFloatBase();
  base.SetName("Fov");
  assertEquals(base.GetName(), "Fov");
  assert(base.IsActive());
  base.active = false;
  assert(!base.IsActive());

  const set = new EveVirtualCameraBehaviourFloatSet();
  set.value = 7;
  assertEquals(set.GetName(), "Set");
  assertEquals(set.Update(null, 2), 5);

  const add = new EveVirtualCameraBehaviourFloatAdd();
  add.value = 4;
  assertEquals(add.Update(null, 0, 0, 2), 4);
  let curveName = "";
  add.scaleCurve = {
    SetName: value => curveName = value,
    GetValue: time => time * 0.5
  };
  add.SetName("Roll");
  assertEquals(curveName, "Roll - Scale Curve");
  assertEquals(add.Update({ GetAnimationTimelineLength: () => 4 }, 0, 0, 2), 1);

  const damping = new EveVirtualCameraBehaviourFloatDamping();
  damping.dampingFactor = 0.5;
  assertEquals(damping.Update(null, 10, 0, 0), 0);
  assertEquals(damping.Update(null, 20, 0, 1), -5);
  assertEquals(damping.Update(null, 20, 0, 2), -2.5);
  assertEquals(CjsSchema.getField(EveVirtualCameraBehaviourFloatDamping, "dampingFactor")?.type.kind, "float32");
});

test("virtual camera float noise builds and evaluates Carbon shake data", () =>
{
  const noise = new EveVirtualCameraBehaviourFloatNoise();
  assert(noise instanceof EveVirtualCameraBehaviourFloatBase);
  assertEquals(noise.GetName(), "Shake");
  assertEquals(noise.perlineScale, 1);
  assertEquals(noise.octaves, 8);
  assertEquals(noise.magnitude, 1);
  assertEquals(noise.magnitudeCurve.extrapolationBefore, Tr2CurveExtrapolation.LINEAR);
  assertEquals(noise.magnitudeCurve.keys.map(key => `${key.time}:${key.value}`).join(","), "0:0,0.001:0.8,0.1:1,1:0");
  noise.SetName("Impact");
  assertEquals(noise.magnitudeCurve.name, "Impact - Magnitude Curve");

  noise.magnitudeCurve = null;
  noise.octaves = 1;
  assertAlmostEquals(noise.Update(null, 100, 0, 0.21), TriPerlinCurve.PerlinNoise1D(0.21, 2, 2, 1), 1e-12);
  noise.octaves = -1;
  assertEquals(noise.Update(null, 100, 0, 1), 0);
});

test("virtual camera vector offset, damping, and inertia follow Carbon", () =>
{
  const base = new EveVirtualCameraBehaviourVector3Base();
  base.SetName("Position");
  assertEquals(base.GetName(), "Position");
  assert(base.IsActive());

  const offset = new EveVirtualCameraBehaviourVector3Offset();
  offset.offset = vec3.fromValues(0, 0, 1);
  offset.proportional = true;
  offset.world = false;
  assertVec3(offset.Update(null, vec3.create(), 0, 0, vec3.create(), 2, vec3.fromValues(1, 0, 0)), [2, 0, 0]);
  offset.world = true;
  offset.proportional = false;
  assertVec3(offset.Update(null, vec3.create(), 0, 0, vec3.create(), 2, vec3.fromValues(1, 0, 0)), [0, 0, 1]);

  const damping = new EveVirtualCameraBehaviourVector3Damping();
  damping.m_dampingRatio = 0.5;
  assertVec3(damping.Update(null, vec3.fromValues(0, 0, 0), 0, 0), [0, 0, 0]);
  assertVec3(damping.Update(null, vec3.fromValues(10, 0, 0), 0, 1), [-5, 0, 0]);
  assertVec3(damping.Update(null, vec3.fromValues(10, 0, 0), 0, 2), [-2.5, 0, 0]);

  const inertia = new EveVirtualCameraBehaviourVector3Inertia();
  inertia.inertiaFactor = 2;
  assertVec3(inertia.Update(null, vec3.create(), 0.5, 0), [0, 0, 0]);
  assertVec3(inertia.Update(null, vec3.fromValues(10, 0, 0), 0.5, 1), [-5, 0, 0]);
  assertVec3(inertia.Update(null, vec3.fromValues(10, 0, 0), 0.5, 2), [-1.25, 0, 0]);
  assertEquals(CjsSchema.getField(EveVirtualCameraBehaviourVector3Damping, "m_dampingRatio")?.type.kind, "float32");
});

test("virtual camera vector shake uses Carbon component phases and view scaling", () =>
{
  const shake = new EveVirtualCameraBehaviourVector3Shake();
  assert(shake instanceof EveVirtualCameraBehaviourVector3Base);
  assertEquals(shake.GetName(), "Shake");
  assertVec3(shake.magnitude, [1, 0.6, 0.2]);
  assertEquals(shake.magnitudeCurve.keys.length, 4);
  shake.SetName("Camera");
  assertEquals(shake.magnitudeCurve.name, "Camera - Magnitude Curve");

  const camera = {
    GetAnimationTimelineLength: () => 1,
    GetPosition: out => vec3.set(out, 0, 0, 0),
    GetPointOfInterest: out => vec3.set(out, 0, 0, 2),
    GetRightDirection: out => vec3.set(out, 1, 0, 0),
    GetUpDirection: out => vec3.set(out, 0, 1, 0),
    GetForwardDirection: out => vec3.set(out, 0, 0, 1)
  };
  shake.magnitudeCurve = null;
  shake.magnitude = vec3.fromValues(1, 1, 1);
  shake.octaves = 1;
  shake.scaleByView = false;
  const raw = [1.1, 10.1, 18.3].map(value => TriPerlinCurve.PerlinNoise1D(value, 2, 2, 1));
  assertVec3(shake.Update(camera, vec3.create(), 0, 0), raw, 1e-6);
  shake.scaleByView = true;
  assertVec3(shake.Update(camera, vec3.create(), 0, 0), raw.map(value => Math.atan(value) * 2), 1e-6);
});

test("virtual camera vector movement behaviours follow Carbon", () =>
{
  const camera = {
    GetAnimationTimelineLength: () => 4,
    GetForwardDirection: out => vec3.set(out, 0, 0, 1),
    GetRightDirection: out => vec3.set(out, 1, 0, 0),
    GetUpDirection: out => vec3.set(out, 0, 1, 0)
  };
  const between = new EveVirtualCameraBehaviourVector3MoveBetween();
  between.start = vec3.create();
  between.end = vec3.fromValues(4, 0, 0);
  between.interpolationCurve = { GetValue: time => time };
  assertVec3(between.Update(camera, vec3.create(), 0, 1, vec3.create(), 1, vec3.fromValues(0, 0, 1)), [1, 0, 0]);
  between.world = false;
  between.proportional = true;
  between.start = vec3.create();
  between.end = vec3.fromValues(0, 0, 2);
  assertVec3(between.Update(camera, vec3.create(), 0, 2, vec3.create(), 2, vec3.fromValues(1, 0, 0)), [2, 0, 0]);
  assertVec3(between.Update({ GetAnimationTimelineLength: () => 0 }, vec3.create(), 0, 2, vec3.create(), 2, vec3.fromValues(1, 0, 0)), [0, 0, 2]);

  for (const [Behaviour, expected] of [[EveVirtualCameraBehaviourVector3MoveForward, [0, 0, 1]], [EveVirtualCameraBehaviourVector3MoveRight, [1, 0, 0]], [EveVirtualCameraBehaviourVector3MoveUp, [0, 1, 0]]])
  {
    const behaviour = new Behaviour();
    behaviour.value = 2;
    behaviour.proportional = false;
    behaviour.scaleCurve = { GetValue: time => time };
    assertVec3(behaviour.Update(camera, vec3.create(), 0, 2, vec3.create(), 3, vec3.fromValues(0, 0, 1)), expected);
  }
  assert(new EveVirtualCameraBehaviourVector3MoveRight() instanceof EveVirtualCameraBehaviourVector3MoveForward);
  assert(new EveVirtualCameraBehaviourVector3MoveUp() instanceof EveVirtualCameraBehaviourVector3MoveForward);

  const orbit = new EveVirtualCameraBehaviourVector3Orbit();
  orbit.world = true;
  orbit.proportional = false;
  orbit.start = 0;
  orbit.end = 90;
  orbit.distance = 2;
  orbit.orbitCurve = { GetValue: time => time };
  orbit.distanceScalarCurve = { GetValue: () => 1 };
  assertVec3(orbit.Update(camera, vec3.create(), 0, 4, vec3.create(), 3, vec3.fromValues(0, 0, 1)), [2, 0, 0]);
  assertEquals(CjsSchema.getField(EveVirtualCameraBehaviourVector3MoveBetween, "interpolationCurve")?.type.className, "Tr2CurveScalar");
});

test("EveVirtualCamera follows Carbon playback, transforms, and behaviours", () =>
{
  const camera = new EveVirtualCamera();
  assertEquals(camera.GetName(), "Virtual Camera");
  assertEquals(camera.GetAnimationTimelineLength(), 10);
  camera.SetPosition(vec3.fromValues(1, 2, 3));
  camera.SetPointOfInterest(vec3.fromValues(1, 2, 4));
  camera.SetFov(0.8);
  camera.SetRoll(15);
  assertVec3(camera.GetPosition(), [1, 2, 3]);
  assertVec3(camera.GetPointOfInterest(), [1, 2, 4]);
  assertVec3(camera.GetForwardDirection(), [0, 0, 1]);

  const copy = new EveVirtualCamera();
  copy.CopyTransform(camera);
  assertVec3(copy.position, [1, 2, 3]);
  assertEquals(copy.fov, 0.8);
  camera.UpdateExternal(vec3.fromValues(4, 5, 6), vec3.fromValues(4, 5, 7), 1.2, 2);
  assertVec3(camera.position, [4, 5, 6]);
  assertEquals(camera.roll, 2);

  camera.positionBehaviours.push({
    IsActive: () => true,
    Update: () => vec3.fromValues(1, 2, 3)
  });
  camera.fovBehaviours.push({
    IsActive: () => true,
    Update: (_camera, current) => 3 - current
  });
  camera.Play();
  camera.Update(0.5);
  assertEquals(camera.localElapsedTime, 0.5);
  assertVec3(camera.position, [1, 2, 3]);
  assertEquals(camera.fov, 3);
  camera.Pause();
  camera.UpdateToLocalTime(2);
  assertAlmostEquals(camera.localElapsedTime, 2);
  assert(!camera.running);
  camera.Stop();
  assertEquals(camera.localElapsedTime, 0);
  assertEquals(CjsSchema.getField(EveVirtualCamera, "animationTimelineLength")?.type.kind, "float32");
});

test("virtual camera cut and lerp transitions follow Carbon lifecycle", () =>
{
  const source = new EveVirtualCamera();
  source.UpdateExternal(vec3.create(), vec3.fromValues(0, 0, 1), 1, 0);
  source.Play();
  const target = new EveVirtualCamera();
  target.UpdateExternal(vec3.fromValues(10, 4, 2), vec3.fromValues(10, 4, 3), 2, 20);

  const lerp = new EveVirtualCameraTransitionLerp();
  lerp.SetSource(source);
  lerp.SetTarget(target);
  lerp.SetTransitionTime(1);
  lerp.Play();
  assertEquals(lerp.GetCamera().GetName(), "transitionCamera");
  lerp.Update(0.5);
  assertVec3(lerp.GetCamera().position, [5, 2, 1]);
  assertAlmostEquals(lerp.GetCamera().fov, 1.5);
  assert(!lerp.IsComplete());
  lerp.Update(0.5);
  assert(!lerp.IsComplete());
  lerp.Update(0.01);
  assert(lerp.IsComplete());
  assertEquals(lerp.GetCamera(), target);
  assert(target.running);
  assert(!source.running);
  assertEquals(CjsSchema.getField(EveVirtualCameraTransitionLerp, "tansitionTime")?.type.kind, "float32");
  assertEquals(CjsSchema.getField(EveVirtualCameraTransitionLerp, "transitionTime"), null);

  const cut = new EveVirtualCameraTransitionCut();
  cut.SetSource(target);
  cut.SetTarget(source);
  cut.Play();
  assertEquals(cut.GetCamera(), source);
  cut.Update(0);
  assert(source.running);
  assert(!target.running);
});

test("EveVirtualCameraSystem owns Carbon camera selection and transitions", () =>
{
  const system = new EveVirtualCameraSystem();
  assert(system.Initialize());
  assertEquals(system.externalCamera.GetName(), "externalCamera");
  assertEquals(system.externalCamera.GetAnimationTimelineLength(), 0);
  assertEquals(system.GetMainCamera(), system.externalCamera);
  assert(system.IsExternallyControlled());
  assert(!system.AddCamera(system.externalCamera));

  const first = new EveVirtualCamera();
  first.SetName("first");
  first.UpdateExternal(vec3.create(), vec3.fromValues(0, 0, 1), 1, 0);
  assert(system.AddCamera(first));
  assert(!system.AddCamera(first));
  assertEquals(system.GetCameraByName("first"), first);
  system.CutToCamera(first);
  assertEquals(system.GetCurrentCamera(), first);
  system.Update(5);
  assertEquals(system.transition, null);
  assert(first.running);
  assert(!system.IsExternallyControlled());

  const second = new EveVirtualCamera();
  second.SetName("second");
  second.UpdateExternal(vec3.fromValues(10, 0, 0), vec3.fromValues(10, 0, 1), 2, 10);
  system.LerpToCamera(second, 0.5);
  assertEquals(system.GetMainCamera(), second);
  assertEquals(system.GetCurrentCamera().GetName(), "transitionCamera");
  system.Update(5.25);
  assertVec3(system.GetCurrentCamera().position, [5, 0, 0]);
  system.Update(5.5);
  assert(system.transition);
  system.Update(5.51);
  assertEquals(system.transition, null);
  assertEquals(system.GetCurrentCamera(), second);
  assertEquals(CjsSchema.getField(EveVirtualCameraSystem, "cameras")?.type.kind, "list");
});

test("EveChildModifierSRT applies Carbon scale, rotation, and translation before the child transform", () =>
{
  const modifier = new EveChildModifierSRT();
  assertMat4(modifier.ApplyTransform(null, mat4.create(), 0, null, mat4.create()), mat4.create());
  modifier.scaling = vec3.fromValues(2, 2, 2);
  modifier.translation = vec3.fromValues(3, 4, 5);
  modifier.rotation = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 2);
  const source = mat4.fromTranslation(mat4.create(), vec3.fromValues(1, 0, 0));
  const out = mat4.create();
  assertEquals(modifier.ApplyTransform(null, source, 0, null, out), out);
  // Carbon (row-vector): SRT * transform - the SRT applies FIRST, so the
  // origin lands at T(3,4,5), then the source translation adds (1,0,0).
  assertAlmostEquals(out[12], 4);
  assertAlmostEquals(out[13], 4);
  assertAlmostEquals(out[14], 5);
  assertEquals(CjsSchema.getField(EveChildModifierSRT, "scaling")?.type.kind, "vec3");
});

test("EveChildTransform rebuilds SRT and composes Carbon child transforms", () =>
{
  const child = new EveChildTransform();
  assertMat4(child.localTransform, mat4.create());
  assertMat4(child.worldTransform, mat4.create());
  assertEquals(CjsSchema.GetConstructor("EveChildTransform"), EveChildTransform);
  assertEquals(CjsSchema.getField(EveChildTransform, "localTransform")?.type.kind, "mat4");

  const scaling = vec3.fromValues(2, 3, 4);
  const rotation = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 2);
  const translation = vec3.fromValues(5, 6, 7);
  const expectedLocal = mat4.fromRotationTranslationScale(mat4.create(), rotation, translation, scaling);
  child.Setup(scaling, rotation, translation, Tr2Lod.TR2_LOD_LOW);
  assertMat4(child.localTransform, expectedLocal);

  const parent = mat4.fromRotationTranslationScale(
    mat4.create(),
    quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), Math.PI / 2),
    vec3.fromValues(10, 11, 12),
    vec3.fromValues(3, 3, 3)
  );
  assertEquals(child.UpdateTransform(parent), child.worldTransform);
  // Carbon (row-vector): world = local * parent - local first, which is
  // mat4.multiply(world, parent, local) in gl-matrix.
  assertMat4(child.worldTransform, mat4.multiply(mat4.create(), parent, expectedLocal));

  child.Setup(null, null, vec3.fromValues(8, 9, 10));
  assertVec3(child.scaling, scaling);
  assertQuat(child.rotation, rotation);
  assertVec3(child.translation, [8, 9, 10]);
});

test("EveChildTransform strips selected parent components and honors static transforms", () =>
{
  const parentRotation = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 2);
  const parentTranslation = vec3.fromValues(10, 20, 30);
  const parentScale = vec3.fromValues(2, 3, 4);
  const parent = mat4.fromRotationTranslationScale(mat4.create(), parentRotation, parentTranslation, parentScale);

  const staticRotation = new EveChildTransform();
  staticRotation.SetupWithStaticRotation(null, null, vec3.fromValues(1, 0, 0));
  const noRotationParent = mat4.fromRotationTranslationScale(mat4.create(), quat.create(), parentTranslation, parentScale);
  staticRotation.UpdateTransform(parent);
  assertMat4(staticRotation.worldTransform, mat4.multiply(mat4.create(), noRotationParent, staticRotation.localTransform));

  const staticScale = new EveChildTransform();
  staticScale.useStaticScale = true;
  staticScale.Setup(null, null, vec3.fromValues(1, 0, 0));
  const noScaleParent = mat4.fromRotationTranslationScale(mat4.create(), parentRotation, parentTranslation, vec3.fromValues(1, 1, 1));
  staticScale.UpdateTransform(parent);
  assertMat4(staticScale.worldTransform, mat4.multiply(mat4.create(), noScaleParent, staticScale.localTransform));

  const staticTransform = new EveChildTransform();
  staticTransform.SetupWithStaticTransform(null, null, vec3.fromValues(1, 2, 3));
  const frozenLocal = mat4.copy(mat4.create(), staticTransform.localTransform);
  staticTransform.translation[0] = 99;
  staticTransform.UpdateTransform(parent);
  assertMat4(staticTransform.localTransform, frozenLocal);
  assertMat4(staticTransform.worldTransform, mat4.multiply(mat4.create(), parent, frozenLocal));

  const matrixOwned = new EveChildTransform();
  matrixOwned.useSRT = false;
  mat4.fromTranslation(matrixOwned.localTransform, vec3.fromValues(4, 5, 6));
  matrixOwned.Setup(vec3.fromValues(9, 9, 9), null, null);
  matrixOwned.UpdateTransform(parent);
  assertVec3(matrixOwned.scaling, [1, 1, 1]);
  assertMat4(matrixOwned.worldTransform, mat4.multiply(mat4.create(), parent, matrixOwned.localTransform));
});

test("EveCircle generates Carbon half-step circle points and line descriptions", () =>
{
  const circle = new EveCircle();
  assert(circle instanceof EveChildTransform);
  assertEquals(CjsSchema.GetConstructor("EveCircle"), EveCircle);
  assertEquals(circle.circleRadius, 100);
  assertEquals(circle.numSegments, 64);
  assertEquals(circle.completeness, 1);
  assertEquals(circle.display, true);
  assertEquals(circle.isVisible, true);
  assertEquals(CjsSchema.getField(EveCircle, "translation")?.io?.notify, true);

  circle.circleRadius = 2;
  circle.numSegments = 4;
  circle.GeneratePoints();
  assertEquals(circle.GetPointCount(), 4);
  const lines = [];
  const animations = [];
  circle.AddLinesToSet({
    AddStraightLine(start, color1, end, color2, width)
    {
      lines.push({ start, color1, end, color2, width });
      return lines.length + 10;
    },
    ChangeLineAnimation(...args)
    {
      animations.push(args);
    }
  }, [1, 0, 0, 1], [0, 1, 0, 1], 2);
  assertEquals(lines.length, 4);
  assertAlmostEquals(lines[0].start[0], Math.SQRT2);
  assertAlmostEquals(lines[0].start[1], 0);
  assertAlmostEquals(lines[0].start[2], Math.SQRT2);
  assertEquals(lines[0].width, 1);
  assertEquals(animations.length, 4);
  assertEquals(animations[0][3], 1);
});

test("EveCircle preserves Carbon clamps, partial arcs, and stale-point edge", () =>
{
  const circle = new EveCircle();
  circle.completeness = 3;
  circle.OnModified("completeness");
  assertEquals(circle.completeness, 2);
  circle.numSegments = 200;
  circle.OnModified("numSegments");
  assertEquals(circle.numSegments, 128);
  circle.startPoint = -1.25;
  circle.OnModified("startPoint");
  assertEquals(circle.startPoint, -0.25);

  circle.numSegments = 8;
  circle.completeness = 0.5;
  circle.scaleSegmentsByCompleteness = true;
  circle.GeneratePoints();
  assertEquals(circle.GetPointCount(), 4);
  const lines = [];
  circle.AddLinesToSet({
    AddStraightLine(start, _color1, end)
    {
      lines.push([start, end]);
      return lines.length;
    }
  }, [1, 1, 1, 1], [1, 1, 1, 1], 0);
  assertEquals(lines.length, 3);

  circle.completeness = 0;
  circle.OnModified("completeness");
  circle.GeneratePoints();
  assertEquals(circle.GetPointCount(), 4);
  assertEquals(circle.Update({ deltaT: 0 }), true);
  assertEquals(circle.Update({ deltaT: 0 }), true);
});

test("EveCircle updates animation, bounds, and visibility without renderer state", () =>
{
  const circle = new EveCircle();
  circle.numSegments = 4;
  circle.circleRadius = 10;
  circle.lineWidth = 2;
  circle.GeneratePoints();
  circle.CalculateBoundingSphere(3);
  circle.translation = vec3.fromValues(5, 6, 7);
  circle.scaling = vec3.fromValues(2, 3, 1);
  circle.RebuildLocalTransform();
  const sphere = circle.GetBoundingSphere();
  assertVec3(sphere, [5, 6, 7]);
  assertAlmostEquals(sphere[3], 45);
  sphere[3] = 1;
  assertAlmostEquals(circle.GetBoundingSphere()[3], 45);

  let visibleSphere = null;
  circle.UpdateVisibility({
    IsSphereVisible(value)
    {
      visibleSphere = Array.from(value);
      return false;
    }
  }, null, mat4.fromTranslation(mat4.create(), vec3.fromValues(1, 0, 0)));
  assertEquals(circle.isVisible, false);
  assert(visibleSphere);
  circle.display = false;
  circle.UpdateVisibility({ IsSphereVisible: () => true });
  assertEquals(circle.isVisible, false);

  circle.display = true;
  circle.Initialize();
  circle.Update({ GetDeltaT: () => 0 });
  circle.animValue = 0.9;
  circle.movementSpeed = 2;
  assertEquals(circle.Update({ deltaT: 0.1 }), false);
  assertAlmostEquals(circle.animValue, 0.1);
});

test("EveBezierCurve generates Carbon quadratic points and terminal edge", () =>
{
  const curve = new EveBezierCurve();
  assert(curve instanceof EveChildTransform);
  assertEquals(CjsSchema.GetConstructor("EveBezierCurve"), EveBezierCurve);
  assertEquals(curve.segments, 24);
  assertEquals(curve.scaleSegmentsByCompleteness, true);
  assertEquals(CjsSchema.getField(EveBezierCurve, "translation")?.io?.notify, true);

  curve.point1 = vec3.fromValues(0, 0, 0);
  curve.bezierPoint = vec3.fromValues(1, 2, 0);
  curve.point2 = vec3.fromValues(2, 0, 0);
  curve.segments = 4;
  curve.GeneratePoints();
  assertEquals(curve.GetPointCount(), 4);
  const lines = [];
  const animations = [];
  curve.AddLinesToSet({
    AddStraightLine(start, _color1, end, _color2, width)
    {
      lines.push({ start, end, width });
      return lines.length;
    },
    ChangeLineAnimation(...args)
    {
      animations.push(args);
    }
  }, [1, 1, 1, 1], [0, 1, 0, 1], 2);
  assertEquals(lines.length, 4);
  assertVec3(lines[0].start, [0, 0, 0]);
  assertVec3(lines[0].end, [0.5, 0.75, 0]);
  assertVec3(lines[1].end, [1, 1, 0]);
  assertVec3(lines[2].end, [1.5, 0.75, 0]);
  assertVec3(lines[3].end, [2, 0, 0]);
  assertEquals(animations.length, 4);
});

test("EveBezierCurve preserves Carbon clamps, partial curves, bounds, and stale points", () =>
{
  const curve = new EveBezierCurve();
  curve.completeness = 3;
  curve.OnModified("completeness");
  assertEquals(curve.completeness, 2);
  curve.segments = 200;
  curve.OnModified("segments");
  assertEquals(curve.segments, 128);
  curve.segmentOffset = -1;
  curve.OnModified("segmentOffset");
  assertEquals(curve.segmentOffset, 0);

  curve.point1 = vec3.fromValues(0, 0, 0);
  curve.bezierPoint = vec3.fromValues(1, 2, 0);
  curve.point2 = vec3.fromValues(2, 0, 0);
  curve.segments = 8;
  curve.completeness = 0.5;
  curve.GeneratePoints();
  assertEquals(curve.GetPointCount(), 4);
  const lines = [];
  curve.AddLinesToSet({
    AddStraightLine(start, _color1, end)
    {
      lines.push([start, end]);
      return lines.length;
    }
  }, [1, 1, 1, 1], [1, 1, 1, 1]);
  assertEquals(lines.length, 3);

  curve.CalculateBoundingSphere(2);
  curve.lineWidth = 99;
  const sphere = curve.GetBoundingSphere();
  assertVec3(sphere, [1, 2 / 3, 0]);
  assertAlmostEquals(sphere[3], 10 / 3);
  curve.CalculateBoundingSphere();
  assertAlmostEquals(curve.GetBoundingSphere()[3], 10 / 3);

  curve.completeness = 0;
  curve.OnModified("completeness");
  curve.GeneratePoints();
  assertEquals(curve.GetPointCount(), 4);
  assertEquals(curve.Update({ deltaT: 0 }), true);
  assertEquals(curve.Update({ deltaT: 0 }), true);
});

test("EveBezierCurve updates animation and visibility without renderer state", () =>
{
  const curve = new EveBezierCurve();
  curve.segments = 4;
  curve.GeneratePoints();
  curve.CalculateBoundingSphere();
  let visibleSphere = null;
  curve.UpdateVisibility({
    IsSphereVisible(sphere)
    {
      visibleSphere = Array.from(sphere);
      return false;
    }
  }, null, mat4.fromTranslation(mat4.create(), vec3.fromValues(2, 0, 0)));
  assert(visibleSphere);
  assertEquals(curve.isVisible, false);
  curve.display = false;
  curve.UpdateVisibility({ IsSphereVisible: () => true });
  assertEquals(curve.isVisible, false);

  curve.display = true;
  curve.animValue = 0.1;
  curve.movementSpeed = -2;
  assertEquals(curve.Update({ GetDeltaT: () => 0.1 }), false);
  assertAlmostEquals(curve.animValue, -0.1);
});

test("EveSphereVolume follows Carbon intensity, bounds, and change constraints", () =>
{
  const volume = new EveSphereVolume();
  volume.position = vec3.fromValues(1, 2, 3);
  volume.radius = 3;
  volume.innerRadius = 1;
  assertEquals(volume.GetIntensity(vec3.fromValues(1, 2, 3)), 1);
  assertAlmostEquals(volume.GetIntensity(vec3.fromValues(3, 3, 3)), 0.5);
  assertEquals(volume.GetIntensity(vec3.fromValues(5, 2, 3)), 0);
  const bounds = volume.GetBoundingSphere();
  assertVec3(bounds.center, [1, 2, 3]);
  assertEquals(bounds.radius, 3);
  volume.position[0] = 10;
  assertEquals(bounds.center[0], 1);

  let changes = 0;
  const id = volume.RegisterForChanges(() => changes++);
  volume.SetValues({ innerRadius: 5 });
  assertEquals(volume.radius, 5);
  assertEquals(changes, 1);
  volume.UnregisterForChanges(id);
  volume.SetValues({ radius: -2 });
  assertEquals(volume.radius, 0);
  assertEquals(volume.innerRadius, 0);
  assertEquals(changes, 1);
  assertEquals(CjsSchema.getField(EveSphereVolume, "position")?.type.kind, "vec3");
  assertEquals(CjsSchema.getField(EveSphereVolume, "radius")?.type.kind, "float32");
});

test("EveBoxVolume follows Carbon box intensity, bounds, and callbacks", () =>
{
  const volume = new EveBoxVolume();
  volume.scaling = vec3.fromValues(8, 4, 2);
  volume.innerScaling = vec3.fromValues(4, 2, 1);
  assert(volume.Initialize());
  assertEquals(volume.GetIntensity(vec3.create()), 1);
  assertAlmostEquals(volume.GetIntensity(vec3.fromValues(3, 0, 0)), 0.25);
  assertEquals(volume.GetIntensity(vec3.fromValues(5, 0, 0)), 0);
  const bounds = volume.GetBoundingSphere();
  assertAlmostEquals(bounds.radius, Math.sqrt(84) * 0.5);

  let changes = 0;
  const id = volume.RegisterForChanges(() => changes++);
  volume.scaling = vec3.fromValues(-1, 3, 2);
  volume.innerScaling = vec3.fromValues(4, -1, 5);
  volume.OnModified("scaling");
  assertVec3(volume.scaling, [0, 3, 2]);
  assertVec3(volume.innerScaling, [0, 0, 2]);
  assertEquals(changes, 1);
  volume.UnregisterForChanges(id);
  volume.OnModified("position");
  assertEquals(changes, 1);
  assertEquals(CjsSchema.getField(EveBoxVolume, "innerScaling")?.type.kind, "vec3");
});

test("EveEllipsoidVolume follows Carbon ellipsoid intensity and setup", () =>
{
  const volume = new EveEllipsoidVolume();
  volume.shape = vec3.fromValues(4, 2, 1);
  volume.innerShape = vec3.fromValues(2, 1, 0.5);
  let changes = 0;
  const id = volume.RegisterForChanges(() => changes++);
  assert(volume.Initialize());
  assertEquals(changes, 1);
  assertEquals(volume.GetIntensity(vec3.create()), 1);
  assertAlmostEquals(volume.GetIntensity(vec3.fromValues(3, 0, 0)), 0.25);
  assertEquals(volume.GetIntensity(vec3.fromValues(5, 0, 0)), 0);
  assertEquals(volume.GetBoundingSphere().radius, 4);
  volume.shape = vec3.fromValues(-1, 3, 2);
  volume.innerShape = vec3.fromValues(4, -1, 5);
  volume.OnModified("shape");
  assertVec3(volume.shape, [0, 3, 2]);
  assertVec3(volume.innerShape, [0, 0, 2]);
  assertEquals(changes, 2);
  volume.UnregisterForChanges(id);
  assertEquals(CjsSchema.getField(EveEllipsoidVolume, "shape")?.type.kind, "vec3");
});

test("EveDistanceField follows Carbon static and dynamic CPU coverage", () =>
{
  const sample = position => ({
    GetValueAt(_time, out)
    {
      return vec3.copy(out, position);
    }
  });
  const cameraTransform = mat4.fromTranslation(mat4.create(), vec3.create());
  const field = new EveDistanceField();
  field.cameraView = { transform: cameraTransform };
  field.minDistance = 5;
  field.maxDistance = 100;
  const dimensions = vec3.fromValues(4, 6, 8);
  const midpoint = vec3.fromValues(2, 0, 0);
  field.SetupStaticDistanceField(dimensions, midpoint, 3, 2, 0.25);
  dimensions[0] = 99;
  midpoint[0] = 99;
  assertVec3(field.dimensions, [4, 6, 8]);
  assertVec3(field.midpoint, [2, 0, 0]);
  const staticKeys = field.curveSet.curves[0].GetKeys();
  assertEquals(staticKeys[0].time, 5);
  assertEquals(staticKeys[1].time, 100);
  field.objects = [sample(vec3.fromValues(10, 0, 0))];
  field.Update({ currentTime: 1, lastTime: 0, originShift: vec3.create() });
  assertEquals(field.distance, 100);
  field.Update({ currentTime: 2, lastTime: 1, originShift: vec3.create() });
  assertEquals(field.distance, 10);
  assertVec3(field.midpoint, [10, 0, 0]);

  const dynamic = new EveDistanceField();
  dynamic.cameraView = { transform: cameraTransform };
  dynamic.maxDistance = 100;
  dynamic.maxXZRatio = 1.5;
  dynamic.minYRatio = 0.2;
  dynamic.SetupDynamicDistanceField(0, 1, 1);
  dynamic.objects = [sample(vec3.fromValues(-10, 0, 0)), sample(vec3.fromValues(10, 0, 0))];
  dynamic.Update({ currentTime: 1, lastTime: 0, deltaT: 1, originShift: vec3.create() });
  assertVec3(dynamic.midpoint, [0, 0, 0]);
  assertVec3(dynamic.dimensions, [20, 4, 20 / 1.5]);
  assertEquals(dynamic.distance, 10);
  dynamic.Update({ currentTime: 2, lastTime: 1, deltaT: 1, originShift: vec3.fromValues(1, 0, 0) });
  assertVec3(dynamic.midpoint, [1, 0, 0]);
  dynamic.SetValues({ minDistance: 7, maxDistance: 80 });
  dynamic.Update({ currentTime: 3, lastTime: 2, deltaT: 0, originShift: vec3.create() });
  const dynamicKeys = dynamic.curveSet.curves[0].GetKeys();
  assertEquals(dynamicKeys[0].time, 7);
  assertEquals(dynamicKeys[1].time, 80);
  dynamic.objects = [];
  dynamic.OnListModified(0x09);
  assertVec3(dynamic.midpoint, [0, 0, 0]);
  assertVec3(dynamic.dimensions, [0, 0, 0]);
  assertEquals(CjsSchema.getField(EveDistanceField, "objects")?.type.kind, "list");
});

test("promoted Eve graph files do not import backend APIs", async () =>
{
  const files = [];
  for (const entry of await readdir("src/eve",
  {
    withFileTypes: true
  }))
  {
    if (entry.isFile() && entry.name.endsWith(".js"))
    {
      files.push(`src/eve/${entry.name}`);
    }
  }
  for (const file of files)
  {
    const source = await readFile(file, "utf8");
    assert(!/(WebGPU|WebGL|GPUDevice|GPUTexture|GPUBuffer|navigator\.gpu)/.test(source), `${file} should remain runtime graph code, not engine backend code`);
  }
});
function makeVectorFunction(getValueAt)
{
  return {
    Update(time, out)
    {
      return getValueAt(time, out);
    },
    GetValueAt(time, out)
    {
      return getValueAt(time, out);
    },
    GetValueDotAt(_time, out)
    {
      return vec3.zero(out);
    },
    GetValueDoubleDotAt(_time, out)
    {
      return vec3.zero(out);
    }
  };
}
function makeLocator(position, direction, scale, boneIndex)
{
  const locator = new Locator();
  locator.position = vec3.fromValues(position[0], position[1], position[2]);
  locator.direction = quat.fromValues(direction[0], direction[1], direction[2], direction[3]);
  locator.scale = vec3.fromValues(scale[0], scale[1], scale[2]);
  locator.boneIndex = boneIndex;
  return locator;
}
function assertVec3(actual, expected)
{
  assertAlmostEquals(actual[0], expected[0]);
  assertAlmostEquals(actual[1], expected[1]);
  assertAlmostEquals(actual[2], expected[2]);
}
function assertVec4(actual, expected)
{
  assertVec3(actual, expected);
  assertAlmostEquals(actual[3], expected[3]);
}
function assertQuat(actual, expected)
{
  assertAlmostEquals(actual[0], expected[0]);
  assertAlmostEquals(actual[1], expected[1]);
  assertAlmostEquals(actual[2], expected[2]);
  assertAlmostEquals(actual[3], expected[3]);
}
function assertMat4(actual, expected)
{
  for (let i = 0; i < 16; i++)
  {
    assertAlmostEquals(actual[i], expected[i]);
  }
}
