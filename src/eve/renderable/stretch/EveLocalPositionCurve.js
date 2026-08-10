// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveLocalPositionCurve.h
// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveLocalPositionCurve.cpp
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * A vector function that computes a point local to a model - a point on its
 * bounding hull, a damage or firing locator, a turret muzzle, or an authored
 * offset - selected by an authored behaviour.
 */
@type.define({ className: "EveLocalPositionCurve", family: "eve/renderable/stretch" })
export class EveLocalPositionCurve extends CjsModel
{
  @io.persist @type.int32 @type.enum("LocalPositionBehavior") behavior = 0;
  @io.readwrite @type.float32 impactSize = 1;
  @io.persist @type.float32 offset = 0;
  @io.persist @type.vec3 positionOffset = vec3.create();
  @io.persist @type.model("ITriVectorFunction") parentPositionCurve = null;
  @io.persist @type.model("ITriVectorFunction") alignPositionCurve = null;
  @io.persist @type.vec3 value = vec3.create();
  @io.persist @type.vec3 boundingSize = vec3.create();
  @io.readwrite @type.objectRef("ITriQuaternionFunction") parentRotationCurve = null;
  @io.readwrite @type.objectRef("IEveSpaceObject2") parent = null;
  @io.readwrite @type.objectRef("EveTurretSet") turretSetObject = null;
  @io.readwrite @type.int32 muzzleIndex = 0;
  @io.read @type.int32 damageLocatorIndex = -1;
  @io.readwrite @type.int32 locatorIndex = -1;
  @io.readwrite @type.string locatorSetName = "";

  #impactEffectIndex = -1;

  /** Post-construction hook that selects the behaviour, defaulting to POS_NONE. */
  @carbon.method @impl.implemented
  __init__(behavior = EveLocalPositionCurve.LocalPositionBehavior.POS_NONE)
  {
    this.SetBehavior(behavior);
  }

  /**
   * Selects which of the LocalPositionBehavior calculations this curve
   * evaluates.
   */
  @carbon.method @impl.implemented
  SetBehavior(behavior)
  {
    this.behavior = Number(behavior) | 0;
  }

  /**
   * Evaluates the selected behaviour at time.
   * @param {Array} [out] - caller-owned vec3; defaults to the curve's own value field, so callers that pass nothing update it in place. Under POS_NONE the incoming out is stored as the curve's value and returned unchanged.
   * @returns {Array} out
   */
  @carbon.method @impl.adapted
  @impl.reason("Carbon overloads Be::Time and double; JavaScript has one numeric time domain and follows the org out-last convention.")
  Update(time, out = this.value)
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
   * Seeds out with the last stored value and re-evaluates the behaviour at time, unlike the pure accessors on the simpler curves.
   * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
   * @returns {Array} out
   */
  @carbon.method @impl.adapted
  @impl.reason("JavaScript uses CarbonEngineJS's standard time-first, out-last curve convention.")
  GetValueAt(time, out = vec3.create())
  {
    vec3.copy(out, this.value);
    return this.Update(time, out);
  }

  /**
   * The first derivative is undefined for a locator-driven curve; out is
   * returned untouched.
   */
  @carbon.method @impl.implemented
  GetValueDotAt(_time, out = vec3.create())
  {
    return out;
  }

  /**
   * The second derivative is undefined for a locator-driven curve; out is
   * returned untouched.
   */
  @carbon.method @impl.implemented
  GetValueDoubleDotAt(_time, out = vec3.create())
  {
    return out;
  }

  /**
   * Widens the last computed value into a double-precision three-element buffer for the camera-relative path; it does not re-evaluate the behaviour.
   * @param {Float64Array} [out] - caller-owned; a fresh buffer is allocated when omitted
   * @returns {Float64Array} out
   */
  @carbon.method @impl.adapted
  @impl.reason("Vector3d is represented by any three-element numeric output buffer in JavaScript.")
  InterpolatedPosition(_time, out = new Float64Array(3))
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
      sampleQuaternion(this.parentRotationCurve, time, EveLocalPositionCurve.#rotation);
      vec3.transformQuat(out, out, EveLocalPositionCurve.#rotation);
    }
    if (this.parentPositionCurve)
    {
      sampleVector(this.parentPositionCurve, time, EveLocalPositionCurve.#parentPosition);
      vec3.add(out, out, EveLocalPositionCurve.#parentPosition);
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
    sampleVector(this.parentPositionCurve, time, EveLocalPositionCurve.#parentPosition);
    if (this.alignPositionCurve) sampleVector(this.alignPositionCurve, time, out);
    else vec3.copy(out, this.positionOffset);

    const length = vec3.distance(out, EveLocalPositionCurve.#parentPosition);
    out[1] = EveLocalPositionCurve.#parentPosition[1];
    vec3.subtract(EveLocalPositionCurve.#direction, out, EveLocalPositionCurve.#parentPosition);
    if (vec3.squaredLength(EveLocalPositionCurve.#direction))
    {
      vec3.normalize(EveLocalPositionCurve.#direction, EveLocalPositionCurve.#direction);
      vec3.scaleAndAdd(out, EveLocalPositionCurve.#parentPosition, EveLocalPositionCurve.#direction, length);
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
      if (this.parentPositionCurve) sampleVector(this.parentPositionCurve, time, out);
      return out;
    }

    const parentPosition = EveLocalPositionCurve.#parentPosition;
    const alignedPosition = EveLocalPositionCurve.#alignedPosition;
    const direction = EveLocalPositionCurve.#direction;
    sampleVector(this.parentPositionCurve, time, parentPosition);
    sampleVector(this.alignPositionCurve, time, alignedPosition);
    sampleQuaternion(this.parentRotationCurve, time, EveLocalPositionCurve.#rotation);
    vec3.normalize(direction, vec3.subtract(direction, alignedPosition, parentPosition));

    quat.normalize(EveLocalPositionCurve.#rotation, EveLocalPositionCurve.#rotation);
    quat.invert(EveLocalPositionCurve.#rotation, EveLocalPositionCurve.#rotation);
    vec3.transformQuat(EveLocalPositionCurve.#localDirection, direction, EveLocalPositionCurve.#rotation);
    let scale = this.offset;
    const [a, b, c] = this.boundingSize;
    if (a > 10 && b > 10 && c > 10)
    {
      const [x, y, z] = EveLocalPositionCurve.#localDirection;
      const denominator = Math.sqrt(x * x * b * b * c * c + y * y * a * a * c * c + z * z * a * a * b * b);
      if (denominator) scale += Math.abs(a * b * c / denominator);
    }
    return vec3.scaleAndAdd(out, parentPosition, direction, scale);
  }

  /**
   * POS_CENTER_BOUNDING_POINT: asks the parent space object for its model centre
   * at time; out is unchanged when there is no parent.
   */
  GetCenterBoundingSphere(time, out)
  {
    this.parent?.UpdateModelCenterWorldPosition?.(time, out);
    return out;
  }

  /**
   * POS_TARGET_DMG_LOCATOR: on the first call picks the parent damage locator
   * nearest the aligned point and latches it, then reports that locator's
   * position on every call.
   */
  GetDamageLocator(time, out)
  {
    if (!(this.alignPositionCurve && this.parent)) return out;
    if (this.damageLocatorIndex === -1)
    {
      sampleVector(this.alignPositionCurve, time, EveLocalPositionCurve.#parentPosition);
      this.damageLocatorIndex = Number(this.parent.GetGoodDamageLocatorIndex?.(EveLocalPositionCurve.#parentPosition) ?? -1) | 0;
    }
    this.parent.GetDamageLocatorPosition?.(this.damageLocatorIndex, true, out);
    return out;
  }

  /**
   * POS_TARGET_DMG_LOCATOR_IMPACT: as GetDamageLocator, but also creates an
   * impact on the parent at that locator the first time, then updates it each
   * call with the direction from the locator back towards the aligned point.
   */
  GetDamageLocatorImpact(time, out)
  {
    if (!(this.alignPositionCurve && this.parent)) return out;
    sampleVector(this.alignPositionCurve, time, EveLocalPositionCurve.#parentPosition);
    if (this.damageLocatorIndex === -1)
    {
      this.damageLocatorIndex = Number(this.parent.GetGoodDamageLocatorIndex?.(EveLocalPositionCurve.#parentPosition) ?? -1) | 0;
    }
    this.parent.GetDamageLocatorPosition?.(this.damageLocatorIndex, true, out);
    vec3.subtract(EveLocalPositionCurve.#direction, EveLocalPositionCurve.#parentPosition, out);
    if (this.#impactEffectIndex === -1)
    {
      this.#impactEffectIndex = Number(this.parent.CreateImpact?.(this.damageLocatorIndex, EveLocalPositionCurve.#direction, 2, this.impactSize) ?? -1) | 0;
    }
    this.parent.UpdateImpact?.(out, EveLocalPositionCurve.#direction, this.#impactEffectIndex);
    return out;
  }

  /**
   * POS_NEAREST_FIRING_LOCATOR: the world position of the configured locator
   * within the named locator set; out is unchanged when the parent, index or set
   * name is missing.
   */
  GetNearestFiringLocator(_time, out)
  {
    if (this.parent && this.locatorIndex !== -1 && this.locatorSetName)
    {
      this.parent.GetLocatorPosition?.(this.locatorIndex, true, this.locatorSetName, out);
    }
    return out;
  }

  /**
   * POS_ACTIVE_TURRET: the translation of the turret set's firing bone for the
   * configured muzzle; out is unchanged when the turret set has no such bone.
   */
  GetFiringTurretPosition(_time, out)
  {
    const transform = this.turretSetObject?.GetFiringBoneWorldTransform?.(this.muzzleIndex);
    if (transform?.length === 16) vec3.set(out, transform[12], transform[13], transform[14]);
    return out;
  }

  static LocalPositionBehavior = Object.freeze({
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

  static #parentPosition = vec3.create();
  static #alignedPosition = vec3.create();
  static #direction = vec3.create();
  static #localDirection = vec3.create();
  static #rotation = quat.create();
}

function sampleVector(curve, time, out)
{
  if (!curve) return out;
  if (curve.GetValueAt) curve.GetValueAt(time, out);
  else if (curve.Update) curve.Update(time, out);
  else if (curve.value?.length >= 3) vec3.copy(out, curve.value);
  return out;
}

function sampleQuaternion(curve, time, out)
{
  if (curve.GetValueAt) curve.GetValueAt(time, out);
  else if (curve.Update) curve.Update(time, out);
  else if (curve.value?.length >= 4) quat.copy(out, curve.value);
  return out;
}
