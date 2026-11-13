import assert from "node:assert/strict";
import test from "node:test";
import { EveTacticalOverlay, Tr2Effect, Tr2VariableStore } from "../../npm/dist/trinity/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("tactical-overlay teardown detaches its local store from retained effects", () =>
{
  const owner = new EveTacticalOverlay(), peer = new EveTacticalOverlay();
  const effects = [new Tr2Effect(), new Tr2Effect(), new Tr2Effect()];
  [owner.anchorEffect, owner.connectorEffect, owner.velocityEffect] = effects;
  peer.anchorEffect = new Tr2Effect();
  owner.Initialize();
  peer.Initialize();
  const peerStore = peer._variableStore;
  for (const effect of effects) assert.equal(effect.GetVariableStore(), owner._variableStore);
  CjsGraph.finalDelete(owner);
  CjsGraph.finalDelete(owner);
  assert.equal(owner._variableStore, null);
  for (const effect of effects)
  {
    assert.equal(effect.variableStore, null);
    assert.equal(effect.GetVariableStore(), Tr2VariableStore.globalStore());
  }
  assert.equal(owner.anchorEffect, effects[0]);
  assert.equal(owner.connectorEffect, effects[1]);
  assert.equal(owner.velocityEffect, effects[2]);
  assert.equal(peer.anchorEffect.GetVariableStore(), peerStore);
  CjsGraph.finalDelete(peer);
});
