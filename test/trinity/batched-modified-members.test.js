import assert from "node:assert/strict";
import test from "node:test";
import {
  Tr2ActionAnimateValue, Tr2ActionSetValue, Tr2StateMachineTransition,
  EveTurretSet, EveSpaceObject2, EveSpaceScene, Tr2GpuParticleSystem,
  TriVariableParameter, Tr2Mesh, Tr2InstancedMesh, EveSphereVolume
} from "../../npm/dist/trinity/index.js";
import { AudGameObjResource } from "../../npm/dist/audio/index.js";
import { Tr2IntSkinnedObject, Tr2SkinnedObjectLod } from "../../npm/dist/character/index.js";

test("batched action edits both rebind the destination and compile the value", () =>
{
  for (const Type of [Tr2ActionAnimateValue, Tr2ActionSetValue])
  {
    const calls = [];
    const target = {
      _runtime: { controller: {}, program: {} }, _controller: {}, _expression: { program: {} },
      HasDelayedBinding: () => false,
      LinkDestination: () => calls.push("link"), CompileExpression: () => calls.push("compile")
    };
    assert.equal(Type.prototype.OnModified.call(target, ["path", "value"]), true);
    assert.deepEqual(calls, ["link", "compile"]);
  }
});

test("a transition batch refreshes both its condition and destination", () =>
{
  const calls = [];
  const target = {
    _source: { UpdateVariableMask: () => calls.push("mask") },
    Compile: () => calls.push("compile"), _updateDestination: () => calls.push("destination")
  };
  Tr2StateMachineTransition.prototype.OnModified.call(target, ["condition", "name"]);
  assert.deepEqual(calls, ["compile", "mask", "destination"]);
});

test("turret batch coalesces registration and retains all independent consequences", () =>
{
  const calls = [];
  const target = {
    ReRegister: () => calls.push("register"), InitializeGeometryResource: () => calls.push("geometry"),
    SetAmbientEffect: () => calls.push("ambient"), target: { SetBehaviour: () => calls.push("behaviour") },
    InitializeDynamicBounds: () => calls.push("bounds"), geometryResource: null
  };
  EveTurretSet.prototype.OnModified.call(target,
    ["display", "geometryResPath", "ambientEffectEditingMode", "impactSize", "useDynamicBounds"]);
  assert.deepEqual(calls, ["register", "geometry", "ambient", "behaviour", "bounds"]);
});

test("space object batch updates clipping together and still handles other members", () =>
{
  const calls = [];
  const target = {
    clipSphereFactor: 1, clipSphereFactor2: 2, _oldClipSphereFactor: 0, _oldClipSphereFactor2: 0,
    _damageFilterState: 0, dirtLevel: 0.5, mute: true,
    SetControllerVariable: (name, value) => calls.push([name, value]),
    SetShaderOption: (...args) => calls.push(args), ReRegister: () => calls.push("register"),
    SetMute: value => calls.push(["mute", value])
  };
  EveSpaceObject2.prototype.OnModified.call(target,
    ["dirtLevel", "clipSphereFactor", "clipSphereFactor2", "display", "castShadow", "mute", "damageLocatorAutoFilterEnabled"]);
  assert.deepEqual(calls, [["DirtLevel", 0.5], ["SPACE_OBJECT_CLIPPING", "SOC_ENABLED"],
    ["ClipSphereFactor", 1], ["ClipSphereFactor2", 2], "register", ["mute", true]]);
  assert.equal(target._damageFilterState, 1);
});

test("reflection batch updates both lighting values", () =>
{
  const calls = [];
  const target = {
    reflectionBackLightingColor: "color", reflectionBackLightingContrast: 2,
    reflectionProbe: { IsValid: () => true, SetBackLightColor: value => calls.push(value),
      SetBackLightContrast: value => calls.push(value) }
  };
  EveSpaceScene.prototype.OnModified.call(target, ["reflectionBackLightingColor", "reflectionBackLightingContrast"], {});
  assert.deepEqual(calls, ["color", 2]);
});

test("GPU particle batch binds every changed effect and resizes once without GPU execution", () =>
{
  const calls = [];
  const target = {
    emit: "emit", update: "update", maxParticles: 12,
    SetVariableStore: value => calls.push(value), SetMaxParticles: value => calls.push(value)
  };
  Tr2GpuParticleSystem.prototype.OnModified.call(target, ["emit", "update", "maxParticles"]);
  assert.deepEqual(calls, ["emit", "update", 12]);
});

test("variable parameter name plus value edits rebuild handles and initialize", () =>
{
  const calls = [];
  const target = { RebuildEffectHandles: () => calls.push("handles"), Initialize: () => calls.push("initialize") };
  TriVariableParameter.prototype.OnModified.call(target, ["name", "variableName"]);
  assert.deepEqual(calls, ["handles", "initialize"]);
});

test("mesh path and index batch refreshes both geometry and morph targets", () =>
{
  const calls = [];
  const target = { InitializeGeometryResource: () => calls.push("geometry"), InitializeMorphTargets: () => calls.push("morph") };
  Tr2Mesh.prototype.OnModified.call(target, ["geometryResPath", "meshIndex"]);
  assert.deepEqual(calls, ["geometry", "morph"]);
  calls.length = 0;
  target.CreateVertexDeclaration = () => calls.push("declaration");
  Tr2InstancedMesh.prototype.OnModified.call(target, ["geometryResPath", "instanceMeshIndex", "meshIndex"]);
  assert.deepEqual(calls, ["declaration", "geometry", "morph"]);
});

test("radius batch preserves the native clamp order and notifies listeners once", () =>
{
  let calls = 0;
  const target = { innerRadius: 5, radius: -1, _callbacks: new Map([[1, () => calls++]]) };
  EveSphereVolume.prototype.OnModified.call(target, ["innerRadius", "radius"]);
  assert.equal(target.radius, 5);
  assert.equal(target.innerRadius, 5);
  assert.equal(calls, 1);
});

test("audio rotation plus event batch updates placement and playback", () =>
{
  const calls = [];
  const target = { eventName: "play", RefreshPlacementFromRotation: () => calls.push("placement"),
    StopAll: () => calls.push("stop"), PostEvent: value => calls.push(value) };
  AudGameObjResource.prototype.OnModified.call(target, ["rotation", "eventName"]);
  assert.deepEqual(calls, ["placement", "stop", "play"]);
});

test("interior model batch reaches both owner and LOD consequences", () =>
{
  const calls = [];
  const lod = { OnModelChanged: value => calls.push(value), PopulateLods: () => calls.push("populate"),
    OnModified: Tr2SkinnedObjectLod.prototype.OnModified };
  const target = { visualModel: "visual", lod };
  Tr2IntSkinnedObject.prototype.OnModified.call(target, ["visualModel", "highDetailModel"]);
  assert.deepEqual(calls, ["visual", "populate"]);
});
