import test from "node:test";
import assert from "node:assert/strict";
import { CjsLocalStorage, CjsStorage } from "../../../src/resource/storage/index.js";

function host()
{
    const items = new Map([["unrelated", "keep"]]);
    return { items, fail: false, writes: 0,
        getItem(key) { return items.get(key) ?? null; },
        setItem(key, value) { if (this.fail) throw new DOMException("Full", "QuotaExceededError"); this.writes++; items.set(key, value); }
    };
}
const record = (key, value, namespace = "a") => ({ address: { namespace, collection: "store", key }, value });

test("localStorage batches persist scoped JSON and byte spans in one replacement", async () =>
{
    const storage = host();
    const backend = new CjsLocalStorage({ storage });
    const data = new Uint8Array([9, 1, 2, 8]);
    await backend.WriteBatch([record(34, { name: "Tritanium", _ref: "literal" }), record("34", data.subarray(1, 3)),
        record("buffer", data.buffer), record(34, "other", "b")]);
    assert.equal(storage.writes, 1);
    const reopened = new CjsLocalStorage({ storage });
    assert.deepEqual((await reopened.Read(record("34").address)).value, new Uint8Array([1, 2]));
    assert.deepEqual(new Uint8Array((await reopened.Read(record("buffer").address)).value), data);
    assert.equal((await reopened.Read(record(34).address)).value.name, "Tritanium");
    assert.equal((await reopened.Read(record(34, null, "b").address)).value, "other");
    await reopened.Delete(record(34).address);
    assert.equal(await reopened.Read(record(34).address), null);
    assert.equal(storage.items.get("unrelated"), "keep");
});

test("quota and encoding failures retain the entire previous batch", async () =>
{
    const storage = host();
    const backend = new CjsLocalStorage({ storage });
    await backend.WriteBatch([record("old", 1)]);
    const before = storage.items.get("carbonenginejs-storage");
    for (const value of [undefined, Infinity, -0, 1n, new Date(), new Map(), new Float32Array([1]), { nested: undefined }])
    {
        await assert.rejects(backend.WriteBatch([record("old", 2), record("bad", value)]), /codec/);
        assert.equal(storage.items.get("carbonenginejs-storage"), before);
    }
    storage.fail = true;
    await assert.rejects(backend.WriteBatch([record("old", 3), record("new", 4)]), { name: "QuotaExceededError" });
    assert.equal(storage.items.get("carbonenginejs-storage"), before);
});

test("manager reports memory fallback and purge respects saved data and namespaces", async () =>
{
    const local = host();
    const backend = new CjsLocalStorage({ storage: local });
    const storage = new CjsStorage({ namespace: "a", backend });
    const other = new CjsStorage({ namespace: "b", backend: new CjsLocalStorage({ storage: local }) });
    assert.equal((await storage.Write("store", "save", "yes")).persisted, true);
    await storage.Write("store", "cache", "a", { kind: "cache" });
    await other.Write("store", "cache", "b", { kind: "cache" });
    assert.deepEqual(await storage.Purge(), { deleted: 1 });
    assert.equal((await storage.Read("store", "save")).value, "yes");
    assert.equal((await other.Read("store", "cache")).value, "b");
    local.fail = true;
    const result = await storage.Write("store", "memory", 7);
    assert.equal(result.persisted, false);
    assert.equal(result.cached, true);
    assert.equal(result.error.name, "QuotaExceededError");
    await storage.Close(); await other.Close();
});

test("corrupt documents are surfaced and never replaced by an empty store", async () =>
{
    const storage = host();
    storage.items.set("carbonenginejs-storage", "not-json");
    const backend = new CjsLocalStorage({ storage });
    await assert.rejects(backend.Read(record("x").address));
    await assert.rejects(backend.WriteBatch([record("x", 1)]));
    assert.equal(storage.items.get("carbonenginejs-storage"), "not-json");
});
