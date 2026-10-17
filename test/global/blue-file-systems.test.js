// Res file systems as providers: BePaths routing by protocol and matching
// forms, the local stub, and the fetch-backed default (blue/src/BluePaths.cpp,
// blue/include/IBlueResFileSystem.h; the browser changes are ours).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BlueFileUtil,
  BlueResFileSystemForm,
  BlueResFileSystemLocal,
  BluePathsBeforeOrAfter,
  CjsBluePaths,
  CjsBlueResFileSystemCallback,
  CjsBlueResFileSystemFetch,
  IBlueResFileSystem
} from "../../npm/dist/global/blue/index.js";

const { BYTES, TEXT, STREAM, VALUE } = BlueResFileSystemForm;
const encode = text => new TextEncoder().encode(text);

/** A declared in-memory file system that records what it was asked. */
function memoryFileSystem(protocols, forms, files)
{
  const FileSystem = class extends IBlueResFileSystem
  {
    static protocols = protocols;
    static forms = forms;
    asked = [];
    FileExists(path) { return files.has(path); }
    IsDirectory() { return false; }
    GetDirectoryContents() {}
    ResolvePathW(path) { return files.has(path) ? path : null; }
    async GetStreamFromPath(path, request)
    {
      this.asked.push({ path, form: request.form });
      if (!files.has(path)) return null;
      const value = files.get(path);
      if (request.form === STREAM) return { form: STREAM, data: new Response(value).body };
      return { form: request.form, data: value };
    }
  };
  return new FileSystem();
}

/** A fetch that answers from a list of handlers, one per call, recording each URL. */
function scriptedFetch(...handlers)
{
  const calls = [];
  const fetch = async (url, init) =>
  {
    calls.push(url);
    const handler = handlers[Math.min(calls.length - 1, handlers.length - 1)];
    return handler(url, init);
  };
  return { fetch, calls };
}

test("BlueFileUtil ports GetResProtocol and the red/black substitutions", () =>
{
  assert.equal(BlueFileUtil.getResProtocol("res:/a/b.dds"), "res");
  assert.equal(BlueFileUtil.getResProtocol("dynamic:/color/1,0,0,1"), "dynamic");
  assert.equal(BlueFileUtil.getResProtocol("no/protocol.dds"), null);
  assert.equal(BlueFileUtil.substituteBlackForRedInFilename("res:/a/b.red"), "res:/a/b.black");
  assert.equal(BlueFileUtil.substituteBlackForRedInFilename("res:/a/b.redx"), "res:/a/b.redx");
  assert.equal(BlueFileUtil.substituteRedForBlackInFilename("res:/a/b.black"), "res:/a/b.red");
});

test("BePaths refuses a file system that does not declare its protocols and forms", () =>
{
  const paths = new CjsBluePaths();
  const plain = { FileExists: () => false, IsDirectory: () => false, GetDirectoryContents() {}, GetStreamFromPath: async () => null, ResolvePathW: () => null };
  assert.throws(() => paths.RegisterFileSystem(plain), /static protocols/u);
  assert.throws(() => paths.RegisterFileSystem(new BlueResFileSystemLocal()), /static protocols/u, "the local stub declares no protocols");
  assert.throws(() => paths.RegisterFileSystem(memoryFileSystem([ "res" ], [ "pixels" ], new Map())), /static forms/u);
  assert.throws(() => paths.SetLocalFileSystem(plain), /static protocols/u);
});

test("BlueResFileSystemLocal keeps Carbon's members and throws in a browser", async () =>
{
  const local = new BlueResFileSystemLocal();
  for (const member of [ "FileExists", "IsDirectory", "ResolvePathW", "ResolvePath", "SetSearchPath", "GetSearchPath", "ClearSearchPaths",
    "ResolvePathForWriting", "ResolvePathToRoot", "GetExpandedSearchPaths", "GetExpandedSearchPaths__Key",
    "InitializeStdAppPaths", "LogPaths", "GetInitialWorkingDirectory", "GetAllSearchPaths", "GetExpandedSearchPathsAsDict",
    "ListDirFromScript", "Initialize", "GetDirectoryContents" ])
  {
    assert.throws(() => local[member]("res:/a"), /a browser has no disk/u, member);
  }
  await assert.rejects(local.GetStreamFromPath("res:/a", { form: BYTES }), /a browser has no disk/u);
});

test("BePaths asks only the file systems that serve the path's protocol, in list order", async () =>
{
  const paths = new CjsBluePaths();
  const cdn = memoryFileSystem([ "res" ], [ BYTES ], new Map([ [ "res:/b.dds", encode("cdn") ] ]));
  const first = memoryFileSystem([ "res" ], [ BYTES ], new Map([ [ "res:/a.dds", encode("first") ] ]));
  const other = memoryFileSystem([ "cache" ], [ BYTES ], new Map());
  paths.RegisterFileSystem(cdn);
  paths.RegisterFileSystem(first, BluePathsBeforeOrAfter.BEFORE);
  paths.RegisterFileSystem(other);

  const a = await paths.GetStreamFromPath("res:/a.dds");
  assert.deepEqual(a, { form: BYTES, data: encode("first") });
  assert.equal(cdn.asked.length, 0, "the first that has it answers");

  const b = await paths.GetStreamFromPath("res:/b.dds");
  assert.deepEqual(b.data, encode("cdn"), "a miss moves on to the next");
  assert.equal(other.asked.length, 0, "a file system for another protocol is never asked");

  assert.equal(await paths.GetStreamFromPath("res:/none.dds"), null, "nobody has it: null, as Carbon's false");
  await assert.rejects(paths.GetStreamFromPath("db:/types/1"), error => error.code === "CJS_BEPATHS_NO_FILE_SYSTEM");
  await assert.rejects(paths.GetStreamFromPath("no-protocol.dds"), TypeError);
});

test("BePaths matches the caller's forms to the file system's, bridging only the cheap gaps", async () =>
{
  const paths = new CjsBluePaths();
  const bytesOnly = memoryFileSystem([ "res" ], [ BYTES ], new Map([ [ "res:/a.json", encode("{\"x\":1}") ] ]));
  paths.RegisterFileSystem(bytesOnly);

  assert.deepEqual(await paths.GetStreamFromPath("res:/a.json", { accept: [ TEXT ] }), { form: TEXT, data: "{\"x\":1}" }, "bytes to text");
  assert.equal(bytesOnly.asked.at(-1).form, BYTES, "asked in the form it produces");
  await assert.rejects(paths.GetStreamFromPath("res:/a.json", { accept: [ VALUE ] }), error => error.code === "CJS_BEPATHS_NO_FORM",
    "bytes to a value is decoding, not a bridge");

  const textOnly = memoryFileSystem([ "text" ], [ TEXT ], new Map([ [ "text:/a", "hé" ] ]));
  const streams = memoryFileSystem([ "stream" ], [ STREAM ], new Map([ [ "stream:/a", encode("streamed") ] ]));
  paths.RegisterFileSystem(textOnly);
  paths.RegisterFileSystem(streams);
  assert.deepEqual(await paths.GetStreamFromPath("text:/a"), { form: BYTES, data: encode("hé") }, "text to bytes");
  assert.deepEqual(await paths.GetStreamFromPath("stream:/a"), { form: BYTES, data: encode("streamed") }, "stream to bytes");
  assert.deepEqual(await paths.GetStreamFromPath("stream:/a", { accept: [ TEXT ] }), { form: TEXT, data: "streamed" }, "stream to text");

  const direct = await paths.GetStreamFromPath("stream:/a", { accept: [ TEXT, STREAM ] });
  assert.equal(direct.form, STREAM, "a form both share wins over a bridge, whatever the preference order");
});

test("BePaths refuses an answer in a form it did not ask for", async () =>
{
  const paths = new CjsBluePaths();
  const liar = memoryFileSystem([ "res" ], [ BYTES ], new Map([ [ "res:/a", encode("a") ] ]));
  liar.GetStreamFromPath = async () => ({ form: TEXT, data: "a" });
  paths.RegisterFileSystem(liar);
  await assert.rejects(paths.GetStreamFromPath("res:/a"), /asked for "bytes" and got "text"/u);
});

test("the fetch file system builds URLs from its table, as the resource manager did", () =>
{
  const fileSystem = new CjsBlueResFileSystemFetch({ fetch: async () => null, paths: { res: "https://host/eve/1/res" } });
  assert.equal(fileSystem.GetPath("res"), "https://host/eve/1/res/");
  assert.equal(fileSystem.BuildUrl("res:/DX9/Model/a.dds"), "https://host/eve/1/res/dx9/model/a.dds", "normalized lower case");
  assert.equal(fileSystem.BuildUrl("res:/a/b.red"), "https://host/eve/1/res/a/b.black", "red reads as black");
  assert.equal(fileSystem.BuildUrl("https://Other/Path.png"), "https://Other/Path.png", "http(s) as it is");
  assert.equal(fileSystem.ResolvePathW("res:/a.dds"), "https://host/eve/1/res/a.dds");

  assert.throws(() => fileSystem.SetPath("cdn", "https://x/"), /does not map the protocol "cdn"/u);
  assert.throws(() => fileSystem.SetPath("http", "https://x/"), /does not map/u);

  const bare = new CjsBlueResFileSystemFetch({ fetch: async () => null });
  assert.throws(() => bare.BuildUrl("res:/a.dds"), error => error.code === "CJS_RESMAN_PATH_PREFIX_UNREGISTERED");
  assert.equal(bare.ResolvePathW("res:/a.dds"), null);

  bare.SetPathResolver(path => `/resource/${path.slice(5)}`);
  assert.equal(bare.BuildUrl("res:/A.dds"), "/resource/a.dds");
  assert.equal(bare.FileExists("res:/a.dds"), false, "a URL cannot be asked synchronously");
});

test("the fetch file system answers in every form it declares", async () =>
{
  const { fetch } = scriptedFetch(() => new Response("{\"a\":1}"));
  const fileSystem = new CjsBlueResFileSystemFetch({ fetch, paths: { res: "https://h/" } });
  assert.deepEqual(await fileSystem.GetStreamFromPath("res:/a.json", { form: BYTES }), { form: BYTES, data: encode("{\"a\":1}") });
  assert.deepEqual(await fileSystem.GetStreamFromPath("res:/a.json", { form: TEXT }), { form: TEXT, data: "{\"a\":1}" });
  assert.deepEqual(await fileSystem.GetStreamFromPath("res:/a.json", { form: VALUE }), { form: VALUE, data: { a: 1 } });
  const stream = await fileSystem.GetStreamFromPath("res:/a.json", { form: STREAM });
  assert.equal(await new Response(stream.data).text(), "{\"a\":1}");
});

test("the default fetch is called on the global, as the browser's fetch requires", async () =>
{
  const browserFetch = globalThis.fetch;
  // A browser's WebIDL fetch throws "Illegal invocation" when called on any other object.
  globalThis.fetch = function (url)
  {
    if (this !== globalThis) throw new TypeError("Illegal invocation");
    return Promise.resolve(new Response(`read ${url}`));
  };
  try
  {
    const fileSystem = new CjsBlueResFileSystemFetch({ paths: { res: "https://h/" }, retries: 0 });
    assert.deepEqual(await fileSystem.GetStreamFromPath("res:/a", { form: TEXT }), { form: TEXT, data: "read https://h/a" });
  }
  finally
  {
    globalThis.fetch = browserFetch;
  }
});

test("the fetch file system reads 404 as absent, retries server errors, and does not retry a client error", async () =>
{
  const absent = new CjsBlueResFileSystemFetch({ fetch: scriptedFetch(() => new Response("", { status: 404 })).fetch, paths: { res: "https://h/" } });
  assert.equal(await absent.GetStreamFromPath("res:/a", { form: BYTES }), null);

  const flaky = scriptedFetch(() => new Response("", { status: 503 }), () => { throw new TypeError("network"); }, () => new Response("ok"));
  const retrying = new CjsBlueResFileSystemFetch({ fetch: flaky.fetch, paths: { res: "https://h/" }, retryDelayMilliseconds: 1 });
  assert.deepEqual(await retrying.GetStreamFromPath("res:/a", { form: TEXT }), { form: TEXT, data: "ok" });
  assert.equal(flaky.calls.length, 3, "two retries, then success");

  const failing = scriptedFetch(() => new Response("", { status: 500, statusText: "Boom" }));
  const exhausted = new CjsBlueResFileSystemFetch({ fetch: failing.fetch, paths: { res: "https://h/" }, retries: 1, retryDelayMilliseconds: 1 });
  await assert.rejects(exhausted.GetStreamFromPath("res:/a", { form: BYTES }), error =>
    error.code === "CJS_RESOURCE_FETCH_FAILED" && error.status === 500 && error.path === "res:/a" && error.url === "https://h/a");
  assert.equal(failing.calls.length, 2, "one retry");

  const forbidden = scriptedFetch(() => new Response("", { status: 403 }));
  const refused = new CjsBlueResFileSystemFetch({ fetch: forbidden.fetch, paths: { res: "https://h/" }, retryDelayMilliseconds: 1 });
  await assert.rejects(refused.GetStreamFromPath("res:/a", { form: BYTES }), error => error.status === 403);
  assert.equal(forbidden.calls.length, 1, "a client error is not retried");
});

test("the fetch file system ends on the caller's abort, a timeout, or a stalled body", async () =>
{
  // The caller's abort: the fetch sees it, and nothing is retried.
  const hanging = scriptedFetch((_url, init) => new Promise((_resolve, reject) =>
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })));
  const fileSystem = new CjsBlueResFileSystemFetch({ fetch: hanging.fetch, paths: { res: "https://h/" }, retryDelayMilliseconds: 1 });
  const controller = new AbortController();
  const read = fileSystem.GetStreamFromPath("res:/a", { form: BYTES, signal: controller.signal });
  controller.abort(new Error("caller gave up"));
  await assert.rejects(read, /caller gave up/u);
  assert.equal(hanging.calls.length, 1, "an abort is not retried");

  // A timeout is a retryable failure.
  const timed = new CjsBlueResFileSystemFetch({ fetch: hanging.fetch, paths: { res: "https://h/" }, retries: 0, timeoutMilliseconds: 20 });
  await assert.rejects(timed.GetStreamFromPath("res:/a", { form: BYTES }), /timed out after 20 ms/u);

  // A body that stops arriving.
  const stalling = scriptedFetch(() => new Response(new ReadableStream({
    start(streamController) { streamController.enqueue(encode("partial")); }
  })));
  const stalled = new CjsBlueResFileSystemFetch({ fetch: stalling.fetch, paths: { res: "https://h/" }, retries: 0, stallMilliseconds: 20 });
  await assert.rejects(stalled.GetStreamFromPath("res:/a", { form: BYTES }), /stalled: no data for 20 ms/u);
});

test("BePaths reads through the fetch file system end to end", async () =>
{
  const { fetch, calls } = scriptedFetch(() => new Response("bytes"));
  const paths = new CjsBluePaths();
  paths.RegisterFileSystem(new CjsBlueResFileSystemFetch({ fetch, paths: { res: "https://h/res/" } }));
  assert.deepEqual(await paths.GetStreamFromPath("res:/a.bin"), { form: BYTES, data: encode("bytes") });
  assert.deepEqual(await paths.GetStreamFromPath("https://cdn/x.bin", { accept: [ TEXT ] }), { form: TEXT, data: "bytes" });
  assert.deepEqual(calls, [ "https://h/res/a.bin", "https://cdn/x.bin" ]);
});

test("the callback file system serves res: through a page's function", async () =>
{
  const seen = [];
  const fileSystem = new CjsBlueResFileSystemCallback(async (path, signal) =>
  {
    seen.push([ path, signal ]);
    return path === "res:/a.bin" ? encode("a") : null;
  });
  const paths = new CjsBluePaths();
  paths.RegisterFileSystem(fileSystem);
  assert.deepEqual(await paths.GetStreamFromPath("res:/a.bin", { accept: [ TEXT ] }), { form: TEXT, data: "a" });
  assert.equal(await paths.GetStreamFromPath("res:/b.bin"), null);
  assert.equal(seen[0][1], null, "no signal given: null");

  const wrong = new CjsBlueResFileSystemCallback(() => "text");
  await assert.rejects(wrong.GetStreamFromPath("res:/a", { form: BYTES }), /must return a Uint8Array or null/u);
  assert.throws(() => new CjsBlueResFileSystemCallback(null), TypeError);
});
