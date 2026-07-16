import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsResMan } from "../npm/dist/CjsResMan.js";
import { CjsResManQueue as RootCjsResManQueue } from "../npm/dist/index.js";
import {
  CjsResManQueue,
  CjsResManWorkQueue
} from "../npm/dist/CjsResManQueue.js";

test("CjsResManWorkQueue preserves ids, pause state, and queued cancellation", async () => {
  assert.equal(RootCjsResManQueue, CjsResManQueue);
  const queue = new CjsResManWorkQueue(CjsResManQueue.MAIN);
  const calls = [];
  const first = queue.Add(task => calls.push(task.id));
  const second = queue.Add(() => calls.push("cancelled"));
  const cancelled = assert.rejects(
    second.promise,
    error => error.code === "CJS_RESMAN_QUEUE_CANCELLED" && error.id === second.id
  );

  assert.equal(first.id, 1);
  assert.equal(second.id, 2);
  assert.equal(queue.GetNextId(), 3);
  queue.Pause();
  assert.equal(queue.Pump().processed, 0);
  assert.equal(queue.Cancel(second.id, "test cancellation"), true);
  await cancelled;

  queue.Resume();
  assert.equal(queue.Pump({ maxItems: 1 }).processed, 1);
  await first.promise;
  assert.deepEqual(calls, [ 1 ]);
  assert.equal(queue.GetPendingCount(), 0);
});

test("CjsResManWorkQueue limits concurrent background work", async () => {
  const queue = new CjsResManWorkQueue(CjsResManQueue.BACKGROUND, { concurrency: 2 });
  const releases = [];
  let active = 0;
  let maximum = 0;

  const add = () => queue.Add(() => new Promise(resolve => {
    active++;
    maximum = Math.max(maximum, active);
    releases.push(() => {
      active--;
      resolve();
    });
  }));

  const tasks = [ add(), add(), add() ];
  assert.equal(queue.Pump().processed, 2);
  assert.equal(queue.GetActiveCount(), 2);
  assert.equal(queue.GetQueuedCount(), 1);

  releases.shift()();
  await FlushMicrotasks();
  assert.equal(queue.Pump().processed, 1);
  assert.equal(maximum, 2);

  while (releases.length) releases.shift()();
  await Promise.all(tasks.map(task => task.promise));
  assert.equal(queue.GetPendingCount(), 0);
  assert.equal(maximum, 2);
});

test("CjsResMan exposes Blue-style queue controls", async () => {
  const resMan = new CjsResMan({ autoPumpMainThreadQueue: false });
  const calls = [];
  const nextId = resMan.GetNextIdForQueue(CjsResManQueue.MAIN);
  const id = resMan.AddToQueue(CjsResManQueue.PREPARE, () => calls.push("prepared"));

  assert.equal(id, nextId);
  assert.equal(resMan.GetPendingPrepares(), 1);
  resMan.PauseQueue(CjsResManQueue.MAIN);
  assert.equal(resMan.PumpMainThreadQueue(), false);
  resMan.ResumeQueue(CjsResManQueue.MAIN);
  assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1 }), true);
  await FlushMicrotasks();
  assert.deepEqual(calls, [ "prepared" ]);
  assert.equal(resMan.GetPendingPrepares(), 0);
});

test("CjsResMan queues load, named prepare stages, and publication separately", async () => {
  const calls = [];
  const bytes = new Uint8Array([ 1, 2, 3 ]);
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 1,
    source: {
      Read(path) {
        calls.push([ "load", path ]);
        return bytes;
      }
    },
    preparePipelines: {
      converted: {
        default: true,
        stages: [
          {
            name: "convert",
            prepare(value, context) {
              calls.push([ context.stage, context.path ]);
              return { ...value, converted: true };
            }
          },
          {
            name: "finalize",
            prepare(value, context) {
              calls.push([ context.stage, context.path ]);
              return { ...value, finalized: true };
            }
          }
        ]
      }
    }
  });
  resMan.RegisterObjectLoader("bin", (value, context) => {
    calls.push([ context.stage, context.path ]);
    return { bytes: value };
  });

  const operation = resMan.LoadObject("res:/queue/example.bin");
  const resource = resMan.Lookup("res:/queue/example.bin");
  assert.equal(resource.state, "requested");
  assert.equal(resMan.GetPendingLoads(), 1);

  resMan.PumpBackgroundQueue();
  await FlushMicrotasks();
  assert.equal(resMan.GetPendingLoads(), 0);
  assert.equal(resMan.GetPendingPrepares(), 1);

  for (const expectedStage of [ "read", "convert", "finalize", "publish" ]) {
    const pending = resMan.GetQueueStats(CjsResManQueue.MAIN);
    assert.equal(pending.queued, 1, `${expectedStage} should be the sole queued stage`);
    assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
    await FlushMicrotasks();
  }

  const object = await operation;
  assert.equal(object.bytes, bytes);
  assert.equal(object.converted, true);
  assert.equal(object.finalized, true);
  assert.equal(resource.object, object);
  assert.equal(resource.state, "loaded");
  assert.equal(resMan.GetPendingPrepares(), 0);
  assert.deepEqual(calls, [
    [ "load", "res:/queue/example.bin" ],
    [ "read", "res:/queue/example.bin" ],
    [ "convert", "res:/queue/example.bin" ],
    [ "finalize", "res:/queue/example.bin" ]
  ]);
});

test("CjsResMan rejects unknown requested prepare pipelines", () => {
  const resMan = new CjsResMan();
  assert.throws(
    () => resMan.ResolvePrepareStages({ preparePipeline: "missing" }),
    error => error.code === "CJS_RESOURCE_PREPARE_PIPELINE_MISSING"
  );
});

test("resource variants share one queued source-load slot", async () => {
  let reads = 0;
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 1,
    source: {
      Read() {
        reads++;
        return new Uint8Array([ 7 ]);
      }
    }
  });
  resMan.RegisterObjectLoader("bin", (value, context) => ({ emit: context.emit, value }));

  const raw = resMan.LoadObject("res:/queue/shared.bin", { emit: "raw" });
  const json = resMan.LoadObject("res:/queue/shared.bin", { emit: "json" });
  assert.equal(resMan.GetPendingLoads(), 1);

  resMan.PumpBackgroundQueue();
  await FlushMicrotasks();
  assert.equal(reads, 1);
  assert.equal(resMan.GetPendingPrepares(), 2);

  for (let i = 0; i < 4; i++) {
    assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
    await FlushMicrotasks();
  }

  assert.equal((await raw).emit, "raw");
  assert.equal((await json).emit, "json");
  assert.equal(reads, 1);
});

async function FlushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
