// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveSpaceObject2.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveSpaceObject2.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveSpaceObject2_Blue.cpp
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../EveEntity.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { EveChildInheritProperties } from "../child/EveChildInheritProperties.js";
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { ReflectionMode } from "../../generated/eve/enums.js";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { ImpactConfiguration } from "../../generated/include/enums.js";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import { Tr2PerObjectData } from "../../trinityCore/Tr2PerObjectData.js";
import { Tr2RenderBatch, TriRenderBatchAreaBlock } from "../../trinityCore/Tr2RenderBatch.js";

// Static scratch for the sorted-transparent area pass (allocation rules: hot
// per-frame path, copy-into, never allocate per call).
const TRANSPARENT_AABB_MIN = vec3.create();
const TRANSPARENT_AABB_MAX = vec3.create();
const TRANSPARENT_CENTER = vec3.create();

// Carbon EveMeshOverlayEffect::OverlayType (EveMeshOverlayEffect.h:35-41).
const OVERLAY_TYPE_OPAQUEONLY = 0;
const OVERLAY_TYPE_ALL = 1;

@type.define({ className: "EveSpaceObject2", family: "eve/spaceObject" })
export class EveSpaceObject2 extends EveEntity
{

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @schema.enum("ReflectionMode")
  reflectionMode = 3;

  /** m_effectChildren (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObjectChild")
  effectChildren = [];

  /** m_children (PIEveTransformVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveTransform")
  children = [];

  /** m_name (std::string) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  name = "";

  /** m_mute (bool) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.boolean
  mute = false;

  /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("EveChildInheritProperties")
  inheritProperties = null;

  /** m_customMasks (PEveCustomMaskVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveCustomMask")
  customMasks = [];

  /** m_overlayEffects (PEveMeshOverlayEffectVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveMeshOverlayEffect")
  overlayEffects = [];

  /** m_positionDelta (Tr2BindingVector3Ptr) [READ] */
  @io.read
  @type.objectRef("Tr2BindingVector3")
  positionDelta = null;

  /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ] */
  @io.read
  @type.int32
  @schema.enum("Tr2Lod")
  lodLevel = -1;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_isPickable (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  isPickable = true;

  /** m_estimatedPixelDiameter (float) [READ] */
  @io.read
  @type.float32
  estimatedPixelDiameter = 0;

  /** m_estimatedPixelDiameterWithChildren (float) [READ] */
  @io.read
  @type.float32
  estimatedPixelDiameterWithChildren = 0;

  /** m_generatedShapeEllipsoidCenter (Vector3) [READ] */
  @io.read
  @type.vec3
  generatedShapeEllipsoidCenter = vec3.create();

  /** m_generatedShapeEllipsoidRadius (Vector3) [READ] */
  @io.read
  @type.vec3
  generatedShapeEllipsoidRadius = vec3.fromValues(-1, -1, -1);

  /** m_animationUpdater (Tr2GrannyAnimationPtr) [READ] */
  @io.read
  @type.objectRef("Tr2GrannyAnimation")
  animationUpdater = null;

  /** m_dna (std::string) [READ, PERSIST] */
  @io.persist
  @type.string
  dna = "";

  /** m_castShadow (bool) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.boolean
  castShadow = false;

  /** m_isAnimated (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isAnimated = false;

  /** m_dynamicBoundingSphereEnabled (bool) [READ, PERSIST] */
  @io.persist
  @type.boolean
  dynamicBoundingSphereEnabled = false;

  /** m_attachments (PIEveSpaceObjectAttachmentVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObjectAttachment")
  attachments = [];

  /** m_decals (PEveSpaceObjectDecalVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSpaceObjectDecal")
  decals = [];

  /** m_lights (PTr2LightVector) [READ, PERSIST, NOTIFY] */
  @io.notify
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

  /** m_locators (PEveLocator2Vector) [READ, PERSIST] */
  @io.persist
  @type.list("EveLocator2")
  locators = [];

  /** m_mesh (Tr2MeshBasePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("Tr2MeshBase")
  mesh = null;

  /** m_impactOverlay (EveImpactOverlayPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveImpactOverlay")
  impactOverlay = null;

  /** m_clipSphereCenter (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  clipSphereCenter = vec3.create();

  /** m_clipSphereFactor2 (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  clipSphereFactor2 = 0;

  /** m_clipSphereFactor (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  clipSphereFactor = 0;

  /** m_observers (PTriObserverLocalVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriObserverLocal")
  observers = [];

  /** m_worldPosition (Vector3) [READ] */
  @io.read
  @type.vec3
  worldPosition = vec3.create();

  /** m_ballRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("ITriQuaternionFunction")
  rotationCurve = null;

  /** m_worldRotation (Quaternion) [READ] */
  @io.read
  @type.quat
  worldRotation = quat.create();

  /** m_modelScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  modelScale = 1;

  /** m_locatorSets (PEveLocatorSetsVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveLocatorSets")
  locatorSets = [];

  /** m_activationStrength (float) [READWRITE] */
  @io.readwrite
  @type.float32
  activationStrength = 1;

  /** m_albedoColor (Color) [READWRITE] */
  @io.readwrite
  @type.color
  albedoColor = vec4.createLinear();

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_update (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  update = true;

  /** m_secondaryLightingSphereRadius (float) [READ] */
  @io.read
  @type.float32
  secondaryLightingSphereRadius = 0;

  /** m_boundingSphereCenter (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  boundingSphereCenter = vec3.create();

  /** m_dirtLevel (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  dirtLevel = 0;

  /** m_psData.customData (Vector4) [READWRITE] - script/SOF-driven custom shader data. */
  @io.readwrite
  @type.vec4
  customShaderData = vec4.create();

  /** m_lastDamageLocatorHit (int) [READ] */
  @io.read
  @type.int32
  lastDamageLocatorHit = -1;

  /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  boundingSphereRadius = -1;

  /** m_boundingSphereWorldCenter (Vector3) [READ] */
  @io.read
  @type.vec3
  modelWorldPosition = vec3.create();

  /** m_modelTranslation (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("ITriVectorFunction")
  modelTranslationCurve = null;

  /** m_modelRotation (ITriQuaternionFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("ITriQuaternionFunction")
  modelRotationCurve = null;

  /** m_shapeEllipsoidCenter (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  shapeEllipsoidCenter = vec3.create();

  /** m_shapeEllipsoidRadius (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  shapeEllipsoidRadius = vec3.fromValues(-1, -1, -1);

  /** m_ballPosition (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("ITriVectorFunction")
  translationCurve = null;

  @io.read
  @type.mat4
  worldTransform = mat4.create();

  @io.read
  @type.mat4
  inverseWorldTransform = mat4.create();

  @io.read
  @type.mat4
  lastWorldTransform = mat4.create();

  @io.read
  @type.vec3
  worldVelocity = vec3.create();

  @io.readwrite
  @type.objectRef("ITr2AudGeometry")
  audioGeometry = null;

  @type.boolean
  isVisible = false;

  #controllerVariables = new Map([
    ["DirtLevel", 0],
    ["ActivationStrength", 1],
    ["ShieldDamage", 1],
    ["ArmorDamage", 1],
    ["HullDamage", 1],
    ["ClipSphereFactor", 0],
    ["ClipSphereFactor2", 0]
  ]);

  #lastUpdateTransformTime = null;

  // Carbon m_lastCurveUpdateTime: stamped by the sync-side LOD gate; the async
  // side updates curve sets only when it matches the frame time.
  #lastCurveUpdateTime = 0;

  // Carbon m_dynamicBoundingSphere: disabled while w is -1; a future animation
  // updater port publishes skinned bounds here.
  #dynamicBoundingSphere = sph3.set(sph3.create(), 0, 0, 0, -1);

  // Carbon keeps the realized world sphere separate from the authored local
  // sphere. It is refreshed by UpdateWorldBounds after transform changes.
  #boundingSphereWorldRadius = -1;

  // Carbon visibility and mesh LOD state are runtime-only renderer results.
  #isInFrustum = false;

  #isMeshVisible = false;

  #lodLevelWithChildren = Tr2Lod.TR2_LOD_UNSPECIFIED;

  #meshScreenSize = 0;

  #overlayMeshAreaBlocks = [ [], [] ];

  #shadowMeshOpaqueAreas = [];

  #cachedAreaBlocksBuilt = false;

  // Carbon m_localAabbMin/Max: cached so GetLocalBoundingBox can answer before
  // LOD selection assigns a mesh (at worst it lags one frame).
  #localAabbMin = vec3.create();

  #localAabbMax = vec3.create();

  // Carbon m_allowLodSelection: cleared by FreezeHighDetailMesh.
  #allowLodSelection = true;

  // Carbon m_impostorMode: the impostor system that raises it is unported.
  #impostorMode = false;

  get meshLod()
  {
    return this.mesh;
  }

  set meshLod(mesh)
  {
    this.mesh = mesh ?? null;
  }

  @carbon.method
  @impl.adapted
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked?.())
      {
        controller?.Link?.(this);
      }
    }
    // Authored inherit properties propagate as part of the lifecycle so a
    // field-populated graph (values import, document hydration) matches the
    // SetInheritProperties authoring path.
    if (this.inheritProperties)
    {
      this.#PropagateInheritProperties();
    }
    // Carbon derives the impact overlay's damage locator count from the
    // "damage" locator set at build time; deriving it here keeps it out of
    // the authored values while reproducing the same live state.
    if (this.impactOverlay)
    {
      let damageLocatorCount = 0;
      for (const set of this.locatorSets)
      {
        if (set?.HasName?.("damage")) damageLocatorCount += set.locators.length;
      }
      this.impactOverlay.SetDamageLocatorCount(damageLocatorCount);
    }
    return true;
  }

  @carbon.method
  @impl.implemented
  GetMesh()
  {
    return this.mesh;
  }

  @carbon.method
  @impl.adapted
  SetMesh(mesh)
  {
    this.mesh = mesh ?? null;
  }

  @carbon.method
  @impl.adapted
  AddController(controller)
  {
    this.controllers.push(controller);
    if (!controller?.IsLinked?.())
    {
      controller?.Link?.(this);
    }
    EveSpaceObject2.#ApplyControllerVariables(controller, this.#controllerVariables, "SetVariable");
    return controller;
  }

  @carbon.method
  @impl.implemented
  AddObserver(observer)
  {
    this.observers.push(observer);
    return observer;
  }

  @carbon.method
  @impl.implemented
  SetInheritProperties(colorSet)
  {
    if (!this.inheritProperties)
    {
      this.inheritProperties = new EveChildInheritProperties();
    }
    this.inheritProperties.SetProperties(colorSet);
    this.#PropagateInheritProperties();
  }

  #PropagateInheritProperties()
  {
    const properties = this.inheritProperties.GetProperties();
    for (const child of this.effectChildren)
    {
      child?.SetInheritProperties?.(properties);
    }
    for (const light of this.lights)
    {
      light?.SetInheritProperties?.(properties);
    }
  }

  @carbon.method
  @impl.implemented
  GetEffectChildByName(name)
  {
    const target = String(name ?? "");
    for (const child of this.effectChildren)
    {
      if ((child?.GetName?.() ?? child?.name ?? "") === target)
      {
        return child;
      }
    }
    return null;
  }

  @carbon.method
  @impl.adapted
  AddToEffectChildrenList(child)
  {
    if (this.inheritProperties)
    {
      child?.SetInheritProperties?.(this.inheritProperties.GetProperties());
    }
    this.effectChildren.push(child);
    EveSpaceObject2.#ApplyControllerVariables(child, this.#controllerVariables, "SetControllerVariable");
    return child;
  }

  @carbon.method
  @impl.implemented
  AddLight(light)
  {
    if (this.inheritProperties)
    {
      light?.SetInheritProperties?.(this.inheritProperties.GetProperties());
    }
    this.lights.push(light);
  }

  @carbon.method
  @impl.implemented
  ClearLights()
  {
    this.lights.length = 0;
  }

  @carbon.method
  @impl.implemented
  RemoveFromEffectChildrenList(child)
  {
    const index = this.effectChildren.indexOf(child);
    if (index === -1)
    {
      return false;
    }
    this.effectChildren.splice(index, 1);
    return true;
  }

  @carbon.method
  @impl.implemented
  SetModelRotationCurve(curve)
  {
    this.modelRotationCurve = curve ?? null;
  }

  @carbon.method
  @impl.implemented
  GetModelRotationCurve()
  {
    return this.modelRotationCurve;
  }

  @carbon.method
  @impl.implemented
  SetModelTranslationCurve(curve)
  {
    this.modelTranslationCurve = curve ?? null;
  }

  @carbon.method
  @impl.implemented
  GetModelTranslationCurve()
  {
    return this.modelTranslationCurve;
  }

  @carbon.method
  @impl.adapted
  UpdateWorldTransform(time)
  {
    const nextTime = Number(time) || 0;
    if (this.#lastUpdateTransformTime === nextTime)
    {
      return false;
    }
    this.#lastUpdateTransformTime = nextTime;
    mat4.copy(this.lastWorldTransform, this.worldTransform);

    EveSpaceObject2.#UpdateCurve(this.translationCurve, nextTime, this.worldPosition, EveSpaceObject2.#zero);
    if (this.translationCurve?.GetValueDotAt)
    {
      this.translationCurve.GetValueDotAt(nextTime, this.worldVelocity);
    }
    else
    {
      vec3.set(this.worldVelocity, 0, 0, 0);
    }

    EveSpaceObject2.#UpdateCurve(this.rotationCurve, nextTime, this.worldRotation, EveSpaceObject2.#identityRotation);
    const rotation = quat.clone(this.worldRotation);
    if (this.modelRotationCurve)
    {
      const modelRotation = quat.create();
      EveSpaceObject2.#UpdateCurve(this.modelRotationCurve, nextTime, modelRotation, EveSpaceObject2.#identityRotation);
      // Carbon (row-vector): rotation = modelRotation * m_worldRotation - model first.
      quat.multiply(rotation, rotation, modelRotation);
    }

    mat4.fromQuat(this.worldTransform, rotation);
    if (this.modelScale !== 1)
    {
      // Carbon (row-vector): m_worldTransform * scaleMatrix - scale LAST
      // (cpp:2711-2716). gl mat4.scale builds W*S = scale FIRST; equivalent
      // ONLY because modelScale is strictly uniform (a uniform scale commutes
      // with the pure rotation here). If modelScale ever becomes a vec3 this
      // must become mat4.multiply(w, S, w) per the swap rule.
      mat4.scale(this.worldTransform, this.worldTransform, [this.modelScale, this.modelScale, this.modelScale]);
    }

    if (this.modelTranslationCurve)
    {
      const modelTranslation = vec3.create();
      EveSpaceObject2.#UpdateCurve(this.modelTranslationCurve, nextTime, modelTranslation, EveSpaceObject2.#zero);
      vec3.transformMat4(modelTranslation, modelTranslation, this.worldTransform);
      this.worldTransform[12] = this.worldPosition[0] + modelTranslation[0];
      this.worldTransform[13] = this.worldPosition[1] + modelTranslation[1];
      this.worldTransform[14] = this.worldPosition[2] + modelTranslation[2];
    }
    else
    {
      this.worldTransform[12] = this.worldPosition[0];
      this.worldTransform[13] = this.worldPosition[1];
      this.worldTransform[14] = this.worldPosition[2];
    }

    if (!mat4.invert(this.inverseWorldTransform, this.worldTransform))
    {
      mat4.identity(this.inverseWorldTransform);
    }
    this.UpdateWorldBounds();
    return true;
  }

  /**
   * Refreshes Carbon's realized world-space sphere from the dynamic skinned
   * sphere when available, otherwise from the authored local sphere.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The browser runtime refreshes the cache with world-transform updates instead of Carbon's renderer-side PrepareShaderData pass.")
  UpdateWorldBounds()
  {
    const updater = this.animationUpdater;
    if (this.dynamicBoundingSphereEnabled && updater?.IsInitialized?.())
    {
      updater.GetDynamicBounds?.(this.#dynamicBoundingSphere, this.#localAabbMin, this.#localAabbMax);
      if (this.#dynamicBoundingSphere[3] > 0)
      {
        vec3.transformMat4(this.modelWorldPosition, this.#dynamicBoundingSphere, this.worldTransform);
        this.#boundingSphereWorldRadius = this.modelScale * this.#dynamicBoundingSphere[3];
        return true;
      }
    }
    if (this.boundingSphereRadius > 0)
    {
      vec3.transformMat4(this.modelWorldPosition, this.boundingSphereCenter, this.worldTransform);
      this.#boundingSphereWorldRadius = this.modelScale * this.boundingSphereRadius;
      return true;
    }
    return false;
  }

  @carbon.method
  @impl.adapted
  UpdateSyncronous(updateContext = null)
  {
    const time = EveSpaceObject2.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
    this.UpdateWorldTransform(time);
    if (!this.update)
    {
      return false;
    }

    const observerTransform = this.GetObserverTransform();
    for (const observer of this.observers)
    {
      observer?.Update?.(observerTransform);
    }

    // LOD-gated curve/overlay stamp (Carbon EveSpaceObject2::UpdateSyncronous:
    // ShouldUpdate(m_lodLevelWithChildren, time - m_lastCurveUpdateTime) -
    // adapted to lodLevel, m_lodLevelWithChildren is unported). Overlay effects
    // receive the context time as BOTH clocks, as Carbon does; the async pass
    // updates curve sets only on frames stamped here.
    if (EveLODHelper.ShouldUpdate(this.lodLevel, time - this.#lastCurveUpdateTime))
    {
      this.#lastCurveUpdateTime = time;
      for (const overlay of this.overlayEffects)
      {
        overlay?.Update?.(time, time);
      }
    }

    if (this.effectChildren.length)
    {
      const params = new EveChildUpdateParams();
      params.spaceObjectParent = this;
      params.ownerMaxSpeed = Number(this.maxSpeed) || 0;
      params.activationStrength = this.activationStrength;
      mat4.copy(params.localToWorldTransform, this.GetLocalToWorldTransform());
      for (const child of this.effectChildren)
      {
        params.isVisible = this.display && (this.DisplayChildren() || !!child?.IsAlwaysOn?.());
        child?.UpdateSyncronous?.(updateContext, params);
      }
    }

    this.impactOverlay?.UpdateSyncronous?.(updateContext, this);
    return true;
  }

  @carbon.method
  @impl.adapted
  UpdateAsyncronous(updateContext = null)
  {
    if (!this.update)
    {
      return 0;
    }

    const threshold = EveSpaceObject2.#GetContextValue(updateContext, "GetHighDetailThreshold", "highDetailThreshold");
    const frequency = this.isVisible && threshold > 0
      ? Math.min(1, this.estimatedPixelDiameter / threshold)
      : 0;
    for (const controller of this.controllers)
    {
      controller?.Update?.(frequency);
    }

    // Object-level curve sets update only on frames the sync-side LOD gate
    // stamped, receiving the context time as BOTH realTime and simTime
    // (Carbon EveSpaceObject2::UpdateAsyncronous: if (m_lastCurveUpdateTime ==
    // time) (*it)->Update(time, time)).
    const time = EveSpaceObject2.#GetContextValue(updateContext, "GetTime", "currentTime", "time");
    if (this.#lastCurveUpdateTime === time)
    {
      for (const curveSet of this.curveSets)
      {
        curveSet?.Update?.(time, time);
      }
    }

    for (const child of this.children)
    {
      child?.Update?.(updateContext);
    }

    if (this.effectChildren.length)
    {
      const params = new EveChildUpdateParams();
      params.spaceObjectParent = this;
      params.ownerMaxSpeed = Number(this.maxSpeed) || 0;
      params.activationStrength = this.activationStrength;
      params.controllerUpdateFrequency = frequency;
      mat4.copy(params.localToWorldTransform, this.GetLocalToWorldTransform());
      for (const child of this.effectChildren)
      {
        params.isVisible = this.display && (this.DisplayChildren() || !!child?.IsAlwaysOn?.());
        child?.UpdateAsyncronous?.(updateContext, params);
      }
    }

    this.impactOverlay?.UpdateAsyncronous?.(updateContext, this);
    return frequency;
  }

  /**
   * Updates Carbon's visibility, pixel-size, and mesh-LOD state, then forwards
   * visibility to the explicitly owned visual branches.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Native impostor, raytracing, and audio-emitter realization remain engine-owned; graph visibility and LOD state are preserved.")
  UpdateVisibility(updateContext = null, _parentTransform = EveSpaceObject2.#identityTransform)
  {
    this.isVisible = false;
    this.#isMeshVisible = false;
    this.#isInFrustum = false;
    if (!this.display)
    {
      return false;
    }

    this.UpdateWorldBounds();
    this.lodLevel = Tr2Lod.TR2_LOD_LOW;
    this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_LOW;
    this.#impostorMode = false;

    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const lowThreshold = EveSpaceObject2.#GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");
    const mediumThreshold = EveSpaceObject2.#GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
    const visibilityThreshold = EveSpaceObject2.#GetContextValue(updateContext, "GetVisibilityThreshold", "visibilityThreshold");
    const lodFactor = EveSpaceObject2.#GetContextValue(updateContext, "GetLodFactor", "lodFactor") || 1;

    if (this.boundingSphereRadius > 0 && this.#boundingSphereWorldRadius > 0)
    {
      EveSpaceObject2.#SetSphere(
        EveSpaceObject2.#worldSphere,
        this.modelWorldPosition,
        this.#boundingSphereWorldRadius
      );
      if (frustum?.IsSphereVisible?.(EveSpaceObject2.#worldSphere) !== false)
      {
        this.EstimatePixelDiameter(frustum);
        this.#isMeshVisible = true;
      }
    }

    for (const attachment of this.attachments)
    {
      if (attachment?.UpdateVisibility?.(updateContext, this.worldTransform, null, 0))
      {
        this.#isMeshVisible = true;
        this.isVisible = true;
      }
    }

    if (this.DisplayChildren())
    {
      for (const child of this.children)
      {
        child?.UpdateVisibility?.(updateContext, this.worldTransform);
      }
    }

    if (this.GetBoundingSphere(EveSpaceObject2.#worldSphere, 1))
    {
      this.#isInFrustum = frustum?.IsSphereVisible?.(EveSpaceObject2.#worldSphere) !== false;
      this.estimatedPixelDiameterWithChildren = EveSpaceObject2.#GetPixelSize(frustum, EveSpaceObject2.#worldSphere);
      if (this.#isInFrustum && this.estimatedPixelDiameterWithChildren >= visibilityThreshold)
      {
        this.isVisible = true;
      }
    }

    if (this.isVisible)
    {
      if (this.estimatedPixelDiameter > mediumThreshold) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
      else if (this.estimatedPixelDiameter > lowThreshold) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;

      if (this.estimatedPixelDiameterWithChildren > mediumThreshold) this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_HIGH;
      else if (this.estimatedPixelDiameterWithChildren > lowThreshold) this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_MEDIUM;
      else this.#lodLevelWithChildren = Tr2Lod.TR2_LOD_LOW;
    }

    for (const observer of this.observers)
    {
      const target = observer?.GetObserver?.() ?? observer?.observer;
      target?.SetVisibility?.(this.isVisible);
    }
    for (const child of this.effectChildren)
    {
      child?.UpdateVisibility?.(updateContext, this.worldTransform, this.#lodLevelWithChildren);
    }

    if (this.mesh && this.#boundingSphereWorldRadius > 0)
    {
      EveSpaceObject2.#SetSphere(
        EveSpaceObject2.#worldSphere,
        this.modelWorldPosition,
        this.#boundingSphereWorldRadius
      );
      this.#meshScreenSize = EveSpaceObject2.#GetEstimatedPixelSize(frustum, EveSpaceObject2.#worldSphere) * lodFactor;
      if (!this.#allowLodSelection) this.#meshScreenSize = Infinity;
      this.mesh.UseWithScreenSize?.(this.#meshScreenSize, this.#boundingSphereWorldRadius);
    }
    return this.isVisible;
  }

  /** Collects the hull and explicitly owned Carbon child/decal renderables. */
  @carbon.method
  @impl.adapted
  @impl.reason("Impostor submission and decal mesh caches are engine-owned; Trinity returns the backend-neutral renderable graph.")
  GetRenderables(out = [])
  {
    if (!this.display || !this.isVisible) return out;
    if (this.#allowLodSelection && this.#isMeshVisible)
    {
      this.mesh?.GetBoundingBox?.(this.#localAabbMin, this.#localAabbMax);
    }
    if (this.mesh && this.#isMeshVisible && this.mesh.IsLoading?.() !== true)
    {
      out.push(this);
    }
    if (this.DisplayChildren())
    {
      for (const child of this.children) child?.GetRenderables?.(out);
    }
    for (const child of this.effectChildren)
    {
      if (this.DisplayChildren() || child?.IsAlwaysOn?.()) child?.GetRenderables?.(out);
    }
    if (this.mesh && this.#isMeshVisible)
    {
      const geometryResource = this.mesh.GetGeometryResource?.();
      if (geometryResource)
      {
        for (const decal of this.decals)
        {
          decal?.GetRenderables?.(out, null, geometryResource, this.#meshScreenSize);
        }
      }
    }
    return out;
  }

  /** Carbon ITr2Renderable contract (EveSpaceObject2.cpp:1097-1140): activated
   * attachments recurse, the impact overlay contributes, the hull mesh delegates
   * per batch type, and TRANSPARENT routes through the distance-sorted area
   * path. GetBatchesFromOverlayVector (precomputed overlay area blocks) is
   * deferred with the overlay realization work. */
  @carbon.method
  @impl.adapted
  @impl.reason("Overlay area-block batches are deferred; the view position arrives via the appended render-context argument instead of Carbon's renderer global.")
  GetBatches(batches, batchType, perObjectData, reason, renderContext = null)
  {
    if (!this.mesh) return false;
    if (this.mesh.display === false) return false;

    // Returns whether any batch was committed (JS addition; Carbon returns
    // void). The O(1) accumulator count makes the delta check free.
    const committedBefore = batches.GetBatchCount?.() ?? 0;

    if (this.activationStrength !== 0)
    {
      for (const attachment of this.attachments)
      {
        attachment?.GetBatches?.(batches, batchType, perObjectData, reason);
      }
    }

    this.impactOverlay?.GetBatches?.(batches, batchType, perObjectData, this.#meshScreenSize);

    const areas = this.mesh.GetAreas?.(batchType);
    if (areas)
    {
      if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT)
      {
        this.mesh.GetBatches(batches, areas, perObjectData);
      }
      else
      {
        this.#GetSortedTransparentBatches(areas, batches, perObjectData, renderContext);
      }
    }

    // add overlay effect batches (Carbon calls this for every batch type)
    this.GetBatchesFromOverlayVector(batches, perObjectData, batchType, this.mesh);

    return (batches.GetBatchCount?.() ?? 0) > committedBefore;
  }

  // Carbon GetSortedBatchesFromMeshAreaVector (EveSpaceObject2.cpp:57-121):
  // object-space area bounding-box centers -> world space -> squared distance to
  // the view position, sorted back-to-front (descending), committed in that
  // order into the order-preserving TRANSPARENT accumulator. Bounding boxes come
  // from the geometry resource when it exposes them; a failed lookup keeps
  // Carbon's origin-center fallback.
  #GetSortedTransparentBatches(areas, batches, perObjectData, renderContext)
  {
    const geometry = this.mesh.GetGeometryResource?.() ?? null;
    const viewPosition = renderContext?.GetViewPosition?.();
    const meshIndex = this.mesh.meshIndex ?? 0;

    const sorted = [];
    for (const area of areas)
    {
      if (!area || area.GetDisplay?.() === false) continue;

      vec3.set(TRANSPARENT_CENTER, 0, 0, 0);
      if (geometry?.GetAreaBoundingBox?.(meshIndex, area.GetIndex(), TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX))
      {
        vec3.add(TRANSPARENT_CENTER, TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX);
        vec3.scale(TRANSPARENT_CENTER, TRANSPARENT_CENTER, 0.5);
      }
      vec3.transformMat4(TRANSPARENT_CENTER, TRANSPARENT_CENTER, this.worldTransform);

      const dx = (viewPosition?.[0] ?? 0) - TRANSPARENT_CENTER[0];
      const dy = (viewPosition?.[1] ?? 0) - TRANSPARENT_CENTER[1];
      const dz = (viewPosition?.[2] ?? 0) - TRANSPARENT_CENTER[2];
      sorted.push({ area, distance: dx * dx + dy * dy + dz * dz });
    }

    sorted.sort((a, b) => b.distance - a.distance);

    for (const entry of sorted)
    {
      const area = entry.area;
      if (!area.GetMaterialInterface?.()) continue;
      const batch = this.mesh.CreateGeometryBatch(geometry, area, perObjectData);
      if (batch) batches.Commit(batch);
    }
  }

  /** Rebuilds the cached overlay/shadow area-block lists from the current mesh
   * (Carbon RebuildCachedData, EveSpaceObject2.cpp:2077-2097, triggered there by
   * the geometry-resource load callback). TYPE_ALL = shadow-casting OPAQUE +
   * TRANSPARENT + DECAL areas; TYPE_OPAQUEONLY = shadow-casting OPAQUE; the
   * shadow list groups OPAQUE areas by shared material. All coalesced. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon rebuilds from the geometry-resource notify callback; the GPU-free port rebuilds lazily on first batch use from the mesh areas alone.")
  RebuildCachedData()
  {
    this.ReleaseCachedData();
    if (!this.mesh) return;

    const all = this.#overlayMeshAreaBlocks[OVERLAY_TYPE_ALL];
    this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_OPAQUE);
    this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_TRANSPARENT);
    this.mesh.CollectAreaBlocks(all, TriBatchType.TRIBATCHTYPE_DECAL);
    this.mesh.CollectAreaBlocks(
      this.#overlayMeshAreaBlocks[OVERLAY_TYPE_OPAQUEONLY], TriBatchType.TRIBATCHTYPE_OPAQUE);
    for (const blocks of this.#overlayMeshAreaBlocks)
    {
      TriRenderBatchAreaBlock.Optimize(blocks);
    }

    this.mesh.CollectAreaBlocksWithSharedMaterials(
      this.#shadowMeshOpaqueAreas, TriBatchType.TRIBATCHTYPE_OPAQUE);
    for (const collector of this.#shadowMeshOpaqueAreas)
    {
      collector.Optimize();
    }
    this.#cachedAreaBlocksBuilt = true;
  }

  @carbon.method
  @impl.implemented
  ReleaseCachedData()
  {
    for (const blocks of this.#overlayMeshAreaBlocks)
    {
      blocks.length = 0;
    }
    this.#shadowMeshOpaqueAreas.length = 0;
    this.#cachedAreaBlocksBuilt = false;
  }

  #EnsureCachedAreaBlocks()
  {
    if (!this.#cachedAreaBlocksBuilt && this.mesh) this.RebuildCachedData();
  }

  /** Carbon GetShadowBatches (EveSpaceObject2.cpp:1143-1184): one batch per
   * cached shared-material OPAQUE area block, using the area's own material.
   * Carbon bakes realized-LOD draw args; the GPU-free port defers them to the
   * engine via the geometry source descriptor, so shadowPixelSize travels unused
   * until engine LOD selection consumes it. */
  @carbon.method
  @impl.adapted
  @impl.reason("Realized-LOD draw args are engine-resolved from the geometry source descriptor; primitive-count gating happens at realization.")
  GetShadowBatches(batches, perObjectData, _shadowPixelSize)
  {
    if (!this.mesh || this.mesh.display === false) return false;
    this.#EnsureCachedAreaBlocks();

    const geometry = this.mesh.GetGeometryResource?.() ?? null;
    const meshIndex = this.mesh.meshIndex ?? 0;

    let committed = false;
    for (const collector of this.#shadowMeshOpaqueAreas)
    {
      const material = collector.shaderMaterial;
      if (!material) continue;
      for (const block of collector.areaBlockVector)
      {
        const batch = new Tr2RenderBatch();
        batch.SetMaterial(material);
        if (!batch.IsValid()) continue;
        batch.SetGeometrySource(geometry, meshIndex, block.startIndex, block.count, false);
        batch.SetPerObjectData(perObjectData ?? null);
        committed = batches.Commit(batch) || committed;
      }
    }
    return committed;
  }

  /** Carbon GetBatchesFromOverlayVector (EveSpaceObject2.cpp:1199-1285): the
   * impact overlay's armor-damage shader draws over the TYPE_ALL blocks at
   * maximum priority; each displayed overlay effect draws its per-batch-type
   * effects over its overlay-type blocks (OPAQUE -> TYPE_OPAQUEONLY, everything
   * else -> TYPE_ALL). */
  @carbon.method
  @impl.adapted
  @impl.reason("Overlay selection is fully represented in the CPU graph; realized-LOD draw arguments remain engine-owned.")
  GetBatchesFromOverlayVector(batches, perObjectData, batchType, mesh)
  {
    const impactEffect = this.impactOverlay?.GetArmorDamageShader?.(batchType) ?? null;
    if (!impactEffect && !this.overlayEffects.length) return false;
    if (!mesh) return false;
    this.#EnsureCachedAreaBlocks();

    const committedBefore = batches.GetBatchCount?.() ?? 0;

    const geometry = mesh.GetGeometryResource?.() ?? null;
    const meshIndex = mesh.meshIndex ?? 0;

    if (impactEffect)
    {
      for (const block of this.#overlayMeshAreaBlocks[OVERLAY_TYPE_ALL])
      {
        this.#CommitBlockBatch(batches, impactEffect, geometry, meshIndex, block, perObjectData, 0xFFFFFFFF);
      }
    }

    for (const overlay of this.overlayEffects)
    {
      const effects = this.#OverlayEffectsFor(overlay, batchType);
      if (!effects) continue;

      const overlayType = overlay.GetType(batchType);
      const blocks = this.#overlayMeshAreaBlocks[overlayType];
      for (const effect of effects)
      {
        for (const block of blocks)
        {
          this.#CommitBlockBatch(batches, effect, geometry, meshIndex, block, perObjectData, 0);
        }
      }
    }

    return (batches.GetBatchCount?.() ?? 0) > committedBefore;
  }

  #CommitBlockBatch(batches, material, geometry, meshIndex, block, perObjectData, priority)
  {
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(material);
    if (!batch.IsValid()) return;
    if (priority !== 0) batch.SetPriority(priority);
    batch.SetGeometrySource(geometry, meshIndex, block.startIndex, block.count, false);
    batch.SetPerObjectData(perObjectData ?? null);
    batches.Commit(batch);
  }

  // EveMeshOverlayEffect::GetEffects (display-gated, per batch type).
  #OverlayEffectsFor(overlay, batchType)
  {
    return overlay?.GetEffects?.(batchType) ?? null;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Portable mesh area access replaces Carbon's native mesh-area vectors.")
  HasTransparentBatches()
  {
    if (!this.mesh) return false;
    if ((this.mesh.GetAreas?.(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0) return true;

    for (const overlay of this.overlayEffects)
    {
      if (overlay?.HasTransparentArea?.()) return true;
    }
    return false;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z);
  }

  /** Carbon allocates Tr2PerObjectDataWithPersistentBuffers<EveSpaceObject2>,
   * which calls back into the object at upload time; the GPU-free record carries
   * the same live object reference for the engine serializer (the space-object
   * Main profile) to pull current values at realization. */
  @carbon.method
  @impl.adapted
  @impl.reason("Persistent VS/PS device buffers are engine-owned; the record carries the object reference the engine serializer consumes.")
  GetPerObjectData(accumulator = null)
  {
    const data = typeof accumulator?.Allocate === "function"
      ? accumulator.Allocate(Tr2PerObjectData)
      : new Tr2PerObjectData();
    data.object = this;
    return data;
  }

  /** Carbon forwards the shadow pass to the same per-object record. */
  @carbon.method
  @impl.implemented
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

  /** Carbon EveSpaceObject2::GetLights (cpp:3536-3555): display gate only
   * (no lights-empty early-out, unlike EveChildMesh), then per light
   * AddLight(manager, worldTransform, 1, bones, boneCount) FOLLOWED by
   * SetBrightnessMultiplier(m_activationStrength) - the order is contract:
   * the submission uses the multiplier stamped on the PREVIOUS pass (first
   * pass uses the Tr2Light default 1) - one frame of activation-strength
   * lag, preserved verbatim. cpp:3554's dead `DisplayChildren()` local is
   * not ported. */
  @carbon.method
  @impl.adapted
  @impl.reason("The granny bone list (Tr2GrannyAnimationUtils::GetBoneList, cpp:3545-3547) awaits the JS animation seam - (null, 0) is passed, the established EveChildMesh convention.")
  GetLights(lightManager)
  {
    if (!this.display)
    {
      return;
    }
    for (const light of this.lights)
    {
      light?.AddLight?.(lightManager, this.worldTransform, 1, null, 0);
      light?.SetBrightnessMultiplier?.(this.activationStrength);
    }
  }

  /** Carbon EveSpaceObject2::IsCastingShadow (cpp:1940-1990) culls against the
   * camera/shadow frustums; awaits the TriFrustum port (visibility pass).
   * Presence satisfies the "ShadowCaster" duck contract. */
  @carbon.method
  @impl.notImplemented
  IsCastingShadow(..._args)
  {
    throw new Error("EveSpaceObject2.IsCastingShadow is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpaceObject2::RegisterComponents (cpp:3568-3609): registers its
   * own components and its children with the scene registration container "so
   * we don't have to traverse the tree every frame". RegisterAudioGeometry
   * (cpp:3572-3575) is audio-engine-owned and unported. Gate m_display. */
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

      if (ShouldReflect(this.reflectionMode))
      {
        registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
      }

      if (this.castShadow)
      {
        registry.RegisterComponent(EveComponentType.ShadowCaster, this);
      }

      for (const child of this.effectChildren)
      {
        child?.Register?.(registry);
      }

      for (const attachment of this.attachments)
      {
        attachment?.Register?.(registry);
      }
    }
  }

  /** Carbon EveSpaceObject2::UnRegisterComponents (cpp:3615-3638): forwards
   * the un-registration to the children only - EveEntity::UnRegister already
   * called UnRegisterAllComponents(this) first (EveEntity.cpp:90) - and does
   * not re-check display. UnregisterAudioGeometry (cpp:3617) is
   * audio-engine-owned and unported. */
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

      for (const attachment of this.attachments)
      {
        attachment?.UnRegister?.(registry);
      }
    }
  }

  @carbon.method
  @impl.implemented
  DisplayChildren()
  {
    return true;
  }

  @carbon.method
  @impl.implemented
  GetObserverTransform()
  {
    return this.worldTransform;
  }

  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform()
  {
    return this.worldTransform;
  }

  /** Carbon's non-updating model-center query. */
  @carbon.method
  @impl.implemented
  GetModelCenterWorldPosition(out)
  {
    vec3.transformMat4(out, this.boundingSphereCenter, this.worldTransform);
  }

  @carbon.method
  @impl.implemented
  GetWorldPosition()
  {
    return this.worldPosition;
  }

  @carbon.method
  @impl.implemented
  GetWorldRotation()
  {
    return this.worldRotation;
  }

  @carbon.method
  @impl.implemented
  FindSoundEmitter(name)
  {
    const target = String(name ?? "");
    for (const observer of this.observers)
    {
      if (observer?.name === target)
      {
        return typeof observer.GetObserver === "function"
          ? observer.GetObserver()
          : observer.observer ?? null;
      }
    }
    for (const child of this.effectChildren)
    {
      const emitter = child?.FindSoundEmitter?.(target);
      if (emitter)
      {
        return emitter;
      }
    }
    return null;
  }

  @carbon.method
  @impl.adapted
  SetMute(mute)
  {
    this.mute = !!mute;
    for (const child of this.effectChildren)
    {
      child?.SetMute?.(this.mute);
    }
    for (const observer of this.observers)
    {
      observer?.SetMute?.(this.mute);
    }
  }

  /**
   * Plays an animation with explicit loop, start, and speed settings
   * (Carbon PlayAnimationEx, MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   */
  @carbon.method
  @impl.adapted
  PlayAnimationEx(animName, loopCount, start, speed, clearWhenDone = true)
  {
    this.#PlayAnimation(animName, true, loopCount, start, speed, clearWhenDone);
  }

  /**
   * Calculates the skinned bounding box under a transform (CMF path: the
   * local box corners transformed with perspective divide). The granny path
   * is unported. Returns an inverted-empty { min, max } box when dynamic
   * bounds are disabled, as Carbon's BoundingBoxInitialize does.
   */
  @carbon.method
  @impl.adapted
  CalculateSkinnedBoundingBoxFromTransform(transform)
  {
    const min = vec3.fromValues(Infinity, Infinity, Infinity);
    const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource?.()?.IsUsingCMF?.())
    {
      const { min: localMin, max: localMax } = this.GetLocalBoundingBox();
      const corner = vec3.create();
      for (let index = 0; index < 8; index++)
      {
        vec3.set(
          corner,
          index & 1 ? localMax[0] : localMin[0],
          index & 2 ? localMax[1] : localMin[1],
          index & 4 ? localMax[2] : localMin[2]
        );
        vec3.transformMat4(corner, corner, transform);
        vec3.min(min, min, corner);
        vec3.max(max, max, corner);
      }
    }
    return { min, max };
  }

  /**
   * Calculates the skinned bounding sphere (CMF path: the current bounding
   * sphere; granny path unported). Returns (0,0,0,-1) when dynamic bounds
   * are disabled.
   */
  @carbon.method
  @impl.adapted
  CalculateSkinnedBoundingSphere(out = vec4.create())
  {
    if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource?.()?.IsUsingCMF?.())
    {
      const center = this.GetBoundingSphereCenter();
      return vec4.set(out, center[0], center[1], center[2], this.GetBoundingSphereRadius());
    }
    return vec4.set(out, 0, 0, 0, -1);
  }

  /**
   * Clears all impact and damage effects on the impact overlay.
   */
  @carbon.method
  @impl.implemented
  ClearImpactDamage()
  {
    this.impactOverlay?.Clear?.();
  }

  /**
   * Clears all animations on the animation updater.
   */
  @carbon.method
  @impl.implemented
  ClearAnimations()
  {
    this.animationUpdater?.ClearAnimations?.();
  }

  /**
   * Creates an impact facing a position on the closest facing damage locator.
   */
  @carbon.method
  @impl.implemented
  CreateImpactFromPosition(position, direction, lifeTime, size)
  {
    const closestDamageLocator = this.#GetClosestLocatorIndex(position, EveSpaceObject2.#damageLocatorSetName);
    return this.CreateImpact(closestDamageLocator, direction, lifeTime, size);
  }

  /**
   * Creates an impact effect on a damage locator through the impact overlay.
   */
  @carbon.method
  @impl.adapted
  CreateImpact(damageLocatorIndex, direction, lifeTime, size)
  {
    if (this.impactOverlay)
    {
      return this.impactOverlay.CreateImpact?.(damageLocatorIndex, direction, lifeTime, size, 1, this.lodLevel, this) ?? -1;
    }
    return -1;
  }

  /**
   * Ends the current animation on the animation updater.
   */
  @carbon.method
  @impl.implemented
  EndAnimation()
  {
    this.animationUpdater?.EndAnimation?.();
  }

  /**
   * Freezes LOD selection at the current mesh and marks decal geometry
   * frozen.
   */
  @carbon.method
  @impl.implemented
  FreezeHighDetailMesh()
  {
    this.#allowLodSelection = false;
    for (const decal of this.decals)
    {
      decal?.SetHighDetailDecalState?.(true);
    }
  }

  /**
   * Gets the number of damage locators on this object.
   */
  @carbon.method
  @impl.implemented
  GetDamageLocatorCount()
  {
    return this.GetLocatorCount(EveSpaceObject2.#damageLocatorSetName);
  }

  /**
   * Gets the number of locators in a named locator set.
   */
  @carbon.method
  @impl.implemented
  GetLocatorCount(locatorSetName)
  {
    return this.#GetLocatorsForSet(locatorSetName)?.length ?? 0;
  }

  /**
   * Gets the first locator list whose set has the requested Carbon name.
   * The returned list remains owned by the locator set.
   */
  @carbon.method
  @impl.implemented
  GetLocatorsForSet(locatorSetName)
  {
    return this.#GetLocatorsForSet(locatorSetName);
  }

  /**
   * Gets the closest locator in a set to a world position, ignoring locator
   * facing. Returns -1 when the set is missing or empty.
   */
  @carbon.method
  @impl.implemented
  GetCloseLocatorIndex(position, locatorSetName)
  {
    const locators = this.#GetLocatorsForSet(locatorSetName);
    if (!locators)
    {
      return -1;
    }
    const posInObjectSpace = vec3.transformMat4(vec3.create(), position, this.inverseWorldTransform);
    const locatorPosition = vec3.create();
    const locatorDirection = vec3.create();
    let closestLength = Infinity;
    let closestIndex = -1;
    for (let index = 0; index < locators.length; index++)
    {
      this.#GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index]);
      const distance = vec3.squaredDistance(locatorPosition, posInObjectSpace);
      if (distance < closestLength)
      {
        closestIndex = index;
        closestLength = distance;
      }
    }
    return closestIndex;
  }

  /**
   * Carbon's script surface maps GetGoodLocatorIndex to GetCloseLocatorIndex
   * (EveSpaceObject2_Blue.cpp); the internal randomized fit heuristic is not
   * script-exposed.
   */
  @carbon.method
  @impl.adapted
  GetGoodLocatorIndex(position, locatorSetName)
  {
    return this.GetCloseLocatorIndex(position, locatorSetName);
  }

  /**
   * Gets the local direction of an indexed damage locator, (0,0,0) for
   * indices out of range (Carbon script GetDamageLocatorDirection maps to
   * GetDamageLocatorDirectionLocal).
   */
  @carbon.method
  @impl.adapted
  GetDamageLocatorDirection(index, inWorldSpaceOrOut = vec3.create(), out = vec3.create())
  {
    const targetableCall = typeof inWorldSpaceOrOut === "boolean";
    const inWorldSpace = targetableCall && inWorldSpaceOrOut;
    if (!targetableCall) out = inWorldSpaceOrOut;
    const locators = this.#GetLocatorsForSet(EveSpaceObject2.#damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      vec3.set(out, 0, targetableCall ? 1 : 0, 0);
      return targetableCall ? false : out;
    }
    const position = vec3.create();
    this.#GetLocatorInObjectSpace(position, out, locators[index]);
    if (inWorldSpace) EveSpaceObject2.#TransformNormal(out, out, this.worldTransform);
    return targetableCall ? true : out;
  }

  /** Internal ITriTargetable locator query, using the org-standard out-last convention. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS keeps output parameters last and returns a validity flag for targetable callers.")
  GetDamageLocatorPosition(index, inWorldSpace, out = vec3.create())
  {
    const locators = this.#GetLocatorsForSet(EveSpaceObject2.#damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      if (inWorldSpace) vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
      else vec3.set(out, 0, 0, 0);
      return false;
    }
    this.#GetLocatorInObjectSpace(out, EveSpaceObject2.#locatorDirection, locators[index]);
    if (inWorldSpace) vec3.transformMat4(out, out, this.worldTransform);
    return true;
  }

  /** Gets the closest facing damage locator for ITriTargetable consumers. */
  @carbon.method
  @impl.implemented
  GetClosestDamageLocatorIndex(position)
  {
    return this.#GetClosestLocatorIndex(position, EveSpaceObject2.#damageLocatorSetName);
  }

  /** Ports Carbon's randomized distance/direction fit for impact variation. */
  @carbon.method
  @impl.adapted
  @impl.reason("TriRand is represented by Math.random; all locator scoring remains source-faithful.")
  GetGoodDamageLocatorIndex(position)
  {
    const locators = this.#GetLocatorsForSet(EveSpaceObject2.#damageLocatorSetName);
    if (!locators) return 0;

    const objectPosition = vec3.transformMat4(EveSpaceObject2.#objectPosition, position, this.inverseWorldTransform);
    let minDistance = Infinity;
    let maxDistance = Number.MIN_VALUE;
    let bestDirectionFit = 0;

    for (const locator of locators)
    {
      this.#GetLocatorInObjectSpace(EveSpaceObject2.#locatorPosition, EveSpaceObject2.#locatorDirection, locator);
      if (!EveSpaceObject2.#IsLocatorFacingPosition(EveSpaceObject2.#locatorDirection, objectPosition)) continue;
      vec3.subtract(EveSpaceObject2.#locatorOffset, EveSpaceObject2.#locatorPosition, objectPosition);
      const distance = vec3.length(EveSpaceObject2.#locatorOffset);
      minDistance = Math.min(minDistance, distance);
      maxDistance = Math.max(maxDistance, distance);
      if (distance) vec3.scale(EveSpaceObject2.#locatorOffset, EveSpaceObject2.#locatorOffset, 1 / distance);
      bestDirectionFit = Math.max(bestDirectionFit, EveSpaceObject2.#GetDirectionFit(EveSpaceObject2.#locatorDirection, EveSpaceObject2.#locatorOffset));
    }

    const desiredFit = Math.random() * (0.25 - (1 - bestDirectionFit)) + 0.75;
    let bestFit = 1;
    let bestLocator = -1;
    for (let index = 0; index < locators.length; index++)
    {
      this.#GetLocatorInObjectSpace(EveSpaceObject2.#locatorPosition, EveSpaceObject2.#locatorDirection, locators[index]);
      if (!EveSpaceObject2.#IsLocatorFacingPosition(EveSpaceObject2.#locatorDirection, objectPosition)) continue;
      vec3.subtract(EveSpaceObject2.#locatorOffset, EveSpaceObject2.#locatorPosition, objectPosition);
      const distance = vec3.length(EveSpaceObject2.#locatorOffset);
      const range = maxDistance - minDistance;
      let scale = range > 0 ? 1 - (distance - minDistance) / range : 1;
      let value = 2 * scale - 1;
      value = value < 0 ? 1 - Math.sqrt(Math.abs(value)) : Math.sqrt(Math.abs(value)) + 1;
      value *= 0.5;
      if (distance) vec3.scale(EveSpaceObject2.#locatorOffset, EveSpaceObject2.#locatorOffset, 1 / distance);
      value *= EveSpaceObject2.#GetDirectionFit(EveSpaceObject2.#locatorDirection, EveSpaceObject2.#locatorOffset);
      const fit = Math.abs(value - desiredFit);
      if (fit < bestFit)
      {
        bestFit = fit;
        bestLocator = index;
      }
    }
    return bestLocator < 0 ? this.#GetClosestLocatorIndex(position, EveSpaceObject2.#damageLocatorSetName) : bestLocator;
  }

  /** Gets the model-scaled target radius. */
  @carbon.method
  @impl.implemented
  GetRadius()
  {
    return this.GetBoundingSphereRadius();
  }

  /** Computes a miss point just outside the model silhouette. */
  @carbon.method
  @impl.implemented
  GetMissPosition(hit, source, out = vec3.create())
  {
    if (this.boundingSphereRadius > 0)
    {
      vec3.copy(out, this.modelWorldPosition);
      if (hit && source)
      {
        vec3.subtract(EveSpaceObject2.#missOffset, hit, out);
        vec3.subtract(EveSpaceObject2.#missDirection, hit, source);
        const directionLength = vec3.length(EveSpaceObject2.#missDirection);
        if (directionLength) vec3.scale(EveSpaceObject2.#missDirection, EveSpaceObject2.#missDirection, 1 / directionLength);
        vec3.scaleAndAdd(EveSpaceObject2.#missOffset, EveSpaceObject2.#missOffset, EveSpaceObject2.#missDirection, -vec3.dot(EveSpaceObject2.#missDirection, EveSpaceObject2.#missOffset));
        const offsetLength = vec3.length(EveSpaceObject2.#missOffset);
        if (offsetLength) vec3.scale(EveSpaceObject2.#missOffset, EveSpaceObject2.#missOffset, 1 / offsetLength);
        vec3.scaleAndAdd(out, out, EveSpaceObject2.#missOffset, this.GetBoundingSphereRadius() * 1.125);
      }
    }
    else
    {
      this.GetDamageLocatorPosition(-1, true, out);
    }
    return out;
  }

  /** Gets the current target impact material. */
  @carbon.method
  @impl.implemented
  GetImpactConfiguration()
  {
    return this.impactOverlay?.GetImpactConfiguration?.() ?? ImpactConfiguration.IMPACT_INVALID;
  }

  /** Reports whether impacts currently use the authored shield ellipsoid. */
  @carbon.method
  @impl.implemented
  HasImpactConfigurationShield()
  {
    return !!this.impactOverlay?.HasShieldEllipsoid?.()
      && this.GetImpactConfiguration() === ImpactConfiguration.IMPACT_SHIELD;
  }

  /** Resolves a shield-ray or damage-locator collision point. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses an out-last signature; the ellipsoid intersection is otherwise source-faithful CPU math.")
  GetImpactPosition(locator, posPrev, posNow, epsilon, out = vec3.create())
  {
    if (!this.HasImpactConfigurationShield())
    {
      this.GetDamageLocatorPosition(locator, true, out);
      return vec3.squaredDistance(posNow, out) < Number(epsilon);
    }

    vec3.transformMat4(EveSpaceObject2.#rayOrigin, posPrev, this.inverseWorldTransform);
    vec3.transformMat4(EveSpaceObject2.#rayEnd, posNow, this.inverseWorldTransform);
    vec3.subtract(EveSpaceObject2.#rayDirection, EveSpaceObject2.#rayEnd, EveSpaceObject2.#rayOrigin);
    this.GetShapeEllipsoid(EveSpaceObject2.#ellipsoidCenter, EveSpaceObject2.#ellipsoidRadii);
    const t = EveSpaceObject2.#IntersectEllipsoidRay(out, EveSpaceObject2.#ellipsoidCenter, EveSpaceObject2.#ellipsoidRadii, EveSpaceObject2.#rayOrigin, EveSpaceObject2.#rayDirection);
    if (t !== null && t >= -1 && t <= 1)
    {
      vec3.transformMat4(out, out, this.worldTransform);
      return true;
    }
    if (EveSpaceObject2.#IsPointInsideEllipsoid(EveSpaceObject2.#ellipsoidCenter, EveSpaceObject2.#ellipsoidRadii, EveSpaceObject2.#rayEnd))
    {
      vec3.copy(out, posNow);
      return true;
    }
    return false;
  }

  /** Updates an existing impact overlay entry. */
  @carbon.method
  @impl.implemented
  UpdateImpact(out, direction, impactIndex)
  {
    return this.impactOverlay?.UpdateImpact?.(out, direction, impactIndex) ?? false;
  }

  /**
   * Gets the local position of an indexed damage locator, (0,0,0) for
   * indices out of range.
   */
  @carbon.method
  @impl.implemented
  GetDamageLocator(index, out = vec3.create())
  {
    const locators = this.#GetLocatorsForSet(EveSpaceObject2.#damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      return vec3.set(out, 0, 0, 0);
    }
    const direction = vec3.create();
    this.#GetLocatorInObjectSpace(out, direction, locators[index]);
    return out;
  }

  /**
   * Gets the world-space position of an indexed damage locator, (0,0,0) for
   * indices out of range (returned untransformed, as Carbon does).
   */
  @carbon.method
  @impl.implemented
  GetTransformedDamageLocator(index, out = vec3.create())
  {
    const locators = this.#GetLocatorsForSet(EveSpaceObject2.#damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      return vec3.set(out, 0, 0, 0);
    }
    const direction = vec3.create();
    this.#GetLocatorInObjectSpace(out, direction, locators[index]);
    return vec3.transformMat4(out, out, this.worldTransform);
  }

  /**
   * Checks whether this object is in impostor mode. The impostor system that
   * raises the flag is unported, so this reports the default until then.
   */
  @carbon.method
  @impl.adapted
  IsImpostor()
  {
    return this.#impostorMode;
  }

  /**
   * Gets a locator position from a named set. Out-of-range or missing-set
   * queries return the world translation in world space and (0,0,0) in
   * object space, as Carbon does.
   */
  @carbon.method
  @impl.implemented
  GetLocatorPositionFromSet(index, inWorldSpace, locatorSetName, out = vec3.create())
  {
    const locators = this.#GetLocatorsForSet(locatorSetName);
    if (index < 0 || !locators || index >= locators.length)
    {
      if (inWorldSpace)
      {
        return vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
      }
      return vec3.set(out, 0, 0, 0);
    }
    const direction = vec3.create();
    this.#GetLocatorInObjectSpace(out, direction, locators[index]);
    if (inWorldSpace)
    {
      vec3.transformMat4(out, out, this.worldTransform);
    }
    return out;
  }

  /**
   * Gets a locator direction from a named set. Out-of-range or missing-set
   * queries return (0,1,0), as Carbon does.
   */
  @carbon.method
  @impl.implemented
  GetLocatorRotationFromSet(index, inWorldSpace, locatorSetName, out = vec3.create())
  {
    const locators = this.#GetLocatorsForSet(locatorSetName);
    if (index < 0 || !locators || index >= locators.length)
    {
      return vec3.set(out, 0, 1, 0);
    }
    const position = vec3.create();
    this.#GetLocatorInObjectSpace(position, out, locators[index]);
    if (inWorldSpace)
    {
      EveSpaceObject2.#TransformNormal(out, out, this.worldTransform);
    }
    return out;
  }

  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    const eventName = String(name ?? "");
    for (const controller of this.controllers)
    {
      controller?.HandleEvent?.(eventName);
    }
    for (const child of this.effectChildren)
    {
      child?.HandleControllerEvent?.(eventName);
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.HandleControllerEvent?.(eventName);
    }
  }

  /**
   * Plays an animation once, replacing the current one
   * (Carbon script PlayAnimation maps to PlayAnimationOnce).
   */
  @carbon.method
  @impl.adapted
  PlayAnimation(animName)
  {
    this.#PlayAnimation(animName, true, 1, 0, 1, true);
  }

  /**
   * Chains an animation once after the current one (Carbon ChainAnimation).
   */
  @carbon.method
  @impl.implemented
  ChainAnimation(animName)
  {
    this.#PlayAnimation(animName, false, 1, 0, 1, true);
  }

  /**
   * Chains an animation with explicit loop, start, and speed settings
   * (Carbon ChainAnimationEx).
   */
  @carbon.method
  @impl.implemented
  ChainAnimationEx(animName, loopCount, start, speed)
  {
    this.#PlayAnimation(animName, false, loopCount, start, speed, true);
  }

  // Carbon EveSpaceObject2::PlayAnimation: every playback wrapper funnels
  // into the animation updater, which owns playback state; a missing updater
  // is a Carbon-faithful no-op.
  #PlayAnimation(animName, replace, loopCount, delay, speed, clearWhenDone)
  {
    this.animationUpdater?.PlayAnimation?.(String(animName ?? ""), replace, loopCount, delay, speed, clearWhenDone);
  }

  /**
   * Recalculates the authored bounding sphere from the mesh geometry
   * resource. Fails when no mesh or ready geometry resource is attached.
   */
  @carbon.method
  @impl.adapted
  RebuildBoundingSphereInformation()
  {
    const mesh = this.mesh;
    if (!mesh)
    {
      return false;
    }
    const geometryRes = mesh.GetGeometryResource?.();
    if (!geometryRes || !geometryRes.IsGood?.())
    {
      return false;
    }
    geometryRes.RecalculateBoundingSphere?.();
    const sphere = vec4.create();
    geometryRes.GetBoundingSphere?.(mesh.GetMeshIndex?.() ?? 0, sphere);
    vec3.set(this.boundingSphereCenter, sphere[0], sphere[1], sphere[2]);
    this.boundingSphereRadius = sphere[3];
    return true;
  }

  /** Sets Carbon's authored local bounding sphere from a sph3-compatible value. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's CcpMath::Sphere is represented by core-math sph3; object-shaped center/radius input is accepted at adapter boundaries.")
  SetBoundingSphereInformation(sphere)
  {
    if (sphere?.center)
    {
      vec3.copy(this.boundingSphereCenter, sphere.center);
      this.boundingSphereRadius = Number(sphere.radius);
    }
    else
    {
      this.boundingSphereRadius = sph3.extract(sphere, this.boundingSphereCenter);
    }
    this.UpdateWorldBounds();
    return this;
  }

  @carbon.method
  @impl.implemented
  GetControllerVariables()
  {
    return Object.fromEntries(this.#controllerVariables);
  }

  /** Gets Carbon's most recently selected geometry LOD. */
  @carbon.method
  @impl.adapted
  @impl.reason("Geometry resources without multi-LOD support expose their sole browser LOD as index zero.")
  GetLastUsedMeshLod()
  {
    const geometryResource = this.mesh?.GetGeometryResource?.();
    if (!geometryResource) return -1;
    if (!this.#allowLodSelection) return 0;
    return geometryResource.GetLodIndexForScreenSize?.(this.mesh?.GetMeshIndex?.() ?? 0, this.#meshScreenSize) ?? 0;
  }

  /**
   * Gets a named locator's transform (Carbon script GetLocatorTransform maps
   * to GetEveLocatorTransform): the identity for unknown names, the animated
   * bone world transform when the animation updater resolves the name, else
   * the authored locator transform.
   */
  @carbon.method
  @impl.adapted
  GetLocatorTransform(name, out = mat4.create())
  {
    const target = String(name ?? "");
    let locator = null;
    for (const candidate of this.locators)
    {
      if (candidate?.GetName?.() === target)
      {
        locator = candidate;
        break;
      }
    }
    if (!locator)
    {
      return mat4.identity(out);
    }
    if (this.animationUpdater?.GetBoneWorldTransform?.(target, out))
    {
      return out;
    }
    return mat4.copy(out, locator.GetTransform());
  }

  /**
   * Gets the local axis-aligned bounding box: dynamic skinned bounds when
   * enabled, else the mesh box, else the cached box (at worst it lags one
   * frame). With out arguments it fills them and returns true; without, it
   * returns { min, max }.
   */
  @carbon.method
  @impl.adapted
  GetLocalBoundingBox(minBounds, maxBounds)
  {
    const min = vec3.create();
    const max = vec3.create();
    const updater = this.animationUpdater;
    if (this.dynamicBoundingSphereEnabled && updater?.IsInitialized?.())
    {
      const sphere = vec4.create();
      updater.GetDynamicBounds?.(sphere, min, max);
      vec3.copy(this.#localAabbMin, min);
      vec3.copy(this.#localAabbMax, max);
    }
    else if (this.mesh?.GetBoundingBox?.(min, max))
    {
      vec3.copy(this.#localAabbMin, min);
      vec3.copy(this.#localAabbMax, max);
    }
    else
    {
      vec3.copy(min, this.#localAabbMin);
      vec3.copy(max, this.#localAabbMax);
    }
    if (minBounds && maxBounds)
    {
      vec3.copy(minBounds, min);
      vec3.copy(maxBounds, max);
      return true;
    }
    return { min, max };
  }

  /** Gets Carbon's cached local box transformed into a world-axis-aligned box. */
  @carbon.method
  @impl.adapted
  GetWorldBoundingBox(minBounds, maxBounds)
  {
    box3.fromBounds(EveSpaceObject2.#localBox, this.#localAabbMin, this.#localAabbMax);
    box3.transformMat4(EveSpaceObject2.#worldBox, EveSpaceObject2.#localBox, this.worldTransform);
    const min = minBounds ?? vec3.create();
    const max = maxBounds ?? vec3.create();
    vec3.set(min, EveSpaceObject2.#worldBox[0], EveSpaceObject2.#worldBox[1], EveSpaceObject2.#worldBox[2]);
    vec3.set(max, EveSpaceObject2.#worldBox[3], EveSpaceObject2.#worldBox[4], EveSpaceObject2.#worldBox[5]);
    return minBounds && maxBounds ? true : { min, max };
  }

  /** Reports whether the attached mesh has a ready geometry resource. */
  @carbon.method
  @impl.implemented
  IsBoundingBoxReady()
  {
    const geometryResource = this.mesh?.GetGeometryResource?.();
    return !!geometryResource?.IsGood?.();
  }

  /**
   * Gets Carbon's realized world sphere, optionally accumulated with transform
   * and effect children when query is EVE_BOUNDS_WITH_CHILDREN.
   */
  @carbon.method
  @impl.adapted
  GetBoundingSphere(out = sph3.create(), query = 0)
  {
    if (!this.UpdateWorldBounds()) return false;
    EveSpaceObject2.#SetSphere(out, this.modelWorldPosition, this.#boundingSphereWorldRadius);
    if (!query || !this.DisplayChildren()) return true;
    for (const child of this.children)
    {
      if (child?.GetBoundingSphere?.(EveSpaceObject2.#childSphere, query))
      {
        sph3.union(out, out, EveSpaceObject2.#childSphere);
      }
    }
    for (const child of this.effectChildren)
    {
      if (child?.GetBoundingSphere?.(EveSpaceObject2.#childSphere, query))
      {
        sph3.union(out, out, EveSpaceObject2.#childSphere);
      }
    }
    return true;
  }

  /** Updates Carbon's geometry-derived on-screen pixel diameter. */
  @carbon.method
  @impl.adapted
  @impl.reason("TriFrustum is supplied structurally by the active engine; both exact and estimated browser frustum methods are supported.")
  EstimatePixelDiameter(frustum)
  {
    if (this.mesh?.GetBoundingBox?.(EveSpaceObject2.#boundsMin, EveSpaceObject2.#boundsMax))
    {
      vec3.copy(this.#localAabbMin, EveSpaceObject2.#boundsMin);
      vec3.copy(this.#localAabbMax, EveSpaceObject2.#boundsMax);
    }
    sph3.fromBounds(EveSpaceObject2.#localSphere, this.#localAabbMin, this.#localAabbMax);
    sph3.transformMat4(EveSpaceObject2.#worldSphere, EveSpaceObject2.#localSphere, this.worldTransform);
    this.estimatedPixelDiameter = EveSpaceObject2.#GetPixelSize(frustum, EveSpaceObject2.#worldSphere);
    return this.estimatedPixelDiameter;
  }

  /** Reports the result of the latest Carbon visibility update. */
  @carbon.method
  @impl.implemented
  IsInFrustum()
  {
    return this.#isInFrustum;
  }

  /**
   * Gets the bounding sphere center, preferring the dynamic skinned sphere
   * when one is published.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphereCenter(out = vec3.create())
  {
    if (this.#dynamicBoundingSphere[3] !== -1)
    {
      return vec3.set(out, this.#dynamicBoundingSphere[0], this.#dynamicBoundingSphere[1], this.#dynamicBoundingSphere[2]);
    }
    return vec3.copy(out, this.boundingSphereCenter);
  }

  /**
   * Gets the model-scaled bounding sphere radius, preferring the dynamic
   * skinned sphere when one is published.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphereRadius()
  {
    if (this.#dynamicBoundingSphere[3] !== -1)
    {
      return this.modelScale * this.#dynamicBoundingSphere[3];
    }
    return this.modelScale * this.boundingSphereRadius;
  }

  /**
   * Gets the number of mesh-bound bones. Carbon dereferences the animation
   * updater unchecked; CarbonEngineJS reports 0 when none is attached.
   */
  @carbon.method
  @impl.adapted
  GetBoneCount()
  {
    const updater = this.animationUpdater;
    if (!updater)
    {
      return 0;
    }
    if (updater.IsUsingCMF?.())
    {
      if (!updater.HasMeshBinding?.())
      {
        return 0;
      }
      return updater.GetSkeletonBoneIndices?.().length ?? 0;
    }
    return updater.GetMeshBindingBoneCount?.() ?? 0;
  }

  @carbon.method
  @impl.adapted
  SetImpactDamageState(shield, armor, hull, doCreateArmorImpacts = true)
  {
    this.impactOverlay?.SetDamageState?.(shield, armor, hull, doCreateArmorImpacts);
    this.SetControllerVariable("ShieldDamage", shield);
    this.SetControllerVariable("ArmorDamage", armor);
    this.SetControllerVariable("HullDamage", hull);
  }

  /**
   * Toggles a named impact-overlay animation (boosters, hardeners, ...).
   */
  @carbon.method
  @impl.implemented
  SetImpactAnimation(name, enable, duration)
  {
    this.impactOverlay?.ToggleEffect?.(name, enable, duration);
  }

  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name ?? "");
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers)
    {
      controller?.SetVariable?.(key, next);
    }
    for (const child of this.effectChildren)
    {
      child?.SetControllerVariable?.(key, next);
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.SetControllerVariable?.(key, next);
    }
  }

  @carbon.method
  @impl.implemented
  SetProceduralContainerVariable(name, value)
  {
    for (const child of this.effectChildren)
    {
      child?.SetProceduralContainerVariable?.(name, value);
    }
  }

  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers)
    {
      controller?.Start?.();
    }
    for (const child of this.effectChildren)
    {
      child?.StartControllers?.();
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.StartControllers?.();
    }
  }

  /**
   * Applies bone and model transforms to locators and returns
   * [position, rotation, boneIndex] tuples, as the Carbon script surface
   * does (TransformLocators maps to PyTransformLocators). Accepts either
   * locator records ({ position, direction, boneIndex }, Carbon's
   * LocatorStructureList shape) or the same [position, rotation, boneIndex]
   * tuple shape it returns.
   */
  @carbon.method
  @impl.adapted
  TransformLocators(locators = [])
  {
    const result = [];
    for (const locator of locators ?? [])
    {
      const record = Array.isArray(locator)
        ? { position: locator[0], rotation: locator[1], boneIndex: locator[2] }
        : { position: locator?.position, rotation: locator?.direction ?? locator?.rotation, boneIndex: locator?.boneIndex };
      const position = vec3.clone(record.position ?? EveSpaceObject2.#zero);
      const rotation = quat.clone(record.rotation ?? EveSpaceObject2.#identityRotation);
      const boneIndex = Number(record.boneIndex ?? 0);
      this.#TransformLocator(position, rotation, boneIndex);
      if (this.modelTranslationCurve || this.modelRotationCurve)
      {
        this.#ApplyModelTransform(position, rotation);
      }
      result.push([position, rotation, boneIndex]);
    }
    return result;
  }

  // Carbon Blue TransformLocator: bone-attached records pick up the mesh
  // bone matrix; without bone data the authored values pass through.
  #TransformLocator(position, rotation, boneIndex)
  {
    const updater = this.animationUpdater;
    if (boneIndex <= 0 || !updater?.IsInitialized?.())
    {
      return;
    }
    const bone = EveSpaceObject2.#GetBoneMatrix(updater, boneIndex);
    if (!bone)
    {
      return;
    }
    vec3.transformMat4(position, position, bone);
    const boneRotation = mat4.getRotation(quat.create(), bone);
    quat.multiply(rotation, boneRotation, rotation);
  }

  // Carbon Blue ApplyModelTransform samples both curves at the Be::Time()
  // origin (pure GetValueAt, no playback advance): translation adds, model
  // rotation rotates the position and pre-multiplies.
  #ApplyModelTransform(position, rotation)
  {
    if (this.modelTranslationCurve)
    {
      const translation = vec3.create();
      this.modelTranslationCurve.GetValueAt?.(0, translation);
      vec3.add(position, position, translation);
    }
    if (this.modelRotationCurve)
    {
      const modelRotation = quat.create();
      this.modelRotationCurve.GetValueAt?.(0, modelRotation);
      vec3.transformQuat(position, position, modelRotation);
      quat.multiply(rotation, modelRotation, rotation);
    }
  }

  // Carbon GetLocatorsForSet: first set matching the name wins.
  #GetLocatorsForSet(locatorSetName)
  {
    const target = String(locatorSetName ?? "");
    for (const set of this.locatorSets)
    {
      if (set?.HasName?.(target))
      {
        return set.GetLocators();
      }
    }
    return null;
  }

  // Carbon GetLocatorInObjectSpace: the direction is +Y rotated by the
  // authored quaternion; bone-attached locators additionally apply the mesh
  // bone matrix. Carbon leaves the outputs untouched (caller-uninitialized)
  // when bone data is missing; CarbonEngineJS keeps the unskinned values.
  #GetLocatorInObjectSpace(outPosition, outDirection, locator)
  {
    vec3.transformQuat(outDirection, EveSpaceObject2.#unitY, locator.direction);
    vec3.copy(outPosition, locator.position);
    const updater = this.animationUpdater;
    if (locator.boneIndex > 0 && updater?.IsInitialized?.())
    {
      const boneCount = Number(updater.GetMeshBoneCount?.() ?? 0);
      if (locator.boneIndex < boneCount)
      {
        const bone = EveSpaceObject2.#GetBoneMatrix(updater, locator.boneIndex);
        if (bone)
        {
          vec3.transformMat4(outPosition, locator.position, bone);
          EveSpaceObject2.#TransformNormal(outDirection, outDirection, bone);
        }
      }
    }
  }

  // Carbon GetClosestLocatorIndex: facing-gated closest search; 0 when the
  // set is missing, -1 when no locator faces the position.
  #GetClosestLocatorIndex(position, locatorSetName)
  {
    const locators = this.#GetLocatorsForSet(locatorSetName);
    if (!locators)
    {
      return 0;
    }
    const posInObjectSpace = vec3.transformMat4(vec3.create(), position, this.inverseWorldTransform);
    const locatorPosition = vec3.create();
    const locatorDirection = vec3.create();
    let closestLength = Infinity;
    let closestIndex = -1;
    for (let index = 0; index < locators.length; index++)
    {
      this.#GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index]);
      if (!EveSpaceObject2.#IsLocatorFacingPosition(locatorDirection, posInObjectSpace))
      {
        continue;
      }
      const distance = vec3.squaredDistance(locatorPosition, posInObjectSpace);
      if (distance < closestLength)
      {
        closestIndex = index;
        closestLength = distance;
      }
    }
    return closestIndex;
  }

  static #IsLocatorFacingPosition(locatorDirection, posInObjectSpace)
  {
    const moved = vec3.subtract(vec3.create(), posInObjectSpace, locatorDirection);
    return vec3.squaredLength(moved) < vec3.squaredLength(posInObjectSpace);
  }

  static #TransformNormal(out, direction, matrix)
  {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }

  /** Carbon's authored-or-derived local shape ellipsoid query. */
  @carbon.method
  @impl.implemented
  GetShapeEllipsoid(outCenter, outRadii)
  {
    if (this.shapeEllipsoidRadius[0] > 0)
    {
      vec3.copy(outCenter, this.shapeEllipsoidCenter);
      vec3.copy(outRadii, this.shapeEllipsoidRadius);
    }
    else
    {
      const bounds = this.GetLocalBoundingBox(EveSpaceObject2.#boundsMin, EveSpaceObject2.#boundsMax);
      if (bounds === false)
      {
        vec3.set(EveSpaceObject2.#boundsMin, -1, -1, -1);
        vec3.set(EveSpaceObject2.#boundsMax, 1, 1, 1);
      }
      vec3.subtract(outRadii, EveSpaceObject2.#boundsMax, EveSpaceObject2.#boundsMin);
      vec3.scale(outRadii, outRadii, Math.sqrt(3) * 0.5);
      vec3.lerp(outCenter, EveSpaceObject2.#boundsMin, EveSpaceObject2.#boundsMax, 0.5);
    }
    vec3.copy(this.generatedShapeEllipsoidCenter, outCenter);
    vec3.copy(this.generatedShapeEllipsoidRadius, outRadii);
  }

  static #GetDirectionFit(v0, v1)
  {
    const direction = -vec3.dot(v0, v1);
    return direction < 0
      ? (1 - Math.sqrt(Math.abs(direction))) * 0.5
      : (Math.sqrt(Math.abs(direction)) + 1) * 0.5;
  }

  static #IntersectEllipsoidRay(out, center, radii, origin, direction)
  {
    const vx = direction[0] / radii[0];
    const vy = direction[1] / radii[1];
    const vz = direction[2] / radii[2];
    const sx = (origin[0] - center[0]) / radii[0];
    const sy = (origin[1] - center[1]) / radii[1];
    const sz = (origin[2] - center[2]) / radii[2];
    const vv = vx * vx + vy * vy + vz * vz;
    if (!(vv > 0)) return null;
    const vs = vx * sx + vy * sy + vz * sz;
    const ss = sx * sx + sy * sy + sz * sz;
    let discriminant = (vs / vv) ** 2 - ss / vv + 1 / vv;
    if (discriminant < 0) return null;
    discriminant = Math.sqrt(discriminant);
    let t = -discriminant - vs / vv;
    if (t < 0) t = discriminant - vs / vv;
    vec3.scaleAndAdd(out, origin, direction, t);
    return t;
  }

  static #IsPointInsideEllipsoid(center, radii, point)
  {
    const x = (point[0] - center[0]) / radii[0];
    const y = (point[1] - center[1]) / radii[1];
    const z = (point[2] - center[2]) / radii[2];
    return x * x + y * y + z * z <= 1;
  }

  // Mesh bone matrices come from the animation updater; only mat4-shaped
  // entries are usable.
  static #GetBoneMatrix(updater, boneIndex)
  {
    const bones = updater.GetMeshBoneMatrixList?.();
    const bone = bones?.[boneIndex];
    return bone && bone.length >= 16 ? bone : null;
  }

  static #ApplyControllerVariables(target, variables, methodName)
  {
    const setter = target?.[methodName];
    if (typeof setter !== "function")
    {
      return;
    }
    for (const [name, value] of variables)
    {
      setter.call(target, name, value);
    }
  }

  static #UpdateCurve(curve, time, out, fallback)
  {
    if (!curve)
    {
      for (let index = 0; index < out.length; index++)
      {
        out[index] = fallback[index];
      }
      return out;
    }

    let result;
    if (typeof curve.Update === "function")
    {
      result = curve.Update(time, out);
    }
    else if (typeof curve.GetValueAt === "function")
    {
      result = curve.GetValueAt(time, out);
    }
    if ((Array.isArray(result) || ArrayBuffer.isView(result)) && result !== out)
    {
      for (let index = 0; index < out.length; index++)
      {
        out[index] = result[index];
      }
    }
    return out;
  }

  static #GetContextValue(context, methodName, ...propertyNames)
  {
    const method = context?.[methodName];
    if (typeof method === "function")
    {
      return Number(method.call(context)) || 0;
    }
    for (const propertyName of propertyNames)
    {
      if (context?.[propertyName] !== undefined && context?.[propertyName] !== null)
      {
        return Number(context[propertyName]) || 0;
      }
    }
    return 0;
  }

  static #GetPixelSize(frustum, sphere)
  {
    const method = frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }

  static #GetEstimatedPixelSize(frustum, sphere)
  {
    const method = frustum?.GetPixelSizeAccrossEst ?? frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }

  static #SetSphere(out, center, radius)
  {
    return sph3.set(out, center[0], center[1], center[2], radius);
  }

  static #zero = Object.freeze([0, 0, 0]);

  static #unitY = Object.freeze([0, 1, 0]);

  static #locatorDirection = vec3.create();
  static #locatorPosition = vec3.create();
  static #locatorOffset = vec3.create();
  static #objectPosition = vec3.create();
  static #missOffset = vec3.create();
  static #missDirection = vec3.create();
  static #rayOrigin = vec3.create();
  static #rayEnd = vec3.create();
  static #rayDirection = vec3.create();
  static #ellipsoidCenter = vec3.create();
  static #ellipsoidRadii = vec3.create();
  static #boundsMin = vec3.create();
  static #boundsMax = vec3.create();
  static #childSphere = sph3.create();
  static #localSphere = sph3.create();
  static #worldSphere = sph3.create();
  static #localBox = box3.create();
  static #worldBox = box3.create();

  static #identityRotation = Object.freeze([0, 0, 0, 1]);

  static #identityTransform = mat4.create();

  static #damageLocatorSetName = "damage";

  static ReflectionMode = ReflectionMode;

  static Tr2Lod = Tr2Lod;

  static ImpactConfiguration = ImpactConfiguration;

}
