import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { DictReader, Copier, ITriFunction, ITriQuaternionFunction } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { TriTorque } from "../../npm/dist/trinity/core/animation/TriTorque.js";
import { TriRigidOrientation } from "../../npm/dist/trinity/core/animation/TriRigidOrientation.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

for (const [Type, Base, interfaces] of [
  [TriTorque, Object, []],
  [TriRigidOrientation, ITriQuaternionFunction, [ITriFunction, ITriQuaternionFunction]]
]) test(`${Type.name} retains native base and exact query table without model helpers`, () =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Base.prototype);
  assert.equal(CjsSchema.cast(value, CjsModel), null);
  assert.deepEqual([...mappedInterfaces(Type)], interfaces);
  assert.equal(Type.from, undefined);
  for (const name of ["GetValues", "SetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(value[name], undefined);
});

test("native declaration order and flags preserve torque graph copying without cursor persistence", () =>
{
  for (const [Type, expected] of [
    [TriTorque, [["time", "float32"], ["rot0", "quat"], ["omega0", "vec3"], ["torque", "vec3"]]],
    [TriRigidOrientation, [["name", "string"], ["I", "float32"], ["drag", "float32"], ["value", "quat"], ["start", "float64"], ["states", "list"]]]
  ])
  {
    const fields = CjsSchema.getSchema(Type).members;
    assert.deepEqual(fields.map(f => [f.name, f.type.kind]), expected);
    for (const field of fields)
    {
      assert.equal(field.edit.read, true);
      assert.equal(field.edit.persist, true);
      assert.equal(!!field.edit.write, field.name !== "states");
      assert.notEqual(field.edit.notify, true);
    }
  }
  const value = new DictReader({ declarations: true }).CreateObject({
    _type: "TriRigidOrientation", name: "authored", I: 2, drag: 3, start: 123,
    states: [{ _type: "TriTorque", _id: "shared", time: 2, torque: [1, 2, 3] }, { _ref: "shared" }]
  });
  assert.equal(value.states[0], value.states[1]);
  value._currentKey = 1;
  const copy = new Copier().CloneTo(value);
  assert.equal(copy.states[0], copy.states[1]);
  assert.notEqual(copy.states[0], value.states[0]);
  assert.notEqual(copy.states[0].torque, value.states[0].torque);
  assert.deepEqual(Array.from(copy.states[0].torque), [1, 2, 3]);
  assert.equal(copy._currentKey, 0);
  assert.deepEqual([copy.name, copy.I, copy.drag, copy.start], ["authored", 2, 3, 123]);
});

test("actual curve-set sampling follows required calls and native noncommuting exponential order", () =>
{
  const curve = new TriRigidOrientation(), key = new TriTorque();
  const half = Math.SQRT1_2;
  key.rot0.set([half, 0, 0, half]);
  key.omega0[1] = 1;
  curve.states.push(key);
  curve.start = 100000; // Native double overload uses relative seconds without subtracting start.
  const calls = [];
  for (const name of ["UpdateValue", "Update", "GetValueAt"])
  {
    const original = curve[name];
    curve[name] = function(...args) { calls.push(name); return original.apply(this, args); };
  }
  const set = new TriCurveSet();
  set.curves.push(curve);
  set.ApplyTime(1);
  assert.deepEqual(calls, ["UpdateValue", "Update", "GetValueAt"]);
  const angle = 2 * (1 - Math.exp(-1)); // Native pure-quaternion Exp doubles the integrated angle.
  const probe = vec3.transformQuat(vec3.create(), [0, 1, 0], curve.value);
  for (const [actual, expected] of Array.from(probe).map((v, i) => [v, [Math.sin(angle), 0, Math.cos(angle)][i]]))
    assert.ok(Math.abs(actual - expected) < 1e-6);
  curve.GetValueAt = null;
  assert.throws(() => set.ApplyTime(2), TypeError);
});

test("empty and before-key sampling preserve outputs while zero drag keeps native nonfinite behavior", () =>
{
  const curve = new TriRigidOrientation();
  const out = new Float32Array(4), velocity = new Float32Array(3);
  assert.equal(curve.Seek(0), -1);
  assert.equal(curve.GetValueAt(out, 0), out);
  assert.deepEqual(Array.from(out), [0, 0, 0, 1]);
  const key = new TriTorque();
  key.time = 5;
  curve.states.push(key);
  curve.GetValueDotAt(velocity, 4);
  assert.deepEqual(Array.from(velocity), [0, 0, 0]);
  curve.drag = 0;
  curve.GetValueDotAt(velocity, 6);
  assert.ok(Array.from(velocity).every(Number.isNaN));
});
