import assert from "node:assert/strict";
import test from "node:test";
import "../../src/blue/values.js";
import { IInitialize } from "../../src/blue/exposure/IInitialize.js";
import { CjsSchema } from "../../src/blue/schema/CjsSchema.js";
import { type } from "../../src/blue/schema/index.js";
import { blue } from "../../src/blue/index.js";

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
import { GetResources } from "../../src/blue/getResources.js";
import { CjsGraph } from "../../src/global/model/graph/index.js";
import { IRoot } from "../../src/blue/exposure/IRoot.js";

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
        { name: "child", key: "child", type: { kind: "rootRef", className: Leaf } }
    ] });
    class Plain
    {
        name = "plain";
        child = new Leaf("behindPlain");
        Initialize() { assert.fail("plain objects must not enter legacy initialization"); }
    }
    CjsSchema.define(Plain, { className: `${prefix}Plain`, fields: [
        { name: "child", key: "child", type: { kind: "rootRef", className: Leaf } }
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
        { name: "child", key: "child", type: { kind: "rootRef", className: Leaf } },
        { name: "plain", key: "plain", type: { kind: "rootRef", className: Plain } },
        { name: "resource", key: "resource", type: { kind: "rootRef", className: `${prefix}Resource` } },
        { name: "list", key: "list", type: { kind: "list", itemType: Leaf } },
        { name: "map", key: "map", type: { kind: "map", valueType: Leaf } },
        { name: "set", key: "set", type: { kind: "set", itemType: Leaf } },
        { name: "borrowed", key: "borrowed", type: { kind: "rootRef", className: Leaf } },
    ] });
    CjsSchema.be.interface(IInitialize)(Leaf);
    CjsSchema.be.interface(IInitialize)(Root);
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
        { name: "base", key: "base", type: { kind: "rootRef", className: Leaf } }
    ] });
    CjsSchema.be.interface(IInitialize)(Base);
    class Derived extends Base { derived = new Leaf("derived"); }
    CjsSchema.define(Derived, { className: `${prefix}Derived`, fields: [
        { name: "derived", key: "derived", type: { kind: "rootRef", className: Leaf } }
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
    CjsSchema.decorateField(Overridden, "_geometryRes", type.resource(Resource));
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
    assert.deepEqual(out, GetResources(root, []));
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
        CjsSchema.be.interface(IInitialize)(Type);
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

test("class registration hands the graph a class's own _Destructor; OnDestruct is found by dispatch", () =>
{
    const calls = [];
    class Base { OnDestruct() { calls.push("Base.OnDestruct"); return true; } _Destructor() { calls.push("~Base"); } }
    class Owner extends Base { _Destructor() { calls.push("~Owner"); } }
    CjsSchema.define(Base, { className: "LifetimeDestructorBase" });
    CjsSchema.define(Owner, { className: "LifetimeDestructorOwner", capabilities: [ "destruct" ] });
    const owner = new Owner();
    CjsGraph.finalDelete(owner);
    assert.deepEqual(calls, ["~Owner", "~Base"]);
    calls.length = 0;
    CjsGraph.destruct(owner);
    assert.deepEqual(calls, ["Base.OnDestruct", "~Owner", "~Base"]);
});

test("an inherit row copies neither teardown function, so a base's _Destructor runs once", () =>
{
    const calls = [];
    class Second { OnDestruct() { calls.push("Second.OnDestruct"); return true; } _Destructor() { calls.push("~Second"); } Shared() {} }
    class Owner {}
    CjsSchema.meta.define("LifetimeInheritSecond")(Second);
    CjsSchema.meta.inherit(Second)(Owner);
    CjsSchema.meta.define({ className: "LifetimeInheritOwner", capabilities: [ "destruct" ] })(Owner);
    assert.equal(Object.hasOwn(Owner.prototype, "Shared"), true);
    assert.equal(Object.hasOwn(Owner.prototype, "_Destructor"), false);
    assert.equal(Object.hasOwn(Owner.prototype, "OnDestruct"), false);
    const owner = new Owner();
    CjsGraph.finalDelete(owner);
    assert.deepEqual(calls, ["~Second"]);
    calls.length = 0;
    // OnDestruct is one method on the object's own prototype chain; a second base's is not copied, so not called.
    CjsGraph.destruct(owner);
    assert.deepEqual(calls, ["~Second"]);
});

test("IRoot holds the graph state and its own Destruct, and nothing pastes one onto another class", () =>
{
    const calls = [];
    class Blue extends IRoot { _Destructor() { calls.push("~Blue"); } }
    CjsSchema.define(Blue, { className: "LifetimeIRootBlue" });

    const object = new Blue();
    assert.equal(Object.hasOwn(object, "__cjs"), true);
    assert.equal(object.__cjs, null);
    assert.equal(object.IsDestructed(), false);
    assert.equal(object.OnDestruct(), true, "IRoot's own OnDestruct refuses nothing");
    assert.equal(object.Destruct(), true);
    assert.equal(object.IsDestructed(), true);
    assert.equal(object.Destruct(), false);
    assert.deepEqual(calls, ["~Blue"]);

    // An object made without its constructor has no state field; it reads as alive and can still be destructed.
    const bare = Object.create(Blue.prototype);
    assert.equal(Object.hasOwn(bare, "__cjs"), false);
    assert.equal(bare.IsDestructed(), false);
    assert.equal(bare.Destruct(), true);
    assert.equal(bare.IsDestructed(), true);

    // A class that is no IRoot gets no Destruct from registration; the graph's own door ends it, if it declares destruct.
    class Plain { _Destructor() { calls.push("~Plain"); } }
    CjsSchema.define(Plain, { className: "LifetimeIRootPlain", capabilities: [ "destruct" ] });
    assert.equal("Destruct" in Plain.prototype, false);
    assert.equal("IsDestructed" in Plain.prototype, false);
    const plain = new Plain();
    assert.equal(CjsGraph.destruct(plain), true);
    assert.equal(CjsGraph.isDestructed(plain), true);
    assert.deepEqual(calls, ["~Blue", "~Blue", "~Plain"]);
});

test("capabilities are declared in a definition: IRoot declares once, and the graph checks them", () =>
{
    assert.deepEqual(CjsSchema.getCapabilities(IRoot), [ "values", "destruct" ]);

    // Below IRoot a class declares nothing and is destruct-capable along its base list.
    class Blue extends IRoot {}
    CjsSchema.define(Blue, { className: "CapabilityIRootBlue" });
    assert.deepEqual(CjsSchema.getCapabilities(Blue), [], "a class's own declaration, not its bases'");
    assert.equal(new Blue().Destruct(), true);

    // Outside IRoot nothing is assumed.
    class Value { _Destructor() {} }
    CjsSchema.define(Value, { className: "CapabilityPlainValue" });
    assert.throws(() => CjsGraph.destruct(new Value()), /CapabilityPlainValue does not declare the destruct capability/);
    assert.doesNotThrow(() => CjsGraph.finalDelete(new Value()));

    // A class with nothing to end has no lifetime record at all.
    class Inert {}
    CjsSchema.define(Inert, { className: "CapabilityInert" });
    assert.equal(CjsGraph.hasLifetime(Inert), false);
    assert.equal(CjsGraph.hasLifetime(Value), true);
    assert.throws(() => CjsGraph.destruct(new Inert()), /does not declare the destruct capability/);

    // A capability that does not exist is refused when the class is defined.
    class Bad {}
    assert.throws(() => CjsSchema.define(Bad, { className: "CapabilityBadName", capabilities: [ "fly" ] }), /unknown capability fly/);

    // An exposure bag carries the key as any definition does.
    class Bagged { _Destructor() {} }
    CjsSchema.be.define({ name: "CapabilityBagged", capabilities: [ "destruct" ] })(Bagged);
    assert.equal(CjsGraph.destruct(new Bagged()), true);
});
