import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { GetControllerTimeSeconds } from './contracts.js';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_curveSetName, _init_extra_curveSetName, _init_rangeName, _init_extra_rangeName, _init_syncToRange, _init_extra_syncToRange;

/**
 * Controller action that plays a named curve set (optionally one named range) on
 * its owner for the duration of the action, and can hold off state transitions
 * until a synced range iteration has completed.
 */
let _Tr2ActionPlayCurveSe;
class Tr2ActionPlayCurveSet extends CjsModel {
  static {
    ({
      e: [_init_curveSetName, _init_extra_curveSetName, _init_rangeName, _init_extra_rangeName, _init_syncToRange, _init_extra_syncToRange, _initProto],
      c: [_Tr2ActionPlayCurveSe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ActionPlayCurveSet",
      family: "controllers"
    })], [[[io, io.persist, type, type.string], 16, "curveSetName"], [[io, io.persist, type, type.string], 16, "rangeName"], [[io, io.persist, type, type.boolean], 16, "syncToRange"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebaseSimTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "CanTransition"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"]], 0, void 0, CjsModel));
  }
  curveSetName = (_initProto(this), _init_curveSetName(this, ""));
  rangeName = (_init_extra_curveSetName(this), _init_rangeName(this, ""));
  syncToRange = (_init_extra_rangeName(this), _init_syncToRange(this, false));
  #controller = (_init_extra_syncToRange(this), null);
  #startTime = 0;
  #prevTime = 0;
  #duration = 0;

  /**
   * Plays the configured curve set.
   */
  Start(controller) {
    const owner = ITr2ControllerAction.getOwner(controller);
    this.#controller = controller;
    this.#duration = 0;
    if (!this.#play(owner)) {
      return;
    }
    if (this.syncToRange && this.rangeName) {
      this.#duration = this.#getRangeDuration(owner);
      this.#startTime = ITr2ControllerAction.getTime(controller, GetControllerTimeSeconds());
      this.#prevTime = this.#startTime;
      controller.RegisterUpdateable?.(this);
    }
  }

  /**
   * Stops the configured curve set.
   */
  Stop(controller) {
    const owner = ITr2ControllerAction.getOwner(controller);
    controller.UnRegisterUpdateable?.(this);
    if (this.#controller === controller) {
      this.#controller = null;
    }
    if (ITr2ControllerAction.hasFunction(owner, "StopCurveSet")) {
      owner.StopCurveSet(this.curveSetName);
    }
  }

  /**
   * Rebases the sync-to-range time cursor.
   */
  RebaseSimTime(diff) {
    this.#startTime += diff;
    this.#prevTime += diff;
  }

  /**
   * Prevents transition until a synced range iteration has completed.
   */
  CanTransition() {
    if (!this.syncToRange || this.#duration <= 0) {
      return true;
    }
    const now = GetControllerTimeSeconds();
    if (now === this.#startTime) {
      return true;
    }
    const previous = Math.floor((this.#prevTime - this.#startTime) / this.#duration);
    const current = Math.floor((now - this.#startTime) / this.#duration);
    return previous !== current;
  }

  /**
   * Stores the last update time for synced transitions.
   */
  Update(_realTime, simTime) {
    this.#prevTime = simTime;
  }

  /**
   * Starts the curve set on the owner, returning false when the owner exposes no
   * PlayCurveSet.
   */
  #play(owner) {
    if (ITr2ControllerAction.hasFunction(owner, "PlayCurveSet")) {
      owner.PlayCurveSet(this.curveSetName, this.rangeName);
      return true;
    }
    return false;
  }

  /**
   * Gets the authored range duration in seconds from the owner, or 0 when the
   * owner cannot report one.
   */
  #getRangeDuration(owner) {
    const ownerDuration = ITr2ControllerAction.callTarget(owner, "GetRangeDuration", this.curveSetName, this.rangeName);
    if (ownerDuration !== undefined) {
      return ITr2ControllerAction.toNumber(ownerDuration);
    }
    return 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2ActionPlayCurveSe as Tr2ActionPlayCurveSet };
//# sourceMappingURL=Tr2ActionPlayCurveSet.js.map
