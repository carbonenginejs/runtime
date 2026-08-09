import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_inProgress, _init_extra_inProgress;

/** A test step that reports itself in progress until its flag is cleared, so a job's resume path can be exercised. */
let _TriStepTestBlocking;
class TriStepTestBlocking extends _TriRenderStep {
  static {
    ({
      e: [_init_inProgress, _init_extra_inProgress, _initProto],
      c: [_TriStepTestBlocking, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepTestBlocking",
      family: "renderJob"
    })], [[[io, io.persist, type, type.boolean], 16, "inProgress"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon logs the outcome through its own logger on each call; logging is a host concern.")], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_inProgress(this);
  }
  /** m_inProgress (bool) [READWRITE, PERSIST] */
  inProgress = (_initProto(this), _init_inProgress(this, true));

  // Carbon TriStepTestBlocking.cpp:15-26. The step exists to hold a job open:
  // it keeps returning RS_IN_PROGRESS until something clears the flag, which
  // is how the resume path - a retried step reopening its begin/execute/end
  // bracket - gets exercised. Carbon also logs each outcome; a log line is a
  // host concern and is left out.

  /**
   * Reports the step still in progress while its flag is set, and complete
   * once it is cleared.
   */
  Execute(_realTime, _simTime, _executor) {
    return this.inProgress ? _TriRenderStep.Result.RS_IN_PROGRESS : _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepTestBlocking as TriStepTestBlocking };
//# sourceMappingURL=TriStepTestBlocking.js.map
