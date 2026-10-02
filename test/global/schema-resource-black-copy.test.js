import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { Copier } from "../../src/global/blue/Copier.js";
import { CjsBlackReader } from "../../src/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackSchemaRegistry } from "../../src/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { classStructureLayout } from "../../src/resource/formats/black/core/blackClassStructures.js";


const member = (name, kind, extra = {}) => ({
    name, key: name, type: { kind }, edit: { persist: true }, ...extra
});

class ResourceLeaf
{
    value = 1;
}
CjsSchema.define(ResourceLeaf, { className: "ResourceBlackCopyLeaf", fields: {
    value: [CjsSchema.meta.type.int32, CjsSchema.meta.blue.persist]
} });

class ResourceHolder
{
    count = 0;
    _cache = new ResourceLeaf();
    ordinary = null;
}
CjsSchema.define(ResourceHolder, { className: "ResourceBlackCopyHolder", fields: {
    count: [CjsSchema.meta.type.uint32, CjsSchema.meta.blue.persist],
    // Contradictory persistence flags must never override the runtime-only fact.
    _cache: [CjsSchema.meta.type.resource(ResourceLeaf), CjsSchema.meta.blue.persist],
    ordinary: [CjsSchema.meta.type.objectRef(ResourceLeaf), CjsSchema.meta.blue.persist]
} });

class ResourceBase
{
    _baseCache = new ResourceLeaf();
}
CjsSchema.define(ResourceBase, { className: "ResourceBlackCopyBase", members: [
    member("cache", "objectRef", { key: "_baseCache", type: { kind: "objectRef", className: "ResourceBlackCopyLeaf" } })
] });

class ResourceDerived extends ResourceBase
{
    _cache = new ResourceLeaf();
}
CjsSchema.define(ResourceDerived, { className: "ResourceBlackCopyDerived", members: [
    member("cache", "objectRef", {
        key: "_cache", type: { kind: "objectRef", className: "ResourceBlackCopyLeaf", runtimeOnly: true }, edit: {}
    })
] });

class ResourceProperty extends ResourceBase
{
    get cache() { throw new Error("resource property getter must not run"); }
}
CjsSchema.define(ResourceProperty, { className: "ResourceBlackCopyProperty", properties: [
    member("cache", "objectRef", { type: { kind: "objectRef", runtimeOnly: true } })
] });

test("Copier preserves a destination resource and clone keeps its constructor resource", () =>
{
    const source = new ResourceHolder();
    source.count = 7;
    source._cache.value = 91;
    source.ordinary = new ResourceLeaf();
    source.ordinary.value = 13;
    const destination = new ResourceHolder();
    const cache = destination._cache;
    cache.value = 42;

    assert.equal(new Copier().CopyTo(source, destination), destination);
    assert.equal(destination.count, 7);
    assert.equal(destination._cache, cache);
    assert.equal(destination._cache.value, 42);
    assert.notEqual(destination.ordinary, source.ordinary);
    assert.equal(destination.ordinary.value, 13, "ordinary objectRef is the negative control");

    const clone = new Copier().CloneTo(source);
    assert.notEqual(clone._cache, source._cache);
    assert.equal(clone._cache.value, 1, "clone retains the constructor default");
    assert.equal(clone.ordinary.value, 13);
});

test("a runtime-only stored name blocks inherited copy and Black codec fallback", () =>
{
    const source = new ResourceDerived();
    source._baseCache.value = 23;
    source._cache.value = 99;
    const destination = new ResourceDerived();
    const baseCache = destination._baseCache;
    const cache = destination._cache;
    assert.equal(new Copier().CopyTo(source, destination), destination);
    assert.equal(destination._baseCache, baseCache);
    assert.equal(destination._baseCache.value, 1);
    assert.equal(destination._cache, cache);
    assert.deepEqual(CjsBlackSchemaRegistry.fromClassInfo(CjsSchema.getSchema(ResourceDerived)).fields, []);
});

test("runtime-only live properties do not shadow inherited native stored members", () =>
{
    const source = new ResourceProperty();
    source._baseCache.value = 17;
    const clone = new Copier().CloneTo(source);
    assert.equal(clone._baseCache.value, 17);
    assert.notEqual(clone._baseCache, source._baseCache);
    const shape = CjsBlackSchemaRegistry.fromClassInfo(CjsSchema.getSchema(ResourceProperty));
    assert.deepEqual(shape.fields.map(field => field.name), ["cache"]);
    assert.equal(shape.fields[0].key, "_baseCache");

    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "ResourceBlackCopyProperty", [["cache", u32(0)]]));
    const options = { schema: { ResourceBlackCopyProperty: { cache: "object" } } };
    assert.equal(new CjsBlackReader(bytes, options).ReadPayload().object.cache, null);
});

test("canonical Black omits runtime resources even with PERSIST and refuses their wire input", () =>
{
    const shape = CjsBlackSchemaRegistry.fromClassInfo(CjsSchema.getSchema(ResourceHolder));
    assert.deepEqual(shape.fields.map(field => field.name), ["count", "ordinary"]);
    assert.throws(() => CjsBlackSchemaRegistry.fromDeclaredType({ kind: "objectRef", runtimeOnly: true }), /Runtime-only fields have no Black codec/);

    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "ResourceBlackCopyHolder", [["count", u32(5)]]));
    assert.equal(new CjsBlackReader(bytes, { schema: null }).ReadPayload().object.count, 5);
    const root = new CjsBlackReader(bytes, { schema: null }).ReadRuntime().root;
    assert.equal(root.count, 5);
    assert.equal(root._cache.value, 1);
    const invalid = new BlackFixture();
    const invalidBytes = invalid.Finish(invalid.Object(1, "ResourceBlackCopyHolder", [["_cache", new Uint8Array()]]));
    for (const mode of ["ReadPayload", "ReadRuntime"])
    {
        assert.throws(() => new CjsBlackReader(invalidBytes, { schema: null })[mode](), /No persisted member declared/);
    }
});

test("legacy runtime and payload reject resolved resource routes before decoding bytes", () =>
{
    for (const [wireName, spec] of [["_cache", "object"], ["cachedResource", { type: "object", field: "_cache" }]])
    {
        const fixture = new BlackFixture();
        // There is deliberately no object value. Decoder entry would fail with
        // an out-of-bounds error instead of the runtime-only declaration error.
        const bytes = fixture.Finish(fixture.Object(1, "ResourceBlackCopyHolder", [[wireName, new Uint8Array()]]));
        const options = { schema: { ResourceBlackCopyHolder: { [wireName]: spec } } };
        for (const mode of ["ReadPayload", "ReadRuntime"])
        {
            assert.throws(() => new CjsBlackReader(bytes, options)[mode](), /Runtime-only member ResourceBlackCopyHolder\._cache cannot be read from Black/);
        }
    }

    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "ResourceBlackCopyDerived", [["cache", new Uint8Array()]]));
    const options = { schema: { ResourceBlackCopyDerived: { cache: "object" } } };
    assert.throws(() => new CjsBlackReader(bytes, options).ReadPayload(), /Runtime-only member ResourceBlackCopyDerived\.cache/);
});

test("legacy document reads reject known resource conflicts before decoding", () =>
{
    const invalid = new BlackFixture();
    const invalidBytes = invalid.Finish(invalid.Object(1, "ResourceBlackCopyHolder", [["cachedResource", new Uint8Array()]]));
    assert.throws(() => new CjsBlackReader(invalidBytes, {
        schema: { ResourceBlackCopyHolder: { cachedResource: { type: "object", field: "_cache" } } }
    }).ReadDocument(), /Runtime-only member ResourceBlackCopyHolder\._cache cannot be read from Black/);

    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "ResourceBlackCopyDocumentUnknown", [["_cache", u32(0)]]));
    const document = new CjsBlackReader(bytes, {
        schema: { ResourceBlackCopyDocumentUnknown: { _cache: "object" } }
    }).ReadDocument();
    assert.equal(document.nodes[0].fields._cache, null, "class-free documents keep caller-defined wire fields");
});

test("legacy guard preserves class-free and undeclared caller-class decoding", () =>
{
    class Caller {}
    for (const classes of [undefined, { ResourceBlackCopyUnregistered: Caller }])
    {
        const fixture = new BlackFixture();
        const bytes = fixture.Finish(fixture.Object(1, "ResourceBlackCopyUnregistered", [["_cache", u32(0)]]));
        const options = { schema: { ResourceBlackCopyUnregistered: { _cache: "object" } }, classes };
        assert.equal(new CjsBlackReader(bytes, options).ReadPayload().object._cache, null);
        assert.equal(new CjsBlackReader(bytes, options).ReadRuntime().root._cache, null);
    }
});

test("Black structure layouts exclude marked fields independently of erroneous PERSIST", () =>
{
    class StructureItem
    {
        first = 0;
        _cache = null;
        second = 0;
    }
    class StructureOwner { items = []; }
    CjsSchema.define(StructureItem, { className: "ResourceBlackCopyStructureItem", struct: { size: 8 }, fields: {
        first: [CjsSchema.meta.struct.FLOAT32_1(0), CjsSchema.meta.blue.persist],
        _cache: [CjsSchema.meta.type.resource(ResourceLeaf), CjsSchema.meta.blue.persist],
        second: [CjsSchema.meta.struct.UINT32_1(4), CjsSchema.meta.blue.persist]
    } });
    CjsSchema.define(StructureOwner, { className: "ResourceBlackCopyStructureOwner", fields: {
        items: [CjsSchema.meta.type.list("ResourceBlackCopyStructureItem"), CjsSchema.meta.blue.persist]
    } });
    const layout = classStructureLayout("ResourceBlackCopyStructureOwner", "items");
    assert.equal(layout.size, 8);
    assert.deepEqual(layout.members.map(({ name, offset }) => [name, offset]), [["first", 0], ["second", 4]]);
});

/** Minimal Black framing; each test supplies its own wire fields. */
class BlackFixture
{
    strings = [];
    String(value)
    {
        let index = this.strings.indexOf(value);
        if (index === -1) { index = this.strings.length; this.strings.push(value); }
        return u16(index);
    }
    Object(id, kind, fields = [])
    {
        const parts = [this.String(kind)];
        for (const [name, value] of fields) parts.push(concat([this.String(name), value]));
        const body = concat(parts);
        return concat([u32(id), u32(body.length), body]);
    }
    Finish(root)
    {
        const parts = [u16(this.strings.length)];
        for (const value of this.strings) parts.push(concat([new TextEncoder().encode(value), new Uint8Array(1)]));
        const strings = concat(parts);
        return concat([u32(0xb1acf11e), u32(1), u32(strings.length), strings, u32(2), u16(0), root]);
    }
}

function concat(parts)
{
    const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
}
function u16(value)
{
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}
function u32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}
