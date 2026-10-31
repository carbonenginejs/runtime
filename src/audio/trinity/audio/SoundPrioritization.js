// Source: audio/src/SoundPrioritization.h + SoundPrioritization.cpp (not Blue-exposed; pure logic port)
// Hand-owned since 2026-07-18; the generator skips this file.
import { meta } from "#schema";

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
@meta.carbon("SoundPrioritization")
export class SoundPrioritization
{

  _settings = DefaultSettings();

  _gameObjects = [];

  _listener = null;

  _audioCullingEnabled = true;

  /**
   * Carbon method RegisterGameObject: listener recognized by its fixed id.
   *
   * @implemented
   */
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

  /**
   * Carbon method UnregisterGameObject (by id).
   *
   * @implemented
   */
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
  /**
   * Carbon method CullAudio: distance + weight every object, sort ascending, wake the top set.
   *
   * @implemented
   */
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

  /**
   * Carbon method ResetCullingSettings: restore constructor defaults.
   *
   * @implemented
   */
  ResetCullingSettings()
  {
    this._settings = DefaultSettings();
  }

  /**
   * Carbon method GetAudioCullingEnabled.
   *
   * @implemented
   */
  GetAudioCullingEnabled()
  {
    return this._audioCullingEnabled;
  }

  /**
   * Carbon method SetAudioCullingEnabled.
   *
   * @cjs
   * @implemented
   */
  SetAudioCullingEnabled(enabled)
  {
    this._audioCullingEnabled = !!enabled;
  }

  /**
   * Carbon method EnableAudioCulling.
   *
   * @implemented
   */
  EnableAudioCulling()
  {
    this._audioCullingEnabled = true;
  }

  /**
   * Wakes every culled registered object before disabling prioritization.
   * Carbon DisableAudioCulling (SoundPrioritization.cpp:180-194).
   *
   * @implemented
   * @returns {void}
   */
  DisableAudioCulling()
  {
    for (const object of this._gameObjects)
    {
      if (object.IsCulled())
      {
        object.Wake();
      }
    }
    this._audioCullingEnabled = false;
  }

  // Carbon asymmetry preserved: weight getters return weightMultiplier x the
  // stored raw field; setters store raw (SoundPrioritization.cpp:228-296).
  /**
   * Carbon method GetMaxAwakeGameObjects (plain, no multiply).
   *
   * @implemented
   */
  GetMaxAwakeGameObjects()
  {
    return this._settings.maxAwakeGameObjects;
  }

  /**
   * Carbon method SetMaxAwakeGameObjects.
   *
   * @implemented
   */
  SetMaxAwakeGameObjects(value)
  {
    this._settings.maxAwakeGameObjects = value;
  }

  /**
   * Carbon method GetOneShotWindow (ms, plain).
   *
   * @implemented
   */
  GetOneShotWindow()
  {
    return this._settings.oneShotWindow;
  }

  /**
   * Carbon method SetOneShotWindow.
   *
   * @implemented
   */
  SetOneShotWindow(value)
  {
    this._settings.oneShotWindow = value;
  }

  /**
   * Carbon method GetWeightMultiplier (plain).
   *
   * @implemented
   */
  GetWeightMultiplier()
  {
    return this._settings.weightMultiplier;
  }

  /**
   * Carbon method SetWeightMultiplier.
   *
   * @implemented
   */
  SetWeightMultiplier(value)
  {
    this._settings.weightMultiplier = value;
  }

  /**
   * Carbon method GetPlayingVitalSoundWeight (multiplied).
   *
   * @implemented
   */
  GetPlayingVitalSoundWeight()
  {
    return this._settings.weightMultiplier * this._settings.playingVitalSoundWeight;
  }

  /**
   * Carbon method SetPlayingVitalSoundWeight (raw).
   *
   * @implemented
   */
  SetPlayingVitalSoundWeight(value)
  {
    this._settings.playingVitalSoundWeight = value;
  }

  /**
   * Carbon method GetPlaying2DWeight (multiplied).
   *
   * @implemented
   */
  GetPlaying2DWeight()
  {
    return this._settings.weightMultiplier * this._settings.playing2DWeight;
  }

  /**
   * Carbon method SetPlaying2DWeight (raw).
   *
   * @implemented
   */
  SetPlaying2DWeight(value)
  {
    this._settings.playing2DWeight = value;
  }

  /**
   * Carbon method GetRangeWeight (multiplied).
   *
   * @implemented
   */
  GetRangeWeight()
  {
    return this._settings.weightMultiplier * this._settings.rangeWeight;
  }

  /**
   * Carbon method SetRangeWeight (raw).
   *
   * @implemented
   */
  SetRangeWeight(value)
  {
    this._settings.rangeWeight = value;
  }

  /**
   * Carbon method GetPlayingEventsWeight (multiplied activeSoundsWeight).
   *
   * @implemented
   */
  GetPlayingEventsWeight()
  {
    return this._settings.weightMultiplier * this._settings.activeSoundsWeight;
  }

  /**
   * Carbon method SetPlayingEventsWeight (raw).
   *
   * @implemented
   */
  SetPlayingEventsWeight(value)
  {
    this._settings.activeSoundsWeight = value;
  }

  /**
   * Carbon method GetWaitingOneShotWeight (multiplied).
   *
   * @implemented
   */
  GetWaitingOneShotWeight()
  {
    return this._settings.weightMultiplier * this._settings.waitingOneShotWeight;
  }

  /**
   * Carbon method SetWaitingOneShotWeight (raw).
   *
   * @implemented
   */
  SetWaitingOneShotWeight(value)
  {
    this._settings.waitingOneShotWeight = value;
  }

  /**
   * Carbon method GetVisibleWeight (multiplied).
   *
   * @implemented
   */
  GetVisibleWeight()
  {
    return this._settings.weightMultiplier * this._settings.visibleWeight;
  }

  /**
   * Carbon method SetVisibleWeight (raw).
   *
   * @implemented
   */
  SetVisibleWeight(value)
  {
    this._settings.visibleWeight = value;
  }

  /**
   * Carbon method GetUsedEmitterWeight (multiplied).
   *
   * @implemented
   */
  GetUsedEmitterWeight()
  {
    return this._settings.weightMultiplier * this._settings.usedEmitterWeight;
  }

  /**
   * Carbon method SetUsedEmitterWeight (raw).
   *
   * @implemented
   */
  SetUsedEmitterWeight(value)
  {
    this._settings.usedEmitterWeight = value;
  }

  /**
   * Carbon method GetPrioritizedAudioObjects: defensive current-order snapshot.
   *
   * @adapted Carbon returns a const vector reference; CarbonEngineJS returns a defensive
   *   array.
   */
  GetPrioritizedAudioObjects()
  {
    return this._gameObjects.slice();
  }

  /**
   * Carbon method ForEachAwakeAudioObject: visits every non-culled tracked object. Source: SoundPrioritization.h:264-274 (commit c9b986d).
   *
   * @implemented
   */
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

  /**
   * Carbon static CalculateObjectWeight: lower weight = higher priority; pure subtraction, no clamps.
   *
   * @implemented
   */

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
