// Source: trinity/trinity/Eve/Turret/EveTurretFiringFX.h
// Source: trinity/trinity/Eve/Turret/EveTurretFiringFX.cpp
// Source: trinity/trinity/Eve/Turret/EveTurretFiringFX_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { getDeltaTime, getTime, translationMatrix } from "../../renderable/stretch/CjsStretchRuntime.js";
import { ImpactConfiguration } from "../../../generated/include/enums.js";

/** Coordinates a turret set's multi-muzzle firing effects, delays, stretch endpoints, observers, and impact timing. */
@type.define({ className: "EveTurretFiringFX", family: "eve/attachment/turrets" })
export class EveTurretFiringFX extends EveEntity
{

  /** m_startCurveSet (TriCurveSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("TriCurveSet")
  startCurveSet = null;

  /** m_stopCurveSet (TriCurveSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("TriCurveSet")
  stopCurveSet = null;

  /** m_stretch (PIEveFiringEffectElementVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveFiringEffectElement")
  stretch = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_firingPeakTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingPeakTime = 0;

  /** m_perMuzzleData[0].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay1 = 0;

  /** m_perMuzzleData[9].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay10 = 0;

  /** m_perMuzzleData[10].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay11 = 0;

  /** m_perMuzzleData[11].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay12 = 0;

  /** m_perMuzzleData[1].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay2 = 0;

  /** m_perMuzzleData[2].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay3 = 0;

  /** m_perMuzzleData[3].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay4 = 0;

  /** m_perMuzzleData[4].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay5 = 0;

  /** m_perMuzzleData[5].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay6 = 0;

  /** m_perMuzzleData[6].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay7 = 0;

  /** m_perMuzzleData[7].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay8 = 0;

  /** m_perMuzzleData[8].constantDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  firingDelay9 = 0;

  /** m_endPosition (Vector3) [READWRITE] */
  @io.readwrite
  @type.vec3
  endPosition = vec3.create();

  /** m_firingDuration (float) [READ] */
  @io.read
  @type.float32
  firingDuration = 1000;

  /** m_isFiring (bool) [READ] */
  @io.read
  @type.boolean
  isFiring = false;

  /** m_destinationObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("TriObserverLocal")
  destinationObserver = null;

  /** m_sourceObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("TriObserverLocal")
  sourceObserver = null;

  /** m_firingDurationOverride (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  firingDurationOverride = -1;

  /** m_useMuzzleTransform (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useMuzzleTransform = false;

  /** m_isLoopFiring (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isLoopFiring = false;

  /** m_boneName (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  boneName = "Pos_Fire";

  /** m_display (bool) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.boolean
  display = true;

  /** m_scaleEffectTarget (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  scaleEffectTarget = false;

  /** m_minRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minRadius = 30;

  /** m_maxRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxRadius = 3000;

  /** m_minScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minScale = 1;

  #perMuzzleData = [];

  #displaySourceObject = true;

  #displayDestObject = true;

  #impactConfiguration = EveTurretFiringFX.ImpactConfiguration.IMPACT_INVALID;

  /**
   * Allocates the twelve per-muzzle records and resolves the firing duration,
   * preferring a non-negative firingDurationOverride and otherwise the longest
   * stretch-element curve.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#ensureMuzzleData();
    if (this.firingDurationOverride >= 0) this.firingDuration = this.firingDurationOverride;
    else
    {
      const duration = this.GetCurveDuration();
      if (duration > 0) this.firingDuration = duration;
    }
    return true;
  }

  /**
   * Stops firing and runs one asynchronous then one synchronous update so the
   * stretch elements settle into their stopped state before the effect is
   * discarded.
   */
  @carbon.method
  @impl.implemented
  CleanUp(context = { currentTime: 0, deltaTime: 0 })
  {
    this.StopFiring();
    this.UpdateAsynchronous(context);
    this.UpdateSynchronous(context);
  }

  /**
   * Recomputes the firing duration after a property change, taking the override
   * when it is non-negative and the longest element curve otherwise.
   */
  @carbon.method
  @impl.implemented
  OnModified()
  {
    this.firingDuration = this.firingDurationOverride >= 0 ? this.firingDurationOverride : this.GetCurveDuration();
    return true;
  }

  /**
   * Binds a muzzle slot to a parent bone id; a muzzle id outside the
   * twelve-muzzle range is ignored rather than reported.
   */
  @carbon.method
  @impl.implemented
  SetMuzzleBoneID(muzzleID, boneID)
  {
    this.#ensureMuzzleData();
    if (muzzleID >= 0 && muzzleID < EveTurretFiringFX.MUZZLE_COUNT_MAX) this.#perMuzzleData[muzzleID].muzzlePositionBoneID = Number(boneID) >>> 0;
  }

  /**
   * Copies a world muzzle transform into a muzzle slot; a muzzle id outside the
   * twelve-muzzle range is ignored rather than reported.
   */
  @carbon.method
  @impl.implemented
  SetMuzzleTransform(muzzleID, transform)
  {
    this.#ensureMuzzleData();
    if (muzzleID >= 0 && muzzleID < EveTurretFiringFX.MUZZLE_COUNT_MAX) mat4.copy(this.#perMuzzleData[muzzleID].muzzleTransform, transform);
  }

  /**
   * Reads a muzzle slot's world transform, falling back to identity for a slot that was never populated.
   * @param {number} muzzleID Muzzle slot to read.
   * @param {mat4} [out] Caller-owned matrix to fill; a fresh one is allocated when omitted.
   * @returns {mat4} out.
   */
  @carbon.method
  @impl.implemented
  GetMuzzleTransform(muzzleID, out = mat4.create())
  {
    this.#ensureMuzzleData();
    return mat4.copy(out, this.#perMuzzleData[muzzleID]?.muzzleTransform ?? EveTurretFiringFX.#identity);
  }

  /**
   * Sets the world point every stretch element extends towards, which is the
   * impact end of the shot.
   */
  @carbon.method
  @impl.implemented
  SetEndPosition(value)
  {
    vec3.copy(this.endPosition, value);
  }

  /**
   * Scales each stretch element's destination object between minScale and
   * maxScale by where the target radius falls in the minRadius..maxRadius band,
   * and hands the raw radius to the destination observer as an audio attenuation
   * factor; does nothing unless scaleEffectTarget is authored.
   */
  @carbon.method
  @impl.implemented
  SetScaleByRadius(radius)
  {
    if (!this.scaleEffectTarget) return;
    const span = this.maxRadius - this.minRadius;
    const amount = span ? (Number(radius) - this.minRadius) / span : 0;
    const scale = Math.max(this.minScale, Math.min(this.maxScale, this.minScale + amount * (this.maxScale - this.minScale)));
    for (const stretch of this.stretch)
    {
      if (!stretch) continue;
      stretch.SetDestObjectScale(scale);
    }
    this.destinationObserver?.GetObserver?.()?.SetAttenuationScalingFactor?.(Number(radius));
  }

  /**
   * Restarts a looping burst by telling every stretch element to move again,
   * without resetting the per-muzzle delays that PrepareFiring establishes.
   */
  @carbon.method
  @impl.implemented
  PrepareFiringEffectMoveObjects()
  {
    for (const stretch of this.stretch)
    {
      if (!stretch) continue;
      stretch.StartMoving();
    }
    this.isFiring = true;
  }

  /**
   * Arms the muzzles for a burst: selected muzzles start after delay plus their authored constant delay, every other muzzle is pushed out of reach with a maximal delay.
   * @param {number} delay Common start delay added to each muzzle's authored constant delay.
   * @param {number} [muzzleID] First muzzle of the firing group; INVALID_INDEX arms every muzzle.
   * @param {number} [muzzleCount] Number of consecutive muzzles in the group.
   */
  @carbon.method
  @impl.implemented
  PrepareFiring(delay, muzzleID = EveTurretFiringFX.INVALID_INDEX, muzzleCount = EveTurretFiringFX.INVALID_INDEX)
  {
    this.#ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const selected = muzzleID === EveTurretFiringFX.INVALID_INDEX || (index >= muzzleID && index < muzzleID + muzzleCount);
      const data = this.#perMuzzleData[index];
      data.currentStartDelay = selected ? Number(delay) + data.constantDelay : Number.MAX_VALUE;
      data.started = false;
      data.readyToStart = false;
      data.elapsedTime = 0;
    }
    this.isFiring = true;
  }

  /**
   * The longest curve duration across the stretch elements, which is what the
   * firing duration falls back to when no override is authored.
   */
  @carbon.method
  @impl.implemented
  GetCurveDuration()
  {
    let duration = 0;
    for (const stretch of this.stretch)
    {
      if (!stretch) continue;
      duration = Math.max(duration, Number(stretch.GetCurveDuration()));
    }
    return duration;
  }

  /**
   * Averages the translation of every started muzzle transform, which is the point the shot is heard and seen to leave from.
   * @param {vec3} [out] Caller-owned vector filled with the averaged position.
   * @returns {boolean} False when the effect is not firing or no muzzle has started, in which case out is left untouched.
   */
  @carbon.method
  @impl.implemented
  GetStartPosition(out = vec3.create())
  {
    if (!this.isFiring) return false;
    this.#ensureMuzzleData();
    vec3.zero(EveTurretFiringFX.#startPosition);
    let count = 0;
    for (const data of this.#perMuzzleData.slice(0, this.stretch.length))
    {
      if (!data.started) continue;
      EveTurretFiringFX.#startPosition[0] += data.muzzleTransform[12];
      EveTurretFiringFX.#startPosition[1] += data.muzzleTransform[13];
      EveTurretFiringFX.#startPosition[2] += data.muzzleTransform[14];
      count++;
    }
    if (!count) return false;
    vec3.scale(out, EveTurretFiringFX.#startPosition, 1 / count);
    return true;
  }

  /**
   * The firing duration in force: the override when non-negative, otherwise the
   * duration resolved at Initialize.
   */
  @carbon.method
  @impl.implemented
  GetFiringDuration()
  {
    return this.firingDurationOverride >= 0 ? this.firingDurationOverride : this.firingDuration;
  }

  /**
   * The authored offset into the burst at which the shot is considered to land,
   * used to time the target's impact.
   */
  @carbon.method
  @impl.implemented
  GetFiringPeakTime()
  {
    return this.firingPeakTime;
  }

  /**
   * The name of the bone muzzle locators are resolved under, Pos_Fire unless
   * authored otherwise.
   */
  @carbon.method
  @impl.implemented
  GetFiringBoneName()
  {
    return this.boneName;
  }

  /**
   * Starts one muzzle: its stretch element begins firing, the start curve set
   * plays backdated by the muzzle's remaining delay and the stop curve set is
   * halted; returns false when the muzzle has no record or no element.
   */
  @carbon.method
  @impl.implemented
  StartMuzzleEffect(muzzleID)
  {
    this.#ensureMuzzleData();
    const data = this.#perMuzzleData[muzzleID];
    if (!data || !this.stretch[muzzleID]) return false;
    this.stretch[muzzleID].StartFiring(data.currentStartDelay);
    this.startCurveSet?.PlayFrom?.(-data.currentStartDelay);
    this.stopCurveSet?.Stop?.();
    data.started = true;
    data.readyToStart = false;
    return true;
  }

  /**
   * Stops every stretch element, clears all per-muzzle timers, halts the start
   * curve set and plays the stop curve set; does nothing when the effect is not
   * firing.
   */
  @carbon.method
  @impl.implemented
  StopFiring()
  {
    if (!this.isFiring) return;
    this.#ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const stretch = this.stretch[index];
      if (stretch) stretch.StopFiring();
      Object.assign(this.#perMuzzleData[index], { started: false, readyToStart: false, currentStartDelay: 0, elapsedTime: 0 });
    }
    this.startCurveSet?.Stop?.();
    this.stopCurveSet?.Play?.();
    this.isFiring = false;
  }

  /**
   * Whether any muzzle has run its delay down but not yet started, and is still
   * inside the firing duration or belongs to a looping effect.
   */
  @carbon.method
  @impl.implemented
  ReadyToFire()
  {
    this.#ensureMuzzleData();
    return this.#perMuzzleData.slice(0, this.stretch.length).some(data =>
      (data.elapsedTime < this.firingDuration || this.isLoopFiring) && !data.started && data.readyToStart);
  }

  /**
   * Advances each muzzle's delay and elapsed time, starts the muzzles whose
   * delay expired, pushes the muzzle and end transforms into their stretch
   * elements, then updates the active curve set and both observers; returns
   * whether a muzzle started firing on this call.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's task update is serial in the browser; firing elements retain their explicit async phase.")
  UpdateAsynchronous(context)
  {
    this.#ensureMuzzleData();
    const deltaTime = getDeltaTime(context);
    let justFired = false;
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this.#perMuzzleData[index];
      const stretch = this.stretch[index];
      if (!stretch) continue;
      if (data.started) data.elapsedTime += deltaTime;
      if (!(data.elapsedTime < this.firingDuration || this.isLoopFiring)) continue;
      if (this.isFiring)
      {
        if (!data.started)
        {
          if (data.readyToStart)
          {
            this.StartMuzzleEffect(index);
            data.currentStartDelay = 0;
            data.elapsedTime = 0;
            justFired = true;
          }
          else data.currentStartDelay -= deltaTime;
          if (data.currentStartDelay <= 0) data.readyToStart = true;
        }
        if (data.started)
        {
          const source = this.useMuzzleTransform && data.muzzlePositionBoneID !== EveTurretFiringFX.INVALID_INDEX
            ? data.muzzleTransform
            : data.muzzleTransform.subarray(12, 15);
          stretch.SetFiringTransform(source, this.endPosition);
          stretch.DisplayEndPoints(this.#displaySourceObject, this.#displayDestObject);
        }
        stretch.UpdateEffectAsync(context);
      }
    }
    const curveSet = this.isFiring ? this.startCurveSet : this.stopCurveSet;
    const time = getTime(context);
    if (curveSet) curveSet.Update(time, time, context.renderContext);
    this.sourceObserver?.Update?.(this.#perMuzzleData[0]?.muzzleTransform ?? EveTurretFiringFX.#identity);
    this.destinationObserver?.Update?.(translationMatrix(this.endPosition, EveTurretFiringFX.#destinationTransform));
    return justFired;
  }

  /**
   * Runs the synchronous element update for every muzzle still inside the firing
   * duration, or for all of them when the effect loops.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's task update is serial in the browser; firing elements retain their explicit sync phase.")
  UpdateSynchronous(context)
  {
    this.#ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this.#perMuzzleData[index];
      const stretch = this.stretch[index];
      if (stretch && (data.elapsedTime < this.firingDuration || this.isLoopFiring)) stretch.UpdateEffectSync(context);
    }
    return true;
  }

  /**
   * Runs the asynchronous then synchronous phase in order and reports whether a
   * muzzle started firing.
   */
  @carbon.method
  @impl.implemented
  Update(context)
  {
    const fired = this.UpdateAsynchronous(context);
    this.UpdateSynchronous(context);
    return fired;
  }

  /**
   * Updates visibility on every started element and, when several bone-free
   * muzzles fire at once, merges them by shifting the whole set's intensity onto
   * the first element as the muzzle cluster shrinks below the frustum's LOD
   * angle; gated on display and isFiring.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Visibility is forwarded to graph elements; small-angle muzzle merging uses portable frustum fields when present.")
  UpdateVisibility(context)
  {
    if (!(this.display && this.isFiring)) return;
    this.#ensureMuzzleData();
    const active = [];
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this.#perMuzzleData[index];
      const stretch = this.stretch[index];
      if (stretch && data.started && (data.elapsedTime <= this.firingDuration || this.isLoopFiring))
      {
        stretch.UpdateVisibility(context, EveTurretFiringFX.#identity);
        active.push(index);
      }
    }
    if (active.length <= 1 || active.some(index => this.#perMuzzleData[index].muzzlePositionBoneID !== EveTurretFiringFX.INVALID_INDEX)) return;
    vec3.zero(EveTurretFiringFX.#center);
    for (const index of active) vec3.add(EveTurretFiringFX.#center, EveTurretFiringFX.#center, this.#perMuzzleData[index].muzzleTransform.subarray(12, 15));
    vec3.scale(EveTurretFiringFX.#center, EveTurretFiringFX.#center, 1 / active.length);
    let radius = 0;
    for (const index of active) radius = Math.max(radius, vec3.distance(EveTurretFiringFX.#center, this.#perMuzzleData[index].muzzleTransform.subarray(12, 15)));
    const frustum = context?.frustum ?? context?.GetFrustum?.();
    const viewPosition = frustum?.viewPosition ?? frustum?.viewPos;
    if (!viewPosition) return;
    const angle = Math.atan(radius * 2 / (vec3.distance(viewPosition, EveTurretFiringFX.#center) + 1));
    const lodAngle = Number(frustum.fov ?? 1) * 0.002;
    const merge = angle <= lodAngle ? 0 : Math.min((angle - lodAngle) / lodAngle, 1);
    active.forEach((index, order) => this.stretch[index].SetIntensity(order ? merge : active.length + (1 - active.length) * merge));
  }

  /**
   * Appends the renderables of every started element still inside the firing
   * duration to out; gated on display and isFiring.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Renderable collection is backend-neutral; draw realization remains runtime-engine work.")
  GetRenderables(out = [])
  {
    if (!(this.display && this.isFiring)) return out;
    this.#ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this.#perMuzzleData[index];
      const stretch = this.stretch[index];
      if (stretch && data.started && (data.elapsedTime <= this.firingDuration || this.isLoopFiring)) stretch.GetRenderables(out);
    }
    return out;
  }

  /** m_maxScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxScale = 10;

  /**
   * The number of muzzles the effect drives, which is the number of authored
   * stretch elements rather than the twelve-muzzle maximum.
   */
  @carbon.method
  @impl.implemented
  GetPerMuzzleEffectCount()
  {
    return this.stretch.length;
  }

  /**
   * The parent bone id bound to a muzzle slot, or INVALID_INDEX when the muzzle
   * rides a supplied transform instead of a bone.
   */
  @carbon.method
  @impl.implemented
  GetPerMuzzleBoneID(muzzleID)
  {
    this.#ensureMuzzleData();
    return this.#perMuzzleData[muzzleID]?.muzzlePositionBoneID ?? EveTurretFiringFX.INVALID_INDEX;
  }

  /**
   * Whether the burst repeats instead of ending when the firing duration
   * elapses.
   */
  @carbon.method
  @impl.implemented
  IsLooping()
  {
    return this.isLoopFiring;
  }

  /**
   * Sets whether the stretch elements draw their destination end, which is the
   * impact on the target.
   */
  @carbon.method
  @impl.implemented
  SetDisplayDestObject(display)
  {
    this.#displayDestObject = !!display;
  }

  /** Whether the stretch elements draw their destination end. */
  @carbon.method
  @impl.implemented
  GetDisplayDestObject()
  {
    return this.#displayDestObject;
  }

  /**
   * Sets whether the stretch elements draw their source end, which is the muzzle
   * flash.
   */
  @carbon.method
  @impl.implemented
  SetDisplaySourceObject(display)
  {
    this.#displaySourceObject = !!display;
  }

  /** Whether the stretch elements draw their source end. */
  @carbon.method
  @impl.implemented
  GetDisplaySourceObject()
  {
    return this.#displaySourceObject;
  }

  /** Forwards a named controller variable to every stretch element. */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller ownership is represented by direct firing-element method forwarding.")
  SetControllerVariable(name, value)
  {
    for (const stretch of this.stretch) stretch?.SetControllerVariable?.(name, value);
  }

  /** Forwards a named controller event to every stretch element. */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller ownership is represented by direct firing-element method forwarding.")
  HandleControllerEvent(name)
  {
    for (const stretch of this.stretch) stretch?.HandleControllerEvent?.(name);
  }

  /** Starts the controllers on every stretch element. */
  @carbon.method
  @impl.adapted
  @impl.reason("Controller ownership is represented by direct firing-element method forwarding.")
  StartControllers()
  {
    for (const stretch of this.stretch) stretch?.StartControllers?.();
  }

  /** Carbon EveTurretFiringFX::RegisterComponents (cpp:739-752): forwards the
   * stretch elements. Gate m_display && m_isFiring. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display && this.isFiring)
    {
      for (const element of this.stretch)
      {
        element?.Register?.(registry);
      }
    }
  }

  /** Carbon EveTurretFiringFX::UnRegisterComponents (cpp:755-768): forwards
   * the stretch elements; no display/isFiring re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const element of this.stretch)
      {
        element?.UnRegister?.(registry);
      }
    }
  }

  /**
   * Records which surface the shot lands on and, only when it changes, sends the
   * matching Impact_On switch value to the destination observer's audio emitter;
   * anything other than armor or hull is sent as Shield, including
   * IMPACT_INVALID.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Audio emitters are duck-typed; Carbon impact switch values are forwarded without native interfaces.")
  SetImpactConfiguration(configuration)
  {
    if (configuration !== this.#impactConfiguration)
    {
      const emitter = this.destinationObserver?.GetObserver?.();
      const value = configuration === EveTurretFiringFX.ImpactConfiguration.IMPACT_ARMOR
        ? "Armor"
        : configuration === EveTurretFiringFX.ImpactConfiguration.IMPACT_HULL ? "Hull" : "Shield";
      emitter?.SetSwitch?.("Impact_On", value);
    }
    this.#impactConfiguration = configuration;
  }

  /**
   * Grows the per-muzzle record list to the twelve-muzzle maximum on first use
   * and refreshes every record's constant delay from the authored
   * firingDelay1..firingDelay12 fields, so an edited delay takes effect without
   * a rebuild.
   */
  #ensureMuzzleData()
  {
    while (this.#perMuzzleData.length < EveTurretFiringFX.MUZZLE_COUNT_MAX)
    {
      const index = this.#perMuzzleData.length;
      this.#perMuzzleData.push({
        started: false,
        readyToStart: false,
        muzzlePositionBoneID: EveTurretFiringFX.INVALID_INDEX,
        muzzleTransform: mat4.create(),
        currentStartDelay: 0,
        constantDelay: Number(this[`firingDelay${index + 1}`] ?? 0),
        elapsedTime: 0
      });
    }
    for (let index = 0; index < EveTurretFiringFX.MUZZLE_COUNT_MAX; index++)
    {
      this.#perMuzzleData[index].constantDelay = Number(this[`firingDelay${index + 1}`] ?? 0);
    }
  }

  static MaxMuzzleCount = Object.freeze({
    MUZZLECOUNT_MAX: 12,
  });

  static MUZZLE_COUNT_MAX = EveTurretFiringFX.MaxMuzzleCount.MUZZLECOUNT_MAX;

  static INVALID_INDEX = 0xffffffff;

  static ImpactConfiguration = ImpactConfiguration;

  static #identity = mat4.create();

  static #destinationTransform = mat4.create();
  static #startPosition = vec3.create();

  static #center = vec3.create();

}
