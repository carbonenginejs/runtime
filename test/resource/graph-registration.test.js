import assert from "node:assert/strict";
import test from "node:test";
import { CjsFormat } from "../../src/resource/format/CjsFormat.js";
import { CjsFormatStore } from "../../src/global/blue/CjsFormatStore.js";
import { CjsGraphFormat } from "@carbonenginejs/runtime/resource/formats/graph";
import { CjsGraphBinaryFormat } from "@carbonenginejs/runtime/resource/formats/graphbinary";

test("qualified graph facades satisfy the shared format contract", () =>
{
    for (const Format of [CjsGraphFormat, CjsGraphBinaryFormat])
    {
        CjsFormat.validateContract(Format);
        assert.equal(Format.canWrite("values"), true);
        assert.equal(Format.id, Format.className);
        assert.deepEqual(Format.extensions, []);
        assert.equal(Format.getOutputCapability("values").default, true);
    }
});

test("explicit registration routes Graph formats by name or header without claiming extensions", () =>
{
    const store = new CjsFormatStore();
    for (const Format of [CjsGraphFormat, CjsGraphBinaryFormat]) store.Register(Format, { byName: true });
    store.Register(CjsGraphFormat, { byName: true });
    assert.deepEqual(store.Extensions(), []);
    assert.equal(store.Has("json"), false);
    assert.equal(store.Get(CjsGraphFormat.id).length, 1);
    const graph = { _type: "NotInstalled", name: "plain values" };
    for (const Format of [CjsGraphFormat, CjsGraphBinaryFormat])
    {
        const data = Format.write(graph, { input: "values" });
        assert.equal(store.Resolve(Format.id).Format, Format);
        assert.equal(store.Resolve(null, data).Format, Format);
        assert.deepEqual(store.Resolve(null, data).Read(data), { root: graph, reports: [] });
    }
    assert.equal(store.Resolve(null, new Uint8Array([1, 2, 3])), null);
    assert.equal(store.Resolve(null), null);
    store.Clear();
    assert.equal(store.Has(CjsGraphFormat.id), false);
    assert.equal(store.Resolve(null, CjsGraphFormat.write(graph, { input: "values" })), null);
});

test("a single named route still checks the header and names cannot collide", () =>
{
    const store = new CjsFormatStore().Register(CjsGraphFormat, { byName: true });
    assert.equal(store.Resolve(null, new Uint8Array([1])), null);
    class Collision extends CjsGraphFormat {}
    assert.throws(() => store.Register(Collision, { byName: true }), /already registered/u);
    assert.throws(() => new CjsFormatStore().Register(CjsGraphFormat), error => error.code === "CJS_FORMAT_STORE_NO_EXTENSIONS");
});

test("invalid registration never publishes partial named or extension routes", () =>
{
    class Invalid
    {
        static id = "Invalid";
        static read() {}
    }
    for (const extensions of [[""], ["valid", ""]])
    {
        Invalid.extensions = extensions;
        const store = new CjsFormatStore();
        assert.throws(() => store.Register(Invalid, { byName: true }), /not an extension/u);
        assert.equal(store.Has(Invalid.id), false);
        assert.equal(store.Resolve(Invalid.id), null);
        assert.deepEqual(store.Extensions(), []);
    }
});

test("explicit-only named readers cannot capture header discovery", () =>
{
    class ExplicitOnly
    {
        static id = "ExplicitOnly";
        static extensions = [];
        static read() {}
    }
    const store = new CjsFormatStore().Register(ExplicitOnly, { byName: true });
    assert.equal(store.Resolve(ExplicitOnly.id).Format, ExplicitOnly);
    assert.equal(store.Resolve(null, Uint8Array.of(255)), null);
    store.Register(CjsGraphFormat, { byName: true });
    const bytes = CjsGraphFormat.write({ _type: "Unregistered" }, { input: "values" });
    assert.equal(store.Resolve(null, bytes).Format, CjsGraphFormat);
});
