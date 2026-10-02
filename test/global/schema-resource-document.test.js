import assert from "node:assert/strict";
import test from "node:test";

import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { CjsDocumentDehydrator } from "../../src/global/model/document/CjsDocumentDehydrator.js";
import { CjsDocumentHydrator } from "../../src/global/model/document/CjsDocumentHydrator.js";

const resourceType = { kind: "objectRef", runtimeOnly: true };

function throwingField(target, key)
{
    Object.defineProperty(target, key, {
        enumerable: true,
        get() { throw new Error("Runtime resource getter was read: " + key); }
    });
}

function assignAdapter()
{
    return {
        applyValues(target, values) { Object.assign(target, values); },
        finalize() {}
    };
}

test("document dehydration omits captured resource fields before getters and keeps unknown raw data", () =>
{
    const source = {
        _sourceClassName: "DocumentCapturedResource",
        _sourceShape: { fields: [
            { name: "resource", type: resourceType },
            { name: "label", type: { kind: "string" } }
        ] },
        label: "kept",
        extra: { detail: 3, constructor: "authored" },
        ordinary: { _sourceClassName: "DocumentOrdinaryReference", detail: 4 }
    };
    throwingField(source, "resource");

    const document = CjsDocumentDehydrator.dehydrate(source);
    assert.equal(document.nodes.length, 2);
    assert.deepEqual(document.nodes[0].fields, { label: "kept" });
    assert.deepEqual(document.nodes[0].raw, { extra: { detail: 3, constructor: "authored" }, ordinary: { $ref: 2 } });
});

test("document dehydration omits declared resources in returned values and raw nested objects", () =>
{
    class Nested
    {
        kept = 7;
    }
    CjsSchema.define(Nested, { className: "DocumentResourceNested", members: [
        { name: "resource", type: resourceType },
        { name: "kept", type: { kind: "int32" } }
    ] });
    const nested = new Nested();
    throwingField(nested, "resource");
    const values = { label: "kept" };
    throwingField(values, "resource");
    class Source
    {
        nested = nested;
        GetValues() { return values; }
    }
    CjsSchema.define(Source, { className: "DocumentResourceValues", members: [
        { name: "resource", type: resourceType },
        { name: "label", type: { kind: "string" } }
    ] });
    const source = new Source();
    throwingField(source, "resource");

    const document = CjsDocumentDehydrator.dehydrate(source);
    assert.deepEqual(document.nodes[0].fields, { label: "kept" });
    assert.deepEqual(document.nodes[0].raw, { nested: { $ref: 2 } });
    assert.equal(document.nodes[1].kind, "DocumentResourceNested");
    assert.deepEqual(document.nodes[1].fields, { kept: 7 });
});

test("document omission uses selected declarations without role union, inherited fallback or alias priority", () =>
{
    class Base {}
    CjsSchema.define(Base, { className: "DocumentResourceSelectionBase", members: [
        { name: "revived", type: resourceType }
    ] });
    class Source extends Base
    {
        _sourceClassName = "DocumentResourceSelection";
        // An older captured shape must not override the current selected declaration.
        _sourceShape = { fields: [{ name: "revived", type: resourceType }] };
        revived = "derived";
        shared = "member";
        exact = "exact";
    }
    CjsSchema.define(Source, { className: "DocumentResourceSelection", members: [
        { name: "revived", type: { kind: "string" } },
        { name: "shared", type: { kind: "string" } },
        { name: "loaded", aliases: ["resourceAlias", "exact"], type: resourceType },
        { name: "exact", type: { kind: "string" } },
        { name: "storedResource", key: "resourceStorage", type: resourceType }
    ], properties: [
        { name: "shared", key: "liveResource", type: resourceType }
    ] });
    const source = new Source();
    for (const key of ["loaded", "resourceAlias", "resourceStorage"]) throwingField(source, key);

    const document = CjsDocumentDehydrator.dehydrate(source);
    assert.deepEqual(document.nodes[0].fields, { revived: "derived" });
    assert.deepEqual(document.nodes[0].raw, { shared: "member", exact: "exact" });

    const target = new Source();
    const missing = { $ref: 999 };
    CjsDocumentHydrator.applyNodeValues(target, {
        kind: "DocumentResourceSelection",
        fields: { revived: "loaded derived", shared: "loaded member", exact: "loaded exact", loaded: missing, resourceAlias: missing },
        raw: { resourceStorage: missing, unknown: { $ref: 1 } }
    }, new Map([[1, target]]), {}, assignAdapter());
    assert.equal(target.revived, "loaded derived");
    assert.equal(target.shared, "loaded member");
    assert.equal(target.exact, "loaded exact");
    assert.equal(target.unknown, target);
    assert.equal(Object.hasOwn(target, "loaded"), false);
    assert.equal(Object.hasOwn(target, "resourceAlias"), false);
    assert.equal(Object.hasOwn(target, "resourceStorage"), false);
});

test("document hydration omits captured resources before resolving references or assigning raw fields", () =>
{
    const retained = { live: true };
    class Source
    {
        resource = retained;
        _sourceShape = { fields: [
            { name: "resource", type: resourceType },
            { name: "ordinary", type: { kind: "objectRef" } }
        ] };
    }
    const target = new Source();
    const missing = { $ref: 999 };
    const options = { adapter: {
        construct() { return target; },
        ...assignAdapter()
    } };
    const result = CjsDocumentHydrator.hydrate({
        roots: [{ ref: { $ref: 1 } }],
        nodes: [{ id: 1, kind: "DocumentCapturedHydration", fields: { resource: missing, ordinary: { $ref: 1 } }, raw: { resource: missing, extra: "kept" } }]
    }, options);
    assert.equal(result.root, target);
    assert.equal(target.resource, retained);
    assert.equal(target.ordinary, target);
    assert.equal(target.extra, "kept");

    assert.throws(() => CjsDocumentHydrator.applyNodeValues(target, {
        kind: "DocumentCapturedHydration", fields: { ordinary: missing }
    }, new Map([[1, target]]), {}, assignAdapter()), /ref 999 does not exist/);
});

test("document field and raw loops filter runtime-only input before accessing its value", () =>
{
    class Source {}
    CjsSchema.define(Source, { className: "DocumentResourceInputGetter", members: [
        { name: "resource", type: resourceType }
    ] });
    const fields = { ordinary: "kept" };
    const raw = { extra: 9 };
    throwingField(fields, "resource");
    throwingField(raw, "resource");
    const target = new Source();
    CjsDocumentHydrator.applyNodeValues(target, { kind: "DocumentResourceInputGetter", fields, raw }, new Map(), {}, assignAdapter());
    assert.equal(target.ordinary, "kept");
    assert.equal(target.extra, 9);
    assert.equal(Object.hasOwn(target, "resource"), false);
});

test("document dehydration preserves plain registered child identity and cycles", () =>
{
    class Node { value = 1; next = null; other = null; }
    CjsSchema.define(Node, { className: "DocumentPlainGraph", fields: [
        { name: "value", type: { kind: "int32" } },
        { name: "next", type: { kind: "objectRef", className: "DocumentPlainGraph" } },
        { name: "other", type: { kind: "objectRef", className: "DocumentPlainGraph" } }
    ] });
    const root = new Node(), child = new Node();
    root.next = root.other = child;
    child.next = root;
    const document = CjsDocumentDehydrator.dehydrate(root);
    assert.equal(document.nodes.length, 2);
    assert.deepEqual(document.nodes[0].fields.next, { $ref: 2 });
    assert.deepEqual(document.nodes[0].fields.other, { $ref: 2 });
    assert.deepEqual(document.nodes[1].fields.next, { $ref: 1 });
    assert.equal(document.nodes[1].kind, "DocumentPlainGraph");
});
