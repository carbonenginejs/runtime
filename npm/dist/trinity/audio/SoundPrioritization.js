import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initStatic, _initClass;

// Audio2.h:19 - the listener's fixed game-object id.
const LISTENER_GAME_OBJ_ID = 4;
const FLOAT_MAX = 3.4028234663852886e38;
function DefaultSettings() {
  return {
    maxAwakeGameObjects: 75,
    oneShotWindow: 50,
    weightMultiplier: 10000000,
    playingVitalSoundWeight: FLOAT_MAX,
    playing2DWeight: 999,
    rangeWeight: 400,
    activeSoundsWeight: 200,
    waitingOneShotWeight: 100,
    visibleWeight: 100,
    usedEmitterWeight: 50
  };
}

/** SoundPrioritization (audio) - audio culling engine: weight, sort, keep the top set awake. */
let _SoundPrioritization;
class SoundPrioritization extends CjsModel {
  static {
    ({
      e: [_initProto, _initStatic],
      c: [_SoundPrioritization, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SoundPrioritization",
      family: "audio"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "RegisterGameObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterGameObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "CullAudio"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetCullingSettings"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAudioCullingEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAudioCullingEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "EnableAudioCulling"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisableAudioCulling"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxAwakeGameObjects"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxAwakeGameObjects"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetOneShotWindow"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOneShotWindow"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWeightMultiplier"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetWeightMultiplier"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlayingVitalSoundWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPlayingVitalSoundWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlaying2DWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPlaying2DWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetRangeWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlayingEventsWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPlayingEventsWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWaitingOneShotWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetWaitingOneShotWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVisibleWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetVisibleWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetUsedEmitterWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetUsedEmitterWeight"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a const vector reference; CarbonEngineJS returns a defensive array.")], 18, "GetPrioritizedAudioObjects"], [[void 0, carbon.renamed("CalculateObjectWeight"), impl, impl.implemented], 26, "calculateObjectWeight"]], 0, void 0, CjsModel));
    _initStatic(this);
  }
  #settings = (_initProto(this), DefaultSettings());
  #gameObjects = [];
  #listener = null;
  #audioCullingEnabled = true;

  /** Carbon method RegisterGameObject: listener recognized by its fixed id. */
  RegisterGameObject(object) {
    if (!object) {
      return;
    }
    this.#gameObjects.push(object);
    if (object.GetID() === LISTENER_GAME_OBJ_ID) {
      this.#listener = object;
    }
  }

  /** Carbon method UnregisterGameObject (by id). */
  UnregisterGameObject(objectID) {
    if (this.#listener && this.#listener.GetID() === objectID) {
      this.#listener = null;
    }
    this.#gameObjects = this.#gameObjects.filter(object => object.GetID() !== objectID);
  }

  // Carbon quirk preserved: the strict `>` keeps maxAwakeGameObjects + 1
  // objects awake (SoundPrioritization.cpp:146-171). Do not "fix".
  /** Carbon method CullAudio: distance + weight every object, sort ascending, wake the top set. */
  CullAudio(now) {
    if (!this.#audioCullingEnabled || !this.#gameObjects.length || !this.#listener) {
      return;
    }
    const listenerPosition = this.#listener.GetPosition();
    for (const gameObject of this.#gameObjects) {
      if (gameObject !== this.#listener) {
        const objectPosition = gameObject.GetPosition();
        const dx = objectPosition[0] - listenerPosition[0];
        const dy = objectPosition[1] - listenerPosition[1];
        const dz = objectPosition[2] - listenerPosition[2];
        gameObject.SetDistanceSqFromListener(dx * dx + dy * dy + dz * dz);
      }
      gameObject.CalculateCullingWeight(now);
    }
    this.#gameObjects.sort((a, b) => a.GetCullingWeight() - b.GetCullingWeight());
    let numAwake = 0;
    for (const gameObject of this.#gameObjects) {
      if (numAwake > this.#settings.maxAwakeGameObjects) {
        if (!gameObject.IsCulled()) {
          gameObject.Cull();
        }
      } else {
        if (gameObject.IsCulled()) {
          gameObject.Wake();
        }
        numAwake++;
      }
    }
  }

  /** Carbon method ResetCullingSettings: restore constructor defaults. */
  ResetCullingSettings() {
    this.#settings = DefaultSettings();
  }

  /** Carbon method GetAudioCullingEnabled. */
  GetAudioCullingEnabled() {
    return this.#audioCullingEnabled;
  }

  /** Carbon method SetAudioCullingEnabled. */
  SetAudioCullingEnabled(enabled) {
    this.#audioCullingEnabled = !!enabled;
  }

  /** Carbon method EnableAudioCulling. */
  EnableAudioCulling() {
    this.#audioCullingEnabled = true;
  }

  /** Carbon method DisableAudioCulling: wake every culled object before disabling. */
  DisableAudioCulling() {
    for (const object of this.#gameObjects) {
      if (object.IsCulled?.()) {
        object.Wake?.();
      }
    }
    this.#audioCullingEnabled = false;
  }

  // Carbon asymmetry preserved: weight getters return weightMultiplier x the
  // stored raw field; setters store raw (SoundPrioritization.cpp:228-296).
  /** Carbon method GetMaxAwakeGameObjects (plain, no multiply). */
  GetMaxAwakeGameObjects() {
    return this.#settings.maxAwakeGameObjects;
  }

  /** Carbon method SetMaxAwakeGameObjects. */
  SetMaxAwakeGameObjects(value) {
    this.#settings.maxAwakeGameObjects = value;
  }

  /** Carbon method GetOneShotWindow (ms, plain). */
  GetOneShotWindow() {
    return this.#settings.oneShotWindow;
  }

  /** Carbon method SetOneShotWindow. */
  SetOneShotWindow(value) {
    this.#settings.oneShotWindow = value;
  }

  /** Carbon method GetWeightMultiplier (plain). */
  GetWeightMultiplier() {
    return this.#settings.weightMultiplier;
  }

  /** Carbon method SetWeightMultiplier. */
  SetWeightMultiplier(value) {
    this.#settings.weightMultiplier = value;
  }

  /** Carbon method GetPlayingVitalSoundWeight (multiplied). */
  GetPlayingVitalSoundWeight() {
    return this.#settings.weightMultiplier * this.#settings.playingVitalSoundWeight;
  }

  /** Carbon method SetPlayingVitalSoundWeight (raw). */
  SetPlayingVitalSoundWeight(value) {
    this.#settings.playingVitalSoundWeight = value;
  }

  /** Carbon method GetPlaying2DWeight (multiplied). */
  GetPlaying2DWeight() {
    return this.#settings.weightMultiplier * this.#settings.playing2DWeight;
  }

  /** Carbon method SetPlaying2DWeight (raw). */
  SetPlaying2DWeight(value) {
    this.#settings.playing2DWeight = value;
  }

  /** Carbon method GetRangeWeight (multiplied). */
  GetRangeWeight() {
    return this.#settings.weightMultiplier * this.#settings.rangeWeight;
  }

  /** Carbon method SetRangeWeight (raw). */
  SetRangeWeight(value) {
    this.#settings.rangeWeight = value;
  }

  /** Carbon method GetPlayingEventsWeight (multiplied activeSoundsWeight). */
  GetPlayingEventsWeight() {
    return this.#settings.weightMultiplier * this.#settings.activeSoundsWeight;
  }

  /** Carbon method SetPlayingEventsWeight (raw). */
  SetPlayingEventsWeight(value) {
    this.#settings.activeSoundsWeight = value;
  }

  /** Carbon method GetWaitingOneShotWeight (multiplied). */
  GetWaitingOneShotWeight() {
    return this.#settings.weightMultiplier * this.#settings.waitingOneShotWeight;
  }

  /** Carbon method SetWaitingOneShotWeight (raw). */
  SetWaitingOneShotWeight(value) {
    this.#settings.waitingOneShotWeight = value;
  }

  /** Carbon method GetVisibleWeight (multiplied). */
  GetVisibleWeight() {
    return this.#settings.weightMultiplier * this.#settings.visibleWeight;
  }

  /** Carbon method SetVisibleWeight (raw). */
  SetVisibleWeight(value) {
    this.#settings.visibleWeight = value;
  }

  /** Carbon method GetUsedEmitterWeight (multiplied). */
  GetUsedEmitterWeight() {
    return this.#settings.weightMultiplier * this.#settings.usedEmitterWeight;
  }

  /** Carbon method SetUsedEmitterWeight (raw). */
  SetUsedEmitterWeight(value) {
    this.#settings.usedEmitterWeight = value;
  }

  /** Carbon method GetPrioritizedAudioObjects: defensive current-order snapshot. */
  GetPrioritizedAudioObjects() {
    return this.#gameObjects.slice();
  }

  /** Carbon static CalculateObjectWeight: lower weight = higher priority; pure subtraction, no clamps. */
  static calculateObjectWeight(distanceSq, isMuted, isInRange, isUsed, isVisible, isPlaying2D, isPlayingVital, additionalWeight, activeEventCount, waitingOneShotWeight, usedEmitterWeight, rangeWeight, activeSoundsWeight, visibleWeight, playing2DWeight, playingVitalSoundWeight) {
    if (isMuted) {
      return FLOAT_MAX - additionalWeight;
    }
    return distanceSq - (activeEventCount > 0 ? activeSoundsWeight : 0) - (isInRange ? rangeWeight : 0) - (isVisible ? visibleWeight : 0) - (isUsed ? usedEmitterWeight : 0) - waitingOneShotWeight - (isPlaying2D ? playing2DWeight : 0) - (isPlayingVital ? playingVitalSoundWeight : 0) - additionalWeight;
  }
  static {
    _initClass();
  }
}

export { LISTENER_GAME_OBJ_ID, _SoundPrioritization as SoundPrioritization };
//# sourceMappingURL=SoundPrioritization.js.map
