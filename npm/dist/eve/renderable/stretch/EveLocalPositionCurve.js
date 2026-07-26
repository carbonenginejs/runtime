import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_behavior, _init_extra_behavior, _init_impactSize, _init_extra_impactSize, _init_offset, _init_extra_offset, _init_positionOffset, _init_extra_positionOffset, _init_parentPositionCurve, _init_extra_parentPositionCurve, _init_alignPositionCurve, _init_extra_alignPositionCurve, _init_value, _init_extra_value, _init_boundingSize, _init_extra_boundingSize, _init_parentRotationCurve, _init_extra_parentRotationCurve, _init_parent, _init_extra_parent, _init_turretSetObject, _init_extra_turretSetObject, _init_muzzleIndex, _init_extra_muzzleIndex, _init_damageLocatorIndex, _init_extra_damageLocatorIndex, _init_locatorIndex, _init_extra_locatorIndex, _init_locatorSetName, _init_extra_locatorSetName;

/**
 * A vector function that computes a point local to a model - a point on its
 * bounding hull, a damage or firing locator, a turret muzzle, or an authored
 * offset - selected by an authored behaviour.
 */
let _EveLocalPositionCurv;
new class extends _identity {
  static [class EveLocalPositionCurve extends CjsModel {
    static {
      ({
        e: [_init_behavior, _init_extra_behavior, _init_impactSize, _init_extra_impactSize, _init_offset, _init_extra_offset, _init_positionOffset, _init_extra_positionOffset, _init_parentPositionCurve, _init_extra_parentPositionCurve, _init_alignPositionCurve, _init_extra_alignPositionCurve, _init_value, _init_extra_value, _init_boundingSize, _init_extra_boundingSize, _init_parentRotationCurve, _init_extra_parentRotationCurve, _init_parent, _init_extra_parent, _init_turretSetObject, _init_extra_turretSetObject, _init_muzzleIndex, _init_extra_muzzleIndex, _init_damageLocatorIndex, _init_extra_damageLocatorIndex, _init_locatorIndex, _init_extra_locatorIndex, _init_locatorSetName, _init_extra_locatorSetName, _initProto],
        c: [_EveLocalPositionCurv, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveLocalPositionCurve",
        family: "eve/renderable/stretch"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("LocalPositionBehavior")], 16, "behavior"], [[io, io.readwrite, type, type.float32], 16, "impactSize"], [[io, io.persist, type, type.float32], 16, "offset"], [[io, io.persist, type, type.vec3], 16, "positionOffset"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "parentPositionCurve"], [[io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "alignPositionCurve"], [[io, io.persist, type, type.vec3], 16, "value"], [[io, io.persist, type, type.vec3], 16, "boundingSize"], [[io, io.readwrite, void 0, type.objectRef("ITriQuaternionFunction")], 16, "parentRotationCurve"], [[io, io.readwrite, void 0, type.objectRef("IEveSpaceObject2")], 16, "parent"], [[io, io.readwrite, void 0, type.objectRef("EveTurretSet")], 16, "turretSetObject"], [[io, io.readwrite, type, type.int32], 16, "muzzleIndex"], [[io, io.read, type, type.int32], 16, "damageLocatorIndex"], [[io, io.readwrite, type, type.int32], 16, "locatorIndex"], [[io, io.readwrite, type, type.string], 16, "locatorSetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetBehavior"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon overloads Be::Time and double; JavaScript has one numeric time domain and follows the org out-last convention.")], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript uses CarbonEngineJS's standard time-first, out-last curve convention.")], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Vector3d is represented by any three-element numeric output buffer in JavaScript.")], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
    }
    behavior = (_initProto(this), _init_behavior(this, 0));
    impactSize = (_init_extra_behavior(this), _init_impactSize(this, 1));
    offset = (_init_extra_impactSize(this), _init_offset(this, 0));
    positionOffset = (_init_extra_offset(this), _init_positionOffset(this, vec3.create()));
    parentPositionCurve = (_init_extra_positionOffset(this), _init_parentPositionCurve(this, null));
    alignPositionCurve = (_init_extra_parentPositionCurve(this), _init_alignPositionCurve(this, null));
    value = (_init_extra_alignPositionCurve(this), _init_value(this, vec3.create()));
    boundingSize = (_init_extra_value(this), _init_boundingSize(this, vec3.create()));
    parentRotationCurve = (_init_extra_boundingSize(this), _init_parentRotationCurve(this, null));
    parent = (_init_extra_parentRotationCurve(this), _init_parent(this, null));
    turretSetObject = (_init_extra_parent(this), _init_turretSetObject(this, null));
    muzzleIndex = (_init_extra_turretSetObject(this), _init_muzzleIndex(this, 0));
    damageLocatorIndex = (_init_extra_muzzleIndex(this), _init_damageLocatorIndex(this, -1));
    locatorIndex = (_init_extra_damageLocatorIndex(this), _init_locatorIndex(this, -1));
    locatorSetName = (_init_extra_locatorIndex(this), _init_locatorSetName(this, ""));
    #impactEffectIndex = (_init_extra_locatorSetName(this), -1);

    /** Post-construction hook that selects the behaviour, defaulting to POS_NONE. */
    __init__(behavior = _EveLocalPositionCurv.LocalPositionBehavior.POS_NONE) {
      this.SetBehavior(behavior);
    }

    /**
     * Selects which of the LocalPositionBehavior calculations this curve
     * evaluates.
     */
    SetBehavior(behavior) {
      this.behavior = Number(behavior) | 0;
    }

    /**
     * Evaluates the selected behaviour at time.
     * @param {Array} [out] - caller-owned vec3; defaults to the curve's own value field, so callers that pass nothing update it in place. Under POS_NONE the incoming out is stored as the curve's value and returned unchanged.
     * @returns {Array} out
     */
    Update(time, out = this.value) {
      switch (this.behavior) {
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_NEAREST_BOUNDING_POINT:
          return this.CalculateNearestBoundingPoint(time, out);
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_CENTER_BOUNDING_POINT:
          return this.GetCenterBoundingSphere(time, out);
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_TARGET_DMG_LOCATOR:
          return this.GetDamageLocator(time, out);
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_TARGET_DMG_LOCATOR_IMPACT:
          return this.GetDamageLocatorImpact(time, out);
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_OFFSET_POSITION:
          return this.CalculateOffsetPosition(time, out);
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_OFFSET_PLANE_ROTATION:
          return this.CalculateOffsetPlaneRotation(time, out);
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_NEAREST_FIRING_LOCATOR:
          return this.GetNearestFiringLocator(time, out);
        case _EveLocalPositionCurv.LocalPositionBehavior.POS_ACTIVE_TURRET:
          return this.GetFiringTurretPosition(time, out);
        default:
          vec3.copy(this.value, out);
          return out;
      }
    }

    /**
     * Seeds out with the last stored value and re-evaluates the behaviour at time, unlike the pure accessors on the simpler curves.
     * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
     * @returns {Array} out
     */
    GetValueAt(time, out = vec3.create()) {
      vec3.copy(out, this.value);
      return this.Update(time, out);
    }

    /**
     * The first derivative is undefined for a locator-driven curve; out is
     * returned untouched.
     */
    GetValueDotAt(_time, out = vec3.create()) {
      return out;
    }

    /**
     * The second derivative is undefined for a locator-driven curve; out is
     * returned untouched.
     */
    GetValueDoubleDotAt(_time, out = vec3.create()) {
      return out;
    }

    /**
     * Widens the last computed value into a double-precision three-element buffer for the camera-relative path; it does not re-evaluate the behaviour.
     * @param {Float64Array} [out] - caller-owned; a fresh buffer is allocated when omitted
     * @returns {Float64Array} out
     */
    InterpolatedPosition(_time, out = new Float64Array(3)) {
      out[0] = this.value[0];
      out[1] = this.value[1];
      out[2] = this.value[2];
      return out;
    }

    /**
     * POS_OFFSET_POSITION: the authored offset rotated by the parent rotation
     * curve and translated by the parent position curve, either of which may be
     * absent.
     */
    CalculateOffsetPosition(time, out) {
      vec3.copy(out, this.positionOffset);
      if (this.parentRotationCurve) {
        sampleQuaternion(this.parentRotationCurve, time, _EveLocalPositionCurv.#rotation);
        vec3.transformQuat(out, out, _EveLocalPositionCurv.#rotation);
      }
      if (this.parentPositionCurve) {
        sampleVector(this.parentPositionCurve, time, _EveLocalPositionCurv.#parentPosition);
        vec3.add(out, out, _EveLocalPositionCurv.#parentPosition);
      }
      return out;
    }

    /**
     * POS_OFFSET_PLANE_ROTATION: takes the aligned point (or the authored offset
     * when there is no align curve), drops it onto the parent's height, and pushes
     * it back out along that flattened direction to its original distance from the
     * parent.
     */
    CalculateOffsetPlaneRotation(time, out) {
      sampleVector(this.parentPositionCurve, time, _EveLocalPositionCurv.#parentPosition);
      if (this.alignPositionCurve) sampleVector(this.alignPositionCurve, time, out);else vec3.copy(out, this.positionOffset);
      const length = vec3.distance(out, _EveLocalPositionCurv.#parentPosition);
      out[1] = _EveLocalPositionCurv.#parentPosition[1];
      vec3.subtract(_EveLocalPositionCurv.#direction, out, _EveLocalPositionCurv.#parentPosition);
      if (vec3.squaredLength(_EveLocalPositionCurv.#direction)) {
        vec3.normalize(_EveLocalPositionCurv.#direction, _EveLocalPositionCurv.#direction);
        vec3.scaleAndAdd(out, _EveLocalPositionCurv.#parentPosition, _EveLocalPositionCurv.#direction, length);
      }
      return out;
    }

    /**
     * POS_NEAREST_BOUNDING_POINT: walks from the parent position towards the
     * aligned point by the authored offset plus the radius of the parent's
     * bounding ellipsoid in that direction, measured in the parent's own frame.
     * Falls back to the plain parent position when any of the three driving curves
     * is missing, and skips the ellipsoid term unless all three boundingSize axes
     * exceed 10.
     */
    CalculateNearestBoundingPoint(time, out) {
      if (!(this.parentPositionCurve && this.alignPositionCurve && this.parentRotationCurve)) {
        if (this.parentPositionCurve) sampleVector(this.parentPositionCurve, time, out);
        return out;
      }
      const parentPosition = _EveLocalPositionCurv.#parentPosition;
      const alignedPosition = _EveLocalPositionCurv.#alignedPosition;
      const direction = _EveLocalPositionCurv.#direction;
      sampleVector(this.parentPositionCurve, time, parentPosition);
      sampleVector(this.alignPositionCurve, time, alignedPosition);
      sampleQuaternion(this.parentRotationCurve, time, _EveLocalPositionCurv.#rotation);
      vec3.normalize(direction, vec3.subtract(direction, alignedPosition, parentPosition));
      quat.normalize(_EveLocalPositionCurv.#rotation, _EveLocalPositionCurv.#rotation);
      quat.invert(_EveLocalPositionCurv.#rotation, _EveLocalPositionCurv.#rotation);
      vec3.transformQuat(_EveLocalPositionCurv.#localDirection, direction, _EveLocalPositionCurv.#rotation);
      let scale = this.offset;
      const [a, b, c] = this.boundingSize;
      if (a > 10 && b > 10 && c > 10) {
        const [x, y, z] = _EveLocalPositionCurv.#localDirection;
        const denominator = Math.sqrt(x * x * b * b * c * c + y * y * a * a * c * c + z * z * a * a * b * b);
        if (denominator) scale += Math.abs(a * b * c / denominator);
      }
      return vec3.scaleAndAdd(out, parentPosition, direction, scale);
    }

    /**
     * POS_CENTER_BOUNDING_POINT: asks the parent space object for its model centre
     * at time; out is unchanged when there is no parent.
     */
    GetCenterBoundingSphere(time, out) {
      this.parent?.UpdateModelCenterWorldPosition?.(time, out);
      return out;
    }

    /**
     * POS_TARGET_DMG_LOCATOR: on the first call picks the parent damage locator
     * nearest the aligned point and latches it, then reports that locator's
     * position on every call.
     */
    GetDamageLocator(time, out) {
      if (!(this.alignPositionCurve && this.parent)) return out;
      if (this.damageLocatorIndex === -1) {
        sampleVector(this.alignPositionCurve, time, _EveLocalPositionCurv.#parentPosition);
        this.damageLocatorIndex = Number(this.parent.GetGoodDamageLocatorIndex?.(_EveLocalPositionCurv.#parentPosition) ?? -1) | 0;
      }
      this.parent.GetDamageLocatorPosition?.(this.damageLocatorIndex, true, out);
      return out;
    }

    /**
     * POS_TARGET_DMG_LOCATOR_IMPACT: as GetDamageLocator, but also creates an
     * impact on the parent at that locator the first time, then updates it each
     * call with the direction from the locator back towards the aligned point.
     */
    GetDamageLocatorImpact(time, out) {
      if (!(this.alignPositionCurve && this.parent)) return out;
      sampleVector(this.alignPositionCurve, time, _EveLocalPositionCurv.#parentPosition);
      if (this.damageLocatorIndex === -1) {
        this.damageLocatorIndex = Number(this.parent.GetGoodDamageLocatorIndex?.(_EveLocalPositionCurv.#parentPosition) ?? -1) | 0;
      }
      this.parent.GetDamageLocatorPosition?.(this.damageLocatorIndex, true, out);
      vec3.subtract(_EveLocalPositionCurv.#direction, _EveLocalPositionCurv.#parentPosition, out);
      if (this.#impactEffectIndex === -1) {
        this.#impactEffectIndex = Number(this.parent.CreateImpact?.(this.damageLocatorIndex, _EveLocalPositionCurv.#direction, 2, this.impactSize) ?? -1) | 0;
      }
      this.parent.UpdateImpact?.(out, _EveLocalPositionCurv.#direction, this.#impactEffectIndex);
      return out;
    }

    /**
     * POS_NEAREST_FIRING_LOCATOR: the world position of the configured locator
     * within the named locator set; out is unchanged when the parent, index or set
     * name is missing.
     */
    GetNearestFiringLocator(_time, out) {
      if (this.parent && this.locatorIndex !== -1 && this.locatorSetName) {
        this.parent.GetLocatorPosition?.(this.locatorIndex, true, this.locatorSetName, out);
      }
      return out;
    }

    /**
     * POS_ACTIVE_TURRET: the translation of the turret set's firing bone for the
     * configured muzzle; out is unchanged when the turret set has no such bone.
     */
    GetFiringTurretPosition(_time, out) {
      const transform = this.turretSetObject?.GetFiringBoneWorldTransform?.(this.muzzleIndex);
      if (transform?.length === 16) vec3.set(out, transform[12], transform[13], transform[14]);
      return out;
    }
  }];
  LocalPositionBehavior = Object.freeze({
    POS_NONE: 0,
    POS_NEAREST_BOUNDING_POINT: 1,
    POS_CENTER_BOUNDING_POINT: 2,
    POS_TARGET_DMG_LOCATOR: 3,
    POS_TARGET_DMG_LOCATOR_IMPACT: 4,
    POS_OFFSET_POSITION: 5,
    POS_OFFSET_PLANE_ROTATION: 6,
    POS_NEAREST_FIRING_LOCATOR: 7,
    POS_ACTIVE_TURRET: 8,
    POS_COUNT: 9
  });
  #parentPosition = vec3.create();
  #alignedPosition = vec3.create();
  #direction = vec3.create();
  #localDirection = vec3.create();
  #rotation = quat.create();
  constructor() {
    super(_EveLocalPositionCurv), _initClass();
  }
}();
function sampleVector(curve, time, out) {
  if (!curve) return out;
  if (curve.GetValueAt) curve.GetValueAt(time, out);else if (curve.Update) curve.Update(time, out);else if (curve.value?.length >= 3) vec3.copy(out, curve.value);
  return out;
}
function sampleQuaternion(curve, time, out) {
  if (curve.GetValueAt) curve.GetValueAt(time, out);else if (curve.Update) curve.Update(time, out);else if (curve.value?.length >= 4) quat.copy(out, curve.value);
  return out;
}

export { _EveLocalPositionCurv as EveLocalPositionCurve };
//# sourceMappingURL=EveLocalPositionCurve.js.map
