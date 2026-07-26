// Source: E:\carbonengine\trinity\trinity\Eve\EveEffectRoot2.h
// Source: E:\carbonengine\trinity\trinity\Eve\EveEffectRoot2.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\EveEffectRoot2_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../EveEntity.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { EveSpaceObjectPSData } from "../perObjectData/EveSpaceObjectPSData.js";
import { EveSpaceObjectVSData } from "../perObjectData/EveSpaceObjectVSData.js";
import { EveComponentType } from "../EveComponentTypes.js";


/**
 * A standalone effect root: curve-driven placement plus the effect children,
 * lights, controllers, curve sets and observers that make up an effect not
 * attached to a hull.
 */
@type.define({ className: "EveEffectRoot2", family: "eve/spaceObject" })
export class EveEffectRoot2 extends EveEntity
{

  /** m_effectChildren (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObjectChild")
  effectChildren = [];

  /** m_estimatedSize (float) [READ] */
  @io.read
  @type.float32
  estimatedSize = 0;

  /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ] */
  @io.read
  @type.int32
  @schema.enum("Tr2Lod")
  lodLevel = Tr2Lod.TR2_LOD_HIGH;

  /** m_mute (bool) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.boolean
  mute = false;

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_dynamicLODSelection (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  dynamicLOD = false;

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_effectDuration (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  duration = -1;

  /** m_secondaryLightingEmissiveColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  secondaryLightingEmissiveColor = vec4.create();

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_lights (PTr2LightVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2Light")
  lights = [];

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2Controller")
  controllers = [];

  /** m_observers (PTriObserverLocalVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriObserverLocal")
  observers = [];

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_secondaryLightingSphereRadiusLocal (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  secondaryLightingSphereRadius = 0.5;

  /** m_boundingSphere.xyz, exposed by Carbon's MAPFLOATARRAYSIZE Blue mapping. */
  @impl.adapted
  @impl.reason("The schema scanner omits MAPFLOATARRAYSIZE; Carbon exposes the three persisted center components separately from radius.")
  @io.persist
  @type.vec3
  boundingSphereCenter = vec3.create();

  /** m_boundingSphere.w (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  boundingSphereRadius = 0;

  /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  modelTranslationCurve = null;

  /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriQuaternionFunction")
  modelRotationCurve = null;

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  translationCurve = null;

  #changeLOD = true;
  #controllerVariables = new Map();
  #lastUpdateMatrix = mat4.create();
  #localTransform = mat4.create();
  #secondaryLightingSphereRadiusWorld = 0.5;
  #worldTransform = mat4.create();

  /** Links authored controllers after graph hydration. */
  @carbon.method
  @impl.adapted
  @impl.reason("Blue root locking is represented by the hydrated JavaScript object identity.")
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked?.()) controller?.Link?.(this);
      EveEffectRoot2.#ApplyControllerVariables(controller, this.#controllerVariables, "SetVariable");
    }
    return true;
  }

  /** Adds and initializes a controller through Carbon's list-notify behavior. */
  @carbon.method
  @impl.adapted
  @impl.reason("Plain JavaScript arrays have no Blue IList notifications, so insertion behavior is explicit.")
  AddController(controller)
  {
    this.controllers.push(controller);
    if (!controller?.IsLinked?.()) controller?.Link?.(this);
    EveEffectRoot2.#ApplyControllerVariables(controller, this.#controllerVariables, "SetVariable");
    return controller;
  }

  /** Removes and unlinks a controller through Carbon's list-notify behavior. */
  @carbon.method
  @impl.adapted
  @impl.reason("Plain JavaScript arrays have no Blue IList notifications, so removal behavior is explicit.")
  RemoveController(controller)
  {
    const index = this.controllers.indexOf(controller);
    if (index === -1) return false;
    this.controllers.splice(index, 1);
    controller?.Unlink?.();
    return true;
  }

  /** Evaluates root curves and updates children that require synchronous placement. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon task and lock ownership is omitted; child update parameters retain the source graph contract.")
  UpdateSyncronous(updateContext = null)
  {
    const time = EveEffectRoot2.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
    this.UpdateWorldTransform(time);
    mat4.fromRotationTranslationScale(this.#localTransform, this.rotation, this.translation, this.scaling);
    // Carbon (row-vector): m_localTransform * m_worldTransform - local first.
    mat4.multiply(this.#lastUpdateMatrix, this.#worldTransform, this.#localTransform);
    this.#secondaryLightingSphereRadiusWorld = this.secondaryLightingSphereRadius *
      (this.scaling[0] + this.scaling[1] + this.scaling[2]) / 3;

    for (const observer of this.observers) observer?.Update?.(this.#lastUpdateMatrix);
    if (this.effectChildren.length)
    {
      const params = this.#CreateChildUpdateParams();
      for (const child of this.effectChildren) child?.UpdateSyncronous?.(updateContext, params);
    }
    return true;
  }

  /** Advances controllers, root curve sets, and effect children. */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller and child work is forwarded synchronously through the GPU-free graph instead of Carbon task groups.")
  UpdateAsyncronous(updateContext = null)
  {
    let frequency = 0;
    if (this.display)
    {
      if (this.dynamicLOD)
      {
        const threshold = EveEffectRoot2.#GetContextValue(updateContext, "GetHighDetailThreshold", "highDetailThreshold");
        if (threshold > 0) frequency = Math.min(1, this.estimatedSize / threshold);
      }
      else
      {
        frequency = 0.5;
      }
    }

    this.UpdateControllers(frequency);
    const time = EveEffectRoot2.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
    for (const curveSet of this.curveSets) curveSet?.Update?.(time, time);
    if (this.effectChildren.length)
    {
      const params = this.#CreateChildUpdateParams();
      params.controllerUpdateFrequency = frequency;
      for (const child of this.effectChildren) child?.UpdateAsyncronous?.(updateContext, params);
    }
    return frequency;
  }

  /** Updates dynamic LOD and forwards visibility to the effect children. */
  @carbon.method
  @impl.adapted
  @impl.reason("Frustum and threshold state is supplied by the explicit update context rather than renderer globals.")
  UpdateVisibility(updateContext = null, parentTransform = EveEffectRoot2.#identity)
  {
    if (!this.display) return false;
    if (this.dynamicLOD)
    {
      this.GetBoundingSphere(EveEffectRoot2.#localSphere);
      sph3.transformMat4(EveEffectRoot2.#worldSphere, EveEffectRoot2.#localSphere, this.#worldTransform);
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      if (frustum?.IsSphereVisible?.(EveEffectRoot2.#worldSphere) !== false)
      {
        this.estimatedSize = Number(frustum?.GetPixelSizeAccross?.(EveEffectRoot2.#worldSphere) ?? this.estimatedSize) || 0;
      }

      const oldLod = this.lodLevel;
      this.lodLevel = Tr2Lod.TR2_LOD_LOW;
      const medium = EveEffectRoot2.#GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
      const low = EveEffectRoot2.#GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");
      if (this.estimatedSize >= medium) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
      else if (this.estimatedSize >= low) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;
      this.#changeLOD ||= oldLod !== this.lodLevel;
    }

    for (const child of this.effectChildren)
    {
      child?.UpdateVisibility?.(updateContext, parentTransform, this.lodLevel);
    }
    return true;
  }

  /** Collects child renderables after applying a pending LOD change. */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    if (this.#changeLOD)
    {
      this.#changeLOD = false;
      for (const child of this.effectChildren) child?.ChangeLOD?.(this.lodLevel);
    }
    for (const child of this.effectChildren) child?.GetRenderables?.(out);
    return out;
  }

  /** Advances every controller at the selected detail frequency. */
  @carbon.method
  @impl.implemented
  UpdateControllers(updateFrequency)
  {
    for (const controller of this.controllers) controller?.Update?.(updateFrequency);
  }

  /** Returns the authored local bounding sphere. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(
      out,
      this.boundingSphereCenter[0],
      this.boundingSphereCenter[1],
      this.boundingSphereCenter[2],
      this.boundingSphereRadius
    );
    return true;
  }

  /** Returns the authored bounding-sphere radius. */
  @carbon.method
  @impl.implemented
  GetBoundingSphereRadius()
  {
    return this.boundingSphereRadius;
  }

  /** Evaluates the ball/model curves into the detached root transform. */
  @carbon.method
  @impl.adapted
  @impl.reason("Curve outputs use CarbonEngineJS's time-first, output-second convention.")
  UpdateWorldTransform(time)
  {
    EveEffectRoot2.#UpdateCurve(this.translationCurve, time, EveEffectRoot2.#translation, EveEffectRoot2.#zero);
    EveEffectRoot2.#UpdateCurve(this.rotationCurve, time, EveEffectRoot2.#rotation, EveEffectRoot2.#identityRotation);
    if (this.modelRotationCurve)
    {
      EveEffectRoot2.#UpdateCurve(this.modelRotationCurve, time, EveEffectRoot2.#modelRotation, EveEffectRoot2.#identityRotation);
      // Carbon (row-vector): rotation = modelRotation * rotation - model first.
      quat.multiply(EveEffectRoot2.#rotation, EveEffectRoot2.#rotation, EveEffectRoot2.#modelRotation);
    }

    mat4.fromRotationTranslation(this.#worldTransform, EveEffectRoot2.#rotation, EveEffectRoot2.#translation);
    if (this.modelTranslationCurve)
    {
      EveEffectRoot2.#UpdateCurve(this.modelTranslationCurve, time, EveEffectRoot2.#modelTranslation, EveEffectRoot2.#zero);
      vec3.transformMat4(EveEffectRoot2.#modelTranslation, EveEffectRoot2.#modelTranslation, this.#worldTransform);
      this.#worldTransform[12] = EveEffectRoot2.#modelTranslation[0];
      this.#worldTransform[13] = EveEffectRoot2.#modelTranslation[1];
      this.#worldTransform[14] = EveEffectRoot2.#modelTranslation[2];
    }
    return this.#worldTransform;
  }

  /** Updates and returns the model-center world position. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses an out-last signature for output parameters.")
  UpdateModelCenterWorldPosition(time, out = vec3.create())
  {
    this.UpdateWorldTransform(time);
    mat4.fromRotationTranslationScale(this.#localTransform, this.rotation, this.translation, this.scaling);
    // Carbon (row-vector): currentTransform * m_worldTransform - local first.
    mat4.multiply(EveEffectRoot2.#centerTransform, this.#worldTransform, this.#localTransform);
    return vec3.transformMat4(out, this.boundingSphereCenter, EveEffectRoot2.#centerTransform);
  }

  /** Returns the last model-center world position without advancing curves. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses an out-last signature for output parameters.")
  GetModelCenterWorldPosition(out = vec3.create())
  {
    return vec3.transformMat4(out, this.boundingSphereCenter, this.#lastUpdateMatrix);
  }

  /** Effect roots do not expose a local AABB in Carbon. */
  @carbon.method
  @impl.noop
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /** Returns the last composed local-to-world transform. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS returns the caller-owned output matrix.")
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.#lastUpdateMatrix);
  }

  /** Protected-equivalent read of Carbon's m_worldTransform
   * (EveEffectRoot2.h:219, protected) - the detached root transform
   * UpdateWorldTransform evaluates, WITHOUT the local SRT composition that
   * GetLocalToWorldTransform's #lastUpdateMatrix carries. EvePlanet reads the
   * member directly for the z-only depth-prepass drive (EvePlanet.cpp:137). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's protected member access becomes a copying accessor; JS has no protected fields and the live buffer stays private.")
  GetWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.#worldTransform);
  }

  /** Registers every child with an injected quad renderer. */
  @carbon.method
  @impl.adapted
  @impl.reason("The quad renderer is an injected engine-owned capability.")
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const child of this.effectChildren) child?.RegisterWithQuadRenderer?.(quadRenderer);
  }

  /** Adds visible child quads to an injected renderer. */
  @carbon.method
  @impl.adapted
  @impl.reason("The quad renderer is an injected engine-owned capability.")
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display) return;
    for (const child of this.effectChildren) child?.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
  }

  /** Carbon EveEffectRoot2::RegisterComponents (cpp:496-513): LightOwner when
   * lights are authored, then forwards the effect children. Gate m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      if (this.lights.length)
      {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
      for (const child of this.effectChildren)
      {
        child?.Register?.(registry);
      }
    }
  }

  /** Carbon EveEffectRoot2::UnRegisterComponents (cpp:515-528): forwards the
   * effect children only (own components were already removed by
   * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const child of this.effectChildren)
      {
        child?.UnRegister?.(registry);
      }
    }
  }

  /** Adds authored lights using the effect's composed placement and average scale. */
  @carbon.method
  @impl.adapted
  @impl.reason("The light manager is an injected engine-owned capability.")
  GetLights(lightManager)
  {
    if (!this.display) return;
    const transform = this.#lastUpdateMatrix;
    const scale = (
      Math.hypot(transform[0], transform[1], transform[2]) +
      Math.hypot(transform[4], transform[5], transform[6]) +
      Math.hypot(transform[8], transform[9], transform[10])
    ) / 3;
    for (const light of this.lights) light?.AddLight?.(lightManager, transform, scale);
  }

  /** Adds an authored light. */
  @carbon.method
  @impl.implemented
  AddLight(light)
  {
    this.lights.push(light);
    return light;
  }

  /** Removes all authored lights. */
  @carbon.method
  @impl.implemented
  ClearLights()
  {
    this.lights.length = 0;
  }

  /** Initializes the portable child-facing space-object records. */
  @carbon.method
  @impl.adapted
  @impl.reason("Native constant-buffer structs are represented by GPU-free value records.")
  GetPerObjectStructs(vsData = new EveSpaceObjectVSData(), psData = new EveSpaceObjectPSData())
  {
    EveEffectRoot2.#ZeroNumericRecord(vsData);
    EveEffectRoot2.#ZeroNumericRecord(psData);
    vsData.shipData[1] = 1;
    vsData.shipData[3] = 1;
    psData.shipData[1] = 1;
    psData.shipData[3] = 1;
    return { vsData, psData };
  }

  /** Registers this root as a secondary light source with an injected manager. */
  @carbon.method
  @impl.adapted
  @impl.reason("The SH lighting manager is injected; Trinity owns only the authored source values.")
  RegisterSecondaryLightSource(manager)
  {
    return manager?.RegisterSecondaryLightSource?.(
      this.#worldTransform.subarray(12, 15),
      this.#secondaryLightingSphereRadiusWorld,
      EveEffectRoot2.#noAlbedo,
      this.secondaryLightingEmissiveColor
    );
  }

  /** Unregisters this root from an injected secondary-light manager. */
  @carbon.method
  @impl.adapted
  @impl.reason("The SH lighting manager is injected; Trinity owns only the authored source values.")
  UnregisterSecondaryLightSource(manager)
  {
    return manager?.UnregisterSecondaryLightSource?.(this.#worldTransform.subarray(12, 15));
  }

  /** Plays root and child-owned curve sets. */
  @carbon.method
  @impl.implemented
  Start()
  {
    for (const curveSet of this.curveSets) curveSet?.Play?.();
    for (const child of this.effectChildren)
    {
      if (child?.PlayAllCurveSets) child.PlayAllCurveSets();
      else child?.PlayCurveSets?.();
    }
  }

  /** Stops root and child-owned curve sets. */
  @carbon.method
  @impl.implemented
  Stop()
  {
    for (const curveSet of this.curveSets) curveSet?.Stop?.();
    for (const child of this.effectChildren)
    {
      if (child?.StopAllCurveSets) child.StopAllCurveSets();
      else child?.StopCurveSets?.();
    }
  }

  /** Effect roots have no damage locators. */
  @carbon.method
  @impl.noop
  GetDamageLocatorCount()
  {
    return 0;
  }

  /** Returns the detached root translation as the sole target point. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")
  GetDamageLocatorPosition(_index, _inWorldSpace, out = vec3.create())
  {
    vec3.set(out, this.#worldTransform[12], this.#worldTransform[13], this.#worldTransform[14]);
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

  /** Effect roots never use shield impact geometry. */
  @carbon.method
  @impl.noop
  HasImpactConfigurationShield()
  {
    return false;
  }

  /** Effect roots use their only target point. */
  @carbon.method
  @impl.noop
  GetClosestDamageLocatorIndex(_position)
  {
    return 0;
  }

  /** Effect roots use their only target point. */
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

  /** Effect roots do not create attached impact overlays. */
  @carbon.method
  @impl.noop
  CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size)
  {
    return -1;
  }

  /** Effect roots do not update attached impact overlays. */
  @carbon.method
  @impl.noop
  UpdateImpact(_out, _direction, _impactIndex)
  {
    return false;
  }

  /** Returns the detached root world position. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS returns the caller-owned output vector.")
  GetWorldPosition(out = vec3.create())
  {
    return vec3.set(out, this.#worldTransform[12], this.#worldTransform[13], this.#worldTransform[14]);
  }

  /** Returns the authored local rotation composed with the detached root rotation. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS returns the caller-owned output quaternion.")
  GetWorldRotation(out = quat.create())
  {
    mat4.getRotation(EveEffectRoot2.#worldRotation, this.#worldTransform);
    // Carbon (row-vector): m_rotation * RotationQuaternion(world) - local first.
    quat.multiply(out, EveEffectRoot2.#worldRotation, this.rotation);
    return quat.normalize(out, out);
  }

  /** Computes a miss point just outside the root's spherical silhouette. */
  @carbon.method
  @impl.implemented
  GetMissPosition(hit, source, out = vec3.create())
  {
    this.GetDamageLocatorPosition(-1, true, out);
    if (!hit || !source) return out;
    vec3.subtract(EveEffectRoot2.#missOffset, hit, out);
    vec3.subtract(EveEffectRoot2.#missDirection, hit, source);
    const directionLength = vec3.length(EveEffectRoot2.#missDirection);
    if (directionLength) vec3.scale(EveEffectRoot2.#missDirection, EveEffectRoot2.#missDirection, 1 / directionLength);
    vec3.scaleAndAdd(
      EveEffectRoot2.#missOffset,
      EveEffectRoot2.#missOffset,
      EveEffectRoot2.#missDirection,
      -vec3.dot(EveEffectRoot2.#missDirection, EveEffectRoot2.#missOffset)
    );
    const offsetLength = vec3.length(EveEffectRoot2.#missOffset);
    if (offsetLength) vec3.scale(EveEffectRoot2.#missOffset, EveEffectRoot2.#missOffset, 1 / offsetLength);
    return vec3.scaleAndAdd(out, out, EveEffectRoot2.#missOffset, this.boundingSphereRadius * 1.125);
  }

  /** Returns the owned effect-child list. */
  @carbon.method
  @impl.implemented
  GetChildren()
  {
    return this.effectChildren;
  }

  /** Decomposes a matrix into the authored local SRT fields. */
  @carbon.method
  @impl.implemented
  SetTransform(transform)
  {
    mat4.getScaling(this.scaling, transform);
    mat4.getRotation(this.rotation, transform);
    mat4.getTranslation(this.translation, transform);
  }

  /** Plays matching root and child curve sets. */
  @carbon.method
  @impl.implemented
  PlayCurveSet(name, rangeName = "")
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) !== target) continue;
      if (rangeName) curveSet?.PlayTimeRange?.(rangeName);
      else
      {
        curveSet?.ResetTimeRange?.();
        curveSet?.Play?.();
      }
    }
    for (const child of this.effectChildren) child?.PlayCurveSet?.(target, rangeName);
  }

  /** Stops matching root and child curve sets. */
  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target) curveSet?.Stop?.();
    }
    for (const child of this.effectChildren) child?.StopCurveSet?.(target);
  }

  /** Samples matching root and child curve sets at an explicit time. */
  @carbon.method
  @impl.implemented
  UpdateCurveSet(name, time)
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target) curveSet?.Update?.(time, time);
    }
    for (const child of this.effectChildren) child?.UpdateCurveSet?.(target, time);
  }

  /** Returns the maximum duration of matching root and child curve sets. */
  @carbon.method
  @impl.implemented
  GetCurveSetDuration(name)
  {
    const target = String(name ?? "");
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target)
      {
        duration = Math.max(duration, Number(curveSet?.GetMaxCurveDuration?.() ?? 0));
      }
    }
    for (const child of this.effectChildren)
    {
      duration = Math.max(duration, Number(child?.GetCurveSetDuration?.(target) ?? 0));
    }
    return duration;
  }

  /** Returns the maximum named range duration in matching root and child sets. */
  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    const target = String(name ?? "");
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) === target)
      {
        duration = Math.max(duration, Number(curveSet?.GetRangeDuration?.(rangeName) ?? 0));
      }
    }
    for (const child of this.effectChildren)
    {
      duration = Math.max(duration, Number(child?.GetRangeDuration?.(target, rangeName) ?? 0));
    }
    return duration;
  }

  /** Collects the Carbon debug-option names and child options. */
  @carbon.method
  @impl.adapted
  @impl.reason("The debug renderer/options collection is an injected engine-owned capability.")
  GetDebugOptions(options = new Set())
  {
    options.add?.("Bounding Sphere");
    options.add?.("Lights");
    for (const observer of this.observers) observer?.GetDebugOptions?.(options);
    for (const child of this.effectChildren) child?.GetDebugOptions?.(options);
    return options;
  }

  /** Forwards root debug geometry to an injected debug renderer. */
  @carbon.method
  @impl.adapted
  @impl.reason("The debug renderer is an injected engine-owned capability.")
  RenderDebugInfo(renderer)
  {
    if (renderer?.HasOption?.(this, "Bounding Sphere"))
    {
      renderer?.DrawSphere?.(this, this.boundingSphereCenter, this.boundingSphereRadius, 8, "wireframe", 0xffff00ff);
    }
    for (const child of this.effectChildren) child?.RenderDebugInfo?.(renderer);
    if (renderer?.HasOption?.(this, "Lights"))
    {
      for (const light of this.lights) light?.RenderDebugInfo?.(renderer, this.#worldTransform);
    }
    for (const observer of this.observers) observer?.RenderDebugInfo?.(renderer);
  }

  /** Stores and propagates a controller variable to current and future members. */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name ?? "");
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable?.(key, next);
    for (const child of this.effectChildren) child?.SetControllerVariable?.(key, next);
  }

  /** Propagates an event to controllers and effect children. */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    const eventName = String(name ?? "");
    for (const controller of this.controllers) controller?.HandleEvent?.(eventName);
    for (const child of this.effectChildren) child?.HandleControllerEvent?.(eventName);
  }

  /** Starts controllers on the root and its effect children. */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start?.();
    for (const child of this.effectChildren) child?.StartControllers?.();
  }

  /** Finds a named direct effect child. */
  @carbon.method
  @impl.implemented
  GetEffectChildByName(name)
  {
    const target = String(name ?? "");
    for (const child of this.effectChildren)
    {
      if ((child?.GetName?.() ?? child?.name ?? "") === target) return child;
    }
    return null;
  }

  /** Adds and initializes an effect child through Carbon's list-notify behavior. */
  @carbon.method
  @impl.adapted
  @impl.reason("Plain JavaScript arrays have no Blue IList notifications, so insertion behavior is explicit.")
  AddToEffectChildrenList(child)
  {
    this.effectChildren.push(child);
    EveEffectRoot2.#ApplyControllerVariables(child, this.#controllerVariables, "SetControllerVariable");
    child?.StartControllers?.();
    return child;
  }

  /** Removes an effect child. */
  @carbon.method
  @impl.adapted
  @impl.reason("Plain JavaScript arrays have no Blue IList notifications, so removal behavior is explicit.")
  RemoveFromEffectChildrenList(child)
  {
    const index = this.effectChildren.indexOf(child);
    if (index === -1) return false;
    this.effectChildren.splice(index, 1);
    return true;
  }

  /** Applies a shader option to every effect child. */
  @carbon.method
  @impl.implemented
  SetShaderOption(name, value)
  {
    for (const child of this.effectChildren) child?.SetShaderOption?.(name, value);
  }

  /** Finds a named observer or child-owned sound emitter. */
  @carbon.method
  @impl.implemented
  FindSoundEmitter(name)
  {
    const target = String(name ?? "");
    for (const observer of this.observers)
    {
      if ((observer?.name ?? "") === target)
      {
        return typeof observer.GetObserver === "function" ? observer.GetObserver() : observer.observer ?? null;
      }
    }
    for (const child of this.effectChildren)
    {
      const emitter = child?.FindSoundEmitter?.(target);
      if (emitter) return emitter;
    }
    return null;
  }

  /** Adds a placement observer. */
  @carbon.method
  @impl.implemented
  AddObserver(observer)
  {
    this.observers.push(observer);
    return observer;
  }

  /** Applies the mute state to effect children and placement observers. */
  @carbon.method
  @impl.adapted
  @impl.reason("The explicit setter replaces Carbon's Blue field-notify callback.")
  SetMute(isMute)
  {
    this.mute = !!isMute;
    for (const child of this.effectChildren) child?.SetMute?.(this.mute);
    for (const observer of this.observers) observer?.SetMute?.(this.mute);
  }

  /** Freezes every child at Carbon's high-detail LOD. */
  @carbon.method
  @impl.implemented
  FreezeHighDetailMesh()
  {
    this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
    this.#changeLOD = false;
    for (const child of this.effectChildren) child?.ChangeLOD?.(this.lodLevel);
  }

  /** Propagates a procedural-container variable to every effect child. */
  @carbon.method
  @impl.implemented
  SetProceduralContainerVariable(name, value)
  {
    for (const child of this.effectChildren) child?.SetProceduralContainerVariable?.(name, value);
  }

  /**
   * Builds the per-frame child update parameters naming this root as the
   * space-object parent, carrying its display state and a copy of the current
   * root matrix.
   */
  #CreateChildUpdateParams()
  {
    const params = new EveChildUpdateParams();
    params.spaceObjectParent = this;
    params.isVisible = this.display;
    mat4.copy(params.localToWorldTransform, this.#lastUpdateMatrix);
    return params;
  }

  /**
   * Replays every stored controller variable onto a newly added controller or
   * effect child through the named setter, so late additions start with the same
   * state.
   */
  static #ApplyControllerVariables(target, variables, methodName)
  {
    const setter = target?.[methodName];
    if (typeof setter !== "function") return;
    for (const [name, value] of variables) setter.call(target, name, value);
  }

  /**
   * Reads a numeric value from the update context, preferring a getter method
   * and falling back to the named properties, and yields 0 when nothing supplies
   * it.
   */
  static #GetContextValue(context, methodName, ...propertyNames)
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
  static #UpdateCurve(curve, time, out, fallback)
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

  /**
   * Zeroes every numeric, typed-array and array field of a per-object record in
   * place, so the record can be refilled from a known-clean state.
   */
  static #ZeroNumericRecord(record)
  {
    for (const [name, value] of Object.entries(record))
    {
      if (typeof value === "number") record[name] = 0;
      else if (ArrayBuffer.isView(value)) value.fill(0);
      else if (Array.isArray(value))
      {
        for (let index = 0; index < value.length; index++)
        {
          if (typeof value[index] === "number") value[index] = 0;
          else if (ArrayBuffer.isView(value[index])) value[index].fill(0);
        }
      }
    }
  }

  static #identity = mat4.create();
  static #centerTransform = mat4.create();
  static #localSphere = vec4.create();
  static #worldSphere = vec4.create();
  static #zero = vec3.create();
  static #translation = vec3.create();
  static #modelTranslation = vec3.create();
  static #missOffset = vec3.create();
  static #missDirection = vec3.create();
  static #identityRotation = quat.create();
  static #rotation = quat.create();
  static #modelRotation = quat.create();
  static #worldRotation = quat.create();
  static #noAlbedo = vec4.create();

  static Tr2Lod = Tr2Lod;

}
