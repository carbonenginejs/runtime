import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepRemoteSync.h
// Source: trinity/trinity/RenderJob/TriStepRemoteSync.cpp
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step for Carbon's Windows-only cross-process render synchronization, which has
 * no browser equivalent and therefore always fails.
 */
@be.define("TriStepRemoteSync")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepRemoteSync extends TriRenderStep
{
  #id = -1;

  /**
   * Stores the identifier of the synchronization event this step would wait on.
   *
   * Not supported: `_WIN32` build only; the step waits on a Windows event primitive, which a browser does not have.
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.notSupported
  __init__(id = -1)
  {
    this.SetId(id);
  }

  /** Returns the synchronization event identifier, -1 when none was set (TriStepRemoteSync.h:23-26). */
  @meta.implemented
  GetId()
  {
    return this.#id;
  }

  /**
   * Sets the synchronization event identifier (TriStepRemoteSync.h:27-30). Adapted: Carbon's parameter is an `int`, so a JavaScript
   * value that is not an integer is refused with a TypeError.
   */
  @meta.adapted
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
  @meta.adapted
  Execute(_realTime, _simTime, _renderContext)
  {
    // Carbon implements this class only on Windows with named HANDLE events.
    // Browsers cannot open those process-wide primitives, so the step fails
    // explicitly instead of claiming synchronization occurred.
    return TriRenderStep.RS_FAILED;
  }
}
