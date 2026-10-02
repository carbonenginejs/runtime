// Source: trinity/trinity/Eve/EveRootTransform.h
// Source: trinity/trinity/Eve/EveRootTransform.cpp
// Source: trinity/trinity/Eve/EveRootTransform_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { carbon, impl, edit, type } from "#schema";
import { EveTransform } from "./EveTransform.js";
import { Tr2Transform } from "../../core/Tr2Transform.js";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { ITr2BoundingBox } from "#interfaces";
import { IWorldPosition } from "../../core/IWorldPosition.js";


/**
 * A detached transform root whose own ball and model curves drive its matrix and
 * which stands in as a single targetable point for missiles and impacts.
 */
@type.define({ className: "EveRootTransform", family: "eve/spaceObject" })
export class EveRootTransform extends EveTransform
{

  /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  boundingSphereRadius = -1;

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("ITriVectorFunction")
  modelTranslationCurve = null;

  /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("ITriQuaternionFunction")
  modelRotationCurve = null;

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  _lastUpdateMatrix = mat4.create();

  /** Evaluates the detached ball/model curves, then advances inherited content. */
  @carbon.method
  @impl.adapted
  @impl.reason("Curve outputs use CarbonEngineJS's time-first, output-second convention.")
  UpdateSyncronous(updateContext = null)
  {
    const time = EveRootTransform._GetContextValue(updateContext, "GetTime", "currentTime", "time");
    EveRootTransform._UpdateCurve(this.translationCurve, time, EveRootTransform._translation, EveRootTransform._zero);
    EveRootTransform._UpdateCurve(this.rotationCurve, time, EveRootTransform._rotation, EveRootTransform._identityRotation);
    if (this.modelRotationCurve)
    {
      EveRootTransform._UpdateCurve(this.modelRotationCurve, time, EveRootTransform._modelRotation, EveRootTransform._identityRotation);
      // Carbon (row-vector): rotation = modelRotation * rotation - model first.
      quat.multiply(EveRootTransform._rotation, EveRootTransform._rotation, EveRootTransform._modelRotation);
    }

    mat4.fromRotationTranslation(this._lastUpdateMatrix, EveRootTransform._rotation, EveRootTransform._translation);
    if (this.modelTranslationCurve)
    {
      EveRootTransform._UpdateCurve(this.modelTranslationCurve, time, EveRootTransform._modelTranslation, EveRootTransform._zero);
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
  @carbon.method
  @impl.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Advances this detached root in Carbon's synchronous/asynchronous order. */
  @carbon.method
  @impl.implemented
  Update(updateContext)
  {
    this.UpdateSyncronous(updateContext);
    this.UpdateAsyncronous(updateContext);
  }

  /** Applies the detached root matrix as the inherited transform parent. */
  @carbon.method
  @impl.implemented
  UpdateViewDependentData(context)
  {
    return super.UpdateViewDependentData(context, this._lastUpdateMatrix);
  }

  /** Root transforms have no damage locators. */
  @carbon.method
  @impl.noop
  GetDamageLocatorCount()
  {
    return 0;
  }

  /** Returns the current root translation as the sole target point. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")
  GetDamageLocatorPosition(_index, _inWorldSpace, out = vec3.create())
  {
    vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
    return true;
  }

  /** Returns Carbon's constant +Y target direction. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")
  GetDamageLocatorDirection(_index, _inWorldSpace, out = vec3.create())
  {
    vec3.set(out, 0, 1, 0);
    return true;
  }

  /** Tests whether a projectile has reached the root target point. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses an out-last signature for output parameters.")
  GetImpactPosition(locator, _posPrev, posNow, epsilon, out = vec3.create())
  {
    this.GetDamageLocatorPosition(locator, true, out);
    return vec3.squaredDistance(posNow, out) < Number(epsilon);
  }

  /** Root transforms never use shield impact geometry. */
  @carbon.method
  @impl.noop
  HasImpactConfigurationShield()
  {
    return false;
  }

  /** Root transforms use their only target point. */
  @carbon.method
  @impl.noop
  GetClosestDamageLocatorIndex(_position)
  {
    return 0;
  }

  /** Root transforms use their only target point. */
  @carbon.method
  @impl.noop
  GetGoodDamageLocatorIndex(_position)
  {
    return 0;
  }

  /** Returns the authored target radius. */
  @carbon.method
  @impl.implemented
  GetRadius()
  {
    return this.boundingSphereRadius;
  }

  /** Root transforms do not create attached impact overlays. */
  @carbon.method
  @impl.noop
  CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size)
  {
    return -1;
  }

  /** Root transforms do not update attached impact overlays. */
  @carbon.method
  @impl.noop
  UpdateImpact(_out, _direction, _impactIndex)
  {
    return false;
  }

  /** Computes a miss point just outside the root's spherical silhouette. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetBoundingSphereRadius()
  {
    return this.boundingSphereRadius;
  }

  /**
   * Reads a numeric value from the update context, preferring a getter method
   * and falling back to the named properties, and yields 0 when nothing supplies
   * it.
   */
  static _GetContextValue(context, methodName, ...propertyNames)
  {
    const method = context?.[methodName];
    if (typeof method === "function") return Number(method.call(context)) || 0;
    for (const propertyName of propertyNames)
    {
      if (context?.[propertyName] !== undefined && context?.[propertyName] !== null)
      {
        return Number(context[propertyName]) || 0;
      }
    }
    return 0;
  }

  /**
   * Samples a curve into out through whichever of Update or GetValueAt it
   * exposes, writing the fallback when there is no curve and copying back curves
   * that return a new array instead of filling out.
   */
  static _UpdateCurve(curve, time, out, fallback)
  {
    if (!curve)
    {
      for (let index = 0; index < out.length; index++) out[index] = fallback[index];
      return out;
    }
    let result;
    if (typeof curve.Update === "function") result = curve.Update(time, out);
    else if (typeof curve.GetValueAt === "function") result = curve.GetValueAt(time, out);
    if ((Array.isArray(result) || ArrayBuffer.isView(result)) && result !== out)
    {
      for (let index = 0; index < out.length; index++) out[index] = result[index];
    }
    return out;
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
carbon.interfaceTable({
  interfaces: [ EveRootTransform, IEveSpaceObject2, IWorldPosition, ITr2BoundingBox ],
  chainTo: Tr2Transform
})(EveRootTransform, { kind: "class" });
