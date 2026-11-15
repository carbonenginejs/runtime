import assert from "node:assert/strict";
import test from "node:test";

import { blue } from "../../src/blue/index.js";
import { CjsBlueGraph } from "../../src/blue/formats/graph/index.js";
import { DictReader } from "../../src/blue/formats/graph/DictReader.js";
import { CjsSchema, type } from "../../src/blue/schema/index.js";
import { ClassInfo } from "../../src/global/model/graph/ClassInfo.js";
import { CjsGraph } from "../../src/global/model/graph/index.js";
import { VARTYPE } from "../../src/global/consts/blue.js";
import { exposure as be } from "#be";

// A ported std::vector of objects says how it holds each item, as the C++ element type does:
// `std::vector<X>` is `type.object.embed("X").array()`, a vector of counted pointers `ref`, of raw pointers `weak`.

CjsBlueGraph.register(blue.classes);

class ObjectArrayItem
{
  value = 0;
}
CjsSchema.be.define(ObjectArrayItem, { name: "ObjectArrayItem", fields: {
  value: [ type.int32, be.mapAttribute(be.PERSIST) ]
} });

class ObjectArrayOwner
{
  embedded = [];
  counted = [];
  uncounted = [];
  raw = [];
  fixed = [];
}
CjsSchema.define(ObjectArrayOwner, { name: "ObjectArrayOwner", fields: {
  embedded: [ type.object.embed("ObjectArrayItem").array(), CjsSchema.meta.mapAttribute(be.PERSIST) ],
  counted: [ type.object.ref("ObjectArrayItem").array(), CjsSchema.meta.mapAttribute(be.PERSIST) ],
  uncounted: [ type.object.ref.weak("ObjectArrayItem").array(), CjsSchema.meta.mapAttribute(be.PERSIST) ],
  raw: [ type.object.weak("ObjectArrayItem").array(), CjsSchema.meta.mapAttribute(be.PERSIST) ],
  fixed: [ type.object.embed("ObjectArrayItem").array(3), CjsSchema.meta.mapAttribute(be.PERSIST) ]
} });

const declared = name => CjsSchema.getSchema(ObjectArrayOwner).members.find(member => member.name === name).type;
const graphRow = name => CjsGraph.getClassInfo(ObjectArrayOwner).compiled.members.find(member => member.name === name);

test("an object type's array declares an array whose item is that object type", () =>
{
  assert.deepEqual(declared("embedded"), { kind: "array", itemType: { kind: "root", className: "ObjectArrayItem" } });
  assert.deepEqual(declared("counted"), { kind: "array", itemType: { kind: "rootRef", className: "ObjectArrayItem" } });
  assert.deepEqual(declared("uncounted"), { kind: "array", itemType: { kind: "rootRef", className: "ObjectArrayItem", owned: false } });
  assert.deepEqual(declared("raw"), { kind: "array", itemType: { kind: "rootWeak", className: "ObjectArrayItem" } });
  assert.deepEqual(declared("fixed"), { kind: "array", itemType: { kind: "root", className: "ObjectArrayItem" }, length: 3 });
});

test("an object type's array is a factory: used bare it throws, and a count is a positive integer", () =>
{
  class Bare { items = []; }
  assert.throws(() => CjsSchema.decorateField(Bare, "items", type.object.embed("ObjectArrayItem").array), /array\(\) or \.array\(length\)/);
  assert.throws(() => type.object.ref("ObjectArrayItem").array(0), /positive integer/);
});

test("the graph holds each item as its object type does", () =>
{
  const edges = [ "embedded", "counted", "uncounted", "raw", "fixed" ].map(name => [ name, graphRow(name).edgeKind, graphRow(name).collection, graphRow(name).edgeType ]);
  assert.deepEqual(edges, [
    [ "embedded", "embed", "array", [ "ObjectArrayItem" ] ],
    [ "counted", "ref", "array", [ "ObjectArrayItem" ] ],
    [ "uncounted", "refWeak", "array", [ "ObjectArrayItem" ] ],
    [ "raw", "weak", "array", [ "ObjectArrayItem" ] ],
    [ "fixed", "embed", "array", [ "ObjectArrayItem" ] ]
  ]);
});

test("each array's row is an object container with no Blue interface", () =>
{
  const entries = ClassInfo.exposeToBlue(ObjectArrayOwner).entries;
  for (const name of [ "embedded", "counted", "uncounted", "raw", "fixed" ])
  {
    const { type: vartype, collection, iid } = entries.get(name);
    assert.deepEqual({ vartype, collection, iid }, { vartype: VARTYPE.IROOT, collection: "array", iid: null }, name);
  }
  assert.equal(entries.get("fixed").length, 3);
});

test("the graph writes a set's storage as the schema's compile does, so the readers' set branch is reached", () =>
{
  class ObjectSetOwner { items = []; }
  CjsSchema.define(ObjectSetOwner, { name: "ObjectSetOwner", fields: {
    items: [ type.set("ObjectArrayItem"), CjsSchema.meta.mapAttribute(be.PERSIST) ]
  } });
  const row = ClassInfo.exposeToBlue(ObjectSetOwner).entries.get("items");
  assert.equal(row, CjsGraph.getClassInfo(ObjectSetOwner).compiled.members.find(member => member.name === "items"));
  assert.deepEqual({ vartype: row.type, collection: row.collection, edgeKind: row.edgeKind }, { vartype: VARTYPE.IROOT, collection: "set", edgeKind: "ref" });
});

test("values build each embedded item as an instance of its class", () =>
{
  const owner = new ObjectArrayOwner();
  new DictReader().ReadInto(owner, { embedded: [ { _type: "ObjectArrayItem", value: 4 }, { _type: "ObjectArrayItem", value: 5 } ] }, null);
  assert.equal(owner.embedded.length, 2);
  assert.ok(owner.embedded.every(item => item instanceof ObjectArrayItem));
  assert.deepEqual(owner.embedded.map(item => item.value), [ 4, 5 ]);
});
