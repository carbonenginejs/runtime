import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2MatrixKey } from "../../npm/dist/trinity/curves/key/Tr2MatrixKey.js";
import { Tr2ScalarExprKey } from "../../npm/dist/trinity/curves/key/Tr2ScalarExprKey.js";
import { TriEventKey } from "../../npm/dist/trinity/curves/key/TriEventKey.js";
import { Tr2BoneMatrixCurve } from "../../npm/dist/trinity/curves/curve/Tr2BoneMatrixCurve.js";
import { Tr2ScalarExprKeyCurve } from "../../npm/dist/trinity/curves/curve/Tr2ScalarExprKeyCurve.js";
import { TriEventCurve } from "../../npm/dist/trinity/curves/curve/TriEventCurve.js";

test("three key classes construct through Blue without inherited model state", () =>
{
  for (const Class of [Tr2MatrixKey, Tr2ScalarExprKey, TriEventKey])
  {
    const key = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    assert.equal(key.constructor, Class);
    assert.equal(Object.getPrototypeOf(Class.prototype), Class === Tr2ScalarExprKey ? IInitialize.prototype : Object.prototype);
    for (const method of ["SetValues", "GetValues", "Clone", "OnEvent", "__state"]) assert.equal(method in key, false, method);
    assert.equal("from" in Class, false);
    const resources = [{}];
    assert.equal(GetResources(key, resources), resources);
    assert.deepEqual(resources, []);
  }
  assert.equal("ReEvaluate" in new Tr2ScalarExprKey(), false);
  assert.equal(typeof new Tr2ScalarExprKey().UpdateValues, "function", "this is the native previous-key operation");
});

test("record query tables match the three native exposures", () =>
{
  for (const [Class, expected] of [[Tr2MatrixKey, [Tr2MatrixKey]], [TriEventKey, [TriEventKey]], [Tr2ScalarExprKey, [Tr2ScalarExprKey, IInitialize, INotify]]])
  {
    assert.deepEqual([...mappedInterfaces(Class)], expected);
    const key = new Class();
    for (const Interface of expected) assert.equal(CjsSchema.cast(key, Interface), key);
  }
});

test("stored declarations retain native order, flags and event wide-string identity", () =>
{
  const matrix = CjsSchema.getSchema(Tr2MatrixKey);
  assert.deepEqual(matrix.members.map(field => [field.name, field.type.kind]), [["time", "float32"], ["value", "mat4"]]);
  assert.equal(CjsSchema.getField(Tr2MatrixKey, "interpolation"), null);
  const event = CjsSchema.getSchema(TriEventKey);
  assert.deepEqual(event.members.map(field => field.name), ["time", "value", "callable", "callableArgs"]);
  assert.equal(event.members[1].type.kind, "wstring");
  for (const field of event.members.slice(0, 2)) assert.deepEqual(field.edit, {read:true, write:true, persist:true});
  for (const field of event.members.slice(2)) assert.deepEqual(field.edit, {read:true, write:true});
  const expression = CjsSchema.getSchema(Tr2ScalarExprKey);
  assert.equal(expression.members.find(field => field.name === "interpolation").type.kind, "int32");
  assert.deepEqual(expression.members.map(field => field.name), ["time", "value", "left", "right", "timeExpression", "valueExpression", "leftTangentExpression", "rightTangentExpression", "input1", "input2", "input3", "input4", "randomConstant", "randomMin", "randomMax", "prevKeyTime", "prevKeyValue", "interpolation"]);
  for (const field of expression.members.filter(field => !["randomConstant", "prevKeyTime", "prevKeyValue", "interpolation"].includes(field.name)))
    assert.deepEqual(field.edit, {notify:true, read:true, write:true, persist:true});
});

test("matrix read and copy use independent buffers and actual bone-curve keys", () =>
{
  const source = new Tr2MatrixKey(), other = new Tr2MatrixKey();
  assert.notEqual(source.value, other.value);
  const matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 3,4,5,1];
  const storage = source.value;
  new DictReader({declarations:true}).ReadInto(source, {time:2, value:matrix});
  assert.equal(source.value, storage);
  const copy = new Copier().CloneTo(source);
  assert.equal(copy.constructor, Tr2MatrixKey);
  assert.notEqual(copy.value, source.value);
  assert.deepEqual(Array.from(copy.value), matrix);
  const curve = new Tr2BoneMatrixCurve();
  curve.length = 3; // Keep the key inside the authored duration; Sort preserves the end key separately.
  assert.equal(curve.AddKey(2, source.value), 0);
  assert.equal(curve.keys[0].constructor, Tr2MatrixKey);
  const value = curve.GetKeyValue(0);
  assert.deepEqual(Array.from(value), matrix);
  value[12] = 99;
  assert.equal(curve.keys[0].value[12], 3);
});

test("declared expression creation initializes once after storage writes without notifications", t =>
{
  let initializations = 0, notifications = 0;
  const initialize = Tr2ScalarExprKey.prototype.Initialize;
  const notify = Tr2ScalarExprKey.prototype.OnModified;
  t.mock.method(Tr2ScalarExprKey.prototype, "Initialize", function() {initializations++; return initialize.call(this);});
  t.mock.method(Tr2ScalarExprKey.prototype, "OnModified", function(name) {notifications++; return notify.call(this, name);});
  const key = new DictReader({declarations:true}).CreateObject({
    _type:"Tr2ScalarExprKey", value:2, valueExpression:"value + input1", input1:5, randomMin:7, randomMax:7,
  });
  assert.equal(key.randomConstant, 7);
  assert.equal(initializations, 1);
  assert.equal(notifications, 0);
  assert.equal(key.value, 2, "Initialize does not evaluate; per-member notifications must be suppressed");
  assert.equal(key.OnModified("input1"), true);
  assert.equal(key.value, 7);
});

test("Copier initializes expression records after copying without per-member evaluation", () =>
{
  const source = new Tr2ScalarExprKey();
  source.value = 2; source.input1 = 5; source.valueExpression = "value + input1";
  source.randomMin = 9; source.randomMax = 9;
  const copy = new Copier().CloneTo(source);
  assert.equal(copy.value, 2);
  assert.equal(copy.randomConstant, 9);
  assert.equal(copy.UpdateValues(null), undefined);
  assert.equal(copy.value, 7);
  assert.equal(source.value, 2);
});

test("real scalar-expression owner calls restored UpdateValues in predecessor order", () =>
{
  const curve = new Tr2ScalarExprKeyCurve();
  curve.AddKey(0, 2); curve.AddKey(1, 3);
  const [first, second] = curve.keys;
  assert.equal(first.constructor, Tr2ScalarExprKey);
  first.valueExpression = "input1"; first.input1 = 5;
  second.timeExpression = "prevKeyTime + 2";
  second.valueExpression = "prevKeyValue + input2"; second.input2 = 4;
  curve.Sort();
  assert.deepEqual([first.value, second.time, second.value, second.prevKeyTime, second.prevKeyValue], [5,2,9,0,5]);
  assert.equal(curve.GetValueAt(1), 7);
});

test("event read and Copier separate wide event text from runtime callables", () =>
{
  const source = new DictReader({declarations:true}).CreateObject({_type:"TriEventKey",time:1,value:"発射🚀"});
  const dest = new TriEventKey(), callable = () => {}, args = [1];
  source.callable = () => {}; source.callableArgs = [2];
  dest.callable = callable; dest.callableArgs = args;
  assert.equal(new Copier().CopyTo(source, dest), dest);
  assert.equal(dest.value, "発射🚀"); assert.equal(dest.time, 1);
  assert.equal(dest.callable, callable); assert.equal(dest.callableArgs, args);
  const clone = new Copier().CloneTo(source);
  assert.equal(clone.value, "発射🚀");
  assert.equal(clone.callable, null); assert.equal(clone.callableArgs, null);
});

test("actual event owner delivers named events and queues callable record arguments", t =>
{
  TriEventCurve.clearPostUpdateCallbacks();
  t.after(() => TriEventCurve.clearPostUpdateCallbacks());
  const curve = new TriEventCurve(), events = [], calls = [];
  curve.eventListener = {HandleEvent(value) {events.push(value);}};
  curve.AddKey(1, "発射🚀");
  curve.AddCallableKey(2, value => calls.push(value), ["impact"]);
  assert.equal(curve.keys[0].constructor, TriEventKey);
  assert.equal(curve.keys[1].constructor, TriEventKey);
  curve.UpdateValue(2);
  assert.deepEqual(events, ["発射🚀"]);
  assert.deepEqual(calls, []);
  assert.equal(TriEventCurve.getPostUpdateCallbackCount(), 1);
  assert.equal(TriEventCurve.runNextPostUpdateCallback(), true);
  assert.deepEqual(calls, ["impact"]);
});
