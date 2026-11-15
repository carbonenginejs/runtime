import assert from "node:assert/strict";
import { test } from "node:test";
import { ImportDist } from "../support/allDistClasses.js";

// A dictionary member (Carbon's IBlueDict, `DictReader::ReadDict`, blue/src/DictReader.cpp:479-530) holds objects:
// each value is built as `ReadIRootClass` builds an object member, so its own typed members coerce. The default
// values mode reads it so, as the declared mode does.
const { CjsSchema, type } = await ImportDist("blue/schema/index.js");
const { exposure: be } = await ImportDist("blue/exposure/be.js");
const { DictReader } = await ImportDist("blue/formats/graph/DictReader.js");

class DictMapRecordProbe
{
  rotation = new Float64Array(3);
}
CjsSchema.decorateField(DictMapRecordProbe, "rotation", be.mapAttribute(be.READWRITE | be.PERSIST), type.vec3d);
CjsSchema.meta.define("DictMapRecordProbe")(DictMapRecordProbe);

class DictMapOwnerProbe
{
  value = new Map();
}
CjsSchema.decorateField(DictMapOwnerProbe, "value", be.mapAttribute(be.READWRITE | be.PERSIST),
  type.map({ kind: "rootRef", className: "DictMapRecordProbe" }));
CjsSchema.meta.define("DictMapOwnerProbe")(DictMapOwnerProbe);

test("a map of a record class builds each plain value as a record in the default mode", () =>
{
  const owner = new DictMapOwnerProbe();
  new DictReader().ReadInto(owner, { value: { Jaw: { rotation: [ 0.4, 0.5, 0.6 ] } } }, null);

  assert.ok(owner.value instanceof Map);
  const jaw = owner.value.get("Jaw");
  assert.ok(jaw instanceof DictMapRecordProbe, "a record of the declared class, not a plain Object");
  assert.ok(jaw.rotation instanceof Float64Array, "its vec3d member coerces to Carbon's DOUBLEARRAY");
  assert.deepEqual(Array.from(jaw.rotation), [ 0.4, 0.5, 0.6 ]);
});

test("map values keep the reader's anchors, aliases, nulls and live references", () =>
{
  const owner = new DictMapOwnerProbe();
  const live = new DictMapRecordProbe();
  new DictReader().ReadInto(owner, { value: {
    first: { _id: 1, rotation: [ 1, 2, 3 ] },
    back: { _ref: 1 },
    ahead: { _ref: 2 },
    none: null,
    live,
    later: { _id: 2, rotation: [ 4, 5, 6 ] }
  } }, null);

  assert.deepEqual([ ...owner.value.keys() ], [ "first", "back", "ahead", "none", "live", "later" ]);
  assert.equal(owner.value.get("back"), owner.value.get("first"));
  assert.equal(owner.value.get("ahead"), owner.value.get("later"), "a forward alias resolves when the read ends");
  assert.ok(owner.value.get("later") instanceof DictMapRecordProbe);
  assert.equal(owner.value.get("none"), null);
  assert.equal(owner.value.get("live"), live);
});

test("the declared mode reads the same map to the same records", () =>
{
  const owner = new DictMapOwnerProbe();
  new DictReader({ declarations: true }).ReadInto(owner, { value: { Jaw: { rotation: [ 0.4, 0.5, 0.6 ] } } }, null);

  const jaw = owner.value.get("Jaw");
  assert.ok(jaw instanceof DictMapRecordProbe);
  assert.ok(jaw.rotation instanceof Float64Array);
});

test("a map of an interface keeps plain values, which no declared class can be built for", () =>
{
  class DictMapInterfaceProbe {}
  CjsSchema.exposure.interface("DictMapInterfaceProbe")(DictMapInterfaceProbe);
  class DictMapInterfaceOwner
  {
    parameters = new Map();
  }
  CjsSchema.decorateField(DictMapInterfaceOwner, "parameters", be.mapAttribute(be.READWRITE | be.PERSIST),
    type.map({ kind: "rootRef", className: "DictMapInterfaceProbe" }));
  CjsSchema.meta.define("DictMapInterfaceOwner")(DictMapInterfaceOwner);

  const owner = new DictMapInterfaceOwner();
  new DictReader().ReadInto(owner, { parameters: { Gloss: { name: "Gloss", value: 0.5 } } }, null);
  assert.deepEqual({ ...owner.parameters.get("Gloss") }, { name: "Gloss", value: 0.5 });
});
