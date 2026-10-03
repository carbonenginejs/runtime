import assert from "node:assert/strict";
import test from "node:test";
import { ALResult, Tr2ReadbackAL, Tr2ReadbackALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2ReadbackALWebgpu } from "../../npm/dist/trinityal/webgpu/index.js";
import { EvePendingPickingReadback, EvePickingContext, Tr2PerObjectData } from "../../npm/dist/trinity/index.js";

function deferred()
{
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function staging()
{
  const mapped = deferred(), submitted = [];
  let mapCount = 0, destroyCount = 0;
  const bytes = new ArrayBuffer(256);
  const buffer = { mapAsync() { mapCount++; return mapped.promise; }, getMappedRange() { return bytes; }, destroy() { destroyCount++; } };
  const context = { ReleaseLater(fn) { submitted.push(fn); } };
  const readback = new Tr2ReadbackALWebgpu(buffer, 256, context);
  return { readback, mapped, bytes, flush() { for (const fn of submitted.splice(0)) fn(); }, counts() { return [mapCount, destroyCount]; } };
}

test("stub readbacks own immutable snapshots and shared facade ownership", () =>
{
  const original = new Uint8Array([1, 2, 3, 4]);
  const impl = new Tr2ReadbackALStub(original, 4);
  const first = new Tr2ReadbackAL({ implementation: impl });
  const second = new Tr2ReadbackAL({ copy: first });
  original.fill(0);
  first.Destroy();
  assert.equal(first.IsValid(), false);
  assert.equal(second.IsReady(), true);
  assert.deepEqual([...second.Map().data], [1, 2, 3, 4]);
  second.Destroy();
  assert.equal(impl.IsRegistered(), false);
});

test("WebGPU waits for this submission and mapping, never a frame estimate", async () =>
{
  const pending = staging();
  const result = pending.readback.Map();
  assert.equal(pending.readback.IsReady(), false);
  assert.deepEqual(pending.counts(), [0, 0]);
  pending.flush();
  await Promise.resolve();
  assert.deepEqual(pending.counts(), [1, 0]);
  assert.equal(pending.readback.IsReady(), false);
  new Uint8Array(pending.bytes)[0] = 73;
  pending.mapped.resolve();
  const mapping = await result;
  assert.equal(mapping.data[0], 73);
  assert.equal(mapping.pitch, 256);
  assert.equal(pending.readback.IsReady(), true);
  pending.readback.Destroy();
  pending.flush();
  assert.deepEqual(pending.counts(), [1, 1]);
});

test("cancelled or rejected WebGPU mappings cannot publish results", async () =>
{
  const cancelled = staging();
  const result = cancelled.readback.Map();
  cancelled.readback.Destroy();
  cancelled.flush();
  assert.equal((await result).result, ALResult.E_INVALIDCALL);
  assert.deepEqual(cancelled.counts(), [0, 1]);
  const failed = staging();
  const failedResult = failed.readback.Map();
  failed.flush();
  failed.mapped.reject(new Error("device lost"));
  assert.equal((await failedResult).result, ALResult.E_INVALIDCALL);
  failed.flush();
  assert.equal(failed.readback.IsValid(), false);
});

test("request identity validates both words and releases retained roots", () =>
{
  const first = new EvePendingPickingReadback(10, 20), second = new EvePendingPickingReadback(30, 40);
  const object = {}, other = {};
  const identity = first.RetainObject(object);
  second.RetainObject(other);
  const data = new Tr2PerObjectData();
  data.SetPickingPointer(0xfedcba9876543210n);
  assert.equal(data.GetPickingPointer(), 0xfedcba9876543210n);
  assert.throws(() => data.SetPickingPointer(42), TypeError);
  const bytes = new Uint8Array(16), view = new DataView(bytes.buffer);
  view.setUint32(0, Number(identity & 0xffffffffn), true);
  view.setUint32(4, Number(identity >> 32n), true);
  view.setUint32(8, 53, true);
  view.setUint32(12, 0xffffffff, true);
  assert.deepEqual(first.DecodeResult(bytes), [object, 53, 0xffffffff]);
  assert.equal(second.DecodeResult(bytes)[0], null);
  const context = new EvePickingContext();
  context.readbacks.push(first, second);
  context.UpdateResult(1, 2, object, 53, 7);
  assert.equal(context.GetExtraData2(), 7);
  context.Destroy();
  assert.equal(first.blueObjects.length, 0);
  assert.equal(second.blueObjects.length, 0);
  assert.equal(context.GetObject(), null);
});
