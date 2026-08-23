// Source: trinity/trinity/RenderJob/TriRenderStep.h
// Source: trinity/trinity/RenderJob/TriRenderStep.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Base of every render-job step: an enable flag, a name, and the
 * begin/execute/end contract the owning job drives.
 */
@type.define({ className: "TriRenderStep", family: "renderJob" })
export class TriRenderStep extends CjsModel
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

  @io.readwrite
  @type.boolean
  enabled = true;

  @io.persist
  @type.string
  name = "";

  /**
   * Reports whether the owning job should run this step; disabled steps are
   * skipped without advancing any state.
   */
  @carbon.method
  @impl.implemented
  IsEnabled()
  {
    return this.enabled;
  }

  /**
   * Hook the owning job calls before Execute; the base step does nothing, and
   * subclasses use it to set up state that EndExecute tears down.
   */
  @carbon.method
  @impl.adapted
  BeginExecute()
  {
  }

  /**
   * Hook the owning job calls after Execute, including when Execute threw; the
   * base step does nothing.
   */
  @carbon.method
  @impl.adapted
  EndExecute()
  {
  }
}
