import assert from "node:assert/strict";
import test from "node:test";
import { carbonChainToDecorator } from "../../src/blue/compose/interface.js";
import "../../src/blue/index.js";
import { CjsSchema } from "../../src/blue/schema/CjsSchema.js";
import { EDITFLAGS } from "../../src/global/consts/blue.js";
import { CjsGraph, GraphMemberFlags } from "../../src/global/model/graph/index.js";

class Parent {}
class Face {}
class Chained {}
class Thing extends Parent
{
  readable = 1;
  only = 2;
  load = 3;
  noted = 4;
  mask = 5;
  live = null;
}

const int32 = { kind: "int32" };
CjsSchema.define(Parent, { name: "GraphFlagsParent", members: [] });
CjsSchema.define(Face, { name: "GraphFlagsFace", members: [] });
CjsSchema.define(Chained, { name: "GraphFlagsChained", members: [] });
CjsSchema.be.inherit(Face)(Thing, { kind: "class" });
carbonChainToDecorator(Chained)(Thing, { kind: "class" });
CjsSchema.define(Thing, { name: "GraphFlagsThing", members: [
  { name: "readable", key: "readable", type: int32, exposure: { macro: "MAP_ATTRIBUTE", flags: 1 }, edit: { read: true } },
  { name: "only", key: "only", type: int32, exposure: { macro: "MAP_ATTRIBUTE", flags: 24 }, edit: { persist: true, persistOnly: true, hidden: true } },
  { name: "load", key: "load", type: int32, exposure: { macro: "MAP_ATTRIBUTE", flags: 32 }, edit: { rpersist: true } },
  { name: "noted", key: "noted", type: int32, exposure: { macro: "MAP_ATTRIBUTE", flags: 23 }, edit: { read: true, write: true, persist: true, notify: true } },
  { name: "mask", key: "mask", type: { kind: "int32", flags: true }, exposure: { macro: "MAP_ATTRIBUTE", flags: 259 }, edit: { read: true, write: true } },
  { name: "live", key: "live", type: { kind: "rootRef", runtimeOnly: true }, exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, edit: { persist: true } }
] });

// Nothing here defines a class to the graph: each define above did, the bases before the class that names them.
const info = CjsGraph.getClassInfo(Thing);
const flagsOf = name => CjsGraph._FindEntry(info, name).flags;

test("a member's flags are Carbon's EDITFLAGS, with the bits that are ours above EDMASK", () =>
{
  assert.equal(flagsOf("readable"), EDITFLAGS.READ);
  assert.equal(flagsOf("only"), EDITFLAGS.PERSISTONLY);
  assert.equal(flagsOf("load"), EDITFLAGS.RPERSIST);
  assert.equal(flagsOf("noted"), EDITFLAGS.READWRITE | EDITFLAGS.PERSIST | EDITFLAGS.NOTIFY);
  assert.equal(flagsOf("mask"), EDITFLAGS.READWRITE | EDITFLAGS.FLAGS);
  assert.equal(flagsOf("live"), EDITFLAGS.PERSIST | GraphMemberFlags.RUNTIMEONLY);
  assert.equal(GraphMemberFlags.BINARY & (EDITFLAGS.MODMASK | EDITFLAGS.SERMASK | EDITFLAGS.EDMASK), 0);
});

test("PERSISTONLY stays readable, and RPERSIST loads without being written back", () =>
{
  const object = new Thing();

  assert.deepEqual(CjsGraph.get(object, { full: true, persistOnly: true }), { only: 2, noted: 4 });
  assert.deepEqual(CjsGraph.set(object, { load: 9, readable: 9 }), { load: 9 });
  assert.equal(object.load, 9);
  assert.equal(object.readable, 1, "READ alone takes no value");
  assert.equal(flagsOf("load") & EDITFLAGS.PERSIST, 0, "IRootReaderBase::FindEntry tests PERSIST alone");
});

test("the base list and the exposure chain are separate facts", () =>
{
  const { declared } = CjsGraph.getClassInfo(Thing);
  assert.deepEqual(declared.bases, [ Parent, Face ]);
  assert.equal(declared.chainTo, "GraphFlagsChained");
  assert.deepEqual(CjsGraph._GetExposureChain(CjsGraph.getClassInfo(Thing)), [ CjsGraph.getClassInfo(Thing), CjsGraph.getClassInfo(Chained) ],
    "member lookup follows the chain, never the base list");
});
