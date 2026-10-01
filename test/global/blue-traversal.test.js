import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { EnumerateChildren, Traverse } from "../../src/global/blue/find.js";
import { GetResources } from "../../src/global/blue/getResources.js";

class Graph
{
    constructor(name) { this.name = name; }
}
CjsSchema.define(Graph, {
    className: "BlueTraversalGraph",
    members: [
        { name: "child", key: "child", type: { kind: "objectRef", className: Graph }, lifecycle: { ownership: "owned" } },
        { name: "list", key: "list", type: { kind: "list", itemType: "BlueTraversalGraph" }, lifecycle: { ownership: "owned" } },
        { name: "map", key: "map", type: { kind: "map", valueType: Graph } },
        { name: "set", key: "set", type: { kind: "set", itemType: { kind: "objectRef", className: Graph } } },
        { name: "embedded", key: "embedded", type: { kind: "struct", className: Graph } },
        { name: "weak", key: "weak", type: { kind: "weakRef", className: Graph } },
        { name: "raw", key: "raw", type: { kind: "rawStruct", className: Graph } },
        { name: "unknown", key: "unknown", type: { kind: "unknown" } },
        { name: "untyped", key: "untyped", type: { kind: "struct" } },
        { name: "numbers", key: "numbers", type: { kind: "list", itemType: "uint32" } },
    ]
});

function names(root, options)
{
    const visited = [];
    assert.equal(Traverse(root, value => visited.push(value.name), options), root);
    return visited;
}

test("plain declarations select references and typed embedded objects, never opaque data", () =>
{
    const root = new Graph("root");
    root.child = new Graph("child");
    root.embedded = new Graph("embedded");
    for (const key of ["weak", "raw", "unknown", "untyped", "undeclared"])
    {
        root[key] = new Graph(key);
    }
    root.numbers = [new Graph("wrong scalar value")];
    assert.deepEqual(names(root), ["root", "child", "embedded"]);
});

test("immediate enumeration reports repeated edges; recursive visitation handles shared cycles", () =>
{
    const root = new Graph("root");
    const child = new Graph("child");
    root.child = child;
    root.list = [child, null, root];
    child.child = root;
    const edges = [];
    assert.equal(EnumerateChildren(root, (value, field, index) => edges.push([value.name, field.name, index])), root);
    assert.deepEqual(edges, [["child", "child", null], ["child", "list", 0], ["root", "list", 2]]);
    assert.deepEqual(names(root), ["root", "child"]);
    const visited = new Set([child]);
    assert.deepEqual(names(root, { visited }), ["root"]);
    assert.equal(visited.has(root), true);
    assert.deepEqual(names(root, { includeRoot: false }), ["child"]);
});

test("preorder pruning, postorder, reverse and owned filtering preserve their explicit contracts", () =>
{
    const root = new Graph("root");
    root.child = new Graph("a");
    root.child.child = new Graph("b");
    root.list = [new Graph("c"), new Graph("d")];
    root.map = new Map([["borrowed", new Graph("e")]]);
    assert.deepEqual(names(root), ["root", "a", "b", "c", "d", "e"]);
    assert.deepEqual(names(root, { order: "post" }), ["b", "a", "c", "d", "e", "root"]);
    assert.deepEqual(names(root, { reverse: true }), ["root", "e", "d", "c", "a", "b"]);
    assert.deepEqual(names(root, { ownedOnly: true }), ["root", "a", "b", "c", "d"]);
    const pre = [];
    Traverse(root, value => { pre.push(value.name); return value.name !== "a"; });
    assert.deepEqual(pre, ["root", "a", "c", "d", "e"]);
    const post = [];
    Traverse(root, value => { post.push(value.name); return false; }, { order: "post" });
    assert.deepEqual(post, ["b", "a", "c", "d", "e", "root"]);
});

test("native default is derived declarations before inherited storage, even under a live property", () =>
{
    class Base {}
    CjsSchema.define(Base, { className: "BlueTraversalBase", members: [
        { name: "child", key: "_baseChild", type: { kind: "objectRef", className: Graph } }
    ] });
    class Derived extends Base
    {
        get child() { throw new Error("live getter was invoked"); }
    }
    CjsSchema.define(Derived, { className: "BlueTraversalDerived", members: [
        { name: "own", key: "_ownChild", type: { kind: "objectRef", className: Graph } }
    ], properties: [
        { name: "child", key: "child", type: { kind: "objectRef", className: Graph } }
    ] });
    const root = new Derived();
    root.name = "root";
    root._baseChild = new Graph("base");
    root._ownChild = new Graph("derived");
    assert.deepEqual(names(root), ["root", "derived", "base"]);
    assert.deepEqual(names(root, { reverse: true }), ["root", "base", "derived"]);
});

test("stored aliases and indexed slots select backing data without accessor execution", () =>
{
    class Slots
    {
        get visible() { throw new Error("property getter"); }
        get accessorStorage() { throw new Error("incorrect stored getter"); }
    }
    CjsSchema.define(Slots, { className: "BlueTraversalSlots", members: [
        { name: "visible", key: "slots", index: 0, type: { kind: "objectRef", className: Graph } },
        { name: "other", key: "slots", index: 1, type: { kind: "objectRef", className: Graph } },
        { name: "ignored", key: "accessorStorage", type: { kind: "objectRef", className: Graph } },
    ], properties: [
        { name: "visible", key: "visible", type: { kind: "objectRef", className: Graph } }
    ] });
    const root = new Slots();
    root.name = "root";
    root.slots = [new Graph("first"), new Graph("second")];
    assert.deepEqual(names(root), ["root", "first", "second"]);
});

test("declared Map/Set and Black record/array representations visit only data values", () =>
{
    const root = new Graph("root");
    const key = new Graph("never map keys");
    root.map = new Map([[key, new Graph("map1")], ["two", new Graph("map2")]]);
    root.set = new Set([new Graph("set1"), new Graph("set2")]);
    assert.deepEqual(names(root), ["root", "map1", "map2", "set1", "set2"]);
    assert.deepEqual(names(root, { reverse: true }), ["root", "set2", "set1", "map2", "map1"]);
    root.map = Object.create({ inherited: new Graph("never inherited") });
    root.map.first = new Graph("record1");
    Object.defineProperty(root.map, "getter", { enumerable: true, get() { throw new Error("map getter"); } });
    root.map.second = new Graph("record2");
    root.set = [new Graph("array-set")];
    Object.defineProperty(root.set, 1, { get() { throw new Error("array getter"); } });
    assert.deepEqual(names(root), ["root", "record1", "record2", "array-set"]);
});

test("explicit nested collection descriptors expand but opaque collection values do not", () =>
{
    class Nested {}
    CjsSchema.define(Nested, { className: "BlueTraversalNested", members: [
        { name: "typed", key: "typed", type: { kind: "map", valueType: { kind: "list", itemType: Graph } } },
        { name: "opaque", key: "opaque", type: { kind: "map", valueType: { kind: "rawStruct" } } },
    ] });
    const root = new Nested();
    root.name = "root";
    root.typed = new Map([["items", [new Graph("nested")]]]);
    root.opaque = { items: [new Graph("hidden")] };
    assert.deepEqual(names(root), ["root", "nested"]);
});

test("iterative traversal handles a deep graph and validates callbacks", () =>
{
    const root = new Graph("root");
    let tail = root;
    for (let i = 0; i < 12000; i++) tail = tail.child = new Graph("child");
    let count = 0;
    Traverse(root, () => count++);
    assert.equal(count, 12001);
    assert.equal(Traverse(null, () => assert.fail("null root")), null);
    assert.throws(() => Traverse(root, null), TypeError);
    assert.throws(() => EnumerateChildren(root, null), TypeError);
});

class Resource extends Graph
{
    isResource = true;
}
CjsSchema.define(Resource, { className: "BlueTraversalResource" });

test("resource root and recursive resource dependencies are collected once", () =>
{
    const root = new Resource("root");
    const child = new Resource("child");
    root.child = child;
    child.child = root;
    root.map = new Map([["shared", child], ["third", new Resource("third")]]);
    root.set = new Set([child]);
    const out = ["stale"];
    assert.equal(GetResources(root, out), out);
    assert.deepEqual(out.map(value => value.name), ["root", "child", "third"]);
    assert.deepEqual(GetResources(null, out), []);
});

test("resource hooks keep their iterable contract and never prune children", () =>
{
    const root = new Graph("root");
    const resource = new Resource("shared");
    const hookItem = { name: "accepted external hook item" };
    root.child = new Graph("branch");
    root.child.child = resource;
    let calls = 0;
    root.OnGetResources = function ()
    {
        assert.equal(arguments.length, 0);
        calls++;
        return [null, undefined, hookItem, resource];
    };
    assert.deepEqual(GetResources(root), [hookItem, resource]);
    assert.equal(calls, 1);
    for (const bad of [undefined, "resource", resource])
    {
        root.OnGetResources = () => bad;
        assert.throws(() => GetResources(root), /must return an iterable/);
    }
});

test("resource references accept constructors and names without collecting impostors", () =>
{
    class Holder {}
    CjsSchema.define(Holder, { className: "BlueTraversalResourceHolder", members: [
        { name: "ctor", key: "ctor", type: { kind: "objectRef", className: Resource } },
        { name: "named", key: "named", type: { kind: "objectRef", className: "BlueTraversalResource" } },
        { name: "impostor", key: "impostor", type: { kind: "objectRef", className: Resource } },
    ] });
    const root = new Holder();
    root.ctor = new Resource("constructor");
    root.named = new Resource("name");
    root.impostor = {};
    assert.deepEqual(GetResources(root), [root.ctor, root.named]);
});

test("hook resource collection does not spread unbounded results into call arguments", () =>
{
    const root = new Graph("root");
    const items = Array.from({ length: 150000 }, () => ({}));
    root.OnGetResources = () => items;
    const result = GetResources(root);
    assert.equal(result.length, items.length);
    assert.equal(result.at(-1), items.at(-1));
});
