import assert from "node:assert/strict";
import test from "node:test";
import { BlueList } from "../../npm/dist/blue/exposure/BlueList.js";
import { IList } from "../../npm/dist/blue/exposure/IList.js";
import { IListNotify } from "../../npm/dist/blue/exposure/IListNotify.js";
import { INotify } from "../../npm/dist/blue/exposure/INotify.js";
import { IInitialize } from "../../npm/dist/blue/exposure/IInitialize.js";
import { CjsSchema, meta } from "../../npm/dist/blue/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/blue/compose/interface.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { YamlReader } from "../../npm/dist/blue/formats/yaml/YamlReader.js";
import "../../npm/dist/blue/values.js";

/** Carbon-stamped legacy decorators; #schema no longer exports them. */
const blue = CjsSchema.be;

const { BELIST_UNLOADSTART, BELIST_LOADFINISHED } = BLUELISTEVENT;
const itemName = "BlueReaderPlainListItem";
const ownerName = "BlueReaderPlainListOwner";

class Item
{
  value = 0;
  initializeCount = 0;
  Initialize() { this.initializeCount++; }
}
CjsSchema.define(Item, { name: itemName, fields: {
  value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } }
} });
blue.interface(IInitialize)(Item);

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
blue.inherit(IListNotify)(Owner);
CjsSchema.define(Owner, { name: ownerName, fields: {
  name: { type: { kind: "string" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } },
  items: { type: { kind: "list", itemType: itemName }, exposure: { macro: "MAP_ATTRIBUTE", flags: 17 }, edit: { read: true, persist: true } }
} });
blue.interface(IListNotify, IInitialize)(Owner);

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

class FilterBase { inheritedHidden = "retained"; }
CjsSchema.define(FilterBase, { name: "BlueReaderFilterBase", fields: {
  inheritedHidden: { type: { kind: "string" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } }
} });
class FilterOwner extends FilterBase
{
  value = 0;
  readonly = 4;
  cache = { retained: true };
  hiddenPersisted = "old";
}
meta.hideInherited(["inheritedHidden"])(FilterOwner);
CjsSchema.define(FilterOwner, { name: "BlueReaderFilterOwner", fields: {
  value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } },
  readonly: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 1 }, edit: { read: true } },
  cache: { type: { kind: "rootRef", runtimeOnly: true }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } },
  hiddenPersisted: { type: { kind: "string" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 24 }, edit: { hidden: true, persist: true, persistOnly: true } }
} });
CjsSchema.meta.exposureChainTo(FilterBase)(FilterOwner);

class Notified
{
  value = 0;
  notifications = [];
  OnModified(name) { this.notifications.push([name, this.value]); return true; }
}
CjsSchema.define(Notified, { name: "BlueReaderPlainNotified", fields: {
  value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 20 }, edit: { persist: true, notify: true } }
} });
blue.interface(INotify)(Notified);
class UnexposedNotify extends Notified {}
// No chain, so INotify is not mapped. It maps value itself, as Carbon's table would have to.
CjsSchema.define(UnexposedNotify, { name: "BlueReaderPlainUnexposedNotify", fields: {
  value: { type: { kind: "int32" }, exposure: { macro: "MAP_ATTRIBUTE", flags: 20 }, edit: { persist: true, notify: true } }
} });
blue.interface()(UnexposedNotify);

class LegacyOwner extends Owner
{
  SetValues(values, options) { this.legacyCall = { values, options }; }
}
CjsSchema.define(LegacyOwner, { name: "BlueReaderPlainLegacyOwner" });
CjsSchema.meta.exposureChainTo(Owner)(LegacyOwner);

test("YamlReader preserves declared list ownership and initializes children before list completion", () =>
{
  const source = `type: ${ownerName}\nname: red\nitems:\n- &child {type: ${itemName}, value: 12}\n- *child\n- null\n`;
  const owner = new YamlReader().CreateObjectFromString(source);
  AssertOwned(owner);
  assert.equal(owner.items.length, 2);
  assert.equal(owner.items[0], owner.items[1]);
  assert.ok(owner.items[0] instanceof Item);
  assert.equal(owner.items[0].value, 12);
  assert.deepEqual(owner.events.map(entry => entry.event), [BELIST_LOADFINISHED]);
  assert.equal(owner.events[0].notify, owner);
  assert.deepEqual(owner.events[0].childInitializeCounts, [1, 1]);
  assert.equal(owner.initializeCount, 1);
  assert.equal(owner.items[0].initializeCount, 1);
  assert.deepEqual(owner.childInitializeCounts, [1, 1]);
  const values = CjsSchema.getValues(owner, {}, { typeTags: true });
  assert.equal(values.items[0].value, 12);
  assert.equal(values.items[1]._ref, values.items[0]._id, "DictWriter encodes shared object identity");
});

test("strict YamlReader refuses undeclared attributes and unresolved classes", () =>
{
  const reader = new YamlReader();
  reader._isStrict = true;
  assert.throws(() => reader.CreateObjectFromString(`type: ${ownerName}\nunknownOwner: 7\n`), /unknownOwner/);
  assert.throws(() => reader.CreateObjectFromString("type: UnresolvedPlainListCarrier\n"));
});

test("YamlReader's native setting suppresses mapped Initialize", () =>
{
  const reader = new YamlReader();
  reader.SetDoInitialize(false);
  const owner = reader.CreateObjectFromString(`type: ${ownerName}\nitems:\n- {type: ${itemName}, value: 15}\n`);
  AssertOwned(owner);
  assert.equal(owner.items[0].value, 15);
  assert.equal(owner.items[0].initializeCount, 0);
  assert.equal(owner.initializeCount, 0);
});
