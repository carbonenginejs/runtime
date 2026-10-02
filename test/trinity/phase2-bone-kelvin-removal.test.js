import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { IInitialize, DictReader, DictWriter, Copier } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { GrannyBoneOffset } from "../../npm/dist/trinity/core/animation/GrannyBoneOffset.js";
import { Tr2KelvinColor } from "../../npm/dist/trinity/core/lighting/Tr2KelvinColor.js";

for (const [Type, className] of [[GrannyBoneOffset, "GrannyBoneOffset"], [Tr2KelvinColor, "Tr2KelvinColor"]])
test(`${className} has exact initialization exposure and no model services`, t =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), IInitialize.prototype);
  assert.equal("GetValues" in value, false);
  assert.deepEqual([...mappedInterfaces(Type)], [Type, IInitialize]);
  assert.equal(Type.from, undefined);
  for (const key of ["GetValues", "SetValues", "UpdateValues", "Dispose"]) assert.equal(value[key], undefined);
  assert.equal(value.Initialize(), true);
  let initialized = 0;
  t.mock.method(Type.prototype, "Initialize", () => { initialized++; return true; });
  const decoded = new DictReader({declarations: true}).CreateObject({_type: className});
  const copy = new Copier().CloneTo(decoded);
  assert.ok(copy instanceof Type);
  assert.equal(initialized, 2);
});

test("bone caches stay runtime-only and retain binding invalidation and omission adapters", () =>
{
  const offsets = new GrannyBoneOffset();
  assert.deepEqual(CjsSchema.getSchema(GrannyBoneOffset).members, []);
  offsets.SetOffset("Head", 1, 2, 3);
  offsets.BindToRig(["Head"]);
  assert.equal(offsets.NeedRebind(1), false);
  const copy = new Copier().CloneTo(offsets);
  assert.equal(copy.HaveTransforms(), false);
  const written = new DictWriter().WriteObject(offsets, {}, {persistOnly: true});
  assert.equal(Object.hasOwn(written, "_transforms"), false);
  assert.equal(Object.hasOwn(written, "_riggedTransforms"), false);
  const result = mat4.create();
  offsets.BindToRig(null, 0);
  assert.equal(offsets.Apply(result, 0, mat4.create(), mat4.create()), true);
  offsets.BindToRig(["missing"]);
  assert.equal(offsets.Apply(result, 0, mat4.create(), mat4.create()), false);
  offsets.SetRotation("Head", 0, 0, 0, 1);
  assert.equal(offsets.NeedRebind(1), true);
  offsets.BindToRig(["Head"]);
  offsets.Apply(result, 0, mat4.create(), mat4.create());
  assert.deepEqual(Array.from(result.slice(12, 15)), [0, 0, 0]);
  offsets.ClearTransforms();
  assert.equal(offsets.HaveTransforms(), false);
  assert.equal(offsets.Apply(result, 0, mat4.create(), mat4.create()), false);
});

test("bone offset composes before animation with a rotating scaled parent", () =>
{
  const offsets = new GrannyBoneOffset();
  const offsetRotation = quat.setAxisAngle(quat.create(), [1, 0, 0], Math.PI / 2);
  offsets.SetRotation("Head", ...offsetRotation);
  offsets.SetOffset("Head", 1, 2, 3);
  offsets.BindToRig(["Head"]);
  const bone = mat4.fromRotationTranslation(mat4.create(), quat.setAxisAngle(quat.create(), [0, 1, 0], Math.PI / 2), [4, 5, 6]);
  const parent = mat4.fromRotationTranslationScale(mat4.create(), quat.setAxisAngle(quat.create(), [0, 0, 1], Math.PI / 2), [10, 20, 30], [2, 3, 4]);
  const out = mat4.create();
  assert.equal(offsets.Apply(out, 0, bone, parent), true);
  // Added local translation (5,7,9), then scaled (10,21,36), rotated Z90,
  // and finally translated by the parent. This distinguishes reversed order.
  for (const [i, expected] of [[12,-11],[13,30],[14,66]]) assert.ok(Math.abs(out[i]-expected)<1e-5);
  const direction = vec3.transformMat4(vec3.create(), [0, 1, 0], out);
  // Local Y -> offset Z -> animated X -> parent Y, scaled by parent X=2.
  assert.ok(Math.abs(direction[0]+11)<1e-5);
  assert.ok(Math.abs(direction[1]-32)<1e-5);
  assert.ok(Math.abs(direction[2]-66)<1e-5);
  const rotation = quat.setAxisAngle(quat.create(), [0, 1, 0], Math.PI / 2), position = vec3.fromValues(4,5,6);
  assert.equal(offsets.ApplyToLocal(0, rotation, position), true);
  assert.deepEqual(Array.from(position), [5,7,9]);
  const localDirection = vec3.transformQuat(vec3.create(), [0,1,0], rotation);
  assert.ok(Math.abs(localDirection[0]-1)<1e-5);
  assert.ok(Math.abs(localDirection[1])<1e-5);
  assert.ok(Math.abs(localDirection[2])<1e-5);
});

test("Kelvin authored member order roundtrips while existing RGB adapters are retained", () =>
{
  const fields = CjsSchema.getSchema(Tr2KelvinColor).members;
  assert.deepEqual(fields.map(f=>f.name), ["temperature", "tint", "whiteBalance"]);
  assert.deepEqual(fields.map(f=>f.type.kind), ["float32", "float32", "int32"]);
  for (const field of fields)
  {
    assert.equal(field.edit.read, true); assert.equal(field.edit.write, true); assert.equal(field.edit.persist, true);
    assert.notEqual(field.edit.notify, true);
  }
  const value = new DictReader({declarations:true}).CreateObject({_type:"Tr2KelvinColor",temperature:5000,tint:0.25,whiteBalance:3});
  const copy = new Copier().CloneTo(value), written = new DictWriter().WriteObject(copy, {}, {persistOnly:true});
  assert.deepEqual([written.temperature,written.tint,written.whiteBalance], [5000,0.25,3]);
  const out = vec3.create();
  assert.equal(copy.GetColor(out), out);
  assert.deepEqual(Array.from(out), Array.from(value.GetColor()));
  copy.temperature = NaN;
  assert.deepEqual(Array.from(copy.GetColor()), [0,0,0]);
  assert.equal(CjsSchema.getMethod(Tr2KelvinColor, "GetColor").impl.status, "adapted");
});
