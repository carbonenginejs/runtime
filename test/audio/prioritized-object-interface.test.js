import assert from "node:assert/strict";
import test from "node:test";
import { IPrioritizedObject } from "../../npm/dist/audio/trinity/audio/IPrioritizedObject.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

const methods = [
  "GetID", "GetPosition", "SetDistanceSqFromListener", "CalculateCullingWeight",
  "GetCullingWeight", "IsCulled", "Wake", "Cull"
];

test("IPrioritizedObject requires all eight native operations without adding model methods", () =>
{
  assert.deepEqual(Object.getOwnPropertyNames(IPrioritizedObject.prototype), [ "constructor", ...methods ]);
  const instance = new IPrioritizedObject();
  for (const method of methods)
  {
    assert.throws(() => instance[method](123), /must be implemented/u);
  }
  assert.equal("SetValues" in instance, false);
  assert.equal("Initialize" in instance, false);
  assert.equal(CjsSchema.GetConstructor("IPrioritizedObject"), null);
  assert.equal(mappedInterfaces(IPrioritizedObject).size, 0);
});

test("IPrioritizedObject composes inheritance without fabricating a Blue exposure map", () =>
{
  class PrioritizedObject
  {
    GetID() { return 7; }
    GetPosition() { return new Float32Array([ 1, 2, 3 ]); }
    SetDistanceSqFromListener(distanceSq) { this.distanceSq = distanceSq; }
    CalculateCullingWeight(now) { this.weight = now + this.distanceSq; }
    GetCullingWeight() { return this.weight; }
    IsCulled() { return this.culled; }
    Wake() { this.culled = false; }
    Cull() { this.culled = true; }
  }
  const getID = PrioritizedObject.prototype.GetID;
  meta.carbon.inherit(IPrioritizedObject)(PrioritizedObject, { kind: "class" });
  const object = new PrioritizedObject();
  assert.equal(PrioritizedObject.prototype.GetID, getID);
  assert.equal(CjsSchema.cast(object, IPrioritizedObject), object);
  assert.equal(mappedInterfaces(PrioritizedObject).has(IPrioritizedObject), false);
  assert.equal(object.GetID(), 7);
  object.SetDistanceSqFromListener(9);
  object.CalculateCullingWeight(20);
  assert.equal(object.GetCullingWeight(), 29);
  object.Cull();
  assert.equal(object.IsCulled(), true);
  object.Wake();
  assert.equal(object.IsCulled(), false);
});
