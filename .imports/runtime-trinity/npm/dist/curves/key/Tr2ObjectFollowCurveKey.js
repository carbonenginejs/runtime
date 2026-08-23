import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2FollowCurveKeyInterpolation, RotationSetting } from '../enums.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_object, _init_extra_object, _init_time, _init_extra_time, _init_interpolation, _init_extra_interpolation, _init_leftTangent, _init_extra_leftTangent, _init_rightTangent, _init_extra_rightTangent, _init_rotatedLeftTangent, _init_extra_rotatedLeftTangent, _init_rotatedRightTangent, _init_extra_rotatedRightTangent, _init_offsetLocatorName, _init_extra_offsetLocatorName, _init_offset, _init_extra_offset, _init_rotationSetting, _init_extra_rotationSetting;

/**
 * Follow-curve key positioned by another object rather than a fixed point,
 * taking its place from that object's locator or offset and optionally rotating
 * its tangents with the object.
 */
let _Tr2ObjectFollowCurve;
new class extends _identity {
  static [class Tr2ObjectFollowCurveKey extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_object, _init_extra_object, _init_time, _init_extra_time, _init_interpolation, _init_extra_interpolation, _init_leftTangent, _init_extra_leftTangent, _init_rightTangent, _init_extra_rightTangent, _init_rotatedLeftTangent, _init_extra_rotatedLeftTangent, _init_rotatedRightTangent, _init_extra_rotatedRightTangent, _init_offsetLocatorName, _init_extra_offsetLocatorName, _init_offset, _init_extra_offset, _init_rotationSetting, _init_extra_rotationSetting, _initProto],
        c: [_Tr2ObjectFollowCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ObjectFollowCurveKey",
        family: "curves"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("IRoot")], 16, "object"], [[io, io.persist, type, type.float32], 16, "time"], [[io, io.persist, type, type.int32, void 0, type.enum("Tr2FollowCurveKeyInterpolation")], 16, "interpolation"], [[io, io.persist, type, type.vec3], 16, "leftTangent"], [[io, io.persist, type, type.vec3], 16, "rightTangent"], [[io, io.read, type, type.vec3], 16, "rotatedLeftTangent"], [[io, io.read, type, type.vec3], 16, "rotatedRightTangent"], [[io, io.notify, io, io.persist, type, type.string], 16, "offsetLocatorName"], [[io, io.persist, type, type.vec3], 16, "offset"], [[io, io.persist, type, type.int32, void 0, type.enum("RotationSetting")], 16, "rotationSetting"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInterpolationType"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetLeftTangent"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetRightTangent"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));
    object = (_init_extra_name(this), _init_object(this, null));
    time = (_init_extra_object(this), _init_time(this, 0));
    interpolation = (_init_extra_time(this), _init_interpolation(this, Tr2FollowCurveKeyInterpolation.LINEAR));
    leftTangent = (_init_extra_interpolation(this), _init_leftTangent(this, vec3.create()));
    rightTangent = (_init_extra_leftTangent(this), _init_rightTangent(this, vec3.create()));
    rotatedLeftTangent = (_init_extra_rightTangent(this), _init_rotatedLeftTangent(this, vec3.create()));
    rotatedRightTangent = (_init_extra_rotatedLeftTangent(this), _init_rotatedRightTangent(this, vec3.create()));
    offsetLocatorName = (_init_extra_rotatedRightTangent(this), _init_offsetLocatorName(this, ""));
    offset = (_init_extra_offsetLocatorName(this), _init_offset(this, vec3.create()));
    rotationSetting = (_init_extra_offset(this), _init_rotationSetting(this, RotationSetting.NO_ROTATION));
    #locator = (_init_extra_rotationSetting(this), null);
    #offset = vec3.create();
    #rotation = quat.create();

    /**
     * Resolves the current locator cache.
     */
    Initialize() {
      this.#locator = this.GetLocator();
      return true;
    }

    /**
     * Re-resolves the locator after object or locator-name changes.
     */
    OnModified() {
      this.#locator = this.GetLocator();
      return true;
    }

    /**
     * Gets the key time.
     */
    GetTime() {
      return this.time;
    }

    /**
     * Gets the segment interpolation mode starting at this key.
     */
    GetInterpolationType() {
      return this.interpolation;
    }

    /**
     * Gets the rotated left tangent into `out`.
     */
    GetLeftTangent(out) {
      return vec3.copy(out, this.rotatedLeftTangent);
    }

    /**
     * Gets the rotated right tangent into `out`.
     */
    GetRightTangent(out) {
      return vec3.copy(out, this.rotatedRightTangent);
    }

    /**
     * Gets the followed object position plus local offset into `out`.
     */
    GetValue(out) {
      if (!this.object) {
        return vec3.copy(out, this.offset);
      }
      vec3.copy(this.#offset, this.offset);
      if (this.#locator) {
        vec3.add(this.#offset, this.#offset, this.#locator.position);
      }
      const rotation = this.GetRotation();
      this.TransformByRotation(this.rotatedLeftTangent, this.leftTangent, rotation);
      this.TransformByRotation(this.rotatedRightTangent, this.rightTangent, rotation);
      this.TransformByRotation(out, this.#offset, rotation);
      const worldPosition = this.GetWorldPosition();
      if (worldPosition) {
        vec3.add(out, worldPosition, out);
      }
      return out;
    }

    /**
     * Finds the first locator in the requested Carbon locator set.
     */
    GetLocator() {
      const object = this.object;
      if (!object || this.offsetLocatorName === "") {
        return null;
      }
      const methodLocators = object.GetLocatorsForSet?.(this.offsetLocatorName);
      if (methodLocators && methodLocators.length > 0) {
        return methodLocators[0] ?? null;
      }
      const set = object.locatorSets?.find(entry => entry.name === this.offsetLocatorName);
      return set?.locators[0] ?? null;
    }

    /**
     * Gets the active rotation as a normalized quaternion, when any applies.
     */
    GetRotation() {
      switch (this.rotationSetting) {
        case RotationSetting.LOCATOR_ROTATION:
          if (this.#locator) {
            return quat.normalize(this.#rotation, this.#locator.direction);
          }
          break;
        case RotationSetting.MODEL_ROTATION:
          {
            const rotation = this.object?.GetWorldRotation?.() ?? this.object?.worldRotation;
            if (rotation) {
              return quat.normalize(this.#rotation, rotation);
            }
            break;
          }
      }
      return null;
    }

    /**
     * Gets the followed object's world position, if it exposes one.
     */
    GetWorldPosition() {
      return this.object?.GetWorldPosition?.() ?? this.object?.worldPosition ?? null;
    }

    /**
     * Applies a pure rotation transform, or copies unchanged for identity.
     */
    TransformByRotation(out, value, rotation) {
      if (!rotation) {
        return vec3.copy(out, value);
      }
      return vec3.transformQuat(out, value, rotation);
    }
  }];
  RotationSetting = RotationSetting;
  Tr2FollowCurveKeyInterpolation = Tr2FollowCurveKeyInterpolation;
  constructor() {
    super(_Tr2ObjectFollowCurve), _initClass();
  }
}();

export { _Tr2ObjectFollowCurve as Tr2ObjectFollowCurveKey };
//# sourceMappingURL=Tr2ObjectFollowCurveKey.js.map
