import assert from "node:assert/strict";
import test from "node:test";
import { BlueResMan } from "../../../npm/dist/blue/index.js";
import { CjsGr2Format } from "../../../npm/dist/resource/formats/gr2/index.js";
import { configureResourceManager } from "../../support/configuredResMan.js";
import "../../support/frameLoop.js";
import { CjsGraph } from "../../../npm/dist/global/model/graph/CjsGraph.js";

test("prepared Granny resource destruction releases its decoded file without invalidating readers or peers", async () =>
{
  const bytes = CjsGr2Format.writeShared({ meshes: [], models: [], animations: [{ name: "idle" }] });
  const manager = new BlueResMan({ source: { Read: () => bytes } });
  await configureResourceManager(manager);
  const owner = await manager.FetchResource("res:/owner.gr2", { ex: "raw" });
  const peer = await manager.FetchResource("res:/peer.gr2", { ex: "raw" });
  const retained = owner.GetGrannyFile();
  assert.equal(retained.animations[0].name, "idle");
  assert.ok(owner.GetMemoryUsage() > 0);
  for (let repeat = 0; repeat < 2; repeat++)
  {
    CjsGraph.finalDelete(owner);
    assert.equal(owner.GetGrannyFile(), null);
    assert.equal(owner.GetMemoryUsage(), 0);
    assert.equal(retained.animations[0].name, "idle");
    assert.equal(peer.GetGrannyFile().animations[0].name, "idle");
    assert.ok(peer.GetMemoryUsage() > 0);
  }
  assert.equal(peer.Destruct(), false, "a resource refuses graph Destruct");
  assert.ok(peer.GetMemoryUsage() > 0, "and a refusal changes nothing");
  CjsGraph.finalDelete(peer);
});
