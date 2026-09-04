import { CjsTrinityStepExecutor } from "./CjsTrinityStepExecutor.js";


/**
 * Direct GPU-free executor used whenever no engine recorder is installed.
 */
export class CjsDirectTrinityStepExecutor extends CjsTrinityStepExecutor
{

  /** Delegates step setup to the step's direct implementation. */
  BeginStep(step, _realTime, _simTime, _job, context)
  {
    return step.BeginExecute(context);
  }

  /** Delegates step execution to the step's direct implementation. */
  ExecuteStep(step, realTime, simTime, _job, context)
  {
    return step.Execute(realTime, simTime, context);
  }

  /** Delegates step teardown to the step's direct implementation. */
  EndStep(step, _realTime, _simTime, _job, context)
  {
    return step.EndExecute(context);
  }

  /** Opens a GPU-free scene bracket. */
  BeginScene(_context)
  {
  }

  /** Closes a GPU-free scene bracket. */
  EndScene(_context)
  {
  }

  /** Pushes the default render-target and depth-stencil batch state. */
  BeginBatch(_owner, context)
  {
    context.PushRenderTarget(0);
    try
    {
      context.PushDepthStencil();
    }
    catch (error)
    {
      context.PopRenderTarget(0);
      throw error;
    }
  }

  /** Pops the default depth-stencil and render-target batch state. */
  EndBatch(_owner, context)
  {
    context.PopDepthStencil();
    context.PopRenderTarget(0);
  }

}
