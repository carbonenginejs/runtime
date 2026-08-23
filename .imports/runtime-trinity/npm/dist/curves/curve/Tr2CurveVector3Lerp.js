import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveVector3LerpKeyInterpolation } from '../enums.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_initialValue, _init_extra_initialValue, _init_currentValue, _init_extra_currentValue, _init_curveStartTime, _init_extra_curveStartTime, _init_startInterpolation, _init_extra_startInterpolation, _init_curve, _init_extra_curve;

/**
 * Vector curve that eases from a fixed initial value into a child vector curve,
 * blending over the interval ending at curveStartTime with the configured start
 * interpolation.
 */
let _Tr2CurveVector3Lerp;
new class extends _identity {
  static [class Tr2CurveVector3Lerp extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_initialValue, _init_extra_initialValue, _init_currentValue, _init_extra_currentValue, _init_curveStartTime, _init_extra_curveStartTime, _init_startInterpolation, _init_extra_startInterpolation, _init_curve, _init_extra_curve, _initProto],
        c: [_Tr2CurveVector3Lerp, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CurveVector3Lerp",
        family: "curves"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.readwrite, type, type.vec3], 16, "initialValue"], [[io, io.read, type, type.vec3], 16, "currentValue"], [[io, io.persist, type, type.float32], 16, "curveStartTime"], [[io, io.readwrite, type, type.uint32, void 0, type.enum("Tr2CurveVector3LerpKeyInterpolation")], 16, "startInterpolation"], [[io, io.persist, void 0, type.objectRef("ITriVectorFunction")], 16, "curve"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));
    initialValue = (_init_extra_name(this), _init_initialValue(this, vec3.create()));
    currentValue = (_init_extra_initialValue(this), _init_currentValue(this, vec3.create()));
    curveStartTime = (_init_extra_currentValue(this), _init_curveStartTime(this, 1));
    startInterpolation = (_init_extra_curveStartTime(this), _init_startInterpolation(this, Tr2CurveVector3LerpKeyInterpolation.HERMITE));
    curve = (_init_extra_startInterpolation(this), _init_curve(this, null));
    #curveStartValue = (_init_extra_curve(this), vec3.create());
    #zeroTangent = vec3.create();

    /**
     * Updates the cached vector value for the supplied time.
     */
    UpdateValue(time) {
      this.GetValueAt(time, this.currentValue);
    }

    /**
     * Gets the vector value at `time` into `out`.
     */
    GetValue(time, out) {
      return this.GetValueAt(time, out);
    }

    /**
     * Updates the cached value and copies it into `out`.
     */
    Update(time, out) {
      this.GetValueAt(time, this.currentValue);
      return vec3.copy(out, this.currentValue);
    }

    /**
     * Gets the vector value at `time` into `out`.
     */
    GetValueAt(time, out) {
      if (!this.curve) {
        return vec3.copy(out, this.initialValue);
      }
      if (time < this.curveStartTime && this.curveStartTime > 0) {
        return this.LerpToFirstKey(out, time);
      }
      return this.curve.GetValueAt(time - this.curveStartTime, out);
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

    /**
     * Blends from the authored initial value to the child curve's first value.
     */
    LerpToFirstKey(out, time) {
      if (!this.curve) {
        return vec3.copy(out, this.initialValue);
      }
      this.curve.GetValueAt(0, this.#curveStartValue);
      if (this.curveStartTime <= 0) {
        return vec3.copy(out, this.#curveStartValue);
      }
      const ratio = time / this.curveStartTime;
      if (this.startInterpolation === Tr2CurveVector3LerpKeyInterpolation.LINEAR) {
        return vec3.lerp(out, this.initialValue, this.#curveStartValue, ratio);
      }
      return vec3.hermite(out, this.initialValue, this.#zeroTangent, this.#zeroTangent, this.#curveStartValue, ratio);
    }
  }];
  Tr2CurveVector3LerpKeyInterpolation = Tr2CurveVector3LerpKeyInterpolation;
  constructor() {
    super(_Tr2CurveVector3Lerp), _initClass();
  }
}();

export { _Tr2CurveVector3Lerp as Tr2CurveVector3Lerp };
//# sourceMappingURL=Tr2CurveVector3Lerp.js.map
