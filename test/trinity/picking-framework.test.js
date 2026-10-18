import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { EveSpaceScene, EvePendingPickingReadback, Tr2RenderContext, Tr2PrimitiveScene,
  Tr2PerObjectData, ITr2PickableScene } from "../../npm/dist/trinity/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";

function Pixel(objectId, areaId)
{
  const object = objectId + 1, area = areaId + 1;
  return new Uint8Array([(area >>> 8) & 255, object & 255, (object >>> 8) & 255, area & 255]);
}

test("one non-Carbon setting defaults to objectId and routes the scene wrapper", t =>
{
  assert.equal(Tr2RenderContext.eveSpacePickingFramework, "objectId");
  const setting = CjsSchema.getSettings().find(entry => entry.name === "eveSpacePickingFramework");
  assert.equal(setting.carbon, false);
  assert.deepEqual(setting.values, ["objectId", "pointer"]);
  const previous = Tr2RenderContext.eveSpacePickingFramework, scene = new EveSpaceScene();
  t.after(() => { Tr2RenderContext.eveSpacePickingFramework = previous; scene.Destruct(); });
  const args = [{}, false, 12, 34, {}, {}, {}, 3, {}];
  t.mock.method(scene, "PerformPicking__ObjectId", (...received) => { assert.deepEqual(received, args); return "old"; });
  t.mock.method(scene, "PerformPicking__Pointer", (...received) => { assert.deepEqual(received, args); return "new"; });
  assert.equal(scene.PerformPicking(...args), "old");
  Tr2RenderContext.eveSpacePickingFramework = "pointer";
  assert.equal(scene.PerformPicking(...args), "new");
  Tr2RenderContext.eveSpacePickingFramework = "invalid";
  assert.throws(() => scene.PerformPicking(...args), /Unknown eveSpacePickingFramework/u);
});

test("legacy BGRA decode preserves both byte pairs and native minus-one offsets", t =>
{
  const request = new EvePendingPickingReadback(0, 0, "objectId");
  t.after(() => request.Destroy());
  assert.equal(request.mainPickBuffer._format, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(request.debugPickBuffer._format, PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT);
  const expected = {}, seen = [];
  for (let i = 0; i <= 513; i++) request.collisionSet.push([{ GetID(area) { seen.push([i, area]); return expected; } }, null]);
  for (const [id, area] of [[0, 0], [255, 256], [513, 65534]])
  {
    const padded = new Uint8Array(12);
    padded.set(Pixel(id, area), 4);
    assert.deepEqual(request.DecodeResult__ObjectId(padded.subarray(4, 8), null, false, null), [expected, area, 0]);
    assert.deepEqual(seen.at(-1), [id, area]);
  }
  assert.deepEqual(request.DecodeResult__ObjectId(new Uint8Array(4), null, false, null), [null, 0, 0]);
  assert.deepEqual(request.DecodeResult__ObjectId(new Uint8Array([0, 1, 0, 0]), null, false, null), [expected, 0xffffffff, 0]);
  assert.deepEqual(request.DecodeResult__ObjectId(new Uint8Array([255, 255, 255, 255]), null, false, null), [null, 0, 0]);
});

test("legacy debug precedence and immediate versus retained instanced traceback follow the old revision", t =>
{
  const request = new EvePendingPickingReadback(0, 0, "objectId");
  t.after(() => request.Destroy());
  const hull = {}, debugObject = {}, owner = {};
  request.collisionSet.push([{ GetID() { return hull; } }, null]);
  request.debugLineObjects.push({ object: debugObject, area: 8 });
  const debug = new Float32Array([1, 1, 0, 0]);
  assert.deepEqual(request.DecodeResult__ObjectId(Pixel(0, 2), debug, false, null), [debugObject, 8, 0]);
  request.instancedTraceback.push([owner, 17]);
  assert.deepEqual(request.DecodeResult__ObjectId(Pixel(1, 23), null, false, null), [owner, 17 << 16, 0]);
  const manager = { GetPickedObject(id, area) { assert.deepEqual([id, area], [1, 23]); return [owner, 99]; } };
  assert.deepEqual(request.DecodeResult__ObjectId(Pixel(1, 23), null, true, manager), [owner, 99, 0]);
});

test("legacy per-object identity is uint32 and remains separate from pointer words", () =>
{
  const data = new Tr2PerObjectData();
  data.SetPickingPointer(0xfedcba9876543210n);
  data.SetUserData(513);
  assert.equal(data.GetUserData(), 513);
  assert.equal(data.GetPickingPointer(), 0xfedcba9876543210n);
});

test("primitive picking keeps its float buffer and explicit objectId draw path even in pointer mode", t =>
{
  const scene = new Tr2PrimitiveScene();
  const previous = Tr2RenderContext.eveSpacePickingFramework;
  Tr2RenderContext.eveSpacePickingFramework = "pointer";
  t.after(() => { scene.Destruct(); Tr2RenderContext.eveSpacePickingFramework = previous; });
  assert.equal(scene._pickBuffer._format, PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT);
  const events = [];
  const esm = { IsDepthTestInverted: () => false, SetInvertedDepthTest() {}, ApplyStandardStates() {} };
  const context = { GetEffectStateManager: () => esm, RenderBatchesForPicking__ObjectId(_batches, technique) { events.push(technique); } };
  t.mock.method(scene._pickBuffer, "BeginRendering", () => true);
  t.mock.method(scene._pickBuffer, "EndRendering", () => true);
  scene.RenderPicking(null, { Finalize() {} }, ITr2PickableScene.PickComponent.PICK_OBJECT, context);
  assert.deepEqual(events, ["Main"]);
});
