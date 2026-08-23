import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CjsBatchManager,
  Tr2RenderBatch,
  TriRenderBatchMap
} from "../../npm/dist/trinity/core/index.js";

import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";

const OPAQUE = TriBatchType.TRIBATCHTYPE_OPAQUE;
const TRANSPARENT = TriBatchType.TRIBATCHTYPE_TRANSPARENT;

function validBatch(perObjectData = null)
{
  const batch = new Tr2RenderBatch();
  batch.SetMaterial({ id: "fx" });
  batch.SetPerObjectData(perObjectData);
  return batch;
}

// A registered "geometry"-style fake producer that records its calls.
function makeProducer(type, { withRealize = true } = {})
{
  const calls = { realize: [], build: [] };
  const entry = {
    type,
    calls,
    Build(renderable, batchMap, perObjectData, reason)
    {
      calls.build.push({ renderable, perObjectData, reason });
      batchMap.GetAccumulator(OPAQUE).Commit(validBatch(perObjectData));
    }
  };
  if (withRealize)
  {
    entry.Realize = (renderable) =>
    {
      calls.realize.push(renderable);
    };
  }
  return entry;
}

test("Register validates entries and rejects duplicates", () =>
{
  const manager = new CjsBatchManager();
  assert.throws(() => manager.Register([{ type: "" }]), /non-empty string type/);
  assert.throws(() => manager.Register([{ type: "geometry" }]), /requires a Build function/);
  assert.throws(
    () => manager.Register([{ type: "geometry", Build() {}, Realize: 1 }]),
    /Realize must be a function/
  );

  manager.Register([{ type: "geometry", Build() {} }]);
  assert.throws(() => manager.Register([{ type: "geometry", Build() {} }]), /already registered/);
});

test("Initialize is fail-closed on required producer types", () =>
{
  const manager = new CjsBatchManager({ requiredTypes: [ "geometry", "quad" ] });
  manager.Register([{ type: "geometry", Build() {} }]);
  assert.throws(() => manager.Initialize(), /required producer type\(s\) not registered: quad/);

  manager.Register([{ type: "quad", Build() {} }]);
  manager.Initialize();
  assert.equal(manager.IsInitialized(), true);
  assert.throws(() => manager.Initialize(), /already called/);
  assert.throws(() => manager.Register([{ type: "late", Build() {} }]), /before Initialize/);
});

test("Collect requires Initialize", () =>
{
  assert.throws(() => new CjsBatchManager().Collect([]), /requires Initialize/);
});

test("registered producers get Realize before Build, with per-object data and reason", () =>
{
  const producer = makeProducer("geometry");
  const manager = new CjsBatchManager({ requiredTypes: [ "geometry" ] });
  manager.Register([ producer ]).Initialize();

  const perObjectData = { id: "pod" };
  const seenPool = [];
  const renderable = {
    batchProducerType: "geometry",
    GetPerObjectData(accumulator)
    {
      seenPool.push(accumulator);
      return perObjectData;
    }
  };

  const batchMap = manager.Collect([ renderable ], 7);

  assert.equal(producer.calls.realize.length, 1, "Realize invoked");
  assert.equal(producer.calls.build.length, 1, "Build invoked");
  assert.equal(producer.calls.build[0].renderable, renderable);
  assert.equal(producer.calls.build[0].perObjectData, perObjectData);
  assert.equal(producer.calls.build[0].reason, 7);
  assert.equal(seenPool[0], batchMap.GetAccumulator(OPAQUE), "pool accumulator is OPAQUE");
  assert.equal(batchMap.GetAccumulator(OPAQUE).GetBatchCount(), 1);
});

test("GetBatchProducerType() method form also dispatches", () =>
{
  const producer = makeProducer("geometry", { withRealize: false });
  const manager = new CjsBatchManager();
  manager.Register([ producer ]).Initialize();

  manager.Collect([ {
    GetBatchProducerType()
    {
      return "geometry";
    }
  } ]);
  assert.equal(producer.calls.build.length, 1);
});

test("undeclared renderables fall back to Carbon-style GetBatches per batch type", () =>
{
  const manager = new CjsBatchManager();
  manager.Initialize();

  const seen = [];
  const renderable = {
    GetPerObjectData()
    {
      return { id: "pod" };
    },
    GetBatches(accumulator, batchType, perObjectData, reason)
    {
      seen.push({ batchType, perObjectData, reason });
      if (batchType === OPAQUE) accumulator.Commit(validBatch(perObjectData));
    }
  };

  const batchMap = manager.Collect([ renderable ]);
  // TRANSPARENT is excluded from the main pass (Carbon emits it exclusively via
  // the sorted PrepareTransparentBatch flow) and this renderable does not report
  // HasTransparentBatches, so it is driven for every OTHER batch type.
  assert.equal(seen.length, manager.GetBatchTypes().length - 1, "driven once per non-transparent type");
  assert.ok(seen.every(call => call.batchType !== TRANSPARENT), "no transparent drive in the main pass");
  assert.ok(seen.every(call => call.perObjectData.id === "pod"), "same pod for every type");
  assert.equal(batchMap.GetAccumulator(OPAQUE).GetBatchCount(), 1);
});

test("scene-global collectors run after the per-renderable pass", () =>
{
  const order = [];
  const producer = {
    type: "geometry",
    Build()
    {
      order.push("build");
    }
  };
  const manager = new CjsBatchManager();
  manager.Register([ producer ]);
  manager.RegisterCollector("quads", {
    Collect(renderables, batchMap, reason)
    {
      order.push("collector");
      assert.ok(batchMap instanceof TriRenderBatchMap);
      assert.equal(reason, 0);
      batchMap.GetAccumulator(TRANSPARENT).Commit(validBatch());
    }
  });
  manager.Initialize();

  const batchMap = manager.Collect([ { batchProducerType: "geometry" } ]);
  assert.deepEqual(order, [ "build", "collector" ]);
  assert.equal(batchMap.GetAccumulator(TRANSPARENT).GetBatchCount(), 1);

  assert.throws(
    () => manager.RegisterCollector("late", { Collect() {} }),
    /before Initialize/
  );
});

test("Collect clears prior frame state and finalizes", () =>
{
  const manager = new CjsBatchManager();
  manager.Register([ makeProducer("geometry", { withRealize: false }) ]).Initialize();
  const renderable = { batchProducerType: "geometry" };

  const first = manager.Collect([ renderable ]);
  assert.equal(first.GetBatchCount(), 1);
  const [ batch ] = first.GetAccumulator(OPAQUE).GetBatches();
  assert.equal(batch.groupCount, 1, "finalize stamped the single-run group");

  const second = manager.Collect([ renderable ]);
  assert.equal(second.GetBatchCount(), 1, "previous frame was cleared, not accumulated");
});

test("HasRebuildWork reads the shared __state.rebuild token set", () =>
{
  assert.equal(CjsBatchManager.HasRebuildWork(null), false);
  assert.equal(CjsBatchManager.HasRebuildWork({}), false);
  assert.equal(CjsBatchManager.HasRebuildWork({ __state: { rebuild: new Set() } }), false);
  assert.equal(CjsBatchManager.HasRebuildWork({ __state: { rebuild: new Set([ "instanceBuffer" ]) } }), true);
});
