// Source: trinity/trinity/Eve/Turret/EveTurretSet.h
// Source: trinity/trinity/Eve/Turret/EveTurretSet.cpp
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, edit, type, CjsSchema } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { EveTurretAiming } from "./EveTurretAiming.js";
import { EVE_TURRET_RANDOM_DELAY_MAX, EveTurretTarget } from "./EveTurretTarget.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderReason } from "../../../generated/trinityCore/enums.js";
import { Tr2PerObjectData } from "../../../core/rawData/perObjectData/Tr2PerObjectData.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2Vector4Parameter } from "../../../shader/parameter/Tr2Vector4Parameter.js";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { blue, EnumRegistrationType, ResourceRequirement } from "#blue";
import { TriGeometryResSkeletonData } from "#resource/geometry/TriGeometryResSkeletonData";

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
@carbon.inherit(ITr2Renderable)
export class EveTurretSet extends EveEntity
{

  /** m_impactBehaviour (ImpactBehaviour::Type - enum ImpactBehaviour) [READWRITE, NOTIFY, PERSIST, ENUM] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.ImpactBehaviour")
  impactBehaviour = 0;

  /** m_firingEffect (EveTurretFiringFXPtr) [HIDDEN] plus MAP_PROPERTY [READWRITE] (EveTurretSet_Blue.cpp:103-104) */
  @edit.readwrite
  @edit.hidden
  @type.objectRef("EveTurretFiringFX")
  firingEffect = null;

  /** m_ambientEffect (IEveSpaceObjectChildPtr) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.model("IEveSpaceObjectChild")
  ambientEffect = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_firingEffectResPath (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  firingEffectResPath = "";

  /** m_chooseRandomLocator (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  chooseRandomLocator = true;

  /** m_boundingSphere (Vector4) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec4
  boundingSphere = vec4.create();

  /** m_randomizeExplosionRotation (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  randomizeExplosionRotation = true;

  /** m_lodLevel (LOD - enum LOD) [READ] */
  @edit.read
  @type.int32
  @type.enum("trinity.EveTurretSet.LOD")
  lodLevel = 0;

  /** m_currentCyclingFiresPos (uint32_t) [READ] */
  @edit.read
  @type.uint32
  currentCyclingFiresPos = 0;

  /** m_useRandomFiringDelay (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  useRandomFiringDelay = true;

  /** m_bottomClipHeight (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  bottomClipHeight = 0;

  /** m_geometryResource (TriGeometryResPtr) [READ] */
  @edit.read
  @type.objectRef("TriGeometryRes")
  geometryResource = null;

  /** m_maxTrackingTime (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  maxTrackingTime = 1;

  /** m_visibleCount (unsigned int) [READ] */
  @edit.read
  @type.uint32
  visibleCount = 0;

  /** m_trackingInfluence (float) [READ] */
  @edit.read
  @type.float32
  trackingInfluence = 0;

  /** m_swarmID (unsigned int) [READWRITE] */
  @edit.readwrite
  @type.uint32
  swarmID = 0;

  /** m_maxCyclingFirePos (uint32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.uint32
  maxCyclingFirePos = 1;

  /** m_playMovementSound (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  playMovementSound = true;

  /** m_isOnline (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  isOnline = true;

  /** m_target (EveTurretTargetPtr) [READ] */
  @edit.read
  @type.objectRef("EveTurretTarget")
  target = new EveTurretTarget();

  /** m_locatorName (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  locatorName = "";

  /** m_sysBonePitchFactor (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchFactor = 1;

  /** m_sysBonePitchMax (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchMax = 90;

  /** m_sysBonePitchMin (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchMin = 0;

  /** m_sysBonePitchOffset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchOffset = 0;

  /** m_sysBonePitch01Factor (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch01Factor = 1;

  /** m_sysBonePitch01Offset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch01Offset = 0;

  /** m_sysBonePitch02Factor (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch02Factor = 1;

  /** m_sysBonePitch02Offset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch02Offset = 0;

  /** m_sysBonePitch03Factor (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch03Factor = 1;

  /** m_sysBonePitch03Offset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch03Offset = 0;

  /** m_updatePitchPose (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  updatePitchPose = false;

  /** m_geomResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  geometryResPath = "";

  /** m_impactSize (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  impactSize = 0;

  /** m_state (State - enum State) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.int32
  @type.enum("trinity.EveTurretSet.State")
  state = 2;

  /** m_sysBoneHeight (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBoneHeight = 1;

  /** m_randomFiringDelay (float) [READ] */
  @edit.read
  @type.float32
  randomFiringDelay = 0;

  /** m_turretEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("Tr2Effect")
  turretEffect = null;

  /** m_idleToTargetingMovementAudioEvent (std::wstring) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  idleToTargetingMovementAudioEvent = "";

  /** m_targetingToIdleMovementAudioEvent (std::wstring) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  targetingToIdleMovementAudioEvent = "";

  /** m_generatedDistributedAmbientEffect (EveChildInstanceContainerPtr) [READ] */
  @edit.read
  @type.objectRef("EveChildInstanceContainer")
  generatedDistributedAmbientEffect = null;

  /** m_cyclingFireGroupCount (uint32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.uint32
  cyclingFireGroupCount = 1;

  /** m_turretMovementObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("TriObserverLocal")
  turretMovementObserver = null;

  /** m_slotNumber (int) [READWRITE] */
  @edit.readwrite
  @type.int32
  slotNumber = -1;

  /** m_ambientEffectEditingMode (bool) [READWRITE, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @type.boolean
  ambientEffectEditingMode = false;

  /** m_displayEffects (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  displayEffects = true;

  /** m_display (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  display = true;

  /** m_useDynamicBounds (bool) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  useDynamicBounds = false;

  /** m_estimatedPixelDiameter (float) [READ] */
  @edit.read
  @type.float32
  estimatedPixelDiameter = -1;

  /** m_lowLodFiringEffectScale (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  lowLodFiringEffectScale = vec3.fromValues(1, 1, 1);

  /** m_lowLodFiringEffectTranslation (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  lowLodFiringEffectTranslation = vec3.create();

  /** m_lowLodFiringEffectRotation (Quaternion) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.quat
  lowLodFiringEffectRotation = quat.create();

  /** m_useLowLodFiringTransform (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  useLowLodFiringTransform = false;

  /** m_laserMissBehaviour (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  laserMissBehaviour = false;

  /** m_projectileMissBehaviour (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  projectileMissBehaviour = false;

  /** Values the OnModified chain compares against; null until first snapshot. */

  _turrets = [];

  _parentTransform = mat4.create();

  /** m_shipTransformPrev - last frame's parent transform, for motion vectors. */
  _shipTransformPrev = mat4.create();

  /**
   * m_parentData - the hull values an attachment renders with, refreshed by the
   * parent through IEveSpaceObject2::GetParentData.
   */
  _parentData = {};

  /**
   * m_skeletonBoneIndices - the shader's bone mapping, shared by every turret
   * of the set. Skeleton realization is not ported yet, so this stays empty until
   * one is supplied and the default count applies.
   */
  _skeletonBoneIndices = [];

  _skeleton = null;
  _systemBoneID = new Uint32Array(EveTurretAiming.SystemBones.SYSBONE_MAX).fill(0xffffffff);
  _turretVertexDecl = [];
  _turretVertexDeclElementCount = 0;
  _boneBounds = [];

  /** Stable resource callbacks preserve native notify ownership across reloads. */
  #geometryCompleted = (_event, resource) => {
    if (resource !== this.geometryResource) return;
    if (resource.IsPrepared()) this.RebuildCachedData(resource);
    else this.ReleaseCachedData(resource);
  };

  /** A released payload invalidates derived state but retains mount placement. */
  #geometryReleased = (_event, resource) => {
    if (resource === this.geometryResource) this.ReleaseCachedData(resource);
  };

  /** Default bones per turret when no skeleton mapping is present (cpp:2334). */
  static DEFAULT_BONES_PER_TURRET = 3;

  /** Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT. */
  static SH_COEFFICIENT_COUNT = 7;

  /** Carbon's placeholder pose for a visible-but-invalid turret (cpp:2335-2336). */
  static _invalidTranslation = vec4.fromValues(0, 0, 0, 1);

  static _invalidRotation = quat.create();

  static _zero4 = vec4.create();

  _activeTurret = EveTurretSet.INVALID_INDEX;

  _highDetailFrozen = false;

  _trackingInfluenceDelta = 0;

  _delayToFadeOutTracking = 0;

  _delayToFadeInTracking = 0;

  _recheckTimeLeft = 2;

  /** Carbon method RebuildBoundingSphere (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Geometry resources are duck-typed; the runtime Trinity layer stores their computed sphere without creating render buffers.")
  RebuildBoundingSphere()
  {
    const resource = this.geometryResource;
    if (!resource) return false;
    resource.RecalculateBoundingSphere?.();
    const value = resource.GetBoundingSphere(0, this.boundingSphere);
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
    this._delayToFadeOutTracking = 0;
    this._activeTurret = EveTurretSet.INVALID_INDEX;
    this.target?.StopFireAtLocator?.();
    this.firingEffect?.StopFiring?.();
    this.state = EveTurretSet.State.STATE_DEACTIVE;
    this._playAll("", "Inactive", 0);
    this._setAmbientState();
  }

  /** Carbon method ForceStateTargeting (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Animation calls are forwarded to hydrated turret/controller objects without Carbon's Granny controller.")
  ForceStateTargeting()
  {
    this.trackingInfluence = this.maxTrackingTime;
    this._trackingInfluenceDelta = 0;
    this._activeTurret = this.GetClosestTurret();
    this.state = EveTurretSet.State.STATE_TARGETING;
    this._playTurret(this._activeTurret, "", "Active", 0);
    this._setAmbientState();
  }

  /** Carbon method FreezeHighDetailLOD (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("The graph freezes its LOD state; geometry creation is not ported yet.")
  FreezeHighDetailLOD()
  {
    this.lodLevel = EveTurretSet.LOD.LOD_DISABLED;
    this._highDetailFrozen = true;
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
   * fields. Carbon embeds EveTurretAiming by value (EveTurretSet.h:423) and
   * re-exposes its members as these flat Blue attributes; pose-owning
   * consumers of the UpdateTrackingPose seam use THIS object so both hosts
   * run identical math.
   */
  @impl.adapted
  @impl.reason("Carbon's by-value embed becomes an accessor because the pose pipeline (the aiming consumer) lives behind the animation seam.")
  GetAiming()
  {
    const aiming = this._aiming;
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

  _aiming = new EveTurretAiming();

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
    return EveTurretSet.applyFactionToTurretShader(effect, resolveParameter);
  }

  /**
   * The effect-walking half of Carbon's private EveSOF::ApplyFactionToTurretShader
   * (EveSOF.cpp:4201-4254): overwrites a turret effect's constants, or its
   * vec4 parameters when no constants are authored, with resolved SOF values.
   * Shared by the ship turret set and EveChildTurret; the value resolution
   * stays in SOF, which cannot import this layer.
   * @param {Object} effect - a Tr2Effect
   * @param {Function} resolveParameter - parameter name -> vec4 or null
   * @returns {Boolean} true
   */
  @impl.custom
  static applyFactionToTurretShader(effect, resolveParameter)
  {
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
      // Picking the vec4 entries out of a mixed parameter list. This names a
      // LEAF CLASS because the family has no declared contract to ask for:
      // Carbon derives it from ITriEffectParameter and ITriReroutable
      // (Tr2Vector4Parameter.h:13-16) and our port put the shared behaviour on
      // an invented CjsParameter instead. See
      // .agents/parameter-family-missing-contracts.md.
      if (!CjsSchema.cast(parameter, Tr2Vector4Parameter))
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

  /** Carbon method GetShotTimeVariance (EveTurretSet.h:223-226). */
  @carbon.method
  @impl.implemented
  GetShotTimeVariance()
  {
    return EVE_TURRET_RANDOM_DELAY_MAX;
  }

  /** Carbon method MissQueueSize (EveTurretSet.cpp:3597-3600). */
  @carbon.method
  @impl.implemented
  MissQueueSize()
  {
    return this.target.MissQueueSize();
  }

  /** Carbon method GetLastShotTime (EveTurretSet.cpp:3606-3609). */
  @carbon.method
  @impl.implemented
  GetLastShotTime()
  {
    return this.target.GetLastShotTime();
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
      this._delayToFadeOutTracking = 0.0001;
      this._activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this._playAll("Pack", "Inactive", 1);
    }
    else
    {
      this.trackingInfluence = 0;
      this._delayToFadeOutTracking = 0;
      this._playAll("Pack", "Inactive", 0);
    }
    this.state = EveTurretSet.State.STATE_DEACTIVE;
    this._setAmbientState();
  }

  /** Carbon method EnterStateFiring (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's geometry/animation selection is represented by portable turret records and controller forwarding.")
  EnterStateFiring()
  {
    if (!this._setupFiringState()) return false;
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
    this._setAmbientState();
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
      this._playAll("Deploy", "Active", 0);
      this.trackingInfluence = 0;
    }
    else if (this.state === EveTurretSet.State.STATE_TARGETING || this.state === EveTurretSet.State.STATE_FIRING)
    {
      this._delayToFadeOutTracking = 0.0001;
      this._activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.firingEffect?.StopFiring?.();
      this._playAll("", "Active", 1);
      this.turretMovementObserver?.GetObserver()?.SendEvent?.(this.targetingToIdleMovementAudioEvent);
    }
    else this._playAll("", "Active", 0);
    this.state = EveTurretSet.State.STATE_IDLE;
    this._setAmbientState();
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
      this._delayToFadeOutTracking = 0.0001;
      this._activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.firingEffect?.StopFiring?.();
      this._playAll("Reload", "Active", 1);
    }
    else if (!wasDeactive) this._playAll("Reload", "Active", 0);
    this.state = EveTurretSet.State.STATE_RELOADING;
    this._setAmbientState();
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
      this._delayToFadeInTracking = this._playAll("Deploy", "Active", 1) + 0.0001;
    }
    else if (this.state === EveTurretSet.State.STATE_IDLE || this.state === EveTurretSet.State.STATE_RELOADING)
    {
      this._delayToFadeInTracking = 0.0001;
      this._playAll("", "Active", 1);
    }
    else if (this.state === EveTurretSet.State.STATE_FIRING)
    {
      this._activeTurret = EveTurretSet.INVALID_INDEX;
      this.target?.StopFireAtLocator?.();
      this.firingEffect?.StopFiring?.();
      this._playAll("", "Active", 0);
    }
    this.state = EveTurretSet.State.STATE_TARGETING;
    this._setAmbientState();
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller ownership is represented by direct firing/ambient child forwarding.")
  HandleControllerEvent(name)
  {
    this.firingEffect?.HandleControllerEvent(name);
    this._ambientEffect()?.HandleControllerEvent(name);
  }

  /** Carbon method GetFiringBoneWorldTransform (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Portable turret records and duck-typed geometry bone transforms replace Carbon's CMF/Granny split.")
  GetFiringBoneWorldTransform(muzzle = 0, out = mat4.create())
  {
    let turretIndex = this._activeTurret;
    if (turretIndex === EveTurretSet.INVALID_INDEX) turretIndex = this.GetClosestTurret();
    if (turretIndex === EveTurretSet.INVALID_INDEX) return mat4.copy(out, this._parentTransform);
    const turret = this._turrets[turretIndex];
    const world = turret?.worldMatrix ?? turret?.transform ?? turret;
    if (world?.length === 16) mat4.copy(out, world);
    else mat4.copy(out, this._parentTransform);
    if (!this.firingEffect) return out;
    const boneID = this.firingEffect?.GetPerMuzzleBoneID?.(muzzle) ?? EveTurretSet.INVALID_INDEX;
    if (boneID === EveTurretSet.INVALID_INDEX)
    {
      if (this.useLowLodFiringTransform)
      {
        mat4.fromRotationTranslationScale(EveTurretSet._lowLodTransform, this.lowLodFiringEffectRotation, this.lowLodFiringEffectTranslation, this.lowLodFiringEffectScale);
        mat4.multiply(out, out, EveTurretSet._lowLodTransform);
      }
      return out;
    }
    const boneTransform = turret?.GetBoneTransform?.(boneID, EveTurretSet._boneTransform)
      ?? this.geometryResource?.GetBoneTransform?.(turretIndex, boneID, EveTurretSet._boneTransform);
    if (boneTransform?.length === 16)
    {
      if (boneTransform !== EveTurretSet._boneTransform) mat4.copy(EveTurretSet._boneTransform, boneTransform);
      return mat4.multiply(out, out, EveTurretSet._boneTransform);
    }
    if (this.useLowLodFiringTransform)
    {
      mat4.fromRotationTranslationScale(EveTurretSet._lowLodTransform, this.lowLodFiringEffectRotation, this.lowLodFiringEffectTranslation, this.lowLodFiringEffectScale);
      mat4.multiply(out, out, EveTurretSet._lowLodTransform);
      return out;
    }
    if (this.sysBonePitchMin < 45)
    {
      vec3.set(EveTurretSet._turretPosition, out[12], out[13], out[14]);
      const target = this.target?.GetTrackingPosition?.() ?? this.target?.position ?? EveTurretSet._zero;
      vec3.subtract(EveTurretSet._targetDirection, target, EveTurretSet._turretPosition);
      if (vec3.squaredLength(EveTurretSet._targetDirection))
      {
        quat.rotationTo(EveTurretSet._directRotation, EveTurretSet._unitZ, EveTurretSet._targetDirection);
        mat4.fromRotationTranslation(out, EveTurretSet._directRotation, EveTurretSet._turretPosition);
      }
    }
    else
    {
      mat4.fromXRotation(EveTurretSet._launcherRotation, -Math.PI * 0.5);
      mat4.multiply(out, out, EveTurretSet._launcherRotation);
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
    this._ambientEffect()?.SetControllerVariable(name, value);
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
    this._ambientEffect()?.StartControllers();
  }

  /**
   * Creates the target when absent, pushes the authored miss and impact
   * behaviour into it, and requests geometry through the resource manager.
   * Existing JS child initialization remains necessary for hydrated graphs.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.target ??= new EveTurretTarget();
    this.target.SetBehaviour(this.laserMissBehaviour, this.projectileMissBehaviour, this.impactSize, this.impactBehaviour);
    this.InitializeGeometryResource();
    this.firingEffect?.Initialize();
    this._ambientEffect()?.Initialize();
    return true;
  }

  /**
   * Carbon OnModified (EveTurretSet.cpp:167-201). FIVE arms, and they are an
   * `else if` CHAIN: Carbon is notified once per changed member, so exactly one
   * arm runs per notification.
   *
   * JS notifications identify the exposed property name in place of Carbon's
   * Be::Var address. Ambient redistribution and per-bone dynamic bounds still
   * await their separate realization steps; geometry reload is handled here.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "display")
    {
      this.ReRegister();
    }
    else if (propertyName === "geometryResPath")
    {
      this.ReRegister();
      this.InitializeGeometryResource();
    }
    else if (propertyName === "ambientEffectEditingMode")
    {
      // Carbon re-sets the ambient effect to itself, which re-runs
      // InitializeAmbientEffect (cpp:181, cpp:3554-3565). Unported: the
      // generated distributed container it builds does not exist here.
    }
    else if (propertyName === "laserMissBehaviour" || propertyName === "projectileMissBehaviour"
      || propertyName === "impactSize" || propertyName === "impactBehaviour")
    {
      this.target.SetBehaviour(this.laserMissBehaviour, this.projectileMissBehaviour, this.impactSize, this.impactBehaviour);
    }
    else if (propertyName === "useDynamicBounds")
    {
      // Carbon rebuilds the per-bone bounds (cpp:187-200), taking the CMF
      // branch whenever the geometry is absent, unloaded or CMF.
      // InitializeDynamicBounds is unported, and porting it
      // alone buys nothing until GetDynamicBounds and GetLocalBoundingBox
      // land with it.
    }
    return true;
  }

  /**
   * Reloads the native LOD-selected geometry (EveTurretSet.cpp:252-290).
   * JS resource completion/purge events replace Blue notify targets; the
   * subscription stays installed after an immediate prepared callback so a
   * later same-handle reload rebuilds the cache too.
   */
  @carbon.method
  @impl.adapted
  InitializeGeometryResource()
  {
    const previous = this.geometryResource;
    if (previous)
    {
      previous.OffEvent("completed", this.#geometryCompleted, this);
      previous.OffEvent("purged", this.#geometryReleased, this);
      previous.OffEvent("unloaded", this.#geometryReleased, this);
    }
    this.geometryResource = null;
    this.Cleanup();
    if (this.lodLevel !== EveTurretSet.LOD.LOD_DISABLED && this.lodLevel !== EveTurretSet.LOD.LOD_HIGHEST) return;
    if (!this.geometryResPath) return;
    const resource = blue.resMan.GetResource(this.geometryResPath, { requirement: ResourceRequirement.GEOMETRY });
    this.geometryResource = resource;
    if (!resource) return;
    resource.OnEvent("completed", this.#geometryCompleted, this);
    resource.OnEvent("purged", this.#geometryReleased, this);
    resource.OnEvent("unloaded", this.#geometryReleased, this);
    if (resource.HasCompleted()) this.#geometryCompleted("completed", resource);
  }

  /**
   * Drops resource-derived pose/cache state, retaining native mount records
   * (EveTurretSet.cpp:459-521). The JS sampler owns the decoded pose storage
   * in place of native CMF/Granny allocations.
   */
  @carbon.method
  @impl.adapted
  Cleanup()
  {
    this._turretVertexDeclElementCount = 0;
    this._turretVertexDecl = [];
    this._systemBoneID.fill(EveTurretSet.INVALID_INDEX);
    this._skeleton = null;
    this._skeletonBoneIndices.length = 0;
    this._boneBounds.length = 0;
    for (const turret of this._turrets)
    {
      if (turret.sequencer)
      {
        turret.sequencer.StopAnimations(0);
        turret.sequencer.SetSharedGeometryRes(null);
      }
      turret.sequencer = null;
      turret.pose = null;
      turret.worldTransforms = [];
    }
  }

  /**
   * Caches mesh0 bounds/declaration and native system-bone IDs after completion
   * (EveTurretSet.cpp:1005-1073). The original skeleton record's name lookup is
   * applied to the decoder's plain CMF record rather than duplicating it.
   * Animation, muzzle and instance-stream realization are separate port steps.
   */
  @carbon.method
  @impl.adapted
  RebuildCachedData(resource)
  {
    if (resource !== this.geometryResource || !resource.IsPrepared()) return;
    this.Cleanup();
    if (resource.GetMeshCount())
    {
      this._turretVertexDecl = resource.GetMeshVertexElements(0).map(element => ({ ...element }));
      this._turretVertexDeclElementCount = this._turretVertexDecl.length;
      if (this.boundingSphere[3] === 0)
      {
        resource.RecalculateBoundingSphere();
        resource.GetBoundingSphere(0, this.boundingSphere);
      }
    }
    this._skeleton = resource.GetSkeletonData(0);
    if (this._skeleton)
    {
      for (let index = 0; index < this._systemBoneID.length; index++)
        this._systemBoneID[index] = TriGeometryResSkeletonData.prototype.FindJoint.call(this._skeleton, EveTurretAiming.getSystemBoneName(index));
    }
  }

  /** Clears derived state when Blue releases geometry (EveTurretSet.cpp:1081). */
  @carbon.method
  @impl.implemented
  ReleaseCachedData(_resource)
  {
    this.Cleanup();
  }

  /** Attaches the firing effect and initializes it immediately. */
  @carbon.method
  @impl.implemented
  SetFiringEffect(effect)
  {
    this.firingEffect = effect ?? null;
    this.firingEffect?.Initialize();
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
    // Carbon EveTurretSet.cpp:3630-3633: the ship set cannot clear its target;
    // only EveChildTurret passes null through to EveTurretTarget.
    if (!object) return false;
    this.target ??= new EveTurretTarget();
    const previous = this.target.GetTargetable?.();
    const accepted = this.target.SetTargetable(object);
    if (accepted)
    {
      if ((this.state === EveTurretSet.State.STATE_IDLE || previous !== object) && this.playMovementSound && this.idleToTargetingMovementAudioEvent)
      {
        this.turretMovementObserver?.GetObserver()?.SendEvent?.(this.idleToTargetingMovementAudioEvent);
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
    this._turrets = Array.from(turrets).slice(0, EveTurretSet.MAX_TURRETS_PER_SET).map(turret => this._normalizeTurret(turret));
    this.visibleCount = this._turrets.length;
    return this._turrets;
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
    if (this._turrets.length >= EveTurretSet.MAX_TURRETS_PER_SET) return null;
    const value = this._normalizeTurret(turret);
    this._turrets.push(value);
    this.visibleCount = this._turrets.length;
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
    return this._turrets;
  }

  /**
   * Stores a scale-free locator matrix without orthogonalizing its axes
   * (EveTurretSet.cpp:1784; TriMath.cpp:683). JS plain records replace the
   * native SingleTurretData allocation; no second transform convention is used.
   */
  @carbon.method
  @impl.adapted
  SetLocalTransform(turretIndex, localMatrix)
  {
    const index = Number(turretIndex) >>> 0;
    if (index >= EveTurretSet.MAX_TURRETS_PER_SET || localMatrix?.length !== 16) return false;
    while (this._turrets.length <= index)
    {
      const turret = this._normalizeTurret(null);
      turret.valid = false;
      turret.display = false;
      this._turrets.push(turret);
    }
    const turret = this._turrets[index];
    mat4.copy(turret.localMatrix, localMatrix);
    for (let column = 0; column < 3; column++)
    {
      const at = column * 4;
      const length = Math.hypot(localMatrix[at], localMatrix[at + 1], localMatrix[at + 2]);
      if (length > 0) for (let axis = 0; axis < 3; axis++) turret.localMatrix[at + axis] /= length;
    }
    mat4.getRotation(EveTurretSet._localRotation, turret.localMatrix);
    mat4.getTranslation(EveTurretSet._localTranslation, turret.localMatrix);
    quat.copy(turret.localQuaternion, EveTurretSet._localRotation);
    vec4.set(turret.localPosition, EveTurretSet._localTranslation[0], EveTurretSet._localTranslation[1], EveTurretSet._localTranslation[2], 1);
    turret.valid = false;
    turret.display = false;
    this.generatedDistributedAmbientEffect?.UpdateInstance?.(index, EveTurretSet._unitScale, turret.localQuaternion, EveTurretSet._localTranslation);
    this.visibleCount = this._turrets.length;
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
    mat4.copy(this._parentTransform, transform);
    this.UpdateTurretTransforms(transform);
  }

  /**
   * Recomputes each turret's world matrix as the parent transform applied to its
   * local matrix and marks the record valid; defaults to the stored parent
   * transform.
   */
  @carbon.method
  @impl.implemented
  UpdateTurretTransforms(parentTransform = this._parentTransform)
  {
    mat4.copy(this._parentTransform, parentTransform);
    for (const turret of this._turrets)
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
    return this._getClosestTurretAndLocator().turret;
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
    this.UpdateAsyncronous(context, this._parentTransform);
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
  UpdateSyncronous(context, parentTransform = this._parentTransform)
  {
    const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
    if (parentTransform?.length === 16) mat4.copy(this._parentTransform, parentTransform);
    if (this.firingEffect)
    {
      if (this._activeTurret !== EveTurretSet.INVALID_INDEX && this.firingEffect.IsLooping?.() && this.state === EveTurretSet.State.STATE_FIRING)
      {
        this._recheckTimeLeft -= deltaTime;
        if (this._recheckTimeLeft < 0)
        {
          const pair = this._getClosestTurretAndLocator();
          if (pair.turret !== this._activeTurret || pair.locator !== this.target?.GetLocator?.()) this._setupFiringState();
          this._recheckTimeLeft = 2;
        }
      }
      this.firingEffect.UpdateSynchronous?.(context);
    }
    vec3.set(EveTurretSet._sourcePosition, this._parentTransform[12], this._parentTransform[13], this._parentTransform[14]);
    this.firingEffect?.GetStartPosition?.(EveTurretSet._sourcePosition);
    this.target?.Update(deltaTime, EveTurretSet._sourcePosition);
    this._ambientEffect()?.UpdateSyncronous(context, { isVisible: this.display, localToWorldTransform: this._parentTransform });
    if (this._turrets.length) this.turretMovementObserver?.Update(this._turrets[0].worldMatrix);
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
  @impl.reason("Skeleton realization is not ported yet; portable turret records may consume the same local-target tracking hook.")
  UpdateAsyncronous(context, parentData = this._parentTransform)
  {
    const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
    const parentTransform = parentData?.transform?.length === 16 ? parentData.transform : parentData;
    if (parentTransform?.length === 16)
    {
      // The OUTGOING parent transform becomes m_shipTransformPrev before the
      // new one is adopted, so the record can carry both.
      mat4.copy(this._shipTransformPrev, this._parentTransform);
      this.UpdateTurretTransforms(parentTransform);
    }
    if (parentData && parentData !== this._parentTransform && !ArrayBuffer.isView(parentData) && !Array.isArray(parentData))
    {
      this._parentData = parentData;
    }
    if (this._trackingInfluenceDelta !== 0)
    {
      this.trackingInfluence += this._trackingInfluenceDelta * deltaTime;
      if (this.trackingInfluence > this.maxTrackingTime)
      {
        this.trackingInfluence = this.maxTrackingTime;
        this._trackingInfluenceDelta = 0;
      }
      else if (this.trackingInfluence < 0)
      {
        this.trackingInfluence = 0;
        this._trackingInfluenceDelta = 0;
      }
    }
    if (this._delayToFadeOutTracking > 0)
    {
      this._delayToFadeOutTracking -= deltaTime;
      if (this._delayToFadeOutTracking <= 0)
      {
        this._delayToFadeOutTracking = 0;
        this._trackingInfluenceDelta = -1;
      }
    }
    if (this._delayToFadeInTracking > 0)
    {
      this._delayToFadeInTracking -= deltaTime;
      if (this._delayToFadeInTracking <= 0)
      {
        this._delayToFadeInTracking = 0;
        this._trackingInfluenceDelta = 1;
      }
    }
    if (this.trackingInfluence !== 0)
    {
      const trackingPosition = this.target?.GetTrackingPosition?.() ?? this.target?.position;
      if (trackingPosition)
      {
        for (const turret of this._turrets)
        {
          if (!turret.valid || !mat4.invert(EveTurretSet._inverseTurret, turret.worldMatrix)) continue;
          vec3.transformMat4(EveTurretSet._localTarget, trackingPosition, EveTurretSet._inverseTurret);
          const hook = turret.UpdateTrackingPose ?? turret.source?.UpdateTrackingPose;
          hook?.call(turret.source ?? turret, EveTurretSet._localTarget, this.trackingInfluence, this);
        }
      }
    }
    if (this.firingEffect)
    {
      this.firingEffect.SetEndPosition?.(this.target?.GetTargetPosition?.() ?? this.target?.targetPosition ?? EveTurretSet._zero);
      for (let muzzle = 0; muzzle < this.firingEffect.GetPerMuzzleEffectCount?.(); muzzle++)
      {
        this.firingEffect.SetMuzzleTransform?.(muzzle, this.GetFiringBoneWorldTransform(muzzle, EveTurretSet._muzzleTransform));
      }
      this.firingEffect.SetDisplayDestObject?.(this.target?.ShowDestObject?.() ?? true);
      this.firingEffect.UpdateAsynchronous?.(context);
    }
    this._ambientEffect()?.UpdateAsyncronous(context, { isVisible: this.display, localToWorldTransform: this._parentTransform });
    return true;
  }

  /**
   * Appends the firing and ambient effect renderables to out; gated on display,
   * and each contribution additionally on displayEffects.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Renderable collection is backend-neutral; geometry and batch realization are not ported yet.")
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    if (this.displayEffects) this.firingEffect?.GetRenderables(out);
    if (this._ambientEffect() && this.displayEffects) this._ambientEffect().GetRenderables(out);
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
    if (this.displayEffects) this.firingEffect?.UpdateVisibility(context);
    if (this.displayEffects) this._ambientEffect()?.UpdateVisibility(context, this._parentTransform);
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
      this.firingEffect?.Register(registry);
      this._ambientEffect()?.Register(registry);
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
      this.firingEffect?.UnRegister(registry);
      this._ambientEffect()?.UnRegister(registry);
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
  @impl.reason("Instance stream, vertex declaration and realized LOD allocations are not ported yet; Trinity records their canonical geometry source and instance count.")
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
      const sphere = EveTurretSet._shadowSphereScratch;
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
  @impl.reason("Instance stream, vertex declaration and LOD allocations (cpp:2227-2250) are not ported; the batch records the geometry source, turret effect, per-object data and the CPU-known instance count meanwhile.")
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
  @impl.reason("Trinity fills the CPU-known EveTurretSet VS/PS RawData fields; bone-palette ring offsets and IsGood/GetMeshCount realization gates are not ported yet, while the CPU gate is geometry presence.")
  GetPerObjectData(accumulator = null)
  {
    if (!this.geometryResource || typeof accumulator?.Alloc !== "function")
    {
      return null;
    }

    const vs = accumulator.Alloc("EveTurretSetVSData");
    const ps = accumulator.Alloc("EveTurretSetPSData");
    const parent = this._parentData;

    // Carbon cpp:2305-2309.
    vs.SetAndTranspose("shipMatrix", parent.transform ?? this._parentTransform);
    vs.SetAndTranspose("prevShipMatrix", this._shipTransformPrev);
    vs.Set("baseCutoffData", [ this.bottomClipHeight, 0, 0, 0 ]);

    if (this._turrets.length)
    {
      // The shader's bone-index mapping is shared by every turret of the set;
      // three bones is Carbon's default when no skeleton mapping is present.
      const boneCount = this._skeletonBoneIndices.length || EveTurretSet.DEFAULT_BONES_PER_TURRET;

      // Only VISIBLE turrets consume a slot, and the array is filled densely -
      // the unwritten tail deliberately keeps whatever the arena held
      // (cpp:2322-2341).
      let turretIndex = 0;
      for (const turret of this._turrets)
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
          vs.SetIndex("turretTranslation", turretIndex, EveTurretSet._invalidTranslation);
          vs.SetIndex("turretRotation", turretIndex, EveTurretSet._invalidRotation);
        }
        turretIndex++;
      }

      // currentBoneOffset/prevBoneOffset are GPU ring addresses with no CPU
      // derivation (cpp:2387-2388); they stay at their zero default.
      vs.Set("turretSetData", [ boneCount, 0, 0, 0 ]);

      // ps data (cpp:2394-2404)
      ps.Set("shipData", parent.shipData ?? EveTurretSet._zero4);
      const clipCenter = parent.clipSphereCenter ?? EveTurretSet._zero4;
      ps.Set("clipData1", [ clipCenter[0], clipCenter[1], clipCenter[2], parent.clipRadiusSq ?? 0 ]);
      ps.Set("clipRadius2Sq", [ parent.clipRadius2Sq ?? 0 ]);

      // The hull's coefficients when it published any, zeroes otherwise.
      for (let index = 0; index < EveTurretSet.SH_COEFFICIENT_COUNT; index++)
      {
        const source = parent.shLighting
          ? parent.shLighting.subarray(index * 4, index * 4 + 4)
          : EveTurretSet._zero4;
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
  _setupFiringState()
  {
    if (this.state === EveTurretSet.State.STATE_DEACTIVE || !this.target) return false;
    const pair = this._getClosestTurretAndLocator();
    this._activeTurret = pair.turret;
    if (this.maxCyclingFirePos > 1)
    {
      this.currentCyclingFiresPos += this.cyclingFireGroupCount;
      if (this.currentCyclingFiresPos >= this.maxCyclingFirePos * this.cyclingFireGroupCount) this.currentCyclingFiresPos = 0;
    }
    this.randomFiringDelay = this.useRandomFiringDelay ? this.GetShotTimeVariance() * Math.random() : 0;
    const effectTotalTime = Number(this.firingEffect?.GetFiringDuration?.() ?? 0);
    const effectPeakTime = Number(this.firingEffect?.GetFiringPeakTime?.() ?? 0);
    const source = this._parentTransform.subarray(12, 15);
    const locator = pair.locator;
    if (this.state === EveTurretSet.State.STATE_IDLE || this.state === EveTurretSet.State.STATE_RELOADING)
    {
      this.randomFiringDelay += this.maxTrackingTime;
      this._delayToFadeInTracking = 0.0001;
    }
    const fireName = this.currentCyclingFiresPos > 0 ? `Fire0${Math.floor(this.currentCyclingFiresPos / this.cyclingFireGroupCount)}` : "Fire";
    this._turrets.forEach((_turret, index) => this._playTurret(index, index === this._activeTurret ? fireName : "", "Active", this.randomFiringDelay));
    this.target.StartFireAtLocator?.(locator ?? -1, this.randomFiringDelay + effectPeakTime, effectTotalTime - effectPeakTime, source);
    const ambient = this._ambientEffect();
    if (ambient)
    {
      ambient.SetControllerVariable("TurretState", this.state === EveTurretSet.State.STATE_FIRING ? EveTurretSet.State.STATE_TARGETING : this.state);
      ambient.SetControllerVariableOnInstance?.(this._activeTurret, "TurretState", EveTurretSet.State.STATE_FIRING);
      ambient.SetControllerVariableOnInstance?.(this._activeTurret, "FiringDelay", this.randomFiringDelay);
    }
    return true;
  }

  /**
   * Picks the turret whose world up axis best aligns with its nearest damage
   * locator and, when chooseRandomLocator is set, re-picks the turret against a
   * random valid locator instead; falls back to turret 0. Returns the shared
   * pair record, valid only until the next call.
   */
  _getClosestTurretAndLocator()
  {
    const pair = EveTurretSet._closestPair;
    pair.turret = EveTurretSet.INVALID_INDEX;
    pair.locator = -1;
    if (!this._turrets.length) return pair;
    let closestAngle = -1;
    for (let index = 0; index < this._turrets.length; index++)
    {
      const turret = this._turrets[index];
      if (!turret.valid) continue;
      const transform = turret.worldMatrix;
      vec3.set(EveTurretSet._turretPosition, transform[12], transform[13], transform[14]);
      const locator = this.target?.FindClosestLocator?.(EveTurretSet._turretPosition, EveTurretSet._locatorPosition) ?? -1;
      vec3.subtract(EveTurretSet._targetDirection, EveTurretSet._locatorPosition, EveTurretSet._turretPosition);
      if (vec3.squaredLength(EveTurretSet._targetDirection)) vec3.normalize(EveTurretSet._targetDirection, EveTurretSet._targetDirection);
      vec3.normalize(EveTurretSet._turretUp, vec3.set(EveTurretSet._turretUp, transform[4], transform[5], transform[6]));
      const angle = vec3.dot(EveTurretSet._turretUp, EveTurretSet._targetDirection);
      if (angle > closestAngle)
      {
        closestAngle = angle;
        pair.turret = index;
        pair.locator = locator;
      }
    }
    if (pair.turret !== EveTurretSet.INVALID_INDEX && this.chooseRandomLocator)
    {
      const transform = this._turrets[pair.turret].worldMatrix;
      vec3.set(EveTurretSet._turretPosition, transform[12], transform[13], transform[14]);
      const randomLocator = this.target?.FindRandomValidLocator?.(EveTurretSet._turretPosition, EveTurretSet._locatorPosition) ?? -1;
      if (randomLocator !== pair.locator && randomLocator !== -1)
      {
        pair.locator = randomLocator;
        closestAngle = -1;
        for (let index = 0; index < this._turrets.length; index++)
        {
          const turret = this._turrets[index];
          if (!turret.valid) continue;
          const turretTransform = turret.worldMatrix;
          vec3.set(EveTurretSet._turretPosition, turretTransform[12], turretTransform[13], turretTransform[14]);
          vec3.subtract(EveTurretSet._targetDirection, EveTurretSet._locatorPosition, EveTurretSet._turretPosition);
          if (vec3.squaredLength(EveTurretSet._targetDirection)) vec3.normalize(EveTurretSet._targetDirection, EveTurretSet._targetDirection);
          vec3.normalize(EveTurretSet._turretUp, vec3.set(EveTurretSet._turretUp, turretTransform[4], turretTransform[5], turretTransform[6]));
          const angle = vec3.dot(EveTurretSet._turretUp, EveTurretSet._targetDirection);
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
  _playAll(animation, loop, delay)
  {
    let duration = 0;
    for (let index = 0; index < this._turrets.length; index++) duration = Math.max(duration, this._playTurret(index, animation, loop, delay));
    return duration;
  }

  /**
   * Plays an animation on one turret through the record's own hook or its
   * controller, returning the reported duration, or 0 when the turret or the
   * hook is absent.
   */
  _playTurret(index, animation, loop, delay)
  {
    const turret = this._turrets[index];
    if (!turret) return 0;
    return Number(turret.PlayAnimation?.(animation, loop, delay) ?? turret.controller?.PlayAnimation?.(animation, { loop, delay }) ?? 0);
  }

  /**
   * The ambient effect in force: the authored one while in ambient-effect
   * editing mode, otherwise the generated distributed instance container when
   * one exists.
   */
  _ambientEffect()
  {
    return this.ambientEffectEditingMode ? this.ambientEffect : this.generatedDistributedAmbientEffect ?? this.ambientEffect;
  }

  /**
   * Pushes the current state onto the ambient effect's TurretState controller
   * variable.
   */
  _setAmbientState()
  {
    this._ambientEffect()?.SetControllerVariable("TurretState", this.state);
  }

  /**
   * Coerces a caller-supplied turret into the record shape - local and world
   * matrices, local quaternion and position, valid and display flags - reusing
   * the object in place when it already carries a local matrix, and otherwise
   * wrapping it as the record's source.
   */
  _normalizeTurret(turret)
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

  static _boneTransform = mat4.create();
  static _lowLodTransform = mat4.create();
  static _muzzleTransform = mat4.create();
  static _turretPosition = vec3.create();
  static _targetDirection = vec3.create();
  static _turretUp = vec3.create();
  static _locatorPosition = vec3.create();
  static _zero = vec3.create();
  static _sourcePosition = vec3.create();
  static _localTranslation = vec3.create();
  static _localRotation = quat.create();
  static _unitScale = vec3.fromValues(1, 1, 1);
  static _inverseTurret = mat4.create();
  static _shadowSphereScratch = vec4.create();
  static _localTarget = vec3.create();
  static _directRotation = quat.create();
  static _launcherRotation = mat4.create();
  static _unitZ = vec3.fromValues(0, 0, 1);
  static _closestPair = { turret: EveTurretSet.INVALID_INDEX, locator: -1 };

}

// Registered as Carbon registers it (trinity/trinity/Eve/Turret/EveTurretSet_Blue.cpp:27).
blue.enums.RegisterEnum("trinity.EveTurretSet.LOD", EveTurretSet.LOD, {
  source: "trinity/trinity/Eve/Turret/EveTurretSet.h", family: "eve/attachment/turrets", line: 235,
  exposedName: "EveTurretSetLOD", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/Turret/EveTurretSet_Blue.cpp:11",
  chooser: [
    { name: "LOD_INVALID", value: EveTurretSet.LOD.LOD_INVALID, description: "" },
    { name: "LOD_EMPTY", value: EveTurretSet.LOD.LOD_EMPTY, description: "" },
    { name: "LOD_HIGHEST", value: EveTurretSet.LOD.LOD_HIGHEST, description: "" },
    { name: "LOD_DISABLED", value: EveTurretSet.LOD.LOD_DISABLED, description: "" }
  ]
});

// Carbon neither registers this nor gives it a chooser.
blue.enums.RegisterEnum("trinity.EveTurretSet.State", EveTurretSet.State, {
  source: "trinity/trinity/Eve/Turret/EveTurretSet.h", family: "eve/attachment/turrets", line: 245
});
