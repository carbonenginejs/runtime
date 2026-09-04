// Source: trinity/trinity/Eve/Turret/EveTurretSet.h
// Source: trinity/trinity/Eve/Turret/EveTurretSet.cpp
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { EveTurretAiming } from "./EveTurretAiming.js";
import { EveTurretTarget } from "./EveTurretTarget.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderReason } from "../../../generated/trinityCore/enums.js";
import { Tr2PerObjectData } from "../../../core/rawData/Tr2PerObjectData.js";
import { Tr2RenderBatch } from "../../../core/batch/Tr2RenderBatch.js";
import { Tr2Vector4Parameter } from "../../../shader/parameter/Tr2Vector4Parameter.js";
import { withITr2Renderable } from "../../../core/ITr2Renderable.js";

/** Carbon BoundingSphereTransform (Utilities/BoundingSphere.cpp:70-81):
 * center = TransformCoord(center, tf); radius *= max of the basis row lengths
 * (|GetX/Y/Z| = gl flat [0..2]/[4..6]/[8..10]). Single-matrix application -
 * NO composition, NO operand swap. Mutates the packed (x, y, z, radius)
 * sphere in place. */
function BoundingSphereTransform(transform, sphere)
{
  vec3.transformMat4(sphere, sphere, transform);
  sphere[3] *= Math.max(
    Math.hypot(transform[0], transform[1], transform[2]),
    Math.hypot(transform[4], transform[5], transform[6]),
    Math.hypot(transform[8], transform[9], transform[10])
  );
  return sphere;
}

/** Owns a hull's instanced turrets and drives their aiming, animation, firing, visibility, batches, shadows, and per-object data. */
@type.define({ className: "EveTurretSet", family: "eve/attachment/turrets" })
export class EveTurretSet extends withITr2Renderable(EveEntity)
{

  /** m_impactBehaviour (ImpactBehaviour::Type - enum ImpactBehaviour) [READWRITE, NOTIFY, PERSIST, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("ImpactBehaviour")
  impactBehaviour = 0;

  /** m_firingEffect (EveTurretFiringFXPtr) [HIDDEN] */
  @type.objectRef("EveTurretFiringFX")
  firingEffect = null;

  /** m_ambientEffect (IEveSpaceObjectChildPtr) [PERSISTONLY] */
  @io.persistOnly
  @type.model("IEveSpaceObjectChild")
  ambientEffect = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_firingEffectResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  firingEffectResPath = "";

  /** m_chooseRandomLocator (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  chooseRandomLocator = true;

  /** m_boundingSphere (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  boundingSphere = vec4.create();

  /** m_randomizeExplosionRotation (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  randomizeExplosionRotation = true;

  /** m_lodLevel (LOD - enum LOD) [READ] */
  @io.read
  @type.int32
  @type.enum("LOD")
  lodLevel = 0;

  /** m_currentCyclingFiresPos (uint32_t) [READ] */
  @io.read
  @type.uint32
  currentCyclingFiresPos = 0;

  /** m_useRandomFiringDelay (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useRandomFiringDelay = true;

  /** m_bottomClipHeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  bottomClipHeight = 0;

  /** m_geometryResource (TriGeometryResPtr) [READ] */
  @io.read
  @type.objectRef("TriGeometryRes")
  geometryResource = null;

  /** m_maxTrackingTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxTrackingTime = 1;

  /** m_visibleCount (unsigned int) [READ] */
  @io.read
  @type.uint32
  visibleCount = 0;

  /** m_trackingInfluence (float) [READ] */
  @io.read
  @type.float32
  trackingInfluence = 0;

  /** m_swarmID (unsigned int) [READWRITE] */
  @io.readwrite
  @type.uint32
  swarmID = 0;

  /** m_maxCyclingFirePos (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  maxCyclingFirePos = 1;

  /** m_playMovementSound (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  playMovementSound = true;

  /** m_isOnline (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  isOnline = true;

  /** m_target (EveTurretTargetPtr) [READ] */
  @io.read
  @type.objectRef("EveTurretTarget")
  target = new EveTurretTarget();

  /** m_locatorName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  locatorName = "";

  /** m_sysBonePitchFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitchFactor = 1;

  /** m_sysBonePitchMax (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitchMax = 90;

  /** m_sysBonePitchMin (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitchMin = 0;

  /** m_sysBonePitchOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitchOffset = 0;

  /** m_sysBonePitch01Factor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitch01Factor = 1;

  /** m_sysBonePitch01Offset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitch01Offset = 0;

  /** m_sysBonePitch02Factor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitch02Factor = 1;

  /** m_sysBonePitch02Offset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitch02Offset = 0;

  /** m_sysBonePitch03Factor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitch03Factor = 1;

  /** m_sysBonePitch03Offset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBonePitch03Offset = 0;

  /** m_updatePitchPose (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  updatePitchPose = false;

  /** m_geomResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  geometryResPath = "";

  /** m_impactSize (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  impactSize = 0;

  /** m_state (State - enum State) [READ, PERSIST] */
  @io.persist
  @type.int32
  @type.enum("State")
  state = 2;

  /** m_sysBoneHeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sysBoneHeight = 1;

  /** m_randomFiringDelay (float) [READ] */
  @io.read
  @type.float32
  randomFiringDelay = 0;

  /** m_turretEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  turretEffect = null;

  /** m_idleToTargetingMovementAudioEvent (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  idleToTargetingMovementAudioEvent = "";

  /** m_targetingToIdleMovementAudioEvent (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  targetingToIdleMovementAudioEvent = "";

  /** m_generatedDistributedAmbientEffect (EveChildInstanceContainerPtr) [READ] */
  @io.read
  @type.objectRef("EveChildInstanceContainer")
  generatedDistributedAmbientEffect = null;

  /** m_cyclingFireGroupCount (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  cyclingFireGroupCount = 1;

  /** m_turretMovementObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("TriObserverLocal")
  turretMovementObserver = null;

  /** m_slotNumber (int) [READWRITE] */
  @io.readwrite
  @type.int32
  slotNumber = -1;

  /** m_ambientEffectEditingMode (bool) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.boolean
  ambientEffectEditingMode = false;

  /** m_displayEffects (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  displayEffects = true;

  /** m_display (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  display = true;

  /** m_useDynamicBounds (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  useDynamicBounds = false;

  /** m_estimatedPixelDiameter (float) [READ] */
  @io.read
  @type.float32
  estimatedPixelDiameter = -1;

  /** m_lowLodFiringEffectScale (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  lowLodFiringEffectScale = vec3.fromValues(1, 1, 1);

  /** m_lowLodFiringEffectTranslation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  lowLodFiringEffectTranslation = vec3.create();

  /** m_lowLodFiringEffectRotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  lowLodFiringEffectRotation = quat.create();

  /** m_useLowLodFiringTransform (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useLowLodFiringTransform = false;

  /** m_laserMissBehaviour (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  laserMissBehaviour = false;

  /** m_projectileMissBehaviour (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  projectileMissBehaviour = false;

  #turrets = [];

  #parentTransform = mat4.create();

  /** m_shipTransformPrev - last frame's parent transform, for motion vectors. */
  #shipTransformPrev = mat4.create();

  /**
   * m_parentData - the hull values an attachment renders with, refreshed by the
   * parent through IEveSpaceObject2::GetParentData.
   */
  #parentData = {};

  /**
   * m_skeletonBoneIndices - the shader's bone mapping, shared by every turret
   * of the set. Skeleton realization is engine-owned, so this stays empty until
   * one is supplied and the default count applies.
   */
  #skeletonBoneIndices = [];

  /** Default bones per turret when no skeleton mapping is present (cpp:2334). */
  static DEFAULT_BONES_PER_TURRET = 3;

  /** Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT. */
  static SH_COEFFICIENT_COUNT = 7;

  /** Carbon's placeholder pose for a visible-but-invalid turret (cpp:2335-2336). */
  static #invalidTranslation = vec4.fromValues(0, 0, 0, 1);

  static #invalidRotation = quat.create();

  static #zero4 = vec4.create();

  #activeTurret = EveTurretSet.INVALID_INDEX;

  #highDetailFrozen = false;

  #trackingInfluenceDelta = 0;

  #delayToFadeOutTracking = 0;

  #delayToFadeInTracking = 0;

  #recheckTimeLeft = 2;

  /** Carbon method RebuildBoundingSphere (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Geometry resources are duck-typed; the runtime Trinity layer stores their computed sphere without realizing render buffers.")
  RebuildBoundingSphere()
  {
    const resource = this.geometryResource;
    if (!resource) return false;
    resource.RecalculateBoundingSphere?.();
    const value = resource.GetBoundingSphere?.(0, this.boundingSphere);
    if (value?.length >= 4 && value !== this.boundingSphere) vec4.copy(this.boundingSphere, value);
    return value !== false;
  }

  /** Carbon method ForceStateDeactive (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")
  ForceStateDeactive()
  {
    this.trackingInfluence = 0;
    this.#delayToFadeOutTracking = 0;
    this.#activeTurret = EveTurretSet.INVALID_INDEX;
    this.target?.StopFireAtLocator?.();
    this.firingEffect?.StopFiring?.();
    this.state = EveTurretSet.State.STATE_DEACTIVE;
    this.#playAll("", "Inactive", 0);
    this.#setAmbientState();
  }

  /** Carbon method ForceStateTargeting (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")
  ForceStateTargeting()
  {
    this.trackingInfluence = this.maxTrackingTime;
    this.#trackingInfluenceDelta = 0;
    this.#activeTurret = this.GetClosestTurret();
    this.state = EveTurretSet.State.STATE_TARGETING;
    this.#playTurret(this.#activeTurret, "", "Active", 0);
    this.#setAmbientState();
  }

  /** Carbon method FreezeHighDetailLOD (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("The graph freezes its LOD state; geometry realization remains a runtime-engine responsibility.")
  FreezeHighDetailLOD()
  {
    this.lodLevel = EveTurretSet.LOD.LOD_DISABLED;
    this.#highDetailFrozen = true;
    this.geometryResource?.Prepare?.();
  }

  /** Returns the turret effect Carbon exposes to SOF material setup. */
  @carbon.method
  @impl.implemented
  GetShader()
  {
    return this.turretEffect;
  }

  /**
   * The shared sysbone aiming math, synced from this set's flat tuning
   * fields. Carbon embeds EveTurretAiming by value (EveTurretSet.h:425) and
   * re-exposes its members as these flat Blue attributes; pose-owning
   * consumers of the UpdateTrackingPose seam use THIS object so both hosts
   * run identical math.
   */
  @impl.adapted
  @impl.reason("Carbon's by-value embed becomes an accessor because the pose pipeline (the aiming consumer) lives behind the animation seam.")
  GetAiming()
  {
    const aiming = this.#aiming;
    aiming.sysBoneHeight = this.sysBoneHeight;
    aiming.sysBonePitchOffset = this.sysBonePitchOffset;
    aiming.sysBonePitchFactor = this.sysBonePitchFactor;
    aiming.sysBonePitchMin = this.sysBonePitchMin;
    aiming.sysBonePitchMax = this.sysBonePitchMax;
    aiming.sysBonePitch01Offset = this.sysBonePitch01Offset;
    aiming.sysBonePitch01Factor = this.sysBonePitch01Factor;
    aiming.sysBonePitch02Offset = this.sysBonePitch02Offset;
    aiming.sysBonePitch02Factor = this.sysBonePitch02Factor;
    aiming.sysBonePitch03Offset = this.sysBonePitch03Offset;
    aiming.sysBonePitch03Factor = this.sysBonePitch03Factor;
    return aiming;
  }

  #aiming = new EveTurretAiming();

  /**
   * Applies resolved SOF vec4 values to the turret effect's constant path, or
   * to its nominal vector-parameter path when no constants are authored.
   */
  @impl.custom
  @impl.reason("The combined runtime keeps SOF independently importable by putting the nominal Tr2Effect application boundary on the owning turret class.")
  ApplySofTurretMaterial(resolveParameter)
  {
    const effect = this.GetShader();
    if (!effect)
    {
      return false;
    }

    if (effect.constParameters.length)
    {
      effect.StartUpdate();
      try
      {
        for (const parameter of effect.constParameters)
        {
          const value = resolveParameter(parameter.name);
          if (value)
          {
            vec4.copy(parameter.value, value);
          }
        }
      }
      finally
      {
        effect.EndUpdate();
      }
      return true;
    }

    for (const parameter of effect.parameters)
    {
      if (!(parameter instanceof Tr2Vector4Parameter))
      {
        continue;
      }
      const value = resolveParameter(parameter.GetParameterName());
      if (value)
      {
        parameter.SetValue(value);
      }
    }
    return true;
  }

  /** Carbon method GetShotTimeVariance (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetShotTimeVariance()
  {
    return 0.6;
  }

  /** Carbon method MissQueueSize (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  MissQueueSize()
  {
    return this.target?.MissQueueSize?.() ?? 0;
  }

  /** Carbon method GetLastShotTime (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetLastShotTime()
  {
    return this.target?.GetLastShotTime?.() ?? 0;
  }

  /** Carbon method EnterStateDeactive (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")
  EnterStateDeactive()
  {
    if (this.state === EveTurretSet.State.STATE_DEACTIVE) return;
    if (this.state === EveTurretSet.State.STATE_FIRING) this.firingEffect?.StopFiring?.();
    if (this.state === EveTurretSet.State.STATE_TARGETING || this.state === EveTurretSet.State.STATE_FIRING)
    {
      this.#delayToFadeOutTracking = 0.0001;
      this.#activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.#playAll("Pack", "Inactive", 1);
    }
    else
    {
      this.trackingInfluence = 0;
      this.#delayToFadeOutTracking = 0;
      this.#playAll("Pack", "Inactive", 0);
    }
    this.state = EveTurretSet.State.STATE_DEACTIVE;
    this.#setAmbientState();
  }

  /** Carbon method EnterStateFiring (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's geometry/animation selection is represented by portable turret records and controller forwarding.")
  EnterStateFiring()
  {
    if (!this.#setupFiringState()) return false;
    if (this.firingEffect && this.state === EveTurretSet.State.STATE_FIRING)
    {
      if (this.firingEffect.IsLooping?.())
      {
        this.firingEffect.PrepareFiringEffectMoveObjects?.();
        return true;
      }
      this.firingEffect.StopFiring?.();
    }
    if (this.firingEffect)
    {
      if (this.maxCyclingFirePos > 1) this.firingEffect.PrepareFiring?.(this.randomFiringDelay, this.currentCyclingFiresPos, this.cyclingFireGroupCount);
      else this.firingEffect.PrepareFiring?.(this.randomFiringDelay);
      this.firingEffect.SetImpactConfiguration?.(this.target?.GetImpactConfiguration?.());
    }
    this.state = EveTurretSet.State.STATE_FIRING;
    this.#setAmbientState();
    return true;
  }

  /** Carbon method EnterStateIdle (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")
  EnterStateIdle()
  {
    if (!this.isOnline) return;
    if (this.state === EveTurretSet.State.STATE_DEACTIVE)
    {
      this.#playAll("Deploy", "Active", 0);
      this.trackingInfluence = 0;
    }
    else if (this.state === EveTurretSet.State.STATE_TARGETING || this.state === EveTurretSet.State.STATE_FIRING)
    {
      this.#delayToFadeOutTracking = 0.0001;
      this.#activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.firingEffect?.StopFiring?.();
      this.#playAll("", "Active", 1);
      this.turretMovementObserver?.GetObserver?.()?.SendEvent?.(this.targetingToIdleMovementAudioEvent);
    }
    else this.#playAll("", "Active", 0);
    this.state = EveTurretSet.State.STATE_IDLE;
    this.#setAmbientState();
  }

  /** Carbon method EnterStateReloading (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")
  EnterStateReloading()
  {
    const wasDeactive = this.state === EveTurretSet.State.STATE_DEACTIVE;
    if (this.state === EveTurretSet.State.STATE_TARGETING || this.state === EveTurretSet.State.STATE_FIRING)
    {
      this.#delayToFadeOutTracking = 0.0001;
      this.#activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.firingEffect?.StopFiring?.();
      this.#playAll("Reload", "Active", 1);
    }
    else if (!wasDeactive) this.#playAll("Reload", "Active", 0);
    this.state = EveTurretSet.State.STATE_RELOADING;
    this.#setAmbientState();
  }

  /** Carbon method EnterStateTargeting (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")
  EnterStateTargeting()
  {
    if (!this.isOnline) return;
    if (this.state === EveTurretSet.State.STATE_DEACTIVE)
    {
      this.#delayToFadeInTracking = this.#playAll("Deploy", "Active", 1) + 0.0001;
    }
    else if (this.state === EveTurretSet.State.STATE_IDLE || this.state === EveTurretSet.State.STATE_RELOADING)
    {
      this.#delayToFadeInTracking = 0.0001;
      this.#playAll("", "Active", 1);
    }
    else if (this.state === EveTurretSet.State.STATE_FIRING)
    {
      this.#activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.firingEffect?.StopFiring?.();
      this.#playAll("", "Active", 0);
    }
    this.state = EveTurretSet.State.STATE_TARGETING;
    this.#setAmbientState();
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller ownership is represented by direct firing/ambient child forwarding.")
  HandleControllerEvent(name)
  {
    this.firingEffect?.HandleControllerEvent(name);
    this.#ambientEffect()?.HandleControllerEvent(name);
  }

  /** Carbon method GetFiringBoneWorldTransform (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Portable turret records and duck-typed geometry bone transforms replace Carbon's CMF/Granny split.")
  GetFiringBoneWorldTransform(muzzle = 0, out = mat4.create())
  {
    let turretIndex = this.#activeTurret;
    if (turretIndex === EveTurretSet.INVALID_INDEX) turretIndex = this.GetClosestTurret();
    if (turretIndex === EveTurretSet.INVALID_INDEX) return mat4.copy(out, this.#parentTransform);
    const turret = this.#turrets[turretIndex];
    const world = turret?.worldMatrix ?? turret?.transform ?? turret;
    if (world?.length === 16) mat4.copy(out, world);
    else mat4.copy(out, this.#parentTransform);
    if (!this.firingEffect) return out;
    const boneID = this.firingEffect?.GetPerMuzzleBoneID?.(muzzle) ?? EveTurretSet.INVALID_INDEX;
    if (boneID === EveTurretSet.INVALID_INDEX)
    {
      if (this.useLowLodFiringTransform)
      {
        mat4.fromRotationTranslationScale(EveTurretSet.#lowLodTransform, this.lowLodFiringEffectRotation, this.lowLodFiringEffectTranslation, this.lowLodFiringEffectScale);
        mat4.multiply(out, out, EveTurretSet.#lowLodTransform);
      }
      return out;
    }
    const boneTransform = turret?.GetBoneTransform?.(boneID, EveTurretSet.#boneTransform)
      ?? this.geometryResource?.GetBoneTransform?.(turretIndex, boneID, EveTurretSet.#boneTransform);
    if (boneTransform?.length === 16)
    {
      if (boneTransform !== EveTurretSet.#boneTransform) mat4.copy(EveTurretSet.#boneTransform, boneTransform);
      return mat4.multiply(out, out, EveTurretSet.#boneTransform);
    }
    if (this.useLowLodFiringTransform)
    {
      mat4.fromRotationTranslationScale(EveTurretSet.#lowLodTransform, this.lowLodFiringEffectRotation, this.lowLodFiringEffectTranslation, this.lowLodFiringEffectScale);
      mat4.multiply(out, out, EveTurretSet.#lowLodTransform);
      return out;
    }
    if (this.sysBonePitchMin < 45)
    {
      vec3.set(EveTurretSet.#turretPosition, out[12], out[13], out[14]);
      const target = this.target?.GetTrackingPosition?.() ?? this.target?.position ?? EveTurretSet.#zero;
      vec3.subtract(EveTurretSet.#targetDirection, target, EveTurretSet.#turretPosition);
      if (vec3.squaredLength(EveTurretSet.#targetDirection))
      {
        quat.rotationTo(EveTurretSet.#directRotation, EveTurretSet.#unitZ, EveTurretSet.#targetDirection);
        mat4.fromRotationTranslation(out, EveTurretSet.#directRotation, EveTurretSet.#turretPosition);
      }
    }
    else
    {
      mat4.fromXRotation(EveTurretSet.#launcherRotation, -Math.PI * 0.5);
      mat4.multiply(out, out, EveTurretSet.#launcherRotation);
    }
    return out;
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller ownership is represented by direct firing/ambient child forwarding.")
  SetControllerVariable(name, value)
  {
    this.firingEffect?.SetControllerVariable(name, value);
    this.#ambientEffect()?.SetControllerVariable(name, value);
  }

  /** Carbon method SetShotMissed (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetShotMissed(missed)
  {
    this.target?.SetShotMissed?.(missed);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller ownership is represented by direct firing/ambient child forwarding.")
  StartControllers()
  {
    this.firingEffect?.StartControllers();
    this.#ambientEffect()?.StartControllers();
  }

  /**
   * Creates the target when absent, pushes the authored miss and impact
   * behaviour into it, and initializes the firing and ambient effects.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Resource loading and GPU preparation are engine responsibilities; Trinity initializes the target and owned behavior graph.")
  Initialize()
  {
    this.target ??= new EveTurretTarget();
    this.target.SetBehaviour?.(this.laserMissBehaviour, this.projectileMissBehaviour, this.impactSize, this.impactBehaviour);
    this.firingEffect?.Initialize?.();
    this.#ambientEffect()?.Initialize?.();
    return true;
  }

  /** Attaches the firing effect and initializes it immediately. */
  @carbon.method
  @impl.implemented
  SetFiringEffect(effect)
  {
    this.firingEffect = effect ?? null;
    this.firingEffect?.Initialize?.();
  }

  /**
   * Offers an object to the target for validation; on acceptance it sends the
   * idle-to-targeting movement audio event when coming from idle or switching
   * targets, and rescales the firing effect to the new target's radius. Returns
   * whether the object was accepted.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon QueryInterface target attachment is delegated to EveTurretTarget's browser-compatible target validation.")
  SetTargetObject(object)
  {
    this.target ??= new EveTurretTarget();
    const previous = this.target.GetTargetable?.();
    const accepted = this.target.SetTargetable(object);
    if (accepted)
    {
      if ((this.state === EveTurretSet.State.STATE_IDLE || previous !== object) && this.playMovementSound && this.idleToTargetingMovementAudioEvent)
      {
        this.turretMovementObserver?.GetObserver?.()?.SendEvent?.(this.idleToTargetingMovementAudioEvent);
      }
      this.SetTargetScale();
    }
    return accepted;
  }

  /** The object currently being targeted, or null. */
  @carbon.method
  @impl.implemented
  GetTargetObject()
  {
    return this.target?.GetTargetable?.() ?? null;
  }

  /**
   * Rescales the firing effect from the target's radius, passing -1 when there
   * is no target.
   */
  @carbon.method
  @impl.implemented
  SetTargetScale()
  {
    this.firingEffect?.SetScaleByRadius?.(this.target?.GetRadius?.() ?? -1);
  }

  /**
   * Replaces the turret records, truncated to the fixed 24-turret limit,
   * normalizing each into the record shape and resetting visibleCount.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon builds hidden SingleTurret records from geometry locators; browser hosts may provide equivalent portable records directly.")
  SetTurrets(turrets = [])
  {
    this.#turrets = Array.from(turrets).slice(0, EveTurretSet.MAX_TURRETS_PER_SET).map(turret => this.#normalizeTurret(turret));
    this.visibleCount = this.#turrets.length;
    return this.#turrets;
  }

  /**
   * Appends one normalized turret record and returns it, or null once the fixed
   * 24-turret limit is reached.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon builds hidden SingleTurret records from geometry locators; browser hosts may provide equivalent portable records directly.")
  AddTurret(turret)
  {
    if (this.#turrets.length >= EveTurretSet.MAX_TURRETS_PER_SET) return null;
    const value = this.#normalizeTurret(turret);
    this.#turrets.push(value);
    this.visibleCount = this.#turrets.length;
    return value;
  }

  /**
   * The live turret record list; the records are mutated in place by
   * UpdateTurretTransforms, so this is not a snapshot.
   */
  @carbon.method
  @impl.implemented
  GetTurrets()
  {
    return this.#turrets;
  }

  /** Carbon method SetLocalTransform. */
  @carbon.method
  @impl.adapted
  @impl.reason("Portable records replace Carbon's CMF/Granny SingleTurretData allocation while retaining its fixed 24-turret limit and scale removal.")
  SetLocalTransform(turretIndex, localMatrix)
  {
    const index = Number(turretIndex) >>> 0;
    if (index >= EveTurretSet.MAX_TURRETS_PER_SET || localMatrix?.length !== 16) return false;
    while (this.#turrets.length <= index)
    {
      const turret = this.#normalizeTurret(null);
      turret.valid = false;
      turret.display = false;
      this.#turrets.push(turret);
    }
    const turret = this.#turrets[index];
    mat4.getRotation(EveTurretSet.#localRotation, localMatrix);
    mat4.getTranslation(EveTurretSet.#localTranslation, localMatrix);
    mat4.fromRotationTranslation(turret.localMatrix, EveTurretSet.#localRotation, EveTurretSet.#localTranslation);
    quat.copy(turret.localQuaternion, EveTurretSet.#localRotation);
    vec4.set(turret.localPosition, EveTurretSet.#localTranslation[0], EveTurretSet.#localTranslation[1], EveTurretSet.#localTranslation[2], 1);
    turret.valid = false;
    turret.display = false;
    this.generatedDistributedAmbientEffect?.UpdateInstance?.(index, EveTurretSet.#unitScale, turret.localQuaternion, EveTurretSet.#localTranslation);
    this.visibleCount = this.#turrets.length;
    return true;
  }

  /**
   * Stores the hull transform and immediately recomputes every turret's world
   * matrix from it.
   */
  @carbon.method
  @impl.implemented
  SetParentTransform(transform)
  {
    mat4.copy(this.#parentTransform, transform);
    this.UpdateTurretTransforms(transform);
  }

  /**
   * Recomputes each turret's world matrix as the parent transform applied to its
   * local matrix and marks the record valid; defaults to the stored parent
   * transform.
   */
  @carbon.method
  @impl.implemented
  UpdateTurretTransforms(parentTransform = this.#parentTransform)
  {
    mat4.copy(this.#parentTransform, parentTransform);
    for (const turret of this.#turrets)
    {
      mat4.multiply(turret.worldMatrix, parentTransform, turret.localMatrix);
      turret.valid = true;
    }
  }

  /**
   * The index of the turret whose world up axis points most directly at its
   * nearest damage locator, or 0 when no valid turret is found.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The closest portable turret is selected from its world up-axis and the target tracking position.")
  GetClosestTurret()
  {
    return this.#getClosestTurretAndLocator().turret;
  }

  /**
   * Convenience update that runs the synchronous then asynchronous phase against
   * the stored parent transform.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("This combined browser convenience update runs Carbon's explicit synchronous and asynchronous phases in order.")
  Update(context)
  {
    this.UpdateSyncronous(context);
    this.UpdateAsyncronous(context, this.#parentTransform);
    return true;
  }

  /**
   * Runs the synchronous phase: while a looping effect fires it re-picks the
   * turret and locator every two seconds, then updates the firing effect, feeds
   * the target the current muzzle start position, and updates the ambient effect
   * and movement observer from the first turret.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation cleanup and task dispatch are forwarded through portable records; target and firing timing remain source-faithful.")
  UpdateSyncronous(context, parentTransform = this.#parentTransform)
  {
    const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
    if (parentTransform?.length === 16) mat4.copy(this.#parentTransform, parentTransform);
    if (this.firingEffect)
    {
      if (this.#activeTurret !== EveTurretSet.INVALID_INDEX && this.firingEffect.IsLooping?.() && this.state === EveTurretSet.State.STATE_FIRING)
      {
        this.#recheckTimeLeft -= deltaTime;
        if (this.#recheckTimeLeft < 0)
        {
          const pair = this.#getClosestTurretAndLocator();
          if (pair.turret !== this.#activeTurret || pair.locator !== this.target?.GetLocator?.()) this.#setupFiringState();
          this.#recheckTimeLeft = 2;
        }
      }
      this.firingEffect.UpdateSynchronous?.(context);
    }
    vec3.set(EveTurretSet.#sourcePosition, this.#parentTransform[12], this.#parentTransform[13], this.#parentTransform[14]);
    this.firingEffect?.GetStartPosition?.(EveTurretSet.#sourcePosition);
    this.target?.Update?.(deltaTime, EveTurretSet.#sourcePosition);
    this.#ambientEffect()?.UpdateSyncronous?.(context, { isVisible: this.display, localToWorldTransform: this.#parentTransform });
    if (this.#turrets.length) this.turretMovementObserver?.Update?.(this.#turrets[0].worldMatrix);
    return true;
  }

  /**
   * Runs the asynchronous phase: recomputes the turret world matrices, ramps the
   * tracking influence through its fade-in and fade-out delays, pushes the
   * target position into each valid turret's tracking pose in that turret's
   * local space, then hands the firing effect its end position and per-muzzle
   * world transforms.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Skeleton realization is engine-owned; portable turret records may consume the same local-target tracking hook.")
  UpdateAsyncronous(context, parentData = this.#parentTransform)
  {
    const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
    const parentTransform = parentData?.transform?.length === 16 ? parentData.transform : parentData;
    if (parentTransform?.length === 16)
    {
      // The OUTGOING parent transform becomes m_shipTransformPrev before the
      // new one is adopted, so the record can carry both.
      mat4.copy(this.#shipTransformPrev, this.#parentTransform);
      this.UpdateTurretTransforms(parentTransform);
    }
    if (parentData && parentData !== this.#parentTransform && !ArrayBuffer.isView(parentData) && !Array.isArray(parentData))
    {
      this.#parentData = parentData;
    }
    if (this.#trackingInfluenceDelta !== 0)
    {
      this.trackingInfluence += this.#trackingInfluenceDelta * deltaTime;
      if (this.trackingInfluence > this.maxTrackingTime)
      {
        this.trackingInfluence = this.maxTrackingTime;
        this.#trackingInfluenceDelta = 0;
      }
      else if (this.trackingInfluence < 0)
      {
        this.trackingInfluence = 0;
        this.#trackingInfluenceDelta = 0;
      }
    }
    if (this.#delayToFadeOutTracking > 0)
    {
      this.#delayToFadeOutTracking -= deltaTime;
      if (this.#delayToFadeOutTracking <= 0)
      {
        this.#delayToFadeOutTracking = 0;
        this.#trackingInfluenceDelta = -1;
      }
    }
    if (this.#delayToFadeInTracking > 0)
    {
      this.#delayToFadeInTracking -= deltaTime;
      if (this.#delayToFadeInTracking <= 0)
      {
        this.#delayToFadeInTracking = 0;
        this.#trackingInfluenceDelta = 1;
      }
    }
    if (this.trackingInfluence !== 0)
    {
      const trackingPosition = this.target?.GetTrackingPosition?.() ?? this.target?.position;
      if (trackingPosition)
      {
        for (const turret of this.#turrets)
        {
          if (!turret.valid || !mat4.invert(EveTurretSet.#inverseTurret, turret.worldMatrix)) continue;
          vec3.transformMat4(EveTurretSet.#localTarget, trackingPosition, EveTurretSet.#inverseTurret);
          const hook = turret.UpdateTrackingPose ?? turret.source?.UpdateTrackingPose;
          hook?.call(turret.source ?? turret, EveTurretSet.#localTarget, this.trackingInfluence, this);
        }
      }
    }
    if (this.firingEffect)
    {
      this.firingEffect.SetEndPosition?.(this.target?.GetTargetPosition?.() ?? this.target?.targetPosition ?? EveTurretSet.#zero);
      for (let muzzle = 0; muzzle < this.firingEffect.GetPerMuzzleEffectCount?.(); muzzle++)
      {
        this.firingEffect.SetMuzzleTransform?.(muzzle, this.GetFiringBoneWorldTransform(muzzle, EveTurretSet.#muzzleTransform));
      }
      this.firingEffect.SetDisplayDestObject?.(this.target?.ShowDestObject?.() ?? true);
      this.firingEffect.UpdateAsynchronous?.(context);
    }
    this.#ambientEffect()?.UpdateAsyncronous?.(context, { isVisible: this.display, localToWorldTransform: this.#parentTransform });
    return true;
  }

  /**
   * Appends the firing and ambient effect renderables to out; gated on display,
   * and each contribution additionally on displayEffects.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Renderable collection is backend-neutral; geometry and batch realization remain runtime-engine work.")
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    if (this.displayEffects) this.firingEffect?.GetRenderables?.(out);
    if (this.#ambientEffect() && this.displayEffects) this.#ambientEffect().GetRenderables?.(out);
    return out;
  }

  /**
   * Forwards visibility to the firing and ambient effects; gated on display and,
   * per effect, on displayEffects. The turret geometry itself is not culled
   * here.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Visibility is forwarded through backend-neutral firing and ambient graph contracts.")
  UpdateVisibility(context)
  {
    if (!this.display) return false;
    if (this.displayEffects) this.firingEffect?.UpdateVisibility?.(context);
    if (this.displayEffects) this.#ambientEffect()?.UpdateVisibility?.(context, this.#parentTransform);
    return true;
  }

  /** Carbon EveTurretSet::RegisterComponents (cpp:238-256): ShadowCaster leaf
   * self-registration, then forwards the firing effect and the ambient effect
   * (GetAmbientEffectOrGeneratedEffect, mirrored by #ambientEffect). Gate
   * m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      registry.RegisterComponent(EveComponentType.ShadowCaster, this);
      this.firingEffect?.Register?.(registry);
      this.#ambientEffect()?.Register?.(registry);
    }
  }

  /** Carbon EveTurretSet::UnRegisterComponents (cpp:258-274): forwards the
   * firing and ambient effects only (own components were already removed by
   * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      this.firingEffect?.UnRegister?.(registry);
      this.#ambientEffect()?.UnRegister?.(registry);
    }
  }

  /** Carbon EveTurretSet::HasTransparentBatches: instanced turrets are opaque. */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /**
   * Emits Carbon's single opaque instanced turret batch. The geometry source
   * and instance count are portable; the engine resolves allocations and the
   * instance stream during realization.
   * @returns {Boolean} whether the batch was committed
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Instance stream, vertex declaration and realized LOD allocations are engine-owned; Trinity records their canonical geometry source and instance count.")
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_OPAQUE || !this.display || !this.visibleCount || !this.geometryResource)
    {
      return false;
    }

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.turretEffect);
    if (!batch.IsValid())
    {
      return false;
    }
    batch.SetGeometrySource(this.geometryResource, 0, -1, -1, false);
    batch.SetPerObjectData(perObjectData ?? null);
    batch.instanceCount = this.visibleCount >>> 0;
    return batches.Commit(batch);
  }

  /** Carbon EveTurretSet::GetSortValue: opaque turret instances use key one. */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 1;
  }

  /** Carbon EveTurretSet::IsCastingShadow (cpp:2022-2051): after the
   * display/geometry (cpp:2024) and reflection-reason (cpp:2029) early-outs -
   * which do NOT write the out-param, so a stale previous-caster value
   * survives at the scene call sites (EveSpaceScene.cpp:2391/2517) - the
   * SET-level bounding sphere is transformed by EVERY turret's world matrix
   * (including invisible ones - no per-turret visibility gate, unlike
   * UpdateVisibility cpp:2070-2088), gated on transformed radius > 0, culled
   * with shadowFrustum.IsVisible, and the MAX GetSizeInShadow accumulates.
   * Returns sizeInShadow > 5 (the swarm uses 15). Carbon's float& out-param
   * becomes the optional trailing length-1 array (out-params last). */
  @carbon.method
  @impl.adapted
  @impl.reason("The length-1 out array replaces the float& out-param; the shadow math is ported, including exactly which paths write the out value.")
  IsCastingShadow(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null)
  {
    if (!this.display || !this.geometryResource)
    {
      return false;
    }
    if (Number(renderReason ?? Tr2RenderReason.TR2RENDERREASON_NORMAL) === Tr2RenderReason.TR2RENDERREASON_REFLECTION)
    {
      return false;
    }

    let sizeInShadow = 0;
    if (sizeInShadowOut)
    {
      sizeInShadowOut[0] = 0;
    }
    for (const turret of this.GetTurrets())
    {
      const sphere = EveTurretSet.#shadowSphereScratch;
      vec4.copy(sphere, this.boundingSphere);
      BoundingSphereTransform(turret.worldMatrix, sphere);
      if (sphere[3] > 0 && shadowFrustum?.IsVisible?.(cameraFrustum, sphere))
      {
        sizeInShadow = Math.max(sizeInShadow, shadowFrustum.GetSizeInShadow(sphere));
        if (sizeInShadowOut)
        {
          sizeInShadowOut[0] = sizeInShadow;
        }
      }
    }
    return sizeInShadow > 5;
  }

  /** Carbon EveTurretSet::GetShadowBatches (cpp:2221-2254): one instanced
   * batch for the whole turret geometry - material m_turretEffect, instance
   * count m_visibleCount, mesh 0 at the lowest LOD. QUIRK: shadowPixelSize is
   * completely IGNORED (always GetMeshLod(0, 0), cpp:2235) - the swarm uses
   * it for LOD, the turret does not. The shadow path commits without the
   * normal path's validity check (cpp:2253 vs 2211) - equivalent here because
   * Commit drops invalid batches. Returns whether the batch was committed
   * (JS addition; Carbon returns void). NOTE: JS visibleCount is currently
   * the total turret count (the adapted UpdateVisibility does no per-turret
   * frustum cull), a pre-existing adaptation. */
  @carbon.method
  @impl.adapted
  @impl.reason("Instance stream, vertex declaration and realized LOD allocations (cpp:2227-2250) are engine-owned; the batch records the geometry source, turret effect, per-object data and the CPU-known instance count for the engine to realize.")
  GetShadowBatches(batches, perObjectData, _shadowPixelSize)
  {
    if (!this.display || !this.visibleCount)
    {
      return false;
    }
    if (!this.geometryResource)
    {
      return false;
    }

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.turretEffect);
    if (!batch.IsValid())
    {
      return false;
    }
    batch.SetGeometrySource(this.geometryResource, 0, -1, -1, false);
    batch.SetPerObjectData(perObjectData ?? null);
    batch.instanceCount = this.visibleCount >>> 0;
    return batches.Commit(batch);
  }

  /** Carbon EveTurretSet::GetPerObjectData (cpp:2275-2518): early-outs on a
   * missing/bad geometry resource RETURN NULL - and the cascade path stores
   * that null and still calls GetShadowBatches with it (EveSpaceScene.cpp:
   * 717/727), so a null per-object record on a batch is legal. The
   * EveTurretSetPerObjectData fill includes the ship matrices, compacted
   * per-visible turret SRT arrays, and the SH/clip PS block (cpp:2300-2511).
   * Trinity fills every CPU-known field in canonical RawData. Only the bone
   * palette's GPU ring-buffer offsets remain engine-supplied. */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity fills the CPU-known EveTurretSet VS/PS RawData fields; bone-palette ring offsets and IsGood/GetMeshCount realization gates remain engine-owned, while the CPU gate is geometry presence.")
  GetPerObjectData(accumulator = null)
  {
    if (!this.geometryResource || typeof accumulator?.Alloc !== "function")
    {
      return null;
    }

    const vs = accumulator.Alloc("EveTurretSetVSData");
    const ps = accumulator.Alloc("EveTurretSetPSData");
    const parent = this.#parentData;

    // Carbon cpp:2305-2309.
    vs.SetAndTranspose("shipMatrix", parent.transform ?? this.#parentTransform);
    vs.SetAndTranspose("prevShipMatrix", this.#shipTransformPrev);
    vs.Set("baseCutoffData", [ this.bottomClipHeight, 0, 0, 0 ]);

    if (this.#turrets.length)
    {
      // The shader's bone-index mapping is shared by every turret of the set;
      // three bones is Carbon's default when no skeleton mapping is present.
      const boneCount = this.#skeletonBoneIndices.length || EveTurretSet.DEFAULT_BONES_PER_TURRET;

      // Only VISIBLE turrets consume a slot, and the array is filled densely -
      // the unwritten tail deliberately keeps whatever the arena held
      // (cpp:2322-2341).
      let turretIndex = 0;
      for (const turret of this.#turrets)
      {
        // Carbon's SingleTurret::visible is this port's `display`.
        if (turret.display === false)
        {
          continue;
        }
        if (turret.valid)
        {
          vs.SetIndex("turretRotation", turretIndex, turret.localQuaternion);
          vs.SetIndex("turretTranslation", turretIndex, turret.localPosition);
        }
        else
        {
          vs.SetIndex("turretTranslation", turretIndex, EveTurretSet.#invalidTranslation);
          vs.SetIndex("turretRotation", turretIndex, EveTurretSet.#invalidRotation);
        }
        turretIndex++;
      }

      // currentBoneOffset/prevBoneOffset are GPU ring addresses with no CPU
      // derivation (cpp:2387-2388); they stay at their zero default.
      vs.Set("turretSetData", [ boneCount, 0, 0, 0 ]);

      // ps data (cpp:2394-2404)
      ps.Set("shipData", parent.shipData ?? EveTurretSet.#zero4);
      const clipCenter = parent.clipSphereCenter ?? EveTurretSet.#zero4;
      ps.Set("clipData1", [ clipCenter[0], clipCenter[1], clipCenter[2], parent.clipRadiusSq ?? 0 ]);
      ps.Set("clipRadius2Sq", [ parent.clipRadius2Sq ?? 0 ]);

      // The hull's coefficients when it published any, zeroes otherwise.
      for (let index = 0; index < EveTurretSet.SH_COEFFICIENT_COUNT; index++)
      {
        const source = parent.shLighting
          ? parent.shLighting.subarray(index * 4, index * 4 + 4)
          : EveTurretSet.#zero4;
        ps.SetIndex("shLightingCoefficients", index, source);
      }
    }

    return { vs, ps };
  }

  /** Carbon EveTurretSet::GetShadowPerObjectData (cpp:2520-2523): pure
   * forward to GetPerObjectData. */
  @carbon.method
  @impl.implemented
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

  /**
   * Establishes everything one shot needs: the firing turret and locator, the
   * advanced cycling fire position, the random firing delay, the fire animation
   * on the chosen turret, the target's impact timing derived from the effect's
   * duration and peak time, and the ambient controller's turret state. Returns
   * false when deactivated or untargeted.
   */
  #setupFiringState()
  {
    if (this.state === EveTurretSet.State.STATE_DEACTIVE || !this.target) return false;
    const pair = this.#getClosestTurretAndLocator();
    this.#activeTurret = pair.turret;
    if (this.maxCyclingFirePos > 1)
    {
      this.currentCyclingFiresPos += this.cyclingFireGroupCount;
      if (this.currentCyclingFiresPos >= this.maxCyclingFirePos * this.cyclingFireGroupCount) this.currentCyclingFiresPos = 0;
    }
    this.randomFiringDelay = this.useRandomFiringDelay ? this.GetShotTimeVariance() * Math.random() : 0;
    const effectTotalTime = Number(this.firingEffect?.GetFiringDuration?.() ?? 0);
    const effectPeakTime = Number(this.firingEffect?.GetFiringPeakTime?.() ?? 0);
    const source = this.#parentTransform.subarray(12, 15);
    const locator = pair.locator;
    if (this.state === EveTurretSet.State.STATE_IDLE || this.state === EveTurretSet.State.STATE_RELOADING)
    {
      this.randomFiringDelay += this.maxTrackingTime;
      this.#delayToFadeInTracking = 0.0001;
    }
    const fireName = this.currentCyclingFiresPos > 0 ? `Fire0${Math.floor(this.currentCyclingFiresPos / this.cyclingFireGroupCount)}` : "Fire";
    this.#turrets.forEach((_turret, index) => this.#playTurret(index, index === this.#activeTurret ? fireName : "", "Active", this.randomFiringDelay));
    this.target.StartFireAtLocator?.(locator ?? -1, this.randomFiringDelay + effectPeakTime, effectTotalTime - effectPeakTime, source);
    const ambient = this.#ambientEffect();
    if (ambient)
    {
      ambient.SetControllerVariable("TurretState", this.state === EveTurretSet.State.STATE_FIRING ? EveTurretSet.State.STATE_TARGETING : this.state);
      ambient.SetControllerVariableOnInstance?.(this.#activeTurret, "TurretState", EveTurretSet.State.STATE_FIRING);
      ambient.SetControllerVariableOnInstance?.(this.#activeTurret, "FiringDelay", this.randomFiringDelay);
    }
    return true;
  }

  /**
   * Picks the turret whose world up axis best aligns with its nearest damage
   * locator and, when chooseRandomLocator is set, re-picks the turret against a
   * random valid locator instead; falls back to turret 0. Returns the shared
   * pair record, valid only until the next call.
   */
  #getClosestTurretAndLocator()
  {
    const pair = EveTurretSet.#closestPair;
    pair.turret = EveTurretSet.INVALID_INDEX;
    pair.locator = -1;
    if (!this.#turrets.length) return pair;
    let closestAngle = -1;
    for (let index = 0; index < this.#turrets.length; index++)
    {
      const turret = this.#turrets[index];
      if (!turret.valid) continue;
      const transform = turret.worldMatrix;
      vec3.set(EveTurretSet.#turretPosition, transform[12], transform[13], transform[14]);
      const locator = this.target?.FindClosestLocator?.(EveTurretSet.#turretPosition, EveTurretSet.#locatorPosition) ?? -1;
      vec3.subtract(EveTurretSet.#targetDirection, EveTurretSet.#locatorPosition, EveTurretSet.#turretPosition);
      if (vec3.squaredLength(EveTurretSet.#targetDirection)) vec3.normalize(EveTurretSet.#targetDirection, EveTurretSet.#targetDirection);
      vec3.normalize(EveTurretSet.#turretUp, vec3.set(EveTurretSet.#turretUp, transform[4], transform[5], transform[6]));
      const angle = vec3.dot(EveTurretSet.#turretUp, EveTurretSet.#targetDirection);
      if (angle > closestAngle)
      {
        closestAngle = angle;
        pair.turret = index;
        pair.locator = locator;
      }
    }
    if (pair.turret !== EveTurretSet.INVALID_INDEX && this.chooseRandomLocator)
    {
      const transform = this.#turrets[pair.turret].worldMatrix;
      vec3.set(EveTurretSet.#turretPosition, transform[12], transform[13], transform[14]);
      const randomLocator = this.target?.FindRandomValidLocator?.(EveTurretSet.#turretPosition, EveTurretSet.#locatorPosition) ?? -1;
      if (randomLocator !== pair.locator && randomLocator !== -1)
      {
        pair.locator = randomLocator;
        closestAngle = -1;
        for (let index = 0; index < this.#turrets.length; index++)
        {
          const turret = this.#turrets[index];
          if (!turret.valid) continue;
          const turretTransform = turret.worldMatrix;
          vec3.set(EveTurretSet.#turretPosition, turretTransform[12], turretTransform[13], turretTransform[14]);
          vec3.subtract(EveTurretSet.#targetDirection, EveTurretSet.#locatorPosition, EveTurretSet.#turretPosition);
          if (vec3.squaredLength(EveTurretSet.#targetDirection)) vec3.normalize(EveTurretSet.#targetDirection, EveTurretSet.#targetDirection);
          vec3.normalize(EveTurretSet.#turretUp, vec3.set(EveTurretSet.#turretUp, turretTransform[4], turretTransform[5], turretTransform[6]));
          const angle = vec3.dot(EveTurretSet.#turretUp, EveTurretSet.#targetDirection);
          if (angle > closestAngle)
          {
            closestAngle = angle;
            pair.turret = index;
          }
        }
      }
    }
    if (pair.turret === EveTurretSet.INVALID_INDEX) pair.turret = 0;
    return pair;
  }

  /**
   * Plays an animation on every turret and returns the longest duration
   * reported.
   */
  #playAll(animation, loop, delay)
  {
    let duration = 0;
    for (let index = 0; index < this.#turrets.length; index++) duration = Math.max(duration, this.#playTurret(index, animation, loop, delay));
    return duration;
  }

  /**
   * Plays an animation on one turret through the record's own hook or its
   * controller, returning the reported duration, or 0 when the turret or the
   * hook is absent.
   */
  #playTurret(index, animation, loop, delay)
  {
    const turret = this.#turrets[index];
    if (!turret) return 0;
    return Number(turret.PlayAnimation?.(animation, loop, delay) ?? turret.controller?.PlayAnimation?.(animation, { loop, delay }) ?? 0);
  }

  /**
   * The ambient effect in force: the authored one while in ambient-effect
   * editing mode, otherwise the generated distributed instance container when
   * one exists.
   */
  #ambientEffect()
  {
    return this.ambientEffectEditingMode ? this.ambientEffect : this.generatedDistributedAmbientEffect ?? this.ambientEffect;
  }

  /**
   * Pushes the current state onto the ambient effect's TurretState controller
   * variable.
   */
  #setAmbientState()
  {
    this.#ambientEffect()?.SetControllerVariable("TurretState", this.state);
  }

  /**
   * Coerces a caller-supplied turret into the record shape - local and world
   * matrices, local quaternion and position, valid and display flags - reusing
   * the object in place when it already carries a local matrix, and otherwise
   * wrapping it as the record's source.
   */
  #normalizeTurret(turret)
  {
    if (turret?.localMatrix?.length === 16)
    {
      turret.worldMatrix ??= mat4.create();
      turret.localQuaternion ??= quat.create();
      turret.localPosition ??= vec4.create();
      turret.valid ??= true;
      return turret;
    }
    const localMatrix = mat4.create();
    if (turret?.length === 16) mat4.copy(localMatrix, turret);
    else if (turret?.transform?.length === 16) mat4.copy(localMatrix, turret.transform);
    return { source: turret, localMatrix, worldMatrix: mat4.clone(localMatrix), localQuaternion: quat.create(), localPosition: vec4.create(), valid: turret !== null, display: turret?.display ?? true, canFireWhenHidden: !!turret?.canFireWhenHidden };
  }

  static ImpactBehaviour = EveTurretTarget.ImpactBehaviour;

  static LOD = Object.freeze({
    LOD_INVALID: 0,
    LOD_EMPTY: 1,
    LOD_HIGHEST: 2,
    LOD_DISABLED: 3,
  });

  // The enum belongs to the extracted aiming math (EveTurretAiming.h:13-31);
  // the alias keeps this host's established surface on one identity.
  static SystemBones = EveTurretAiming.SystemBones;

  static State = Object.freeze({
    STATE_INVALID: 0,
    STATE_DEACTIVE: 1,
    STATE_IDLE: 2,
    STATE_TARGETING: 3,
    STATE_FIRING: 4,
    STATE_RELOADING: 5
  });

  static INVALID_INDEX = 0xffffffff;

  static MAX_TURRETS_PER_SET = 24;

  static #boneTransform = mat4.create();
  static #lowLodTransform = mat4.create();
  static #muzzleTransform = mat4.create();
  static #turretPosition = vec3.create();
  static #targetDirection = vec3.create();
  static #turretUp = vec3.create();
  static #locatorPosition = vec3.create();
  static #zero = vec3.create();
  static #sourcePosition = vec3.create();
  static #localTranslation = vec3.create();
  static #localRotation = quat.create();
  static #unitScale = vec3.fromValues(1, 1, 1);
  static #inverseTurret = mat4.create();
  static #shadowSphereScratch = vec4.create();
  static #localTarget = vec3.create();
  static #directRotation = quat.create();
  static #launcherRotation = mat4.create();
  static #unitZ = vec3.fromValues(0, 0, 1);
  static #closestPair = { turret: EveTurretSet.INVALID_INDEX, locator: -1 };

}
