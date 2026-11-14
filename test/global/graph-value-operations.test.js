import { EDITFLAGS } from "../../src/global/consts/blue.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsGraph, ICjsGraphRoot, CjsGraphTypeFloat, GraphMemberFlags } from "../../src/global/model/graph/index.js";

const float = new CjsGraphTypeFloat();


class Leaf
{
  name = "";
  weight = 1;
  position = new Float32Array(3);
}

class Special extends Leaf
{
  extra = 0;
}

class Row
{
  value = 0;
}

class Holder
{
  name = "";
  child = null;
  other = null;
  items = [];
  rows = [];
  slots = [ null, null ];
}

const leafMembers = [
  { name: "name", type: "string" },
  { name: "weight", type: "float32" },
  { name: "position", type: "vec3" }
];

CjsGraph.define(Leaf, { name: "GraphValueLeaf", members: leafMembers });
CjsGraph.define(Special, { name: "GraphValueSpecial", chainTo: "GraphValueLeaf", members: [ { name: "extra", type: "float32" } ] });
CjsGraph.define(Row, { name: "GraphValueRow", members: [ { name: "value", type: "float32" } ] });
CjsGraph.define(Holder, { name: "GraphValueHolder", members: [
  { name: "name", type: "string" },
  { name: "child", type: "rootRef", edge: { kind: "ref", type: Leaf } },
  { name: "other", type: "rootRef", edge: { kind: "ref" } },
  { name: "items", type: "list", edge: { kind: "ref", collection: true, type: Leaf } },
  { name: "rows", type: "list", edge: { kind: "embed", collection: true, type: Row } },
  { name: "first", key: "slots", index: 0, type: "rootRef", edge: { kind: "ref", type: Leaf } },
  { name: "second", key: "slots", index: 1, type: "rootRef", edge: { kind: "ref", type: Leaf } }
] });

function leaf(name, weight = 1)
{
  const object = new Leaf();
  object.name = name;
  object.weight = weight;
  return object;
}

test("get writes declared members, independent arrays and null", () =>
{
  const holder = new Holder();
  holder.name = "h";
  holder.child = leaf("a", 2);
  holder.child.position.set([ 1, 2, 3 ]);
  holder.rows.push(new Row());

  const values = CjsGraph.get(holder, { full: true });
  assert.deepEqual(values, {
    name: "h",
    child: { name: "a", weight: 2, position: [ 1, 2, 3 ] },
    other: null,
    items: [],
    rows: [ { value: 0 } ]
  });

  values.child.position[0] = 9;
  assert.equal(holder.child.position[0], 1);
});

test("get writes a shared object once, anchors it on second sight and closes a cycle", () =>
{
  class Node
  {
    next = null;
  }
  CjsGraph.define(Node, { name: "GraphValueNode", members: [ { name: "next", type: "rootRef", edge: { kind: "ref", type: Node } } ] });

  const shared = leaf("shared");
  const holder = new Holder();
  holder.child = shared;
  holder.items.push(shared, leaf("own"), null);

  const values = CjsGraph.get(holder, { full: true });
  assert.equal(values.child._id, 1);
  assert.deepEqual(values.items[0], { _ref: 1 });
  assert.equal(values.items[1].name, "own");
  assert.equal(values.items[2], null);

  const flat = CjsGraph.get(holder, { full: true, refs: false });
  assert.equal(flat.child._id, undefined);
  assert.equal(flat.items[0].name, "shared");

  const node = new Node();
  node.next = node;
  assert.deepEqual(CjsGraph.get(node, { full: true }), { _id: 1, next: { _ref: 1 } });
});

test("get writes _type only where the class differs from the declared one, unless forced", () =>
{
  const holder = new Holder();
  holder.child = leaf("declared");
  holder.items.push(new Special());
  holder.other = new Row();

  const tagged = CjsGraph.get(holder, { full: true, typeTags: true });
  assert.equal(tagged._type, "GraphValueHolder");
  assert.equal(tagged.child._type, undefined);
  assert.equal(tagged.items[0]._type, "GraphValueSpecial");
  assert.equal(tagged.other._type, "GraphValueRow");

  const forced = CjsGraph.get(holder, { full: true, forceTypeTags: true });
  assert.equal(forced.child._type, "GraphValueLeaf");
  assert.equal(CjsGraph.get(holder, { full: true }).child._type, undefined);
});

test("get omits an empty indexed slot and reads a filled one", () =>
{
  const holder = new Holder();
  holder.slots[1] = leaf("slot");

  const values = CjsGraph.get(holder, { full: true });
  assert.equal(Object.hasOwn(values, "first"), false);
  assert.equal(values.second.name, "slot");
});

test("get refuses an unregistered object rather than dropping it", () =>
{
  class Unknown {}
  const holder = new Holder();
  holder.other = new Unknown();
  assert.throws(() => CjsGraph.get(holder, { full: true }), /Unknown graph class/);
});

test("struct handler writes an embedded object", () =>
{
  class Embed
  {
    row = new Row();
  }
  CjsGraph.define(Embed, { name: "GraphValueEmbed", members: [ { name: "row", type: "rawStruct", edge: { kind: "embed", type: Row } } ] });
  assert.deepEqual(CjsGraph.get(new Embed(), { full: true }), { row: { value: 0 } });
});

test("set skips equal members, records changed ones and returns false when nothing changed", () =>
{
  const object = leaf("a", 2);
  const position = object.position;

  assert.equal(CjsGraph.set(object, { name: "a", weight: 2, position: [ 0, 0, 0 ] }), false);
  assert.deepEqual(CjsGraph.set(object, { name: "b", position: [ 1, 2, 3 ] }), { name: "b", position: [ 1, 2, 3 ] });
  assert.equal(object.position, position, "typed storage keeps its identity");
  assert.equal(CjsGraph.set(object, { name: "b" }), false);
  assert.equal(CjsGraph.set(object, null), false);
  assert.equal(CjsGraph.set(object, {}), false);
});

test("set refuses what is not valid input, leaving the handler unasked", () =>
{
  const object = leaf("a");

  assert.throws(() => CjsGraph.set(object, { weight: "heavy" }), /Invalid value for graph member: GraphValueLeaf.weight/);
  assert.throws(() => CjsGraph.set(object, { position: [ 1, 2 ] }), /Invalid value/);
  assert.throws(() => CjsGraph.set(object, { name: 12 }), /Invalid value/);
  assert.throws(() => CjsGraph.set(new Holder(), { child: [] }), /Invalid value/);
  assert.throws(() => CjsGraph.set(new Holder(), { items: {} }), /Invalid value/);
  assert.equal(object.name, "a");

  assert.throws(() => CjsGraph.set(object, leaf("live")), /requires plain values/);
  assert.throws(() => CjsGraph.set(object, []), /requires plain values/);
  assert.throws(() => CjsGraph.set(object, { nothing: 1 }), /Unknown graph member/);

  assert.deepEqual(CjsGraph.set(object, { name: 12 }, { validate: false }), { name: "12" });
});

test("set reads a bag into the held object, recording a nested bag", () =>
{
  const holder = new Holder();
  const child = holder.child = leaf("a");

  assert.deepEqual(CjsGraph.set(holder, { child: { name: "b" } }), { child: { name: "b" } });
  assert.equal(holder.child, child);
  assert.equal(child.name, "b");
  assert.equal(CjsGraph.set(holder, { child: { name: "b" } }), false);
});

test("set replaces a reference, recording the live object", () =>
{
  const holder = new Holder();
  const live = leaf("live");

  assert.deepEqual(CjsGraph.set(holder, { child: live }), { child: live });
  assert.equal(holder.child, live);
  assert.equal(CjsGraph.set(holder, { child: live }), false);

  const changes = CjsGraph.set(holder, { child: { _type: "GraphValueSpecial", extra: 4 } });
  assert.equal(holder.child.constructor, Special);
  assert.equal(changes.child, holder.child);

  assert.deepEqual(CjsGraph.set(holder, { child: null }), { child: null });
  assert.equal(holder.child, null);
  assert.equal(CjsGraph.set(holder, { child: null }), false);
});

test("set writes through an indexed slot", () =>
{
  const holder = new Holder();
  const slots = holder.slots;

  CjsGraph.set(holder, { second: { name: "slot" } });
  assert.equal(holder.slots, slots);
  assert.equal(holder.slots[1].name, "slot");
  assert.equal(holder.slots[0], null);
});

test("a plain array replaces a list in place: objects stay, bags are new, the rest removed", () =>
{
  const holder = new Holder();
  const items = holder.items;
  const stays = leaf("stays"), removed = leaf("removed");
  items.push(stays, removed);

  const changes = CjsGraph.set(holder, { items: [ { name: "new" }, stays ] });

  assert.equal(holder.items, items, "list storage keeps its identity");
  assert.equal(items.length, 2);
  assert.equal(items[0].name, "new");
  assert.equal(items[1], stays);
  assert.deepEqual(changes, { items: [ items[0], stays ] });
  assert.notEqual(changes.items, items, "the record does not alias the list");
});

test("order counts: the same objects in another order are a change, reordered in place", () =>
{
  const holder = new Holder();
  const items = holder.items;
  const a = leaf("a"), b = leaf("b"), c = leaf("c");
  items.push(a, b, c);

  assert.equal(CjsGraph.set(holder, { items: [ a, b, c ] }), false);

  const changes = CjsGraph.set(holder, { items: [ b, c, a ] });
  assert.notEqual(changes, false);
  assert.deepEqual(changes.items, [ b, c, a ]);
  assert.equal(holder.items, items);
  assert.equal(items[0], b);
  assert.equal(items[1], c);
  assert.equal(items[2], a);
});

test("a null empties a list in place, and a member holding no list stays that way", () =>
{
  const holder = new Holder();
  const items = holder.items;
  items.push(leaf("a"));

  assert.deepEqual(CjsGraph.set(holder, { items: null }), { items: [] });
  assert.equal(holder.items, items);
  assert.equal(items.length, 0);

  holder.items = null;
  assert.equal(CjsGraph.set(holder, { items: null }), false);
  assert.equal(holder.items, null);
});

test("a list that already matches is no change, including bags and live items", () =>
{
  const holder = new Holder();
  const first = leaf("a", 2);
  holder.items.push(first);

  assert.equal(CjsGraph.set(holder, { items: [ first ] }), false);
  assert.equal(CjsGraph.set(holder, { items: CjsGraph.get(holder, { full: true }).items }), false);
  assert.equal(CjsGraph.set(holder, { items: holder.items }), false);
  assert.equal(holder.items[0], first);

  // A bag has no identity, so a changed bag is a new object: never positional.
  CjsGraph.set(holder, { items: [ { name: "b" } ] });
  assert.notEqual(holder.items[0], first);
  assert.equal(holder.items[0].weight, 1);

  CjsGraph.set(holder, { items: null });
  assert.deepEqual(holder.items, []);
  assert.equal(CjsGraph.set(holder, { items: null }), false);
});

test("IsEqual decides what changed: a difference inside Carbon's tolerance is no change", () =>
{
  const holder = new Holder();
  const first = leaf("a", 1);
  holder.items.push(first);

  const nudged = 1 + 1e-7;
  assert.equal(float.IsEqual(1, nudged), true);
  assert.equal(float.IsExactEqual(1, nudged), false);
  assert.equal(CjsGraph.set(first, { weight: nudged }), false);
  assert.equal(CjsGraph.set(holder, { items: [ { weight: nudged } ] }), false);
  assert.equal(holder.items[0], first);
  assert.notEqual(CjsGraph.set(first, { weight: 1.5 }), false);
});

test("a list comparison validates the values it reads", () =>
{
  const holder = new Holder();
  holder.items.push(leaf("a"));

  assert.throws(() => CjsGraph.set(holder, { items: [ { weight: "heavy" } ] }), /Invalid value for graph member: GraphValueLeaf.weight/);
});

test("structure list rows reuse their position, and record what changed", () =>
{
  const holder = new Holder();
  const row = new Row();
  holder.rows.push(row);

  assert.equal(CjsGraph.set(holder, { rows: [ { value: 0 } ] }), false);

  const changes = CjsGraph.set(holder, { rows: [ { value: 5 }, { value: 6 } ] });
  assert.equal(holder.rows[0], row);
  assert.equal(row.value, 5);
  assert.equal(holder.rows[1].constructor, Row);
  assert.deepEqual(changes, { rows: [ row, holder.rows[1] ] });

  CjsGraph.set(holder, { rows: [ { value: 5 } ] });
  assert.equal(holder.rows.length, 1);
});

test("an embedded object keeps its identity, ignores null and copies a live object by value", () =>
{
  class Embed
  {
    row = new Row();
    empty = null;
  }
  CjsGraph.define(Embed, { name: "GraphValueEmbedSet", members: [
    { name: "row", type: "rawStruct", edge: { kind: "embed", type: Row } },
    { name: "empty", type: "rawStruct", edge: { kind: "embed", type: Row } }
  ] });

  const embed = new Embed(), row = embed.row;
  assert.deepEqual(CjsGraph.set(embed, { row: { value: 3 } }), { row: { value: 3 } });
  assert.equal(embed.row, row);
  assert.equal(CjsGraph.set(embed, { row: null }), false);
  assert.equal(embed.row, row);

  const live = new Row();
  live.value = 8;
  CjsGraph.set(embed, { row: live });
  assert.equal(embed.row, row);
  assert.equal(row.value, 8);

  CjsGraph.set(embed, { empty: { value: 1 } });
  assert.equal(embed.empty.constructor, Row);

  assert.throws(() => CjsGraph.set(embed, { row: { _type: "GraphValueLeaf" } }), /Expected GraphValueRow/);
});

test("forward _refs fill rows by value, chain through waiting rows, and record the rows", () =>
{
  class Rows
  {
    source = null;
    rows = [];
    more = [];
  }
  CjsGraph.define(Rows, { name: "GraphValueRows", members: [
    { name: "rows", type: "list", edge: { kind: "embed", collection: true, type: Row } },
    { name: "more", type: "list", edge: { kind: "embed", collection: true, type: Row } },
    { name: "source", type: "rootRef", edge: { kind: "ref", type: Row } }
  ] });

  const object = new Rows();
  const held = new Row();
  object.rows.push(held);

  const changes = CjsGraph.set(object, {
    rows: [ { _ref: 4 } ],
    more: [ { _id: 9, value: 1 }, { _ref: 4 } ],
    source: { _id: 4, value: 7 }
  });

  assert.equal(object.rows[0], held, "the held row is filled, not replaced");
  assert.equal(held.value, 7);
  assert.notEqual(object.rows[0], object.source, "a row is a value: it is copied, never aliased");
  assert.equal(object.more[1].value, 7);
  assert.equal(changes.rows[0], held);

  // A row waiting on a row that is itself waiting fills after it.
  const chained = new Rows();
  CjsGraph.set(chained, {
    rows: [ { _ref: 1 } ],
    more: [ { _id: 1, _ref: 2 } ],
    source: { _id: 2, value: 3 }
  });
  assert.equal(chained.more[0].value, 3);
  assert.equal(chained.rows[0].value, 3, "the waiter on a waiter sees the final value");

  // The same chain, the other way round in the pending order.
  const reversed = new Rows();
  CjsGraph.set(reversed, {
    more: [ { _id: 1, _ref: 2 } ],
    rows: [ { _ref: 1 } ],
    source: { _id: 2, value: 3 }
  });
  assert.equal(reversed.rows[0].value, 3);

  assert.throws(() => CjsGraph.set(new Rows(), { rows: [ { _ref: 8 } ] }), /Unresolved _ref: 8/);
  assert.throws(() => CjsGraph.from(Rows, { rows: [ { _ref: 8 } ], source: { _id: 8, _type: "GraphValueLeaf" } }), /not assignable/);
});

test("a forward _ref on an embedded member fills it, keeping its identity", () =>
{
  class Embed
  {
    row = new Row();
    empty = null;
    source = null;
  }
  CjsGraph.define(Embed, { name: "GraphValueEmbedForward", members: [
    { name: "row", type: "rawStruct", edge: { kind: "embed", type: Row } },
    { name: "empty", type: "rawStruct", edge: { kind: "embed", type: Row } },
    { name: "source", type: "rootRef", edge: { kind: "ref", type: Row } }
  ] });

  const embed = new Embed(), row = embed.row;
  const changes = CjsGraph.set(embed, { row: { _ref: 6 }, empty: { _ref: 6 }, source: { _id: 6, value: 2 } });

  assert.equal(embed.row, row);
  assert.equal(row.value, 2);
  assert.equal(embed.empty.value, 2);
  assert.notEqual(embed.empty, embed.source);
  assert.equal(changes.row, row);
  assert.equal(changes.empty, embed.empty);
});

test("from creates declared and tagged classes; an unknown class is an error", () =>
{
  const object = CjsGraph.from(Leaf, { name: "a", position: [ 1, 2, 3 ] });
  assert.equal(object.constructor, Leaf);
  assert.equal(object.position.constructor, Float32Array);

  assert.equal(CjsGraph.from("GraphValueLeaf", {}).constructor, Leaf);
  assert.equal(CjsGraph.from(null, { _type: "GraphValueSpecial" }).constructor, Special);
  assert.equal(CjsGraph.from(Leaf, { _type: "GraphValueSpecial" }).constructor, Special);
  assert.equal(CjsGraph.from(Leaf, null).constructor, Leaf);

  assert.throws(() => CjsGraph.from(null, {}), /names no class/);
  assert.throws(() => CjsGraph.from(null, { _type: "GraphValueNothing" }), /Unknown graph class: GraphValueNothing/);
  assert.throws(() => CjsGraph.from(Leaf, { _type: "GraphValueRow" }), /not assignable/);
  assert.throws(() => CjsGraph.from(Holder, { items: [ { _type: "GraphValueNothing" } ] }), /Unknown graph class/);
});

test("shared references, cycles and forward references rebuild the same topology", () =>
{
  class Node
  {
    name = "";
    next = null;
    friend = null;
  }
  CjsGraph.define(Node, { name: "GraphValueSetNode", members: [
    { name: "name", type: "string" },
    { name: "next", type: "rootRef", edge: { kind: "ref", type: Node } },
    { name: "friend", type: "rootRef", edge: { kind: "ref", type: Node } }
  ] });

  const ring = CjsGraph.from(Node, { _id: 1, name: "a", next: { name: "b", next: { _ref: 1 } } });
  assert.equal(ring.next.next, ring);

  const forward = CjsGraph.from(Node, { name: "a", next: { _ref: 2 }, friend: { _id: 2, name: "b" } });
  assert.equal(forward.next, forward.friend);
  assert.equal(forward.next.name, "b");

  const shared = leaf("shared");
  const holder = new Holder();
  holder.child = shared;
  holder.items.push(shared, leaf("own"));
  const built = CjsGraph.from(Holder, CjsGraph.get(holder, { full: true }));
  assert.equal(built.items[0], built.child);
  assert.notEqual(built.items[1], built.child);

  const list = CjsGraph.from(Holder, { items: [ { _ref: 3 }, { name: "x" } ], child: { _id: 3, name: "later" } });
  assert.equal(list.items[0], list.child);

  assert.throws(() => CjsGraph.from(Node, { next: { _ref: 9 } }), /Unresolved _ref: 9/);
  assert.throws(() => CjsGraph.from(Holder, { child: { _ref: 1 }, other: { _id: 1, _type: "GraphValueRow" } }), /not assignable/);
});

test("a forward reference is in the change record, nested through its parents", () =>
{
  const holder = new Holder();
  holder.items.push(leaf("old"));

  const changes = CjsGraph.set(holder, {
    child: { _ref: 5 },
    items: [ { _ref: 5 } ],
    other: { _id: 5, _type: "GraphValueLeaf", name: "target" }
  });

  assert.equal(holder.child, holder.other);
  assert.equal(holder.items[0], holder.other);
  assert.equal(changes.child, holder.other);
  assert.equal(changes.items[0], holder.other);
  assert.equal(changes.other, holder.other);
});

test("copyOverride shares what it returns, as Copier's m_override does, and the rest is copied", () =>
{
  const shared = leaf("shared");
  const copied = leaf("copied");
  const holder = new Holder();
  holder.child = shared;
  holder.items.push(shared, copied);

  const asked = [];
  const copyOverride = object =>
  {
    asked.push(object.name);
    if (object === shared) return object;
  };

  const clone = CjsGraph.clone(holder, { copyOverride });
  assert.equal(clone.child, shared, "held by reference, not copied");
  assert.equal(clone.items[0], shared);
  assert.notEqual(clone.items[1], copied);
  assert.equal(clone.items[1].name, "copied");
  assert.deepEqual(asked, [ "shared", "shared", "copied" ], "asked at every sight, as CopyTo does");

  const target = new Holder();
  assert.notEqual(CjsGraph.copy(holder, target, { copyOverride }), false);
  assert.equal(target.child, shared);

  const failing = () => { throw new Error("override failed"); };
  assert.throws(() => CjsGraph.clone(holder, { copyOverride: failing }), /override failed/);

  // Without the option nothing outside the source is shared.
  assert.notEqual(CjsGraph.clone(holder).child, shared);
});

test("a registered library names _type: the last registered wins, and Create makes the instance", () =>
{
  class First {}
  class Second {}
  CjsGraph.define(First, { name: "GraphValueLibraryFirst", members: [] });
  CjsGraph.define(Second, { name: "GraphValueLibrarySecond", members: [] });

  const made = [];
  const library = classes => ({
    Get(typeName) { return classes[typeName]; },
    Create(typeName) { made.push(typeName); return new classes[typeName](); }
  });

  CjsGraph.registerLibrary(library({ GraphValueLibraryName: First }));
  assert.equal(CjsGraph.from(null, { _type: "GraphValueLibraryName" }).constructor, First);

  CjsGraph.registerLibrary(library({ GraphValueLibraryName: Second }));
  assert.equal(CjsGraph.from(null, { _type: "GraphValueLibraryName" }).constructor, Second);
  assert.deepEqual(made, [ "GraphValueLibraryName", "GraphValueLibraryName" ]);

  // An older library still answers for the names newer ones do not define.
  assert.equal(CjsGraph.from(null, { _type: "GraphValueLeaf" }).constructor, Leaf);
  assert.equal(CjsGraph.isType(new Second(), "GraphValueLibraryName"), true);
  assert.equal(CjsGraph.isType(new First(), "GraphValueLibraryName"), false);
});

test("values mode leaves _type as data and needs no class", () =>
{
  const values = { _type: "NoSuchClass", _id: 1, list: [ { _ref: 1 }, null ], data: new Float32Array([ 1 ]) };
  const plain = CjsGraph.from(null, values, { valuesMode: true });

  assert.deepEqual(plain, { _type: "NoSuchClass", _id: 1, list: [ { _ref: 1 }, null ], data: [ 1 ] });
  assert.notEqual(plain.list, values.list);
  assert.throws(() => CjsGraph.from(null, { live: leaf("x") }, { valuesMode: true }), /values mode/);
});

test("clone rebuilds a separate graph, and copy writes into a target, keeping identity", () =>
{
  const shared = leaf("shared", 3);
  shared.position.set([ 1, 2, 3 ]);
  const holder = new Holder();
  holder.name = "h";
  holder.child = shared;
  holder.other = new Special();
  holder.items.push(shared);
  holder.rows.push(new Row());

  const clone = CjsGraph.clone(holder);
  assert.equal(clone.constructor, Holder);
  assert.deepEqual(CjsGraph.get(clone, { full: true }), CjsGraph.get(holder, { full: true }));
  assert.notEqual(clone.child, shared);
  assert.equal(clone.items[0], clone.child, "sharing inside the graph is kept");
  assert.equal(clone.other.constructor, Special);
  assert.notEqual(clone.child.position, shared.position);

  const target = new Holder();
  const items = target.items;
  const changes = CjsGraph.copy(holder, target);
  assert.notEqual(changes, false);
  assert.equal(target.items, items);
  assert.equal(target.name, "h");
  assert.notEqual(target.child, shared);
  assert.equal(target.items[0], target.child);
});

test("ICjsGraphRoot forwards every operation and holds per-object state", () =>
{
  class Rooted extends ICjsGraphRoot
  {
    name = "";
    weight = 1;
  }
  class Derived extends Rooted {}
  CjsGraph.define(Rooted, { name: "GraphValueRooted", members: [ { name: "name", type: "string" }, { name: "weight", type: "float32" } ] });
  CjsGraph.define(Derived, { name: "GraphValueRootedDerived", chainTo: "GraphValueRooted" });

  const object = Rooted.from({ name: "a" });
  assert.equal(object.constructor, Rooted);
  assert.equal(object.__cjs, null);
  assert.deepEqual(object.GetValues({ full: true }), { name: "a", weight: 1 });
  assert.deepEqual(object.SetValues({ weight: 2, name: "b" }), { weight: 2, name: "b" });
  assert.equal(object.SetValues({ name: "b" }), false);
  assert.equal(object.CommitValues(), undefined);
  assert.equal(object.CommitValues("name"), undefined);
  for (const gone of [ "GetValue", "SetValue", "UpdateValues", "Copy", "Clone" ]) assert.equal(gone in object, false, `${gone} is gone`);

  // The state is no member: values leave it out, and a clone or a copy starts with none.
  const state = CjsGraph.getState(object);
  assert.equal("__cjs" in object.GetValues({ full: true }), false);

  const clone = object.CloneValues();
  assert.notEqual(clone, object);
  assert.equal(clone.__cjs, null);
  assert.deepEqual(clone.GetValues({ full: true }), object.GetValues({ full: true }));

  const target = new Rooted();
  assert.deepEqual(target.CopyValues(object), { name: "b", weight: 2 });
  assert.equal(target.__cjs, null);
  assert.equal(object.__cjs, state);

  const visited = [];
  assert.equal(object.Traverse(visited.push.bind(visited)), 1);
  assert.equal(visited[0], object);
});

test("a class static is the graph's door with one check: exactly that class, and a matching _type", () =>
{
  class Base extends ICjsGraphRoot { name = ""; }
  class Derived extends Base {}
  CjsGraph.define(Base, { name: "GraphDoorBase", members: [ { name: "name", type: "string" } ] });
  CjsGraph.define(Derived, { name: "GraphDoorDerived", chainTo: "GraphDoorBase" });
  const base = Base.from({ name: "a" }), derived = Derived.from({ name: "d", _type: "GraphDoorDerived" });
  assert.equal(derived.constructor, Derived);

  assert.deepEqual(Base.get(base, { full: true }), CjsGraph.get(base, { full: true }));
  assert.deepEqual(Base.set(base, { name: "b" }), { name: "b" });
  assert.equal(Base.set(base, { name: "b", _type: "GraphDoorBase" }), false);
  const clone = Base.clone(base);
  assert.equal(clone.constructor, Base);
  assert.equal(clone.name, "b");
  assert.deepEqual(Base.copy(base, new Base()), { name: "b" });

  for (const refused of [
    () => Base.get(derived), () => Base.set(derived, { name: "x" }), () => Base.clone(derived),
    () => Base.copy(derived, new Base()), () => Base.copy(base, new Derived()), () => Base.get(null), () => Derived.get(base)
  ]) assert.throws(refused, /takes exactly its own class/);
  for (const refused of [ () => Base.from({ _type: "GraphDoorDerived" }), () => Base.set(base, { _type: "GraphDoorDerived" }) ])
    assert.throws(refused, /takes values of its own class, not _type GraphDoorDerived/);
  assert.equal(derived.name, "d", "a refused write changes nothing");

  // The graph's own doors take any registered object.
  assert.deepEqual(CjsGraph.get(derived, { full: true }), { name: "d" });
});

test("an interface a definition names counts as assignable, without inheritance", () =>
{
  class Contract {}
  class Mapped {}
  class Unmapped {}
  class Holds
  {
    held = null;
  }
  CjsGraph.define(Contract, { name: "GraphValueContract", members: [] });
  CjsGraph.define(Mapped, { name: "GraphValueMapped", interfaces: [ "GraphValueContract" ], members: [] });
  CjsGraph.define(Unmapped, { name: "GraphValueUnmapped", members: [] });
  CjsGraph.define(Holds, { name: "GraphValueHolds", members: [ { name: "held", type: "rootRef", edge: { kind: "ref", type: Contract } } ] });

  const holds = new Holds();
  holds.held = new Mapped();
  assert.deepEqual(CjsGraph.get(holds, { full: true, typeTags: true }).held, { _type: "GraphValueMapped" });

  holds.held = new Unmapped();
  assert.throws(() => CjsGraph.get(holds, { full: true }), /not assignable/);
});

test("a list of values reads, writes and compares through its item handler", () =>
{
  class Transforms
  {
    transforms = [ new Float32Array(3) ];
    names = [];
  }
  CjsGraph.define(Transforms, { name: "GraphValueTransforms", members: [
    { name: "transforms", type: "values", item: "vec3" },
    { name: "names", type: "values", item: "string" }
  ] });

  const object = new Transforms(), first = object.transforms[0];

  assert.deepEqual(CjsGraph.get(object, { full: true }), { transforms: [ [ 0, 0, 0 ] ], names: [] });
  assert.equal(CjsGraph.set(object, { transforms: [ [ 0, 0, 0 ] ], names: [] }), false);

  const changes = CjsGraph.set(object, { transforms: [ [ 1, 2, 3 ], [ 4, 5, 6 ] ], names: [ "a" ] });
  assert.deepEqual(changes, { transforms: [ [ 1, 2, 3 ], [ 4, 5, 6 ] ], names: [ "a" ] });
  assert.equal(object.transforms[0], first, "element storage is kept");
  assert.equal(object.transforms[1].constructor, Float32Array);

  CjsGraph.set(object, { transforms: [ [ 1, 2, 3 ] ], names: [ null ] });
  assert.equal(object.transforms.length, 1);
  assert.equal(object.names[0], null);

  assert.throws(() => CjsGraph.set(object, { names: [ 1 ] }), /Invalid value/);
  assert.throws(() => CjsGraph.set(object, { names: "a" }), /Invalid value/);
});

test("a Map of objects behaves as a list keyed by name", () =>
{
  class Named
  {
    entries = new Map();
    other = null;
  }
  CjsGraph.define(Named, { name: "GraphValueNamed", members: [
    { name: "entries", type: "map", edge: { kind: "ref", collection: true, map: true, type: Leaf } },
    { name: "other", type: "rootRef", edge: { kind: "ref", type: Leaf } }
  ] });

  const object = new Named(), entries = object.entries, stays = leaf("stays");
  entries.set("a", stays);
  entries.set("gone", leaf("gone"));

  assert.deepEqual(CjsGraph.get(object, { full: true }).entries.a.name, "stays");
  assert.equal(CjsGraph.traverse(object, () => {}), 3);

  const changes = CjsGraph.set(object, { entries: { a: stays, b: { name: "new" } } });
  assert.equal(object.entries, entries, "the Map keeps its identity");
  assert.equal(entries.get("a"), stays);
  assert.equal(entries.get("b").name, "new");
  assert.equal(entries.has("gone"), false);
  assert.equal(changes.entries.b, entries.get("b"));

  assert.equal(CjsGraph.set(object, { entries: { a: stays, b: entries.get("b") } }), false);
  assert.equal(CjsGraph.set(object, { entries: CjsGraph.get(object, { full: true }).entries }), false);

  const forward = CjsGraph.set(object, { entries: { c: { _ref: 4 } }, other: { _id: 4, name: "later" } });
  assert.equal(entries.get("c"), object.other);
  assert.equal(forward.entries.c, object.other);

  const idMap = new Map();
  const mapped = CjsGraph.set(object, { entries: { d: leaf("d") } }, { idMap });
  assert.equal(idMap.get(mapped.entries.d._ref), entries.get("d"));

  assert.deepEqual(CjsGraph.set(object, { entries: null }), { entries: {} });
  assert.equal(object.entries, entries);
  assert.equal(entries.size, 0);
  assert.throws(() => CjsGraph.set(object, { entries: [] }), /Invalid value/);
});

test("a comparison reaching a Map inside a list reads the Map's own declared type", () =>
{
  class Inner
  {
    entries = new Map();
  }
  class Outer
  {
    inners = [];
  }
  CjsGraph.define(Inner, { name: "GraphValueInner", members: [
    { name: "entries", type: "map", edge: { kind: "ref", collection: true, map: true, type: Row } }
  ] });
  CjsGraph.define(Outer, { name: "GraphValueOuter", members: [
    { name: "inners", type: "list", edge: { kind: "ref", collection: true, type: Inner } }
  ] });

  const outer = new Outer(), inner = new Inner();
  inner.entries.set("a", new Row());
  outer.inners.push(inner);

  assert.equal(CjsGraph.set(outer, CjsGraph.get(outer, { full: true })), false);
  assert.equal(outer.inners[0], inner);
});

test("a list holding a stored NaN is not called equal", () =>
{
  const holder = new Holder();
  const first = leaf("a");
  first.position[0] = NaN;
  holder.items.push(first);

  assert.notEqual(CjsGraph.set(holder, { items: [ { name: "a", position: [ 1, 2, 3 ] } ] }), false);
  assert.equal(holder.items[0].position[0], 1);
});

test("with an idMap the record holds _ref, the map holds the objects, and the record replays", () =>
{
  const live = leaf("live");
  const idMap = new Map();
  const holder = new Holder();

  const changes = CjsGraph.set(holder, { child: live, items: [ live, { name: "made" }, null ], rows: [ { value: 1 } ] }, { idMap });

  const liveId = changes.child._ref;
  assert.deepEqual(Object.keys(changes.child), [ "_ref" ]);
  assert.equal(idMap.get(liveId), live);
  assert.deepEqual(changes.items[0], { _ref: liveId }, "one object has one id");
  assert.equal(idMap.get(changes.items[1]._ref), holder.items[1]);
  assert.equal(changes.items[2], null);
  assert.equal(idMap.get(changes.rows[0]._ref), holder.rows[0]);
  assert.equal(holder.items[0], live, "the graph itself still holds objects");
  assert.equal(JSON.stringify(changes).includes("position"), false, "the record is plain data");

  const replay = new Holder();
  assert.notEqual(CjsGraph.set(replay, { child: changes.child, items: changes.items.slice(0, 2) }, { idMap }), false);
  assert.equal(replay.child, live);
  assert.equal(replay.items[1], holder.items[1]);
});

test("an idMap is the _id table: its entries resolve _ref, and new ids avoid every known one", () =>
{
  const known = leaf("known");
  const idMap = new Map([ [ 1, known ] ]);
  const holder = new Holder();

  // _ref 1 resolves from the map; the record reuses its id rather than adding one.
  assert.deepEqual(CjsGraph.set(holder, { child: { _ref: 1 } }, { idMap }), { child: { _ref: 1 } });
  assert.equal(holder.child, known);
  assert.equal(idMap.size, 1);

  // A forward reference and a value's own _id: the new id is taken after both are read.
  const live = leaf("live");
  const other = new Holder();
  const changes = CjsGraph.set(other, { child: live, other: { _ref: 2 }, first: { _id: 2, name: "named" } }, { idMap });
  assert.equal(idMap.get(2), other.slots[0]);
  assert.deepEqual(changes.other, { _ref: 2 });
  assert.equal(idMap.get(changes.child._ref), live);
  assert.notEqual(changes.child._ref, 1);
  assert.notEqual(changes.child._ref, 2);
});

// Objects that record what they are told, in one shared order.
const log = [];

class Watched
{
  name = "";
  weight = 1;
  quiet = 0;
  child = null;
  items = [];

  OnModified(member) { log.push([ "OnModified", this.name, member ]); }
}

class Started extends Watched
{
  Initialize() { log.push([ "Initialize", this.name ]); }
}

class Bare
{
  value = 0;
}

const NOTIFIED = EDITFLAGS.READWRITE | EDITFLAGS.PERSIST | EDITFLAGS.NOTIFY;

const watchedMembers = [
  { name: "name", type: "string", flags: NOTIFIED },
  { name: "weight", type: "float32", flags: NOTIFIED },
  { name: "quiet", type: "float32" },
  { name: "child", type: "rootRef", flags: NOTIFIED, edge: { kind: "ref", type: Watched } },
  { name: "items", type: "list", flags: NOTIFIED, edge: { kind: "ref", collection: true, type: Watched } }
];

CjsGraph.define(Watched, { name: "GraphWatched", notify: true, members: watchedMembers });
CjsGraph.define(Started, { name: "GraphStarted", chainTo: "GraphWatched", initialize: true, notify: true, members: [] });
CjsGraph.define(Bare, { name: "GraphBare", members: [ { name: "value", type: "float32" } ] });

function watched(name)
{
  const object = new Watched();
  object.name = name;
  return object;
}

function started(name)
{
  const object = new Started();
  object.name = name;
  return object;
}

function told(run)
{
  log.length = 0;
  run();
  return log.slice();
}

test("set fires OnModified per changed NOTIFY member, and an equal or quiet member is not told", () =>
{
  const object = watched("a");

  assert.deepEqual(told(() => CjsGraph.set(object, { weight: 2, quiet: 3 })), [ [ "OnModified", "a", "weight" ] ]);
  assert.deepEqual(told(() => CjsGraph.set(object, { weight: 2, quiet: 3 })), []);
  assert.deepEqual(told(() => CjsGraph.set(object, { name: "b", weight: 4 })), [ [ "OnModified", "b", "name" ], [ "OnModified", "b", "weight" ] ]);
});

test("set never calls Initialize, even on a class that has one", () =>
{
  const object = started("a");

  assert.deepEqual(told(() => CjsGraph.set(object, { weight: 2 })), [ [ "OnModified", "a", "weight" ] ]);
});

test("initializeHeld true overrides that for a live set", () =>
{
  const object = started("a");

  assert.deepEqual(told(() => CjsGraph.set(object, { weight: 2 }, { initializeHeld: true })), [ [ "Initialize", "a" ] ]);
});

test("IsEqual decides what changed on a live set: inside Carbon's tolerance is no change", () =>
{
  const object = watched("a");

  assert.equal(CjsGraph.set(object, { weight: 1 + 1e-7 }), false);
  assert.equal(object.weight, 1);
  assert.notEqual(CjsGraph.set(object, { weight: 1.5 }), false);
});

test("skipEquality writes and records every value, and skipEvents tells nothing", () =>
{
  const object = watched("a");

  assert.deepEqual(CjsGraph.set(object, { weight: 1 }, { skipEquality: true, skipEvents: true }), { weight: 1 });
  assert.deepEqual(told(() => CjsGraph.set(object, { weight: 1 + 1e-7 }, { skipEquality: true })), [ [ "OnModified", "a", "weight" ] ]);
  assert.equal(object.weight, Math.fround(1 + 1e-7));

  assert.deepEqual(told(() => CjsGraph.set(object, { weight: 5 }, { skipEvents: true })), []);
  assert.equal(object.weight, 5);
});

test("a nested set is the child's own: the owner hears only of its own members", () =>
{
  const owner = watched("owner"), child = owner.child = watched("child");

  const changes = CjsGraph.set(owner, { name: "renamed", child: { weight: 5 } });
  assert.deepEqual(changes, { name: "renamed", child: { weight: 5 } });

  owner.name = "owner";
  child.weight = 1;
  assert.deepEqual(told(() => CjsGraph.set(owner, { child: { weight: 5 } })), [ [ "OnModified", "child", "weight" ] ]);

  child.weight = 1;
  assert.deepEqual(told(() => CjsGraph.set(owner, { name: "x", child: { weight: 5 } })), [
    [ "OnModified", "child", "weight" ],
    [ "OnModified", "x", "name" ]
  ]);

  const live = watched("live");
  assert.deepEqual(told(() => CjsGraph.set(owner, { child: live })), [ [ "OnModified", "x", "child" ] ]);
});

test("nothing is told before references resolve, and a failure tells nothing", () =>
{
  const object = watched("a");

  let seen = "unset";
  object.OnModified = () => { seen = object.child; };
  CjsGraph.set(object, { child: { _ref: 3 }, items: [ { _id: 3, name: "later" } ] });
  assert.equal(seen, object.items[0], "the forward reference is in place when it is told");

  assert.deepEqual(told(() =>
  {
    assert.throws(() => CjsGraph.set(watched("b"), { weight: 2, child: { _ref: 9 } }), /Unresolved _ref: 9/);
  }), []);
});

test("from writes every value with no comparison, including a value inside tolerance", () =>
{
  const object = CjsGraph.from(Watched, { weight: 1 + 1e-7, quiet: 1e-7 }, { skipEvents: true });

  assert.equal(object.weight, Math.fround(1 + 1e-7));
  assert.equal(object.quiet, Math.fround(1e-7));

  const zero = CjsGraph.from(Bare, { value: -0 }, { skipEvents: true });
  assert.equal(Object.is(zero.value, -0), true, "the authored value is kept");
});

test("from gives Initialize once if the class has it, otherwise OnModified per NOTIFY member", () =>
{
  assert.deepEqual(told(() => CjsGraph.from(Started, { name: "a", weight: 2 })), [ [ "Initialize", "a" ] ]);
  assert.deepEqual(told(() => CjsGraph.from(Watched, { name: "a", quiet: 2, weight: 2 })), [
    [ "OnModified", "a", "name" ],
    [ "OnModified", "a", "weight" ]
  ]);
  assert.deepEqual(told(() => CjsGraph.from(Started, { name: "a" }, { skipEvents: true })), []);
});

test("from completes children first, and a cycle completes each object once", () =>
{
  const order = told(() => CjsGraph.from(Started, {
    _id: 1, name: "owner", child: { _type: "GraphStarted", name: "child", child: { _ref: 1 } }
  }));

  assert.deepEqual(order, [ [ "Initialize", "child" ], [ "Initialize", "owner" ] ]);
});

test("a default child under a created owner gets Initialize, unless initializeHeld is false", () =>
{
  class Owner extends Started
  {
    child = started("held");
  }
  CjsGraph.define(Owner, { name: "GraphOwner", chainTo: "GraphStarted", initialize: true, notify: true, members: [] });

  assert.deepEqual(told(() => CjsGraph.from(Owner, { name: "owner", child: { quiet: 1 } })), [
    [ "Initialize", "held" ],
    [ "Initialize", "owner" ]
  ]);

  assert.deepEqual(told(() => CjsGraph.from(Owner, { name: "owner", child: { name: "held", weight: 3 } }, { initializeHeld: false })), [
    [ "OnModified", "held", "name" ],
    [ "OnModified", "held", "weight" ],
    [ "Initialize", "owner" ]
  ]);
});

test("copy compares exactly, skips what matches and writes a difference inside tolerance", () =>
{
  const source = watched("a"), target = watched("a");

  source.weight = 1 + 1e-7;
  assert.deepEqual(told(() => CjsGraph.copy(source, target)), [ [ "OnModified", "a", "weight" ] ]);
  assert.equal(target.weight, Math.fround(1 + 1e-7));
  assert.deepEqual(told(() => CjsGraph.copy(source, target)), []);
});

test("copy gives Initialize at the end on a target that has it, even an existing one, with no OnModified", () =>
{
  const source = started("a"), target = started("b");

  assert.deepEqual(told(() => CjsGraph.copy(source, target)), [ [ "Initialize", "a" ] ]);
  assert.deepEqual(told(() => CjsGraph.copy(source, target)), [ [ "Initialize", "a" ] ], "Copier always initialises");
});

test("copy makes a new object for a reference and rebuilds a list, as Copier does", () =>
{
  const source = watched("a"), target = watched("a");
  const held = target.child = watched("held"), items = target.items;
  source.child = watched("held");
  source.items.push(watched("item"));
  target.items.push(watched("item"));

  const inList = target.items[0];
  CjsGraph.copy(source, target, { skipEvents: true });

  assert.notEqual(target.child, held);
  assert.notEqual(target.child, source.child);
  assert.equal(target.items, items);
  assert.notEqual(target.items[0], inList);
  assert.notEqual(target.items[0], source.items[0]);
});

test("copy and clone write PERSIST members only, and clone creates", () =>
{
  class Persisted
  {
    kept = 1;
    runtime = 2;
  }
  CjsGraph.define(Persisted, { name: "GraphPersisted", members: [
    { name: "kept", type: "float32" },
    { name: "runtime", type: "float32", flags: EDITFLAGS.READWRITE }
  ] });

  const source = new Persisted();
  source.kept = 5;
  source.runtime = 6;

  assert.equal(CjsGraph.clone(source).runtime, 2);
  const target = new Persisted();
  CjsGraph.copy(source, target);
  assert.equal(target.kept, 5);
  assert.equal(target.runtime, 2);
});

test("UpdateValues with names fires OnModified for those NOTIFY members on that object only", () =>
{
  const owner = watched("owner"), child = owner.child = watched("child");

  assert.deepEqual(told(() => CjsGraph.commitValues(owner, "weight")), [ [ "OnModified", "owner", "weight" ] ]);
  assert.deepEqual(told(() => CjsGraph.commitValues(owner, [ "name", "quiet" ])), [ [ "OnModified", "owner", "name" ] ]);
  assert.deepEqual(told(() => CjsGraph.commitValues(child, "weight")), [ [ "OnModified", "child", "weight" ] ]);
  assert.throws(() => CjsGraph.commitValues(owner, "nothing"), /Unknown graph member/);
  assert.deepEqual(told(() => CjsGraph.commitValues(owner, [ "nothing", "weight" ], { skipValidation: true })),
    [ [ "OnModified", "owner", "weight" ] ], "skipValidation skips unknown names");
});

test("UpdateValues notifies in member-table order, and with no names every NOTIFY member", () =>
{
  const owner = watched("owner");

  assert.deepEqual(told(() => CjsGraph.commitValues(owner, [ "weight", "name" ])),
    [ [ "OnModified", "owner", "name" ], [ "OnModified", "owner", "weight" ] ]);
  assert.deepEqual(told(() => CjsGraph.commitValues(owner)), [
    [ "OnModified", "owner", "name" ],
    [ "OnModified", "owner", "weight" ],
    [ "OnModified", "owner", "child" ],
    [ "OnModified", "owner", "items" ]
  ]);
  assert.deepEqual(told(() => CjsGraph.commitValues(new Bare())), [], "a class without notify is told nothing");
});

test("the three routes agree for the object changed", () =>
{
  const run = route =>
  {
    const owner = watched("owner");
    owner.child = watched("child");
    return { told: told(() => route(owner)), weight: owner.child.weight };
  };

  const expected = { told: [ [ "OnModified", "child", "weight" ] ], weight: 5 };

  assert.deepEqual(run(owner => CjsGraph.set(owner, { child: { weight: 5 } })), expected);
  assert.deepEqual(run(owner => CjsGraph.set(owner.child, { weight: 5 })), expected);
  assert.deepEqual(run(owner =>
  {
    owner.child.weight = 5;
    CjsGraph.commitValues(owner.child, "weight");
  }), expected);
});

test("get filters by flags, and a hidden derived declaration leaves the visible base one", () =>
{
  class Base
  {
    value = 1;
    hidden = 2;
  }
  class Derived extends Base {}
  class Flags
  {
    shown = 1;
    transient = 2;
    readOnly = 3;
    secret = 4;
  }
  CjsGraph.define(Base, { name: "GraphFlagBase", members: [ { name: "value", type: "float32" } ] });
  CjsGraph.define(Derived, { name: "GraphFlagDerived", chainTo: "GraphFlagBase", members: [ { name: "value", key: "hidden", type: "float32", flags: EDITFLAGS.READWRITE } ] });
  CjsGraph.define(Flags, { name: "GraphFlags", members: [
    { name: "shown", type: "float32" },
    { name: "transient", type: "float32", flags: EDITFLAGS.READWRITE },
    { name: "readOnly", type: "float32", flags: EDITFLAGS.READ },
    { name: "secret", type: "float32", flags: GraphMemberFlags.RUNTIMEONLY }
  ] });

  assert.deepEqual(CjsGraph.get(new Derived(), { full: true }), { value: 2 });
  assert.deepEqual(CjsGraph.get(new Derived(), { persistOnly: true }), { value: 1 });

  const flags = new Flags();
  assert.deepEqual(CjsGraph.get(flags, { full: true }), { shown: 1, transient: 2, readOnly: 3 });
  assert.deepEqual(CjsGraph.get(flags, { full: true, persistOnly: true }), { shown: 1 });
  assert.deepEqual(CjsGraph.get(flags, { full: true, roundTrip: true }), { shown: 1, transient: 2 });

  assert.equal(CjsGraph.set(flags, { readOnly: 9, secret: 9 }), false, "skipped, as DictReader skips what it may not write");
  assert.equal(flags.readOnly, 3);
  assert.throws(() => CjsGraph.set(flags, { nothing: 1 }), /Unknown graph member/);
});

test("a registration change rebuilds the member tables", () =>
{
  class Late
  {
    a = 1;
    b = 2;
  }
  CjsGraph.define(Late, { name: "GraphLate", members: [ { name: "a", type: "float32" } ] });
  assert.deepEqual(CjsGraph.get(new Late(), { full: true }), { a: 1 });

  CjsGraph.define(Late, { name: "GraphLate", members: [ { name: "b", type: "float32" } ] });
  assert.deepEqual(CjsGraph.get(new Late(), { full: true }), { b: 2 });
});

/** A list with its own operations, recording what is asked of it. */
class MappedList extends Array
{
  calls = [];

  ReplaceItems(items)
  {
    this.calls.push(this.length);
    this.length = 0;
    for (const item of items) this.push(item);
  }
}

class Listed
{
  name = "";
  mapped = new MappedList();
  plain = [];
  events = [];

  OnListModified(event, key, key2, value, target) { this.events.push([ event, key, value?.name ?? null, target.length ]); }
}

CjsGraph.define(Listed, { name: "GraphListed", listNotify: true, members: [
  { name: "name", type: "string" },
  { name: "mapped", type: "list", edge: { kind: "ref", collection: true, type: Leaf } },
  { name: "plain", type: "list", edge: { kind: "ref", collection: true, type: Leaf } }
] });

const UNLOADSTART = 0x100000, INSERTED = 0x2;

test("a mapped list goes through its own ReplaceItems with the old items in place, once references resolve", () =>
{
  const object = new Listed(), mapped = object.mapped, old = leaf("old");
  mapped.push(old);

  CjsGraph.set(object, { mapped: [ { _ref: 3 } ], name: "x", plain: [ { _id: 3, name: "later" } ] });

  assert.deepEqual(mapped.calls, [ 1 ]);
  assert.equal(object.mapped, mapped);
  assert.equal(mapped[0].name, "later");
  assert.equal(mapped[0], object.plain[0]);
});

test("a mapped list is replaced on a fresh load too, and skipEvents writes it raw", () =>
{
  const built = CjsGraph.from(Listed, { mapped: [ { name: "a" } ] });
  assert.deepEqual(built.mapped.calls, [ 0 ], "ReadList sends LOADFINISHED on a fresh load");
  assert.equal(built.mapped[0].name, "a");

  const raw = CjsGraph.from(Listed, { mapped: [ { name: "a" } ] }, { skipEvents: true });
  assert.deepEqual(raw.mapped.calls, []);
  assert.equal(raw.mapped.length, 1);
});

test("an ordinary array on a live list-notified owner sends the owner's events; a created owner fills raw", () =>
{
  const object = new Listed();
  object.plain.push(leaf("old"));

  CjsGraph.set(object, { plain: [ { name: "a" }, null, { name: "b" } ] });

  assert.equal(object.events.length, 3);
  assert.equal(object.events[0][3], 1, "UNLOADSTART sees the old items");
  assert.deepEqual(object.events.slice(1).map(([ , key, name ]) => [ key, name ]), [ [ 1, "a" ], [ 3, "b" ] ]);
  assert.equal(object.plain.length, 3);

  const built = CjsGraph.from(Listed, { plain: [ { name: "a" } ] });
  assert.deepEqual(built.events, []);
  assert.equal(built.plain.length, 1);
  assert.equal(UNLOADSTART > INSERTED, true);
});

test("an unchanged list sends nothing, and an idMap record survives a staged list", () =>
{
  const object = new Listed(), item = leaf("a");
  object.plain.push(item);

  assert.equal(CjsGraph.set(object, { plain: [ item ] }), false);
  assert.deepEqual(object.events, []);

  const idMap = new Map();
  const changes = CjsGraph.set(object, { plain: [ leaf("b") ] }, { idMap });
  assert.equal(object.plain[0].name, "b");
  assert.equal(idMap.get(changes.plain[0]._ref), object.plain[0]);
});

test("-0 and 0 are the same value in both comparisons", () =>
{
  assert.equal(float.IsEqual(-0, 0), true);
  assert.equal(float.IsExactEqual(-0, 0), true);
  assert.equal(float.IsExactEqual(NaN, NaN), true);
  assert.equal(float.IsExactEqual(1, 1 + 1e-6), false);
});

test("a fresh load of an empty mapped list still replaces it, because ReadList always sends LOADFINISHED", () =>
{
  const built = CjsGraph.from(Listed, { mapped: [] });
  assert.deepEqual(built.mapped.calls, [ 0 ]);

  const held = new Listed();
  CjsGraph.set(held, { mapped: [] });
  assert.deepEqual(held.mapped.calls, [], "a live set of an equal list is no change");
});

test("copy tells every changed PERSIST member, whether or not it is NOTIFY, as Copier does", () =>
{
  const source = watched("a"), target = watched("a");
  source.quiet = 5;

  assert.deepEqual(told(() => CjsGraph.copy(source, target)), [ [ "OnModified", "a", "quiet" ] ]);
});

test("copy tells a new child only what differs from its defaults", () =>
{
  const source = watched("a"), target = watched("a");
  source.child = watched("kid");

  assert.deepEqual(told(() => CjsGraph.copy(source, target)), [ [ "OnModified", "kid", "name" ], [ "OnModified", "a", "child" ] ]);
});

test("copy sends what AssignTo does: LOADFINISHED for items on an ordinary list, and nothing for an empty one", () =>
{
  const LOADFINISHED = 6;
  const source = new Listed(), target = new Listed();
  source.plain.push(leaf("a"), leaf("b"));

  CjsGraph.copy(source, target);
  assert.deepEqual(target.events, [ [ LOADFINISHED, 0, null, 2 ] ]);

  const emptied = new Listed();
  CjsGraph.copy(new Listed(), emptied);
  assert.deepEqual(emptied.events, []);
});

test("a load leaves a class's captured Map default empty", () =>
{
  class Weights { values = new Map(); }
  CjsGraph.define(Weights, { name: "GraphDefaultMap", members: [ { name: "values", type: "valuesMap", item: "float64" } ] });

  const first = CjsGraph.from(null, { _type: "GraphDefaultMap", values: { a: 1 } });

  assert.deepEqual(CjsGraph.get(first), { values: { a: 1 } });
  assert.deepEqual(CjsGraph.get(new Weights()), {});
});
