import test from "node:test";
import assert from "node:assert/strict";
import { estimateStorageSize } from "../../../src/resource/storage/storageRecord.js";
import { Worker } from "node:worker_threads";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { CjsStorage, CjsStorageBackend, CjsMemoryStorage, CjsIndexedDBStorage, CjsLocalStorage, CjsStorageFormatCodec } from "../../../src/resource/storage/index.js";

function persistent(options = {})
{
    return new CjsIndexedDBStorage({ indexedDB: new IDBFactory(), keyRange: IDBKeyRange, ...options });
}

test("data estimates exclude allocation overhead and count only a binary view's payload", () =>
{
    const buffer = new ArrayBuffer(1024);
    const view = new Uint8Array(buffer, 100, 3);
    assert.equal(estimateStorageSize(buffer), 1024);
    assert.equal(estimateStorageSize(view), 3);
    assert.equal(estimateStorageSize(new DataView(buffer, 100, 7)), 7);
    assert.equal(estimateStorageSize(new Blob([view])), 3);
    assert.equal(estimateStorageSize([view, view]), 3);
    assert.equal(estimateStorageSize({}), 0);
    assert.equal(estimateStorageSize([]), 0);
    assert.equal(estimateStorageSize(null), 0);
});

test("native bytes, numeric keys, versions and TTL retain their meaning", async () =>
{
    let now = 10;
    const storage = new CjsStorage({ namespace: "test", persistence: false, now: () => now });
    const bytes = new Uint8Array([1, 2, 3]);
    assert.deepEqual(await storage.Write("rows", 1, { bytes, count: 9007199254740993n }),
        { stored: true, cached: true, persisted: false, error: null });
    bytes[0] = 99;
    const result = await storage.Read("rows", 1);
    assert.equal(result.value.bytes[0], 1);
    result.value.bytes[0] = 88;
    assert.equal((await storage.Read("rows", 1)).value.bytes[0], 1);
    assert.equal((await storage.Read("rows", "1")).found, false);
    await storage.Write("rows", "expiring", {}, { kind: "cache", version: "build-1", ttlMs: 20 });
    assert.equal((await storage.Read("rows", "expiring", { version: "build-2" })).reason, "version");
    await storage.Write("rows", "expiring", {}, { kind: "cache", ttlMs: 20 });
    now = 31;
    assert.equal((await storage.Read("rows", "expiring")).reason, "expired");
    await assert.rejects(storage.Write("rows", "bad", {}, { ttlMs: 1 }), /Only cache/);
    await storage.Close();
});

test("memory evicts cache entries but protects unpersisted saves", async () =>
{
    const storage = new CjsStorage({ namespace: "test", memory: { maxEntries: 2 } });
    await storage.Write("rows", "saved", { valuable: true });
    await storage.Write("rows", "old", 1, { kind: "cache" });
    await storage.Write("rows", "new", 2, { kind: "cache" });
    assert.equal((await storage.Read("rows", "old")).found, false);
    assert.equal((await storage.Read("rows", "saved")).value.valuable, true);
    await storage.Write("rows", "saved2", {});
    const failed = await storage.Write("rows", "saved3", {});
    assert.equal(failed.stored, false);
    assert.equal(failed.error.name, "QuotaExceededError");
    assert.equal((await storage.Read("rows", "saved")).found, true);
});

test("a rejected memory-only replacement retains the previous saved value", async () =>
{
    const storage = new CjsStorage({ namespace: "test", memory: { maxBytes: 1500 } });
    await storage.Write("saved", "draft", "original");
    const result = await storage.Write("saved", "draft", "x".repeat(2000));
    assert.equal(result.stored, false);
    assert.equal((await storage.Read("saved", "draft")).value, "original");
});

test("persistent cache budget never evicts user saves or another namespace", async () =>
{
    let now = 0;
    const backend = persistent();
    const storage = new CjsStorage({ namespace: "one", backend, now: () => ++now, maxPersistentCacheBytes: 24 });
    await backend.WriteBatch([{ address: { namespace: "two", collection: "cache", key: 1 }, kind: "cache", value: "other" }]);
    await storage.Write("saved", "draft", "x".repeat(100));
    assert.equal((await storage.Write("cache", "first", "12345678", { kind: "cache" })).persisted, true);
    assert.equal((await storage.Write("cache", "second", "12345678", { kind: "cache" })).persisted, true);
    assert.equal(await backend.Read({ namespace: "one", collection: "cache", key: "first" }), null);
    assert.ok(await backend.Read({ namespace: "one", collection: "saved", key: "draft" }));
    assert.ok(await backend.Read({ namespace: "two", collection: "cache", key: 1 }));
    const huge = await storage.Write("cache", "huge", "x".repeat(100), { kind: "cache" });
    assert.equal(huge.persisted, false);
    assert.equal(huge.cached, true);
    await storage.Close();
});

test("cache estimates are named explicitly and old envelopes still participate in eviction", async () =>
{
    const backend = persistent();
    const storage = new CjsStorage({ namespace: "estimates", backend, maxPersistentCacheBytes: 24 });
    const address = key => ({ namespace: "estimates", collection: "cache", key });
    await backend.WriteBatch([{ address: address("old"), kind: "cache", value: "12345678",
        byteLength: 0, updatedAt: 1, expiresAt: null }]);
    assert.equal((await storage.Write("cache", "new", "12345678", { kind: "cache" })).persisted, true);
    assert.equal(await backend.Read(address("old")), null);
    const record = await backend.Read(address("new"));
    assert.ok(record.estimatedSize > 0);
    assert.equal(Object.hasOwn(record, "byteLength"), false);
    assert.ok(storage.memory.estimatedSize > 0);
    await storage.Close();
    assert.equal(storage.memory.estimatedSize, 0);
});

test("persistent writes acknowledge commit and survive a fresh service with zero memory budget", async () =>
{
    const factory = new IDBFactory();
    const backend = () => new CjsIndexedDBStorage({ name: "survival", indexedDB: factory, keyRange: IDBKeyRange });
    const storage = new CjsStorage({ namespace: "test", backend: backend(), memory: { maxBytes: 0 } });
    const written = await storage.Write("rows", "key", { binary: new Uint8Array([7, 8]), graph: { _type: "Scene", _id: 1, child: { _ref: 1 } } });
    assert.equal(written.persisted, true);
    assert.equal(written.cached, false);
    await storage.Close();
    const next = new CjsStorage({ namespace: "test", backend: backend() });
    const read = await next.Read("rows", "key");
    assert.equal(read.persisted, true);
    assert.deepEqual(read.value.binary, new Uint8Array([7, 8]));
    assert.equal(read.value.graph.child._ref, 1);
    await next.Close();
});

test("persistence failure is visible and memory writes remain ordered", async () =>
{
    const backend = new CjsMemoryStorage();
    backend.persistent = true;
    backend.WriteBatch = async () => { throw new Error("disk offline"); };
    const storage = new CjsStorage({ namespace: "test", backend });
    const writes = [storage.Write("settings", "theme", "a"), storage.Write("settings", "theme", "b")];
    const read = await storage.Read("settings", "theme");
    assert.equal(read.value, "b");
    assert.equal(read.persisted, false);
    for (const result of await Promise.all(writes))
    {
        assert.equal(result.stored, true);
        assert.equal(result.persisted, false);
        assert.equal(result.error.message, "disk offline");
    }
});

test("IndexedDB aborts the entire batch and scans across transaction lifetimes", async () =>
{
    const backend = persistent();
    const record = key => ({ address: { namespace: "test", collection: "rows", key }, kind: "cache", value: key });
    await backend.WriteBatch([record("existing")]);
    await assert.rejects(backend.WriteBatch([record("rolled-back"), { ...record("invalid"), value: () => 1 }]));
    assert.equal(await backend.Read(record("rolled-back").address), null);
    await backend.WriteBatch(Array.from({ length: 260 }, (_, i) => record(i)));
    let count = 0;
    for await (const row of backend.List({ namespace: "test", collection: "rows" }))
    {
        assert.equal(row.address.namespace, "test");
        count++;
        if (count % 100 === 0) await new Promise(resolve => setTimeout(resolve, 1));
    }
    assert.equal(count, 261);
    await backend.Close();
});

test("injected format codecs round-trip compression and preserve codec revision", async () =>
{
    const format = {
        write: value => new TextEncoder().encode(JSON.stringify(value)),
        read: bytes => ({ root: JSON.parse(new TextDecoder().decode(bytes)), reports: [] })
    };
    const codec = new CjsStorageFormatCodec({ id: "fixture.gzip", format, graph: true, compression: "gzip" });
    const storage = new CjsStorage({ namespace: "test", backend: persistent(), codecs: [codec] });
    await storage.Write("scenes", "one", { _type: "Scene", _id: 1, child: { _ref: 1 } }, { codec: codec.id });
    assert.deepEqual((await storage.Read("scenes", "one")).value, { _type: "Scene", _id: 1, child: { _ref: 1 } });
    await assert.rejects(storage.Write("scenes", "bad", {}, { codec: codec.id, codecVersion: 2 }), /not installed/);
    await storage.Close();
});

test("the service and IndexedDB adapter run in a worker and return transferable bytes", async () =>
{
    const worker = new Worker(new URL("./storage-worker.mjs", import.meta.url));
    try
    {
        const result = await new Promise((resolve, reject) =>
        {
            worker.once("message", resolve);
            worker.once("error", reject);
            worker.once("exit", code => { if (code) reject(new Error(`Worker exited ${code}`)); });
        });
        assert.equal(result.persisted, true);
        assert.deepEqual(result.value.bytes, new Uint8Array([3, 1, 4]));
        assert.equal(result.value.id, 9007199254740993n);
    }
    finally { await worker.terminate(); }
});

test("backends extend CjsStorageBackend and declare persistence; the base requires the four record methods", async () =>
{
    const base = new CjsStorageBackend();
    const address = { namespace: "test", collection: "c", key: 1 };
    assert.equal(base.persistent, false);
    await assert.rejects(base.Read(address), /Read must be implemented/);
    await assert.rejects(base.WriteBatch([]), /WriteBatch must be implemented/);
    await assert.rejects(base.Delete(address), /Delete must be implemented/);
    await assert.rejects(base.List({ namespace: "test" }).next(), /List must be implemented/);
    await base.Close();

    const memory = new CjsMemoryStorage();
    const indexed = new CjsIndexedDBStorage({ indexedDB: new IDBFactory(), keyRange: IDBKeyRange });
    const local = new CjsLocalStorage({ storage: { getItem: () => null, setItem() {} } });
    assert.deepEqual([memory.persistent, indexed.persistent, local.persistent], [false, true, true]);
});
