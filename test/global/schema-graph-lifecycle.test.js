import assert from "node:assert/strict";
import test from "node:test";
import "../../src/global/blue/values.js";
import { IInitialize } from "../../src/global/blue/IInitialize.js";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { Traverse } from "../../src/global/blue/find.js";
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
        { name: "child", key: "child", type: { kind: "objectRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    class Plain
    {
        name = "plain";
        child = new Leaf("behindPlain");
        Initialize() { assert.fail("plain objects must not enter legacy initialization"); }
    }
    CjsSchema.define(Plain, { className: `${prefix}Plain`, fields: [
        { name: "child", key: "child", type: { kind: "objectRef", className: Leaf }, lifecycle: { ownership: "owned" } }
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
        { name: "dependency", key: "dependency", type: { kind: "objectRef", className: Resource } }
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
        { name: "child", key: "child", type: { kind: "objectRef", className: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "plain", key: "plain", type: { kind: "objectRef", className: Plain }, lifecycle: { ownership: "owned" } },
        { name: "resource", key: "resource", type: { kind: "objectRef", className: `${prefix}Resource` }, lifecycle: { ownership: "owned" } },
        { name: "list", key: "list", type: { kind: "list", itemType: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "map", key: "map", type: { kind: "map", valueType: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "set", key: "set", type: { kind: "set", itemType: Leaf }, lifecycle: { ownership: "owned" } },
        { name: "borrowed", key: "borrowed", type: { kind: "objectRef", className: Leaf } },
    ] });
    CjsSchema.carbon.mapInterface(IInitialize)(Leaf);
    CjsSchema.carbon.mapInterface(IInitialize)(Root);
    return { prefix, Leaf, Plain, Resource, Root, calls };
}

function publicNames(root, options)
{
    const result = [];
    assert.equal(Traverse(root, value => result.push(value.name), options), root);
    return result;
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

test("public forwarding preserves cycle, shared visited, root exclusion, pruning and postorder contracts", () =>
{
    const { Root } = fixture();
    const root = new Root();
    root.child.child = root;
    root.list = [root.child];
    const expected = [];
    Traverse(root, value => expected.push(value));
    const actual = [];
    const visited = new Set();
    assert.equal(Traverse(root, value => actual.push(value), { visited }), root);
    assert.deepEqual(actual, expected);
    assert.equal(visited.size, actual.length);
    assert.equal(visited.has(root), true);
    assert.deepEqual(publicNames(root, { visited }), []);
    assert.equal(publicNames(root, { includeRoot: false }).includes("root"), false);
    const pruned = [];
    Traverse(root, value => { pruned.push(value.name); return value !== root.plain; });
    assert.equal(pruned.includes("plain"), true);
    assert.equal(pruned.includes("behindPlain"), false);
    const post = [];
    Traverse(root, value => { post.push(value.name); return false; }, { order: "post" });
    assert.equal(post.at(-1), "root");
    assert.equal(post.includes("behindPlain"), true);
    assert.equal(publicNames(root, { ownedOnly: true }).includes("borrowed"), false);
    assert.throws(() => Traverse(root, null), TypeError);
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
        { name: "base", key: "base", type: { kind: "objectRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    CjsSchema.carbon.mapInterface(IInitialize)(Base);
    class Derived extends Base { derived = new Leaf("derived"); }
    CjsSchema.define(Derived, { className: `${prefix}Derived`, fields: [
        { name: "derived", key: "derived", type: { kind: "objectRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    const root = CjsSchema.from(CjsSchema.getClassName(Derived), {});
    assert.deepEqual(calls, ["root"]);
    assert.deepEqual(publicNames(root), ["root", "derived", "base"]);
    assert.deepEqual(publicNames(root, { order: "post" }), ["derived", "base", "root"]);
    assert.deepEqual(publicNames(root, { reverse: true }), ["root", "base", "derived"]);
    assert.deepEqual(publicNames(root, { order: "post", reverse: true }), ["base", "derived", "root"]);
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
    CjsSchema.decorateField(Overridden, "_geometryRes", CjsSchema.type.resource(Resource));
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
    assert.deepEqual(out, [dependency, root.resource]);
});

test("native initialization ignores a false return but propagates a thrown failure", () =>
{
    class ReturnsFalse { Initialize() { return false; } }
    class Throws { Initialize() { throw new Error("fixture initialization error"); } }
    for (const Type of [ReturnsFalse, Throws])
    {
        CjsSchema.define(Type, { className: "ReaderCompletion" + Type.name });
        CjsSchema.carbon.mapInterface(IInitialize)(Type);
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
