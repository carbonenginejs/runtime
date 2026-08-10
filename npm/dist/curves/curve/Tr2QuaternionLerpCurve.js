import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { num } from '@carbonenginejs/runtime-utils/num';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_start, _init_extra_start, _init_length, _init_extra_length, _init_value, _init_extra_value, _init_startCurve, _init_extra_startCurve, _init_endCurve, _init_extra_endCurve;

/**
 * Quaternion curve that spherically interpolates between two child quaternion
 * curves, ramping the blend from 0 to 1 over `length` seconds starting at
 * `start` and clamping outside that window.
 */
let _Tr2QuaternionLerpCur;
class Tr2QuaternionLerpCurve extends CjsModel {
  static {
    ({
      e: [_init_start, _init_extra_start, _init_length, _init_extra_length, _init_value, _init_extra_value, _init_startCurve, _init_extra_startCurve, _init_endCurve, _init_extra_endCurve, _initProto],
      c: [_Tr2QuaternionLerpCur, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2QuaternionLerpCurve",
      family: "curves"
    })], [[[io, io.persist, type, type.float64], 16, "start"], [[io, io.persist, type, type.float32], 16, "length"], [[io, io.persist, type, type.quat], 16, "value"], [[io, io.persist, void 0, type.objectRef("ITriQuaternionFunction")], 16, "startCurve"], [[io, io.persist, void 0, type.objectRef("ITriQuaternionFunction")], 16, "endCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"]], 0, void 0, CjsModel));
  }
  start = (_initProto(this), _init_start(this, 0));
  length = (_init_extra_start(this), _init_length(this, 0));
  value = (_init_extra_length(this), _init_value(this, quat.create()));
  startCurve = (_init_extra_value(this), _init_startCurve(this, null));
  endCurve = (_init_extra_startCurve(this), _init_endCurve(this, null));
  #startValue = (_init_extra_endCurve(this), quat.create());
  #endValue = quat.create();

  /**
   * Updates the cached quaternion value for the supplied time.
   */
  UpdateValue(time) {
    this.Update(time, this.value);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  Update(time, out) {
    this.GetValueAt(time, this.value);
    return quat.copy(out, this.value);
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   */
  GetValueAt(time, out) {
    if (!this.startCurve || !this.endCurve || this.length <= 0) {
      return out;
    }
    const ratio = num.clamp((time - this.start) / this.length, 0, 1);
    const start = this.startCurve.GetValueAt(time, this.#startValue);
    const end = this.endCurve.GetValueAt(time, this.#endValue);
    return quat.slerp(out, start, end, ratio);
  }

  /**
   * Derivative stub retained for Carbon interface compatibility.
   */
  GetValueDotAt(_time, out) {
    return out;
  }

  /**
   * Second-derivative stub retained for Carbon interface compatibility.
   */
  GetValueDoubleDotAt(_time, out) {
    return out;
  }

  /**
   * Gets the authored blend duration.
   */
  Length() {
    return this.length;
  }
  static {
    _initClass();
  }
}

export { _Tr2QuaternionLerpCur as Tr2QuaternionLerpCurve };
//# sourceMappingURL=Tr2QuaternionLerpCurve.js.map
