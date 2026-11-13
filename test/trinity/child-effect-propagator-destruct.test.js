import test from "node:test";
import assert from "node:assert/strict";
import { EveChildEffectPropagator, EveChildTransform, Tr2Controller } from "../../npm/dist/trinity/index.js";
import { assertChildOwnerDestruct } from "../support/childOwnerDestruct.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("effect-propagator teardown detaches its retained effect", () =>
{
  const owner = new EveChildEffectPropagator();
  CjsGraph.finalDelete(owner);
  assertChildOwnerDestruct(owner, "_effect");
});

test("public propagator destruction runs its effect hook and inherited container cleanup", () =>
{
  const owner = new EveChildEffectPropagator();
  const effect = new EveChildTransform(), child = new EveChildTransform();
  const controller = new Tr2Controller();
  owner.SetOwner(owner);
  owner._effect = effect;
  owner.objects.push(child);
  owner.RegisterChild(effect);
  owner.RegisterChildren(owner.objects);
  owner.controllers.push(controller);
  controller.Link(owner);
  controller.Start();
  owner.Destruct();
  owner.Destruct();
  for (const held of [effect, child])
  {
    assert.equal(held.GetParent(), null);
    assert.equal(held.GetOwner(), null);
  }
  assert.equal(controller.IsLinked(), false);
  assert.equal(controller.isPlaying, true);
  assert.equal(owner._effect, effect);
  assert.deepEqual(Array.from(owner.objects), [child]);
});
