import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass;

/**
 * Step for Carbon's Windows-only cross-process render synchronization, which has
 * no browser equivalent and therefore always fails.
 */
let _TriStepRemoteSync;
class TriStepRemoteSync extends _TriRenderStep {
  static {
    ({
      e: [_initProto],
      c: [_TriStepRemoteSync, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRemoteSync",
      family: "renderJob"
    })], [[[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  #id = (_initProto(this), -1);

  /** Stores the identifier of the synchronization event this step would wait on. */
  __init__(id = -1) {
    this.SetId(id);
  }

  /** Returns the synchronization event identifier, -1 when none was set. */
  GetId() {
    return this.#id;
  }

  /** Sets the synchronization event identifier, throwing on a non-integer. */
  SetId(id) {
    if (!Number.isInteger(id)) {
      throw new TypeError("TriStepRemoteSync id must be an integer");
    }
    this.#id = id;
  }

  /**
   * Always reports RS_FAILED: the named process-wide event Carbon waits on
   * cannot be opened from a browser, so the step refuses rather than claiming
   * synchronization happened.
   */
  Execute(_realTime, _simTime, _renderContext) {
    // Carbon implements this class only on Windows with named HANDLE events.
    // Browsers cannot open those process-wide primitives, so the step fails
    // explicitly instead of claiming synchronization occurred.
    return _TriRenderStep.RS_FAILED;
  }
  static {
    _initClass();
  }
}

export { _TriStepRemoteSync as TriStepRemoteSync };
//# sourceMappingURL=TriStepRemoteSync.js.map
