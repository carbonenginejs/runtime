import assert from "node:assert/strict";
import test from "node:test";

import {
  CjsAudioBufferRes,
  CjsAudioRes
} from "../npm/dist/resource/audio/index.js";
import {
  CjsAudioBufferRes as RootCjsAudioBufferRes,
  CjsAudioRes as RootCjsAudioRes
} from "../npm/dist/index.js";

function CreateBacking(bytes, info = {})
{
  const activity = {
    locks: 0,
    payloadKeeps: 0
  };
  const resource = new CjsAudioBufferRes(info)
    .Initialize("res:/audio/source.bin")
    .SetPayload(new Uint8Array(bytes))
    .MarkPrepared()
    .SetObjectLoader(async () => resource)
    .SetLifecycleController({
      lock()
      {
        activity.locks += 1;
        return activity.locks;
      },
      unlock()
      {
        activity.locks = Math.max(0, activity.locks - 1);
        return activity.locks;
      },
      keepPayloadAlive()
      {
        activity.payloadKeeps += 1;
      }
    });

  return {
    activity,
    resource
  };
}

test("audio resources are canonical runtime-resource exports", () =>
{
  assert.equal(RootCjsAudioBufferRes, CjsAudioBufferRes);
  assert.equal(RootCjsAudioRes, CjsAudioRes);
});

test("CjsAudioRes represents a complete individual file", async () =>
{
  const { activity, resource: backing } = CreateBacking(
    [ 10, 20, 30, 40 ],
    { ingress: "loose" }
  );
  const resource = new CjsAudioRes({
    info: {
      id: "100",
      path: "aud:/100.wem"
    },
    backing
  }).Initialize("aud:/100.wem");

  const result = await resource.GetBytes();

  assert.deepEqual(Array.from(new Uint8Array(result.bytes)), [ 10, 20, 30, 40 ]);
  assert.equal(result.id, "100");
  assert.equal(result.path, "aud:/100.wem");
  assert.equal(result.offset, 0);
  assert.equal(result.byteLength, 4);
  assert.equal(result.totalByteLength, 4);
  assert.equal(result.complete, true);
  assert.equal(resource.GetBackingResource(), backing);
  assert.equal(resource.GetSourceOffset(), 0);
  assert.equal(resource.GetByteLength(), null);
  assert.equal(activity.locks, 0);
  assert.equal(activity.payloadKeeps, 1);
});

test("CjsAudioRes exposes one bank member without retaining the bank bytes", async () =>
{
  const { activity, resource: backing } = CreateBacking(
    [ 0, 1, 2, 3, 4, 5, 6, 7 ],
    { ingress: "bank" }
  );
  const childActivity = {
    locks: 0
  };
  const resource = new CjsAudioRes({
    info: {
      id: "200",
      sourcePath: "res:/audio/source.bnk"
    },
    backing,
    offset: 2,
    byteLength: 4
  })
    .Initialize("aud:/200.wem")
    .SetLifecycleController({
      lock()
      {
        childActivity.locks += 1;
        return childActivity.locks;
      },
      unlock()
      {
        childActivity.locks = Math.max(0, childActivity.locks - 1);
        return childActivity.locks;
      }
    });

  const result = await resource.GetBytes({
    offset: 1,
    byteLength: 2
  });

  assert.deepEqual(Array.from(new Uint8Array(result.bytes)), [ 3, 4 ]);
  assert.equal(result.offset, 1);
  assert.equal(result.byteLength, 2);
  assert.equal(result.totalByteLength, 4);
  assert.equal(result.complete, false);
  assert.equal(resource.GetSourceOffset(), 2);
  assert.equal(resource.GetByteLength(), 4);
  assert.equal(childActivity.locks, 0);
  assert.equal(activity.locks, 0);
});

test("CjsAudioRes validates backing windows and requested ranges", async () =>
{
  const { resource: backing } = CreateBacking([ 1, 2, 3 ]);
  const invalidWindow = new CjsAudioRes({
    info: { id: "300" },
    backing,
    offset: 2,
    byteLength: 2
  }).Initialize("aud:/300.wem");
  const validWindow = new CjsAudioRes({
    info: { id: "301" },
    backing,
    byteLength: 3
  }).Initialize("aud:/301.wem");

  await assert.rejects(
    invalidWindow.GetBytes(),
    error => error.code === "CJS_AUDIO_SOURCE_WINDOW_INVALID"
  );
  await assert.rejects(
    validWindow.GetBytes({ offset: 2, byteLength: 2 }),
    RangeError
  );
});
