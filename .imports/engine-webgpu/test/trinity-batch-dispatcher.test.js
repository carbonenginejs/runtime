import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuTrinityBatchDispatcher } from "../src/core/trinityBatchDispatcher.js";

function indexedBatch(overrides = {})
{
  return {
    material: { id: "material" },
    geometrySource: { id: "geometry" },
    objectData: { id: "object-data" },
    topology: 4,
    indexCountPerInstance: 36,
    instanceCount: 2,
    startIndexLocation: 3,
    baseVertexLocation: 0xffffffff,
    startInstanceLocation: 1,
    ...overrides
  };
}

function mockBoundary(options = {})
{
  const calls = [];
  const bindingSets = [];
  const webgpu = {
    async PreparePipeline(pipeline, prepareOptions)
    {
      calls.push([ "PreparePipeline", pipeline, prepareOptions ]);
      return { pipeline, diagnostics: [] };
    },
    async CreateRenderPipeline(prepared, recipe)
    {
      calls.push([ "CreateRenderPipeline", prepared, recipe ]);
      return { prepared, recipe };
    },
    CreateBindingSet(livePipeline, values)
    {
      calls.push([ "CreateBindingSet", livePipeline, values ]);
      const bindingSet = {
        destroyed: 0,
        Destroy()
        {
          this.destroyed += 1;
        }
      };
      bindingSets.push(bindingSet);
      return bindingSet;
    },
    CreateDraw(livePipeline, values)
    {
      calls.push([ "CreateDraw", livePipeline, values ]);
      if (options.rejectDraw || options.rejectDrawAt === bindingSets.length)
      {
        throw new Error("draw rejected");
      }
      return { livePipeline, values };
    },
    EncodeDraw(pass, draw)
    {
      calls.push([ "EncodeDraw", pass, draw ]);
    }
  };
  return { bindingSets, calls, webgpu };
}

function hooks(indexed = true, observedContexts = null, draw = undefined)
{
  return {
    async ResolveMaterial(material, batch, context)
    {
      assert.equal(material, batch.material);
      observedContexts?.push([ "material", context ]);
      return {
        pipeline: { key: "Main.pass0" },
        recipe: {
          vertex: { buffers: [ { arrayStride: 16, attributes: [] } ] },
          fragment: { targets: [ { format: "rgba8unorm" } ] },
          primitive: { cullMode: "none" }
        }
      };
    },
    async ResolveGeometry(source, batch, context)
    {
      assert.equal(source, batch.geometrySource);
      observedContexts?.push([ "geometry", context ]);
      return {
        geometry: { id: "live-geometry" },
        indexed,
        ...(draw === undefined ? {} : { draw })
      };
    },
    async ResolveBindings(batch, livePipeline, context)
    {
      assert.equal(batch.objectData.id, "object-data");
      assert.equal(livePipeline.recipe.primitive.topology, "triangle-list");
      observedContexts?.push([ "bindings", context ]);
      return {
        uniformData: new Map([ [ "cb0", new Float32Array(4) ] ]),
        resources: new Map([ [ "t0", { id: "texture" } ] ])
      };
    }
  };
}

function accumulator(batches, gdprBatches = [])
{
  return {
    GetGdprBatches: () => gdprBatches,
    GetBatches: () => batches,
    GetBatchCount: () => batches.length + gdprBatches.length
  };
}

test("Trinity batch dispatcher resolves an indexed batch without importing Trinity", async () =>
{
  const { bindingSets, calls, webgpu } = mockBoundary();
  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(webgpu, hooks());
  const batch = indexedBatch();
  const handle = await dispatcher.Prepare(batch);

  assert.equal(handle.batch, batch);
  assert.equal(calls[1][2].primitive.topology, "triangle-list");
  assert.deepEqual(calls[3][2].draw, {
    indexCount: 36,
    instanceCount: 2,
    firstIndex: 3,
    baseVertex: -1,
    firstInstance: 1
  });

  const pass = { id: "pass" };
  dispatcher.Encode(pass, handle);
  assert.deepEqual(calls.at(-1), [ "EncodeDraw", pass, handle.draw ]);
  dispatcher.Destroy(handle);
  dispatcher.Destroy(handle);
  assert.equal(bindingSets[0].destroyed, 1);
  assert.throws(() => dispatcher.Encode(pass, handle), /prepared batch is destroyed/u);
});

test("Trinity batch dispatcher maps non-indexed batches and owns rollback", async () =>
{
  const success = mockBoundary();
  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(success.webgpu, hooks(false));
  const prepared = await dispatcher.Prepare(indexedBatch({
    indexCountPerInstance: 13,
    instanceCount: 1,
    startIndexLocation: 4,
    baseVertexLocation: 0
  }));
  assert.deepEqual(success.calls[3][2].draw, {
    vertexCount: 13,
    instanceCount: 1,
    firstVertex: 4,
    firstInstance: 1
  });
  dispatcher.Destroy(prepared);
  assert.equal(success.bindingSets[0].destroyed, 1);

  const rejected = mockBoundary({ rejectDraw: true });
  const rejecting = new CjsWebgpuTrinityBatchDispatcher(rejected.webgpu, hooks());
  await assert.rejects(rejecting.Prepare(indexedBatch()), /draw rejected/u);
  assert.equal(rejected.bindingSets[0].destroyed, 1);
});

test("Trinity batch dispatcher accepts resolver draw arguments for deferred geometry areas", async () =>
{
  const boundary = mockBoundary();
  const draw = {
    indexCount: 18,
    instanceCount: 2,
    firstIndex: 24,
    baseVertex: -7,
    firstInstance: 3
  };
  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(
    boundary.webgpu,
    hooks(true, null, draw)
  );
  const prepared = await dispatcher.Prepare(indexedBatch({
    indexCountPerInstance: 0,
    instanceCount: 0,
    startIndexLocation: 0,
    baseVertexLocation: 0,
    startInstanceLocation: 0
  }));
  assert.deepEqual(boundary.calls[3][2].draw, draw);
  dispatcher.Destroy(prepared);

  const nonIndexed = mockBoundary();
  const nonIndexedDraw = {
    vertexCount: 9,
    instanceCount: 1,
    firstVertex: 12,
    firstInstance: 0
  };
  const nonIndexedDispatcher = new CjsWebgpuTrinityBatchDispatcher(
    nonIndexed.webgpu,
    hooks(false, null, nonIndexedDraw)
  );
  const nonIndexedPrepared = await nonIndexedDispatcher.Prepare(indexedBatch());
  assert.deepEqual(nonIndexed.calls[3][2].draw, nonIndexedDraw);
  nonIndexedDispatcher.Destroy(nonIndexedPrepared);
});

test("Trinity batch dispatcher fails closed on unsupported or conflicting contracts", async () =>
{
  const { webgpu } = mockBoundary();
  assert.throws(
    () => new CjsWebgpuTrinityBatchDispatcher(webgpu, {}),
    /composition hooks require ResolveMaterial/u
  );

  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(webgpu, hooks());
  await assert.rejects(
    dispatcher.Prepare(indexedBatch(), { batchType: -1 }),
    /batchType must be a non-negative integer/u
  );
  await assert.rejects(dispatcher.Prepare(indexedBatch({ topology: 99 })), /topology 99 is unsupported/u);
  await assert.rejects(
    dispatcher.Prepare(indexedBatch({ geometrySource: null })),
    /geometrySource is required/u
  );
  await assert.rejects(
    new CjsWebgpuTrinityBatchDispatcher(
      webgpu,
      hooks(true, null, {
        indexCount: 3,
        instanceCount: 1,
        firstIndex: 0,
        baseVertex: 0x80000000,
        firstInstance: 0
      })
    ).Prepare(indexedBatch()),
    /baseVertex must be a GPUSignedOffset32 value/u
  );

  const conflicting = hooks();
  conflicting.ResolveMaterial = async () => ({
    pipeline: { key: "Main.pass0" },
    recipe: {
      vertex: { buffers: [] },
      fragment: { targets: [] },
      primitive: { topology: "line-list" }
    }
  });
  await assert.rejects(
    new CjsWebgpuTrinityBatchDispatcher(webgpu, conflicting).Prepare(indexedBatch()),
    /batch topology triangle-list conflicts/u
  );
});

test("Trinity batch dispatcher preserves GDPR-first accumulator order and lifecycle", async () =>
{
  const boundary = mockBoundary();
  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(boundary.webgpu, hooks());
  const gdpr = indexedBatch({ material: { id: "gdpr" }, startIndexLocation: 0 });
  const first = indexedBatch({ material: { id: "first" }, startIndexLocation: 36 });
  const second = indexedBatch({ material: { id: "second" }, startIndexLocation: 72 });
  const batchAccumulator = accumulator([ first, second ], [ gdpr ]);
  const prepared = await dispatcher.PrepareAccumulator(batchAccumulator);
  assert.deepEqual(prepared.gdprBatches.map((entry) => entry.batch), [ gdpr ]);
  assert.deepEqual(prepared.batches.map((entry) => entry.batch), [ first, second ]);

  const pass = { id: "pass" };
  dispatcher.EncodeAccumulator(pass, prepared);
  assert.deepEqual(
    boundary.calls.filter(([ name ]) => name === "EncodeDraw").map((entry) => entry[2]),
    [ ...prepared.gdprBatches, ...prepared.batches ].map((entry) => entry.draw)
  );
  dispatcher.DestroyAccumulator(prepared);
  dispatcher.DestroyAccumulator(prepared);
  assert.deepEqual(boundary.bindingSets.map((entry) => entry.destroyed), [ 1, 1, 1 ]);
  assert.throws(
    () => dispatcher.EncodeAccumulator(pass, prepared),
    /prepared accumulator is destroyed/u
  );
});

test("Trinity batch dispatcher rolls back partial GDPR and ordinary vectors", async () =>
{
  const rejected = mockBoundary({ rejectDrawAt: 2 });
  const rejecting = new CjsWebgpuTrinityBatchDispatcher(rejected.webgpu, hooks());
  await assert.rejects(
    rejecting.PrepareAccumulator(accumulator(
      [ indexedBatch({ material: { id: "ordinary" } }) ],
      [ indexedBatch({ material: { id: "gdpr" } }) ]
    )),
    /draw rejected/u
  );
  assert.deepEqual(rejected.bindingSets.map((entry) => entry.destroyed), [ 1, 1 ]);
});

test("Trinity batch dispatcher snapshots batch maps and leaves pass choice external", async () =>
{
  const boundary = mockBoundary();
  const observedContexts = [];
  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(
    boundary.webgpu,
    hooks(true, observedContexts)
  );
  const opaque = accumulator([ indexedBatch({ material: { id: "opaque" } }) ]);
  const transparent = accumulator([ indexedBatch({ material: { id: "transparent" } }) ]);
  const batchMap = {
    GetBatchTypes: () => [ 0, 2 ],
    GetAccumulator: (batchType) => batchType === 0 ? opaque : transparent,
    GetBatchCount: () => 2
  };

  const prepared = await dispatcher.PrepareBatchMap(batchMap);
  assert.deepEqual(prepared.entries.map((entry) => entry.batchType), [ 0, 2 ]);
  assert.deepEqual(
    observedContexts.map(([ hook, context ]) => [ hook, context.batchType ]),
    [
      [ "material", 0 ],
      [ "geometry", 0 ],
      [ "bindings", 0 ],
      [ "material", 2 ],
      [ "geometry", 2 ],
      [ "bindings", 2 ]
    ]
  );
  assert.equal(Object.isFrozen(observedContexts[0][1]), true);
  assert.deepEqual(
    prepared.entries.map((entry) => entry.accumulator.context.batchType),
    [ 0, 2 ]
  );
  assert.deepEqual(
    prepared.entries.map((entry) => entry.accumulator.batches[0].context.batchType),
    [ 0, 2 ]
  );
  const pass = { id: "transparent-pass" };
  dispatcher.EncodeBatchType(pass, prepared, 2);
  assert.deepEqual(
    boundary.calls.filter(([ name ]) => name === "EncodeDraw").map((entry) => entry[2]),
    [ prepared.entries[1].accumulator.batches[0].draw ]
  );
  assert.throws(
    () => dispatcher.EncodeBatchType(pass, prepared, 9),
    /has no batch type 9/u
  );

  dispatcher.DestroyBatchMap(prepared);
  dispatcher.DestroyBatchMap(prepared);
  assert.deepEqual(boundary.bindingSets.map((entry) => entry.destroyed), [ 1, 1 ]);
  assert.throws(
    () => dispatcher.EncodeBatchType(pass, prepared, 0),
    /prepared batch map is destroyed/u
  );
});

test("Trinity batch dispatcher validates batch-map identity and rolls back all types", async () =>
{
  const boundary = mockBoundary();
  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(boundary.webgpu, hooks());
  await assert.rejects(
    dispatcher.PrepareBatchMap({
      GetBatchTypes: () => [ 0, 0 ],
      GetAccumulator: () => accumulator([])
    }),
    /duplicates batch type 0/u
  );

  await assert.rejects(
    dispatcher.PrepareBatchMap({
      GetBatchTypes: () => [ 0, 2 ],
      GetAccumulator: (batchType) => batchType === 0
        ? accumulator([ indexedBatch() ])
        : accumulator([ indexedBatch({ geometrySource: null }) ]),
      GetBatchCount: () => 2
    }),
    /geometrySource is required/u
  );
  assert.deepEqual(boundary.bindingSets.map((entry) => entry.destroyed), [ 1 ]);

  const mismatched = mockBoundary();
  const mismatchedDispatcher = new CjsWebgpuTrinityBatchDispatcher(mismatched.webgpu, hooks());
  await assert.rejects(
    mismatchedDispatcher.PrepareBatchMap({
      GetBatchTypes: () => [ 0 ],
      GetAccumulator: () => accumulator([ indexedBatch() ]),
      GetBatchCount: () => 2
    }),
    /batch map count does not match/u
  );
  assert.deepEqual(mismatched.bindingSets.map((entry) => entry.destroyed), [ 1 ]);
});
