import { EDITFLAGS } from "../../src/global/consts/blue.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsGraph, ClassInfo, CjsGraphTypeFloat, GraphOperation, VARTYPE } from "../../src/global/model/graph/index.js";
import { VarEntry } from "../../src/global/model/graph/VarEntry.js";

/** Each member name once, the nearest class's first: the order a class's values are listed in. */
const namesOf = info => [ ...new Set(info.compiled.members.map(member => member.name)) ];


test("source declarations and compiled members share one stable class record", () =>
{
  let constructions = 0, reads = 0;
  class Example
  {
    constructor() { constructions++; }
    get value() { reads++; return 3; }
  }
  const declaration = { name: "GraphInfoExample", members: [
    { name: "value", key: "storedValue", type: "float32", options: { flags: 7 } }
  ] };
  const info = CjsGraph.define(Example, declaration);
  assert.equal(info.constructor, ClassInfo);
  // The record is whole when define returns: nothing is built on a later ask.
  const built = info.compiled;
  assert.deepEqual(built.members.map(member => member.name), [ "value" ]);
  assert.equal(info.declared.members[0].key, "storedValue");

  declaration.members[0].key = "changedExternally";
  const resolved = CjsGraph.getClassInfo("GraphInfoExample");
  assert.equal(resolved, info);
  assert.equal(CjsGraph._FindEntry(resolved, "value").key, "storedValue");
  assert.equal(CjsGraph._FindEntry(resolved, "value").handler.constructor, CjsGraphTypeFloat);
  assert.deepEqual(CjsGraph._FindEntry(resolved, "value").options, { flags: 7 });
  assert.equal(CjsGraph.getClassInfo(Example).compiled, built);
  assert.equal(constructions, 0);
  assert.equal(reads, 0);
});

test("compilation preserves derived precedence and authored member order", () =>
{
  class Base {}
  class Middle extends Base {}
  class Derived extends Middle {}
  CjsGraph.define(Base, { name: "GraphOrderBase", members: [
    { name: "shared", key: "baseValue", type: "float32" }, { name: "baseOnly", type: "float32" }
  ] });
  const info = CjsGraph.define(Derived, { name: "GraphOrderDerived", chainTo: "GraphOrderBase", members: [
    { name: "own", type: "float32" }, { name: "shared", key: "derivedValue", type: "float32" }
  ] });
  const compiled = CjsGraph.getClassInfo(Derived).compiled;
  assert.deepEqual(compiled.members.map(member => member.name), ["own", "shared", "shared", "baseOnly"]);
  assert.equal(CjsGraph._FindEntry(info, "shared").key, "derivedValue");
  assert.equal(CjsGraph._FindEntry(info, "shared").owner, info);
  assert.equal(CjsGraph._FindEntry(info, "baseOnly").owner, CjsGraph.getClassInfo(Base));
  assert.equal(CjsGraph._FindEntry(info, "missing"), undefined);
  assert.equal(info.declared.members.length, 2);
});

test("a class defined again, or a parent that arrives late, rebuilds the classes derived from it and no others", () =>
{
  class Parent {}
  class Child extends Parent {}
  class Grandchild extends Child {}
  class Unrelated {}
  const info = CjsGraph.define(Child, { name: "GraphLateChild", chainTo: "GraphLateParent", members: [{ name: "child", type: "float32" }] });
  const grand = CjsGraph.define(Grandchild, { name: "GraphLateGrandchild", chainTo: "GraphLateChild", members: [{ name: "grand", type: "float32" }] });
  const unrelated = CjsGraph.define(Unrelated, { name: "GraphLateUnrelated", members: [{ name: "x", type: "float32" }] });
  const first = info.compiled, other = unrelated.compiled;
  assert.deepEqual(first.members.map(member => member.name), ["child"]);

  // The chain named a class with no definition and ended there; the class arrives, and the chain is whole.
  CjsGraph.define(Parent, { name: "GraphLateParent", members: [{ name: "parent", type: "float32" }] });
  assert.notEqual(info.compiled, first);
  assert.deepEqual(info.compiled.members.map(member => member.name), ["child", "parent"]);
  assert.deepEqual(namesOf(grand), ["grand", "child", "parent"]);
  assert.equal(unrelated.compiled, other);

  // Defined again: the classes built from its rows are built again, through every level.
  CjsGraph.define(Parent, { name: "GraphLateParent", members: [{ name: "replaced", type: "float32" }] });
  assert.deepEqual(namesOf(grand), ["grand", "child", "replaced"]);
  assert.equal(unrelated.compiled, other);

  assert.equal(CjsGraph.define(Child, { name: "GraphRenamedChild", chainTo: "GraphLateParent", members: [{ name: "replacement", type: "float32" }] }), info);
  assert.throws(() => CjsGraph.getClassInfo("GraphLateChild"), TypeError);
  assert.deepEqual(CjsGraph.getClassInfo(Child).compiled.members.map(member => member.name), ["replacement", "replaced"]);
  // The grandchild's chain names the old name, which nothing holds now: it ends there.
  assert.deepEqual(namesOf(grand), ["grand"]);
});

test("failed registration does not mutate published definitions", () =>
{
  class Good {}
  class Other {}
  const info = CjsGraph.define(Good, { name: "GraphValidation", members: [{ name: "x", type: "float32" }] });
  const before = CjsGraph.getClassInfo(Good).compiled;
  assert.throws(() => CjsGraph.define(Other, { name: "GraphValidation", members: [] }), TypeError);
  assert.throws(() => CjsGraph.define(Good, { name: "GraphValidation", members: [
    { name: "x", type: "float32" }, { name: "x", type: "float32" }
  ] }), TypeError);
  assert.equal(CjsGraph.getClassInfo(Good).compiled, before);
  assert.equal(info.declared.members.length, 1);
  assert.throws(() => CjsGraph.getClassInfo(Other), TypeError);
  assert.throws(() => CjsGraph.define({}, { name: "GraphInvalidCtor" }), TypeError);
});

test("untyped members share the throwing Invalid handler until explicitly defined", () =>
{
  class Untyped {}
  const info = CjsGraph.define(Untyped, { name: "GraphDefaultHandler", members: [
    { name: "first" }, { name: "second" }
  ] });
  const members = CjsGraph.getClassInfo(Untyped).compiled.members;
  assert.equal(members[0].type, VARTYPE.INVALID);
  assert.equal(members[0].handler, members[1].handler);
    assert.throws(() => members[0].handler.Get({}, "first"), /Invalid type handler.*first/);
  CjsGraph.define(Untyped, { name: "GraphDefaultHandler", members: [{ name: "first", type: "float32" }] });
  assert.equal(CjsGraph.getClassInfo(Untyped), info);
  assert.equal(info.compiled.members[0].handler.constructor, CjsGraphTypeFloat);
});

test("a member lookup accepts object-prototype names without collision", () =>
{
  class Names {}
  CjsGraph.define(Names, { name: "GraphSpecialNames", members: [
    { name: "__proto__", type: "float32" }, { name: "constructor", type: "float32" }
  ] });
  const info = CjsGraph.getClassInfo(Names);
  assert.equal(CjsGraph._FindEntry(info, "__proto__").name, "__proto__");
  assert.equal(CjsGraph._FindEntry(info, "constructor").name, "constructor");
  assert.equal(CjsGraph._FindEntry(info, "toString"), undefined);
  // The per-operation tables are keyed by name with no prototype behind them.
  assert.equal(CjsGraph._getMemberTable(info, GraphOperation.SET, {}).byName.toString, undefined);
  assert.equal(CjsGraph._getMemberTable(info, GraphOperation.SET, {}).byName.constructor.name, "constructor");
});

test("Blue and graph use the single Carbon VARTYPE enum", () =>
{
  assert.equal(new VarEntry().type, VARTYPE.INVALID);
  assert.equal(VARTYPE.FLOATARRAY, 15);
  assert.equal(VARTYPE.VARTYPE_FORCELONG, 0xffffffff);
  assert.equal(Object.isFrozen(VARTYPE), true);
});

test("policy can skip a hidden derived candidate without losing the visible base", () =>
{
  class Visible {}
  class Hidden extends Visible {}
  CjsGraph.define(Visible, { name: "GraphVisibleBase", members: [{ name: "x", key: "base", type: "float32" }] });
  CjsGraph.define(Hidden, { name: "GraphHiddenDerived", chainTo: "GraphVisibleBase", members: [{ name: "x", key: "derived", type: "float32", flags: EDITFLAGS.HIDDEN }] });
  const candidates = CjsGraph.getClassInfo(Hidden).compiled.members.filter(member => member.name === "x");
  assert.deepEqual(candidates.map(member => member.key), ["derived", "base"]);
  assert.equal(candidates.find(member => (member.flags & EDITFLAGS.HIDDEN) === 0).key, "base");
});

test("a definition that throws leaves the rows handed in as they were", () =>
{
  class Rowed {}
  const info = CjsGraph.define(Rowed, { name: "GraphRowed", members: [ { name: "value", type: "float32" } ] });
  const row = info.declared.members[0];
  const held = { ...row };
  const same = () => { for (const key of Object.keys(held)) assert.equal(row[key], held[key], key); };

  // Refused after every row was filled.
  assert.throws(() => CjsGraph.define(Rowed, { name: "GraphRowed", bases: [ "GraphRowedMissing" ], members: [
    { name: "value", type: "string", flags: EDITFLAGS.READ, row }
  ] }), /Unknown graph base: GraphRowedMissing, a base of GraphRowed/);
  same();

  // Refused at a later member.
  assert.throws(() => CjsGraph.define(Rowed, { name: "GraphRowed", members: [
    { name: "value", type: "string", flags: EDITFLAGS.READ, row }, { name: "other", type: "noSuchType" }
  ] }), /Unknown graph type: noSuchType/);
  same();

  assert.equal(info.declared.members[0], row);
  // Still the float32 member: its handler is the float one.
  assert.equal(CjsGraph._FindEntry(info, "value").handler.constructor, CjsGraphTypeFloat);
});
