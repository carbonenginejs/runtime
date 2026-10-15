// Source: trinity/trinity/Eve/Renderable/Stretch/EveLocalPositionCurve.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveLocalPositionCurve.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsSchema, meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { ITriTargetable } from "../../../core/ITriTargetable.js";
import { EveSpaceObject2 } from "../../spaceObject/EveSpaceObject2.js";
import { LocalPositionBehavior } from "../../../generated/eve/renderable/stretch/enums.js";
import { be, ITriVectorFunction } from "#blue";


/**
 * A vector function that computes a point local to a model - a point on its
 * bounding hull, a damage or firing locator, a turret muzzle, or an authored
 * offset - selected by an authored behaviour.
 */
@blue.define("EveLocalPositionCurve")
export class EveLocalPositionCurve extends ITriVectorFunction
{
  @blue.readwrite
  @blue.persist
 @type.int32
  @type.enum("trinity.EveLocalPositionCurve.LocalPositionBehavior")
  behavior = 0;
  @blue.readwrite
  @type.float32
  impactSize = 1;
  @blue.readwrite
  @blue.persist
 @type.float32
  offset = 0;
  @blue.readwrite
  @blue.persist
 @type.vec3
  positionOffset = vec3.create();
  @blue.readwrite
  @blue.persist
 @type.rootRef("ITriVectorFunction")
  parentPositionCurve = null;
  @blue.readwrite
  @blue.persist
 @type.rootRef("ITriVectorFunction")
  alignPositionCurve = null;
  @blue.readwrite
  @blue.persist
 @type.vec3
  value = vec3.create();
  @blue.readwrite
  @blue.persist
 @type.vec3
  boundingSize = vec3.create();
  @blue.readwrite
  @type.rootRef("ITriQuaternionFunction")
  parentRotationCurve = null;
  @blue.readwrite
  @type.rootRef("IEveSpaceObject2")
  parent = null;
  @blue.readwrite
  @type.rootRef("EveTurretSet")
  turretSetObject = null;
  @blue.readwrite
  @type.int32
  muzzleIndex = 0;
  @blue.read
  @type.int32
  damageLocatorIndex = -1;
  @blue.readwrite
  @type.int32
  locatorIndex = -1;
  @blue.readwrite
  @type.string
  locatorSetName = "";

  _impactEffectIndex = -1;

  /** Post-construction hook that selects the behaviour, defaulting to POS_NONE. */
  @blue.method
  @meta.implemented
  __init__(behavior = EveLocalPositionCurve.LocalPositionBehavior.POS_NONE)
  {
    this.SetBehavior(behavior);
  }

  /**
   * Selects which of the LocalPositionBehavior calculations this curve
   * evaluates.
   */
  @blue.method
  @meta.implemented
  SetBehavior(behavior)
  {
    this.behavior = Number(behavior) | 0;
  }

  /**
   * Carbon's Update(double) is a no-op returning its input (EveLocalPositionCurve.cpp:302-305); Update__Ticks is the
   * overload that evaluates behaviours.
   * @param {number} _time Unused seconds.
   * @param {Float32Array} out Caller-owned vec3, returned unchanged.
   * @returns {Float32Array} out
   */
  @blue.method
  @meta.implemented
  Update(_time, out)
  {
    return out;
  }

  /**
   * Carbon's Update(Be::Time) (cpp:269-300): evaluates the selected behaviour. Under POS_NONE the incoming out is
   * stored as the curve's value and returned unchanged. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned vec3.
   * @returns {Float32Array} out
   */
  @meta.adapted
  Update__Ticks(time, out)
  {
    switch (this.behavior)
    {
      case EveLocalPositionCurve.LocalPositionBehavior.POS_NEAREST_BOUNDING_POINT:
        return this.CalculateNearestBoundingPoint(time, out);
      case EveLocalPositionCurve.LocalPositionBehavior.POS_CENTER_BOUNDING_POINT:
        return this.GetCenterBoundingSphere(time, out);
      case EveLocalPositionCurve.LocalPositionBehavior.POS_TARGET_DMG_LOCATOR:
        return this.GetDamageLocator(time, out);
      case EveLocalPositionCurve.LocalPositionBehavior.POS_TARGET_DMG_LOCATOR_IMPACT:
        return this.GetDamageLocatorImpact(time, out);
      case EveLocalPositionCurve.LocalPositionBehavior.POS_OFFSET_POSITION:
        return this.CalculateOffsetPosition(time, out);
      case EveLocalPositionCurve.LocalPositionBehavior.POS_OFFSET_PLANE_ROTATION:
        return this.CalculateOffsetPlaneRotation(time, out);
      case EveLocalPositionCurve.LocalPositionBehavior.POS_NEAREST_FIRING_LOCATOR:
        return this.GetNearestFiringLocator(time, out);
      case EveLocalPositionCurve.LocalPositionBehavior.POS_ACTIVE_TURRET:
        return this.GetFiringTurretPosition(time, out);
      default:
        vec3.copy(this.value, out);
        return out;
    }
  }

  /**
   * Carbon's GetValueAt(double) (cpp:316-322): copies the last stored value without re-evaluating.
   * @param {number} _time Unused seconds.
   * @param {Float32Array} out Caller-owned vec3.
   * @returns {Float32Array} out
   */
  @blue.method
  @meta.implemented
  GetValueAt(_time, out)
  {
    return vec3.copy(out, this.value);
  }

  /**
   * Carbon's GetValueAt(Be::Time) (cpp:307-314): seeds out with the last stored value and re-evaluates the behaviour.
   * JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned vec3.
   * @returns {Float32Array} out
   */
  @meta.adapted
  GetValueAt__Ticks(time, out)
  {
    vec3.copy(out, this.value);
    return this.Update__Ticks(time, out);
  }

  /**
   * Carbon UpdateValue (h:43-47) calls the DOUBLE Update overload - which
   * is a NO-OP returning its input (cpp:302-305); only the Be::Time
   * overload dispatches behaviours. This port collapsed the overloads into
   * the dispatching Update above, so forwarding here would evaluate a
   * behaviour (and could latch damage-locator state) where the donor call
   * evaluates nothing. Ported as the no-op Carbon's overload resolution
   * actually produces.
   *
   * Adapted: Carbon's call resolves to its no-op double Update overload; forwarding to the collapsed dispatching
   * Update would be more active than the donor.
   */
  @blue.method
  @meta.adapted
  UpdateValue(_time)
  {
  }

  /**
   * The first derivative is undefined for a locator-driven curve; out is
   * returned untouched.
   */
  @blue.method
  @meta.implemented
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * The second derivative is undefined for a locator-driven curve; out is
   * returned untouched.
   */
  @blue.method
  @meta.implemented
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Widens the last computed value into a double-precision three-element buffer for the camera-relative path; it does not re-evaluate the behaviour.
   * @param {Float64Array} out - caller-owned
   * @returns {Float64Array} out
   *
   * Adapted: Carbon's Vector3d is any three-element numeric output buffer here.
   */
  @blue.method
  @meta.adapted
  InterpolatedPosition(_time, out)
  {
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
  CalculateOffsetPosition(time, out)
  {
    vec3.copy(out, this.positionOffset);
    if (this.parentRotationCurve)
    {
      this.parentRotationCurve.GetValueAt__Ticks(time, EveLocalPositionCurve._rotation);
      vec3.transformQuat(out, out, EveLocalPositionCurve._rotation);
    }
    if (this.parentPositionCurve)
    {
      this.parentPositionCurve.GetValueAt__Ticks(time, EveLocalPositionCurve._parentPosition);
      vec3.add(out, out, EveLocalPositionCurve._parentPosition);
    }
    return out;
  }

  /**
   * POS_OFFSET_PLANE_ROTATION: takes the aligned point (or the authored offset
   * when there is no align curve), drops it onto the parent's height, and pushes
   * it back out along that flattened direction to its original distance from the
   * parent.
   */
  CalculateOffsetPlaneRotation(time, out)
  {
    if (this.parentPositionCurve) this.parentPositionCurve.GetValueAt__Ticks(time, EveLocalPositionCurve._parentPosition);
    if (this.alignPositionCurve) this.alignPositionCurve.GetValueAt__Ticks(time, out);
    else vec3.copy(out, this.positionOffset);

    const length = vec3.distance(out, EveLocalPositionCurve._parentPosition);
    out[1] = EveLocalPositionCurve._parentPosition[1];
    vec3.subtract(EveLocalPositionCurve._direction, out, EveLocalPositionCurve._parentPosition);
    if (vec3.squaredLength(EveLocalPositionCurve._direction))
    {
      vec3.normalize(EveLocalPositionCurve._direction, EveLocalPositionCurve._direction);
      vec3.scaleAndAdd(out, EveLocalPositionCurve._parentPosition, EveLocalPositionCurve._direction, length);
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
  CalculateNearestBoundingPoint(time, out)
  {
    if (!(this.parentPositionCurve && this.alignPositionCurve && this.parentRotationCurve))
    {
      if (this.parentPositionCurve) this.parentPositionCurve.GetValueAt__Ticks(time, out);
      return out;
    }

    const parentPosition = EveLocalPositionCurve._parentPosition;
    const alignedPosition = EveLocalPositionCurve._alignedPosition;
    const direction = EveLocalPositionCurve._direction;
    this.parentPositionCurve.GetValueAt__Ticks(time, parentPosition);
    this.alignPositionCurve.GetValueAt__Ticks(time, alignedPosition);
    this.parentRotationCurve.GetValueAt__Ticks(time, EveLocalPositionCurve._rotation);
    vec3.normalize(direction, vec3.subtract(direction, alignedPosition, parentPosition));

    quat.normalize(EveLocalPositionCurve._rotation, EveLocalPositionCurve._rotation);
    quat.invert(EveLocalPositionCurve._rotation, EveLocalPositionCurve._rotation);
    vec3.transformQuat(EveLocalPositionCurve._localDirection, direction, EveLocalPositionCurve._rotation);
    let scale = this.offset;
    const [a, b, c] = this.boundingSize;
    if (a > 10 && b > 10 && c > 10)
    {
      const [x, y, z] = EveLocalPositionCurve._localDirection;
      const denominator = Math.sqrt(x * x * b * b * c * c + y * y * a * a * c * c + z * z * a * a * b * b);
      if (denominator) scale += Math.abs(a * b * c / denominator);
    }
    return vec3.scaleAndAdd(out, parentPosition, direction, scale);
  }

  /**
   * POS_CENTER_BOUNDING_POINT (EveLocalPositionCurve.cpp:144-156): asks the parent space object for its model centre
   * at time; out is unchanged when there is no parent.
   */
  GetCenterBoundingSphere(time, out)
  {
    if (this.parent)
    {
      this.parent.UpdateModelCenterWorldPosition(out, time);
    }
    return out;
  }

  /**
   * POS_TARGET_DMG_LOCATOR (EveLocalPositionCurve.cpp:158-184): on the first call picks the parent damage locator
   * nearest the aligned point and latches it, then reports that locator's position on every call. A parent that is
   * not an ITriTargetable leaves out unchanged (Carbon logs an error).
   */
  GetDamageLocator(time, out)
  {
    if (!(this.alignPositionCurve && this.parent)) return out;
    const target = CjsSchema.cast(this.parent, ITriTargetable);
    if (!target) return out;
    if (this.damageLocatorIndex === -1)
    {
      this.alignPositionCurve.GetValueAt__Ticks(time, EveLocalPositionCurve._parentPosition);
      this.damageLocatorIndex = target.GetGoodDamageLocatorIndex(EveLocalPositionCurve._parentPosition);
    }
    target.GetDamageLocatorPosition(this.damageLocatorIndex, true, out);
    return out;
  }

  /**
   * POS_TARGET_DMG_LOCATOR_IMPACT (EveLocalPositionCurve.cpp:204-248): as GetDamageLocator, but also creates an
   * impact on the parent at that locator the first time, then updates it each call with the direction from the
   * locator back towards the aligned point.
   */
  GetDamageLocatorImpact(time, out)
  {
    if (!(this.alignPositionCurve && this.parent)) return out;
    const target = CjsSchema.cast(this.parent, ITriTargetable);
    if (!target) return out;
    this.alignPositionCurve.GetValueAt__Ticks(time, EveLocalPositionCurve._parentPosition);
    if (this.damageLocatorIndex === -1)
    {
      this.damageLocatorIndex = target.GetGoodDamageLocatorIndex(EveLocalPositionCurve._parentPosition);
    }
    target.GetDamageLocatorPosition(this.damageLocatorIndex, true, out);
    vec3.subtract(EveLocalPositionCurve._direction, EveLocalPositionCurve._parentPosition, out);
    if (this._impactEffectIndex === -1)
    {
      // Carbon quirk, reproduced (EveLocalPositionCurve.cpp:236): the impact is created at size 1, not impactSize;
      // m_impactSize is exposed and persisted but never read.
      this._impactEffectIndex = target.CreateImpact(this.damageLocatorIndex, EveLocalPositionCurve._direction, 2, 1);
    }
    target.UpdateImpact(out, EveLocalPositionCurve._direction, this._impactEffectIndex);
    return out;
  }

  /**
   * POS_NEAREST_FIRING_LOCATOR (EveLocalPositionCurve.cpp:186-202): the world position of the configured locator
   * within the named locator set; out is unchanged when the parent, index or set name is missing, or the parent is
   * not an EveSpaceObject2.
   */
  GetNearestFiringLocator(_time, out)
  {
    if (this.parent && this.locatorIndex !== -1 && this.locatorSetName)
    {
      const target = CjsSchema.cast(this.parent, EveSpaceObject2);
      if (target)
      {
        target.GetLocatorPosition(out, this.locatorIndex, true, this.locatorSetName);
      }
    }
    return out;
  }

  /**
   * POS_ACTIVE_TURRET (EveLocalPositionCurve.cpp:250-262): the translation of the turret set's firing bone for the
   * configured muzzle; out is unchanged without a turret set.
   */
  GetFiringTurretPosition(_time, out)
  {
    if (this.turretSetObject)
    {
      const transform = this.turretSetObject.GetFiringBoneWorldTransform(this.muzzleIndex, EveLocalPositionCurve._turretTransform);
      vec3.set(out, transform[12], transform[13], transform[14]);
    }
    return out;
  }

  static _turretTransform = mat4.create();

  static LocalPositionBehavior = LocalPositionBehavior;

  static _parentPosition = vec3.create();
  static _alignedPosition = vec3.create();
  static _direction = vec3.create();
  static _localDirection = vec3.create();
  static _rotation = quat.create();
}
