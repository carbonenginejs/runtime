// How BlackReader reads members into a class's instances, on synthetic classes and hand-written files: the facts
// the retired plain-data reader's tests pinned that Carbon's reader owes too (blue/dropped/black/test).
import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../npm/dist/blue/schema/index.js";
import { carbonInterfaceDecorator } from "../../npm/dist/blue/compose/interface.js";
import { IInitialize } from "../../npm/dist/blue/exposure/IInitialize.js";
import { INotify } from "../../npm/dist/blue/exposure/INotify.js";
import { IListNotify } from "../../npm/dist/blue/exposure/IListNotify.js";
import { BlueList } from "../../npm/dist/blue/exposure/BlueList.js";
import { ClassInfo } from "../../npm/dist/blue/base/ClassInfo.js";
import { BlackReader } from "../../npm/dist/blue/formats/black/BlackReader.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { Fixture, concat, floats, i32, u16, u32 } from "../support/blackFixture.js";
import { blackBuilder, readBlack } from "../support/blackReader.js";

const blue = CjsSchema.be;
const { BELIST_UNLOADSTART, BELIST_LOADFINISHED } = BLUELISTEVENT;
const member = (name, kind, extra = {}) => ({ name, key: name, role: "member", type: { kind }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true }, ...extra });

/** A read that must fail: BlackReader returns null and says why. */
function readFails(bytes, pattern)
{
  const reader = new BlackReader();
  assert.equal(reader.ReadFromStream(bytes), null);
  assert.match(reader.GetErrorMessage(), pattern);
}

test("inherited members read from the narrow and wide tables, by index, into their stored keys", () =>
{
  class Base {}
  class Record extends Base { get narrow() { throw new Error("live getter must not run"); } }
  CjsSchema.define(Base, { name: "BlackReadsBase", members: [ member("narrow", "string", { key: "_narrow" }) ] });
  CjsSchema.be.define(Record, {
    name: "BlackReadsRecord", members: [ member("wide", "wstring") ],
    properties: [ { exposure: { macro: "MAP_PROPERTY_READONLY", flags: 1 }, name: "narrow", key: "narrow", type: { kind: "uint32" }, property: { persisted: false } } ]
  });
  CjsSchema.meta.exposureChainTo(Base)(Record);
  const f = new Fixture();
  f.S("narrow table");
  f.W("wide table Ω");
  // Index 0 of each table holds a different value.
  const root = readBlack(f.Finish(f.Object(1, "BlackReadsRecord", [ [ "narrow", u16(0) ], [ "wide", u16(0) ] ])));
  assert.equal(root._narrow, "narrow table");
  assert.equal(root.wide, "wide table Ω");
});

test("a member a class does not persist, or a class Blue lacks, fails the read with Carbon's message", () =>
{
  class OnlyProperty { get value() { return 0; } set value(_) { assert.fail("setter"); } }
  CjsSchema.be.define(OnlyProperty, {
    name: "BlackReadsPropertyOnly", members: [],
    properties: [ { exposure: { macro: "MAP_PROPERTY", flags: 3 }, name: "value", key: "value", type: { kind: "float32" }, property: { persisted: false } } ]
  });
  const f = new Fixture();
  readFails(f.Finish(f.Object(1, "BlackReadsPropertyOnly", [ [ "value", u32(0) ] ])), /Invalid attribute: value/);
  const g = new Fixture();
  readFails(g.Finish(g.Object(1, "BlackReadsNeverRegistered")), /Failed to create an instance of BlackReadsNeverRegistered/);
});

test("stored keys bypass accessors, shared references stay shared, and children initialize before later siblings", () =>
{
  const events = [];
  class First { ready = false; Initialize() { this.ready = true; events.push("first ready"); return false; } }
  class Later { constructor() { assert.equal(events.at(-1), "first ready"); events.push("later constructed"); } }
  class Root
  {
    _label = "";
    get label() { throw new Error("live getter must not run"); }
    set label(_) { throw new Error("live setter must not run"); }
    SetValues() { throw new Error("values transport must not run"); }
    Initialize() { assert.equal(this.first.ready, true); events.push("root ready"); }
  }
  carbonInterfaceDecorator([ IInitialize ])(First);
  carbonInterfaceDecorator([ IInitialize ])(Root);
  CjsSchema.define(First, { name: "BlackReadsFirst", members: [] });
  CjsSchema.define(Later, { name: "BlackReadsLater", members: [] });
  CjsSchema.be.define(Root, {
    name: "BlackReadsRoot",
    members: [ member("label", "string", { key: "_label" }), member("first", "rootRef"), member("later", "rootRef"), member("shared", "rootRef") ],
    properties: [ { exposure: { macro: "MAP_PROPERTY", flags: 3 }, name: "label", key: "label", type: { kind: "string" }, property: { persisted: false } } ]
  });
  // No reference back to the root: Carbon registers an object's reference only once it is read (BlackReader.cpp:405).
  const f = new Fixture();
  const builder = blackBuilder(f.Finish(f.Object(1, "BlackReadsRoot", [
    [ "label", f.S("stored") ], [ "first", f.Object(2, "BlackReadsFirst") ], [ "later", f.Object(3, "BlackReadsLater") ], [ "shared", f.Object(2) ]
  ])));
  const root = builder.CreateObject(0);
  assert.equal(root._label, "stored");
  assert.equal(root.shared, root.first);
  assert.deepEqual(events, [ "first ready", "later constructed", "root ready" ]);
  const another = builder.CreateObject(0);
  assert.notEqual(another, root);
  assert.notEqual(another.first, root.first);
});

test("a build whose Initialize throws rethrows and leaves no references behind, every time", () =>
{
  class Failing { Initialize() { throw new Error("synthetic initialize failure"); } }
  carbonInterfaceDecorator([ IInitialize ])(Failing);
  CjsSchema.define(Failing, { name: "BlackReadsFailedLifetime", members: [] });
  const f = new Fixture();
  const builder = blackBuilder(f.Finish(f.Object(1, "BlackReadsFailedLifetime")));
  for (let i = 0; i < 100; i++)
  {
    assert.throws(() => builder.CreateObject(0), /synthetic initialize failure/);
    assert.equal(builder._referenceMap.size, 0);
  }
});

test("each stored write of a NOTIFY member is reported, and an unmapped Initialize does not run", () =>
{
  const notifications = [];
  class Notified
  {
    _value = 0;
    quiet = 0;
    Initialize() { throw new Error("unmapped Initialize must not run"); }
    OnModified(name) { notifications.push([ name, this._value, this.quiet ]); return false; }
  }
  carbonInterfaceDecorator([ INotify ])(Notified);
  CjsSchema.be.define(Notified, { name: "BlackReadsNotified", members: [
    member("value", "uint32", { key: "_value", exposure: { macro: "MAP_ATTRIBUTE", flags: 20 }, edit: { persist: true, notify: true } }), member("quiet", "uint32")
  ] });
  assert.equal(ClassInfo.exposeToBlue(Notified).isInitialize, false);
  const f = new Fixture();
  const root = readBlack(f.Finish(f.Object(1, "BlackReadsNotified", [ [ "value", u32(7) ], [ "value", u32(7) ], [ "quiet", u32(9) ] ])));
  assert.equal(root.quiet, 9);
  assert.deepEqual(notifications, [ [ "value", 7, 0 ], [ "value", 7, 0 ] ]);
});

test("a fixed-length member fills the instance's own typed array, and fails on anything else", () =>
{
  let storage;
  class Owner { color = (storage = new Float32Array(4)); }
  class NullOwner { color = null; }
  class ArrayOwner { color = [ 0, 0, 0, 0 ]; }
  const members = [ member("color", "color") ];
  CjsSchema.define(Owner, { name: "BlackReadsColorOwner", members });
  CjsSchema.define(NullOwner, { name: "BlackReadsColorNullOwner", members });
  CjsSchema.define(ArrayOwner, { name: "BlackReadsColorArrayOwner", members });
  const file = kind => { const f = new Fixture(); return f.Finish(f.Object(1, kind, [ [ "color", floats([ .25, .5, .75, 1 ]) ] ])); };
  const owner = readBlack(file("BlackReadsColorOwner"));
  assert.equal(owner.color, storage, "the instance's own typed array is filled, not replaced");
  assert.deepEqual(Array.from(owner.color), [ .25, .5, .75, 1 ]);
  readFails(file("BlackReadsColorNullOwner"), /color: Member does not hold 4 floats/);
  readFails(file("BlackReadsColorArrayOwner"), /color: Member does not hold 4 floats/);
});

test("a wrapped TriMatrix member fills the instance's own mat4 from the matrix's stored rows", () =>
{
  let storage;
  const identity = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
  class Owner { transform = (storage = new Float32Array(identity)); after = 0; }
  class NullOwner { transform = null; after = 0; }
  const members = [ { ...member("transform", "mat4"), type: { kind: "mat4", wrapped: "TriMatrix" } }, member("after", "uint32") ];
  CjsSchema.define(Owner, { name: "BlackReadsMatrixOwner", members });
  CjsSchema.define(NullOwner, { name: "BlackReadsMatrixNullOwner", members });
  const entry = ClassInfo.exposeToBlue(Owner).entries.get("transform");
  assert.equal(entry.wrapperClass, "TriMatrix");
  assert.equal(entry.wrapperKind, "mat4");
  const file = kind =>
  {
    const f = new Fixture();
    // Only _11, _33 and _41 are stored; the rest keep the identity.
    const inline = f.Embedded("TriMatrix", [ [ "_11", floats([ -1 ]) ], [ "_33", floats([ -1 ]) ], [ "_41", floats([ 5 ]) ] ]);
    return f.Finish(f.Object(1, kind, [ [ "transform", inline ], [ "after", u32(7) ] ]));
  };
  const owner = readBlack(file("BlackReadsMatrixOwner"));
  assert.equal(owner.transform, storage);
  assert.deepEqual(Array.from(owner.transform), [ -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 5, 0, 0, 1 ]);
  assert.equal(owner.after, 7);
  readFails(file("BlackReadsMatrixNullOwner"), /does not hold 16 floats/);
});

test("an embedded member is read into the object its owner holds, before that object initializes", () =>
{
  let original;
  class Embedded { value = 0; Initialize() { assert.equal(this, original); assert.equal(this.value, 12); } }
  class Owner { embedded = (original = new Embedded()); }
  carbonInterfaceDecorator([ IInitialize ])(Embedded);
  CjsSchema.define(Embedded, { name: "BlackReadsEmbedded", members: [ member("value", "uint32") ] });
  CjsSchema.define(Owner, { name: "BlackReadsEmbeddedOwner", members: [ member("embedded", "root") ] });
  // Carbon's ReadIRoot ignores the embedded object's class name; the existing instance owns its table.
  const f = new Fixture();
  const owner = readBlack(f.Finish(f.Object(1, "BlackReadsEmbeddedOwner", [ [ "embedded", f.Embedded("UnusedEmbeddedWireClass", [ [ "value", u32(12) ] ]) ] ])));
  assert.equal(owner.embedded, original);
  assert.equal(owner.embedded.value, 12);
});

test("reference collections keep the owner's storage; a list drops nulls, a map keeps its keys, a set its members once", () =>
{
  let list, map, set;
  class Item {}
  class Collections { list = (list = []); map = (map = new Map()); set = (set = new Set()); }
  CjsSchema.define(Item, { name: "BlackReadsItem", members: [] });
  CjsSchema.define(Collections, { name: "BlackReadsCollections", members: [
    member("list", "list", { type: { kind: "list", itemType: "BlackReadsItem" } }),
    member("map", "map", { type: { kind: "map", valueType: "BlackReadsItem" } }),
    member("set", "set", { type: { kind: "set", itemType: "BlackReadsItem" } })
  ] });
  const f = new Fixture();
  const root = readBlack(f.Finish(f.Object(1, "BlackReadsCollections", [
    [ "list", concat([ i32(2), f.Object(2, "BlackReadsItem"), f.Object(0) ]) ],
    [ "map", concat([ i32(1), f.S("__proto__"), f.Object(2) ]) ],
    [ "set", concat([ i32(2), f.Object(2), f.Object(2) ]) ]
  ])));
  assert.equal(root.list, list);
  assert.equal(root.map, map);
  assert.equal(root.set, set);
  assert.equal(root.list.length, 1);
  assert.equal(root.map.get("__proto__"), root.list[0]);
  assert.deepEqual([ ...root.set ], root.list);
});

const itemName = "BlackReadsListItem", ownerName = "BlackReadsListOwner";
class ListItem { value = 0; initializeCount = 0; Initialize() { this.initializeCount++; } }
CjsSchema.define(ListItem, { name: itemName, fields: { value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } } } });
blue.interface(IInitialize)(ListItem);
const Info = list => { const info = {}; list.GetInfo(info); return info; };
class ListOwner
{
  items = new BlueList(ListItem, { className: itemName, listOps: 0 });
  events = [];
  initializeCount = 0;
  initialItems = this.items;
  constructor() { this.items.SetNotify(this); }
  OnListModified(event, key, key2, value, list) { this.events.push({ event, list, notify: Info(list).notify, childInitializeCounts: Array.from(list, item => item.initializeCount) }); }
  Initialize() { this.initializeCount++; this.childInitializeCounts = Array.from(this.items, item => item.initializeCount); }
}
blue.inherit(IListNotify)(ListOwner);
CjsSchema.define(ListOwner, { name: ownerName, fields: { items: { type: { kind: "list", itemType: itemName }, exposure: { macro: "MAP_ATTRIBUTE", flags: 17 }, edit: { read: true, persist: true } } } });
blue.interface(IListNotify, IInitialize)(ListOwner);

test("a list member keeps the owner's IList, its observer, and duplicate children; children initialize as they are read", () =>
{
  const f = new Fixture();
  const owner = readBlack(f.Finish(f.Object(1, ownerName, [ [ "items", f.List([ f.Object(2, itemName, [ [ "value", i32(7) ] ]), f.Object(2) ]) ] ])));
  assert.equal(owner.items, owner.initialItems);
  const info = Info(owner.items);
  assert.equal(info.iid, ListItem);
  assert.equal(info.clsid, itemName);
  assert.equal(info.listOps, 0);
  assert.equal(info.notify, owner);
  assert.equal(owner.items.length, 2);
  assert.equal(owner.items[0], owner.items[1]);
  assert.equal(owner.items[0].value, 7);
  assert.deepEqual(owner.events.map(entry => entry.event), [ BELIST_LOADFINISHED ]);
  assert.equal(owner.events[0].notify, owner);
  // BlackReader initializes each object as it is read (BlackReader.cpp:410-421), so the child already has.
  assert.deepEqual(owner.events[0].childInitializeCounts, [ 1, 1 ]);
  assert.equal(owner.initializeCount, 1);
  assert.deepEqual(owner.childInitializeCounts, [ 1, 1 ]);
  const empty = new Fixture();
  const none = readBlack(empty.Finish(empty.Object(1, ownerName, [ [ "items", empty.List([]) ] ])));
  assert.equal(none.items, none.initialItems);
  assert.deepEqual(none.events.map(entry => entry.event), [ BELIST_LOADFINISHED ]);
  assert.ok(!none.events.some(entry => entry.event === BELIST_UNLOADSTART), "an empty list has nothing to unload");
});

class FilterBase { inheritedHidden = "retained"; }
CjsSchema.define(FilterBase, { name: "BlackReadsFilterBase", fields: { inheritedHidden: { type: { kind: "string" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } } } });
class FilterOwner extends FilterBase { value = 0; readonly = 4; cache = { retained: true }; hiddenPersisted = "old"; }
meta.hideInherited([ "inheritedHidden" ])(FilterOwner);
CjsSchema.define(FilterOwner, { name: "BlackReadsFilterOwner", fields: {
  value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } },
  readonly: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 1 }, edit: { read: true } },
  cache: { type: { kind: "rootRef", runtimeOnly: true }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } },
  hiddenPersisted: { type: { kind: "string" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 24 }, edit: { hidden: true, persist: true, persistOnly: true } }
} });
CjsSchema.meta.exposureChainTo(FilterBase)(FilterOwner);

test("only persisted members read: a READ member, a hidden inherited one and an unknown name fail; HIDDEN with PERSIST reads", () =>
{
  const file = fields => { const f = new Fixture(); return f.Finish(f.Object(1, "BlackReadsFilterOwner", fields(f))); };
  const owner = readBlack(file(f => [ [ "value", i32(8) ], [ "hiddenPersisted", f.S("authored") ] ]));
  assert.equal(owner.value, 8);
  assert.equal(owner.hiddenPersisted, "authored");
  assert.equal(owner.inheritedHidden, "retained");
  readFails(file(() => [ [ "readonly", i32(99) ] ]), /Invalid attribute: readonly/);
  readFails(file(f => [ [ "inheritedHidden", f.S("x") ] ]), /Invalid attribute: inheritedHidden/);
  readFails(file(() => [ [ "unknown", i32(2) ] ]), /Invalid attribute: unknown/);
  // A runtime-only member has no VARTYPE: Carbon's "Invalid attribute type".
  readFails(file(() => [ [ "cache", u32(0) ] ]), /Invalid attribute type: cache/);
});

class Notified { value = 0; notifications = []; OnModified(name) { this.notifications.push([ name, this.value ]); return true; } }
CjsSchema.define(Notified, { name: "BlackReadsPlainNotified", fields: { value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 20 }, edit: { persist: true, notify: true } } } });
blue.interface(INotify)(Notified);
class UnexposedNotify extends Notified {}
// No chain, so INotify is not mapped; it maps value itself, as Carbon's table would have to.
CjsSchema.define(UnexposedNotify, { name: "BlackReadsPlainUnexposedNotify", fields: { value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 20 }, edit: { persist: true, notify: true } } } });
blue.interface()(UnexposedNotify);

test("OnModified is called only on a class that maps INotify", () =>
{
  for (const Type of [ Notified, UnexposedNotify ])
  {
    const f = new Fixture();
    const owner = readBlack(f.Finish(f.Object(1, CjsSchema.getClassName(Type), [ [ "value", i32(9) ] ])));
    assert.equal(owner.value, 9);
    assert.deepEqual(owner.notifications, Type === Notified ? [ [ "value", 9 ] ] : []);
  }
  assert.equal(ClassInfo.exposeToBlue(UnexposedNotify).isNotify, false);
});
