import assert from "node:assert/strict";
import test from "node:test";
import { TriValueBinding, Tr2FloatParameter } from "../../npm/dist/trinity/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

for (const weak of [false, true])
{
  test(`value-binding teardown unregisters a ${weak ? "weak" : "strong"} destination without detaching its peer`, () =>
  {
    const source = new Tr2FloatParameter(), destination = new Tr2FloatParameter();
    const owner = new TriValueBinding(), peer = new TriValueBinding();
    for (const binding of [owner, peer])
    {
      if (weak) binding.CreateWeakBinding(source, "value", destination, "value");
      else
      {
        binding.SetSource("value", source);
        binding.SetDestination("value", destination);
        binding.Initialize();
      }
      assert.equal(binding.IsValid(), true);
    }
    const first = new Float32Array(1), second = new Float32Array(1);
    destination.SetDestination(first);
    assert.equal(owner._reroutedDestination, first);
    assert.equal(peer._reroutedDestination, first);
    CjsGraph.finalDelete(owner);
    CjsGraph.finalDelete(owner);
    destination.SetDestination(second);
    assert.equal(owner._reroutedDestination, first);
    assert.equal(peer._reroutedDestination, second);
    assert.equal(owner.GetCurrentDestinationObject(), destination);
    CjsGraph.finalDelete(peer);
  });
}

test("value-binding teardown accepts absent and non-reroutable endpoints", () =>
{
  const binding = new TriValueBinding();
  CjsGraph.finalDelete(binding);
  binding.SetDestination("value", { value: 0 });
  CjsGraph.finalDelete(binding);
  CjsGraph.finalDelete(binding);
});
