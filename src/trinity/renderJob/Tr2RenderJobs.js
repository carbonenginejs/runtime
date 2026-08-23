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
    const context = executor || Tr2RenderContext.GetDefault();
    let batch = null;
    try
    {
      batch = Tr2RenderJobs.#beginBatch(context, this);
      for (const job of this.recurring.slice()) Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);

      const continuedOnce = [];
      for (const job of this.once.slice())
      {
        const status = Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);
        if (status === TriRenderJob.Status.RJ_IN_PROGRESS) continuedOnce.push(job);
      }
      this.once = continuedOnce;

      const chained = this.chained.slice();
      const continuedChained = [];
      for (let index = 0; index < chained.length; index++)
      {
        const job = chained[index];
        const status = Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);
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
      if (batch) Tr2RenderJobs.#endBatch(context, this, batch);
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
    const context = executor || Tr2RenderContext.GetDefault();
    for (const job of this.updateRecurring.slice()) Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);
  }

  /**
   * Runs one scheduled job, reporting an invalid-render-job diagnostic and
   * RJ_FAILED when the entry cannot be run.
   */
  static #runJob(job, realTime, simTime, executor, owner)
  {
    if (!job?.Run)
    {
      executor?.AddDiagnostic?.({ type: "invalid-render-job", owner, job });
      return TriRenderJob.Status.RJ_FAILED;
    }
    return job.Run(realTime, simTime, executor);
  }

  /**
   * Opens the frame's target scope: delegates to the executor's BeginBatch when
   * it has one, otherwise pushes a render-target and depth-stencil entry to
   * snapshot the current binding, undoing whatever was pushed if the second push
   * throws. The returned token tells #endBatch what to close.
   */
  static #beginBatch(executor, owner)
  {
    if (executor?.BeginBatch)
    {
      executor.BeginBatch(owner);
      return { delegated: true };
    }
    let renderTargetPushed = false;
    let depthStencilPushed = false;
    try
    {
      executor?.PushRenderTarget?.(null, 0);
      renderTargetPushed = !!executor?.PushRenderTarget;
      executor?.PushDepthStencil?.(null);
      depthStencilPushed = !!executor?.PushDepthStencil;
      return { delegated: false, renderTargetPushed, depthStencilPushed };
    }
    catch (error)
    {
      if (depthStencilPushed) executor?.PopDepthStencil?.();
      if (renderTargetPushed) executor?.PopRenderTarget?.(0);
      throw error;
    }
  }

  /**
   * Closes the scope opened by #beginBatch, either delegating to EndBatch or
   * popping the depth-stencil and render target in reverse order.
   */
  static #endBatch(executor, owner, batch)
  {
    if (batch.delegated) return executor?.EndBatch?.(owner);
    if (batch.depthStencilPushed) executor?.PopDepthStencil?.();
    if (batch.renderTargetPushed) executor?.PopRenderTarget?.(0);
  }
}
