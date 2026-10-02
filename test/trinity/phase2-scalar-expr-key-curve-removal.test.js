import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { BlueList, DictReader, DictWriter, Copier, ITriFunction, ITriCurveLength, IInitialize } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Tr2ScalarExprKeyCurve } from "../../npm/dist/trinity/curves/curve/Tr2ScalarExprKeyCurve.js";
import { Tr2ScalarExprKey } from "../../npm/dist/trinity/curves/key/Tr2ScalarExprKey.js";
import { Tr2CurveInterpolation } from "../../npm/dist/trinity/curves/enums.js";

function Info(list) { const info = {}; list.GetInfo(info); return info; }

test("Scalar expression key curve declares its exact native interfaces and stored/live members", () =>
{
  const curve = new Tr2ScalarExprKeyCurve();
  assert.equal("GetValues" in curve, false);
  assert.equal(Tr2ScalarExprKeyCurve.from, undefined);
  for (const key of ["SetValues", "GetValues", "UpdateValues", "Dispose"])
    assert.equal(curve[key], undefined);
  assert.deepEqual([...mappedInterfaces(Tr2ScalarExprKeyCurve)], [ITriFunction, IInitialize, ITriCurveLength]);
  assert.deepEqual(CjsSchema.getSchema(Tr2ScalarExprKeyCurve).members.map(field => field.name),
    ["name", "cycle", "reversed", "timeOffset", "timeScale", "currentValue", "interpolation", "keys"]);
  assert.equal(curve.length, 0);
  assert.equal(Object.getOwnPropertyDescriptor(Tr2ScalarExprKeyCurve.prototype, "length").set, undefined);
  const list = new BlueList(ITriFunction, { className: null, listOps: 0 });
  assert.equal(list.Append(curve), true);
});

test("curve owns typed READ key storage and key edits preserve admission and order", () =>
{
  const curve = new Tr2ScalarExprKeyCurve(), keys = curve.keys;
  assert.equal(Object.getPrototypeOf(keys), BlueList.prototype);
  assert.deepEqual(Info(keys), { iid: Tr2ScalarExprKey, clsid: "Tr2ScalarExprKey", listOps: 0, notify: null });
  assert.equal(keys.Append({ time: 0, value: 1 }), false);
  assert.equal(keys.Append(null), false);
  assert.equal(curve.AddKey(2, 4), 0);
  assert.equal(curve.AddKey(1, 2), 0);
  assert.equal(curve.AddKey(1, 3), 1);
  assert.deepEqual(Array.from(keys, key => key.value), [2, 3, 4]);
  curve.RemoveKey(99);
  curve.RemoveKey(-1);
  assert.equal(keys.length, 3);
  curve.RemoveKey(1);
  assert.deepEqual(Array.from(keys, key => key.value), [2, 4]);
  assert.equal(curve.keys, keys);
});

test("declared hydration resolves ref-first keys and copy retains configured destination storage", () =>
{
  const curve = new DictReader({ declarations: true }).CreateObject({
    _type: "Tr2ScalarExprKeyCurve", name: "authored", keys: [
      { _ref: "shared" }, { _type: "Tr2ScalarExprKey", _id: "shared", time: 2, value: 7 }
    ]
  });
  assert.equal(curve.keys[0], curve.keys[1]);
  assert.ok(curve.keys[0] instanceof Tr2ScalarExprKey);
  assert.equal("GetValues" in curve.keys[0], false);
  const destination = new Tr2ScalarExprKeyCurve(), storage = destination.keys;
  assert.equal(new Copier().CopyTo(curve, destination), destination);
  assert.equal(destination.keys, storage);
  assert.equal(destination.keys[0], destination.keys[1]);
  assert.notEqual(destination.keys[0], curve.keys[0]);
  assert.deepEqual(Info(destination.keys), Info(curve.keys));
  const written = new DictWriter().WriteObject(destination, {}, { persistOnly: true });
  assert.equal(written.name, "authored");
  assert.equal(Object.hasOwn(written, "length"), false);
  assert.equal(Object.hasOwn(written, "currentValue"), false);
  const keyList = curve.keys;
  new DictReader({ declarations: true }).ReadInto(curve, { keys: [] });
  assert.equal(curve.keys, keyList);
  assert.equal(keyList.length, 0);
});

test("key expressions evaluate in list order with previous-key context on every sample", () =>
{
  const curve = new Tr2ScalarExprKeyCurve();
  curve.AddKey(0, 2);
  curve.AddKey(2, 4);
  const [first, second] = curve.keys;
  first.valueExpression = "input1";
  first.input1 = 3;
  second.valueExpression = "prevKeyValue + 4";
  assert.equal(curve.GetValueAt(1), 5);
  assert.equal(second.prevKeyValue, 3);
  first.input1 = 5;
  curve.UpdateValue(1);
  assert.equal(curve.currentValue, 7);
  assert.equal(second.prevKeyValue, 5);
  first.time = 3;
  curve.Sort();
  assert.equal(curve.keys[0], first, "native Sort reevaluates without sorting");
  assert.equal(second.prevKeyTime, 3);
  second.UpdateValues = undefined;
  assert.throws(() => curve.UpdateValue(1), TypeError);
});

test("native sampling retains first-value cycle origin and propagates nonfinite interpolation", () =>
{
  const curve = new Tr2ScalarExprKeyCurve();
  assert.equal(curve.GetValueAt(NaN), 0);
  curve.AddKey(2, 10);
  curve.AddKey(6, 20);
  assert.equal(curve.length, 4);
  assert.equal(curve.GetValueAt(0), 10);
  assert.equal(curve.GetValueAt(Infinity), 20);
  assert.ok(Number.isNaN(curve.GetValueAt(NaN)));
  curve.cycle = true;
  // Native wraps around the first VALUE, not the first key time.
  assert.equal(curve.GetValueAt(7), 20);
  assert.ok(Number.isNaN(curve.GetValueAt(Infinity)));
  curve.cycle = false;
  curve.reversed = true;
  assert.equal(curve.GetValueAt(7), 10);
  curve.timeScale = 0;
  assert.ok(Number.isNaN(curve.GetValueAt(0)));
  curve.interpolation = Tr2CurveInterpolation.CONSTANT;
  curve.SetKeyInterpolation(0, Tr2CurveInterpolation.CONSTANT);
  assert.equal(curve.GetValueAt(NaN), 10);
});
