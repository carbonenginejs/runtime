import assert from "node:assert/strict";

import { test, beforeEach, afterEach } from "node:test";

import { CjsMotherLode } from "../../../npm/dist/global/blue/CjsMotherLode.js";

import { CjsBlueResMan } from "../../../npm/dist/global/blue/CjsBlueResMan.js";

import { blue, BlueResManQueue } from "../../../npm/dist/global/blue/index.js";

import { BlueResManQueue as RootBlueResManQueue } from "../../../npm/dist/resource/index.js";

import { LoadData } from "../../support/loadData.js";

import { RegisterDataLoader, TestDataRes } from "../../support/testDataRes.js";

const { BRMQ_MAIN, BRMQ_BACKGROUND } = BlueResManQueue;

test("AddToQueue returns ids; a cancelled entry never runs (BlueResMan.cpp:332-357)", async () => {
  assert.equal(RootBlueResManQueue, BlueResManQueue);
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  const calls = [];
  const nextId = resMan.GetNextIdForQueue(BRMQ_MAIN);
  const first = resMan.AddToQueue(BRMQ_MAIN, context => calls.push(context), "first");
  const second = resMan.AddToQueue(BRMQ_MAIN, context => calls.push(context), "second");

  assert.equal(first, nextId);
  assert.equal(second, first + 1);
  assert.equal(resMan.GetPendingPrepares(), 2);
  resMan.PauseQueue(BRMQ_MAIN);
  assert.equal(resMan.PumpMainThreadQueue(), false, "a paused queue starts nothing");
  resMan.CancelFromQueue(BRMQ_MAIN, second);
  assert.equal(resMan.GetPendingPrepares(), 1);

  resMan.ResumeQueue(BRMQ_MAIN);
  assert.equal(resMan.PumpMainThreadQueue(), true);
  assert.equal(resMan.PumpMainThreadQueue(), false);
  assert.deepEqual(calls, [ "first" ], "the callback gets its context, as Carbon's (IBlueCallbackMan.h:12)");
  assert.equal(resMan.GetPendingPrepares(), 0);
});

test("SetLoadingThreadCount caps loads in flight; a freed slot starts the next without a tick", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  resMan.SetLoadingThreadCount(2);
  const releases = [];
  let active = 0;
  let maximum = 0;
  const add = () => resMan.AddToQueue(BRMQ_BACKGROUND, () => new Promise(resolve => {
    active++;
    maximum = Math.max(maximum, active);
    releases.push(() => {
      active--;
      resolve();
    });
  }));

  add(); add(); add();
  assert.equal(resMan.PumpBackgroundQueue(), true);
  assert.equal(resMan.GetQueueStats(BRMQ_BACKGROUND).active, 2);
  assert.equal(resMan.GetQueueStats(BRMQ_BACKGROUND).queued, 1);

  releases.shift()();
  await WaitUntil(() => releases.length === 2);
  assert.equal(maximum, 2);

  while (releases.length) releases.shift()();
  await WaitUntil(() => resMan.GetPendingLoads() === 0);
  assert.equal(maximum, 2);
});

test("native loading reads on BACKGROUND and prepares once on MAIN", async () =>
{
  const calls = [], bytes = new Uint8Array([1, 2, 3]);
  const resMan = new CjsBlueResMan({autoPumpMainThreadQueue: false, maxConcurrentLoads: 1,
    source: {Read(path) { calls.push(["load", path]); return bytes; }} });
  blue.resMan = resMan;
  RegisterDataLoader(resMan, "bin", (value, context) => { calls.push([context.stage, context.path]); return {bytes: value}; });
  const operation = LoadData(resMan, "res:/queue/example.bin");
  const resource = resMan.Lookup("res:/queue/example.bin");
  assert.equal(resource.IsLoading(), true);
  resMan.PumpBackgroundQueue();
  await WaitUntil(() => resMan.GetPendingPrepares() === 1);
  assert.equal(resMan.GetPendingLoads(), 0);
  assert.equal(resource.IsPrepared(), false);
  assert.equal(resMan.PumpMainThreadQueue(), true);
  const object = await operation;
  assert.equal(object.bytes, bytes);
  assert.equal(resource.value, object);
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
  resMan.RegisterExtension("binraw", TestDataRes, {Format: TestFormat, defaults: {emit: "raw"}});
  resMan.RegisterExtension("binjson", TestDataRes, {Format: TestFormat, defaults: {emit: "json"}});
  const raw = LoadData(resMan, "res:/queue/shared.bin", {ex: "raw"});
  const json = LoadData(resMan, "res:/queue/shared.bin", {ex: "json"});
  assert.equal(resMan.GetPendingLoads(), 2);
  await WaitUntil(() => resMan.GetPendingPrepares() === 2);
  assert.equal(reads, 1);
  resMan.PumpMainThreadQueue();
  resMan.PumpMainThreadQueue();
  assert.equal((await raw).emit, "raw");
  assert.equal((await json).emit, "json");
});

test("Wait also waits for work queued after the call (BlueResMan.cpp:971-977)", async () => {
  let releaseRead;
  let releaseLaterTask;
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 2,
    source: { Read() { return new Uint8Array([ 5 ]); } }
  });
  blue.resMan = resMan;
  RegisterDataLoader(resMan, "bin", bytes => new Promise(resolve => {
    releaseRead = () => resolve({ bytes });
  }));

  const operation = LoadData(resMan, "res:/queue/wait-later.bin");
  let waitSettled = false;
  const fence = resMan.Wait().then(value => {
    waitSettled = true;
    return value;
  });
  resMan.AddToQueue(BRMQ_BACKGROUND, () => new Promise(resolve => { releaseLaterTask = resolve; }));

  await WaitUntil(() => typeof releaseRead === "function" && typeof releaseLaterTask === "function");
  releaseRead();
  const value = await operation;
  assert.deepEqual(value.bytes, new Uint8Array([ 5 ]));
  await FlushMicrotasks();
  assert.equal(waitSettled, false, "the entry queued after the call still counts");

  releaseLaterTask();
  assert.equal(await fence, resMan);
  assert.equal(resMan.GetPendingLoads() + resMan.GetPendingPrepares(), 0);
});

test("Wait counts a cancelled entry and a rejected one as done", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  const failing = resMan.AddToQueue(BRMQ_MAIN, () => Promise.reject(new Error("expected wait failure")));
  const cancelled = resMan.AddToQueue(BRMQ_MAIN, () => assert.fail("a cancelled entry must not run"));
  const fence = resMan.Wait({ pump: false });

  resMan.CancelFromQueue(BRMQ_MAIN, cancelled);
  assert.equal(resMan.PumpMainThreadQueue(), true);
  assert.equal(await fence, resMan);
  assert.ok(failing > 0);
});

test("Wait resolves after a captured resource lineage fails", async () => {
  const resMan = new CjsBlueResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  blue.resMan = resMan;
  RegisterDataLoader(resMan, "bin", () => {
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
  resMan.PauseQueue(BRMQ_BACKGROUND);
  RegisterDataLoader(resMan, "bin", value => value);
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
  assert.equal(resource.value, null);
});

test("Wait pump false relies on an external queue driver", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  let ran = false;
  resMan.AddToQueue(BRMQ_MAIN, () => { ran = true; });
  let waitSettled = false;
  const fence = resMan.Wait({ pump: false }).then(value => {
    waitSettled = true;
    return value;
  });

  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(ran, false);
  assert.equal(waitSettled, false);
  assert.equal(resMan.PumpMainThreadQueue(), true);
  assert.equal(ran, true);
  assert.equal(await fence, resMan);
});

test("Wait does not resume a paused queue", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  let ran = false;
  resMan.AddToQueue(BRMQ_MAIN, () => { ran = true; });
  resMan.PauseQueue(BRMQ_MAIN);
  let waitSettled = false;
  const fence = resMan.Wait().then(value => {
    waitSettled = true;
    return value;
  });

  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(ran, false);
  assert.equal(waitSettled, false);
  assert.equal(resMan.GetQueueStats(BRMQ_MAIN).paused, true);

  resMan.ResumeQueue(BRMQ_MAIN);
  assert.equal(await fence, resMan);
  assert.equal(ran, true);
});

test("Wait waits for every background entry under its concurrency", async () => {
  const releases = [];
  const resMan = new CjsBlueResMan({ maxConcurrentLoads: 2 });
  blue.resMan = resMan;
  resMan.AddToQueue(BRMQ_BACKGROUND, () => new Promise(resolve => releases.push(resolve)));
  resMan.AddToQueue(BRMQ_BACKGROUND, () => new Promise(resolve => releases.push(resolve)));
  let waitSettled = false;
  const fence = resMan.Wait().then(value => {
    waitSettled = true;
    return value;
  });

  await WaitUntil(() => releases.length === 2);
  releases.shift()();
  await FlushMicrotasks();
  assert.equal(waitSettled, false);
  releases.shift()();
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
  RegisterDataLoader(resMan, "bin", bytes => {
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
  assert.equal(resource.value, null);
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
  RegisterDataLoader(resMan, "bin", bytes => new Promise(resolve => {
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
  assert.equal(resource.value, null);
  assert.equal(rebuilds, 0);
  resource.RemoveNotifyTarget(target);
  assert.equal(resMan.GetPendingPrepares(), 0);
});

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
  RegisterDataLoader(resMan, "bin", value => ({ bytes: value }));

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
    resMan.PumpBackgroundQueue();
    resMan.PumpMainThreadQueue();
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
  resMan.AddToQueue(BRMQ_BACKGROUND, async () => { await null; order.push("first"); });
  resMan.AddToQueue(BRMQ_BACKGROUND, async () => { order.push("second"); });
  await WaitUntil(() => order.length === 2);
  assert.deepEqual(order, [ "first", "second" ]);
});

test("a reload reads the urgent mode again, and WaitUrgent waits for it (BlueAsyncRes.cpp:363-367, 220)", async () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false, source: { Read() { return new Uint8Array([ 1 ]); } } });
  blue.resMan = resMan;
  RegisterDataLoader(resMan, "bin", value => ({ bytes: value }));
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
  for (const name of [ "a", "b", "c" ]) resMan.AddToQueue(BRMQ_MAIN, () => { ran.push(name); });
  resMan.SetUrgentResourceLoads(true);
  let clock = 0;
  resMan.Update({ cache: false, purge: false, prepare: { maxTime: 0.001, now: () => clock++ } });
  assert.deepEqual(ran, [ "a" ]);
  resMan.SetUrgentResourceLoads(false);
});

test("Update fills Carbon's statistics members (BlueResMan.cpp:466-500)", () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false });
  blue.resMan = resMan;
  for (const name of [ "a", "b", "c" ]) resMan.AddToQueue(BRMQ_MAIN, () => name);
  let clock = 0;
  // Each clock read advances 1 ms; the slice is 1 ms, so one prepare per tick.
  const tick = { cache: false, purge: false, prepare: { maxTime: 0.001, now: () => clock++ } };

  resMan.Update(tick);
  assert.equal(resMan.preparesHandledLastTick, 1);
  assert.equal(resMan.preparesHandledTotal, 1);
  assert.equal(resMan.preparesHandledPerTickMax, 1);
  assert.equal(resMan.pendingPrepares, 2);
  assert.equal(resMan.pendingLoads, 0);
  assert.equal(resMan.mainThreadMaxTime, 0.001);
  for (const name of [ "prepareQueueTimeAverage", "prepareQueueTimeMax", "loadQueueTimeAverage", "loadQueueTimeMax" ])
    assert.equal(typeof resMan[name], "number", name);

  resMan.Update(tick);
  resMan.Update(tick);
  assert.equal(resMan.preparesHandledTotal, 3);
  assert.equal(resMan.pendingPrepares, 0);

  resMan.Update(tick);
  assert.equal(resMan.preparesHandledLastTick, 0, "an idle tick handles nothing");
  assert.equal(resMan.preparesHandledPerTickMax, 1);
});

test("Update keeps preparing past its slice while more than maxAllowedInPrepareQueue wait (BlueResMan.cpp:463)", () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false, maxAllowedInPrepareQueue: 1 });
  blue.resMan = resMan;
  assert.equal(new CjsBlueResMan().maxAllowedInPrepareQueue, 256, "Carbon's default (BlueResMan.cpp:84)");
  assert.throws(() => resMan.Register({ maxAllowedInPrepareQueue: -1 }), TypeError);
  const ran = [];
  for (const name of [ "a", "b", "c" ]) resMan.AddToQueue(BRMQ_MAIN, () => { ran.push(name); });
  let clock = 0;

  resMan.Update({ cache: false, purge: false, prepare: { maxTime: 0.001, now: () => clock++ } });
  // Three waiting: past the slice after "a", but two still exceed one; after "b", one does not.
  assert.deepEqual(ran, [ "a", "b" ]);
  assert.equal(resMan.preparesHandledLastTick, 2);
  assert.equal(resMan.pendingPrepares, 1);
});

test("SetLoadingThreadCount clamps to one and sets the background queue's thread count (BlueResMan.cpp:520-528)", () => {
  const resMan = new CjsBlueResMan({ autoPumpMainThreadQueue: false, maxConcurrentLoads: 3 });
  assert.equal(resMan._threadQueues[BRMQ_BACKGROUND]._threadCount, 3, "maxConcurrentLoads configures it");
  resMan.SetLoadingThreadCount(0);
  assert.equal(resMan._threadQueues[BRMQ_BACKGROUND]._threadCount, 1);
  assert.equal(resMan.maxConcurrentLoads, 1);
  resMan.SetLoadingThreadCount(5);
  assert.equal(resMan._threadQueues[BRMQ_BACKGROUND]._threadCount, 5);
  assert.equal(resMan.maxConcurrentLoads, 5);
});
let previousManager;
beforeEach(() => { previousManager = blue.resMan; });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previousManager; } });
