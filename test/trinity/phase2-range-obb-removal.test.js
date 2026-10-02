import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { DictReader, DictWriter, Copier } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Range } from "../../npm/dist/trinity/utilities/Range.js";
import { Obb } from "../../npm/dist/trinity/utilities/Obb.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

for (const [Type, interfaces] of [[Range, [Range]], [Obb, []]])
test(`${Type.name} has only supported native queries and no model services`, () =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal(CjsSchema.cast(value, CjsModel), null);
  assert.deepEqual([...mappedInterfaces(Type)], interfaces);
  assert.equal(Type.from, undefined);
  for (const name of ["GetValues", "SetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(value[name], undefined);
});

test("Range exposes native readonly property order without persisting runtime caches", () =>
{
  const fields = CjsSchema.getSchema(Range).members;
  assert.deepEqual(fields.map(f => [f.name, f.type.kind]), [
    ["centerPoint", "float32"], ["minRangePoint", "float32"],
    ["maxRangePoint", "float32"], ["isUniform", "boolean"]
  ]);
  for (const field of fields)
  {
    assert.equal(field.edit.read, true);
    for (const flag of ["write", "persist", "notify"]) assert.notEqual(field.edit[flag], true);
  }
  const value = new Range();
  value.Setup(10, 6, 5, 14);
  value.SetIsUniform(false);
  value.SetMinRangePoint(7);
  value.SetMaxRangePoint(15);
  value.SetIsUniform(true);
  assert.deepEqual([value.centerPoint, value.minRangePoint, value.maxRangePoint], [10, 5, 13]);
  const bag = new DictWriter().WriteObject(value, {}, { persistOnly: false });
  assert.deepEqual([bag.centerPoint, bag.minRangePoint, bag.maxRangePoint, bag.isUniform], [10, 5, 13, true]);
  const copy = new Copier().CloneTo(value);
  assert.deepEqual([copy.centerPoint, copy.minRangePoint, copy.maxRangePoint, copy.isUniform], [0, 0, 0, true]);
  const persisted = new DictWriter().WriteObject(value, {}, { persistOnly: true });
  for (const name of ["centerPoint", "minRangePoint", "maxRangePoint", "isUniform", "_minRange", "_maxRange"])
    assert.equal(Object.hasOwn(persisted, name), false);
});

test("Obb retains unflagged dictionary vectors and independent buffers without persistence", () =>
{
  const fields = CjsSchema.getSchema(Obb).members;
  assert.deepEqual(fields.map(f => [f.name, f.type.kind]), ["x", "y", "z", "center", "sizes"].map(n => [n, "vec3"]));
  for (const field of fields)
    for (const flag of ["read", "write", "persist", "notify"]) assert.notEqual(field.edit?.[flag], true);
  const value = new DictReader({ declarations: true }).CreateObject({
    _type: "Obb", x: [0, 2, 0], y: [-3, 0, 0], z: [0, 0, 4], center: [7, 22, 34], sizes: [2, 3, 4]
  });
  assert.deepEqual(Array.from(value.GetPoint(0)), [-2, 26, 50]);
  const bag = new DictWriter().WriteObject(value, {}, { persistOnly: false });
  const decoded = new DictReader({ declarations: true }).CreateObject({ _type: "Obb", ...bag });
  assert.deepEqual(Array.from(decoded.GetPoint(7)), [16, 18, 18]);
  assert.notEqual(decoded.center, value.center);
  const copied = new Copier().CloneTo(value);
  for (const name of ["x", "y", "z", "center", "sizes"])
    assert.deepEqual(Array.from(copied[name]), [0, 0, 0]);
  for (const invalid of [-1, 8, 0.5, NaN]) assert.throws(() => value.GetPoint(invalid), RangeError);
});

test("Obb preserves rotated nonuniform affine bounds and documented projective adapters", () =>
{
  const box = new Obb();
  const affine = Float32Array.from([0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 10, 20, 30, 1]);
  box.CreateClippedWorldBoundingObb([-1, -2, -3], [3, 4, 5], affine);
  const min = new Float32Array(3), max = new Float32Array(3);
  box.ComputeAABB(min, max, mat4.create());
  assert.deepEqual(Array.from(min), [-2, 18, 18]);
  assert.deepEqual(Array.from(max), [16, 26, 50]);
  const projective = mat4.create();
  projective[15] = 2;
  box.CreateClippedWorldBoundingObb([0, 2, 4], [2, 4, 6], projective);
  assert.deepEqual(Array.from(box.center), [0.5, 1.5, 2.5]);
  const zeroW = mat4.create();
  zeroW[15] = 0;
  box.ComputeAABB(min, max, zeroW);
  assert.deepEqual(Array.from(min), [-0.5, 0.5, 1.5]);
  assert.deepEqual(Array.from(max), [1.5, 2.5, 3.5]);
});
