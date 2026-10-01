import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { BlueList } from "../../src/global/blue/BlueList.js";
import { IList } from "../../src/global/blue/IList.js";
import { IListNotify } from "../../src/global/blue/IListNotify.js";
import { DictReader, CreateAnchorTable } from "../../src/global/blue/DictReader.js";
import { BLUELISTEVENT } from "../../src/global/consts/blue.js";

const { BELIST_UNLOADSTART, BELIST_LOADFINISHED } = BLUELISTEVENT;
const itemName = "BlueListReaderItem";

class Item { value = 0; }
CjsSchema.define(Item, { className: itemName, fields: { value: { type: { kind: "int32" }, edit: { persist: true } } } });
meta.carbon.interfaceTable({ interfaces: [ Item ], chainTo: null })(Item);

class WrongItem extends Item {}
CjsSchema.define(WrongItem, { className: "BlueListReaderWrongItem" });
meta.carbon.interfaceTable({ interfaces: [], chainTo: null })(WrongItem);

class Owner
{
  items = new BlueList(Item, { className: itemName, listOps: IList.LISTOPS.LIST_READONLY });
  target = null;
  ordinary = [];
  numbers = [];
}
CjsSchema.define(Owner, { className: "BlueListReaderOwner", fields: {
  items: { type: { kind: "list", itemType: itemName }, edit: { persist: true } },
  target: { type: { kind: "objectRef", className: itemName }, edit: { persist: true } },
  ordinary: { type: { kind: "list", itemType: itemName }, edit: { persist: true } },
  numbers: { type: { kind: "array", itemType: "int32" }, edit: { persist: true } }
} });

class Observer extends IListNotify
{
  events = [];
  OnListModified(event, key, key2, value, list)
  {
    const info = {};
    list.GetInfo(info);
    this.events.push({ event, key, key2, value, list, items: Array.from(list), observer: info.notify });
  }
}

function MakeItem(value)
{
  const item = new Item();
  item.value = value;
  return item;
}

function Setup(old = [ MakeItem(9) ])
{
  const owner = new Owner(), observer = new Observer();
  owner.items.push(...old);
  owner.items.SetNotify(observer);
  return { owner, observer, list: owner.items };
}

function Info(list)
{
  const info = {};
  list.GetInfo(info);
  return info;
}

function Events(observer)
{
  return observer.events.map(entry => entry.event);
}

test("mapped IList preserves its destination/configuration and native observer-visible load states", () =>
{
  const { owner, list, observer } = Setup();
  const old = list[0], calls = [];
  const append = list.Append;
  list.Append = function(item)
  {
    assert.equal(Info(this).notify, null, "Append sees the muted observer");
    calls.push(item);
    return append.call(this, item);
  };
  const changed = new DictReader().ReadInto(owner, { items: [ { value: 1 }, { value: 2 } ] });
  assert.deepEqual([...changed], [ "items" ]);
  assert.equal(owner.items, list);
  assert.deepEqual(list.map(item => item.value), [ 1, 2 ]);
  assert.deepEqual(calls, Array.from(list));
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
  assert.deepEqual(observer.events[0].items, [ old ]);
  assert.deepEqual(observer.events[1].items, Array.from(list));
  for (const event of observer.events)
  {
    assert.equal(event.list, list);
    assert.equal(event.observer, observer);
    assert.deepEqual([ event.key, event.key2, event.value ], [ 0, 0, null ]);
  }
  assert.deepEqual(Info(list), { iid: Item, clsid: itemName, listOps: 7, notify: observer });
});

test("observer capture occurs after clear and before muting", () =>
{
  const { owner, list, observer } = Setup();
  const replacement = new Observer();
  const notify = observer.OnListModified;
  observer.OnListModified = function(...args)
  {
    notify.apply(this, args);
    assert.deepEqual(Array.from(list), this.events[0].items);
    list.SetNotify(replacement);
  };
  new DictReader().ReadInto(owner, { items: [ { value: 1 } ] });
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
  assert.deepEqual(Events(replacement), [ BELIST_LOADFINISHED ]);
  assert.equal(Info(list).notify, replacement);
});

test("composition without an exact IList mapping retains the ordinary array path", () =>
{
  class UnexposedList extends BlueList {}
  meta.carbon.interfaceTable({ interfaces: [], chainTo: null })(UnexposedList);
  const { owner, observer } = Setup();
  const list = new UnexposedList(Item, { className: itemName });
  list.SetNotify(observer);
  owner.items = list;
  assert.equal(CjsSchema.cast(list, IList), list);
  new DictReader().ReadInto(owner, { items: [ null, { value: 2 } ] });
  assert.equal(owner.items, list);
  assert.equal(list[0], null);
  assert.equal(list[1].value, 2);
  assert.deepEqual(Events(observer), []);
});

test("empty loads complete even when no unload or content change occurs", () =>
{
  const { owner, list, observer } = Setup([]);
  assert.equal(new DictReader().ReadInto(owner, { items: [] }).size, 0);
  assert.deepEqual(Events(observer), [ BELIST_LOADFINISHED ]);
  assert.deepEqual(observer.events[0].items, []);
  assert.equal(owner.items, list);
});

test("native Append rejection skips wrong nominal exposure and continues to completion", () =>
{
  const { owner, list, observer } = Setup();
  const wrong = new WrongItem();
  assert.equal(CjsSchema.cast(wrong, Item), wrong, "ordinary inheritance is insufficient admission");
  new DictReader().ReadInto(owner, { items: [ wrong, { value: 3 }, { _type: "BlueListReaderWrongItem", value: 4 } ] });
  assert.deepEqual(list.map(item => item.value), [ 3 ]);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
  observer.events.length = 0;
  new DictReader().ReadInto(owner, { items: [ wrong ] });
  assert.equal(list.length, 0);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
});

test("non-list inputs fail before clearing, while null/scalar items retain the accepted prefix", () =>
{
  for (const source of [ null, undefined, {}, 3 ])
  {
    const { owner, list, observer } = Setup();
    const old = list[0];
    assert.throws(() => new DictReader().ReadInto(owner, { items: source }), /Expected a list/u);
    assert.deepEqual(Array.from(list), [ old ]);
    assert.equal(Info(list).notify, observer);
    assert.deepEqual(Events(observer), []);
  }
  for (const bad of [ null, undefined, 2, [] ])
  {
    const { owner, list, observer } = Setup();
    assert.throws(() => new DictReader().ReadInto(owner, { items: [ { value: 1 }, bad, { value: 2 } ] }), /items \[1\].*\n.*Expected a dictionary/us);
    assert.deepEqual(list.map(item => item.value), [ 1 ]);
    assert.equal(Info(list).notify, observer);
    assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
  }
});

test("backward and repeated references retain live object identities", () =>
{
  const { owner, list, observer } = Setup();
  const live = MakeItem(5);
  new DictReader().ReadInto(owner, { target: { _id: "back", value: 1 }, items: [ { _ref: "back" }, live, { _ref: "back" } ] });
  assert.deepEqual(Array.from(list), [ owner.target, live, owner.target ]);
  assert.equal(list[0], list[2]);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
});

test("forward/shared references append in source order without null placeholders", () =>
{
  const { owner, list, observer } = Setup();
  const append = list.Append, appended = [];
  list.Append = function(item)
  {
    assert.ok(item);
    assert.equal(Info(this).notify, null);
    appended.push(item);
    return append.call(this, item);
  };
  new DictReader().ReadInto(owner, {
    items: [ { _ref: "later" }, { _id: "inner", value: 2 }, { _ref: "later" }, { _ref: "inner" } ],
    target: { _id: "later", value: 1 }
  });
  assert.deepEqual(list.map(item => item.value), [ 1, 2, 1, 2 ]);
  assert.equal(list[0], owner.target);
  assert.equal(list[0], list[2]);
  assert.equal(list[1], list[3]);
  assert.deepEqual(appended, Array.from(list));
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
  assert.deepEqual(observer.events[1].items, Array.from(list));
});

test("external anchor finalization can finish an accepted forward reference across reader calls", () =>
{
  const anchors = CreateAnchorTable(), reader = new DictReader({ importContext: anchors });
  const { owner, list, observer } = Setup();
  reader.ReadInto(owner, { items: [ { _ref: "later" }, { value: 2 } ] });
  assert.deepEqual(Array.from(list), []);
  assert.equal(Info(list).notify, observer);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
  reader.ReadInto(owner, { target: { _id: "later", value: 1 } });
  assert.deepEqual(Array.from(list), [], "registration alone does not prematurely finalize the batch");
  anchors.finalize();
  assert.deepEqual(Array.from(list), [ owner.target, list[1] ]);
  assert.equal(list[1].value, 2);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
});

test("unresolved references do not append a deferred partial batch or announce completion", () =>
{
  const { owner, list, observer } = Setup();
  assert.throws(() => new DictReader().ReadInto(owner, {
    items: [ { value: 1 }, { _ref: "found" }, { _ref: "missing" } ],
    target: { _id: "found", value: 2 }
  }), /Unresolved _ref ids/u);
  assert.deepEqual(list.map(item => item.value), [ 1 ]);
  assert.equal(Info(list).notify, observer);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
});

test("a later read supersedes the same list's pending population across either reader identity", () =>
{
  for (const separateReader of [ false, true ])
  {
    const anchors = CreateAnchorTable(), reader = new DictReader({ importContext: anchors });
    const { owner, list, observer } = Setup();
    reader.ReadInto(owner, { items: [ { _ref: "late" } ] });
    const nextReader = separateReader ? new DictReader({ importContext: anchors }) : reader;
    nextReader.ReadInto(owner, { items: [ { value: 9 } ] });
    anchors.register("late", MakeItem(1));
    anchors.finalize();
    assert.deepEqual(list.map(item => item.value), [ 9 ]);
    assert.equal(owner.items, list);
    assert.equal(Info(list).notify, observer);
    assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
  }
});

test("a new population cancels only its destination and leaves another list's references active", () =>
{
  const anchors = CreateAnchorTable(), reader = new DictReader({ importContext: anchors });
  const first = Setup(), second = Setup();
  reader.ReadInto(first.owner, { items: [ { _ref: "first" } ] });
  reader.ReadInto(second.owner, { items: [ { _ref: "second" } ] });
  reader.ReadInto(first.owner, { items: [ { value: 9 } ] });
  anchors.register("first", MakeItem(1));
  const other = MakeItem(2);
  anchors.register("second", other);
  anchors.finalize();
  assert.deepEqual(first.list.map(item => item.value), [ 9 ]);
  assert.deepEqual(Array.from(second.list), [ other ]);
  assert.deepEqual(Events(first.observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
  assert.deepEqual(Events(second.observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
});

test("two declared fields addressing the same IList supersede its earlier pending population", () =>
{
  const observer = new Observer();
  class AliasedOwner extends Owner
  {
    replacement = this.items;
    constructor()
    {
      super();
      this.items.SetNotify(observer);
    }
  }
  CjsSchema.define(AliasedOwner, { className: "BlueListReaderAliasedOwner", fields: {
    replacement: { type: { kind: "list", itemType: itemName }, edit: { persist: true } }
  } });
  const owner = new DictReader().CreateObject({
    _type: "BlueListReaderAliasedOwner",
    items: [ { _ref: "late" } ],
    replacement: [ { value: 9 } ],
    target: { _id: "late", value: 1 }
  });
  assert.equal(owner.items, owner.replacement);
  assert.deepEqual(owner.items.map(item => item.value), [ 9 ]);
  assert.equal(Info(owner.items).notify, observer);
  assert.deepEqual(Events(observer), [ BELIST_LOADFINISHED ]);
});

test("a later unrelated member error cancels stale deferred list callbacks", () =>
{
  const anchors = CreateAnchorTable(), reader = new DictReader({ importContext: anchors });
  const { owner, list, observer } = Setup();
  assert.throws(() => reader.ReadInto(owner, { items: [ { value: 1 }, { _ref: "late" } ], unknown: 1 }), /Invalid attribute/u);
  anchors.register("late", MakeItem(2));
  anchors.finalize();
  assert.deepEqual(list.map(item => item.value), [ 1 ]);
  assert.equal(Info(list).notify, observer);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
});

test("owned finalization failure suppresses deferred list completion even after its own refs resolve", () =>
{
  const { owner, list, observer } = Setup();
  assert.throws(() => new DictReader().ReadInto(owner, {
    items: [ { _ref: "found" }, { _id: "found", value: 1 } ],
    target: { _ref: "unrelatedMissing" }
  }), /Unresolved _ref ids/u);
  assert.equal(list.length, 2, "resolved contents are retained without a rollback claim");
  assert.equal(list[0], list[1]);
  assert.equal(Info(list).notify, observer);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
});

test("CreateObject failure also cancels this reader's deferred list writes", () =>
{
  const anchors = CreateAnchorTable(), observer = new Observer();
  let captured;
  class CapturedOwner extends Owner
  {
    constructor()
    {
      super();
      captured = this;
      this.items.push(MakeItem(9));
      this.items.SetNotify(observer);
    }
  }
  CjsSchema.define(CapturedOwner, { className: "BlueListReaderCapturedOwner" });
  const reader = new DictReader({ importContext: anchors });
  assert.throws(() => reader.CreateObject({ _type: "BlueListReaderCapturedOwner", items: [ { value: 1 }, { _ref: "late" } ], unknown: 1 }), /Invalid attribute/u);
  anchors.register("late", MakeItem(2));
  anchors.finalize();
  assert.deepEqual(captured.items.map(item => item.value), [ 1 ]);
  assert.equal(Info(captured.items).notify, observer);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
});

test("existing explicit factory dispatch retains options and sees the muted destination", () =>
{
  const { owner, list, observer } = Setup();
  const anchors = CreateAnchorTable(), token = {};
  let made;
  class FactoryItem
  {
    static from(values, options)
    {
      assert.equal(options.importContext, anchors);
      assert.equal(options.token, token);
      assert.equal(Info(list).notify, null);
      assert.deepEqual(Array.from(list), []);
      made = MakeItem(values.value);
      return made;
    }
  }
  CjsSchema.define(FactoryItem, { className: "BlueListReaderExplicitFactory" });
  new DictReader({ importContext: anchors, token }).ReadInto(owner, { items: [ { _type: "BlueListReaderExplicitFactory", value: 7 } ] });
  assert.equal(list[0], made);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
});

test("unknown classes and explicit factory errors restore observers and cancel pending writes", () =>
{
  const failure = new Error("reader factory failure");
  class FactoryItem
  {
    static from() { throw failure; }
  }
  CjsSchema.define(FactoryItem, { className: "BlueListReaderFactoryFailure" });
  for (const bad of [ { _type: "BlueListReaderUnknownClass" }, { _type: "BlueListReaderFactoryFailure" } ])
  {
    const anchors = CreateAnchorTable(), reader = new DictReader({ importContext: anchors });
    const { owner, list, observer } = Setup();
    assert.throws(() => reader.ReadInto(owner, { items: [ { value: 1 }, { _ref: "late" }, bad ] }),
      error => bad._type === "BlueListReaderFactoryFailure" ? error === failure : /not found in the Blue class registry/u.test(error.message));
    anchors.register("late", MakeItem(2));
    anchors.finalize();
    assert.deepEqual(list.map(item => item.value), [ 1 ]);
    assert.equal(Info(list).notify, observer);
    assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
  }
});

test("a deferred Append exception preserves its prefix and deactivates remaining callbacks", () =>
{
  const anchors = CreateAnchorTable(), reader = new DictReader({ importContext: anchors });
  const { owner, list, observer } = Setup();
  const append = list.Append, failure = new Error("append failure");
  let calls = 0;
  list.Append = function(item)
  {
    if (++calls === 2) throw failure;
    return append.call(this, item);
  };
  reader.ReadInto(owner, { items: [ { _ref: "one" }, { _ref: "two" }, { _ref: "three" } ] });
  anchors.register("one", MakeItem(1));
  anchors.register("two", MakeItem(2));
  anchors.register("three", MakeItem(3));
  assert.throws(() => anchors.finalize(), error => error === failure);
  anchors.finalize();
  assert.equal(calls, 2);
  assert.deepEqual(list.map(item => item.value), [ 1 ]);
  assert.equal(Info(list).notify, observer);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART ]);
});

test("a mapped list supplied as its own input retains items through the clear", () =>
{
  const { owner, list, observer } = Setup([ MakeItem(1), MakeItem(2) ]);
  const before = Array.from(list);
  assert.equal(new DictReader().ReadInto(owner, { items: list }).size, 0);
  assert.equal(owner.items, list);
  assert.deepEqual(Array.from(list), before);
  assert.deepEqual(Events(observer), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
});

test("ordinary object and value arrays retain their existing null/reference behavior", () =>
{
  const owner = new Owner(), ordinary = owner.ordinary;
  new DictReader().ReadInto(owner, { ordinary: [ null, { _ref: "later" }, { value: 3 } ], numbers: [ 1, 2 ], target: { _id: "later", value: 4 } });
  assert.equal(owner.ordinary, ordinary);
  assert.equal(ordinary[0], null);
  assert.equal(ordinary[1], owner.target);
  assert.equal(ordinary[2].value, 3);
  assert.deepEqual(owner.numbers, [ 1, 2 ]);
  new DictReader().ReadInto(owner, { ordinary: null, numbers: null });
  assert.equal(owner.ordinary, null);
  assert.equal(owner.numbers, null);
});
