import test from "node:test";
import assert from "node:assert/strict";
import { EveSmartLightQuad, EveChildTransform, EveSpaceObject2, EveChildUpdateParams, EveUpdateContext } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/index.js";

test("smart-light placement consumes the parent's output matrix, not its return value", () =>
{
  const quad = new EveSmartLightQuad();
  const params = new EveChildUpdateParams();
  params.localToWorldTransform[12] = 5;
  params.childParent = new EveChildTransform();
  params.childParent.GetLocalToWorldTransform = out => { mat4.identity(out); out[12] = 12; };
  params.spaceObjectParent = new EveSpaceObject2();
  params.spaceObjectParent.GetLocalToWorldTransform = () => { throw new Error("child parent takes precedence"); };
  let received;
  quad.UpdateTransform = value => { received = Array.from(value); };
  quad.UpdateAsyncronous_Distribution(new EveUpdateContext(), params, null);
  assert.equal(received[12], 12);
  assert.equal(params.localToWorldTransform[12], 5, "native local matrix copy must not mutate input");
});

test("smart-light placement keeps the supplied matrix when no parent exists", () =>
{
  const quad = new EveSmartLightQuad();
  const params = new EveChildUpdateParams();
  params.localToWorldTransform[12] = 9;
  let received;
  quad.UpdateTransform = value => { received = Array.from(value); };
  quad.UpdateAsyncronous_Distribution(new EveUpdateContext(), params, null);
  assert.equal(received[12], 9);
  assert.throws(() => quad.UpdateAsyncronous_Distribution(new EveUpdateContext(), null, null), TypeError);
});
