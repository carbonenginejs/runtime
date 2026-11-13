import assert from "node:assert/strict";
import test from "node:test";
import { Tr2EffectLibraryParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectLibraryParameters.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2ResourceSetAL } from "../../npm/dist/trinityal/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("library teardown releases both stage buffers and only its resource-set share", () =>
{
  const context = new Tr2RenderContext();
  context.GetRenderContextAL().CreateDevice();
  const library = new Tr2EffectLibraryParameters();
  const local = library.localInput, global = library.globalInput;
  local.constantBuffer.Create__Size(16, context);
  global.constantBuffer.Create__Size(16, context);
  library.globalResourceSet.Create__Program(library.globalResourceSetDesc, {}, context);
  const peer = new Tr2ResourceSetAL({ copy: library.globalResourceSet });
  assert.equal(local.constantBuffer.IsValid(), true);
  assert.equal(global.constantBuffer.IsValid(), true);
  assert.equal(peer.IsValid(), true);
  try
  {
    CjsGraph.finalDelete(library);
    CjsGraph.finalDelete(library);
    assert.equal(local.constantBuffer.IsValid(), false);
    assert.equal(global.constantBuffer.IsValid(), false);
    assert.equal(library.globalResourceSet.IsValid(), false);
    assert.equal(peer.IsValid(), true);
    assert.equal(library.localInput, local);
    assert.equal(library.globalInput, global);
  }
  finally { peer.Destroy(); }
});
