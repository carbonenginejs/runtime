// Source: trinity/trinity/RenderJob/Tr2RenderJobs.h
// Source: trinity/trinity/RenderJob/Tr2RenderJobs.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { Tr2RenderContext } from "../core/context/Tr2RenderContext.js";
import { TriRenderJob } from "./TriRenderJob.js";


/**
 * The four render-job schedules a frame draws from - recurring, one-off, chained
 * and update-recurring - and the order in which they are run.
 */
@type.define({ className: "Tr2RenderJobs", family: "renderJob" })
export class Tr2RenderJobs extends CjsModel
{
  @io.persist
  @type.list("TriRenderJob")
  recurring = [];

  @io.persist
  @type.list("TriRenderJob")
  once = [];

  @io.persist
  @type.list("TriRenderJob")
  chained = [];

  @io.persist
  @type.list("TriRenderJob")
  updateRecurring = [];

  /**
   * Carbon Tr2RenderJobs::Run (cpp:23-98): runs every recurring job, then every one-off job keeping only those still RJ_IN_PROGRESS for the next frame, then chained jobs until one reports RJ_IN_PROGRESS, at which point that job and all remaining ones are carried over.
   * The whole pass is bracketed by a render-target/depth-stencil batch so no job can leak a binding past the frame.
   * @param {object} [executor] performs the work the jobs describe; defaults to the shared Tr2RenderContext
   */
  @carbon.method
  @impl.adapted
  Run(realTime, simTime, executor = null)
  {
    const context = executor ?? Tr2RenderContext.GetDefault();
    if (!(context instanceof Tr2RenderContext))
    {
      throw new TypeError("Tr2RenderJobs.Run expects a Tr2RenderContext.");
    }
    let beganBatch = false;
    try
    {
      context.BeginBatch(this);
      beganBatch = true;
      for (const job of this.recurring.slice()) Tr2RenderJobs.#runJob(job, realTime, simTime, context);

      const continuedOnce = [];
      for (const job of this.once.slice())
      {
        const status = Tr2RenderJobs.#runJob(job, realTime, simTime, context);
        if (status === TriRenderJob.Status.RJ_IN_PROGRESS) continuedOnce.push(job);
      }
      this.once = continuedOnce;

      const chained = this.chained.slice();
      const continuedChained = [];
      for (let index = 0; index < chained.length; index++)
      {
        const job = chained[index];
        const status = Tr2RenderJobs.#runJob(job, realTime, simTime, context);
        if (status === TriRenderJob.Status.RJ_IN_PROGRESS)
        {
          continuedChained.push(...chained.slice(index));
          break;
        }
      }
      this.chained = continuedChained;
    }
    finally
    {
      if (beganBatch) context.EndBatch(this);
    }
  }

  /**
   * Carbon Tr2RenderJobs::RunUpdate (cpp:100-111): runs the update-recurring
   * jobs only; unlike Run this pass reschedules nothing and is not bracketed by
   * a batch.
   */
  @carbon.method
  @impl.adapted
  RunUpdate(realTime, simTime, executor = null)
  {
    const context = executor ?? Tr2RenderContext.GetDefault();
    if (!(context instanceof Tr2RenderContext))
    {
      throw new TypeError("Tr2RenderJobs.RunUpdate expects a Tr2RenderContext.");
    }
    for (const job of this.updateRecurring.slice()) Tr2RenderJobs.#runJob(job, realTime, simTime, context);
  }

  /**
   * Runs one scheduled job and rejects entries outside the owned job contract.
   */
  static #runJob(job, realTime, simTime, executor)
  {
    if (!(job instanceof TriRenderJob))
    {
      throw new TypeError("Tr2RenderJobs schedules must contain TriRenderJob instances.");
    }
    return job.Run(realTime, simTime, executor);
  }
}
