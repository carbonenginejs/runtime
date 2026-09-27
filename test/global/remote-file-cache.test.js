import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { BlueResFileSystemRemote, CjsBluePaths, RemoteFileCache } from "../../npm/dist/global/blue/index.js";
import { normalizeResPath } from "../../npm/dist/global/utils/index.js";
import { localFileSystem } from "../support/localFileSystem.js";

// Carbon blue/src/RemoteFileCache.cpp, BlueResFileSystemRemote.cpp and
// BluePaths.cpp: an index says a file CAN be had; the cache folder says its
// bytes are HERE. The two answers differ, and the low-detail swap depends on
// the second.

const md5 = bytes => createHash("md5").update(bytes).digest("hex");
const bytesOf = text => new TextEncoder().encode(text);

const HULL = bytesOf("hull bytes");
const TEXTURE = bytesOf("texture bytes");

const INDEX = [
  `res:/model/ship/hull.gr2,ab/ab01_${md5(HULL)},${md5(HULL)},${HULL.byteLength},99`,
  `res:/model/ship/hull.black,cd/cd02_x,${md5(HULL)},${HULL.byteLength}`,
  `res:/texture/a.dds,ef/ef03_${md5(TEXTURE)},${md5(TEXTURE)},${TEXTURE.byteLength}\r`,
  ""
].join("\n");

/** A fetch answering from `served` (url to bytes), recording each url asked. */
function serve(served)
{
  const asked = [];
  const fetch = async url =>
  {
    asked.push(url);
    const bytes = served.get(url);
    return bytes
      ? { ok: true, arrayBuffer: async () => bytes.slice().buffer }
      : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  return { fetch, asked };
}

function createCache(options = {})
{
  const store = options.store ?? localFileSystem();
  const cache = new RemoteFileCache({ localFileSystem: store, fetch: options.fetch, md5 });
  cache.SetServer("http://primary");
  cache.AddFileIndex(INDEX);
  return { cache, store };
}

test("normalizeResPath follows Carbon's NormalizeResPath", () =>
{
  assert.equal(normalizeResPath("res:\\Model\\\\Ship/./a/../Hull.GR2"), "res:/model/ship/hull.gr2");
  assert.equal(normalizeResPath("res:/a/../.."), null, "climbing above the root is invalid");
  assert.equal(normalizeResPath("cache:/ResFiles/x"), null, "only res: and dynamic: are res paths");
  assert.equal(normalizeResPath("dynamic:/Gradient_1D/AbC/="), "dynamic:/gradient_1d/AbC/=");
});

test("the index answers FileExists; the cache folder answers IsCachedLocally", () =>
{
  const { cache, store } = createCache();
  assert.equal(cache.FileExists("res:/Model/Ship/Hull.gr2"), true, "lookups normalize");
  assert.equal(cache.FileExists("res:/model/ship/missing.gr2"), false);

  assert.equal(cache.IsCachedLocally("res:/model/ship/hull.gr2"), false, "listed is not here");
  store.present.add(`cache:/ResFiles/ab/ab01_${md5(HULL)}`);
  assert.equal(cache.IsCachedLocally("res:/model/ship/hull.gr2"), true);

  assert.equal(cache.GetLocallyCachedName("res:/model/ship/hull.gr2"), `cache:/ResFiles/ab/ab01_${md5(HULL)}`);
  assert.equal(cache.GetLocallyCachedName("res:/unlisted.gr2"), "res:/unlisted.gr2");
});

test("index parsing reproduces Carbon's column split", () =>
{
  const { cache } = createCache();

  // A later entry for the same path replaces the earlier (cpp:368).
  cache.AddFileIndex("res:/model/ship/hull.gr2,zz/zz99,feed,7\n");
  assert.equal(cache.GetLocallyCachedName("res:/model/ship/hull.gr2"), "cache:/ResFiles/zz/zz99");

  // A short line wraps back to its start, because npos + 1 is 0: "a,b" reads
  // checksum "a" and size "b" (atoi 0). It is listed all the same.
  cache.AddFileIndex("res:/short.gr2,b");
  assert.equal(cache.FileExists("res:/short.gr2"), true);
  assert.equal(cache.GetLocallyCachedName("res:/short.gr2"), "cache:/ResFiles/b");
});

test("ListDir and IsDirectory answer from the folder index", () =>
{
  const { cache } = createCache();
  assert.equal(cache.IsDirectory("res:/model/ship"), true);
  assert.equal(cache.IsDirectory("res:/model/ship/hull.gr2"), false);
  assert.deepEqual(cache.ListDir("res:/model"), [ "ship" ]);
  assert.deepEqual(cache.ListDir("res:/model/ship/"), [ "hull.black", "hull.gr2" ]);
  assert.throws(() => cache.ListDir("res:/nothing"), /^Error: Directory not found$/u);
  assert.throws(() => cache.ListDir("cache:/x"), /^Error: Not a valid res path$/u);
});

test("a listed file downloads, verifies and is cached; the next read comes from the cache", async () =>
{
  const { fetch, asked } = serve(new Map([ [ `http://primary/res/ab/ab01_${md5(HULL)}`, HULL ] ]));
  const { cache, store } = createCache({ fetch });

  const first = await cache.GetStreamFromPath("res:/model/ship/hull.gr2");
  assert.deepEqual(first, HULL);
  assert.equal(cache.filesDownloaded, 1);
  assert.equal(cache.filesCached, 1);
  assert.equal(cache.IsCachedLocally("res:/model/ship/hull.gr2"), true);

  const second = await cache.GetStreamFromPath("res:/model/ship/hull.gr2");
  assert.deepEqual(second, HULL);
  assert.equal(asked.length, 1, "the cached copy was downloaded again");
  assert.equal(cache.filesUsedFromCache, 1);
  assert.equal(store.files.size, 1);

  await assert.rejects(cache.GetStreamFromPath("res:/unlisted.gr2"), /^Error: File does not exist on remote server$/u);
});

test("a download that does not match the index is refused and not cached", async () =>
{
  // The index md5 and size are the ORIGINAL file's. Bytes in any other form -
  // a converted representation - fail here, and must not be stored under the
  // original's content address.
  const wrongSize = serve(new Map([ [ `http://primary/res/ab/ab01_${md5(HULL)}`, bytesOf("converted") ] ]));
  const sized = createCache({ fetch: wrongSize.fetch });
  await assert.rejects(sized.cache.GetStreamFromPath("res:/model/ship/hull.gr2"), /^Error: Size does not match expected value$/u);
  assert.equal(sized.store.files.size, 0);

  const sameSize = bytesOf("hull BYTES");
  const wrongSum = serve(new Map([ [ `http://primary/res/ab/ab01_${md5(HULL)}`, sameSize ] ]));
  const summed = createCache({ fetch: wrongSum.fetch });
  await assert.rejects(summed.cache.GetStreamFromPath("res:/model/ship/hull.gr2"), /^Error: Checksum does not match expected value$/u);
  assert.equal(summed.store.files.size, 0);
});

test("a corrupt cached copy is removed and downloaded again", async () =>
{
  const cachedName = `cache:/ResFiles/ab/ab01_${md5(HULL)}`;
  const store = localFileSystem([], new Map([ [ cachedName, bytesOf("corrupted!") ] ]));
  const { fetch, asked } = serve(new Map([ [ `http://primary/res/ab/ab01_${md5(HULL)}`, HULL ] ]));
  const { cache } = createCache({ fetch, store });

  assert.deepEqual(await cache.GetStreamFromPath("res:/model/ship/hull.gr2"), HULL);
  assert.equal(asked.length, 1);
  assert.deepEqual(store.files.get(cachedName), HULL);
});

test("a failed primary download falls back to the backup server and reports both", async () =>
{
  const { fetch, asked } = serve(new Map([ [ `http://backup/res/ab/ab01_${md5(HULL)}`, HULL ] ]));
  const { cache } = createCache({ fetch });
  cache.backupServer = "http://backup";
  cache.primaryServerFailThreshold = 0;
  const reports = [];
  cache.RegisterOnServerFailedCallback((which, resPath, server) => reports.push([ which, resPath, server ]));

  assert.deepEqual(await cache.GetStreamFromPath("res:/model/ship/hull.gr2"), HULL);
  assert.deepEqual(asked, [ `http://primary/res/ab/ab01_${md5(HULL)}`, `http://backup/res/ab/ab01_${md5(HULL)}` ]);
  // Past the threshold the backup replaces the primary before the report is
  // made, so the report names the backup (cpp:163-178).
  assert.equal(cache.server, "http://backup");
  assert.deepEqual(reports, [ [ "Primary", "res:/model/ship/hull.gr2", "http://backup" ] ]);
});

test("the remote file system substitutes black for red", async () =>
{
  const { cache } = createCache();
  const remote = new BlueResFileSystemRemote(cache);
  assert.equal(remote.FileExists("res:/model/ship/hull.red"), true);
  const results = new Set();
  remote.GetDirectoryContents("res:/model/ship", results);
  assert.deepEqual([ ...results ].sort(), [ "hull.gr2", "hull.red" ]);
  remote.GetDirectoryContents("res:/nothing", results);
  assert.equal(results.size, 2, "a missing directory adds nothing");
  assert.equal(await remote.GetStreamFromPath("res:/unlisted.gr2"), null);
  assert.equal(remote.ResolvePath("res:/unlisted.gr2"), null);
});

test("paths separates listed from here, and neither is the resource manager's", () =>
{
  const { cache, store } = createCache();
  const paths = new CjsBluePaths();
  const local = localFileSystem([ "res:/local/only.dds" ]);
  paths.SetLocalFileSystem(local);
  paths.SetRemoteFileCache(cache);
  paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));

  assert.equal(paths.FileExists("res:/model/ship/hull.gr2"), true, "listed");
  assert.equal(paths.FileExistsLocally("res:/model/ship/hull.gr2"), false, "listed is not here");
  assert.equal(paths.FileNeedsDownload("res:/model/ship/hull.gr2"), true);

  store.present.add(`cache:/ResFiles/ab/ab01_${md5(HULL)}`);
  assert.equal(paths.FileExistsLocally("res:/model/ship/hull.gr2"), true);
  assert.equal(paths.FileNeedsDownload("res:/model/ship/hull.gr2"), false);

  assert.equal(paths.FileExistsLocally("res:/local/only.dds"), true, "the local file system counts");
  assert.equal(paths.FileExists("res:/local/only.dds"), true);
  assert.equal(paths.FileNeedsDownload("res:/local/only.dds"), false);

  assert.equal(paths.IsDirectory("res:/model"), true);
  assert.deepEqual([ ...paths.GetDirectoryContents("res:/model") ], [ "ship" ]);

  const empty = new CjsBluePaths();
  assert.equal(empty.FileExists("res:/model/ship/hull.gr2"), false, "nothing installed, nothing exists");
  assert.equal(empty.FileExistsLocally("res:/model/ship/hull.gr2"), false);
});
