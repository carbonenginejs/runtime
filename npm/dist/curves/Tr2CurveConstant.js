import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { copyArrayLike } from '@carbonenginejs/runtime-utils/utils';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value, _init_currentValue, _init_extra_currentValue;

/**
 * Curve returning the same authored vec4 at every time, usable as a scalar,
 * vector, quaternion or color function; its derivatives are always zero
 * (identity for quaternions).
 */
let _Tr2CurveConstant;
new class extends _identity {
  static [class Tr2CurveConstant extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_value, _init_extra_value, _init_currentValue, _init_extra_currentValue, _initProto],
        c: [_Tr2CurveConstant, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CurveConstant",
        family: "curves"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec4], 16, "value"], [[io, io.read, type, type.vec4], 16, "currentValue"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "ScaleTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_currentValue(this);
    }
    name = (_initProto(this), _init_name(this, ""));
    value = (_init_extra_name(this), _init_value(this, vec4.create()));
    currentValue = (_init_extra_value(this), _init_currentValue(this, this.value));

    /**
     * Carbon no-op retained for function interface compatibility.
     */
    UpdateValue(_time) {}

    /**
     * Evaluates the constant scalar value.
     */

    /**
     * Copies the constant vector value into `out`.
     */

    /**
     * Copies the constant quaternion value into `out`.
     */

    /**
     * Copies the constant color value into `out`.
     */

    Update(time, out) {
      if (out === undefined) {
        return this.value[0];
      }
      return _Tr2CurveConstant.#copyValue(out, this.value);
    }

    /**
     * Gets the constant scalar value.
     */

    /**
     * Copies the constant vector value into `out`.
     */

    /**
     * Copies the constant quaternion value into `out`.
     */

    /**
     * Copies the constant color value into `out`.
     */

    GetValueAt(time, out) {
      if (out === undefined) {
        return this.value[0];
      }
      return _Tr2CurveConstant.#copyValue(out, this.value);
    }

    /**
     * Carbon no-op retained for scalar function interface compatibility.
     */
    ScaleTime(_scale) {}

    /**
     * Gets the first derivative vector or quaternion for the supplied time.
     */

    /**
     * Gets the first derivative vector or quaternion for the supplied time.
     */

    GetValueDotAt(_time, out) {
      return _Tr2CurveConstant.#setDerivative(out);
    }

    /**
     * Gets the second derivative vector or quaternion for the supplied time.
     */

    /**
     * Gets the second derivative vector or quaternion for the supplied time.
     */

    GetValueDoubleDotAt(_time, out) {
      return _Tr2CurveConstant.#setDerivative(out);
    }

    /**
     * Copies the constant vector value into `out`.
     */
    InterpolatedPosition(_time, out) {
      return vec3.copy(out, this.value);
    }

    /**
     * Copies as many components of the constant into the caller-owned `out` as it
     * can hold.
     */

    /**
     * Writes the zero derivative into `out`, using the identity quaternion for a
     * 4-component output and the zero vector otherwise.
     */
  }];
  #copyValue(out, value) {
    return copyArrayLike(out, value);
  }
  #setDerivative(out) {
    if (out.length > 3) {
      return quat.identity(out);
    }
    return vec3.zero(out);
  }
  constructor() {
    super(_Tr2CurveConstant), _initClass();
  }
}();

export { _Tr2CurveConstant as Tr2CurveConstant };
//# sourceMappingURL=Tr2CurveConstant.js.map
