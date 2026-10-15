import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { type } from "../../src/global/schema/index.js";
import { be } from "../../src/global/blue/index.js";
import { GetResources } from "../../src/global/blue/getResources.js";

class Graph
{
    constructor(name) { this.name = name; }
}
CjsSchema.define(Graph, {
    className: "BlueTraversalGraph",
    members: [
        { name: "child", key: "child", type: { kind: "rootRef", className: Graph }, lifecycle: { ownership: "owned" } },
        { name: "list", key: "list", type: { kind: "list", itemType: "BlueTraversalGraph" }, lifecycle: { ownership: "owned" } },
        { name: "map", key: "map", type: { kind: "map", valueType: Graph } },
        { name: "set", key: "set", type: { kind: "set", itemType: { kind: "rootRef", className: Graph } } },
        { name: "embedded", key: "embedded", type: { kind: "root", className: Graph } },
        { name: "weak", key: "weak", type: { kind: "rootWeak", className: Graph } },
        { name: "raw", key: "raw", type: { kind: "rawStruct", className: Graph } },
        { name: "unknown", key: "unknown", type: { kind: "unknown" } },
        { name: "untyped", key: "untyped", type: { kind: "root" } },
        { name: "numbers", key: "numbers", type: { kind: "list", itemType: "uint32" } },
    ]
});

// Preorder over be.EnumerateChildren in canonical order, once per object,
// so each test checks which edges EnumerateChildren reports and their order.
function names(root)
{
    const visited = [], seen = new Set();
    const visit = value =>
    {
        if (seen.has(value)) return;
        seen.add(value);
        visited.push(value.name);
        const children = [];
        be.EnumerateChildren(value, child => children.push(child));
        for (const child of children) visit(child);
    };
    visit(root);
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
    be.EnumerateChildren(root, (value, field, index) => edges.push([value.name, field.name, index]));
    assert.deepEqual(edges, [["child", "child", null], ["child", "list", 0], ["root", "list", 2]]);
    assert.deepEqual(names(root), ["root", "child"]);
});

test("the filtered overload reports attributes, list items and map values separately (Find.h:66-137)", () =>
{
    const root = new Graph("root");
    root.child = new Graph("a");
    root.list = [new Graph("c"), new Graph("d")];
    root.map = new Map([["borrowed", new Graph("e")]]);
    const calls = [];
    be.EnumerateChildren__Filter(root,
        (child, type, member, offset) => calls.push(["attribute", child.name, type, member.name, offset]),
        (child, index, member, list) => calls.push(["list", child.name, index, member.name, list === root.list]),
        (child, key, member, map) => calls.push(["dict", child.name, key, member.name, map === root.map]),
        member => member.name !== "map");
    assert.deepEqual(calls, [
        ["attribute", "a", Graph, "child", 0],
        ["list", "c", 0, "list", true],
        ["list", "d", 1, "list", true]
    ]);
    // Declared ownership is an ordinary member fact a filter can test.
    const owned = [];
    be.EnumerateChildren__Filter(root, child => owned.push(child.name), child => owned.push(child.name),
        child => owned.push(child.name), member => member.lifecycle !== undefined && member.lifecycle.ownership === "owned");
    assert.deepEqual(owned, ["a", "c", "d"]);
});

test("native default is derived declarations before inherited storage, even under a live property", () =>
{
    class Base {}
    CjsSchema.define(Base, { className: "BlueTraversalBase", members: [
        { name: "child", key: "_baseChild", type: { kind: "rootRef", className: Graph } }
    ] });
    class Derived extends Base
    {
        get child() { throw new Error("live getter was invoked"); }
    }
    CjsSchema.define(Derived, { className: "BlueTraversalDerived", members: [
        { name: "own", key: "_ownChild", type: { kind: "rootRef", className: Graph } }
    ], properties: [
        { name: "child", key: "child", type: { kind: "rootRef", className: Graph } }
    ] });
    const root = new Derived();
    root.name = "root";
    root._baseChild = new Graph("base");
    root._ownChild = new Graph("derived");
    assert.deepEqual(names(root), ["root", "derived", "base"]);
});

test("stored aliases and indexed slots select backing data without accessor execution", () =>
{
    class Slots
    {
        get visible() { throw new Error("property getter"); }
        get accessorStorage() { throw new Error("incorrect stored getter"); }
    }
    CjsSchema.define(Slots, { className: "BlueTraversalSlots", members: [
        { name: "visible", key: "slots", index: 0, type: { kind: "rootRef", className: Graph } },
        { name: "other", key: "slots", index: 1, type: { kind: "rootRef", className: Graph } },
        { name: "ignored", key: "accessorStorage", type: { kind: "rootRef", className: Graph } },
    ], properties: [
        { name: "visible", key: "visible", type: { kind: "rootRef", className: Graph } }
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

test("Carbon's stack walk handles a deep graph without recursion", () =>
{
    const root = new Graph("root");
    let tail = root;
    for (let i = 0; i < 12000; i++) tail = tail.child = new Graph("child");
    assert.equal(be.FindReference(root, tail), true);
    assert.equal(be.EnumerateChildren(null, () => assert.fail("null object")), undefined);
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

test("runtime-only resource declarations are followed and collected once", () =>
{
    class Holder extends Graph {}
    CjsSchema.decorateField(Holder, "_geometryRes", type.resource(Resource));
    CjsSchema.decorateField(Holder, "_sharedRes", type.resource(Resource));
    CjsSchema.define(Holder, { className: "BlueTraversalRuntimeResourceHolder" });
    const root = new Holder("root");
    const local = new Resource("local");
    const shared = new Resource("shared");
    const nested = new Resource("nested");
    root._geometryRes = local;
    root._sharedRes = shared;
    root.child = new Holder("branch");
    root.child._geometryRes = shared;
    root.child._sharedRes = nested;
    root.child.child = root;
    const out = ["stale"];
    assert.equal(GetResources(root, out), out);
    // Carbon's stack walk visits the last-pushed child first (Find.cpp:352-396).
    assert.deepEqual(out, [nested, shared, local]);
});

test("resource references accept constructors and names without collecting impostors", () =>
{
    class Holder {}
    CjsSchema.define(Holder, { className: "BlueTraversalResourceHolder", members: [
        { name: "ctor", key: "ctor", type: { kind: "rootRef", className: Resource } },
        { name: "named", key: "named", type: { kind: "rootRef", className: "BlueTraversalResource" } },
        { name: "impostor", key: "impostor", type: { kind: "rootRef", className: Resource } },
    ] });
    const root = new Holder();
    root.ctor = new Resource("constructor");
    root.named = new Resource("name");
    root.impostor = {};
    assert.deepEqual(new Set(GetResources(root)), new Set([root.ctor, root.named]));
});

test("declared resource collections do not spread unbounded results into call arguments", () =>
{
    const root = new Graph("root");
    const items = Array.from({ length: 150000 }, (_, index) => new Resource(String(index)));
    root.list = items;
    const result = GetResources(root);
    assert.equal(result.length, items.length);
    assert.equal(new Set(result).size, items.length);
});
