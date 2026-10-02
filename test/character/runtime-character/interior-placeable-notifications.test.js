import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { blue, IInitialize, INotify, NotifyModified } from "../../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { finalizeReaderObject } from "../../../npm/dist/global/schema/hydration.js";
import { Tr2InteriorPlaceable, Tr2Model } from "../../../npm/dist/character/index.js";
import { Tr2Mesh, Tr2MeshArea, Tr2RenderContext_GetMainThreadRenderContext } from "../../../npm/dist/trinity/index.js";
import { CjsBlueResMan, CjsLoadingObject, TriGeometryRes, WodPlaceableRes } from "../../../npm/dist/resource/index.js";
import { Tr2RenderContextALStub } from "../../../npm/dist/trinityal/index.js";
import { SharedGeometryBuffer } from "../../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { TriBatchType } from "../../../npm/dist/global/consts/graphics/index.js";
import { mat4 } from "../../../npm/dist/global/math/mat4.js";
import { StubResMan } from "../../support/stubResMan.js";
import { localFileSystem } from "../../support/localFileSystem.js";

const tick = () => new Promise(resolve => setImmediate(resolve));

function setup(t, resolve)
{
  const old = blue.resMan;
  blue.resMan = new StubResMan(resolve);
  const owners = [];
  t.after(() => { for (const owner of owners) owner.Destroy(); blue.resMan = old; });
  return { manager: blue.resMan, owner() { const value = new Tr2InteriorPlaceable(); owners.push(value); return value; } };
}

function deferred()
{
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function geometry(x = 0)
{
  const resource = new TriGeometryRes();
  resource.SetPayload({ meshes: [{
    bounds: { min: [x, -1, -1], max: [x + 2, 1, 1] },
    decl: [{ usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 }],
    vertex: { position: [x, 0, 0, x + 2, 0, 0, x, 1, 0] },
    indices: [{ faces: [0, 1, 2] }], areas: [{ firstElement: 0, elementCount: 1 }]
  }] });
  resource.MarkPrepared();
  return resource;
}

function mesh(x = 0)
{
  const value = new Tr2Mesh();
  value.SetGeometryRes(geometry(x));
  return value;
}

test("reader initialization uses nominal lifecycle after path population and publishes the typed graph", async t =>
{
  const result = new WodPlaceableRes(), request = deferred();
  const { owner, manager } = setup(t, () => request.promise), value = owner();
  value.placeableResPath = "res:/interior/placeable.black";
  value.isUnique = true;
  assert.equal(CjsSchema.cast(value, IInitialize), value);
  assert.equal(CjsSchema.cast(value, INotify), value);
  assert.equal(CjsSchema.cast(result, WodPlaceableRes), result);
  const clone = t.mock.method(blue.classes, "CloneTo");
  finalizeReaderObject(value);
  assert.equal(manager.requests.length, 1);
  assert.equal(manager.requests[0].path, value.placeableResPath);
  assert.equal(value.placeableRes, null);
  request.resolve(result);
  await tick();
  assert.equal(value.placeableRes, result);
  assert.equal(clone.mock.callCount(), 0, "persisted uniqueness must not clone on completion");
});

test("path edit clears the old resource immediately and rejects late older publication", async t =>
{
  const first = deferred(), second = deferred(), a = new WodPlaceableRes(), b = new WodPlaceableRes();
  const { owner } = setup(t, path => path.endsWith("a.black") ? first.promise : second.promise), value = owner();
  value.placeableRes = new WodPlaceableRes();
  CjsSchema.setValues(value, { placeableResPath: "res:/a.black" });
  assert.equal(value.placeableRes, null);
  CjsSchema.setValues(value, { placeableResPath: "res:/b.black" });
  second.resolve(b); await tick(); assert.equal(value.placeableRes, b);
  first.resolve(a); await tick(); assert.equal(value.placeableRes, b);
});

test("uniqueness clones current authored edits and graph topology, with a fresh runtime bounds cache", async t =>
{
  const replacement = new WodPlaceableRes();
  const { owner, manager } = setup(t, () => replacement), value = owner();
  const source = new WodPlaceableRes(), model = new Tr2Model(), sharedMesh = mesh(7);
  source.visualModel = model; model.meshes = [sharedMesh, sharedMesh]; source.nearFadeDistance = 123;
  assert.equal(source.IsReady(), true);
  value.placeableResPath = "res:/placeable.black"; value.placeableRes = source;
  CjsSchema.setValues(value, { isUnique: true });
  const copy = value.placeableRes;
  assert.notEqual(copy, source); assert.equal(copy.nearFadeDistance, 123);
  assert.notEqual(copy.visualModel, model);
  assert.equal(copy.visualModel.meshes[0], copy.visualModel.meshes[1]);
  assert.notEqual(copy.visualModel.meshes[0], sharedMesh);
  assert.equal(copy._isReady, false); assert.equal(source._isReady, true);
  assert.equal(manager.requests.length, 0);
  CjsSchema.setValues(value, { isUnique: false });
  assert.equal(value.placeableRes, null); await tick(); assert.equal(value.placeableRes, replacement);
  assert.equal(manager.requests.length, 1);
});

test("coalesced path and unique edits reload once; unrelated edits and equal writes do nothing", async t =>
{
  const resource = new WodPlaceableRes(), { owner, manager } = setup(t, () => resource), value = owner();
  value.placeableRes = new WodPlaceableRes();
  const clone = t.mock.method(blue.classes, "CloneTo"), notify = t.mock.method(value, "OnModified");
  CjsSchema.setValues(value, { isUnique: true, placeableResPath: "res:/new.black" });
  assert.equal(manager.requests.length, 1); assert.equal(clone.mock.callCount(), 0);
  await tick(); assert.equal(value.placeableRes, resource);
  CjsSchema.setValues(value, { isUnique: true, placeableResPath: "res:/new.black" });
  NotifyModified(value, ["transform", "name"]);
  assert.equal(manager.requests.length, 1); assert.equal(notify.mock.callCount(), 2);
});

test("missing current resource takes the uniqueness reload branch", async t =>
{
  const resource = new WodPlaceableRes(), { owner, manager } = setup(t, () => resource), value = owner();
  value.placeableResPath = "res:/new.black";
  CjsSchema.setValues(value, { isUnique: true }); await tick();
  assert.equal(value.placeableRes, resource); assert.equal(manager.requests.length, 1);
});

test("empty paths, destruction, and direct path mutation reject pending results", async t =>
{
  const pending = [], { owner } = setup(t, () => { const next = deferred(); pending.push(next); return next.promise; });
  for (const mode of ["empty", "destroy", "direct"])
  {
    const value = owner(); value.placeableResPath = "res:/a.black";
    const request = value.LoadPlaceableRes();
    if (mode === "destroy") value.Destroy();
    else if (mode === "empty") CjsSchema.setValues(value, { placeableResPath: "" });
    else value.placeableResPath = "res:/b.black";
    pending.at(-1).resolve(new WodPlaceableRes());
    assert.equal(await request, null); assert.equal(value.placeableRes, null);
  }
  assert.equal(pending.length, 3);
});

test("wrong nominal type and failed current load leave null; stale rejection preserves the replacement", async t =>
{
  const { owner } = setup(t, () => new Tr2Model()), value = owner();
  value.placeableResPath = "res:/wrong.black";
  assert.equal(await value.LoadPlaceableRes(), null);
  blue.resMan.resolve = () => { throw new Error("missing placeable fixture"); };
  assert.equal(await value.LoadPlaceableRes(), null);
  const older = deferred(), current = new WodPlaceableRes();
  blue.resMan.resolve = () => older.promise;
  const request = value.LoadPlaceableRes();
  blue.resMan.resolve = () => current;
  value.SetPlaceableResPath("res:/current.black"); await tick();
  older.reject(new Error("superseded"));
  assert.equal(await request, null); assert.equal(value.placeableRes, current);
});

test("real object manager caches a builder while repeated placeable loads construct independent nested models", async t =>
{
  const { owner } = setup(t), value = owner();
  let reads = 0;
  blue.resMan = new CjsBlueResMan({ source: { Read() { ++reads; return new Uint8Array([1]); } } });
  class Format { static read() { return { visualModel: { _type: "Tr2Model", name: "authored", meshes: [] }, nearFadeDistance: 81 }; } }
  blue.resMan.RegisterExtension("placeable", CjsLoadingObject, { Format, Target: WodPlaceableRes });
  value.placeableResPath = "res:/fixture.placeable";
  const first = await value.LoadPlaceableRes();
  first.visualModel.name = "edited";
  const second = await value.LoadPlaceableRes();
  assert.equal(reads, 1); assert.notEqual(first, second);
  assert.notEqual(first.visualModel, second.visualModel);
  assert.equal(second.visualModel.name, "authored"); assert.equal(second.nearFadeDistance, 81);
});

test("strict model bounds require all meshes, while the public local-space query returns available bounds", t =>
{
  const model = new Tr2Model(), ready = mesh(4), pending = new Tr2Mesh(), resource = geometry(-10);
  const { manager } = setup(t, () => resource);
  resource.MarkPreparing(); pending.SetMeshResPath("res:/pending.gr2");
  model.AddMesh(ready); model.AddMesh(pending);
  const min = new Float32Array([9, 9, 9]), max = new Float32Array([8, 8, 8]);
  assert.equal(model.IsLoading(), true); assert.equal(model.GetBoundingBox(min, max), false);
  assert.deepEqual([...min], [9, 9, 9]); assert.deepEqual([...max], [8, 8, 8]);
  assert.deepEqual(model.GetBoundingBoxInLocalSpace().map(v => [...v]), [[-10, -1, -1], [6, 1, 1]]);
  resource.MarkPrepared(); assert.equal(model.IsLoading(), false);
  assert.equal(model.GetBoundingBox(min, max), true); assert.deepEqual([...min], [-10, -1, -1]);
  pending.SetGeometryRes(null);
  assert.equal(model.GetBoundingBox(min, max), false);
  assert.deepEqual(model.GetBoundingBoxInLocalSpace().map(v => [...v]), [[4, -1, -1], [6, 1, 1]]);
  assert.equal(model.GetNumOfMeshes(), 2); assert.equal(model.GetMesh(0), ready); assert.equal(model.GetMeshes(), model.meshes);
  assert.equal(manager.requests.length, 1);
  assert.throws(() => new Tr2Model().GetBoundingBoxInLocalSpace(), /No meshes/);
});

test("mesh prepare completion follows low-detail fallback, survives purge, and releases failed or superseded requests", t =>
{
  const low = geometry(), full = geometry(20), replacement = geometry(30);
  low.MarkPreparing(); full.MarkLoading(); replacement.MarkPreparing();
  setup(t, path => path.includes("lowdetail") ? low : path.includes("replacement") ? replacement : full);
  blue.paths.SetLocalFileSystem(localFileSystem(["res:/hull_lowdetail.gr2"]));
  t.after(() => blue.paths.SetLocalFileSystem(null));
  const value = new Tr2Mesh(); value.SetMeshResPath("res:/hull.gr2");
  assert.equal(value.IsLoading(), true); low.MarkPrepared(); assert.equal(value.IsLoading(), false);
  assert.equal(full.IsLoading(), true, "full-detail request must not hold the fallback fence");
  low.MarkPurged(); assert.equal(value.IsLoading(), false, "reached fence stays reached");
  value.SetMeshResPath("res:/replacement.gr2"); assert.equal(value.IsLoading(), true);
  full.MarkPrepared(); assert.equal(value.IsLoading(), true, "old completion cannot release the new request");
  replacement.SetError(new Error("fixture failure")); assert.equal(value.IsLoading(), false);
  value.SetMeshResPath(""); assert.equal(value.IsLoading(), false);
});

test("Wod bounds cache, defaults and transparency match native behavior", () =>
{
  const value = new WodPlaceableRes(), model = new Tr2Model(), first = mesh(2);
  value.visualModel = model; model.AddMesh(first);
  assert.equal(value.GetNearFadeDistance(), 2500); assert.equal(value.GetFarFadeDistance(), 10000);
  assert.equal(value.IsShadowCaster(), true); assert.equal(value.GetVisualModel(), model); assert.equal(value.GetCurveSets(), value.curveSets);
  assert.equal(value.IsReady(), true); first.SetGeometryRes(geometry(100));
  const min = new Float32Array(3), max = new Float32Array(3); value.GetBoundingBox(min, max);
  assert.deepEqual([...min], [2, -1, -1]); assert.deepEqual([...max], [4, 1, 1]);
  first.additiveAreas.push(new Tr2MeshArea()); assert.equal(value.HasTransparency(), false);
  first.transparentAreas.push(new Tr2MeshArea()); first.display = false;
  assert.equal(value.HasTransparency(), true);
  const owner = new Tr2InteriorPlaceable(); owner.placeableRes = value; assert.equal(owner.HasTransparentBatches(), true);
  assert.throws(() => new WodPlaceableRes().IsReady(), TypeError, "missing required visual model is not reported ready");
});

function renderSetup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), oldAL = context.GetRenderContextAL(), oldView = context.GetViewTransform().slice();
  const al = new Tr2RenderContextALStub(); al.CreateDevice(); al.BeginScene(); context.SetRenderContextAL(al); context.SetViewTransform(mat4.create());
  t.after(() => { SharedGeometryBuffer(context).ReleaseResources(); context.SetRenderContextAL(oldAL); context.SetViewTransform(oldView); al.Destroy(); });
  const draws = [], draw = al.DrawIndexedInstanced.bind(al);
  al.DrawIndexedInstanced = (...args) => { draws.push(args); return draw(...args); };
  const shader = { GetTechniqueIndex: () => 0, GetPassCount: () => 1, GetShaderTypeMask: () => 3, ApplyAllStateForPass() {} };
  const material = { GetShaderStateInterface: () => shader, ApplyMaterialDataForPass() {} };
  return { context, al, draws, material };
}

test("Wod model batches preserve authored order, transparent distance order, visibility gates and real AL draws", t =>
{
  const { context, material, draws } = renderSetup(t), model = new Tr2Model(), resource = new WodPlaceableRes();
  const near = mesh(1), far = mesh(8), hidden = mesh(30); model.meshes = [near, far, hidden]; resource.visualModel = model;
  for (const item of model.meshes)
  {
    const area = new Tr2MeshArea(); area.SetMaterial(material); item.opaqueAreas.push(area); item.transparentAreas.push(area);
  }
  hidden.display = false;
  const matrix = mat4.create(); mat4.rotateZ(matrix, matrix, Math.PI / 2); mat4.scale(matrix, matrix, [2, 3, 1]);
  let batches = []; const collector = { Commit(batch) { batches.push(batch); return true; } };
  resource.GetBatches(collector, TriBatchType.TRIBATCHTYPE_OPAQUE, matrix, null);
  assert.equal(batches.length, 2); assert.equal(batches[0].geometrySource.geometry, near.geometry); assert.equal(batches[1].geometrySource.geometry, far.geometry);
  context.RenderBatches({ GetBatches: () => batches }); assert.equal(draws.length, 2); assert.equal(draws[0][0], 3);
  batches = []; resource.GetBatches(collector, TriBatchType.TRIBATCHTYPE_TRANSPARENT, matrix, null);
  assert.equal(batches[0].geometrySource.geometry, far.geometry); assert.equal(batches[1].geometrySource.geometry, near.geometry);
  far.transparentAreas[0].display = false; near.geometry.SetError(new Error("fixture failure"));
  batches = []; resource.GetBatches(collector, TriBatchType.TRIBATCHTYPE_TRANSPARENT, matrix, null); assert.equal(batches.length, 0);
});

test("real Granny geometry passes through Wod model to a headless indexed draw", { skip: !process.env.CJS_PLACEABLE_GEOMETRY }, async t =>
{
  const { context, material, draws } = renderSetup(t), resource = new TriGeometryRes();
  resource.SetPayload(resource.ReadGrannyFile(await readFile(process.env.CJS_PLACEABLE_GEOMETRY))); resource.MarkPrepared();
  const item = new Tr2Mesh(), area = new Tr2MeshArea(), model = new Tr2Model(), wod = new WodPlaceableRes();
  item.SetGeometryRes(resource); area.SetMaterial(material); item.opaqueAreas.push(area); model.AddMesh(item); wod.visualModel = model;
  const batches = []; wod.GetBatches({ Commit(batch) { batches.push(batch); return true; } }, TriBatchType.TRIBATCHTYPE_OPAQUE, mat4.create(), null);
  assert.ok(batches.length > 0); context.RenderBatches({ GetBatches: () => batches }); assert.ok(draws.some(args => args[0] > 0));
});

test("model integer-zero overload selects LOD index zero even when screen-size-zero selects the coarse LOD", t =>
{
  const { material, context, draws } = renderSetup(t), resource = geometry();
  const payload = resource.GetPayload(), data = payload.meshes[0];
  const fine = { ...data, maxScreenSize: 1, indices: [{ faces: [0, 1, 2, 0, 2, 1] }], areas: [{ firstElement: 0, elementCount: 2 }] };
  const coarse = { ...data, maxScreenSize: 0.1 };
  data.lods = [fine, coarse];
  const item = new Tr2Mesh(), area = new Tr2MeshArea(), model = new Tr2Model();
  item.SetGeometryRes(resource); area.SetMaterial(material); item.opaqueAreas.push(area); model.AddMesh(item);
  assert.equal(resource.GetMeshLod(0, 0), coarse);
  const batches = []; model.GetBatches({ Commit(batch) { batches.push(batch); return true; } }, TriBatchType.TRIBATCHTYPE_OPAQUE, mat4.create(), null);
  assert.equal(batches.length, 1); assert.equal(batches[0].geometrySource.lod === fine, true, "native int overload must choose the fine LOD");
  context.RenderBatches({ GetBatches: () => batches }); assert.equal(draws[0][0], 6);
  assert.equal(coarse.allocationsValid, undefined, "unused coarse LOD should not be allocated");
});
