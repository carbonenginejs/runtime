import assert from "node:assert/strict";
import test from "node:test";
import { EveModularObjectModifier, EveStation2, EveChildPartDataPartData } from "../../npm/dist/trinity/index.js";
import { EveSOF } from "../../npm/dist/sof/index.js";

test("modular modifier final teardown reapplies current bounds without retiring the object", () =>
{
  // One with no edit session destructs without an object to apply to.
  assert.equal(new EveModularObjectModifier().Destruct(), true);
  const modifier = new EveModularObjectModifier();
  const owner = new EveStation2(), peer = new EveStation2();
  const peerRadius = peer.boundingSphereRadius;
  modifier.Create(owner, new EveSOF());
  const part = new EveChildPartDataPartData();
  part.boundingSphere.set([3, 4, 5, 2]);
  modifier._data.parts.push(part);
  assert.equal(modifier.Destruct(), true);
  assert.equal(modifier.Destruct(), false);
  assert.deepEqual(Array.from(owner.boundingSphereCenter), [3, 4, 5]);
  assert.equal(owner.boundingSphereRadius, 2);
  assert.deepEqual(Array.from(owner.shapeEllipsoidCenter), [3, 4, 5]);
  assert.equal(peer.boundingSphereRadius, peerRadius);
  assert.equal(modifier._object, owner);
  assert.equal(modifier._data.parts[0], part);
});
