// Source: trinity/trinity/Eve/Turret/EveTurretFiringFX.h
// Source: trinity/trinity/Eve/Turret/EveTurretFiringFX.cpp
// Source: trinity/trinity/Eve/Turret/EveTurretFiringFX_Blue.cpp
import { CjsSchema, meta, types } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { translationMatrix } from "../../renderable/stretch/CjsStretchRuntime.js";
import { ImpactConfiguration } from "../../../generated/include/enums.js";
import { ITr2ControllerOwner } from "../../../controllers/ITr2ControllerOwner.js";
import { mappedInterfaces } from "../../../../global/compose/interface.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { INotify } from "../../../../global/blue/INotify.js";
import { IListNotify } from "../../../../global/blue/IListNotify.js";
import { blue } from "../../../../global/blue/blue.js";
import { BLUELISTEVENT } from "#consts/blue";
import { EveUpdateContext } from "../../EveUpdateContext.js";

/** Coordinates a turret set's multi-muzzle firing effects, delays, stretch endpoints, observers, and impact timing. */
@meta.define({ className: "EveTurretFiringFX", family: "eve/attachment/turrets" })
@meta.carbon.inherit(IInitialize, INotify, IListNotify, ITr2ControllerOwner)
@meta.carbon.mapInterface(IInitialize, INotify, IListNotify, ITr2ControllerOwner, EveEntity)
export class EveTurretFiringFX extends EveEntity
{

  /** m_startCurveSet (TriCurveSetPtr) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("TriCurveSet")
  startCurveSet = null;

  /** m_stopCurveSet (TriCurveSetPtr) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("TriCurveSet")
  stopCurveSet = null;

  /** m_stretch (PIEveFiringEffectElementVector) [READ, PERSIST] */
  @meta.edit.read
  @meta.edit.persist
  @types.list("IEveFiringEffectElement")
  stretch = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** m_firingPeakTime (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingPeakTime = 0;

  /** m_perMuzzleData[0].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay1 = 0;

  /** m_perMuzzleData[9].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay10 = 0;

  /** m_perMuzzleData[10].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay11 = 0;

  /** m_perMuzzleData[11].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay12 = 0;

  /** m_perMuzzleData[1].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay2 = 0;

  /** m_perMuzzleData[2].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay3 = 0;

  /** m_perMuzzleData[3].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay4 = 0;

  /** m_perMuzzleData[4].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay5 = 0;

  /** m_perMuzzleData[5].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay6 = 0;

  /** m_perMuzzleData[6].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay7 = 0;

  /** m_perMuzzleData[7].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay8 = 0;

  /** m_perMuzzleData[8].constantDelay (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDelay9 = 0;

  /** m_endPosition (Vector3) [READWRITE] */
  @meta.edit.readwrite
  @types.vec3
  endPosition = vec3.create();

  /** m_firingDuration (float) [READ] */
  @meta.edit.read
  @types.float32
  firingDuration = 1000;

  /** m_isFiring (bool) [READ] */
  @meta.edit.read
  @types.boolean
  isFiring = false;

  /** m_destinationObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("TriObserverLocal")
  destinationObserver = null;

  /** m_sourceObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("TriObserverLocal")
  sourceObserver = null;

  /** m_firingDurationOverride (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  firingDurationOverride = -1;

  /** m_useMuzzleTransform (bool) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  useMuzzleTransform = false;

  /** m_isLoopFiring (bool) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  isLoopFiring = false;

  /** m_boneName (BlueSharedString) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  boneName = "Pos_Fire";

  /** m_display (bool) [READWRITE, NOTIFY] */
  @meta.edit.notify
  @meta.edit.readwrite
  @types.boolean
  display = true;

  /** m_scaleEffectTarget (bool) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  scaleEffectTarget = false;

  /** m_minRadius (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  minRadius = 30;

  /** m_maxRadius (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  maxRadius = 3000;

  /** m_minScale (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  minScale = 1;

  _perMuzzleData = [];

  _displaySourceObject = true;

  _displayDestObject = true;

  _impactConfiguration = EveTurretFiringFX.ImpactConfiguration.IMPACT_INVALID;

  /**
   * Allocates the twelve per-muzzle records and resolves the firing duration,
   * preferring a non-negative firingDurationOverride and otherwise the longest
   * stretch-element curve.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Initialize()
  {
    this._ensureMuzzleData();
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
   * discarded. JS stamps the fresh context with the unchanged Blue ticks and
   * restores the native time-taking constructor's LOD defaults.
   */
  @meta.carbon.method
  @meta.impl.adapted
  CleanUp()
  {
    this.StopFiring();
    const context = new EveUpdateContext();
    context.SetTime(blue.os.GetCurrentFrameTime());
    context.SetLodFactor(1);
    this.UpdateAsynchronous(context);
    this.UpdateSynchronous(context);
  }

  /**
   * Recomputes the firing duration after a property change, taking the override
   * when it is non-negative and the longest element curve otherwise.
   * JS identifies the changed native member by its exposed name.
   */
  @meta.carbon.method
  @meta.impl.implemented
  OnModified(propertyName)
  {
    if (propertyName === "firingDurationOverride")
    {
      this.firingDuration = this.firingDurationOverride >= 0 ? this.firingDurationOverride : this.GetCurveDuration();
    }
    if (propertyName === "display") this.ReRegister();
    return true;
  }

  /**
   * Registers inserted or removed firing elements after a live stretch-list mutation.
   * Loading events are ignored; the list owner dispatches notifications after mutation.
   * @param {number} event Native BLUELISTEVENT flags.
   * @param {number} _key Changed index.
   * @param {number} _key2 Secondary index.
   * @param {object|null} value Changed element.
   * @param {Array|null} list Changed list.
   */
  @meta.carbon.method
  @meta.impl.adapted
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (!this.isFiring || list !== this.stretch || (event & BLUELISTEVENT.BELIST_LOADING)) return;
    if (!value || !mappedInterfaces(value.constructor).has(EveEntity)) return;
    const registry = this.GetComponentRegistry();
    if (!registry) return;
    const operation = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if (operation === BLUELISTEVENT.BELIST_INSERTED && this.display) value.Register(registry);
    else if (operation === BLUELISTEVENT.BELIST_REMOVED) value.UnRegister(registry);
  }

  /**
   * Binds a muzzle slot to a parent bone id; a muzzle id outside the
   * twelve-muzzle range is ignored rather than reported.
   */
  @meta.carbon.method
  @meta.impl.implemented
  SetMuzzleBoneID(muzzleID, boneID)
  {
    this._ensureMuzzleData();
    if (muzzleID >= 0 && muzzleID < EveTurretFiringFX.MUZZLE_COUNT_MAX) this._perMuzzleData[muzzleID].muzzlePositionBoneID = Number(boneID) >>> 0;
  }

  /**
   * Copies a world muzzle transform into a muzzle slot; a muzzle id outside the
   * twelve-muzzle range is ignored rather than reported.
   */
  @meta.carbon.method
  @meta.impl.implemented
  SetMuzzleTransform(muzzleID, transform)
  {
    this._ensureMuzzleData();
    if (muzzleID >= 0 && muzzleID < EveTurretFiringFX.MUZZLE_COUNT_MAX) mat4.copy(this._perMuzzleData[muzzleID].muzzleTransform, transform);
  }

  /**
   * Reads a muzzle slot's world transform, falling back to identity for a slot that was never populated.
   * @param {number} muzzleID Muzzle slot to read.
   * @param {mat4} [out] Caller-owned matrix to fill; a fresh one is allocated when omitted.
   * @returns {mat4} out.
   */
  @meta.impl.custom
  GetMuzzleTransform(muzzleID, out = mat4.create())
  {
    this._ensureMuzzleData();
    return mat4.copy(out, this._perMuzzleData[muzzleID]?.muzzleTransform ?? EveTurretFiringFX._identity);
  }

  /**
   * Sets the world point every stretch element extends towards, which is the
   * impact end of the shot.
   */
  @meta.carbon.method
  @meta.impl.implemented
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
  @meta.carbon.method
  @meta.impl.implemented
  SetScaleByRadius(radius)
  {
    if (!this.scaleEffectTarget) return;
    const scale = Math.max(this.minScale, Math.min(this.maxScale,
      (radius - this.minRadius) * (this.maxScale - this.minScale) / (this.maxRadius - this.minRadius) + this.minScale));
    for (const stretch of this.stretch)
    {
      if (!stretch) continue;
      stretch.SetDestObjectScale(scale);
    }
    if (this.destinationObserver)
    {
      const emitter = this.destinationObserver.GetObserver();
      const contract = CjsSchema.GetConstructor("ITr2AudEmitter");
      if (emitter && contract && mappedInterfaces(emitter.constructor).has(contract))
      {
        emitter.SetAttenuationScalingFactor(radius);
      }
    }
  }

  /**
   * Restarts a looping burst by telling every stretch element to move again,
   * without resetting the per-muzzle delays that PrepareFiring establishes.
   */
  @meta.carbon.method
  @meta.impl.implemented
  PrepareFiringEffectMoveObjects()
  {
    for (const stretch of this.stretch)
    {
      if (!stretch) continue;
      stretch.StartMoving();
    }
    if (!this.isFiring)
    {
      this.isFiring = true;
      this.ReRegister();
    }
  }

  /**
   * Arms the muzzles for a burst: selected muzzles start after delay plus their authored constant delay, every other muzzle is pushed out of reach with a maximal delay.
   * @param {number} delay Common start delay added to each muzzle's authored constant delay.
   * @param {number} [muzzleID] First muzzle of the firing group; INVALID_INDEX arms every muzzle.
   * @param {number} [muzzleCount] Number of consecutive muzzles in the group.
   */
  @meta.carbon.method
  @meta.impl.implemented
  PrepareFiring(delay, muzzleID = EveTurretFiringFX.INVALID_INDEX, muzzleCount = EveTurretFiringFX.INVALID_INDEX)
  {
    this._ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const selected = muzzleID === EveTurretFiringFX.INVALID_INDEX || (index >= muzzleID && index < muzzleID + muzzleCount);
      const data = this._perMuzzleData[index];
      data.currentStartDelay = selected ? Number(delay) + data.constantDelay : Number.MAX_VALUE;
      data.started = false;
      data.readyToStart = false;
      data.elapsedTime = 0;
    }
    if (!this.isFiring)
    {
      this.isFiring = true;
      this.ReRegister();
    }
  }

  /**
   * The longest curve duration across the stretch elements, which is what the
   * firing duration falls back to when no override is authored.
   */
  @meta.carbon.method
  @meta.impl.implemented
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
  @meta.carbon.method
  @meta.impl.implemented
  GetStartPosition(out = vec3.create())
  {
    if (!this.isFiring) return false;
    this._ensureMuzzleData();
    vec3.zero(EveTurretFiringFX._startPosition);
    let count = 0;
    for (const data of this._perMuzzleData.slice(0, this.stretch.length))
    {
      if (!data.started) continue;
      EveTurretFiringFX._startPosition[0] += data.muzzleTransform[12];
      EveTurretFiringFX._startPosition[1] += data.muzzleTransform[13];
      EveTurretFiringFX._startPosition[2] += data.muzzleTransform[14];
      count++;
    }
    if (!count) return false;
    vec3.scale(out, EveTurretFiringFX._startPosition, 1 / count);
    return true;
  }

  /**
   * The firing duration in force: the override when non-negative, otherwise the
   * duration resolved at Initialize.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetFiringDuration()
  {
    return this.firingDurationOverride >= 0 ? this.firingDurationOverride : this.firingDuration;
  }

  /**
   * The authored offset into the burst at which the shot is considered to land,
   * used to time the target's impact.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetFiringPeakTime()
  {
    return this.firingPeakTime;
  }

  /**
   * The name of the bone muzzle locators are resolved under, Pos_Fire unless
   * authored otherwise.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetFiringBoneName()
  {
    return this.boneName;
  }

  /**
   * Starts one muzzle: its stretch element begins firing, the start curve set
   * plays backdated by the muzzle's remaining delay and the stop curve set is
   * halted; returns false when the muzzle has no record or no element.
   */
  @meta.carbon.method
  @meta.impl.implemented
  StartMuzzleEffect(muzzleID)
  {
    this._ensureMuzzleData();
    const data = this._perMuzzleData[muzzleID];
    if (!data || !this.stretch[muzzleID]) return false;
    this.stretch[muzzleID].StartFiring(data.currentStartDelay);
    if (this.startCurveSet) this.startCurveSet.PlayFrom(-data.currentStartDelay);
    if (this.stopCurveSet) this.stopCurveSet.Stop();
    data.started = true;
    data.readyToStart = false;
    return true;
  }

  /**
   * Stops every stretch element, clears all per-muzzle timers, halts the start
   * curve set and plays the stop curve set; does nothing when the effect is not
   * firing.
   */
  @meta.carbon.method
  @meta.impl.implemented
  StopFiring()
  {
    if (!this.isFiring) return;
    this._ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const stretch = this.stretch[index];
      if (stretch) stretch.StopFiring();
      Object.assign(this._perMuzzleData[index], { started: false, readyToStart: false, currentStartDelay: 0, elapsedTime: 0 });
    }
    if (this.startCurveSet) this.startCurveSet.Stop();
    if (this.stopCurveSet) this.stopCurveSet.Play();
    this.isFiring = false;
    this.ReRegister();
  }

  /**
   * Whether any muzzle has run its delay down but not yet started, and is still
   * inside the firing duration or belongs to a looping effect.
   */
  @meta.carbon.method
  @meta.impl.implemented
  ReadyToFire()
  {
    this._ensureMuzzleData();
    return this._perMuzzleData.slice(0, this.stretch.length).some(data =>
      (data.elapsedTime < this.firingDuration || this.isLoopFiring) && !data.started && data.readyToStart);
  }

  /**
   * Advances each muzzle's delay and elapsed time, starts the muzzles whose
   * delay expired, pushes the muzzle and end transforms into their stretch
   * elements, then updates the active curve set and both observers; returns
   * whether a muzzle started firing on this call. JS executes the task phase serially.
   */
  @meta.carbon.method
  @meta.impl.adapted
  UpdateAsynchronous(context)
  {
    this._ensureMuzzleData();
    const deltaTime = context.GetDeltaT();
    let justFired = false;
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this._perMuzzleData[index];
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
          stretch.DisplayEndPoints(this._displaySourceObject, this._displayDestObject);
        }
        stretch.UpdateEffectAsync(context);
      }
    }
    const curveSet = this.isFiring ? this.startCurveSet : this.stopCurveSet;
    const time = context.GetTime();
    if (curveSet) curveSet.Update(time, time, context.renderContext);
    if (this.sourceObserver) this.sourceObserver.Update(this._perMuzzleData[0].muzzleTransform);
    if (this.destinationObserver) this.destinationObserver.Update(translationMatrix(this.endPosition, EveTurretFiringFX._destinationTransform));
    return justFired;
  }

  /**
   * Runs the synchronous element update for every muzzle still inside the firing
   * duration, or for all of them when the effect loops. JS executes the task phase serially.
   */
  @meta.carbon.method
  @meta.impl.adapted
  UpdateSynchronous(context)
  {
    this._ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this._perMuzzleData[index];
      const stretch = this.stretch[index];
      if (stretch && (data.elapsedTime < this.firingDuration || this.isLoopFiring)) stretch.UpdateEffectSync(context);
    }
    return true;
  }

  /**
   * Runs the asynchronous then synchronous phase in order and reports whether a
   * muzzle started firing.
   */
  @meta.impl.custom
  Update(context)
  {
    const fired = this.UpdateAsynchronous(context);
    this.UpdateSynchronous(context);
    return fired;
  }

  /**
   * Updates visibility on every started element and, when several muzzles fire
   * without using a valid bone transform, merges them by shifting the set's intensity onto
   * the first element as the muzzle cluster shrinks below the frustum's LOD
   * angle; gated on display and isFiring.
   */
  @meta.carbon.method
  @meta.impl.implemented
  UpdateVisibility(context)
  {
    if (!(this.display && this.isFiring)) return;
    this._ensureMuzzleData();
    const active = [];
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this._perMuzzleData[index];
      const stretch = this.stretch[index];
      if (stretch && data.started && (data.elapsedTime <= this.firingDuration || this.isLoopFiring))
      {
        stretch.UpdateVisibility(context, EveTurretFiringFX._identity);
      }
      if (stretch && data.started && (data.elapsedTime < this.firingDuration || this.isLoopFiring))
      {
        active.push(index);
      }
    }
    if (active.length <= 1 || (this.useMuzzleTransform && active.some(index => this._perMuzzleData[index].muzzlePositionBoneID !== EveTurretFiringFX.INVALID_INDEX))) return;
    vec3.zero(EveTurretFiringFX._center);
    for (const index of active) vec3.add(EveTurretFiringFX._center, EveTurretFiringFX._center, this._perMuzzleData[index].muzzleTransform.subarray(12, 15));
    vec3.scale(EveTurretFiringFX._center, EveTurretFiringFX._center, 1 / active.length);
    let radius = 0;
    for (const index of active) radius = Math.max(radius, vec3.distance(EveTurretFiringFX._center, this._perMuzzleData[index].muzzleTransform.subarray(12, 15)));
    const frustum = context.GetFrustum();
    const viewPosition = frustum.viewPos;
    const angle = Math.atan(radius * 2 / (vec3.distance(viewPosition, EveTurretFiringFX._center) + 1));
    const lodAngle = frustum.fov * 0.002;
    const merge = angle <= lodAngle ? 0 : Math.min((angle - lodAngle) / lodAngle, 1);
    active.forEach((index, order) => this.stretch[index].SetIntensity(order ? merge : active.length + (1 - active.length) * merge));
  }

  /**
   * Appends the renderables of every started element still inside the firing
   * duration to out; gated on display and isFiring. JS returns the caller's output array.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetRenderables(out = [])
  {
    if (!(this.display && this.isFiring)) return out;
    this._ensureMuzzleData();
    for (let index = 0; index < this.stretch.length; index++)
    {
      const data = this._perMuzzleData[index];
      const stretch = this.stretch[index];
      if (stretch && data.started && (data.elapsedTime <= this.firingDuration || this.isLoopFiring)) stretch.GetRenderables(out);
    }
    return out;
  }

  /** Registers every stretch with the quad renderer (cpp:771-777). */
  @meta.carbon.method
  @meta.impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const stretch of this.stretch) stretch.RegisterWithQuadRenderer(quadRenderer);
  }

  /** Collects stretch quads only while displayed and firing (cpp:780-792). */
  @meta.carbon.method
  @meta.impl.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display || !this.isFiring) return;
    for (const stretch of this.stretch) stretch.AddQuadsToQuadRenderer(frustum, quadRenderer);
  }

  /** m_maxScale (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  maxScale = 10;

  /**
   * The number of muzzles the effect drives, which is the number of authored
   * stretch elements rather than the twelve-muzzle maximum.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetPerMuzzleEffectCount()
  {
    return this.stretch.length;
  }

  /**
   * The parent bone id bound to a muzzle slot, or INVALID_INDEX when the muzzle
   * rides a supplied transform instead of a bone.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetPerMuzzleBoneID(muzzleID)
  {
    this._ensureMuzzleData();
    return this._perMuzzleData[muzzleID]?.muzzlePositionBoneID ?? EveTurretFiringFX.INVALID_INDEX;
  }

  /**
   * Whether the burst repeats instead of ending when the firing duration
   * elapses.
   */
  @meta.carbon.method
  @meta.impl.implemented
  IsLooping()
  {
    return this.isLoopFiring;
  }

  /**
   * Sets whether the stretch elements draw their destination end, which is the
   * impact on the target.
   */
  @meta.carbon.method
  @meta.impl.implemented
  SetDisplayDestObject(display)
  {
    this._displayDestObject = !!display;
  }

  /** Whether the stretch elements draw their destination end. */
  @meta.carbon.method
  @meta.impl.implemented
  GetDisplayDestObject()
  {
    return this._displayDestObject;
  }

  /**
   * Sets whether the stretch elements draw their source end, which is the muzzle
   * flash.
   */
  @meta.carbon.method
  @meta.impl.implemented
  SetDisplaySourceObject(display)
  {
    this._displaySourceObject = !!display;
  }

  /** Whether the stretch elements draw their source end. */
  @meta.carbon.method
  @meta.impl.implemented
  GetDisplaySourceObject()
  {
    return this._displaySourceObject;
  }

  /** Forwards a named variable to stretches exposing Carbon's controller-owner interface. */
  @meta.carbon.method
  @meta.impl.implemented
  SetControllerVariable(name, value)
  {
    for (const stretch of this.stretch)
    {
      if (stretch && mappedInterfaces(stretch.constructor).has(ITr2ControllerOwner))
      {
        stretch.SetControllerVariable(name, value);
      }
    }
  }

  /** Forwards a named event to stretches exposing Carbon's controller-owner interface. */
  @meta.carbon.method
  @meta.impl.implemented
  HandleControllerEvent(name)
  {
    for (const stretch of this.stretch)
    {
      if (stretch && mappedInterfaces(stretch.constructor).has(ITr2ControllerOwner))
      {
        stretch.HandleControllerEvent(name);
      }
    }
  }

  /** Starts controllers on stretches exposing Carbon's controller-owner interface. */
  @meta.carbon.method
  @meta.impl.implemented
  StartControllers()
  {
    for (const stretch of this.stretch)
    {
      if (stretch && mappedInterfaces(stretch.constructor).has(ITr2ControllerOwner))
      {
        stretch.StartControllers();
      }
    }
  }

  /** Carbon EveTurretFiringFX::RegisterComponents (cpp:739-752): forwards the
   * stretch elements. Gate m_display && m_isFiring. */
  @meta.carbon.method
  @meta.impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display && this.isFiring)
    {
      for (const element of this.stretch)
      {
        if (element && mappedInterfaces(element.constructor).has(EveEntity)) element.Register(registry);
      }
    }
  }

  /** Carbon EveTurretFiringFX::UnRegisterComponents (cpp:755-768): forwards
   * the stretch elements; no display/isFiring re-check. */
  @meta.carbon.method
  @meta.impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const element of this.stretch)
      {
        if (element && mappedInterfaces(element.constructor).has(EveEntity)) element.UnRegister(registry);
      }
    }
  }

  /**
   * Records which surface the shot lands on and, only when it changes, sends the
   * matching Impact_On switch value to the destination observer's audio emitter;
   * anything other than armor or hull is sent as Shield, including
   * IMPACT_INVALID. JS resolves the nominal emitter type through Audio registration.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetImpactConfiguration(configuration)
  {
    if (configuration !== this._impactConfiguration)
    {
      const observer = this.destinationObserver ? this.destinationObserver.GetObserver() : null;
      const contract = CjsSchema.GetConstructor("ITr2AudEmitter");
      const emitter = contract ? CjsSchema.cast(observer, contract) : null;
      const value = configuration === EveTurretFiringFX.ImpactConfiguration.IMPACT_ARMOR
        ? "Armor"
        : configuration === EveTurretFiringFX.ImpactConfiguration.IMPACT_HULL ? "Hull" : "Shield";
      if (emitter) emitter.SetSwitch("Impact_On", value);
    }
    this._impactConfiguration = configuration;
  }

  /**
   * Grows the per-muzzle record list to the twelve-muzzle maximum on first use
   * and refreshes every record's constant delay from the authored
   * firingDelay1..firingDelay12 fields, so an edited delay takes effect without
   * a rebuild.
   */
  _ensureMuzzleData()
  {
    while (this._perMuzzleData.length < EveTurretFiringFX.MUZZLE_COUNT_MAX)
    {
      const index = this._perMuzzleData.length;
      this._perMuzzleData.push({
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
      this._perMuzzleData[index].constantDelay = Number(this[`firingDelay${index + 1}`] ?? 0);
    }
  }

  static MaxMuzzleCount = Object.freeze({
    MUZZLECOUNT_MAX: 12,
  });

  static MUZZLE_COUNT_MAX = EveTurretFiringFX.MaxMuzzleCount.MUZZLECOUNT_MAX;

  static INVALID_INDEX = 0xffffffff;

  static ImpactConfiguration = ImpactConfiguration;

  static _identity = mat4.create();

  static _destinationTransform = mat4.create();
  static _startPosition = vec3.create();

  static _center = vec3.create();

}

// Native exposure includes the concrete class itself; JS has no implicit self mapping.
meta.carbon.mapInterface(EveTurretFiringFX)(EveTurretFiringFX);
