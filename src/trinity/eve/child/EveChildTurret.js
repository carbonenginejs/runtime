// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildTurret.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildTurret.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildTurret_Blue.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { EveChildMesh } from "./EveChildMesh.js";
import { Tr2GrannyAnimation } from "../../core/animation/Tr2GrannyAnimation.js";
import { SendEventToAudEmitter } from "../../core/variable/TriObserverLocal.js";
import { EveTurretAiming } from "../attachment/turrets/EveTurretAiming.js";
import { EveTurretFiringFX } from "../attachment/turrets/EveTurretFiringFX.js";
import { EveTurretSet } from "../attachment/turrets/EveTurretSet.js";
import { EveTurretTarget } from "../attachment/turrets/EveTurretTarget.js";

// Carbon file-scope constants (EveChildTurret.cpp:12-16).
const INVALID_BONE_INDEX = 0xffffffff;
const TRACKING_FADE_TIME = 1;

const MUZZLE_TRANSFORM_SCRATCH = mat4.create();
const FIRE_SOURCE_SCRATCH = vec3.create();
const FIRE_POSITION_SCRATCH = vec3.create();
const TARGET_OS_SCRATCH = vec3.create();
const INVERSE_WORLD_SCRATCH = mat4.create();

/** Carbon TriGeometryResSkeletonData::FindJoint (TriGeometryRes.cpp:1841-1853): exact name match, 0xffffffff on miss. */
function FindJoint(skeletonData, name)
{
  const bones = skeletonData?.bones ?? [];
  for (let index = 0; index < bones.length; index++)
  {
    const bone = bones[index];
    const boneName = typeof bone === "string" ? bone : String(bone?.name ?? bone?.Name ?? "");
    if (boneName === name) return index;
  }
  return INVALID_BONE_INDEX;
}


/**
 * A single animated turret living as a space-object child: it owns its
 * target tracker, sysbone aiming, deploy/pack/fire animation state machine,
 * firing effect and movement audio. Implements the ITr2PoseModifier contract
 * (ModifyPose) and registers itself on its own animation updater, so the
 * barrels aim inside the sampled pose. Carbon instantiates it only from
 * serialized scene data - SOF never constructs one.
 */
@type.define({ className: "EveChildTurret", family: "eve/child" })
export class EveChildTurret extends EveChildMesh
{

  /** Indicates if the turret is active; runtime toggle, not persisted. */
  @io.readwrite
  @type.boolean
  isOnline = true;

  /** How much tracking is currently applied; runtime-derived. */
  @io.read
  @type.float32
  trackingInfluence = 0;

  /** How long tracking takes to fade in - and its influence ceiling. */
  @io.persist
  @type.float32
  maxTrackingTime = 1;

  /** State of the turret (persisted but not editable). */
  @io.read
  @io.persist
  @type.int32
  state = EveTurretSet.State.STATE_IDLE;

  // The eleven flat sysbone tunables Carbon re-exposes from the embedded
  // EveTurretAiming (EveChildTurret_Blue.cpp:25-35); same names and defaults
  // as EveTurretSet. Offsets are authored in degrees.
  @io.persist
  @type.float32
  sysBoneHeight = 1;

  @io.persist
  @type.float32
  sysBonePitchFactor = 1;

  @io.persist
  @type.float32
  sysBonePitchOffset = 0;

  @io.persist
  @type.float32
  sysBonePitchMin = 0;

  @io.persist
  @type.float32
  sysBonePitchMax = 90;

  @io.persist
  @type.float32
  sysBonePitch01Factor = 1;

  @io.persist
  @type.float32
  sysBonePitch01Offset = 0;

  @io.persist
  @type.float32
  sysBonePitch02Factor = 1;

  @io.persist
  @type.float32
  sysBonePitch02Offset = 0;

  @io.persist
  @type.float32
  sysBonePitch03Factor = 1;

  @io.persist
  @type.float32
  sysBonePitch03Offset = 0;

  /** If greater than one, firing cycles through this many muzzle groups. */
  @io.persist
  @type.uint32
  maxCyclingFirePos = 1;

  /** The number of muzzles in one cycle group, usually one. */
  @io.persist
  @type.uint32
  cyclingFireGroupCount = 1;

  /** Current muzzle id due to cycling; runtime-derived. */
  @io.read
  @type.uint32
  currentCyclingFiresPos = 0;

  /** The module for the firing effect of this turret. */
  @io.persist
  @type.objectRef("EveTurretFiringFX")
  firingEffect = null;

  /** A res path to the redfile containing the primary firing effect. */
  @io.notify
  @io.persist
  @type.string
  firingEffectResPath = "";

  /**
   * Resolves firingEffectResPath into a live EveTurretFiringFX. Carbon uses
   * BeResMan.LoadObject; CarbonEngineJS threads the established
   * CjsEveChildResourceLoader seam (the EveChildRef/EveChildSocket pattern) -
   * without a loader an authored path stays unresolved.
   */
  @type.objectRef("CjsEveChildResourceLoader")
  resourceLoader = null;

  /** Size of impacts; no impact when 0 or less. */
  @io.notify
  @io.persist
  @type.float32
  impactSize = 0;

  /** What the impacts should hit (an ImpactBehaviour value). */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("ImpactBehaviour")
  impactBehaviour = EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR;

  /** The observer for turret movement sounds; positioned automatically. */
  @io.persist
  @type.objectRef("TriObserverLocal")
  turretMovementObserver = null;

  /** Whether mechanical movement sounds play when events are authored. */
  @io.persist
  @type.boolean
  playMovementSound = true;

  /** Audio event for mechanical noise when moving from idle to targeting. */
  @io.persist
  @type.string
  idleToTargetingMovementAudioEvent = "";

  /** Audio event for mechanical noise when moving from targeting to idle. */
  @io.persist
  @type.string
  targetingToIdleMovementAudioEvent = "";

  // Carbon m_target: created in the constructor with fade-on-locator-change
  // enabled (EveChildTurret.cpp:26-27); Blue exposes it READ-only.
  #target = new EveTurretTarget();

  #aiming = new EveTurretAiming();

  // Carbon m_systemBoneID[SYSBONE_MAX], all INVALID until geometry arrives.
  #systemBoneID = new Array(EveTurretAiming.SystemBones.SYSBONE_MAX).fill(INVALID_BONE_INDEX);

  #trackingInfluenceDelta = 0;

  #delayToFadeOutTracking = 0;

  #delayToFadeInTracking = 0;

  // Carbon m_hookedUpdater: the updater our pose modifier is registered on,
  // so a swap unhooks the old one (EveChildTurret.h:110, cpp:707-714).
  #hookedUpdater = null;

  #recheckTimeLeft = -1;

  #firingEffectMuzzlePosSet = false;

  #cachedGeometryRes = null;

  // Carbon reads m_parentData.transform in SetupFiringState (cpp:533) - the
  // PARENT transform, deliberately not this child's world transform; captured
  // from the update params each async pass.
  #parentTranslation = vec3.create();

  constructor()
  {
    super();
    this.#target.SetFadeOnLocatorChange(true);
    // Carbon's ctor also calls PrepareResources(); the browser runtime's
    // resource lifecycle is engine-owned and has no per-child prepare hook.
  }

  /** The turret's target tracker (Carbon exposes it as the READ attribute "target"). */
  @carbon.method
  @impl.implemented
  GetTarget()
  {
    return this.#target;
  }

  /**
   * The shared sysbone aiming math, synced from this turret's flat tuning
   * fields - the same object shape EveTurretSet.GetAiming returns.
   */
  @impl.adapted
  @impl.reason("Carbon's by-value embed becomes an accessor; the flat Blue schema is preserved on this class.")
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

  /**
   * Passes authored impact data into the target tracker and resolves an
   * authored firing-effect path when no inline effect won at load time
   * (Carbon EveChildTurret.cpp:48-60).
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#target.SetImpactBehaviour(this.impactSize, this.impactBehaviour);
    if (!this.firingEffect && this.firingEffectResPath)
    {
      this.#LoadFiringEffectFromPath();
    }
    return super.Initialize();
  }

  /**
   * Re-syncs the tracker's impact data and reloads the firing effect when
   * the notifying fields change (Carbon cpp:61-72; the path reload has no
   * inline-effect guard, unlike Initialize).
   */
  @carbon.method
  @impl.implemented
  OnModified(value = null)
  {
    if (value === "impactSize" || value === "impactBehaviour")
    {
      this.#target.SetImpactBehaviour(this.impactSize, this.impactBehaviour);
    }
    if (value === "firingEffectResPath" && this.firingEffectResPath)
    {
      this.#LoadFiringEffectFromPath();
    }
    return super.OnModified(value);
  }

  #LoadFiringEffectFromPath()
  {
    if (!this.resourceLoader) return;
    const loaded = this.resourceLoader.LoadChild(this.firingEffectResPath, this);
    if (loaded) this.SetFiringEffect(loaded);
  }

  /** Registers the firing effect's entity half when displayed (Carbon cpp:73-84). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      if (this.firingEffect) this.firingEffect.RegisterComponents();
    }
  }

  /** Unregisters the firing effect's entity half; not display-gated (Carbon cpp:85-96). */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      if (this.firingEffect) this.firingEffect.UnRegisterComponents();
    }
  }

  /**
   * Sync-side frame update (Carbon cpp:126-179): looping-effect retarget
   * recheck every two seconds while firing, firing-effect sync update, the
   * target tracker fed from the effect's start position (or this world
   * translation), and the movement observer following the world transform.
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params)
  {
    const deltaT = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaTime ?? 0) || 0;

    if (this.firingEffect)
    {
      this.firingEffect.SetDisplaySourceObject(this.IsVisible(updateContext));
    }

    this.UpdateCachedGeometryData();

    if (this.firingEffect)
    {
      if (this.firingEffect.IsLooping() && this.state === EveChildTurret.State.STATE_FIRING)
      {
        this.#recheckTimeLeft -= deltaT;
        if (this.#recheckTimeLeft < 0)
        {
          vec3.set(FIRE_SOURCE_SCRATCH,
            this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
          const closestLocator = this.#target.FindClosestLocator(FIRE_SOURCE_SCRATCH, FIRE_POSITION_SCRATCH);
          if (closestLocator >= 0 && closestLocator !== this.#target.GetLocator())
          {
            this.SetupFiringState();
          }
          this.#recheckTimeLeft = 2;
        }
      }
      this.firingEffect.UpdateSynchronous(updateContext);
    }

    vec3.set(FIRE_POSITION_SCRATCH,
      this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
    if (this.firingEffect)
    {
      this.firingEffect.GetStartPosition(FIRE_POSITION_SCRATCH);
    }
    this.#target.Update(deltaT, FIRE_POSITION_SCRATCH);

    if (this.mesh && this.turretMovementObserver)
    {
      this.turretMovementObserver.Update(this.worldTransform);
    }
    return super.UpdateSyncronous(updateContext, params);
  }

  /**
   * Async-side frame update (Carbon cpp:181-260): tracking-influence fades
   * (clamped to [0, maxTrackingTime]), the base mesh update, then muzzle
   * transforms and target end position onto the firing effect - with the
   * late muzzle fallback to the turret root until geometry loads.
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.implemented
  UpdateAsyncronous(updateContext, params)
  {
    const deltaT = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaTime ?? 0) || 0;

    if (this.#trackingInfluenceDelta !== 0)
    {
      this.trackingInfluence += this.#trackingInfluenceDelta * deltaT;
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
      this.#delayToFadeOutTracking -= deltaT;
      if (this.#delayToFadeOutTracking <= 0)
      {
        this.#delayToFadeOutTracking = 0;
        this.#trackingInfluenceDelta = -1 / TRACKING_FADE_TIME;
      }
    }

    if (this.#delayToFadeInTracking > 0)
    {
      this.#delayToFadeInTracking -= deltaT;
      if (this.#delayToFadeInTracking <= 0)
      {
        this.#delayToFadeInTracking = 0;
        this.#trackingInfluenceDelta = 1 / TRACKING_FADE_TIME;
      }
    }

    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      vec3.set(this.#parentTranslation,
        parentTransform[12], parentTransform[13], parentTransform[14]);
    }

    const result = super.UpdateAsyncronous(updateContext, params);

    if (this.firingEffect)
    {
      if (this.mesh)
      {
        for (let muzzle = 0; muzzle < this.firingEffect.GetPerMuzzleEffectCount(); muzzle++)
        {
          this.GetFiringBoneWorldTransform(muzzle, MUZZLE_TRANSFORM_SCRATCH);
          this.firingEffect.SetMuzzleTransform(muzzle, MUZZLE_TRANSFORM_SCRATCH);
        }
        this.#firingEffectMuzzlePosSet = true;
      }

      this.firingEffect.SetEndPosition(this.#target.GetTargetPosition());

      if (this.firingEffect.UpdateAsynchronous(updateContext))
      {
        if (!this.#firingEffectMuzzlePosSet)
        {
          for (let muzzle = 0; muzzle < this.firingEffect.GetPerMuzzleEffectCount(); muzzle++)
          {
            this.firingEffect.SetMuzzleTransform(muzzle, this.worldTransform);
          }
          this.#firingEffectMuzzlePosSet = true;
        }
        this.firingEffect.SetDisplayDestObject(this.#target.ShowDestObject());
      }
    }
    return result;
  }

  /** Forwards visibility to the firing effect when displayed (Carbon cpp:262-270). */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    const result = super.UpdateVisibility(updateContext, parentTransform, parentLod);
    if (this.display && this.firingEffect)
    {
      this.firingEffect.UpdateVisibility(updateContext);
    }
    return result;
  }

  /** Appends the firing effect's renderables when displayed (Carbon cpp:272-280). */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables)
  {
    super.GetRenderables(renderables);
    if (this.display && this.firingEffect)
    {
      this.firingEffect.GetRenderables(renderables);
    }
    return renderables;
  }

  /**
   * Rebuilds the cached sysbone/muzzle lookups when the geometry resource
   * changes (Carbon cpp:302-315).
   */
  @carbon.method
  @impl.implemented
  UpdateCachedGeometryData()
  {
    const geometryRes = this.GetGeometryRes();
    if (geometryRes === this.#cachedGeometryRes) return;
    this.ReleaseCachedGeometryData();
    if (geometryRes && geometryRes.IsGood())
    {
      this.BuildCachedGeometryData(geometryRes);
      this.#cachedGeometryRes = geometryRes;
    }
  }

  /**
   * Finds the system bones in the model skeleton, wires the firing effect's
   * muzzle bones, hooks the animation and forces the idle animation for the
   * current state (Carbon cpp:316-336; the sequencing is behavior).
   */
  @carbon.method
  @impl.implemented
  BuildCachedGeometryData(geometryRes)
  {
    if (geometryRes.GetSkeletonCount())
    {
      const skeletonData = geometryRes.GetSkeletonData(0);
      if (skeletonData)
      {
        for (let bone = 0; bone < EveTurretAiming.SystemBones.SYSBONE_MAX; bone++)
        {
          this.#systemBoneID[bone] = FindJoint(skeletonData, EveTurretAiming.getSystemBoneName(bone));
        }
        this.InitializeFiringEffect();
      }
    }
    this.InitializeAnimation();
    this.ForceIdleAnimation();
  }

  /** Drops the cached geometry link and the muzzle stamp (Carbon cpp:337-341). */
  @carbon.method
  @impl.implemented
  ReleaseCachedGeometryData()
  {
    this.#cachedGeometryRes = null;
    this.#firingEffectMuzzlePosSet = false;
  }

  /**
   * Go into state deactive: play the pack animation and stay inside the
   * ship (Carbon cpp:343-376; the STATE_FIRING case deliberately falls
   * through to STATE_TARGETING).
   */
  @carbon.method
  @impl.implemented
  EnterStateDeactive()
  {
    const State = EveChildTurret.State;
    switch (this.state)
    {
      case State.STATE_DEACTIVE:
        break;
      case State.STATE_IDLE:
      case State.STATE_RELOADING:
        this.trackingInfluence = 0;
        this.#PlayAnimation("Pack", "Inactive");
        this.#delayToFadeOutTracking = 0;
        break;
      case State.STATE_FIRING:
        if (this.firingEffect) this.firingEffect.StopFiring();
        // DON'T break, just continue with stopping things:
        // eslint-disable-next-line no-fallthrough
      case State.STATE_TARGETING:
        this.#delayToFadeOutTracking = 0.0001;
        this.#target.StopFireAtLocator();
        this.#PlayAnimation("Pack", "Inactive", TRACKING_FADE_TIME);
        break;
      default:
        break;
    }
    this.state = State.STATE_DEACTIVE;
  }

  /** Go into state idle: face the cannons forward (Carbon cpp:378-418). */
  @carbon.method
  @impl.implemented
  EnterStateIdle()
  {
    if (!this.isOnline) return;
    const State = EveChildTurret.State;
    switch (this.state)
    {
      case State.STATE_INVALID:
      case State.STATE_RELOADING:
        this.#PlayAnimation("", "Active");
        break;
      case State.STATE_DEACTIVE:
        this.#PlayAnimation("Deploy", "Active");
        this.trackingInfluence = 0;
        break;
      case State.STATE_IDLE:
        break;
      case State.STATE_TARGETING:
      case State.STATE_FIRING:
        this.#delayToFadeOutTracking = 0.0001;
        this.#target.StopFireAtLocator();
        if (this.firingEffect) this.firingEffect.StopFiring();
        this.#PlayAnimation("", "Active", TRACKING_FADE_TIME);
        if (this.playMovementSound && this.targetingToIdleMovementAudioEvent)
        {
          this.#SendMovementAudioEvent(this.targetingToIdleMovementAudioEvent);
        }
        break;
      default:
        break;
    }
    this.state = State.STATE_IDLE;
  }

  /** Go into state targeting: face the cannons toward the enemy (Carbon cpp:420-459). */
  @carbon.method
  @impl.implemented
  EnterStateTargeting()
  {
    if (!this.isOnline) return;
    const State = EveChildTurret.State;
    switch (this.state)
    {
      case State.STATE_DEACTIVE:
      {
        const animLength = this.#PlayAnimation("Deploy", "Active", TRACKING_FADE_TIME);
        this.#delayToFadeInTracking = animLength + 0.0001;
        break;
      }
      case State.STATE_IDLE:
      case State.STATE_RELOADING:
        this.#delayToFadeInTracking = 0.0001;
        this.#PlayAnimation("", "Active", TRACKING_FADE_TIME);
        break;
      case State.STATE_TARGETING:
        break;
      case State.STATE_FIRING:
        this.#target.StopFireAtLocator();
        if (this.firingEffect) this.firingEffect.StopFiring();
        this.#PlayAnimation("", "Active", 0);
        break;
      default:
        break;
    }
    this.state = State.STATE_TARGETING;
  }

  /**
   * Go into state firing (Carbon cpp:461-500): a looping effect already
   * firing only refreshes its move objects; otherwise the effect is stopped,
   * prepared (with muzzle cycling when configured) and pointed at the
   * target's impact surface.
   */
  @carbon.method
  @impl.implemented
  EnterStateFiring()
  {
    if (!this.SetupFiringState()) return;
    const State = EveChildTurret.State;

    if (this.firingEffect && this.state === State.STATE_FIRING)
    {
      if (this.firingEffect.IsLooping())
      {
        this.firingEffect.PrepareFiringEffectMoveObjects();
        return;
      }
      this.firingEffect.StopFiring();
    }

    if (this.firingEffect)
    {
      if (this.maxCyclingFirePos > 1)
      {
        this.firingEffect.PrepareFiring(0, this.currentCyclingFiresPos, this.cyclingFireGroupCount);
      }
      else
      {
        this.firingEffect.PrepareFiring(0);
      }
      this.firingEffect.SetImpactConfiguration(this.#target.GetImpactConfiguration());
    }

    this.state = State.STATE_FIRING;
  }

  /**
   * Aims at the closest facing damage locator, advances muzzle cycling, and
   * starts the fire animation + tracker timing (Carbon cpp:502-556). The
   * locator search uses THIS turret's world translation; the tracker's fire
   * source deliberately uses the PARENT transform's translation.
   */
  @carbon.method
  @impl.implemented
  SetupFiringState()
  {
    const State = EveChildTurret.State;
    if (this.state === State.STATE_DEACTIVE)
    {
      return false;
    }
    vec3.set(FIRE_SOURCE_SCRATCH,
      this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
    const closestLocator = this.#target.FindClosestLocator(FIRE_SOURCE_SCRATCH, FIRE_POSITION_SCRATCH);

    if (this.maxCyclingFirePos > 1)
    {
      this.currentCyclingFiresPos += this.cyclingFireGroupCount;
      if (this.currentCyclingFiresPos >= this.maxCyclingFirePos * this.cyclingFireGroupCount)
      {
        this.currentCyclingFiresPos = 0;
      }
    }

    const effectTotalTime = this.firingEffect ? this.firingEffect.GetFiringDuration() : 0;
    const effectPeakTime = this.firingEffect ? this.firingEffect.GetFiringPeakTime() : 0;

    switch (this.state)
    {
      case State.STATE_IDLE:
      case State.STATE_RELOADING:
        this.#delayToFadeInTracking = 0.0001;
        this.#PlayAnimation(this.#GetFireAnimationName(), "Active", this.maxTrackingTime);
        this.#target.StartFireAtLocator(
          closestLocator, this.maxTrackingTime + effectPeakTime,
          effectTotalTime - effectPeakTime, this.#parentTranslation);
        break;
      case State.STATE_FIRING:
      case State.STATE_TARGETING:
        this.#PlayAnimation(this.#GetFireAnimationName(), "Active", this.maxTrackingTime);
        this.#target.StartFireAtLocator(
          closestLocator, this.maxTrackingTime + effectPeakTime,
          effectTotalTime - effectPeakTime, this.#parentTranslation);
        break;
      default:
        break;
    }
    return true;
  }

  /**
   * Go into state reloading (Carbon cpp:558-589). Carbon's DEACTIVE case
   * comments "ignore" yet still stamps STATE_RELOADING at the end - that
   * quirk is preserved verbatim.
   */
  @carbon.method
  @impl.implemented
  EnterStateReloading()
  {
    const State = EveChildTurret.State;
    switch (this.state)
    {
      case State.STATE_DEACTIVE:
        break;
      case State.STATE_INVALID:
      case State.STATE_IDLE:
      case State.STATE_RELOADING:
        this.#PlayAnimation("Reload", "Active", 0);
        break;
      case State.STATE_TARGETING:
      case State.STATE_FIRING:
        this.#delayToFadeOutTracking = 0.0001;
        this.#target.StopFireAtLocator();
        if (this.firingEffect) this.firingEffect.StopFiring();
        this.#PlayAnimation("Reload", "Active", TRACKING_FADE_TIME);
        break;
      default:
        break;
    }
    this.state = State.STATE_RELOADING;
  }

  /** Force into state deactive: no animation transition, just flip (Carbon cpp:591-606). */
  @carbon.method
  @impl.implemented
  ForceStateDeactive()
  {
    this.trackingInfluence = 0;
    this.#delayToFadeOutTracking = 0;
    this.#target.StopFireAtLocator();
    if (this.firingEffect) this.firingEffect.StopFiring();
    this.state = EveChildTurret.State.STATE_DEACTIVE;
    this.ForceIdleAnimation();
  }

  /** Force-plays the idle loop matching the current state (Carbon cpp:608-631). */
  @carbon.method
  @impl.implemented
  ForceIdleAnimation()
  {
    const State = EveChildTurret.State;
    let idleAnimName = "";
    switch (this.state)
    {
      case State.STATE_DEACTIVE:
        idleAnimName = "Inactive";
        break;
      case State.STATE_IDLE:
      case State.STATE_RELOADING:
      case State.STATE_TARGETING:
      case State.STATE_FIRING:
        idleAnimName = "Active";
        break;
      default:
        break;
    }
    if (idleAnimName.length > 0)
    {
      this.#PlayAnimation("", idleAnimName, 0);
    }
  }

  /** Force into state targeting: tracking pinned to its ceiling, no transition (Carbon cpp:633-643). */
  @carbon.method
  @impl.implemented
  ForceStateTargeting()
  {
    this.trackingInfluence = this.maxTrackingTime;
    this.#trackingInfluenceDelta = 0;
    this.state = EveChildTurret.State.STATE_TARGETING;
    this.#PlayAnimation("", "Active", 0);
  }

  /**
   * The world transform of a muzzle's firing bone, falling back to this
   * turret's world transform without a mesh or effect (Carbon cpp:645-661).
   */
  @carbon.method
  @impl.implemented
  GetFiringBoneWorldTransform(muzzle, out = mat4.create())
  {
    if (!this.mesh || !this.firingEffect)
    {
      return mat4.copy(out, this.worldTransform);
    }
    const boneID = this.firingEffect.GetPerMuzzleBoneID(muzzle);
    return this.GetTurretBoneTransform(boneID, out);
  }

  /**
   * Wires the firing effect's muzzle bones from the skeleton: bones named
   * GetFiringBoneName() + a two-digit 1-based index, e.g. Pos_Fire01
   * (Carbon cpp:663-696). Carbon also registers the effect with the quad
   * renderer singleton here; quad registration is engine-owned in the
   * browser runtime and happens through the engine's own registration pass.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2QuadRenderer is an engine singleton in Carbon; the browser engine owns quad registration.")
  InitializeFiringEffect()
  {
    this.#firingEffectMuzzlePosSet = false;
    if (!this.firingEffect) return;

    const geometryRes = this.GetGeometryRes();
    if (geometryRes && geometryRes.GetSkeletonCount())
    {
      const skeletonData = geometryRes.GetSkeletonData(0);
      if (skeletonData)
      {
        const muzzleCount = this.firingEffect.GetPerMuzzleEffectCount();
        const boneCount = Math.min(muzzleCount, EveChildTurret.MUZZLECOUNT_MAX);
        for (let muzzle = 0; muzzle < boneCount; muzzle++)
        {
          const boneName = `${this.firingEffect.GetFiringBoneName()}${String(muzzle + 1).padStart(2, "0")}`;
          this.firingEffect.SetMuzzleBoneID(muzzle, FindJoint(skeletonData, boneName));
        }
      }
    }
  }

  /**
   * Force-creates the animation updater BEFORE the base wiring, then hooks
   * this turret in as the updater's pose modifier, unhooking any previously
   * hooked updater on swap (Carbon cpp:698-715). CleanUp performs Carbon's
   * destructor unhook.
   */
  @carbon.method
  @impl.implemented
  InitializeAnimation()
  {
    if (!this.animationUpdater)
    {
      this.animationUpdater = new Tr2GrannyAnimation();
    }
    super.InitializeAnimation();

    if (this.#hookedUpdater !== this.animationUpdater)
    {
      if (this.#hookedUpdater && this.#hookedUpdater.GetPoseModifier() === this)
      {
        this.#hookedUpdater.SetPoseModifier(null);
      }
      this.animationUpdater.SetPoseModifier(this);
      this.#hookedUpdater = this.animationUpdater;
    }
  }

  /**
   * Carbon's destructor obligations: unhook the pose modifier and clean up
   * the firing effect (Carbon cpp:32-47). JS has no destructor; owners call
   * CleanUp when discarding the turret.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The C++ destructor becomes an explicit CleanUp obligation.")
  CleanUp(context = { currentTime: 0, deltaTime: 0 })
  {
    if (this.#hookedUpdater && this.#hookedUpdater.GetPoseModifier() === this)
    {
      this.#hookedUpdater.SetPoseModifier(null);
    }
    this.#hookedUpdater = null;
    if (this.firingEffect) this.firingEffect.CleanUp(context);
    this.ReleaseCachedGeometryData();
  }

  /**
   * The ITr2PoseModifier hook (Carbon cpp:717-741): poses every found
   * system bone toward the tracked target in turret space. Always passes
   * null for the pitch localTransform - only EveTurretSet uses the
   * behind-the-arm flip.
   */
  @carbon.method
  @impl.implemented
  ModifyPose(_skeleton, pose)
  {
    if (this.trackingInfluence === 0) return;

    const tracking = this.#target.GetTrackingPosition();
    if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform))
    {
      mat4.identity(INVERSE_WORLD_SCRATCH);
    }
    vec3.transformMat4(TARGET_OS_SCRATCH, tracking, INVERSE_WORLD_SCRATCH);

    const aiming = this.GetAiming();
    for (let bone = 0; bone < EveTurretAiming.SystemBones.SYSBONE_MAX; bone++)
    {
      // covers INVALID since INVALID_BONE_INDEX exceeds any bone count
      if (this.#systemBoneID[bone] < pose.boneTransforms.length)
      {
        const boneTransform = pose.boneTransforms[this.#systemBoneID[bone]];
        aiming.ModifySystemBoneTransform(
          bone, TARGET_OS_SCRATCH, null, this.trackingInfluence,
          boneTransform.position, boneTransform.rotation);
      }
    }
  }

  /**
   * A bone's world-of-pose transform lifted into world space - row-vector
   * boneLocal * worldTransform, gl multiply(out, worldTransform, boneWorld)
   * (Carbon cpp:743-757).
   */
  @carbon.method
  @impl.implemented
  GetTurretBoneTransform(boneID, out = mat4.create())
  {
    mat4.copy(out, this.worldTransform);
    if (this.animationUpdater)
    {
      const boneWorld = this.animationUpdater.GetBoneTransform(boneID);
      if (boneWorld)
      {
        mat4.multiply(out, this.worldTransform, boneWorld);
      }
    }
    return out;
  }

  /** The mesh's geometry resource, or null (Carbon cpp:758-761). */
  @carbon.method
  @impl.implemented
  GetGeometryRes()
  {
    return this.mesh ? this.mesh.GetGeometryResource() : null;
  }

  /**
   * Stops running animations after the delay, queues the action animation
   * once on the base layer and the idle loop forever after it; returns the
   * action animation's duration (Carbon cpp:763-787).
   */
  #PlayAnimation(animName, animNameIdle, delay = 0)
  {
    const updater = this.animationUpdater;
    if (!updater) return 0;

    updater.StopAnimations(delay);

    let animLength = 0;
    if (animName)
    {
      if (updater.PlayAnimation(animName, false, 1, 0, 1, false))
      {
        animLength = updater.FindAnimationDurationByName(animName);
      }
    }
    if (animNameIdle)
    {
      updater.PlayAnimation(animNameIdle, false, 0, 0, 1, false);
    }
    return animLength;
  }

  /** "Fire", or "Fire0" + cycle digit past the first cycle (Carbon cpp:788-799). */
  #GetFireAnimationName()
  {
    let name = "Fire";
    if (this.currentCyclingFiresPos > 0)
    {
      name += "0";
      name += String(Math.trunc(this.currentCyclingFiresPos / this.cyclingFireGroupCount));
    }
    return name;
  }

  /** The firing effect module (Carbon cpp:801-804). */
  @carbon.method
  @impl.implemented
  GetFiringEffect()
  {
    return this.firingEffect;
  }

  /**
   * Swaps the firing effect, moving its component registration and rewiring
   * its muzzle bones (Carbon cpp:806-819).
   */
  @carbon.method
  @impl.implemented
  SetFiringEffect(firingEffect)
  {
    if (this.firingEffect) this.firingEffect.UnRegisterComponents();
    this.firingEffect = firingEffect ?? null;
    if (this.firingEffect) this.firingEffect.RegisterComponents();
    this.InitializeFiringEffect();
  }

  /**
   * Attaches to a target object, firing the movement audio when moving off
   * idle or switching targets (Carbon cpp:821-848). Passing null is a no-op:
   * Carbon's API cannot clear a target.
   */
  @carbon.method
  @impl.implemented
  SetTargetObject(target)
  {
    if (!target) return;
    const oldTarget = this.#target.GetTargetable();
    this.#target.SetTargetable(target);

    if (this.playMovementSound && this.idleToTargetingMovementAudioEvent)
    {
      if (this.state === EveChildTurret.State.STATE_IDLE || oldTarget !== this.#target.GetTargetable())
      {
        this.#SendMovementAudioEvent(this.idleToTargetingMovementAudioEvent);
      }
    }
    this.SetTargetScale();
  }

  /** The tracked targetable, or null (Carbon cpp:850-853). */
  @carbon.method
  @impl.implemented
  GetTargetObject()
  {
    return this.#target.GetTargetable();
  }

  /** Scales the firing effect by the target's radius (Carbon cpp:855-857). */
  @carbon.method
  @impl.implemented
  SetTargetScale()
  {
    if (this.firingEffect)
    {
      this.firingEffect.SetScaleByRadius(this.#target.GetRadius());
    }
  }

  /** Sends a movement audio event through the observer's emitter (the EveTurretSet seam). */
  #SendMovementAudioEvent(eventName)
  {
    SendEventToAudEmitter(this.turretMovementObserver, eventName);
  }

  // The state enum matches EveTurretSet's values (Carbon EveChildTurret.h:
  // 61-69); one identity, owned by the set that had it first.
  static State = EveTurretSet.State;

  static ImpactBehaviour = EveTurretTarget.ImpactBehaviour;

  static INVALID_BONE_INDEX = INVALID_BONE_INDEX;

  static MUZZLECOUNT_MAX = EveTurretFiringFX.MUZZLE_COUNT_MAX;

}
