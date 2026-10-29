import assert from "node:assert/strict";

import { test, beforeEach, afterEach } from "node:test";

import { CjsMotherLode } from "../../../npm/dist/global/blue/CjsMotherLode.js";

import { CjsBlueResMan } from "../../../npm/dist/global/blue/CjsBlueResMan.js";

import { blue, CjsLoadingObject } from "../../../npm/dist/global/blue/index.js";

import { CjsResManQueue as RootCjsResManQueue } from "../../../npm/dist/resource/index.js";

import {
  CjsResManQueue,
  CjsResManWorkQueue
} from "../../../npm/dist/global/blue/CjsResManWorkQueue.js";

import { LoadData } from "../../support/loadData.js";

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

test("CjsBlueResMan exposes Blue-style queue controls", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
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

test("native loading reads on BACKGROUND and prepares once on MAIN", async () =>
{
  const calls = [], bytes = new Uint8Array([1, 2, 3]);
  const resMan = new CjsBlueResMan({autoPumpMainThreadQueue: false, maxConcurrentLoads: 1,
    source: {Read(path) { calls.push(["load", path]); return bytes; }} });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", (value, context) => { calls.push([context.stage, context.path]); return {bytes: value}; });
  const operation = LoadData(resMan, "res:/queue/example.bin");
  const resource = resMan.Lookup("res:/queue/example.bin");
  assert.equal(resource.IsLoading(), true);
  resMan.PumpBackgroundQueue();
  await WaitUntil(() => resMan.GetPendingPrepares() === 1);
  assert.equal(resMan.GetPendingLoads(), 0);
  assert.equal(resource.IsPrepared(), false);
  assert.equal(resMan.PumpMainThreadQueue({maxItems: 1, maxTime: 0}), true);
  const object = await operation;
  assert.equal(object.bytes, bytes);
  assert.equal(resMan.GetResourcePayload(resource), object);
  assert.equal(resource.IsPrepared(), true);
  assert.equal(resMan.GetPendingPrepares(), 0);
  assert.deepEqual(calls, [["load", "res:/queue/example.bin"], ["read", "res:/queue/example.bin"]]);
});

test("suffix-selected resources share source bytes while retaining their native load operations", async () =>
{
  let reads = 0;
  class TestFormat
  {
    static outputs = {raw: {output: "raw"}, json: {output: "json"}};
    static read(value, options) { return {emit: options.emit, value}; }
  }
  const resMan = new CjsBlueResMan({autoPumpMainThreadQueue: false, maxConcurrentLoads: 2,
    source: {Read() { reads++; return new Uint8Array([7]); }} });
  blue.resMan = resMan;
  resMan.RegisterExtension("binraw", CjsLoadingObject, {Format: TestFormat, defaults: {emit: "raw"}});
  resMan.RegisterExtension("binjson", CjsLoadingObject, {Format: TestFormat, defaults: {emit: "json"}});
  const raw = LoadData(resMan, "res:/queue/shared.bin", {ex: "raw"});
  const json = LoadData(resMan, "res:/queue/shared.bin", {ex: "json"});
  assert.equal(resMan.GetPendingLoads(), 2);
  await WaitUntil(() => resMan.GetPendingPrepares() === 2);
  assert.equal(reads, 1);
  resMan.PumpMainThreadQueue({maxItems: 2, maxTime: 0});
  assert.equal((await raw).emit, "raw");
  assert.equal((await json).emit, "json");
});

test("Wait captures dynamic resource descendants and excludes later queue tasks", async () => {
  let releaseRead;
  let releaseLaterTask;
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 2,
    source: { Read() { return new Uint8Array([ 5 ]); } }
  });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", bytes => new Promise(resolve => {
    releaseRead = () => resolve({ bytes });
  }));

  const operation = LoadData(resMan, "res:/queue/wait-lineage.bin");
  let waitSettled = false;
  const fence = resMan.Wait().then(value => {
    waitSettled = true;
    return value;
  });
  const laterTask = resMan.QueueTask(CjsResManQueue.BACKGROUND, () =>
    new Promise(resolve => { releaseLaterTask = resolve; }));

  await WaitUntil(() => typeof releaseRead === "function" && typeof releaseLaterTask === "function");
  assert.equal(waitSettled, false);
  releaseRead();

  assert.equal(await fence, resMan);
  const value = await operation;
  assert.deepEqual(value.bytes, new Uint8Array([ 5 ]));
  assert.equal(waitSettled, true);
  assert.equal(resMan.GetQueueStats(CjsResManQueue.BACKGROUND).active, 1);

  releaseLaterTask();
  await laterTask.promise;
});

test("concurrent Wait calls preserve distinct task snapshot boundaries", async () => {
  const releases = [];
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  const first = resMan.QueueTask(CjsResManQueue.MAIN, () =>
    new Promise(resolve => releases.push(resolve)));
  const firstFence = resMan.Wait({ pump: false });
  const second = resMan.QueueTask(CjsResManQueue.MAIN, () =>
    new Promise(resolve => releases.push(resolve)));
  let secondFenceSettled = false;
  const secondFence = resMan.Wait({ pump: false }).then(value => {
    secondFenceSettled = true;
    return value;
  });

  assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1 }), true);
  releases.shift()();
  await first.promise;
  assert.equal(await firstFence, resMan);
  assert.equal(secondFenceSettled, false);
  assert.equal(resMan.GetQueueStats(CjsResManQueue.MAIN).queued, 1);

  assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1 }), true);
  releases.shift()();
  await second.promise;
  assert.equal(await secondFence, resMan);
});

test("Wait treats captured queue failure and cancellation as settlement", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  const failing = resMan.QueueTask(CjsResManQueue.MAIN, () => {
    throw new Error("expected wait failure");
  });
  const cancelled = resMan.QueueTask(CjsResManQueue.MAIN, () => "not run");
  const failingAssertion = assert.rejects(failing.promise, /expected wait failure/u);
  const cancelledAssertion = assert.rejects(
    cancelled.promise,
    error => error.code === "CJS_RESMAN_QUEUE_CANCELLED"
  );
  const fence = resMan.Wait({ pump: false });

  assert.equal(resMan.CancelFromQueue(CjsResManQueue.MAIN, cancelled.id, "wait test"), true);
  assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1 }), true);
  await Promise.all([ failingAssertion, cancelledAssertion ]);
  assert.equal(await fence, resMan);
});

test("Wait resolves after a captured resource lineage fails", async () => {
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", () => {
    throw new Error("expected resource-stage failure");
  });

  const operation = LoadData(resMan, "res:/queue/wait-failure.bin");
  const operationFailure = assert.rejects(operation, /expected resource-stage failure/u);
  const fence = resMan.Wait();
  await operationFailure;
  assert.equal(await fence, resMan);
  assert.equal(resMan.Lookup("res:/queue/wait-failure.bin").IsPrepared(), true);
  assert.equal(resMan.Lookup("res:/queue/wait-failure.bin").IsGood(), false);
});

test("Clear cancellation settles an already captured resource lineage", async () => {
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  blue.resMan = resMan;
  resMan.PauseQueue(CjsResManQueue.BACKGROUND);
  resMan.RegisterObjectLoader("bin", value => value);
  const operation = LoadData(resMan, "res:/queue/wait-clear.bin");
  const resource = resMan.Lookup("res:/queue/wait-clear.bin");
  const operationFailure = assert.rejects(
    operation,
    error => error.code === "CJS_RESOURCE_LOAD_CANCELLED"
  );
  const fence = resMan.Wait({ pump: false });

  resMan.Clear();
  await operationFailure;
  assert.equal(await fence, resMan);
  assert.equal(resource.IsPrepared(), false);
  assert.equal(resMan.GetResourceStatus(resource).error.code, "CJS_RESOURCE_LOAD_CANCELLED");
  assert.equal(resMan.HasResourcePayload(resource), false);
});

test("Wait pump false relies on an external queue driver", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  let ran = false;
  const task = resMan.QueueTask(CjsResManQueue.MAIN, () => { ran = true; });
  let waitSettled = false;
  const fence = resMan.Wait({ pump: false }).then(value => {
    waitSettled = true;
    return value;
  });

  await FlushMicrotasks();
  assert.equal(ran, false);
  assert.equal(waitSettled, false);
  assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1 }), true);
  await task.promise;
  assert.equal(await fence, resMan);
});

test("Wait does not resume a paused queue", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  let ran = false;
  const task = resMan.QueueTask(CjsResManQueue.MAIN, () => { ran = true; });
  resMan.PauseQueue(CjsResManQueue.MAIN);
  let waitSettled = false;
  const fence = resMan.Wait().then(value => {
    waitSettled = true;
    return value;
  });

  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(ran, false);
  assert.equal(waitSettled, false);
  assert.equal(resMan.GetQueueStats(CjsResManQueue.MAIN).paused, true);

  resMan.ResumeQueue(CjsResManQueue.MAIN);
  assert.equal(await fence, resMan);
  await task.promise;
  assert.equal(ran, true);
});

test("Wait awaits every captured task under background concurrency", async () => {
  const releases = [];
  const resMan = new CjsBlueResMan({ maxConcurrentLoads: 2 });
  blue.resMan = resMan;
  const first = resMan.QueueTask(CjsResManQueue.BACKGROUND, () =>
    new Promise(resolve => releases.push(resolve)));
  const second = resMan.QueueTask(CjsResManQueue.BACKGROUND, () =>
    new Promise(resolve => releases.push(resolve)));
  let waitSettled = false;
  const fence = resMan.Wait().then(value => {
    waitSettled = true;
    return value;
  });

  await WaitUntil(() => releases.length === 2);
  releases.shift()();
  await first.promise;
  assert.equal(waitSettled, false);
  releases.shift()();
  await second.promise;
  assert.equal(await fence, resMan);
});

test("Clear during an active source read prevents late loading, preparation, and failure publication", async () => {
  let releaseSource;
  let loaderCalls = 0;
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    source: {
      Read()
      {
        return new Promise(resolve => { releaseSource = resolve; });
      }
    }
  });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", bytes => {
    loaderCalls += 1;
    return bytes;
  });

  const operation = LoadData(resMan, "res:/queue/stale-clear.bin");
  const resource = resMan.Lookup("res:/queue/stale-clear.bin");
  const operationFailure = assert.rejects(
    operation,
    error => error.code === "CJS_RESOURCE_LOAD_CANCELLED"
  );
  const fence = resMan.Wait({ pump: false });

  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => typeof releaseSource === "function");
  resMan.Clear();
  releaseSource(new Uint8Array([ 1 ]));

  await operationFailure;
  assert.equal(await fence, resMan);
  assert.equal(resMan.Lookup("res:/queue/stale-clear.bin"), null);
  assert.equal(resource.IsPrepared(), false);
  assert.equal(resMan.GetResourceStatus(resource).error.code, "CJS_RESOURCE_LOAD_CANCELLED");
  assert.equal(resMan.HasResourcePayload(resource), false);
  assert.equal(loaderCalls, 0);
  assert.equal(resMan.GetPendingPrepares(), 0);
});

test("Delete during an active native reader cancels its late completion", async () => {
  let releaseRead;
  let rebuilds = 0;
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 7 ]); } }
  });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", bytes => new Promise(resolve => {
    releaseRead = () => resolve({ bytes });
  }));

  const path = "res:/queue/stale-prepare.bin";
  const operation = LoadData(resMan, path);
  const resource = resMan.Lookup(path);
  const target = {RebuildCachedData() { rebuilds++; }, ReleaseCachedData() {}};
  resource.AddNotifyTarget(target);
  const operationFailure = assert.rejects(
    operation,
    error => error.code === "CJS_RESOURCE_LOAD_CANCELLED"
  );

  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => typeof releaseRead === "function");

  assert.equal(resMan.Delete(path), true);
  releaseRead();
  await operationFailure;

  assert.equal(resMan.Lookup(path), null);
  assert.equal(resource.IsPrepared(), false);
  assert.equal(resMan.GetResourceStatus(resource).error.code, "CJS_RESOURCE_LOAD_CANCELLED");
  assert.equal(resMan.HasResourcePayload(resource), false);
  assert.equal(rebuilds, 0);
  resource.RemoveNotifyTarget(target);
  assert.equal(resMan.GetPendingPrepares(), 0);
});

async function LoadOwner(resMan, path) {
  const resource = resMan.GetResource(path);
  for (let pass = 0; pass < 100 && !resMan.HasResourcePayload(resource); pass++) {
    resMan.PumpBackgroundQueue();
    resMan.PumpMainThreadQueue();
    await FlushMicrotasks();
  }
  assert.equal(resMan.HasResourcePayload(resource), true, `${path} loaded`);
  return resource;
}

async function FlushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function WaitUntil(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  assert.fail("Timed out waiting for the expected queue state.");
}

test("resources created in urgent mode load and prepare ahead of regular ones (BlueAsyncRes.cpp:108-111, 217-226)", async () => {
  const loads = [];
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 1,
    source: {
      Read(path) {
        loads.push(path);
        return new Uint8Array([ 1 ]);
      }
    }
  });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", value => ({ bytes: value }));

  const regular = [ LoadData(resMan, "res:/urgent/a.bin"), LoadData(resMan, "res:/urgent/b.bin") ];
  resMan.SetUrgentResourceLoads(true);
  const urgent = LoadData(resMan, "res:/urgent/c.bin");
  resMan.SetUrgentResourceLoads(false);

  assert.equal(resMan.Lookup("res:/urgent/a.bin")._isUrgent, false);
  assert.equal(resMan.Lookup("res:/urgent/c.bin")._isUrgent, true);

  // WaitUrgent fences the urgent work only: it settles once c has loaded and
  // prepared, with a and b still to go.
  const waited = resMan.WaitUrgent();
  let settled = false;
  waited.then(() => { settled = true; });
  while (!settled)
  {
    resMan.PumpBackgroundQueue({ maxItems: 1 });
    resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 });
    await FlushMicrotasks();
  }

  assert.equal(loads[0], "res:/urgent/c.bin", "the urgent load ran first");
  assert.equal(resMan.Lookup("res:/urgent/c.bin").IsPrepared(), true);
  assert.equal(resMan.Lookup("res:/urgent/b.bin").IsPrepared(), false);

  await resMan.Wait();
  await Promise.all([ ...regular, urgent ]);
  assert.deepEqual(loads.slice(1).sort(), [ "res:/urgent/a.bin", "res:/urgent/b.bin" ]);
});

test("a background queue drains on its own: a finished task starts the next without a tick", async () => {
  const resMan = new CjsBlueResMan({ maxConcurrentLoads: 1 });
  blue.resMan = resMan;
  const order = [];
  const first = resMan.QueueTask("background", async () => { await null; order.push("first"); return 1; });
  const second = resMan.QueueTask("background", async () => { order.push("second"); return 2; });
  await Promise.race([ Promise.all([ first.promise, second.promise ]), new Promise((_, reject) => setTimeout(() => reject(new Error("the second task never started")), 500)) ]);
  assert.deepEqual(order, [ "first", "second" ]);
});

test("a reload reads the urgent mode again, and WaitUrgent waits for it (BlueAsyncRes.cpp:363-367, 220)", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false, source: { Read() { return new Uint8Array([ 1 ]); } } });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", value => ({ bytes: value }));
  const first = LoadData(resMan, "res:/urgent/reloaded.bin");
  await resMan.Wait();
  await first;
  assert.equal(resMan.Lookup("res:/urgent/reloaded.bin")._isUrgent, false);

  resMan.SetUrgentResourceLoads(true);
  const reload = resMan.ReloadResource("res:/urgent/reloaded.bin");
  resMan.SetUrgentResourceLoads(false);
  const waited = resMan.WaitUrgent();
  let settled = false;
  waited.then(() => { settled = true; });
  await FlushMicrotasks();
  assert.equal(settled, false, "the urgent reload is still pending");
  while (!settled)
  {
    resMan.PumpBackgroundQueue();
    resMan.PumpMainThreadQueue();
    await FlushMicrotasks();
  }
  await reload;
  assert.equal(resMan.Lookup("res:/urgent/reloaded.bin")._isUrgent, true);
});

test("urgent mode keeps the per-tick prepare budget (BlueResMan.cpp:446-465)", () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  const ran = [];
  for (const name of [ "a", "b", "c" ]) resMan.QueueTask("main", () => { ran.push(name); });
  resMan.SetUrgentResourceLoads(true);
  resMan.PumpMainThreadQueue({ maxItems: 1 });
  assert.deepEqual(ran, [ "a" ]);
  resMan.SetUrgentResourceLoads(false);
});
let previousManager;
beforeEach(() => { previousManager = blue.resMan; });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previousManager; } });
