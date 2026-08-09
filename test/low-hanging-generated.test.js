import test from "node:test";
import { RawData } from "../src/trinityCore/rawData/RawData.js";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { EveChildEffectPropagator, EveBoosterSet2, EveLensflare, EveLineSet, EveLocator2, EveMultiEffectParameter, EveSceneStaticParticles, EveSocketParameterString, EveTurretFiringFX, EveTacticalTrails, EveUiObject, Tr2MaterialParameterStore, Tr2ExternalParameter, Tr2CurveVector3, Tr2InstancedMesh, Tr2Mesh, Tr2MeshArea, Tr2RuntimeInstanceData, Tr2Sprite2dLineTrace, Tr2Sprite2dPolygon, Tr2Sprite2dTransform, Tr2Sprite2dVertex, Tr2SpriteObjectBase, TriValueBinding } from "../npm/dist/index.js";
import { Tr2ParticleDirectForce } from "../npm/dist/particle/Tr2ParticleDirectForce.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";
import { TriBatchType } from "../npm/dist/generated/trinityCore/enums.js";
import { EveChildBulletStorm } from "../npm/dist/eve/child/EveChildBulletStorm.js";
import { EveChildExplosion } from "../npm/dist/generated/eve/child/EveChildExplosion.js";
import { EveChildInstanceContainer } from "../npm/dist/generated/eve/child/EveChildInstanceContainer.js";
import { EveChildPlug } from "../npm/dist/generated/eve/child/EveChildPlug.js";
import { EveChildParticleSphere } from "../npm/dist/generated/eve/child/EveChildParticleSphere.js";
import { EveChildRef } from "../npm/dist/generated/eve/child/EveChildRef.js";
import { EveChildSocket } from "../npm/dist/generated/eve/child/EveChildSocket.js";
import { EveChildProceduralContainer } from "../npm/dist/eve/child/procedural/EveChildProceduralContainer.js";
import { EveMultiEffect } from "../npm/dist/eve/effect/multiEffect/EveMultiEffect.js";
import { EveShip2 } from "../npm/dist/eve/spaceObject/EveShip2.js";
import { EveCamera } from "../npm/dist/eve/camera/EveCamera.js";
import { BackAndForth } from "../npm/dist/generated/eve/child/behaviors/BackAndForth.js";
import { SeekTarget } from "../npm/dist/generated/eve/child/behaviors/SeekTarget.js";
import { EveProceduralMethodCycling } from "../npm/dist/eve/child/procedural/selection/EveProceduralMethodCycling.js";
import { Tr2CurveLineSet } from "../npm/dist/trinityCore/Tr2CurveLineSet.js";
import { EveChildBehaviorSystem } from "../npm/dist/eve/child/EveChildBehaviorSystem.js";
import { EveChildLineSet } from "../npm/dist/generated/eve/child/EveChildLineSet.js";
import { FollowASpline } from "../npm/dist/generated/eve/child/behaviors/FollowASpline.js";
import { SpawnDrones } from "../npm/dist/generated/eve/child/behaviors/SpawnDrones.js";
import { SplineTunnelGroup } from "../npm/dist/index.js";
import { Tr2ManipulationTool } from "../npm/dist/trinityCore/Tr2ManipulationTool.js";
import { EveSwarm } from "../npm/dist/generated/eve/spaceObject/swarm/EveSwarm.js";
import { EveSwarmRenderable } from "../npm/dist/eve/spaceObject/swarm/EveSwarmRenderable.js";
import { Tr2ParticleSystem } from "../npm/dist/generated/particle/Tr2ParticleSystem.js";
import { Tr2DynamicEmitter } from "../npm/dist/generated/particle/Tr2DynamicEmitter.js";
import { Tr2StaticEmitter } from "../npm/dist/generated/particle/Tr2StaticEmitter.js";
import { Tr2RaytracingGeometry } from "../npm/dist/generated/raytracing/Tr2RaytracingGeometry.js";
import { Tr2QuadRenderer } from "../npm/dist/trinityCore/Tr2QuadRenderer.js";
import { BehaviorGroup } from "../npm/dist/generated/eve/child/behaviors/BehaviorGroup.js";
import { Tr2ParticleElementDeclaration } from "../npm/dist/particle/Tr2ParticleElementDeclaration.js";
import { Tr2ParticleElementDeclarationName } from "../npm/dist/particle/Tr2ParticleElementDeclarationName.js";
import { Tr2ElementBlendConstraint } from "../npm/dist/generated/particle/Tr2ElementBlendConstraint.js";
import { Tr2RandomUniformAttributeGenerator } from "../npm/dist/generated/particle/Tr2RandomUniformAttributeGenerator.js";
import { Tr2SphereShapeAttributeGenerator } from "../npm/dist/generated/particle/Tr2SphereShapeAttributeGenerator.js";
import { Tr2CapsuleShapeAttributeGenerator } from "../npm/dist/generated/particle/Tr2CapsuleShapeAttributeGenerator.js";
import { Tr2ForceSphereVolume } from "../npm/dist/generated/particle/Tr2ForceSphereVolume.js";
import { Tr2PlaneConstraint } from "../npm/dist/generated/particle/Tr2PlaneConstraint.js";
import { Tr2SphereConstraint } from "../npm/dist/generated/particle/Tr2SphereConstraint.js";
import { Tr2ScalingTool } from "../npm/dist/trinityCore/Tr2ScalingTool.js";
import { Tr2TextureAnimation } from "../npm/dist/trinityCore/Tr2TextureAnimation.js";
import { Tr2FactionLight } from "../npm/dist/generated/eve/lights/Tr2FactionLight.js";
import { EveSmartLightSpotLight } from "../npm/dist/generated/eve/smartLights/EveSmartLightSpotLight.js";
import { Tr2Light } from "../npm/dist/eve/lights/Tr2Light.js";


// A minimal accumulator duck carrying a fresh per-object store.
function makeAccumulatorWithStore()
{
  const store = makePerObjectStore();
  return { Alloc: name => store.Alloc(name) };
}

test("EveTurretFiringFX reports Carbon's per-muzzle effect count", () =>
{
  const firingFX = new EveTurretFiringFX();
  firingFX.stretch.push({}, {}, {});

  assert.equal(firingFX.GetPerMuzzleEffectCount(), 3);
  assert.equal(CjsSchema.getMethod(EveTurretFiringFX, "GetPerMuzzleEffectCount")?.impl?.status, "implemented");
});

test("EveUiObject operates on Trinity mesh picking and visibility areas", () =>
{
  const uiObject = new EveUiObject();
  assert.equal(uiObject.GetNameForPickingAreaID(7), "invalid_mesh");

  const mesh = new Tr2Mesh();
  const picking = new Tr2MeshArea();
  picking.name = "button";
  picking.index = 7;
  const opaque = new Tr2MeshArea();
  opaque.name = "button";
  const unrelated = new Tr2MeshArea();
  unrelated.name = "frame";

  mesh.AddArea(TriBatchType.TRIBATCHTYPE_PICKING, picking);
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, opaque);
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_ADDITIVE, unrelated);
  uiObject.SetMesh(mesh);

  assert.equal(uiObject.GetNameForPickingAreaID(7), "button");
  assert.equal(uiObject.GetNameForPickingAreaID(8), "invalid_areaid");
  uiObject.SetVisibilityForArea("button", false);
  assert.equal(picking.GetDisplay(), false);
  assert.equal(opaque.GetDisplay(), false);
  assert.equal(unrelated.GetDisplay(), true);
  assert.equal(picking.GetName(), "button");
});

test("EveChildEffectPropagator.Stop resets playback and clears effect instances", () =>
{
  const propagator = new EveChildEffectPropagator();
  let clearCalls = 0;
  propagator.isPlaying = true;
  propagator.playTime = 4;
  propagator.effect = {
    instances: [{}, {}],
    ClearInstanceList()
    {
      clearCalls++;
      this.instances.length = 0;
    }
  };

  propagator.Stop();
  assert.equal(propagator.isPlaying, false);
  assert.equal(propagator.playTime, 0);
  assert.equal(clearCalls, 1);
  assert.equal(propagator.effect.instances.length, 0);

  propagator.effect = { instances: [{}, {}] };
  propagator.Stop();
  assert.equal(propagator.effect.instances.length, 0);
  assert.equal(CjsSchema.getMethod(EveChildEffectPropagator, "Stop")?.impl?.status, "adapted");
});

test("Tr2MaterialParameterStore resolves local overrides before parent values", () =>
{
  const parent = new Tr2MaterialParameterStore();
  const child = new Tr2MaterialParameterStore();
  const parentValue = { name: "Glow", value: 1 };
  const childValue = { name: "Glow", value: 2 };

  parent.parameters.set("Glow", parentValue);
  child.parent = parent;
  assert.equal(child.FindParameter("Glow"), parentValue);
  child.parameters.set("Glow", childValue);
  assert.equal(child.FindParameter("Glow"), childValue);
  assert.equal(child.FindParameter("Missing"), null);
  assert.equal(CjsSchema.getField(Tr2MaterialParameterStore, "parameters")?.type.kind, "map");
  assert.equal(CjsSchema.getField(Tr2MaterialParameterStore, "parentPath")?.type.kind, "path");
});

test("external parameters and value bindings copy Carbon graph values", () =>
{
  const notifications = [];
  const target = {
    color: new Float32Array([1, 2, 3, 4]),
    label: "old",
    OnModified: value => notifications.push(value)
  };
  const external = new Tr2ExternalParameter();
  external.SetName("green");
  external.SetDestinationObject(target);
  external.SetDestinationAttribute("color.g");
  assert.equal(external.IsValid(), true);
  assert.equal(external.GetValue(), 2);
  assert.equal(external.SetValue(9), true);
  assert.equal(target.color[1], 9);
  assert.equal(notifications.length, 1);

  const source = { value: new Float32Array([2, 3, 4]) };
  const destination = { value: new Float32Array(3), OnModified: value => notifications.push(value) };
  const binding = new TriValueBinding();
  binding.SetSource("value", source);
  binding.SetDestination("value", destination);
  binding.scale = 2;
  binding.offset.set([1, 2, 3, 0]);
  binding.Initialize();
  assert.equal(binding.IsValid(), true);
  assert.equal(binding.CopyValue(), true);
  assert.deepEqual(Array.from(destination.value), [5, 8, 11]);

  const label = new Tr2ExternalParameter();
  label.SetName("label");
  label.SetDestinationObject(target);
  label.SetDestinationAttribute("label");
  const socket = new EveSocketParameterString();
  socket.SetName("label");
  assert.equal(socket.BindToExternalParameter(label), true);
  assert.equal(socket.defaults[0], "old");
  socket.value = "new";
  socket.Propagate();
  assert.equal(target.label, "new");
});

test("Sprite2D value helpers preserve Carbon vertices, transforms, and dirty state", () =>
{
  const vertex = new Tr2Sprite2dVertex();
  vertex.SetTexCoord(1, [0.25, 0.75]);
  const textureCoordinate = vertex.GetTexCoord(1);
  assert.deepEqual(Array.from(textureCoordinate), [0.25, 0.75]);
  textureCoordinate[0] = 1;
  assert.equal(vertex.GetTexCoord(1)[0], 0.25);
  assert.deepEqual(Array.from(vertex.color), [1, 1, 1, 1]);

  const transform = new Tr2Sprite2dTransform();
  transform.displayWidth = 100;
  transform.displayHeight = 100;
  transform.rotationCenter.set([0.5, 0.5]);
  transform.rotation = Math.PI / 2;
  const transformed = transform.TransformPoint(60, 50);
  assert.ok(Math.abs(transformed[0] - 50) < 1e-5);
  assert.ok(Math.abs(transformed[1] - 60) < 1e-5);

  const polygon = new Tr2Sprite2dPolygon();
  polygon.isDirty = false;
  polygon.AppendVertices(
    [[1, 2], [3, 4]],
    [[1, 0, 0], [0, 1, 0], [10, 20, 1]],
    [1, 0, 0, 1],
    [[0, 0], [1, 1]]
  );
  polygon.AppendTriangles([[0, 1, 0]]);
  assert.equal(polygon.isDirty, true);
  assert.equal(polygon.vertices.length, 2);
  assert.deepEqual(Array.from(polygon.vertices[0].position), [11, 22, 0]);
  assert.deepEqual(Array.from(polygon.vertices[1].texCoord[0]), [1, 1]);
  assert.equal(polygon.triangles[0].index1, 1);

  polygon.SetVertices(null, null, [[0, 1, 0, 1], [0, 0, 1, 1]]);
  assert.deepEqual(Array.from(polygon.vertices[1].color), [0, 0, 1, 1]);
  new Tr2SpriteObjectBase();
  assert.equal(CjsSchema.getField(Tr2SpriteObjectBase, "displayX")?.type.kind, "float32");
  assert.equal(CjsSchema.getField(Tr2Sprite2dVertex, "texCoord")?.type.kind, "array");

  const lineTrace = new Tr2Sprite2dLineTrace();
  lineTrace.AppendVertices([[0, 0], [4, 2]], null, [1, 1, 1, 1], ["start", "end"]);
  assert.equal(lineTrace.vertices.length, 2);
  assert.equal(lineTrace.vertices[1].name, "end");
  lineTrace.SetVertices([[1, 2], [3, 4]], null, [0.5, 0.5, 0.5, 1], "point");
  assert.deepEqual(Array.from(lineTrace.vertices[0].position), [1, 2]);
  assert.equal(lineTrace.vertices[1].name, "point");
});

test("EveLineSet retains editable CPU lines before renderer submission", () =>
{
  const lines = new EveLineSet();
  const first = lines.AddLine([0, 0, 0], [1, 0, 0, 1], [1, 0, 0], [0, 1, 0, 1]);
  const second = lines.AddLine([0, 1, 0], [0, 0, 1, 1], [1, 1, 0], [1, 1, 1, 1]);
  assert.equal(first, 0);
  assert.equal(second, 1);
  assert.equal(lines.ChangeLinePosition(first, [2, 3, 4], [5, 6, 7]), true);
  assert.equal(lines.ChangeLineColor(first, [0.5, 0.5, 0.5, 1], [1, 0.5, 0, 1]), true);
  assert.deepEqual(Array.from(lines.lines[0].position1), [2, 3, 4]);
  assert.deepEqual(Array.from(lines.lines[0].color2), [1, 0.5, 0, 1]);
  assert.equal(lines.RemoveLine(second), true);
  assert.equal(lines.SubmitChanges(), true);
  assert.equal(lines.currentSubmittedLineCount, 1);
  assert.equal(lines.maxCurrentLineCount, 1);
  lines.ClearLines();
  lines.SubmitChanges();
  assert.equal(lines.currentSubmittedLineCount, 0);
  assert.equal(lines.maxCurrentLineCount, 1);
  assert.equal(lines.HasTransparentBatches(), true);
  assert.throws(() => lines.GetBatches(null, 0, null, 0), /not implemented/);

  // Update stamps the world transform from the curves and scaling (cpp:97-114).
  lines.scaling.set([2, 2, 2]);
  lines.translationCurve = { Update: (out, _time) => out.set([3, 4, 5]) };
  lines.Update({ GetTime: () => 1 });
  assert.deepEqual(Array.from(lines.worldTransform.slice(12, 15)), [3, 4, 5], "translation stamped");
  assert.equal(lines.worldTransform[0], 2, "scaling stamped");

  // GetSortValue is the view distance (cpp:203-208).
  assert.equal(lines.GetSortValue({ GetViewPosition: () => [3, 8, 5] }), 4, "distance to the view position");
  assert.equal(lines.GetSortValue(), 0, "no render context yields 0");

  // GetPerObjectData is the { vs, ps } record - two structs, one WorldMat each,
  // both stored TRANSPOSED (cpp:210-231).
  const pod = lines.GetPerObjectData(makeAccumulatorWithStore());
  assert.deepEqual([...pod.vs.GetLayout().stages], ["vs"]);
  assert.deepEqual([...pod.ps.GetLayout().stages], ["ps"]);
  assert.equal(pod.vs.GetData()[3], 3, "vs WorldMat transposed - translation x at [3]");
  assert.equal(pod.ps.GetData()[7], 4, "ps WorldMat transposed - translation y at [7]");
});

test("EveChildBulletStorm rebuilds locator instances and transitions its clip sphere", () =>
{
  const storm = new EveChildBulletStorm();
  storm.multiplier = 2;
  storm.sourceLocatorSet = "weapon";
  storm.sourceObject = {
    GetLocatorsForSet: name => name === "weapon" ? [{ position: [1, 2, 3], direction: [0, 0, 0, 1] }] : null,
    GetBoundingSphere(out) { out.set([0, 0, 0, 50]); return true; }
  };
  assert.equal(storm.Rebuild(), true);
  assert.equal(storm.objectCount, 2);
  assert.deepEqual(Array.from(storm.instances[0].sourcePositionOS), [1, 2, 3]);
  assert.deepEqual(Array.from(storm.instances[0].sourceDirectionOS), [0, 1, 0]);
  storm.targetObjects.push({
    modelWorldPosition: [10, 20, 30],
    GetBoundingSphere(out) { out.set([10, 20, 30, 5]); return true; }
  });
  storm.StartEffect();
  assert.equal(storm.CanChangeState(), false);
  storm.UpdateAsyncronous({ GetDeltaT: () => 1.05 });
  assert.equal(storm.clipSphere, 1);
  assert.equal(storm.CanChangeState(), true);
  assert.equal(storm.targetBlobs[0][3], 4050);
  storm.StopEffect();
  storm.UpdateAsyncronous({ GetDeltaT: () => 1.05 });
  assert.equal(storm.clipSphere, -1);
  assert.equal(storm.CanChangeState(), true);

  // GetPerObjectData (cpp:393-410): transposed world, effectInfo packing, and
  // per-element target writes with slots past the target count untouched.
  storm.worldTransform[12] = 7;
  const stormPod = storm.GetPerObjectData(makeAccumulatorWithStore());
  assert.equal(stormPod.GetData()[3], 7, "world transposed - translation x at [3]");
  assert.deepEqual(
    Array.from(stormPod.GetData().slice(16, 20)),
    [1, storm.sourceRadius + storm.range, -1, 1000].map(Math.fround),
    "effectInfo = (targetCount, sourceRadius + range, clipSphere, speed)"
  );
  assert.deepEqual(
    Array.from(stormPod.Copy("targetPositionsWS", new Float32Array(4), 0)),
    [10, 20, 30, 4050],
    "target blob 0 written"
  );
});

test("EveChildExplosion schedules local and global Carbon explosion children", () =>
{
  const setups = [];
  const makeEffect = name => ({
    Clone: () => ({ name, Setup: (...args) => setups.push([name, ...args]) })
  });
  const explosion = new EveChildExplosion();
  explosion.localExplosion = makeEffect("local");
  explosion.globalExplosion = makeEffect("global");
  explosion.localExplosionInterval = 0;
  explosion.localDuration = 1;
  explosion.globalDuration = 1;
  explosion.SetLocalExplosionTransforms([[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 6, 7, 1]]);
  explosion.scaling.set([2, 4, 5]);
  explosion.SetGlobalExplosionOffset([10, 8, 5]);
  assert.deepEqual(Array.from(explosion.globalExplosionOffset), [5, 2, 1]);
  assert.equal(explosion.Play(), true);
  assert.equal(explosion.isPlaying, true);
  explosion.UpdateSyncronous({ GetDeltaT: () => 0.1 });
  assert.equal(setups.length, 1);
  assert.equal(setups[0][0], "local");
  assert.deepEqual(Array.from(setups[0][3]), [5, 6, 7]);
  assert.equal(explosion.globalExplosionInstances.length, 1);
  assert.ok(explosion.generatedGlobalExplosions);
  explosion.Stop();
  assert.equal(explosion.isPlaying, false);
  assert.equal(explosion.objects.length, 0);
  assert.equal(explosion.globalExplosionInstances.length, 0);
});

test("generated child wrappers propagate Carbon controller and socket calls", () =>
{
  const calls = [];
  const child = {
    SetControllerVariable: (name, value) => calls.push(["set", name, value]),
    HandleControllerEvent: name => calls.push(["event", name]),
    StartControllers: () => calls.push(["start"])
  };
  const instances = new EveChildInstanceContainer();
  instances.source = child;
  instances.instances.push(child);
  instances.SetControllerVariable("Speed", 2);
  instances.HandleControllerEvent("Fire");
  instances.StartControllers();
  assert.equal(calls.filter(call => call[0] === "set").length, 2);

  calls.length = 0;
  const controller = {
    SetVariable: (name, value) => calls.push(["controller-set", name, value]),
    HandleEvent: name => calls.push(["controller-event", name]),
    Start: () => calls.push(["controller-start"])
  };
  const plug = new EveChildPlug();
  plug.controllers.push(controller);
  plug.objects.push(child);
  plug.SetControllerVariable("Heat", 0.5);
  plug.HandleControllerEvent("Cycle");
  plug.StartControllers();
  assert.equal(calls.length, 4);

  calls.length = 0;
  const procedural = new EveChildProceduralContainer();
  procedural.selectedObject = child;
  procedural.selectionMethod = {
    GetProceduralMethodVariable: () => "Variant",
    SetProceduralMethodVariable: (name, value) => calls.push(["procedural", name, value])
  };
  assert.equal(procedural.GetMethodVariableName(), "Variant");
  procedural.SetProceduralContainerVariable("Variant", 3);
  procedural.SetControllerVariable("Alpha", 1);
  assert.equal(calls.length, 2);

  calls.length = 0;
  const ref = new EveChildRef();
  ref.resPath = "res:/child.red";
  ref.resourceLoader = () => child;
  assert.equal(ref.Reload(), true);
  ref.StartControllers();
  assert.deepEqual(calls[0], ["start"]);

  const target = { label: "default" };
  const external = new Tr2ExternalParameter();
  external.SetName("label");
  external.SetDestinationObject(target);
  external.SetDestinationAttribute("label");
  const socketPlug = new EveChildPlug();
  socketPlug.externalParameters.push(external);
  const socket = new EveChildSocket();
  socket.resPath = "res:/plug.red";
  socket.resourceLoader = () => socketPlug;
  assert.equal(socket.Reload(), true);
  assert.equal(socket.parameters.length, 1);
  socket.parameters[0].value = "updated";
  socket.parameters[0].Propagate();
  assert.equal(target.label, "updated");
});

test("Eve effects propagate controllers, bindings, and named parameters", () =>
{
  const calls = [];
  const controller = {
    Link: owner => calls.push(["link", owner]),
    SetVariable: (name, value) => calls.push(["set", name, value]),
    HandleEvent: name => calls.push(["event", name]),
    Start: () => calls.push(["start"])
  };
  const lensflare = new EveLensflare();
  lensflare.controllers.push(controller);
  lensflare.SetControllerVariable("Brightness", 0.75);
  lensflare.StartControllers();
  assert.equal(calls.length, 2);
  assert.equal(lensflare.HasTransparentBatches(), false);
  assert.equal(lensflare.GetSortValue(), 1);

  // GetPerObjectData (cpp:399-410): directionScale = (direction, sunSize);
  // indices[0]/[1] from the occlusion offsets (null -> 0); indices[2]/[3]
  // NEVER written (Carbon arena-garbage parity). Dual-bound: one payload,
  // stages ["vs", "ps"].
  lensflare.direction.set([0.6, 0, 0.8]);
  lensflare.sunSize = 1.5;
  lensflare.occlusionOffset = 7;
  const flarePod = lensflare.GetPerObjectData(makeAccumulatorWithStore());
  assert.deepEqual([...flarePod.GetLayout().stages], ["vs", "ps"], "same bytes bound to both slots");
  assert.deepEqual(Array.from(flarePod.GetData().slice(0, 4)), [0.6, 0, 0.8, 1.5].map(Math.fround), "directionScale");
  const flareUints = new Uint32Array(flarePod.GetData().buffer, flarePod.GetData().byteOffset, flarePod.GetData().length);
  assert.equal(flareUints[4], 7, "indices[0] from the occlusion offset");
  assert.equal(flareUints[5], 0, "indices[1] null offset uploads 0");

  let batchArgs = null;
  lensflare.mesh = {
    GetAreas: batchType => [`area-${batchType}`],
    GetBatches: (...args) => batchArgs = args
  };
  lensflare.GetBatches("batches", 3, "perObjectData", 9);
  assert.deepEqual(batchArgs, ["batches", ["area-3"], "perObjectData"]);

  calls.length = 0;
  const effect = new EveMultiEffect();
  effect.controllers.push(controller);
  effect.bindings.push({
    SetOwner: owner => calls.push(["owner", owner]),
    Link: () => calls.push(["binding-link"]),
    Update: time => calls.push(["binding-update", time])
  });
  const parameter = new EveMultiEffectParameter();
  parameter.name = "Target";
  effect.parameters.push(parameter);
  const targetObject = {};
  assert.equal(effect.SetParameter("Target", targetObject), true);
  assert.equal(parameter.object, targetObject);
  assert.equal(calls.filter(call => call[0] === "binding-update").length, 1);
  effect.SetControllerVariable("Heat", 1);
  effect.HandleControllerEvent("Fire");
  effect.StartControllers();
  assert.equal(calls.some(call => call[0] === "set"), true);
  assert.equal(calls.some(call => call[0] === "event"), true);
  assert.equal(calls.some(call => call[0] === "start"), true);
});

test("EveTacticalTrails keeps Carbon-style weak tracked-object registrations", () =>
{
  const trails = new EveTacticalTrails();
  const object = {};
  assert.equal(trails.RegisterObject(object), true);
  assert.equal(trails.RegisterObject(object), false);
  assert.equal(trails.trackedObjects.length, 1);
  assert.equal(trails.trackedObjects[0].ball?.deref?.() ?? trails.trackedObjects[0].ball, object);
  assert.equal(trails.UnregisterObject(object), true);
  assert.equal(trails.trackedObjects[0].ball, null);
  assert.equal(trails.UnregisterObject(object), false);
  assert.equal(trails.HasTransparentBatches(), true);
  assert.equal(trails.GetSortValue(), 0);
  assert.equal(trails.GetPerObjectData(null), null);
  assert.throws(() => trails.GetBatches(null, 0, null, 0), /not implemented/);
});

test("EveShip2 rebuilds booster items from Carbon locator names", () =>
{
  const ship = new EveShip2();
  ship.boosters = new EveBoosterSet2();
  const booster = new EveLocator2();
  booster.name = "locator_booster_1";
  booster.transform[12] = 5;
  const weapon = new EveLocator2();
  weapon.name = "locator_turret_1";
  ship.locators.push(booster, weapon);
  assert.equal(ship.RebuildBoosterSet(), true);
  assert.equal(ship.boosters.items.length, 1);
  assert.equal(ship.boosters.items[0].transform[12], 5);
  assert.deepEqual(Array.from(ship.boosters.items[0].functionality), [0, 1, 1, 1]);
});

test("EveCamera restores Carbon constructor defaults and portable controls", () =>
{
  const camera = new EveCamera();
  assert.equal(camera.fieldOfView, Math.PI / 2);
  assert.equal(camera.zoomCurve.GetKeys().length, 4);
  assert.ok(camera.projectionMatrix);
  assert.ok(camera.viewMatrix);

  camera.Dolly(5);
  assert.equal(camera.translationFromParent, 25);
  camera.SetOrbit(Math.PI * 3, 0.4);
  assert.ok(Math.abs(camera.yaw - Math.PI) < 1e-6);
  assert.equal(camera.pitch, 0.4);
  camera.OrbitParent(2, -1);

  camera.SetRotationOnOrbit(0.5, -0.25);
  assert.notDeepEqual(Array.from(camera.rotationOfInterest), [0, 0, 0, 1]);
  camera.RotateOnOrbit(1, 1);
  assert.equal(camera.Zoom(), true);
  assert.equal(camera.Zoom(0), true);
  camera.ResetStartTime();

  for (const name of ["Dolly", "OrbitParent", "RotateOnOrbit", "ResetStartTime", "SetOrbit", "SetRotationOnOrbit"])
  {
    assert.equal(CjsSchema.getMethod(EveCamera, name)?.impl?.status, "implemented", name);
  }
  assert.equal(CjsSchema.getMethod(EveCamera, "Zoom")?.impl?.status, "adapted");
});

test("Tr2CurveLineSet preserves Carbon line IDs, edits, and segment submissions", () =>
{
  const set = new Tr2CurveLineSet();
  const straight = set.AddStraightLine([0, 0, 0], [1, 0, 0, 1], [1, 0, 0], [0, 1, 0, 1], 2);
  const curved = set.AddCurvedLineCrt([0, 0, 0], [1, 1, 1, 1], [4, 0, 0], [1, 1, 1, 1], [2, 2, 0], 3, 4);
  assert.equal(straight, 0);
  assert.equal(curved, 1);

  set.ChangeLineColor(straight, [0, 0, 1, 1], [1, 1, 0, 1]);
  set.ChangeLinePositionCrt(straight, [1, 2, 3], [4, 5, 6]);
  set.ChangeLineWidth(straight, 7);
  set.ChangeLineIntermediateCrt(curved, [3, 2, 1]);
  set.ChangeLineMultiColor(curved, [0.25, 0.5, 0.75, 1], 0.4);
  set.ChangeLineAnimation(curved, [1, 0, 1, 1], 2, 3);
  set.ChangeLineSegmentation(curved, 6);
  assert.equal(set.SubmitChanges(), true);
  assert.equal(set.currentSubmittedLineCount, 7);
  assert.deepEqual(Array.from(set.lines[straight].position1), [1, 2, 3]);
  assert.equal(set.lines[straight].width, 7);
  assert.equal(set.lines[curved].numOfSegments, 6);
  assert.equal(set.lines[curved].multiColorBorder, 0.4);

  const spherical = set.AddSpheredLineSph([0, Math.PI / 2, 2], [1, 1, 1, 1], [Math.PI / 2, Math.PI / 2, 2], [1, 1, 1, 1], [10, 20, 30], 1);
  assert.ok(Math.abs(set.lines[spherical].position1[2] - 32) < 1e-6);
  assert.ok(Math.abs(set.lines[spherical].position2[0] - 12) < 1e-6);

  set.RemoveLine(straight);
  const reused = set.AddStraightLine([0, 0, 0], [1, 1, 1, 1], [0, 1, 0], [1, 1, 1, 1], 1);
  assert.equal(reused, straight);
  set.ClearLines();
  assert.equal(set.lines.length, 0);
  assert.equal(set.emptyLineID.length, 0);
});

test("generated drone behavior controls follow Carbon's direct graph mutations", () =>
{
  const backAndForth = new BackAndForth();
  backAndForth.AddLocatorSet();
  assert.deepEqual(backAndForth.locatorSet.map(set => set.name), ["seek", "deliver"]);

  const seek = new SeekTarget();
  const target = {};
  seek.SetTarget(target);
  seek.SetBehaviorWeight(42);
  seek.SetTotalRepairTime(8);
  seek.SetExit(true);
  seek.SetupShipRepair();
  assert.equal(seek.target, target);
  assert.equal(seek.behaviorWeight, 42);
  assert.equal(seek.totalRepairTime, 8);
  assert.equal(seek.exit, false);
  assert.equal(seek.repair, true);
  seek.ResetBehavior();
  assert.equal(seek.repair, false);
  seek.AddLocatorSet();
  assert.equal(seek.locatorSet.name, "damage");

  const cycling = new EveProceduralMethodCycling();
  cycling.parameters.push({}, {});
  assert.equal(cycling.restart(100), true);
  assert.equal(cycling.selectedChild, 0);
  assert.equal(cycling.restart(101), true);
  assert.equal(cycling.selectedChild, 1);
});

test("SeekTarget partitions target locators along the longest local bounds axis", () =>
{
  const seek = new SeekTarget();
  const positions = [[1, 1, 1], [3, 1, 1], [5, 1, 1], [7, 1, 1]];
  seek.target = {
    GetLocalBoundingBox(min, max)
    {
      min.set([0, 0, 0]);
      max.set([8, 2, 2]);
      return true;
    },
    GetLocatorCount: () => positions.length,
    GetLocatorPositionFromSet(index, _worldSpace, _setName, out)
    {
      out.set(positions[index]);
      return out;
    }
  };
  assert.equal(seek.SplitBoundingBox(), true);
  assert.deepEqual(seek.GetLocatorBucketIndices(), [[0], [1], [2], [3]]);
});

test("generated Eve child renderables expose Carbon's injected vertex usages", () =>
{
  assert.deepEqual(new EveChildBehaviorSystem().GetVertexElementAddedThroughCode(), [
    [5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13]
  ]);
  assert.deepEqual(new EveChildLineSet().GetVertexElementAddedThroughCode(), [
    [5, 8], [5, 9], [5, 10]
  ]);
});

test("EveSceneStaticParticles builds deterministic CPU instance rows and bounds", () =>
{
  const particles = new EveSceneStaticParticles();
  const mesh = new Tr2InstancedMesh();
  const instanceData = new Tr2RuntimeInstanceData();
  mesh.SetInstanceGeometryRes(instanceData);
  particles.mesh = mesh;
  particles.clusterParticleDensity = 2;
  particles.maxParticleCount = 3;
  particles.AddCluster([0, 0, 0], 2, [1, 0, 0, 1], [0, 1, 0, 1], 10);
  particles.AddCluster([10, 0, 0], 1, [0, 0, 1, 1], [1, 1, 1, 1], 20);

  assert.equal(particles.Rebuild(), true);
  assert.equal(instanceData.count, 3);
  assert.equal(particles.clusterParticleDensityAdjust, 0.5);
  assert.deepEqual(Array.from(particles.centerOfClusters), [5, 0, 0]);
  assert.ok(particles.boundingSphere[3] > 0);
  assert.ok(mesh.maxBounds[0] >= mesh.minBounds[0]);
  const firstBuild = Array.from(instanceData.GetData());
  assert.equal(particles.Rebuild(), true);
  assert.deepEqual(Array.from(instanceData.GetData()), firstBuild);

  particles.ClearClusters();
  assert.equal(particles.clusters.length, 0);
  assert.equal(instanceData.count, 0);
});

test("spline behavior helpers rebuild Carbon's CPU tunnel graph", () =>
{
  const curve = new Tr2CurveVector3();
  curve.AddKey(0, [0, 0, 0]);
  curve.AddKey(3, [3, 6, 9]);
  const group = new SplineTunnelGroup();
  group.curveSets.push(curve);
  group.breakPoints = 2;
  const tunnels = group.createSplineTunnels();
  assert.equal(tunnels.length, 1);
  assert.equal(tunnels[0].splinePoints.length, 4);
  assert.deepEqual(Array.from(tunnels[0].splinePoints[0].pos), [0, 0, 0]);
  assert.deepEqual(Array.from(tunnels[0].splinePoints[3].pos), [3, 6, 9]);
  assert.equal(tunnels[0].cylWidth, group.tunnelWidth);

  const follow = new FollowASpline();
  follow.splineTunnels.push(group);
  assert.equal(follow.remapTunnels().length, 1);
  assert.equal(follow.privateTunnels[0], tunnels[0]);
  assert.equal(follow.shouldReassignTunnelIDs, true);

  const spawn = new SpawnDrones();
  spawn.regenerateDrones = false;
  spawn.gridToggleReset();
  assert.equal(spawn.regenerateDrones, true);
});

test("Tr2ManipulationTool owns portable selection, initialization, and move callbacks", () =>
{
  const tool = new Tr2ManipulationTool();
  const colors = [];
  tool.primitives.push({ name: "x", SetCurrentColor: color => colors.push(Array.from(color)) });
  tool.ResetPrimitiveColors = () => colors.push("reset");
  assert.equal(tool.SelectAxis("missing"), false);
  assert.equal(tool.SelectAxis("x"), true);
  assert.equal(tool.selectedAxis, "x");
  assert.deepEqual(colors, ["reset", [1, 1, 0.009999999776482582, 1]]);

  const transform = new Float32Array(16);
  transform[0] = transform[5] = transform[10] = transform[15] = 1;
  transform[12] = 8;
  tool.Init(transform);
  assert.equal(tool.localTransform[12], 8);
  tool.SetMoveCallback((_current, next) => next[12] < 10);
  assert.equal(tool.OnMoveCallback(transform, transform), true);
  const rejected = new Float32Array(transform);
  rejected[12] = 12;
  assert.equal(tool.OnMoveCallback(transform, rejected), false);
});

test("EveSwarm maintains Carbon's portable CPU swarmer graph", () =>
{
  const swarm = new EveSwarm();
  swarm.worldPosition.set([5, 6, 7]);
  swarm.SetCount(3);
  assert.equal(swarm.count, 3);
  assert.equal(swarm.vehicles.length, 3);
  assert.equal(swarm.renderables.length, 3);
  assert.deepEqual(Array.from(swarm.vehicles[0].position), [5, 6, 7]);
  assert.equal(swarm.renderables[0].owner, swarm);
  assert.equal(swarm.renderables[0].mesh, swarm.mesh);

  swarm.targetIndex = 1;
  const removedPosition = swarm.RemoveSwarmer();
  assert.deepEqual(Array.from(removedPosition), [5, 6, 7]);
  assert.equal(swarm.count, 2);
  assert.equal(swarm.vehicles.length, 2);
  assert.equal(swarm.renderables.length, 2);
  assert.ok(swarm.PickFiringOrigin() >= 0 && swarm.firingIndex < swarm.count);

  swarm.EnableSwarming(true);
  assert.equal(swarm.swarmingEnabled, true);
  swarm.squadBoundsMin.set([-1, -2, -3]);
  swarm.squadBoundsMax.set([1, 2, 3]);
  swarm.EnableSwarming(false);
  assert.equal(swarm.swarmingEnabled, false);
  assert.equal(swarm.count, 1);
  assert.deepEqual(Array.from(swarm.squadBoundsMin), [0, 0, 0]);
  assert.deepEqual(Array.from(swarm.squadBoundsMax), [0, 0, 0]);

  swarm.SetCount(-2);
  assert.equal(swarm.count, 0);
  assert.equal(swarm.vehicles.length, 0);
  for (const name of ["AddSwarmer", "RemoveSwarmer", "PickFiringOrigin", "EnableSwarming", "SetCount"])
  {
    assert.notEqual(CjsSchema.getMethod(EveSwarm, name)?.impl?.status, "not-implemented", name);
  }
});

test("EveSwarmRenderable copies transforms and shared ship shader data", () =>
{
  const renderable = new EveSwarmRenderable();
  const owner = {};
  const shaderOptions = [];
  const mesh = { SetShaderOption: (name, value) => shaderOptions.push([name, value]) };
  renderable.InitializeRenderable(owner, mesh);
  assert.equal(renderable.GetID(), owner);

  const transform = new Float32Array(16);
  transform[0] = transform[5] = transform[10] = transform[15] = 1;
  transform[12] = 8;
  transform[13] = 9;
  transform[14] = 10;
  renderable.SetWorldTransform(transform);
  assert.deepEqual(Array.from(renderable.GetWorldTransform()), Array.from(transform));
  // The record stores the TRANSPOSED transform, so the translation lands in the
  // fourth COLUMN: flat index 3 rather than 12.
  const stored = renderable.GetPerObjectData();
  assert.equal(stored.vs.GetTransposed("worldTransform")[3], 8);
  assert.equal(stored.ps.GetTransposed("worldTransform")[3], 8);

  const sourceVs = RawData.create("EveSpaceObjectVSData");
  sourceVs.Set("clipData", [1, 2, 3, 4]);
  sourceVs.Set("ellpsoidCenter", [5, 6, 7, 8]);
  sourceVs.Set("ellpsoidRadii", [9, 10, 11, 12]);
  sourceVs.Set("shipData", [13, 14, 15, 16]);
  const sourcePs = RawData.create("EveSpaceObjectPSData");
  sourcePs.Set("clipSphereCenter", [17, 18, 19]);
  sourcePs.Set("shipData", [20, 21, 22, 23]);
  sourcePs.Set("clipRadiusSq", [24]);
  sourcePs.Set("clipRadius2Sq", [25]);
  sourcePs.Set("impactDataOffset", [26]);
  sourcePs.Set("clipSphereFactor2", [27]);
  sourcePs.Set("clipSphereFactor", [28]);
  sourcePs.SetIndex("shLightingCoefficients", 0, [29, 30, 31, 32]);
  renderable.SetShaderData(sourceVs, sourcePs);
  renderable.SetBoosterIntensity(0.75);
  assert.deepEqual(Array.from(stored.vs.Get("clipData")), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(stored.ps.Get("clipSphereCenter")), [17, 18, 19]);
  assert.deepEqual(Array.from(stored.ps.GetIndex("shLightingCoefficients", 0)), [29, 30, 31, 32]);
  assert.deepEqual(Array.from(stored.ps.Get("shipData")), [0.75, 21, 22, 23]);

  const decal = { Clone: () => ({ clone: true }) };
  renderable.InitDecals([decal]);
  assert.deepEqual(renderable.decals, [{ clone: true }]);
  renderable.SetShaderOption("QUALITY", "HIGH");
  assert.deepEqual(shaderOptions, [["QUALITY", "HIGH"]]);
});

test("particle reset hooks and native concurrency fields retain portable semantics", () =>
{
  const system = new Tr2ParticleSystem();
  const bound = [];
  system.aliveCount = 12;
  system.constraints.push({ Bind: owner => bound.push(owner) });
  system.RebindConstraints();
  system.ClearParticles();
  assert.deepEqual(bound, [system]);
  assert.equal(system.aliveCount, 0);

  const emitter = new Tr2StaticEmitter();
  emitter.hasSpawnedParticles = true;
  emitter.Spawn();
  assert.equal(emitter.hasSpawnedParticles, false);

  const geometry = new Tr2RaytracingGeometry();
  const quadRenderer = new Tr2QuadRenderer();
  assert.equal(Tr2RaytracingGeometry.INVALID_MATERIAL, 0xffffffff);
  assert.equal(Object.hasOwn(geometry, "INVALID_MATERIAL"), false);
  assert.equal(geometry.threadLocalUsedResources, null);
  // The flattened EffectRecord fields (combinable et al.) were removed when
  // the CPU half landed; per-frame accumulation lives on the effect records.
  assert.equal(Object.hasOwn(quadRenderer, "combinable"), false);
  assert.equal(quadRenderer.bufferSize, 0);
});

test("particle declarations restore Carbon nested semantic properties", () =>
{
  const declaration = new Tr2ParticleElementDeclaration();
  assert.equal(declaration.elementType, Tr2ParticleElementDeclaration.Type.CUSTOM);
  assert.equal(declaration.GetDimension(), 1);
  declaration.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
  declaration.dimension = 1;
  assert.equal(declaration.GetDimension(), 3);
  assert.equal(declaration.GetName(), "POSITION");
  declaration.elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;
  declaration.customName = "temperature";
  declaration.dimension = 8;
  assert.equal(declaration.GetDimension(), 4);
  assert.equal(declaration.GetName(), "temperature");
  assert.equal(CjsSchema.getField(Tr2ParticleElementDeclaration, "elementType")?.type.kind, "int32");
  assert.equal(CjsSchema.getField(Tr2ParticleElementDeclaration, "customName")?.type.kind, "string");
  assert.deepEqual(Tr2ParticleElementDeclarationName.Type, Tr2ParticleElementDeclaration.Type);
});

test("CPU particle declarations, emitters, simulation, and bounds follow Carbon stages", () =>
{
  const system = new Tr2ParticleSystem();
  system.maxParticleCount = 4;
  for (const elementType of [
    Tr2ParticleElementDeclaration.Type.LIFETIME,
    Tr2ParticleElementDeclaration.Type.POSITION,
    Tr2ParticleElementDeclaration.Type.VELOCITY
  ])
  {
    const element = new Tr2ParticleElementDeclaration();
    element.elementType = elementType;
    element.usedByGPU = elementType !== Tr2ParticleElementDeclaration.Type.LIFETIME;
    system.elements.push(element);
  }
  assert.equal(system.UpdateElementDeclaration(), true);

  const generator = {
    Bind(owner, boundElements)
    {
      if (owner !== system || !(boundElements instanceof Set))
      {
        return false;
      }
      for (const elementType of [
        Tr2ParticleElementDeclaration.Type.LIFETIME,
        Tr2ParticleElementDeclaration.Type.POSITION,
        Tr2ParticleElementDeclaration.Type.VELOCITY
      ])
      {
        const element = owner.GetElement(elementType);
        if (!element || boundElements.has(element.key))
        {
          return false;
        }
        boundElements.add(element.key);
      }
      return true;
    },
    Generate(position, velocity, index)
    {
      system.SetParticleElement(index, Tr2ParticleElementDeclaration.Type.LIFETIME, [0, 2]);
      system.SetParticleElement(index, Tr2ParticleElementDeclaration.Type.POSITION, [0, 0, 0]);
      system.SetParticleElement(index, Tr2ParticleElementDeclaration.Type.VELOCITY, [2, 0, 0]);
    }
  };
  const emitter = new Tr2DynamicEmitter();
  emitter.particleSystem = system;
  emitter.generators.push(generator);
  emitter.rate = 2;
  assert.equal(emitter.Rebind(), true);
  assert.equal(emitter.UpdateSimulation(0.75), 1);
  assert.equal(system.aliveCount, 1);
  assert.equal(emitter.GetEmittedParticleCount(), 1);

  system.UpdateSimulation(0.5);
  assert.deepEqual(Array.from(system.GetParticleElement(0, Tr2ParticleElementDeclaration.Type.POSITION)), [1, 0, 0]);
  assert.deepEqual(Array.from(system.aabbMin), [1, 0, 0]);
  assert.deepEqual(Array.from(system.aabbMax), [1, 0, 0]);
  system.UpdateSimulation(2);
  assert.equal(system.aliveCount, 0);

  const staticEmitter = new Tr2StaticEmitter();
  staticEmitter.particleSystem = system;
  staticEmitter.geometryResource = {
    meshes: [{
      particles: [{ lifetime: [0, 10], position: [3, 4, 5], velocity: [0, 0, 0] }]
    }]
  };
  assert.equal(staticEmitter.ForceSpawn(), 1);
  assert.equal(system.aliveCount, 1);
  assert.deepEqual(Array.from(system.GetParticleElement(0, Tr2ParticleElementDeclaration.Type.POSITION)), [3, 4, 5]);
});

test("authored particle generators and element constraints bind to CPU declarations", () =>
{
  const system = new Tr2ParticleSystem();
  system.maxParticleCount = 2;
  const position = new Tr2ParticleElementDeclaration();
  position.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
  const velocity = new Tr2ParticleElementDeclaration();
  velocity.elementType = Tr2ParticleElementDeclaration.Type.VELOCITY;
  const custom = new Tr2ParticleElementDeclaration();
  custom.elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;
  custom.customName = "heat";
  custom.dimension = 1;
  custom.usedByGPU = false;
  system.elements.push(position, velocity, custom);

  const shape = new Tr2SphereShapeAttributeGenerator();
  shape.minPhi = shape.maxPhi = 90;
  shape.minTheta = shape.maxTheta = 0;
  shape.minRadius = shape.maxRadius = 2;
  shape.minSpeed = shape.maxSpeed = 3;
  shape.position.set([10, 0, 0]);
  const heat = new Tr2RandomUniformAttributeGenerator();
  heat.customName = "heat";
  heat.minRange[0] = heat.maxRange[0] = 4;
  const blend = new Tr2ElementBlendConstraint();
  blend.customName = "heat";
  blend.originalFactor = 2;
  blend.value[0] = 1;
  system.constraints.push(blend);
  system.UpdateElementDeclaration();

  const emitter = new Tr2DynamicEmitter();
  emitter.particleSystem = system;
  emitter.rate = 1;
  emitter.generators.push(shape, heat);
  assert.equal(emitter.Rebind(), true);
  emitter.UpdateSimulation(1);
  const generatedPosition = system.GetParticleElement(0, "position");
  const generatedVelocity = system.GetParticleElement(0, "velocity");
  assert.ok(Math.abs(generatedPosition[0] - 12) < 1e-6);
  assert.ok(Math.abs(generatedPosition[1]) < 1e-6);
  assert.ok(Math.abs(generatedPosition[2]) < 1e-6);
  assert.ok(Math.abs(generatedVelocity[0] - 3) < 1e-6);
  assert.ok(Math.abs(generatedVelocity[1]) < 1e-6);
  assert.ok(Math.abs(generatedVelocity[2]) < 1e-6);
  assert.deepEqual(Array.from(system.GetParticleElement(0, "heat")), [4]);
  system.UpdateSimulation(0);
  assert.deepEqual(Array.from(system.GetParticleElement(0, "heat")), [9]);
  assert.equal(CjsSchema.getField(Tr2RandomUniformAttributeGenerator, "customName")?.type.kind, "string");
});

test("particle emitters and near-field spheres enforce Carbon's shared element claims", () =>
{
  const createSystem = includeHeat =>
  {
    const system = new Tr2ParticleSystem();
    system.maxParticleCount = 2;
    for (const elementType of [
      Tr2ParticleElementDeclaration.Type.LIFETIME,
      Tr2ParticleElementDeclaration.Type.POSITION,
      Tr2ParticleElementDeclaration.Type.VELOCITY
    ])
    {
      const element = new Tr2ParticleElementDeclaration();
      element.elementType = elementType;
      system.elements.push(element);
    }
    if (includeHeat)
    {
      const heat = new Tr2ParticleElementDeclaration();
      heat.elementType = Tr2ParticleElementDeclaration.Type.CUSTOM;
      heat.customName = "heat";
      system.elements.push(heat);
    }
    return system;
  };

  const nearField = new EveChildParticleSphere();
  assert.equal(nearField.Refresh(), false);
  nearField.particleSystem = createSystem(false);
  assert.equal(nearField.Refresh(), true);

  const heat = new Tr2RandomUniformAttributeGenerator();
  heat.customName = "heat";
  nearField.particleSystem = createSystem(true);
  nearField.generators = [heat];
  assert.equal(nearField.Refresh(), true);
  nearField.generators = [heat, heat];
  assert.equal(nearField.Refresh(), false);
  nearField.generators = [];
  assert.equal(nearField.Refresh(), false);
  nearField.generators = [{}];
  assert.throws(
    () => nearField.Refresh(),
    /Carbon's Bind contract/
  );

  const emitter = new Tr2DynamicEmitter();
  const shape = new Tr2SphereShapeAttributeGenerator();
  const lifetime = new Tr2RandomUniformAttributeGenerator();
  lifetime.elementType = Tr2ParticleElementDeclaration.Type.LIFETIME;
  emitter.particleSystem = createSystem(true);
  emitter.particleSystem.UpdateElementDeclaration();
  emitter.generators = [shape, heat];
  assert.equal(emitter.Rebind(), false);
  emitter.generators.push(lifetime);
  assert.equal(emitter.Rebind(), true);
  emitter.generators.push(heat);
  assert.equal(emitter.Rebind(), false);

  const constraint = new Tr2PlaneConstraint();
  const constraintSystem = createSystem(false);
  constraintSystem.UpdateElementDeclaration();
  const collisionGenerator = new Tr2RandomUniformAttributeGenerator();
  collisionGenerator.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
  constraint.generators = [collisionGenerator];
  assert.equal(constraint.Bind(constraintSystem), true);
  constraint.generators.push(collisionGenerator);
  assert.equal(constraint.Bind(constraintSystem), false);

  assert.equal(CjsSchema.getMethod(EveChildParticleSphere, "Refresh")?.impl?.status, "adapted");
});

test("capsule particle generators interpolate authored emitter transforms", () =>
{
  const system = new Tr2ParticleSystem();
  system.maxParticleCount = 1;
  const position = new Tr2ParticleElementDeclaration();
  position.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
  const velocity = new Tr2ParticleElementDeclaration();
  velocity.elementType = Tr2ParticleElementDeclaration.Type.VELOCITY;
  system.elements.push(position, velocity);
  system.UpdateElementDeclaration();

  const shape = new Tr2CapsuleShapeAttributeGenerator();
  shape.minPhi = shape.maxPhi = 90;
  shape.minTheta = shape.maxTheta = 0;
  shape.minRadius = shape.maxRadius = 2;
  shape.minSpeed = shape.maxSpeed = 3;
  shape.parentVelocityFactor = 0.5;
  shape.SetPositions([2, 0, 0], [0, 0, 0, 1], [4, 0, 0], [0, 0, 0, 1]);

  const emitter = new Tr2DynamicEmitter();
  emitter.particleSystem = system;
  emitter.rate = 1;
  emitter.generators.push(shape);
  assert.equal(emitter.Rebind(), true);

  const random = Math.random;
  Math.random = () => 0.5;
  try
  {
    emitter.SpawnParticles([10, 0, 0], [2, 0, 0], 1);
  }
  finally
  {
    Math.random = random;
  }

  const generatedPosition = system.GetParticleElement(0, "position");
  const generatedVelocity = system.GetParticleElement(0, "velocity");
  assert.ok(Math.abs(generatedPosition[0] - 15) < 1e-6);
  assert.ok(Math.abs(generatedPosition[1]) < 1e-6);
  assert.ok(Math.abs(generatedPosition[2]) < 1e-6);
  assert.ok(Math.abs(generatedVelocity[0] - 4) < 1e-6);
  assert.ok(Math.abs(generatedVelocity[1]) < 1e-6);
  assert.ok(Math.abs(generatedVelocity[2]) < 1e-6);
  assert.equal(shape.GetName(), "POSITION + VELOCITY");
});

test("CPU particle forces use Carbon's GetForce contract and volume attenuation", () =>
{
  const direct = new Tr2ParticleDirectForce();
  direct.force.set([2, 0, 0]);
  const volume = new Tr2ForceSphereVolume();
  volume.radius = 2;
  volume.exponent = 1;
  volume.forces.push(direct);
  assert.deepEqual(Array.from(volume.GetForce([1, 0, 0], [0, 0, 0], 1, 1)), [1, 0, 0]);

  const system = new Tr2ParticleSystem();
  system.maxParticleCount = 1;
  const position = new Tr2ParticleElementDeclaration();
  position.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
  const velocity = new Tr2ParticleElementDeclaration();
  velocity.elementType = Tr2ParticleElementDeclaration.Type.VELOCITY;
  system.elements.push(position, velocity);
  system.forces.push(direct);
  system.UpdateElementDeclaration();
  system.SpawnParticle({ position: [0, 0, 0], velocity: [0, 0, 0] });
  system.UpdateSimulation(1);
  assert.deepEqual(Array.from(system.GetParticleElement(0, "velocity")), [2, 0, 0]);
  assert.deepEqual(Array.from(system.GetParticleElement(0, "position")), [2, 0, 0]);

  system.forces[0] = { ApplyForce() {} };
  assert.throws(
    () => system.UpdateSimulation(1),
    /Carbon's GetForce contract/
  );
});

test("CPU plane and sphere constraints resolve penetrations and reflect velocity", () =>
{
  const createSystem = constraint =>
  {
    const system = new Tr2ParticleSystem();
    system.maxParticleCount = 1;
    const position = new Tr2ParticleElementDeclaration();
    position.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
    const velocity = new Tr2ParticleElementDeclaration();
    velocity.elementType = Tr2ParticleElementDeclaration.Type.VELOCITY;
    system.elements.push(position, velocity);
    system.constraints.push(constraint);
    system.UpdateElementDeclaration();
    return system;
  };

  const plane = new Tr2PlaneConstraint();
  const planeSystem = createSystem(plane);
  planeSystem.SpawnParticle({ position: [0, -1, 0], velocity: [0, -2, 0] });
  planeSystem.UpdateSimulation(0);
  assert.deepEqual(Array.from(planeSystem.GetParticleElement(0, "position")), [0, 0, 0]);
  assert.deepEqual(Array.from(planeSystem.GetParticleElement(0, "velocity")), [0, 2, 0]);

  const sphere = new Tr2SphereConstraint();
  sphere.radius = 2;
  const sphereSystem = createSystem(sphere);
  sphereSystem.SpawnParticle({ position: [1, 0, 0], velocity: [-3, 0, 0] });
  sphereSystem.UpdateSimulation(0);
  assert.deepEqual(Array.from(sphereSystem.GetParticleElement(0, "position")), [2, 0, 0]);
  assert.deepEqual(Array.from(sphereSystem.GetParticleElement(0, "velocity")), [3, 0, 0]);
});

test("Carbon light accessors remain backed by one shared CjsLightData", () =>
{
  const light = new Tr2FactionLight();
  light.radius = 12;
  assert.equal(light.lightData.radius, 12);
  light.factionColor = 0;
  light.saturation = 0;
  light.SetInheritProperties([[1, 0, 0, 0.5]]);
  assert.ok(Math.abs(light.GetSelectedColor()[0] - 0.299) < 1e-6);
  assert.ok(Math.abs(light.GetSelectedColor()[1] - 0.299) < 1e-6);
  assert.equal(light.GetSelectedColor()[3], 0.5);
  light.isSpotlight = true;
  light.OnModified("isSpotlight");
  assert.equal(light.type, Tr2Light.SPOT_LIGHT);

  const smartSpot = new EveSmartLightSpotLight();
  smartSpot.SetValues({ innerAngle: 20, outerAngle: 40 });
  assert.equal(smartSpot.innerAngle, 20);
  assert.equal(smartSpot.outerAngle, 40);
  // Flattened storage (2026-07-23 decision): the m_lightGroupData members are
  // real persisted fields; lightData is the LightData-shaped compat view.
  assert.equal(smartSpot.lightData.constructor.name, "CjsLightData");
  assert.equal(smartSpot.lightData.innerAngle, 20);
  assert.equal(Object.hasOwn(smartSpot, "innerAngle"), true);
  assert.equal(CjsSchema.getField(EveSmartLightSpotLight, "innerAngle")?.io?.persist, true);
  assert.equal(CjsSchema.getField(EveSmartLightSpotLight, "brightness")?.io?.persist, true);
});

test("behavior groups maintain portable DroneAgent counts and spawn positions", () =>
{
  const group = new BehaviorGroup();
  group.spawnPosition.set([4, 5, 6]);
  const flareCounts = [];
  group.boosters = {
    flareCount: 0,
    RebuildFlareBuffer: count => flareCounts.push(count)
  };
  group.SetCount(2);
  // Carbon's SetCount spawns agents WITHOUT writing the authored count field
  // (writing it wiped grid-spawned agents on the FollowASpline reset path -
  // fixed 2026-07-23); count keeps its authored value.
  assert.equal(group.count, 0);
  assert.equal(group.actualCount, 2);
  assert.deepEqual(Array.from(group.GetAgents()[0].position), [4, 5, 6]);
  assert.notEqual(group.GetAgents()[0].position, group.GetAgents()[1].position);
  // CreateAgentTree now builds the real EveKDdroneManagementTree (was a
  // plain agent-array stand-in before the 2026-07-23 behavior port).
  assert.ok(group.CreateAgentTree());
  assert.equal(group.GetAgents().length, 2);
  group.AddAgent();
  assert.equal(group.actualCount, 3);
  group.RemoveAgent();
  assert.equal(group.actualCount, 2);
  group.SetCount(-1);
  assert.equal(group.actualCount, 2);
  assert.deepEqual(flareCounts, [2, 3, 2, 2]); // SetCount(-1) clamps but still rebuilds (Carbon parity)
});

test("scaling and texture animation helpers retain portable CPU state", () =>
{
  const scaling = new Tr2ScalingTool();
  scaling.localTransform[12] = 7;
  let updates = 0;
  const primitive = {
    localTransform: new Float32Array(16),
    UpdateTransform: () => updates++
  };
  scaling.primitives.push(primitive);
  scaling.ResetPrimitives();
  assert.equal(primitive.localTransform[12], 7);
  assert.equal(updates, 1);

  const animation = new Tr2TextureAnimation();
  let restarts = 0;
  const texture = {};
  animation.SetChannels(new Map([["diffuse", { texture, Restart: () => restarts++ }]]));
  animation.frame = 12;
  animation.time = 0.5;
  assert.deepEqual(animation.GetChannelNames(), ["diffuse"]);
  assert.equal(animation.GetTexture("diffuse"), texture);
  animation.RestartAnimation();
  assert.equal(animation.frame, 0);
  assert.equal(animation.time, 0);
  assert.equal(restarts, 1);
});

test("low-hanging ports replace their generated staging files", () =>
{
  const families = new Map([
    ["EvePlanet", "eve/spaceObject"],
    ["EveLensflare", "eve/effect"],
    ["EveLineSet", "eve/ui"],
    ["EveTacticalTrails", "eve/ui"],
    ["EveComponentCollection", "eve/scene"],
    ["EveComponentRegistry", "eve/scene"],
    ["EveTurretFiringFX", "eve/attachment/turrets"],
    ["EveUiObject", "eve/ui"],
    ["EveChildEffectPropagator", "eve/child"],
    ["Tr2MaterialParameterStore", "trinityCore"]
  ]);
  const summary = JSON.parse(readFileSync(new URL("../src/generated/summary.json", import.meta.url), "utf8"));
  const skipped = new Map(summary.skipped.map(entry => [entry.className, entry]));

  for (const [className, family] of families)
  {
    assert.equal(existsSync(new URL(`../src/generated/${family}/${className}.js`, import.meta.url)), false, className);
    assert.equal(skipped.get(className)?.reason, "hand-maintained source exists", className);
  }
});
