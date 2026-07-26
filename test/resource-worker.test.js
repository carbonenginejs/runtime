import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as RuntimeResource from "../npm/dist/index.js";
import {
  CjsResManFetchProvider,
  CjsResManMainThreadLoader,
  CjsResManWorkerLoader,
  CjsResMan,
  CjsResManQueue
} from "../npm/dist/index.js";
import { CjsResManWorker } from "../npm/dist/worker/CjsResManWorker.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerFormatUrl = pathToFileURL(
  path.join(root, "test", "fixtures", "worker-format.mjs")
).href;

test("ResMan worker types expose their owning class ancestry", () => {
  assert.equal(
    RuntimeResource.CjsResManMainThreadLoader,
    CjsResManMainThreadLoader
  );
  assert.equal(RuntimeResource.CjsResManWorkerLoader, CjsResManWorkerLoader);
  assert.equal("CjsResourceMainThreadLoader" in RuntimeResource, false);
  assert.equal("CjsResourceWorkerLoader" in RuntimeResource, false);
  assert.equal("CjsResourceWorkerProtocol" in RuntimeResource, false);
  assert.equal("CjsResManWorkerProtocol" in RuntimeResource, false);
});

test("main-thread resource loader preserves structural source and format contracts", async () => {
  const loader = new CjsResManMainThreadLoader();
  const source = {
    Read(pathValue, options) {
      return { path: pathValue, marker: options.marker };
    }
  };
  class CjsInlineFormat
  {
    static read(input, options) {
      return { input, options };
    }
  }

  assert.deepEqual(
    loader.Read(source, "res:/main.bin", { marker: 7 }),
    { path: "res:/main.bin", marker: 7 }
  );
  assert.deepEqual(
    await loader.ReadFormat(
      { Format: CjsInlineFormat },
      new Uint8Array([ 1 ]),
      { emit: "raw" }
    ),
    { input: new Uint8Array([ 1 ]), options: { emit: "raw" } }
  );
  assert.equal(loader.CanReadFormat(), false);
  assert.equal(loader.GetPendingCount(), 0);
});

test("CjsResMan selects worker loading by default with an explicit main-thread override", () => {
  const resMan = new CjsResMan();
  assert.equal(resMan.IsWorkerLoading(), true);
  assert.equal(resMan.UseWorkerLoading(false), resMan);
  assert.equal(resMan.IsWorkerLoading(), false);
  assert.equal(resMan.UseWorkerLoading(true), resMan);
  assert.equal(resMan.IsWorkerLoading(), true);
});

test("worker loader correlates results and preserves transferable requests", async () => {
  const worker = new FakeWorker();
  const loader = new CjsResManWorkerLoader({ worker });
  const firstBuffer = new ArrayBuffer(2);
  const first = loader.Execute("test.first", { value: 1 }, {
    transfer: [ firstBuffer ]
  });
  const second = loader.Execute("test.second", { value: 2 });

  assert.equal(loader.GetPendingCount(), 2);
  assert.equal(worker.messages[0].message.id, 1);
  assert.equal(worker.messages[0].message.operation, "test.first");
  assert.deepEqual(worker.messages[0].transfer, [ firstBuffer ]);
  assert.equal(worker.messages[1].message.id, 2);

  worker.Emit("message", {
    data: {
      type: CjsResManWorker.Message.RESULT,
      id: 2,
      ok: true,
      result: "second"
    }
  });
  worker.Emit("message", {
    data: {
      type: CjsResManWorker.Message.RESULT,
      id: 1,
      ok: true,
      result: "first"
    }
  });

  assert.equal(await first, "first");
  assert.equal(await second, "second");
  assert.equal(loader.GetPendingCount(), 0);
});

test("worker loader honors clone-safe format output declarations", () => {
  const worker = new FakeWorker();
  const loader = new CjsResManWorkerLoader({ worker });
  class CjsRestrictedWorkerFormat
  {
    static worker = {
      module: workerFormatUrl,
      exportName: "CjsTestWorkerFormat",
      outputTypes: [ "json" ],
      defaultOutput: "json"
    };
  }
  const descriptor = { Format: CjsRestrictedWorkerFormat };

  assert.equal(loader.CanReadFormat(descriptor, {}), true);
  assert.equal(loader.CanReadFormat(descriptor, { emit: "json" }), true);
  assert.equal(loader.CanReadFormat(descriptor, { emit: "runtime" }), false);
  assert.equal(loader.CanReadFormat(descriptor, { classes: { Test() {} } }), false);
});

test("worker loader aborts requests and rejects every request on fatal worker failure", async () => {
  const worker = new FakeWorker();
  const loader = new CjsResManWorkerLoader({ worker });
  const controller = new AbortController();
  const aborted = loader.Execute("test.abort", null, { signal: controller.signal });
  const failing = loader.Execute("test.failure", null);

  controller.abort("cancelled by test");
  await assert.rejects(
    aborted,
    error => error.name === "AbortError" && /cancelled by test/u.test(error.message)
  );
  assert.equal(worker.messages.some(entry =>
    entry.message.type === CjsResManWorker.Message.CANCEL
    && entry.message.id === 1
  ), true);

  const fatal = new Error("worker crashed");
  worker.Emit("error", { error: fatal });
  await assert.rejects(failing, error => error === fatal);
  assert.equal(worker.terminated, true);
  assert.equal(loader.GetPendingCount(), 0);
  assert.equal(loader.IsAvailable(), false);
});

test("fetch providers consume resolved URLs without serializing ResMan-only options", () => {
  const source = new CjsResManFetchProvider({
    fetchOptions: { credentials: "include" }
  });
  const signal = new AbortController().signal;
  const request = source.CreateWorkerRequest("https://example.invalid/base/audio/test.wem", {
    resourcePath: "res:/audio/test.wem",
    emit: "pcm",
    cacheSource: true,
    headers: { Range: "bytes=4-12" },
    signal
  });

  assert.equal(request.operation, CjsResManWorker.Operation.FETCH);
  assert.equal(request.payload.url, "https://example.invalid/base/audio/test.wem");
  assert.equal(request.payload.path, "res:/audio/test.wem");
  assert.deepEqual(request.payload.options, {
    credentials: "include",
    headers: { Range: "bytes=4-12" }
  });
  assert.equal(request.signal, signal);
  assert.equal("emit" in request.payload.options, false);
  assert.equal("cacheSource" in request.payload.options, false);

  const customFetch = new CjsResManFetchProvider({ fetch() {} });
  assert.equal(customFetch.CreateWorkerRequest("https://example.invalid/custom.bin"), null);

  const headerSource = new CjsResManFetchProvider({
    fetchOptions: { headers: new Map([[ "Accept", "application/octet-stream" ]]) }
  });
  assert.deepEqual(
    headerSource.CreateWorkerRequest("https://example.invalid/headers.bin").payload.options.headers,
    [[ "Accept", "application/octet-stream" ]]
  );
});

test("CjsResMan is the only built-in resource-path-to-URL resolver", () =>
{
  const resMan = new CjsResMan({
    paths: {
      res: "https://cdn.example.invalid/assets"
    }
  });

  assert.equal(resMan.HasPath("RES:/"), true);
  assert.equal(
    resMan.GetPath("res"),
    "https://cdn.example.invalid/assets/"
  );
  assert.equal(
    resMan.BuildUrl("RES:/Texture/Ship.DDS"),
    "https://cdn.example.invalid/assets/texture/ship.dds"
  );
  assert.equal(
    resMan.BuildUrl("https://example.invalid/Case/File.bin"),
    "https://example.invalid/Case/File.bin"
  );
  assert.throws(
    () => resMan.BuildUrl("aud:/bank/music.bnk"),
    error => error.code === "CJS_RESMAN_PATH_PREFIX_UNREGISTERED"
  );

  resMan.SetPathResolver(path => `https://proxy.example.invalid/${encodeURIComponent(path)}`);
  assert.equal(
    resMan.BuildUrl("aud:/bank/music.bnk"),
    "https://proxy.example.invalid/aud%3A%2Fbank%2Fmusic.bnk"
  );
});

test("CjsResMan loads fetch-provider files through its default worker strategy", async () => {
  const worker = new FakeWorker();
  const source = new CjsResManFetchProvider({
    fetch() {
      throw new Error("main-thread fetch should not run");
    },
    worker: true
  });
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source,
    paths: {
      res: "https://example.invalid/resources/"
    },
    workerLoader: { worker }
  });
  resMan.RegisterObjectLoader("bin", input => new Uint8Array(input));

  const operation = resMan.LoadObject("res:/worker/default.bin");
  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => worker.messages.length === 1);
  const request = worker.messages[0].message;
  assert.equal(request.operation, CjsResManWorker.Operation.FETCH);
  assert.equal(request.payload.path, "res:/worker/default.bin");
  assert.equal(
    request.payload.url,
    "https://example.invalid/resources/worker/default.bin"
  );

  const buffer = new Uint8Array([ 6, 7 ]).buffer;
  worker.Emit("message", {
    data: {
      type: CjsResManWorker.Message.RESULT,
      id: request.id,
      ok: true,
      result: buffer
    }
  });
  await WaitUntil(() => resMan.GetPendingPrepares() === 1);
  for (let stage = 0; stage < 2; stage++) {
    assert.equal(
      resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }),
      true
    );
    await Promise.resolve();
    await Promise.resolve();
  }

  assert.deepEqual(await operation, new Uint8Array([ 6, 7 ]));
});

test("worker operation host executes fetch and dynamic format modules", async () => {
  const bytes = new Uint8Array([ 3, 4, 5 ]);
  const fetched = await CjsResManWorker.execute(
    CjsResManWorker.Operation.FETCH,
    {
      url: "https://example.invalid/data.bin",
      path: "res:/data.bin",
      responseType: "arraybuffer",
      options: { credentials: "omit" }
    },
    {
      fetch: async (url, options) => {
        assert.equal(url, "https://example.invalid/data.bin");
        assert.equal(options.credentials, "omit");
        return {
          ok: true,
          arrayBuffer: async () => bytes.buffer
        };
      }
    }
  );
  assert.equal(fetched, bytes.buffer);

  const formatted = await CjsResManWorker.execute(
    CjsResManWorker.Operation.FORMAT_READ,
    {
      module: workerFormatUrl,
      exportName: "CjsTestWorkerFormat",
      input: bytes,
      options: { emit: "test" }
    }
  );
  assert.deepEqual(formatted, {
    bytes: [ 3, 4, 5 ],
    options: { emit: "test" },
    worker: true
  });
});

test("worker entry installs the execute/result message envelope", async () => {
  let onMessage;
  const responses = [];
  const scope = {
    addEventListener(type, listener) {
      if (type === "message") onMessage = listener;
    },
    removeEventListener(type, listener) {
      if (type === "message" && onMessage === listener) onMessage = null;
    },
    postMessage(message, transfer) {
      responses.push({ message, transfer });
    }
  };
  const uninstall = CjsResManWorker.install(scope);

  await onMessage({
    data: {
      type: CjsResManWorker.Message.EXECUTE,
      id: 42,
      operation: CjsResManWorker.Operation.FORMAT_READ,
      payload: {
        module: workerFormatUrl,
        exportName: "CjsTestWorkerFormat",
        input: new Uint8Array([ 9 ]),
        options: { emit: "test" }
      }
    }
  });

  assert.equal(responses.length, 1);
  assert.equal(responses[0].message.type, CjsResManWorker.Message.RESULT);
  assert.equal(responses[0].message.id, 42);
  assert.equal(responses[0].message.ok, true);
  assert.deepEqual(responses[0].message.result.bytes, [ 9 ]);
  uninstall();
  assert.equal(onMessage, null);
});

test("worker helpers collect unique buffers and serialize cloneable errors", () => {
  const first = new Uint8Array([ 1, 2 ]);
  const second = new ArrayBuffer(3);
  assert.deepEqual(
    CjsResManWorker.collectTransferables({
      first,
      alias: new Uint8Array(first.buffer),
      nested: [ second ]
    }),
    [ first.buffer, second ]
  );

  const failure = new Error("bad worker operation");
  failure.code = "TEST_WORKER";
  failure.path = "res:/bad.bin";
  assert.deepEqual(
    CjsResManWorker.serializeError(failure, "test"),
    {
      name: "Error",
      message: "bad worker operation",
      code: "TEST_WORKER",
      operation: "test",
      path: "res:/bad.bin",
      status: undefined,
      statusText: undefined
    }
  );
});

test("CjsResMan sends worker-safe reads off the main queue and publishes on it", async () => {
  let resolveFormat;
  let pendingWorkers = 0;
  const workerLoader = {
    Read(source, pathValue, options) {
      return source.Read(pathValue, options);
    },
    CanReadFormat() {
      return true;
    },
    ReadFormat(descriptor, input, options) {
      pendingWorkers += 1;
      return new Promise(resolve => {
        resolveFormat = () => {
          pendingWorkers -= 1;
          resolve({ input, options, format: descriptor.Format.name });
        };
      });
    },
    GetPendingCount() {
      return pendingWorkers;
    }
  };
  class CjsWorkerQueueFormat
  {
    static inputTypes = [ "workerqueue" ];
    static outputTypes = [ "raw" ];
    static debugOutputTypes = [ "json" ];
  }
  const resMan = new CjsResMan({
    autoPumpMainThreadQueue: false,
    source: { Read() { return new Uint8Array([ 8 ]); } },
    workerLoader,
    useWorkerLoading: true
  }).RegisterFormat(CjsWorkerQueueFormat);

  const operation = resMan.LoadObject("res:/worker/queue.workerqueue", {
    emit: "raw"
  });
  assert.equal(resMan.IsWorkerLoading(), true);
  assert.equal(resMan.PumpBackgroundQueue(), true);
  await WaitUntil(() => typeof resolveFormat === "function");
  assert.equal(resMan.GetPendingPrepares(), 0);
  assert.equal(resMan.GetPendingWorkers(), 1);
  assert.equal(resMan.IsLoading(), true);

  resolveFormat();
  await WaitUntil(() => resMan.GetPendingPrepares() === 1);
  assert.equal(
    resMan.PumpMainThreadQueue({ maxItems: 1, maxTime: 0 }),
    true
  );

  const result = await operation;
  assert.deepEqual(result.input, new Uint8Array([ 8 ]));
  assert.equal(result.options.emit, "raw");
  assert.equal(result.format, "CjsWorkerQueueFormat");
  assert.equal(resMan.GetQueueStats(CjsResManQueue.MAIN).pending, 0);
  assert.equal(resMan.GetPendingWorkers(), 0);
  assert.equal(resMan.IsLoading(), false);
});

test("Black, BNK, and WEM format facades declare worker module identities", async () => {
  const [{ CjsBlackFormat }, { CjsBnkFormat }, { CjsWemFormat }] = await Promise.all([
    import("../npm/dist/formats/black/index.js"),
    import("../npm/dist/formats/bnk/index.js"),
    import("../npm/dist/formats/wem/index.js")
  ]);

  for (const Format of [ CjsBlackFormat, CjsBnkFormat, CjsWemFormat ]) {
    assert.equal(typeof Format.worker.module, "string");
    assert.equal(Format.worker.module.startsWith("file:"), true);
    assert.equal(Format.worker.exportName, Format.name);
  }
  assert.deepEqual(CjsBlackFormat.worker.outputTypes, [ "json", "payload" ]);
  assert.equal(CjsBlackFormat.worker.defaultOutput, "json");
});

class FakeWorker
{
  constructor() {
    this.listeners = new Map();
    this.messages = [];
    this.terminated = false;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  postMessage(message, transfer = []) {
    this.messages.push({ message, transfer });
  }

  terminate() {
    this.terminated = true;
  }

  Emit(type, value) {
    for (const listener of this.listeners.get(type) || []) listener(value);
  }
}

async function WaitUntil(predicate, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  assert.fail("Timed out waiting for condition.");
}
