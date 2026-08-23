import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Tr2RenderBatch,
  TriRenderBatchAreaBlock,
  CanBeBinned,
  CompareBatches,
  Tr2GdprBatchFullPartition,
  TriRenderBatchAccumulator,
  DefaultKeyGenerator,
  EffectKeyGenerator
} from "../../npm/dist/trinity/core/index.js";

import { RenderingMode } from "../../npm/dist/global/consts/graphics/index.js";
import { D3dPrimitiveTopology } from "../../npm/dist/global/consts/d3d/index.js";

// A synthetic material: SetMaterial derives the shader from GetShaderStateInterface.
function makeMaterial(shader, gdrCompatible = false)
{
  return {
    GetShaderStateInterface()
    {
      return shader;
    },
    CompatibleWithGdr()
    {
      return gdrCompatible;
    }
  };
}

// Build a committed-ready batch with an explicit shader + geometry identity.
function makeBatch({ shader, decl = 0, stream0 = null, indexBuffer = null, indexStride = 0, priority = 0, gdr = false })
{
  const batch = new Tr2RenderBatch();
  batch.SetMaterial(makeMaterial(shader, gdr));
  batch.vertexDeclaration = decl;
  batch.vertexStreams[0] = stream0;
  batch.indexBuffer = indexBuffer;
  batch.indexStride = indexStride;
  batch.priority = priority;
  batch.SetDrawIndexedInstanced(6, 1, 0, 0, 0);
  return batch;
}

test("a fresh batch is invalid; SetMaterial with a shader makes it valid", () =>
{
  const batch = new Tr2RenderBatch();
  assert.equal(batch.IsValid(), false);
  assert.equal(batch.renderingMode, RenderingMode.RM_ANY);
  assert.equal(batch.topology, D3dPrimitiveTopology.TRIANGLELIST);
  assert.equal(batch.groupCount, 1);

  // GPU-free: a material without a realized shader still yields a valid batch,
  // keyed on the material/effect itself (the effect stands in for the shader).
  const effect = makeMaterial(null);
  batch.SetMaterial(effect);
  assert.equal(batch.IsValid(), true);
  assert.equal(batch.shader, effect, "effect stands in as the shader key");

  // A realized shader takes precedence when the material exposes one.
  const shader = {};
  batch.SetMaterial(makeMaterial(shader));
  assert.equal(batch.IsValid(), true);
  assert.equal(batch.shader, shader);

  // Only a batch with no material at all is invalid.
  assert.equal(new Tr2RenderBatch().IsValid(), false);
});

test("SetPickingData supports the direct and (meshIndex, areaIndex) forms", () =>
{
  const batch = new Tr2RenderBatch();
  batch.SetPickingData(0x1234);
  assert.equal(batch.pickingData, 0x1234);

  batch.SetPickingData(5, 0xab);
  assert.equal(batch.pickingData, (5 << 8) | 0xab);
});

test("SetDrawIndexedInstanced / SetDrawInstanced store the draw arguments", () =>
{
  const batch = new Tr2RenderBatch();
  batch.SetDrawIndexedInstanced(12, 3, 4, 7, 1);
  assert.equal(batch.indexCountPerInstance, 12);
  assert.equal(batch.instanceCount, 3);
  assert.equal(batch.startIndexLocation, 4);
  assert.equal(batch.baseVertexLocation, 7);
  assert.equal(batch.startInstanceLocation, 1);

  const draw = new Tr2RenderBatch();
  draw.SetDrawInstanced(30, 2, 5, 0);
  assert.equal(draw.indexCountPerInstance, 30, "vertex count reuses indexCountPerInstance");
  assert.equal(draw.startIndexLocation, 5, "start vertex reuses startIndexLocation");
  assert.equal(draw.baseVertexLocation, 0, "baseVertexLocation is left untouched");
});

test("CanBeBinned matches on shader/decl/indexStride/streams/mode, ignores priority", () =>
{
  const shader = {};
  const stream = {};
  const a = makeBatch({ shader, decl: 1, stream0: stream, indexStride: 2, priority: 0 });
  const b = makeBatch({ shader, decl: 1, stream0: stream, indexStride: 2, priority: 9 });
  assert.equal(CanBeBinned(a, b), true, "priority difference does not block binning");

  const c = makeBatch({ shader: {}, decl: 1, stream0: stream, indexStride: 2 });
  assert.equal(CanBeBinned(a, c), false, "different shader blocks binning");
});

test("accumulator drops invalid batches and routes non-GDPR to the plain vector", () =>
{
  const accumulator = new TriRenderBatchAccumulator(EffectKeyGenerator);

  accumulator.Commit(new Tr2RenderBatch()); // invalid -> dropped
  assert.equal(accumulator.GetBatchCount(), 0);

  // GDR-incompatible material -> plain vector even under the effect key generator.
  accumulator.Commit(makeBatch({ shader: {}, indexBuffer: {}, gdr: false }));
  assert.equal(accumulator.GetBatches().length, 1);
  assert.equal(accumulator.GetGdprBatches().length, 0);
});

test("Commit overwrites the batch rendering mode with the accumulator mode", () =>
{
  const accumulator = new TriRenderBatchAccumulator(EffectKeyGenerator);
  accumulator.SetRenderingMode(RenderingMode.RM_OPAQUE);

  const batch = makeBatch({ shader: {} });
  batch.SetRenderingMode(RenderingMode.RM_ALPHA);
  accumulator.Commit(batch);
  assert.equal(batch.renderingMode, RenderingMode.RM_OPAQUE);
});

test("GDPR-eligible batches route to the GDPR vector", () =>
{
  const accumulator = new TriRenderBatchAccumulator(EffectKeyGenerator);
  // GDR-compatible material + indexed + triangle topology + ALLOW_GDPR gen.
  accumulator.Commit(makeBatch({ shader: {}, indexBuffer: {}, gdr: true }));
  assert.equal(accumulator.GetGdprBatches().length, 1);
  assert.equal(accumulator.GetBatches().length, 0);
});

test("Finalize sorts by effect and stamps groupCount per bin-run", () =>
{
  const accumulator = new TriRenderBatchAccumulator(EffectKeyGenerator);
  const shaderA = { id: "A" };
  const shaderB = { id: "B" };
  const stream = {};

  // Interleave two shaders; three A-batches (bin-compatible) and two B-batches.
  accumulator.Commit(makeBatch({ shader: shaderA, decl: 1, stream0: stream, indexStride: 2 }));
  accumulator.Commit(makeBatch({ shader: shaderB, decl: 1, stream0: stream, indexStride: 2 }));
  accumulator.Commit(makeBatch({ shader: shaderA, decl: 1, stream0: stream, indexStride: 2 }));
  accumulator.Commit(makeBatch({ shader: shaderB, decl: 1, stream0: stream, indexStride: 2 }));
  accumulator.Commit(makeBatch({ shader: shaderA, decl: 1, stream0: stream, indexStride: 2 }));

  accumulator.Finalize();

  const batches = accumulator.GetBatches();
  assert.equal(batches.length, 5);
  // After sorting, the two shaders form two contiguous runs.
  const runStarts = batches.filter((b, i) => i === 0 || batches[i - 1].shader !== b.shader);
  assert.equal(runStarts.length, 2, "two effect runs");
  const total = runStarts.reduce((sum, b) => sum + b.groupCount, 0);
  assert.equal(total, 5, "group counts on run leaders cover every batch");
  assert.ok(runStarts.some((b) => b.groupCount === 3), "the three-batch run is counted");
  assert.ok(runStarts.some((b) => b.groupCount === 2), "the two-batch run is counted");
  assert.equal(accumulator.IsChainedByEffect(), true);
});

test("the default key generator preserves order and does not chain by effect", () =>
{
  const accumulator = new TriRenderBatchAccumulator(DefaultKeyGenerator);
  const first = makeBatch({ shader: { id: "z" }, indexBuffer: {}, gdr: true });
  const second = makeBatch({ shader: { id: "a" }, indexBuffer: {}, gdr: true });
  accumulator.Commit(first);
  accumulator.Commit(second);
  accumulator.Finalize();

  // No GDPR routing (ALLOW_GDPR false) and no sort: insertion order is kept.
  assert.equal(accumulator.GetGdprBatches().length, 0);
  assert.deepEqual(accumulator.GetBatches(), [ first, second ]);
  assert.equal(accumulator.IsChainedByEffect(), false);
});

test("TransferFrom folds a source accumulator in and clears it", () =>
{
  const dest = new TriRenderBatchAccumulator(EffectKeyGenerator);
  const source = new TriRenderBatchAccumulator(EffectKeyGenerator);
  source.Commit(makeBatch({ shader: {}, indexBuffer: {}, gdr: true }));
  source.Commit(makeBatch({ shader: {} }));
  assert.equal(source.GetBatchCount(), 2);

  dest.TransferFrom(source);
  assert.equal(dest.GetBatchCount(), 2);
  assert.equal(source.GetBatchCount(), 0, "source is cleared after transfer");
});

test("CompareBatches orders by priority first", () =>
{
  const low = makeBatch({ shader: {}, priority: 1 });
  const high = makeBatch({ shader: {}, priority: 5 });
  assert.ok(CompareBatches(low, high) < 0);
  assert.ok(CompareBatches(high, low) > 0);
});

test("TriRenderBatchAreaBlock.Optimize coalesces contiguous ranges", () =>
{
  const blocks = [
    new TriRenderBatchAreaBlock(0, 3),
    new TriRenderBatchAreaBlock(3, 2),
    new TriRenderBatchAreaBlock(10, 1)
  ];
  TriRenderBatchAreaBlock.Optimize(blocks);
  assert.equal(blocks.length, 2);
  assert.deepEqual([ blocks[0].startIndex, blocks[0].count ], [ 0, 5 ]);
  assert.deepEqual([ blocks[1].startIndex, blocks[1].count ], [ 10, 1 ]);
});
