import assert from "node:assert/strict";
import test from "node:test";
import "../../src/global/blue/values.js";
import { IInitialize } from "../../src/global/blue/IInitialize.js";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { blue } from "../../src/global/blue/index.js";

// Preorder over blue.EnumerateChildren, once per object.
function preorder(root)
{
    const visited = [], seen = new Set();
    const visit = value =>
    {
        if (seen.has(value)) return;
        seen.add(value);
        visited.push(value);
        const children = [];
        blue.EnumerateChildren(value, child => children.push(child));
        for (const child of children) visit(child);
    };
    if (root) visit(root);
    return visited;
}
import { GetResources } from "../../src/global/blue/getResources.js";

let fixtureId = 0;
function fixture()
{
    const prefix = `ModelBlueForwarding${++fixtureId}`;
    const calls = [];
    class Leaf
    {
        constructor(name = "leaf") { this.name = name; }
        Initialize() { calls.push(this.name); }
    }
    CjsSchema.define(Leaf, { className: `${prefix}Leaf`, fields: [
        { name: "child", key: "child", type: { kind: "rootRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    class Plain
    {
        name = "plain";
        child = new Leaf("behindPlain");
        Initialize() { assert.fail("plain objects must not enter legacy initialization"); }
    }
    CjsSchema.define(Plain, { className: `${prefix}Plain`, fields: [
        { name: "child", key: "child", type: { kind: "rootRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    class Resource
    {
        static isResource = true;
        isResource = true;
        name = "resource";
        dependency = null;
        Initialize() { assert.fail("resources must not enter legacy initialization"); }
    }
    CjsSchema.define(Resource, { className: `${prefix}Resource`, fields: [
        { name: "dependency", key: "dependency", type: { kind: "rootRef", className: Resource } }
    ] });
    class Root
    {
        name = "root";
        child = new Leaf("owned");
        plain = new Plain();
        resource = new Resource();
        list = [new Leaf("listA"), new Leaf("listB")];
        map = new Map([["item", new Leaf("map")]]);
        set = new Set([new Leaf("set")]);
        borrowed = new Leaf("borrowed");
        Initialize() { calls.push(this.name); }
    }
    CjsSchema.define(Root, { className: `${prefix}Root`, fields: [
        { name: "child", key: "child", type: { kind: "rootRef", className: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "plain", key: "plain", type: { kind: "rootRef", className: Plain }, lifecycle: { ownership: "owned" } },
        { name: "resource", key: "resource", type: { kind: "rootRef", className: `${prefix}Resource` }, lifecycle: { ownership: "owned" } },
        { name: "list", key: "list", type: { kind: "list", itemType: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "map", key: "map", type: { kind: "map", valueType: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "set", key: "set", type: { kind: "set", itemType: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "borrowed", key: "borrowed", type: { kind: "rootRef", className: Leaf } },
    ] });
    CjsSchema.meta.blue.interface(IInitialize)(Leaf);
    CjsSchema.meta.blue.interface(IInitialize)(Root);
    return { prefix, Leaf, Plain, Resource, Root, calls };
}

function publicNames(root)
{
    return preorder(root).map(value => value.name);
}

test("public traversal crosses plain/resource/collection edges while construction initializes only newly created objects", () =>
{
    const { Root, calls } = fixture();
    const root = CjsSchema.from(CjsSchema.getClassName(Root), {});
    assert.deepEqual(calls, ["root"], "constructor-owned defaults are borrowed; only the reader-created root initializes");
    assert.deepEqual(publicNames(root), ["root", "owned", "plain", "behindPlain", "resource", "listA", "listB", "map", "set", "borrowed"]);
    assert.equal(root.plain.__state, undefined);
    assert.equal(root.resource.__state, undefined);
});

test("Find helpers follow cycles and shared objects once (Find.cpp:352-548)", () =>
{
    const { prefix, Root } = fixture();
    const root = new Root();
    root.child.child = root;
    root.list = [root.child];
    const names = publicNames(root);
    assert.equal(new Set(names).size, names.length, "each object once");
    assert.equal(blue.FindReference(root, root.plain.child), true);
    assert.equal(blue.FindReference(root.plain, root), false);
    assert.deepEqual(blue.FindInterface(root, `${prefix}Leaf`).includes(root.child), true);
});

test("public inherited traversal order is independent of reader ownership", () =>
{
    const { prefix, Leaf, calls } = fixture();
    class Base
    {
        name = "root";
        base = new Leaf("base");
        Initialize() { calls.push(this.name); }
    }
    CjsSchema.define(Base, { className: `${prefix}Base`, fields: [
        { name: "base", key: "base", type: { kind: "rootRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    CjsSchema.meta.blue.interface(IInitialize)(Base);
    class Derived extends Base { derived = new Leaf("derived"); }
    CjsSchema.define(Derived, { className: `${prefix}Derived`, fields: [
        { name: "derived", key: "derived", type: { kind: "rootRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    const root = CjsSchema.from(CjsSchema.getClassName(Derived), {});
    assert.deepEqual(calls, ["root"]);
    assert.deepEqual(publicNames(root), ["root", "derived", "base"]);
});

test("values initialization is independent of public Traverse overrides", () =>
{
    const { prefix, Root, calls } = fixture();
    class Overridden extends Root
    {
        Traverse() { assert.fail("values initialization called public Traverse"); }
    }
    CjsSchema.define(Overridden, { className: `${prefix}Overridden` });
    const root = CjsSchema.from(CjsSchema.getClassName(Overridden), {});
    assert.deepEqual(calls, ["root"]);
});

test("public resource collection forwards independently of Traverse overrides across plain/resource dependencies", () =>
{
    const { prefix, Root, Resource } = fixture();
    class Overridden extends Root
    {
        Traverse() { assert.fail("resource collection called public Traverse override"); }
    }
    CjsSchema.decorateField(Overridden, "_geometryRes", CjsSchema.meta.type.resource(Resource));
    CjsSchema.define(Overridden, { className: `${prefix}ResourceOverride` });
    const root = new Overridden();
    const dependency = new Resource();
    dependency.name = "dependency";
    root.plain.child = root.resource;
    root.resource.dependency = dependency;
    dependency.dependency = root.resource;
    root._geometryRes = dependency;
    const out = ["stale"];
    assert.equal(GetResources(root, out), out);
    assert.deepEqual(out, GetResources(root));
    assert.deepEqual(new Set(out), new Set([dependency, root.resource]));
    assert.equal(out.length, 2);
});

test("native initialization ignores a false return but propagates a thrown failure", () =>
{
    class ReturnsFalse { Initialize() { return false; } }
    class Throws { Initialize() { throw new Error("fixture initialization error"); } }
    for (const Type of [ReturnsFalse, Throws])
    {
        CjsSchema.define(Type, { className: "ReaderCompletion" + Type.name });
        CjsSchema.meta.blue.interface(IInitialize)(Type);
    }
    assert.ok(CjsSchema.from("ReaderCompletionReturnsFalse", {}) instanceof ReturnsFalse);
    assert.throws(() => CjsSchema.from("ReaderCompletionThrows", {}), /fixture initialization error/);
});

test("method presence alone never opts a plain class into reader initialization", () =>
{
    class Unmapped { Initialize() { assert.fail("unmapped hook called"); } }
    CjsSchema.define(Unmapped, { className: "ReaderUnmappedInitializer" });
    assert.ok(CjsSchema.from("ReaderUnmappedInitializer", {}) instanceof Unmapped);
});
