import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../src/blue/schema/CjsSchema.js";
import { type } from "../../src/blue/schema/index.js";
import { Copier } from "../../src/blue/exposure/Copier.js";
import { ClassInfo } from "../../src/blue/base/ClassInfo.js";
import { exposure as be } from "../../src/blue/exposure/be.js";



const member = (name, kind, extra = {}) => ({
    name, key: name, type: { kind }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true }, ...extra
});

class ResourceLeaf
{
    value = 1;
}
CjsSchema.be.define(ResourceLeaf, { name: "ResourceBlackCopyLeaf", fields: {
    value: [ type.int32, be.mapAttribute(be.PERSIST) ]
} });

class ResourceHolder
{
    count = 0;
    _cache = new ResourceLeaf();
    ordinary = null;
}
CjsSchema.be.define(ResourceHolder, { name: "ResourceBlackCopyHolder", fields: {
    count: [ type.uint32, be.mapAttribute(be.PERSIST) ],
    // Contradictory persistence flags must never override the runtime-only fact.
    _cache: [ type.resource(ResourceLeaf), be.mapAttribute(be.PERSIST) ],
    ordinary: [ type.rootRef(ResourceLeaf), be.mapAttribute(be.PERSIST) ]
} });

class ResourceBase
{
    _baseCache = new ResourceLeaf();
}
CjsSchema.define(ResourceBase, { name: "ResourceBlackCopyBase", members: [
    member("cache", "rootRef", { key: "_baseCache", type: { kind: "rootRef", className: "ResourceBlackCopyLeaf" } })
] });

class ResourceDerived extends ResourceBase
{
    _cache = new ResourceLeaf();
}
CjsSchema.define(ResourceDerived, { name: "ResourceBlackCopyDerived", members: [
    member("cache", "rootRef", {
        key: "_cache", type: { kind: "rootRef", className: "ResourceBlackCopyLeaf", runtimeOnly: true }, exposure: { macro: "MAP_ATTRIBUTE", flags: 0 }, edit: {}
    })
] });
CjsSchema.meta.exposureChainTo(ResourceBase)(ResourceDerived);

class ResourceProperty extends ResourceBase
{
    get cache() { throw new Error("resource property getter must not run"); }
}
CjsSchema.be.define(ResourceProperty, { name: "ResourceBlackCopyProperty", properties: [
    { exposure: { macro: "MAP_PROPERTY_READONLY", flags: 1 }, name: "cache", key: "cache", type: { kind: "rootRef", runtimeOnly: true }, property: { persisted: false } }
] });
CjsSchema.meta.exposureChainTo(ResourceBase)(ResourceProperty);

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
    assert.equal(destination.ordinary.value, 13, "ordinary rootRef is the negative control");

    const clone = new Copier().CloneTo(source);
    assert.notEqual(clone._cache, source._cache);
    assert.equal(clone._cache.value, 1, "clone retains the constructor default");
    assert.equal(clone.ordinary.value, 13);
});

test("a runtime-only stored name blocks inherited copy, and Black finds the base's persisted row as Carbon's FindEntry does", () =>
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
    // The derived row has no PERSIST, so FindEntry walks on to the base's (IRootReader.cpp:303-319).
    assert.equal(ClassInfo.exposeToBlue(ResourceDerived).meta.entries.get("cache").key, "_baseCache");
});

