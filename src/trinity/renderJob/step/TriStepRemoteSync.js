// Source: trinity/trinity/RenderJob/TriStepRemoteSync.h
// Source: trinity/trinity/RenderJob/TriStepRemoteSync.cpp
import { exposure as be } from "#be";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step for Carbon's Windows-only cross-process render synchronization, which has
 * no browser equivalent and therefore always fails.
 * @adapted No destructor hook: RenderJob/TriStepRemoteSync.cpp:24-40 closes three Windows event handles; Execute acquires none in the browser.
 */
@be.define("TriStepRemoteSync")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepRemoteSync extends TriRenderStep
{
  _id = -1;

  /**
   * Blue's initializer: stores the identifier of the synchronization event the step would wait on (TriStepRemoteSync.cpp:48-51).
   * The platform limit, a Windows event primitive a browser does not have, belongs to `Execute`.
   *
   * @implemented
   */
  @be.mapMethodAndWrapOptionalArgs(1)
  __init__(id = -1)
  {
    this.SetId(id);
  }

  /**
   * Returns the synchronization event identifier, -1 when none was set (TriStepRemoteSync.h:23-26).
   *
   * @implemented
   */
  GetId()
  {
    return this._id;
  }

  /**
   * Sets the synchronization event identifier (TriStepRemoteSync.h:27-30). Adapted: Carbon's parameter is an `int`, so a JavaScript
   * value that is not an integer is refused with a TypeError.
   *
   * @adapted
   */
  SetId(id)
  {
    if (!Number.isInteger(id))
    {
      throw new TypeError("TriStepRemoteSync id must be an integer");
    }
    this._id = id;
  }

  /**
   * Always reports RS_FAILED: the named process-wide event Carbon waits on
   * cannot be opened from a browser, so the step refuses rather than claiming
   * synchronization happened.
   *
   * @adapted
   */
  Execute(_realTime, _simTime, _renderContext)
  {
    // Carbon implements this class only on Windows with named HANDLE events.
    // Browsers cannot open those process-wide primitives, so the step fails
    // explicitly instead of claiming synchronization occurred.
    return TriRenderStep.RS_FAILED;
  }
}
