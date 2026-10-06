// Source: trinity/trinity/Eve/EveRootTransform.h
// Source: trinity/trinity/Eve/EveRootTransform.cpp
// Source: trinity/trinity/Eve/EveRootTransform_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { EveTransform } from "./EveTransform.js";
import { Tr2Transform } from "../../core/Tr2Transform.js";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { ITr2BoundingBox } from "#interfaces";
import { IWorldPosition } from "../../core/IWorldPosition.js";
import { ITriTargetable } from "../../core/ITriTargetable.js";


/**
 * A detached transform root whose own ball and model curves drive its matrix and
 * which stands in as a single targetable point for missiles and impacts.
 */
@meta.define({ className: "EveRootTransform", family: "eve/spaceObject" })
@meta.blue.inherit(ITriTargetable)
@meta.blue.interface(IEveSpaceObject2, ITriTargetable, IWorldPosition, ITr2BoundingBox)
@meta.blue.chainTo(Tr2Transform)
export class EveRootTransform extends EveTransform
{

  /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  boundingSphereRadius = -1;

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  modelTranslationCurve = null;

  /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriQuaternionFunction")
  modelRotationCurve = null;

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  translationCurve = null;

  _lastUpdateMatrix = mat4.create();

  /**
   * Evaluates the detached ball/model curves, then advances inherited content.
   *
   * Adapted: Curve outputs use CarbonEngineJS's time-first, output-second convention.
   */
  @meta.blue.method
  @meta.adapted
  UpdateSyncronous(updateContext = null)
  {
    const time = updateContext.GetTime();
    if (this.translationCurve) this.translationCurve.Update__Ticks(time, EveRootTransform._translation);
    else vec3.copy(EveRootTransform._translation, EveRootTransform._zero);
    if (this.rotationCurve) this.rotationCurve.Update__Ticks(time, EveRootTransform._rotation);
    else quat.copy(EveRootTransform._rotation, EveRootTransform._identityRotation);
    if (this.modelRotationCurve)
    {
      this.modelRotationCurve.Update__Ticks(time, EveRootTransform._modelRotation);
      // Carbon (row-vector): rotation = modelRotation * rotation - model first.
      quat.multiply(EveRootTransform._rotation, EveRootTransform._rotation, EveRootTransform._modelRotation);
    }

    mat4.fromRotationTranslation(this._lastUpdateMatrix, EveRootTransform._rotation, EveRootTransform._translation);
    if (this.modelTranslationCurve)
    {
      this.modelTranslationCurve.Update__Ticks(time, EveRootTransform._modelTranslation);
      vec3.transformMat4(EveRootTransform._modelTranslation, EveRootTransform._modelTranslation, this._lastUpdateMatrix);
      this._lastUpdateMatrix[12] = EveRootTransform._modelTranslation[0];
      this._lastUpdateMatrix[13] = EveRootTransform._modelTranslation[1];
      this._lastUpdateMatrix[14] = EveRootTransform._modelTranslation[2];
    }

    super.UpdateSyncronous(updateContext);
    super.UpdateAsyncronous(updateContext);
    return true;
  }

  /** Carbon advances inherited async content from UpdateSyncronous for this root. */
  @meta.blue.method
  @meta.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Advances this detached root in Carbon's synchronous/asynchronous order. */
  @meta.blue.method
  @meta.implemented
  Update(updateContext)
  {
    this.UpdateSyncronous(updateContext);
    this.UpdateAsyncronous(updateContext);
  }

  /** Applies the detached root matrix as the inherited transform parent. */
  @meta.blue.method
  @meta.implemented
  UpdateViewDependentData(context)
  {
    return super.UpdateViewDependentData(context, this._lastUpdateMatrix);
  }

  /** Root transforms have no damage locators. */
  @meta.blue.method
  @meta.noop
  GetDamageLocatorCount()
  {
    return 0;
  }

  /**
   * Returns the current root translation as the sole target point.
   *
   * Adapted: CarbonEngineJS uses output parameters last and returns the targetable validity
   * flag.
   */
  @meta.blue.method
  @meta.adapted
  GetDamageLocatorPosition(_index, _inWorldSpace, out = vec3.create())
  {
    vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
    return true;
  }

  /**
   * Returns Carbon's constant +Y target direction.
   *
   * Adapted: CarbonEngineJS uses output parameters last and returns the targetable validity
   * flag.
   */
  @meta.blue.method
  @meta.adapted
  GetDamageLocatorDirection(_index, _inWorldSpace, out = vec3.create())
  {
    vec3.set(out, 0, 1, 0);
    return true;
  }

  /**
   * Tests whether a projectile has reached the root target point.
   *
   * Adapted: CarbonEngineJS uses an out-last signature for output parameters.
   */
  @meta.blue.method
  @meta.adapted
  GetImpactPosition(locator, _posPrev, posNow, epsilon, out = vec3.create())
  {
    this.GetDamageLocatorPosition(locator, true, out);
    return vec3.squaredDistance(posNow, out) < Number(epsilon);
  }

  /** Root transforms never use shield impact geometry. */
  @meta.blue.method
  @meta.noop
  HasImpactConfigurationShield()
  {
    return false;
  }

  /** Root transforms use their only target point. */
  @meta.blue.method
  @meta.noop
  GetClosestDamageLocatorIndex(_position)
  {
    return 0;
  }

  /** Root transforms use their only target point. */
  @meta.blue.method
  @meta.noop
  GetGoodDamageLocatorIndex(_position)
  {
    return 0;
  }

  /** Returns the authored target radius. */
  @meta.blue.method
  @meta.implemented
  GetRadius()
  {
    return this.boundingSphereRadius;
  }

  /** Root transforms do not create attached impact overlays. */
  @meta.blue.method
  @meta.noop
  CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size)
  {
    return -1;
  }

  /** Root transforms do not update attached impact overlays. */
  @meta.blue.method
  @meta.noop
  UpdateImpact(_out, _direction, _impactIndex)
  {
    return false;
  }

  /** Computes a miss point just outside the root's spherical silhouette. */
  @meta.blue.method
  @meta.implemented
  GetMissPosition(hit, source, out = vec3.create())
  {
    this.GetDamageLocatorPosition(-1, true, out);
    if (!hit || !source) return out;
    vec3.subtract(EveRootTransform._missOffset, hit, out);
    vec3.subtract(EveRootTransform._missDirection, hit, source);
    const directionLength = vec3.length(EveRootTransform._missDirection);
    if (directionLength) vec3.scale(EveRootTransform._missDirection, EveRootTransform._missDirection, 1 / directionLength);
    vec3.scaleAndAdd(
      EveRootTransform._missOffset,
      EveRootTransform._missOffset,
      EveRootTransform._missDirection,
      -vec3.dot(EveRootTransform._missDirection, EveRootTransform._missOffset)
    );
    const offsetLength = vec3.length(EveRootTransform._missOffset);
    if (offsetLength) vec3.scale(EveRootTransform._missOffset, EveRootTransform._missOffset, 1 / offsetLength);
    return vec3.scaleAndAdd(out, out, EveRootTransform._missOffset, this.boundingSphereRadius * 1.125);
  }

  /** Returns the authored bounding-sphere radius. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphereRadius()
  {
    return this.boundingSphereRadius;
  }

  static _zero = vec3.create();
  static _translation = vec3.create();
  static _modelTranslation = vec3.create();
  static _missOffset = vec3.create();
  static _missDirection = vec3.create();
  static _identityRotation = quat.create();
  static _rotation = quat.create();
  static _modelRotation = quat.create();

}

// Supported native interfaces; ITriTargetable and ITr2Pickable are not declared yet.
// EveRootTransform_Blue.cpp:11-16,60 bypasses the EveTransform exposure table.
