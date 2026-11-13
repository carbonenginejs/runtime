import assert from "node:assert/strict";
import test from "node:test";
import { EveChildInstanceContainer, EveChildTransform } from "../../npm/dist/trinity/index.js";
import { assertChildOwnerDestruct } from "../support/childOwnerDestruct.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("instance-container teardown detaches its source and every retained instance", () =>
{
  const owner = new EveChildInstanceContainer(), instance = new EveChildTransform();
  CjsGraph.finalDelete(owner);
  owner.instances.push(instance);
  owner.RegisterChild(instance);
  assertChildOwnerDestruct(owner, "_source");
  assert.equal(instance.GetParent(), null);
  assert.equal(instance.GetOwner(), null);
  assert.deepEqual(Array.from(owner.instances), [instance]);
});
