import { impl } from "#schema";


/**
 * Nominal renderer contract driven by Trinity render contexts and jobs.
 */
export class CjsTrinityStepExecutor
{

  /** Begins one canonical render step. */
  @impl.abstract
  BeginStep(_step, _realTime, _simTime, _job, _context)
  {
    throw new Error("CjsTrinityStepExecutor.BeginStep must be implemented by a concrete executor.");
  }

  /** Executes one canonical render step. */
  @impl.abstract
  ExecuteStep(_step, _realTime, _simTime, _job, _context)
  {
    throw new Error("CjsTrinityStepExecutor.ExecuteStep must be implemented by a concrete executor.");
  }

  /** Ends one canonical render step. */
  @impl.abstract
  EndStep(_step, _realTime, _simTime, _job, _context)
  {
    throw new Error("CjsTrinityStepExecutor.EndStep must be implemented by a concrete executor.");
  }

  // THERE WAS A SCENE BRACKET HERE, AND IT IS GONE (2026-09-18). BeginScene
  // and EndScene are the BACKEND's, inherited by Carbon's render context from
  // the abstraction layer (Tr2RenderContextDx11.h:67-68); the context's own
  // pair now forwards there, which is what Tr2Renderer::BeginRenderContext
  // calls. The executor's copies were the retired intent-recording mechanism's
  // and no longer had a caller - the direct executor's were empty bodies.

  /** Opens a render-target and depth-stencil batch bracket. */
  @impl.abstract
  BeginBatch(_owner, _context)
  {
    throw new Error("CjsTrinityStepExecutor.BeginBatch must be implemented by a concrete executor.");
  }

  /** Closes a render-target and depth-stencil batch bracket. */
  @impl.abstract
  EndBatch(_owner, _context)
  {
    throw new Error("CjsTrinityStepExecutor.EndBatch must be implemented by a concrete executor.");
  }

}
