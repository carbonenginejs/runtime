import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { blue } from "../../npm/dist/global/blue/index.js";
import { carbonPerlin1D } from "../../npm/dist/global/math/noise.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { ALResult } from "../../npm/dist/trinityal/index.js";
import {
  EveChildBehaviorSystem, EveChildContainer, EveShip2, BehaviorGroup, BehaviorGroupBooster, Tr2Mesh, Tr2MeshArea,
  Tr2EffectStateManager, Tr2RenderContext_GetMainThreadRenderContext, TriDevice, CjsBatchManager
} from "../../npm/dist/trinity/index.js";
import { FixtureEffect } from "../support/fixtureEffect.js";
import { hydrateDemoShip, retireDemoShips } from "../trinityal/webgpu/demo/demoShipLifetime.js";

const context = Tr2RenderContext_GetMainThreadRenderContext();
context.GetRenderContextAL().CreateDevice();
const OPAQUE = TriBatchType.TRIBATCHTYPE_OPAQUE;

test("behaviour constants preserve Carbon's immediate-parent precedence and matrix bytes", t =>
{
  const value = system(t, []);
  assert.ok(value.GetPerObjectData().vs.GetData().every(x => x === 0));
  const parent = new EveChildContainer();
  mat4.fromRotationTranslationScale(parent.worldTransform,
    quat.setAxisAngle(quat.create(), [0, 1, 0], 0.7), [9, 12, 15], [2, 3, 4]);
  value.translation.set([1, 2, 3]);
  value.rotation.set(quat.setAxisAngle(quat.create(), [1, 0, 0], 0.4));
  const local = mat4.fromRotationTranslationScale(mat4.create(), value.rotation, value.translation, value.scaling);
  const expected = mat4.multiply(mat4.create(), parent.worldTransform, local);
  const spaceObjectParent = {
    GetLocalToWorldTransform() { assert.fail("must prefer immediate child parent"); },
    GetPerObjectStructs() { assert.fail("nested child does not inherit hull records here"); }
  };
  value.UpdateAsyncronous({}, {childParent: parent, spaceObjectParent, localToWorldTransform: mat4.create()});
  close(Array.from(value.worldTransform), Array.from(expected));
  const data = value.GetPerObjectData();
  for (const name of ["worldTransform", "worldTransformLast", "invWorldTransform"])
    close(Array.from(data.ps.GetTransposed(name)), Array.from(data.vs.GetTransposed(name)));
  close(Array.from(data.vs.GetTransposed("worldTransform")), Array.from(mat4.transpose(mat4.create(), expected)));
  close(Array.from(data.vs.GetTransposed("invWorldTransform")), Array.from(mat4.invert(mat4.create(), expected)));
  value.translation[0]++;
  value.UpdateAsyncronous({}, {childParent: parent, spaceObjectParent});
  close(Array.from(data.ps.GetTransposed("worldTransformLast")), Array.from(mat4.transpose(mat4.create(), expected)));
});

function close(actual, expected)
{
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-5,
    `${index}: ${value} != ${expected[index]}`));
}

function group(count = 1)
{
  const value = new BehaviorGroup();
  value.SetCount(count);
  value.currentScreenSize = 100;
  for (const agent of value.GetAgents()) agent.isVisible = true;
  return value;
}

function mesh()
{
  const geometry = new TriGeometryRes();
  geometry.SetPayload({ meshes: [{
    decl: [{usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0}],
    vertex: {position: [0, 0, 0, 1, 0, 0, 0, 1, 0]},
    indices: [{faces: [0, 1, 2]}], areas: [{firstElement: 0, elementCount: 1}]
  }] });
  geometry.MarkPrepared();
  const value = new Tr2Mesh();
  value.SetGeometryRes(geometry);
  const area = new Tr2MeshArea();
  area.SetMaterial(FixtureEffect({id: "fish"}));
  value.AddArea(OPAQUE, area);
  return value;
}

function system(t, groups)
{
  const value = new EveChildBehaviorSystem();
  value.behaviorGroups = groups;
  value.Initialize();
  value._hasUpdated = value._behaviorGroupLoaded = true;
  t.after(() => value.Destroy());
  return value;
}

test("ship stream packs Carbon scale-first rows and preserves local motion history", () =>
{
  const value = group();
  const agent = value.GetAgents()[0];
  value.scale = 2;
  quat.setAxisAngle(agent.rotation, [0, 0, 1], Math.PI / 2);
  agent.position.set([3, 5, 7]);
  const parent = mat4.fromRotationTranslationScale(mat4.create(),
    quat.setAxisAngle(quat.create(), [1, 0, 0], 0.7), [100, 200, 300], [2, 3, 4]);
  const data = new Float32Array(30).fill(99);
  value.GetShipInfoForBuffer(data, parent, 3);
  close(Array.from(data.slice(3, 15)), [0, -2, 0, 3, 2, 0, 0, 5, 0, 0, 2, 7]);
  close(Array.from(data.slice(15, 27)), [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0]);
  assert.deepEqual(Array.from(data.slice(0, 3)), [99, 99, 99]);
  assert.deepEqual(Array.from(data.slice(27)), [99, 99, 99]);
  agent.position[0] = 11;
  value.GetShipInfoForBuffer(data, parent, 3);
  assert.equal(data[6], 11);
  assert.equal(data[18], 3, "previous frame, not current frame or parent translation");
  const previous = Array.from(agent.lastTransform);
  value.currentScreenSize = 0;
  value.GetShipInfoForBuffer(data, parent, 3);
  assert.ok(data.slice(3, 27).every(n => n === 0));
  assert.deepEqual(Array.from(agent.lastTransform), previous, "Carbon's whole-group invisible early return retains history");
  value.currentScreenSize = 100;
  agent.xfade = 0.75;
  value.GetShipInfoForBuffer(data, parent, 3);
  assert.ok(data.slice(3, 27).every(n => n === 0), "mesh cutoff is strict");
  agent.xfade = 0;
  agent.isVisible = false;
  value.GetShipInfoForBuffer(data, parent, 3);
  assert.ok(data.slice(3, 27).every(n => n === 0));
});

test("two behaviour groups reach the real collector with separate instance offsets", t =>
{
  const a = group(2), b = group(3);
  a.mesh = mesh(); b.mesh = mesh();
  a.GetAgents()[1].position[0] = 7;
  b.GetAgents()[0].position[0] = 19;
  const value = system(t, [a, b]);
  const renderables = value.GetRenderables([]);
  const manager = new CjsBatchManager().Initialize();
  const collected = manager.Collect(renderables, 0, context);
  const batches = collected.GetAccumulator(OPAQUE).GetBatches();
  assert.equal(batches.length, 2);
  assert.deepEqual(batches.map(x => [x.startInstanceLocation, x.instanceCount]).sort((a, b) => a[0] - b[0]), [[0, 2], [2, 3]]);
  assert.equal(batches[0].vertexStreams[1], value._shipInstanceBuffer);
  assert.equal(batches[0].geometrySource, null, "submission cannot reset the instance stream");
  const declaration = Tr2EffectStateManager.getVertexDeclarationElements(batches[0].vertexDeclaration);
  const items = declaration.items ?? declaration;
  assert.deepEqual(items.filter(x => x.stream === 1).map(x => [x.usage, x.usageIndex, x.offset, x.instanceStepRate]),
    [8, 9, 10, 11, 12, 13].map((index, i) => [5, index, i * 16, 1]));
  const bytes = value._shipInstanceBuffer.TrinityALImpl_GetObject()._buffer;
  const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  assert.equal(floats[24 + 3], 7);
  assert.equal(floats[48 + 3], 19);
  const data = value.GetPerObjectData();
  assert.equal(batches[0].objectData.vs, data.vs);
  // Negative control: reproduce the original scene-wide collector failure.
  const get = value.GetBatches;
  value.GetBatches = () => { throw new Error("EveChildBehaviorSystem.GetBatches is not implemented in CarbonEngineJS."); };
  assert.throws(() => manager.Collect(renderables, 0, context), /GetBatches is not implemented/);
  value.GetBatches = get;
  assert.doesNotThrow(() => manager.Collect(renderables, 0, context));
});

test("pending and hidden groups do not prevent a ready group from batching", t =>
{
  const pending = group(), ready = group();
  pending.mesh = new Tr2Mesh(); ready.mesh = mesh();
  const value = system(t, [pending, ready]);
  const manager = new CjsBatchManager().Initialize();
  const collect = () => manager.Collect(value.GetRenderables([]), 0, context).GetAccumulator(OPAQUE).GetBatchCount();
  assert.equal(collect(), 1);
  pending.mesh = mesh();
  assert.equal(collect(), 2, "late geometry becomes renderable");
  pending.display = false;
  assert.equal(collect(), 1);
  ready.GetAgents()[0].xfade = 1;
  assert.equal(collect(), 0, "all-sprite group skips mesh batches");
  value.display = false;
  assert.deepEqual(value.GetRenderables([]), []);
});

test("allocation resize, empty groups, mapping failures and teardown obey ownership", t =>
{
  const value = system(t, [group()]);
  const a = value.behaviorGroups[0];
  a.SetVertexFunctionReferance(() => value.ChangeBufferInstanceCount());
  a.SetCount(4);
  assert.equal(value._shipInstanceBuffer.GetDesc().count, 4);
  assert.equal(value._shipInstanceBuffer.GetDesc().stride, 96);
  a.SetCount(0);
  assert.equal(value.instanceCount, 1);
  assert.doesNotThrow(() => value.GetRenderables([]));
  let unmapped = 0;
  const unmap = value._shipInstanceBuffer.UnmapForWriting.bind(value._shipInstanceBuffer);
  value._shipInstanceBuffer.UnmapForWriting = (...args) => { unmapped++; return unmap(...args); };
  t.mock.method(value._boosterInstanceBuffer, "MapForWriting", () => ({result: ALResult.E_FAIL, data: null}));
  value.UpdateBuffer(context);
  assert.equal(unmapped, 1, "second mapping failure still unmaps the first");
  value.Destroy();
  assert.equal(value._shipInstanceBuffer.IsValid(), false);
  assert.equal(value._boosterInstanceBuffer.IsValid(), false);
  assert.equal(TriDevice.GetResourcesRegistered().includes(value), false);
  assert.equal(a._changeBufferVertexCount, null);
});

test("booster packing uses Carbon's LOD, local offset and world flare transform", () =>
{
  const value = group();
  const booster = new BehaviorGroupBooster();
  value.boosters = booster;
  booster.boosterOffset.set([1, 2, 3]);
  value.scale = 2;
  const a = value.GetAgents()[0];
  a.position.set([3, 5, 7]); a.velocity.set([30, 40, 0]);
  quat.setAxisAngle(a.rotation, [0, 0, 1], Math.PI / 2);
  const parent = mat4.fromRotationTranslationScale(mat4.create(),
    quat.setAxisAngle(quat.create(), [1, 0, 0], 0.7), [10, 20, 30], [2, 3, 4]);
  let flare;
  booster.AddFlare = (...args) => { flare = [Array.from(args[0]), ...args.slice(1)]; };
  const data = new Float32Array(12);
  value.GetBoosterInfoForBuffer(data, parent);
  close(Array.from(data.slice(0, 4)), [-1, 7, 13, 2]);
  assert.equal(data[8], 0.5);
  const expected = mat4.multiply(mat4.create(), parent, mat4.fromRotationTranslation(mat4.create(), a.rotation, a.position));
  close(flare[0], Array.from(expected));
  assert.equal(value._lightInfo.size, 1);
  a.xfade = 0.3;
  value.GetBoosterInfoForBuffer(data, parent);
  close(Array.from(data.slice(0, 4)), [3, 5, 7, 2]);
  assert.ok(data.slice(8).every(n => n === 0));
  assert.equal(value._lightInfo.size, 0);
  a.isVisible = false;
  value.GetBoosterInfoForBuffer(data, parent);
  assert.ok(data.every(n => n === 0));
  assert.deepEqual(flare.slice(1), [0, 0, 0, 0, 0]);
});

test("booster batches and flare quads retain the existing AL and quad contracts", t =>
{
  const booster = new BehaviorGroupBooster();
  booster.boosterEffect = FixtureEffect({id: "booster"});
  booster.ambientFlareEffect = FixtureEffect({id: "ambient", GetHashValue: () => 7});
  booster.ambientFlareNoiseAmplitude = 0;
  booster.ambientFlareBrightness = 2;
  booster.Initialize(); booster.RebuildFlareBuffer(1);
  const value = system(t, [group()]);
  const batch = booster.GetBatch(value._boosterInstanceBuffer, 3, 48, 2);
  assert.equal(batch.instanceCount, 2);
  assert.equal(batch.startInstanceLocation, 3);
  assert.equal(batch.indexCountPerInstance, 36);
  assert.equal(batch.vertexStreams[1], value._boosterInstanceBuffer);
  booster.AddFlare(mat4.create(), 0, 1, 0, 5, 2);
  assert.equal(booster._ambientFlares[0].brightness[0], 2);
  const submitted = [];
  booster.AddQuadsToQuadRenderer(null, {AddQuads: (...args) => submitted.push(args)});
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0][1].byteLength, 108);
  booster.displayAmbientFlare = false;
  booster.AddQuadsToQuadRenderer(null, {AddQuads: () => assert.fail("hidden flare")});
  booster.displayBoosters = false;
  assert.equal(booster.GetBatch(value._boosterInstanceBuffer, 0, 48, 1).IsValid(), false);
});

test("booster flare noise reads Blue frame ticks as seconds once", t =>
{
  t.mock.method(blue.os, "GetCurrentFrameTime", () => 123456789);
  const booster = new BehaviorGroupBooster();
  booster.ambientFlareEffect = FixtureEffect({});
  booster.ambientFlareBrightness = 2;
  booster.ambientFlareNoiseAmplitude = 0.7;
  booster.ambientFlareNoiseSpeed = 1.3;
  booster.Initialize();
  booster.RebuildFlareBuffer(2);
  booster.AddFlare(mat4.create(), 0, 1, 1, 5, 1);
  const expected = (carbonPerlin1D((12.3456789 + 0.01) * 1.3, 2, 2, 1) + 1) * 0.7;
  assert.ok(Math.abs(booster._ambientFlares[1].brightness[0] - expected) < 1e-6);
});

test("demo retirement preserves shared behaviour systems until their final owner", t =>
{
  const value = system(t, [group()]);
  const old = new EveChildContainer(), retained = new EveChildContainer();
  old.objects.push(value); retained.objects.push(value);
  retireDemoShips([old], [retained]);
  assert.equal(value._shipInstanceBuffer.IsValid(), true);
  retireDemoShips([retained], []);
  assert.equal(value._shipInstanceBuffer.IsValid(), false);
  assert.equal(TriDevice.GetResourcesRegistered().includes(value), false);
});

test("failed demo hydration releases newly constructed behaviour buffers", t =>
{
  const existing = system(t, [group()]);
  const before = new Set(TriDevice.GetResourcesRegistered());
  t.mock.method(EveShip2.prototype, "StartControllers", function ()
  {
    throw new Error("synthetic behaviour hydration failure");
  });
  assert.throws(() => hydrateDemoShip({_type: "EveShip2", effectChildren: [{_type: "EveChildBehaviorSystem"}]}), /synthetic behaviour hydration failure/);
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()), before);
  assert.equal(existing._shipInstanceBuffer.IsValid(), true);
});
