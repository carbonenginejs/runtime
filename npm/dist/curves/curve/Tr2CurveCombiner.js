import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_curves, _init_extra_curves, _init_currentValue, _init_extra_currentValue;

/**
 * Vector function returning the component-wise sum of every child vector
 * function sampled at the same time; its length is the longest child's length.
 */
let _Tr2CurveCombiner;
class Tr2CurveCombiner extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_curves, _init_extra_curves, _init_currentValue, _init_extra_currentValue, _initProto],
      c: [_Tr2CurveCombiner, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveCombiner",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.array({
      kind: "objectRef",
      className: "ITriVectorFunction"
    })], 16, "curves"], [[io, io.read, type, type.vec3], 16, "currentValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
  }
  name = (_initProto(this), _init_name(this, ""));
  curves = (_init_extra_name(this), _init_curves(this, []));
  currentValue = (_init_extra_curves(this), _init_currentValue(this, vec3.create()));
  #childValue = (_init_extra_currentValue(this), vec3.create());

  /**
   * Updates the cached sum of every child vector function.
   */
  UpdateValue(time) {
    vec3.zero(this.currentValue);
    for (const curve of this.curves) {
      curve.Update(time, this.#childValue);
      vec3.add(this.currentValue, this.currentValue, this.#childValue);
    }
  }

  /**
   * Gets the longest child curve length.
   */
  Length() {
    let maxLength = 0;
    for (const curve of this.curves) {
      const length = curve.Length?.();
      if (typeof length === "number") {
        maxLength = Math.max(length, maxLength);
      }
    }
    return maxLength;
  }

  /**
   * Gets the summed vector value at `time` into `out`.
   */
  GetValue(time, out) {
    return this.GetValueAt(time, out);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  Update(time, out) {
    this.UpdateValue(time);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the summed vector value at `time` into `out`.
   */
  GetValueAt(time, out) {
    vec3.zero(out);
    for (const curve of this.curves) {
      curve.GetValueAt(time, this.#childValue);
      vec3.add(out, out, this.#childValue);
    }
    return out;
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
   * Position interpolation stub retained for Carbon interface compatibility.
   */
  InterpolatedPosition(_time, out) {
    return out;
  }
  static {
    _initClass();
  }
}

export { _Tr2CurveCombiner as Tr2CurveCombiner };
//# sourceMappingURL=Tr2CurveCombiner.js.map
