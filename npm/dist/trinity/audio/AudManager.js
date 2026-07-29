import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl, carbon } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { AudGameObjResource as _AudGameObjResource } from './AudGameObjResource.js';
import { AudGeometry as _AudGeometry } from './AudGeometry.js';
import { SoundPrioritization as _SoundPrioritization, LISTENER_GAME_OBJ_ID } from './SoundPrioritization.js';
import { SpatialAudioSettings as _SpatialAudioSettings } from './SpatialAudioSettings.js';

let _initProto, _initClass, _init_log, _init_extra_log, _init_audioCullingEnabled, _init_extra_audioCullingEnabled, _init_spatialAudioEnabled, _init_extra_spatialAudioEnabled, _init_settings, _init_extra_settings;

// C++ ComputeWwiseHashForSoundBank strips from the first "." then hashes via
// AK GetIDFromString; headless we key by the stripped name (adapted - the
// numeric hash only matters to Wwise).
function BankKey(name) {
  const text = String(name);
  const dot = text.indexOf(".");
  return dot === -1 ? text : text.slice(0, dot);
}

/** AudManager (audio) - engine lifecycle, bank state machine, global RTPC/state, monitored parameters. */
let _AudManager;
class AudManager extends CjsModel {
  static {
    ({
      e: [_init_log, _init_extra_log, _init_audioCullingEnabled, _init_extra_audioCullingEnabled, _init_spatialAudioEnabled, _init_extra_spatialAudioEnabled, _init_settings, _init_extra_settings, _initProto],
      c: [_AudManager, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudManager",
      family: "audio"
    })], [[[io, io.readwrite, void 0, type.objectRef("IAudActionLog")], 16, "log"], [[io, io.read, type, type.boolean], 16, "audioCullingEnabled"], [[io, io.read, type, type.boolean], 16, "spatialAudioEnabled"], [[impl, impl.adapted, void 0, impl.reason("Carbon supplies this via UpdateSettings() outside Blue serialization; CarbonEngineJS persists it for values interchange."), io, io.persist, void 0, type.model("AudSettings")], 16, "settings"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetState"], [[void 0, carbon.renamed("GetState"), impl, impl.implemented], 18, "GetStateValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Wwise engine init (memory/stream/sound/spatial) is the backend's Init; the state machine, bank loads, and wake pass are faithful. Carbon's Enable bails un-enabled when Init fails (audio/src/AudManager.cpp:848-881); a missing backend seam is that failure, so headless the manager stays a true null manager and emitters keep queueing on their wake sets.")], 18, "Enable"], [[carbon, carbon.method, impl, impl.implemented], 18, "Disable"], [[carbon, carbon.method, impl, impl.implemented], 18, "LoadBank"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnloadBank"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearBanks"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSoundBankStatus"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterEventAfterSoundBankLoad"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSoundBankStatus"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLoadedSoundBanks"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetGlobalRTPC"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetState"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogPostEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogExecuteActionOnPlayingID"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogSetSwitch"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogSetState"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogSetRTPC"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSpatialAudioGeometryEnabled"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Browser backends may expose InitSpatialAudioGeometry; the setting and geometry lifecycle remain available even though WebAudio has no native diffraction engine.")], 18, "SetSpatialAudioGeometryEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMovementThreshold"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMovementThreshold"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetNumberOfPrimaryRays"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetNumberOfPrimaryRays"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxReflectionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxReflectionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxDiffractionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxDiffractionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxEmitterRoomAuxSends"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxEmitterRoomAuxSends"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDiffractionOnReflectionsOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDiffractionOnReflectionsOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxPathLength"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxPathLength"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCPULimitPercentage"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCPULimitPercentage"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLoadBalancingSpread"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetLoadBalancingSpread"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEnableDiffractionAndTransmission"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEnableDiffractionAndTransmission"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCalcEmitterVirtualPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCalcEmitterVirtualPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTransmissionLoss"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTransmissionLoss"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEnableDiffraction"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEnableDiffraction"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEnableDiffractionOnBoundaryEdges"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEnableDiffractionOnBoundaryEdges"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetOneShotWindow"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOneShotWindow"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlaying2DWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPlaying2DWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlayingEventsWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPlayingEventsWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlayingVitalSoundWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPlayingVitalSoundWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetRangeWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetUsedEmitterWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetUsedEmitterWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVisibleWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetVisibleWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWaitingOneShotWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetWaitingOneShotWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWeightMultiplier"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetWeightMultiplier"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxAwakeGameObjects"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxAwakeGameObjects"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopAll"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterGameObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterGameObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "RemoveCallbackGameObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAudioEmitter"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The native locked callback map is synchronous in JavaScript's single-threaded graph runtime.")], 18, "WithCallbackGameObject"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon dereferences a missing emitter in this debug helper; the JavaScript graph returns an empty name when no emitter is registered.")], 18, "GetEventName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetListener"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterInfo"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateMonitoredParameters"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAudioCullingEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAudioCullingEnabledProperty"], [[carbon, carbon.method, impl, impl.implemented], 18, "Process"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSettings"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisableAudioCulling"], [[carbon, carbon.method, impl, impl.implemented], 18, "EnableAudioCulling"], [[void 0, carbon.renamed("GetPrioritizedAudioEmitters"), impl, impl.adapted, void 0, impl.reason("Carbon returns SoundPrioritization's current debug list; CarbonEngineJS returns a defensive array of the same current order.")], 18, "GetPrioritizedEmitters"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected renderer.")], 18, "EnableDebugDisplayAllEmitters"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's native debug renderer reads a global flag; CarbonEngineJS retains the flag for an injected renderer.")], 18, "DisableDebugDisplayAllEmitters"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The value is available to browser renderers even though runtime-audio does not draw debug geometry.")], 18, "GetDebugDisplayAllEmitters"], [[carbon, carbon.method, impl, impl.notSupported], 18, "EnableSpatialAudio"], [[carbon, carbon.method, impl, impl.notSupported], 18, "DisableSpatialAudio"], [[carbon, carbon.method, impl, impl.notSupported], 18, "SpatialAudioIsSupported"], [[carbon, carbon.method, impl, impl.notSupported], 18, "RegisterAudioDeviceChangeCallback"], [[carbon, carbon.method, impl, impl.notSupported], 18, "StartProfilerCapture"], [[carbon, carbon.method, impl, impl.notSupported], 18, "StopProfilerCapture"], [[carbon, carbon.method, impl, impl.notSupported], 18, "IsProfilerCapturing"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetCullingSettings"]], 0, void 0, CjsModel));
  }
  /** m_log (IAudActionLogPtr) [READWRITE] */
  log = (_initProto(this), _init_log(this, null));

  /** m_audioCullingEnabled (mutable bool) [READ] */
  audioCullingEnabled = (_init_extra_log(this), _init_audioCullingEnabled(this, true));

  /** m_spatialAudioEnabled (bool) [READ] */
  spatialAudioEnabled = (_init_extra_audioCullingEnabled(this), _init_spatialAudioEnabled(this, true));

  /** m_settings (AudSettingsPtr) [AUTHORED] */
  settings = (_init_extra_spatialAudioEnabled(this), _init_settings(this, null));

  // AudioState (Uninitialized/Disabled/Enabled) as lowercase strings;
  // GetStateValue preserves Carbon's 0/1/2.
  #state = (_init_extra_settings(this), "uninitialized");
  #soundBankInfoMap = new Map();
  #monitoredParameters = new Map();
  #callbackGameObjects = new Map();
  #debugDisplayAllEmitters = false;
  #spatialAudioSettings = new _SpatialAudioSettings();

  // CarbonEngineJS-original: the prioritization is a public collaborator so
  // emitters can read weights directly (see AudGameObjResource notes).
  soundPrioritization = new _SoundPrioritization();

  /** Enabled convenience over the Carbon state (the guard emitters check). */
  get enabled() {
    return this.#state === "enabled";
  }

  /** Carbon method GetState. */
  GetState() {
    return this.#state;
  }

  /** Carbon method GetStateValue: Carbon's scripting int (0/1/2). */
  GetStateValue() {
    return this.#state === "uninitialized" ? 0 : this.#state === "disabled" ? 1 : 2;
  }

  /** Carbon method Enable: init if needed, enable, load Init.bnk + requested banks, wake everything. */
  Enable(soundBanksToLoad = []) {
    if (this.#state === "enabled") {
      return;
    }
    const backend = _AudGameObjResource.backend;
    if (this.#state === "uninitialized") {
      const repository = _AudGameObjResource.staticDataRepository;
      if (!repository?.IsInitialized()) {
        return;
      }
      // The backend seam is the sound engine: absent, or an Init that
      // explicitly fails, means Carbon's Init() failure - stay un-enabled.
      // A backend without an Init method counts as initialized.
      if (!backend || backend.Init?.(this.settings) === false) {
        return;
      }
      this.#state = "disabled";
    }
    if (!backend) {
      return;
    }
    this.#state = "enabled";
    this.LoadBank("Init.bnk");
    for (const bank of soundBanksToLoad) {
      this.LoadBank(bank);
    }
    for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects()) {
      gameObject.Wake();
    }
  }

  /** Carbon method Disable: cull everything, clear banks, drop to disabled (engine stays initialized). */
  Disable() {
    if (this.#state !== "enabled") {
      return;
    }
    for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects()) {
      gameObject.Cull();
    }
    this.ClearBanks();
    _AudGeometry.ClearAllGeometry();
    this.#state = "disabled";
  }

  /** Carbon method LoadBank: async - tracked LOADING immediately; backend callback drives LOADED. */
  LoadBank(name) {
    if (this.#state !== "enabled") {
      return;
    }
    const key = BankKey(name);
    const status = this.GetSoundBankStatus(name);
    if (status === "loaded" || status === "loading") {
      return;
    }
    this.#soundBankInfoMap.set(key, {
      soundBankStatus: "loading",
      soundBankID: key,
      soundBankName: String(name),
      waitingEventsAfterLoad: []
    });
    _AudGameObjResource.backend?.LoadBank?.(String(name), loaded => this.UpdateSoundBankStatus(key, loaded ? "loaded" : "not_loaded"));
  }

  /** Carbon method UnloadBank. */
  UnloadBank(name) {
    if (this.#state !== "enabled") {
      return;
    }
    const key = BankKey(name);
    const status = this.GetSoundBankStatus(name);
    if (status === "not_loaded" || status === "unloading") {
      return;
    }
    this.UpdateSoundBankStatus(key, "unloading");
    _AudGameObjResource.backend?.UnloadBank?.(String(name), () => this.#soundBankInfoMap.delete(key));
  }

  /** Carbon method ClearBanks. */
  ClearBanks() {
    if (this.#state !== "uninitialized") {
      _AudGameObjResource.backend?.ClearBanks?.();
      this.#soundBankInfoMap.clear();
    }
  }

  // The deferred-event flush: waiting events fire with bypassPrefix=true
  // exactly on the transition to LOADED, then the queue clears.
  /** Carbon method UpdateSoundBankStatus. */
  UpdateSoundBankStatus(bankID, status) {
    const info = this.#soundBankInfoMap.get(bankID);
    if (!info) {
      return;
    }
    info.soundBankStatus = status;
    if (status === "loaded") {
      for (const [emitter, eventName] of info.waitingEventsAfterLoad) {
        emitter?.PostEvent(eventName, true);
      }
      info.waitingEventsAfterLoad.length = 0;
    }
  }

  /** Carbon method RegisterEventAfterSoundBankLoad: queue an event on a LOADING bank (matched by name). */
  RegisterEventAfterSoundBankLoad(soundBankName, eventName, emitter) {
    for (const info of this.#soundBankInfoMap.values()) {
      if (info.soundBankName === String(soundBankName)) {
        info.waitingEventsAfterLoad.push([emitter, String(eventName)]);
      }
    }
  }

  /** Carbon method GetSoundBankStatus: by name or key; "not_loaded" when unknown. */
  GetSoundBankStatus(name) {
    const byKey = this.#soundBankInfoMap.get(BankKey(name));
    if (byKey) {
      return byKey.soundBankStatus;
    }
    for (const info of this.#soundBankInfoMap.values()) {
      if (info.soundBankName === String(name)) {
        return info.soundBankStatus;
      }
    }
    return "not_loaded";
  }

  /** Carbon method GetLoadedSoundBanks: names with status loaded OR loading (Carbon counts both). */
  GetLoadedSoundBanks() {
    const names = [];
    for (const info of this.#soundBankInfoMap.values()) {
      if (info.soundBankStatus === "loaded" || info.soundBankStatus === "loading") {
        names.push(info.soundBankName);
      }
    }
    return names;
  }

  /** Carbon method SetGlobalRTPC: pure backend passthrough, enabled-gated, no caching. */
  SetGlobalRTPC(rtpcName, value) {
    if (this.#state !== "enabled") {
      return false;
    }
    if (_AudGameObjResource.backend?.SetGlobalRTPCValue?.(rtpcName, value) === false) {
      return false;
    }
    this.LogSetRTPC(0, rtpcName, value);
    return true;
  }

  /** Carbon method SetState (global state group): passthrough, enabled-gated. */
  SetState(stateGroup, stateName) {
    if (this.#state !== "enabled") {
      return false;
    }
    _AudGameObjResource.backend?.SetGlobalState?.(stateGroup, stateName);
    this.LogSetState(stateGroup, stateName);
    return true;
  }

  /** Carbon method LogPostEvent. */
  LogPostEvent(emitterID, playID, eventID, name) {
    this.log?.LogPostEvent?.(emitterID, playID, eventID, name);
  }

  /** Carbon method LogExecuteActionOnPlayingID. */
  LogExecuteActionOnPlayingID(emitterID, playID, action) {
    this.log?.LogExecuteActionOnPlayingID?.(emitterID, playID, action);
  }

  /** Carbon method LogSetSwitch. */
  LogSetSwitch(emitterID, group, state) {
    this.log?.LogSetSwitch?.(emitterID, group, state);
  }

  /** Carbon method LogSetState. */
  LogSetState(group, state) {
    this.log?.LogSetState?.(group, state);
  }

  /** Carbon method LogSetRTPC. */
  LogSetRTPC(emitterID, name, value, playID = 0) {
    this.log?.LogSetRTPC?.(emitterID, name, value, playID);
  }

  /** Carbon method GetSpatialAudioGeometryEnabled. */
  GetSpatialAudioGeometryEnabled() {
    return this.#spatialAudioSettings.GetSpatialAudioGeometryEnabled();
  }

  /** Carbon method SetSpatialAudioGeometryEnabled. */
  SetSpatialAudioGeometryEnabled(enabled) {
    const value = Boolean(enabled);
    if (this.GetSpatialAudioGeometryEnabled() === value) {
      return;
    }
    if (this.#state !== "enabled") {
      this.#spatialAudioSettings.SetSpatialAudioGeometryEnabled(value);
      return;
    }
    if (!value) {
      this.#spatialAudioSettings.SetSpatialAudioGeometryEnabled(false);
      _AudGeometry.ClearAllGeometry();
      return;
    }
    const settings = this.#spatialAudioSettings.PopulateInitSettings({});
    if (_AudGameObjResource.backend?.InitSpatialAudioGeometry?.(settings) === false) {
      return;
    }
    this.#spatialAudioSettings.SetSpatialAudioGeometryEnabled(true);
  }

  /** Returns the spatial-audio movement threshold. */
  GetMovementThreshold() {
    return this.#spatialAudioSettings.GetMovementThreshold();
  }

  /** Sets the spatial-audio movement threshold. */
  SetMovementThreshold(value) {
    this.#spatialAudioSettings.SetMovementThreshold(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  GetNumberOfPrimaryRays() {
    return this.#spatialAudioSettings.GetNumberOfPrimaryRays();
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  SetNumberOfPrimaryRays(value) {
    this.#spatialAudioSettings.SetNumberOfPrimaryRays(value);
  }

  /** Returns the maximum reflection order. */
  GetMaxReflectionOrder() {
    return this.#spatialAudioSettings.GetMaxReflectionOrder();
  }

  /** Sets the maximum reflection order. */
  SetMaxReflectionOrder(value) {
    this.#spatialAudioSettings.SetMaxReflectionOrder(value);
  }

  /** Returns the maximum diffraction order. */
  GetMaxDiffractionOrder() {
    return this.#spatialAudioSettings.GetMaxDiffractionOrder();
  }

  /** Sets the maximum diffraction order. */
  SetMaxDiffractionOrder(value) {
    this.#spatialAudioSettings.SetMaxDiffractionOrder(value);
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  GetMaxEmitterRoomAuxSends() {
    return this.#spatialAudioSettings.GetMaxEmitterRoomAuxSends();
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  SetMaxEmitterRoomAuxSends(value) {
    this.#spatialAudioSettings.SetMaxEmitterRoomAuxSends(value);
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  GetDiffractionOnReflectionsOrder() {
    return this.#spatialAudioSettings.GetDiffractionOnReflectionsOrder();
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  SetDiffractionOnReflectionsOrder(value) {
    this.#spatialAudioSettings.SetDiffractionOnReflectionsOrder(value);
  }

  /** Returns the maximum spatial-audio path length. */
  GetMaxPathLength() {
    return this.#spatialAudioSettings.GetMaxPathLength();
  }

  /** Sets the maximum spatial-audio path length. */
  SetMaxPathLength(value) {
    this.#spatialAudioSettings.SetMaxPathLength(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  GetCPULimitPercentage() {
    return this.#spatialAudioSettings.GetCPULimitPercentage();
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  SetCPULimitPercentage(value) {
    this.#spatialAudioSettings.SetCPULimitPercentage(value);
  }

  /** Returns the spatial-audio load-balancing spread. */
  GetLoadBalancingSpread() {
    return this.#spatialAudioSettings.GetLoadBalancingSpread();
  }

  /** Sets the spatial-audio load-balancing spread. */
  SetLoadBalancingSpread(value) {
    this.#spatialAudioSettings.SetLoadBalancingSpread(value);
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  GetEnableDiffractionAndTransmission() {
    return this.#spatialAudioSettings.GetEnableDiffractionAndTransmission();
  }

  /** Enables or disables geometric diffraction and transmission. */
  SetEnableDiffractionAndTransmission(value) {
    this.#spatialAudioSettings.SetEnableDiffractionAndTransmission(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  GetCalcEmitterVirtualPosition() {
    return this.#spatialAudioSettings.GetCalcEmitterVirtualPosition();
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  SetCalcEmitterVirtualPosition(value) {
    this.#spatialAudioSettings.SetCalcEmitterVirtualPosition(value);
  }

  /** Returns the geometry surface transmission loss. */
  GetTransmissionLoss() {
    return this.#spatialAudioSettings.GetTransmissionLoss();
  }

  /** Sets the geometry surface transmission loss. */
  SetTransmissionLoss(value) {
    this.#spatialAudioSettings.SetTransmissionLoss(value);
  }

  /** Returns whether geometry diffraction is enabled. */
  GetEnableDiffraction() {
    return this.#spatialAudioSettings.GetEnableDiffraction();
  }

  /** Enables or disables geometry diffraction. */
  SetEnableDiffraction(value) {
    this.#spatialAudioSettings.SetEnableDiffraction(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  GetEnableDiffractionOnBoundaryEdges() {
    return this.#spatialAudioSettings.GetEnableDiffractionOnBoundaryEdges();
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  SetEnableDiffractionOnBoundaryEdges(value) {
    this.#spatialAudioSettings.SetEnableDiffractionOnBoundaryEdges(value);
  }

  /** Returns the one-shot opportunity window in milliseconds. */
  GetOneShotWindow() {
    return this.soundPrioritization.GetOneShotWindow();
  }

  /** Sets the one-shot opportunity window in milliseconds. */
  SetOneShotWindow(value) {
    this.soundPrioritization.SetOneShotWindow(value);
  }

  /** Returns the weighted playing-2D contribution. */
  GetPlaying2DWeight() {
    return this.soundPrioritization.GetPlaying2DWeight();
  }

  /** Sets the raw playing-2D weight. */
  SetPlaying2DWeight(value) {
    this.soundPrioritization.SetPlaying2DWeight(value);
  }

  /** Returns the weighted playing-events contribution. */
  GetPlayingEventsWeight() {
    return this.soundPrioritization.GetPlayingEventsWeight();
  }

  /** Sets the raw playing-events weight. */
  SetPlayingEventsWeight(value) {
    this.soundPrioritization.SetPlayingEventsWeight(value);
  }

  /** Returns the weighted vital-sound contribution. */
  GetPlayingVitalSoundWeight() {
    return this.soundPrioritization.GetPlayingVitalSoundWeight();
  }

  /** Sets the raw vital-sound weight. */
  SetPlayingVitalSoundWeight(value) {
    this.soundPrioritization.SetPlayingVitalSoundWeight(value);
  }

  /** Returns the weighted range contribution. */
  GetRangeWeight() {
    return this.soundPrioritization.GetRangeWeight();
  }

  /** Sets the raw range weight. */
  SetRangeWeight(value) {
    this.soundPrioritization.SetRangeWeight(value);
  }

  /** Returns the weighted used-emitter contribution. */
  GetUsedEmitterWeight() {
    return this.soundPrioritization.GetUsedEmitterWeight();
  }

  /** Sets the raw used-emitter weight. */
  SetUsedEmitterWeight(value) {
    this.soundPrioritization.SetUsedEmitterWeight(value);
  }

  /** Returns the weighted visibility contribution. */
  GetVisibleWeight() {
    return this.soundPrioritization.GetVisibleWeight();
  }

  /** Sets the raw visibility weight. */
  SetVisibleWeight(value) {
    this.soundPrioritization.SetVisibleWeight(value);
  }

  /** Returns the weighted waiting-one-shot contribution. */
  GetWaitingOneShotWeight() {
    return this.soundPrioritization.GetWaitingOneShotWeight();
  }

  /** Sets the raw waiting-one-shot weight. */
  SetWaitingOneShotWeight(value) {
    this.soundPrioritization.SetWaitingOneShotWeight(value);
  }

  /** Returns the global prioritization weight multiplier. */
  GetWeightMultiplier() {
    return this.soundPrioritization.GetWeightMultiplier();
  }

  /** Sets the global prioritization weight multiplier. */
  SetWeightMultiplier(value) {
    this.soundPrioritization.SetWeightMultiplier(value);
  }

  /** Returns the maximum number of awake audio objects. */
  GetMaxAwakeGameObjects() {
    return this.soundPrioritization.GetMaxAwakeGameObjects();
  }

  /** Sets the maximum number of awake audio objects. */
  SetMaxAwakeGameObjects(value) {
    this.soundPrioritization.SetMaxAwakeGameObjects(value);
  }

  /** Carbon method StopAll: every prioritized emitter stops everything. */
  StopAll() {
    if (this.#state !== "uninitialized") {
      for (const gameObject of this.soundPrioritization.GetPrioritizedAudioObjects()) {
        gameObject.StopAll?.();
      }
    }
  }

  /** Carbon method RegisterGameObject: callback map + prioritization registration. */
  RegisterGameObject(gameObjID, gameObject) {
    if (!gameObject) {
      return;
    }
    this.#callbackGameObjects.set(gameObjID, gameObject);
    this.soundPrioritization.RegisterGameObject(gameObject);
  }

  /** Carbon method UnregisterGameObject. */
  UnregisterGameObject(gameObjID) {
    this.soundPrioritization.UnregisterGameObject(gameObjID);
  }

  /** Carbon method RemoveCallbackGameObject. */
  RemoveCallbackGameObject(gameObjID) {
    this.#callbackGameObjects.delete(gameObjID);
  }

  /** Carbon method GetAudioEmitter (by game-object id). */
  GetAudioEmitter(gameObjID) {
    return this.#callbackGameObjects.get(gameObjID) ?? null;
  }

  /** Carbon method WithCallbackGameObject. */
  WithCallbackGameObject(gameObjID, callback) {
    const emitter = this.#callbackGameObjects.get(gameObjID);
    if (!emitter) {
      return false;
    }
    callback(emitter);
    return true;
  }

  /** Carbon debug method GetEventName. */
  GetEventName(emitterID, playingID) {
    return this.GetAudioEmitter(emitterID)?.GetPlayingEvents?.().get(playingID) ?? "";
  }

  /** Carbon method GetListener: the fixed-id listener object. */
  GetListener() {
    return this.GetAudioEmitter(LISTENER_GAME_OBJ_ID);
  }

  /** Carbon method RegisterParameter: watcher refcount, entry created at 1. */
  RegisterParameter(name) {
    if (this.#state === "uninitialized") {
      return;
    }
    const entry = this.#monitoredParameters.get(String(name)) ?? {
      parameterValue: 0,
      parameterExists: false,
      watchers: 0
    };
    entry.watchers++;
    this.#monitoredParameters.set(String(name), entry);
  }

  /** Carbon method UnregisterParameter: erased when watchers hit 0. */
  UnregisterParameter(name) {
    if (this.#state === "uninitialized") {
      return;
    }
    const entry = this.#monitoredParameters.get(String(name));
    if (entry && --entry.watchers === 0) {
      this.#monitoredParameters.delete(String(name));
    }
  }

  /** Carbon method GetParameterInfo. */
  GetParameterInfo(name) {
    return this.#monitoredParameters.get(String(name)) ?? null;
  }

  /** Carbon method UpdateMonitoredParameters: refresh every entry from the backend RTPC query. */
  UpdateMonitoredParameters() {
    for (const [name, entry] of this.#monitoredParameters) {
      const value = _AudGameObjResource.backend?.GetGlobalRTPCValue?.(name);
      entry.parameterExists = value !== undefined && value !== null;
      entry.parameterValue = entry.parameterExists ? Number(value) : entry.parameterValue;
    }
  }

  /** Carbon method GetAudioCullingEnabled. */
  GetAudioCullingEnabled() {
    this.audioCullingEnabled = this.soundPrioritization.GetAudioCullingEnabled();
    return this.audioCullingEnabled;
  }

  /** Carbon Blue property getter GetAudioCullingEnabledProperty. */
  GetAudioCullingEnabledProperty() {
    return this.GetAudioCullingEnabled();
  }

  /** Carbon method Process: cull (when enabled+flagged), render, flush the log. */
  Process(now) {
    if (this.#state === "uninitialized") {
      return;
    }
    if (this.#state === "enabled") {
      if (this.soundPrioritization.GetAudioCullingEnabled()) {
        this.soundPrioritization.CullAudio(now);
      }
      _AudGameObjResource.backend?.RenderAudio?.();
    }
    this.log?.Flush?.();
  }

  /** Carbon method UpdateSettings. */
  UpdateSettings(settings) {
    this.settings = settings;
  }

  /** Carbon method DisableAudioCulling: wake all objects, then disable prioritization. */
  DisableAudioCulling() {
    for (const object of this.soundPrioritization.GetPrioritizedAudioObjects()) {
      if (object.IsCulled?.()) {
        object.Wake?.();
      }
    }
    this.soundPrioritization.DisableAudioCulling();
    this.audioCullingEnabled = false;
  }

  /** Carbon method EnableAudioCulling. */
  EnableAudioCulling() {
    this.soundPrioritization.EnableAudioCulling();
    this.audioCullingEnabled = true;
  }

  /** Carbon debug method GetPrioritizedEmitters: defensive current-order snapshot. */
  GetPrioritizedEmitters() {
    return this.soundPrioritization.GetPrioritizedAudioObjects();
  }

  /** Carbon debug flag; renderer consumption remains optional. */
  EnableDebugDisplayAllEmitters() {
    this.#debugDisplayAllEmitters = true;
  }

  /** Carbon debug flag; renderer consumption remains optional. */
  DisableDebugDisplayAllEmitters() {
    this.#debugDisplayAllEmitters = false;
  }

  /** Carbon debug flag query. */
  GetDebugDisplayAllEmitters() {
    return this.#debugDisplayAllEmitters;
  }

  /** Native Wwise output-device replacement has no WebAudio equivalent. */
  EnableSpatialAudio() {
    return false;
  }

  /** Native Wwise output-device replacement has no WebAudio equivalent. */
  DisableSpatialAudio() {
    return false;
  }

  /** OS/Wwise spatial-output support cannot be inferred from a WebAudio panner. */
  SpatialAudioIsSupported() {
    return false;
  }

  /** Native audio-device callbacks have no owned browser equivalent. */
  RegisterAudioDeviceChangeCallback(callback) {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  StartProfilerCapture() {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  StopProfilerCapture() {
    return false;
  }

  /** Native Wwise profiler capture is unavailable in WebAudio. */
  IsProfilerCapturing() {
    return false;
  }

  /** Carbon method ResetCullingSettings. */
  ResetCullingSettings() {
    this.soundPrioritization.ResetCullingSettings();
  }
  static {
    _initClass();
  }
}

export { _AudManager as AudManager };
//# sourceMappingURL=AudManager.js.map
