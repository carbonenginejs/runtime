import assert from "node:assert/strict";
import { test } from "node:test";
import { ImportDist } from "../support/allDistClasses.js";

// The array forms (graph plan 2.2): `.array(length)` on a value type is a list of that value, its row's length the
// count or 0 for any; a counted typed array (`float32Array(6 * 16)`) is one flat array whose row length is the count.
const { CjsSchema, type } = await ImportDist("blue/schema/index.js");
const { exposure: be } = await ImportDist("blue/exposure/be.js");
const { ClassInfo } = await ImportDist("blue/index.js");
const { VARTYPE } = await ImportDist("global/consts/blue.js");
const { CjsGraph, GraphMemberFlags } = await ImportDist("global/model/graph/index.js");
await ImportDist("blue/formats/graph/index.js");

/** The graph's row for a member of a defined class. */
const graphRow = (Class, name) => CjsGraph.getClassInfo(Class).declared.members.find(row => row.name === name);

test("a counted typed array is one flat array, its count on the row Blue and the graph share", () =>
{
  class CountedArrayProbe
  {
    shadowMatrix = new Float32Array(6 * 16);
    anyLength = new Float32Array(0);
  }
  CjsSchema.decorateField(CountedArrayProbe, "shadowMatrix", be.mapAttribute(be.READWRITE | be.PERSIST), type.float32Array(6 * 16));
  CjsSchema.decorateField(CountedArrayProbe, "anyLength", be.mapAttribute(be.READWRITE | be.PERSIST), type.float32Array);
  be.define("CountedArrayProbe")(CountedArrayProbe);

  const row = ClassInfo.exposeToBlue(CountedArrayProbe).entries.get("shadowMatrix");
  assert.equal(row.type, VARTYPE.FLOATARRAY);
  assert.equal(row.length, 96);
  assert.equal(row.GetFloatArraySize(), 96);
  assert.equal(graphRow(CountedArrayProbe, "shadowMatrix"), row);
  assert.equal(ClassInfo.exposeToBlue(CountedArrayProbe).entries.get("anyLength").length, 0);
});

test("a value type's .array is a values list of that value, counted or not", () =>
{
  class ValueArrayProbe
  {
    planes = [];
    targets = [];
  }
  CjsSchema.decorateField(ValueArrayProbe, "planes", type.vec4.array(6));
  CjsSchema.decorateField(ValueArrayProbe, "targets", type.vec3.array());
  CjsSchema.meta.define("ValueArrayProbe")(ValueArrayProbe);

  const planes = graphRow(ValueArrayProbe, "planes");
  assert.equal(planes.length, 6);
  assert.equal(planes.item.length, 4);
  assert.equal(planes.item.type, VARTYPE.FLOATARRAY);
  const targets = graphRow(ValueArrayProbe, "targets");
  assert.equal(targets.length, 0);
  assert.equal(targets.item.length, 3);
  // The same declaration the retired `type.array("vec3")` wrote, with the count beside it.
  const declared = name => CjsSchema.getDeclaredSchema(ValueArrayProbe).members.find(member => member.name === name).type;
  assert.deepEqual({ ...declared("targets") }, { kind: "array", itemType: "vec3" });
  assert.deepEqual({ ...declared("planes") }, { kind: "array", itemType: "vec4", length: 6 });
});

test("the double vectors are Carbon's DOUBLEARRAY (BlueTypeTraits.h:66-71)", () =>
{
  class DoubleVectorProbe
  {
    position = new Float64Array(3);
  }
  CjsSchema.decorateField(DoubleVectorProbe, "position", be.mapAttribute(be.READWRITE | be.PERSIST), type.vec3d);
  be.define("DoubleVectorProbe")(DoubleVectorProbe);

  const row = ClassInfo.exposeToBlue(DoubleVectorProbe).entries.get("position");
  assert.equal(row.type, VARTYPE.DOUBLEARRAY);
  assert.equal(row.GetDoubleArraySize(), 3);
});

test("a declared count is a positive integer", () =>
{
  assert.throws(() => type.float32Array(0), /positive integer/);
  assert.throws(() => type.vec3.array(1.5), /positive integer/);
  // `@type.vec3.array` without the call would run as the field's decorator and replace its initializer.
  assert.throws(() => type.vec3.array(undefined, { kind: "field", name: "x" }), /write type\.vec3\.array\(\)/);
});

test("a nullable value member carries GraphMemberFlags.NULLABLE; a plain one does not", () =>
{
  class NullableValueProbe
  {
    color1 = null;
    color2 = new Float32Array(4);
  }
  CjsSchema.decorateField(NullableValueProbe, "color1", be.mapAttribute(be.READWRITE | be.PERSIST), type.color.nullable);
  CjsSchema.decorateField(NullableValueProbe, "color2", be.mapAttribute(be.READWRITE | be.PERSIST), type.color);
  be.define("NullableValueProbe")(NullableValueProbe);

  const nullable = graphRow(NullableValueProbe, "color1");
  assert.notEqual(nullable.flags & GraphMemberFlags.NULLABLE, 0);
  assert.equal(nullable.type, VARTYPE.FLOATARRAY);
  assert.equal(graphRow(NullableValueProbe, "color2").flags & GraphMemberFlags.NULLABLE, 0);
});

test("a double vector read from plain data is a Float64Array of the exact doubles", async () =>
{
  const { DictReader } = await ImportDist("blue/formats/graph/DictReader.js");
  class DoubleVectorRead
  {
    position = new Float64Array(3);
    size = new Float64Array(2);
  }
  CjsSchema.decorateField(DoubleVectorRead, "position", be.mapAttribute(be.READWRITE | be.PERSIST), type.vec3d);
  CjsSchema.decorateField(DoubleVectorRead, "size", be.mapAttribute(be.READWRITE | be.PERSIST), type.vec2d);
  be.define("DoubleVectorRead")(DoubleVectorRead);

  const object = new DoubleVectorRead();
  new DictReader().ReadInto(object, { position: [ 0.1, 0.2, 0.3 ], size: [ 640, 480 ] }, null);
  assert.ok(object.position instanceof Float64Array);
  assert.deepEqual(Array.from(object.position), [ 0.1, 0.2, 0.3 ]);
  assert.ok(object.size instanceof Float64Array);
});

test("a subclass that declares a member's type again does not inherit its nullability or count", () =>
{
  class NullableBase
  {
    color1 = null;
    planes = [];
  }
  CjsSchema.decorateField(NullableBase, "color1", type.color.nullable);
  CjsSchema.decorateField(NullableBase, "planes", type.vec4.array(6));
  CjsSchema.meta.define("NullableBase")(NullableBase);
  class NullableRedeclared extends NullableBase {}
  CjsSchema.decorateField(NullableRedeclared, "color1", type.color);
  CjsSchema.decorateField(NullableRedeclared, "planes", type.vec4.array());
  CjsSchema.meta.define("NullableRedeclared")(NullableRedeclared);

  const declared = name => CjsSchema.getDeclaredSchema(NullableRedeclared).members.find(member => member.name === name).type;
  assert.equal(declared("color1").nullable, undefined);
  assert.equal(declared("planes").length, undefined);

  // A reference re-declared as a value keeps nothing of the reference.
  class ReferenceBase { target = null; }
  CjsSchema.decorateField(ReferenceBase, "target", type.object.ref("NullableBase"));
  CjsSchema.meta.define("ReferenceBase")(ReferenceBase);
  class ReferenceAsValue extends ReferenceBase { target = 0; }
  CjsSchema.decorateField(ReferenceAsValue, "target", type.float32);
  CjsSchema.meta.define("ReferenceAsValue")(ReferenceAsValue);
  assert.deepEqual({ ...CjsSchema.getDeclaredSchema(ReferenceAsValue).members.find(member => member.name === "target").type }, { kind: "float32" });
});

test("a type re-declared alone keeps the exposure row's flags fact for the same value type", () =>
{
  class FlagsBase { mask = 0; }
  CjsSchema.decorateField(FlagsBase, "mask", type.flags({ A: 1, B: 2 }));
  CjsSchema.meta.define("FlagsBase")(FlagsBase);
  class FlagsRedeclared extends FlagsBase {}
  CjsSchema.decorateField(FlagsRedeclared, "mask", type.uint32);
  CjsSchema.meta.define("FlagsRedeclared")(FlagsRedeclared);
  class FlagsAsFloat extends FlagsBase { mask = 0; }
  CjsSchema.decorateField(FlagsAsFloat, "mask", type.float32);
  CjsSchema.meta.define("FlagsAsFloat")(FlagsAsFloat);

  const declared = Class => CjsSchema.getDeclaredSchema(Class).members.find(member => member.name === "mask").type;
  assert.equal(declared(FlagsRedeclared).flags, true);
  assert.equal(declared(FlagsAsFloat).flags, undefined);
});
