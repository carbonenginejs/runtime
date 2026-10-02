import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, DictReader, DictWriter, Copier, BlueList, ITriFunction, ITriScalarFunction, ITriCurveLength, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { TriPerlinCurve } from "../../npm/dist/trinity/curves/curve/TriPerlinCurve.js";
import { Tr2DistanceTracker } from "../../npm/dist/trinity/curves/curve/Tr2DistanceTracker.js";
import { Tr2BoneMatrixCurve } from "../../npm/dist/trinity/curves/curve/Tr2BoneMatrixCurve.js";
import { EveSpaceObject2 } from "../../npm/dist/trinity/eve/spaceObject/EveSpaceObject2.js";

for (const [Type, values, query] of [
  [TriPerlinCurve, { name: "船", N: 4, offset: 2 }, [TriPerlinCurve, ITriFunction, ITriScalarFunction]],
  [Tr2DistanceTracker, { name: "距離", signedDistance: false }, [ITriFunction, INotify]],
  [Tr2BoneMatrixCurve, { name: "bone", length: 2 }, [Tr2BoneMatrixCurve, ITriFunction, IInitialize, ITriCurveLength]]
]) test(`${Type.name} uses Blue declarations and exact native interfaces without model services`, () =>
{
  const instance = new Type();
  assert.equal("GetValues" in instance, false);
  assert.equal(Type.from, undefined);
  for (const key of ["SetValues", "GetValues", "UpdateValues", "Dispose"])
    assert.equal(instance[key], undefined);
  assert.deepEqual([...mappedInterfaces(Type)], query);
  const created = new DictReader({ declarations: true }).CreateObject({ _type: Type.name, ...values });
  const clone = new Copier().CloneTo(created);
  assert.ok(clone instanceof Type);
  const written = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
  for (const [key, value] of Object.entries(values)) assert.equal(written[key], value);
  const list = new BlueList(ITriFunction, { className: null, listOps: 0 });
  assert.equal(list.Append(clone), true);
  assert.equal(list.GetAt(0), clone);
});

test("Perlin canonical N roundtrips through n storage while phase and cache remain private", () =>
{
  assert.deepEqual(CjsSchema.getSchema(TriPerlinCurve).members.map(field => field.name),
    ["name", "value", "offset", "scale", "alpha", "speed", "beta", "N"]);
  const curve = new DictReader({ declarations: true }).CreateObject({ _type: "TriPerlinCurve", N: 5 });
  assert.equal(curve.n, 5);
  curve.value = 123;
  assert.equal(curve.Update(-1), 123);
  curve.Update(2);
  curve.value = 456;
  assert.equal(curve.Update(2), 456);
  assert.notEqual(curve.Update(3), 456);
  const clone = new Copier().CloneTo(curve);
  assert.equal(clone.n, 5);
  assert.equal(clone._lastUpdated, -1);
  const written = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
  assert.equal(written.N, 5);
  for (const key of ["n", "_startOffset", "_lastUpdated"]) assert.equal(Object.hasOwn(written, key), false);
  const speed = curve.speed;
  curve.ScaleTime(7);
  assert.equal(curve.scale, 7);
  assert.equal(curve.speed, speed);
});

test("Distance native notification uses frame seconds and required vector calls", t =>
{
  const curve = new Tr2DistanceTracker(), calls = [];
  t.mock.method(blue.os, "GetCurrentFrameTime", () => 30000000);
  curve.sourceObject = { GetValueAt(time, out) { calls.push(time); out.set([1, 0, 0]); } };
  curve.targetObject = { GetValueAt(time, out) { calls.push(time); out.set([4, 0, 0]); } };
  curve.direction.set([2, 0, 0]);
  assert.equal(curve.OnModified("sourceObject"), true);
  assert.deepEqual(calls, [3, 3]);
  assert.equal(curve.value, 6, "native does not normalize direction");
  curve.distanceToClosest = false;
  curve.UpdateValue(4);
  assert.equal(curve.value, 3);
  curve.sourceObject = {};
  assert.throws(() => curve.UpdateValue(5), TypeError);
  curve.sourceObject = curve.targetObject = null;
  curve.direction.set([-1, 0, 0]);
  curve.UpdateValue(6);
  assert.equal(curve.value, -3);
  const output = new DictWriter().WriteObject(curve, {}, { persistOnly: true });
  assert.equal(Object.hasOwn(output, "value"), false);
  assert.equal(CjsSchema.getField(Tr2DistanceTracker, "name").type.kind, "wstring");
});

test("Bone native time gates precede the preserved skinned-object adapter", () =>
{
  const curve = new Tr2BoneMatrixCurve(), out = mat4.create(), bone = mat4.create();
  let samples = 0;
  bone[12] = 4;
  curve.startValue[12] = 1;
  curve.endValue[12] = 2;
  curve.bone = "joint";
  assert.equal(curve.GetBone(), "joint");
  curve.skinnedObject = { GetBoneTransform(name) { assert.equal(name, "joint"); samples++; return bone; } };
  for (const time of [0, -1, -Infinity, NaN])
  {
    curve.GetValueAt(time, out);
    assert.equal(out[12], 1);
  }
  assert.equal(samples, 0);
  curve.UpdateValue(0);
  assert.equal(curve.currentValue[12], 1);
  for (const time of [0.5, 1, 2, Infinity])
  {
    curve.GetValueAt(time, out);
    assert.equal(out[12], 4);
  }
  curve.cycle = false;
  curve.GetValueAt(Infinity, out);
  assert.equal(out[12], 2);
  curve.reversed = true;
  curve.GetValueAt(2, out);
  assert.equal(out[12], 1);
  curve.length = 0;
  curve.GetValueAt(0.5, out);
  assert.equal(out[12], 1);
  assert.equal(samples, 4);
  const written = new DictWriter().WriteObject(curve, {}, { persistOnly: true });
  for (const key of ["bone", "currentValue", "skinnedObject"]) assert.equal(Object.hasOwn(written, key), false);
});

test("child damage overlay clones plain Perlin authored values through Blue Copier", () =>
{
  const parent = new EveSpaceObject2(), source = new TriPerlinCurve();
  source.n = 7;
  source.name = "flicker";
  source.offset = 2;
  source.Update(2);
  let created = false, clone = null;
  const overlay = {
    SetArmorDamageShaderEffect() {}, SetHullDamageFlickerCurve(value) { clone = value; },
    SetSeed() {}, SetDamageLocatorCount() {}, SetEnabledDamageLocators() {}, SetImpactIndexSource() {}
  };
  parent.impactOverlay = { GetDamageOverlay: () => ({ GetHullDamageFlickerCurve: () => source, GetSeed: () => 0 }) };
  const owner = {
    GetPartDamageOverlay: () => created ? overlay : null,
    CreatePartDamageOverlay() { created = true; }, GetPartArmorDamageShaderEffect: () => null
  };
  assert.equal(parent._EnsureChildDamageOverlay({ owner, partTag: 1, count: 0, start: 0 }), overlay);
  assert.ok(clone instanceof TriPerlinCurve);
  assert.notEqual(clone, source);
  assert.equal(clone.n, 7);
  assert.equal(clone.name, "flicker");
  assert.equal(clone.offset, 2);
  assert.equal(clone._lastUpdated, -1);
});
