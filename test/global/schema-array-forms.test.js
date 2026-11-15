import assert from "node:assert/strict";
import { test } from "node:test";
import { ImportDist } from "../support/allDistClasses.js";

// The array forms (graph plan 2.2): `.array(length)` on a value type is a list of that value, its row's length the
// count or 0 for any; a counted typed array (`float32Array(6 * 16)`) is one flat array whose row length is the count.
const { CjsSchema, type } = await ImportDist("blue/schema/index.js");
const { exposure: be } = await ImportDist("blue/exposure/be.js");
const { ClassInfo } = await ImportDist("blue/index.js");
const { VARTYPE } = await ImportDist("global/consts/blue.js");
const { CjsGraph } = await ImportDist("global/model/graph/index.js");
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
});
