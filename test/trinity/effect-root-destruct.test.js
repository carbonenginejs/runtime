import assert from "node:assert/strict";
import test from "node:test";
import { EveEffectRoot2, EveChildTransform } from "../../npm/dist/trinity/index.js";
import { assertControllerDestruct } from "../support/controllerDestruct.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("effect-root teardown detaches retained effect children and controllers", () =>
{
  const owner = new EveEffectRoot2(), peer = new EveEffectRoot2();
  const child = new EveChildTransform(), peerChild = new EveChildTransform();
  owner.effectChildren.push(child);
  peer.effectChildren.push(peerChild);
  child.SetOwner(owner);
  peerChild.SetOwner(peer);
  assertControllerDestruct(owner);
  assert.equal(child.GetOwner(), null);
  assert.equal(peerChild.GetOwner(), peer);
  assert.deepEqual(Array.from(owner.effectChildren), [child]);
  CjsGraph.finalDelete(peer);
});
