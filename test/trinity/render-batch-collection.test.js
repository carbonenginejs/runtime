import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Tr2RenderBatch,
  Tr2PerObjectData,
  ITr2Renderable,
  TriRenderBatchMap,
  TriRenderBatchAccumulator
} from "../../npm/dist/trinity/core/index.js";

import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";

function validBatch()
{
  const batch = new Tr2RenderBatch();
  batch.SetMaterial({
    GetShaderStateInterface()
    {
      return {};
    }
  });
  return batch;
}

// A synthetic renderable that emits `counts[batchType]` batches for each type and
// records what it was handed during collection.
function makeRenderable(counts)
{
  const seen = { podCalls: 0, pool: null, perObjectData: null, reasons: new Set() };
  return Object.assign(new ITr2Renderable(), {
    seen,
    GetPerObjectData(accumulator)
    {
      seen.podCalls++;
      seen.pool = accumulator;
      const perObjectData = new Tr2PerObjectData();
      perObjectData.SetUserData(42);
      seen.perObjectData = perObjectData;
      return perObjectData;
    },
    GetBatches(accumulator, batchType, perObjectData, reason)
    {
      seen.reasons.add(reason);
      const count = counts[batchType] ?? 0;
      for (let i = 0; i < count; i++)
      {
        const batch = validBatch();
        batch.SetPerObjectData(perObjectData);
        accumulator.Commit(batch);
      }
    }
  });
}

const BATCH_TYPES = [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_TRANSPARENT ];

test("collects batches per type into the matching accumulator", () =>
{
  const map = new TriRenderBatchMap(BATCH_TYPES);
  const renderable = makeRenderable({
    [TriBatchType.TRIBATCHTYPE_OPAQUE]: 2,
    [TriBatchType.TRIBATCHTYPE_TRANSPARENT]: 1
  });

  map.CollectFromRenderables([ renderable ]);

  assert.equal(map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE).GetBatchCount(), 2);
  assert.equal(map.GetAccumulator(TriBatchType.TRIBATCHTYPE_TRANSPARENT).GetBatchCount(), 1);
  assert.equal(map.GetBatchCount(), 3);
});

test("GetPerObjectData is called once per renderable, keyed off the OPAQUE accumulator", () =>
{
  const map = new TriRenderBatchMap(BATCH_TYPES);
  const renderable = makeRenderable({ [TriBatchType.TRIBATCHTYPE_OPAQUE]: 1 });

  map.CollectFromRenderables([ renderable ]);

  assert.equal(renderable.seen.podCalls, 1, "one GetPerObjectData per renderable");
  assert.equal(renderable.seen.pool, map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE));

  // The per-object data flows onto the committed batch.
  const [ batch ] = map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE).GetBatches();
  assert.equal(batch.objectData, renderable.seen.perObjectData);
  assert.equal(batch.objectData.GetUserData(), 42);
});

test("aggregates across multiple renderables", () =>
{
  const map = new TriRenderBatchMap(BATCH_TYPES);
  const renderables = [
    makeRenderable({ [TriBatchType.TRIBATCHTYPE_OPAQUE]: 2 }),
    makeRenderable({ [TriBatchType.TRIBATCHTYPE_OPAQUE]: 3, [TriBatchType.TRIBATCHTYPE_TRANSPARENT]: 1 })
  ];

  map.CollectFromRenderables(renderables);

  assert.equal(map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE).GetBatchCount(), 5);
  assert.equal(map.GetAccumulator(TriBatchType.TRIBATCHTYPE_TRANSPARENT).GetBatchCount(), 1);
});

test("Finalize finalizes every accumulator; Clear empties them", () =>
{
  const map = new TriRenderBatchMap(BATCH_TYPES);
  map.CollectFromRenderables([ makeRenderable({ [TriBatchType.TRIBATCHTYPE_OPAQUE]: 4 }) ]);

  map.Finalize();
  const opaque = map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE);
  // Four bin-compatible batches (same synthetic shader is distinct per batch, so
  // each is its own run) — finalize must at least not lose any batch.
  assert.equal(opaque.GetBatchCount(), 4);

  map.Clear();
  assert.equal(map.GetBatchCount(), 0);
});

test("a custom accumulator factory is honoured per batch type", () =>
{
  const created = [];
  const map = new TriRenderBatchMap(BATCH_TYPES, (batchType) =>
  {
    created.push(batchType);
    return new TriRenderBatchAccumulator();
  });
  assert.deepEqual(created, BATCH_TYPES);
  assert.ok(map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE) instanceof TriRenderBatchAccumulator);
});
