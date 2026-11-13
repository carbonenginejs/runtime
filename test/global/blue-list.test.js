import { IRoot as ExposureRoot } from "../../src/blue/exposure/IRoot.js";
import assert from "node:assert/strict";
import test from "node:test";
import { BlueList, IList, IListNotify, ICopierCustomAssignment, Copier, ICopier, blue } from "@carbonenginejs/runtime/blue";
import { CjsSchema, type } from "@carbonenginejs/runtime/schema";
import { BLUELISTEVENT } from "../../src/global/consts/blue.js";
import { mappedInterfaces } from "../../src/blue/compose/interface.js";
import { MarkerTag } from "../support/markerTags.js";
import { exposure as be } from "#be";

/** Carbon-stamped legacy decorators; #schema no longer exports them. */
const legacyBlue = CjsSchema.be;

class Item
{
  value = 0;
  peer = null;
}
CjsSchema.be.define(Item, {
  name: "TestBlueListItem",
  fields: {
    value: [ type.float64, be.mapAttribute(be.PERSIST) ],
    peer: [ type.rootRef("TestBlueListItem"), be.mapAttribute(be.PERSIST) ]
  }
});
legacyBlue.interface()(Item);

class UnexposedItem extends Item {}
CjsSchema.define(UnexposedItem, { name: "TestBlueListUnexposedItem" });
legacyBlue.interface()(UnexposedItem);

// This test class fixes the generic constructor arguments. Production generic
// dispatch and stored-list preservation need their explicit Copier integration;
// these outer calls do not rely on unregistered null class names matching.
class ItemList extends BlueList
{
  constructor()
  {
    super(Item, { className: "TestBlueListItem" });
  }
}
CjsSchema.define(ItemList, { name: "TestBlueListSpecialization" });

class Observer extends IListNotify
{
  events = [];

  OnListModified(event, key, key2, value, list)
  {
    this.events.push({ event, key, key2, value, list, items: Array.from(list) });
  }
}

function MakeItem(value)
{
  const item = new Item();
  item.value = value;
  return item;
}

function MakeList(items = [])
{
  const list = new BlueList(Item, { className: "TestBlueListItem" });
  for (const item of items) list.push(item);
  return list;
}

function Events(observer)
{
  return observer.events.map(entry => [ entry.event, entry.key, entry.key2 ]);
}

test("IList exposes abstract operations while BlueList keeps its generic template unregistered", () =>
{
  assert.equal(CjsSchema.getConstructor("IList"), IList);
  assert.equal(blue.classes.GetClassRegistration("IList").type, IList);
  assert.equal(CjsSchema.getClassName(BlueList), null);
  assert.equal(CjsSchema.getConstructor("BlueList"), null);
  for (const name of [ "GetSize", "GetInfo", "Insert", "Remove", "Append", "GetAt", "FindKey", "Swap", "Sort", "SetNotify", "Move", "GetAllItems" ])
  {
    assert.equal(MarkerTag("IList", name), "abstract");
    assert.throws(() => new IList()[name](), /IList\./u);
  }
  const list = MakeList();
  assert.equal(Array.isArray(list), true);
  assert.equal(CjsSchema.cast(list, IList), list);
  assert.equal(CjsSchema.cast(list, ICopierCustomAssignment), list);
  assert.deepEqual(Array.from(mappedInterfaces(BlueList)), [ExposureRoot, BlueList, IList, ICopierCustomAssignment]);
  assert.equal("SetValues" in list, false);
  assert.equal("Initialize" in list, false);
});

test("explicit template information and one observer are separate from operation enforcement", () =>
{
  assert.throws(() => new BlueList(), /element-interface constructor/u);
  assert.throws(() => new BlueList(Item, { className: "" }), /className/u);
  assert.throws(() => new BlueList(Item, { listOps: 1.5 }), /listOps/u);
  const list = new BlueList(Item, { className: "ExplicitItemAlias", listOps: IList.LISTOPS.LIST_READONLY });
  const observer = new Observer();
  list.SetNotify(observer);
  const info = { retained: true };
  assert.equal(list.GetInfo(info), undefined);
  assert.deepEqual(info, { retained: true, iid: Item, clsid: "ExplicitItemAlias", listOps: 7, notify: observer });
  assert.equal(list.Append(MakeItem(1)), true, "native listOps is metadata, not an operation guard");
  assert.equal(observer.events.length, 1);
  assert.throws(() => list.SetNotify({ OnListModified() {} }), /IListNotify/u);
  list.GetInfo(info);
  assert.equal(info.notify, observer, "invalid observer leaves the prior slot intact");
});

test("Insert(-1) and Append preserve distinct native event keys and post-mutation timing", () =>
{
  const list = MakeList();
  const observer = new Observer();
  list.SetNotify(observer);
  const a = MakeItem(1), b = MakeItem(2), c = MakeItem(3);
  assert.equal(list.Insert(-1, a), true);
  assert.equal(list.Append(b), true);
  assert.equal(list.Insert(1, c), true);
  assert.deepEqual(Events(observer), [
    [ BLUELISTEVENT.BELIST_INSERTED, 0, 0 ],
    [ BLUELISTEVENT.BELIST_INSERTED, 2, 0 ],
    [ BLUELISTEVENT.BELIST_INSERTED, 1, 0 ]
  ]);
  assert.deepEqual(observer.events.map(entry => entry.items), [ [ a ], [ a, b ], [ a, c, b ] ]);
  assert.deepEqual(observer.events.map(entry => entry.value), [ a, b, c ]);
  for (const entry of observer.events) assert.equal(entry.list, list);
});

test("admission uses native exposure rather than ordinary inheritance and rejects unchanged", () =>
{
  const a = MakeItem(1), wrong = new UnexposedItem();
  const list = MakeList([ a ]);
  const observer = new Observer();
  list.SetNotify(observer);
  assert.equal(CjsSchema.cast(wrong, Item), wrong);
  for (const value of [ wrong, null, undefined, {}, 1 ])
  {
    assert.equal(list.Insert(-1, value), false);
    assert.equal(list.Append(value), false);
    assert.equal(list.FindKey(value), -1);
  }
  assert.deepEqual(Array.from(list), [ a ]);
  assert.equal(observer.events.length, 0);
});

test("single removal notifies after erase while nonempty clear notifies before it", () =>
{
  const a = MakeItem(1), b = MakeItem(2), c = MakeItem(3);
  const list = MakeList([ a, b, c ]);
  const observer = new Observer();
  list.SetNotify(observer);
  assert.equal(list.Remove(1), true);
  assert.deepEqual(observer.events[0], { event: BLUELISTEVENT.BELIST_REMOVED, key: 1, key2: 0, value: b, list, items: [ a, c ] });
  assert.equal(list.Clear(), true);
  assert.deepEqual(observer.events[1], { event: BLUELISTEVENT.BELIST_UNLOADSTART, key: 0, key2: 0, value: null, list, items: [ a, c ] });
  assert.equal(list.GetSize(), 0);
  assert.equal(list.Remove(-1), true);
  assert.equal(observer.events.length, 2, "empty clear adds no event");
  Array.prototype.push.call(list, null);
  assert.equal(list.Remove(0), true);
  assert.equal(observer.events.length, 2, "native null storage erases without REMOVED");
});

test("observer replacement and null detachment never fan out", () =>
{
  const list = MakeList();
  const first = new Observer(), second = new Observer();
  list.SetNotify(first);
  list.Insert(-1, MakeItem(1));
  list.SetNotify(second);
  list.Insert(-1, MakeItem(2));
  list.SetNotify(null);
  list.Insert(-1, MakeItem(3));
  assert.equal(first.events.length, 1);
  assert.equal(second.events.length, 1);
  assert.equal(second.events[0].key, 1);
});

test("bounds reject invalid JS indexes without coercing them to a valid element", () =>
{
  const a = MakeItem(1), b = MakeItem(2);
  const list = MakeList([ a ]);
  const observer = new Observer();
  list.SetNotify(observer);
  for (const key of [ -2, 0.5, NaN, Infinity, "0", 2 ])
  {
    assert.equal(list.Insert(key, b), false);
    assert.equal(list.Remove(key), false);
  }
  for (const key of [ -2, 0.5, NaN, Infinity, "0", 1 ])
  {
    assert.equal(list.GetAt(key), null);
    assert.equal(list.FindKey(a, key), -1);
    assert.equal(list.Swap(key, 0), false);
    assert.equal(list.Move(0, key), false);
  }
  assert.equal(list.GetAt(0), a);
  assert.equal(list.FindKey(a), 0);
  assert.deepEqual(Array.from(list), [ a ]);
  assert.equal(observer.events.length, 0);
  assert.equal(list.Insert(1, b), true, "insertion allows one past the last item");
});

test("RangeCheck admits -1, which then fails at the vector access as Carbon's at() does", () =>
{
  const a = MakeItem(1), b = MakeItem(2), c = MakeItem(3);
  const list = MakeList([ a, b, c ]);
  const observer = new Observer();
  list.SetNotify(observer);
  assert.throws(() => list.GetAt(-1), RangeError);
  assert.throws(() => list.FindKey(a, -1), RangeError);
  assert.equal(list.FindKey(new UnexposedItem(), -1), -1, "the interface query fails before the iteration");
  assert.throws(() => list.Swap(-1, 0), RangeError);
  assert.throws(() => list.Swap(0, -1), RangeError);
  assert.deepEqual(Array.from(list), [ a, b, c ], "Swap throws before any write");
  assert.throws(() => list.Move(-1, 0), RangeError);
  assert.deepEqual(Array.from(list), [ a, b, c ], "Move(from = -1) throws before any write");
  assert.throws(() => list.Move(2, -1), RangeError);
  assert.deepEqual(Array.from(list), [ a, a, b ], "Move(to = -1) shifts every item up, then at(-1) throws");
  assert.equal(observer.events.length, 0);
});

test("Swap and Move report their native keys after mutation, including equal indexes", () =>
{
  const a = MakeItem(1), b = MakeItem(2), c = MakeItem(3);
  const list = MakeList([ a, b, c ]);
  const observer = new Observer();
  list.SetNotify(observer);
  assert.equal(list.Swap(0, 2), true);
  assert.equal(list.Move(2, 0), true);
  assert.equal(list.Move(0, 2), true);
  assert.equal(list.Swap(1, 1), true);
  assert.equal(list.Move(1, 1), true);
  assert.deepEqual(observer.events.map(entry => entry.items), [ [ c, b, a ], [ a, c, b ], [ c, b, a ], [ c, b, a ], [ c, b, a ] ]);
  assert.deepEqual(Events(observer), [
    [ BLUELISTEVENT.BELIST_SWAPPED, 0, 2 ], [ BLUELISTEVENT.BELIST_MOVED, 2, 0 ],
    [ BLUELISTEVENT.BELIST_MOVED, 0, 2 ], [ BLUELISTEVENT.BELIST_SWAPPED, 1, 1 ],
    [ BLUELISTEVENT.BELIST_MOVED, 1, 1 ]
  ]);
  for (const entry of observer.events) assert.equal(entry.value, null);
});

test("Sort uses the context-first boolean comparator without notifications", () =>
{
  const list = MakeList([ MakeItem(3), MakeItem(1), MakeItem(2) ]);
  const observer = new Observer();
  list.SetNotify(observer);
  const context = {};
  let calls = 0;
  assert.equal(list.Sort((received, a, b) =>
  {
    assert.equal(received, context);
    calls++;
    return a.value < b.value;
  }, context), undefined);
  assert.ok(calls > 0);
  assert.deepEqual(list.map(item => item.value), [ 1, 2, 3 ]);
  assert.equal(observer.events.length, 0);
});

test("Array's mutators send Carbon's events, in Carbon's order", () =>
{
  const a = MakeItem(1), b = MakeItem(2), c = MakeItem(3), d = MakeItem(4);
  const list = MakeList();
  const observer = new Observer();
  list.SetNotify(observer);
  const { BELIST_INSERTED, BELIST_REMOVED } = BLUELISTEVENT;

  assert.equal(list.push(a, b), 2);
  assert.equal(list.unshift(c, d), 4);
  assert.deepEqual(Array.from(list), [ c, d, a, b ]);
  assert.equal(list.pop(), b);
  assert.equal(list.shift(), c);
  assert.deepEqual(Array.from(list), [ d, a ]);
  assert.deepEqual(Events(observer), [
    [ BELIST_INSERTED, 1, 0 ], [ BELIST_INSERTED, 2, 0 ],
    [ BELIST_INSERTED, 0, 0 ], [ BELIST_INSERTED, 1, 0 ],
    [ BELIST_REMOVED, 3, 0 ], [ BELIST_REMOVED, 0, 0 ]
  ]);

  const empty = MakeList();
  assert.equal(empty.pop(), undefined);
  assert.equal(empty.shift(), undefined);
});

test("splice follows Array's arguments, with one event per item", () =>
{
  const items = [ 1, 2, 3, 4, 5 ].map(MakeItem);
  const [ a, b, c, d, e ] = items;
  const list = MakeList(items);
  const observer = new Observer();
  list.SetNotify(observer);
  const { BELIST_INSERTED, BELIST_REMOVED } = BLUELISTEVENT;

  const added = MakeItem(6);
  const removed = list.splice(1, 2, added);
  assert.equal(removed.constructor, Array);
  assert.deepEqual(removed, [ b, c ]);
  assert.deepEqual(Array.from(list), [ a, added, d, e ]);
  assert.deepEqual(Events(observer), [ [ BELIST_REMOVED, 1, 0 ], [ BELIST_REMOVED, 1, 0 ], [ BELIST_INSERTED, 1, 0 ] ]);

  assert.deepEqual(list.splice(), []);
  assert.deepEqual(list.splice(1, 0), []);
  assert.deepEqual(list.splice(1, -3), []);
  assert.deepEqual(list.splice(99, 1), []);
  assert.deepEqual(list.splice(-1), [ e ]);
  assert.deepEqual(list.splice(-99, 1), [ a ]);
  assert.deepEqual(list.splice(1), [ d ]);
  assert.deepEqual(Array.from(list), [ added ]);

  const wrong = new UnexposedItem();
  list.push(wrong);
  list.splice(1, 0, b);
  assert.deepEqual(Array.from(list), [ added, b, wrong ], "only Append and Insert refuse an item");
});

test("sort and reverse reorder through Swap; fill and copyWithin throw", () =>
{
  const a = MakeItem(1), b = MakeItem(2), c = MakeItem(3);
  const list = MakeList([ c, a, b ]);
  const observer = new Observer();
  list.SetNotify(observer);
  const { BELIST_SWAPPED } = BLUELISTEVENT;

  assert.equal(list.sort((x, y) => x.value - y.value), list);
  assert.deepEqual(Array.from(list), [ a, b, c ]);
  assert.deepEqual(Events(observer), [ [ BELIST_SWAPPED, 0, 1 ], [ BELIST_SWAPPED, 1, 2 ] ]);

  observer.events.length = 0;
  list.sort((x, y) => x.value - y.value);
  assert.equal(observer.events.length, 0, "nothing out of place sends nothing");

  assert.equal(list.reverse(), list);
  assert.deepEqual(Array.from(list), [ c, b, a ]);
  assert.deepEqual(Events(observer), [ [ BELIST_SWAPPED, 0, 2 ] ]);

  const quiet = MakeList([ c, a, b ]);
  quiet.sort((x, y) => x.value - y.value);
  assert.deepEqual(Array.from(quiet), [ a, b, c ]);
  assert.deepEqual(Array.from(quiet.reverse()), [ c, b, a ]);

  assert.throws(() => list.fill(a), TypeError);
  assert.throws(() => list.copyWithin(0, 1), TypeError);
});

test("a refused item is logged, naming the list and the class", t =>
{
  const lines = [];
  for (const name of [ "log", "info", "warn", "error" ]) t.mock.method(console, name, (...args) => lines.push(args.join(" ")));
  const list = MakeList();
  assert.equal(list.Append(new UnexposedItem()), false);
  assert.equal(list.Insert(0, null), false);
  assert.equal(list.GetSize(), 0);
  assert.equal(lines.length, 2, lines.join());
  assert.match(lines[0], /refused/);
});

test("raw array access is asked for deliberately, and species stays ordinary", () =>
{
  const list = MakeList();
  const observer = new Observer();
  list.SetNotify(observer);
  const wrong = new UnexposedItem(), a = MakeItem(1);
  Array.prototype.push.call(list, wrong);
  list[0] = a;
  const removed = Array.prototype.splice.call(list, 0, 1, wrong);
  assert.equal(removed.constructor, Array);
  assert.deepEqual(removed, [ a ]);
  assert.equal(list.slice().constructor, Array);
  assert.equal(list.map(value => value).constructor, Array);
  const view = list.GetAllItems();
  assert.equal(view.items, list);
  assert.equal(view.size, 1);
  Array.prototype.push.call(view.items, a);
  assert.equal(view.size, 1, "size is a snapshot, not a live getter");
  assert.equal(list.length, 2);
  assert.equal(observer.events.length, 0);
});

test("Replace preserves native removal before failed replacement admission", () =>
{
  const a = MakeItem(1), b = MakeItem(2);
  const list = MakeList([ a, b ]);
  const observer = new Observer();
  list.SetNotify(observer);
  assert.equal(list.Replace(0, new UnexposedItem()), false);
  assert.deepEqual(Array.from(list), [ b ]);
  assert.deepEqual(Events(observer), [ [ BLUELISTEVENT.BELIST_REMOVED, 0, 0 ] ]);
  assert.equal(observer.events[0].value, a);
});

test("AssignFrom shares references after one destination unload and preserves the observer", () =>
{
  const a = MakeItem(1), old = MakeItem(9);
  const source = MakeList([ a ]), dest = MakeList([ old ]);
  const observer = new Observer();
  dest.SetNotify(observer);
  assert.equal(dest.AssignFrom(source), undefined);
  assert.equal(dest[0], a);
  assert.deepEqual(Events(observer), [ [ BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0 ] ]);
  assert.deepEqual(observer.events[0].items, [ old ]);
  const info = {};
  dest.GetInfo(info);
  assert.equal(info.notify, observer);
});

test("AssignTo clears before pre-sizing and sends only destination completion after copied items", () =>
{
  const a = MakeItem(1), b = MakeItem(2), old = MakeItem(9);
  const source = MakeList([ a, b ]), dest = MakeList([ old ]);
  const sourceObserver = new Observer(), observer = new Observer();
  source.SetNotify(sourceObserver);
  dest.SetNotify(observer);
  const copier = new Copier();
  let firstCopy = true;
  copier.SetCopyOverrideCallback(() =>
  {
    if (firstCopy)
    {
      firstCopy = false;
      assert.deepEqual(Array.from(dest), [ null, null ]);
      assert.deepEqual(observer.events[0].items, [ old ]);
    }
    return { result: ICopier.OverrideResult.FALLBACK };
  }, null);
  assert.equal(source.AssignTo(dest, copier), true);
  assert.deepEqual(dest.map(item => item.value), [ 1, 2 ]);
  assert.notEqual(dest[0], a);
  assert.notEqual(dest[1], b);
  assert.deepEqual(Events(observer), [ [ BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0 ], [ BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0 ] ]);
  assert.deepEqual(observer.events[1].items, Array.from(dest));
  assert.equal(observer.events[1].list, dest);
  assert.equal(observer.events[1].value, null);
  assert.equal(sourceObserver.events.length, 0);
  const info = {};
  dest.GetInfo(info);
  assert.equal(info.notify, observer);
});

test("AssignTo truncates the copied prefix on copier failure or wrong copied exposure", () =>
{
  for (const wrongExposure of [ false, true ])
  {
    const a = MakeItem(1), bad = MakeItem(2), c = MakeItem(3);
    const source = MakeList([ a, bad, c ]), dest = MakeList([ MakeItem(9) ]);
    const observer = new Observer();
    dest.SetNotify(observer);
    const copier = new Copier();
    copier.SetCopyOverrideCallback(item => item === bad
      ? wrongExposure
        ? { result: ICopier.OverrideResult.SUCCESS, dest: new UnexposedItem() }
        : { result: ICopier.OverrideResult.FAILURE }
      : { result: ICopier.OverrideResult.FALLBACK }, null);
    assert.equal(source.AssignTo(dest, copier), false);
    assert.equal(dest.length, 1);
    assert.equal(dest[0].value, 1);
    assert.notEqual(dest[0], a);
    assert.deepEqual(Events(observer), [ [ BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0 ] ]);
    assert.deepEqual(Array.from(source), [ a, bad, c ]);
  }
});

test("empty assignment has no LOADFINISHED and mismatched template facts leave the destination untouched", () =>
{
  const source = MakeList(), dest = MakeList([ MakeItem(9) ]);
  const observer = new Observer();
  dest.SetNotify(observer);
  assert.equal(source.AssignTo(dest, new Copier()), true);
  assert.equal(dest.length, 0);
  assert.deepEqual(Events(observer), [ [ BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0 ] ]);
  assert.equal(source.AssignTo(dest, new Copier()), true);
  assert.equal(observer.events.length, 1);

  for (const other of [
    new BlueList(UnexposedItem, { className: "TestBlueListItem" }),
    new BlueList(Item, { className: "OtherAlias" }),
    new BlueList(Item, { className: "TestBlueListItem", listOps: 1 })
  ])
  {
    const old = MakeItem(8);
    Array.prototype.push.call(other, old);
    other.SetNotify(observer);
    assert.equal(source.AssignTo(other, new Copier()), false);
    assert.throws(() => other.AssignFrom(source), /same configured list type/u);
    assert.deepEqual(Array.from(other), [ old ]);
  }
  assert.equal(observer.events.length, 1);
});

test("an explicitly registered test specialization uses real outer Copier memoization for shared cyclic items", () =>
{
  const a = MakeItem(1), b = MakeItem(2);
  a.peer = b;
  b.peer = a;
  const source = new ItemList(), dest = new ItemList();
  source.push(a, b, a);
  const observer = new Observer();
  dest.SetNotify(observer);
  assert.equal(new Copier().CopyTo(source, dest), dest);
  assert.equal(dest[0], dest[2]);
  assert.notEqual(dest[0], a);
  assert.notEqual(dest[1], b);
  assert.equal(dest[0].peer, dest[1]);
  assert.equal(dest[1].peer, dest[0]);
  assert.deepEqual(Events(observer), [ [ BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0 ] ]);
});

test("raw nulls and holes violate list invariants and propagate Copier exceptions without completion", () =>
{
  for (const hole of [ false, true ])
  {
    const source = new ItemList(), dest = new ItemList();
    source.push(MakeItem(1));
    if (hole) source.length = 2;
    else Array.prototype.push.call(source, null);
    dest.push(MakeItem(9));
    const observer = new Observer();
    dest.SetNotify(observer);
    assert.throws(() => new Copier().CopyTo(source, dest), TypeError);
    assert.deepEqual(Events(observer), [ [ BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0 ] ]);
  }
});
