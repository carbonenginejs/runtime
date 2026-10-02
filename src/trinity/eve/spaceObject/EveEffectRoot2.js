import { IListNotify } from "../../../global/blue/IListNotify.js";
import { IWorldPosition } from "../../core/IWorldPosition.js";
import { ITr2SoundEmitterOwner } from "../ITr2SoundEmitterOwner.js";
import { ITr2ControllerOwner } from "../../controllers/ITr2ControllerOwner.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/EveEffectRoot2.h
// Source: trinity/trinity/Eve/EveEffectRoot2.cpp
// Source: trinity/trinity/Eve/EveEffectRoot2_Blue.cpp
import "#consts/trinity";
import { addChild, removeChild, clearChildren } from "../../../global/blue/children.js";
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { box3 } from "#math/box3";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { ITr2BoundingBox } from "#interfaces";
import { ITr2SecondaryLightSource } from "../../core/lighting/ITr2SecondaryLightSource.js";
import { EveEntity } from "../EveEntity.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { RawData } from "../../core/rawData/RawData.js";
import { EveComponentType } from "../EveComponentTypes.js";
import { BLUELISTEVENT } from "#consts/blue";


/**
 * A standalone effect root: curve-driven placement plus the effect children,
 * lights, controllers, curve sets and observers that make up an effect not
 * attached to a hull.
 */
@meta.define({ className: "EveEffectRoot2", family: "eve/spaceObject" })
@meta.blue.inherit(ITr2BoundingBox, IEveSpaceObject2, ITr2SecondaryLightSource)
@meta.blue.mapInterface(ITr2SecondaryLightSource)
@meta.blue.inherit(IInitialize, INotify, IListNotify)
export class EveEffectRoot2 extends EveEntity
{

  /** m_effectChildren (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObjectChild")
  effectChildren = [];

  /** m_estimatedSize (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  estimatedSize = 0;

  /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ] */
  @meta.blue.read
  @meta.type.int32
  @meta.type.enum("trinity.Tr2Lod")
  lodLevel = Tr2Lod.TR2_LOD_HIGH;

  /** m_mute (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  mute = false;

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_dynamicLODSelection (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  dynamicLOD = false;

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_effectDuration (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  duration = -1;

  /** m_secondaryLightingEmissiveColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  secondaryLightingEmissiveColor = vec4.create();

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** m_lights (PTr2LightVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2Light")
  lights = [];

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2Controller")
  controllers = [];

  /** m_observers (PTriObserverLocalVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriObserverLocal")
  observers = [];

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_secondaryLightingSphereRadiusLocal (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  secondaryLightingSphereRadius = 0.5;

  /** m_boundingSphere.xyz, exposed by Carbon's MAPFLOATARRAYSIZE Blue mapping. */
  @meta.adapted
  @meta.reason("The schema scanner omits MAPFLOATARRAYSIZE; Carbon exposes the three persisted center components separately from radius.")
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  boundingSphereCenter = vec3.create();

  /** m_boundingSphere.w (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  boundingSphereRadius = 0;

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

  _changeLOD = true;
  _controllerVariables = new Map();
  _lastUpdateMatrix = mat4.create();
  _localTransform = mat4.create();
  _secondaryLightingSphereRadiusWorld = 0.5;
  _worldTransform = mat4.create();

  /** The translation view registered with the SH lighting manager (_GetWorldTranslation). */
  _worldTranslation = null;

  /** Links authored controllers after graph hydration. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Blue root locking is represented by the hydrated JavaScript object identity.")
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked()) controller?.Link(this);
      EveEffectRoot2._ApplyControllerVariables(controller, this._controllerVariables, "SetVariable");
    }
    return true;
  }

  /**
   * Adds a controller. The linking and variable replay are NOT done here:
   * Carbon's list notifies its owner and OnListModified's INSERTED arm does
   * them (EveEffectRoot2.cpp:94-102), which is what the managed child
   * mutation reproduces.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("A JavaScript array has no notify slot, so the owner drives the notification through the shared child service rather than the list driving it.")
  AddController(controller)
  {
    addChild(this, "controllers", controller, { listNotify: this });
    return controller;
  }

  /**
   * Removes a controller. The unlink is OnListModified's REMOVED arm
   * (EveEffectRoot2.cpp:104-109), not this method's business.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("A JavaScript array has no notify slot, so the owner drives the notification through the shared child service rather than the list driving it.")
  RemoveController(controller)
  {
    return removeChild(this, "controllers", controller, { listNotify: this });
  }

  /** Evaluates root curves and updates children that require synchronous placement. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon task and lock ownership is omitted; child update parameters retain the source graph contract.")
  UpdateSyncronous(updateContext = null)
  {
    const time = EveEffectRoot2._GetContextValue(updateContext, "GetTime", "currentTime", "time");
    this.UpdateWorldTransform(time);
    mat4.fromRotationTranslationScale(this._localTransform, this.rotation, this.translation, this.scaling);
    // Carbon (row-vector): m_localTransform * m_worldTransform - local first.
    mat4.multiply(this._lastUpdateMatrix, this._worldTransform, this._localTransform);
    this._secondaryLightingSphereRadiusWorld = this.secondaryLightingSphereRadius *
      (this.scaling[0] + this.scaling[1] + this.scaling[2]) / 3;

    for (const observer of this.observers) observer?.Update(this._lastUpdateMatrix);
    if (this.effectChildren.length)
    {
      const params = this._CreateChildUpdateParams();
      for (const child of this.effectChildren) child?.UpdateSyncronous(updateContext, params);
    }
    return true;
  }

  /** Advances controllers, root curve sets, and effect children. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Controller and child work is forwarded synchronously through the GPU-free graph instead of Carbon task groups.")
  UpdateAsyncronous(updateContext = null)
  {
    let frequency = 0;
    if (this.display)
    {
      if (this.dynamicLOD)
      {
        const threshold = EveEffectRoot2._GetContextValue(updateContext, "GetHighDetailThreshold", "highDetailThreshold");
        if (threshold > 0) frequency = Math.min(1, this.estimatedSize / threshold);
      }
      else
      {
        frequency = 0.5;
      }
    }

    this.UpdateControllers(frequency);
    const time = EveEffectRoot2._GetContextValue(updateContext, "GetTime", "currentTime", "time");
    for (const curveSet of this.curveSets) curveSet.Update(time, time, updateContext.renderContext);
    if (this.effectChildren.length)
    {
      const params = this._CreateChildUpdateParams();
      params.controllerUpdateFrequency = frequency;
      for (const child of this.effectChildren) child?.UpdateAsyncronous(updateContext, params);
    }
    return frequency;
  }

  /** Updates dynamic LOD and forwards visibility to the effect children. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Frustum and threshold state is supplied by the explicit update context rather than renderer globals.")
  UpdateVisibility(updateContext = null, parentTransform = EveEffectRoot2._identity)
  {
    if (!this.display) return false;
    if (this.dynamicLOD)
    {
      this.GetBoundingSphere(EveEffectRoot2._localSphere);
      sph3.transformMat4(EveEffectRoot2._worldSphere, EveEffectRoot2._localSphere, this._worldTransform);
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      if (frustum?.IsSphereVisible(EveEffectRoot2._worldSphere) !== false)
      {
        this.estimatedSize = Number(frustum?.GetPixelSizeAccross?.(EveEffectRoot2._worldSphere) ?? this.estimatedSize) || 0;
      }

      const oldLod = this.lodLevel;
      this.lodLevel = Tr2Lod.TR2_LOD_LOW;
      const medium = EveEffectRoot2._GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
      const low = EveEffectRoot2._GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");
      if (this.estimatedSize >= medium) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
      else if (this.estimatedSize >= low) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;
      this._changeLOD ||= oldLod !== this.lodLevel;
    }

    for (const child of this.effectChildren)
    {
      child?.UpdateVisibility(updateContext, parentTransform, this.lodLevel);
    }
    return true;
  }

  /** Collects child renderables after applying a pending LOD change. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    if (this._changeLOD)
    {
      this._changeLOD = false;
      for (const child of this.effectChildren) child?.ChangeLOD?.(this.lodLevel);
    }
    for (const child of this.effectChildren) child?.GetRenderables(out);
    return out;
  }

  /** Advances every controller at the selected detail frequency. */
  @meta.blue.method
  @meta.implemented
  UpdateControllers(updateFrequency)
  {
    for (const controller of this.controllers) controller?.Update(updateFrequency);
  }

  /** Returns the authored local bounding sphere. */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  GetBoundingSphereRadius()
  {
    return this.boundingSphereRadius;
  }

  /** Evaluates the ball/model curves into the detached root transform. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Curve outputs use CarbonEngineJS's time-first, output-second convention.")
  UpdateWorldTransform(time)
  {
    EveEffectRoot2._UpdateCurve(this.translationCurve, time, EveEffectRoot2._translation, EveEffectRoot2._zero);
    EveEffectRoot2._UpdateCurve(this.rotationCurve, time, EveEffectRoot2._rotation, EveEffectRoot2._identityRotation);
    if (this.modelRotationCurve)
    {
      EveEffectRoot2._UpdateCurve(this.modelRotationCurve, time, EveEffectRoot2._modelRotation, EveEffectRoot2._identityRotation);
      // Carbon (row-vector): rotation = modelRotation * rotation - model first.
      quat.multiply(EveEffectRoot2._rotation, EveEffectRoot2._rotation, EveEffectRoot2._modelRotation);
    }

    mat4.fromRotationTranslation(this._worldTransform, EveEffectRoot2._rotation, EveEffectRoot2._translation);
    if (this.modelTranslationCurve)
    {
      EveEffectRoot2._UpdateCurve(this.modelTranslationCurve, time, EveEffectRoot2._modelTranslation, EveEffectRoot2._zero);
      vec3.transformMat4(EveEffectRoot2._modelTranslation, EveEffectRoot2._modelTranslation, this._worldTransform);
      this._worldTransform[12] = EveEffectRoot2._modelTranslation[0];
      this._worldTransform[13] = EveEffectRoot2._modelTranslation[1];
      this._worldTransform[14] = EveEffectRoot2._modelTranslation[2];
    }
    return this._worldTransform;
  }

  /** Updates and returns the model-center world position. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS uses an out-last signature for output parameters.")
  UpdateModelCenterWorldPosition(time, out = vec3.create())
  {
    this.UpdateWorldTransform(time);
    mat4.fromRotationTranslationScale(this._localTransform, this.rotation, this.translation, this.scaling);
    // Carbon (row-vector): currentTransform * m_worldTransform - local first.
    mat4.multiply(EveEffectRoot2._centerTransform, this._worldTransform, this._localTransform);
    return vec3.transformMat4(out, this.boundingSphereCenter, EveEffectRoot2._centerTransform);
  }

  /** Returns the last model-center world position without advancing curves. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS uses an out-last signature for output parameters.")
  GetModelCenterWorldPosition(out = vec3.create())
  {
    return vec3.transformMat4(out, this.boundingSphereCenter, this._lastUpdateMatrix);
  }

  /** Writes the authored sphere's local axis-aligned bounds when its radius is valid. */
  @meta.blue.method
  @meta.implemented
  GetLocalBoundingBox(min, max)
  {
    if (this.boundingSphereRadius <= 0) return false;
    const radius = this.boundingSphereRadius;
    vec3.set(
      min,
      this.boundingSphereCenter[0] - radius,
      this.boundingSphereCenter[1] - radius,
      this.boundingSphereCenter[2] - radius
    );
    vec3.set(
      max,
      this.boundingSphereCenter[0] + radius,
      this.boundingSphereCenter[1] + radius,
      this.boundingSphereCenter[2] + radius
    );
    return true;
  }

  /** Returns the last composed local-to-world transform. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS returns the caller-owned output matrix.")
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this._lastUpdateMatrix);
  }

  /** Writes the authored sphere's bounds transformed by the last composed root matrix. */
  @meta.blue.method
  @meta.implemented
  GetWorldBoundingBox(min, max)
  {
    if (!this.GetLocalBoundingBox(min, max)) return false;
    const bounds = EveEffectRoot2._bounds;
    box3.fromBounds(bounds, min, max);
    box3.transformMat4(bounds, bounds, this._lastUpdateMatrix);
    vec3.set(min, bounds[0], bounds[1], bounds[2]);
    vec3.set(max, bounds[3], bounds[4], bounds[5]);
    return true;
  }

  /** Reports whether the authored sphere can currently supply a bounding box. */
  @meta.blue.method
  @meta.implemented
  IsBoundingBoxReady()
  {
    return this.boundingSphereRadius > 0;
  }

  /** Protected-equivalent read of Carbon's m_worldTransform
   * (EveEffectRoot2.h:219, protected) - the detached root transform
   * UpdateWorldTransform evaluates, WITHOUT the local SRT composition that
   * GetLocalToWorldTransform's #lastUpdateMatrix carries. EvePlanet reads the
   * member directly for the z-only depth-prepass drive (EvePlanet.cpp:137). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's protected member access becomes a copying accessor; JS has no protected fields and the live buffer stays private.")
  GetWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this._worldTransform);
  }

  /** Registers every child with an injected quad renderer. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The quad renderer is an injected engine-owned capability.")
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const child of this.effectChildren) child?.RegisterWithQuadRenderer?.(quadRenderer);
  }

  /** Adds visible child quads to an injected renderer. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The quad renderer is an injected engine-owned capability.")
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display) return;
    for (const child of this.effectChildren) child?.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
  }

  /** Carbon EveEffectRoot2::RegisterComponents (cpp:496-513): LightOwner when
   * lights are authored, then forwards the effect children. Gate m_display. */
  @meta.blue.method
  @meta.implemented
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
        child?.Register(registry);
      }
    }
  }

  /** Carbon EveEffectRoot2::UnRegisterComponents (cpp:515-528): forwards the
   * effect children only (own components were already removed by
   * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check. */
  @meta.blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const child of this.effectChildren)
      {
        child?.UnRegister(registry);
      }
    }
  }

  /**
   * Carbon OnListModified (EveEffectRoot2.cpp:88-193), branch for branch,
   * dispatched by list identity. Controllers: insert links and replays the
   * recorded controller variables, remove unlinks, unload-start unlinks
   * everything. Effect children: insert takes ownership, replays variables,
   * starts controllers and registers the entity when this root is in a
   * registry; remove unregisters and clears ownership; unload-start does
   * both for every child (Carbon's UNLOADSTART case falls through into an
   * empty default - no break, cpp:168 - which changes nothing and is not
   * reproduced as a bug, just noted). Lights: the FIRST insert registers
   * this root as a LightOwner component and the LAST removal (or
   * unload-start) unregisters it - the same size-edge rule
   * RegisterComponents applies at registration time.
   */
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const masked = event & BLUELISTEVENT.BELIST_EVENTMASK;

    if (list === this.controllers && (event & BLUELISTEVENT.BELIST_LOADING) === 0)
    {
      switch (masked)
      {
        case BLUELISTEVENT.BELIST_INSERTED:
          if (value)
          {
            value.Link(this);
            EveEffectRoot2._ApplyControllerVariables(value, this._controllerVariables, "SetVariable");
          }
          break;
        case BLUELISTEVENT.BELIST_REMOVED:
          if (value) value.Unlink();
          break;
        case BLUELISTEVENT.BELIST_UNLOADSTART:
          for (const controller of this.controllers) controller.Unlink();
          break;
        default:
          break;
      }
      return;
    }

    if (list === this.effectChildren && (event & BLUELISTEVENT.BELIST_LOADING) === 0)
    {
      const registry = this.IsInRegistry() ? this.GetComponentRegistry() : null;
      switch (masked)
      {
        case BLUELISTEVENT.BELIST_INSERTED:
          if (value)
          {
            value.SetOwner(this);
            EveEffectRoot2._ApplyControllerVariables(value, this._controllerVariables, "SetControllerVariable");
            value.StartControllers();
            if (registry) value.Register(registry);
          }
          break;
        case BLUELISTEVENT.BELIST_REMOVED:
          if (value)
          {
            if (registry) value.UnRegister(registry);
            value.SetOwner(null);
          }
          break;
        case BLUELISTEVENT.BELIST_UNLOADSTART:
          for (const child of this.effectChildren)
          {
            if (registry) child?.UnRegister(registry);
            child?.SetOwner(null);
          }
          break;
        default:
          break;
      }
      return;
    }

    if (list === this.lights)
    {
      const registry = this.GetComponentRegistry();
      if (!registry) return;
      if (masked === BLUELISTEVENT.BELIST_UNLOADSTART || (masked === BLUELISTEVENT.BELIST_REMOVED && this.lights.length === 0))
      {
        registry.UnRegisterComponent(EveComponentType.LightOwner, this);
      }
      else if (masked === BLUELISTEVENT.BELIST_INSERTED && this.lights.length === 1)
      {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }
  }

  /** Adds authored lights using the effect's composed placement and average scale. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The light manager is an injected engine-owned capability.")
  GetLights(lightManager)
  {
    if (!this.display) return;
    const transform = this._lastUpdateMatrix;
    const scale = (
      Math.hypot(transform[0], transform[1], transform[2]) +
      Math.hypot(transform[4], transform[5], transform[6]) +
      Math.hypot(transform[8], transform[9], transform[10])
    ) / 3;
    for (const light of this.lights) light?.AddLight(lightManager, transform, scale);
  }

  /** Adds an authored light. */
  @meta.blue.method
  @meta.implemented
  AddLight(light)
  {
    this.lights.push(light);
    return light;
  }

  /** Removes all authored lights. */
  @meta.blue.method
  @meta.implemented
  ClearLights()
  {
    this.lights.length = 0;
  }

  /**
   * Carbon EveEffectRoot2::GetPerObjectStructs (cpp:463-478): zeroes both
   * records, then sets activation strength and bounding-sphere radius to 1. An
   * effect root carries no hull values of its own, so a child parented to one
   * inherits neutral data rather than nothing.
   * @returns {{vs: RawData, ps: RawData}}
   */
  @meta.blue.method
  @meta.implemented
  GetPerObjectStructs(vsData = RawData.create("EveSpaceObjectVSData"), psData = RawData.create("EveSpaceObjectPSData"))
  {
    vsData.Zero();
    psData.Zero();
    vsData.Set("shipData", EveEffectRoot2._neutralShipData);
    psData.Set("shipData", EveEffectRoot2._neutralShipData);

    return { vs: vsData, ps: psData };
  }

  /**
   * Registers this root as a secondary light source (EveEffectRoot2.cpp:520-528).
   * Carbon hands the manager pointers it reads live; the translation here is
   * one live view of the world transform (_GetWorldTranslation), and the same
   * view is what unregistering matches by identity - a fresh subarray per call
   * never matched, so a removed root was never unregistered.
   * Adapted: Carbon passes the radius as a pointer the manager reads live;
   * a getter supplies the current value at every source refresh.
   *
   * @param {import("../../core/lighting/Tr2ShLightingManager.js").Tr2ShLightingManager} manager The scene's manager.
   * @returns {boolean} Whether the manager registered it.
   */
  @meta.blue.method
  @meta.adapted
  RegisterSecondaryLightSource(manager)
  {
    return manager.RegisterSecondaryLightSource(
      this._GetWorldTranslation(),
      () => this._secondaryLightingSphereRadiusWorld,
      EveEffectRoot2._noAlbedo,
      this.secondaryLightingEmissiveColor
    );
  }

  /**
   * Unregisters this root as a secondary light source (EveEffectRoot2.cpp:530-533),
   * by the same translation view it registered with.
   *
   * @param {import("../../core/lighting/Tr2ShLightingManager.js").Tr2ShLightingManager} manager The scene's manager.
   * @returns {boolean} Whether the manager removed it.
   */
  @meta.blue.method
  @meta.adapted
  UnregisterSecondaryLightSource(manager)
  {
    return manager.UnregisterSecondaryLightSource(this._GetWorldTranslation());
  }

  /**
   * The live translation view of the world transform - Carbon's
   * `&m_worldTransform.GetTranslation()` - made once, after construction, so
   * a subclass's own transform field is the one viewed.
   *
   * @returns {Float32Array} Elements 12-14 of the world transform.
   */
  _GetWorldTranslation()
  {
    this._worldTranslation ??= this._worldTransform.subarray(12, 15);
    return this._worldTranslation;
  }

  /** Plays root and child-owned curve sets. */
  @meta.blue.method
  @meta.implemented
  Start()
  {
    for (const curveSet of this.curveSets) curveSet?.Play();
    for (const child of this.effectChildren)
    {
      if (child?.PlayAllCurveSets) child.PlayAllCurveSets();
      else child?.PlayCurveSets?.();
    }
  }

  /** Stops root and child-owned curve sets. */
  @meta.blue.method
  @meta.implemented
  Stop()
  {
    for (const curveSet of this.curveSets) curveSet?.Stop();
    for (const child of this.effectChildren)
    {
      if (child?.StopAllCurveSets) child.StopAllCurveSets();
      else child?.StopCurveSets?.();
    }
  }

  /** Effect roots have no damage locators. */
  @meta.blue.method
  @meta.noop
  GetDamageLocatorCount()
  {
    return 0;
  }

  /** Returns the detached root translation as the sole target point. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")
  GetDamageLocatorPosition(_index, _inWorldSpace, out = vec3.create())
  {
    vec3.set(out, this._worldTransform[12], this._worldTransform[13], this._worldTransform[14]);
    return true;
  }

  /** Returns Carbon's constant +Y target direction. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS uses output parameters last and returns the targetable validity flag.")
  GetDamageLocatorDirection(_index, _inWorldSpace, out = vec3.create())
  {
    vec3.set(out, 0, 1, 0);
    return true;
  }

  /** Tests whether a projectile has reached the root target point. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS uses an out-last signature for output parameters.")
  GetImpactPosition(locator, _posPrev, posNow, epsilon, out = vec3.create())
  {
    this.GetDamageLocatorPosition(locator, true, out);
    return vec3.squaredDistance(posNow, out) < Number(epsilon);
  }

  /** Effect roots never use shield impact geometry. */
  @meta.blue.method
  @meta.noop
  HasImpactConfigurationShield()
  {
    return false;
  }

  /** Effect roots use their only target point. */
  @meta.blue.method
  @meta.noop
  GetClosestDamageLocatorIndex(_position)
  {
    return 0;
  }

  /** Effect roots use their only target point. */
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

  /** Effect roots do not create attached impact overlays. */
  @meta.blue.method
  @meta.noop
  CreateImpact(_damageLocatorIndex, _direction, _lifeTime, _size)
  {
    return -1;
  }

  /** Effect roots do not update attached impact overlays. */
  @meta.blue.method
  @meta.noop
  UpdateImpact(_out, _direction, _impactIndex)
  {
    return false;
  }

  /** Returns the detached root world position. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS returns the caller-owned output vector.")
  GetWorldPosition(out = vec3.create())
  {
    return vec3.set(out, this._worldTransform[12], this._worldTransform[13], this._worldTransform[14]);
  }

  /** Returns the authored local rotation composed with the detached root rotation. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS returns the caller-owned output quaternion.")
  GetWorldRotation(out = quat.create())
  {
    mat4.getRotation(EveEffectRoot2._worldRotation, this._worldTransform);
    // Carbon (row-vector): m_rotation * RotationQuaternion(world) - local first.
    quat.multiply(out, EveEffectRoot2._worldRotation, this.rotation);
    return quat.normalize(out, out);
  }

  /** Computes a miss point just outside the root's spherical silhouette. */
  @meta.blue.method
  @meta.implemented
  GetMissPosition(hit, source, out = vec3.create())
  {
    this.GetDamageLocatorPosition(-1, true, out);
    if (!hit || !source) return out;
    vec3.subtract(EveEffectRoot2._missOffset, hit, out);
    vec3.subtract(EveEffectRoot2._missDirection, hit, source);
    const directionLength = vec3.length(EveEffectRoot2._missDirection);
    if (directionLength) vec3.scale(EveEffectRoot2._missDirection, EveEffectRoot2._missDirection, 1 / directionLength);
    vec3.scaleAndAdd(
      EveEffectRoot2._missOffset,
      EveEffectRoot2._missOffset,
      EveEffectRoot2._missDirection,
      -vec3.dot(EveEffectRoot2._missDirection, EveEffectRoot2._missOffset)
    );
    const offsetLength = vec3.length(EveEffectRoot2._missOffset);
    if (offsetLength) vec3.scale(EveEffectRoot2._missOffset, EveEffectRoot2._missOffset, 1 / offsetLength);
    return vec3.scaleAndAdd(out, out, EveEffectRoot2._missOffset, this.boundingSphereRadius * 1.125);
  }

  /** Returns the owned effect-child list. */
  @meta.blue.method
  @meta.implemented
  GetChildren()
  {
    return this.effectChildren;
  }

  /** Decomposes a matrix into the authored local SRT fields. */
  @meta.blue.method
  @meta.implemented
  SetTransform(transform)
  {
    mat4.getScaling(this.scaling, transform);
    mat4.getRotation(this.rotation, transform);
    mat4.getTranslation(this.translation, transform);
  }

  /** Plays matching root and child curve sets. */
  @meta.blue.method
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName() ?? curveSet?.name) !== target) continue;
      if (rangeName) curveSet?.PlayTimeRange?.(rangeName);
      else
      {
        curveSet?.ResetTimeRange();
        curveSet?.Play();
      }
    }
    for (const child of this.effectChildren) child?.PlayCurveSet?.(target, rangeName);
  }

  /** Stops matching root and child curve sets. */
  @meta.blue.method
  @meta.implemented
  StopCurveSet(name)
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName() ?? curveSet?.name) === target) curveSet?.Stop();
    }
    for (const child of this.effectChildren) child?.StopCurveSet?.(target);
  }

  /** Samples matching root and child curve sets at an explicit time. */
  @meta.blue.method
  @meta.implemented
  UpdateCurveSet(name, time, renderContext = null)
  {
    const target = String(name ?? "");
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === target) curveSet.Update(time, time, renderContext);
    }
    for (const child of this.effectChildren) child?.UpdateCurveSet?.(target, time, renderContext);
  }

  /** Returns the maximum duration of matching root and child curve sets. */
  @meta.blue.method
  @meta.implemented
  GetCurveSetDuration(name)
  {
    const target = String(name ?? "");
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName() ?? curveSet?.name) === target)
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
  @meta.blue.method
  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    const target = String(name ?? "");
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName() ?? curveSet?.name) === target)
      {
        duration = Math.max(duration, Number(curveSet?.GetRangeDuration(rangeName) ?? 0));
      }
    }
    for (const child of this.effectChildren)
    {
      duration = Math.max(duration, Number(child?.GetRangeDuration?.(target, rangeName) ?? 0));
    }
    return duration;
  }

  /** Collects the Carbon debug-option names and child options. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The debug renderer/options collection is an injected engine-owned capability.")
  GetDebugOptions(options = new Set())
  {
    options.add?.("Bounding Sphere");
    options.add?.("Lights");
    for (const observer of this.observers) observer?.GetDebugOptions?.(options);
    for (const child of this.effectChildren) child?.GetDebugOptions?.(options);
    return options;
  }

  /** Forwards root debug geometry to an injected debug renderer. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The debug renderer is an injected engine-owned capability.")
  RenderDebugInfo(renderer)
  {
    if (renderer?.HasOption?.(this, "Bounding Sphere"))
    {
      renderer?.DrawSphere?.(this, this.boundingSphereCenter, this.boundingSphereRadius, 8, "wireframe", 0xffff00ff);
    }
    for (const child of this.effectChildren) child?.RenderDebugInfo?.(renderer);
    if (renderer?.HasOption?.(this, "Lights"))
    {
      for (const light of this.lights) light?.RenderDebugInfo?.(renderer, this._worldTransform);
    }
    for (const observer of this.observers) observer?.RenderDebugInfo?.(renderer);
  }

  /** Stores and propagates a controller variable to current and future members. */
  @meta.blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name ?? "");
    const next = Number(value);
    this._controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable(key, next);
    for (const child of this.effectChildren) child?.SetControllerVariable(key, next);
  }

  /** Propagates an event to controllers and effect children. */
  @meta.blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    const eventName = String(name ?? "");
    for (const controller of this.controllers) controller?.HandleEvent(eventName);
    for (const child of this.effectChildren) child?.HandleControllerEvent(eventName);
  }

  /** Starts controllers on the root and its effect children. */
  @meta.blue.method
  @meta.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start();
    for (const child of this.effectChildren) child?.StartControllers();
  }

  /** Finds a named direct effect child. */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.adapted
  @meta.reason("Plain JavaScript arrays have no Blue IList notifications, so insertion behavior is explicit.")
  AddToEffectChildrenList(child)
  {
    this.effectChildren.push(child);
    EveEffectRoot2._ApplyControllerVariables(child, this._controllerVariables, "SetControllerVariable");
    child?.StartControllers();
    return child;
  }

  /** Removes an effect child. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Plain JavaScript arrays have no Blue IList notifications, so removal behavior is explicit.")
  RemoveFromEffectChildrenList(child)
  {
    const index = this.effectChildren.indexOf(child);
    if (index === -1) return false;
    this.effectChildren.splice(index, 1);
    return true;
  }

  /** Applies a shader option to every effect child. */
  @meta.blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    for (const child of this.effectChildren) child?.SetShaderOption?.(name, value);
  }

  /** Finds a named observer or child-owned sound emitter. */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  AddObserver(observer)
  {
    this.observers.push(observer);
    return observer;
  }

  /** Applies the mute state to effect children and placement observers. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The explicit setter replaces Carbon's Blue field-notify callback.")
  SetMute(isMute)
  {
    this.mute = !!isMute;
    for (const child of this.effectChildren) child?.SetMute?.(this.mute);
    for (const observer of this.observers) observer?.SetMute(this.mute);
  }

  /** Freezes every child at Carbon's high-detail LOD. */
  @meta.blue.method
  @meta.implemented
  FreezeHighDetailMesh()
  {
    this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
    this._changeLOD = false;
    for (const child of this.effectChildren) child?.ChangeLOD?.(this.lodLevel);
  }

  /** Propagates a procedural-container variable to every effect child. */
  @meta.blue.method
  @meta.implemented
  SetProceduralContainerVariable(name, value)
  {
    for (const child of this.effectChildren) child?.SetProceduralContainerVariable?.(name, value);
  }

  /**
   * Builds the per-frame child update parameters naming this root as the
   * space-object parent, carrying its display state and a copy of the current
   * root matrix.
   */
  _CreateChildUpdateParams()
  {
    const params = new EveChildUpdateParams();
    params.spaceObjectParent = this;
    params.isVisible = this.display;
    mat4.copy(params.localToWorldTransform, this._lastUpdateMatrix);
    return params;
  }

  /**
   * Replays every stored controller variable onto a newly added controller or
   * effect child through the named setter, so late additions start with the same
   * state.
   */
  static _ApplyControllerVariables(target, variables, methodName)
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

  /** Carbon's neutral hull data: full activation, unit bounding radius. */
  static _neutralShipData = [ 0, 1, 0, 1 ];

  static _identity = mat4.create();
  static _centerTransform = mat4.create();
  static _bounds = box3.create();
  static _localSphere = vec4.create();
  static _worldSphere = vec4.create();
  static _zero = vec3.create();
  static _translation = vec3.create();
  static _modelTranslation = vec3.create();
  static _missOffset = vec3.create();
  static _missDirection = vec3.create();
  static _identityRotation = quat.create();
  static _rotation = quat.create();
  static _modelRotation = quat.create();
  static _worldRotation = quat.create();
  static _noAlbedo = vec4.create();

  static Tr2Lod = Tr2Lod;

}

// EveEffectRoot2_Blue.cpp: native exposure; unported contracts: ITriTargetable, IEveEffectChildrenOwner, IShaderConfigurer, ITr2LightOwner.
meta.blue.interfaceTable({ interfaces: [IEveSpaceObject2, IInitialize, INotify, ITr2SecondaryLightSource, ITr2CurveSetOwner, ITr2ControllerOwner, ITr2SoundEmitterOwner, ITr2BoundingBox, IWorldPosition, EveEntity], chainTo: null })(EveEffectRoot2, { kind: "class" });
