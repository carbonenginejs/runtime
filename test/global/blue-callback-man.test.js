import assert from "node:assert/strict";
import test from "node:test";

import { BeCallbackMan, BlueCallbackMan, BlueCallbackManTicker, BlueCallbackManWorker, IBlueCallbackMan } from "../../src/global/blue/index.js";

// blue/src/CallbackMan.cpp: urgent before regular, fences after every thread
// drained what came before, cancel removes a queued entry and discards one in
// progress. Workers are faked in-process: a scope the host installs on, and a
// worker object posting to it with structured clones.

const { BCBF_URGENT, BCBF_FENCE } = IBlueCallbackMan;

function createFakeWorkerFactory(callbacks, log = [])
{
  return (_module, options) =>
  {
    const listeners = new Set();
    const workerListeners = new Set();
    const worker = { terminated: false, name: options.name, addEventListener: (type, listener) => { if (type === "message") workerListeners.add(listener); } };
    const scope = {
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
      postMessage: message => setTimeout(() => { for (const listener of workerListeners) listener({ data: structuredClone(message) }); })
    };
    worker.postMessage = message =>
    {
      log.push({ worker: options.name, message });
      setTimeout(() => { for (const listener of listeners) listener({ data: structuredClone(message) }); });
    };
    worker.terminate = () => { worker.terminated = true; };
    BlueCallbackManWorker.install(scope, callbacks);
    return worker;
  };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test("Update runs urgent entries before regular ones and hands out ids through the out parameter", () =>
{
  const man = new BlueCallbackMan();
  const order = [];
  const id = { value: 0 };

  assert.equal(man.Add(context => order.push(context), "first"), true);
  man.Add(context => order.push(context), "second", 0, id);
  man.Add(context => order.push(context), "urgent", BCBF_URGENT);

  assert.equal(id.value, 2);
  assert.equal(man.GetNextId(), 4);
  assert.equal(man.GetSize(), 3);

  while (man.Update());

  assert.deepEqual(order, [ "urgent", "first", "second" ]);
  assert.equal(man.IsEmpty(), true);
  assert.equal(man.Update(), false);
});

test("Cancel removes a queued entry and the size follows", async () =>
{
  const man = new BlueCallbackMan();
  const ran = [];
  const id = { value: 0 };

  man.Add(() => ran.push("kept"));
  man.Add(() => ran.push("cancelled"), null, 0, id);
  await man.Cancel(id.value);

  assert.equal(man.GetSize(), 1);
  while (man.Update());
  assert.deepEqual(ran, [ "kept" ]);
});

test("an asynchronous entry holds its slot until it settles", async () =>
{
  const man = new BlueCallbackMan();
  let release;
  man.Add(() => new Promise(resolve => { release = resolve; }));
  man.Add(() => {});

  assert.equal(man.Update(), true);
  assert.equal(man.Update(), false, "the only slot is busy");
  assert.equal(man.GetSize(), 2);

  release();
  await tick();
  assert.equal(man.Update(), true);
  assert.equal(man.IsEmpty(), true);
});

test("SetThreadCount gives Update that many slots and caps at 32", () =>
{
  const man = new BlueCallbackMan();
  man.SetThreadCount(2);
  man.Add(() => new Promise(() => {}));
  man.Add(() => new Promise(() => {}));
  man.Add(() => {});

  assert.equal(man.Update(), true);
  assert.equal(man.Update(), true);
  assert.equal(man.Update(), false);

  man.SetThreadCount(40);
  assert.equal(man._threadCount, 32);
});

test("queue statistics accumulate and reset", () =>
{
  const man = new BlueCallbackMan();
  man.Add(() => {});
  man.Update();

  assert.ok(man.GetTimeInQueueMax() >= 0);
  assert.ok(man.GetTimeInQueueAverage() >= 0);
  man.ResetQueueStats();
  assert.equal(man.GetTimeInQueueMax(), 0);
  assert.equal(man.GetTimeInQueueAverage(), 0);
});

test("Pause and Resume need the own threads; SetPriority is clamped and stored", () =>
{
  const man = new BlueCallbackMan();
  assert.throws(() => man.Pause(), /not running its own threads/);
  assert.throws(() => man.Resume(), /not running its own threads/);
  assert.throws(() => man.Add("name"), TypeError);
  man.SetPriority(9);
  assert.equal(man._threadPriority, 2);
  man.SetPriority(-9);
  assert.equal(man._threadPriority, -2);
});

test("a callback that throws frees its slot and its place in the size count", () =>
{
  const man = new BlueCallbackMan();
  const id = { value: 0 };
  man.Add(() => { throw new Error("boom"); }, null, 0, id);
  man.Add(() => {});

  assert.throws(() => man.Update(), /boom/);
  assert.equal(man.GetSize(), 1);
  assert.equal(man._threads[0].currentId, 0);
  assert.equal(man.Update(), true);
  assert.equal(man.IsEmpty(), true);
});

test("a fenced entry moving to the fence queue never puts a second entry on the slot being filled", async () =>
{
  const log = [];
  const man = new BlueCallbackMan();
  man.SetThreadCount(2);
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(createFakeWorkerFactory({ work: context => new Promise(resolve => setTimeout(() => resolve(context), 5)) }, log));
  man.Run();

  const results = [ "a", "b" ].map(name => man.Add__Name("work", name));
  results.push(man.Add__Name("work", "fence", BCBF_FENCE));
  results.push(man.Add__Name("work", "c"), man.Add__Name("work", "d"));

  assert.deepEqual(await Promise.all(results), [ "a", "b", "fence", "c", "d" ]);
  const runs = log.filter(entry => entry.message.kind === "run").map(entry => entry.message.id);
  assert.equal(new Set(runs).size, runs.length, "every entry ran once");
  await tick();
  assert.equal(man.IsEmpty(), true);
  await man.Stop();
});

test("a failing worker rejects the entry it holds, and Stop rejects entries never started", async () =>
{
  let failingWorker = null;
  const factory = createFakeWorkerFactory({ hang: () => new Promise(() => {}) });
  const man = new BlueCallbackMan();
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory((module, options) =>
  {
    const worker = factory(module, options);
    const listeners = new Map();
    const add = worker.addEventListener;
    worker.addEventListener = (type, listener) => { listeners.set(type, listener); if (type === "message") add(type, listener); };
    worker.fail = () => listeners.get("error")({ type: "error", message: "script failed" });
    failingWorker = worker;
    return worker;
  });
  man.Run();
  assert.throws(() => man.Run(), /already running/);

  const held = assert.rejects(man.Add__Name("hang"), { code: "CJS_CALLBACKMAN_WORKER_FAILED" });
  await tick();
  failingWorker.fail();
  await held;

  man.Pause();
  const queued = assert.rejects(man.Add__Name("hang"), { name: "AbortError" });
  await man.Stop();
  await queued;
});

test("own threads run named entries on workers and resolve with their results", async () =>
{
  const man = new BlueCallbackMan();
  man.SetName("Test");
  man.SetThreadCount(2);
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(createFakeWorkerFactory({
    double: context => context.value * 2,
    bytes: () => new Uint8Array([ 1, 2, 3 ])
  }));
  man.Run();

  assert.deepEqual(man._threads.map(td => td.name), [ "Test_0", "Test_1" ]);
  assert.throws(() => man.Add(() => {}), /named entries/);
  assert.throws(() => man.Update(), /runs its own threads/);

  const [ doubled, bytes ] = await Promise.all([ man.Add__Name("double", { value: 21 }), man.Add__Name("bytes") ]);
  assert.equal(doubled, 42);
  assert.deepEqual([ ...bytes ], [ 1, 2, 3 ]);

  await tick();
  assert.equal(man.IsEmpty(), true);
  await man.Stop();
  assert.equal(man._threads.length, 0);
});

test("a cancelled queued named entry rejects with AbortError and never reaches a worker", async () =>
{
  const log = [];
  const man = new BlueCallbackMan();
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(createFakeWorkerFactory({ slow: () => new Promise(resolve => setTimeout(() => resolve("slow"), 20)), quick: () => "quick" }, log));
  man.Run();

  const slow = man.Add__Name("slow");
  const id = { value: 0 };
  const quick = assert.rejects(man.Add__Name("quick", null, 0, id), { name: "AbortError" });
  await man.Cancel(id.value);

  await quick;
  assert.equal(await slow, "slow");
  assert.deepEqual(log.filter(entry => entry.message.kind === "run").map(entry => entry.message.name), [ "slow" ]);
  await man.Stop();
});

test("cancelling an entry in progress discards its outcome and tells the worker", async () =>
{
  const log = [];
  let aborted = false;
  const man = new BlueCallbackMan();
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(createFakeWorkerFactory({
    long: (_context, { signal }) => new Promise(resolve =>
    {
      signal.addEventListener("abort", () => { aborted = true; });
      setTimeout(() => resolve("late"), 20);
    })
  }, log));
  man.Run();

  const id = { value: 0 };
  const result = assert.rejects(man.Add__Name("long", null, 0, id), { name: "AbortError" });
  await tick();
  await man.Cancel(id.value);

  await result;
  assert.equal(aborted, true);
  assert.ok(log.some(entry => entry.message.kind === "cancel"));
  assert.equal(man.IsEmpty(), true);
  await man.Stop();
});

test("Pause holds new entries until Resume", async () =>
{
  const man = new BlueCallbackMan();
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(createFakeWorkerFactory({ echo: context => context }));
  man.Run();

  man.Pause();
  assert.equal(man.IsPaused(), true);
  const result = man.Add__Name("echo", "held");
  await tick();
  assert.equal(man.GetSize(), 1);
  assert.equal(man._threads[0].inProgress, null);

  man.Resume();
  assert.equal(await result, "held");
  await man.Stop();
});

test("a fenced entry waits until every thread has drained what was queued before it", async () =>
{
  const order = [];
  const man = new BlueCallbackMan();
  man.SetThreadCount(2);
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(createFakeWorkerFactory({
    work: context => new Promise(resolve => setTimeout(() => resolve(context), context.delay))
  }));

  man.Run();
  const done = [
    man.Add__Name("work", { name: "a", delay: 15 }).then(value => order.push(value.name)),
    man.Add__Name("work", { name: "b", delay: 5 }).then(value => order.push(value.name)),
    man.Add__Name("work", { name: "fence", delay: 0 }, BCBF_FENCE).then(value => order.push(value.name))
  ];
  await Promise.all(done);

  assert.equal(order.at(-1), "fence");
  await man.Stop();
});

test("BeCallbackMan is the named global background manager", () =>
{
  assert.ok(BeCallbackMan instanceof BlueCallbackMan);
  assert.equal(BeCallbackMan._name, "BeCallbackMan");
});

test("in Update mode with several slots, a fence waits for running entries but does not hold back later ones", async () => {
  const order = [];
  const man = new BlueCallbackMan();
  man.SetThreadCount(3);
  let release;
  man.Add(() => new Promise(resolve => { release = () => { order.push("slow"); resolve(); }; }));
  man.Add(() => { order.push("fence"); }, null, BCBF_FENCE);
  man.Add(() => { order.push("after"); });

  while (man.Update());
  // CallbackMan.cpp:547-571: the fenced entry is set aside and the next entry runs.
  assert.deepEqual(order, [ "after" ], "only the fence waits on the running slow entry");

  release();
  await tick();
  while (man.Update());
  assert.deepEqual(order, [ "after", "slow", "fence" ]);
  assert.equal(man.IsEmpty(), true);
});

/** A fake worker factory whose workers can be made to fail, counting the workers it built. */
function createFailingWorkerFactory(callbacks)
{
  const factory = createFakeWorkerFactory(callbacks);
  const built = [];
  const make = (module, options) =>
  {
    const worker = factory(module, options);
    const listeners = new Map();
    const add = worker.addEventListener;
    worker.addEventListener = (type, listener) => { listeners.set(type, listener); if (type === "message") add(type, listener); };
    worker.fail = () => listeners.get("error")({ type: "error", message: "script failed" });
    built.push(worker);
    return worker;
  };
  return { make, built };
}

test("a failed worker is replaced, so the next entry runs on a new one and settles", async () =>
{
  const { make, built } = createFailingWorkerFactory({ hang: () => new Promise(() => {}), double: value => value * 2 });
  const man = new BlueCallbackMan();
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(make);
  man.Run();

  const held = assert.rejects(man.Add__Name("hang"), { code: "CJS_CALLBACKMAN_WORKER_FAILED" });
  const next = man.Add__Name("double", 21);
  await tick();
  built[0].fail();
  await held;
  assert.equal(built[0].terminated, true);
  assert.equal(await next, 42, "the entry after the failure runs on a replacement worker");
  assert.equal(built.length, 2);
  await man.Stop();
});

test("a worker failing after its entry was cancelled still frees the slot, and Stop settles", async () =>
{
  const { make, built } = createFailingWorkerFactory({ hang: () => new Promise(() => {}) });
  const man = new BlueCallbackMan();
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(make);
  man.Run();

  const id = { value: 0 };
  const cancelled = assert.rejects(man.Add__Name("hang", null, 0, id), { name: "AbortError" });
  await tick();
  man.Cancel(id.value);
  built[0].fail();
  await cancelled;
  await man.Stop();
  assert.equal(man.IsEmpty(), true);
});

test("Stop removes the named entries it rejects, so a later Run does not execute them", async () =>
{
  const { make } = createFailingWorkerFactory({ value: () => 1 });
  const man = new BlueCallbackMan();
  man.SetWorkerModule("test-worker.js");
  man.SetWorkerFactory(make);
  man.Run();
  man.Pause();
  const never = assert.rejects(man.Add__Name("value"), { name: "AbortError" });
  await man.Stop();
  await never;
  assert.equal(man.GetSize(), 0);
  assert.equal(man.IsEmpty(), true);
});

test("a named entry nothing can run rejects at once instead of waiting for an Update", async () =>
{
  const man = new BlueCallbackMan();
  await assert.rejects(man.Add__Name("job"), { code: "CJS_CALLBACKMAN_NO_RUNNER" });
  assert.equal(man.GetSize(), 0);
  assert.equal(man.Update(), false);
});

test("lowering the thread count stops surplus slots taking new entries", async () =>
{
  const man = new BlueCallbackMan();
  man.SetThreadCount(4);
  const releases = [];
  const hold = () => new Promise(resolve => releases.push(resolve));
  for (let i = 0; i < 4; ++i) man.Add(hold);
  while (man.Update());
  assert.equal(releases.length, 4);

  man.SetThreadCount(1);
  for (let i = 0; i < 4; ++i) man.Add(hold);
  for (const release of releases.splice(0)) release();
  await tick();
  while (man.Update());
  assert.equal(releases.length, 1, "only one slot takes work after the count drops to one");
});

test("an Update-mode manager reports each freed slot, after the entry has settled", async () =>
{
  const man = new BlueCallbackMan();
  const events = [];
  man.SetSlotFreeCallback(() => events.push(`free:${man.GetSize()}`));
  let release;
  man.Add(() => new Promise(resolve => { release = resolve; }));
  man.Add(() => events.push("second ran"));
  assert.equal(man.Update(), true);
  assert.equal(man.Update(), false, "the only slot is busy");
  release();
  await tick();
  assert.deepEqual(events, [ "free:1" ], "the slot is reported free, with the second entry still queued");
  assert.equal(man.Update(), true);
  assert.deepEqual(events, [ "free:1", "second ran", "free:0" ]);
});

const CALLBACK_MODULE = new URL("./fixtures/callback-module.mjs", import.meta.url).href;

/**
 * Worker objects that keep listeners by type. A worker built with `load: false`
 * never installs the host, so it never reports ready, and `fail` raises its
 * error event, as a worker whose module was blocked or missing does.
 */
function createTypedWorkerFactory({ load = true } = {})
{
  const built = [];
  const make = (_module, options) =>
  {
    const listeners = new Map();
    const scopeListeners = new Set();
    const worker = {
      name: options.name, terminated: false, posted: [],
      addEventListener: (type, listener) => listeners.set(type, listener),
      postMessage: message =>
      {
        worker.posted.push(message);
        setTimeout(() => { for (const listener of scopeListeners) listener({ data: structuredClone(message) }); });
      },
      terminate: () => { worker.terminated = true; },
      fail: () => listeners.get("error")({ type: "error", message: "module blocked" })
    };
    const scope = {
      addEventListener: (_type, listener) => scopeListeners.add(listener),
      removeEventListener: (_type, listener) => scopeListeners.delete(listener),
      postMessage: message => setTimeout(() => listeners.get("message")({ data: structuredClone(message) }))
    };
    if (load) BlueCallbackManWorker.install(scope);
    built.push(worker);
    return worker;
  };
  return { make, built };
}

test("a worker imports the module registered for a callback the first time it runs", async () =>
{
  const { make, built } = createTypedWorkerFactory();
  const man = new BlueCallbackMan();
  man.RegisterCallbackModule("double", CALLBACK_MODULE);
  man.SetWorkerModule("entry.js").SetWorkerFactory(make).Start(true);
  assert.equal(man.IsRunningOwnThreads(), true);

  assert.equal(await man.Add__Name("double", 21), 42);
  const run = built[0].posted.find(message => message.kind === "run");
  assert.equal(run.module, CALLBACK_MODULE);
  await man.Stop();
});

test("Run that cannot create a worker leaves the manager not running; Start falls back to Update", async () =>
{
  const man = new BlueCallbackMan();
  man.SetWorkerModule("entry.js").SetWorkerFactory(() => { throw new Error("Worker is not defined"); });
  assert.throws(() => man.Run(), /Worker is not defined/);
  assert.equal(man.IsRunningOwnThreads(), false);

  man.RegisterCallbackModule("double", CALLBACK_MODULE);
  man.Start(true);
  assert.equal(man.IsRunningOwnThreads(), false);
  const job = man.Add__Name("double", 4);
  new BlueCallbackManTicker(man).OnTick(0, 0, null);
  assert.equal(await job, 8);
});

test("workers that fail before they load are dead: their entries requeue and run through Update", async () =>
{
  const { make, built } = createTypedWorkerFactory({ load: false });
  const man = new BlueCallbackMan();
  man.SetThreadCount(2);
  man.RegisterCallbackModule("double", CALLBACK_MODULE);
  man.SetWorkerModule("entry.js").SetWorkerFactory(make).Start(true);
  const ticker = new BlueCallbackManTicker(man);

  const first = man.Add__Name("double", 1);
  const second = man.Add__Name("double", 2);
  await tick();
  built[0].fail();
  assert.equal(man.IsRunningOwnThreads(), true, "one worker is still alive");
  built[1].fail();
  await tick();
  assert.equal(man.IsRunningOwnThreads(), false);
  assert.equal(built.length, 2, "a dead thread's worker is not replaced");
  assert.equal(man.GetSize(), 2, "both entries are queued again");

  ticker.OnTick(0, 0, null);
  assert.deepEqual(await Promise.all([ first, second ]), [ 2, 4 ]);
});

test("a worker failing after it loaded is still replaced, on a started manager too", async () =>
{
  const { make, built } = createTypedWorkerFactory();
  const man = new BlueCallbackMan();
  man.RegisterCallbackModule("double", CALLBACK_MODULE);
  man.SetWorkerModule("entry.js").SetWorkerFactory(make).Start(true);
  await tick();
  built[0].fail();
  assert.equal(await man.Add__Name("double", 5), 10);
  assert.equal(built.length, 2);
  assert.equal(man.IsRunningOwnThreads(), true);
  await man.Stop();
});

test("cancelling a named entry running through Update aborts it and discards its outcome", async () =>
{
  const man = new BlueCallbackMan();
  man.RegisterCallbackModule("wait", CALLBACK_MODULE);
  man.Start(false);
  const id = { value: 0 };
  const job = assert.rejects(man.Add__Name("wait", null, 0, id), { name: "AbortError" });
  assert.equal(man.Update(), true);
  await new Promise(resolve => setTimeout(resolve, 20));
  await man.Cancel(id.value);
  await job;
  assert.equal(man.IsEmpty(), true);
});

test("the ticker leaves a manager on its own threads alone, and Start twice does nothing", async () =>
{
  const { make, built } = createTypedWorkerFactory();
  const man = new BlueCallbackMan();
  man.SetWorkerModule("entry.js").SetWorkerFactory(make).Start(true);
  man.Start(true);
  assert.equal(built.length, 1);
  assert.doesNotThrow(() => new BlueCallbackManTicker(man).OnTick(0, 0, null));
  await man.Stop();
});
