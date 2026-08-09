import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2RenderContext as _Tr2RenderContext } from '../core/context/Tr2RenderContext.js';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';

let _initProto, _initClass, _init_recurring, _init_extra_recurring, _init_once, _init_extra_once, _init_chained, _init_extra_chained, _init_updateRecurring, _init_extra_updateRecurring;

/**
 * The four render-job schedules a frame draws from - recurring, one-off, chained
 * and update-recurring - and the order in which they are run.
 */
let _Tr2RenderJobs;
new class extends _identity {
  static [class Tr2RenderJobs extends CjsModel {
    static {
      ({
        e: [_init_recurring, _init_extra_recurring, _init_once, _init_extra_once, _init_chained, _init_extra_chained, _init_updateRecurring, _init_extra_updateRecurring, _initProto],
        c: [_Tr2RenderJobs, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2RenderJobs",
        family: "renderJob"
      })], [[[io, io.persist, void 0, type.list("TriRenderJob")], 16, "recurring"], [[io, io.persist, void 0, type.list("TriRenderJob")], 16, "once"], [[io, io.persist, void 0, type.list("TriRenderJob")], 16, "chained"], [[io, io.persist, void 0, type.list("TriRenderJob")], 16, "updateRecurring"], [[carbon, carbon.method, impl, impl.adapted], 18, "Run"], [[carbon, carbon.method, impl, impl.adapted], 18, "RunUpdate"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_updateRecurring(this);
    }
    recurring = (_initProto(this), _init_recurring(this, []));
    once = (_init_extra_recurring(this), _init_once(this, []));
    chained = (_init_extra_once(this), _init_chained(this, []));
    updateRecurring = (_init_extra_chained(this), _init_updateRecurring(this, []));

    /**
     * Carbon Tr2RenderJobs::Run (cpp:23-98): runs every recurring job, then every one-off job keeping only those still RJ_IN_PROGRESS for the next frame, then chained jobs until one reports RJ_IN_PROGRESS, at which point that job and all remaining ones are carried over.
     * The whole pass is bracketed by a render-target/depth-stencil batch so no job can leak a binding past the frame.
     * @param {object} [executor] performs the work the jobs describe; defaults to the shared Tr2RenderContext
     */
    Run(realTime, simTime, executor = null) {
      const context = executor || _Tr2RenderContext.GetDefault();
      let batch = null;
      try {
        batch = _Tr2RenderJobs.#beginBatch(context, this);
        for (const job of this.recurring.slice()) _Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);
        const continuedOnce = [];
        for (const job of this.once.slice()) {
          const status = _Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);
          if (status === _TriRenderJob.Status.RJ_IN_PROGRESS) continuedOnce.push(job);
        }
        this.once = continuedOnce;
        const chained = this.chained.slice();
        const continuedChained = [];
        for (let index = 0; index < chained.length; index++) {
          const job = chained[index];
          const status = _Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);
          if (status === _TriRenderJob.Status.RJ_IN_PROGRESS) {
            continuedChained.push(...chained.slice(index));
            break;
          }
        }
        this.chained = continuedChained;
      } finally {
        if (batch) _Tr2RenderJobs.#endBatch(context, this, batch);
      }
    }

    /**
     * Carbon Tr2RenderJobs::RunUpdate (cpp:100-111): runs the update-recurring
     * jobs only; unlike Run this pass reschedules nothing and is not bracketed by
     * a batch.
     */
    RunUpdate(realTime, simTime, executor = null) {
      const context = executor || _Tr2RenderContext.GetDefault();
      for (const job of this.updateRecurring.slice()) _Tr2RenderJobs.#runJob(job, realTime, simTime, context, this);
    }

    /**
     * Runs one scheduled job, reporting an invalid-render-job diagnostic and
     * RJ_FAILED when the entry cannot be run.
     */

    /**
     * Opens the frame's target scope: delegates to the executor's BeginBatch when
     * it has one, otherwise pushes a render-target and depth-stencil entry to
     * snapshot the current binding, undoing whatever was pushed if the second push
     * throws. The returned token tells #endBatch what to close.
     */

    /**
     * Closes the scope opened by #beginBatch, either delegating to EndBatch or
     * popping the depth-stencil and render target in reverse order.
     */
  }];
  #runJob(job, realTime, simTime, executor, owner) {
    if (!job?.Run) {
      executor?.AddDiagnostic?.({
        type: "invalid-render-job",
        owner,
        job
      });
      return _TriRenderJob.Status.RJ_FAILED;
    }
    return job.Run(realTime, simTime, executor);
  }
  #beginBatch(executor, owner) {
    if (executor?.BeginBatch) {
      executor.BeginBatch(owner);
      return {
        delegated: true
      };
    }
    let renderTargetPushed = false;
    let depthStencilPushed = false;
    try {
      executor?.PushRenderTarget?.(null, 0);
      renderTargetPushed = !!executor?.PushRenderTarget;
      executor?.PushDepthStencil?.(null);
      depthStencilPushed = !!executor?.PushDepthStencil;
      return {
        delegated: false,
        renderTargetPushed,
        depthStencilPushed
      };
    } catch (error) {
      if (depthStencilPushed) executor?.PopDepthStencil?.();
      if (renderTargetPushed) executor?.PopRenderTarget?.(0);
      throw error;
    }
  }
  #endBatch(executor, owner, batch) {
    if (batch.delegated) return executor?.EndBatch?.(owner);
    if (batch.depthStencilPushed) executor?.PopDepthStencil?.();
    if (batch.renderTargetPushed) executor?.PopRenderTarget?.(0);
  }
  constructor() {
    super(_Tr2RenderJobs), _initClass();
  }
}();

export { _Tr2RenderJobs as Tr2RenderJobs };
//# sourceMappingURL=Tr2RenderJobs.js.map
