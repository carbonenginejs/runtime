import assert from "node:assert/strict";
import test from "node:test";
import { BlueList } from "../../src/global/blue/BlueList.js";
import { IList } from "../../src/global/blue/IList.js";
import { IListNotify } from "../../src/global/blue/IListNotify.js";
import { Copier } from "../../src/global/blue/Copier.js";
import { ICopier } from "../../src/global/blue/ICopier.js";
import { IInitialize } from "../../src/global/blue/IInitialize.js";
import { INotify } from "../../src/global/blue/INotify.js";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { BLUELISTEVENT } from "../../src/global/consts/blue.js";

const { FALLBACK, FAILURE, SUCCESS } = ICopier.OverrideResult;
const { BELIST_UNLOADSTART, BELIST_LOADFINISHED } = BLUELISTEVENT;

class ItemContract {}
CjsSchema.define(ItemContract, { className: "BlueListCopierItem", fields: {} });

class Leaf
{
  value = 0;
  owner = null;
}
meta.blue.inherit(ItemContract)(Leaf);
meta.blue.mapInterface(ItemContract)(Leaf);
CjsSchema.define(Leaf, { className: "BlueListCopierLeaf", fields: {
  value: [ meta.type.int32, meta.blue.persist ],
  owner: [ meta.type.objectRef("BlueListCopierHost"), meta.blue.persist ]
} });

class DerivedLeaf extends Leaf
{
  extra = 0;
}
CjsSchema.define(DerivedLeaf, { className: "BlueListCopierDerivedLeaf", fields: {
  extra: [ meta.type.int32, meta.blue.persist ]
} });

class Host
{
  items = new BlueList(ItemContract);
  sibling = null;
  initialized = 0;

  Initialize()
  {
    this.initialized++;
    return true;
  }
}
meta.blue.mapInterface(IInitialize)(Host);
CjsSchema.define(Host, { className: "BlueListCopierHost", fields: {
  items: [ meta.type.list("BlueListCopierItem"), meta.blue.persist ],
  sibling: [ meta.type.objectRef("BlueListCopierItem"), meta.blue.persist ]
} });

class Observer extends IListNotify
{
  events = [];

  OnListModified(event, key, key2, value, list)
  {
    this.events.push({ event, key, key2, value, list, items: Array.from(list) });
  }
}

function MakeLeaf(value)
{
  const leaf = new Leaf();
  leaf.value = value;
  return leaf;
}

function Observe(list)
{
  const observer = new Observer();
  list.SetNotify(observer);
  return observer;
}

test("configured list copy preserves destination and observer, pre-sizes, and finishes once", () =>
{
  const source = new Host(), destination = new Host();
  const first = MakeLeaf(4), derived = new DerivedLeaf();
  derived.value = 5;
  derived.extra = 9;
  source.items.push(first, derived);
  const sourceObserver = Observe(source.items);
  const originalList = destination.items, old = MakeLeaf(-1);
  destination.items.push(old);
  const observer = Observe(destination.items), copier = new Copier();
  copier.SetCopyOverrideCallback(item =>
  {
    if (item === first)
    {
      assert.equal(destination.items, originalList);
      assert.deepEqual(Array.from(destination.items), [ null, null ]);
      assert.equal(observer.events.length, 1);
      assert.deepEqual(observer.events[0].items, [ old ]);
    }
    return { result: FALLBACK };
  });
  assert.equal(copier.CopyTo(source, destination), destination);
  assert.equal(destination.items, originalList);
  const info = {};
  destination.items.GetInfo(info);
  assert.equal(info.notify, observer);
  assert.deepEqual(observer.events.map(event => event.event), [ BELIST_UNLOADSTART, BELIST_LOADFINISHED ]);
  for (const event of observer.events)
  {
    assert.equal(event.list, originalList);
    assert.equal(event.key, 0);
    assert.equal(event.key2, 0);
    assert.equal(event.value, null);
  }
  assert.deepEqual(sourceObserver.events, []);
  assert.notEqual(destination.items[0], first);
  assert.equal(destination.items[0].value, 4);
  assert.equal(destination.items[1].constructor, DerivedLeaf);
  assert.equal(destination.items[1].extra, 9);
  assert.equal(destination.initialized, 1);
});

test("empty explicitly configured lists dispatch before the object-content heuristic", () =>
{
  class UnregisteredItem {}
  class EmptyHost { items = new BlueList(UnregisteredItem); }
  CjsSchema.define(EmptyHost, { className: "BlueListCopierEmptyHost", fields: {
    items: [ meta.type.list("BlueListCopierUnregisteredItem"), meta.blue.persist ]
  } });
  const source = new EmptyHost(), destination = new EmptyHost();
  const old = MakeLeaf(1), originalList = destination.items;
  destination.items.push(old); // Raw storage deliberately bypasses item admission.
  const observer = Observe(destination.items);
  assert.equal(CjsSchema.getClassName(UnregisteredItem), null);
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(destination.items, originalList);
  assert.equal(originalList.length, 0);
  assert.deepEqual(observer.events.map(event => event.event), [ BELIST_UNLOADSTART ]);
  assert.deepEqual(observer.events[0].items, [ old ]);
  observer.events.length = 0;
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.deepEqual(observer.events, [], "empty success sends no finish notification");
});

test("array declarations preserve explicit storage and notify the owner after list completion", () =>
{
  class ArrayHost
  {
    items = new BlueList(ItemContract);
    modified = [];

    OnModified(name)
    {
      assert.equal(observer.events.at(-1).event, BELIST_LOADFINISHED);
      this.modified.push([ name, this.items, this.items[0].value ]);
      return true;
    }
  }
  meta.blue.mapInterface(INotify)(ArrayHost);
  CjsSchema.define(ArrayHost, { className: "BlueListCopierArrayHost", fields: {
    items: [ meta.type.array({ kind: "objectRef", className: "BlueListCopierItem" }), meta.blue.persist ]
  } });
  const source = new ArrayHost(), destination = new ArrayHost(), original = destination.items;
  source.items.push(MakeLeaf(12));
  const observer = Observe(original);
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(destination.items, original);
  assert.deepEqual(destination.modified, [ [ "items", original, 12 ] ]);
  assert.deepEqual(observer.events.map(event => event.event), [ BELIST_LOADFINISHED ]);
  source.items = [];
  assert.equal(new Copier().CopyTo(source, destination), null);
  assert.equal(original[0].value, 12);
  assert.equal(destination.modified.length, 1);
});

test("explicit/plain and mismatched empty configurations cannot bypass validation", () =>
{
  class OtherItem {}
  class OtherList extends BlueList {}
  const pairs = [
    [ new BlueList(ItemContract), [] ],
    [ [], new BlueList(ItemContract) ],
    [ new BlueList(ItemContract), null ],
    [ new BlueList(ItemContract), new BlueList(OtherItem) ],
    [ new BlueList(ItemContract), new OtherList(ItemContract) ],
    [ new BlueList(ItemContract, { className: "BlueListCopierLeaf" }), new BlueList(ItemContract, { className: "BlueListCopierDerivedLeaf" }) ],
    [ new BlueList(ItemContract), new BlueList(ItemContract, { listOps: IList.LISTOPS.LIST_READONLY }) ]
  ];
  for (const [ from, to ] of pairs)
  {
    const source = new Host(), destination = new Host();
    source.items = from;
    destination.items = to;
    assert.equal(new Copier().CopyTo(source, destination), null);
    assert.equal(destination.items, to);
    assert.equal(destination.initialized, 0);
  }
});

test("nominal source custom assignment is required despite an inherited AssignTo method", () =>
{
  class ListWithoutAssignment extends BlueList {}
  meta.blue.interfaceTable({ interfaces: [ IList ], chainTo: null })(ListWithoutAssignment);
  const source = new ListWithoutAssignment(ItemContract), destination = new ListWithoutAssignment(ItemContract);
  source.AssignTo = () => assert.fail("unmapped assignment must not be called");
  assert.equal(new Copier().CopyTo(source, destination), null);
  const from = new Host(), to = new Host();
  from.items = source;
  to.items = destination;
  assert.equal(new Copier().CopyTo(from, to), null);
});

test("generic root and embedded struct copies need no fabricated registered list identity", () =>
{
  const source = new BlueList(ItemContract), destination = new BlueList(ItemContract);
  source.push(MakeLeaf(8));
  assert.equal(CjsSchema.getClassName(BlueList), null);
  assert.equal(CjsSchema.GetConstructor("BlueList"), null);
  assert.equal(new Copier().CopyTo(source), null, "no constructor configuration is guessed");
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(destination[0].value, 8);
  assert.notEqual(destination[0], source[0]);
  class EmbeddedHost { items = new BlueList(ItemContract); }
  CjsSchema.define(EmbeddedHost, { className: "BlueListCopierEmbeddedHost", fields: {
    items: [ meta.type.struct("IList"), meta.blue.persist ]
  } });
  const from = new EmbeddedHost(), to = new EmbeddedHost(), original = to.items;
  from.items.push(MakeLeaf(3));
  assert.equal(new Copier().CopyTo(from, to), to);
  assert.equal(to.items, original);
  assert.equal(to.items[0].value, 3);
  assert.equal(CjsSchema.getClassName(BlueList), null);
});

test("the enclosing copy shares child identities across custom assignment and sibling fields", () =>
{
  const source = new Host(), shared = MakeLeaf(7);
  source.items.push(shared, shared);
  source.sibling = shared;
  const copy = new Copier().CopyTo(source);
  assert.notEqual(copy.items[0], shared);
  assert.equal(copy.items[0], copy.items[1]);
  assert.equal(copy.items[0], copy.sibling);
  const direct = new BlueList(ItemContract);
  assert.equal(new Copier().CopyTo(source.items, direct), direct);
  assert.equal(direct[0], direct[1], "a supplied list root owns one memo scope too");
});

test("registered parent cycles close only on allocated targets, retaining supplied-target semantics", () =>
{
  const source = new Host(), leaf = MakeLeaf(2);
  source.items.push(leaf);
  leaf.owner = source;
  const copy = new Copier().CopyTo(source);
  assert.equal(copy.items[0].owner, copy);
  const supplied = new Host();
  assert.equal(new Copier().CopyTo(source, supplied), supplied);
  assert.notEqual(supplied.items[0].owner, supplied);
  assert.equal(supplied.items[0].owner.items[0], supplied.items[0]);
});

test("generic list self-reference fails without fabricating allocation or mapping a supplied root", () =>
{
  const source = new BlueList(IList), destination = new BlueList(IList);
  source.push(source);
  const observer = Observe(destination);
  assert.equal(new Copier().CopyTo(source, destination), null);
  assert.equal(destination.length, 0);
  assert.deepEqual(observer.events, []);
  assert.equal(source[0], source);
});

test("item admission failure leaves only the copied prefix without finish or parent initialization", () =>
{
  const source = new Host(), destination = new Host();
  const first = MakeLeaf(1), rejected = MakeLeaf(2);
  source.items.push(first, rejected, MakeLeaf(3));
  destination.items.push(MakeLeaf(-1));
  const observer = Observe(destination.items), copier = new Copier();
  copier.SetCopyOverrideCallback(item => item === rejected
    ? { result: SUCCESS, dest: new Host() }
    : { result: FALLBACK });
  assert.equal(copier.CopyTo(source, destination), null);
  assert.deepEqual(Array.from(destination.items, item => item.value), [ 1 ]);
  assert.deepEqual(observer.events.map(event => event.event), [ BELIST_UNLOADSTART ]);
  assert.equal(destination.initialized, 0);
});

for (const failure of [ "false", "throw" ])
{
  test(`a ${failure} after a copied prefix clears the outer memo before reusing the Copier`, () =>
  {
    const source = new Host(), destination = new Host();
    const first = MakeLeaf(1), rejected = MakeLeaf(2);
    source.items.push(first, rejected);
    const copier = new Copier();
    copier.SetCopyOverrideCallback(item =>
    {
      if (item !== rejected) return { result: FALLBACK };
      if (failure === "throw") throw new Error("controlled child-copy failure");
      return { result: FAILURE };
    });
    if (failure === "throw") assert.throws(() => copier.CopyTo(source, destination), /controlled child-copy failure/);
    else assert.equal(copier.CopyTo(source, destination), null);
    const partial = destination.items[0];
    assert.equal(partial.value, 1);
    assert.equal(destination.initialized, 0);
    first.value = 9;
    copier.SetCopyOverrideCallback(null);
    assert.equal(copier.CopyTo(source, destination), destination);
    assert.notEqual(destination.items[0], partial);
    assert.equal(destination.items[0].value, 9);
    assert.equal(destination.items[1].value, 2);
    assert.equal(destination.initialized, 1);
  });
}

test("plain list and map fallback keeps its established shared-child copy behavior", () =>
{
  class PlainHost { items = []; byName = new Map(); }
  CjsSchema.define(PlainHost, { className: "BlueListCopierPlainHost", fields: {
    items: [ meta.type.list("BlueListCopierItem"), meta.blue.persist ],
    byName: [ meta.type.map("BlueListCopierItem"), meta.blue.persist ]
  } });
  const source = new PlainHost(), shared = MakeLeaf(6);
  source.items.push(shared);
  source.byName.set("same", shared);
  const copy = new Copier().CopyTo(source);
  assert.equal(copy.items.constructor, Array);
  assert.notEqual(copy.items[0], shared);
  assert.equal(copy.items[0], copy.byName.get("same"));
  assert.equal(new Copier().CopyTo(new PlainHost()).items.length, 0);
});
