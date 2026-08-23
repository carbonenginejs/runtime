import assert from "node:assert/strict";
import { test } from "node:test";

import { CanShareBindings, CjsWebgpuEncodeState, DeriveBatchGroups } from "../src/core/batchGroups.js";

function draw(overrides = {})
{
  return {
    livePipeline: overrides.livePipeline ?? "pipeline-a",
    indexed: overrides.indexed ?? true,
    vertexBuffers: overrides.vertexBuffers ?? [ { slot: 0, buffer: "vb-a", offset: 0, size: undefined } ],
    indexBuffer: overrides.indexBuffer ?? { buffer: "ib-a", format: "uint16", offset: 0, size: undefined },
    bindGroups: overrides.bindGroups ?? [ "bg-shared" ]
  };
}

test("CanShareBindings compares what a run hoists and nothing else", () =>
{
  assert.equal(CanShareBindings(draw(), draw()), true);

  // Per-object data varies inside a group; that is the normal case, not a split.
  assert.equal(CanShareBindings(draw({ bindGroups: [ "bg-a" ] }), draw({ bindGroups: [ "bg-b" ] })), true);

  assert.equal(CanShareBindings(draw(), draw({ livePipeline: "pipeline-b" })), false);
  assert.equal(
    CanShareBindings(draw(), draw({ vertexBuffers: [ { slot: 0, buffer: "vb-b", offset: 0 } ] })),
    false
  );
  assert.equal(CanShareBindings(draw(), draw({ indexed: false })), false);
  assert.equal(CanShareBindings(draw(), null), false);
});

test("CanShareBindings splits on the index buffer, which Carbon's predicate omits", () =>
{
  // The correction from the engine-backends plan. Carbon compares shader,
  // vertex declaration, index stride, both streams and rendering mode - never
  // the index buffer - because all its geometry is suballocated from one
  // process-global buffer. We give each geometry its own, so binning these
  // together would draw the first batch's indices for the whole run.
  const first = draw();
  const second = draw({ indexBuffer: { buffer: "ib-b", format: "uint16", offset: 0, size: undefined } });

  assert.equal(first.livePipeline, second.livePipeline, "identical in every field Carbon compares");
  assert.equal(CanShareBindings(first, second), false);

  // Same buffer at a different offset is still a different binding.
  assert.equal(
    CanShareBindings(first, draw({ indexBuffer: { buffer: "ib-a", format: "uint16", offset: 64 } })),
    false
  );
  // An unindexed pair does not compare index buffers at all.
  assert.equal(
    CanShareBindings(draw({ indexed: false, indexBuffer: null }), draw({ indexed: false, indexBuffer: null })),
    true
  );
});

test("DeriveBatchGroups finds adjacent runs and never reorders", () =>
{
  const batches = [
    { draw: draw() },
    { draw: draw({ bindGroups: [ "bg-b" ] }) },
    { draw: draw({ livePipeline: "pipeline-b" }) },
    { draw: draw() }
  ];

  const groups = DeriveBatchGroups(batches, handle => handle.draw);

  // The fourth batch matches the first, but it is not adjacent to it, so it is
  // its own run. Merging non-adjacent batches would be a reorder.
  assert.deepEqual(groups.map(group => [ group.start, group.end, group.length ]), [
    [ 0, 2, 2 ],
    [ 2, 3, 1 ],
    [ 3, 4, 1 ]
  ]);

  assert.deepEqual(DeriveBatchGroups([], handle => handle.draw), []);
  assert.deepEqual(DeriveBatchGroups(undefined, handle => handle?.draw), []);
});

test("CjsWebgpuEncodeState elides only what is already bound", () =>
{
  const state = new CjsWebgpuEncodeState();
  const pass = {};
  const buffers = [ { slot: 0, buffer: "vb-a", offset: 0 } ];

  state.Require(pass);
  assert.equal(state.NeedsPipeline("pipeline-a"), true);
  assert.equal(state.NeedsPipeline("pipeline-a"), false);
  assert.equal(state.NeedsPipeline("pipeline-b"), true);

  assert.equal(state.NeedsVertexBuffers(buffers), true);
  assert.equal(state.NeedsVertexBuffers([ { slot: 0, buffer: "vb-a", offset: 0 } ]), false, "compared by value, not identity");
  assert.equal(state.NeedsVertexBuffers([ { slot: 0, buffer: "vb-b", offset: 0 } ]), true);

  assert.equal(state.NeedsIndexBuffer({ buffer: "ib-a", format: "uint16", offset: 0 }), true);
  assert.equal(state.NeedsIndexBuffer({ buffer: "ib-a", format: "uint16", offset: 0 }), false);
  assert.equal(state.NeedsIndexBuffer({ buffer: "ib-a", format: "uint32", offset: 0 }), true, "format is part of the binding");

  assert.equal(state.NeedsBindGroup(0, "bg-a"), true);
  assert.equal(state.NeedsBindGroup(0, "bg-a"), false);
  assert.equal(state.NeedsBindGroup(1, "bg-a"), true, "a different group index is a different binding");
});

test("CjsWebgpuEncodeState refuses to cross a render pass boundary", () =>
{
  // Pass state does not survive a pass boundary, so a state object leaking
  // into a second pass would skip a set that genuinely had to happen - and the
  // symptom would be geometry drawn with the previous pass's buffers.
  const state = new CjsWebgpuEncodeState();
  state.Require({});

  assert.throws(() => state.Require({}), error => error.code === "CJS_WEBGPU_ENCODE_STATE_INVALID");
});
