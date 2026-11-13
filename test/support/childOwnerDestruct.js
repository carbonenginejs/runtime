import assert from "node:assert/strict";
import { EveChildContainer, EveChildTransform } from "../../npm/dist/trinity/index.js";

/** Checks retained-child detach, repeat teardown, and a separate parent's survival. */
export function assertChildOwnerDestruct(owner, field, child = new EveChildTransform())
{
  const peer = new EveChildContainer(), peerChild = new EveChildTransform();
  owner.SetOwner(owner);
  peer.SetOwner(peer);
  owner[field] = child;
  owner.RegisterChild(child);
  peer.RegisterChild(peerChild);
  child.SetPartTag(123);
  assert.equal(child.GetParent(), owner);
  assert.equal(child.GetOwner(), owner);
  (owner._Destructor ?? owner.OnDestruct).call(owner);
  (owner._Destructor ?? owner.OnDestruct).call(owner);
  assert.equal(child.GetParent(), null);
  assert.equal(child.GetOwner(), null);
  assert.equal(child.partTag, 123);
  assert.equal(owner[field], child);
  assert.equal(peerChild.GetParent(), peer);
  assert.equal(peerChild.GetOwner(), peer);
  peer.UnregisterChild(peerChild);
}
