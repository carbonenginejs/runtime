// Source: trinity/trinity/Eve/SpaceObject/EveSpaceObject2.h
// Source: trinity/trinity/Eve/SpaceObject/EveSpaceObject2.cpp
// Source: trinity/trinity/Eve/SpaceObject/EveSpaceObject2_Blue.cpp
import { CjsSchema, carbon, impl, io, type } from "#schema";
import { withITr2BoundingBox } from "#contracts";
import { EveEntity } from "../EveEntity.js";
import { EveChildUpdateParams } from "../EveChildUpdateParams.js";
import { EveChildInheritProperties } from "../child/EveChildInheritProperties.js";
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { ImpactConfiguration } from "../../generated/include/enums.js";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { ReflectionMode, TriBatchType } from "#consts/graphics";
import { MatrixCopyFrom3x4 } from "../lights/lightConversion.js";
import { getBoneList } from "../../core/animation/Tr2GrannyAnimation.js";
import { Tr2PerObjectData } from "../../core/rawData/Tr2PerObjectData.js";
import { Tr2RenderBatch, TriRenderBatchAreaBlock } from "../../core/batch/Tr2RenderBatch.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition.js";
import { CarbonVertexElements } from "../../core/vertex/vertexUsage.js";
import { RawData } from "../../core/rawData/RawData.js";
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from "../../core/view/Tr2PickType.js";
import { IEveSpaceObject2ParentData } from "./IEveSpaceObject2ParentData.js";
import { EveCustomMask } from "../EveCustomMask.js";
import { EveCollectAreas } from "../child/EveSpaceObjectChild.js";
import { EveGetLocatorPose, EveLocatorSets } from "../locator/EveLocatorSets.js";
import { Locator } from "../locator/Locator.js";
import { TriPerlinCurve } from "../../curves/curve/TriPerlinCurve.js";
import { withITr2Renderable } from "../../core/ITr2Renderable.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";

// Static scratch for the sorted-transparent area pass (allocation rules: hot
// per-frame path, copy-into, never allocate per call).
const TRANSPARENT_AABB_MIN = vec3.create();
const TRANSPARENT_AABB_MAX = vec3.create();
const TRANSPARENT_CENTER = vec3.create();

// Carbon EveMeshOverlayEffect::OverlayType (EveMeshOverlayEffect.h:35-41).
const OVERLAY_TYPE_OPAQUEONLY = 0;
const OVERLAY_TYPE_ALL = 1;

/**
 * The hull of an EVE space object - its mesh, locators, locator sets, decals,
 * attachments, lights, effect children, overlay effects, impact overlay and
 * controllers - together with the curve-driven world transform, visibility, LOD
 * and batch submission that drive them each frame.
 */
@type.define({ className: "EveSpaceObject2", family: "eve/spaceObject" })
export class EveSpaceObject2 extends withITr2Renderable(withITr2BoundingBox(EveEntity))
{

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("ReflectionMode")
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
  @type.enum("Tr2Lod")
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

  /**
   * m_spaceObjectShipData (Vector4) [READ] - the packed shader ship data:
   * .y activation strength, .z dirt level, .w bounding-sphere radius
   * (PrepareShaderData, cpp:734-744). .x is authored elsewhere and left alone.
   */
  @io.read
  @type.vec4
  spaceObjectShipData = vec4.create();

  /** m_lastDamageLocatorHit (int) [READ] */
  @io.read
  @type.int32
  lastDamageLocatorHit = -1;

  @io.notify
  @io.readwrite
  @type.boolean
  damageLocatorAutoFilterEnabled = false;

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

  #mergedLocatorSets = [];

  #mergedDamageLocatorSources = [];

  #damageLocatorEnabled = [];

  #mergedLocatorSetsDirty = true;

  #damageLocatorFilterRequested = false;

  #damageFilterOccluders = [];

  // Carbon m_damageFilterAreas (EveSpaceObject2.h:829): the shared area pool
  // the occluders' areaStart/areaCount ranges index into.
  #damageFilterAreas = [];

  // 0 idle, 1 pending, 2 active raycast session. Carbon initializes Idle
  // (EveSpaceObject2.cpp:208); SOF's eager RunDamageLocatorFilter was removed
  // upstream (ae5680b3), so filtering runs only when requested or auto-enabled.
  #damageFilterState = 0;

  // Carbon m_localAabbMin/Max: cached so GetLocalBoundingBox can answer before
  // LOD selection assigns a mesh (at worst it lags one frame).
  #localAabbMin = vec3.create();

  #localAabbMax = vec3.create();

  // Carbon m_allowLodSelection: cleared by FreezeHighDetailMesh.
  #allowLodSelection = true;

  // Carbon m_impostorMode: the impostor system that raises it is unported.
  #impostorMode = false;

  /** EVE_SPACEOBJECT_CUSTOWMASK_MAX (EveSpaceObject2.h:49) - custom-mask slots. */
  static CUSTOM_MASK_MAX = EveCustomMask.CUSTOM_MASK_COUNT;

  /**
   * Carbon g_secondaryLightingRadiusCutoffFactor (cpp:52), a registered engine
   * setting defaulting to 0.3. It scales this hull's bounding radius into the
   * cutoff below which a secondary light source is too small to matter.
   */
  static SECONDARY_LIGHTING_RADIUS_CUTOFF_FACTOR = 0.3;

  /** Scratch for the per-frame shader-data fill; never allocate in it. */
  static #clipSphereCenterScratch = vec3.create();

  static #shapeCenterScratch = vec3.create();

  static #shapeRadiusScratch = vec3.create();

  // Carbon m_vsData / m_psData: the PERSISTENT per-object records. They are
  // owner-held members across frames rather than pool leases, because the
  // object fills them during update and reads them back afterwards
  // (cpp:3747 takes the world translation out of the STORED transposed matrix).
  // Carbon's paired m_perObjectDataVs/m_perObjectDataPs GPU buffers are the
  // engine's business; Invalidate on these records carries the same signal.
  #vsData = RawData.create("EveSpaceObjectVSData");

  #psData = RawData.create("EveSpaceObjectPSData");

  /** Alias for the mesh property; reads and writes go straight to mesh. */
  get meshLod()
  {
    return this.mesh;
  }

  /** Alias for the mesh property; reads and writes go straight to mesh. */
  set meshLod(mesh)
  {
    this.mesh = mesh ?? null;
  }

  /**
   * Links the authored controllers, pushes authored inherit properties down to
   * the effect children and lights, and derives the impact overlay's damage
   * locator count from the "damage" locator set - which Carbon does at build
   * time - so a field-populated graph reaches the same live state as the
   * authoring path.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked())
      {
        controller?.Link(this);
      }
    }
    // Authored inherit properties propagate as part of the lifecycle so a
    // field-populated graph (values import, document hydration) matches the
    // SetInheritProperties authoring path.
    if (this.inheritProperties)
    {
      this.#PropagateInheritProperties();
    }

    for (const child of this.effectChildren) child.SetOwner(this);

    this.InvalidateMergedLocators("structure");
    // Carbon derives the impact overlay's damage locator count from the
    // "damage" locator set at build time; deriving it here keeps it out of
    // the authored values while reproducing the same live state.
    if (this.impactOverlay)
    {
      this.EnsureChildLocatorMerged();
      this.impactOverlay.SetDamageLocatorCount(this.GetDamageLocatorCount());
    }
    return true;
  }

  /** Returns the hull mesh, or null when none is attached. */
  @carbon.method
  @impl.implemented
  GetMesh()
  {
    return this.mesh;
  }

  /**
   * Replaces the hull mesh; the cached area blocks are only rebuilt on the next
   * batch call.
   */
  @carbon.method
  @impl.adapted
  SetMesh(mesh)
  {
    this.mesh = mesh ?? null;
  }

  /** Borrowed overlay vector used by child mesh inheritance. */
  @carbon.method
  @impl.implemented
  GetOverlayEffects()
  {
    return this.overlayEffects;
  }

  /**
   * Appends a controller, links it to this object when it is not already linked,
   * and replays the current controller variables onto it.
   */
  @carbon.method
  @impl.adapted
  AddController(controller)
  {
    this.controllers.push(controller);
    if (!controller?.IsLinked())
    {
      controller?.Link(this);
    }
    EveSpaceObject2.#ApplyControllerVariables(controller, this.#controllerVariables, "SetVariable");
    return controller;
  }

  /**
   * Appends a placement observer, which is repositioned from the observer
   * transform on every synchronous update; the observer is returned for
   * chaining.
   */
  @carbon.method
  @impl.implemented
  AddObserver(observer)
  {
    this.observers.push(observer);
    return observer;
  }

  /**
   * Sets the colour set that effect children and lights inherit, creating the
   * inherit-properties holder on first use, and pushes it to the existing
   * children and lights.
   */
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

  /** Pushes the current inherited properties to every effect child and light. */
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

  /**
   * Returns the first effect child with the given name, or null when none
   * matches.
   */
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

  /**
   * Appends an effect child, first giving it the hull's inherited properties and
   * then replaying the current controller variables onto it, so a late addition
   * starts in the same state as the rest.
   */
  @carbon.method
  @impl.adapted
  AddToEffectChildrenList(child)
  {
    if (this.inheritProperties)
    {
      child?.SetInheritProperties?.(this.inheritProperties.GetProperties());
    }
    child.SetOwner(this);
    this.effectChildren.push(child);
    this.InvalidateMergedLocators("structure");
    EveSpaceObject2.#ApplyControllerVariables(child, this.#controllerVariables, "SetControllerVariable");
    return child;
  }

  /** Appends a light, first giving it the hull's inherited properties. */
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

  /**
   * Drops every light from the hull; component registration is not revisited
   * here.
   */
  @carbon.method
  @impl.implemented
  ClearLights()
  {
    this.lights.length = 0;
  }

  /**
   * Removes an effect child, returning false when it is not attached to this
   * hull.
   */
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
    child.SetOwner(null);
    this.InvalidateMergedLocators("structure");
    return true;
  }

  /**
   * Sets the curve that rotates the model within the hull's ball rotation, or
   * clears it when passed nothing.
   */
  @carbon.method
  @impl.implemented
  SetModelRotationCurve(curve)
  {
    this.modelRotationCurve = curve ?? null;
  }

  /** Returns the model rotation curve, or null when none is set. */
  @carbon.method
  @impl.implemented
  GetModelRotationCurve()
  {
    return this.modelRotationCurve;
  }

  /**
   * Sets the curve that offsets the model within the hull's ball position, or
   * clears it when passed nothing.
   */
  @carbon.method
  @impl.implemented
  SetModelTranslationCurve(curve)
  {
    this.modelTranslationCurve = curve ?? null;
  }

  /** Returns the model translation curve, or null when none is set. */
  @carbon.method
  @impl.implemented
  GetModelTranslationCurve()
  {
    return this.modelTranslationCurve;
  }

  /**
   * Rebuilds the hull world transform for a frame from the ball position and rotation curves plus the optional model translation and rotation curves, applies modelScale as a uniform scale, then refreshes the inverse transform and the world bounds; the previous world transform is kept for motion vectors and the world velocity comes from the position curve's derivative.
   * @param {number} time Frame time; repeating the previous call's time is a no-op.
   * @returns {boolean} False when the transform had already been built for this time.
   */
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
    // Carbon cpp:2675-2676: the OUTGOING transform becomes worldTransformLast,
    // stored transposed in both records, before the new one is built.
    this.#vsData.SetAndTranspose("worldTransformLast", this.lastWorldTransform);
    this.#psData.SetAndTranspose("worldTransformLast", this.lastWorldTransform);

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
    if (this.dynamicBoundingSphereEnabled && updater && updater.IsInitialized())
    {
      updater.GetDynamicBounds(
        this.#dynamicBoundingSphere, this.#localAabbMin, this.#localAabbMax);
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

  /**
   * Carbon EveSpaceObject2::PrepareShaderData (cpp:734-763): refreshes the
   * world bounds, packs the ship data, and derives the clip-sphere dissolve
   * values into the persistent per-object records.
   */
  @carbon.method
  @impl.implemented
  PrepareShaderData(updateContext = null)
  {
    this.UpdateWorldBounds();

    // An impact overlay may damp the activation strength; otherwise full on.
    this.spaceObjectShipData[1] = this.impactOverlay
      ? this.impactOverlay.GetActivationStrength(updateContext)
      : 1;
    this.spaceObjectShipData[3] = this.GetBoundingSphereRadius();
    this.spaceObjectShipData[2] = this.dirtLevel;

    // clipSphereFactor runs 0 (fully visible) to 1 (invisible); the shader gets
    // a signed squared radius rather than the factor itself.
    let normalizedBoundingRadius = this.GetBoundingSphereRadius() / (this.modelScale === 0 ? 1 : this.modelScale);
    const clipOffset = vec3.length(this.clipSphereCenter);
    normalizedBoundingRadius += clipOffset;
    const insideSpherePercentage = Math.min(1, clipOffset / normalizedBoundingRadius);
    const dissolveRadius = this.clipSphereFactor * normalizedBoundingRadius * (1 + insideSpherePercentage);

    const center = this.GetBoundingSphereCenter();
    const clipSphereCenter = EveSpaceObject2.#clipSphereCenterScratch;
    vec3.add(clipSphereCenter, this.clipSphereCenter, center);
    const clipRadiusSq = Math.sign(dissolveRadius) * dissolveRadius * dissolveRadius;

    this.#psData.Set("clipSphereCenter", clipSphereCenter);
    this.#psData.Set("clipRadiusSq", [clipRadiusSq]);
    this.#vsData.Set("clipData", [clipSphereCenter[0], clipSphereCenter[1], clipSphereCenter[2], clipRadiusSq]);

    const dissolveRadius2 = this.clipSphereFactor2 * normalizedBoundingRadius * (1 + insideSpherePercentage);
    this.#psData.Set("clipRadius2Sq", [Math.sign(dissolveRadius2) * dissolveRadius2 * dissolveRadius2]);
    this.#psData.Set("clipSphereFactor", [this.clipSphereFactor]);
    this.#psData.Set("clipSphereFactor2", [this.clipSphereFactor2]);
  }

  /**
   * Carbon EveSpaceObject2::UpdateShLighting (cpp:1411-1421): asks the scene's
   * SH lighting manager for this hull's secondary-lighting coefficients, faded
   * in across the low-detail threshold so a hull entering that range does not
   * pop. The coefficients are cleared first, which is also what leaves the
   * unwritten tail zero on the L1 path.
   * @param {Object} manager - Tr2ShLightingManager
   * @param {Object} [updateContext] - frame context, for the detail thresholds
   */
  @carbon.method
  @impl.implemented
  UpdateShLighting(manager, updateContext = null)
  {
    const coefficients = this.#psData.Get("shLightingCoefficients");

    coefficients.fill(0);

    const lowThreshold = EveSpaceObject2.#GetContextValue(updateContext, "GetLowDetailThreshold", "lowDetailThreshold");

    if (!(this.estimatedPixelDiameterWithChildren > lowThreshold) || typeof manager?.GetLighting !== "function")
    {
      return false;
    }

    const mediumThreshold = EveSpaceObject2.#GetContextValue(updateContext, "GetMediumDetailThreshold", "mediumDetailThreshold");
    const intensityFadeRadius = (mediumThreshold - lowThreshold) * 0.25;
    const intensity = Math.min(Math.max((this.estimatedPixelDiameterWithChildren - lowThreshold) / intensityFadeRadius, 0), 1);

    manager.GetLighting(
      this.worldPosition,
      intensity,
      this.boundingSphereRadius * EveSpaceObject2.SECONDARY_LIGHTING_RADIUS_CUTOFF_FACTOR,
      coefficients
    );

    return true;
  }

  /**
   * Carbon EveSpaceObject2::ClearShLighting (cpp:1423-1426): drops this hull's
   * secondary-lighting contribution back to nothing.
   */
  @carbon.method
  @impl.implemented
  ClearShLighting()
  {
    this.#psData.Get("shLightingCoefficients").fill(0);

    return true;
  }

  /**
   * Carbon EveSpaceObject2::GetParentData (cpp:1872-1885): the values an
   * attachment needs from its hull. `shLighting` is a LIVE view into the PS
   * record, exactly as Carbon hands out a raw pointer into m_psData - an
   * attachment reading it sees the hull's current coefficients.
   * @param {Object} [out] - caller-owned record, refreshed in place
   */
  @carbon.method
  @impl.implemented
  GetParentData(out = new IEveSpaceObject2ParentData())
  {
    mat4.copy(out.transform, this.worldTransform);
    // Carbon memsets the record and never assigns killCount on this path.
    out.killCount = 0;
    vec4.copy(out.shipData, this.spaceObjectShipData);
    vec3.copy(out.clipSphereCenter, this.#psData.Get("clipSphereCenter"));
    out.clipRadiusSq = this.#psData.Get("clipRadiusSq")[0];
    out.clipRadius2Sq = this.#psData.Get("clipRadius2Sq")[0];
    out.clipFactor = this.#psData.Get("clipSphereFactor")[0];
    out.clipFactor2 = this.#psData.Get("clipSphereFactor2")[0];
    out.shLighting = this.#psData.Get("shLightingCoefficients");
    vec4.copy(out.customData, this.#psData.Get("customData"));

    return out;
  }

  /**
   * Carbon EveSpaceObject2::GetPerObjectStructs (cpp:1485-1490): hands a copy
   * of both records to a caller, with the VS record's customData taken from the
   * PS record as Carbon does.
   * @returns {{vs: RawData, ps: RawData}} independent copies, not live records
   */
  @carbon.method
  @impl.implemented
  GetPerObjectStructs(vsData = RawData.create("EveSpaceObjectVSData"), psData = RawData.create("EveSpaceObjectPSData"))
  {
    vsData.CopyFrom(this.#vsData);
    psData.CopyFrom(this.#psData);
    vsData.Set("customData", this.#psData.Get("customData"));
    return { vs: vsData, ps: psData };
  }

  /**
   * Refreshes the world transform, then - when the update flag is on - places the observers, stamps the LOD-gated curve clock while advancing the overlay effects, runs the effect children's synchronous pass with the current placement, and updates the impact overlay; the overlay effects receive the context time as both clocks, as Carbon does.
   * @returns {boolean} False when the update flag is off; the world transform is refreshed either way.
   */
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
      observer?.Update(observerTransform);
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
        child?.UpdateSyncronous(updateContext, params);
      }
    }

    this.EnsureChildLocatorMerged();
    this.UpdateDamageLocatorFilter();
    if (this.impactOverlay) this.impactOverlay.UpdateSyncronous(updateContext, this);
    return true;
  }

  /**
   * Runs the controllers at a frequency derived from the hull's estimated pixel diameter against the context's high-detail threshold, advances the object curve sets only on frames the synchronous LOD gate stamped, then updates the transform children, the effect children and the impact overlay.
   * @returns {number} The controller update frequency in 0..1, which is also handed to the effect children; 0 when the hull is not visible or the update flag is off.
   */
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
      controller?.Update(frequency);
    }

    // Carbon cpp:626-663: the persistent buffers are invalidated once per
    // frame, then the shader data is prepared and copied into both records.
    this.#vsData.Invalidate();
    this.#psData.Invalidate();

    const previousActivationStrength = this.spaceObjectShipData[1];
    this.PrepareShaderData(updateContext);
    if (previousActivationStrength !== this.spaceObjectShipData[1])
    {
      this.SetControllerVariable("ActivationStrength", this.spaceObjectShipData[1]);
    }

    this.#psData.Set("shipData", this.spaceObjectShipData);
    this.#vsData.Set("shipData", this.spaceObjectShipData);
    // m_psData.customData is script/SOF-driven; the model field is its author.
    this.#psData.Set("customData", this.customShaderData);
    // Both records carry the same two matrices; each is written from the
    // LOGICAL transform, which produces the bytes Carbon's `m_psData.x =
    // m_vsData.x` copy of the already-transposed value produces.
    this.#vsData.SetAndTranspose("worldTransform", this.worldTransform);
    this.#vsData.SetAndTranspose("invWorldTransform", this.inverseWorldTransform);
    this.#psData.SetAndTranspose("worldTransform", this.worldTransform);
    this.#psData.SetAndTranspose("invWorldTransform", this.inverseWorldTransform);

    const shapeCenter = EveSpaceObject2.#shapeCenterScratch;
    const shapeRadius = EveSpaceObject2.#shapeRadiusScratch;
    this.GetShapeEllipsoid(shapeCenter, shapeRadius);
    this.#vsData.Set("ellpsoidRadii", [ shapeRadius[0], shapeRadius[1], shapeRadius[2], 0 ]);
    this.#vsData.Set("ellpsoidCenter", [ shapeCenter[0], shapeCenter[1], shapeCenter[2], 0 ]);

    if (this.impactOverlay)
    {
      this.#psData.Set("impactDataOffset", [ this.impactOverlay.GetDataTextureOffset() ]);
    }

    for (let slot = 0; slot < EveSpaceObject2.CUSTOM_MASK_MAX; slot++)
    {
      if (this.customMasks.length > slot)
      {
        this.customMasks[slot]?.FillPerObjectData?.(slot, this.#vsData, this.#psData);
      }
      else
      {
        EveCustomMask.ZeroPerObjectData(slot, this.#vsData, this.#psData);
      }
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
        curveSet.Update(time, time, updateContext.renderContext);
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
        child?.UpdateAsyncronous(updateContext, params);
      }
    }

    if (this.impactOverlay) this.impactOverlay.UpdateAsyncronous(updateContext, this);
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
      if (frustum?.IsSphereVisible(EveSpaceObject2.#worldSphere) !== false)
      {
        this.EstimatePixelDiameter(frustum);
        this.#isMeshVisible = true;
      }
    }

    // Bones so a bone-parented attachment's bounds follow its bone, which is
    // what drives the per-bone AABB union (Carbon BoundingBox.cpp:815-833).
    const { bones, boneCount } = getBoneList(this.animationUpdater);

    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      if (attachment.UpdateVisibility(updateContext, this.worldTransform, bones, boneCount))
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
      this.#isInFrustum = frustum?.IsSphereVisible(EveSpaceObject2.#worldSphere) !== false;
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
      const target = observer?.GetObserver() ?? observer?.observer;
      target?.SetVisibility?.(this.isVisible);
    }
    for (const child of this.effectChildren)
    {
      child?.UpdateVisibility(updateContext, this.worldTransform, this.#lodLevelWithChildren);
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
      if (this.DisplayChildren() || child?.IsAlwaysOn?.()) child?.GetRenderables(out);
    }
    if (this.mesh && this.#isMeshVisible)
    {
      // Not optional-chained: a mesh HAS a geometry resource accessor and a
      // decal HAS GetRenderables. Guarding them turned a missing method into a
      // decal that drew nothing and reported nothing.
      const geometryResource = this.mesh.GetGeometryResource();
      if (geometryResource)
      {
        for (const decal of this.decals)
        {
          decal.GetRenderables(out, null, geometryResource, this.#meshScreenSize);
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
        if (!attachment) continue;
        attachment.GetBatches(batches, batchType, perObjectData, reason);
      }
    }

    this.impactOverlay?.GetBatches?.(batches, batchType, perObjectData, this.#meshScreenSize);

    const areas = this.mesh.GetAreas(batchType);
    if (areas)
    {
      if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT)
      {
        // Carbon EveSpaceObject2.cpp:1130 passes the screen size resolved in
        // UpdateVisibility, so the mesh draws the LOD this object was culled
        // at; reverseWinding is left default on every EveSpaceObject2 path.
        this.mesh.GetBatches(batches, areas, perObjectData, this.#meshScreenSize);
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

  /**
   * Commits the mesh's transparent areas back-to-front, ordering them by the
   * squared distance from the view position to each area's world-space
   * bounding-box center and falling back to the object origin when the geometry
   * resource cannot supply a box.
   */
  #GetSortedTransparentBatches(areas, batches, perObjectData, renderContext)
  {
    const geometry = this.mesh.GetGeometryResource() ?? null;
    const viewPosition = renderContext?.GetViewPosition();
    const meshIndex = this.mesh.meshIndex ?? 0;

    // Carbon resolves the LOD once for the whole sorted list (cpp:72) and
    // returns early when there is none. This port keeps collecting so a
    // GPU-free graph still produces batches; the LOD only supplies draw
    // arguments.
    const lod = geometry?.GetMeshLod?.(meshIndex, this.#meshScreenSize) ?? null;

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
      const batch = this.mesh.CreateGeometryBatch(geometry, area, perObjectData, false, lod);
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

  /**
   * Drops the cached overlay and shadow area-block lists so the next batch call
   * rebuilds them from the current mesh.
   */
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

  /**
   * Rebuilds the cached area blocks on first use when a mesh is attached; Carbon
   * instead rebuilds them from the geometry-resource load callback.
   */
  #EnsureCachedAreaBlocks()
  {
    if (!this.#cachedAreaBlocksBuilt && this.mesh) this.RebuildCachedData();
  }

  /**
   * Carbon EveSpaceObject2::GetPickingBatches (cpp:3645-3675): collects the
   * geometry a pick pass should test, by mask. It is ordinary batch collection
   * - the pick itself is an engine pass that renders these and reads IDs back.
   *
   * The OPAQUE bit deliberately pulls in the transparent and additive OVERLAY
   * effects too, so a cloaking hull stays pickable.
   *
   * @param {Object} batches - the picking accumulator
   * @param {Number} pickTypes - a Tr2PickType mask
   * @param {Object} perObjectData - this hull's per-object record
   */
  @carbon.method
  @impl.implemented
  GetPickingBatches(batches, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null)
  {
    if (pickTypes & Tr2PickType.PICK_TYPE_PICKING)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_DECAL, perObjectData);
      this.GetBatchesFromOverlayVector(batches, perObjectData, TriBatchType.TRIBATCHTYPE_TRANSPARENT, this.mesh);
      this.GetBatchesFromOverlayVector(batches, perObjectData, TriBatchType.TRIBATCHTYPE_ADDITIVE, this.mesh);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT)
    {
      // Carbon takes the mesh's OWN areas here rather than going through
      // GetBatches, and returns early when the mesh is absent or hidden - so a
      // hidden mesh suppresses the transparent pass only, not the ones above.
      if (!this.mesh || this.mesh.display === false)
      {
        return true;
      }

      for (const batchType of [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE ])
      {
        const areas = this.mesh.GetAreas(batchType);

        if (areas)
        {
          this.mesh.GetBatches?.(batches, areas, perObjectData);
        }
      }
    }

    return true;
  }

  /**
   * Carbon EveSpaceObject2::GetID (cpp:3640-3643): a picked area resolves to
   * the hull itself, so the area index is deliberately ignored.
   * @param {Number} [_areaID] - the picked area, unused by this class
   * @returns {EveSpaceObject2} this
   */
  @carbon.method
  @impl.implemented
  GetID(_areaID = 0)
  {
    return this;
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

    const geometry = this.mesh.GetGeometryResource() ?? null;
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

    const geometry = mesh.GetGeometryResource() ?? null;
    if (!geometry || geometry.IsGood() === false) return false;
    const meshIndex = mesh.meshIndex ?? 0;

    // Carbon resolves the LOD ONCE for the whole overlay walk
    // (EveSpaceObject2.cpp:1198) and returns early when there is none. Resolving
    // it per block instead re-walks the LOD list for every block of every effect
    // of every overlay; EveChildMesh already hoists it, and this path was the
    // outlier.
    const lod = geometry.GetMeshLod?.(meshIndex, this.#meshScreenSize) ?? null;
    if (!lod) return false;

    // Carbon binds lod->m_mesh->m_vertexDeclarationHandle onto every block batch
    // exactly as onto a mesh area batch (cpp:1214). Leaving it zero makes every
    // overlay look like one declaration, and the handle is what binning and
    // sorting compare - so blocks of different layouts would share a bin.
    const overlayElements = CarbonVertexElements(geometry.GetMeshVertexElements?.(meshIndex));
    const overlayDeclaration = overlayElements.length
      ? Tr2VertexDefinition.getHandle(overlayElements)
      : 0;

    if (impactEffect)
    {
      for (const block of this.#overlayMeshAreaBlocks[OVERLAY_TYPE_ALL])
      {
        this.#CommitBlockBatch(
          batches, impactEffect, geometry, meshIndex, block, perObjectData, 0xFFFFFFFF, lod, overlayDeclaration);
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
          this.#CommitBlockBatch(
            batches, effect, geometry, meshIndex, block, perObjectData, 0, lod, overlayDeclaration);
        }
      }
    }

    return (batches.GetBatchCount?.() ?? 0) > committedBefore;
  }

  /**
   * Builds and commits one render batch drawing a single cached area block with
   * the given material and optional priority, skipping the block when the
   * material yields no valid batch.
   */
  #CommitBlockBatch(batches, material, geometry, meshIndex, block, perObjectData, priority, lod, vertexDeclaration)
  {
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(material);
    if (!batch.IsValid()) return;
    if (priority !== 0) batch.SetPriority(priority);
    batch.SetGeometrySource(geometry, meshIndex, block.startIndex, block.count, false);
    batch.SetVertexDeclaration(vertexDeclaration);
    batch.SetPerObjectData(perObjectData ?? null);
    const draw = Tr2RenderBatch.resolveDrawArguments(
      lod, block.startIndex, block.count, false);
    if (!draw) return;
    batch.SetDrawIndexedInstanced(
      draw.indexCountPerInstance,
      draw.instanceCount,
      draw.startIndexLocation,
      draw.baseVertexLocation,
      draw.startInstanceLocation);
    batches.Commit(batch);
  }

  // EveMeshOverlayEffect::GetEffects (display-gated, per batch type).

  /**
   * Returns an overlay effect's display-gated effect list for a batch type, or
   * null when it contributes none.
   */
  #OverlayEffectsFor(overlay, batchType)
  {
    return overlay?.GetEffects?.(batchType) ?? null;
  }

  /**
   * Reports whether the hull mesh has transparent areas or any overlay effect
   * does, which tells the renderer to route this object through the sorted
   * transparent pass.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Portable mesh area access replaces Carbon's native mesh-area vectors.")
  HasTransparentBatches()
  {
    if (!this.mesh) return false;
    if ((this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0) return true;

    for (const overlay of this.overlayEffects)
    {
      if (overlay?.HasTransparentArea?.()) return true;
    }
    return false;
  }

  /**
   * Returns the distance from the render context's view position to the hull
   * world translation, used to order transparent renderables back-to-front.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z);
  }

  /** Carbon allocates Tr2PerObjectDataWithPersistentBuffers<EveSpaceObject2>.
   * This port retains persistent VS/PS RawData and returns those records
   * directly. GPU-derived bone-ring offsets remain at their CPU defaults until
   * an engine supplies them; other CPU-known values are already encoded. */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity retains and fills persistent VS/PS RawData; the engine owns device buffers, GPU-derived offsets, upload, and binding.")
  GetPerObjectData(_accumulator = null)
  {
    // Carbon cpp:1437-1445: the bone ring is uploaded and its OFFSETS stamped
    // into the record, then a pooled handle referencing the two persistent
    // buffers is returned. The offsets are GPU addresses with no CPU
    // derivation, so they stay at their zero default here; the bone count is
    // CPU-known and is written.
    const boneCount = this.animationUpdater?.IsInitialized?.()
      ? (this.animationUpdater.GetMeshBoneCount?.() ?? 0)
      : null;
    if (boneCount !== null)
    {
      this.#vsData.SetIndex("boneOffsets", 2, [ boneCount ]);
    }
    this.#vsData.Set("customData", this.#psData.Get("customData"));

    return { vs: this.#vsData, ps: this.#psData };
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
  @impl.implemented
  GetLights(lightManager)
  {
    if (!this.display)
    {
      return;
    }

    // cpp:3545-3547 - Tr2GrannyAnimationUtils::GetBoneList, so a bone-parented
    // light is placed by its bone rather than by the object transform alone.
    const { bones, boneCount } = getBoneList(this.animationUpdater);

    for (const light of this.lights)
    {
      light?.AddLight?.(lightManager, this.worldTransform, 1, bones, boneCount);
      light?.SetBrightnessMultiplier?.(this.activationStrength);
    }
  }

  /**
   * Carbon EveSpaceObject2::IsCastingShadow (cpp:2252-2274): applies the
   * display, world-sphere and reflection gates, then tests the realized sphere
   * against the supplied shadow frustum. Carbon's float& result is represented
   * by an optional length-one array.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The optional length-one array replaces Carbon's float& sizeInShadow out-parameter.")
  IsCastingShadow(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null)
  {
    if (!this.display || this.#boundingSphereWorldRadius <= 0)
    {
      return false;
    }
    if (renderReason === Tr2RenderReason.TR2RENDERREASON_REFLECTION &&
      !ShouldReflect(this.reflectionMode))
    {
      return false;
    }

    EveSpaceObject2.#SetSphere(
      EveSpaceObject2.#worldSphere,
      this.modelWorldPosition,
      this.#boundingSphereWorldRadius
    );

    let sizeInShadow = 0;
    if (sizeInShadowOut)
    {
      sizeInShadowOut[0] = 0;
    }
    if (shadowFrustum.IsVisible(cameraFrustum, EveSpaceObject2.#worldSphere))
    {
      sizeInShadow = shadowFrustum.GetSizeInShadow(EveSpaceObject2.#worldSphere);
      if (sizeInShadowOut)
      {
        sizeInShadowOut[0] = sizeInShadow;
      }
    }
    return sizeInShadow > 15;
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
        child?.Register(registry);
      }

      for (const attachment of this.attachments)
      {
        attachment?.Register(registry);
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
        child?.UnRegister(registry);
      }

      for (const attachment of this.attachments)
      {
        attachment?.UnRegister(registry);
      }
    }
  }

  /**
   * Reports whether children and effect children should be shown; always true on
   * the base hull, subclasses gate it on activation state.
   */
  @carbon.method
  @impl.implemented
  DisplayChildren()
  {
    return true;
  }

  /**
   * Returns the transform placement observers are attached to - the live hull
   * world transform.
   */
  @carbon.method
  @impl.implemented
  GetObserverTransform()
  {
    return this.worldTransform;
  }

  /**
   * Returns the transform effect children are placed against - the live hull
   * world transform, not a copy.
   */
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

  /**
   * Returns the live curve-sampled ball position; the array is the object's own
   * field and is rewritten by the next transform update.
   */
  @carbon.method
  @impl.implemented
  GetWorldPosition()
  {
    return this.worldPosition;
  }

  /**
   * Returns the live curve-sampled ball rotation, which excludes the model
   * rotation curve; the quaternion is the object's own field and is rewritten by
   * the next transform update.
   */
  @carbon.method
  @impl.implemented
  GetWorldRotation()
  {
    return this.worldRotation;
  }

  /**
   * Finds a sound emitter by observer name on this hull and then recursively in
   * the effect children, returning null when no emitter carries the name.
   */
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

  /**
   * Sets the mute flag and pushes it to every effect child and placement
   * observer.
   */
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
      observer?.SetMute(this.mute);
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
    if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource()?.IsUsingCMF?.())
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
    if (this.dynamicBoundingSphereEnabled && this.mesh?.GetGeometryResource()?.IsUsingCMF?.())
    {
      const center = this.GetBoundingSphereCenter();
      return vec4.set(out, center[0], center[1], center[2], this.GetBoundingSphereRadius());
    }
    return vec4.set(out, 0, 0, 0, -1);
  }

  /** Marks the derived locator graph stale and restarts any requested filter. */
  @carbon.method
  @impl.implemented
  InvalidateMergedLocators(reason = "structure")
  {
    this.#mergedLocatorSetsDirty = true;
    this.#ReleaseDamageFilterSessions();
    if (reason === "structure" || this.damageLocatorAutoFilterEnabled || this.#damageFilterState !== 0)
    {
      this.#damageFilterState = 1;
    }
  }

  /**
   * Rebuilds the locator sets visible on this object from its own authored sets
   * plus the sets owned by child meshes and nested child containers.
   */
  @carbon.method
  @impl.adapted
  EnsureChildLocatorMerged()
  {
    if (!this.#mergedLocatorSetsDirty) return;

    this.#mergedLocatorSets.length = 0;
    this.#mergedDamageLocatorSources.length = 0;
    const childSources = [];
    const identity = mat4.create();
    for (const child of this.effectChildren) child.CollectOwnedLocatorSets(identity, childSources);

    for (const authored of this.locatorSets)
    {
      const locators = authored.GetLocators();
      if (!locators.length) continue;
      const copy = new EveLocatorSets();
      copy.Set(authored.GetName(), locators);
      this.#mergedLocatorSets.push(copy);
    }

    const locatorTransform = mat4.create();
    const transformed = mat4.create();
    for (const source of childSources)
    {
      const sourceSet = source.sets;
      let merged = this.#mergedLocatorSets.find(set => set.HasName(sourceSet.GetName()));
      if (!merged)
      {
        merged = new EveLocatorSets();
        merged.SetName(sourceSet.GetName());
        this.#mergedLocatorSets.push(merged);
      }

      const start = merged.locators.length;
      for (const locator of sourceSet.GetLocators())
      {
        mat4.fromRotationTranslationScale(
          locatorTransform, locator.direction, locator.position, locator.scale);
        // Carbon row-vector locator * childToObject => gl-matrix childToObject * locator.
        mat4.multiply(transformed, source.childToObject, locatorTransform);

        const result = new Locator();
        mat4.getTranslation(result.position, transformed);
        mat4.getRotation(result.direction, transformed);
        quat.normalize(result.direction, result.direction);
        mat4.getScaling(result.scale, transformed);
        result.boneIndex = -1;
        result.partTag = Number(locator.partTag) >>> 0;
        merged.locators.push(result);
      }

      if (sourceSet.HasName(EveSpaceObject2.#damageLocatorSetName))
      {
        this.#mergedDamageLocatorSources.push({
          owner: source.owner,
          partTag: source.owner.GetPartTag(),
          start,
          count: sourceSet.GetLocators().length,
          // Carbon LocatorSourceRange.childToObject (EveSpaceObject2.cpp:1938):
          // lets GetLocatorInObjectSpace pose merged damage locators against
          // the owning child's skeleton, then lift them into object space.
          childToObject: source.childToObject
        });
      }
    }

    this.#mergedLocatorSetsDirty = false;
  }

  /** Releases every active raycast preparation session used by damage filtering. */
  #ReleaseDamageFilterSessions()
  {
    if (this.#damageFilterState !== 2) return;
    for (const occluder of this.#damageFilterOccluders) occluder.geometry.ResetRayCaster();
    this.#damageFilterOccluders.length = 0;
    this.#damageFilterAreas.length = 0;
  }

  /**
   * Collects prepared hull and child geometry and opens raycast sessions
   * (Carbon CollectOccluders, EveSpaceObject2.cpp:1960-2028): occluders carry
   * areaStart/areaCount ranges into the shared #damageFilterAreas pool, and
   * records with no matching areas are skipped rather than raycast whole.
   */
  #CollectDamageFilterOccluders()
  {
    this.#damageFilterOccluders.length = 0;
    this.#damageFilterAreas.length = 0;
    if (this.mesh)
    {
      const geometry = this.mesh.GetGeometryResource();
      if (geometry)
      {
        if (!geometry.IsPrepared())
        {
          return false;
        }
        if (geometry.IsGood())
        {
          const areaStart = this.#damageFilterAreas.length;
          EveCollectAreas(TriBatchType.TRIBATCHTYPE_OPAQUE, this.mesh, this.#damageFilterAreas);
          const areaCount = this.#damageFilterAreas.length - areaStart;
          if (areaCount !== 0)
          {
            this.#damageFilterOccluders.push({
              geometry,
              fromObject: mat4.create(),
              areaStart,
              areaCount
            });
          }
        }
      }
    }

    const childGeometry = [];
    const identity = mat4.create();
    for (const child of this.effectChildren)
    {
      child.CollectOwnedGeometry(
        TriBatchType.TRIBATCHTYPE_OPAQUE, identity, childGeometry, this.#damageFilterAreas);
    }

    for (const source of childGeometry)
    {
      if (source.areaCount === 0) continue;
      if (!source.geometry.IsPrepared())
      {
        this.#damageFilterOccluders.length = 0;
        this.#damageFilterAreas.length = 0;
        return false;
      }
      if (!source.geometry.IsGood()) continue;

      const fromObject = mat4.create();
      if (!mat4.invert(fromObject, source.childToObject)) mat4.identity(fromObject);
      this.#damageFilterOccluders.push({
        geometry: source.geometry,
        fromObject,
        areaStart: source.areaStart,
        areaCount: source.areaCount
      });
    }

    for (const occluder of this.#damageFilterOccluders) occluder.geometry.PrepareRayCaster();
    return true;
  }

  /** Reports whether all pending raycast sessions are ready or failed. */
  #AreDamageFilterOccludersReady()
  {
    for (let index = 0; index < this.#damageFilterOccluders.length;)
    {
      const occluder = this.#damageFilterOccluders[index];
      if (occluder.geometry.HasRayCasterPreparationFailed())
      {
        occluder.geometry.ResetRayCaster();
        this.#damageFilterOccluders.splice(index, 1);
        continue;
      }
      if (!occluder.geometry.IsRayCasterReady()) return false;
      index++;
    }
    return true;
  }

  /** Rebuilds the enabled mask by testing each locator ray against occluders. */
  #RefreshDamageLocatorMask(damageLocators)
  {
    this.#damageLocatorEnabled = damageLocators.map(locator =>
    {
      const direction = vec3.transformQuat(vec3.create(), EveSpaceObject2.#unitY, locator.direction);
      const origin = vec3.scaleAndAdd(vec3.create(), locator.position, direction, 0.1);
      let occluded = false;
      let backfacing = false;
      let rayLength = Infinity;
      const frontFaceMinDistance = 0.05 * this.boundingSphereRadius;

      for (const occluder of this.#damageFilterOccluders)
      {
        if (occluder.areaCount === 0) continue;

        const rayOrigin = vec3.transformMat4(vec3.create(), origin, occluder.fromObject);
        const rayDirection = vec3.fromValues(
          occluder.fromObject[0] * direction[0] + occluder.fromObject[4] * direction[1] + occluder.fromObject[8] * direction[2],
          occluder.fromObject[1] * direction[0] + occluder.fromObject[5] * direction[1] + occluder.fromObject[9] * direction[2],
          occluder.fromObject[2] * direction[0] + occluder.fromObject[6] * direction[1] + occluder.fromObject[10] * direction[2]);

        // Carbon EveSpaceObject2.cpp:2100-2122: the outer loop walks the
        // occluder's pool range, the INNER loop every sub-area
        // (area.index .. index+count) - a single GetIndex() raycast
        // under-tests multi-area geometry.
        for (let poolIndex = occluder.areaStart; poolIndex < occluder.areaStart + occluder.areaCount; poolIndex++)
        {
          const area = this.#damageFilterAreas[poolIndex];
          for (let areaIndex = area.index; areaIndex < area.index + area.count; areaIndex++)
          {
            const hit = {};
            if (!occluder.geometry.GetIntersectionPoints(
              rayOrigin, rayDirection, hit, areaIndex, rayLength)) continue;

            rayLength = hit.distance;
            backfacing = !area.alphaCutout &&
              ((vec3.dot(hit.unnormalizedNormal, rayDirection) > 0) !== area.reversed);
            if (rayLength < frontFaceMinDistance)
            {
              occluded = true;
              break;
            }
          }
          if (occluded) break;
        }
        if (occluded) break;
      }
      return !occluded && !backfacing;
    });
  }

  /** Advances the asynchronous damage-locator filtering state machine. */
  @carbon.method
  @impl.implemented
  UpdateDamageLocatorFilter()
  {
    if (this.#damageFilterState === 0) return;
    if (!this.damageLocatorAutoFilterEnabled && !this.#damageLocatorFilterRequested)
    {
      this.#damageLocatorEnabled.length = 0;
      this.#ReleaseDamageFilterSessions();
      this.#damageFilterState = 0;
      return;
    }

    const damageLocators = this.#GetLocatorsForSet(EveSpaceObject2.#damageLocatorSetName);
    if (!damageLocators?.length)
    {
      this.#damageLocatorEnabled.length = 0;
      this.#ReleaseDamageFilterSessions();
      this.#damageFilterState = 0;
      this.#damageLocatorFilterRequested = false;
      return;
    }
    this.#damageLocatorEnabled = Array.from({ length: damageLocators.length }, () => true);

    if (this.#damageFilterState === 1)
    {
      if (!this.#CollectDamageFilterOccluders()) return;
      this.#damageFilterState = 2;
    }
    if (!this.#AreDamageFilterOccludersReady()) return;

    this.#RefreshDamageLocatorMask(damageLocators);
    this.#ReleaseDamageFilterSessions();
    this.#damageFilterState = 0;
    this.#damageLocatorFilterRequested = false;

    if (this.impactOverlay && this.impactOverlay.GetArmorImpactGoalCount() > 0)
    {
      const last = this.impactOverlay.GetLastDamageState();
      this.ClearImpactDamage();
      this.SetImpactDamageState(last[0], last[1], last[2], true);
    }
  }

  /** Requests a damage-locator filter pass. */
  @carbon.method
  @impl.implemented
  RunDamageLocatorFilter()
  {
    this.#damageLocatorFilterRequested = true;
    if (this.#damageFilterState === 0) this.#damageFilterState = 1;
  }

  /**
   * Clears all impact and damage effects on the impact overlay.
   */
  @carbon.method
  @impl.implemented
  ClearImpactDamage()
  {
    if (this.impactOverlay) this.impactOverlay.Clear();
    this.EnsureChildLocatorMerged();
    for (const range of this.#mergedDamageLocatorSources)
    {
      const overlay = range.owner.GetDamageOverlay();
      if (overlay) overlay.Clear();
    }
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
      const configuration = this.impactOverlay.GetImpactConfiguration();
      if (configuration === ImpactConfiguration.IMPACT_ARMOR ||
        configuration === ImpactConfiguration.IMPACT_HULL)
      {
        this.EnsureChildLocatorMerged();
        for (const range of this.#mergedDamageLocatorSources)
        {
          if (damageLocatorIndex < range.start || damageLocatorIndex >= range.start + range.count) continue;
          return this.#EnsureChildDamageOverlay(range).CreateImpact(
            damageLocatorIndex - range.start, size, false);
        }
      }
      return this.impactOverlay.CreateImpact(
        damageLocatorIndex, direction, lifeTime, size, 1, this.lodLevel, this);
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

  /** Appends copies of a named locator set, merging with an existing authored set. */
  @carbon.method
  @impl.implemented
  MergeToLocatorSet(locatorSet)
  {
    const locators = locatorSet.GetLocators();
    if (!locators.length) return;

    this.InvalidateMergedLocators("structure");
    const existing = this.locatorSets.find(set => set.HasName(locatorSet.GetName()));
    if (existing)
    {
      existing.Append(locators);
      return;
    }
    this.AddLocatorSet(locatorSet.GetName(), locators);
  }

  /** Adds a new authored locator set without replacing another set of the same name. */
  @carbon.method
  @impl.implemented
  AddLocatorSet(name, locators)
  {
    const locatorSet = new EveLocatorSets();
    locatorSet.Set(name, Array.from(locators));
    this.locatorSets.push(locatorSet);
    this.InvalidateMergedLocators("structure");
    return locatorSet;
  }

  /** Removes all authored locator sets and invalidates every derived locator view. */
  @carbon.method
  @impl.implemented
  ClearLocatorSets()
  {
    this.locatorSets.length = 0;
    this.InvalidateMergedLocators("structure");
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
      if (locatorSetName === EveSpaceObject2.#damageLocatorSetName &&
        index < this.#damageLocatorEnabled.length && !this.#damageLocatorEnabled[index]) continue;
      this.GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index],
        locatorSetName === EveSpaceObject2.#damageLocatorSetName ? index : -1);
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
    this.GetLocatorInObjectSpace(position, out, locators[index], index);
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
    this.GetLocatorInObjectSpace(out, EveSpaceObject2.#locatorDirection, locators[index], index);
    if (inWorldSpace) vec3.transformMat4(out, out, this.worldTransform);
    return true;
  }

  /**
   * Gets a damage locator's BIND position in object space - the merged set's
   * authored position, no animation (Carbon EveSpaceObject2.cpp:2785-2796).
   * Impact overlays seed decals here so they stay put on animated parts.
   */
  @carbon.method
  @impl.implemented
  GetDamageLocatorBindPosition(index, out = vec3.create())
  {
    const locators = this.#GetLocatorsForSet(EveSpaceObject2.#damageLocatorSetName);
    if (!locators || !(index >= 0 && index < locators.length))
    {
      vec3.set(out, 0, 0, 0);
      return false;
    }
    vec3.copy(out, locators[index].position);
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

    for (let index = 0; index < locators.length; index++)
    {
      if (index < this.#damageLocatorEnabled.length && !this.#damageLocatorEnabled[index]) continue;
      const locator = locators[index];
      this.GetLocatorInObjectSpace(EveSpaceObject2.#locatorPosition, EveSpaceObject2.#locatorDirection, locator, index);
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
      if (index < this.#damageLocatorEnabled.length && !this.#damageLocatorEnabled[index]) continue;
      this.GetLocatorInObjectSpace(EveSpaceObject2.#locatorPosition, EveSpaceObject2.#locatorDirection, locators[index], index);
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
    return this.impactOverlay
      ? this.impactOverlay.GetImpactConfiguration()
      : ImpactConfiguration.IMPACT_INVALID;
  }

  /** Replaces the ship impact overlay. */
  @carbon.method
  @impl.implemented
  SetImpactOverlay(overlay)
  {
    this.impactOverlay = overlay;
  }

  /** Returns the ship impact overlay. */
  @carbon.method
  @impl.implemented
  GetImpactOverlay()
  {
    return this.impactOverlay;
  }

  /** Reports whether impacts currently use the authored shield ellipsoid. */
  @carbon.method
  @impl.implemented
  HasImpactConfigurationShield()
  {
    return !!this.impactOverlay?.HasShieldEllipsoid()
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
    if (!this.impactOverlay) return false;
    if (this.impactOverlay.UpdateImpact(out, direction, impactIndex)) return true;

    this.EnsureChildLocatorMerged();
    for (const range of this.#mergedDamageLocatorSources)
    {
      const overlay = range.owner.GetDamageOverlay();
      if (overlay && overlay.HasImpact(impactIndex)) return true;
    }
    return false;
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
    this.GetLocatorInObjectSpace(out, direction, locators[index], index);
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
    this.GetLocatorInObjectSpace(out, direction, locators[index], index);
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
    this.GetLocatorInObjectSpace(out, direction, locators[index],
      locatorSetName === EveSpaceObject2.#damageLocatorSetName ? index : -1);
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
    this.GetLocatorInObjectSpace(position, out, locators[index],
      locatorSetName === EveSpaceObject2.#damageLocatorSetName ? index : -1);
    if (inWorldSpace)
    {
      EveSpaceObject2.#TransformNormal(out, out, this.worldTransform);
    }
    return out;
  }

  /**
   * Raises a named controller event on this hull's controllers and forwards it
   * to the effect children and overlay effects.
   */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    const eventName = String(name ?? "");
    for (const controller of this.controllers)
    {
      controller?.HandleEvent(eventName);
    }
    for (const child of this.effectChildren)
    {
      child?.HandleControllerEvent(eventName);
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.HandleControllerEvent(eventName);
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

  /**
   * Forwards a playback request to the animation updater, which owns all
   * animation state; a hull without an updater does nothing, as in Carbon.
   */
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
    const geometryRes = mesh.GetGeometryResource();
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

  /**
   * Returns a plain-object snapshot of the controller variables currently
   * stamped on this hull.
   */
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
    const geometryResource = this.mesh?.GetGeometryResource();
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
    if (this.dynamicBoundingSphereEnabled && updater && updater.IsInitialized())
    {
      const sphere = vec4.create();
      updater.GetDynamicBounds(sphere, min, max);
      vec3.copy(this.#localAabbMin, min);
      vec3.copy(this.#localAabbMax, max);
    }
    else if (this.mesh && this.mesh.GetBoundingBox(min, max))
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
    if (!this.mesh) return false;
    const geometryResource = this.mesh.GetGeometryResource();
    return geometryResource ? geometryResource.IsGood() : false;
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
      if (child.GetBoundingSphere(EveSpaceObject2.#childSphere, query))
      {
        sph3.union(out, out, EveSpaceObject2.#childSphere);
      }
    }
    for (const child of this.effectChildren)
    {
      if (child.GetBoundingSphere(EveSpaceObject2.#childSphere, query))
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

  /**
   * Pushes shield, armor and hull damage levels to the impact overlay and
   * mirrors them into the ShieldDamage, ArmorDamage and HullDamage controller
   * variables so bound effects follow.
   */
  @carbon.method
  @impl.adapted
  SetImpactDamageState(shield, armor, hull, doCreateArmorImpacts = true)
  {
    if (this.impactOverlay)
    {
      this.impactOverlay.GetDamageOverlay().SetEnabledDamageLocators(this.#damageLocatorEnabled);
      this.impactOverlay.SetDamageState(shield, armor, hull, doCreateArmorImpacts);
      this.EnsureChildLocatorMerged();
      for (const range of this.#mergedDamageLocatorSources)
      {
        this.#EnsureChildDamageOverlay(range).SetDamageState(
          shield, armor, hull, doCreateArmorImpacts);
      }
    }
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
    if (!this.impactOverlay) return;
    this.impactOverlay.ToggleEffect(name, enable, duration);
    if (name === "shieldboost" || name === "shieldhardening") return;

    this.EnsureChildLocatorMerged();
    for (const range of this.#mergedDamageLocatorSources)
    {
      this.#EnsureChildDamageOverlay(range).ToggleEffect(name, enable, duration);
    }
  }

  /** Creates and synchronizes the damage overlay owned by one child-locator range. */
  #EnsureChildDamageOverlay(range)
  {
    let overlay = range.owner.GetDamageOverlay();
    if (!overlay)
    {
      overlay = range.owner.EnsureDamageOverlay();
      const shipDamage = this.impactOverlay.GetDamageOverlay();
      // The part's OWN armour shader (Carbon EveSpaceObject2.cpp:3529, commit
      // 6975d9f1): an animated part needs the skinned variant, which the
      // ship-wide effect is not.
      overlay.SetArmorDamageShaderEffect(range.owner.GetArmorDamageShaderEffect());
      const flicker = shipDamage.GetHullDamageFlickerCurve();
      if (flicker) overlay.SetHullDamageFlickerCurve(TriPerlinCurve.from(flicker.GetValues()));
      overlay.SetSeed(shipDamage.GetSeed() + range.owner.GetPartTag());
    }

    overlay.SetDamageLocatorCount(range.count);
    overlay.SetEnabledDamageLocators(
      this.#damageLocatorEnabled.slice(range.start, range.start + range.count));
    overlay.SetImpactIndexSource(this.impactOverlay.GetDamageOverlay());
    return overlay;
  }

  /**
   * Stores a controller variable on the hull and pushes it to the controllers,
   * effect children and overlay effects; the stored value is replayed onto
   * controllers and children added later.
   */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name ?? "");
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers)
    {
      controller?.SetVariable(key, next);
    }
    for (const child of this.effectChildren)
    {
      child?.SetControllerVariable(key, next);
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.SetControllerVariable(key, next);
    }
  }

  /**
   * Forwards a procedural-container variable to every effect child; the hull
   * itself keeps no copy.
   */
  @carbon.method
  @impl.implemented
  SetProceduralContainerVariable(name, value)
  {
    for (const child of this.effectChildren)
    {
      child?.SetProceduralContainerVariable?.(name, value);
    }
  }

  /**
   * Starts this hull's controllers and those of its effect children and overlay
   * effects.
   */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers)
    {
      controller?.Start();
    }
    for (const child of this.effectChildren)
    {
      child?.StartControllers();
    }
    for (const overlay of this.overlayEffects)
    {
      overlay?.StartControllers();
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

  /**
   * Applies the mesh bone matrix to a locator position and rotation for
   * bone-attached locators; the authored values pass through unchanged when
   * there is no usable bone data.
   */
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

  /**
   * Applies the model translation and rotation curves sampled at time 0 to a
   * locator position and rotation, matching Carbon's Blue locator surface, which
   * reads the curves without advancing playback.
   */
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

  /**
   * Returns the locator list of the first locator set carrying the name, or null
   * when no set matches; the list stays owned by the locator set.
   */
  #GetLocatorsForSet(locatorSetName)
  {
    const target = String(locatorSetName ?? "");
    this.EnsureChildLocatorMerged();
    for (const set of this.#mergedLocatorSets)
    {
      if (set.HasName(target))
      {
        return set.GetLocators();
      }
    }
    return null;
  }

  /**
   * Writes a locator's object-space position and direction (Carbon
   * EveSpaceObject2.cpp:3751-3772, rewritten upstream by 3d988b1d).
   *
   * A merged damage locator (mergedDamageIndex >= 0, indexing the merged
   * damage set) delegates to the owning child's animated pose - the locator's
   * boneIndex addresses the CHILD's skeleton, never this object's - then
   * lifts the result through the range's childToObject transform; Carbon
   * normalizes the direction HERE but not in EveGetLocatorPose, and that
   * asymmetry is preserved. Every other locator resolves against this
   * object's own animation updater.
   *
   * Overridable on purpose: Carbon's EveSwarm overrides this.
   */
  @carbon.method
  @impl.implemented
  GetLocatorInObjectSpace(outPosition, outDirection, locator, mergedDamageIndex = -1)
  {
    if (mergedDamageIndex >= 0)
    {
      this.EnsureChildLocatorMerged();
      for (const range of this.#mergedDamageLocatorSources)
      {
        if (range.owner && mergedDamageIndex >= range.start && mergedDamageIndex < range.start + range.count)
        {
          if (range.owner.GetDamageLocatorAnimatedLocal(mergedDamageIndex - range.start, outPosition, outDirection))
          {
            vec3.transformMat4(outPosition, outPosition, range.childToObject);
            EveSpaceObject2.#TransformNormal(outDirection, outDirection, range.childToObject);
            vec3.normalize(outDirection, outDirection);
            return;
          }
          break;
        }
      }
    }

    EveGetLocatorPose(outPosition, outDirection, this.animationUpdater, locator);
  }

  // Carbon GetClosestLocatorIndex: facing-gated closest search; 0 when the
  // set is missing, -1 when no locator faces the position.

  /**
   * Returns the index of the nearest locator in a named set that faces the given
   * world position - 0 when the set is missing, -1 when no locator faces the
   * position.
   */
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
      if (locatorSetName === EveSpaceObject2.#damageLocatorSetName &&
        index < this.#damageLocatorEnabled.length && !this.#damageLocatorEnabled[index]) continue;
      this.GetLocatorInObjectSpace(locatorPosition, locatorDirection, locators[index],
        locatorSetName === EveSpaceObject2.#damageLocatorSetName ? index : -1);
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

  /**
   * Reports whether a locator faces a position, by testing that stepping the
   * object-space position back along the locator direction shortens it.
   */
  static #IsLocatorFacingPosition(locatorDirection, posInObjectSpace)
  {
    const moved = vec3.subtract(vec3.create(), posInObjectSpace, locatorDirection);
    return vec3.squaredLength(moved) < vec3.squaredLength(posInObjectSpace);
  }

  /** Rotates a direction by a matrix's rotation basis, ignoring its translation. */
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

  /**
   * Maps the negated dot product of a locator direction and an offset direction
   * onto Carbon's square-root fit score, the ranking used to pick a varied
   * damage locator.
   */
  static #GetDirectionFit(v0, v1)
  {
    const direction = -vec3.dot(v0, v1);
    return direction < 0
      ? (1 - Math.sqrt(Math.abs(direction))) * 0.5
      : (Math.sqrt(Math.abs(direction)) + 1) * 0.5;
  }

  /**
   * Intersects a ray with an axis-aligned ellipsoid in the ellipsoid's own space and writes the hit point into out.
   * @returns {number|null} The ray parameter at the hit, or null when the ray is degenerate or misses.
   */
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

  /** Reports whether a point lies inside an axis-aligned ellipsoid. */
  static #IsPointInsideEllipsoid(center, radii, point)
  {
    const x = (point[0] - center[0]) / radii[0];
    const y = (point[1] - center[1]) / radii[1];
    const z = (point[2] - center[2]) / radii[2];
    return x * x + y * y + z * z <= 1;
  }

  // Mesh bone matrices come from the animation updater; only mat4-shaped
  // entries are usable.

  /**
   * Unpacks one bone from the updater's palette into a mat4, or null when the
   * index is out of range.
   *
   * The palette is Carbon's storage - one contiguous Float4x3 buffer, stride
   * 12 - so a bone is expanded rather than borrowed. Carbon does the same at
   * every read site with TriMatrixCopyFrom3x4.
   */
  static #GetBoneMatrix(updater, boneIndex)
  {
    const bones = updater.GetMeshBoneMatrixList?.();

    if (!bones || boneIndex < 0 || (boneIndex + 1) * 12 > bones.length)
    {
      return null;
    }

    return MatrixCopyFrom3x4(mat4.create(), bones, boneIndex);
  }

  /**
   * Replays every stored controller variable onto a newly added controller or
   * effect child through the named setter, so late additions start with the same
   * state.
   */
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

  /**
   * Samples a curve into out through whichever of Update or GetValueAt it
   * exposes, writing the fallback when there is no curve and copying back curves
   * that return a new array instead of filling out.
   */
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

  /**
   * Reads a numeric value from the update context, preferring a getter method
   * and falling back to the named properties, and yields 0 when nothing supplies
   * it.
   */
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

  /**
   * Returns a world sphere's on-screen diameter in pixels from the frustum's
   * exact query, or 0 when the frustum does not expose it.
   */
  static #GetPixelSize(frustum, sphere)
  {
    const method = frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }

  /**
   * Returns a world sphere's on-screen diameter in pixels, preferring the
   * frustum's cheaper estimated query and falling back to the exact one, or 0
   * when the frustum exposes neither.
   */
  static #GetEstimatedPixelSize(frustum, sphere)
  {
    const method = frustum?.GetPixelSizeAccrossEst ?? frustum?.GetPixelSizeAccross;
    return Number(typeof method === "function" ? method.call(frustum, sphere) : 0) || 0;
  }

  /** Writes a center and radius into a caller-owned sph3. */
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

CjsSchema.decorateField(EveSpaceObject2, "meshLod", io.persist, type.objectRef("Tr2MeshBase"));
