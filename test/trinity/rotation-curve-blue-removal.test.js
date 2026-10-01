import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, ITriQuaternionFunction, ITriFunction, ITriCurveLength, IInitialize } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { EnumerateChildren } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2CurveEulerRotation } from "../../npm/dist/trinity/curves/curve/Tr2CurveEulerRotation.js";
import { Tr2CurveRandomAxisRotation } from "../../npm/dist/trinity/curves/curve/Tr2CurveRandomAxisRotation.js";
import { Tr2CurveScalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalar.js";
import { Tr2RotationAdapter } from "../../npm/dist/trinity/curves/curve/Tr2RotationAdapter.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";

const close = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-6, `component ${i}: ${actual[i]} != ${expected[i]}`);
};

test("both rotation curves construct through Blue without model conveniences", () =>
{
  for (const Class of [Tr2CurveEulerRotation, Tr2CurveRandomAxisRotation])
  {
    const curve = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    assert.equal(curve.constructor, Class);
    assert.equal(Object.getPrototypeOf(Class.prototype), ITriQuaternionFunction.prototype);
    for (const name of ["SetValues", "UpdateValues", "GetValues", "OnEvent", "Clone", "__state"]) assert.equal(name in curve, false, name);
    assert.equal("from" in Class, false);
    assert.equal(curve.Reset, ITriFunction.prototype.Reset);
    assert.equal(curve.Reset(), undefined);
  }
});

test("query tables follow native exposure, including RandomAxis's omitted IInitialize", () =>
{
  const tables = [
    [Tr2CurveEulerRotation, [Tr2CurveEulerRotation, ITriQuaternionFunction, ITriFunction, ITriCurveLength]],
    [Tr2CurveRandomAxisRotation, [Tr2CurveRandomAxisRotation, ITriFunction, ITriQuaternionFunction]],
  ];
  for (const [Class, table] of tables)
  {
    assert.deepEqual([...mappedInterfaces(Class)], table);
    const curve = new Class();
    for (const Interface of table) assert.equal(CjsSchema.cast(curve, Interface), curve);
    assert.equal(CjsSchema.cast(curve, IInitialize), Class === Tr2CurveRandomAxisRotation ? curve : null,
      "nominal C++ base casts remain distinct from the Blue query table");
  }
  assert.equal(typeof new Tr2CurveRandomAxisRotation().Initialize, "function");
  assert.equal(CjsSchema.cast(new Tr2CurveRandomAxisRotation(), ITriCurveLength), null);
});

test("native declarations keep seed persistence separate from the live property", () =>
{
  const euler = CjsSchema.getSchema(Tr2CurveEulerRotation);
  assert.deepEqual(euler.members.map(field => field.name), ["name", "yaw", "pitch", "roll", "currentValue"]);
  for (const name of ["yaw", "pitch", "roll"])
  {
    const field = euler.members.find(field => field.name === name);
    assert.deepEqual(field.edit, { read: true, persist: true });
    assert.equal(field.type.className, "Tr2CurveScalar");
  }
  const random = CjsSchema.getSchema(Tr2CurveRandomAxisRotation);
  assert.deepEqual(random.members.map(field => field.name), ["name", "period", "seed", "currentValue"]);
  const stored = random.members.find(field => field.name === "seed");
  const live = random.properties.find(field => field.name === "seed");
  assert.equal(stored.key, "_seed");
  assert.equal(stored.type.kind, "uint32");
  assert.deepEqual(stored.edit, { hidden: true, persist: true, persistOnly: true });
  assert.equal(live.key, "seed");
  assert.deepEqual(live.edit, { read: true, write: true });
  assert.deepEqual(random.members.find(field => field.name === "currentValue").edit, { read: true });
});

test("random constructor seeds rotations and initializes its cached value", t =>
{
  t.mock.method(Math, "random", () => 0.125);
  const curve = new Tr2CurveRandomAxisRotation();
  assert.notDeepEqual(Array.from(curve.preRotation), [0, 0, 0, 1]);
  const expected = new Float32Array(4);
  curve.GetValue(0, expected);
  close(curve.currentValue, expected);
});

test("live seed writes always reseed while explicit Initialize retains its nonzero gate", () =>
{
  const curve = new Tr2CurveRandomAxisRotation();
  assert.equal(curve.SetSeed(123), undefined);
  const expected = Array.from(curve.preRotation);
  curve.preRotation.fill(0);
  assert.equal(curve.SetSeed(123), undefined);
  close(curve.preRotation, expected);
  curve.preRotation.fill(0);
  curve.seed = 123;
  close(curve.preRotation, expected);
  curve.SetSeed(-1);
  assert.equal(curve.GetSeed(), 0xffffffff);
  new DictReader({ declarations: true }).ReadInto(curve, { seed: 0 });
  curve.preRotation.fill(0);
  assert.equal(curve.Initialize(), true);
  assert.deepEqual(Array.from(curve.preRotation), [0, 0, 0, 0]);
  new DictReader({ declarations: true }).ReadInto(curve, { seed: 123 });
  assert.equal(curve.Initialize(), true);
  close(curve.preRotation, expected);
});

test("declared seed reads bypass live setters and do not infer initialization from a method", t =>
{
  t.mock.method(Math, "random", () => 0.125);
  const constructorState = new Tr2CurveRandomAxisRotation();
  const reader = new DictReader({ declarations: true });
  const created = reader.CreateObject({ _type: "Tr2CurveRandomAxisRotation", seed: 123 });
  assert.equal(created.GetSeed(), 123);
  assert.deepEqual(created.preRotation, constructorState.preRotation);
  assert.deepEqual(created.postRotation, constructorState.postRotation);
  assert.deepEqual(created.currentValue, constructorState.currentValue);
  const curve = new Tr2CurveRandomAxisRotation();
  curve.preRotation.set([1, 2, 3, 4]);
  curve.currentValue.set([5, 6, 7, 8]);
  reader.ReadInto(curve, { seed: 123, period: 4, name: "stored" });
  assert.equal(curve.GetSeed(), 123);
  assert.equal(curve.period, 4);
  assert.equal(curve.name, "stored");
  assert.deepEqual(Array.from(curve.preRotation), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(curve.currentValue), [5, 6, 7, 8]);
});

test("Copier preserves destination runtime rotations while copying persisted seed storage", () =>
{
  const source = new Tr2CurveRandomAxisRotation(), dest = new Tr2CurveRandomAxisRotation();
  source.SetSeed(123); source.period = 7;
  dest.preRotation.set([1, 2, 3, 4]); dest.currentValue.set([5, 6, 7, 8]);
  assert.equal(new Copier().CopyTo(source, dest), dest);
  assert.equal(dest.seed, 123);
  assert.equal(dest.period, 7);
  assert.deepEqual(Array.from(dest.preRotation), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(dest.currentValue), [5, 6, 7, 8]);
});

test("Euler graph creation, cloning and traversal retain real scalar component ownership", () =>
{
  const curve = new DictReader({ declarations: true }).CreateObject({
    _type: "Tr2CurveEulerRotation", yaw: { _type: "Tr2CurveScalar", name: "yaw", timeScale: 2 },
  });
  assert.equal(curve.yaw.constructor, Tr2CurveScalar);
  assert.equal(curve.yaw.name, "yaw");
  curve.yaw.AddKey(0, 0, 1); curve.yaw.AddKey(2, 2, 1);
  const copy = new Copier().CloneTo(curve);
  assert.equal(copy.constructor, Tr2CurveEulerRotation);
  assert.notEqual(copy.yaw, curve.yaw);
  assert.notEqual(copy.yaw.keys, curve.yaw.keys);
  assert.equal(copy.yaw.GetValue(2), curve.yaw.GetValue(2));
  const children = [];
  EnumerateChildren(curve, child => children.push(child));
  assert.deepEqual(children, [curve.yaw, curve.pitch, curve.roll]);
  for (const value of [curve, new Tr2CurveRandomAxisRotation()])
  {
    const resources = [{}];
    assert.equal(GetResources(value, resources), resources);
    assert.deepEqual(resources, []);
  }
});

test("real curve-set and rotation-adapter owners retain update and duration contracts", () =>
{
  const euler = new Tr2CurveEulerRotation();
  euler.AddKey(0, [0, 0, 0], 1); euler.AddKey(2, [0, Math.PI, 0], 1);
  const random = new Tr2CurveRandomAxisRotation();
  random.preRotation.set([0, 0, 0, 1]); random.postRotation.set([0, 0, 0, 1]); random.period = 4;
  const set = new TriCurveSet();
  set.curves.push(euler, random);
  assert.equal(set.GetMaxCurveDuration(), 2);
  set.Play();
  set.Update(0); set.Update(1);
  close(euler.currentValue, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
  close(random.currentValue, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
  assert.ok(Math.abs(euler.pitch.currentValue - Math.PI / 2) < 1e-6);
  for (const curve of [euler, random])
  {
    const adapter = new Tr2RotationAdapter(); adapter.curve = curve;
    const out = new Float32Array(4);
    assert.equal(adapter.GetValueAt(1, out), out);
    close(out, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
    adapter.UpdateValue(1);
    close(adapter.currentValue, out);
  }
});

test("Euler sampling leaves component caches alone and native derivative no-ops preserve outputs", () =>
{
  const curve = new Tr2CurveEulerRotation();
  curve.AddKey(0, [0, 0, 0], 1); curve.AddKey(2, [0, Math.PI, 0], 1);
  curve.UpdateValue(0);
  const out = new Float32Array(4);
  curve.Update(1, out);
  close(out, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
  assert.equal(curve.pitch.currentValue, 0);
  for (const value of [curve, new Tr2CurveRandomAxisRotation()])
  {
    out.set([1, 2, 3, 4]);
    assert.equal(value.GetValueDotAt(2, out), out);
    assert.equal(value.GetValueDoubleDotAt(2, out), out);
    assert.deepEqual(Array.from(out), [1, 2, 3, 4]);
  }
});
