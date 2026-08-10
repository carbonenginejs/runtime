import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { getDeltaTime, getTime, translationMatrix } from '../../renderable/stretch/CjsStretchRuntime.js';
import { ImpactConfiguration } from '../../../generated/include/enums.js';

let _initProto, _initClass, _init_startCurveSet, _init_extra_startCurveSet, _init_stopCurveSet, _init_extra_stopCurveSet, _init_stretch, _init_extra_stretch, _init_name, _init_extra_name, _init_firingPeakTime, _init_extra_firingPeakTime, _init_firingDelay, _init_extra_firingDelay, _init_firingDelay2, _init_extra_firingDelay2, _init_firingDelay3, _init_extra_firingDelay3, _init_firingDelay4, _init_extra_firingDelay4, _init_firingDelay5, _init_extra_firingDelay5, _init_firingDelay6, _init_extra_firingDelay6, _init_firingDelay7, _init_extra_firingDelay7, _init_firingDelay8, _init_extra_firingDelay8, _init_firingDelay9, _init_extra_firingDelay9, _init_firingDelay0, _init_extra_firingDelay0, _init_firingDelay1, _init_extra_firingDelay1, _init_firingDelay10, _init_extra_firingDelay10, _init_endPosition, _init_extra_endPosition, _init_firingDuration, _init_extra_firingDuration, _init_isFiring, _init_extra_isFiring, _init_destinationObserver, _init_extra_destinationObserver, _init_sourceObserver, _init_extra_sourceObserver, _init_firingDurationOverride, _init_extra_firingDurationOverride, _init_useMuzzleTransform, _init_extra_useMuzzleTransform, _init_isLoopFiring, _init_extra_isLoopFiring, _init_boneName, _init_extra_boneName, _init_display, _init_extra_display, _init_scaleEffectTarget, _init_extra_scaleEffectTarget, _init_minRadius, _init_extra_minRadius, _init_maxRadius, _init_extra_maxRadius, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale;

/** EveTurretFiringFX (eve/attachment/turrets) - generated from schema shapeHash ae5459c6.... */
let _EveTurretFiringFX;
new class extends _identity {
  static [class EveTurretFiringFX extends _EveEntity {
    static {
      ({
        e: [_init_startCurveSet, _init_extra_startCurveSet, _init_stopCurveSet, _init_extra_stopCurveSet, _init_stretch, _init_extra_stretch, _init_name, _init_extra_name, _init_firingPeakTime, _init_extra_firingPeakTime, _init_firingDelay, _init_extra_firingDelay, _init_firingDelay2, _init_extra_firingDelay2, _init_firingDelay3, _init_extra_firingDelay3, _init_firingDelay4, _init_extra_firingDelay4, _init_firingDelay5, _init_extra_firingDelay5, _init_firingDelay6, _init_extra_firingDelay6, _init_firingDelay7, _init_extra_firingDelay7, _init_firingDelay8, _init_extra_firingDelay8, _init_firingDelay9, _init_extra_firingDelay9, _init_firingDelay0, _init_extra_firingDelay0, _init_firingDelay1, _init_extra_firingDelay1, _init_firingDelay10, _init_extra_firingDelay10, _init_endPosition, _init_extra_endPosition, _init_firingDuration, _init_extra_firingDuration, _init_isFiring, _init_extra_isFiring, _init_destinationObserver, _init_extra_destinationObserver, _init_sourceObserver, _init_extra_sourceObserver, _init_firingDurationOverride, _init_extra_firingDurationOverride, _init_useMuzzleTransform, _init_extra_useMuzzleTransform, _init_isLoopFiring, _init_extra_isLoopFiring, _init_boneName, _init_extra_boneName, _init_display, _init_extra_display, _init_scaleEffectTarget, _init_extra_scaleEffectTarget, _init_minRadius, _init_extra_minRadius, _init_maxRadius, _init_extra_maxRadius, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _initProto],
        c: [_EveTurretFiringFX, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveTurretFiringFX",
        family: "eve/attachment/turrets"
      })], [[[io, io.persist, void 0, type.model("TriCurveSet")], 16, "startCurveSet"], [[io, io.persist, void 0, type.model("TriCurveSet")], 16, "stopCurveSet"], [[io, io.persist, void 0, type.list("IEveFiringEffectElement")], 16, "stretch"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "firingPeakTime"], [[io, io.persist, type, type.float32], 16, "firingDelay1"], [[io, io.persist, type, type.float32], 16, "firingDelay10"], [[io, io.persist, type, type.float32], 16, "firingDelay11"], [[io, io.persist, type, type.float32], 16, "firingDelay12"], [[io, io.persist, type, type.float32], 16, "firingDelay2"], [[io, io.persist, type, type.float32], 16, "firingDelay3"], [[io, io.persist, type, type.float32], 16, "firingDelay4"], [[io, io.persist, type, type.float32], 16, "firingDelay5"], [[io, io.persist, type, type.float32], 16, "firingDelay6"], [[io, io.persist, type, type.float32], 16, "firingDelay7"], [[io, io.persist, type, type.float32], 16, "firingDelay8"], [[io, io.persist, type, type.float32], 16, "firingDelay9"], [[io, io.readwrite, type, type.vec3], 16, "endPosition"], [[io, io.read, type, type.float32], 16, "firingDuration"], [[io, io.read, type, type.boolean], 16, "isFiring"], [[io, io.persist, void 0, type.model("TriObserverLocal")], 16, "destinationObserver"], [[io, io.persist, void 0, type.model("TriObserverLocal")], 16, "sourceObserver"], [[io, io.notify, io, io.persist, type, type.float32], 16, "firingDurationOverride"], [[io, io.persist, type, type.boolean], 16, "useMuzzleTransform"], [[io, io.persist, type, type.boolean], 16, "isLoopFiring"], [[io, io.persist, type, type.string], 16, "boneName"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "scaleEffectTarget"], [[io, io.persist, type, type.float32], 16, "minRadius"], [[io, io.persist, type, type.float32], 16, "maxRadius"], [[io, io.persist, type, type.float32], 16, "minScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "CleanUp"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMuzzleBoneID"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMuzzleTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMuzzleTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEndPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetScaleByRadius"], [[carbon, carbon.method, impl, impl.implemented], 18, "PrepareFiringEffectMoveObjects"], [[carbon, carbon.method, impl, impl.implemented], 18, "PrepareFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetStartPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFiringDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFiringPeakTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFiringBoneName"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartMuzzleEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "ReadyToFire"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's task update is serial in the browser; firing elements retain their explicit async phase.")], 18, "UpdateAsynchronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's task update is serial in the browser; firing elements retain their explicit sync phase.")], 18, "UpdateSynchronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Visibility is forwarded to graph elements; small-angle muzzle merging uses portable frustum fields when present.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Renderable collection is backend-neutral; draw realization remains runtime-engine work.")], 18, "GetRenderables"], [[io, io.persist, type, type.float32], 16, "maxScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerMuzzleEffectCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerMuzzleBoneID"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsLooping"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplayDestObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplayDestObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplaySourceObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplaySourceObject"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct firing-element method forwarding.")], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct firing-element method forwarding.")], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct firing-element method forwarding.")], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Audio emitters are duck-typed; Carbon impact switch values are forwarded without native interfaces.")], 18, "SetImpactConfiguration"]], 0, void 0, _EveEntity));
    }
    constructor(...args) {
      super(...args);
      _init_extra_maxScale(this);
    }
    /** m_startCurveSet (TriCurveSetPtr) [READWRITE, PERSIST] */
    startCurveSet = (_initProto(this), _init_startCurveSet(this, null));

    /** m_stopCurveSet (TriCurveSetPtr) [READWRITE, PERSIST] */
    stopCurveSet = (_init_extra_startCurveSet(this), _init_stopCurveSet(this, null));

    /** m_stretch (PIEveFiringEffectElementVector) [READ, PERSIST] */
    stretch = (_init_extra_stopCurveSet(this), _init_stretch(this, []));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_stretch(this), _init_name(this, ""));

    /** m_firingPeakTime (float) [READWRITE, PERSIST] */
    firingPeakTime = (_init_extra_name(this), _init_firingPeakTime(this, 0));

    /** m_perMuzzleData[0].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay1 = (_init_extra_firingPeakTime(this), _init_firingDelay(this, 0));

    /** m_perMuzzleData[9].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay10 = (_init_extra_firingDelay(this), _init_firingDelay2(this, 0));

    /** m_perMuzzleData[10].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay11 = (_init_extra_firingDelay2(this), _init_firingDelay3(this, 0));

    /** m_perMuzzleData[11].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay12 = (_init_extra_firingDelay3(this), _init_firingDelay4(this, 0));

    /** m_perMuzzleData[1].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay2 = (_init_extra_firingDelay4(this), _init_firingDelay5(this, 0));

    /** m_perMuzzleData[2].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay3 = (_init_extra_firingDelay5(this), _init_firingDelay6(this, 0));

    /** m_perMuzzleData[3].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay4 = (_init_extra_firingDelay6(this), _init_firingDelay7(this, 0));

    /** m_perMuzzleData[4].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay5 = (_init_extra_firingDelay7(this), _init_firingDelay8(this, 0));

    /** m_perMuzzleData[5].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay6 = (_init_extra_firingDelay8(this), _init_firingDelay9(this, 0));

    /** m_perMuzzleData[6].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay7 = (_init_extra_firingDelay9(this), _init_firingDelay0(this, 0));

    /** m_perMuzzleData[7].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay8 = (_init_extra_firingDelay0(this), _init_firingDelay1(this, 0));

    /** m_perMuzzleData[8].constantDelay (float) [READWRITE, PERSIST] */
    firingDelay9 = (_init_extra_firingDelay1(this), _init_firingDelay10(this, 0));

    /** m_endPosition (Vector3) [READWRITE] */
    endPosition = (_init_extra_firingDelay10(this), _init_endPosition(this, vec3.create()));

    /** m_firingDuration (float) [READ] */
    firingDuration = (_init_extra_endPosition(this), _init_firingDuration(this, 1000));

    /** m_isFiring (bool) [READ] */
    isFiring = (_init_extra_firingDuration(this), _init_isFiring(this, false));

    /** m_destinationObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
    destinationObserver = (_init_extra_isFiring(this), _init_destinationObserver(this, null));

    /** m_sourceObserver (TriObserverLocalPtr) [READWRITE, PERSIST] */
    sourceObserver = (_init_extra_destinationObserver(this), _init_sourceObserver(this, null));

    /** m_firingDurationOverride (float) [READWRITE, NOTIFY, PERSIST] */
    firingDurationOverride = (_init_extra_sourceObserver(this), _init_firingDurationOverride(this, -1));

    /** m_useMuzzleTransform (bool) [READWRITE, PERSIST] */
    useMuzzleTransform = (_init_extra_firingDurationOverride(this), _init_useMuzzleTransform(this, false));

    /** m_isLoopFiring (bool) [READWRITE, PERSIST] */
    isLoopFiring = (_init_extra_useMuzzleTransform(this), _init_isLoopFiring(this, false));

    /** m_boneName (BlueSharedString) [READWRITE, PERSIST] */
    boneName = (_init_extra_isLoopFiring(this), _init_boneName(this, "Pos_Fire"));

    /** m_display (bool) [READWRITE, NOTIFY] */
    display = (_init_extra_boneName(this), _init_display(this, true));

    /** m_scaleEffectTarget (bool) [READWRITE, PERSIST] */
    scaleEffectTarget = (_init_extra_display(this), _init_scaleEffectTarget(this, false));

    /** m_minRadius (float) [READWRITE, PERSIST] */
    minRadius = (_init_extra_scaleEffectTarget(this), _init_minRadius(this, 30));

    /** m_maxRadius (float) [READWRITE, PERSIST] */
    maxRadius = (_init_extra_minRadius(this), _init_maxRadius(this, 3000));

    /** m_minScale (float) [READWRITE, PERSIST] */
    minScale = (_init_extra_maxRadius(this), _init_minScale(this, 1));
    #perMuzzleData = (_init_extra_minScale(this), []);
    #displaySourceObject = true;
    #displayDestObject = true;
    #impactConfiguration = _EveTurretFiringFX.ImpactConfiguration.IMPACT_INVALID;

    /**
     * Allocates the twelve per-muzzle records and resolves the firing duration,
     * preferring a non-negative firingDurationOverride and otherwise the longest
     * stretch-element curve.
     */
    Initialize() {
      this.#ensureMuzzleData();
      if (this.firingDurationOverride >= 0) this.firingDuration = this.firingDurationOverride;else {
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
    CleanUp(context = {
      currentTime: 0,
      deltaTime: 0
    }) {
      this.StopFiring();
      this.UpdateAsynchronous(context);
      this.UpdateSynchronous(context);
    }

    /**
     * Recomputes the firing duration after a property change, taking the override
     * when it is non-negative and the longest element curve otherwise.
     */
    OnModified() {
      this.firingDuration = this.firingDurationOverride >= 0 ? this.firingDurationOverride : this.GetCurveDuration();
      return true;
    }

    /**
     * Binds a muzzle slot to a parent bone id; a muzzle id outside the
     * twelve-muzzle range is ignored rather than reported.
     */
    SetMuzzleBoneID(muzzleID, boneID) {
      this.#ensureMuzzleData();
      if (muzzleID >= 0 && muzzleID < _EveTurretFiringFX.MUZZLE_COUNT_MAX) this.#perMuzzleData[muzzleID].muzzlePositionBoneID = Number(boneID) >>> 0;
    }

    /**
     * Copies a world muzzle transform into a muzzle slot; a muzzle id outside the
     * twelve-muzzle range is ignored rather than reported.
     */
    SetMuzzleTransform(muzzleID, transform) {
      this.#ensureMuzzleData();
      if (muzzleID >= 0 && muzzleID < _EveTurretFiringFX.MUZZLE_COUNT_MAX) mat4.copy(this.#perMuzzleData[muzzleID].muzzleTransform, transform);
    }

    /**
     * Reads a muzzle slot's world transform, falling back to identity for a slot that was never populated.
     * @param {number} muzzleID Muzzle slot to read.
     * @param {mat4} [out] Caller-owned matrix to fill; a fresh one is allocated when omitted.
     * @returns {mat4} out.
     */
    GetMuzzleTransform(muzzleID, out = mat4.create()) {
      this.#ensureMuzzleData();
      return mat4.copy(out, this.#perMuzzleData[muzzleID]?.muzzleTransform ?? _EveTurretFiringFX.#identity);
    }

    /**
     * Sets the world point every stretch element extends towards, which is the
     * impact end of the shot.
     */
    SetEndPosition(value) {
      vec3.copy(this.endPosition, value);
    }

    /**
     * Scales each stretch element's destination object between minScale and
     * maxScale by where the target radius falls in the minRadius..maxRadius band,
     * and hands the raw radius to the destination observer as an audio attenuation
     * factor; does nothing unless scaleEffectTarget is authored.
     */
    SetScaleByRadius(radius) {
      if (!this.scaleEffectTarget) return;
      const span = this.maxRadius - this.minRadius;
      const amount = span ? (Number(radius) - this.minRadius) / span : 0;
      const scale = Math.max(this.minScale, Math.min(this.maxScale, this.minScale + amount * (this.maxScale - this.minScale)));
      for (const stretch of this.stretch) stretch?.SetDestObjectScale?.(scale);
      this.destinationObserver?.GetObserver?.()?.SetAttenuationScalingFactor?.(Number(radius));
    }

    /**
     * Restarts a looping burst by telling every stretch element to move again,
     * without resetting the per-muzzle delays that PrepareFiring establishes.
     */
    PrepareFiringEffectMoveObjects() {
      for (const stretch of this.stretch) stretch?.StartMoving?.();
      this.isFiring = true;
    }

    /**
     * Arms the muzzles for a burst: selected muzzles start after delay plus their authored constant delay, every other muzzle is pushed out of reach with a maximal delay.
     * @param {number} delay Common start delay added to each muzzle's authored constant delay.
     * @param {number} [muzzleID] First muzzle of the firing group; INVALID_INDEX arms every muzzle.
     * @param {number} [muzzleCount] Number of consecutive muzzles in the group.
     */
    PrepareFiring(delay, muzzleID = _EveTurretFiringFX.INVALID_INDEX, muzzleCount = _EveTurretFiringFX.INVALID_INDEX) {
      this.#ensureMuzzleData();
      for (let index = 0; index < this.stretch.length; index++) {
        const selected = muzzleID === _EveTurretFiringFX.INVALID_INDEX || index >= muzzleID && index < muzzleID + muzzleCount;
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
    GetCurveDuration() {
      let duration = 0;
      for (const stretch of this.stretch) duration = Math.max(duration, Number(stretch?.GetCurveDuration?.() ?? 0));
      return duration;
    }

    /**
     * Averages the translation of every started muzzle transform, which is the point the shot is heard and seen to leave from.
     * @param {vec3} [out] Caller-owned vector filled with the averaged position.
     * @returns {boolean} False when the effect is not firing or no muzzle has started, in which case out is left untouched.
     */
    GetStartPosition(out = vec3.create()) {
      if (!this.isFiring) return false;
      this.#ensureMuzzleData();
      vec3.zero(_EveTurretFiringFX.#startPosition);
      let count = 0;
      for (const data of this.#perMuzzleData.slice(0, this.stretch.length)) {
        if (!data.started) continue;
        _EveTurretFiringFX.#startPosition[0] += data.muzzleTransform[12];
        _EveTurretFiringFX.#startPosition[1] += data.muzzleTransform[13];
        _EveTurretFiringFX.#startPosition[2] += data.muzzleTransform[14];
        count++;
      }
      if (!count) return false;
      vec3.scale(out, _EveTurretFiringFX.#startPosition, 1 / count);
      return true;
    }

    /**
     * The firing duration in force: the override when non-negative, otherwise the
     * duration resolved at Initialize.
     */
    GetFiringDuration() {
      return this.firingDurationOverride >= 0 ? this.firingDurationOverride : this.firingDuration;
    }

    /**
     * The authored offset into the burst at which the shot is considered to land,
     * used to time the target's impact.
     */
    GetFiringPeakTime() {
      return this.firingPeakTime;
    }

    /**
     * The name of the bone muzzle locators are resolved under, Pos_Fire unless
     * authored otherwise.
     */
    GetFiringBoneName() {
      return this.boneName;
    }

    /**
     * Starts one muzzle: its stretch element begins firing, the start curve set
     * plays backdated by the muzzle's remaining delay and the stop curve set is
     * halted; returns false when the muzzle has no record or no element.
     */
    StartMuzzleEffect(muzzleID) {
      this.#ensureMuzzleData();
      const data = this.#perMuzzleData[muzzleID];
      if (!data || !this.stretch[muzzleID]) return false;
      this.stretch[muzzleID].StartFiring?.(data.currentStartDelay);
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
    StopFiring() {
      if (!this.isFiring) return;
      this.#ensureMuzzleData();
      for (let index = 0; index < this.stretch.length; index++) {
        this.stretch[index]?.StopFiring?.();
        Object.assign(this.#perMuzzleData[index], {
          started: false,
          readyToStart: false,
          currentStartDelay: 0,
          elapsedTime: 0
        });
      }
      this.startCurveSet?.Stop?.();
      this.stopCurveSet?.Play?.();
      this.isFiring = false;
    }

    /**
     * Whether any muzzle has run its delay down but not yet started, and is still
     * inside the firing duration or belongs to a looping effect.
     */
    ReadyToFire() {
      this.#ensureMuzzleData();
      return this.#perMuzzleData.slice(0, this.stretch.length).some(data => (data.elapsedTime < this.firingDuration || this.isLoopFiring) && !data.started && data.readyToStart);
    }

    /**
     * Advances each muzzle's delay and elapsed time, starts the muzzles whose
     * delay expired, pushes the muzzle and end transforms into their stretch
     * elements, then updates the active curve set and both observers; returns
     * whether a muzzle started firing on this call.
     */
    UpdateAsynchronous(context) {
      this.#ensureMuzzleData();
      const deltaTime = getDeltaTime(context);
      let justFired = false;
      for (let index = 0; index < this.stretch.length; index++) {
        const data = this.#perMuzzleData[index];
        const stretch = this.stretch[index];
        if (data.started) data.elapsedTime += deltaTime;
        if (!(data.elapsedTime < this.firingDuration || this.isLoopFiring)) continue;
        if (this.isFiring) {
          if (!data.started) {
            if (data.readyToStart) {
              this.StartMuzzleEffect(index);
              data.currentStartDelay = 0;
              data.elapsedTime = 0;
              justFired = true;
            } else data.currentStartDelay -= deltaTime;
            if (data.currentStartDelay <= 0) data.readyToStart = true;
          }
          if (data.started) {
            const source = this.useMuzzleTransform && data.muzzlePositionBoneID !== _EveTurretFiringFX.INVALID_INDEX ? data.muzzleTransform : data.muzzleTransform.subarray(12, 15);
            stretch?.SetFiringTransform?.(source, this.endPosition);
            stretch?.DisplayEndPoints?.(this.#displaySourceObject, this.#displayDestObject);
          }
          stretch?.UpdateEffectAsync?.(context);
        }
      }
      const curveSet = this.isFiring ? this.startCurveSet : this.stopCurveSet;
      const time = getTime(context);
      curveSet?.Update?.(time, time);
      this.sourceObserver?.Update?.(this.#perMuzzleData[0]?.muzzleTransform ?? _EveTurretFiringFX.#identity);
      this.destinationObserver?.Update?.(translationMatrix(this.endPosition, _EveTurretFiringFX.#destinationTransform));
      return justFired;
    }

    /**
     * Runs the synchronous element update for every muzzle still inside the firing
     * duration, or for all of them when the effect loops.
     */
    UpdateSynchronous(context) {
      this.#ensureMuzzleData();
      for (let index = 0; index < this.stretch.length; index++) {
        const data = this.#perMuzzleData[index];
        if (data.elapsedTime < this.firingDuration || this.isLoopFiring) this.stretch[index]?.UpdateEffectSync?.(context);
      }
      return true;
    }

    /**
     * Runs the asynchronous then synchronous phase in order and reports whether a
     * muzzle started firing.
     */
    Update(context) {
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
    UpdateVisibility(context) {
      if (!(this.display && this.isFiring)) return;
      this.#ensureMuzzleData();
      const active = [];
      for (let index = 0; index < this.stretch.length; index++) {
        const data = this.#perMuzzleData[index];
        if (data.started && (data.elapsedTime <= this.firingDuration || this.isLoopFiring)) {
          this.stretch[index]?.UpdateVisibility?.(context, _EveTurretFiringFX.#identity);
          active.push(index);
        }
      }
      if (active.length <= 1 || active.some(index => this.#perMuzzleData[index].muzzlePositionBoneID !== _EveTurretFiringFX.INVALID_INDEX)) return;
      vec3.zero(_EveTurretFiringFX.#center);
      for (const index of active) vec3.add(_EveTurretFiringFX.#center, _EveTurretFiringFX.#center, this.#perMuzzleData[index].muzzleTransform.subarray(12, 15));
      vec3.scale(_EveTurretFiringFX.#center, _EveTurretFiringFX.#center, 1 / active.length);
      let radius = 0;
      for (const index of active) radius = Math.max(radius, vec3.distance(_EveTurretFiringFX.#center, this.#perMuzzleData[index].muzzleTransform.subarray(12, 15)));
      const frustum = context?.frustum ?? context?.GetFrustum?.();
      const viewPosition = frustum?.viewPosition ?? frustum?.viewPos;
      if (!viewPosition) return;
      const angle = Math.atan(radius * 2 / (vec3.distance(viewPosition, _EveTurretFiringFX.#center) + 1));
      const lodAngle = Number(frustum.fov ?? 1) * 0.002;
      const merge = angle <= lodAngle ? 0 : Math.min((angle - lodAngle) / lodAngle, 1);
      active.forEach((index, order) => this.stretch[index]?.SetIntensity?.(order ? merge : active.length + (1 - active.length) * merge));
    }

    /**
     * Appends the renderables of every started element still inside the firing
     * duration to out; gated on display and isFiring.
     */
    GetRenderables(out = []) {
      if (!(this.display && this.isFiring)) return out;
      this.#ensureMuzzleData();
      for (let index = 0; index < this.stretch.length; index++) {
        const data = this.#perMuzzleData[index];
        if (data.started && (data.elapsedTime <= this.firingDuration || this.isLoopFiring)) this.stretch[index]?.GetRenderables?.(out);
      }
      return out;
    }

    /** m_maxScale (float) [READWRITE, PERSIST] */
    maxScale = _init_maxScale(this, 10);

    /**
     * The number of muzzles the effect drives, which is the number of authored
     * stretch elements rather than the twelve-muzzle maximum.
     */
    GetPerMuzzleEffectCount() {
      return this.stretch.length;
    }

    /**
     * The parent bone id bound to a muzzle slot, or INVALID_INDEX when the muzzle
     * rides a supplied transform instead of a bone.
     */
    GetPerMuzzleBoneID(muzzleID) {
      this.#ensureMuzzleData();
      return this.#perMuzzleData[muzzleID]?.muzzlePositionBoneID ?? _EveTurretFiringFX.INVALID_INDEX;
    }

    /**
     * Whether the burst repeats instead of ending when the firing duration
     * elapses.
     */
    IsLooping() {
      return this.isLoopFiring;
    }

    /**
     * Sets whether the stretch elements draw their destination end, which is the
     * impact on the target.
     */
    SetDisplayDestObject(display) {
      this.#displayDestObject = !!display;
    }

    /** Whether the stretch elements draw their destination end. */
    GetDisplayDestObject() {
      return this.#displayDestObject;
    }

    /**
     * Sets whether the stretch elements draw their source end, which is the muzzle
     * flash.
     */
    SetDisplaySourceObject(display) {
      this.#displaySourceObject = !!display;
    }

    /** Whether the stretch elements draw their source end. */
    GetDisplaySourceObject() {
      return this.#displaySourceObject;
    }

    /** Forwards a named controller variable to every stretch element. */
    SetControllerVariable(name, value) {
      for (const stretch of this.stretch) stretch?.SetControllerVariable?.(name, value);
    }

    /** Forwards a named controller event to every stretch element. */
    HandleControllerEvent(name) {
      for (const stretch of this.stretch) stretch?.HandleControllerEvent?.(name);
    }

    /** Starts the controllers on every stretch element. */
    StartControllers() {
      for (const stretch of this.stretch) stretch?.StartControllers?.();
    }

    /** Carbon EveTurretFiringFX::RegisterComponents (cpp:739-752): forwards the
     * stretch elements. Gate m_display && m_isFiring. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display && this.isFiring) {
        for (const element of this.stretch) {
          element?.Register?.(registry);
        }
      }
    }

    /** Carbon EveTurretFiringFX::UnRegisterComponents (cpp:755-768): forwards
     * the stretch elements; no display/isFiring re-check. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const element of this.stretch) {
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
    SetImpactConfiguration(configuration) {
      if (configuration !== this.#impactConfiguration) {
        const emitter = this.destinationObserver?.GetObserver?.();
        const value = configuration === _EveTurretFiringFX.ImpactConfiguration.IMPACT_ARMOR ? "Armor" : configuration === _EveTurretFiringFX.ImpactConfiguration.IMPACT_HULL ? "Hull" : "Shield";
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
    #ensureMuzzleData() {
      while (this.#perMuzzleData.length < _EveTurretFiringFX.MUZZLE_COUNT_MAX) {
        const index = this.#perMuzzleData.length;
        this.#perMuzzleData.push({
          started: false,
          readyToStart: false,
          muzzlePositionBoneID: _EveTurretFiringFX.INVALID_INDEX,
          muzzleTransform: mat4.create(),
          currentStartDelay: 0,
          constantDelay: Number(this[`firingDelay${index + 1}`] ?? 0),
          elapsedTime: 0
        });
      }
      for (let index = 0; index < _EveTurretFiringFX.MUZZLE_COUNT_MAX; index++) {
        this.#perMuzzleData[index].constantDelay = Number(this[`firingDelay${index + 1}`] ?? 0);
      }
    }
  }];
  MaxMuzzleCount = Object.freeze({
    MUZZLECOUNT_MAX: 12
  });
  MUZZLE_COUNT_MAX = _EveTurretFiringFX.MaxMuzzleCount.MUZZLECOUNT_MAX;
  INVALID_INDEX = 0xffffffff;
  ImpactConfiguration = ImpactConfiguration;
  #identity = mat4.create();
  #destinationTransform = mat4.create();
  #startPosition = vec3.create();
  #center = vec3.create();
  constructor() {
    super(_EveTurretFiringFX), _initClass();
  }
}();

export { _EveTurretFiringFX as EveTurretFiringFX };
//# sourceMappingURL=EveTurretFiringFX.js.map
