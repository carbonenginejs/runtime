import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepTestBlocking.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A test step that reports itself in progress until its flag is cleared, so a job's resume path can be exercised. */
@be.define("TriStepTestBlocking")

@be.exposureChainTo(TriRenderStep)
export class TriStepTestBlocking extends TriRenderStep
{

  /** m_inProgress (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  inProgress = true;

  // Carbon TriStepTestBlocking.cpp:15-26. The step exists to hold a job open:
  // it keeps returning RS_IN_PROGRESS until something clears the flag, which
  // is how the resume path - a retried step reopening its begin/execute/end
  // bracket - gets exercised. Carbon also logs each outcome; a log line is a
  // host concern and is left out.

  /**
   * Reports the step still in progress while its flag is set, and complete
   * once it is cleared.
   *
   * Adapted: Carbon logs the outcome through its own logger on each call; logging is a host
   * concern.
   */
  @blue.method
  @meta.adapted
  Execute(_realTime, _simTime, _renderContext)
  {
    return this.inProgress ? TriRenderStep.Result.RS_IN_PROGRESS : TriRenderStep.Result.RS_OK;
  }

}
