import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepRunJob.h
// Source: trinity/trinity/RenderJob/TriStepRunJob.cpp
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriRenderJob } from "../TriRenderJob.js";


/** Step that runs a nested render job in place, letting job graphs compose. */
@be.define("TriStepRunJob")

@be.exposureChainTo(TriRenderStep)
export class TriStepRunJob extends TriRenderStep
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("TriRenderJob")
  job = null;

  /** Stores the nested job this step runs. */
  @blue.method
  @meta.adapted
  __init__(job = null)
  {
    this.SetRenderJob(job);
  }

  /** Replaces the nested job; null makes the step a no-op. */
  @blue.method
  @meta.adapted
  SetRenderJob(job)
  {
    this.job = job ?? null;
  }

  /**
   * Runs the nested job with the same render context and maps its job status onto a
   * step result, so a nested job that is still in progress leaves the owning job
   * in progress too and resumes at this same step next frame.
   */

  @meta.implemented
  Execute(realTime, simTime, renderContext)
  {
    if (!this.job) return TriRenderJob.StepResult.RS_OK;
    switch (this.job.Run(realTime, simTime, renderContext))
    {
      case TriRenderJob.Status.RJ_DONE: return TriRenderJob.StepResult.RS_OK;
      case TriRenderJob.Status.RJ_IN_PROGRESS: return TriRenderJob.StepResult.RS_IN_PROGRESS;
      case TriRenderJob.Status.RJ_FAILED: return TriRenderJob.StepResult.RS_FAILED;
      default: return TriRenderJob.StepResult.RS_FAILED;
    }
  }
}
