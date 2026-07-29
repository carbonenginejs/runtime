// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   audio/src/SoundPrioritization.h + SoundPrioritization.cpp (not Blue-exposed; pure logic port)
// Hand-owned since 2026-07-18; the generator skips this file.
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

// Audio2.h:19 - the listener's fixed game-object id.
export const LISTENER_GAME_OBJ_ID = 4;
const FLOAT_MAX = 3.4028234663852886e38;

function DefaultSettings()
{
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
@type.define({ className: "SoundPrioritization", family: "audio" })
export class SoundPrioritization extends CjsModel
{

  #settings = DefaultSettings();

  #gameObjects = [];

  #listener = null;

  #audioCullingEnabled = true;

  /** Carbon method RegisterGameObject: listener recognized by its fixed id. */
  @carbon.method
  @impl.implemented
  RegisterGameObject(object)
  {
    if (!object)
    {
      return;
    }
    this.#gameObjects.push(object);
    if (object.GetID() === LISTENER_GAME_OBJ_ID)
    {
      this.#listener = object;
    }
  }

  /** Carbon method UnregisterGameObject (by id). */
  @carbon.method
  @impl.implemented
  UnregisterGameObject(objectID)
  {
    if (this.#listener && this.#listener.GetID() === objectID)
    {
      this.#listener = null;
    }
    this.#gameObjects = this.#gameObjects.filter(object => object.GetID() !== objectID);
  }

  // Carbon quirk preserved: the strict `>` keeps maxAwakeGameObjects + 1
  // objects awake (SoundPrioritization.cpp:146-171). Do not "fix".
  /** Carbon method CullAudio: distance + weight every object, sort ascending, wake the top set. */
  @carbon.method
  @impl.implemented
  CullAudio(now)
  {
    if (!this.#audioCullingEnabled || !this.#gameObjects.length || !this.#listener)
    {
      return;
    }
    const listenerPosition = this.#listener.GetPosition();
    for (const gameObject of this.#gameObjects)
    {
      if (gameObject !== this.#listener)
      {
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
    for (const gameObject of this.#gameObjects)
    {
      if (numAwake > this.#settings.maxAwakeGameObjects)
      {
        if (!gameObject.IsCulled())
        {
          gameObject.Cull();
        }
      }
      else
      {
        if (gameObject.IsCulled())
        {
          gameObject.Wake();
        }
        numAwake++;
      }
    }
  }

  /** Carbon method ResetCullingSettings: restore constructor defaults. */
  @carbon.method
  @impl.implemented
  ResetCullingSettings()
  {
    this.#settings = DefaultSettings();
  }

  /** Carbon method GetAudioCullingEnabled. */
  @carbon.method
  @impl.implemented
  GetAudioCullingEnabled()
  {
    return this.#audioCullingEnabled;
  }

  /** Carbon method SetAudioCullingEnabled. */
  @carbon.method
  @impl.implemented
  SetAudioCullingEnabled(enabled)
  {
    this.#audioCullingEnabled = !!enabled;
  }

  /** Carbon method EnableAudioCulling. */
  @carbon.method
  @impl.implemented
  EnableAudioCulling()
  {
    this.#audioCullingEnabled = true;
  }

  /** Carbon method DisableAudioCulling: wake every culled object before disabling. */
  @carbon.method
  @impl.implemented
  DisableAudioCulling()
  {
    for (const object of this.#gameObjects)
    {
      if (object.IsCulled?.())
      {
        object.Wake?.();
      }
    }
    this.#audioCullingEnabled = false;
  }

  // Carbon asymmetry preserved: weight getters return weightMultiplier x the
  // stored raw field; setters store raw (SoundPrioritization.cpp:228-296).
  /** Carbon method GetMaxAwakeGameObjects (plain, no multiply). */
  @carbon.method
  @impl.implemented
  GetMaxAwakeGameObjects()
  {
    return this.#settings.maxAwakeGameObjects;
  }

  /** Carbon method SetMaxAwakeGameObjects. */
  @carbon.method
  @impl.implemented
  SetMaxAwakeGameObjects(value)
  {
    this.#settings.maxAwakeGameObjects = value;
  }

  /** Carbon method GetOneShotWindow (ms, plain). */
  @carbon.method
  @impl.implemented
  GetOneShotWindow()
  {
    return this.#settings.oneShotWindow;
  }

  /** Carbon method SetOneShotWindow. */
  @carbon.method
  @impl.implemented
  SetOneShotWindow(value)
  {
    this.#settings.oneShotWindow = value;
  }

  /** Carbon method GetWeightMultiplier (plain). */
  @carbon.method
  @impl.implemented
  GetWeightMultiplier()
  {
    return this.#settings.weightMultiplier;
  }

  /** Carbon method SetWeightMultiplier. */
  @carbon.method
  @impl.implemented
  SetWeightMultiplier(value)
  {
    this.#settings.weightMultiplier = value;
  }

  /** Carbon method GetPlayingVitalSoundWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetPlayingVitalSoundWeight()
  {
    return this.#settings.weightMultiplier * this.#settings.playingVitalSoundWeight;
  }

  /** Carbon method SetPlayingVitalSoundWeight (raw). */
  @carbon.method
  @impl.implemented
  SetPlayingVitalSoundWeight(value)
  {
    this.#settings.playingVitalSoundWeight = value;
  }

  /** Carbon method GetPlaying2DWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetPlaying2DWeight()
  {
    return this.#settings.weightMultiplier * this.#settings.playing2DWeight;
  }

  /** Carbon method SetPlaying2DWeight (raw). */
  @carbon.method
  @impl.implemented
  SetPlaying2DWeight(value)
  {
    this.#settings.playing2DWeight = value;
  }

  /** Carbon method GetRangeWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetRangeWeight()
  {
    return this.#settings.weightMultiplier * this.#settings.rangeWeight;
  }

  /** Carbon method SetRangeWeight (raw). */
  @carbon.method
  @impl.implemented
  SetRangeWeight(value)
  {
    this.#settings.rangeWeight = value;
  }

  /** Carbon method GetPlayingEventsWeight (multiplied activeSoundsWeight). */
  @carbon.method
  @impl.implemented
  GetPlayingEventsWeight()
  {
    return this.#settings.weightMultiplier * this.#settings.activeSoundsWeight;
  }

  /** Carbon method SetPlayingEventsWeight (raw). */
  @carbon.method
  @impl.implemented
  SetPlayingEventsWeight(value)
  {
    this.#settings.activeSoundsWeight = value;
  }

  /** Carbon method GetWaitingOneShotWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetWaitingOneShotWeight()
  {
    return this.#settings.weightMultiplier * this.#settings.waitingOneShotWeight;
  }

  /** Carbon method SetWaitingOneShotWeight (raw). */
  @carbon.method
  @impl.implemented
  SetWaitingOneShotWeight(value)
  {
    this.#settings.waitingOneShotWeight = value;
  }

  /** Carbon method GetVisibleWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetVisibleWeight()
  {
    return this.#settings.weightMultiplier * this.#settings.visibleWeight;
  }

  /** Carbon method SetVisibleWeight (raw). */
  @carbon.method
  @impl.implemented
  SetVisibleWeight(value)
  {
    this.#settings.visibleWeight = value;
  }

  /** Carbon method GetUsedEmitterWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetUsedEmitterWeight()
  {
    return this.#settings.weightMultiplier * this.#settings.usedEmitterWeight;
  }

  /** Carbon method SetUsedEmitterWeight (raw). */
  @carbon.method
  @impl.implemented
  SetUsedEmitterWeight(value)
  {
    this.#settings.usedEmitterWeight = value;
  }

  /** Carbon method GetPrioritizedAudioObjects: defensive current-order snapshot. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns a const vector reference; CarbonEngineJS returns a defensive array.")
  GetPrioritizedAudioObjects()
  {
    return this.#gameObjects.slice();
  }

  /** Carbon static CalculateObjectWeight: lower weight = higher priority; pure subtraction, no clamps. */
  @carbon.renamed("CalculateObjectWeight")
  @impl.implemented
  static calculateObjectWeight(distanceSq, isMuted, isInRange, isUsed, isVisible, isPlaying2D, isPlayingVital,
    additionalWeight, activeEventCount, waitingOneShotWeight, usedEmitterWeight, rangeWeight,
    activeSoundsWeight, visibleWeight, playing2DWeight, playingVitalSoundWeight)
  {
    if (isMuted)
    {
      return FLOAT_MAX - additionalWeight;
    }
    return (distanceSq
      - (activeEventCount > 0 ? activeSoundsWeight : 0)
      - (isInRange ? rangeWeight : 0)
      - (isVisible ? visibleWeight : 0)
      - (isUsed ? usedEmitterWeight : 0)
      - waitingOneShotWeight
      - (isPlaying2D ? playing2DWeight : 0)
      - (isPlayingVital ? playingVitalSoundWeight : 0))
      - additionalWeight;
  }

}
