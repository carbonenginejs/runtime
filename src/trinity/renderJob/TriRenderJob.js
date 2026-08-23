// Source: trinity/trinity/RenderJob/TriRenderJob.h
// Source: trinity/trinity/RenderJob/TriRenderJob.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { Tr2RenderContext } from "../core/context/Tr2RenderContext.js";
import { TriRenderStep } from "./step/TriRenderStep.js";
import { TriRenderJobStatus } from "../generated/renderJob/enums.js";


/**
 * An ordered list of render steps plus the cursor and status that let the
 * sequence pause mid-list and resume on a later frame.
 */
@type.define({ className: "TriRenderJob", family: "renderJob" })
export class TriRenderJob extends CjsModel
{
  static Status = TriRenderJobStatus;

  static RJ_INIT = 0;
  static RJ_IN_PROGRESS = 1;
  static RJ_DONE = 2;
  static RJ_FAILED = 3;

  static StepResult = TriRenderStep.Result;

  @io.persist
  @type.int32
  @type.enum("TriRenderJobStatus")
  status = TriRenderJob.Status.RJ_INIT;

  @io.persist
  @type.boolean
  stackGuard = true;

  @io.persist
  @type.boolean
  enabled = true;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.list("TriRenderStep")
  steps = [];

  #currentStep = 0;

  /**
   * Carbon TriRenderJob::Run (cpp:18-125): runs the steps in order against a snapshot of the list, resuming at the persisted cursor when the previous run left the job RJ_IN_PROGRESS, and stopping at the first step that does not return RS_OK or that disables the job.
   * Each step is bracketed by begin/end so the end hook runs even when execution throws. When stackGuard is set, the executor's render-target and depth-stencil depths are compared against the depths recorded on entry: shortfalls are reported as diagnostics and surplus pushes are popped back to the baseline.
   * @param {number} realTime wall-clock time passed through to each step
   * @param {number} simTime simulation time passed through to each step
   * @param {object} [executor] performs the actual work described by the steps; defaults to the shared Tr2RenderContext. It may take over step dispatch by implementing BeginStep/ExecuteStep/EndStep.
   * @returns {number} the resulting TriRenderJob.Status
   */
  @carbon.method
  @impl.adapted
  Run(realTime, simTime, executor = null)
  {
    if (!this.enabled) return TriRenderJob.Status.RJ_DONE;

    const context = executor ?? Tr2RenderContext.GetDefault();
    if (!(context instanceof Tr2RenderContext))
    {
      throw new TypeError("TriRenderJob.Run expects a Tr2RenderContext.");
    }
    const snapshot = this.steps.slice();
    if (this.status !== TriRenderJob.Status.RJ_IN_PROGRESS || this.#currentStep >= snapshot.length)
    {
      this.#currentStep = 0;
    }

    const preRT = TriRenderJob.#stackSize(context, "GetStackSizeRT");
    const preDS = TriRenderJob.#stackSize(context, "GetStackSizeDS");
    let result = TriRenderJob.StepResult.RS_OK;
    let runError = null;

    try
    {
      while (this.#currentStep < snapshot.length)
      {
        const step = snapshot[this.#currentStep];
        if (!step || !TriRenderJob.#isStepEnabled(step))
        {
          this.#currentStep++;
          continue;
        }

        let began = false;
        let stepError = null;
        try
        {
          TriRenderJob.#beginStep(context, step, realTime, simTime, this);
          began = true;
          result = TriRenderJob.#executeStep(context, step, realTime, simTime, this);
        }
        catch (error)
        {
          stepError = error;
        }
        finally
        {
          if (began)
          {
            try
            {
              TriRenderJob.#endStep(context, step, realTime, simTime, this);
            }
            catch (error)
            {
              if (!stepError) stepError = error;
              else TriRenderJob.#diagnose(context, "step-cleanup-error", { job: this, step, error });
            }
          }
        }
        if (stepError) throw stepError;

        if (this.stackGuard)
        {
          TriRenderJob.#diagnoseUnderflow(context, preRT, preDS, this, step);
        }
        if (result !== TriRenderJob.StepResult.RS_OK || !this.enabled) break;
        this.#currentStep++;
      }
    }
    catch (error)
    {
      runError = error;
      result = TriRenderJob.StepResult.RS_FAILED;
    }
    finally
    {
      if (this.stackGuard)
      {
        TriRenderJob.#diagnoseUnderflow(context, preRT, preDS, this, null);
        TriRenderJob.#unwind(context, "GetStackSizeRT", "PopRenderTarget", preRT, this, "render-target");
        TriRenderJob.#unwind(context, "GetStackSizeDS", "PopDepthStencil", preDS, this, "depth-stencil");
      }
    }

    if (runError)
    {
      this.status = TriRenderJob.Status.RJ_FAILED;
      throw runError;
    }
    if (!this.enabled) return TriRenderJob.Status.RJ_DONE;

    switch (result)
    {
      case TriRenderJob.StepResult.RS_OK:
      case TriRenderJob.StepResult.RS_TERMINATE:
        this.status = TriRenderJob.Status.RJ_DONE;
        break;
      case TriRenderJob.StepResult.RS_FAILED:
        this.status = TriRenderJob.Status.RJ_FAILED;
        break;
      case TriRenderJob.StepResult.RS_IN_PROGRESS:
        this.status = TriRenderJob.Status.RJ_IN_PROGRESS;
        break;
      default:
        this.status = TriRenderJob.Status.RJ_FAILED;
        TriRenderJob.#diagnose(context, "invalid-step-result", { job: this, result });
        break;
    }
    return this.status;
  }

  /**
   * Validates the canonical step identity and reads its required enable method.
   */
  static #isStepEnabled(step)
  {
    if (!(step instanceof TriRenderStep))
    {
      throw new TypeError("TriRenderJob steps must extend TriRenderStep.");
    }
    return step.IsEnabled();
  }

  /**
   * Delegates step setup to the canonical render context.
   */
  static #beginStep(executor, step, realTime, simTime, job)
  {
    return executor.BeginStep(step, realTime, simTime, job);
  }

  /**
   * Delegates step execution to the canonical render context.
   */
  static #executeStep(executor, step, realTime, simTime, job)
  {
    return executor.ExecuteStep(step, realTime, simTime, job);
  }

  /**
   * Delegates step teardown to the canonical render context.
   */
  static #endStep(executor, step, realTime, simTime, job)
  {
    return executor.EndStep(step, realTime, simTime, job);
  }

  /**
   * Reads a stack depth from the canonical context and normalizes its value.
   */
  static #stackSize(executor, method)
  {
    const value = executor[method]();
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  }

  /**
   * Reports a stack-underflow diagnostic when the executor's render-target or
   * depth-stencil depth has dropped below the depth recorded at job entry, the
   * condition Carbon asserts on (TriRenderJob.cpp:63-64).
   */
  static #diagnoseUnderflow(executor, preRT, preDS, job, step)
  {
    const rt = TriRenderJob.#stackSize(executor, "GetStackSizeRT");
    const ds = TriRenderJob.#stackSize(executor, "GetStackSizeDS");
    if (rt < preRT) TriRenderJob.#diagnose(executor, "stack-underflow", { stack: "render-target", job, step, expected: preRT, actual: rt });
    if (ds < preDS) TriRenderJob.#diagnose(executor, "stack-underflow", { stack: "depth-stencil", job, step, expected: preDS, actual: ds });
  }

  /**
   * Pops the executor's stack back down to the depth recorded at job entry,
   * mirroring Carbon's stack repair loop (TriRenderJob.cpp:85-92), and stops
   * early if a pop fails to reduce the depth.
   */
  static #unwind(executor, sizeMethod, popMethod, baseline, job, stack)
  {
    let size = TriRenderJob.#stackSize(executor, sizeMethod);
    if (size > baseline) TriRenderJob.#diagnose(executor, "stack-repair", { stack, job, expected: baseline, actual: size });
    while (size > baseline)
    {
      executor[popMethod]();
      const next = TriRenderJob.#stackSize(executor, sizeMethod);
      if (next >= size) break;
      size = next;
    }
  }

  /**
   * Forwards a typed diagnostic record to the canonical render context.
   */
  static #diagnose(executor, type, detail)
  {
    executor.AddDiagnostic({ type, ...detail });
  }

  static TriRenderJobStatus = TriRenderJobStatus;

}
