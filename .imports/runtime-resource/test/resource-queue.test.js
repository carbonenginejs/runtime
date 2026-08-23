import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsMotherLode } from "../npm/dist/CjsMotherLode.js";
import { CjsResMan } from "../npm/dist/CjsResMan.js";
import { CjsResource } from "../npm/dist/resource/CjsResource.js";
import { CjsResManQueue as RootCjsResManQueue } from "../npm/dist/index.js";
import {
  CjsResManQueue,
  CjsResManWorkQueue
} from "../npm/dist/CjsResManWorkQueue.js";

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

test("CjsResMan queues source load, CPU read, and publication separately", async () => {
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

  for (const expectedStage of [ "read", "publish" ]) {
    const pending = resMan.GetQueueStats(CjsResManQueue.MAIN);
    assert.equal(pending.queued, 1, `${expectedStage} should be the sole queued stage`);
    assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
    await FlushMicrotasks();
  }

  const object = await operation;
  assert.equal(object.bytes, bytes);
  assert.equal(resource.object, object);
  assert.equal(resource.state, "prepared");
  assert.equal(resMan.GetPendingPrepares(), 0);
  assert.deepEqual(calls, [
    [ "load", "res:/queue/example.bin" ],
    [ "read", "res:/queue/example.bin" ]
  ]);
});

test("resource variants share one queued source-load slot", async () => {
  let reads = 0;
  class CjsQueueVariantFormat
  {
    static extensions = Object.freeze([ ".bin" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }), "json": Object.freeze({ output: "json" }) })

    static read(value, options)
    {
      return { emit: options.emit, value };
    }
  }
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 1,
    source: {
      Read() {
        reads++;
        return new Uint8Array([ 7 ]);
      }
    }
  }).RegisterFormat(CjsQueueVariantFormat);

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

test("Wait captures dynamic resource descendants and excludes later queue tasks", async () => {
  let releaseRead;
  let releaseLaterTask;
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 2,
    source: { Read() { return new Uint8Array([ 5 ]); } }
  });
  resMan.RegisterObjectLoader("bin", bytes => new Promise(resolve => {
    releaseRead = () => resolve({ bytes });
  }));

  const operation = resMan.LoadObject("res:/queue/wait-lineage.bin");
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
  const resMan = new CjsResMan({ autoPumpMainThreadQueue: false });
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
  const resMan = new CjsResMan({ autoPumpMainThreadQueue: false });
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
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  resMan.RegisterObjectLoader("bin", () => {
    throw new Error("expected resource-stage failure");
  });

  const operation = resMan.LoadObject("res:/queue/wait-failure.bin");
  const operationFailure = assert.rejects(operation, /expected resource-stage failure/u);
  const fence = resMan.Wait();
  await operationFailure;
  assert.equal(await fence, resMan);
  assert.equal(resMan.Lookup("res:/queue/wait-failure.bin").IsFailed(), true);
});

test("Clear cancellation settles an already captured resource lineage", async () => {
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  resMan.PauseQueue(CjsResManQueue.BACKGROUND);
  const operation = resMan.LoadObject("res:/queue/wait-clear.bin");
  const resource = resMan.Lookup("res:/queue/wait-clear.bin");
  const operationFailure = assert.rejects(
    operation,
    error => error.code === "CJS_RESMAN_QUEUE_CANCELLED"
  );
  const fence = resMan.Wait({ pump: false });

  resMan.Clear();
  await operationFailure;
  assert.equal(await fence, resMan);
  assert.equal(resource.state, "requested");
  assert.equal(resource.error, null);
  assert.equal(resource.HasPayload(), false);
});

test("Wait excludes direct LoadResourceObject work that bypasses both queues", async () => {
  let releaseSource;
  let directSettled = false;
  const resMan = new CjsResMan({
    source: {
      Read()
      {
        return new Promise(resolve => { releaseSource = resolve; });
      }
    }
  });
  resMan.RegisterObjectLoader("bin", bytes => bytes);
  const resource = resMan.GetResource("res:/queue/direct-wait.bin");
  const direct = resMan.LoadResourceObject(resource).then(value => {
    directSettled = true;
    return value;
  });

  assert.equal(await resMan.Wait(), resMan);
  await WaitUntil(() => typeof releaseSource === "function");
  assert.equal(directSettled, false);
  releaseSource(new Uint8Array([ 9 ]));
  assert.deepEqual(await direct, new Uint8Array([ 9 ]));
});

test("Wait pump false relies on an external queue driver", async () => {
  const resMan = new CjsResMan({ autoPumpMainThreadQueue: false });
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
  const resMan = new CjsResMan({ autoPumpMainThreadQueue: false });
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
  const resMan = new CjsResMan({ maxConcurrentLoads: 2 });
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
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: {
      Read()
      {
        return new Promise(resolve => { releaseSource = resolve; });
      }
    }
  });
  resMan.RegisterObjectLoader("bin", bytes => {
    loaderCalls += 1;
    return bytes;
  });

  const operation = resMan.LoadObject("res:/queue/stale-clear.bin");
  const resource = resMan.Lookup("res:/queue/stale-clear.bin");
  const operationFailure = assert.rejects(
    operation,
    error => error.code === "CJS_RESMAN_STALE_RESOURCE_OPERATION"
      && error.phase === "queue:loading"
  );
  const fence = resMan.Wait({ pump: false });

  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => typeof releaseSource === "function");
  resMan.Clear();
  releaseSource(new Uint8Array([ 1 ]));

  await operationFailure;
  assert.equal(await fence, resMan);
  assert.equal(resMan.Lookup("res:/queue/stale-clear.bin"), null);
  assert.equal(resource.state, "requested");
  assert.equal(resource.error, null);
  assert.equal(resource.HasPayload(), false);
  assert.equal(loaderCalls, 0);
  assert.equal(resMan.GetPendingPrepares(), 0);
});

test("Delete during an active asynchronous CPU read drops the candidate before publication", async () => {
  let releaseRead;
  let publishEvents = 0;
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 7 ]); } }
  });
  resMan.RegisterObjectLoader("bin", bytes => new Promise(resolve => {
    releaseRead = () => resolve({ bytes });
  }));

  const path = "res:/queue/stale-prepare.bin";
  const operation = resMan.LoadObject(path);
  const resource = resMan.Lookup(path);
  resource.OnEvent?.("loaded", () => { publishEvents += 1; });
  const operationFailure = assert.rejects(
    operation,
    error => error.code === "CJS_RESMAN_STALE_RESOURCE_OPERATION"
      && error.phase === "queue-stage:read:settled"
  );

  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => resMan.GetQueueStats(CjsResManQueue.MAIN).queued === 1);
  assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
  await WaitUntil(() => typeof releaseRead === "function");

  assert.equal(resMan.Delete(path), true);
  releaseRead();
  await operationFailure;

  assert.equal(resMan.Lookup(path), null);
  assert.equal(resource.state, "loading");
  assert.equal(resource.error, null);
  assert.equal(resource.HasPayload(), false);
  assert.equal(publishEvents, 0);
  assert.equal(resMan.GetPendingPrepares(), 0);
});

test("stale direct loads preserve their source rejection without marking the detached resource failed", async () => {
  let rejectSource;
  const expected = new Error("expected stale direct source failure");
  const resMan = new CjsResMan({
    source: {
      Read()
      {
        return new Promise((resolve, reject) => { rejectSource = reject; });
      }
    }
  });
  resMan.RegisterObjectLoader("bin", bytes => bytes);
  const path = "res:/queue/stale-direct.bin";
  const resource = resMan.GetResource(path);
  const operation = resMan.LoadResourceObject(resource);
  const operationFailure = assert.rejects(operation, error => error === expected);

  await WaitUntil(() => typeof rejectSource === "function");
  assert.equal(resMan.Delete(path), true);
  rejectSource(expected);
  await operationFailure;

  assert.equal(resource.state, "loading");
  assert.equal(resource.error, null);
  assert.equal(resource.HasPayload(), false);
});

test("an atomic reload commits before an older canonical operation settles last", async () => {
  const sourceReleases = [];
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 2,
    source: {
      Read()
      {
        return new Promise(resolve => sourceReleases.push(resolve));
      }
    }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));
  resMan.PauseQueue(CjsResManQueue.BACKGROUND);

  const path = "res:/queue/reload-generation.json";
  const oldOperation = resMan.LoadObject(path);
  const oldResource = resMan.Lookup(path);
  const oldFailure = assert.rejects(
    oldOperation,
    error => error.code === "CJS_RESMAN_STALE_RESOURCE_OPERATION"
  );
  const replacement = resMan.GetResource(path, { reload: true });
  const replacementOperation = replacement.Ready();

  assert.notEqual(replacement, oldResource);
  assert.equal(resMan.Lookup(path), oldResource);
  resMan.ResumeQueue(CjsResManQueue.BACKGROUND);
  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => sourceReleases.length === 2);

  sourceReleases[1]("{\"revision\":2}");
  await WaitUntil(() => resMan.GetPendingPrepares() === 1);
  for (let stage = 0; stage < 2; stage++)
  {
    assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
    await FlushMicrotasks();
  }
  assert.deepEqual(await replacementOperation, { revision: 2 });
  assert.equal(resMan.Lookup(path), replacement);

  sourceReleases[0]("{\"revision\":1}");
  await oldFailure;
  assert.equal(resMan.Lookup(path), replacement);
  assert.deepEqual(replacement.GetPayload(), { revision: 2 });
  assert.equal(replacement.state, "prepared");
  assert.equal(oldResource.state, "requested");
  assert.equal(oldResource.error, null);
  assert.equal(oldResource.HasPayload(), false);
});

test("the newest concurrent reload candidate wins regardless of settlement order", async () => {
  const sourceReleases = [];
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 2,
    source: {
      Read()
      {
        return new Promise(resolve => sourceReleases.push(resolve));
      }
    }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));
  resMan.PauseQueue(CjsResManQueue.BACKGROUND);

  const path = "res:/queue/newest-reload-wins.json";
  const current = resMan.GetResource(path);
  current.SetPayload({ revision: 0 });
  current.MarkLoaded();
  const firstCandidate = resMan.GetResource(path, { reload: true });
  let firstCandidateDestroyed = 0;
  firstCandidate.SetAdapterResource("candidate", {
    destroy() { firstCandidateDestroyed += 1; }
  });
  const firstOperation = firstCandidate.Ready();
  const firstFailure = assert.rejects(
    firstOperation,
    error => error.code === "CJS_RESMAN_STALE_RELOAD_CANDIDATE"
  );
  const secondCandidate = resMan.GetResource(path, { reload: true });
  const secondOperation = secondCandidate.Ready();

  assert.equal(resMan.Lookup(path), current);
  resMan.ResumeQueue(CjsResManQueue.BACKGROUND);
  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => sourceReleases.length === 2);

  sourceReleases[0]("{\"revision\":1}");
  await firstFailure;
  assert.equal(firstCandidateDestroyed, 1);
  assert.equal(resMan.Lookup(path), current);
  assert.deepEqual(current.GetPayload(), { revision: 0 });

  sourceReleases[1]("{\"revision\":2}");
  await WaitUntil(() => resMan.GetPendingPrepares() === 1);
  for (let stage = 0; stage < 2; stage++)
  {
    assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
    await FlushMicrotasks();
  }
  assert.deepEqual(await secondOperation, { revision: 2 });
  assert.equal(resMan.Lookup(path), secondCandidate);
  assert.deepEqual(secondCandidate.GetPayload(), { revision: 2 });
  assert.equal(current.HasPayload(), false);
});

test("deleting the expected owner during reload prevents candidate resurrection", async () => {
  let releaseSource;
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: {
      Read()
      {
        return new Promise(resolve => { releaseSource = resolve; });
      }
    }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/queue/delete-during-reload.json";
  const current = resMan.GetResource(path);
  current.SetPayload({ revision: 1 });
  current.MarkLoaded();
  const candidate = resMan.GetResource(path, { reload: true });
  let candidateDestroyed = 0;
  candidate.SetAdapterResource("candidate", {
    destroy() { candidateDestroyed += 1; }
  });
  const operation = candidate.Ready();
  const failure = assert.rejects(
    operation,
    error => error.code === "CJS_RESMAN_STALE_RELOAD_CANDIDATE"
  );

  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => typeof releaseSource === "function");
  assert.equal(resMan.Delete(path), true);
  releaseSource("{\"revision\":2}");
  await failure;

  assert.equal(resMan.Lookup(path), null);
  assert.equal(candidateDestroyed, 1);
  assert.equal(candidate.HasPayload(), false);
});

test("Wait and MotherLode replacement account for an active reload candidate", async () => {
  let releaseSource;
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: {
      Read()
      {
        return new Promise(resolve => { releaseSource = resolve; });
      }
    }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/queue/wait-reload-candidate.json";
  const current = resMan.GetResource(path);
  current.SetPayload({ revision: 1 });
  current.MarkLoaded();
  const candidate = resMan.GetResource(path, { reload: true });
  const operation = candidate.Ready();
  const wait = resMan.Wait({ pump: false });

  assert.throws(
    () => resMan.Register({ motherLode: new CjsMotherLode() }),
    error => error.code === "CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS"
  );
  assert.equal(resMan.Lookup(path), current);
  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => typeof releaseSource === "function");
  releaseSource("{\"revision\":2}");
  await WaitUntil(() => resMan.GetPendingPrepares() === 1);
  for (let stage = 0; stage < 2; stage++)
  {
    assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
    await FlushMicrotasks();
  }

  assert.deepEqual(await operation, { revision: 2 });
  await wait;
  assert.equal(resMan.Lookup(path), candidate);
  assert.equal(resMan.IsLoading(), false);
});

test("reinserting the same JavaScript resource handle does not reuse its obsolete object operation", async () => {
  const sourceReleases = [];
  const sharedResource = new CjsResource();
  function SingletonResource()
  {
    return sharedResource;
  }

  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    maxConcurrentLoads: 2,
    source: {
      Read()
      {
        return new Promise(resolve => sourceReleases.push(resolve));
      }
    }
  });
  resMan.RegisterResourceType("singleton", SingletonResource);
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));
  resMan.PauseQueue(CjsResManQueue.BACKGROUND);

  const path = "res:/queue/reinsert-generation.json";
  const options = { requirement: "singleton", cacheSource: false };
  const oldOperation = resMan.LoadObject(path, options);
  const oldFailure = assert.rejects(
    oldOperation,
    error => error.code === "CJS_RESMAN_STALE_RESOURCE_OPERATION"
  );
  assert.equal(resMan.Delete(path, options), true);
  const replacementOperation = resMan.LoadObject(path, options);

  assert.notEqual(replacementOperation, oldOperation);
  assert.equal(resMan.Lookup(path, options), sharedResource);
  resMan.ResumeQueue(CjsResManQueue.BACKGROUND);
  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => sourceReleases.length === 2);

  sourceReleases[1]("{\"revision\":2}");
  await WaitUntil(() => resMan.GetQueueStats(CjsResManQueue.MAIN).queued === 1);
  for (let stage = 0; stage < 2; stage++)
  {
    assert.equal(resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }), true);
    await FlushMicrotasks();
  }
  assert.deepEqual(await replacementOperation, { revision: 2 });

  sourceReleases[0]("{\"revision\":1}");
  await oldFailure;
  assert.deepEqual(sharedResource.GetPayload(), { revision: 2 });
  assert.equal(sharedResource.state, "prepared");
  assert.equal(sharedResource.error, null);
});

test("MotherLode replacement rejects active queued and direct resource mutations", async () => {
  const queuedManager = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  queuedManager.RegisterObjectLoader("bin", bytes => bytes);
  queuedManager.PauseQueue(CjsResManQueue.BACKGROUND);
  const queuedOperation = queuedManager.LoadObject("res:/queue/replace-owner.bin");
  const queuedFailure = assert.rejects(
    queuedOperation,
    error => error.code === "CJS_RESMAN_QUEUE_CANCELLED"
  );
  const queuedFence = queuedManager.Wait({ pump: false });
  const queuedOwner = queuedManager.motherLode;
  const queuedReplacement = new CjsMotherLode();

  assert.equal(queuedManager.Register({ motherLode: queuedOwner }), queuedManager);
  assert.throws(
    () => queuedManager.Register({ motherLode: queuedReplacement }),
    error => error.code === "CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS"
      && error.activeOperations === 1
  );
  assert.equal(queuedManager.motherLode, queuedOwner);
  assert.equal(queuedOwner.IsStarted(), true);

  queuedManager.Clear();
  await queuedFailure;
  assert.equal(await queuedFence, queuedManager);
  assert.equal(queuedManager.Register({ motherLode: queuedReplacement }), queuedManager);
  assert.equal(queuedManager.motherLode, queuedReplacement);

  let releaseDirect;
  const directManager = new CjsResMan({
    source: {
      Read()
      {
        return new Promise(resolve => { releaseDirect = resolve; });
      }
    }
  });
  directManager.RegisterObjectLoader("bin", bytes => bytes);
  const directResource = directManager.GetResource("res:/queue/replace-direct-owner.bin");
  const directOperation = directManager.LoadResourceObject(directResource);
  const directOwner = directManager.motherLode;
  const directReplacement = new CjsMotherLode();

  assert.throws(
    () => directManager.Register({ motherLode: directReplacement }),
    error => error.code === "CJS_RESMAN_ACTIVE_RESOURCE_OPERATIONS"
      && error.activeOperations === 1
  );
  assert.equal(directManager.motherLode, directOwner);
  assert.equal(await directManager.Wait(), directManager);
  await WaitUntil(() => typeof releaseDirect === "function");
  releaseDirect(new Uint8Array([ 9 ]));
  assert.deepEqual(await directOperation, new Uint8Array([ 9 ]));
  assert.equal(directManager.Register({ motherLode: directReplacement }), directManager);
  assert.equal(directManager.motherLode, directReplacement);
});

test("standalone direct preparation cannot publish after its canonical identity is deleted", async () => {
  let releaseRead;
  const resMan = new CjsResMan();
  resMan.RegisterObjectLoader("bin", bytes => new Promise(resolve => {
    releaseRead = () => resolve({ bytes });
  }));
  const path = "res:/queue/standalone-prepare.bin";
  const resource = resMan.GetResource(path);
  const operation = resMan.PrepareResourceObject(resource, new Uint8Array([ 4 ]));
  const operationFailure = assert.rejects(
    operation,
    error => error.code === "CJS_RESMAN_STALE_RESOURCE_OPERATION"
      && error.phase === "prepare:read-settled"
  );

  await WaitUntil(() => typeof releaseRead === "function");
  assert.equal(resMan.Delete(path), true);
  releaseRead();
  await operationFailure;

  assert.equal(resource.state, "empty");
  assert.equal(resource.error, null);
  assert.equal(resource.HasPayload(), false);
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
