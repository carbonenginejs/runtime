import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveInterpolation, Tr2CurveTangentType } from './enums.js';
import { Tr2CurveScalar as _Tr2CurveScalar } from './Tr2CurveScalar.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_x, _init_extra_x, _init_y, _init_extra_y, _init_currentValue, _init_extra_currentValue;

/**
 * Two-component vector curve composed of independent scalar curves for x and y;
 * its length is the longer of the two.
 */
let _Tr2CurveVector;
class Tr2CurveVector2 extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_x, _init_extra_x, _init_y, _init_extra_y, _init_currentValue, _init_extra_currentValue, _initProto],
      c: [_Tr2CurveVector, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveVector2",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "x"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "y"], [[io, io.read, type, type.vec2], 16, "currentValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetExtrapolation"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_currentValue(this);
  }
  name = (_initProto(this), _init_name(this, ""));
  x = (_init_extra_name(this), _init_x(this, new _Tr2CurveScalar()));
  y = (_init_extra_x(this), _init_y(this, new _Tr2CurveScalar()));
  currentValue = (_init_extra_y(this), _init_currentValue(this, vec2.create()));

  /**
   * Updates the cached vector value by updating each scalar component curve.
   */
  UpdateValue(time) {
    this.currentValue[0] = this.x.Update(time);
    this.currentValue[1] = this.y.Update(time);
  }

  /**
   * Gets the longest scalar component curve length.
   */
  Length() {
    return Math.max(this.x.Length(), this.y.Length());
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
  }

  /**
   * Sets extrapolation on all scalar component curves.
   */
  SetExtrapolation(extrapolation) {
    this.x.SetExtrapolation(extrapolation);
    this.y.SetExtrapolation(extrapolation);
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  GetValueAt(time, out) {
    out[0] = this.x.GetValue(time);
    out[1] = this.y.GetValue(time);
    return out;
  }
  static {
    _initClass();
  }
}

export { _Tr2CurveVector as Tr2CurveVector2 };
//# sourceMappingURL=Tr2CurveVector2.js.map
