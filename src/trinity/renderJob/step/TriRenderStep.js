import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/RenderJob/TriRenderStep.h
// Source: trinity/trinity/RenderJob/TriRenderStep.cpp
import { meta, type, blue } from "#schema";


/**
 * Base of every render-job step: an enable flag, a name, and the
 * begin/execute/end contract the owning job drives.
 */
@blue.define({ className: "TriRenderStep", abstract: true })
@blue.interface()
@blue.inherit(IRoot)
export class TriRenderStep extends IRoot
{
  static Result = Object.freeze({
    RS_OK: 0,
    RS_FAILED: 1,
    RS_IN_PROGRESS: 2,
    RS_TERMINATE: 3
  });

  static RS_OK = 0;
  static RS_FAILED = 1;
  static RS_IN_PROGRESS = 2;
  static RS_TERMINATE = 3;

  @be.mapAttribute(be.READWRITE)
  @type.boolean
  enabled = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /**
   * Reports whether the owning job should run this step; disabled steps are
   * skipped without advancing any state.
   */

  @meta.implemented
  IsEnabled()
  {
    return this.enabled;
  }

  /**
   * Hook the owning job calls before Execute; the base step does nothing, and
   * subclasses use it to set up state that EndExecute tears down.
   */

  @meta.adapted
  BeginExecute()
  {
  }

  /**
   * Performs this step's work. Carbon declares this method pure virtual, so a
   * concrete step that omits it is an incomplete implementation and fails
   * loudly when executed.
  */
  @blue.abstract
  Execute(_realTime, _simTime, _context) {}

  /**
   * Hook the owning job calls after Execute, including when Execute threw; the
   * base step does nothing.
   */

  @meta.adapted
  EndExecute()
  {
  }
}
