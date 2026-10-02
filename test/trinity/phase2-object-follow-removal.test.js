import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { BlueList, DictReader, DictWriter, Copier, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { IWorldPosition } from "../../npm/dist/trinity/core/IWorldPosition.js";
import { ITr2FollowCurveKey } from "../../npm/dist/trinity/curves/ITr2FollowCurveKey.js";
import { Tr2ObjectFollowCurveKey } from "../../npm/dist/trinity/curves/key/Tr2ObjectFollowCurveKey.js";
import { EveSpaceObject2 } from "../../npm/dist/trinity/eve/spaceObject/EveSpaceObject2.js";
import { EveLocatorSets } from "../../npm/dist/trinity/eve/locator/EveLocatorSets.js";
import { Locator } from "../../npm/dist/trinity/eve/locator/Locator.js";
import { EveTransform } from "../../npm/dist/trinity/eve/spaceObject/EveTransform.js";
import { EveRootTransform } from "../../npm/dist/trinity/eve/spaceObject/EveRootTransform.js";
import { Tr2FollowCurve } from "../../npm/dist/trinity/curves/curve/Tr2FollowCurve.js";
import { ITr2ShLightingReceiver } from "../../npm/dist/trinity/core/lighting/ITr2ShLightingReceiver.js";
import { ITr2SecondaryLightSource } from "../../npm/dist/trinity/core/lighting/ITr2SecondaryLightSource.js";

function Near(actual, expected)
{
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-5, `${actual} != ${expected}`);
}

test("Follow samples real object keys through its native typed list", () =>
{
  const curve = new Tr2FollowCurve(), owner = new EveTransform();
  owner.worldTransform[12] = 10;
  const first = new Tr2ObjectFollowCurveKey(), last = new Tr2ObjectFollowCurveKey();
  first.object = owner; first.time = 0; first.offset.set([1, 0, 0]);
  last.object = owner; last.time = 2; last.offset.set([5, 0, 0]);
  assert.equal(curve.keys.Append(last), true);
  assert.equal(curve.keys.Append(first), true);
  assert.equal(curve.keys.GetAt(0), first);
  curve.UpdateValue(1);
  Near(curve.currentValue, [13, 0, 0]);
});

test("ObjectFollow exposes only native contracts and separates authored from runtime members", () =>
{
  const key = new Tr2ObjectFollowCurveKey();
  assert.equal(Object.getPrototypeOf(Tr2ObjectFollowCurveKey.prototype), ITr2FollowCurveKey.prototype);
  assert.equal(CjsSchema.cast(key, CjsModel), null);
  assert.deepEqual([...mappedInterfaces(Tr2ObjectFollowCurveKey)], [ITr2FollowCurveKey, INotify, IInitialize]);
  assert.equal(mappedInterfaces(Tr2ObjectFollowCurveKey).has(Tr2ObjectFollowCurveKey), false);
  assert.equal(Tr2ObjectFollowCurveKey.from, undefined);
  for (const name of ["SetValues", "GetValues", "UpdateValues", "Dispose"]) assert.equal(key[name], undefined);
  const fields = CjsSchema.getSchema(Tr2ObjectFollowCurveKey).members;
  assert.deepEqual(fields.map(field => field.name), ["name", "object", "time", "interpolation", "leftTangent", "rightTangent", "rotatedLeftTangent", "rotatedRightTangent", "offsetLocatorName", "offset", "rotationSetting"]);
  for (const name of ["object", "offsetLocatorName"]) assert.equal(fields.find(field => field.name === name).edit.notify, true);
  assert.notEqual(fields.find(field => field.name === "object").edit.persist, true);
  for (const name of ["rotatedLeftTangent", "rotatedRightTangent"])
  {
    const field = fields.find(field => field.name === name);
    assert.equal(field.edit.read, true);
    assert.notEqual(field.edit.write, true);
    assert.notEqual(field.edit.persist, true);
  }
  const keys = new BlueList(ITr2FollowCurveKey, { className: null, listOps: 0 });
  assert.equal(keys.Append(key), true);
  assert.equal(keys.Append({ GetValue() {} }), false);
  const created = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2ObjectFollowCurveKey", name: "follow", time: 2, offset: [1, 2, 3] });
  assert.equal(created.object, null);
  const copy = new Copier().CloneTo(created);
  assert.equal(copy.object, null);
  assert.notEqual(copy.offset, created.offset);
  Near(copy.offset, [1, 2, 3]);
  const written = new DictWriter().WriteObject(copy, {}, { persistOnly: true });
  assert.equal(written.name, "follow");
  assert.equal(written.time, 2);
  for (const name of ["object", "rotatedLeftTangent", "rotatedRightTangent", "_locator"]) assert.equal(Object.hasOwn(written, name), false);
});

test("real world-position owners map the contract while RootTransform bypasses EveTransform exposure", () =>
{
  assert.deepEqual([...mappedInterfaces(EveSpaceObject2)], [EveSpaceObject2, IInitialize, IWorldPosition, ITr2ShLightingReceiver, INotify, ITr2SecondaryLightSource]);
  for (const Type of [EveSpaceObject2, EveTransform, EveRootTransform])
  {
    assert.equal(mappedInterfaces(Type).has(IWorldPosition), true);
    const owner = new Type(), key = new Tr2ObjectFollowCurveKey(), out = vec3.create();
    if (Type === EveSpaceObject2)
    {
      owner.worldPosition.set([10, 20, 30]);
      owner.worldRotation.set([0, 0, 2, 2]);
    }
    else
    {
      owner.worldTransform[12] = 10; owner.worldTransform[13] = 20; owner.worldTransform[14] = 30;
      owner.rotation.set([0, 0, 2, 2]);
    }
    key.object = owner;
    key.offset.set([2, 0, 0]);
    key.leftTangent.set([1, 0, 0]);
    key.rotationSetting = Tr2ObjectFollowCurveKey.RotationSetting.MODEL_ROTATION;
    assert.equal(key.GetValue(out), out);
    Near(out, [10, 22, 30]);
    Near(key.rotatedLeftTangent, [0, 1, 0]);
  }
  assert.equal(mappedInterfaces(EveTransform).has(EveTransform), true);
  assert.equal(mappedInterfaces(EveRootTransform).has(EveTransform), false);
});

test("locator cache selects the first locator and adds offset before normalized rotation", () =>
{
  const owner = new EveSpaceObject2(), key = new Tr2ObjectFollowCurveKey(), out = vec3.create();
  owner.worldPosition.set([10, 20, 30]);
  const first = new Locator(), second = new Locator(), set = new EveLocatorSets();
  first.position.set([1, 0, 0]); first.direction.set([0, 0, 2, 2]);
  second.position.set([100, 0, 0]); second.direction.set([0, 0, 0, 1]);
  set.name = "socket"; set.locators.push(first, second); owner.locatorSets.push(set);
  let queries = 0;
  const getLocators = owner.GetLocatorsForSet.bind(owner);
  owner.GetLocatorsForSet = name => { assert.equal(name, "socket"); queries++; return getLocators(name); };
  key.object = owner; key.offsetLocatorName = "socket"; key.offset.set([2, 0, 0]);
  key.leftTangent.set([1, 0, 0]); key.rightTangent.set([0, 2, 0]);
  key.rotationSetting = Tr2ObjectFollowCurveKey.RotationSetting.LOCATOR_ROTATION;
  key.Initialize();
  key.GetValue(out);
  Near(out, [10, 23, 30]); Near(key.rotatedLeftTangent, [0, 1, 0]); Near(key.rotatedRightTangent, [-2, 0, 0]);
  assert.equal(queries, 1);
  set.locators.splice(0, 1);
  owner.InvalidateMergedLocators();
  key.OnModified("offset"); key.OnModified(null);
  key.GetValue(out); Near(out, [10, 23, 30]); assert.equal(queries, 1);
  key.OnModified("offsetLocatorName"); key.GetValue(out); Near(out, [112, 20, 30]); assert.equal(queries, 2);
  key.OnModified("object"); assert.equal(queries, 3);
  const staleLeft = Array.from(key.rotatedLeftTangent), staleRight = Array.from(key.rotatedRightTangent);
  key.object = null; key.OnModified("object");
  key.GetValue(out); Near(out, [2, 0, 0]);
  assert.deepEqual(Array.from(key.rotatedLeftTangent), staleLeft);
  assert.deepEqual(Array.from(key.rotatedRightTangent), staleRight);
});

test("structural impostors are ignored and mapped required world or locator methods fail visibly", () =>
{
  const key = new Tr2ObjectFollowCurveKey(), out = vec3.create();
  key.offset.set([2, 3, 4]); key.offsetLocatorName = "socket";
  key.rotationSetting = Tr2ObjectFollowCurveKey.RotationSetting.MODEL_ROTATION;
  key.object = { GetWorldPosition() { throw new Error("impostor"); }, GetWorldRotation() { throw new Error("impostor"); }, GetLocatorsForSet() { throw new Error("impostor"); } };
  key.Initialize(); key.GetValue(out); Near(out, [2, 3, 4]);
  const owner = new EveTransform(); key.object = owner;
  owner.GetWorldRotation = undefined;
  assert.throws(() => key.GetValue(out), TypeError);
  key.rotationSetting = Tr2ObjectFollowCurveKey.RotationSetting.NO_ROTATION;
  owner.GetWorldPosition = undefined;
  assert.throws(() => key.GetValue(out), TypeError);
  key.object = new EveSpaceObject2(); key.object.GetLocatorsForSet = undefined;
  assert.throws(() => key.Initialize(), TypeError);
});
