import assert from "node:assert/strict";
import test from "node:test";

import { BeCallbackMan, BlueCallbackMan, BlueCallbackManWorker, IBlueCallbackMan } from "../../src/global/blue/index.js";

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
    const worker = { onmessage: null, terminated: false, name: options.name };
    const scope = {
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
      postMessage: message => setTimeout(() => worker.onmessage({ data: structuredClone(message) }))
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

test("Pause and Resume need the own threads; SetPriority is not implemented", () =>
{
  const man = new BlueCallbackMan();
  assert.throws(() => man.Pause(), /not running its own threads/);
  assert.throws(() => man.Resume(), /not running its own threads/);
  assert.throws(() => man.SetPriority(1), /not implemented/);
  assert.throws(() => man.Add("name"), TypeError);
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
