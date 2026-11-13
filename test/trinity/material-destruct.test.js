import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Material } from "../../npm/dist/trinity/shader/index.js";
import { Tr2EffectTechniqueInputs } from "../../npm/dist/trinity/shader/material/Tr2EffectTechniqueInputs.js";
import { Tr2EffectPassParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectPassParameters.js";
import { Tr2EffectLibraryParameters } from "../../npm/dist/trinity/shader/material/Tr2EffectLibraryParameters.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("material teardown releases both technique vectors without clearing their holders", () =>
{
  const context = new Tr2RenderContext();
  context.GetRenderContextAL().CreateDevice();
  const material = new Tr2Material();
  const passes = new Tr2EffectTechniqueInputs(), libraries = new Tr2EffectTechniqueInputs();
  const pass = new Tr2EffectPassParameters(), library = new Tr2EffectLibraryParameters();
  passes.passes.push(pass);
  libraries.libraries.push(library);
  material.parametersForPasses.push(passes);
  material.parametersForLibraries.push(libraries);
  const buffers = [pass.stageInput[0].constantBuffer, library.localInput.constantBuffer, library.globalInput.constantBuffer];
  for (const buffer of buffers)
  {
    buffer.Create__Size(16, context);
    assert.equal(buffer.IsValid(), true);
  }
  CjsGraph.finalDelete(material);
  CjsGraph.finalDelete(material);
  for (const buffer of buffers) assert.equal(buffer.IsValid(), false);
  assert.deepEqual(material.parametersForPasses, [passes]);
  assert.deepEqual(material.parametersForLibraries, [libraries]);
});
