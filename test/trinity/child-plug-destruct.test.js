import assert from "node:assert/strict";
import test from "node:test";
import { EveChildPlug, EveChildTransform } from "../../npm/dist/trinity/index.js";
import { assertControllerDestruct } from "../support/controllerDestruct.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("EveChildPlug teardown unlinks controllers and detaches retained children", () =>
{
  const owner = new EveChildPlug(), peer = new EveChildPlug();
  const child = new EveChildTransform(), peerChild = new EveChildTransform();
  owner.SetOwner(owner);
  peer.SetOwner(peer);
  owner.objects.push(child);
  peer.objects.push(peerChild);
  owner.RegisterChildren(owner.objects);
  peer.RegisterChildren(peer.objects);
  assert.equal(child.GetParent(), owner);
  assert.equal(child.GetOwner(), owner);
  assertControllerDestruct(owner);
  assert.equal(child.GetParent(), null);
  assert.equal(child.GetOwner(), null);
  assert.equal(peerChild.GetParent(), peer);
  assert.equal(peerChild.GetOwner(), peer);
  assert.deepEqual(Array.from(owner.objects), [child]);
  CjsGraph.finalDelete(peer);
});
