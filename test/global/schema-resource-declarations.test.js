import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { DictReader } from "../../src/global/blue/DictReader.js";
import { DictWriter } from "../../src/global/blue/DictWriter.js";
import { CjsResource } from "../../src/global/blue/CjsResource.js";
import { exportCarbonValue } from "../../src/global/schema/types/carbonTypes.js";
import { GetResources } from "../../src/global/blue/getResources.js";

let sequence = 0;
const name = () => `ResourceDeclaration${++sequence}`;
const poison = () => { throw new Error("resource evaluated"); };
const incoming = key => Object.defineProperty({}, key, { enumerable: true, get: poison });
const write = (target, options = {}) => new DictWriter().WriteObject(target, {}, options);

test("resource decorator preserves the canonical objectRef fact", () => {
  class Resource {}
  class Owner { cache = null; }
  CjsSchema.define(Owner, { className: name(), fields: { cache: meta.type.resource(Resource) } });
  const field = CjsSchema.getSchema(Owner).members.find(field => field.name === "cache");
  assert.deepEqual(field.type, { kind: "objectRef", className: Resource, runtimeOnly: true });
});

for (const edit of [undefined, {}, { read: true, write: true }, { persist: true }, { rpersist: true }, { persistOnly: true }, { hidden: true }]) {
  test(`resource exclusions precede edit flags ${JSON.stringify(edit)}`, () => {
    class Owner { path = "path"; get cache() { return poison(); } set cache(_) { poison(); } }
    CjsSchema.define(Owner, { className: name(), fields: {
      cache: { type: { kind: "objectRef", className: "Resource", runtimeOnly: true }, ...(edit ? { edit } : {}) },
      path: meta.type.string
    } });
    const target = new Owner();
    for (const options of [{}, { persistOnly: true }, { roundTrip: true }, { defaults: true }]) {
      assert.equal(Object.hasOwn(write(target, options), "cache"), false);
      assert.equal(Object.hasOwn(CjsSchema.getValuesFromSchema(target, {}, options), "cache"), false);
    }
    assert.equal(new DictReader().ReadInto(target, incoming("cache")).size, 0);
    assert.equal(CjsSchema.setValuesFromSchema(target, incoming("cache")).size, 0);
    assert.equal(Object.hasOwn(CjsSchema.getDefaults(Owner), "cache"), false);
    assert.deepEqual(CjsSchema.applyDefaults({ _type: CjsSchema.getClassName(Owner), ...incomingSafe() }),
      { _type: CjsSchema.getClassName(Owner), path: "path" });
    function incomingSafe() { return { cache: { _type: "NeverConstruct", _id: "ignored" } }; }
    const values = incoming("cache");
    values._type = CjsSchema.getClassName(Owner);
    assert.equal(Object.hasOwn(CjsSchema.applyDefaults(values), "cache"), false);
  });
}

test("selected resource claims exposed name and aliases before reading input", () => {
  class Base { old = 1; }
  CjsSchema.define(Base, { className: name(), members: [{ name: "cache", key: "old", type: { kind: "int32" }, edit: { persist: true } }] });
  class Owner extends Base { cache = null; real = 2; }
  CjsSchema.define(Owner, { className: name(), members: [
    { name: "cache", key: "cache", aliases: ["cached", "real"], type: { kind: "objectRef", runtimeOnly: true }, edit: { persist: true } },
    { name: "real", key: "real", type: { kind: "int32" } }
  ] });
  const target = new Owner();
  const values = incoming("cached");
  values.real = 3;
  new DictReader().ReadInto(target, values);
  assert.equal(target.real, 3);
  assert.equal(target.old, 1);
  assert.deepEqual(write(target), { real: 3 });
  values._type = CjsSchema.getClassName(Owner);
  assert.equal(Object.hasOwn(CjsSchema.applyDefaults(values), "cached"), false);
});

test("stateless recursive output excludes child resources in objects and collections", () => {
  class Child { label = "child"; get cache() { return poison(); } }
  CjsSchema.define(Child, { className: name(), fields: { label: meta.type.string, cache: meta.type.resource("Resource") } });
  const child = new Child();
  Object.defineProperty(child, "cache", { enumerable: true, get: poison });
  class Parent { child = child; array = [child]; map = new Map([["child", child]]); set = new Set([child]); }
  CjsSchema.define(Parent, { className: name(), fields: {
    child: meta.type.objectRef(Child), array: meta.type.array({ kind: "objectRef", className: Child }),
    map: { type: { kind: "map", valueType: { kind: "objectRef", className: Child } } },
    set: { type: { kind: "set", itemType: { kind: "objectRef", className: Child } } }
  } });
  assert.deepEqual(CjsSchema.getValuesFromSchema(new Parent()), {
    child: { label: "child" }, array: [{ label: "child" }], map: { child: { label: "child" } }, set: [{ label: "child" }]
  });
  const values = incoming("cache");
  values.label = "new";
  const parent = new Parent();
  CjsSchema.setValuesFromSchema(parent, { child: values, array: [values], map: new Map([["child", values]]), set: new Set([values]) });
  assert.equal(Object.hasOwn(parent.child, "cache"), false);
  assert.equal(Object.hasOwn(parent.array[0], "cache"), false);
  assert.equal(Object.hasOwn(parent.map.get("child"), "cache"), false);
  assert.equal(Object.hasOwn([...parent.set][0], "cache"), false);
  parent.child = values;
  parent.array = [values];
  assert.equal(Object.hasOwn(CjsSchema.getValuesFromSchema(parent).child, "cache"), false);
  assert.equal(Object.hasOwn(CjsSchema.getValuesFromSchema(parent).array[0], "cache"), false);
  CjsSchema.setValuesFromSchema(parent, { child });
  assert.equal(parent.child, child, "ordinary live reference identity remains intact");
  CjsSchema.setValuesFromSchema(parent, { map: { child: values } });
  assert.equal(Object.hasOwn(parent.map.get("child"), "cache"), false);
  parent.map = { child: values };
  assert.equal(Object.hasOwn(CjsSchema.getValuesFromSchema(parent).map.child, "cache"), false);
});

test("model, composed and resource-owned values routes omit caches", () => {
  for (const Base of [class {}, CjsResource]) {
    class Owner extends Base { cache = { loaded: true }; authored = 1; }
    CjsSchema.define(Owner, { className: name(), fields: { cache: [meta.type.resource("Resource"), CjsSchema.meta.blue.persist], authored: meta.type.int32 } });
    if (Base !== CjsResource) CjsSchema.meta.values(Owner, { kind: "class" });
    const target = new Owner();
    const cache = target.cache;
    target.SetValues(incoming("cache"));
    assert.equal(target.cache, cache);
    assert.equal(Object.hasOwn(target.GetValues(), "cache"), false);
  }
});

test("Stage-3 default capture never snapshots resource initializer payload", () => {
  const metadata = Object.create(null);
  const initialize = meta.type.resource("Resource")(undefined, { kind: "field", name: "cache", metadata, addInitializer() {} });
  class Owner { constructor() { this.cache = initialize.call(this, incoming("loaded")); } }
  meta.define({ className: name() })(Owner, { kind: "class", metadata });
  new Owner();
  assert.deepEqual(CjsSchema.getDefaults(Owner), { _type: CjsSchema.getClassName(Owner) });
});

test("default snapshots exclude typed plain child resource getters", () => {
  class Child { cache = null; authored = 2; }
  CjsSchema.define(Child, { className: name(), fields: { cache: meta.type.resource("Resource"), authored: meta.type.int32 } });
  class Parent { child = Object.assign(incoming("cache"), { authored: 9 }); }
  CjsSchema.define(Parent, { className: name(), fields: { child: meta.type.objectRef(Child) } });
  assert.deepEqual(CjsSchema.getDefaults(Parent).child, { authored: 9 });
});

test("mapped Stage-3 resource storage never snapshots its initializer", () => {
  const metadata = Object.create(null);
  const context = { kind: "field", name: "_cache", metadata, addInitializer() {} };
  const initialize = meta.type.resource("Resource")(undefined, context);
  CjsSchema.meta.member("cache")(undefined, context);
  class Owner { constructor() { this._cache = initialize.call(this, incoming("loaded")); } }
  meta.define({ className: name() })(Owner, { kind: "class", metadata });
  new Owner();
  assert.deepEqual(CjsSchema.getDefaults(Owner), { _type: CjsSchema.getClassName(Owner) });
});

test("derived ordinary type replaces resource marker while edit-only overrides retain it", () => {
  class Base { cache = null; }
  CjsSchema.define(Base, { className: name(), fields: { cache: meta.type.resource("Resource") } });
  class Ordinary extends Base {}
  CjsSchema.define(Ordinary, { className: name(), fields: { cache: meta.type.objectRef("Resource") } });
  assert.equal(CjsSchema.getSchema(Ordinary).fields.find(field => field.name === "cache").type.runtimeOnly, undefined);
  assert.ok(Object.hasOwn(CjsSchema.getValuesFromSchema(new Ordinary()), "cache"));
  class StillResource extends Base {}
  CjsSchema.define(StillResource, { className: name(), fields: { cache: { edit: { persist: true } } } });
  assert.equal(Object.hasOwn(CjsSchema.getValuesFromSchema(new StillResource()), "cache"), false);
  assert.equal(CjsSchema.getSchema(StillResource).members[0].type.runtimeOnly, true);
  assert.equal(new DictReader().ReadInto(new StillResource(), incoming("cache")).size, 0);
  const resource = new StillResource();
  Object.defineProperty(resource, "cache", { get: poison });
  assert.equal(Object.hasOwn(write(resource), "cache"), false);
  assert.equal(Object.hasOwn(CjsSchema.getDefaults(StillResource), "cache"), false);
  const traversed = new StillResource();
  traversed.cache = new CjsResource();
  assert.deepEqual(GetResources(traversed), [traversed.cache]);
});

test("metadata-only type inheritance never crosses roles, slots or explicit declarations", () => {
  class Base { cache = null; }
  CjsSchema.define(Base, { className: name(), fields: { cache: meta.type.resource("Resource") } });
  class Property extends Base { get cache() { return null; } }
  CjsSchema.define(Property, { className: name(), fields: { cache: { edit: { read: true } } } });
  assert.equal(CjsSchema.getSchema(Property).properties[0].type, undefined);
  class Explicit extends Base {}
  CjsSchema.define(Explicit, { className: name(), members: [{ name: "cache", key: "cache", edit: { persist: true } }] });
  assert.equal(CjsSchema.getSchema(Explicit).members[0].type, undefined);
  class IndexedBase { slots = [null, null]; }
  CjsSchema.define(IndexedBase, { className: name(), fields: { slots: {
    declaration: { name: "cache", index: 0 }, type: { kind: "objectRef", runtimeOnly: true }
  } } });
  class Indexed extends IndexedBase {}
  CjsSchema.define(Indexed, { className: name(), fields: { slots: { declaration: { name: "other", index: 1 }, edit: { persist: true } } } });
  assert.equal(CjsSchema.getSchema(Indexed).members[0].type, undefined);
  assert.equal(CjsSchema.getSchema(Base).members[0].type.runtimeOnly, true);
});

test("ordinary raw getter and opaque source carrier semantics remain unchanged", () => {
  class Owner { payload = null; }
  CjsSchema.define(Owner, { className: name(), fields: { payload: meta.type.rawStruct("Payload") } });
  let calls = 0;
  const value = Object.defineProperty({}, "count", { enumerable: true, get() { return ++calls; } });
  const target = new Owner();
  CjsSchema.setValuesFromSchema(target, { payload: value });
  assert.equal(calls, 1);
  assert.equal(target.payload.count, 1);
  const carrier = Object.assign(incoming("loaded"), { _sourceClassName: "Opaque" });
  CjsSchema.setValuesFromSchema(target, { payload: carrier });
  assert.equal(target.payload, carrier);
});

test("dictionary collection routes filter nested resource state", () => {
  class Child { authored = 1; get cache() { return poison(); } }
  CjsSchema.define(Child, { className: name(), fields: { authored: meta.type.int32, cache: meta.type.resource("Resource") } });
  const child = new Child();
  Object.defineProperty(child, "cache", { enumerable: true, get: poison });
  class Parent { map = new Map([["child", child]]); set = new Set([child]); raw = { nested: new Map([["child", child]]) }; }
  CjsSchema.define(Parent, { className: name(), fields: {
    map: { type: { kind: "map", valueType: { kind: "objectRef", className: Child } } },
    set: { type: { kind: "set", itemType: { kind: "objectRef", className: Child } } },
    raw: meta.type.rawStruct("Raw")
  } });
  const target = new Parent();
  const values = write(target);
  assert.equal(values.map.child.authored, 1);
  assert.equal(values.set[0].authored, 1);
  assert.equal(values.raw.nested.child.authored, 1);
  assert.equal(JSON.stringify(values).includes("cache"), false);
  const plain = Object.assign(incoming("cache"), { authored: 2 });
  new DictReader().ReadInto(target, { map: { child: plain }, set: [plain] });
  assert.equal(Object.hasOwn(target.map.get("child"), "cache"), false);
  assert.equal(Object.hasOwn([...target.set][0], "cache"), false);
});

test("resource filtering preserves ordinary coercion, collection identity and unary export callbacks", () => {
  class Owner { set = null; pointer = null; scalar = 0; }
  CjsSchema.define(Owner, { className: name(), fields: {
    set: { type: { kind: "set", itemType: "unknown" } }, pointer: meta.type.objectRef(), scalar: meta.type.int32
  } });
  const target = new Owner();
  const item = { values: [1] };
  CjsSchema.setValuesFromSchema(target, { set: new Set([item]) });
  assert.equal([...target.set][0], item);
  const cyclic = new Set(); cyclic.add(cyclic);
  CjsSchema.setValuesFromSchema(target, { set: cyclic });
  assert.ok(target.set.has(cyclic));
  const map = new Map([["x", 1]]);
  CjsSchema.setValuesFromSchema(target, { pointer: map });
  assert.equal(target.pointer, map);
  const scalar = incoming("unrelated"); scalar.valueOf = () => 7;
  CjsSchema.setValuesFromSchema(target, { scalar });
  assert.equal(target.scalar, 7);
  assert.deepEqual([{ x: 1 }, { x: 2 }].map(exportCarbonValue), [{ x: 1 }, { x: 2 }]);
});

for (const kind of ["list", "array"]) {
  test(`dictionary ${kind} retains child type for plain values resource omission`, () => {
    class Child { authored = 1; cache = null; }
    CjsSchema.define(Child, { className: name(), fields: { authored: meta.type.int32, cache: meta.type.resource("Resource") } });
    class Parent { items = []; pointer = null; }
    CjsSchema.define(Parent, { className: name(), fields: {
      items: { type: { kind, itemType: { kind: "objectRef", className: Child } } }, pointer: meta.type.objectRef(Child)
    } });
    const plain = Object.assign(incoming("cache"), { authored: 2 });
    const target = new Parent();
    target.items = [plain];
    target.pointer = plain;
    const exported = write(target);
    assert.deepEqual(exported.items, [{ authored: 2 }]);
    assert.deepEqual(exported.pointer, {}, "plain objectRef retains existing fieldless-object writer behavior");
    new DictReader().ReadInto(target, { items: [plain] });
    assert.equal(target.items[0].authored, 2);
    assert.equal(Object.hasOwn(target.items[0], "cache"), false);
    const child = new Child();
    target.items = [child, child];
    const shared = write(target, { refs: true });
    assert.equal(shared.items[1]._ref, shared.items[0]._id);
  });
}
