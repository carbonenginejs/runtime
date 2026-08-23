// Source: audio/src/AudManager.h + AudManager.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudManager.json.
//
// Headless behavior port of the lifecycle/bank state machine. Wwise engine
// init, RenderAudio, and device concerns route through the backend seam
// (AudGameObjResource.backend); state, bank tracking, deferred-event flush,
// monitored-parameter refcounts, and prioritization wiring are pure logic.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { AudGameObjResource } from "./AudGameObjResource.js";
import { AudGeometry } from "./AudGeometry.js";
import { AudObstructionOcclusion } from "./AudObstructionOcclusion.js";
import { LISTENER_GAME_OBJ_ID, SoundPrioritization } from "./SoundPrioritization.js";
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

/** AudManager (audio) - engine lifecycle, banks, global controls, culling, and caller-supplied obstruction/occlusion. */
@type.define({ className: "AudManager", family: "audio" })
export class AudManager extends CjsModel
{

  /** m_log (IAudActionLogPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("IAudActionLog")
  log = null;

  /** m_audioCullingEnabled (mutable bool) [READ] */
  @io.read
  @type.boolean
  audioCullingEnabled = true;

  /** m_spatialAudioEnabled (bool) [READ] */
  @io.read
  @type.boolean
  spatialAudioEnabled = true;

  /** m_settings (AudSettingsPtr) [AUTHORED] */
  @impl.adapted
  @impl.reason("Carbon supplies this via UpdateSettings() outside Blue serialization; CarbonEngineJS persists it for values interchange.")
  @io.persist
  @type.model("AudSettings")
  settings = null;

  // AudioState (Uninitialized/Disabled/Enabled) as lowercase strings;
  // GetStateValue preserves Carbon's 0/1/2.
  #state = "uninitialized";

  #soundBankInfoMap = new Map();

  #nextSoundBankOperation = 1;

  #monitoredParameters = new Map();

  #callbackGameObjects = new Map();

  #debugDisplayAllEmitters = false;

  #spatialAudioSettings = new SpatialAudioSettings();

  #spatialAudioGeometryBackends = new WeakSet();

  #obstructionOcclusion = new AudObstructionOcclusion(this);

  // CarbonEngineJS-original: the prioritization is a public collaborator so
  // emitters can read weights directly (see AudGameObjResource notes).
  soundPrioritization = new SoundPrioritization();

  /** Enabled convenience over the Carbon state (the guard emitters check). */
  get enabled()
  {
    return this.#state === "enabled";
  }

  /** Carbon method GetState. */
  @carbon.method
  @impl.implemented
  GetState()
  {
    return this.#state;
  }

  /** Carbon method GetStateValue: Carbon's scripting int (0/1/2). */
  @carbon.renamed("GetState")
  @impl.implemented
  GetStateValue()
  {
    return this.#state === "uninitialized" ? 0 : this.#state === "disabled" ? 1 : 2;
  }

  /** Carbon method Enable: init if needed, enable, load Init.bnk + requested banks, wake everything. */
  @carbon.method
  @impl.adapted
  @impl.reason("Wwise memory/stream/sound initialization is the backend's Init, while pre-enabled geometry uses optional InitSpatialAudioGeometry with Carbon's populated settings. The state machine, failure gate, bank loads, and wake pass follow audio/src/AudManager.cpp:148-180 and 848-881.")
  Enable(soundBanksToLoad = [])
  {
    if (this.#state === "enabled")
    {
      return;
    }
    const backend = AudGameObjResource.backend;
    if (this.#state === "uninitialized")
    {
      const repository = AudGameObjResource.staticDataRepository;
      if (!repository?.IsInitialized())
      {
        return;
      }
      // The backend seam is the sound engine: absent, or an Init that
      // explicitly fails, means Carbon's Init() failure - stay un-enabled.
      // A backend without an Init method counts as initialized.
      if (!backend || backend.Init?.(this.settings) === false)
      {
        return;
      }
    }
    if (!backend)
    {
      return;
    }
    if (this.GetSpatialAudioGeometryEnabled()
      && !this.#InitSpatialAudioGeometry(backend))
    {
      return;
    }
    if (this.#state === "uninitialized")
    {
      this.#state = "disabled";
    }
    this.#state = "enabled";
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
  @carbon.method
  @impl.implemented
  Disable()
  {
    if (this.#state !== "enabled")
    {
      return;
    }
    for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects())
    {
      gameObject.Cull();
    }
    this.ClearBanks();
    this.#obstructionOcclusion.Reset();
    AudGeometry.ClearAllGeometry();
    this.#state = "disabled";
  }

  /** Carbon method LoadBank: async - tracked LOADING immediately; backend callback drives LOADED. */
  @carbon.method
  @impl.implemented
  LoadBank(name)
  {
    if (this.#state !== "enabled")
    {
      return;
    }
    const key = BankKey(name);
    const status = this.GetSoundBankStatus(name);
    if (status === "loaded" || status === "loading")
    {
      return;
    }
    const operation = this.#nextSoundBankOperation++;
    this.#soundBankInfoMap.set(key, {
      soundBankStatus: "loading",
      soundBankID: key,
      soundBankName: String(name),
      waitingEventsAfterLoad: [],
      operation
    });
    AudGameObjResource.backend?.LoadBank?.(String(name), loaded =>
    {
      if (this.#soundBankInfoMap.get(key)?.operation === operation)
      {
        this.UpdateSoundBankStatus(
          key,
          loaded ? "loaded" : "not_loaded"
        );
      }
    });
  }

  /** Carbon method UnloadBank. */
  @carbon.method
  @impl.implemented
  UnloadBank(name)
  {
    if (this.#state !== "enabled")
    {
      return;
    }
    const key = BankKey(name);
    const status = this.GetSoundBankStatus(name);
    if (status === "not_loaded" || status === "unloading")
    {
      return;
    }
    const operation = this.#nextSoundBankOperation++;
    const info = this.#soundBankInfoMap.get(key);

    info.operation = operation;
    this.UpdateSoundBankStatus(key, "unloading");
    AudGameObjResource.backend?.UnloadBank?.(String(name), () =>
    {
      if (this.#soundBankInfoMap.get(key)?.operation === operation)
      {
        this.#soundBankInfoMap.delete(key);
      }
    });
  }

  /** Carbon method ClearBanks. */
  @carbon.method
  @impl.implemented
  ClearBanks()
  {
    if (this.#state !== "uninitialized")
    {
      AudGameObjResource.backend?.ClearBanks?.();
      this.#soundBankInfoMap.clear();
    }
  }

  // The deferred-event flush: waiting events fire with bypassPrefix=true
  // exactly on the transition to LOADED, then the queue clears.
  /** Carbon method UpdateSoundBankStatus. */
  @carbon.method
  @impl.implemented
  UpdateSoundBankStatus(bankID, status)
  {
    const info = this.#soundBankInfoMap.get(bankID);
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
  @carbon.method
  @impl.implemented
  RegisterEventAfterSoundBankLoad(soundBankName, eventName, emitter)
  {
    for (const info of this.#soundBankInfoMap.values())
    {
      if (info.soundBankName === String(soundBankName))
      {
        info.waitingEventsAfterLoad.push([emitter, String(eventName)]);
      }
    }
  }

  /** Carbon method GetSoundBankStatus: by name or key; "not_loaded" when unknown. */
  @carbon.method
  @impl.implemented
  GetSoundBankStatus(name)
  {
    const byKey = this.#soundBankInfoMap.get(BankKey(name));
    if (byKey)
    {
      return byKey.soundBankStatus;
    }
    for (const info of this.#soundBankInfoMap.values())
    {
      if (info.soundBankName === String(name))
      {
        return info.soundBankStatus;
      }
    }
    return "not_loaded";
  }

  /** Carbon method GetLoadedSoundBanks: names with status loaded OR loading (Carbon counts both). */
  @carbon.method
  @impl.implemented
  GetLoadedSoundBanks()
  {
    const names = [];
    for (const info of this.#soundBankInfoMap.values())
    {
      if (info.soundBankStatus === "loaded" || info.soundBankStatus === "loading")
      {
        names.push(info.soundBankName);
      }
    }
    return names;
  }

  /** Carbon method SetGlobalRTPC: pure backend passthrough, enabled-gated, no caching. */
  @carbon.method
  @impl.implemented
  SetGlobalRTPC(rtpcName, value)
  {
    if (this.#state !== "enabled")
    {
      return false;
    }
    if (AudGameObjResource.backend?.SetGlobalRTPCValue?.(rtpcName, value) === false)
    {
      return false;
    }
    this.LogSetRTPC(0, rtpcName, value);
    return true;
  }

  /** Carbon method SetState (global state group): passthrough, enabled-gated. */
  @carbon.method
  @impl.implemented
  SetState(stateGroup, stateName)
  {
    if (this.#state !== "enabled")
    {
      return false;
    }
    AudGameObjResource.backend?.SetGlobalState?.(stateGroup, stateName);
    this.LogSetState(stateGroup, stateName);
    return true;
  }

  /** Carbon method LogPostEvent. */
  @carbon.method
  @impl.implemented
  LogPostEvent(emitterID, playID, eventID, name)
  {
    this.log?.LogPostEvent?.(emitterID, playID, eventID, name);
  }

  /** Carbon method LogExecuteActionOnPlayingID. */
  @carbon.method
  @impl.implemented
  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    this.log?.LogExecuteActionOnPlayingID?.(emitterID, playID, action);
  }

  /** Carbon method LogSetSwitch. */
  @carbon.method
  @impl.implemented
  LogSetSwitch(emitterID, group, state)
  {
    this.log?.LogSetSwitch?.(emitterID, group, state);
  }

  /** Carbon method LogSetState. */
  @carbon.method
  @impl.implemented
  LogSetState(group, state)
  {
    this.log?.LogSetState?.(group, state);
  }

  /** Carbon method LogSetRTPC. */
  @carbon.method
  @impl.implemented
  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    this.log?.LogSetRTPC?.(emitterID, name, value, playID);
  }

  /** Carbon method GetSpatialAudioGeometryEnabled. */
  @carbon.method
  @impl.implemented
  GetSpatialAudioGeometryEnabled()
  {
    return this.#spatialAudioSettings.GetSpatialAudioGeometryEnabled();
  }

  /** Carbon method SetEmitterLineOfSightBlockage: stores a caller-computed blockage target. */
  @carbon.method
  @impl.implemented
  SetEmitterLineOfSightBlockage(emitterID, blockage)
  {
    return this.#obstructionOcclusion.SetEmitterLineOfSightBlockage(
      emitterID,
      blockage,
    );
  }

  /** Carbon method GetEmitterOcclusion: returns the live, mid-fade value. */
  @carbon.method
  @impl.implemented
  GetEmitterOcclusion(emitterID)
  {
    return this.#obstructionOcclusion.GetEmitterOcclusion(emitterID);
  }

  /** Carbon method ClearObstructionOcclusion: fades every target to clear. */
  @carbon.method
  @impl.implemented
  ClearObstructionOcclusion()
  {
    this.#obstructionOcclusion.ClearAll();
  }

  /** Carbon Blue property getter for game-driven obstruction/occlusion. */
  @carbon.method
  @impl.implemented
  GetObstructionOcclusionEnabled()
  {
    return this.#obstructionOcclusion.IsEnabled();
  }

  /** Carbon Blue property setter for game-driven obstruction/occlusion. */
  @carbon.method
  @impl.implemented
  SetObstructionOcclusionEnabled(value)
  {
    this.#obstructionOcclusion.SetEnabled(value);
  }

  /** Carbon Blue property getter for the obstruction/occlusion fade rate. */
  @carbon.method
  @impl.implemented
  GetObstructionOcclusionFadeRate()
  {
    return this.#obstructionOcclusion.GetFadeRate();
  }

  /** Carbon Blue property setter for the obstruction/occlusion fade rate. */
  @carbon.method
  @impl.implemented
  SetObstructionOcclusionFadeRate(value)
  {
    this.#obstructionOcclusion.SetFadeRate(value);
  }

  /** Carbon method SetSpatialAudioGeometryEnabled. */
  @carbon.method
  @impl.adapted
  @impl.reason("Browser backends may expose InitSpatialAudioGeometry; the setting and geometry lifecycle remain available even though WebAudio has no native diffraction engine.")
  SetSpatialAudioGeometryEnabled(enabled)
  {
    const value = Boolean(enabled);
    if (this.GetSpatialAudioGeometryEnabled() === value)
    {
      return;
    }
    if (this.#state !== "enabled")
    {
      this.#spatialAudioSettings.SetSpatialAudioGeometryEnabled(value);
      return;
    }
    if (!value)
    {
      this.#spatialAudioSettings.SetSpatialAudioGeometryEnabled(false);
      AudGeometry.ClearAllGeometry();
      return;
    }
    if (!this.#InitSpatialAudioGeometry(AudGameObjResource.backend))
    {
      return;
    }
    this.#spatialAudioSettings.SetSpatialAudioGeometryEnabled(true);
  }

  /**
   * Initializes geometry once for each browser backend lifetime.
   * Carbon retains the equivalent flag across Disable but resets it when the
   * sound engine terminates; backend identity supplies that boundary here.
   */
  #InitSpatialAudioGeometry(backend)
  {
    if (!backend
      || (typeof backend !== "object" && typeof backend !== "function"))
    {
      return false;
    }
    if (this.#spatialAudioGeometryBackends.has(backend))
    {
      return true;
    }

    const settings = this.#spatialAudioSettings.PopulateInitSettings({});

    if (backend.InitSpatialAudioGeometry?.(settings) === false)
    {
      return false;
    }
    this.#spatialAudioGeometryBackends.add(backend);
    return true;
  }

  /** Returns the spatial-audio movement threshold. */
  @carbon.method
  @impl.implemented
  GetMovementThreshold()
  {
    return this.#spatialAudioSettings.GetMovementThreshold();
  }

  /** Sets the spatial-audio movement threshold. */
  @carbon.method
  @impl.implemented
  SetMovementThreshold(value)
  {
    this.#spatialAudioSettings.SetMovementThreshold(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  @carbon.method
  @impl.implemented
  GetNumberOfPrimaryRays()
  {
    return this.#spatialAudioSettings.GetNumberOfPrimaryRays();
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  @carbon.method
  @impl.implemented
  SetNumberOfPrimaryRays(value)
  {
    this.#spatialAudioSettings.SetNumberOfPrimaryRays(value);
  }

  /** Returns the maximum reflection order. */
  @carbon.method
  @impl.implemented
  GetMaxReflectionOrder()
  {
    return this.#spatialAudioSettings.GetMaxReflectionOrder();
  }

  /** Sets the maximum reflection order. */
  @carbon.method
  @impl.implemented
  SetMaxReflectionOrder(value)
  {
    this.#spatialAudioSettings.SetMaxReflectionOrder(value);
  }

  /** Returns the maximum diffraction order. */
  @carbon.method
  @impl.implemented
  GetMaxDiffractionOrder()
  {
    return this.#spatialAudioSettings.GetMaxDiffractionOrder();
  }

  /** Sets the maximum diffraction order. */
  @carbon.method
  @impl.implemented
  SetMaxDiffractionOrder(value)
  {
    this.#spatialAudioSettings.SetMaxDiffractionOrder(value);
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  @carbon.method
  @impl.implemented
  GetMaxEmitterRoomAuxSends()
  {
    return this.#spatialAudioSettings.GetMaxEmitterRoomAuxSends();
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  @carbon.method
  @impl.implemented
  SetMaxEmitterRoomAuxSends(value)
  {
    this.#spatialAudioSettings.SetMaxEmitterRoomAuxSends(value);
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  @carbon.method
  @impl.implemented
  GetDiffractionOnReflectionsOrder()
  {
    return this.#spatialAudioSettings.GetDiffractionOnReflectionsOrder();
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  @carbon.method
  @impl.implemented
  SetDiffractionOnReflectionsOrder(value)
  {
    this.#spatialAudioSettings.SetDiffractionOnReflectionsOrder(value);
  }

  /** Returns the maximum spatial-audio path length. */
  @carbon.method
  @impl.implemented
  GetMaxPathLength()
  {
    return this.#spatialAudioSettings.GetMaxPathLength();
  }

  /** Sets the maximum spatial-audio path length. */
  @carbon.method
  @impl.implemented
  SetMaxPathLength(value)
  {
    this.#spatialAudioSettings.SetMaxPathLength(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  @carbon.method
  @impl.implemented
  GetCPULimitPercentage()
  {
    return this.#spatialAudioSettings.GetCPULimitPercentage();
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  @carbon.method
  @impl.implemented
  SetCPULimitPercentage(value)
  {
    this.#spatialAudioSettings.SetCPULimitPercentage(value);
  }

  /** Returns the spatial-audio load-balancing spread. */
  @carbon.method
  @impl.implemented
  GetLoadBalancingSpread()
  {
    return this.#spatialAudioSettings.GetLoadBalancingSpread();
  }

  /** Sets the spatial-audio load-balancing spread. */
  @carbon.method
  @impl.implemented
  SetLoadBalancingSpread(value)
  {
    this.#spatialAudioSettings.SetLoadBalancingSpread(value);
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffractionAndTransmission()
  {
    return this.#spatialAudioSettings.GetEnableDiffractionAndTransmission();
  }

  /** Enables or disables geometric diffraction and transmission. */
  @carbon.method
  @impl.implemented
  SetEnableDiffractionAndTransmission(value)
  {
    this.#spatialAudioSettings.SetEnableDiffractionAndTransmission(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  @carbon.method
  @impl.implemented
  GetCalcEmitterVirtualPosition()
  {
    return this.#spatialAudioSettings.GetCalcEmitterVirtualPosition();
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  @carbon.method
  @impl.implemented
  SetCalcEmitterVirtualPosition(value)
  {
    this.#spatialAudioSettings.SetCalcEmitterVirtualPosition(value);
  }

  /** Returns the geometry surface transmission loss. */
  @carbon.method
  @impl.implemented
  GetTransmissionLoss()
  {
    return this.#spatialAudioSettings.GetTransmissionLoss();
  }

  /** Sets the geometry surface transmission loss. */
  @carbon.method
  @impl.implemented
  SetTransmissionLoss(value)
  {
    this.#spatialAudioSettings.SetTransmissionLoss(value);
  }

  /** Returns whether geometry diffraction is enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffraction()
  {
    return this.#spatialAudioSettings.GetEnableDiffraction();
  }

  /** Enables or disables geometry diffraction. */
  @carbon.method
  @impl.implemented
  SetEnableDiffraction(value)
  {
    this.#spatialAudioSettings.SetEnableDiffraction(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffractionOnBoundaryEdges()
  {
    return this.#spatialAudioSettings.GetEnableDiffractionOnBoundaryEdges();
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  @carbon.method
  @impl.implemented
  SetEnableDiffractionOnBoundaryEdges(value)
  {
    this.#spatialAudioSettings.SetEnableDiffractionOnBoundaryEdges(value);
  }

  /** Returns the one-shot opportunity window in milliseconds. */
  @carbon.method
  @impl.implemented
  GetOneShotWindow()
  {
    return this.soundPrioritization.GetOneShotWindow();
  }

  /** Sets the one-shot opportunity window in milliseconds. */
  @carbon.method
  @impl.implemented
  SetOneShotWindow(value)
  {
    this.soundPrioritization.SetOneShotWindow(value);
  }

  /** Returns the weighted playing-2D contribution. */
  @carbon.method
  @impl.implemented
  GetPlaying2DWeight()
  {
    return this.soundPrioritization.GetPlaying2DWeight();
  }

  /** Sets the raw playing-2D weight. */
  @carbon.method
  @impl.implemented
  SetPlaying2DWeight(value)
  {
    this.soundPrioritization.SetPlaying2DWeight(value);
  }

  /** Returns the weighted playing-events contribution. */
  @carbon.method
  @impl.implemented
  GetPlayingEventsWeight()
  {
    return this.soundPrioritization.GetPlayingEventsWeight();
  }

  /** Sets the raw playing-events weight. */
  @carbon.method
  @impl.implemented
  SetPlayingEventsWeight(value)
  {
    this.soundPrioritization.SetPlayingEventsWeight(value);
  }

  /** Returns the weighted vital-sound contribution. */
  @carbon.method
  @impl.implemented
  GetPlayingVitalSoundWeight()
  {
    return this.soundPrioritization.GetPlayingVitalSoundWeight();
  }

  /** Sets the raw vital-sound weight. */
  @carbon.method
  @impl.implemented
  SetPlayingVitalSoundWeight(value)
  {
    this.soundPrioritization.SetPlayingVitalSoundWeight(value);
  }

  /** Returns the weighted range contribution. */
  @carbon.method
  @impl.implemented
  GetRangeWeight()
  {
    return this.soundPrioritization.GetRangeWeight();
  }

  /** Sets the raw range weight. */
  @carbon.method
  @impl.implemented
  SetRangeWeight(value)
  {
    this.soundPrioritization.SetRangeWeight(value);
  }

  /** Returns the weighted used-emitter contribution. */
  @carbon.method
  @impl.implemented
  GetUsedEmitterWeight()
  {
    return this.soundPrioritization.GetUsedEmitterWeight();
  }

  /** Sets the raw used-emitter weight. */
  @carbon.method
  @impl.implemented
  SetUsedEmitterWeight(value)
  {
    this.soundPrioritization.SetUsedEmitterWeight(value);
  }

  /** Returns the weighted visibility contribution. */
  @carbon.method
  @impl.implemented
  GetVisibleWeight()
  {
    return this.soundPrioritization.GetVisibleWeight();
  }

  /** Sets the raw visibility weight. */
  @carbon.method
  @impl.implemented
  SetVisibleWeight(value)
  {
    this.soundPrioritization.SetVisibleWeight(value);
  }

  /** Returns the weighted waiting-one-shot contribution. */
  @carbon.method
  @impl.implemented
  GetWaitingOneShotWeight()
  {
    return this.soundPrioritization.GetWaitingOneShotWeight();
  }

  /** Sets the raw waiting-one-shot weight. */
  @carbon.method
  @impl.implemented
  SetWaitingOneShotWeight(value)
  {
    this.soundPrioritization.SetWaitingOneShotWeight(value);
  }

  /** Returns the global prioritization weight multiplier. */
  @carbon.method
  @impl.implemented
  GetWeightMultiplier()
  {
    return this.soundPrioritization.GetWeightMultiplier();
  }

  /** Sets the global prioritization weight multiplier. */
  @carbon.method
  @impl.implemented
  SetWeightMultiplier(value)
  {
    this.soundPrioritization.SetWeightMultiplier(value);
  }

  /** Returns the maximum number of awake audio objects. */
  @carbon.method
  @impl.implemented
  GetMaxAwakeGameObjects()
  {
    return this.soundPrioritization.GetMaxAwakeGameObjects();
  }

  /** Sets the maximum number of awake audio objects. */
  @carbon.method
  @impl.implemented
  SetMaxAwakeGameObjects(value)
  {
    this.soundPrioritization.SetMaxAwakeGameObjects(value);
  }

  /** Carbon method StopAll: every prioritized emitter stops everything. */
  @carbon.method
  @impl.implemented
  StopAll()
  {
    if (this.#state !== "uninitialized")
    {
      for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects())
      {
        gameObject.StopAll?.();
      }
    }
  }

  /** Carbon method RegisterGameObject: callback map + prioritization registration. */
  @carbon.method
  @impl.implemented
  RegisterGameObject(gameObjID, gameObject)
  {
    if (!gameObject)
    {
      return;
    }
    this.#callbackGameObjects.set(gameObjID, gameObject);
    this.soundPrioritization.RegisterGameObject(gameObject);
  }

  /**
   * Carbon method UnregisterGameObject.
   *
   * Carbon's deferred bank queue owns strong AudGameObjResourcePtr entries.
   * Explicit JavaScript release instead purges those entries here.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon keeps deferred emitters alive through strong pointers; CarbonEngineJS explicit release must prevent a stale post after re-adoption.")
  UnregisterGameObject(gameObjID)
  {
    this.soundPrioritization.UnregisterGameObject(gameObjID);
    this.#obstructionOcclusion.RemoveEmitter(gameObjID);
    for (const info of this.#soundBankInfoMap.values())
    {
      info.waitingEventsAfterLoad = info.waitingEventsAfterLoad.filter(
        ([ emitter ]) => emitter?.ID !== gameObjID
      );
    }
  }

  /** Carbon method RemoveCallbackGameObject. */
  @carbon.method
  @impl.implemented
  RemoveCallbackGameObject(gameObjID)
  {
    this.#callbackGameObjects.delete(gameObjID);
  }

  /** Carbon method GetAudioEmitter (by game-object id). */
  @carbon.method
  @impl.implemented
  GetAudioEmitter(gameObjID)
  {
    return this.#callbackGameObjects.get(gameObjID) ?? null;
  }

  /** Carbon method WithCallbackGameObject. */
  @carbon.method
  @impl.adapted
  @impl.reason("The native locked callback map is synchronous in JavaScript's single-threaded graph runtime.")
  WithCallbackGameObject(gameObjID, callback)
  {
    const emitter = this.#callbackGameObjects.get(gameObjID);
    if (!emitter)
    {
      return false;
    }
    callback(emitter);
    return true;
  }

  /** Carbon debug method GetEventName. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon dereferences a missing emitter in this debug helper; the JavaScript graph returns an empty name when no emitter is registered.")
  GetEventName(emitterID, playingID)
  {
    return this.GetAudioEmitter(emitterID)?.GetPlayingEvents?.().get(playingID) ?? "";
  }

  /** Carbon method GetListener: the fixed-id listener object. */
  @carbon.method
  @impl.implemented
  GetListener()
  {
    return this.GetAudioEmitter(LISTENER_GAME_OBJ_ID);
  }

  /** Carbon method RegisterParameter: watcher refcount, entry created at 1. */
  @carbon.method
  @impl.implemented
  RegisterParameter(name)
  {
    if (this.#state === "uninitialized")
    {
      return;
    }
    const entry = this.#monitoredParameters.get(String(name)) ?? { parameterValue: 0, parameterExists: false, watchers: 0 };
    entry.watchers++;
    this.#monitoredParameters.set(String(name), entry);
  }

  /** Carbon method UnregisterParameter: erased when watchers hit 0. */
  @carbon.method
  @impl.implemented
  UnregisterParameter(name)
  {
    if (this.#state === "uninitialized")
    {
      return;
    }
    const entry = this.#monitoredParameters.get(String(name));
    if (entry && --entry.watchers === 0)
    {
      this.#monitoredParameters.delete(String(name));
    }
  }

  /** Carbon method GetParameterInfo. */
  @carbon.method
  @impl.implemented
  GetParameterInfo(name)
  {
    return this.#monitoredParameters.get(String(name)) ?? null;
  }

  /** Carbon method UpdateMonitoredParameters: refresh every entry from the backend RTPC query. */
  @carbon.method
  @impl.implemented
  UpdateMonitoredParameters()
  {
    for (const [name, entry] of this.#monitoredParameters)
    {
      const value = AudGameObjResource.backend?.GetGlobalRTPCValue?.(name);
      entry.parameterExists = value !== undefined && value !== null;
      entry.parameterValue = entry.parameterExists ? Number(value) : 0;
    }
  }

  /** Carbon method GetAudioCullingEnabled. */
  @carbon.method
  @impl.implemented
  GetAudioCullingEnabled()
  {
    this.audioCullingEnabled = this.soundPrioritization.GetAudioCullingEnabled();
    return this.audioCullingEnabled;
  }

  /** Carbon Blue property getter GetAudioCullingEnabledProperty. */
  @carbon.method
  @impl.implemented
  GetAudioCullingEnabledProperty()
  {
    return this.GetAudioCullingEnabled();
  }

  /** Carbon method Process: cull (when enabled+flagged), render, flush the log. */
  @carbon.method
  @impl.implemented
  Process()
  {
    if (this.#state === "uninitialized")
    {
      return;
    }
    if (this.#state === "enabled")
    {
      if (this.soundPrioritization.GetAudioCullingEnabled())
      {
        this.soundPrioritization.CullAudio();
      }
      this.#obstructionOcclusion.Update(
        AudGameObjResource.backend,
      );
      AudGameObjResource.backend?.RenderAudio?.();
      // Carbon refreshes monitored values from its end-render callback. The
      // portable backend has no Wwise callback thread, so Process owns the
      // equivalent post-render refresh.
      this.UpdateMonitoredParameters();
    }
    this.log?.Flush?.();
  }

  /** Carbon method UpdateSettings. */
  @carbon.method
  @impl.implemented
  UpdateSettings(settings)
  {
    this.settings = settings;
  }

  /** Carbon method DisableAudioCulling: wake all objects, then disable prioritization. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  EnableAudioCulling()
  {
    this.soundPrioritization.EnableAudioCulling();
    this.audioCullingEnabled = true;
  }

  /** Carbon debug method GetPrioritizedEmitters: defensive current-order snapshot. */
  @carbon.renamed("GetPrioritizedAudioEmitters")
  @impl.adapted
  @impl.reason("Carbon returns SoundPrioritization's current debug list; CarbonEngineJS returns a defensive array of the same current order.")
  GetPrioritizedEmitters()
  {
    return this.soundPrioritization.GetPrioritizedAudioObjects();
  }

  /** Carbon debug flag; renderer consumption remains optional. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected renderer.")
  EnableDebugDisplayAllEmitters()
  {
    this.#debugDisplayAllEmitters = true;
  }

  /** Carbon debug flag; renderer consumption remains optional. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected renderer.")
  DisableDebugDisplayAllEmitters()
  {
    this.#debugDisplayAllEmitters = false;
  }

  /** Carbon debug flag query. */
  @carbon.method
  @impl.adapted
  @impl.reason("The value is available to browser renderers even though the audio layer does not draw debug geometry.")
  GetDebugDisplayAllEmitters()
  {
    return this.#debugDisplayAllEmitters;
  }

  /** Native Wwise output-device replacement has no WebAudio equivalent. */
  @carbon.method
  @impl.notSupported
  EnableSpatialAudio()
  {
    return false;
  }

  /** Native Wwise output-device replacement has no WebAudio equivalent. */
  @carbon.method
  @impl.notSupported
  DisableSpatialAudio()
  {
    return false;
  }

  /** OS/Wwise spatial-output support cannot be inferred from a WebAudio panner. */
  @carbon.method
  @impl.notSupported
  SpatialAudioIsSupported()
  {
    return false;
  }

  /** Native audio-device callbacks have no owned browser equivalent. */
  @carbon.method
  @impl.notSupported
  RegisterAudioDeviceChangeCallback(callback)
  {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  @carbon.method
  @impl.notSupported
  StartProfilerCapture()
  {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  @carbon.method
  @impl.notSupported
  StopProfilerCapture()
  {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  @carbon.method
  @impl.notSupported
  IsProfilerCapturing()
  {
    return false;
  }

  /** Carbon method ResetCullingSettings. */
  @carbon.method
  @impl.implemented
  ResetCullingSettings()
  {
    this.soundPrioritization.ResetCullingSettings();
  }

}
