import assert from "node:assert/strict";
import test from "node:test";
import { EveSpaceScene, EveSpaceObject2, EvePickingContext, Tr2PerObjectData, TriProjection,
  TriView, TriViewport, Tr2RenderContext, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { ALResult, Tr2ConstantBufferAL, Tr2RenderContextALStub, Tr2TextureAL, Tr2ReadbackAL } from "../../npm/dist/trinityal/index.js";

function setup(t, framework = "pointer")
{
  const previousFramework = Tr2RenderContext.eveSpacePickingFramework;
  Tr2RenderContext.eveSpacePickingFramework = framework;
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previous = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  const scene = new EveSpaceScene(), object = new EveSpaceObject2(), snapshots = [];
  const projection = new TriProjection(), view = new TriView(), viewport = new TriViewport();
  viewport.width = 800;
  viewport.height = 600;
  projection.PerspectiveFov(Math.PI / 3, 4 / 3, 1, 10000);
  view.SetLookAtPosition([10, 20, 100], [0, 0, 0], [0, 1, 0]);
  context.SetProjection(projection.GetMatrixWithoutViewAdjustment(), projection.fov);
  context.SetViewTransform(view.GetTransform());
  const esm = context.GetEffectStateManager();
  esm.SetViewport(viewport);
  const originalView = [...context.GetViewTransform()];
  let pointer = 0n, objectId = 0;
  t.mock.method(scene, "GetPickingObjectsToRender", () => [object]);
  t.mock.method(scene, "PopulatePerFramePSData", () => {});
  t.mock.method(scene, "PopulatePerFrameVSData", () => {});
  t.mock.method(scene, "ApplyPerFrameData", () => {});
  t.mock.method(object, "GetPerObjectData", () => new Tr2PerObjectData());
  t.mock.method(object, "GetPickingBatches", (_batches, _flags, data) => { pointer = data.GetPickingPointer(); objectId = data.GetUserData(); });
  t.mock.method(context, "RenderBatchesForPicking__Pointer", () => {});
  t.mock.method(context, "RenderBatchesForPicking__ObjectId", () => {});
  t.mock.method(Tr2TextureAL.prototype, "CreateReadback", () =>
  {
    let resolve, ready = false, valid = true;
    const completion = new Promise(done => { resolve = done; });
    const bytes = new Uint8Array(16), words = new DataView(bytes.buffer);
    words.setUint32(0, Number(pointer & 0xffffffffn), true);
    words.setUint32(4, Number(pointer >> 32n), true);
    words.setUint32(8, 53, true);
    words.setUint32(12, 7, true);
    if (Tr2RenderContext.eveSpacePickingFramework === "objectId") bytes.set([0, (objectId + 1) & 255, (objectId + 1) >>> 8, 54]);
    const mapped = () => valid ? { result: ALResult.S_OK, data: bytes, pitch: 16 }
      : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
    const impl = { IsReady: () => ready, IsValid: () => valid, Map: () => ready ? mapped() : completion.then(mapped),
      Destroy() { valid = false; resolve(); } };
    snapshots.push({ complete() { ready = true; resolve(); }, isValid: () => valid });
    return new Tr2ReadbackAL({ implementation: impl });
  });
  t.after(() =>
  {
    scene.Destroy();
    context.SetRenderContextAL(previous);
    Tr2RenderContext.eveSpacePickingFramework = previousFramework;
  });
  return { context, scene, object, snapshots, originalView, args: [120, 250, projection, view, viewport] };
}

test("scene destruction releases attachments but preserves the listener's independent snapshot", async t =>
{
  const h = setup(t);
  const pending = h.scene.PickObject(...h.args);
  assert.equal(h.scene._pickBuffer.IsValid(), true);
  assert.equal(h.scene._pickDepthBuffer.IsValid(), true);
  h.scene.Destroy();
  h.scene.Destroy();
  assert.equal(h.scene._pickBuffer.IsValid(), false);
  assert.equal(h.scene._pickDepthBuffer.IsValid(), false);
  assert.equal(h.scene.componentRegistry, null);
  assert.equal(h.snapshots[0].isValid(), true, "the listener still owns the readback");
  await assert.rejects(h.scene.PickObject(...h.args), /destroyed EveSpaceScene/);
  h.snapshots[0].complete();
  assert.equal(await pending, h.object);
  assert.equal(h.snapshots[0].isValid(), false);
});

test("scene destruction releases owned frame buffers and unregisters borrowed lighting receivers once", t =>
{
  const h = setup(t), events = [], manager = {};
  const releaseDataTexture = t.mock.method(h.scene.dataTextureMgr, "Release");
  h.scene.objects.push(h.object);
  t.mock.method(h.object, "RegisterSecondaryLightSource", value => events.push(["register", value]));
  t.mock.method(h.object, "UnregisterSecondaryLightSource", value => events.push(["unregister", value]));
  t.mock.method(h.object, "ClearShLighting", () => events.push(["clear"]));
  h.scene.SetShLightingManager(manager);
  h.scene.SetShLightingManager(manager);
  assert.deepEqual(events, [["register", manager]]);
  const buffers = [h.scene._perFrameVSBuffer, h.scene._perFramePSBuffer, h.scene._shadowPerFrameVSBuffer];
  assert.ok(buffers.every(buffer => buffer instanceof Tr2ConstantBufferAL), "by-value members (EveSpaceScene.h:536-538)");
  let destroyed = 0;
  for (const buffer of buffers) t.mock.method(buffer, "Destroy", () => { destroyed++; });
  h.scene.Destroy(); h.scene.Destroy();
  assert.equal(destroyed, 3);
  assert.equal(releaseDataTexture.mock.callCount(), 1);
  assert.deepEqual(events, [["register", manager], ["unregister", manager], ["clear"]]);
  assert.equal(h.scene.shLightingManager, null);
  assert.equal(h.scene.objects[0], h.object, "shared authored objects are not recursively destroyed");
});

test("immediate EVE picks await their own request and restore the view before awaiting", async t =>
{
  const h = setup(t);
  let finished = false;
  const first = h.scene.PickObjectAndExtraData(...h.args).then(value => { finished = true; return value; });
  assert.deepEqual([...h.context.GetViewTransform()], h.originalView);
  await Promise.resolve();
  assert.equal(finished, false);
  h.snapshots[0].complete();
  assert.deepEqual(await first, [h.object, 53, 7]);
  assert.equal(h.snapshots[0].isValid(), false);
  finished = false;
  const second = h.scene.PickObject(...h.args).then(value => { finished = true; return value; });
  await Promise.resolve();
  assert.equal(finished, false, "the previous result cannot satisfy an immediate pick");
  h.snapshots[1].complete();
  assert.equal(await second, h.object);
});

test("EVE polling submits new work while returning the latest completed result", t =>
{
  const h = setup(t), listener = new EvePickingContext();
  t.after(() => listener.Destroy());
  assert.equal(h.scene.PickAsyncObjectAndExtraData(listener, ...h.args), null);
  h.snapshots[0].complete();
  assert.deepEqual(h.scene.PickAsyncObjectAndExtraData(listener, ...h.args), [h.object, 53, 7]);
  assert.equal(listener.readbacks.length, 1);
  assert.equal(h.snapshots[0].isValid(), false);
  assert.deepEqual(h.scene.PickAsyncObjectAndExtraData(listener, ...h.args), [h.object, 53, 7]);
  assert.equal(listener.readbacks.length, 2);
});

test("destroying an EVE listener during mapping drops the hit and releases roots", async t =>
{
  const h = setup(t), listener = new EvePickingContext();
  const pending = h.scene.PerformPicking(listener, true, ...h.args);
  const request = listener.readbacks[0];
  listener.Destroy();
  assert.deepEqual(await pending, [null, 0, 0]);
  assert.equal(request.blueObjects.length, 0);
  assert.equal(h.snapshots[0].isValid(), false);
});

test("failed picking draws restore context state and remove the failed request", t =>
{
  const h = setup(t), listener = new EvePickingContext();
  const esm = h.context.GetEffectStateManager(), inverted = esm.IsDepthTestInverted(), managed = esm.IsManagedRendering();
  t.mock.method(h.context, "RenderBatchesForPicking__Pointer", () => { throw new Error("synthetic draw failure"); });
  assert.throws(() => h.scene.PerformPicking(listener, false, ...h.args), /synthetic draw failure/);
  assert.deepEqual([...h.context.GetViewTransform()], h.originalView);
  assert.equal(esm.IsDepthTestInverted(), inverted);
  assert.equal(esm.IsManagedRendering(), managed);
  assert.equal(listener.readbacks.length, 0);
  listener.Destroy();
});

test("legacy EVE picks use retained collision indices and BGRA request-owned attachments", async t =>
{
  const h = setup(t, "objectId"), listener = new EvePickingContext();
  const pending = h.scene.PerformPicking(listener, true, ...h.args);
  const request = listener.readbacks[0];
  assert.equal(request.framework, "objectId");
  assert.equal(request.collisionSet[0][0], h.object);
  assert.equal(request.mainPickBuffer._pickTarget.IsValid(), true);
  assert.deepEqual([...h.context.GetViewTransform()], h.originalView);
  Tr2RenderContext.eveSpacePickingFramework = "pointer";
  h.snapshots[0].complete();
  assert.deepEqual(await pending, [h.object, 53, 0], "a setting change cannot reinterpret an in-flight request");
  assert.equal(request.mainPickBuffer._pickTarget.IsValid(), false);
  assert.equal(request.collisionSet.length, 0);
  listener.Destroy();
});

test("legacy polling retains each request until ready and cancellation releases buffers", t =>
{
  const h = setup(t, "objectId"), listener = new EvePickingContext();
  assert.equal(h.scene.PickAsyncObjectAndExtraData(listener, ...h.args), null);
  h.snapshots[0].complete();
  assert.deepEqual(h.scene.PickAsyncObjectAndExtraData(listener, ...h.args), [h.object, 53, 0]);
  const pending = listener.readbacks[0];
  listener.Destroy();
  assert.equal(pending.mainPickBuffer._pickTarget.IsValid(), false);
  assert.equal(pending.collisionSet.length, 0);
});

test("a mixed pointer and objectId queue decodes each request with its own framework", t =>
{
  const h = setup(t), listener = new EvePickingContext();
  t.after(() => listener.Destroy());
  assert.equal(h.scene.PickAsyncObjectAndExtraData(listener, ...h.args), null);
  Tr2RenderContext.eveSpacePickingFramework = "objectId";
  assert.equal(h.scene.PickAsyncObjectAndExtraData(listener, ...h.args), null);
  assert.deepEqual(listener.readbacks.map(request => request.framework), ["pointer", "objectId"]);
  h.snapshots[0].complete();
  assert.deepEqual(h.scene._PollPicking(listener, h.context), [h.object, 53, 7]);
  h.snapshots[1].complete();
  assert.deepEqual(h.scene._PollPicking(listener, h.context), [h.object, 53, 0]);
  assert.equal(listener.readbacks.length, 0);
});

test("failed legacy draws restore state and release the failed request", t =>
{
  const h = setup(t, "objectId"), listener = new EvePickingContext();
  const esm = h.context.GetEffectStateManager(), inverted = esm.IsDepthTestInverted(), managed = esm.IsManagedRendering();
  t.mock.method(h.context, "RenderBatchesForPicking__ObjectId", () => { throw new Error("legacy draw failure"); });
  assert.throws(() => h.scene.PerformPicking(listener, false, ...h.args), /legacy draw failure/u);
  assert.deepEqual([...h.context.GetViewTransform()], h.originalView);
  assert.equal(esm.IsDepthTestInverted(), inverted);
  assert.equal(esm.IsManagedRendering(), managed);
  assert.equal(listener.readbacks.length, 0);
});

test("picking fills LOCAL per-frame records and leaves the scene's own at their frame values (cpp:3829-3845)", async t =>
{
  const h = setup(t);
  const memberVS = h.scene.GetPerFrameVSData(), memberPS = h.scene.GetPerFramePSData();
  const pending = h.scene.PickObject(...h.args);
  const vsCalls = h.scene.PopulatePerFrameVSData.mock.calls, psCalls = h.scene.PopulatePerFramePSData.mock.calls;
  assert.equal(vsCalls.length, 1);
  assert.equal(psCalls.length, 1);
  assert.notEqual(vsCalls[0].arguments[0], memberVS, "a local VS record, not the scene's");
  assert.notEqual(psCalls[0].arguments[0], memberPS, "a local PS record, not the scene's");
  assert.deepEqual([ ...vsCalls[0].arguments[0].Copy("TargetResolution", new Float32Array(2)) ], [ 1, 1 ], "1x1 pick target");
  assert.equal(h.scene.ApplyPerFrameData.mock.calls.length, 0, "the member records are not applied for a pick");
  h.snapshots[0]?.complete();
  await pending;
});
