import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { DictReader } from "../../src/global/blue/DictReader.js";
import { DictWriter } from "../../src/global/blue/DictWriter.js";

let sequence = 0;
const identity = () => `DictionaryDeclarations${++sequence}`;
const scalar = (name, key = name, extra = {}) => ({ name, key, type: { kind: "int32" }, ...extra });
const read = (target, values, notify = null) => new DictReader().ReadInto(target, values, notify);
const write = (target, options = {}) => new DictWriter().WriteObject(target, {}, options);

test("same-owner stored members use exposed names without calling paired live accessors", () => {
  class Pair {
    _boosters = 1;
    get boosters() { assert.fail("paired getter"); }
    set boosters(_) { assert.fail("paired setter"); }
    GetValues() { assert.fail("canonical declarations are not fieldless"); }
  }
  CjsSchema.define(Pair, { className: identity(), members: [scalar("boosters", "_boosters", { edit: { persist: true, notify: true } })],
    properties: [scalar("boosters", "boosters", { edit: { read: true, write: true } })] });
  const value = new Pair();
  const calls = [];
  assert.deepEqual([...read(value, { boosters: 3 }, { OnModified(name) { calls.push(name); } })], ["boosters"]);
  assert.equal(value._boosters, 3);
  assert.deepEqual(calls, ["boosters"]);
  assert.deepEqual(write(value), { boosters: 3 });
  assert.deepEqual(write(value, { persistOnly: true }), { boosters: 3 });
  assert.throws(() => read(value, { _boosters: 5 }), /Invalid attribute/);
});

test("declaring owner precedes role across inheritance and filters never fall through", () => {
  class Base {
    base = 10;
    otherBacking = 20;
    liveCalls = 0;
    get otherLive() { this.liveCalls++; return this.otherBacking; }
    set otherLive(value) { this.liveCalls++; this.otherBacking = value; }
  }
  CjsSchema.define(Base, { className: identity(), members: [scalar("value", "base", { edit: { persist: true } })],
    properties: [scalar("other", "otherLive", { edit: { persist: true, write: true } })] });
  class Derived extends Base {
    current = 30;
    own = 40;
    get live() { return this.current; }
    set live(value) { this.current = value; }
  }
  CjsSchema.define(Derived, { className: identity(), members: [scalar("other", "own", { edit: { persist: true } })],
    properties: [scalar("value", "live", { edit: { read: true, write: true } })] });
  const target = new Derived();
  read(target, { value: 7, other: 8 });
  assert.equal(target.current, 7);
  assert.equal(target.base, 10);
  assert.equal(target.own, 8);
  assert.deepEqual(write(target), { other: 8, value: 7 });
  assert.deepEqual(write(target, { persistOnly: true }), { other: 8 });
  assert.equal(target.liveCalls, 0, "derived storage bypasses the inherited live property");
  class ReadOnly extends Base { readonly = 9; }
  CjsSchema.define(ReadOnly, { className: identity(), members: [scalar("value", "readonly", { edit: { read: true } })] });
  const locked = new ReadOnly();
  assert.equal(read(locked, { value: 99 }).size, 0);
  assert.equal(locked.base, 10);
  assert.equal(locked.readonly, 9);
  assert.equal(Object.hasOwn(write(locked, { persistOnly: true }), "value"), false);
  assert.equal(Object.hasOwn(write(locked, { roundTrip: true }), "value"), false);
});

test("property-only and legacy accessor declarations retain live behavior", () => {
  class Live {
    stored = 1;
    get actual() { return this.stored; }
    set actual(value) { this.stored = value + 1; }
  }
  CjsSchema.define(Live, { className: identity(), properties: [scalar("publicValue", "actual", { edit: { read: true, write: true } })] });
  const live = new Live();
  read(live, { publicValue: 4 });
  assert.equal(live.stored, 5);
  assert.deepEqual(write(live), { publicValue: 5 });
  assert.throws(() => read(live, { actual: 8 }), /Invalid attribute/);
  class Legacy extends Live {}
  CjsSchema.define(Legacy, { className: identity(), fields: [scalar("extra")] });
  const legacy = new Legacy();
  read(legacy, { publicValue: 2, extra: 7 });
  assert.equal(legacy.extra, 7);
  assert.deepEqual(write(legacy), { extra: 7, publicValue: 3 });
  class LegacyAccessor {
    value = 1;
    get exposed() { return this.value; }
    set exposed(value) { this.value = value; }
  }
  CjsSchema.define(LegacyAccessor, { className: identity(), fields: [scalar("exposed")] });
  const accessor = new LegacyAccessor();
  read(accessor, { exposed: 11 });
  assert.equal(accessor.value, 11);
  assert.deepEqual(write(accessor), { exposed: 11 });
});

test("indexed live properties use their getter-selected container", () => {
  class IndexedLive {
    items = [1, 2];
    get live() { return this.items; }
    set live(_) { assert.fail("indexed assignment must target the selected slot"); }
  }
  CjsSchema.define(IndexedLive, { className: identity(), properties: [scalar("second", "live", { index: 1 })] });
  const target = new IndexedLive();
  read(target, { second: 9 });
  assert.deepEqual(target.items, [1, 9]);
  assert.deepEqual(write(target), { second: 9 });
});

test("visible exact names precede selected aliases and hidden or shadowed aliases disappear", () => {
  class Base { base = 1; hidden = 2; }
  CjsSchema.define(Base, { className: identity(), members: [
    scalar("value", "base", { aliases: ["old"] }), scalar("secret", "hidden", { aliases: ["secretAlias"] })
  ] });
  class Derived extends Base { own = 3; exact = 4; }
  CjsSchema.hideInherited(["hidden"])(Derived);
  CjsSchema.define(Derived, { className: identity(), members: [
    scalar("value", "own", { aliases: ["exact", "shared"] }), scalar("exact", "exact", { aliases: ["shared"] })
  ] });
  const target = new Derived();
  read(target, { exact: 6, shared: 7 });
  assert.equal(target.exact, 6);
  assert.equal(target.own, 7);
  for (const key of ["old", "secret", "secretAlias", "hidden", "unknown"]) {
    assert.throws(() => read(target, { [key]: 8 }), /Invalid attribute/);
  }
  assert.deepEqual(write(target), { value: 7, exact: 6 });
});

test("indexed scalars, references, deferred references and lists keep their addressed storage", () => {
  const rootName = identity(), leafName = identity();
  class Leaf { value = 0; parent = null; }
  CjsSchema.define(Leaf, { className: leafName, members: [scalar("value"), { name: "parent", key: "parent", type: { kind: "objectRef", className: rootName } }] });
  class Root { slots = [null, null]; numbers = new Uint32Array([1, 2]); groups = [[]]; }
  CjsSchema.define(Root, { className: rootName, members: [
    { name: "first", key: "slots", index: 0, type: { kind: "objectRef", className: leafName } },
    { name: "second", key: "slots", index: 1, type: { kind: "objectRef", className: leafName } },
    scalar("number", "numbers", { index: 1 }),
    { name: "children", key: "groups", index: 0, type: { kind: "list", itemType: leafName } }
  ] });
  const target = new Root();
  const slots = target.slots, numbers = target.numbers, group = target.groups[0];
  read(target, { _id: "root", first: { _ref: "leaf" }, second: { _id: "leaf", value: 9, parent: { _ref: "root" } },
    number: 12, children: [{ _ref: "leaf" }, null] });
  assert.equal(target.slots, slots);
  assert.equal(target.numbers, numbers);
  assert.equal(target.groups[0], group);
  assert.equal(target.slots[0], target.slots[1]);
  assert.equal(target.slots[0].parent, target);
  assert.equal(target.groups[0][0], target.slots[0]);
  assert.equal(target.numbers[1], 12);
  const values = write(target, { refs: true, forceTypeTags: true, roundTrip: true });
  assert.equal(Object.hasOwn(values, "slots"), false);
  const restored = new DictReader().CreateObject(values);
  assert.equal(restored.slots[0], restored.slots[1]);
  assert.equal(restored.slots[0].parent, restored);
  assert.equal(restored.groups[0][0], restored.slots[0]);
});

test("stored accessors and invalid indexed destinations fail without side effects", () => {
  class Invalid { get trap() { assert.fail("stored accessor invoked"); } slots = [0]; }
  CjsSchema.define(Invalid, { className: identity(), members: [scalar("value", "trap"), scalar("beyond", "slots", { index: 2 })] });
  const value = new Invalid();
  assert.throws(() => read(value, { value: 1 }), /accessor/);
  assert.throws(() => write(value), /accessor/);
  assert.throws(() => read(value, { beyond: 1 }), /exceeds/);
});

test("declaration cache follows schema revisions and fieldless custom writers still work", () => {
  class Later { value = 2; }
  const reader = new DictReader();
  assert.equal(reader.FindEntry("alias", Later), null);
  CjsSchema.define(Later, { className: identity(), members: [scalar("public", "value", { aliases: ["alias"] })] });
  assert.equal(reader.FindEntry("alias", Later).name, "public");
  const target = new Later();
  read(target, { alias: 6 });
  assert.deepEqual(write(target), { public: 6 });
  class Fieldless { GetValues() { return { custom: 8 }; } }
  CjsSchema.define(Fieldless, { className: identity() });
  assert.deepEqual(write(new Fieldless()), { custom: 8 });
});
