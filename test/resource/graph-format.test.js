import assert from "node:assert/strict";
import test from "node:test";
import { CjsGraphFormat as Format, opaqueBytes } from "../../src/resource/formats/graph/index.js";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { registerClass } from "../../src/global/blue/classes/registry.js";
import { fixtures } from "./graph-fixtures.js";

const { Node, name } = fixtures("GraphText");
const options = { customHandlers: { state: opaqueBytes("state") } };
const text = bytes => JSON.parse(new TextDecoder().decode(bytes));
const read = root => Format.read(JSON.stringify({ format: Format.wireFormat, version: 1, root }), { ...options, emit: "runtime" });

test("text graph preserves cycles, sharing, weak targets and integer enum storage", () =>
{
    const root = new Node();
    const child = new Node();
    root.peer = child;
    root.weak = child;
    root.children = [child, child];
    child.peer = root;
    const bytes = Format.write(root, options);
    const wire = text(bytes).root;
    assert.equal(wire.choice, 73);
    assert.equal(wire.flags, 0x80000001);
    assert.equal(wire.huge, "18446744073709551615");
    assert.deepEqual(wire.colour, [0.25, 0.5, 1, 2]);
    assert.equal(wire.path, "res:/Some/Path");
    assert.ok(!("runtime" in wire) && !("derived" in wire) && !("loadOnly" in wire));
    const result = Format.read(bytes, { ...options, emit: "runtime" });
    assert.deepEqual(result.reports, []);
    assert.equal(result.root.peer.peer, result.root);
    assert.equal(result.root.children[0], result.root.children[1]);
    assert.equal(result.root.weak, result.root.peer);
    assert.equal(result.root.huge, root.huge);
    assert.deepEqual(result.root.indices, root.indices);
    assert.deepEqual(result.root.named, root.named);
    assert.deepEqual(result.root.state, root.state);
    assert.deepEqual(Format.write(result.root, options), bytes);
});

test("text requires its explicit header and version, with no extension claims", () =>
{
    assert.deepEqual(Format.extensions, []);
    assert.equal(Format.is('{"hello":1}'), false);
    const bytes = Format.write(new Node(), options);
    assert.equal(Format.is(bytes), true);
    assert.equal(Format.inspect(bytes).format.id, "CjsGraphFormat");
    const envelope = text(bytes);
    envelope.version = 2;
    assert.throws(() => Format.read(JSON.stringify(envelope)), /version/u);
    assert.throws(() => Format.read("{"), SyntaxError);
});

test("plain values need no registered classes and preserve forward identity", () =>
{
    const root = { _type: "NotInstalled", first: { _ref: 1 }, next: { _type: "AlsoAbsent", _id: 1 } };
    const bytes = Format.write(root, { input: "values" });
    assert.deepEqual(Format.read(bytes), { root, reports: [] });
    assert.throws(() => Format.read(bytes, { emit: "runtime" }), /Unknown class/u);
});

test("duplicate IDs are fatal before factories and cannot be merged", () =>
{
    let calls = 0;
    registerClass({ name: "GraphDuplicateFactory", type: Node, createFn: () => { calls++; return new Node(); } });
    assert.throws(() => read({ _type: "GraphDuplicateFactory", _id: 1, peer: { _type: name, _id: 1 } }), /duplicate _id/u);
    assert.equal(calls, 0);
});

test("canonical alias factories are used; abstract refusal is an error", () =>
{
    registerClass({ name: "GraphFactoryAlias", type: Node, createFn: () => { const node = new Node(); node.name = "factory"; return node; } });
    assert.equal(read({ _type: "GraphFactoryAlias" }).root.name, "factory");
    registerClass({ name: "GraphRefusal", type: Node, createFn: () => null });
    assert.throws(() => read({ _type: "GraphRefusal" }), /Factory refused/u);
});

test("member errors keep siblings and report member paths", () =>
{
    const result = read({ _type: name, peer: { _type: "AbsentChild" }, name: "survives", indices: [-1], value: 4.5, runtime: { secret: 2 }, odd: true });
    assert.equal(result.root.name, "survives");
    assert.equal(result.root.peer, null);
    assert.deepEqual(result.root.indices, Uint32Array.of(1, 65537, 4294967295));
    assert.deepEqual(result.reports.map(item => item.path), ["/root/peer", "/root/indices", "/root/value", "/root/runtime", "/root/odd"]);
    assert.match(result.reports[0].message, /AbsentChild/u);
});

test("missing refs, invalid ref wrappers and external weak targets fail loudly", () =>
{
    const result = read({ _type: name, peer: { _ref: 500 }, name: "still read" });
    assert.equal(result.root.name, "still read");
    assert.match(result.reports[0].message, /Missing reference 500/u);
    assert.throws(() => read({ _type: name, peer: { _ref: 1, name: "bad" } }), /invalid _ref/u);
    const node = new Node(); node.weak = new Node();
    assert.throws(() => Format.write(node, options), /outside the strong graph/u);
});

test("embedded storage and indexed members preserve their declared destinations", () =>
{
    let factoryResult;
    registerClass({ name: "GraphEmbeddedAlias", type: Node, createFn: () => (factoryResult = new Node()) });
    const result = read({ _type: "GraphEmbeddedAlias", embedded: { _type: "GraphTextEmbedded", value: 82 }, oldValue: 19, loadOnly: 91 });
    assert.equal(result.root.embedded, factoryResult.embedded);
    assert.equal(result.root.embedded.value, 82);
    assert.deepEqual(result.root._value, [19]);
    assert.equal(result.root.loadOnly, 91);
    assert.deepEqual(result.reports, []);
});

test("runtime-only and live getters are never read during saves", () =>
{
    class Guarded { safe = 1; get dangerous() { throw new Error("getter evaluated"); } }
    CjsSchema.define(Guarded, { className: "GraphGuarded", members: [
        { name: "safe", key: "safe", type: { kind: "int32" }, edit: { persist: true } },
        { name: "dangerous", key: "dangerous", type: { kind: "objectRef", runtimeOnly: true }, edit: { persist: true } }
    ] });
    assert.deepEqual(text(Format.write(new Guarded())).root, { _type: "GraphGuarded", safe: 1 });
});

test("custom types require this format's explicit opt-in", () =>
{
    assert.throws(() => Format.write(new Node()), /Missing custom handler 'state'/u);
    const bytes = Format.write(new Node(), options);
    const result = Format.read(bytes, { emit: "runtime" });
    assert.match(result.reports[0].message, /Missing custom handler/u);
});

test("numbers never silently wrap or lose unsafe 64-bit precision", () =>
{
    const node = new Node();
    node.choice = 2147483648;
    assert.throws(() => Format.write(node, options), /int32/u);
    node.choice = 1; node.huge = Number.MAX_SAFE_INTEGER + 1;
    assert.throws(() => Format.write(node, options), /Unsafe uint64/u);
    node.huge = 1n; node.colour[0] = NaN;
    assert.throws(() => Format.write(node, options), /finite float32/u);
});

test("mapped lifecycle runs once, after cycles resolve, and method presence alone does not run it", () =>
{
    class IInitialize {}
    CjsSchema.define(IInitialize, { className: "IInitialize" });
    let calls = 0;
    class Life { peer = null; Initialize() { assert.equal(this.peer.peer, this); calls++; } }
    CjsSchema.define(Life, { className: "GraphLife", members: [{ name: "peer", key: "peer", type: { kind: "objectRef", className: "GraphLife" }, edit: { persist: true } }] });
    const graph = { _type: "GraphLife", _id: 1, peer: { _type: "GraphLife", _id: 2, peer: { _ref: 1 } } };
    read(graph);
    assert.equal(calls, 0);
    CjsSchema.meta.blue.mapInterface(IInitialize)(Life);
    read(graph);
    assert.equal(calls, 2);
});

test("struct collections allocate new value storage and embedded aliases resolve canonically", () =>
{
    class Item { count = 1; }
    class Owner { items = []; item = new Item(); }
    CjsSchema.define(Item, { className: "GraphStructItem", members: [{ name: "count", key: "count", type: { kind: "int32" }, edit: { persist: true } }] });
    registerClass({ name: "GraphStructAlias", type: Item });
    CjsSchema.define(Owner, { className: "GraphStructOwner", members: [
        { name: "items", key: "items", type: { kind: "list", itemType: { kind: "struct", className: "GraphStructItem" } }, edit: { persist: true } },
        { name: "item", key: "item", type: { kind: "struct", className: "GraphStructItem" }, edit: { persist: true } }
    ] });
    const original = new Owner(); original.items.push(new Item()); original.items[0].count = 7;
    const result = Format.read(Format.write(original), { emit: "runtime" });
    assert.deepEqual(result.reports, []);
    assert.equal(result.root.items[0].count, 7);
    const alias = read({ _type: "GraphStructOwner", item: { _type: "GraphStructAlias", count: 20 } });
    assert.deepEqual(alias.reports, []);
    assert.equal(alias.root.item.count, 20);
});

test("declared map keys named _id and _ref are data rather than graph metadata", () =>
{
    const node = new Node(); node.named = new Map([["_id", 4], ["_ref", 2], ["_type", 8]]);
    const bytes = Format.write(node, options);
    assert.deepEqual(Format.read(bytes).reports, []);
    const result = Format.read(bytes, { ...options, emit: "runtime" });
    assert.deepEqual(result.reports, []);
    assert.deepEqual(result.root.named, node.named);
});

test("children of rejected collections are not initialized", () =>
{
    let calls = 0;
    class Child { Initialize() { calls++; } }
    class Owner { children = new Set(); }
    CjsSchema.define(Child, { className: "GraphDiscardedChild" });
    CjsSchema.meta.blue.mapInterface(CjsSchema.GetConstructor("IInitialize"))(Child);
    CjsSchema.define(Owner, { className: "GraphDiscardedOwner", members: [
        { name: "children", key: "children", type: { kind: "set", itemType: { kind: "objectRef", className: "GraphDiscardedChild" } }, edit: { persist: true } }
    ] });
    const result = read({ _type: "GraphDiscardedOwner", children: [{ _type: "GraphDiscardedChild" }, { _type: "Absent" }] });
    assert.equal(result.reports.length, 1);
    assert.deepEqual(result.root.children, new Set());
    assert.equal(calls, 0);
});

test("a bad object-list child reports its original index and later siblings still load", () =>
{
    const result = read({ _type: name, children: [{ _type: name, name: "first" }, { _type: "Missing" }, { _type: name, name: "third" }] });
    assert.deepEqual(result.root.children.map(child => child.name), ["first", "third"]);
    assert.deepEqual(result.reports.map(item => item.path), ["/root/children/1"]);
});

test("plain values accessors are refused without executing them", () =>
{
    let calls = 0;
    const root = { get _type() { calls++; return name; } };
    assert.throws(() => Format.write(root, { input: "values" }), /_type/u);
    assert.equal(calls, 0);
});

test("weak references cannot revive objects in rejected members", () =>
{
    const result = read({ _type: name, weak: { _ref: 9 }, runtime: { _type: name, _id: 9 }, name: "ok" });
    assert.equal(result.root.weak, null);
    assert.equal(result.root.name, "ok");
    assert.equal(result.reports.length, 2);
    assert.match(result.reports[1].message, /outside the accepted strong graph/u);
});

test("failed struct collections retain every previous element unchanged", () =>
{
    class Item { count = 1; }
    class Owner { items = [new Item()]; }
    CjsSchema.define(Item, { className: "GraphAtomicStruct", members: [{ name: "count", key: "count", type: { kind: "int32" }, edit: { persist: true } }] });
    CjsSchema.define(Owner, { className: "GraphAtomicOwner", members: [
        { name: "items", key: "items", type: { kind: "list", itemType: { kind: "struct", className: "GraphAtomicStruct" } }, edit: { persist: true } }
    ] });
    const result = read({ _type: "GraphAtomicOwner", items: [{ _type: "GraphAtomicStruct", count: 99 }, 42] });
    assert.deepEqual(result.reports.map(item => item.path), ["/root/items/1"]);
    assert.equal(result.root.items.length, 1);
    assert.equal(result.root.items[0].count, 1);
});

test("native IList rejection restores previous contents and does not initialize rejected children", () =>
{
    class IList {}
    CjsSchema.define(IList, { className: "IList" });
    let initialized = 0;
    class Item { value = 0; Initialize() { initialized++; } }
    class NativeList extends Array
    {
        constructor() { super(); this.push(new Item()); }
        GetSize() { return this.length; }
        GetAt(index) { return this[index]; }
        Remove() { this.length = 0; return true; }
        Append(item) { if (item.value === 2) return false; this.push(item); return true; }
    }
    CjsSchema.define(NativeList, { className: "GraphNativeList" });
    CjsSchema.meta.blue.mapInterface(IList)(NativeList);
    class Owner { items = new NativeList(); }
    CjsSchema.define(Item, { className: "GraphNativeItem", members: [{ name: "value", key: "value", type: { kind: "int32" }, edit: { persist: true } }] });
    CjsSchema.meta.blue.mapInterface(CjsSchema.GetConstructor("IInitialize"))(Item);
    CjsSchema.define(Owner, { className: "GraphNativeOwner", members: [
        { name: "items", key: "items", type: { kind: "list", itemType: { kind: "objectRef", className: "GraphNativeItem" } }, edit: { persist: true } }
    ] });
    const result = read({ _type: "GraphNativeOwner", items: [{ _type: "GraphNativeItem", value: 1 }, { _type: "GraphNativeItem", value: 2 }] });
    assert.deepEqual(result.reports.map(item => item.path), ["/root/items"]);
    assert.deepEqual(Array.from(result.root.items, item => item.value), [0]);
    assert.equal(initialized, 0);
});

test("embedded cycles fail at the member without recursing indefinitely", () =>
{
    class Item { child = null; }
    class Owner { item = new Item(); }
    CjsSchema.define(Item, { className: "GraphEmbeddedCycle", members: [
        { name: "child", key: "child", type: { kind: "struct", className: "GraphEmbeddedCycle" }, edit: { persist: true } }
    ] });
    CjsSchema.define(Owner, { className: "GraphEmbeddedCycleOwner", members: [
        { name: "item", key: "item", type: { kind: "struct", className: "GraphEmbeddedCycle" }, edit: { persist: true } }
    ] });
    const owner = new Owner(); owner.item.child = owner.item;
    assert.throws(() => Format.write(owner), error => error.reports[0].path === "/root/item/child" && /cycle/u.test(error.message));
});

test("plain map storage refuses accessors without invoking them", () =>
{
    let calls = 0;
    const node = new Node();
    node.named = { get secret() { calls++; return 1; } };
    assert.throws(() => Format.write(node, options), /not own data/u);
    assert.equal(calls, 0);
});

test("invalid map entries report escaped keys and preserve the previous map", () =>
{
    const result = read({ _type: name, named: { good: 3, "bad/key": "invalid", "bad~key": false } });
    assert.deepEqual(result.reports.map(item => item.path), ["/root/named/bad~1key", "/root/named/bad~0key"]);
    assert.deepEqual(result.root.named, new Node().named);
});

test("native plain struct records use only their declared class layout", () =>
{
    class Item { value = 0; }
    class Owner { items = []; item = { value: 0 }; }
    CjsSchema.define(Item, { className: "GraphNativeStruct", struct: { size: 4 }, members: [
        { name: "value", key: "value", struct: { dataType: "FLOAT32_1", offset: 0 }, edit: { persist: true } }
    ] });
    CjsSchema.define(Owner, { className: "GraphNativeStructOwner", members: [
        { name: "items", key: "items", type: { kind: "list", itemType: { kind: "rawStruct", className: "GraphNativeStruct" } }, edit: { persist: true } },
        { name: "item", key: "item", type: { kind: "rawStruct", className: "GraphNativeStruct" }, edit: { persist: true } }
    ] });
    const owner = new Owner(); owner.items = [{ value: 1.5, undeclared: "omit" }];
    const bytes = Format.write(owner);
    assert.deepEqual(text(bytes).root.items, [{ _type: "GraphNativeStruct", value: 1.5 }]);
    const result = Format.read(bytes, { emit: "runtime" });
    assert.deepEqual(result.reports, []);
    assert.equal(result.root.items[0].constructor, Item);
    assert.equal(result.root.items[0].value, 1.5);
    assert.deepEqual(result.root.item, { value: 0 });
    assert.throws(() => Format.write({ value: 1.5 }), /Unknown registered class/u);
});
