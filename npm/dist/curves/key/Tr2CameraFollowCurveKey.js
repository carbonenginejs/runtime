import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2FollowCurveKeyInterpolation } from '../enums.js';

let _initProto, _initClass, _init_interpolation, _init_extra_interpolation, _init_fovMultiplication, _init_extra_fovMultiplication, _init_offset, _init_extra_offset, _init_enabled, _init_extra_enabled, _init_name, _init_extra_name, _init_angleZero, _init_extra_angleZero, _init_angle, _init_extra_angle, _init_objectBounds, _init_extra_objectBounds, _init_leftTangent, _init_extra_leftTangent, _init_boxPosition, _init_extra_boxPosition, _init_rightTangent, _init_extra_rightTangent, _init_rotatedLeftTangent, _init_extra_rotatedLeftTangent, _init_rotatedRightTangent, _init_extra_rotatedRightTangent, _init_time, _init_extra_time;

/**
 * Key of a camera follow curve, holding the camera offset and its tangents plus
 * the field-of-view multiplier and framing angles used to place the camera box
 * at that point in time.
 */
let _Tr2CameraFollowCurve;
new class extends _identity {
  static [class Tr2CameraFollowCurveKey extends CjsModel {
    static {
      ({
        e: [_init_interpolation, _init_extra_interpolation, _init_fovMultiplication, _init_extra_fovMultiplication, _init_offset, _init_extra_offset, _init_enabled, _init_extra_enabled, _init_name, _init_extra_name, _init_angleZero, _init_extra_angleZero, _init_angle, _init_extra_angle, _init_objectBounds, _init_extra_objectBounds, _init_leftTangent, _init_extra_leftTangent, _init_boxPosition, _init_extra_boxPosition, _init_rightTangent, _init_extra_rightTangent, _init_rotatedLeftTangent, _init_extra_rotatedLeftTangent, _init_rotatedRightTangent, _init_extra_rotatedRightTangent, _init_time, _init_extra_time, _initProto],
        c: [_Tr2CameraFollowCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CameraFollowCurveKey",
        family: "curves"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Tr2FollowCurveKeyInterpolation")], 16, "interpolation"], [[io, io.notify, io, io.persist, type, type.float32], 16, "fovMultiplication"], [[io, io.persist, type, type.vec3], 16, "offset"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "angleZero"], [[io, io.persist, type, type.float32], 16, "angle"], [[io, io.readwrite, type, type.vec3], 16, "objectBounds"], [[io, io.persist, type, type.vec3], 16, "leftTangent"], [[io, io.read, type, type.vec3], 16, "boxPosition"], [[io, io.persist, type, type.vec3], 16, "rightTangent"], [[io, io.read, type, type.vec3], 16, "rotatedLeftTangent"], [[io, io.read, type, type.vec3], 16, "rotatedRightTangent"], [[io, io.persist, type, type.float32], 16, "time"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "CalculateBoxPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInterpolationType"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetLeftTangent"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetRightTangent"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_time(this);
    }
    interpolation = (_initProto(this), _init_interpolation(this, Tr2FollowCurveKeyInterpolation.LINEAR));
    fovMultiplication = (_init_extra_interpolation(this), _init_fovMultiplication(this, 0.5));
    offset = (_init_extra_fovMultiplication(this), _init_offset(this, vec3.create()));
    enabled = (_init_extra_offset(this), _init_enabled(this, true));
    name = (_init_extra_enabled(this), _init_name(this, ""));
    angleZero = (_init_extra_name(this), _init_angleZero(this, Math.PI / 2));
    angle = (_init_extra_angleZero(this), _init_angle(this, 0));
    objectBounds = (_init_extra_angle(this), _init_objectBounds(this, vec3.create()));
    leftTangent = (_init_extra_objectBounds(this), _init_leftTangent(this, vec3.create()));
    boxPosition = (_init_extra_leftTangent(this), _init_boxPosition(this, vec3.create()));
    rightTangent = (_init_extra_boxPosition(this), _init_rightTangent(this, vec3.create()));
    rotatedLeftTangent = (_init_extra_rightTangent(this), _init_rotatedLeftTangent(this, vec3.create()));
    rotatedRightTangent = (_init_extra_rotatedLeftTangent(this), _init_rotatedRightTangent(this, vec3.create()));
    time = (_init_extra_rotatedRightTangent(this), _init_time(this, 0));

    /**
     * Initializes derived camera-box values.
     */
    Initialize() {
      this.CalculateBoxPosition();
      return true;
    }

    /**
     * Recalculates derived values after modification.
     */
    OnModified(_options = {}) {
      this.fovMultiplication = Math.min(0.999, Math.max(0.001, this.fovMultiplication));
      this.CalculateBoxPosition();
      return true;
    }

    /**
     * Updates camera box/tangent positions.
     */
    CalculateBoxPosition() {
      vec3.copy(this.boxPosition, this.offset);
      vec3.copy(this.rotatedLeftTangent, this.leftTangent);
      vec3.copy(this.rotatedRightTangent, this.rightTangent);
    }

    /**
     * Gets key value.
     */
    GetValue(out) {
      this.CalculateBoxPosition();
      return vec3.copy(out, this.boxPosition);
    }

    /**
     * Gets key time.
     */
    GetTime() {
      return this.time;
    }

    /**
     * Gets key interpolation.
     */
    GetInterpolationType() {
      return this.interpolation;
    }

    /**
     * Gets left tangent.
     */
    GetLeftTangent(out) {
      return vec3.copy(out, this.rotatedLeftTangent);
    }

    /**
     * Gets right tangent.
     */
    GetRightTangent(out) {
      return vec3.copy(out, this.rotatedRightTangent);
    }
  }];
  Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;
  constructor() {
    super(_Tr2CameraFollowCurve), _initClass();
  }
}();

export { _Tr2CameraFollowCurve as Tr2CameraFollowCurveKey };
//# sourceMappingURL=Tr2CameraFollowCurveKey.js.map
