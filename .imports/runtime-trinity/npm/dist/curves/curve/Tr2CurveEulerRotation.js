import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat, fromYawPitchRoll } from '@carbonenginejs/runtime-utils/quat';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveInterpolation, Tr2CurveTangentType } from '../enums.js';
import { Tr2CurveScalar as _Tr2CurveScalar } from './Tr2CurveScalar.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_yaw, _init_extra_yaw, _init_pitch, _init_extra_pitch, _init_roll, _init_extra_roll, _init_currentValue, _init_extra_currentValue;

/**
 * Quaternion curve built from three scalar curves supplying yaw, pitch and roll
 * in radians.
 */
let _Tr2CurveEulerRotatio;
class Tr2CurveEulerRotation extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_yaw, _init_extra_yaw, _init_pitch, _init_extra_pitch, _init_roll, _init_extra_roll, _init_currentValue, _init_extra_currentValue, _initProto],
      c: [_Tr2CurveEulerRotatio, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveEulerRotation",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "yaw"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "pitch"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "roll"], [[io, io.read, type, type.quat], 16, "currentValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetExtrapolation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_currentValue(this);
  }
  name = (_initProto(this), _init_name(this, ""));
  yaw = (_init_extra_name(this), _init_yaw(this, new _Tr2CurveScalar()));
  pitch = (_init_extra_yaw(this), _init_pitch(this, new _Tr2CurveScalar()));
  roll = (_init_extra_pitch(this), _init_roll(this, new _Tr2CurveScalar()));
  currentValue = (_init_extra_roll(this), _init_currentValue(this, quat.create()));

  /**
   * Updates the cached quaternion value by updating each scalar component curve.
   */
  UpdateValue(time) {
    const yaw = this.yaw.Update(time),
      pitch = this.pitch.Update(time),
      roll = this.roll.Update(time);
    fromYawPitchRoll(this.currentValue, yaw, pitch, roll);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  Update(time, out) {
    this.GetValueAt(time, this.currentValue);
    return quat.copy(out, this.currentValue);
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   */
  GetValueAt(time, out) {
    return fromYawPitchRoll(out, this.yaw.GetValue(time), this.pitch.GetValue(time), this.roll.GetValue(time));
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
   * Gets the longest scalar component curve length.
   */
  Length() {
    return Math.max(this.yaw.Length(), this.pitch.Length(), this.roll.Length());
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   */
  GetValue(time, out) {
    return this.GetValueAt(time, out);
  }

  /**
   * Adds one Euler key by adding matching scalar keys to each component curve.
   */
  AddKey(time, value, interpolation = Tr2CurveInterpolation.HERMITE, leftTangent, rightTangent, tangentType = Tr2CurveTangentType.AUTO_CLAMP) {
    const useRightTangent = !!leftTangent && !!rightTangent;
    this.yaw.AddKey(time, value[0], interpolation, leftTangent?.[0] ?? 0, useRightTangent ? rightTangent[0] : 0, tangentType);
    this.pitch.AddKey(time, value[1], interpolation, leftTangent?.[1] ?? 0, useRightTangent ? rightTangent[1] : 0, tangentType);
    this.roll.AddKey(time, value[2], interpolation, leftTangent?.[2] ?? 0, useRightTangent ? rightTangent[2] : 0, tangentType);
  }

  /**
   * Sets extrapolation on all scalar component curves.
   */
  SetExtrapolation(extrapolation) {
    this.yaw.SetExtrapolation(extrapolation);
    this.pitch.SetExtrapolation(extrapolation);
    this.roll.SetExtrapolation(extrapolation);
  }
  static {
    _initClass();
  }
}

export { _Tr2CurveEulerRotatio as Tr2CurveEulerRotation };
//# sourceMappingURL=Tr2CurveEulerRotation.js.map
