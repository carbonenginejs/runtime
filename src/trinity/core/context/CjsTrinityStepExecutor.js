import { meta } from "#schema";


/**
 * Nominal renderer contract driven by Trinity render contexts and jobs.
 */
@meta.define("CjsTrinityStepExecutor")
export class CjsTrinityStepExecutor
{

  /** Begins one canonical render step. */
  @meta.abstract
  BeginStep(_step, _realTime, _simTime, _job, _context) {}

  /** Executes one canonical render step. */
  @meta.abstract
  ExecuteStep(_step, _realTime, _simTime, _job, _context) {}

  /** Ends one canonical render step. */
  @meta.abstract
  EndStep(_step, _realTime, _simTime, _job, _context) {}

  // THERE WAS A SCENE BRACKET HERE, AND IT IS GONE (2026-09-18). BeginScene
  // and EndScene are the BACKEND's, inherited by Carbon's render context from
  // the abstraction layer (Tr2RenderContextDx11.h:67-68); the context's own
  // pair now forwards there, which is what Tr2Renderer::BeginRenderContext
  // calls. The executor's copies were the retired intent-recording mechanism's
  // and no longer had a caller - the direct executor's were empty bodies.

  /** Opens a render-target and depth-stencil batch bracket. */
  @meta.abstract
  BeginBatch(_owner, _context) {}

  /** Closes a render-target and depth-stencil batch bracket. */
  @meta.abstract
  EndBatch(_owner, _context) {}

}
