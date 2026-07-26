import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_value, _init_extra_value, _init_curve, _init_extra_curve, _init_rotationOffset, _init_extra_rotationOffset, _init_currentValue, _init_extra_currentValue;

/**
 * Vector function wrapping a child vector curve behind its own time remapping
 * and rotating the sampled offset by a fixed rotation, falling back to a fixed
 * authored vector when no child curve is attached.
 */
let _Tr2TranslationAdapte;
class Tr2TranslationAdapter extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_curve, _init_extra_curve, _init_rotationOffset, _init_extra_rotationOffset, _init_currentValue, _init_extra_currentValue, _initProto],
      c: [_Tr2TranslationAdapte, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TranslationAdapter",
      family: "curves"
    })], [[[io, io.persist, type, type.vec3], 16, "value"], [[io, io.persist, void 0, type.objectRef("ITriVectorFunction")], 16, "curve"], [[io, io.persist, type, type.quat], 16, "rotationOffset"], [[io, io.read, type, type.vec3], 16, "currentValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "InterpolatedPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "RandomizeStart"], [[carbon, carbon.method, impl, impl.implemented], 18, "ScaleTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetStart"]], 0, void 0, CjsModel));
  }
  value = (_initProto(this), _init_value(this, vec3.create()));
  curve = (_init_extra_value(this), _init_curve(this, null));
  rotationOffset = (_init_extra_curve(this), _init_rotationOffset(this, quat.create()));
  currentValue = (_init_extra_rotationOffset(this), _init_currentValue(this, vec3.create()));
  #start = (_init_extra_currentValue(this), 0);
  #offset = 0;
  #timeScale = 1;
  #dotValue0 = vec3.create();
  #dotValue1 = vec3.create();

  /**
   * Updates the cached vector value when a child curve is attached.
   */
  UpdateValue(time) {
    if (this.curve) {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
  }

  /**
   * Updates the cached value, applies the rotation offset, and copies it into `out`.
   */
  Update(time, out) {
    if (this.curve) {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    } else {
      vec3.copy(this.currentValue, this.value);
    }
    vec3.transformQuat(this.currentValue, this.currentValue, this.rotationOffset);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the vector value at `time` into `out` without applying rotation offset.
   */
  GetValueAt(time, out) {
    if (this.curve) {
      return this.curve.GetValueAt(this.GetLocalTime(time), out);
    }
    return vec3.copy(out, this.value);
  }

  /**
   * Gets Carbon's backward finite-difference vector derivative.
   */
  GetValueDotAt(time, out) {
    if (!this.curve) {
      return vec3.zero(out);
    }
    const localTime = this.GetLocalTime(time);
    this.curve.GetValueAt(localTime, this.#dotValue0);
    this.curve.GetValueAt(localTime - 0.1, this.#dotValue1);
    vec3.subtract(out, this.#dotValue1, this.#dotValue0);
    return vec3.scale(out, out, 10);
  }

  /**
   * Gets the second derivative vector at the supplied time.
   */
  GetValueDoubleDotAt(_time, out) {
    return vec3.zero(out);
  }

  /**
   * Copies the last cached value into `out`.
   */
  InterpolatedPosition(_time, out) {
    return vec3.copy(out, this.currentValue);
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

export { _Tr2TranslationAdapte as Tr2TranslationAdapter };
//# sourceMappingURL=Tr2TranslationAdapter.js.map
