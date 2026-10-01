import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, INotify, IInitialize } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { ITr2FollowCurveKey } from "../../npm/dist/trinity/curves/index.js";
import { Tr2CameraFollowCurveKey } from "../../npm/dist/trinity/curves/key/Tr2CameraFollowCurveKey.js";
import { Tr2FollowCurve } from "../../npm/dist/trinity/curves/curve/Tr2FollowCurve.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";

function camera(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  t.mock.method(context, "GetProjection", () => identity);
  t.mock.method(context, "GetInverseViewTransform", () => identity);
  t.mock.method(context, "GetFieldOfView", () => Math.PI / 2);
  t.mock.method(context, "GetFrontClip", () => 1);
}

test("camera key constructs without model state and implements the native five-method interface", () =>
{
  const key = blue.classes.CreateInstanceFromName("Tr2CameraFollowCurveKey");
  assert.equal(key.constructor, Tr2CameraFollowCurveKey);
  assert.equal(Object.getPrototypeOf(Tr2CameraFollowCurveKey.prototype), ITr2FollowCurveKey.prototype);
  for (const name of ["SetValues", "GetValues", "Clone", "OnEvent", "__state"]) assert.equal(name in key, false);
  assert.equal("from" in Tr2CameraFollowCurveKey, false);
  for (const name of ["GetValue", "GetTime", "GetInterpolationType", "GetLeftTangent", "GetRightTangent"])
  {
    assert.equal(CjsSchema.getMethod(ITr2FollowCurveKey, name).impl.status, "abstract");
    assert.equal(Object.hasOwn(Tr2CameraFollowCurveKey.prototype, name), true);
  }
  assert.deepEqual(GetResources(key), []);
});

test("camera key maps exactly the native interfaces without concrete self or a parent query chain", () =>
{
  assert.deepEqual([...mappedInterfaces(Tr2CameraFollowCurveKey)], [ITr2FollowCurveKey, INotify, IInitialize]);
  const key = new Tr2CameraFollowCurveKey();
  for (const Interface of [ITr2FollowCurveKey, INotify, IInitialize]) assert.equal(CjsSchema.cast(key, Interface), key);
});

test("camera declarations preserve native exposure order, flags, defaults and independent buffers", () =>
{
  const schema = CjsSchema.getSchema(Tr2CameraFollowCurveKey);
  assert.deepEqual(schema.members.map(field => field.name), ["name", "time", "interpolation", "leftTangent", "rightTangent", "rotatedLeftTangent", "rotatedRightTangent", "objectBounds", "angle", "angleZero", "fovMultiplication", "offset", "boxPosition", "enabled"]);
  const key = new Tr2CameraFollowCurveKey(), other = new Tr2CameraFollowCurveKey();
  for (const field of schema.members)
  {
    const readonly = ["rotatedLeftTangent", "rotatedRightTangent", "boxPosition"].includes(field.name);
    const runtime = readonly || ["objectBounds", "enabled"].includes(field.name);
    const expected = {read:true};
    if (!readonly) expected.write = true;
    if (!runtime) expected.persist = true;
    if (["fovMultiplication", "enabled"].includes(field.name)) expected.notify = true;
    if (field.name === "interpolation") expected.enum = true;
    assert.deepEqual(field.edit, expected, field.name);
    if (field.type.kind === "vec3")
    {
      assert.deepEqual(Array.from(key[field.name]), [0,0,0]);
      assert.notEqual(key[field.name], other[field.name]);
    }
  }
  assert.deepEqual([key.name, key.time, key.interpolation, key.angle, key.angleZero, key.fovMultiplication, key.enabled], ["",0,1,0,Math.PI/2,.5,true]);
  assert.notEqual(key._lastEnabledInverseViewMatrix, other._lastEnabledInverseViewMatrix);
});

test("declared reader initializes the completed key once without field notifications", t =>
{
  camera(t);
  let initialized = 0, notified = 0;
  const initialize = Tr2CameraFollowCurveKey.prototype.Initialize;
  t.mock.method(Tr2CameraFollowCurveKey.prototype, "Initialize", function() {initialized++; assert.equal(this.name, "framing"); return initialize.call(this);});
  t.mock.method(Tr2CameraFollowCurveKey.prototype, "OnModified", () => {notified++; return true;});
  const key = new DictReader({declarations:true}).CreateObject({_type:"Tr2CameraFollowCurveKey", name:"framing", time:2, angleZero:0, offset:[1,2,3], fovMultiplication:2});
  assert.equal(initialized, 1);
  assert.equal(notified, 0);
  assert.equal(key.fovMultiplication, 2, "reader initialization suppresses the notified field's clamp");
  assert.notDeepEqual(Array.from(key.boxPosition), [0,0,0]);
  assert.deepEqual(Array.from(key.offset), [1,2,3]);
});

test("Copier initializes after copying authored fields and leaves runtime camera state independent", t =>
{
  camera(t);
  const source = new Tr2CameraFollowCurveKey();
  source.name = "copy"; source.time = 4; source.offset.set([1,2,3]); source.fovMultiplication = .25;
  source.enabled = false; source.objectBounds.set([3,4,5]); source.boxPosition.fill(99);
  let initialized = 0;
  const initialize = Tr2CameraFollowCurveKey.prototype.Initialize;
  t.mock.method(Tr2CameraFollowCurveKey.prototype, "Initialize", function()
  {
    initialized++;
    assert.equal(this.name, "copy"); assert.equal(this.time, 4);
    assert.deepEqual(Array.from(this.offset), [1,2,3]);
    assert.equal(this.fovMultiplication, .25);
    return initialize.call(this);
  });
  const copy = new Copier().CloneTo(source);
  assert.equal(initialized, 1);
  assert.equal(copy.name, "copy"); assert.equal(copy.time, 4);
  assert.equal(copy.enabled, true);
  assert.deepEqual(Array.from(copy.objectBounds), [0,0,0]);
  assert.deepEqual(Array.from(copy.offset), [1,2,3]);
  assert.notEqual(copy.offset, source.offset);
  assert.notDeepEqual(Array.from(copy.boxPosition), [99,99,99]);
});

test("actual follow-curve owner evaluates the model-free camera key through the interface", t =>
{
  camera(t);
  const key = new Tr2CameraFollowCurveKey();
  key.time = 2; key.angleZero = 0; key.offset.set([1,2,3]);
  const expected = key.GetValue(new Float32Array(3));
  const curve = new Tr2FollowCurve();
  curve.keys.push(key);
  const out = new Float32Array(3);
  assert.equal(curve.GetValueAt(3, out), out);
  assert.deepEqual(out, expected);
  key.fovMultiplication = 2;
  key.OnModified("offset");
  assert.equal(key.fovMultiplication, 2);
  key.OnModified("fovMultiplication");
  assert.equal(key.fovMultiplication, .999);
});
