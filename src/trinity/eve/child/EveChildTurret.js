import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildTurret.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildTurret.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildTurret_Blue.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { carbon, impl, edit, type, CjsSchema } from "#schema";
import { blue } from "#blue";
import { TriBatchType } from "#consts/graphics";
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
@carbon.inherit(IInitialize, INotify)
export class EveChildTurret extends EveChildMesh
{

  /** Indicates if the turret is active; runtime toggle, not persisted. */
  @edit.readwrite
  @type.boolean
  isOnline = true;

  /** How much tracking is currently applied; runtime-derived. */
  @edit.read
  @type.float32
  trackingInfluence = 0;

  /** How long tracking takes to fade in - and its influence ceiling. */
  @edit.readwrite
  @edit.persist
  @type.float32
  maxTrackingTime = 1;

  /** State of the turret (persisted but not editable). */
  @edit.read
  @edit.persist
  @type.int32
  state = EveTurretSet.State.STATE_IDLE;

  // The eleven flat sysbone tunables Carbon re-exposes from the embedded
  // EveTurretAiming (EveChildTurret_Blue.cpp:25-35); same names and defaults
  // as EveTurretSet. Offsets are authored in degrees.
  @edit.readwrite
  @edit.persist
  @type.float32
  sysBoneHeight = 1;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchFactor = 1;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchOffset = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchMin = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitchMax = 90;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch01Factor = 1;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch01Offset = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch02Factor = 1;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch02Offset = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch03Factor = 1;

  @edit.readwrite
  @edit.persist
  @type.float32
  sysBonePitch03Offset = 0;

  /** If greater than one, firing cycles through this many muzzle groups. */
  @edit.readwrite
  @edit.persist
  @type.uint32
  maxCyclingFirePos = 1;

  /** The number of muzzles in one cycle group, usually one. */
  @edit.readwrite
  @edit.persist
  @type.uint32
  cyclingFireGroupCount = 1;

  /** Current muzzle id due to cycling; runtime-derived. */
  @edit.read
  @type.uint32
  currentCyclingFiresPos = 0;

  /** The module for the firing effect of this turret. */
  @edit.readwrite
  @edit.hidden
  @type.objectRef("EveTurretFiringFX")
  firingEffect = null;

  /** A res path to the redfile containing the primary firing effect. */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  firingEffectResPath = "";

  /** Size of impacts; no impact when 0 or less. */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  impactSize = 0;

  /** What the impacts should hit (an ImpactBehaviour value). */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.ImpactBehaviour")
  impactBehaviour = EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR;

  /** The observer for turret movement sounds; positioned automatically. */
  @edit.readwrite
  @edit.persist
  @type.objectRef("TriObserverLocal")
  turretMovementObserver = null;

  /** Whether mechanical movement sounds play when events are authored. */
  @edit.readwrite
  @edit.persist
  @type.boolean
  playMovementSound = true;

  /** Audio event for mechanical noise when moving from idle to targeting. */
  @edit.readwrite
  @edit.persist
  @type.string
  idleToTargetingMovementAudioEvent = "";

  /** Audio event for mechanical noise when moving from targeting to idle. */
  @edit.readwrite
  @edit.persist
  @type.string
  targetingToIdleMovementAudioEvent = "";

  // Carbon m_target: created in the constructor with fade-on-locator-change
  // enabled (EveChildTurret.cpp:26-27); Blue exposes it READ-only.
  _target = new EveTurretTarget();

  _aiming = new EveTurretAiming();

  // Carbon m_systemBoneID[SYSBONE_MAX], all INVALID until geometry arrives.
  _systemBoneID = new Array(EveTurretAiming.SystemBones.SYSBONE_MAX).fill(INVALID_BONE_INDEX);

  _trackingInfluenceDelta = 0;

  _delayToFadeOutTracking = 0;

  _delayToFadeInTracking = 0;

  // Carbon m_hookedUpdater: the updater our pose modifier is registered on,
  // so a swap unhooks the old one (EveChildTurret.h:115, cpp:722-730).
  _hookedUpdater = null;

  _recheckTimeLeft = -1;

  _firingEffectMuzzlePosSet = false;

  _cachedGeometryRes = null;

  // JS LoadObject completion ownership; not persisted Carbon fields.
  _firingEffectRequest = 0;

  _pendingFiringEffectCalls = null;

  // Carbon reads m_parentData.transform in SetupFiringState (cpp:533) - the
  // PARENT transform, deliberately not this child's world transform; captured
  // from the update params each async pass.
  _parentTranslation = vec3.create();

  /** Enables target fading when the turret's locator changes. */
  constructor()
  {
    super();
    this._target.SetFadeOnLocatorChange(true);
    // Carbon's ctor also calls PrepareResources(); the browser runtime's
    // resource lifecycle is not ported yet and has no per-child prepare hook.
  }

  /** The turret's target tracker (Carbon exposes it as the READ attribute "target"). */
  @carbon.method
  @impl.implemented
  GetTarget()
  {
    return this._target;
  }

  /**
   * The shared sysbone aiming math, synced from this turret's flat tuning
   * fields - the same object shape EveTurretSet.GetAiming returns.
   */
  @impl.adapted
  @impl.reason("Carbon's by-value embed becomes an accessor; the flat Blue schema is preserved on this class.")
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

  /**
   * Passes authored impact data into the target tracker and resolves an
   * authored firing-effect path when no inline effect won at load time
   * (Carbon EveChildTurret.cpp:48-60). Adapted: JS LoadObject completes
   * asynchronously; calls needing the new effect wait for that completion.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this._target.SetImpactBehaviour(this.impactSize, this.impactBehaviour);
    if (!this.firingEffect && this.firingEffectResPath)
    {
      this._LoadFiringEffectFromPath();
    }
    return super.Initialize();
  }

  /**
   * Re-syncs the tracker's impact data and reloads the firing effect when
   * the notifying fields change (Carbon cpp:61-72; the path reload has no
   * inline-effect guard, unlike Initialize). Adapted: JS loads asynchronously;
   * a cleared path cancels only its pending load and keeps the installed effect.
   */
  @carbon.method
  @impl.adapted
  OnModified(value = null)
  {
    if (value === "impactSize" || value === "impactBehaviour")
    {
      this._target.SetImpactBehaviour(this.impactSize, this.impactBehaviour);
    }
    if (value === "firingEffectResPath")
    {
      if (this.firingEffectResPath) this._LoadFiringEffectFromPath();
      else
      {
        ++this._firingEffectRequest;
        const pending = this._pendingFiringEffectCalls;
        this._pendingFiringEffectCalls = null;
        if (pending) for (const call of pending) call();
      }
    }
    return super.OnModified(value);
  }

  /**
   * The typed LoadObject<EveTurretFiringFX> calls in Carbon cpp:56 and :69.
   * Adapted: JS loads asynchronously, so superseded completions are ignored
   * and native forwarding/state calls resume after installation. Failure
   * installs null, as the native typed load does; the prior effect remains
   * registered until its replacement arrives.
   */
  @impl.adapted
  async _LoadFiringEffectFromPath()
  {
    const request = ++this._firingEffectRequest;
    const path = this.firingEffectResPath;
    this._pendingFiringEffectCalls ??= [];
    let object = null;
    try
    {
      object = await blue.resMan.LoadObject(path);
    }
    catch
    {
      // Carbon's typed resource load returns null on failure.
    }
    if (request !== this._firingEffectRequest) return;
    this.SetFiringEffect(CjsSchema.cast(object, EveTurretFiringFX));
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
      if (this.firingEffect) this.firingEffect.Register(registry);
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
      if (this.firingEffect) this.firingEffect.UnRegister(registry);
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
        this._recheckTimeLeft -= deltaT;
        if (this._recheckTimeLeft < 0)
        {
          vec3.set(FIRE_SOURCE_SCRATCH,
            this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
          const closestLocator = this._target.FindClosestLocator(FIRE_SOURCE_SCRATCH, FIRE_POSITION_SCRATCH);
          if (closestLocator >= 0 && closestLocator !== this._target.GetLocator())
          {
            this.SetupFiringState();
          }
          this._recheckTimeLeft = 2;
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
    this._target.Update(deltaT, FIRE_POSITION_SCRATCH);

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

    if (this._trackingInfluenceDelta !== 0)
    {
      this.trackingInfluence += this._trackingInfluenceDelta * deltaT;
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
      this._delayToFadeOutTracking -= deltaT;
      if (this._delayToFadeOutTracking <= 0)
      {
        this._delayToFadeOutTracking = 0;
        this._trackingInfluenceDelta = -1 / TRACKING_FADE_TIME;
      }
    }

    if (this._delayToFadeInTracking > 0)
    {
      this._delayToFadeInTracking -= deltaT;
      if (this._delayToFadeInTracking <= 0)
      {
        this._delayToFadeInTracking = 0;
        this._trackingInfluenceDelta = 1 / TRACKING_FADE_TIME;
      }
    }

    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      vec3.set(this._parentTranslation,
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
        this._firingEffectMuzzlePosSet = true;
      }

      this.firingEffect.SetEndPosition(this._target.GetTargetPosition());

      if (this.firingEffect.UpdateAsynchronous(updateContext))
      {
        if (!this._firingEffectMuzzlePosSet)
        {
          for (let muzzle = 0; muzzle < this.firingEffect.GetPerMuzzleEffectCount(); muzzle++)
          {
            this.firingEffect.SetMuzzleTransform(muzzle, this.worldTransform);
          }
          this._firingEffectMuzzlePosSet = true;
        }
        this.firingEffect.SetDisplayDestObject(this._target.ShowDestObject());
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
    if (geometryRes === this._cachedGeometryRes) return;
    this.ReleaseCachedGeometryData();
    if (geometryRes && geometryRes.IsGood())
    {
      this.BuildCachedGeometryData(geometryRes);
      this._cachedGeometryRes = geometryRes;
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
          this._systemBoneID[bone] = FindJoint(skeletonData, EveTurretAiming.getSystemBoneName(bone));
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
    this._cachedGeometryRes = null;
    this._firingEffectMuzzlePosSet = false;
  }

  /**
   * Go into state deactive: play the pack animation and stay inside the
   * ship (Carbon cpp:343-376; the STATE_FIRING case deliberately falls
   * through to STATE_TARGETING).

   * Adapted: defer this state transition while JS loads the firing effect.
   */
  @carbon.method
  @impl.adapted
  EnterStateDeactive()
  {
    if (this._pendingFiringEffectCalls)
    {
      this._pendingFiringEffectCalls.push(() => this.EnterStateDeactive());
      return;
    }
    const State = EveChildTurret.State;
    switch (this.state)
    {
      case State.STATE_DEACTIVE:
        break;
      case State.STATE_IDLE:
      case State.STATE_RELOADING:
        this.trackingInfluence = 0;
        this.PlayAnimation("Pack", "Inactive");
        this._delayToFadeOutTracking = 0;
        break;
      case State.STATE_FIRING:
        if (this.firingEffect) this.firingEffect.StopFiring();
        // DON'T break, just continue with stopping things:
        // eslint-disable-next-line no-fallthrough
      case State.STATE_TARGETING:
        this._delayToFadeOutTracking = 0.0001;
        this._target.StopFireAtLocator();
        this.PlayAnimation("Pack", "Inactive", TRACKING_FADE_TIME);
        break;
      default:
        break;
    }
    this.state = State.STATE_DEACTIVE;
  }

  /** Go into state idle: face the cannons forward (Carbon cpp:378-418).
   * Adapted: defer this state transition while JS loads the firing effect.
   */
  @carbon.method
  @impl.adapted
  EnterStateIdle()
  {
    if (this._pendingFiringEffectCalls)
    {
      this._pendingFiringEffectCalls.push(() => this.EnterStateIdle());
      return;
    }
    if (!this.isOnline) return;
    const State = EveChildTurret.State;
    switch (this.state)
    {
      case State.STATE_INVALID:
      case State.STATE_RELOADING:
        this.PlayAnimation("", "Active");
        break;
      case State.STATE_DEACTIVE:
        this.PlayAnimation("Deploy", "Active");
        this.trackingInfluence = 0;
        break;
      case State.STATE_IDLE:
        break;
      case State.STATE_TARGETING:
      case State.STATE_FIRING:
        this._delayToFadeOutTracking = 0.0001;
        this._target.StopFireAtLocator();
        if (this.firingEffect) this.firingEffect.StopFiring();
        this.PlayAnimation("", "Active", TRACKING_FADE_TIME);
        if (this.playMovementSound && this.targetingToIdleMovementAudioEvent)
        {
          this._SendMovementAudioEvent(this.targetingToIdleMovementAudioEvent);
        }
        break;
      default:
        break;
    }
    this.state = State.STATE_IDLE;
  }

  /** Go into state targeting: face the cannons toward the enemy (Carbon cpp:420-459).
   * Adapted: defer this state transition while JS loads the firing effect.
   */
  @carbon.method
  @impl.adapted
  EnterStateTargeting()
  {
    if (this._pendingFiringEffectCalls)
    {
      this._pendingFiringEffectCalls.push(() => this.EnterStateTargeting());
      return;
    }
    if (!this.isOnline) return;
    const State = EveChildTurret.State;
    switch (this.state)
    {
      case State.STATE_DEACTIVE:
      {
        const animLength = this.PlayAnimation("Deploy", "Active", TRACKING_FADE_TIME);
        this._delayToFadeInTracking = animLength + 0.0001;
        break;
      }
      case State.STATE_IDLE:
      case State.STATE_RELOADING:
        this._delayToFadeInTracking = 0.0001;
        this.PlayAnimation("", "Active", TRACKING_FADE_TIME);
        break;
      case State.STATE_TARGETING:
        break;
      case State.STATE_FIRING:
        this._target.StopFireAtLocator();
        if (this.firingEffect) this.firingEffect.StopFiring();
        this.PlayAnimation("", "Active", 0);
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

   * Adapted: defer this state transition while JS loads the firing effect.
   */
  @carbon.method
  @impl.adapted
  EnterStateFiring()
  {
    if (this._pendingFiringEffectCalls)
    {
      this._pendingFiringEffectCalls.push(() => this.EnterStateFiring());
      return;
    }
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
      this.firingEffect.SetImpactConfiguration(this._target.GetImpactConfiguration());
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
    const closestLocator = this._target.FindClosestLocator(FIRE_SOURCE_SCRATCH, FIRE_POSITION_SCRATCH);

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
        this._delayToFadeInTracking = 0.0001;
        this.PlayAnimation(this._GetFireAnimationName(), "Active", this.maxTrackingTime);
        this._target.StartFireAtLocator(
          closestLocator, this.maxTrackingTime + effectPeakTime,
          effectTotalTime - effectPeakTime, this._parentTranslation);
        break;
      case State.STATE_FIRING:
      case State.STATE_TARGETING:
        this.PlayAnimation(this._GetFireAnimationName(), "Active", this.maxTrackingTime);
        this._target.StartFireAtLocator(
          closestLocator, this.maxTrackingTime + effectPeakTime,
          effectTotalTime - effectPeakTime, this._parentTranslation);
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
        this.PlayAnimation("Reload", "Active", 0);
        break;
      case State.STATE_TARGETING:
      case State.STATE_FIRING:
        this._delayToFadeOutTracking = 0.0001;
        this._target.StopFireAtLocator();
        if (this.firingEffect) this.firingEffect.StopFiring();
        this.PlayAnimation("Reload", "Active", TRACKING_FADE_TIME);
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
    this._delayToFadeOutTracking = 0;
    this._target.StopFireAtLocator();
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
      this.PlayAnimation("", idleAnimName, 0);
    }
  }

  /** Force into state targeting: tracking pinned to its ceiling, no transition (Carbon cpp:633-643). */
  @carbon.method
  @impl.implemented
  ForceStateTargeting()
  {
    this.trackingInfluence = this.maxTrackingTime;
    this._trackingInfluenceDelta = 0;
    this.state = EveChildTurret.State.STATE_TARGETING;
    this.PlayAnimation("", "Active", 0);
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
   * (Carbon cpp:679-712). Carbon also registers the effect with the quad
   * renderer singleton here; quad registration is not ported yet in the
   * browser runtime and happens through the engine's own registration pass.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2QuadRenderer is an engine singleton in Carbon; the browser engine owns quad registration.")
  InitializeFiringEffect()
  {
    this._firingEffectMuzzlePosSet = false;
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
   * hooked updater on swap (Carbon cpp:714-731). CleanUp performs Carbon's
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

    if (this._hookedUpdater !== this.animationUpdater)
    {
      if (this._hookedUpdater && this._hookedUpdater.GetPoseModifier() === this)
      {
        this._hookedUpdater.SetPoseModifier(null);
      }
      this.animationUpdater.SetPoseModifier(this);
      this._hookedUpdater = this.animationUpdater;
    }
  }

  /**
   * Carbon's destructor obligations: unhook the pose modifier and clean up
   * the firing effect (Carbon cpp:32-47). JS has no destructor; owners call
   * CleanUp when discarding the turret. Pending JS resource completions and
   * their deferred calls are cancelled so disposal cannot resurrect the effect.
   */
  @carbon.method
  @impl.adapted
  CleanUp(context = { currentTime: 0, deltaTime: 0 })
  {
    ++this._firingEffectRequest;
    this._pendingFiringEffectCalls = null;
    if (this._hookedUpdater && this._hookedUpdater.GetPoseModifier() === this)
    {
      this._hookedUpdater.SetPoseModifier(null);
    }
    this._hookedUpdater = null;
    if (this.firingEffect) this.firingEffect.CleanUp(context);
    this.ReleaseCachedGeometryData();
  }

  /**
   * The ITr2PoseModifier hook (Carbon cpp:733-757): poses every found
   * system bone toward the tracked target in turret space. Always passes
   * null for the pitch localTransform - only EveTurretSet uses the
   * behind-the-arm flip.
   */
  @carbon.method
  @impl.implemented
  ModifyPose(_skeleton, pose)
  {
    if (this.trackingInfluence === 0) return;

    const tracking = this._target.GetTrackingPosition();
    if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform))
    {
      mat4.identity(INVERSE_WORLD_SCRATCH);
    }
    vec3.transformMat4(TARGET_OS_SCRATCH, tracking, INVERSE_WORLD_SCRATCH);

    const aiming = this.GetAiming();
    for (let bone = 0; bone < EveTurretAiming.SystemBones.SYSBONE_MAX; bone++)
    {
      // covers INVALID since INVALID_BONE_INDEX exceeds any bone count
      if (this._systemBoneID[bone] < pose.boneTransforms.length)
      {
        const boneTransform = pose.boneTransforms[this._systemBoneID[bone]];
        aiming.ModifySystemBoneTransform(
          bone, TARGET_OS_SCRATCH, null, this.trackingInfluence,
          boneTransform.position, boneTransform.rotation);
      }
    }
  }

  /**
   * A bone's world-of-pose transform lifted into world space - row-vector
   * boneLocal * worldTransform, gl multiply(out, worldTransform, boneWorld)
   * (Carbon cpp:759-772).
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

  /** The mesh's geometry resource, or null (Carbon cpp:774-777). */
  @carbon.method
  @impl.implemented
  GetGeometryRes()
  {
    return this.mesh ? this.mesh.GetGeometryResource() : null;
  }

  /**
   * Stops running animations after the delay, queues the action animation
   * once on the base layer and the idle loop forever after it; returns the
   * action animation's duration (Carbon cpp:779-802).
   */
  @carbon.method
  @impl.implemented
  PlayAnimation(animName, animNameIdle, delay = 0)
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

  /** "Fire", or "Fire0" + cycle digit past the first cycle (Carbon cpp:804-815). */
  _GetFireAnimationName()
  {
    let name = "Fire";
    if (this.currentCyclingFiresPos > 0)
    {
      name += "0";
      name += String(Math.trunc(this.currentCyclingFiresPos / this.cyclingFireGroupCount));
    }
    return name;
  }

  /** The firing effect module (Carbon cpp:817-820). */
  @carbon.method
  @impl.implemented
  GetFiringEffect()
  {
    return this.firingEffect;
  }

  /**
   * Swaps the firing effect, moving its component registration and rewiring
   * its muzzle bones (Carbon cpp:822-835). Adapted: an explicit setter also
   * supersedes pending JS IO and resumes calls deferred by that IO.
   */
  @carbon.method
  @impl.adapted
  SetFiringEffect(firingEffect)
  {
    ++this._firingEffectRequest;
    const pending = this._pendingFiringEffectCalls;
    this._pendingFiringEffectCalls = null;
    const registry = this.GetComponentRegistry();
    if (this.firingEffect) this.firingEffect.UnRegister(registry);
    this.firingEffect = firingEffect ?? null;
    if (this.firingEffect) this.firingEffect.Register(registry);
    this.InitializeFiringEffect();
    if (pending) for (const call of pending) call();
  }

  /**
   * Forwards a controller variable to the firing effect; the child owns no
   * controllers itself (Carbon EveChildTurret.cpp:663-669). Adapted: preserve
   * call order until the asynchronous JS resource load installs the effect.
   */
  @carbon.method
  @impl.adapted
  SetControllerVariable(name, value)
  {
    if (this._pendingFiringEffectCalls)
    {
      this._pendingFiringEffectCalls.push(() => this.SetControllerVariable(name, value));
      return;
    }
    if (this.firingEffect) this.firingEffect.SetControllerVariable(name, value);
  }

  /**
   * Applies resolved SOF faction values to every opaque area material of this
   * turret's mesh - the Trinity half of Carbon
   * EveSOF::SetupChildTurretMaterialFromFaction (EveSOF.cpp:4271-4298).
   *
   * The combined runtime keeps SOF independently importable, so the mesh-area walk
   * of Carbon's EveSOF method sits on the turret that owns the mesh.
   *
   * @param {Function} resolveParameter - parameter name -> vec4 or null
   * @returns {Boolean} false when there is no mesh or no opaque area
   */
  @impl.custom
  ApplySofTurretMaterial(resolveParameter)
  {
    const mesh = this.GetMesh();
    if (!mesh) return false;
    const areas = mesh.GetAreas(TriBatchType.TRIBATCHTYPE_OPAQUE);
    if (!areas) return false;
    for (const area of areas)
    {
      if (!area) continue;
      const effect = area.GetMaterialInterface();
      // Carbon's ApplyFactionToTurretShader returns on a null shader.
      if (effect) EveTurretSet.applyFactionToTurretShader(effect, resolveParameter);
    }
    return true;
  }

  /**
   * Starts the firing effect's controllers (Carbon EveChildTurret.cpp:671-677).
   * Adapted: defer forwarding until an asynchronous JS resource load finishes.
   */
  @carbon.method
  @impl.adapted
  StartControllers()
  {
    if (this._pendingFiringEffectCalls)
    {
      this._pendingFiringEffectCalls.push(() => this.StartControllers());
      return;
    }
    if (this.firingEffect) this.firingEffect.StartControllers();
  }

  /**
   * Attaches to a target object, firing the movement audio when moving off
   * idle or switching targets. Null clears the target, dropping a targeting
   * or firing turret back to idle (Carbon EveChildTurret.cpp:837-864).
   */
  @carbon.method
  @impl.implemented
  SetTargetObject(target)
  {
    if (!target)
    {
      if (this.state === EveChildTurret.State.STATE_TARGETING ||
        this.state === EveChildTurret.State.STATE_FIRING)
      {
        this.EnterStateIdle();
      }
      this._target.SetTargetable(null);
      return;
    }
    const oldTarget = this._target.GetTargetable();
    this._target.SetTargetable(target);

    if (this.playMovementSound && this.idleToTargetingMovementAudioEvent)
    {
      if (this.state === EveChildTurret.State.STATE_IDLE || oldTarget !== this._target.GetTargetable())
      {
        this._SendMovementAudioEvent(this.idleToTargetingMovementAudioEvent);
      }
    }
    this.SetTargetScale();
  }

  /** The tracked targetable, or null (Carbon cpp:866-869). */
  @carbon.method
  @impl.implemented
  GetTargetObject()
  {
    return this._target.GetTargetable();
  }

  /** Scales the firing effect by the target's radius (Carbon cpp:871-878). */
  @carbon.method
  @impl.implemented
  SetTargetScale()
  {
    if (this.firingEffect)
    {
      this.firingEffect.SetScaleByRadius(this._target.GetRadius());
    }
  }

  /** Sends a movement audio event through the observer's emitter (the EveTurretSet seam). */
  _SendMovementAudioEvent(eventName)
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

// EveChildTurret_Blue.cpp: native exposure.
carbon.interfaceTable({ interfaces: [EveChildTurret], chainTo: EveChildMesh })(EveChildTurret, { kind: "class" });
