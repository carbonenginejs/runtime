import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2RenderContext as _Tr2RenderContext } from '../core/context/Tr2RenderContext.js';
import { TriRenderStep as _TriRenderStep } from './step/TriRenderStep.js';
import { TriRenderJobStatus } from '../generated/renderJob/enums.js';

let _initProto, _initClass, _init_status, _init_extra_status, _init_stackGuard, _init_extra_stackGuard, _init_enabled, _init_extra_enabled, _init_name, _init_extra_name, _init_steps, _init_extra_steps;

/**
 * An ordered list of render steps plus the cursor and status that let the
 * sequence pause mid-list and resume on a later frame.
 */
let _TriRenderJob;
new class extends _identity {
  static [class TriRenderJob extends CjsModel {
    static {
      ({
        e: [_init_status, _init_extra_status, _init_stackGuard, _init_extra_stackGuard, _init_enabled, _init_extra_enabled, _init_name, _init_extra_name, _init_steps, _init_extra_steps, _initProto],
        c: [_TriRenderJob, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriRenderJob",
        family: "renderJob"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("TriRenderJobStatus")], 16, "status"], [[io, io.persist, type, type.boolean], 16, "stackGuard"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("TriRenderStep")], 16, "steps"], [[carbon, carbon.method, impl, impl.adapted], 18, "Run"]], 0, void 0, CjsModel));
    }
    status = (_initProto(this), _init_status(this, _TriRenderJob.Status.RJ_INIT));
    stackGuard = (_init_extra_status(this), _init_stackGuard(this, true));
    enabled = (_init_extra_stackGuard(this), _init_enabled(this, true));
    name = (_init_extra_enabled(this), _init_name(this, ""));
    steps = (_init_extra_name(this), _init_steps(this, []));
    #currentStep = (_init_extra_steps(this), 0);

    /**
     * Carbon TriRenderJob::Run (cpp:18-125): runs the steps in order against a snapshot of the list, resuming at the persisted cursor when the previous run left the job RJ_IN_PROGRESS, and stopping at the first step that does not return RS_OK or that disables the job.
     * Each step is bracketed by begin/end so the end hook runs even when execution throws. When stackGuard is set, the executor's render-target and depth-stencil depths are compared against the depths recorded on entry: shortfalls are reported as diagnostics and surplus pushes are popped back to the baseline.
     * @param {number} realTime wall-clock time passed through to each step
     * @param {number} simTime simulation time passed through to each step
     * @param {object} [executor] performs the actual work described by the steps; defaults to the shared Tr2RenderContext. It may take over step dispatch by implementing BeginStep/ExecuteStep/EndStep.
     * @returns {number} the resulting TriRenderJob.Status
     */
    Run(realTime, simTime, executor = null) {
      if (!this.enabled) return _TriRenderJob.Status.RJ_DONE;
      const context = executor || _Tr2RenderContext.GetDefault();
      const snapshot = this.steps.slice();
      if (this.status !== _TriRenderJob.Status.RJ_IN_PROGRESS || this.#currentStep >= snapshot.length) {
        this.#currentStep = 0;
      }
      const preRT = _TriRenderJob.#stackSize(context, "GetStackSizeRT");
      const preDS = _TriRenderJob.#stackSize(context, "GetStackSizeDS");
      let result = _TriRenderJob.StepResult.RS_OK;
      let runError = null;
      try {
        while (this.#currentStep < snapshot.length) {
          const step = snapshot[this.#currentStep];
          if (!step || !_TriRenderJob.#isStepEnabled(step)) {
            this.#currentStep++;
            continue;
          }
          let began = false;
          let stepError = null;
          try {
            _TriRenderJob.#beginStep(context, step, realTime, simTime, this);
            began = true;
            result = _TriRenderJob.#executeStep(context, step, realTime, simTime, this);
          } catch (error) {
            stepError = error;
          } finally {
            if (began) {
              try {
                _TriRenderJob.#endStep(context, step, realTime, simTime, this);
              } catch (error) {
                if (!stepError) stepError = error;else _TriRenderJob.#diagnose(context, "step-cleanup-error", {
                  job: this,
                  step,
                  error
                });
              }
            }
          }
          if (stepError) throw stepError;
          if (this.stackGuard) {
            _TriRenderJob.#diagnoseUnderflow(context, preRT, preDS, this, step);
          }
          if (result !== _TriRenderJob.StepResult.RS_OK || !this.enabled) break;
          this.#currentStep++;
        }
      } catch (error) {
        runError = error;
        result = _TriRenderJob.StepResult.RS_FAILED;
      } finally {
        if (this.stackGuard) {
          _TriRenderJob.#diagnoseUnderflow(context, preRT, preDS, this, null);
          _TriRenderJob.#unwind(context, "GetStackSizeRT", "PopRenderTarget", preRT, this, "render-target");
          _TriRenderJob.#unwind(context, "GetStackSizeDS", "PopDepthStencil", preDS, this, "depth-stencil");
        }
      }
      if (runError) {
        this.status = _TriRenderJob.Status.RJ_FAILED;
        throw runError;
      }
      if (!this.enabled) return _TriRenderJob.Status.RJ_DONE;
      switch (result) {
        case _TriRenderJob.StepResult.RS_OK:
        case _TriRenderJob.StepResult.RS_TERMINATE:
          this.status = _TriRenderJob.Status.RJ_DONE;
          break;
        case _TriRenderJob.StepResult.RS_FAILED:
          this.status = _TriRenderJob.Status.RJ_FAILED;
          break;
        case _TriRenderJob.StepResult.RS_IN_PROGRESS:
          this.status = _TriRenderJob.Status.RJ_IN_PROGRESS;
          break;
        default:
          this.status = _TriRenderJob.Status.RJ_FAILED;
          _TriRenderJob.#diagnose(context, "invalid-step-result", {
            job: this,
            result
          });
          break;
      }
      return this.status;
    }

    /**
     * Treats a step as enabled through its IsEnabled method, or when it has none,
     * through an enabled field that is not false.
     */

    /**
     * Gives the executor first refusal on step setup via BeginStep, and otherwise
     * calls the step's own BeginExecute.
     */

    /**
     * Gives the executor first refusal on step execution via ExecuteStep, and
     * otherwise calls the step's own Execute; the returned step result decides
     * whether the job continues.
     */

    /**
     * Gives the executor first refusal on step teardown via EndStep, and otherwise
     * calls the step's own EndExecute; the caller runs this even when execution
     * threw.
     */

    /**
     * Reads a stack depth off the executor, mapping a missing, negative or
     * non-finite value to 0 so executors that do not track stacks never trip the
     * guard.
     */

    /**
     * Reports a stack-underflow diagnostic when the executor's render-target or
     * depth-stencil depth has dropped below the depth recorded at job entry, the
     * condition Carbon asserts on (TriRenderJob.cpp:63-64).
     */

    /**
     * Pops the executor's stack back down to the depth recorded at job entry,
     * mirroring Carbon's stack repair loop (TriRenderJob.cpp:85-92), and stops
     * early if a pop fails to reduce the depth.
     */

    /**
     * Forwards a typed diagnostic record to the executor when it exposes
     * AddDiagnostic; Carbon asserts or logs at these same points.
     */
  }];
  Status = TriRenderJobStatus;
  RJ_INIT = 0;
  RJ_IN_PROGRESS = 1;
  RJ_DONE = 2;
  RJ_FAILED = 3;
  StepResult = _TriRenderStep.Result;
  #isStepEnabled(step) {
    return step.IsEnabled?.() ?? step.enabled !== false;
  }
  #beginStep(executor, step, realTime, simTime, job) {
    if (executor?.BeginStep) return executor.BeginStep(step, realTime, simTime, job);
    return step.BeginExecute?.(executor);
  }
  #executeStep(executor, step, realTime, simTime, job) {
    if (executor?.ExecuteStep) return executor.ExecuteStep(step, realTime, simTime, job);
    return step.Execute?.(realTime, simTime, executor);
  }
  #endStep(executor, step, realTime, simTime, job) {
    if (executor?.EndStep) return executor.EndStep(step, realTime, simTime, job);
    return step.EndExecute?.(executor);
  }
  #stackSize(executor, method) {
    const value = executor?.[method]?.();
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  }
  #diagnoseUnderflow(executor, preRT, preDS, job, step) {
    const rt = _TriRenderJob.#stackSize(executor, "GetStackSizeRT");
    const ds = _TriRenderJob.#stackSize(executor, "GetStackSizeDS");
    if (rt < preRT) _TriRenderJob.#diagnose(executor, "stack-underflow", {
      stack: "render-target",
      job,
      step,
      expected: preRT,
      actual: rt
    });
    if (ds < preDS) _TriRenderJob.#diagnose(executor, "stack-underflow", {
      stack: "depth-stencil",
      job,
      step,
      expected: preDS,
      actual: ds
    });
  }
  #unwind(executor, sizeMethod, popMethod, baseline, job, stack) {
    let size = _TriRenderJob.#stackSize(executor, sizeMethod);
    if (size > baseline) _TriRenderJob.#diagnose(executor, "stack-repair", {
      stack,
      job,
      expected: baseline,
      actual: size
    });
    while (size > baseline) {
      if (!executor?.[popMethod]) break;
      executor[popMethod]();
      const next = _TriRenderJob.#stackSize(executor, sizeMethod);
      if (next >= size) break;
      size = next;
    }
  }
  #diagnose(executor, type, detail) {
    executor?.AddDiagnostic?.({
      type,
      ...detail
    });
  }
  TriRenderJobStatus = TriRenderJobStatus;
  constructor() {
    super(_TriRenderJob), _initClass();
  }
}();

export { _TriRenderJob as TriRenderJob };
//# sourceMappingURL=TriRenderJob.js.map
