import { exposure as be } from "#be";
// Source: audio/src/AudManager.h + AudManager.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudManager.json.
//
// Headless behavior port of the lifecycle/bank state machine. Wwise engine
// init, RenderAudio, and device concerns route through the backend seam
// (AudGameObjResource.backend); state, bank tracking, deferred-event flush,
// monitored-parameter refcounts, and prioritization wiring are pure logic.
import { IRoot } from "#blueexposure/IRoot";
import { IBlueEvents } from "#blue/IBlueEvents";
import { meta, type } from "#schema";
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
@be.define("AudManager")
@be.inherit(IRoot, IBlueEvents)

export class AudManager extends IRoot
{

  /** m_log (IAudActionLogPtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.object.ref("IAudActionLog")
  log = null;

  /** m_audioCullingEnabled (mutable bool) [READ] */
  @be.mapAttribute(be.READ)
  @type.boolean
  audioCullingEnabled = true;

  /** m_spatialAudioEnabled (bool) [READ] */
  @be.mapAttribute(be.READ)
  @type.boolean
  spatialAudioEnabled = true;

  /**
   * m_settings (AudSettingsPtr) [AUTHORED]
   *
   * @adapted Carbon supplies this via UpdateSettings() outside Blue serialization; CarbonEngineJS persists it for
   *   values interchange.
   */
  @meta.mapAttribute(meta.PERSIST)
  @type.object.ref("AudSettings")
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

  /**
   * Carbon method GetState.
   *
   * @adapted
   */
  GetState()
  {
    return this._state;
  }

  /**
   * Carbon method GetStateValue: Carbon's scripting int (0/1/2).
   *
   * @implemented
   */
  @be.mapMethodAndWrap("GetState")
  GetStateValue()
  {
    return this._state === "uninitialized" ? 0 : this._state === "disabled" ? 1 : 2;
  }

  /**
   * Carbon method Enable: init if needed, enable, load Init.bnk + requested banks, wake everything.
   *
   * @adapted Wwise memory/stream/sound initialization is the backend's Init, while pre-enabled geometry uses optional
   *   InitSpatialAudioGeometry with Carbon's populated settings. The state machine, failure gate, bank loads, and wake
   *   pass follow audio/src/AudManager.cpp:148-180 and 848-881.
   */
  @be.mapMethodAndWrap()
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
      if (!repository || !repository.IsInitialized())
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

  /**
   * Carbon method Disable: cull everything, clear banks, drop to disabled (engine stays initialized).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
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

  /**
   * Carbon method LoadBank: async - tracked LOADING immediately; backend callback drives LOADED.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
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

  /**
   * Carbon method UnloadBank.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
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

  /**
   * Carbon method ClearBanks.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
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
  /**
   * Carbon method UpdateSoundBankStatus.
   *
   * @implemented
   */

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

  /**
   * Carbon method RegisterEventAfterSoundBankLoad: queue an event on a LOADING bank (matched by name).
   *
   * @implemented
   */

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

  /**
   * Carbon method GetSoundBankStatus: by name or key; "not_loaded" when unknown.
   *
   * @implemented
   */

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

  /**
   * Carbon method GetLoadedSoundBanks: names with status loaded OR loading (Carbon counts both).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
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

  /**
   * Carbon method SetGlobalRTPC: pure backend passthrough, enabled-gated, no caching.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
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

  /**
   * Carbon method SetState (global state group): passthrough, enabled-gated.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
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

  /**
   * Carbon method LogPostEvent.
   *
   * @implemented
   */

  LogPostEvent(emitterID, playID, eventID, name)
  {
    if (this.log)
    {
      this.log.LogPostEvent(emitterID, playID, eventID, name);
    }
  }

  /**
   * Carbon method LogExecuteActionOnPlayingID.
   *
   * @implemented
   */

  LogExecuteActionOnPlayingID(emitterID, playID, action)
  {
    if (this.log)
    {
      this.log.LogExecuteActionOnPlayingID(emitterID, playID, action);
    }
  }

  /**
   * Carbon method LogSetSwitch.
   *
   * @implemented
   */

  LogSetSwitch(emitterID, group, state)
  {
    if (this.log)
    {
      this.log.LogSetSwitch(emitterID, group, state);
    }
  }

  /**
   * Carbon method LogSetState.
   *
   * @implemented
   */

  LogSetState(group, state)
  {
    if (this.log)
    {
      this.log.LogSetState(group, state);
    }
  }

  /**
   * Carbon method LogSetRTPC.
   *
   * @implemented
   */

  LogSetRTPC(emitterID, name, value, playID = 0)
  {
    if (this.log)
    {
      this.log.LogSetRTPC(emitterID, name, value, playID);
    }
  }

  /**
   * Carbon method GetSpatialAudioGeometryEnabled.
   *
   * @implemented
   */

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
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  SetEmitterLineOfSightBlockage(emitterID, blockage)
  {
    return this._obstructionOcclusion.SetEmitterLineOfSightBlockage(
      emitterID,
      blockage,
    );
  }

  /**
   * Carbon method GetEmitterOcclusion: returns the live, mid-fade value.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  GetEmitterOcclusion(emitterID)
  {
    return this._obstructionOcclusion.GetEmitterOcclusion(emitterID);
  }

  /**
   * Carbon method ClearObstructionOcclusion: fades every target to clear.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  ClearObstructionOcclusion()
  {
    this._obstructionOcclusion.ClearAll();
  }

  /**
   * Carbon Blue property getter for game-driven obstruction/occlusion.
   *
   * @implemented
   */

  GetObstructionOcclusionEnabled()
  {
    return this._obstructionOcclusion.IsEnabled();
  }

  /**
   * Carbon Blue property setter for game-driven obstruction/occlusion.
   *
   * @implemented
   */

  SetObstructionOcclusionEnabled(value)
  {
    this._obstructionOcclusion.SetEnabled(value);
  }

  /**
   * obstructionOcclusionEnabled (MAP_PROPERTY): Carbon's property over GetObstructionOcclusionEnabled/SetObstructionOcclusionEnabled, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:54).
   *
   * @implemented
   */
  @be.mapProperty()
  get obstructionOcclusionEnabled()
  {
    return this.GetObstructionOcclusionEnabled();
  }

  /** @implemented */

  set obstructionOcclusionEnabled(value)
  {
    this.SetObstructionOcclusionEnabled(value);
  }

  /**
   * Carbon Blue property getter for the obstruction/occlusion fade rate.
   *
   * @implemented
   */

  GetObstructionOcclusionFadeRate()
  {
    return this._obstructionOcclusion.GetFadeRate();
  }

  /**
   * Carbon Blue property setter for the obstruction/occlusion fade rate.
   *
   * @implemented
   */

  SetObstructionOcclusionFadeRate(value)
  {
    this._obstructionOcclusion.SetFadeRate(value);
  }

  /**
   * obstructionOcclusionFadeRate (MAP_PROPERTY): Carbon's property over GetObstructionOcclusionFadeRate/SetObstructionOcclusionFadeRate, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:55).
   *
   * @implemented
   */
  @be.mapProperty()
  get obstructionOcclusionFadeRate()
  {
    return this.GetObstructionOcclusionFadeRate();
  }

  /** @implemented */

  set obstructionOcclusionFadeRate(value)
  {
    this.SetObstructionOcclusionFadeRate(value);
  }

  /**
   * Carbon method SetSpatialAudioGeometryEnabled.
   *
   * @adapted Browser backends may expose InitSpatialAudioGeometry; the setting and geometry lifecycle remain
   *   available even though WebAudio has no native diffraction engine.
   */

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

  /**
   * Returns the spatial-audio movement threshold.
   *
   * @implemented
   */
  GetMovementThreshold()
  {
    return this._spatialAudioSettings.GetMovementThreshold();
  }

  /**
   * Sets the spatial-audio movement threshold.
   *
   * @implemented
   */
  SetMovementThreshold(value)
  {
    this._spatialAudioSettings.SetMovementThreshold(value);
  }

  /**
   * movementThreshold (MAP_PROPERTY): Carbon's property over GetMovementThreshold/SetMovementThreshold, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:38).
   *
   * @implemented
   */
  @be.mapProperty()
  get movementThreshold()
  {
    return this.GetMovementThreshold();
  }

  /** @implemented */

  set movementThreshold(value)
  {
    this.SetMovementThreshold(value);
  }

  /**
   * Returns the maximum number of primary spatial-audio rays.
   *
   * @implemented
   */
  GetNumberOfPrimaryRays()
  {
    return this._spatialAudioSettings.GetNumberOfPrimaryRays();
  }

  /**
   * Sets the maximum number of primary spatial-audio rays.
   *
   * @implemented
   */
  SetNumberOfPrimaryRays(value)
  {
    this._spatialAudioSettings.SetNumberOfPrimaryRays(value);
  }

  /**
   * numberOfPrimaryRays (MAP_PROPERTY): Carbon's property over GetNumberOfPrimaryRays/SetNumberOfPrimaryRays, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:39).
   *
   * @implemented
   */
  @be.mapProperty()
  get numberOfPrimaryRays()
  {
    return this.GetNumberOfPrimaryRays();
  }

  /** @implemented */

  set numberOfPrimaryRays(value)
  {
    this.SetNumberOfPrimaryRays(value);
  }

  /**
   * Returns the maximum reflection order.
   *
   * @implemented
   */
  GetMaxReflectionOrder()
  {
    return this._spatialAudioSettings.GetMaxReflectionOrder();
  }

  /**
   * Sets the maximum reflection order.
   *
   * @implemented
   */
  SetMaxReflectionOrder(value)
  {
    this._spatialAudioSettings.SetMaxReflectionOrder(value);
  }

  /**
   * maxReflectionOrder (MAP_PROPERTY): Carbon's property over GetMaxReflectionOrder/SetMaxReflectionOrder, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:40).
   *
   * @implemented
   */
  @be.mapProperty()
  get maxReflectionOrder()
  {
    return this.GetMaxReflectionOrder();
  }

  /** @implemented */

  set maxReflectionOrder(value)
  {
    this.SetMaxReflectionOrder(value);
  }

  /**
   * Returns the maximum diffraction order.
   *
   * @implemented
   */
  GetMaxDiffractionOrder()
  {
    return this._spatialAudioSettings.GetMaxDiffractionOrder();
  }

  /**
   * Sets the maximum diffraction order.
   *
   * @implemented
   */
  SetMaxDiffractionOrder(value)
  {
    this._spatialAudioSettings.SetMaxDiffractionOrder(value);
  }

  /**
   * maxDiffractionOrder (MAP_PROPERTY): Carbon's property over GetMaxDiffractionOrder/SetMaxDiffractionOrder, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:41).
   *
   * @implemented
   */
  @be.mapProperty()
  get maxDiffractionOrder()
  {
    return this.GetMaxDiffractionOrder();
  }

  /** @implemented */

  set maxDiffractionOrder(value)
  {
    this.SetMaxDiffractionOrder(value);
  }

  /**
   * Returns the maximum number of emitter room auxiliary sends.
   *
   * @implemented
   */
  GetMaxEmitterRoomAuxSends()
  {
    return this._spatialAudioSettings.GetMaxEmitterRoomAuxSends();
  }

  /**
   * Sets the maximum number of emitter room auxiliary sends.
   *
   * @implemented
   */
  SetMaxEmitterRoomAuxSends(value)
  {
    this._spatialAudioSettings.SetMaxEmitterRoomAuxSends(value);
  }

  /**
   * maxEmitterRoomAuxSends (MAP_PROPERTY): Carbon's property over GetMaxEmitterRoomAuxSends/SetMaxEmitterRoomAuxSends, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:42).
   *
   * @implemented
   */
  @be.mapProperty()
  get maxEmitterRoomAuxSends()
  {
    return this.GetMaxEmitterRoomAuxSends();
  }

  /** @implemented */

  set maxEmitterRoomAuxSends(value)
  {
    this.SetMaxEmitterRoomAuxSends(value);
  }

  /**
   * Returns the diffraction order applied at reflection endpoints.
   *
   * @implemented
   */
  GetDiffractionOnReflectionsOrder()
  {
    return this._spatialAudioSettings.GetDiffractionOnReflectionsOrder();
  }

  /**
   * Sets the diffraction order applied at reflection endpoints.
   *
   * @implemented
   */
  SetDiffractionOnReflectionsOrder(value)
  {
    this._spatialAudioSettings.SetDiffractionOnReflectionsOrder(value);
  }

  /**
   * diffractionOnReflectionsOrder (MAP_PROPERTY): Carbon's property over GetDiffractionOnReflectionsOrder/SetDiffractionOnReflectionsOrder, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:43).
   *
   * @implemented
   */
  @be.mapProperty()
  get diffractionOnReflectionsOrder()
  {
    return this.GetDiffractionOnReflectionsOrder();
  }

  /** @implemented */

  set diffractionOnReflectionsOrder(value)
  {
    this.SetDiffractionOnReflectionsOrder(value);
  }

  /**
   * Returns the maximum spatial-audio path length.
   *
   * @implemented
   */
  GetMaxPathLength()
  {
    return this._spatialAudioSettings.GetMaxPathLength();
  }

  /**
   * Sets the maximum spatial-audio path length.
   *
   * @implemented
   */
  SetMaxPathLength(value)
  {
    this._spatialAudioSettings.SetMaxPathLength(value);
  }

  /**
   * maxPathLength (MAP_PROPERTY): Carbon's property over GetMaxPathLength/SetMaxPathLength, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:44).
   *
   * @implemented
   */
  @be.mapProperty()
  get maxPathLength()
  {
    return this.GetMaxPathLength();
  }

  /** @implemented */

  set maxPathLength(value)
  {
    this.SetMaxPathLength(value);
  }

  /**
   * Returns the targeted spatial-audio CPU percentage.
   *
   * @implemented
   */
  GetCPULimitPercentage()
  {
    return this._spatialAudioSettings.GetCPULimitPercentage();
  }

  /**
   * Sets the targeted spatial-audio CPU percentage.
   *
   * @implemented
   */
  SetCPULimitPercentage(value)
  {
    this._spatialAudioSettings.SetCPULimitPercentage(value);
  }

  /**
   * cpuLimitPercentage (MAP_PROPERTY): Carbon's property over GetCPULimitPercentage/SetCPULimitPercentage, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:45).
   *
   * @implemented
   */
  @be.mapProperty()
  get cpuLimitPercentage()
  {
    return this.GetCPULimitPercentage();
  }

  /** @implemented */

  set cpuLimitPercentage(value)
  {
    this.SetCPULimitPercentage(value);
  }

  /**
   * Returns the spatial-audio load-balancing spread.
   *
   * @implemented
   */
  GetLoadBalancingSpread()
  {
    return this._spatialAudioSettings.GetLoadBalancingSpread();
  }

  /**
   * Sets the spatial-audio load-balancing spread.
   *
   * @implemented
   */
  SetLoadBalancingSpread(value)
  {
    this._spatialAudioSettings.SetLoadBalancingSpread(value);
  }

  /**
   * loadBalancingSpread (MAP_PROPERTY): Carbon's property over GetLoadBalancingSpread/SetLoadBalancingSpread, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:46).
   *
   * @implemented
   */
  @be.mapProperty()
  get loadBalancingSpread()
  {
    return this.GetLoadBalancingSpread();
  }

  /** @implemented */

  set loadBalancingSpread(value)
  {
    this.SetLoadBalancingSpread(value);
  }

  /**
   * Returns whether geometric diffraction and transmission are enabled.
   *
   * @implemented
   */
  GetEnableDiffractionAndTransmission()
  {
    return this._spatialAudioSettings.GetEnableDiffractionAndTransmission();
  }

  /**
   * Enables or disables geometric diffraction and transmission.
   *
   * @implemented
   */
  SetEnableDiffractionAndTransmission(value)
  {
    this._spatialAudioSettings.SetEnableDiffractionAndTransmission(value);
  }

  /**
   * enableDiffractionAndTransmission (MAP_PROPERTY): Carbon's property over GetEnableDiffractionAndTransmission/SetEnableDiffractionAndTransmission, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:47).
   *
   * @implemented
   */
  @be.mapProperty()
  get enableDiffractionAndTransmission()
  {
    return this.GetEnableDiffractionAndTransmission();
  }

  /** @implemented */

  set enableDiffractionAndTransmission(value)
  {
    this.SetEnableDiffractionAndTransmission(value);
  }

  /**
   * Returns whether Wwise calculates emitter virtual positions.
   *
   * @implemented
   */
  GetCalcEmitterVirtualPosition()
  {
    return this._spatialAudioSettings.GetCalcEmitterVirtualPosition();
  }

  /**
   * Enables or disables Wwise emitter virtual-position calculation.
   *
   * @implemented
   */
  SetCalcEmitterVirtualPosition(value)
  {
    this._spatialAudioSettings.SetCalcEmitterVirtualPosition(value);
  }

  /**
   * calcEmitterVirtualPosition (MAP_PROPERTY): Carbon's property over GetCalcEmitterVirtualPosition/SetCalcEmitterVirtualPosition, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:48).
   *
   * @implemented
   */
  @be.mapProperty()
  get calcEmitterVirtualPosition()
  {
    return this.GetCalcEmitterVirtualPosition();
  }

  /** @implemented */

  set calcEmitterVirtualPosition(value)
  {
    this.SetCalcEmitterVirtualPosition(value);
  }

  /**
   * Returns the geometry surface transmission loss.
   *
   * @implemented
   */
  GetTransmissionLoss()
  {
    return this._spatialAudioSettings.GetTransmissionLoss();
  }

  /**
   * Sets the geometry surface transmission loss.
   *
   * @implemented
   */
  SetTransmissionLoss(value)
  {
    this._spatialAudioSettings.SetTransmissionLoss(value);
  }

  /**
   * transmissionLoss (MAP_PROPERTY): Carbon's property over GetTransmissionLoss/SetTransmissionLoss, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:49).
   *
   * @implemented
   */
  @be.mapProperty()
  get transmissionLoss()
  {
    return this.GetTransmissionLoss();
  }

  /** @implemented */

  set transmissionLoss(value)
  {
    this.SetTransmissionLoss(value);
  }

  /**
   * Returns whether geometry diffraction is enabled.
   *
   * @implemented
   */
  GetEnableDiffraction()
  {
    return this._spatialAudioSettings.GetEnableDiffraction();
  }

  /**
   * Enables or disables geometry diffraction.
   *
   * @implemented
   */
  SetEnableDiffraction(value)
  {
    this._spatialAudioSettings.SetEnableDiffraction(value);
  }

  /**
   * enableDiffraction (MAP_PROPERTY): Carbon's property over GetEnableDiffraction/SetEnableDiffraction, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:50).
   *
   * @implemented
   */
  @be.mapProperty()
  get enableDiffraction()
  {
    return this.GetEnableDiffraction();
  }

  /** @implemented */

  set enableDiffraction(value)
  {
    this.SetEnableDiffraction(value);
  }

  /**
   * Returns whether geometry boundary-edge diffraction is enabled.
   *
   * @implemented
   */
  GetEnableDiffractionOnBoundaryEdges()
  {
    return this._spatialAudioSettings.GetEnableDiffractionOnBoundaryEdges();
  }

  /**
   * Enables or disables geometry boundary-edge diffraction.
   *
   * @implemented
   */
  SetEnableDiffractionOnBoundaryEdges(value)
  {
    this._spatialAudioSettings.SetEnableDiffractionOnBoundaryEdges(value);
  }

  /**
   * enableDiffractionOnBoundaryEdges (MAP_PROPERTY): Carbon's property over GetEnableDiffractionOnBoundaryEdges/SetEnableDiffractionOnBoundaryEdges, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:51).
   *
   * @implemented
   */
  @be.mapProperty()
  get enableDiffractionOnBoundaryEdges()
  {
    return this.GetEnableDiffractionOnBoundaryEdges();
  }

  /** @implemented */

  set enableDiffractionOnBoundaryEdges(value)
  {
    this.SetEnableDiffractionOnBoundaryEdges(value);
  }

  /**
   * Returns the one-shot opportunity window in milliseconds.
   *
   * @implemented
   */
  GetOneShotWindow()
  {
    return this.soundPrioritization.GetOneShotWindow();
  }

  /**
   * Sets the one-shot opportunity window in milliseconds.
   *
   * @implemented
   */
  SetOneShotWindow(value)
  {
    this.soundPrioritization.SetOneShotWindow(value);
  }

  /**
   * oneShotWindow (MAP_PROPERTY): Carbon's property over GetOneShotWindow/SetOneShotWindow, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:28).
   *
   * @implemented
   */
  @be.mapProperty()
  get oneShotWindow()
  {
    return this.GetOneShotWindow();
  }

  /** @implemented */

  set oneShotWindow(value)
  {
    this.SetOneShotWindow(value);
  }

  /**
   * Returns the weighted playing-2D contribution.
   *
   * @implemented
   */
  GetPlaying2DWeight()
  {
    return this.soundPrioritization.GetPlaying2DWeight();
  }

  /**
   * Sets the raw playing-2D weight.
   *
   * @implemented
   */
  SetPlaying2DWeight(value)
  {
    this.soundPrioritization.SetPlaying2DWeight(value);
  }

  /**
   * playing2DWeight (MAP_PROPERTY): Carbon's property over GetPlaying2DWeight/SetPlaying2DWeight, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:34).
   *
   * @implemented
   */
  @be.mapProperty()
  get playing2DWeight()
  {
    return this.GetPlaying2DWeight();
  }

  /** @implemented */

  set playing2DWeight(value)
  {
    this.SetPlaying2DWeight(value);
  }

  /**
   * Returns the weighted playing-events contribution.
   *
   * @implemented
   */
  GetPlayingEventsWeight()
  {
    return this.soundPrioritization.GetPlayingEventsWeight();
  }

  /**
   * Sets the raw playing-events weight.
   *
   * @implemented
   */
  SetPlayingEventsWeight(value)
  {
    this.soundPrioritization.SetPlayingEventsWeight(value);
  }

  /**
   * activeSoundsWeight (MAP_PROPERTY): Carbon's property over GetPlayingEventsWeight/SetPlayingEventsWeight, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:29).
   *
   * @implemented
   */
  @be.mapProperty()
  get activeSoundsWeight()
  {
    return this.GetPlayingEventsWeight();
  }

  /** @implemented */

  set activeSoundsWeight(value)
  {
    this.SetPlayingEventsWeight(value);
  }

  /**
   * Returns the weighted vital-sound contribution.
   *
   * @implemented
   */
  GetPlayingVitalSoundWeight()
  {
    return this.soundPrioritization.GetPlayingVitalSoundWeight();
  }

  /**
   * Sets the raw vital-sound weight.
   *
   * @implemented
   */
  SetPlayingVitalSoundWeight(value)
  {
    this.soundPrioritization.SetPlayingVitalSoundWeight(value);
  }

  /**
   * Returns the weighted range contribution.
   *
   * @implemented
   */
  GetRangeWeight()
  {
    return this.soundPrioritization.GetRangeWeight();
  }

  /**
   * Sets the raw range weight.
   *
   * @implemented
   */
  SetRangeWeight(value)
  {
    this.soundPrioritization.SetRangeWeight(value);
  }

  /**
   * rangeWeight (MAP_PROPERTY): Carbon's property over GetRangeWeight/SetRangeWeight, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:30).
   *
   * @implemented
   */
  @be.mapProperty()
  get rangeWeight()
  {
    return this.GetRangeWeight();
  }

  /** @implemented */

  set rangeWeight(value)
  {
    this.SetRangeWeight(value);
  }

  /**
   * Returns the weighted used-emitter contribution.
   *
   * @implemented
   */
  GetUsedEmitterWeight()
  {
    return this.soundPrioritization.GetUsedEmitterWeight();
  }

  /**
   * Sets the raw used-emitter weight.
   *
   * @implemented
   */
  SetUsedEmitterWeight(value)
  {
    this.soundPrioritization.SetUsedEmitterWeight(value);
  }

  /**
   * usedEmitterWeight (MAP_PROPERTY): Carbon's property over GetUsedEmitterWeight/SetUsedEmitterWeight, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:31).
   *
   * @implemented
   */
  @be.mapProperty()
  get usedEmitterWeight()
  {
    return this.GetUsedEmitterWeight();
  }

  /** @implemented */

  set usedEmitterWeight(value)
  {
    this.SetUsedEmitterWeight(value);
  }

  /**
   * Returns the weighted visibility contribution.
   *
   * @implemented
   */
  GetVisibleWeight()
  {
    return this.soundPrioritization.GetVisibleWeight();
  }

  /**
   * Sets the raw visibility weight.
   *
   * @implemented
   */
  SetVisibleWeight(value)
  {
    this.soundPrioritization.SetVisibleWeight(value);
  }

  /**
   * visibleWeight (MAP_PROPERTY): Carbon's property over GetVisibleWeight/SetVisibleWeight, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:33).
   *
   * @implemented
   */
  @be.mapProperty()
  get visibleWeight()
  {
    return this.GetVisibleWeight();
  }

  /** @implemented */

  set visibleWeight(value)
  {
    this.SetVisibleWeight(value);
  }

  /**
   * Returns the weighted waiting-one-shot contribution.
   *
   * @implemented
   */
  GetWaitingOneShotWeight()
  {
    return this.soundPrioritization.GetWaitingOneShotWeight();
  }

  /**
   * Sets the raw waiting-one-shot weight.
   *
   * @implemented
   */
  SetWaitingOneShotWeight(value)
  {
    this.soundPrioritization.SetWaitingOneShotWeight(value);
  }

  /**
   * waitingOneShotWeight (MAP_PROPERTY): Carbon's property over GetWaitingOneShotWeight/SetWaitingOneShotWeight, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:32).
   *
   * @implemented
   */
  @be.mapProperty()
  get waitingOneShotWeight()
  {
    return this.GetWaitingOneShotWeight();
  }

  /** @implemented */

  set waitingOneShotWeight(value)
  {
    this.SetWaitingOneShotWeight(value);
  }

  /**
   * Returns the global prioritization weight multiplier.
   *
   * @implemented
   */
  GetWeightMultiplier()
  {
    return this.soundPrioritization.GetWeightMultiplier();
  }

  /**
   * Sets the global prioritization weight multiplier.
   *
   * @implemented
   */
  SetWeightMultiplier(value)
  {
    this.soundPrioritization.SetWeightMultiplier(value);
  }

  /**
   * weightMultiplier (MAP_PROPERTY): Carbon's property over GetWeightMultiplier/SetWeightMultiplier, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:26).
   *
   * @implemented
   */
  @be.mapProperty()
  get weightMultiplier()
  {
    return this.GetWeightMultiplier();
  }

  /** @implemented */

  set weightMultiplier(value)
  {
    this.SetWeightMultiplier(value);
  }

  /**
   * Returns the maximum number of awake audio objects.
   *
   * @implemented
   */
  GetMaxAwakeGameObjects()
  {
    return this.soundPrioritization.GetMaxAwakeGameObjects();
  }

  /**
   * Sets the maximum number of awake audio objects.
   *
   * @implemented
   */
  SetMaxAwakeGameObjects(value)
  {
    this.soundPrioritization.SetMaxAwakeGameObjects(value);
  }

  /**
   * maxAwakeGameObjects (MAP_PROPERTY): Carbon's property over GetMaxAwakeGameObjects/SetMaxAwakeGameObjects, which the macro calls.
   * Carbon: MAP_PROPERTY (audio/src/AudManager_Blue.cpp:25).
   *
   * @implemented
   */
  @be.mapProperty()
  get maxAwakeGameObjects()
  {
    return this.GetMaxAwakeGameObjects();
  }

  /** @implemented */

  set maxAwakeGameObjects(value)
  {
    this.SetMaxAwakeGameObjects(value);
  }

  /**
   * Returns the non-reserved awake emitters. Source: AudManager.cpp:1247-1258 (commit c9b986d).
   *
   * @implemented
   */
  @be.mapMethodAndWrap("GetAwakeEmitters")
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

  /**
   * Carbon method StopAll: every prioritized emitter stops everything.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  StopAll()
  {
    if (this._state !== "uninitialized")
    {
      for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects())
      {
        gameObject.StopAll();
      }
    }
  }

  /**
   * Carbon method RegisterGameObject: callback map + prioritization registration.
   *
   * @implemented
   */

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
   *
   * @adapted Carbon keeps deferred emitters alive through strong pointers; CarbonEngineJS explicit release must
   *   prevent a stale post after re-adoption.
   */

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

  /**
   * Carbon method RemoveCallbackGameObject.
   *
   * @implemented
   */

  RemoveCallbackGameObject(gameObjID)
  {
    this._callbackGameObjects.delete(gameObjID);
  }

  /**
   * Carbon method GetAudioEmitter (by game-object id).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  GetAudioEmitter(gameObjID)
  {
    return this._callbackGameObjects.get(gameObjID) ?? null;
  }

  /**
   * Carbon method WithCallbackGameObject.
   *
   * @adapted The native locked callback map is synchronous in JavaScript's single-threaded graph runtime.
   */

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

  /**
   * Carbon debug method GetEventName.
   *
   * @adapted Carbon dereferences a missing emitter in this debug helper; the JavaScript graph returns an empty name
   *   when no emitter is registered.
   */

  GetEventName(emitterID, playingID)
  {
    const emitter = this.GetAudioEmitter(emitterID);
    return emitter ? emitter.GetPlayingEvents().get(playingID) ?? "" : "";
  }

  /**
   * Carbon method GetListener: the fixed-id listener object.
   *
   * @implemented
   */

  GetListener()
  {
    return this.GetAudioEmitter(LISTENER_GAME_OBJ_ID);
  }

  /**
   * Carbon method RegisterParameter: watcher refcount, entry created at 1.
   *
   * @implemented
   */

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

  /**
   * Carbon method UnregisterParameter: erased when watchers hit 0.
   *
   * @implemented
   */

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

  /**
   * Carbon method GetParameterInfo.
   *
   * @implemented
   */

  GetParameterInfo(name)
  {
    return this._monitoredParameters.get(String(name)) ?? null;
  }

  /**
   * Carbon method UpdateMonitoredParameters: refresh every entry from the backend RTPC query.
   *
   * @implemented
   */

  UpdateMonitoredParameters()
  {
    for (const [name, entry] of this._monitoredParameters)
    {
      const value = AudGameObjResource.backend?.GetGlobalRTPCValue(name);
      entry.parameterExists = value !== undefined && value !== null;
      entry.parameterValue = entry.parameterExists ? Number(value) : 0;
    }
  }

  /**
   * Carbon method GetAudioCullingEnabled.
   *
   * @implemented
   */

  GetAudioCullingEnabled()
  {
    this.audioCullingEnabled = this.soundPrioritization.GetAudioCullingEnabled();
    return this.audioCullingEnabled;
  }

  /**
   * Carbon Blue property getter GetAudioCullingEnabledProperty.
   *
   * @implemented
   */

  GetAudioCullingEnabledProperty()
  {
    return this.GetAudioCullingEnabled();
  }

  /**
   * Carbon method Process: cull (when enabled+flagged), render, flush the log.
   *
   * @implemented
   */

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
    if (this.log)
    {
      this.log.Flush();
    }
  }

  /**
   * Carbon method UpdateSettings.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  UpdateSettings(settings)
  {
    this.settings = settings;
  }

  /**
   * Carbon method DisableAudioCulling: wake all objects, then disable prioritization.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  DisableAudioCulling()
  {
    for (const object of this.soundPrioritization.GetPrioritizedAudioObjects())
    {
      if (object.IsCulled())
      {
        object.Wake();
      }
    }
    this.soundPrioritization.DisableAudioCulling();
    this.audioCullingEnabled = false;
  }

  /**
   * Carbon method EnableAudioCulling.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  EnableAudioCulling()
  {
    this.soundPrioritization.EnableAudioCulling();
    this.audioCullingEnabled = true;
  }

  /**
   * Carbon debug method GetPrioritizedEmitters: defensive current-order snapshot.
   *
   * @adapted Carbon returns SoundPrioritization's current debug list; CarbonEngineJS returns a defensive array of the
   *   same current order.
   * @renamed GetPrioritizedAudioEmitters
   */
  GetPrioritizedEmitters()
  {
    return this.soundPrioritization.GetPrioritizedAudioObjects();
  }

  /**
   * Carbon debug flag; renderer consumption remains optional.
   *
   * @adapted Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected
   *   renderer.
   */
  @be.mapMethodAndWrap()
  EnableDebugDisplayAllEmitters()
  {
    this._debugDisplayAllEmitters = true;
  }

  /**
   * Carbon debug flag; renderer consumption remains optional.
   *
   * @adapted Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected
   *   renderer.
   */
  @be.mapMethodAndWrap()
  DisableDebugDisplayAllEmitters()
  {
    this._debugDisplayAllEmitters = false;
  }

  /**
   * Carbon debug flag query.
   *
   * @adapted The value is available to browser renderers even though the audio layer does not draw debug geometry.
   */
  @be.mapMethodAndWrap()
  GetDebugDisplayAllEmitters()
  {
    return this._debugDisplayAllEmitters;
  }

  /**
   * Native Wwise output-device replacement has no WebAudio equivalent.
   *
   * @notSupported
   */
  @be.mapMethodAndWrap()
  EnableSpatialAudio()
  {
    return false;
  }

  /**
   * Native Wwise output-device replacement has no WebAudio equivalent.
   *
   * @notSupported
   */
  @be.mapMethodAndWrap()
  DisableSpatialAudio()
  {
    return false;
  }

  /**
   * OS/Wwise spatial-output support cannot be inferred from a WebAudio panner.
   *
   * @notSupported
   */
  @be.mapMethodAndWrap()
  SpatialAudioIsSupported()
  {
    return false;
  }

  /**
   * Native audio-device callbacks have no owned browser equivalent.
   *
   * @notSupported
   */
  @be.mapMethodAndWrap()
  RegisterAudioDeviceChangeCallback(callback)
  {
    return false;
  }

  /**
   * Native Wwise profiler capture is unavailable in WebAudio.
   *
   * @notSupported
   */
  @be.mapMethodAndWrap()
  StartProfilerCapture()
  {
    return false;
  }

  /**
   * Native Wwise profiler capture is unavailable in WebAudio.
   *
   * @notSupported
   */
  @be.mapMethodAndWrap()
  StopProfilerCapture()
  {
    return false;
  }

  /**
   * Native Wwise profiler capture is unavailable in WebAudio.
   *
   * @notSupported
   */
  @be.mapMethodAndWrap()
  IsProfilerCapturing()
  {
    return false;
  }

  /**
   * Carbon method ResetCullingSettings.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  ResetCullingSettings()
  {
    this.soundPrioritization.ResetCullingSettings();
  }

}
