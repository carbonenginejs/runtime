// Source: audio/src/SoundPrioritization.h + SoundPrioritization.cpp (not Blue-exposed; pure logic port)
// Hand-owned since 2026-07-18; the generator skips this file.
import { carbon, impl, type } from "#schema";

// Audio2.h:19 - the listener's fixed game-object id.
export const LISTENER_GAME_OBJ_ID = 4;
// Audio2.h:21 - ids below this are reserved (UI 2, music 3, listener 4).
export const START_GAME_OBJ_COUNT = 5;

/** Whether an id belongs to a reserved built-in game object. Source: Audio2.h:24. */
export function IsReservedGameObjectID(id)
{
  return id < START_GAME_OBJ_COUNT;
}
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

/** Ranks audio game objects by weight and keeps the configured highest-priority set awake. */
@type.define({ className: "SoundPrioritization", family: "audio" })
export class SoundPrioritization
{

  _settings = DefaultSettings();

  _gameObjects = [];

  _listener = null;

  _audioCullingEnabled = true;

  /** Carbon method RegisterGameObject: listener recognized by its fixed id. */
  @carbon.method
  @impl.implemented
  RegisterGameObject(object)
  {
    if (!object)
    {
      return;
    }
    this._gameObjects.push(object);
    if (object.GetID() === LISTENER_GAME_OBJ_ID)
    {
      this._listener = object;
    }
  }

  /** Carbon method UnregisterGameObject (by id). */
  @carbon.method
  @impl.implemented
  UnregisterGameObject(objectID)
  {
    if (this._listener && this._listener.GetID() === objectID)
    {
      this._listener = null;
    }
    this._gameObjects = this._gameObjects.filter(object => object.GetID() !== objectID);
  }

  // Carbon quirk preserved: the strict `>` keeps maxAwakeGameObjects + 1
  // objects awake (SoundPrioritization.cpp:146-171). Do not "fix".
  /** Carbon method CullAudio: distance + weight every object, sort ascending, wake the top set. */
  @carbon.method
  @impl.implemented
  CullAudio(now)
  {
    if (!this._audioCullingEnabled || !this._gameObjects.length || !this._listener)
    {
      return;
    }
    const listenerPosition = this._listener.GetPosition();
    for (const gameObject of this._gameObjects)
    {
      if (gameObject !== this._listener)
      {
        const objectPosition = gameObject.GetPosition();
        const dx = objectPosition[0] - listenerPosition[0];
        const dy = objectPosition[1] - listenerPosition[1];
        const dz = objectPosition[2] - listenerPosition[2];
        gameObject.SetDistanceSqFromListener(dx * dx + dy * dy + dz * dz);
      }
      gameObject.CalculateCullingWeight(now);
    }
    this._gameObjects.sort((a, b) => a.GetCullingWeight() - b.GetCullingWeight());
    let numAwake = 0;
    for (const gameObject of this._gameObjects)
    {
      if (numAwake > this._settings.maxAwakeGameObjects)
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
    this._settings = DefaultSettings();
  }

  /** Carbon method GetAudioCullingEnabled. */
  @carbon.method
  @impl.implemented
  GetAudioCullingEnabled()
  {
    return this._audioCullingEnabled;
  }

  /** Carbon method SetAudioCullingEnabled. */
  @carbon.method
  @impl.implemented
  SetAudioCullingEnabled(enabled)
  {
    this._audioCullingEnabled = !!enabled;
  }

  /** Carbon method EnableAudioCulling. */
  @carbon.method
  @impl.implemented
  EnableAudioCulling()
  {
    this._audioCullingEnabled = true;
  }

  /** Carbon method DisableAudioCulling: wake every culled object before disabling. */
  @carbon.method
  @impl.implemented
  DisableAudioCulling()
  {
    for (const object of this._gameObjects)
    {
      if (object.IsCulled?.())
      {
        object.Wake?.();
      }
    }
    this._audioCullingEnabled = false;
  }

  // Carbon asymmetry preserved: weight getters return weightMultiplier x the
  // stored raw field; setters store raw (SoundPrioritization.cpp:228-296).
  /** Carbon method GetMaxAwakeGameObjects (plain, no multiply). */
  @carbon.method
  @impl.implemented
  GetMaxAwakeGameObjects()
  {
    return this._settings.maxAwakeGameObjects;
  }

  /** Carbon method SetMaxAwakeGameObjects. */
  @carbon.method
  @impl.implemented
  SetMaxAwakeGameObjects(value)
  {
    this._settings.maxAwakeGameObjects = value;
  }

  /** Carbon method GetOneShotWindow (ms, plain). */
  @carbon.method
  @impl.implemented
  GetOneShotWindow()
  {
    return this._settings.oneShotWindow;
  }

  /** Carbon method SetOneShotWindow. */
  @carbon.method
  @impl.implemented
  SetOneShotWindow(value)
  {
    this._settings.oneShotWindow = value;
  }

  /** Carbon method GetWeightMultiplier (plain). */
  @carbon.method
  @impl.implemented
  GetWeightMultiplier()
  {
    return this._settings.weightMultiplier;
  }

  /** Carbon method SetWeightMultiplier. */
  @carbon.method
  @impl.implemented
  SetWeightMultiplier(value)
  {
    this._settings.weightMultiplier = value;
  }

  /** Carbon method GetPlayingVitalSoundWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetPlayingVitalSoundWeight()
  {
    return this._settings.weightMultiplier * this._settings.playingVitalSoundWeight;
  }

  /** Carbon method SetPlayingVitalSoundWeight (raw). */
  @carbon.method
  @impl.implemented
  SetPlayingVitalSoundWeight(value)
  {
    this._settings.playingVitalSoundWeight = value;
  }

  /** Carbon method GetPlaying2DWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetPlaying2DWeight()
  {
    return this._settings.weightMultiplier * this._settings.playing2DWeight;
  }

  /** Carbon method SetPlaying2DWeight (raw). */
  @carbon.method
  @impl.implemented
  SetPlaying2DWeight(value)
  {
    this._settings.playing2DWeight = value;
  }

  /** Carbon method GetRangeWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetRangeWeight()
  {
    return this._settings.weightMultiplier * this._settings.rangeWeight;
  }

  /** Carbon method SetRangeWeight (raw). */
  @carbon.method
  @impl.implemented
  SetRangeWeight(value)
  {
    this._settings.rangeWeight = value;
  }

  /** Carbon method GetPlayingEventsWeight (multiplied activeSoundsWeight). */
  @carbon.method
  @impl.implemented
  GetPlayingEventsWeight()
  {
    return this._settings.weightMultiplier * this._settings.activeSoundsWeight;
  }

  /** Carbon method SetPlayingEventsWeight (raw). */
  @carbon.method
  @impl.implemented
  SetPlayingEventsWeight(value)
  {
    this._settings.activeSoundsWeight = value;
  }

  /** Carbon method GetWaitingOneShotWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetWaitingOneShotWeight()
  {
    return this._settings.weightMultiplier * this._settings.waitingOneShotWeight;
  }

  /** Carbon method SetWaitingOneShotWeight (raw). */
  @carbon.method
  @impl.implemented
  SetWaitingOneShotWeight(value)
  {
    this._settings.waitingOneShotWeight = value;
  }

  /** Carbon method GetVisibleWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetVisibleWeight()
  {
    return this._settings.weightMultiplier * this._settings.visibleWeight;
  }

  /** Carbon method SetVisibleWeight (raw). */
  @carbon.method
  @impl.implemented
  SetVisibleWeight(value)
  {
    this._settings.visibleWeight = value;
  }

  /** Carbon method GetUsedEmitterWeight (multiplied). */
  @carbon.method
  @impl.implemented
  GetUsedEmitterWeight()
  {
    return this._settings.weightMultiplier * this._settings.usedEmitterWeight;
  }

  /** Carbon method SetUsedEmitterWeight (raw). */
  @carbon.method
  @impl.implemented
  SetUsedEmitterWeight(value)
  {
    this._settings.usedEmitterWeight = value;
  }

  /** Carbon method GetPrioritizedAudioObjects: defensive current-order snapshot. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns a const vector reference; CarbonEngineJS returns a defensive array.")
  GetPrioritizedAudioObjects()
  {
    return this._gameObjects.slice();
  }

  /** Carbon method ForEachAwakeAudioObject: visits every non-culled tracked object. Source: SoundPrioritization.h:264-274 (commit c9b986d). */
  @carbon.method
  @impl.implemented
  ForEachAwakeAudioObject(visitor)
  {
    for (const gameObject of this._gameObjects)
    {
      if (!gameObject.IsCulled())
      {
        visitor(gameObject);
      }
    }
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
