import { exposure as be } from "#be";
import { IRoot } from "../../blue/exposure/IRoot.js";
import { Tr2DeviceResource } from "../core/device/Tr2DeviceResource.js";
// Source: trinity/trinity/RenderJob/TriRenderJob.h
// Source: trinity/trinity/RenderJob/TriRenderJob.cpp
import { type } from "#schema";
import { Tr2RenderContext, Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { TriRenderStep } from "./step/TriRenderStep.js";
import { TriRenderJobStatus } from "../generated/renderJob/enums.js";
import { blue, BlueList } from "#blue";


/**
 * An ordered list of render steps plus the cursor and status that let the
 * sequence pause mid-list and resume on a later frame.
 * Carbon: TriRenderJob (trinity/trinity/RenderJob/TriRenderJob.h:22-24)
 */
@be.define("TriRenderJob")

@be.inherit(IRoot, Tr2DeviceResource)
export class TriRenderJob extends IRoot
{
  /** @cjs Scheduled render infrastructure survives idle collection; native device release remains callable. */
  _neverPurge = true;

  /**
   * Carbon: TriRenderJob::OnPrepareResources (trinity/trinity/RenderJob/TriRenderJob.cpp:127-139).
   * @adapted Follows BLUE_WITH_PYTHON=0: this runtime has no Python decorator-event bridge.
   * @returns {boolean} True, as in Carbon without Python.
   */
  _OnPrepareResources()
  {
    return true;
  }

  /**
   * Carbon: TriRenderJob::ReleaseResources (trinity/trinity/RenderJob/TriRenderJob.cpp:141-153).
   * @adapted Follows BLUE_WITH_PYTHON=0; Python DoReleaseResources callbacks are unsupported, not emulated.
   * @param {number} _storage Native storage mask, used only by the omitted Python callback.
   */
  ReleaseResources(_storage)
  {
  }
  static Status = TriRenderJobStatus;

  static RJ_INIT = 0;
  static RJ_IN_PROGRESS = 1;
  static RJ_DONE = 2;
  static RJ_FAILED = 3;

  static StepResult = TriRenderStep.Result;

  /** Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/RenderJob/TriRenderJob_Blue.cpp:42); chooser TriRenderJobStatusChooser (trinity/trinity/RenderJob/TriRenderJob_Blue.cpp:8). */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.TriRenderJobStatus")
  @type.int32
  @type.enum("trinity.TriRenderJobStatus")
  status = TriRenderJob.Status.RJ_INIT;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  stackGuard = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  enabled = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("TriRenderStep")
  steps = new BlueList(TriRenderStep, { className: "TriRenderStep" });

  _currentStep = 0;

  /**
   * Carbon Steps (TriRenderJob.h:34-37): the step list by mutable reference.
   * Run snapshots the list precisely BECAUSE a step may mutate it mid-run
   * through this accessor ("lists can change when executed").
   *
   * @implemented
   */

  Steps()
  {
    return this.steps;
  }

  /**
   * Carbon TriRenderJob::Run (cpp:18-125): runs the steps in order against a snapshot of the list, resuming at the persisted cursor when the previous run left the job RJ_IN_PROGRESS, and stopping at the first step that does not return RS_OK or that disables the job.
   * Each step is bracketed by begin/end so the end hook runs even when execution throws. When stackGuard is set, the executor's render-target and depth-stencil depths are compared against the depths recorded on entry: shortfalls are reported as diagnostics and surplus pushes are popped back to the baseline.
   *
   * @adapted Running renews JS device residency; JS snapshots the step list and brackets execution with context hooks.
   * @param {number} realTime wall-clock time passed through to each step
   * @param {number} simTime simulation time passed through to each step
   * @param {Tr2RenderContext|null} [executor] the render context the steps run against; null selects the main-thread render context, and anything that is not a Tr2RenderContext throws. Step dispatch is taken over through that context's SetStepExecutor. Nested jobs receive the same context.
   * @returns {number} the resulting TriRenderJob.Status
   */

  Run(realTime, simTime, executor = null)
  {
    if (!this.enabled) return TriRenderJob.Status.RJ_DONE;
    this.KeepAlive();

    const context = executor ?? Tr2RenderContext_GetMainThreadRenderContext();
    if (!(context instanceof Tr2RenderContext))
    {
      throw new TypeError("TriRenderJob.Run expects a Tr2RenderContext.");
    }
    const snapshot = this.steps.slice();
    if (this.status !== TriRenderJob.Status.RJ_IN_PROGRESS || this._currentStep >= snapshot.length)
    {
      this._currentStep = 0;
    }

    const preRT = TriRenderJob._stackSize(context, "GetStackSizeRT");
    const preDS = TriRenderJob._stackSize(context, "GetStackSizeDS");
    let result = TriRenderJob.StepResult.RS_OK;
    let runError = null;

    try
    {
      while (this._currentStep < snapshot.length)
      {
        const step = snapshot[this._currentStep];
        if (!step || !TriRenderJob._isStepEnabled(step))
        {
          this._currentStep++;
          continue;
        }

        let began = false;
        let stepError = null;
        try
        {
          TriRenderJob._beginStep(context, step, realTime, simTime, this);
          began = true;
          result = TriRenderJob._executeStep(context, step, realTime, simTime, this);
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
              TriRenderJob._endStep(context, step, realTime, simTime, this);
            }
            catch (error)
            {
              if (!stepError) stepError = error;
              else TriRenderJob._diagnose(context, "step-cleanup-error", { job: this, step, error });
            }
          }
        }
        if (stepError) throw stepError;

        if (this.stackGuard)
        {
          TriRenderJob._diagnoseUnderflow(context, preRT, preDS, this, step);
        }
        if (result !== TriRenderJob.StepResult.RS_OK || !this.enabled) break;
        this._currentStep++;
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
        TriRenderJob._diagnoseUnderflow(context, preRT, preDS, this, null);
        TriRenderJob._unwind(context, "GetStackSizeRT", "PopRenderTarget", preRT, this, "render-target");
        TriRenderJob._unwind(context, "GetStackSizeDS", "PopDepthStencil", preDS, this, "depth-stencil");
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
        TriRenderJob._diagnose(context, "invalid-step-result", { job: this, result });
        break;
    }
    return this.status;
  }

  /**
   * Validates the canonical step identity and reads its required enable method.
   */
  static _isStepEnabled(step)
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
  static _beginStep(executor, step, realTime, simTime, job)
  {
    return executor.BeginStep(step, realTime, simTime, job);
  }

  /**
   * Delegates step execution to the canonical render context.
   */
  static _executeStep(executor, step, realTime, simTime, job)
  {
    return executor.ExecuteStep(step, realTime, simTime, job);
  }

  /**
   * Delegates step teardown to the canonical render context.
   */
  static _endStep(executor, step, realTime, simTime, job)
  {
    return executor.EndStep(step, realTime, simTime, job);
  }

  /**
   * Reads a stack depth from the canonical context and normalizes its value.
   */
  static _stackSize(executor, method)
  {
    const value = executor[method]();
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  }

  /**
   * Reports a stack-underflow diagnostic when the executor's render-target or
   * depth-stencil depth has dropped below the depth recorded at job entry, the
   * condition Carbon asserts on (TriRenderJob.cpp:63-64).
   */
  static _diagnoseUnderflow(executor, preRT, preDS, job, step)
  {
    const rt = TriRenderJob._stackSize(executor, "GetStackSizeRT");
    const ds = TriRenderJob._stackSize(executor, "GetStackSizeDS");
    if (rt < preRT) TriRenderJob._diagnose(executor, "stack-underflow", { stack: "render-target", job, step, expected: preRT, actual: rt });
    if (ds < preDS) TriRenderJob._diagnose(executor, "stack-underflow", { stack: "depth-stencil", job, step, expected: preDS, actual: ds });
  }

  /**
   * Pops the executor's stack back down to the depth recorded at job entry,
   * mirroring Carbon's stack repair loop (TriRenderJob.cpp:85-92), and stops
   * early if a pop fails to reduce the depth.
   */
  static _unwind(executor, sizeMethod, popMethod, baseline, job, stack)
  {
    let size = TriRenderJob._stackSize(executor, sizeMethod);
    if (size > baseline) TriRenderJob._diagnose(executor, "stack-repair", { stack, job, expected: baseline, actual: size });
    while (size > baseline)
    {
      executor[popMethod]();
      const next = TriRenderJob._stackSize(executor, sizeMethod);
      if (next >= size) break;
      size = next;
    }
  }

  /**
   * Forwards a typed diagnostic record to the canonical render context.
   */
  static _diagnose(executor, type, detail)
  {
    executor.AddDiagnostic({ type, ...detail });
  }

  static TriRenderJobStatus = TriRenderJobStatus;

}
