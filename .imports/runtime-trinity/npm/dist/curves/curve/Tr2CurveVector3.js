import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveInterpolation, Tr2CurveTangentType } from '../enums.js';
import { Tr2CurveScalar as _Tr2CurveScalar } from './Tr2CurveScalar.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_x, _init_extra_x, _init_y, _init_extra_y, _init_z, _init_extra_z, _init_currentValue, _init_extra_currentValue;

/**
 * Three-component vector curve composed of independent scalar curves for x, y
 * and z; its length is the longest of the three.
 */
let _Tr2CurveVector;
class Tr2CurveVector3 extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_x, _init_extra_x, _init_y, _init_extra_y, _init_z, _init_extra_z, _init_currentValue, _init_extra_currentValue, _initProto],
      c: [_Tr2CurveVector, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveVector3",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "x"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "y"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "z"], [[io, io.read, type, type.vec3], 16, "currentValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetExtrapolation"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_currentValue(this);
  }
  name = (_initProto(this), _init_name(this, ""));
  x = (_init_extra_name(this), _init_x(this, new _Tr2CurveScalar()));
  y = (_init_extra_x(this), _init_y(this, new _Tr2CurveScalar()));
  z = (_init_extra_y(this), _init_z(this, new _Tr2CurveScalar()));
  currentValue = (_init_extra_z(this), _init_currentValue(this, vec3.create()));

  /**
   * Updates the cached vector value by updating each scalar component curve.
   */
  UpdateValue(time) {
    this.currentValue[0] = this.x.Update(time);
    this.currentValue[1] = this.y.Update(time);
    this.currentValue[2] = this.z.Update(time);
  }

  /**
   * Gets the longest scalar component curve length.
   */
  Length() {
    return Math.max(this.x.Length(), this.y.Length(), this.z.Length());
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  GetValue(time, out) {
    return this.GetValueAt(time, out);
  }

  /**
   * Adds one vector key by adding matching scalar keys to each component curve.
   */
  AddKey(time, value, interpolation = Tr2CurveInterpolation.HERMITE, leftTangent, rightTangent, tangentType = Tr2CurveTangentType.AUTO_CLAMP) {
    const useRightTangent = !!leftTangent && !!rightTangent;
    this.x.AddKey(time, value[0], interpolation, leftTangent?.[0] ?? 0, useRightTangent ? rightTangent[0] : 0, tangentType);
    this.y.AddKey(time, value[1], interpolation, leftTangent?.[1] ?? 0, useRightTangent ? rightTangent[1] : 0, tangentType);
    this.z.AddKey(time, value[2], interpolation, leftTangent?.[2] ?? 0, useRightTangent ? rightTangent[2] : 0, tangentType);
  }

  /**
   * Sets extrapolation on all scalar component curves.
   */
  SetExtrapolation(extrapolation) {
    this.x.SetExtrapolation(extrapolation);
    this.y.SetExtrapolation(extrapolation);
    this.z.SetExtrapolation(extrapolation);
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
    out[0] = this.x.GetValue(time);
    out[1] = this.y.GetValue(time);
    out[2] = this.z.GetValue(time);
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

export { _Tr2CurveVector as Tr2CurveVector3 };
//# sourceMappingURL=Tr2CurveVector3.js.map
