import test from "node:test";
import assert from "node:assert/strict";
import { CjsStorage, CjsMemoryStorage } from "../../../src/resource/storage/index.js";

function gate()
{
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

test("a delayed backend read cannot refill memory after a newer write or delete", { timeout: 5000 }, async () =>
{
    for (const mutation of ["write", "delete", "purge"])
    {
        const backend = new CjsMemoryStorage();
        backend.capabilities.persistent = true;
        const storage = new CjsStorage({ namespace: "race", backend });
        await storage.Write("records", "key", "old");
        await storage.memory.Close();
        const started = gate(), release = gate();
        const read = backend.Read.bind(backend);
        backend.Read = async address => {
            const value = await read(address);
            started.resolve();
            await release.promise;
            return value;
        };
        const first = storage.Read("records", "key");
        await started.promise;
        const change = mutation === "write" ? storage.Write("records", "key", "new")
            : mutation === "delete" ? storage.Delete("records", "key")
                : storage.Purge({ includeSaved: true });
        const last = storage.Read("records", "key");
        release.resolve();
        const [before, , after] = await Promise.all([first, change, last]);
        assert.equal(before.value, "old");
        if (mutation === "write") assert.equal(after.value, "new");
        else assert.equal(after.found, false);
        await storage.Close();
    }
});

test("listing snapshots in queue order, independent of when its result is consumed", { timeout: 5000 }, async () =>
{
    const backend = new CjsMemoryStorage();
    backend.capabilities.persistent = true;
    const storage = new CjsStorage({ namespace: "list", backend });
    await storage.Write("records", "a", 1);
    await storage.memory.Close();
    const started = gate(), release = gate();
    const list = backend.List.bind(backend);
    backend.List = async function* (query) {
        started.resolve();
        await release.promise;
        yield* list(query);
    };
    const snapshot = storage.List("records");
    assert.equal(typeof snapshot.then, "function");
    await started.promise;
    const write = storage.Write("records", "b", 2);
    release.resolve();
    await write;
    assert.deepEqual((await snapshot).map(row => row.key), ["a"]);
    assert.deepEqual((await storage.List("records")).map(row => row.key).sort(), ["a", "b"]);
    await storage.Close();
});

test("codec failures reject without poisoning the queue; inputs are captured on invocation", async () =>
{
    const storage = new CjsStorage({ namespace: "failure", codecs: [{
        id: "broken", version: 1, Encode: async value => value,
        Decode: async () => { throw Error("decode failed"); }
    }] });
    await storage.Write("records", "key", 1, { codec: "broken" });
    const failure = assert.rejects(storage.Read("records", "key"), /decode failed/);
    const value = { count: 1 };
    const write = storage.Write("records", "key", value);
    value.count = 999;
    await Promise.all([failure, write]);
    assert.deepEqual((await storage.Read("records", "key")).value, { count: 1 });
    let invalid;
    assert.doesNotThrow(() => { invalid = storage.Write("records", "bad", () => {}); });
    await assert.rejects(invalid);
    await assert.rejects(storage.Purge({ includeSaved: "yes" }), /boolean/);
    await storage.Write("records", "next", null);
    await storage.Close();
});

test("close drains an accepted read and its cache fill, rejects later work and closes once", { timeout: 5000 }, async () =>
{
    const backend = new CjsMemoryStorage();
    backend.capabilities.persistent = true;
    const storage = new CjsStorage({ namespace: "close", backend });
    await storage.Write("records", "key", 1);
    await storage.memory.Close();
    const started = gate(), release = gate();
    const read = backend.Read.bind(backend);
    let closes = 0;
    backend.Close = async () => { closes++; };
    backend.Read = async address => { started.resolve(); await release.promise; return read(address); };
    const reading = storage.Read("records", "key");
    await started.promise;
    const closing = storage.Close();
    assert.equal(storage.Close(), closing);
    await assert.rejects(storage.Read("records", "key"), /closed/);
    await assert.rejects(storage.Write("records", "key", 2), /closed/);
    await assert.rejects(storage.Delete("records", "key"), /closed/);
    await assert.rejects(storage.List(), /closed/);
    await assert.rejects(storage.Purge(), /closed/);
    assert.equal(closes, 0);
    release.resolve();
    assert.equal((await reading).value, 1);
    await closing;
    assert.equal(closes, 1);
    assert.equal(storage.memory.records.size, 0);
});

test("shutdown attempts both adapters and preserves failure for every caller", async () =>
{
    const backend = new CjsMemoryStorage();
    const storage = new CjsStorage({ namespace: "close-errors", backend });
    const calls = [];
    storage.memory.Close = async () => { calls.push("memory"); throw Error("memory failed"); };
    backend.Close = async () => { calls.push("backend"); throw Error("backend failed"); };
    const closing = storage.Close();
    await assert.rejects(closing, error => error.errors.length === 2);
    assert.equal(storage.Close(), closing);
    assert.deepEqual(calls, ["memory", "backend"]);
});
