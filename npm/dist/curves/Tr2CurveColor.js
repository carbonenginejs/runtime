import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveInterpolation, Tr2CurveTangentType } from './enums.js';
import { Tr2CurveScalar as _Tr2CurveScalar } from './Tr2CurveScalar.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_srgbOutput, _init_extra_srgbOutput, _init_r, _init_extra_r, _init_g, _init_extra_g, _init_b, _init_extra_b, _init_a, _init_extra_a, _init_timeOffset, _init_extra_timeOffset, _init_currentValue, _init_extra_currentValue;
const CLAMP_MIN = vec4.create();

/**
 * Color curve composed of four independent scalar curves for r, g, b and a,
 * sampled at time minus timeOffset; an empty alpha curve yields 1, and the
 * result is converted to gamma space when srgbOutput is set.
 */
let _Tr2CurveColor;
class Tr2CurveColor extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_srgbOutput, _init_extra_srgbOutput, _init_r, _init_extra_r, _init_g, _init_extra_g, _init_b, _init_extra_b, _init_a, _init_extra_a, _init_timeOffset, _init_extra_timeOffset, _init_currentValue, _init_extra_currentValue, _initProto],
      c: [_Tr2CurveColor, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveColor",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "srgbOutput"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "r"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "g"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "b"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "a"], [[io, io.persist, type, type.float32], 16, "timeOffset"], [[io, io.read, type, type.color], 16, "currentValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetExtrapolation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_currentValue(this);
  }
  name = (_initProto(this), _init_name(this, ""));
  srgbOutput = (_init_extra_name(this), _init_srgbOutput(this, false));
  r = (_init_extra_srgbOutput(this), _init_r(this, new _Tr2CurveScalar()));
  g = (_init_extra_r(this), _init_g(this, new _Tr2CurveScalar()));
  b = (_init_extra_g(this), _init_b(this, new _Tr2CurveScalar()));
  a = (_init_extra_b(this), _init_a(this, new _Tr2CurveScalar()));
  timeOffset = (_init_extra_a(this), _init_timeOffset(this, 0));
  currentValue = (_init_extra_timeOffset(this), _init_currentValue(this, vec4.createLinear()));

  /**
   * Updates the cached color value by updating each scalar component curve.
   */
  UpdateValue(time) {
    const t = time - this.timeOffset;
    this.currentValue[0] = this.r.Update(t);
    this.currentValue[1] = this.g.Update(t);
    this.currentValue[2] = this.b.Update(t);
    this.currentValue[3] = this.a.IsEmpty() ? 1 : this.a.Update(t);
    if (this.srgbOutput) {
      vec3.linearToGamma(this.currentValue, this.currentValue);
    }
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  Update(time, out) {
    this.GetValueAt(time, this.currentValue);
    return vec4.copy(out, this.currentValue);
  }

  /**
   * Gets the color value at `time` into `out`.
   */
  GetValueAt(time, out) {
    const t = time - this.timeOffset;
    out[0] = this.r.GetValue(t);
    out[1] = this.g.GetValue(t);
    out[2] = this.b.GetValue(t);
    out[3] = this.a.IsEmpty() ? 1 : this.a.GetValue(t);
    if (this.srgbOutput) {
      vec4.zero(CLAMP_MIN);
      vec4.max(out, out, CLAMP_MIN);
      vec3.linearToGamma(out, out);
    }
    return out;
  }

  /**
   * Gets the longest scalar component curve length.
   */
  Length() {
    return Math.max(this.r.Length(), this.g.Length(), this.b.Length(), this.a.Length());
  }

  /**
   * Gets the color value at `time` into `out`.
   */
  GetValue(time, out) {
    return this.GetValueAt(time, out);
  }

  /**
   * Adds one color key by adding matching scalar keys to each component curve.
   */
  AddKey(time, value, interpolation = Tr2CurveInterpolation.HERMITE, leftTangent, rightTangent, tangentType = Tr2CurveTangentType.AUTO_CLAMP) {
    const useRightTangent = !!leftTangent && !!rightTangent;
    this.r.AddKey(time, value[0], interpolation, leftTangent?.[0] ?? 0, useRightTangent ? rightTangent[0] : 0, tangentType);
    this.g.AddKey(time, value[1], interpolation, leftTangent?.[1] ?? 0, useRightTangent ? rightTangent[1] : 0, tangentType);
    this.b.AddKey(time, value[2], interpolation, leftTangent?.[2] ?? 0, useRightTangent ? rightTangent[2] : 0, tangentType);
    this.a.AddKey(time, value[3], interpolation, leftTangent?.[3] ?? 0, useRightTangent ? rightTangent[3] : 0, tangentType);
  }

  /**
   * Sets extrapolation on all scalar component curves.
   */
  SetExtrapolation(extrapolation) {
    this.r.SetExtrapolation(extrapolation);
    this.g.SetExtrapolation(extrapolation);
    this.b.SetExtrapolation(extrapolation);
    this.a.SetExtrapolation(extrapolation);
  }
  static {
    _initClass();
  }
}

export { _Tr2CurveColor as Tr2CurveColor };
//# sourceMappingURL=Tr2CurveColor.js.map
