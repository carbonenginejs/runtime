import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { num } from '@carbonenginejs/runtime-utils/num';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_delayTime, _init_extra_delayTime, _init_cycle, _init_extra_cycle, _init_value, _init_extra_value, _init_offsetDir, _init_extra_offsetDir, _init_startPositionCurve, _init_extra_startPositionCurve, _init_offsetDir2, _init_extra_offsetDir2, _init_sweepTime, _init_extra_sweepTime;

/**
 * A vector function that offsets a start-point curve by a vector sweeping from
 * one authored direction to another over a fixed time, once or repeatedly.
 */
let _EveRemotePositionCur;
class EveRemotePositionCurve extends CjsModel {
  static {
    ({
      e: [_init_delayTime, _init_extra_delayTime, _init_cycle, _init_extra_cycle, _init_value, _init_extra_value, _init_offsetDir, _init_extra_offsetDir, _init_startPositionCurve, _init_extra_startPositionCurve, _init_offsetDir2, _init_extra_offsetDir2, _init_sweepTime, _init_extra_sweepTime, _initProto],
      c: [_EveRemotePositionCur, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveRemotePositionCurve",
      family: "eve/renderable/stretch"
    })], [[[io, io.persist, type, type.float32], 16, "delayTime"], [[io, io.persist, type, type.boolean], 16, "cycle"], [[io, io.readwrite, type, type.vec3], 16, "value"], [[io, io.persist, type, type.vec3], 16, "offsetDir2"], [[io, io.persist, void 0, type.objectRef("ITriVectorFunction")], 16, "startPositionCurve"], [[io, io.persist, type, type.vec3], 16, "offsetDir1"], [[io, io.persist, type, type.float32], 16, "sweepTime"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's output-first Be::Time overload is represented by the org-standard time-first JavaScript curve convention.")], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's output-first Be::Time overload is represented by the org-standard time-first JavaScript curve convention.")], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
  }
  delayTime = (_initProto(this), _init_delayTime(this, 0));
  cycle = (_init_extra_delayTime(this), _init_cycle(this, false));
  value = (_init_extra_cycle(this), _init_value(this, vec3.create()));
  offsetDir2 = (_init_extra_value(this), _init_offsetDir(this, vec3.create()));
  startPositionCurve = (_init_extra_offsetDir(this), _init_startPositionCurve(this, null));
  offsetDir1 = (_init_extra_startPositionCurve(this), _init_offsetDir2(this, vec3.create()));
  sweepTime = (_init_extra_offsetDir2(this), _init_sweepTime(this, 1));
  #startTime = (_init_extra_sweepTime(this), 0);
  #startPosition = vec3.create();
  #currentOffsetDir = vec3.create();

  /**
   * Time-only entry point; evaluates the curve for its effect on value and
   * discards the returned vector.
   */
  UpdateValue(time) {
    this.Update(time, this.#startPosition);
  }

  /**
   * Advances the sweep and writes the start-curve position plus the interpolated offset into both value and out. The start time latches on the first call, the sweep stays at its first direction until delayTime has passed, and with cycle set it wraps every sweepTime instead of holding at the second direction.
   * @param {Array} out - caller-owned vec3; zeroed when there is no start-position curve
   * @returns {Array} out
   */
  Update(time, out) {
    if (!this.startPositionCurve) {
      return vec3.zero(out);
    }
    if (this.#startTime === 0) {
      this.#startTime = time;
    }
    const timeSinceStart = time - this.#startTime;
    let s = 0;
    if (timeSinceStart > this.delayTime) {
      if (this.cycle) {
        s = num.clamp((timeSinceStart - this.delayTime) % this.sweepTime / this.sweepTime, 0, 1);
      } else {
        s = num.clamp((timeSinceStart - this.delayTime) / this.sweepTime, 0, 1);
      }
    }
    vec3.lerp(this.#currentOffsetDir, this.offsetDir1, this.offsetDir2, s);
    this.startPositionCurve.GetValueAt(time, this.#startPosition);
    vec3.add(this.value, this.#startPosition, this.#currentOffsetDir);
    return vec3.copy(out, this.value);
  }

  /**
   * Reports the value computed by the last Update; the time argument is ignored
   * and nothing is re-evaluated.
   */
  GetValueAt(_time, out) {
    return vec3.copy(out, this.value);
  }

  /**
   * The first derivative is not modelled for this curve; out is returned
   * untouched.
   */
  GetValueDotAt(_time, out) {
    return out;
  }

  /**
   * The second derivative is not modelled for this curve; out is returned
   * untouched.
   */
  GetValueDoubleDotAt(_time, out) {
    return out;
  }

  /**
   * Copies the value computed by the last Update; the time argument is ignored
   * and nothing is re-evaluated.
   */
  InterpolatedPosition(_time, out) {
    return vec3.copy(out, this.value);
  }
  static {
    _initClass();
  }
}

export { _EveRemotePositionCur as EveRemotePositionCurve };
//# sourceMappingURL=EveRemotePositionCurve.js.map
