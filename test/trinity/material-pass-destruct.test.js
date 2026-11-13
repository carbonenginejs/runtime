import assert from "node:assert/strict";
import test from "node:test";
import { Tr2EffectPassParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectPassParameters.js";
import { Tr2Vector4Parameter } from "../../npm/dist/trinity/shader/index.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2ResourceSetAL } from "../../npm/dist/trinityal/index.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("pass teardown disconnects rerouted parameters and releases owned stage/set handles", t =>
{
  const context = new Tr2RenderContext();
  context.GetRenderContextAL().CreateDevice();
  const pass = new Tr2EffectPassParameters();
  const parameter = new Tr2Vector4Parameter(), peer = new Tr2Vector4Parameter();
  const destination = vec4.create(), peerDestination = vec4.create();
  parameter.SetValue([1, 2, 3, 4]);
  parameter.SetDestination(destination, 16);
  peer.SetDestination(peerDestination, 16);
  pass.AddReroutable(parameter);
  for (const input of pass.stageInput)
  {
    input.constantBuffer.Create__Size(16, context);
    assert.equal(input.constantBuffer.IsValid(), true);
  }
  pass.resourceSet.Create__Program(pass.resourceSetDesc, {}, context);
  assert.equal(pass.resourceSet.IsValid(), true);
  const peerSet = new Tr2ResourceSetAL({ copy: pass.resourceSet });
  const inputs = pass.stageInput, rerouted = pass.reroutedParameters;
  const order = [];
  for (const [object, method, label] of [
    [parameter, "SetDestination", "parameter"],
    [pass.resourceSet, "Destroy", "set"]
  ])
  {
    const original = object[method];
    t.mock.method(object, method, function(...args) { order.push(label); return original.apply(this, args); });
  }
  // The pass destructs its value members through the runner, so the runner is what is watched.
  const finalDelete = CjsGraph.finalDelete;
  t.mock.method(CjsGraph, "finalDelete", function(object)
  {
    if (object === pass.resourceSetDesc) order.push("description");
    else if (inputs.includes(object)) order.push(inputs.indexOf(object));
    return finalDelete.call(this, object);
  });
  try
  {
    CjsGraph.finalDelete(pass);
    assert.deepEqual(order, ["parameter", "set", "description", 5, 4, 3, 2, 1, 0]);
    CjsGraph.finalDelete(pass);
    assert.equal(parameter.IsRerouted(), false);
    parameter.SetValue([5, 6, 7, 8]);
    assert.deepEqual(Array.from(destination), [1, 2, 3, 4]);
    assert.equal(peer.IsRerouted(), true);
    assert.equal(pass.resourceSet.IsValid(), false);
    assert.equal(peerSet.IsValid(), true);
    for (const input of inputs) assert.equal(input.constantBuffer.IsValid(), false);
    assert.equal(pass.stageInput, inputs);
    assert.equal(pass.reroutedParameters, rerouted);
    assert.deepEqual(rerouted, [parameter]);
  }
  finally
  {
    CjsGraph.finalDelete(pass);
    peerSet.Destroy();
    peer.SetDestination(null, 0);
  }
});
