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

  /** Opens a scene bracket for the supplied render context. */
  @impl.abstract
  BeginScene(_context)
  {
    throw new Error("CjsTrinityStepExecutor.BeginScene must be implemented by a concrete executor.");
  }

  /** Closes a scene bracket for the supplied render context. */
  @impl.abstract
  EndScene(_context)
  {
    throw new Error("CjsTrinityStepExecutor.EndScene must be implemented by a concrete executor.");
  }

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
