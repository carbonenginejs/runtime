import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/RenderJob/TriRenderStep.h
// Source: trinity/trinity/RenderJob/TriRenderStep.cpp
import { meta, type } from "#schema";


/**
 * Base of every render-job step: an enable flag, a name, and the
 * begin/execute/end contract the owning job drives.
 *
 * @abstract
 */
@be.define("TriRenderStep")
@be.inherit(IRoot)
@be.abstract
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
   *
   * @implemented
   */

  IsEnabled()
  {
    return this.enabled;
  }

  /**
   * Hook the owning job calls before Execute; the base step does nothing, and
   * subclasses use it to set up state that EndExecute tears down.
   *
   * @adapted
   */

  BeginExecute()
  {
  }

  /**
   * Performs this step's work. Carbon declares this method pure virtual, so a
   * concrete step that omits it is an incomplete implementation and fails
   * loudly when executed.
   *
   * @abstract
  */
  @meta.abstract
  Execute(_realTime, _simTime, _context) {}

  /**
   * Carbon: TriRenderStep::GetCaptureGpuTime (TriRenderStep.cpp:60-63; declared TriRenderStep.h:35), protected.
   * Whether GPU time capture is on.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @returns {boolean} Never returns.
   */
  _GetCaptureGpuTime()
  {
    throw new Error("TriRenderStep.GetCaptureGpuTime requires the unported Tr2ProfileTimer.");
  }

  /**
   * Carbon: TriRenderStep::SetCaptureGpuTime (TriRenderStep.cpp:65-68; declared TriRenderStep.h:36), protected.
   * Turns GPU time capture on or off.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @param {boolean} _value Whether to capture.
   * @returns {void} Never returns.
   */
  _SetCaptureGpuTime(_value)
  {
    throw new Error("TriRenderStep.SetCaptureGpuTime requires the unported Tr2ProfileTimer.");
  }

  /**
   * Carbon: TriRenderStep::GetCaptureCpuTime (TriRenderStep.cpp:70-73; declared TriRenderStep.h:37), protected.
   * Whether CPU time capture is on.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @returns {boolean} Never returns.
   */
  _GetCaptureCpuTime()
  {
    throw new Error("TriRenderStep.GetCaptureCpuTime requires the unported Tr2ProfileTimer.");
  }

  /**
   * Carbon: TriRenderStep::SetCaptureCpuTime (TriRenderStep.cpp:75-78; declared TriRenderStep.h:38), protected.
   * Turns CPU time capture on or off.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @param {boolean} _value Whether to capture.
   * @returns {void} Never returns.
   */
  _SetCaptureCpuTime(_value)
  {
    throw new Error("TriRenderStep.SetCaptureCpuTime requires the unported Tr2ProfileTimer.");
  }

  /**
   * Carbon: TriRenderStep::GpuTime (TriRenderStep.cpp:80-83; declared TriRenderStep.h:39), protected.
   * The captured GPU time in milliseconds.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @returns {number} Never returns.
   */
  _GpuTime()
  {
    throw new Error("TriRenderStep.GpuTime requires the unported Tr2ProfileTimer.");
  }

  /**
   * Carbon: TriRenderStep::CpuTime (TriRenderStep.cpp:85-88; declared TriRenderStep.h:40), protected.
   * The captured CPU time in milliseconds.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @returns {number} Never returns.
   */
  _CpuTime()
  {
    throw new Error("TriRenderStep.CpuTime requires the unported Tr2ProfileTimer.");
  }

  /**
   * Carbon: TriRenderStep::GetStatName (TriRenderStep.cpp:90-93; declared TriRenderStep.h:41), protected.
   * The statistics entry name the timers post to.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @returns {string} Never returns.
   */
  _GetStatName()
  {
    throw new Error("TriRenderStep.GetStatName requires the unported Tr2ProfileTimer.");
  }

  /**
   * Carbon: TriRenderStep::SetStatName (TriRenderStep.cpp:95-98; declared TriRenderStep.h:42), protected.
   * Sets the statistics entry name the timers post to.
   *
   * Not implemented: Carbon forwards to the step's embedded Tr2ProfileTimer m_timer
   * (Tr2ProfileTimer.h:7-41), which is not ported; no timer state exists on this class.
   *
   * @notImplemented
   * @param {string} _value The statistics entry name.
   * @returns {void} Never returns.
   */
  _SetStatName(_value)
  {
    throw new Error("TriRenderStep.SetStatName requires the unported Tr2ProfileTimer.");
  }

  /**
   * Hook the owning job calls after Execute, including when Execute threw; the
   * base step does nothing.
   *
   * @adapted
   */

  EndExecute()
  {
  }
}
