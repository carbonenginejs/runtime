import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { BlueList, DictReader, DictWriter, Copier, ITriFunction, ITriVectorFunction, IListNotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { ITr2FollowCurveKey } from "../../npm/dist/trinity/curves/ITr2FollowCurveKey.js";
import { Tr2FollowCurve } from "../../npm/dist/trinity/curves/curve/Tr2FollowCurve.js";
import { Tr2CameraFollowCurveKey } from "../../npm/dist/trinity/curves/key/Tr2CameraFollowCurveKey.js";
import { Tr2FollowCurveKeyInterpolation } from "../../npm/dist/trinity/curves/enums.js";

function Info(list) { const info = {}; list.GetInfo(info); return info; }
function Key(time, x = 0)
{
  const key = new Tr2CameraFollowCurveKey();
  key.time = time;
  key.interpolation = Tr2FollowCurveKeyInterpolation.LINEAR;
  // Isolate curve dispatch; the existing camera owner test verifies real framing.
  key.GetValue = out => { out.set([x, 0, 0]); return out; };
  return key;
}

test("Follow uses exact vector query exposure and nominal list observer without model services", () =>
{
  const curve = new Tr2FollowCurve();
  assert.equal("GetValues" in curve, false);
  assert.equal(CjsSchema.cast(curve, IListNotify), curve);
  assert.deepEqual([...mappedInterfaces(Tr2FollowCurve)], [ITriVectorFunction, ITriFunction]);
  assert.equal(Tr2FollowCurve.from, undefined);
  for (const method of ["SetValues", "GetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(curve[method], undefined);
  assert.deepEqual(CjsSchema.getSchema(Tr2FollowCurve).members.map(field => field.name), ["name", "keys", "currentValue"]);
  assert.equal(Object.getPrototypeOf(curve.keys), BlueList.prototype);
  assert.deepEqual(Info(curve.keys), { iid: ITr2FollowCurveKey, clsid: null, listOps: 0, notify: curve });
  assert.notEqual(new Tr2FollowCurve().keys, curve.keys);
  assert.equal(curve.keys.Append({ GetTime: () => 0 }), false);
  assert.equal(curve.keys.Append(null), false);
});

test("owned list insert/remove sorts stably and unrelated native events preserve order", () =>
{
  const curve = new Tr2FollowCurve(), keys = curve.keys;
  const late = Key(3), early = Key(1), equal = Key(1);
  assert.equal(keys.Append(late), true);
  assert.equal(keys.Append(early), true);
  assert.equal(keys.Append(equal), true);
  assert.deepEqual(Array.from(keys), [early, equal, late]);
  const { BELIST_INSERTED, BELIST_REMOVED, BELIST_LOADFINISHED, BELIST_SWAPPED, BELIST_MOVED, BELIST_LOADING } = BLUELISTEVENT;
  early.time = 5;
  for (const event of [BELIST_LOADFINISHED, BELIST_SWAPPED, BELIST_MOVED])
    curve.OnListModified(event, 0, 0, null, keys);
  curve.OnListModified(BELIST_INSERTED, 0, 0, null, new Tr2FollowCurve().keys);
  assert.deepEqual(Array.from(keys), [early, equal, late]);
  curve.OnListModified(BELIST_INSERTED | BELIST_LOADING, 0, 0, null, keys);
  assert.deepEqual(Array.from(keys), [equal, late, early]);
  late.time = 0;
  curve.OnListModified(BELIST_REMOVED, 0, 0, null, keys);
  assert.deepEqual(Array.from(keys), [late, equal, early]);
  assert.equal(curve.keys, keys);
  assert.equal(Info(keys).notify, curve);
});

test("reader and copier preserve owned list observer, shared key aliases and authored order", t =>
{
  // Camera framing is separately verified; observe list population without ambient renderer work.
  t.mock.method(Tr2CameraFollowCurveKey.prototype, "Initialize", () => true);
  const curve = new DictReader({ declarations: true }).CreateObject({
    _type: "Tr2FollowCurve", name: "follow", keys: [
      { _ref: "late" }, { _type: "Tr2CameraFollowCurveKey", _id: "late", time: 3 },
      { _type: "Tr2CameraFollowCurveKey", time: 1 }
    ]
  });
  assert.equal(curve.keys[0], curve.keys[1]);
  assert.deepEqual(Array.from(curve.keys, key => key.time), [3, 3, 1], "LOADFINISHED does not sort");
  assert.equal(Info(curve.keys).notify, curve);
  const copy = new Tr2FollowCurve(), storage = copy.keys;
  assert.equal(new Copier().CopyTo(curve, copy), copy);
  assert.equal(copy.keys, storage);
  assert.equal(Info(copy.keys).notify, copy);
  assert.equal(copy.keys[0], copy.keys[1]);
  assert.notEqual(copy.keys[0], curve.keys[0]);
  assert.deepEqual(Array.from(copy.keys, key => key.time), [3, 3, 1]);
  const written = new DictWriter().WriteObject(copy, {}, { persistOnly: true });
  assert.equal(written.name, "follow");
  assert.equal(Object.hasOwn(written, "currentValue"), false);
  new DictReader({ declarations: true }).ReadInto(copy, { keys: [] });
  assert.equal(copy.keys, storage);
  assert.equal(storage.length, 0);
  assert.equal(Info(storage).notify, copy);
});

test("Follow samples before/exact/between/after keys and keeps required calls visible", () =>
{
  const curve = new Tr2FollowCurve(), out = new Float32Array(3);
  const first = Key(2, 4), last = Key(4, 8);
  curve.keys.Append(last);
  curve.keys.Append(first);
  for (const [time, value] of [[-1, 0], [2, 4], [3, 6], [4, 8], [Infinity, 8], [NaN, 8]])
  {
    assert.equal(curve.GetValueAt(time, out), out);
    assert.equal(out[0], value);
  }
  curve.UpdateValue(3);
  assert.equal(curve.currentValue[0], 6);
  first.GetValue = undefined;
  assert.throws(() => curve.UpdateValue(3), TypeError);
  out.set([9, 8, 7]);
  for (const method of ["GetValueDotAt", "GetValueDoubleDotAt", "InterpolatedPosition"])
  {
    assert.equal(curve[method](1, out), out);
    assert.deepEqual(Array.from(out), [9, 8, 7]);
  }
});
