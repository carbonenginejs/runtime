import assert from "node:assert/strict";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { IList } from "../../npm/dist/global/blue/IList.js";
import { IListNotify } from "../../npm/dist/global/blue/IListNotify.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { CjsBlueReader } from "../../npm/dist/resource/format/CjsBlueReader.js";
import { CjsRedReader } from "../../npm/dist/resource/formats/red/core/CjsRedReader.js";

const { BELIST_UNLOADSTART, BELIST_LOADFINISHED } = BLUELISTEVENT;
const itemName = "BlueReaderPlainListItem";
const ownerName = "BlueReaderPlainListOwner";

class Item
{
  value = 0;
  initializeCount = 0;
  Initialize() { this.initializeCount++; }
}
CjsSchema.define(Item, { className: itemName, fields: {
  value: { type: { kind: "int32" }, edit: { persist: true } }
} });
meta.blue.interfaceTable({ interfaces: [Item, IInitialize], chainTo: null })(Item);

function Info(list)
{
  const info = {};
  list.GetInfo(info);
  return info;
}

class Owner
{
  items = new BlueList(Item, { className: itemName, listOps: 0 });
  name = "";
  events = [];
  initializeCount = 0;
  initialItems = this.items;

  constructor() { this.items.SetNotify(this); }

  OnListModified(event, key, key2, value, list)
  {
    this.events.push({ event, key, key2, value, list, notify: Info(list).notify,
      items: Array.from(list), childInitializeCounts: Array.from(list, item => item.initializeCount) });
  }

  Initialize()
  {
    this.initializeCount++;
    this.initializedItems = Array.from(this.items);
    this.childInitializeCounts = Array.from(this.items, item => item.initializeCount);
  }
}
meta.blue.inherit(IListNotify)(Owner);
CjsSchema.define(Owner, { className: ownerName, fields: {
  name: { type: { kind: "string" }, edit: { persist: true } },
  items: { type: { kind: "list", itemType: itemName }, edit: { read: true, persist: true } }
} });
meta.blue.interfaceTable({ interfaces: [Owner, IListNotify, IInitialize], chainTo: null })(Owner);

const classes = { [itemName]: Item, [ownerName]: Owner };

function AssertOwned(owner)
{
  assert.equal(owner.items, owner.initialItems);
  assert.equal(mappedInterfaces(owner.items.constructor).has(IList), true);
  const info = Info(owner.items);
  assert.equal(info.iid, Item);
  assert.equal(info.clsid, itemName);
  assert.equal(info.listOps, 0);
  assert.equal(info.notify, owner);
}

test("default Blue population preserves configured IList storage, observer and duplicate live children", () =>
{
  const reader = new CjsBlueReader({ classes });
  const owner = reader.CreateRuntimeTarget(ownerName), list = owner.items;
  const old = new Item();
  assert.equal(list.Append(old), true);
  owner.events.length = 0;
  const child = reader.CreateRuntimeTarget(itemName);
  reader.ApplyRuntimeValues(child, { value: 7 }, itemName);
  reader.ApplyRuntimeValues(owner, { name: "loaded", items: [child, child] }, ownerName);
  AssertOwned(owner);
  assert.equal(owner.name, "loaded");
  assert.equal(list.length, 2);
  assert.equal(list[0], child);
  assert.equal(list[1], child);
  assert.deepEqual(owner.events.map(entry => entry.event), [BELIST_UNLOADSTART, BELIST_LOADFINISHED]);
  assert.equal(owner.events[0].items[0], old);
  for (const entry of owner.events)
  {
    assert.equal(entry.list, list);
    assert.equal(entry.notify, owner);
    assert.deepEqual([entry.key, entry.key2, entry.value], [0, 0, null]);
  }
  assert.equal(owner.events[1].items[0], child);
  assert.equal(owner.events[1].items[1], child);
  assert.deepEqual(owner.events[1].childInitializeCounts, [0, 0]);
  assert.equal(owner.initializeCount, 0);
  assert.equal(child.initializeCount, 0);
  reader.FinalizeRuntimeInstances();
  assert.equal(child.initializeCount, 1);
  assert.equal(owner.initializeCount, 1);
  assert.equal(owner.initializedItems[0], child);
  assert.deepEqual(owner.childInitializeCounts, [1, 1]);
});

test("empty default Blue list population completes once without replacing its storage", () =>
{
  const reader = new CjsBlueReader({ classes }), owner = reader.CreateRuntimeTarget(ownerName);
  reader.ApplyRuntimeValues(owner, { items: [] }, ownerName);
  AssertOwned(owner);
  assert.equal(owner.items.length, 0);
  assert.deepEqual(owner.events.map(entry => entry.event), [BELIST_LOADFINISHED]);
  assert.equal(owner.events[0].list, owner.items);
  assert.equal(owner.initializeCount, 0);
});

class FilterBase { inheritedHidden = "retained"; }
CjsSchema.define(FilterBase, { className: "BlueReaderFilterBase", fields: {
  inheritedHidden: { type: { kind: "string" }, edit: { persist: true } }
} });
class FilterOwner extends FilterBase
{
  value = 0;
  readonly = 4;
  cache = { retained: true };
  hiddenPersisted = "old";
}
meta.hideInherited(["inheritedHidden"])(FilterOwner);
CjsSchema.define(FilterOwner, { className: "BlueReaderFilterOwner", fields: {
  value: { type: { kind: "int32" }, edit: { persist: true } },
  readonly: { type: { kind: "int32" }, edit: { read: true } },
  cache: { type: { kind: "objectRef", runtimeOnly: true }, edit: { persist: true } },
  hiddenPersisted: { type: { kind: "string" }, edit: { hidden: true, persist: true, persistOnly: true } }
} });

test("plain declared hydration filters unknown, hidden-inherited and runtime-only keys before incoming getters", () =>
{
  const kind = CjsSchema.getClassName(FilterOwner);
  const reader = new CjsBlueReader({ classes: { [kind]: FilterOwner }, strict: true, schemaOnly: true });
  const owner = reader.CreateRuntimeTarget(kind), cache = owner.cache;
  const values = { value: 8, readonly: 99, hiddenPersisted: "authored" };
  for (const name of ["unknown", "inheritedHidden", "cache"])
    Object.defineProperty(values, name, { enumerable: true, get() { assert.fail(`${name} input must be ignored`); } });
  reader.ApplyRuntimeValues(owner, values, kind);
  assert.equal(owner.value, 8);
  assert.equal(owner.readonly, 4);
  assert.equal(owner.hiddenPersisted, "authored", "HIDDEN plus PERSIST is still importable");
  assert.equal(owner.inheritedHidden, "retained");
  assert.equal(owner.cache, cache);
  assert.equal(Object.hasOwn(owner, "unknown"), false);
});

class Notified
{
  value = 0;
  notifications = [];
  OnModified(name) { this.notifications.push([name, this.value]); return true; }
}
CjsSchema.define(Notified, { className: "BlueReaderPlainNotified", fields: {
  value: { type: { kind: "int32" }, edit: { persist: true, notify: true } }
} });
meta.blue.interfaceTable({ interfaces: [Notified, INotify], chainTo: null })(Notified);
class UnexposedNotify extends Notified {}
CjsSchema.define(UnexposedNotify, { className: "BlueReaderPlainUnexposedNotify" });
meta.blue.interfaceTable({ interfaces: [UnexposedNotify], chainTo: null })(UnexposedNotify);

test("the declared plain branch uses mapped notifications after assignment and rejects method-only exposure", () =>
{
  for (const Type of [Notified, UnexposedNotify])
  {
    const kind = CjsSchema.getClassName(Type);
    const reader = new CjsBlueReader({ classes: { [kind]: Type } }), owner = reader.CreateRuntimeTarget(kind);
    reader.ApplyRuntimeValues(owner, { value: 9 }, kind);
    assert.equal(owner.value, 9);
    assert.deepEqual(owner.notifications, Type === Notified ? [["value", 9]] : []);
  }
});

test("a custom applyValues keeps the whole incoming bag and takes precedence over declared hydration", () =>
{
  const values = { items: [new Item()], unknown: 13 }, calls = [];
  const reader = new CjsBlueReader({ classes, adapter: {
    applyValues(target, incoming, context) { calls.push({ target, incoming, context }); target.customApplied = true; }
  } });
  const owner = reader.CreateRuntimeTarget(ownerName);
  reader.ApplyRuntimeValues(owner, values, ownerName);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, owner);
  assert.equal(calls[0].incoming, values);
  assert.equal(calls[0].context.declared, true);
  assert.equal(calls[0].context.options.skipUpdate, true);
  assert.equal(calls[0].context.options.skipEvents, true);
  assert.equal(owner.customApplied, true);
  AssertOwned(owner);
  assert.equal(owner.items.length, 0);
  assert.deepEqual(owner.events, []);
  assert.equal(owner.initializeCount, 0);
  reader.FinalizeRuntimeInstances();
  assert.equal(owner.initializeCount, 1);
});

class LegacyOwner extends Owner
{
  SetValues(values, options) { this.legacyCall = { values, options }; }
}
CjsSchema.define(LegacyOwner, { className: "BlueReaderPlainLegacyOwner" });

test("a registered SetValues convention keeps its incoming values and legacy hydration options", () =>
{
  const kind = CjsSchema.getClassName(LegacyOwner), values = { items: [new Item()], unknown: 5 };
  const reader = new CjsBlueReader({ classes: { [kind]: LegacyOwner } }), owner = reader.CreateRuntimeTarget(kind);
  reader.ApplyRuntimeValues(owner, values, kind);
  assert.equal(owner.legacyCall.values, values);
  assert.equal(owner.legacyCall.options.skipUpdate, true);
  assert.equal(owner.legacyCall.options.skipEvents, true);
  AssertOwned(owner);
  assert.equal(owner.items.length, 0);
  assert.deepEqual(owner.events, []);
});

test("a custom applyValues also precedes a registered SetValues convention", () =>
{
  const kind = CjsSchema.getClassName(LegacyOwner), calls = [];
  const reader = new CjsBlueReader({ classes: { [kind]: LegacyOwner }, adapter: {
    applyValues(target, values) { calls.push([target, values]); }
  } });
  const owner = reader.CreateRuntimeTarget(kind), values = { unknown: 3 };
  reader.ApplyRuntimeValues(owner, values, kind);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], owner);
  assert.equal(calls[0][1], values);
  assert.equal(owner.legacyCall, undefined);
});

test("unregistered classes and unresolved kinds keep raw assignment and legacy finalization", () =>
{
  class Unregistered { initializeCount = 0; Initialize() { this.initializeCount++; } }
  const reader = new CjsBlueReader({ classes: { Unregistered } });
  for (const kind of ["Unregistered", "Missing"])
  {
    const owner = reader.CreateRuntimeTarget(kind), values = { outsideSchema: { retained: true } };
    reader.ApplyRuntimeValues(owner, values, kind);
    assert.equal(owner.outsideSchema, values.outsideSchema);
    if (kind === "Unregistered") assert.equal(owner.initializeCount, 0);
    else assert.equal(owner._sourceClassName, "Missing");
  }
  reader.FinalizeRuntimeInstances();
  assert.equal(reader.runtimeInstances[0].instance.initializeCount, 1);
});

test("Red runtime preserves declared list ownership and shared children while retaining its lenient named-field boundary", () =>
{
  // An authored in-memory Red graph tests the shared backend, not an asset corpus.
  const child = { type: itemName, value: 12, unknownChild: "ignored" };
  const source = { type: ownerName, name: "red", items: [child, child], unknownOwner: 7 };
  const owner = new CjsRedReader(source, { classes }).ReadRuntime().root;
  AssertOwned(owner);
  assert.equal(owner.items.length, 2);
  assert.equal(owner.items[0], owner.items[1]);
  assert.ok(owner.items[0] instanceof Item);
  assert.equal(owner.items[0].value, 12);
  assert.equal(Object.hasOwn(owner, "unknownOwner"), false);
  assert.equal(Object.hasOwn(owner.items[0], "unknownChild"), false);
  assert.deepEqual(owner.events.map(entry => entry.event), [BELIST_LOADFINISHED]);
  assert.equal(owner.events[0].notify, owner);
  assert.deepEqual(owner.events[0].childInitializeCounts, [0, 0]);
  assert.equal(owner.initializeCount, 1);
  assert.equal(owner.items[0].initializeCount, 1);
  assert.deepEqual(owner.childInitializeCounts, [1, 1]);
  const payload = new CjsRedReader(source, { classes }).ReadPayload().object;
  assert.equal(payload.unknownOwner, 7);
  assert.equal(payload.items[0].unknownChild, "ignored");
  assert.equal(payload.items[0]._id, payload.items[1]._ref);
});

test("Red unresolved typed and untyped records retain unknown fields and shared references", () =>
{
  const child = { fieldOutsideGeneratedShape: 6 };
  const root = new CjsRedReader({ type: "UnresolvedPlainListCarrier", left: child, right: child }).ReadRuntime().root;
  assert.equal(root._sourceClassName, "UnresolvedPlainListCarrier");
  assert.equal(root.left, root.right);
  assert.equal(root.left.fieldOutsideGeneratedShape, 6);
});

test("custom construct and finalize hooks remain whole-graph phases around default plain hydration", () =>
{
  const owner = new Owner(), child = new Item(), finalized = [];
  const reader = new CjsRedReader({ type: ownerName, items: [{ type: itemName, value: 15 }] }, {
    classes,
    adapter: {
      construct(kind) { return kind === ownerName ? owner : child; },
      finalize(instance) {
        assert.equal(owner.items[0], child, "the parent is populated before either finalization hook");
        assert.equal(child.value, 15);
        finalized.push(instance);
      }
    }
  });
  assert.equal(reader.ReadRuntime().root, owner);
  AssertOwned(owner);
  assert.equal(finalized.length, 2);
  assert.equal(finalized[0], child);
  assert.equal(finalized[1], owner);
  assert.equal(child.initializeCount, 0, "custom finalize remains authoritative");
  assert.equal(owner.initializeCount, 0);
});
