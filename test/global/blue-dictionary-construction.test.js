import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { BeObjectMetadata } from "../../npm/dist/global/blue/BlueObjectMetadata.js";
import { registerClass, unregisterClass } from "../../npm/dist/global/blue/classes/registry.js";

let sequence = 0;
const name = () => `DeclaredConstruction${++sequence}`;
const reader = options => new DictReader({ declarations: true, ...options });
const define = (Constructor, fields = {}, interfaces = []) => {
  if (interfaces.length) CjsSchema.meta.blue.mapInterface(...interfaces)(Constructor, { kind: "class" });
  const className = name();
  CjsSchema.define(Constructor, { className, fields });
  return className;
};
const ref = className => ({ type: { kind: "objectRef", className } });

test("declared mode calls the exact alias factory once and never static from", () => {
  class Child { value = 0; static from() { assert.fail("legacy from"); } }
  const canonical = define(Child, { value: CjsSchema.meta.type.int32 });
  const alias = name();
  const supplied = new Child();
  let calls = 0;
  registerClass({ name: alias, type: Child, createFn() { calls++; return supplied; } });
  const built = reader().CreateObject({ _type: alias, value: 4 }, Child);
  assert.equal(built, supplied);
  assert.equal(calls, 1);
  assert.equal(built.value, 4);
  class Parent { child = null; list = []; raw = null; }
  define(Parent, { child: ref(alias), list: { type: { kind: "list", itemType: alias } }, raw: CjsSchema.meta.type.rawStruct("Raw") });
  const parent = reader().CreateObject({ child: { value: 5 }, list: [{ value: 6 }], raw: { deep: { _type: alias, value: 7 } } }, Parent);
  assert.equal(parent.child, supplied);
  assert.equal(parent.list[0], supplied);
  assert.equal(parent.raw.deep, supplied);
  assert.equal(calls, 4);
  assert.equal(CjsSchema.GetConstructor(canonical), Child);
});

test("explicit constructor uses only its matching canonical record and propagates factory failure", () => {
  class Value { scalar = 0; }
  const canonical = define(Value, { scalar: CjsSchema.meta.type.int32 });
  unregisterClass(canonical);
  const alias = name();
  registerClass({ name: alias, type: Value });
  assert.throws(() => reader().CreateObject({}, Value), /not found/);
  class Other {}
  registerClass({ name: canonical, type: Other });
  assert.throws(() => reader().CreateObject({}, Value), /does not identify/);
  const failure = new Error("factory failure");
  const failed = name(); let calls = 0;
  registerClass({ name: failed, type: Value, createFn() { calls++; throw failure; } });
  assert.throws(() => reader().CreateObject({ _type: failed }), error => error === failure);
  assert.equal(calls, 1);
});

test("declared embedded population preserves storage and bypasses SetValues", () => {
  class Child { buffer = new Float32Array([1, 2]); count = 0; Initialize() { this.count++; } SetValues() { assert.fail("SetValues"); } }
  const childName = define(Child, { buffer: { type: { kind: "vector2" } } }, [IInitialize]);
  class Parent { child = new Child(); count = 0; Initialize() { this.count++; } }
  define(Parent, { child: { type: { kind: "struct", className: childName } } }, [IInitialize]);
  const target = new Parent();
  const child = target.child, buffer = child.buffer;
  reader().ReadInto(target, { child: { _type: childName, _id: "embedded", buffer: [3, 4] } });
  assert.equal(target.child, child);
  assert.equal(child.buffer, buffer);
  assert.deepEqual([...buffer], [3, 4]);
  assert.equal(child.count, 0);
  assert.equal(target.count, 0);
  const source = new Child(); source.buffer.set([5, 6]);
  BeObjectMetadata.Set(source, "author", "kept");
  source.GetValues = () => assert.fail("GetValues");
  reader().ReadInto(target, { child: source });
  assert.equal(target.child, child);
  assert.equal(child.buffer, buffer);
  assert.deepEqual([...buffer], [5, 6]);
  assert.equal(BeObjectMetadata.GetMetadata(child).author, "kept");
  assert.equal(BeObjectMetadata.GetMetadata(source).author, "kept");
  assert.notEqual(BeObjectMetadata.GetMetadata(child), BeObjectMetadata.GetMetadata(source));
});

test("declared lifecycle never reads an unrelated live property", () => {
  class Node { get unused() { assert.fail("unrelated getter"); } }
  define(Node, { unused: ref(null) });
  assert.ok(reader().CreateObject({}, Node) instanceof Node);
  assert.ok(reader({ initialize: false }).CreateObject({}, Node) instanceof Node);
  class ReadOnly { get unused() { assert.fail("read-only getter"); } }
  define(ReadOnly, { unused: { type: { kind: "objectRef" }, edit: { read: true } } });
  assert.ok(reader().CreateObject({ unused: null }, ReadOnly) instanceof ReadOnly);
});

test("declared resources are excluded before input access and create no anchors or notifications", () => {
  class Owner { value = 0; get cache() { assert.fail("resource storage read"); } OnModified() { assert.fail("resource notify"); } }
  define(Owner, { value: CjsSchema.meta.type.int32, cache: [CjsSchema.meta.type.resource("Unused"), CjsSchema.meta.blue.notify] }, [INotify]);
  const source = Object.defineProperty({ value: 2 }, "cache", { enumerable: true, get() { assert.fail("incoming resource read"); } });
  assert.equal(reader().CreateObject(source, Owner).value, 2);
});

test("declared reference Map and Set entries share factories and forward anchors", () => {
  class Child { value = 0; initialized = 0; static from() { assert.fail("from"); } Initialize() { this.initialized++; } }
  const childName = define(Child, { value: CjsSchema.meta.type.int32 }, [IInitialize]);
  class Parent { map = null; set = null; child = null; }
  define(Parent, {
    map: { type: { kind: "map", valueType: { kind: "objectRef", className: childName } } },
    set: { type: { kind: "set", itemType: { kind: "objectRef", className: childName } } }, child: ref(childName)
  });
  const borrowed = new Child(); borrowed.initialized = 1;
  const target = reader().CreateObject({
    map: new Map([["first", { _ref: "child" }], ["borrowed", borrowed]]),
    set: new Set([{ _ref: "child" }, borrowed]), child: { _id: "child", value: 3 }
  }, Parent);
  assert.equal(target.map.get("first"), target.child);
  assert.deepEqual([...target.set], [target.child, borrowed]);
  assert.equal(target.map.get("borrowed"), borrowed);
  assert.equal(target.child.initialized, 1);
  assert.equal(borrowed.initialized, 1);
  assert.throws(() => reader().CreateObject({ map: new Map([["bad", { _ref: "missing" }]]) }, Parent), /Unresolved/);
  const plain = reader().CreateObject({ map: { item: { value: 4 } }, set: [{ value: 5 }] }, Parent);
  assert.equal(plain.map.get("item").value, 4);
  assert.equal([...plain.set][0].value, 5);
});

test("nested declared collections construct nodes and preserve borrowed identities and anchors", () => {
  class Child {
    value = 0; initialized = 0;
    get cache() { assert.fail("borrowed resource getter"); }
    static from() { assert.fail("legacy factory"); }
    Initialize() { this.initialized++; }
  }
  const childName = define(Child, { value: CjsSchema.meta.type.int32, cache: CjsSchema.meta.type.resource("Unused") }, [IInitialize]);
  const childType = { kind: "objectRef", className: childName };
  const list = { kind: "list", itemType: childType };
  const cases = [
    { type: { kind: "map", valueType: list }, wrap: items => new Map([["items", items]]), read: value => value.get("items") },
    { type: { kind: "list", itemType: { kind: "map", valueType: childType } }, wrap: items => [new Map(items.map((item, index) => [index, item]))], read: value => [...value[0].values()] },
    { type: { kind: "set", itemType: list }, wrap: items => new Set([items]), read: value => [...value][0] },
    { type: { kind: "array", itemType: { kind: "set", itemType: childType } }, wrap: items => [new Set(items)], read: value => [...value[0]] }
  ];
  for (const spec of cases) {
    class Parent { items = []; later = null; }
    define(Parent, { items: { type: spec.type }, later: ref(childName) });
    const borrowed = new Child(); borrowed.initialized = 1;
    Object.defineProperty(borrowed, "cache", { enumerable: true, get() { assert.fail("enumerable borrowed resource"); } });
    const authored = Object.defineProperty({ _type: childName, value: "7" }, "cache", { enumerable: true, get() { assert.fail("incoming resource"); } });
    const target = reader().CreateObject({ items: spec.wrap([authored, borrowed, { _ref: "later" }]), later: { _id: "later", value: 8 } }, Parent);
    const items = spec.read(target.items);
    assert.ok(items[0] instanceof Child);
    assert.equal(items[0].value, 7);
    assert.equal(items[0].initialized, 1);
    assert.equal(items[1], borrowed);
    assert.equal(borrowed.initialized, 1);
    assert.equal(items[2], target.later);
    assert.equal(target.later.initialized, 1);
  }
  class Primitive { values = null; }
  define(Primitive, { values: { type: { kind: "map", valueType: "int32" } } });
  const primitive = reader().CreateObject({ values: new Map([["key", "4"]]) }, Primitive);
  assert.equal(primitive.values.get("key"), "4", "ordinary value-map coercion remains unchanged");
});

test("references resolve before dependency-first mapped initialization across borrowed nodes", () => {
  const order = [];
  class Node { label = ""; child = null; count = 0; Initialize() { if (this.child) assert.equal(this.child.count, 1); this.count++; order.push(this.label); } }
  const nodeName = define(Node, { label: CjsSchema.meta.type.string, child: ref(null) }, [IInitialize]);
  class Root { nodes = []; }
  define(Root, { nodes: { type: { kind: "list", itemType: nodeName } } });
  const result = reader().CreateObject({ nodes: [
    { _id: "a", label: "a", child: { _ref: "b" } }, { _id: "b", label: "b" }
  ] }, Root);
  assert.equal(result.nodes[0].child, result.nodes[1]);
  assert.deepEqual(order, ["b", "a"]);
  const borrowed = new Node(); borrowed.count = 1; borrowed.label = "borrowed";
  const fresh = reader().CreateObject({ label: "fresh", child: borrowed }, Node);
  assert.equal(fresh.child, borrowed);
  assert.equal(borrowed.count, 1);
  assert.equal(reader().CreateObject(borrowed), borrowed);
});

test("shared and cyclic graphs initialize created identities once without a settle pass", () => {
  class Node { child = null; count = 0; Initialize() { this.count++; return false; } }
  define(Node, { child: ref(null) }, [IInitialize]);
  const root = reader().CreateObject({ _id: "self", child: { _ref: "self" } }, Node);
  assert.equal(root.child, root);
  assert.equal(root.count, 1);
  const reused = new Node(), alias = name(); let calls = 0;
  registerClass({ name: alias, type: Node, createFn() { calls++; return reused; } });
  reader().CreateObject({ _type: alias });
  reader().CreateObject({ _type: alias });
  assert.equal(calls, 2);
  assert.equal(reused.count, 2, "operation ownership is not global object history");
});

for (const kind of ["weakRef", "int32"]) test(`a typed child in a ${kind} declaration initializes before its parent`, () => {
  const order = [];
  class Child { ready = false; Initialize() { this.ready = true; order.push("child"); } }
  const childName = define(Child, {}, [IInitialize]);
  class Parent { child = null; Initialize() { assert.equal(this.child.ready, true); order.push("parent"); } }
  define(Parent, { child: { type: { kind, className: childName } } }, [IInitialize]);
  const value = reader().CreateObject({ child: { _type: childName } }, Parent);
  assert.ok(value.child instanceof Child);
  assert.deepEqual(order, ["child", "parent"]);
});

test("declared embedded storage rejects known and missing aliases without replacement", () => {
  class Child { value = 0; }
  const childName = define(Child, { value: CjsSchema.meta.type.int32 });
  class Parent { reference = null; embedded = new Child(); }
  define(Parent, { reference: ref(childName), embedded: { type: { kind: "struct", className: childName } } });
  for (const id of ["known", "missing"]) {
    const target = new Parent();
    const embedded = target.embedded;
    const read = reader();
    assert.throws(() => read.ReadInto(target, {
      reference: { _id: "known", value: 3 }, embedded: { _ref: id }
    }), /does not support _ref aliases/);
    assert.equal(target.embedded, embedded);
    assert.equal(embedded.value, 0);
    assert.equal(read._anchors, null);
  }
});

test("only mapped lifecycle runs, and IInitialize suppresses mapped notify", () => {
  class Notify { value = 0; notices = []; Initialize() { assert.fail("unmapped Initialize"); } OnModified(key) { this.notices.push(key); } }
  define(Notify, { value: [CjsSchema.meta.type.int32, CjsSchema.meta.blue.notify] }, [INotify]);
  const value = reader().CreateObject({ value: 1 }, Notify);
  assert.deepEqual(value.notices, ["value"]);
  class Both { value = 0; calls = 0; Initialize() { this.calls++; } OnModified() { assert.fail("suppressed notify"); } }
  define(Both, { value: [CjsSchema.meta.type.int32, CjsSchema.meta.blue.notify] }, [IInitialize, INotify]);
  assert.equal(reader().CreateObject({ value: 1 }, Both).calls, 1);
  assert.equal(reader({ initialize: false }).CreateObject({ value: 1 }, Both).calls, 0);
});

test("reader operation state is fresh after success and every failure", () => {
  class Node { child = null; value = 0; Initialize() { if (this.value === 9) throw new Error("init failure"); } }
  const className = define(Node, { child: ref(null), value: CjsSchema.meta.type.int32 }, [IInitialize]);
  const read = reader();
  const good = () => read.CreateObject({ _id: "same", value: 1 }, Node);
  const a = good(), b = good();
  assert.notEqual(a, b);
  for (const values of [
    { _type: "MissingConstruction" }, { bad: 1 }, { _ref: "missing" }, { child: { _ref: "missing" } },
    { _id: "same", child: { _type: className, _id: "same" } }, { value: 9 }
  ]) {
    assert.throws(() => read.CreateObject(values, Node));
    assert.equal(read._currentSource, null);
    assert.deepEqual(read._contextStack, []);
    assert.equal(read._anchors, null);
    assert.equal(read._created, null);
    assert.equal(good().value, 1);
  }
  const existing = new Node();
  assert.throws(() => read.ReadInto(existing, { _ref: "missing" }), /root _ref/);
  assert.throws(() => read.ReadInto(existing, { child: { _ref: "missing" } }), /Unresolved/);
  read.ReadInto(existing, { _id: "same", value: 3 });
  assert.equal(existing.value, 3);
  const failed = name();
  registerClass({ name: failed, type: Node, createFn() { throw new Error("factory failure"); } });
  assert.throws(() => read.CreateObject({ _type: failed }), /factory failure/);
  assert.equal(good().value, 1);
  assert.throws(() => new DictReader({ declarations: true, importContext: {} }), /legacy importContext/);
});

test("declared forward reference notification observes the assigned target exactly once", () => {
  class Child { value = 0; }
  const childName = define(Child, { value: CjsSchema.meta.type.int32 });
  class Owner {
    startState = new Child(); states = []; notices = [];
    OnModified(property) { this.notices.push([property, this.startState]); return false; }
  }
  define(Owner, {
    startState: { ...ref(childName), edit: { notify: true } },
    states: { type: { kind: "list", itemType: childName } }
  }, [INotify]);
  const values = { startState: { _ref: "next" }, states: [{ _id: "next", value: 7 }] };
  for (const target of [reader().CreateObject(values, Owner), new Owner()]) {
    if (!target.states.length) reader().ReadInto(target, values);
    assert.equal(target.startState, target.states[0]);
    assert.equal(target.startState.value, 7);
    assert.equal(target.notices.length, 1);
    assert.equal(target.notices[0][0], "startState");
    assert.equal(target.notices[0][1], target.startState, "notification must see the resolved identity");
  }
});

test("resolved declared references notify immediately and unresolved failures never notify", () => {
  class Child {}
  const childName = define(Child);
  class Owner {
    target = null; selected = null; tail = 0; notices = [];
    OnModified(property) { this.notices.push([property, this.selected, this.tail]); }
  }
  define(Owner, {
    target: ref(childName), selected: { ...ref(childName), edit: { notify: true } }, tail: CjsSchema.meta.type.int32
  }, [INotify]);
  const target = new Owner();
  reader().ReadInto(target, { target: { _id: "known" }, selected: { _ref: "known" }, tail: 9 });
  assert.equal(target.notices.length, 1);
  assert.equal(target.notices[0][1], target.target);
  assert.equal(target.notices[0][2], 0, "resolved reference notification precedes the next member");
  const failed = new Owner();
  assert.throws(() => reader().ReadInto(failed, { selected: { _ref: "missing" } }), /Unresolved/);
  assert.deepEqual(failed.notices, []);
  assert.equal(failed.selected, null);
});

test("declared forward reference notifications retain mapped lifecycle suppression", () => {
  class Child {}
  const childName = define(Child);
  class Unmapped {
    child = null; target = null;
    OnModified() { assert.fail("unmapped notification"); }
  }
  class Both {
    child = null; target = null; initialized = 0;
    OnModified() { assert.fail("IInitialize suppresses notifications"); }
    Initialize() { assert.equal(this.child, this.target); this.initialized++; }
  }
  const fields = { child: { ...ref(childName), edit: { notify: true } }, target: ref(childName) };
  define(Unmapped, fields);
  define(Both, fields, [INotify, IInitialize]);
  const values = { child: { _ref: "child" }, target: { _id: "child" } };
  const unmapped = reader().CreateObject(values, Unmapped);
  assert.equal(unmapped.child, unmapped.target);
  assert.equal(reader().CreateObject(values, Both).initialized, 1);
  assert.equal(reader({ initialize: false }).CreateObject(values, Both).initialized, 0);
});

test("legacy ReadInto retains non-plain input acceptance and immediate alias notification", () => {
  class Child { value = 0; }
  const childName = define(Child, { value: CjsSchema.meta.type.int32 });
  class Owner {
    child = new Child(); target = null; value = 0; notices = [];
    OnModified(property) { this.notices.push([property, this.child]); }
  }
  define(Owner, {
    child: { ...ref(childName), edit: { notify: true } }, target: ref(childName), value: CjsSchema.meta.type.int32
  }, [INotify]);
  class Input { value = 7; }
  const owner = new Owner();
  assert.deepEqual(new DictReader().ReadInto(owner, new Input(), owner), new Set(["value"]));
  assert.equal(owner.value, 7);
  assert.throws(() => reader().ReadInto(new Owner(), new Input()), /Expected a dictionary/);
  const old = owner.child;
  new DictReader().ReadInto(owner, { child: { _ref: "later" }, target: { _id: "later", value: 3 } }, owner);
  assert.equal(owner.child, owner.target);
  assert.equal(owner.notices.length, 1);
  assert.equal(owner.notices[0][1], old, "legacy alias notification timing is unchanged");
});
