import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildContainer as _EveChildContainer } from './EveChildContainer.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';
import { PropagationType, TriggerType } from '../../generated/eve/child/enums.js';

let _initProto, _initClass, _init_propagationType, _init_extra_propagationType, _init_triggerMethood, _init_extra_triggerMethood, _init_stopAfterNumTriggers, _init_extra_stopAfterNumTriggers, _init_randScaleMin, _init_extra_randScaleMin, _init_randScaleMax, _init_extra_randScaleMax, _init_triggerSphereOffset, _init_extra_triggerSphereOffset, _init_effect, _init_extra_effect, _init_stopToClearDelay, _init_extra_stopToClearDelay, _init_ClosenessPreference, _init_extra_ClosenessPreference, _init_effectScaling, _init_extra_effectScaling, _init_durationPerEffect, _init_extra_durationPerEffect, _init_isPlaying, _init_extra_isPlaying, _init_localLocators, _init_extra_localLocators, _init_triggerSphereRadiusCurve, _init_extra_triggerSphereRadiusCurve, _init_triggerSphereScalarMulti, _init_extra_triggerSphereScalarMulti, _init_locatorSetName, _init_extra_locatorSetName, _init_completeness, _init_extra_completeness, _init_replayAfterDelay, _init_extra_replayAfterDelay, _init_trigger, _init_extra_trigger, _init_minRangeThreshold, _init_extra_minRangeThreshold, _init_playTime, _init_extra_playTime, _init_range, _init_extra_range, _init_numTriggers, _init_extra_numTriggers, _init_frequency, _init_extra_frequency, _init_skipCleanup, _init_extra_skipCleanup;

// Module scratch for the trigger-driven locator paths (allocation rules:
// copy-into, never allocate per frame; child updates run sequentially so the
// scratch is non-reentrant by construction).
const BOUNDS_SCRATCH = vec4.create();
const SPHERE_CENTER_SCRATCH = vec3.create();

// Carbon TriQuaternionDirVector (TriMath.cpp:262-269): stores the NORMALIZED
// direction vector in the quaternion x/y/z slots with w = 0. It is a packed
// direction, not a rotation - no quaternion composition happens here.
function TriQuaternionDirVector(out, v) {
  const length = Math.hypot(v[0], v[1], v[2]);
  const scale = length ? 1 / length : 0;
  out[0] = v[0] * scale;
  out[1] = v[1] * scale;
  out[2] = v[2] * scale;
  out[3] = 0;
  return out;
}

// Carbon EveChildEffectPropagator::Transform (h:66-72): the per-locator
// processed record. Records are allocated on trigger (ProcessLocators), never
// per frame.
function NewTransformRecord() {
  return {
    rotation: quat.create(),
    position: vec3.create(),
    scale: vec3.fromValues(1, 1, 1),
    sqrDistToSphereCenter: 0
  };
}

// Carbon SortByCircleDist (h:74-80): ascending squared distance to the
// trigger-sphere center.
function SortByCircleDist(lhs, rhs) {
  return lhs.sqrDistToSphereCenter - rhs.sqrDistToSphereCenter;
}

/** EveChildEffectPropagator (eve/child) - generated from schema shapeHash 0f2a96e8.... */
let _EveChildEffectPropag;
new class extends _identity {
  static [class EveChildEffectPropagator extends _EveChildContainer {
    static {
      ({
        e: [_init_propagationType, _init_extra_propagationType, _init_triggerMethood, _init_extra_triggerMethood, _init_stopAfterNumTriggers, _init_extra_stopAfterNumTriggers, _init_randScaleMin, _init_extra_randScaleMin, _init_randScaleMax, _init_extra_randScaleMax, _init_triggerSphereOffset, _init_extra_triggerSphereOffset, _init_effect, _init_extra_effect, _init_stopToClearDelay, _init_extra_stopToClearDelay, _init_ClosenessPreference, _init_extra_ClosenessPreference, _init_effectScaling, _init_extra_effectScaling, _init_durationPerEffect, _init_extra_durationPerEffect, _init_isPlaying, _init_extra_isPlaying, _init_localLocators, _init_extra_localLocators, _init_triggerSphereRadiusCurve, _init_extra_triggerSphereRadiusCurve, _init_triggerSphereScalarMulti, _init_extra_triggerSphereScalarMulti, _init_locatorSetName, _init_extra_locatorSetName, _init_completeness, _init_extra_completeness, _init_replayAfterDelay, _init_extra_replayAfterDelay, _init_trigger, _init_extra_trigger, _init_minRangeThreshold, _init_extra_minRangeThreshold, _init_playTime, _init_extra_playTime, _init_range, _init_extra_range, _init_numTriggers, _init_extra_numTriggers, _init_frequency, _init_extra_frequency, _init_skipCleanup, _init_extra_skipCleanup, _initProto],
        c: [_EveChildEffectPropag, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildEffectPropagator",
        family: "eve/child"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("PropagationType")], 16, "propagationType"], [[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("TriggerType")], 16, "triggerMethood"], [[io, io.notify, io, io.persist, type, type.float32], 16, "stopAfterNumTriggers"], [[io, io.notify, io, io.persist, type, type.float32], 16, "randScaleMin"], [[io, io.notify, io, io.persist, type, type.float32], 16, "randScaleMax"], [[io, io.persist, type, type.vec3], 16, "triggerSphereOffset"], [[io, io.notify, io, io.persistOnly, void 0, type.model("EveChildInstanceContainer")], 16, "effect"], [[io, io.persist, type, type.float32], 16, "stopToClearDelay"], [[io, io.notify, io, io.persist, type, type.float32], 16, "ClosenessPreference"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "effectScaling"], [[io, io.notify, io, io.persist, type, type.float32], 16, "durationPerEffect"], [[io, io.read, type, type.boolean], 16, "isPlaying"], [[io, io.persist, void 0, type.model("EveLocatorSets")], 16, "localLocators"], [[io, io.persist, void 0, type.model("Tr2CurveScalar")], 16, "triggerSphereRadiusCurve"], [[io, io.read, type, type.float32], 16, "triggerSphereScalarMulti"], [[io, io.notify, io, io.persist, type, type.string], 16, "locatorSetName"], [[io, io.notify, io, io.persist, type, type.float32], 16, "completeness"], [[io, io.persist, type, type.boolean], 16, "replayAfterDelay"], [[io, io.readwrite, type, type.boolean], 16, "trigger"], [[io, io.notify, io, io.persist, type, type.float32], 16, "minRangeThreshold"], [[io, io.read, type, type.float32], 16, "playTime"], [[io, io.notify, io, io.persist, type, type.float32], 16, "range"], [[io, io.notify, io, io.persist, type, type.int64], 16, "numTriggers"], [[io, io.notify, io, io.persist, type, type.float32], 16, "frequency"], [[io, io.persist, type, type.boolean], 16, "skipCleanup"], [[carbon, carbon.method, impl, impl.implemented], 18, "Play"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The staged instance container does not yet expose Carbon's native ClearInstanceList helper, so plain hydrated instance lists are cleared directly as a fallback.")], 18, "Stop"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("DisableEditMode is duck-typed - the staged instance container has not ported its edit-mode surface yet.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Field matching follows the repo OnModified duck and DisableEditMode is duck-typed on the staged instance container.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CreateInstance is duck-typed - the staged instance container has not ported its instance-spawning surface yet.")], 18, "ManageTriggers"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CreateInstance on the staged instance container is duck-typed; the trigger bookkeeping is ported.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateTriggerCurve"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CreateInstance/PopFront on the staged instance container are duck-typed; the interval bookkeeping is ported.")], 18, "UpdateTriggerInterval"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Math.random replaces Carbon's unseeded TriRandInt, matching the BehaviorGroup/EveSpaceObject2 precedent.")], 18, "GetSmartRandomLocatorIndex"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Math.random replaces Carbon's unseeded TriRand, matching the EveSpaceObject2 precedent.")], 18, "ProcessLocalLocators"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Math.random replaces Carbon's unseeded TriRand and the EveSpaceObject2 BlueCast becomes a duck check on the locator/bounds surface.")], 18, "ProcessRefLocators"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Math.random replaces Carbon's unseeded TriRand, matching the EveSpaceObject2 precedent.")], 18, "ProcessRandomSpreadLocators"], [[carbon, carbon.method, impl, impl.implemented], 18, "ProcessLocators"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Math.random replaces Carbon's unseeded TriRand, matching the EveSpaceObject2 precedent.")], 18, "RecalculateLocatorSizes"], [[carbon, carbon.method, impl, impl.implemented], 18, "DistanceSortLocators"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffect"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Component-registry re-registration is engine-owned (registry system unported); the effect swap itself is ported.")], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "UnRegisterComponents"]], 0, void 0, _EveChildContainer));
    }
    /** m_type (PropagationType - enum PropagationType) [READWRITE, PERSIST, ENUM, NOTIFY] */
    propagationType = (_initProto(this), _init_propagationType(this, 0));

    /** m_triggerMethod (TriggerType - enum TriggerType) [READWRITE, PERSIST, ENUM, NOTIFY] */
    triggerMethood = (_init_extra_propagationType(this), _init_triggerMethood(this, 0));

    /** m_stopAfterNumTriggers (float) [READWRITE, PERSIST, NOTIFY] */
    stopAfterNumTriggers = (_init_extra_triggerMethood(this), _init_stopAfterNumTriggers(this, -1));

    /** m_randScaleMin (float) [READWRITE, PERSIST, NOTIFY] */
    randScaleMin = (_init_extra_stopAfterNumTriggers(this), _init_randScaleMin(this, 1));

    /** m_randScaleMax (float) [READWRITE, PERSIST, NOTIFY] */
    randScaleMax = (_init_extra_randScaleMin(this), _init_randScaleMax(this, 1));

    /** m_triggerSphereOffset (Vector3) [READWRITE, PERSIST] */
    triggerSphereOffset = (_init_extra_randScaleMax(this), _init_triggerSphereOffset(this, vec3.create()));

    /** m_effect (EveChildInstanceContainerPtr) [PERSISTONLY, NOTIFY] */
    effect = (_init_extra_triggerSphereOffset(this), _init_effect(this, null));

    /** m_stopToClearDelay (float) [READWRITE, PERSIST] */
    stopToClearDelay = (_init_extra_effect(this), _init_stopToClearDelay(this, 0));

    /** m_rndClosenessPreference (float) [READWRITE, PERSIST, NOTIFY] */
    ClosenessPreference = (_init_extra_stopToClearDelay(this), _init_ClosenessPreference(this, 0.25));

    /** m_effectScaling (Vector3) [READWRITE, PERSIST, NOTIFY] */
    effectScaling = (_init_extra_ClosenessPreference(this), _init_effectScaling(this, vec3.fromValues(1, 1, 1)));

    /** m_effectDuration (float) [READWRITE, PERSIST, NOTIFY] */
    durationPerEffect = (_init_extra_effectScaling(this), _init_durationPerEffect(this, 3));

    /** m_isPlaying (bool) [READ] */
    isPlaying = (_init_extra_durationPerEffect(this), _init_isPlaying(this, false));

    /** m_localLocators (EveLocatorSetsPtr) [READWRITE, PERSIST] */
    localLocators = (_init_extra_isPlaying(this), _init_localLocators(this, null));

    /** m_triggerSphereRadiusCurve (Tr2CurveScalarPtr) [READWRITE, PERSIST] */
    triggerSphereRadiusCurve = (_init_extra_localLocators(this), _init_triggerSphereRadiusCurve(this, null));

    /** m_triggerSphereScalarMulti (float) [READ] */
    triggerSphereScalarMulti = (_init_extra_triggerSphereRadiusCurve(this), _init_triggerSphereScalarMulti(this, 1));

    /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */
    locatorSetName = (_init_extra_triggerSphereScalarMulti(this), _init_locatorSetName(this, ""));

    /** m_completeness (float) [READWRITE, PERSIST, NOTIFY] */
    completeness = (_init_extra_locatorSetName(this), _init_completeness(this, 1));

    /** m_replayAfterDelay (bool) [READWRITE, PERSIST] */
    replayAfterDelay = (_init_extra_completeness(this), _init_replayAfterDelay(this, false));

    /** m_trigger (bool) [READWRITE] */
    trigger = (_init_extra_replayAfterDelay(this), _init_trigger(this, false));

    /** m_rndMinRangeThreshold (float) [READWRITE, PERSIST, NOTIFY] */
    minRangeThreshold = (_init_extra_trigger(this), _init_minRangeThreshold(this, 0));

    /** m_playTime (float) [READ] */
    playTime = (_init_extra_minRangeThreshold(this), _init_playTime(this, 0));

    /** m_rndRange (float) [READWRITE, PERSIST, NOTIFY] */
    range = (_init_extra_playTime(this), _init_range(this, 500));

    /** m_numTriggers (int64_t) [READWRITE, PERSIST, NOTIFY] */
    numTriggers = (_init_extra_range(this), _init_numTriggers(this, 10));

    /** m_frequency (float) [READWRITE, PERSIST, NOTIFY] */
    frequency = (_init_extra_numTriggers(this), _init_frequency(this, 1));

    /** m_skipCleanup (bool) [READWRITE, PERSIST] */
    skipCleanup = (_init_extra_frequency(this), _init_skipCleanup(this, false));
    #currentTriggerIndex = (_init_extra_skipCleanup(this), 0);
    #numDeleted = 0;

    // Carbon m_processedTransforms/m_lastTriggered/m_delayTimer: runtime-only
    // trigger state (never persisted; Carbon keeps them off the Blue surface).
    #processedTransforms = [];
    #lastTriggered = [];
    #delayTimer = 0;

    /** Carbon EveChildEffectPropagator::Play (cpp:101-113): reset via Stop, then
     * arm playback; without an effect the propagator never starts. */
    Play() {
      this.Stop();
      if (!this.effect) {
        return;
      }
      this.trigger = false;
      this.isPlaying = true;
      this.#delayTimer = this.stopToClearDelay;
    }

    /** Carbon EveChildEffectPropagator::Stop (cpp:119-129). */
    Stop() {
      this.isPlaying = false;
      this.playTime = 0;
      this.#currentTriggerIndex = 0;
      this.#numDeleted = 0;
      if (this.effect) {
        if (typeof this.effect.ClearInstanceList === "function") {
          this.effect.ClearInstanceList();
        } else if (Array.isArray(this.effect.instances)) {
          this.effect.instances.length = 0;
        }
      }
    }

    /** Carbon EveChildEffectPropagator::Initialize (cpp:131-138). */
    Initialize() {
      this.effect?.DisableEditMode?.(true);
      return super.Initialize();
    }

    /** Carbon EveChildEffectPropagator::OnModified (cpp:61-95): edit-mode lock
     * on effect changes, clamps for completeness/randScaleMin/randScaleMax, and
     * the playTime re-anchor on frequency changes. The value argument follows
     * the repo's OnModified duck (field name or field value). */
    OnModified(value = null) {
      if (value === "effect" || value && value === this.effect) {
        this.effect?.DisableEditMode?.(true);
      }
      if (value === "completeness" || value === this.completeness) {
        this.completeness = Math.min(1, Math.max(0, this.completeness));
      }
      if (value === "randScaleMin" || value === this.randScaleMin) {
        this.randScaleMin = Math.min(this.randScaleMax, Math.max(0, this.randScaleMin));
      }
      if (value === "randScaleMax" || value === this.randScaleMax) {
        this.randScaleMax = Math.max(this.randScaleMax, this.randScaleMin);
      }
      if (value === "frequency" || value === this.frequency) {
        if (this.frequency !== 0) {
          this.playTime = this.#currentTriggerIndex / this.frequency;
        }
      }
      return super.OnModified(value);
    }

    /** Carbon EveChildEffectPropagator::ManageTriggers (cpp:140-167): fire an
     * instance for every processed locator the growing trigger sphere has
     * swallowed; the list is distance-sorted so the scan stops at the first
     * locator still outside. */
    ManageTriggers() {
      if (!this.triggerSphereRadiusCurve) {
        return;
      }
      if (!this.effect) {
        return;
      }
      let currentRadSqr = Number(this.triggerSphereRadiusCurve.GetValueAt?.(this.playTime) ?? 0) * this.triggerSphereScalarMulti;
      currentRadSqr = currentRadSqr * currentRadSqr;
      const records = this.#processedTransforms;
      for (let index = this.#currentTriggerIndex; index < records.length; index++) {
        const record = records[index];
        if (record.sqrDistToSphereCenter < currentRadSqr) {
          this.effect.CreateInstance?.(record.scale, record.rotation, record.position);
          this.#currentTriggerIndex++;
        } else {
          break;
        }
      }
    }

    /**
     * Sync-side frame update (Carbon EveChildEffectPropagator::UpdateSyncronous,
     * cpp:173-231): consume a pending trigger (process + sort the locators and
     * restart playback, seeding the interval-trigger history), forward the sync
     * tick to the effect container, then advance the active trigger method.
     * Carbon deliberately does NOT call the EveChildContainer base here - the
     * effect container replaces the child fan-out.
     * @param {Object} updateContext - frame context (EveUpdateContext)
     * @param {EveChildUpdateParams} params
     */
    UpdateSyncronous(updateContext, params) {
      if (this.trigger) {
        this.ProcessLocators(params?.spaceObjectParent ?? null);
        this.Play();
        if (this.triggerMethood === _EveChildEffectPropag.TriggerType.INTERVAL_TRIGGERS) {
          // Carbon (cpp:180-189): the last-triggered ring holds
          // floor(effectDuration * frequency) slots primed with -1.
          const size = Math.max(Math.floor(this.durationPerEffect * this.frequency), 0);
          this.#lastTriggered.length = 0;
          for (let index = 0; index < size; index++) {
            this.#lastTriggered.push(-1);
          }
        }
      }
      this.effect?.UpdateSyncronous?.(updateContext, params);
      if (!this.isPlaying) {
        return;
      }
      switch (this.triggerMethood) {
        case _EveChildEffectPropag.TriggerType.TRIGGER_SPHERE_CURVE:
          this.UpdateTriggerCurve(updateContext);
          break;
        case _EveChildEffectPropag.TriggerType.INTERVAL_TRIGGERS:
          if (this.frequency !== 0) {
            this.UpdateTriggerInterval(updateContext);
          } else {
            this.Stop();
          }
          break;
        case _EveChildEffectPropag.TriggerType.INSTANT_PERMANENT:
          this.playTime += Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaT ?? 0);
          if (this.#currentTriggerIndex === 0) {
            for (const record of this.#processedTransforms) {
              this.effect?.CreateInstance?.(record.scale, record.rotation, record.position);
            }
            this.#currentTriggerIndex++;
          }
          break;
      }
    }

    /** Carbon EveChildEffectPropagator::UpdateTriggerCurve (cpp:233-273):
     * advance playTime, let the trigger sphere fire instances, then handle the
     * end of the curve (skip cleanup, delayed replay with re-randomized locator
     * sizes, or stop). */
    UpdateTriggerCurve(updateContext) {
      const dt = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaT ?? 0);
      this.playTime += dt;
      if (this.effect) {
        this.ManageTriggers();
      }
      if (!this.triggerSphereRadiusCurve) {
        this.Stop();
        return;
      }
      if (this.playTime > Number(this.triggerSphereRadiusCurve.Length?.() ?? 0)) {
        if (this.skipCleanup) {
          return;
        }
        if (this.replayAfterDelay) {
          if (this.#delayTimer > 0) {
            this.#delayTimer -= dt;
          } else {
            this.RecalculateLocatorSizes();
            this.Play();
          }
        } else {
          this.Stop();
        }
      }
    }

    /** Carbon EveChildEffectPropagator::UpdateTriggerInterval (cpp:275-317):
     * frequency-paced spawning from smart-random locators with a spawn cap,
     * plus paced deletion of expired instances (PopFront) until the loop
     * drains. */
    UpdateTriggerInterval(updateContext) {
      const dt = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaT ?? 0);
      this.playTime += dt;
      if (this.#processedTransforms.length === 0) {
        return;
      }
      if (this.stopAfterNumTriggers > 0 && this.durationPerEffect !== -1 && this.playTime > this.stopAfterNumTriggers / this.frequency + this.durationPerEffect) {
        this.Stop();
        return;
      }

      // Triggers based on the frequency interval unless the maximum amount of
      // spawns has been reached (cpp:291-304).
      if (this.playTime > this.#currentTriggerIndex / this.frequency && (this.#currentTriggerIndex < this.stopAfterNumTriggers || this.stopAfterNumTriggers < 0)) {
        const locatorIndex = this.GetSmartRandomLocatorIndex();
        if (this.#lastTriggered.length) {
          this.#lastTriggered.shift();
        }
        this.#lastTriggered.push(locatorIndex);
        const record = this.#processedTransforms[locatorIndex];
        this.effect?.CreateInstance?.(record.scale, record.rotation, record.position);
        this.#currentTriggerIndex++;
      }
      if (this.durationPerEffect !== -1 && this.playTime > this.#numDeleted / this.frequency + this.durationPerEffect) {
        this.effect?.PopFront?.();
        this.#numDeleted++;
        if (this.#numDeleted === this.#currentTriggerIndex) {
          // Prevent debug rendering on a running loop after it finishes (see
          // InstanceContainers) - cpp:313.
          this.#currentTriggerIndex = 0;
          this.#lastTriggered.length = 0;
        }
      }
    }

    /** Carbon EveChildEffectPropagator::GetSmartRandomLocatorIndex
     * (cpp:319-351): rejection-sample a locator index not in the recent-trigger
     * history, with Carbon's early exit when the history covers the set or the
     * spawn rate saturates 75% of the locators. */
    GetSmartRandomLocatorIndex() {
      let locatorIndex = -1;
      const ptSize = this.#processedTransforms.length;
      const ltSize = this.#lastTriggered.length;
      if (ltSize >= ptSize || this.frequency * this.durationPerEffect > 0.75 * ptSize) {
        locatorIndex = Math.floor(Math.random() * ptSize);
      } else {
        // Carbon (cpp:331-336): this loop should rarely repeat; the early exit
        // above bounds the bad case (small locator set, long duration, frequent
        // triggers).
        while (locatorIndex === -1) {
          locatorIndex = Math.floor(Math.random() * ptSize);
          for (let index = 0; index < ltSize; index++) {
            if (locatorIndex === this.#lastTriggered[index]) {
              locatorIndex = -1;
              break;
            }
          }
        }
      }
      return locatorIndex;
    }

    /**
     * Per-frame async update (Carbon EveChildEffectPropagator::UpdateAsyncronous,
     * cpp:353-366): gate on IsRendering, tick the effect container, then run the
     * EveChildContainer base (which rebuilds the world transform - the Carbon
     * row-vector local * parent composition lives in
     * EveChildTransform.UpdateTransform as mat4.multiply(world, parent, local)).
     * @param {Object} updateContext - frame context (EveUpdateContext)
     * @param {EveChildUpdateParams} params
     * @returns {Float32Array} worldTransform
     */
    UpdateAsyncronous(updateContext, params) {
      if (!this.IsRendering()) {
        return this.worldTransform;
      }
      this.effect?.UpdateAsyncronous?.(updateContext, params);
      return super.UpdateAsyncronous(updateContext, params);
    }

    /** Carbon EveChildEffectPropagator::UpdateVisibility (cpp:389-395): the
     * effect container alone receives the visibility tick (no base fan-out). */
    UpdateVisibility(updateContext, parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH) {
      this.effect?.UpdateVisibility?.(updateContext, parentTransform, parentLod);
    }

    /** Carbon EveChildEffectPropagator::GetRenderables (cpp:397-408): nothing
     * renders until the first trigger fired; then the effect container
     * contributes its instances. */
    GetRenderables(out = []) {
      if (this.#currentTriggerIndex === 0) {
        return out;
      }
      this.effect?.GetRenderables?.(out);
      return out;
    }

    /** Carbon EveChildEffectPropagator::ProcessLocalLocators (cpp:410-438):
     * sample the owned locator set through the completeness gate; the trigger
     * sphere scalar becomes twice the farthest locator distance. */
    ProcessLocalLocators() {
      if (!this.localLocators) {
        return;
      }
      const locators = this.localLocators.GetLocators?.() ?? this.localLocators.locators ?? [];
      this.triggerSphereScalarMulti = 0;
      for (const locator of locators) {
        if (Math.random() > this.completeness) {
          continue;
        }
        const record = NewTransformRecord();
        vec3.copy(record.position, locator.position);
        const lengthSq = vec3.squaredLength(record.position);
        this.triggerSphereScalarMulti = Math.max(this.triggerSphereScalarMulti, lengthSq);
        // Locator directions persist as packed quaternions; copied verbatim
        // (Carbon t.rotation = it->direction - no composition).
        quat.copy(record.rotation, locator.direction);
        const rand = this.randScaleMin + Math.random() * (this.randScaleMax - this.randScaleMin);
        // Carbon t.scale = m_effectScaling * rand - scalar-vector scale.
        vec3.scale(record.scale, this.effectScaling, rand);
        this.#processedTransforms.push(record);
      }
      this.triggerSphereScalarMulti = Math.sqrt(this.triggerSphereScalarMulti) * 2;
    }

    /** Carbon EveChildEffectPropagator::ProcessRefLocators (cpp:440-478): pull
     * the named locator set (default "damage") from the space-object parent and
     * scale the trigger sphere by the parent's bounding-sphere radius. */
    ProcessRefLocators(parent) {
      if (this.locatorSetName === "") {
        this.locatorSetName = "damage";
      }
      let locators = null;
      if (typeof parent?.GetLocatorsForSet === "function" && typeof parent?.GetBoundingSphere === "function") {
        locators = parent.GetLocatorsForSet(this.locatorSetName);
        vec4.set(BOUNDS_SCRATCH, 0, 0, 0, 0);
        parent.GetBoundingSphere(BOUNDS_SCRATCH);
        this.triggerSphereScalarMulti = BOUNDS_SCRATCH[3];
      } else {
        return;
      }
      if (locators) {
        for (const locator of locators) {
          if (Math.random() > this.completeness) {
            continue;
          }
          const record = NewTransformRecord();
          vec3.copy(record.position, locator.position);
          quat.copy(record.rotation, locator.direction);
          const rand = this.randScaleMin + Math.random() * (this.randScaleMax - this.randScaleMin);
          // Carbon t.scale = m_effectScaling * rand - scalar-vector scale.
          vec3.scale(record.scale, this.effectScaling, rand);
          this.#processedTransforms.push(record);
        }
      }
    }

    /** Carbon EveChildEffectPropagator::ProcessRandomSpreadLocators
     * (cpp:480-506): uniform points on the unit sphere pushed out by a
     * closeness-biased distance inside [minRangeThreshold, range]; the packed
     * direction quaternion comes from TriQuaternionDirVector. */
    ProcessRandomSpreadLocators() {
      const count = Number(this.numTriggers);
      for (let index = 0; index < count; index++) {
        if (Math.random() > this.completeness) {
          continue;
        }

        // Carbon (cpp:489-491): dist starts uniform, is pulled toward the
        // closeness preference by a second uniform draw, then maps into
        // [minRangeThreshold, range].
        let dist = Math.random();
        dist += (this.ClosenessPreference - dist) * Math.random();
        dist = this.minRangeThreshold + (this.range - this.minRangeThreshold) * dist;

        // Carbon (cpp:493-495): uniform unit-sphere direction from (a, z).
        const a = 2 * Math.PI * Math.random();
        const z = Math.random() * 2 - 1;
        const s = Math.sqrt(1 - z * z);
        const record = NewTransformRecord();
        // Carbon t.position = angle * dist - scalar-vector scale.
        vec3.set(record.position, s * Math.cos(a) * dist, s * Math.sin(a) * dist, z * dist);
        // TriQuaternionDirVector(&t.rotation, &angle) - packed direction, no
        // quaternion composition.
        vec3.set(SPHERE_CENTER_SCRATCH, s * Math.cos(a), s * Math.sin(a), z);
        TriQuaternionDirVector(record.rotation, SPHERE_CENTER_SCRATCH);
        const rand = this.randScaleMin + Math.random() * (this.randScaleMax - this.randScaleMin);
        // Carbon t.scale = m_effectScaling * rand - scalar-vector scale.
        vec3.scale(record.scale, this.effectScaling, rand);
        this.#processedTransforms.push(record);
      }
      this.triggerSphereScalarMulti = this.range;
    }

    /** Carbon EveChildEffectPropagator::ProcessLocators (cpp:513-540): rebuild
     * the processed-locator list for the selected propagation type, stop when
     * nothing survived the completeness gate, then distance-sort. */
    ProcessLocators(parent = null) {
      this.#processedTransforms.length = 0;
      switch (this.propagationType) {
        case _EveChildEffectPropag.PropagationType.LOCAL_LOCATORS:
          this.ProcessLocalLocators();
          break;
        case _EveChildEffectPropag.PropagationType.LOCATOR_SET_BY_REF:
          this.ProcessRefLocators(parent);
          break;
        case _EveChildEffectPropag.PropagationType.RANDOM_SPREAD:
          this.ProcessRandomSpreadLocators();
          break;
      }
      if (this.#processedTransforms.length === 0) {
        this.Stop();
        return;
      }
      this.DistanceSortLocators();
    }

    /** Carbon EveChildEffectPropagator::RecalculateLocatorSizes (cpp:542-549):
     * re-randomize the per-locator scale for a delayed replay. */
    RecalculateLocatorSizes() {
      for (const record of this.#processedTransforms) {
        const rand = this.randScaleMin + Math.random() * (this.randScaleMax - this.randScaleMin);
        // Carbon it->scale = m_effectScaling * rand - scalar-vector scale.
        vec3.scale(record.scale, this.effectScaling, rand);
      }
    }

    /** Carbon EveChildEffectPropagator::DistanceSortLocators (cpp:556-564):
     * squared distance of every locator to the scaled trigger-sphere center,
     * then an ascending sort so ManageTriggers can early-out. */
    DistanceSortLocators() {
      // Carbon: it->position - m_triggerSphereOffset * m_triggerSphereScalarMulti
      // - scalar-vector scale plus a vector difference, no matrix composition.
      vec3.scale(SPHERE_CENTER_SCRATCH, this.triggerSphereOffset, this.triggerSphereScalarMulti);
      for (const record of this.#processedTransforms) {
        record.sqrDistToSphereCenter = vec3.squaredDistance(record.position, SPHERE_CENTER_SCRATCH);
      }
      this.#processedTransforms.sort(SortByCircleDist);
    }

    /** Carbon EveChildEffectPropagator::GetEffect (cpp:640-643). */
    GetEffect() {
      return this.effect;
    }

    /** Carbon EveChildEffectPropagator::SetEffect (cpp:645-654): Carbon brackets
     * the swap with UnRegisterComponents/RegisterComponents against the scene
     * component registry. */
    SetEffect(effect) {
      this.effect = effect ?? null;
    }

    /** Carbon EveChildEffectPropagator::SetControllerVariable (cpp:656-662):
     * the effect container alone receives the variable (no base fan-out). */
    SetControllerVariable(name, value) {
      this.effect?.SetControllerVariable?.(String(name ?? ""), Number(value));
    }

    /** Carbon EveChildEffectPropagator::RegisterComponents (cpp:45-51) registers
     * the effect with the scene component registry - unported system. */
    RegisterComponents(..._args) {
      throw new Error("EveChildEffectPropagator.RegisterComponents is not implemented in CarbonEngineJS (component registry unported).");
    }

    /** Carbon EveChildEffectPropagator::UnRegisterComponents (cpp:53-59)
     * unregisters the effect from the scene component registry - unported
     * system. */
    UnRegisterComponents(..._args) {
      throw new Error("EveChildEffectPropagator.UnRegisterComponents is not implemented in CarbonEngineJS (component registry unported).");
    }
  }];
  PropagationType = PropagationType;
  TriggerType = TriggerType;
  constructor() {
    super(_EveChildEffectPropag), _initClass();
  }
}();

export { _EveChildEffectPropag as EveChildEffectPropagator };
//# sourceMappingURL=EveChildEffectPropagator.js.map
