// Source: trinity/trinity/RenderJob/TriStepRemoteSync.h
// Source: trinity/trinity/RenderJob/TriStepRemoteSync.cpp
import { carbon, impl, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step for Carbon's Windows-only cross-process render synchronization, which has
 * no browser equivalent and therefore always fails.
 */
@type.define({ className: "TriStepRemoteSync", family: "renderJob" })
export class TriStepRemoteSync extends TriRenderStep
{
  #id = -1;

  /** Stores the identifier of the synchronization event this step would wait on. */
  @carbon.method
  @impl.adapted
  __init__(id = -1)
  {
    this.SetId(id);
  }

  /** Returns the synchronization event identifier, -1 when none was set. */
  GetId()
  {
    return this.#id;
  }

  /** Sets the synchronization event identifier, throwing on a non-integer. */
  SetId(id)
  {
    if (!Number.isInteger(id))
    {
      throw new TypeError("TriStepRemoteSync id must be an integer");
    }
    this.#id = id;
  }

  /**
   * Always reports RS_FAILED: the named process-wide event Carbon waits on
   * cannot be opened from a browser, so the step refuses rather than claiming
   * synchronization happened.
   */
  @impl.adapted
  Execute(_realTime, _simTime, _renderContext)
  {
    // Carbon implements this class only on Windows with named HANDLE events.
    // Browsers cannot open those process-wide primitives, so the step fails
    // explicitly instead of claiming synchronization occurred.
    return TriRenderStep.RS_FAILED;
  }
}
