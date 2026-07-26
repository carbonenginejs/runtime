import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_value, _init_extra_value, _init_curve, _init_extra_curve, _init_currentValue, _init_extra_currentValue;

/**
 * Quaternion function wrapping a child quaternion curve behind its own time
 * remapping, falling back to a fixed authored quaternion when no child curve is
 * attached.
 */
let _Tr2RotationAdapter;
class Tr2RotationAdapter extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_curve, _init_extra_curve, _init_currentValue, _init_extra_currentValue, _initProto],
      c: [_Tr2RotationAdapter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RotationAdapter",
      family: "curves"
    })], [[[io, io.persist, type, type.quat], 16, "value"], [[io, io.persist, void 0, type.objectRef("ITriQuaternionFunction")], 16, "curve"], [[io, io.read, type, type.quat], 16, "currentValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "RandomizeStart"], [[carbon, carbon.method, impl, impl.implemented], 18, "ScaleTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetStart"]], 0, void 0, CjsModel));
  }
  value = (_initProto(this), _init_value(this, quat.create()));
  curve = (_init_extra_value(this), _init_curve(this, null));
  currentValue = (_init_extra_curve(this), _init_currentValue(this, quat.create()));
  #start = (_init_extra_currentValue(this), 0);
  #offset = 0;
  #timeScale = 1;

  /**
   * Updates the cached quaternion value when a child curve is attached.
   */
  UpdateValue(time) {
    if (this.curve) {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  Update(time, out) {
    if (this.curve) {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    } else {
      quat.copy(this.currentValue, this.value);
    }
    return quat.copy(out, this.currentValue);
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   */
  GetValueAt(time, out) {
    if (this.curve) {
      return this.curve.GetValueAt(this.GetLocalTime(time), out);
    }
    return quat.copy(out, this.value);
  }

  /**
   * Gets the first derivative quaternion at the supplied time.
   */
  GetValueDotAt(_time, out) {
    return quat.identity(out);
  }

  /**
   * Gets the second derivative quaternion at the supplied time.
   */
  GetValueDoubleDotAt(_time, out) {
    return quat.identity(out);
  }

  /**
   * Shifts the local curve start by a random offset inside `[-range, range]`.
   */
  RandomizeStart(range = 60) {
    const radius = range || 60;
    this.#offset = (Math.random() * 2 - 1) * radius;
  }

  /**
   * Scales local curve time.
   */
  ScaleTime(scale) {
    this.#timeScale = scale;
  }

  /**
   * Resets the local start time offset.
   */
  ResetStart() {
    this.#start = 0;
  }

  /**
   * Converts caller time into local child-curve time.
   */
  GetLocalTime(time) {
    return time / this.#timeScale;
  }

  /**
   * Converts a runtime numeric-seconds `Be::Time` value into start-aware local time.
   */
  GetStartAwareLocalTime(time) {
    if (this.#start === 0) {
      this.#start = time;
    }
    return (time - this.#start + this.#offset) / this.#timeScale;
  }
  static {
    _initClass();
  }
}

export { _Tr2RotationAdapter as Tr2RotationAdapter };
//# sourceMappingURL=Tr2RotationAdapter.js.map
