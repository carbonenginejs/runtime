import assert from "node:assert/strict";
import test from "node:test";
import { Tr2EffectTechniqueInputs } from "../../npm/dist/trinity/shader/material/Tr2EffectTechniqueInputs.js";
import { Tr2EffectPassParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectPassParameters.js";
import { Tr2EffectLibraryParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectLibraryParameters.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("technique teardown releases both owned pass and library values with arrays intact", () =>
{
  const context = new Tr2RenderContext();
  context.GetRenderContextAL().CreateDevice();
  const technique = new Tr2EffectTechniqueInputs();
  const pass = new Tr2EffectPassParameters(), library = new Tr2EffectLibraryParameters();
  technique.passes.push(pass);
  technique.libraries.push(library);
  const buffers = [pass.stageInput[0].constantBuffer, library.localInput.constantBuffer, library.globalInput.constantBuffer];
  for (const buffer of buffers)
  {
    buffer.Create__Size(16, context);
    assert.equal(buffer.IsValid(), true);
  }
  CjsGraph.finalDelete(technique);
  CjsGraph.finalDelete(technique);
  for (const buffer of buffers) assert.equal(buffer.IsValid(), false);
  assert.deepEqual(technique.passes, [pass]);
  assert.deepEqual(technique.libraries, [library]);
});
