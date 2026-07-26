import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';

let _initProto, _initClass, _init_triggerChance, _init_extra_triggerChance, _init_planeRotation, _init_extra_planeRotation, _init_startSequenceAtFirstTrigger, _init_extra_startSequenceAtFirstTrigger, _init_playDuration, _init_extra_playDuration, _init_delayBeforeActivation, _init_extra_delayBeforeActivation, _init_reversePlaneAnimation, _init_extra_reversePlaneAnimation;

/** EveDistributionSpawnerTriggerPlane (eve/distribution/spawners) - generated from schema shapeHash f7abe103.... */
let _EveDistributionSpawn;
class EveDistributionSpawnerTriggerPlane extends CjsModel {
  static {
    ({
      e: [_init_triggerChance, _init_extra_triggerChance, _init_planeRotation, _init_extra_planeRotation, _init_startSequenceAtFirstTrigger, _init_extra_startSequenceAtFirstTrigger, _init_playDuration, _init_extra_playDuration, _init_delayBeforeActivation, _init_extra_delayBeforeActivation, _init_reversePlaneAnimation, _init_extra_reversePlaneAnimation, _initProto],
      c: [_EveDistributionSpawn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionSpawnerTriggerPlane",
      family: "eve/distribution/spawners"
    })], [[[io, io.persist, type, type.float32], 16, "triggerChance"], [[io, io.persist, type, type.quat], 16, "planeRotation"], [[io, io.persist, type, type.boolean], 16, "startSequenceAtFirstTrigger"], [[io, io.persist, type, type.float32], 16, "playDuration"], [[io, io.persist, type, type.float32], 16, "delayBeforeActivation"], [[io, io.persist, type, type.boolean], 16, "reversePlaneAnimation"], [[carbon, carbon.method, impl, impl.adapted], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "Restart"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "SetControllerVariable"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_reversePlaneAnimation(this);
  }
  #distSortedIndexes = (_initProto(this), []);
  #currentPlayTime = 0;
  #currentTrigger = 0;

  /** m_triggerChance (float) [READWRITE, PERSIST] */
  triggerChance = _init_triggerChance(this, 1);

  /** m_planeRotation (Quaternion) [READWRITE, PERSIST] */
  planeRotation = (_init_extra_triggerChance(this), _init_planeRotation(this, quat.create()));

  /** m_startSequenceAtFirstTrigger (bool) [READWRITE, PERSIST] */
  startSequenceAtFirstTrigger = (_init_extra_planeRotation(this), _init_startSequenceAtFirstTrigger(this, true));

  /** m_playDuration (float) [READWRITE, PERSIST] */
  playDuration = (_init_extra_startSequenceAtFirstTrigger(this), _init_playDuration(this, 1));

  /** m_delayBeforeActivation (float) [READWRITE, PERSIST] */
  delayBeforeActivation = (_init_extra_playDuration(this), _init_delayBeforeActivation(this, 0));

  /** m_reversePlaneAnimation (bool) [READWRITE, PERSIST] */
  reversePlaneAnimation = (_init_extra_delayBeforeActivation(this), _init_reversePlaneAnimation(this, false));

  /**
   * Sorts the pooled placements by their distance along the plane normal and
   * normalizes those distances into the 0..1 sweep order the update walks, then
   * restarts.
   */
  Reset(placements) {
    if (placements.length === 0) {
      return;
    }
    const normal = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), this.planeRotation);
    this.#distSortedIndexes.length = 0;
    for (const placement of placements) {
      const distance = vec3.dot(normal, placement.placement.initialTranslation);
      this.#distSortedIndexes.push([distance, placement.placement.uniqueID]);
    }
    this.#distSortedIndexes.sort((a, b) => a[0] - b[0]);
    const minimumDistance = this.startSequenceAtFirstTrigger ? this.#distSortedIndexes[0][0] : 0;
    const maximumDistance = Math.max(1, this.#distSortedIndexes.at(-1)[0] - minimumDistance);
    for (const trigger of this.#distSortedIndexes) {
      trigger[0] = (trigger[0] - minimumDistance) / maximumDistance;
    }
    this.Restart();
  }

  /**
   * Rewinds the sweep to its first placement, or its last when the animation is
   * reversed, and clears the play time.
   */
  Restart() {
    this.#currentTrigger = this.reversePlaneAnimation ? this.#distSortedIndexes.length - 1 : 0;
    this.#currentPlayTime = 0;
  }

  /**
   * Advances the play time and triggers every placement the sweeping plane has
   * passed, each subject to triggerChance, ending once the sorted order is
   * exhausted or the play duration elapses.
   */
  UpdateSyncronous(updateContext, _params, owner) {
    if (this.#distSortedIndexes.length === 0 || this.#currentPlayTime >= this.playDuration + this.delayBeforeActivation) {
      return;
    }
    this.#currentPlayTime += updateContext.GetDeltaT();
    if (this.#currentPlayTime < this.delayBeforeActivation) {
      return;
    }
    const normalizedPlayTime = (this.#currentPlayTime - this.delayBeforeActivation) / Math.max(0.01, this.playDuration);
    if (!this.reversePlaneAnimation) {
      while (normalizedPlayTime > this.#distSortedIndexes[this.#currentTrigger][0]) {
        if (Math.random() < this.triggerChance) {
          owner.TriggerEntityByID(this.#distSortedIndexes[this.#currentTrigger][1]);
        }
        this.#currentTrigger++;
        if (this.#currentTrigger >= this.#distSortedIndexes.length) {
          this.#currentPlayTime = this.playDuration + this.delayBeforeActivation;
          break;
        }
      }
    } else {
      while (1 - normalizedPlayTime < this.#distSortedIndexes[this.#currentTrigger][0]) {
        if (Math.random() < this.triggerChance) {
          owner.TriggerEntityByID(this.#distSortedIndexes[this.#currentTrigger][1]);
        }
        if (this.#currentTrigger === 0) {
          this.#currentPlayTime = this.playDuration + this.delayBeforeActivation;
          break;
        }
        this.#currentTrigger--;
      }
    }
  }

  /** Ignores controller variables; the sweep is purely time-driven. */
  SetControllerVariable(_name, _value) {}
  static {
    _initClass();
  }
}

export { _EveDistributionSpawn as EveDistributionSpawnerTriggerPlane };
//# sourceMappingURL=EveDistributionSpawnerTriggerPlane.js.map
