import assert from "node:assert/strict";
import test from "node:test";
import { EveSpaceScene, EveSpaceObject2, EvePickingContext, Tr2PerObjectData, TriProjection,
  TriView, TriViewport, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { ALResult, Tr2RenderContextALStub, Tr2TextureAL, Tr2ReadbackAL } from "../../npm/dist/trinityal/index.js";

function setup(t)
{
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
  let pointer = 0n;
  t.mock.method(scene, "GetPickingObjectsToRender", () => [object]);
  t.mock.method(scene, "PopulatePerFramePSData", () => {});
  t.mock.method(scene, "PopulatePerFrameVSData", () => {});
  t.mock.method(scene, "ApplyPerFrameData", () => {});
  t.mock.method(object, "GetPerObjectData", () => new Tr2PerObjectData());
  t.mock.method(object, "GetPickingBatches", (_batches, _flags, data) => { pointer = data.GetPickingPointer(); });
  t.mock.method(context, "RenderBatchesForPicking", () => {});
  t.mock.method(Tr2TextureAL.prototype, "CreateReadback", () =>
  {
    let resolve, ready = false, valid = true;
    const completion = new Promise(done => { resolve = done; });
    const bytes = new Uint8Array(16), words = new DataView(bytes.buffer);
    words.setUint32(0, Number(pointer & 0xffffffffn), true);
    words.setUint32(4, Number(pointer >> 32n), true);
    words.setUint32(8, 53, true);
    words.setUint32(12, 7, true);
    const mapped = () => valid ? { result: ALResult.S_OK, data: bytes, pitch: 16 }
      : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
    const impl = { IsReady: () => ready, IsValid: () => valid, Map: () => ready ? mapped() : completion.then(mapped),
      Destroy() { valid = false; resolve(); } };
    snapshots.push({ complete() { ready = true; resolve(); }, isValid: () => valid });
    return new Tr2ReadbackAL({ implementation: impl });
  });
  t.after(() =>
  {
    scene._pickBuffer.Destroy();
    scene._pickDepthBuffer.Destroy();
    context.SetRenderContextAL(previous);
  });
  return { context, scene, object, snapshots, originalView, args: [120, 250, projection, view, viewport] };
}

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
  t.mock.method(h.context, "RenderBatchesForPicking", () => { throw new Error("synthetic draw failure"); });
  assert.throws(() => h.scene.PerformPicking(listener, false, ...h.args), /synthetic draw failure/);
  assert.deepEqual([...h.context.GetViewTransform()], h.originalView);
  assert.equal(esm.IsDepthTestInverted(), inverted);
  assert.equal(esm.IsManagedRendering(), managed);
  assert.equal(listener.readbacks.length, 0);
  listener.Destroy();
});
