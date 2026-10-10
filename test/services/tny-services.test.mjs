import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { Tny, TnyService } from "../../src/core/services/index.js";
import { CjsIndexedDBStorage } from "../../src/resource/storage/index.js";

class StoredService extends TnyService
{
    static storagePolicy = {};
    #storage = null;
    constructor(storage) { super(); this.#storage = storage; }
    Write(key, value, options) { return this.#storage.Write(key, value, options); }
    Read(key) { return this.#storage.Read(key); }
}

test("services construct lazily once, inject null or an isolated store, and preserve null data", async () =>
{
    const tny = new Tny();
    let constructions = 0;
    class Stateless extends TnyService
    {
        constructor(storage, options) { super(); assert.equal(storage, null); assert.equal(options.answer, 42); constructions++; }
    }
    tny.services.Register("stateless", Stateless, { answer: 42 });
    tny.services.Register("fsd", StoredService).Register("sde", StoredService);
    assert.equal(constructions, 0);
    assert.equal(tny.services.Get("stateless"), tny.services.Get("stateless"));
    assert.equal(constructions, 1);
    assert.equal(tny.services.Get("missing"), null);
    await tny.services.Get("fsd").Write("same", null);
    assert.equal((await tny.services.Get("fsd").Read("same")).value, null);
    assert.equal((await tny.services.Get("sde").Read("same")).found, false);
    assert.equal(tny.storage.CreateStore("fsd"), tny.storage.CreateStore("fsd"));
    await tny.Close();
});

test("invalid policies fail at registration before construction or publication", async () =>
{
    const tny = new Tny();
    for (const policy of [undefined, false, [], { persist: true }, { columns: [] }, { [Symbol("x")]: true }])
    {
        class Invalid extends TnyService { static storagePolicy = policy; constructor() { throw Error("must not construct"); } }
        assert.throws(() => tny.services.Register("invalid", Invalid), /storagePolicy/);
        assert.equal(tny.services.Get("invalid"), null);
    }
    tny.services.Register("valid", StoredService);
    assert.throws(() => tny.services.Register("valid", StoredService), /already registered/);
    await tny.Close();
});

test("purge protects saved data and includes expired cache entries", async () =>
{
    const tny = new Tny({ storage: { now: () => 5 } });
    const a = tny.storage.CreateStore("a"), b = tny.storage.CreateStore("b");
    await a.Write("saved", 1);
    await b.Write("cache", 2, { kind: "cache", ttlMs: 0 });
    assert.deepEqual(await tny.storage.Purge(), { deleted: 1 });
    assert.equal((await a.Read("saved")).found, true);
    assert.deepEqual(await tny.storage.Purge({ includeSaved: true }), { deleted: 1 });
    assert.equal((await a.Read("saved")).found, false);
    await tny.Close();
});

test("persistent data survives owners; purge reaches unopened stores but not another namespace", async () =>
{
    const indexedDB = new IDBFactory();
    const backend = () => new CjsIndexedDBStorage({ indexedDB, keyRange: IDBKeyRange, name: "tny-test" });
    const first = new Tny({ storage: { namespace: "a", backend: backend() } });
    const other = new Tny({ storage: { namespace: "b", backend: backend() } });
    assert.equal((await first.storage.CreateStore("save").Write("key", new Uint8Array([1, 2]))).persisted, true);
    await first.storage.CreateStore("cache").Write("key", 3, { kind: "cache" });
    await other.storage.CreateStore("cache").Write("key", 4, { kind: "cache" });
    await first.Close();
    const second = new Tny({ storage: { namespace: "a", backend: backend() } });
    assert.deepEqual(await second.storage.Purge(), { deleted: 1 });
    assert.deepEqual((await second.storage.CreateStore("save").Read("key")).value, new Uint8Array([1, 2]));
    assert.equal((await other.storage.CreateStore("cache").Read("key")).value, 4);
    await second.Close();
    await other.Close();
});

test("backend failure preserves explicit memory-only acknowledgement and purge errors", async () =>
{
    const backend = {
        capabilities: { persistent: true },
        async Read() { return null; },
        async WriteBatch() { throw Error("offline"); },
        async Delete() { throw Error("cannot delete"); },
        async *List() {},
        async Close() {}
    };
    const tny = new Tny({ storage: { backend } });
    const store = tny.storage.CreateStore("save");
    const result = await store.Write("key", 5);
    assert.equal(result.stored, true);
    assert.equal(result.persisted, false);
    assert.equal(result.error.message, "offline");
    await assert.rejects(tny.storage.Purge({ includeSaved: true }), /cannot delete/);
    assert.equal((await store.Read("key")).value, 5);
    await tny.Close();
});

test("shutdown lets services flush, closes once despite errors, and invalidates handles", async () =>
{
    const tny = new Tny();
    const store = tny.storage.CreateStore("save");
    let closed = 0;
    class Flush extends TnyService
    {
        async Close() { closed++; await store.Write("last", 1); }
    }
    class Fail extends TnyService { async Close() { throw Error("failure"); } }
    tny.services.Register("flush", Flush).Register("fail", Fail);
    tny.services.Get("flush"); tny.services.Get("fail");
    const closing = tny.Close();
    assert.equal(tny.Close(), closing);
    await assert.rejects(closing, /shutdown failed/);
    assert.equal(closed, 1);
    await assert.rejects(store.Read("last"), /closed/);
    assert.throws(() => tny.services.Get("flush"), /closed/);
});

test("constructor failure is retryable and recursive construction is diagnosed", async () =>
{
    const tny = new Tny();
    let fail = true;
    class Retry extends TnyService { constructor() { super(); if (fail) throw Error("retry"); } }
    class Cycle extends TnyService { constructor() { super(); tny.services.Get("cycle"); } }
    tny.services.Register("retry", Retry).Register("cycle", Cycle);
    assert.throws(() => tny.services.Get("retry"), /retry/);
    fail = false;
    assert.ok(tny.services.Get("retry"));
    assert.throws(() => tny.services.Get("cycle"), /Circular/);
    await tny.Close();
});

test("standalone service/storage owner runs inside a worker without browser globals", async () =>
{
    const moduleUrl = new URL("../../src/core/services/index.js", import.meta.url).href;
    const worker = new Worker(`
        const { parentPort } = require('node:worker_threads');
        (async () => {
            const { Tny } = await import(${JSON.stringify(moduleUrl)});
            const tny = new Tny();
            const store = tny.storage.CreateStore('worker');
            await store.Write('bytes', new Uint8Array([7,8]));
            parentPort.postMessage((await store.Read('bytes')).value);
            await tny.Close();
        })().catch(error => { throw error; });
    `, { eval: true });
    let value = null;
    await new Promise((resolve, reject) => {
        worker.once("message", message => { value = message; });
        worker.once("error", reject);
        worker.once("exit", code => code === 0 ? resolve() : reject(Error("Worker exit " + code)));
    });
    assert.deepEqual(value, new Uint8Array([7,8]));
});
