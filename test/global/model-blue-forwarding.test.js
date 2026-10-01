import assert from "node:assert/strict";
import test from "node:test";
import { CjsModel } from "../../src/global/model/CjsModel.js";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { Traverse } from "../../src/global/blue/find.js";
import { GetResources } from "../../src/global/blue/getResources.js";

let fixtureId = 0;
function fixture()
{
    const prefix = `ModelBlueForwarding${++fixtureId}`;
    const calls = [];
    class Leaf extends CjsModel
    {
        constructor(name = "leaf") { super(); this.name = name; }
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
    class Root extends CjsModel
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
    return { prefix, Leaf, Plain, Resource, Root, calls };
}

function publicNames(root, options)
{
    const result = [];
    assert.equal(root.Traverse(value => result.push(value.name), options), root);
    return result;
}

test("public traversal crosses plain/resource/collection edges while legacy initialization stops at its old boundary", () =>
{
    const { Root, calls } = fixture();
    const root = Root.from({});
    assert.deepEqual(calls, ["listB", "listA", "owned", "root"]);
    assert.deepEqual(publicNames(root), ["root", "owned", "plain", "behindPlain", "resource", "listA", "listB", "map", "set", "borrowed"]);
    assert.equal(root.plain.__state, undefined);
    assert.equal(root.resource.__state, undefined);
    assert.equal(root.__state.suppressEvents, 0);
    assert.equal(root.IsDirty(), false);
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
    assert.equal(root.Traverse(value => actual.push(value), { visited }), root);
    assert.deepEqual(actual, expected);
    assert.equal(visited.size, actual.length);
    assert.equal(visited.has(root), true);
    assert.deepEqual(publicNames(root, { visited }), []);
    assert.equal(publicNames(root, { includeRoot: false }).includes("root"), false);
    const pruned = [];
    root.Traverse(value => { pruned.push(value.name); return value !== root.plain; });
    assert.equal(pruned.includes("plain"), true);
    assert.equal(pruned.includes("behindPlain"), false);
    const post = [];
    root.Traverse(value => { post.push(value.name); return false; }, { order: "post" });
    assert.equal(post.at(-1), "root");
    assert.equal(post.includes("behindPlain"), true);
    assert.equal(publicNames(root, { ownedOnly: true }).includes("borrowed"), false);
    assert.throws(() => root.Traverse(null), TypeError);
});

test("public inherited order is canonical while values initialization retains reverse legacy order", () =>
{
    const { prefix, Leaf, calls } = fixture();
    class Base extends CjsModel
    {
        name = "root";
        base = new Leaf("base");
        Initialize() { calls.push(this.name); }
    }
    CjsSchema.define(Base, { className: `${prefix}Base`, fields: [
        { name: "base", key: "base", type: { kind: "objectRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    class Derived extends Base { derived = new Leaf("derived"); }
    CjsSchema.define(Derived, { className: `${prefix}Derived`, fields: [
        { name: "derived", key: "derived", type: { kind: "objectRef", className: Leaf }, lifecycle: { ownership: "owned" } }
    ] });
    const root = Derived.from({});
    assert.deepEqual(calls, ["derived", "base", "root"]);
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
    const root = Overridden.from({});
    assert.equal(root.IsDirty(), false);
    assert.deepEqual(calls, ["listB", "listA", "owned", "root"]);
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
    assert.equal(root.GetResources(out), out);
    assert.deepEqual(out, GetResources(root));
    assert.deepEqual(out, [dependency, root.resource]);
});

test("legacy initialization keeps settle timing, clean state and suppressed modified events", () =>
{
    const prefix = `ModelBlueForwarding${++fixtureId}`;
    const calls = [];
    const events = [];
    class Settled extends CjsModel
    {
        constructor()
        {
            super();
            this.OnEvent("modified", () => events.push("modified"));
        }
        Initialize()
        {
            calls.push(["initialize", this.__state.suppressEvents]);
        }
        OnModified(member)
        {
            calls.push(["modified", this.__state.suppressEvents, member]);
            return true;
        }
    }
    CjsSchema.define(Settled, { className: `${prefix}Settled` });
    const result = Settled.from({});
    assert.deepEqual(calls, [["initialize", 2], ["modified", 2, null]]);
    assert.deepEqual(events, []);
    assert.equal(result.IsDirty(), false);
    assert.equal(result.__state.suppressEvents, 0);
});

test("legacy initialization balances event suppression when Initialize throws or returns false", () =>
{
    for (const mode of ["throw", "false"])
    {
        const prefix = `ModelBlueForwarding${++fixtureId}`;
        let instance;
        class Failing extends CjsModel
        {
            constructor() { super(); instance = this; }
            Initialize()
            {
                assert.equal(this.__state.suppressEvents, 2);
                if (mode === "throw") throw new Error("fixture initialization error");
                return false;
            }
        }
        CjsSchema.define(Failing, { className: `${prefix}Failing` });
        assert.throws(() => Failing.from({}), mode === "throw" ? /fixture initialization error/ : /initialization failed/);
        assert.equal(instance.__state.suppressEvents, 0);
        assert.equal(instance.IsDirty(), true);
    }
});
