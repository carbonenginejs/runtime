import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CollectPerObjectUploads,
  CommitPerObjectUploads,
  UploadPerObjectData
} from "../src/core/perObjectUploader.js";

// Transitional RawData-shaped fixture. The separate engine package cannot yet
// share one nominal contract identity safely; the combined runtime replaces
// this structural fixture with a CjsConstantPayload subclass.
function payload(values = [ 1, 2, 3, 4 ], dirty = true)
{
  return {
    data: new Float32Array(values),
    dirty,
    cleared: 0,
    GetData() { return this.data; },
    IsDirty() { return this.dirty; },
    ClearDirty() { this.dirty = false; this.cleared += 1; return this; }
  };
}

test("CollectPerObjectUploads skips what has not changed", () =>
{
  const changed = payload([ 1, 1, 1, 1 ], true);
  const stable = payload([ 2, 2, 2, 2 ], false);

  const collection = CollectPerObjectUploads([
    { identity: "uniform-buffer:0:3", payload: changed },
    { identity: "uniform-buffer:0:4", payload: stable }
  ]);

  assert.deepEqual(Object.keys(collection.uniformData), [ "uniform-buffer:0:3" ]);
  assert.equal(collection.uniformData["uniform-buffer:0:3"], changed.data, "the packed slice is passed by reference");
  assert.equal(collection.pending.length, 1);
  assert.equal(collection.isEmpty, false);
});

test("CollectPerObjectUploads treats a static frame as nothing to do", () =>
{
  // The steady state for an object that is not moving, and skipping the write
  // entirely is the whole point of the flag.
  const collection = CollectPerObjectUploads([
    { identity: "uniform-buffer:0:3", payload: payload([ 1, 1, 1, 1 ], false) }
  ]);

  assert.equal(collection.isEmpty, true);
  assert.deepEqual(collection.uniformData, {});
});

test("CollectPerObjectUploads uploads everything when forced", () =>
{
  // A freshly created binding set holds nothing, so a clean payload is still
  // absent from the device.
  const collection = CollectPerObjectUploads(
    [ { identity: "uniform-buffer:0:3", payload: payload([ 1, 1, 1, 1 ], false) } ],
    { force: true }
  );

  assert.equal(collection.isEmpty, false);
  assert.equal(collection.pending.length, 1);
});

test("CollectPerObjectUploads uploads a payload that cannot report dirtiness", () =>
{
  // "Cannot say" must not read as "unchanged"; the cost of a redundant upload
  // is a wasted write, and the cost of the opposite is a stale frame.
  const bare = { GetData: () => new Float32Array(4) };
  const collection = CollectPerObjectUploads([ { identity: "uniform-buffer:0:3", payload: bare } ]);

  assert.equal(collection.isEmpty, false);
  // And committing it is a no-op rather than an error, which is what lets a
  // transient arena record share this path.
  assert.equal(CommitPerObjectUploads(collection), 1);
});

test("CommitPerObjectUploads clears only what was collected", () =>
{
  const changed = payload([ 1, 1, 1, 1 ], true);
  const stable = payload([ 2, 2, 2, 2 ], false);

  const collection = CollectPerObjectUploads([
    { identity: "uniform-buffer:0:3", payload: changed },
    { identity: "uniform-buffer:0:4", payload: stable }
  ]);
  CommitPerObjectUploads(collection);

  assert.equal(changed.dirty, false);
  assert.equal(changed.cleared, 1);
  assert.equal(stable.cleared, 0, "a payload that was never uploaded is not marked as though it had been");
});

test("UploadPerObjectData leaves flags set when the write fails", () =>
{
  // Clearing before the bytes are on the device would lose this update: the
  // payload would claim to match a buffer that was never written. The failed
  // collection must remain dirty so the next attempt retries immediately.
  const first = payload([ 1, 1, 1, 1 ], true);

  assert.throws(
    () => UploadPerObjectData(
      [ { identity: "uniform-buffer:0:3", payload: first } ],
      () => { throw new Error("device lost"); }
    ),
    /device lost/
  );

  assert.equal(first.dirty, true, "the next frame retries rather than keeping an unwritten buffer");
  assert.equal(first.cleared, 0);
});

test("UploadPerObjectData writes once and commits after", () =>
{
  const order = [];
  const one = payload([ 1, 1, 1, 1 ], true);
  one.ClearDirty = () => { order.push("clear"); one.dirty = false; };

  const collection = UploadPerObjectData(
    [ { identity: "uniform-buffer:0:3", payload: one } ],
    (uniformData) =>
    {
      order.push("write");
      assert.deepEqual(Object.keys(uniformData), [ "uniform-buffer:0:3" ]);
    }
  );

  assert.deepEqual(order, [ "write", "clear" ]);
  assert.equal(collection.isEmpty, false);

  // Nothing dirty means no write at all, not an empty one.
  const skipped = UploadPerObjectData(
    [ { identity: "uniform-buffer:0:3", payload: payload([ 1, 1, 1, 1 ], false) } ],
    () => assert.fail("a write must not happen when nothing changed")
  );
  assert.equal(skipped.isEmpty, true);
});

test("the uploader refuses input it cannot use", () =>
{
  const one = payload();

  assert.throws(() => CollectPerObjectUploads(null), /pairs must be an array/);
  assert.throws(() => CollectPerObjectUploads([ { payload: one } ]), /requires a binding identity/);
  assert.throws(() => CollectPerObjectUploads([ { identity: "a", payload: {} } ]), /exposes no GetData/);
  assert.throws(
    () => CollectPerObjectUploads([ { identity: "a", payload: { GetData: () => [ 1, 2 ] } } ]),
    /did not return a typed array/
  );
  // Two payloads competing for one binding is a composition mistake; the last
  // one would silently win.
  assert.throws(
    () => CollectPerObjectUploads([ { identity: "a", payload: one }, { identity: "a", payload: payload() } ]),
    /uploaded twice/
  );
  assert.throws(() => CommitPerObjectUploads({}), /collection from CollectPerObjectUploads/);
  assert.throws(() => UploadPerObjectData([], null), /write function is required/);
});
