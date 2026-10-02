// Source: audio/src/AudManager.h + AudManager.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudManager.json.
//
// Headless behavior port of the lifecycle/bank state machine. Wwise engine
// init, RenderAudio, and device concerns route through the backend seam
// (AudGameObjResource.backend); state, bank tracking, deferred-event flush,
// monitored-parameter refcounts, and prioritization wiring are pure logic.
import { meta } from "#schema";
import { AudGameObjResource } from "./AudGameObjResource.js";
import { AudGeometry } from "./AudGeometry.js";
import { AudObstructionOcclusion } from "./AudObstructionOcclusion/index.js";
import { IsReservedGameObjectID, LISTENER_GAME_OBJ_ID, SoundPrioritization } from "./SoundPrioritization.js";
import { SpatialAudioSettings } from "./SpatialAudioSettings.js";

// C++ ComputeWwiseHashForSoundBank strips from the first "." then hashes via
// AK GetIDFromString; headless we key by the stripped name (adapted - the
// numeric hash only matters to Wwise).
function BankKey(name)
{
  const text = String(name);
  const dot = text.indexOf(".");
  return dot === -1 ? text : text.slice(0, dot);
}

/** Coordinates audio lifecycle, banks, global controls, culling, and caller-supplied obstruction/occlusion. */
@meta.define({ className: "AudManager", family: "audio" })
export class AudManager
{

  /** m_log (IAudActionLogPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("IAudActionLog")
  log = null;

  /** m_audioCullingEnabled (mutable bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  audioCullingEnabled = true;

  /** m_spatialAudioEnabled (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  spatialAudioEnabled = true;

  /** m_settings (AudSettingsPtr) [AUTHORED] */
  @meta.adapted
  @meta.reason("Carbon supplies this via UpdateSettings() outside Blue serialization; CarbonEngineJS persists it for values interchange.")
  @meta.blue.persist
  @meta.type.model("AudSettings")
  settings = null;

  // AudioState (Uninitialized/Disabled/Enabled) as lowercase strings;
  // GetStateValue preserves Carbon's 0/1/2.
  _state = "uninitialized";

  _soundBankInfoMap = new Map();

  _nextSoundBankOperation = 1;

  _monitoredParameters = new Map();

  _callbackGameObjects = new Map();

  _debugDisplayAllEmitters = false;

  _spatialAudioSettings = new SpatialAudioSettings();

  _spatialAudioGeometryBackends = new WeakSet();

  _obstructionOcclusion = new AudObstructionOcclusion(this);

  // CarbonEngineJS-original: the prioritization is a public collaborator so
  // emitters can read weights directly (see AudGameObjResource notes).
  soundPrioritization = new SoundPrioritization();

  /** Enabled convenience over the Carbon state (the guard emitters check). */
  get enabled()
  {
    return this._state === "enabled";
  }

  /** Carbon method GetState. */
  @meta.blue.method
  @meta.implemented
  GetState()
  {
    return this._state;
  }

  /** Carbon method GetStateValue: Carbon's scripting int (0/1/2). */
  @meta.blue.renamed("GetState")
  @meta.implemented
  GetStateValue()
  {
    return this._state === "uninitialized" ? 0 : this._state === "disabled" ? 1 : 2;
  }

  /** Carbon method Enable: init if needed, enable, load Init.bnk + requested banks, wake everything. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Wwise memory/stream/sound initialization is the backend's Init, while pre-enabled geometry uses optional InitSpatialAudioGeometry with Carbon's populated settings. The state machine, failure gate, bank loads, and wake pass follow audio/src/AudManager.cpp:148-180 and 848-881.")
  Enable(soundBanksToLoad = [])
  {
    if (this._state === "enabled")
    {
      return;
    }
    const backend = AudGameObjResource.backend;
    if (this._state === "uninitialized")
    {
      const repository = AudGameObjResource.staticDataRepository;
      if (!repository?.IsInitialized())
      {
        return;
      }
      // The backend seam is the sound engine: absent, or an Init that
      // explicitly fails, means Carbon's Init() failure - stay un-enabled.
      // A backend without an Init method counts as initialized.
      if (!backend || backend.Init(this.settings) === false)
      {
        return;
      }
    }
    if (!backend)
    {
      return;
    }
    if (this.GetSpatialAudioGeometryEnabled()
      && !this._InitSpatialAudioGeometry(backend))
    {
      return;
    }
    if (this._state === "uninitialized")
    {
      this._state = "disabled";
    }
    this._state = "enabled";
    this.LoadBank("Init.bnk");
    for (const bank of soundBanksToLoad)
    {
      this.LoadBank(bank);
    }
    for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects())
    {
      gameObject.Wake();
    }
  }

  /** Carbon method Disable: cull everything, clear banks, drop to disabled (engine stays initialized). */
  @meta.blue.method
  @meta.implemented
  Disable()
  {
    if (this._state !== "enabled")
    {
      return;
    }
    for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects())
    {
      gameObject.Cull();
    }
    this.ClearBanks();
    this._obstructionOcclusion.Reset();
    AudGeometry.ClearAllGeometry();
    this._state = "disabled";
  }

  /** Carbon method LoadBank: async - tracked LOADING immediately; backend callback drives LOADED. */
  @meta.blue.method
  @meta.implemented
  LoadBank(name)
  {
    if (this._state !== "enabled")
    {
      return;
    }
    const key = BankKey(name);
    const status = this.GetSoundBankStatus(name);
    if (status === "loaded" || status === "loading")
    {
      return;
    }
    const operation = this._nextSoundBankOperation++;
    this._soundBankInfoMap.set(key, {
      soundBankStatus: "loading",
      soundBankID: key,
      soundBankName: String(name),
      waitingEventsAfterLoad: [],
      operation
    });
    AudGameObjResource.backend?.LoadBank(String(name), loaded =>
    {
      if (this._soundBankInfoMap.get(key)?.operation === operation)
      {
        this.UpdateSoundBankStatus(
          key,
          loaded ? "loaded" : "not_loaded"
        );
      }
    });
  }

  /** Carbon method UnloadBank. */
  @meta.blue.method
  @meta.implemented
  UnloadBank(name)
  {
    if (this._state !== "enabled")
    {
      return;
    }
    const key = BankKey(name);
    const status = this.GetSoundBankStatus(name);
    if (status === "not_loaded" || status === "unloading")
    {
      return;
    }
    const operation = this._nextSoundBankOperation++;
    const info = this._soundBankInfoMap.get(key);

    info.operation = operation;
    this.UpdateSoundBankStatus(key, "unloading");
    AudGameObjResource.backend?.UnloadBank(String(name), () =>
    {
      if (this._soundBankInfoMap.get(key)?.operation === operation)
      {
        this._soundBankInfoMap.delete(key);
      }
    });
  }

  /** Carbon method ClearBanks. */
  @meta.blue.method
  @meta.implemented
  ClearBanks()
  {
    if (this._state !== "uninitialized")
    {
      AudGameObjResource.backend?.ClearBanks();
      this._soundBankInfoMap.clear();
    }
  }

  // The deferred-event flush: waiting events fire with bypassPrefix=true
  // exactly on the transition to LOADED, then the queue clears.
  /** Carbon method UpdateSoundBankStatus. */
  @meta.blue.method
  @meta.implemented
  UpdateSoundBankStatus(bankID, status)
  {
    const info = this._soundBankInfoMap.get(bankID);
    if (!info)
    {
      return;
    }
    info.soundBankStatus = status;
    if (status === "loaded")
    {
      for (const [emitter, eventName] of info.waitingEventsAfterLoad)
      {
        emitter?.PostEvent(eventName, true);
      }
      info.waitingEventsAfterLoad.length = 0;
    }
  }

  /** Carbon method RegisterEventAfterSoundBankLoad: queue an event on a LOADING bank (matched by name). */
  @meta.blue.method
  @meta.implemented
  RegisterEventAfterSoundBankLoad(soundBankName, eventName, emitter)
  {
    for (const info of this._soundBankInfoMap.values())
    {
      if (info.soundBankName === String(soundBankName))
      {
        info.waitingEventsAfterLoad.push([emitter, String(eventName)]);
      }
    }
  }

  /** Carbon method GetSoundBankStatus: by name or key; "not_loaded" when unknown. */
  @meta.blue.method
  @meta.implemented
  GetSoundBankStatus(name)
  {
    const byKey = this._soundBankInfoMap.get(BankKey(name));
    if (byKey)
    {
      return byKey.soundBankStatus;
    }
    for (const info of this._soundBankInfoMap.values())
    {
      if (info.soundBankName === String(name))
      {
        return info.soundBankStatus;
      }
    }
    return "not_loaded";
  }

  /** Carbon method GetLoadedSoundBanks: names with status loaded OR loading (Carbon counts both). */
  @meta.blue.method
  @meta.implemented
  GetLoadedSoundBanks()
  {
    const names = [];
    for (const info of this._soundBankInfoMap.values())
    {
      if (info.soundBankStatus === "loaded" || info.soundBankStatus === "loading")
      {
        names.push(info.soundBankName);
      }
    }
    return names;
  }

  /** Carbon method SetGlobalRTPC: pure backend passthrough, enabled-gated, no caching. */
  @meta.blue.method
  @meta.implemented
  SetGlobalRTPC(rtpcName, value)
  {
    if (this._state !== "enabled")
    {
      return false;
    }
    if (AudGameObjResource.backend?.SetGlobalRTPCValue(rtpcName, value) === false)
    {
      return false;
    }
    this.LogSetRTPC(0, rtpcName, value);
    return true;
  }

  /** Carbon method SetState (global state group): passthrough, enabled-gated. */
  @meta.blue.method
  @meta.implemented
  SetState(stateGroup, stateName)
  {
    if (this._state !== "enabled")
    {
      return false;
    }
    AudGameObjResource.backend?.SetGlobalState(stateGroup, stateName);
    this.LogSetState(stateGroup, stateName);
    return true;
  }

  /** Carbon method LogPostEvent. */
  @meta.blue.method
  @meta.implemented
  LogPostEvent(emitterID, playID, eventID, name)
  {
    this.log?.LogPostEvent?.(emitterID, playID, eventID, name);
  }

  /** Carbon method LogExecuteActionOnPlayingID. */
  @meta.blue.method
  @meta.implemented
  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    this.log?.LogExecuteActionOnPlayingID?.(emitterID, playID, action);
  }

  /** Carbon method LogSetSwitch. */
  @meta.blue.method
  @meta.implemented
  LogSetSwitch(emitterID, group, state)
  {
    this.log?.LogSetSwitch?.(emitterID, group, state);
  }

  /** Carbon method LogSetState. */
  @meta.blue.method
  @meta.implemented
  LogSetState(group, state)
  {
    this.log?.LogSetState?.(group, state);
  }

  /** Carbon method LogSetRTPC. */
  @meta.blue.method
  @meta.implemented
  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    this.log?.LogSetRTPC?.(emitterID, name, value, playID);
  }

  /** Carbon method GetSpatialAudioGeometryEnabled. */
  @meta.blue.method
  @meta.implemented
  GetSpatialAudioGeometryEnabled()
  {
    return this._spatialAudioSettings.GetSpatialAudioGeometryEnabled();
  }

  /**
   * Carbon method SetEmitterLineOfSightBlockage: stores a caller-computed blockage target.
   *
   * The host computes blockage; audio performs no ray casting. Accepted only
   * for a registered non-listener emitter while audio and the subsystem are
   * enabled. The value becomes the occlusion target (obstruction stays 0), or
   * 0 while spatial-audio geometry is enabled. A new emitter snaps to the
   * target; later changes fade at GetObstructionOcclusionFadeRate() (default
   * one unit per second, 0 is instantaneous). Changed awake values reach the
   * backend's optional SetObjectObstructionAndOcclusion(emitterID, 4,
   * obstruction, occlusion); an explicit false return is retried on the next
   * Process(), any other return is accepted.
   */
  @meta.blue.method
  @meta.implemented
  SetEmitterLineOfSightBlockage(emitterID, blockage)
  {
    return this._obstructionOcclusion.SetEmitterLineOfSightBlockage(
      emitterID,
      blockage,
    );
  }

  /** Carbon method GetEmitterOcclusion: returns the live, mid-fade value. */
  @meta.blue.method
  @meta.implemented
  GetEmitterOcclusion(emitterID)
  {
    return this._obstructionOcclusion.GetEmitterOcclusion(emitterID);
  }

  /** Carbon method ClearObstructionOcclusion: fades every target to clear. */
  @meta.blue.method
  @meta.implemented
  ClearObstructionOcclusion()
  {
    this._obstructionOcclusion.ClearAll();
  }

  /** Carbon Blue property getter for game-driven obstruction/occlusion. */
  @meta.blue.method
  @meta.implemented
  GetObstructionOcclusionEnabled()
  {
    return this._obstructionOcclusion.IsEnabled();
  }

  /** Carbon Blue property setter for game-driven obstruction/occlusion. */
  @meta.blue.method
  @meta.implemented
  SetObstructionOcclusionEnabled(value)
  {
    this._obstructionOcclusion.SetEnabled(value);
  }

  /** Carbon Blue property getter for the obstruction/occlusion fade rate. */
  @meta.blue.method
  @meta.implemented
  GetObstructionOcclusionFadeRate()
  {
    return this._obstructionOcclusion.GetFadeRate();
  }

  /** Carbon Blue property setter for the obstruction/occlusion fade rate. */
  @meta.blue.method
  @meta.implemented
  SetObstructionOcclusionFadeRate(value)
  {
    this._obstructionOcclusion.SetFadeRate(value);
  }

  /** Carbon method SetSpatialAudioGeometryEnabled. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Browser backends may expose InitSpatialAudioGeometry; the setting and geometry lifecycle remain available even though WebAudio has no native diffraction engine.")
  SetSpatialAudioGeometryEnabled(enabled)
  {
    const value = Boolean(enabled);
    if (this.GetSpatialAudioGeometryEnabled() === value)
    {
      return;
    }
    if (this._state !== "enabled")
    {
      this._spatialAudioSettings.SetSpatialAudioGeometryEnabled(value);
      return;
    }
    if (!value)
    {
      this._spatialAudioSettings.SetSpatialAudioGeometryEnabled(false);
      AudGeometry.ClearAllGeometry();
      return;
    }
    if (!this._InitSpatialAudioGeometry(AudGameObjResource.backend))
    {
      return;
    }
    this._spatialAudioSettings.SetSpatialAudioGeometryEnabled(true);
  }

  /**
   * Initializes geometry once for each browser backend lifetime.
   * Carbon retains the equivalent flag across Disable but resets it when the
   * sound engine terminates; backend identity supplies that boundary here.
   */
  _InitSpatialAudioGeometry(backend)
  {
    if (!backend
      || (typeof backend !== "object" && typeof backend !== "function"))
    {
      return false;
    }
    if (this._spatialAudioGeometryBackends.has(backend))
    {
      return true;
    }

    const settings = this._spatialAudioSettings.PopulateInitSettings({});

    if (backend.InitSpatialAudioGeometry(settings) === false)
    {
      return false;
    }
    this._spatialAudioGeometryBackends.add(backend);
    return true;
  }

  /** Returns the spatial-audio movement threshold. */
  @meta.blue.method
  @meta.implemented
  GetMovementThreshold()
  {
    return this._spatialAudioSettings.GetMovementThreshold();
  }

  /** Sets the spatial-audio movement threshold. */
  @meta.blue.method
  @meta.implemented
  SetMovementThreshold(value)
  {
    this._spatialAudioSettings.SetMovementThreshold(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  @meta.blue.method
  @meta.implemented
  GetNumberOfPrimaryRays()
  {
    return this._spatialAudioSettings.GetNumberOfPrimaryRays();
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  @meta.blue.method
  @meta.implemented
  SetNumberOfPrimaryRays(value)
  {
    this._spatialAudioSettings.SetNumberOfPrimaryRays(value);
  }

  /** Returns the maximum reflection order. */
  @meta.blue.method
  @meta.implemented
  GetMaxReflectionOrder()
  {
    return this._spatialAudioSettings.GetMaxReflectionOrder();
  }

  /** Sets the maximum reflection order. */
  @meta.blue.method
  @meta.implemented
  SetMaxReflectionOrder(value)
  {
    this._spatialAudioSettings.SetMaxReflectionOrder(value);
  }

  /** Returns the maximum diffraction order. */
  @meta.blue.method
  @meta.implemented
  GetMaxDiffractionOrder()
  {
    return this._spatialAudioSettings.GetMaxDiffractionOrder();
  }

  /** Sets the maximum diffraction order. */
  @meta.blue.method
  @meta.implemented
  SetMaxDiffractionOrder(value)
  {
    this._spatialAudioSettings.SetMaxDiffractionOrder(value);
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  @meta.blue.method
  @meta.implemented
  GetMaxEmitterRoomAuxSends()
  {
    return this._spatialAudioSettings.GetMaxEmitterRoomAuxSends();
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  @meta.blue.method
  @meta.implemented
  SetMaxEmitterRoomAuxSends(value)
  {
    this._spatialAudioSettings.SetMaxEmitterRoomAuxSends(value);
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  @meta.blue.method
  @meta.implemented
  GetDiffractionOnReflectionsOrder()
  {
    return this._spatialAudioSettings.GetDiffractionOnReflectionsOrder();
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  @meta.blue.method
  @meta.implemented
  SetDiffractionOnReflectionsOrder(value)
  {
    this._spatialAudioSettings.SetDiffractionOnReflectionsOrder(value);
  }

  /** Returns the maximum spatial-audio path length. */
  @meta.blue.method
  @meta.implemented
  GetMaxPathLength()
  {
    return this._spatialAudioSettings.GetMaxPathLength();
  }

  /** Sets the maximum spatial-audio path length. */
  @meta.blue.method
  @meta.implemented
  SetMaxPathLength(value)
  {
    this._spatialAudioSettings.SetMaxPathLength(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  @meta.blue.method
  @meta.implemented
  GetCPULimitPercentage()
  {
    return this._spatialAudioSettings.GetCPULimitPercentage();
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  @meta.blue.method
  @meta.implemented
  SetCPULimitPercentage(value)
  {
    this._spatialAudioSettings.SetCPULimitPercentage(value);
  }

  /** Returns the spatial-audio load-balancing spread. */
  @meta.blue.method
  @meta.implemented
  GetLoadBalancingSpread()
  {
    return this._spatialAudioSettings.GetLoadBalancingSpread();
  }

  /** Sets the spatial-audio load-balancing spread. */
  @meta.blue.method
  @meta.implemented
  SetLoadBalancingSpread(value)
  {
    this._spatialAudioSettings.SetLoadBalancingSpread(value);
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  @meta.blue.method
  @meta.implemented
  GetEnableDiffractionAndTransmission()
  {
    return this._spatialAudioSettings.GetEnableDiffractionAndTransmission();
  }

  /** Enables or disables geometric diffraction and transmission. */
  @meta.blue.method
  @meta.implemented
  SetEnableDiffractionAndTransmission(value)
  {
    this._spatialAudioSettings.SetEnableDiffractionAndTransmission(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  @meta.blue.method
  @meta.implemented
  GetCalcEmitterVirtualPosition()
  {
    return this._spatialAudioSettings.GetCalcEmitterVirtualPosition();
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  @meta.blue.method
  @meta.implemented
  SetCalcEmitterVirtualPosition(value)
  {
    this._spatialAudioSettings.SetCalcEmitterVirtualPosition(value);
  }

  /** Returns the geometry surface transmission loss. */
  @meta.blue.method
  @meta.implemented
  GetTransmissionLoss()
  {
    return this._spatialAudioSettings.GetTransmissionLoss();
  }

  /** Sets the geometry surface transmission loss. */
  @meta.blue.method
  @meta.implemented
  SetTransmissionLoss(value)
  {
    this._spatialAudioSettings.SetTransmissionLoss(value);
  }

  /** Returns whether geometry diffraction is enabled. */
  @meta.blue.method
  @meta.implemented
  GetEnableDiffraction()
  {
    return this._spatialAudioSettings.GetEnableDiffraction();
  }

  /** Enables or disables geometry diffraction. */
  @meta.blue.method
  @meta.implemented
  SetEnableDiffraction(value)
  {
    this._spatialAudioSettings.SetEnableDiffraction(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  @meta.blue.method
  @meta.implemented
  GetEnableDiffractionOnBoundaryEdges()
  {
    return this._spatialAudioSettings.GetEnableDiffractionOnBoundaryEdges();
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  @meta.blue.method
  @meta.implemented
  SetEnableDiffractionOnBoundaryEdges(value)
  {
    this._spatialAudioSettings.SetEnableDiffractionOnBoundaryEdges(value);
  }

  /** Returns the one-shot opportunity window in milliseconds. */
  @meta.blue.method
  @meta.implemented
  GetOneShotWindow()
  {
    return this.soundPrioritization.GetOneShotWindow();
  }

  /** Sets the one-shot opportunity window in milliseconds. */
  @meta.blue.method
  @meta.implemented
  SetOneShotWindow(value)
  {
    this.soundPrioritization.SetOneShotWindow(value);
  }

  /** Returns the weighted playing-2D contribution. */
  @meta.blue.method
  @meta.implemented
  GetPlaying2DWeight()
  {
    return this.soundPrioritization.GetPlaying2DWeight();
  }

  /** Sets the raw playing-2D weight. */
  @meta.blue.method
  @meta.implemented
  SetPlaying2DWeight(value)
  {
    this.soundPrioritization.SetPlaying2DWeight(value);
  }

  /** Returns the weighted playing-events contribution. */
  @meta.blue.method
  @meta.implemented
  GetPlayingEventsWeight()
  {
    return this.soundPrioritization.GetPlayingEventsWeight();
  }

  /** Sets the raw playing-events weight. */
  @meta.blue.method
  @meta.implemented
  SetPlayingEventsWeight(value)
  {
    this.soundPrioritization.SetPlayingEventsWeight(value);
  }

  /** Returns the weighted vital-sound contribution. */
  @meta.blue.method
  @meta.implemented
  GetPlayingVitalSoundWeight()
  {
    return this.soundPrioritization.GetPlayingVitalSoundWeight();
  }

  /** Sets the raw vital-sound weight. */
  @meta.blue.method
  @meta.implemented
  SetPlayingVitalSoundWeight(value)
  {
    this.soundPrioritization.SetPlayingVitalSoundWeight(value);
  }

  /** Returns the weighted range contribution. */
  @meta.blue.method
  @meta.implemented
  GetRangeWeight()
  {
    return this.soundPrioritization.GetRangeWeight();
  }

  /** Sets the raw range weight. */
  @meta.blue.method
  @meta.implemented
  SetRangeWeight(value)
  {
    this.soundPrioritization.SetRangeWeight(value);
  }

  /** Returns the weighted used-emitter contribution. */
  @meta.blue.method
  @meta.implemented
  GetUsedEmitterWeight()
  {
    return this.soundPrioritization.GetUsedEmitterWeight();
  }

  /** Sets the raw used-emitter weight. */
  @meta.blue.method
  @meta.implemented
  SetUsedEmitterWeight(value)
  {
    this.soundPrioritization.SetUsedEmitterWeight(value);
  }

  /** Returns the weighted visibility contribution. */
  @meta.blue.method
  @meta.implemented
  GetVisibleWeight()
  {
    return this.soundPrioritization.GetVisibleWeight();
  }

  /** Sets the raw visibility weight. */
  @meta.blue.method
  @meta.implemented
  SetVisibleWeight(value)
  {
    this.soundPrioritization.SetVisibleWeight(value);
  }

  /** Returns the weighted waiting-one-shot contribution. */
  @meta.blue.method
  @meta.implemented
  GetWaitingOneShotWeight()
  {
    return this.soundPrioritization.GetWaitingOneShotWeight();
  }

  /** Sets the raw waiting-one-shot weight. */
  @meta.blue.method
  @meta.implemented
  SetWaitingOneShotWeight(value)
  {
    this.soundPrioritization.SetWaitingOneShotWeight(value);
  }

  /** Returns the global prioritization weight multiplier. */
  @meta.blue.method
  @meta.implemented
  GetWeightMultiplier()
  {
    return this.soundPrioritization.GetWeightMultiplier();
  }

  /** Sets the global prioritization weight multiplier. */
  @meta.blue.method
  @meta.implemented
  SetWeightMultiplier(value)
  {
    this.soundPrioritization.SetWeightMultiplier(value);
  }

  /** Returns the maximum number of awake audio objects. */
  @meta.blue.method
  @meta.implemented
  GetMaxAwakeGameObjects()
  {
    return this.soundPrioritization.GetMaxAwakeGameObjects();
  }

  /** Sets the maximum number of awake audio objects. */
  @meta.blue.method
  @meta.implemented
  SetMaxAwakeGameObjects(value)
  {
    this.soundPrioritization.SetMaxAwakeGameObjects(value);
  }

  /** Returns the non-reserved awake emitters. Source: AudManager.cpp:1247-1258 (commit c9b986d). */
  @meta.blue.method
  @meta.implemented
  GetAwakeAudioEmitters()
  {
    const result = [];

    this.soundPrioritization.ForEachAwakeAudioObject(gameObject =>
    {
      if (!IsReservedGameObjectID(gameObject.GetID()))
      {
        result.push(gameObject);
      }
    });
    return result;
  }

  /** Carbon method StopAll: every prioritized emitter stops everything. */
  @meta.blue.method
  @meta.implemented
  StopAll()
  {
    if (this._state !== "uninitialized")
    {
      for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects())
      {
        gameObject.StopAll?.();
      }
    }
  }

  /** Carbon method RegisterGameObject: callback map + prioritization registration. */
  @meta.blue.method
  @meta.implemented
  RegisterGameObject(gameObjID, gameObject)
  {
    if (!gameObject)
    {
      return;
    }
    this._callbackGameObjects.set(gameObjID, gameObject);
    this.soundPrioritization.RegisterGameObject(gameObject);
  }

  /**
   * Carbon method UnregisterGameObject.
   *
   * Carbon's deferred bank queue owns strong AudGameObjResourcePtr entries.
   * Explicit JavaScript release instead purges those entries here.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon keeps deferred emitters alive through strong pointers; CarbonEngineJS explicit release must prevent a stale post after re-adoption.")
  UnregisterGameObject(gameObjID)
  {
    this.soundPrioritization.UnregisterGameObject(gameObjID);
    this._obstructionOcclusion.RemoveEmitter(gameObjID);
    for (const info of this._soundBankInfoMap.values())
    {
      info.waitingEventsAfterLoad = info.waitingEventsAfterLoad.filter(
        ([ emitter ]) => emitter?.ID !== gameObjID
      );
    }
  }

  /** Carbon method RemoveCallbackGameObject. */
  @meta.blue.method
  @meta.implemented
  RemoveCallbackGameObject(gameObjID)
  {
    this._callbackGameObjects.delete(gameObjID);
  }

  /** Carbon method GetAudioEmitter (by game-object id). */
  @meta.blue.method
  @meta.implemented
  GetAudioEmitter(gameObjID)
  {
    return this._callbackGameObjects.get(gameObjID) ?? null;
  }

  /** Carbon method WithCallbackGameObject. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The native locked callback map is synchronous in JavaScript's single-threaded graph runtime.")
  WithCallbackGameObject(gameObjID, callback)
  {
    const emitter = this._callbackGameObjects.get(gameObjID);
    if (!emitter)
    {
      return false;
    }
    callback(emitter);
    return true;
  }

  /** Carbon debug method GetEventName. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon dereferences a missing emitter in this debug helper; the JavaScript graph returns an empty name when no emitter is registered.")
  GetEventName(emitterID, playingID)
  {
    return this.GetAudioEmitter(emitterID)?.GetPlayingEvents?.().get(playingID) ?? "";
  }

  /** Carbon method GetListener: the fixed-id listener object. */
  @meta.blue.method
  @meta.implemented
  GetListener()
  {
    return this.GetAudioEmitter(LISTENER_GAME_OBJ_ID);
  }

  /** Carbon method RegisterParameter: watcher refcount, entry created at 1. */
  @meta.blue.method
  @meta.implemented
  RegisterParameter(name)
  {
    if (this._state === "uninitialized")
    {
      return;
    }
    const entry = this._monitoredParameters.get(String(name)) ?? { parameterValue: 0, parameterExists: false, watchers: 0 };
    entry.watchers++;
    this._monitoredParameters.set(String(name), entry);
  }

  /** Carbon method UnregisterParameter: erased when watchers hit 0. */
  @meta.blue.method
  @meta.implemented
  UnregisterParameter(name)
  {
    if (this._state === "uninitialized")
    {
      return;
    }
    const entry = this._monitoredParameters.get(String(name));
    if (entry && --entry.watchers === 0)
    {
      this._monitoredParameters.delete(String(name));
    }
  }

  /** Carbon method GetParameterInfo. */
  @meta.blue.method
  @meta.implemented
  GetParameterInfo(name)
  {
    return this._monitoredParameters.get(String(name)) ?? null;
  }

  /** Carbon method UpdateMonitoredParameters: refresh every entry from the backend RTPC query. */
  @meta.blue.method
  @meta.implemented
  UpdateMonitoredParameters()
  {
    for (const [name, entry] of this._monitoredParameters)
    {
      const value = AudGameObjResource.backend?.GetGlobalRTPCValue(name);
      entry.parameterExists = value !== undefined && value !== null;
      entry.parameterValue = entry.parameterExists ? Number(value) : 0;
    }
  }

  /** Carbon method GetAudioCullingEnabled. */
  @meta.blue.method
  @meta.implemented
  GetAudioCullingEnabled()
  {
    this.audioCullingEnabled = this.soundPrioritization.GetAudioCullingEnabled();
    return this.audioCullingEnabled;
  }

  /** Carbon Blue property getter GetAudioCullingEnabledProperty. */
  @meta.blue.method
  @meta.implemented
  GetAudioCullingEnabledProperty()
  {
    return this.GetAudioCullingEnabled();
  }

  /** Carbon method Process: cull (when enabled+flagged), render, flush the log. */
  @meta.blue.method
  @meta.implemented
  Process()
  {
    if (this._state === "uninitialized")
    {
      return;
    }
    if (this._state === "enabled")
    {
      if (this.soundPrioritization.GetAudioCullingEnabled())
      {
        this.soundPrioritization.CullAudio();
      }
      this._obstructionOcclusion.Update(
        AudGameObjResource.backend,
      );
      AudGameObjResource.backend?.RenderAudio();
      // Carbon refreshes monitored values from its end-render callback. The
      // portable backend has no Wwise callback thread, so Process owns the
      // equivalent post-render refresh.
      this.UpdateMonitoredParameters();
    }
    this.log?.Flush?.();
  }

  /** Carbon method UpdateSettings. */
  @meta.blue.method
  @meta.implemented
  UpdateSettings(settings)
  {
    this.settings = settings;
  }

  /** Carbon method DisableAudioCulling: wake all objects, then disable prioritization. */
  @meta.blue.method
  @meta.implemented
  DisableAudioCulling()
  {
    for (const object of this.soundPrioritization.GetPrioritizedAudioObjects())
    {
      if (object.IsCulled?.())
      {
        object.Wake?.();
      }
    }
    this.soundPrioritization.DisableAudioCulling();
    this.audioCullingEnabled = false;
  }

  /** Carbon method EnableAudioCulling. */
  @meta.blue.method
  @meta.implemented
  EnableAudioCulling()
  {
    this.soundPrioritization.EnableAudioCulling();
    this.audioCullingEnabled = true;
  }

  /** Carbon debug method GetPrioritizedEmitters: defensive current-order snapshot. */
  @meta.blue.renamed("GetPrioritizedAudioEmitters")
  @meta.adapted
  @meta.reason("Carbon returns SoundPrioritization's current debug list; CarbonEngineJS returns a defensive array of the same current order.")
  GetPrioritizedEmitters()
  {
    return this.soundPrioritization.GetPrioritizedAudioObjects();
  }

  /** Carbon debug flag; renderer consumption remains optional. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected renderer.")
  EnableDebugDisplayAllEmitters()
  {
    this._debugDisplayAllEmitters = true;
  }

  /** Carbon debug flag; renderer consumption remains optional. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected renderer.")
  DisableDebugDisplayAllEmitters()
  {
    this._debugDisplayAllEmitters = false;
  }

  /** Carbon debug flag query. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The value is available to browser renderers even though the audio layer does not draw debug geometry.")
  GetDebugDisplayAllEmitters()
  {
    return this._debugDisplayAllEmitters;
  }

  /** Native Wwise output-device replacement has no WebAudio equivalent. */
  @meta.blue.method
  @meta.notSupported
  EnableSpatialAudio()
  {
    return false;
  }

  /** Native Wwise output-device replacement has no WebAudio equivalent. */
  @meta.blue.method
  @meta.notSupported
  DisableSpatialAudio()
  {
    return false;
  }

  /** OS/Wwise spatial-output support cannot be inferred from a WebAudio panner. */
  @meta.blue.method
  @meta.notSupported
  SpatialAudioIsSupported()
  {
    return false;
  }

  /** Native audio-device callbacks have no owned browser equivalent. */
  @meta.blue.method
  @meta.notSupported
  RegisterAudioDeviceChangeCallback(callback)
  {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  @meta.blue.method
  @meta.notSupported
  StartProfilerCapture()
  {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  @meta.blue.method
  @meta.notSupported
  StopProfilerCapture()
  {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  @meta.blue.method
  @meta.notSupported
  IsProfilerCapturing()
  {
    return false;
  }

  /** Carbon method ResetCullingSettings. */
  @meta.blue.method
  @meta.implemented
  ResetCullingSettings()
  {
    this.soundPrioritization.ResetCullingSettings();
  }

}
