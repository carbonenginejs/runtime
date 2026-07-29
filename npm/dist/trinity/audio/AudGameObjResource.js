import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl, carbon } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { SoundPrioritization as _SoundPrioritization } from './SoundPrioritization.js';

let _initProto, _initStatic, _initClass, _init_eventPrefix, _init_extra_eventPrefix, _init_additionalCullingWeight, _init_extra_additionalCullingWeight, _init_ID, _init_extra_ID, _init_parameters, _init_extra_parameters, _init_name, _init_extra_name, _init_playingVitalSound, _init_extra_playingVitalSound, _init_playing2DSound, _init_extra_playing2DSound, _init_listenerInRange, _init_extra_listenerInRange, _init_isUsed, _init_extra_isUsed, _init_eventName, _init_extra_eventName, _init_cumulativeWeight, _init_extra_cumulativeWeight, _init_distanceFromListener, _init_extra_distanceFromListener, _init_scalingFactor, _init_extra_scalingFactor, _init_isVisible, _init_extra_isVisible, _init_forceCullingState, _init_extra_forceCullingState, _init_position, _init_extra_position;

// Wwise AK_INVALID_PLAYING_ID.
const INVALID_PLAYING_ID = 0;
// Audio2.h:20 START_GAME_OBJ_COUNT - ids below are reserved (listener is 4).
let nextEntityID = 5;
function GenerateEntityID() {
  return nextEntityID++;
}
function NowMs() {
  return globalThis.performance?.now() ?? Date.now();
}

/** AudGameObjResource (audio) - base Wwise game object: event/RTPC/switch bookkeeping + culling participation. */
let _AudGameObjResource;
new class extends _identity {
  static [class AudGameObjResource extends CjsModel {
    static {
      ({
        e: [_init_eventPrefix, _init_extra_eventPrefix, _init_additionalCullingWeight, _init_extra_additionalCullingWeight, _init_ID, _init_extra_ID, _init_parameters, _init_extra_parameters, _init_name, _init_extra_name, _init_playingVitalSound, _init_extra_playingVitalSound, _init_playing2DSound, _init_extra_playing2DSound, _init_listenerInRange, _init_extra_listenerInRange, _init_isUsed, _init_extra_isUsed, _init_eventName, _init_extra_eventName, _init_cumulativeWeight, _init_extra_cumulativeWeight, _init_distanceFromListener, _init_extra_distanceFromListener, _init_scalingFactor, _init_extra_scalingFactor, _init_isVisible, _init_extra_isVisible, _init_forceCullingState, _init_extra_forceCullingState, _init_position, _init_extra_position, _initProto, _initStatic],
        c: [_AudGameObjResource, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "AudGameObjResource",
        family: "audio"
      })], [[[io, io.persist, type, type.string], 16, "eventPrefix"], [[io, io.read, type, type.float32], 16, "additionalCullingWeight"], [[io, io.read, void 0, type.rawStruct("AkGameObjectID")], 16, "ID"], [[io, io.persist, void 0, type.list("AudParameter")], 16, "parameters"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.boolean], 16, "playingVitalSound"], [[io, io.read, type, type.boolean], 16, "playing2DSound"], [[io, io.read, type, type.boolean], 16, "listenerInRange"], [[io, io.read, type, type.boolean], 16, "isUsed"], [[io, io.notify, io, io.persist, type, type.string], 16, "eventName"], [[io, io.read, type, type.float32], 16, "cumulativeWeight"], [[io, io.read, type, type.float32], 16, "distanceFromListener"], [[io, io.persist, type, type.float32], 16, "scalingFactor"], [[io, io.read, type, type.boolean], 16, "isVisible"], [[io, io.read, type, type.boolean], 16, "forceCullingState"], [[impl, impl.adapted, void 0, impl.reason("Carbon routes this through Initialize(name, prefix, position) outside Blue serialization; CarbonEngineJS persists it for values interchange; OnModified derives placement from it."), io, io.persist, type, type.vec3], 16, "position"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Single method covers Carbon's no-arg and (name, prefix, position) overloads; backend registration is a no-op until realization.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "PostEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopSound"], [[carbon, carbon.method, impl, impl.implemented], 18, "BreakSound"], [[carbon, carbon.method, impl, impl.implemented], 18, "SeekOnEventPercent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SeekOnEventMs"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopAll"], [[carbon, carbon.method, impl, impl.implemented], 18, "ExecuteActionOnPlayingID"], [[carbon, carbon.method, impl, impl.implemented], 18, "MarkPlayingIDStoppedByRequest"], [[carbon, carbon.method, impl, impl.implemented], 18, "EventFinishedCallback"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetRTPC"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSwitch"], [[carbon, carbon.method, impl, impl.implemented], 18, "Wake"], [[carbon, carbon.method, impl, impl.implemented], 18, "Cull"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsCulled"], [[carbon, carbon.method, impl, impl.implemented], 18, "ForceCullingStateChange"], [[carbon, carbon.method, impl, impl.implemented], 18, "ReleaseForcedCullingState"], [[carbon, carbon.method, impl, impl.implemented], 18, "Mute"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unmute"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsMuted"], [[carbon, carbon.method, impl, impl.implemented], 26, "Orthonormalize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The RH->LH conversion and Wwise SetPosition happen in the backend seam; the headless graph stores the position.")], 18, "SetPlacementFromParent"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The RH->LH conversion and Wwise call remain in the backend seam; the runtime owns the effective orientation buffers.")], 18, "ApplyEffectivePlacement"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasAuthoredRotation"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a value struct; CarbonEngineJS returns a stable object backed by owned buffers to avoid placement-path allocations.")], 18, "GetEffectiveOrientation"], [[carbon, carbon.method, impl, impl.implemented], 18, "RefreshPlacementFromRotation"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAttenuationScalingFactor"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEventName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEventName"], [[carbon, carbon.method, impl, impl.implemented], 18, "ApplyEventStopRelationships"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterWwiseObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterWwiseObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateMaxAttenuationRadiusForEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxAttenuationRadius"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateEventSoundPrioritizationAttributes"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the weights through g_audioManager property delegates; CarbonEngineJS reads the manager's SoundPrioritization directly (same multiplied values).")], 18, "CalculateCullingWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCullingWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetID"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFront"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTop"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDistanceSqFromListener"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlayingEvents"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSwitches"], [[impl, impl.custom, void 0, impl.reason("CarbonEngineJS-only accessor over private wake-queue state; Carbon exposes no equivalent read.")], 18, "GetEventsOnWake"], [[impl, impl.custom, void 0, impl.reason("CarbonEngineJS-only accessor over private one-shot state; Carbon exposes no equivalent read.")], 18, "GetWaitingOneShot"], [[impl, impl.custom, void 0, impl.reason("JS #private fields are not subclass-visible; AudEmitter.SetPosition sets Carbon's protected m_hasReceivedPosition through this accessor.")], 18, "MarkPositionReceived"], [[impl, impl.custom, void 0, impl.reason("Carbon tests its FLT_MAX sentinel position; CarbonEngineJS tracks the equivalent state explicitly.")], 18, "HasReceivedPosition"], [[impl, impl.adapted, void 0, impl.reason("CjsModel hooks are broad-safe rather than field-addressed, so a cached quaternion detects the Carbon m_authoredRotation notification.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS receives cooperative list notifications rather than Blue IList event flags; an inserted AudParameter is bound directly.")], 18, "OnListModified"], [[impl, impl.adapted, void 0, impl.reason("Carbon marks m_hasReceivedPosition in Initialize/SetPosition only; CarbonEngineJS also accepts it at values write time because the cooperative runtime-utils model pipeline holds per-field knowledge only here, so `from({ position })` emitters can Wake.")], 18, "SetValues"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    /** m_eventPrefix (std::wstring) [READWRITE, PERSIST] */
    eventPrefix = (_initProto(this), _init_eventPrefix(this, ""));

    /** m_additionalCullingWeight (float) [READ] */
    additionalCullingWeight = (_init_extra_eventPrefix(this), _init_additionalCullingWeight(this, 0));

    /** m_ID (AkGameObjectID) [READ] */
    ID = (_init_extra_additionalCullingWeight(this), _init_ID(this, null));

    /** m_parameters (PAudParameterVector) [READ, PERSIST] */
    parameters = (_init_extra_ID(this), _init_parameters(this, []));

    /** m_name (std::string) [READWRITE, PERSIST, NOTIFY] */
    name = (_init_extra_parameters(this), _init_name(this, ""));

    /** m_playingVitalSound (bool) [READ] */
    playingVitalSound = (_init_extra_name(this), _init_playingVitalSound(this, false));

    /** m_playing2DSound (bool) [READ] */
    playing2DSound = (_init_extra_playingVitalSound(this), _init_playing2DSound(this, false));

    /** m_listenerInRange (bool) [READ] */
    listenerInRange = (_init_extra_playing2DSound(this), _init_listenerInRange(this, false));

    /** m_isUsed (bool) [READ] */
    isUsed = (_init_extra_listenerInRange(this), _init_isUsed(this, false));

    /** m_eventName (std::wstring) [READWRITE, PERSIST, NOTIFY] */
    eventName = (_init_extra_isUsed(this), _init_eventName(this, ""));

    /** m_cumulativeWeight (float) [READ] */
    cumulativeWeight = (_init_extra_eventName(this), _init_cumulativeWeight(this, 0));

    /** m_distanceSqFromListener (float) [READ] */
    distanceFromListener = (_init_extra_cumulativeWeight(this), _init_distanceFromListener(this, 0));

    /** m_scalingFactor (float) [READWRITE, PERSIST] */
    scalingFactor = (_init_extra_distanceFromListener(this), _init_scalingFactor(this, 1));

    /** m_isVisible (bool) [READ] */
    isVisible = (_init_extra_scalingFactor(this), _init_isVisible(this, false));

    /** m_forceCullingState (bool) [READ] */
    forceCullingState = (_init_extra_isVisible(this), _init_forceCullingState(this, false));

    /** m_position (Vector3) [AUTHORED] */
    position = (_init_extra_forceCullingState(this), _init_position(this, vec3.create()));

    // Runtime bookkeeping (C++ members) - rebuildable, never serialized.
    #culled = (_init_extra_position(this), true);
    #muted = false;
    #gameObjRegistered = false;
    #hasReceivedPosition = false;
    #maxAttenuationRadiusSq = 0;
    #playingEvents = new Map();
    #eventsOnWake = new Set();
    #pendingStoppedPlayingIDs = new Set();
    #rtpcValues = new Map();
    #switchValues = new Map();
    #waitingOneShotTime = 0;
    #waitingOneShotName = "";
    #parentFront = vec3.fromValues(0, 0, 1);
    #parentTop = vec3.fromValues(0, 1, 0);
    #effectiveFront = vec3.fromValues(0, 0, 1);
    #effectiveTop = vec3.fromValues(0, 1, 0);
    #candidateFront = vec3.fromValues(0, 0, 1);
    #candidateTop = vec3.fromValues(0, 1, 0);
    #candidateOrientation = {
      front: this.#candidateFront,
      top: this.#candidateTop
    };
    #normalizedTop = vec3.fromValues(0, 1, 0);
    #cross = vec3.fromValues(-1, 0, 0);
    #normalizedRotation = quat.create();
    #appliedRotation = quat.create();

    // Mirrors Carbon's two ctors: default generates an entity id; the protected
    // (AkGameObjectID) variant takes a fixed id (AudListener passes 4) so the
    // id is correct BEFORE manager registration.
    constructor(gameObjID) {
      super();
      this.ID = gameObjID ?? GenerateEntityID();
      this.#waitingOneShotTime = NowMs();
      const manager = _AudGameObjResource.manager;
      if (manager) {
        if (!manager.audioCullingEnabled) {
          this.#culled = false;
        }
        manager.RegisterGameObject?.(this.ID, this);
      }
    }

    /** Carbon method Initialize: optional (name, prefix, position), then register + replay eventName. */
    Initialize(name, prefix, position) {
      if (name !== undefined) {
        this.name = String(name);
        this.eventPrefix = String(prefix ?? "");
        if (position) {
          vec3.copy(this.position, position);
          this.#hasReceivedPosition = true;
        }
      }
      this.RegisterWwiseObject();
      this.SetPlacementFromParent([0, 0, 1], [0, 1, 0], this.position);
      if (this.eventName) {
        this.PostEvent(this.eventName);
      }
      return true;
    }

    /** Carbon method PostEvent: returns a playing id, or 0 when queued/culled/failed. */
    PostEvent(eventName, bypassPrefix = false, additionalFlags = 0) {
      const repository = _AudGameObjResource.staticDataRepository;
      if (!eventName || !repository) {
        return INVALID_PLAYING_ID;
      }
      this.isUsed = true;
      let eventUsed = false;
      const fullEventName = PrepareEvent(this.eventPrefix, eventName, bypassPrefix);
      const eventIsVital = repository.EventIsVital(fullEventName);
      let playingID = INVALID_PLAYING_ID;
      const manager = _AudGameObjResource.manager;
      if (this.#culled || !manager || !manager.enabled) {
        this.ApplyEventStopRelationships(fullEventName);
        if (repository.EventIsLoop(fullEventName) || eventIsVital) {
          this.#eventsOnWake.add(fullEventName);
        } else {
          this.#waitingOneShotTime = NowMs();
          this.#waitingOneShotName = fullEventName;
        }
        eventUsed = true;
      } else if (this.#gameObjRegistered) {
        const banks = repository.SoundBanksRequiredForEvent(fullEventName);
        if (!banks.length) {
          return INVALID_PLAYING_ID;
        }
        let soundbanksLoaded = true;
        for (const bank of banks) {
          const status = manager.GetSoundBankStatus?.(bank);
          if (status !== "loaded") {
            soundbanksLoaded = false;
            if (status === "loading") {
              manager.RegisterEventAfterSoundBankLoad?.(bank, fullEventName, this);
              break;
            }
            return INVALID_PLAYING_ID;
          }
        }
        if (soundbanksLoaded) {
          const eventID = repository.GetEventID(fullEventName);
          playingID = _AudGameObjResource.backend?.PostEvent?.(eventID, this.ID, additionalFlags, this, fullEventName) ?? INVALID_PLAYING_ID;
          manager.LogPostEvent?.(this.ID, playingID, eventID, fullEventName);
          if (playingID !== INVALID_PLAYING_ID) {
            this.ApplyEventStopRelationships(fullEventName);
            this.#playingEvents.set(playingID, fullEventName);
            eventUsed = true;
          }
        }
      }
      if (eventUsed) {
        this.UpdateMaxAttenuationRadiusForEvent(fullEventName);
        if (repository.EventIs2D(fullEventName)) {
          this.playing2DSound = true;
        }
        if (eventIsVital) {
          this.playingVitalSound = true;
        }
      }
      return playingID;
    }

    /** Carbon method StopEvent: stops every playing instance of the (prefixed) event; returns whether any matched. */
    StopEvent(eventName, fadeOutDuration = 1000) {
      const fullEventName = PrepareEvent(this.eventPrefix, eventName, false);
      let stopped = false;
      for (const [playingID, playing] of this.#playingEvents) {
        if (playing === fullEventName) {
          this.StopSound(playingID, fadeOutDuration);
          stopped = true;
        }
      }
      return stopped;
    }

    /** Carbon method StopSound: request stop for one playing id (removal happens in EventFinishedCallback). */
    StopSound(playingID, fadeOutDuration = 1000) {
      if (_AudGameObjResource.manager?.enabled) {
        this.MarkPlayingIDStoppedByRequest(playingID);
        this.ExecuteActionOnPlayingID(playingID, "stop", fadeOutDuration);
      }
    }

    /** Carbon method BreakSound: loops stop, one-shots play out. */
    BreakSound(playingID, fadeOutDuration = 1000) {
      if (_AudGameObjResource.manager?.enabled) {
        this.MarkPlayingIDStoppedByRequest(playingID);
        this.ExecuteActionOnPlayingID(playingID, "break", fadeOutDuration);
      }
    }

    /** Carbon method SeekOnEventPercent: seek a playing event owned by this object. */
    SeekOnEventPercent(playingID, percentToSeek) {
      if (!_AudGameObjResource.manager?.enabled || !this.#playingEvents.has(playingID)) {
        return false;
      }
      return _AudGameObjResource.backend?.SeekOnEventPercent?.(playingID, percentToSeek) === true;
    }

    /** Carbon method SeekOnEventMs: seek a playing event owned by this object. */
    SeekOnEventMs(playingID, msToSeek) {
      if (!_AudGameObjResource.manager?.enabled || !this.#playingEvents.has(playingID)) {
        return false;
      }
      return _AudGameObjResource.backend?.SeekOnEventMs?.(playingID, msToSeek) === true;
    }

    /** Carbon method StopAll. */
    StopAll() {
      if (_AudGameObjResource.manager?.enabled) {
        for (const playingID of this.#playingEvents.keys()) {
          this.StopSound(playingID);
        }
      }
    }

    /** Carbon method ExecuteActionOnPlayingID: backend stop/break when the id is tracked. */
    ExecuteActionOnPlayingID(playingID, action, fadeOutDuration = 1000) {
      if (!_AudGameObjResource.manager?.enabled || !this.#playingEvents.has(playingID)) {
        return false;
      }
      _AudGameObjResource.backend?.ExecuteActionOnPlayingID?.(action, playingID, fadeOutDuration);
      const actionName = String(action).toLowerCase() === "break" ? "Break" : "Stop";
      _AudGameObjResource.manager?.LogExecuteActionOnPlayingID?.(this.ID, playingID, actionName);
      return true;
    }

    /** Carbon method MarkPlayingIDStoppedByRequest: a stopped loop must not resume on wake. */
    MarkPlayingIDStoppedByRequest(playingID) {
      const playing = this.#playingEvents.get(playingID);
      if (playing !== undefined) {
        this.#pendingStoppedPlayingIDs.add(playingID);
        this.#eventsOnWake.delete(playing);
        this.UpdateEventSoundPrioritizationAttributes();
      }
    }

    /** Carbon method EventFinishedCallback: the only place playing entries are removed (backend end-of-event). */
    EventFinishedCallback(playingID) {
      this.#pendingStoppedPlayingIDs.delete(playingID);
      this.#playingEvents.delete(playingID);
      this.UpdateEventSoundPrioritizationAttributes();
    }

    /** Carbon method SetRTPC: value always stored; true only when live-applied. */
    SetRTPC(rtpcName, rtpcValue) {
      this.#rtpcValues.set(String(rtpcName), Number(rtpcValue));
      if (!_AudGameObjResource.manager?.enabled) {
        return false;
      }
      if (this.#gameObjRegistered) {
        if (_AudGameObjResource.backend?.SetRTPCValue?.(rtpcName, rtpcValue, this.ID) === false) {
          return false;
        }
        _AudGameObjResource.manager?.LogSetRTPC?.(this.ID, rtpcName, rtpcValue);
        return true;
      }
      return false;
    }

    /** Carbon method SetSwitch: value always stored; true only when live-applied. */
    SetSwitch(switchGroup, switchState) {
      this.#switchValues.set(String(switchGroup), String(switchState));
      if (!_AudGameObjResource.manager?.enabled) {
        return false;
      }
      if (this.#gameObjRegistered) {
        if (_AudGameObjResource.backend?.SetSwitch?.(switchGroup, switchState, this.ID) === false) {
          return false;
        }
        _AudGameObjResource.manager?.LogSetSwitch?.(this.ID, switchGroup, switchState);
        return true;
      }
      return false;
    }

    /** Carbon method Wake: register, restore position/params/attenuation, replay queued events. */
    Wake() {
      if (!_AudGameObjResource.manager?.enabled || this.forceCullingState || this.#muted || !this.#hasReceivedPosition) {
        return;
      }
      this.RegisterWwiseObject();
      this.ApplyEffectivePlacement(this.#effectiveFront, this.#effectiveTop, this.position);
      this.#culled = false;
      if (this.#waitingOneShotName && this.listenerInRange) {
        this.PostEvent(this.#waitingOneShotName, true);
        this.#waitingOneShotTime = NowMs();
        this.#waitingOneShotName = "";
      }
      for (const [rtpcName, rtpcValue] of this.#rtpcValues) {
        this.SetRTPC(rtpcName, rtpcValue);
      }
      for (const [switchGroup, switchState] of this.#switchValues) {
        this.SetSwitch(switchGroup, switchState);
      }
      this.SetAttenuationScalingFactor(this.scalingFactor);
      const queued = [...this.#eventsOnWake];
      this.#eventsOnWake.clear();
      for (const queuedEvent of queued) {
        this.PostEvent(queuedEvent, true);
      }
    }

    /** Carbon method Cull: loops saved to events-on-wake; in-range one-shots break, others stop. */
    Cull() {
      if (!_AudGameObjResource.manager?.enabled || this.forceCullingState) {
        return;
      }
      const repository = _AudGameObjResource.staticDataRepository;
      for (const [playingID, playing] of this.#playingEvents) {
        if (repository?.EventIsLoop(playing)) {
          if (!this.#pendingStoppedPlayingIDs.has(playingID) && this.ExecuteActionOnPlayingID(playingID, "stop", 3000)) {
            this.#eventsOnWake.add(playing);
          }
        } else if (this.listenerInRange) {
          this.ExecuteActionOnPlayingID(playingID, "break");
        } else {
          this.ExecuteActionOnPlayingID(playingID, "stop");
        }
      }
      this.UnregisterWwiseObject();
      this.#culled = true;
    }

    /** Carbon method IsCulled. */
    IsCulled() {
      return this.#culled;
    }

    /** Carbon method ForceCullingStateChange: toggle culled state, then hold it forced. */
    ForceCullingStateChange() {
      this.forceCullingState = false;
      if (this.#culled) {
        this.Wake();
      } else {
        this.Cull();
      }
      this.forceCullingState = true;
    }

    /** Carbon method ReleaseForcedCullingState. */
    ReleaseForcedCullingState() {
      this.forceCullingState = false;
    }

    /** Carbon method Mute: muting is forcibly culling. */
    Mute() {
      if (this.#muted) {
        return;
      }
      if (!this.#culled) {
        this.ForceCullingStateChange();
      }
      this.#muted = true;
    }

    /** Carbon method Unmute. */
    Unmute() {
      if (!this.#muted) {
        return;
      }
      this.#muted = false;
      if (this.#culled) {
        this.ForceCullingStateChange();
      }
      this.ReleaseForcedCullingState();
    }

    /** Carbon method IsMuted. */
    IsMuted() {
      return this.#muted;
    }

    /**
     * Forces an orientation to unit-length, mutually perpendicular axes while
     * preserving the supplied front direction.
     */
    static Orthonormalize(outFront, outTop, front, top, normalizedTop, cross) {
      vec3.normalize(outFront, front);
      vec3.normalize(normalizedTop, top);
      vec3.cross(cross, outFront, normalizedTop);
      vec3.cross(outTop, cross, outFront);
      vec3.normalize(outTop, outTop);
    }

    /** Carbon method SetPlacementFromParent: stores the parent pose, resolves authored rotation, then applies it. */
    SetPlacementFromParent(front, top, positionValue) {
      vec3.copy(this.#parentFront, front);
      vec3.copy(this.#parentTop, top);
      const orientation = this.GetEffectiveOrientation();
      return this.ApplyEffectivePlacement(orientation.front, orientation.top, positionValue);
    }

    /** Carbon method ApplyEffectivePlacement: corrects, stores, exposes, and pushes the effective pose. */
    ApplyEffectivePlacement(front, top, positionValue) {
      _AudGameObjResource.Orthonormalize(this.#effectiveFront, this.#effectiveTop, front, top, this.#normalizedTop, this.#cross);
      vec3.copy(this.position, positionValue);
      if (this.front) {
        vec3.copy(this.front, this.#effectiveFront);
      }
      if (this.top) {
        vec3.copy(this.top, this.#effectiveTop);
      }
      if (this.rotation) {
        quat.copy(this.#appliedRotation, this.rotation);
      }
      if (_AudGameObjResource.manager?.enabled && this.#gameObjRegistered) {
        _AudGameObjResource.backend?.SetPosition?.(this.ID, this.#effectiveFront, this.#effectiveTop, this.position);
      }
      return 1;
    }

    /** Carbon method HasAuthoredRotation. */
    HasAuthoredRotation() {
      return Boolean(this.rotation && (this.rotation[0] !== 0 || this.rotation[1] !== 0 || this.rotation[2] !== 0 || this.rotation[3] !== 1));
    }

    /** Carbon method GetEffectiveOrientation: resolves parent axes through authored rotation into owned buffers. */
    GetEffectiveOrientation() {
      if (!this.HasAuthoredRotation() || quat.squaredLength(this.rotation) <= 0) {
        vec3.copy(this.#candidateFront, this.#parentFront);
        vec3.copy(this.#candidateTop, this.#parentTop);
        return this.#candidateOrientation;
      }
      quat.normalize(this.#normalizedRotation, this.rotation);
      vec3.transformQuat(this.#candidateFront, this.#parentFront, this.#normalizedRotation);
      vec3.transformQuat(this.#candidateTop, this.#parentTop, this.#normalizedRotation);
      return this.#candidateOrientation;
    }

    /** Carbon method RefreshPlacementFromRotation. */
    RefreshPlacementFromRotation() {
      const orientation = this.GetEffectiveOrientation();
      return this.ApplyEffectivePlacement(orientation.front, orientation.top, this.position);
    }

    /** Carbon method SetAttenuationScalingFactor: stored only when live-applied (Carbon parity). */
    SetAttenuationScalingFactor(value) {
      if (_AudGameObjResource.manager?.enabled && this.#gameObjRegistered) {
        _AudGameObjResource.backend?.SetScalingFactor?.(this.ID, value);
        this.scalingFactor = value;
        return true;
      }
      return false;
    }

    /** Carbon method SetEventName: replays the event when the name changes. */
    SetEventName(eventName) {
      const changed = this.eventName !== eventName;
      this.eventName = String(eventName ?? "");
      if (changed) {
        this.PostEvent(this.eventName);
      }
    }

    /** Carbon method GetEventName. */
    GetEventName() {
      return this.eventName;
    }

    /** Carbon method ApplyEventStopRelationships: purge queued/playing events this event stops. */
    ApplyEventStopRelationships(stoppingEventName) {
      const repository = _AudGameObjResource.staticDataRepository;
      if (!repository) {
        return;
      }
      let changed = false;
      for (const queued of [...this.#eventsOnWake]) {
        if (repository.EventIsStopped(queued, stoppingEventName)) {
          this.#eventsOnWake.delete(queued);
          changed = true;
        }
      }
      for (const [playingID, playing] of this.#playingEvents) {
        if (repository.EventIsStopped(playing, stoppingEventName)) {
          this.#pendingStoppedPlayingIDs.add(playingID);
          changed = true;
        }
      }
      if (changed) {
        this.UpdateEventSoundPrioritizationAttributes();
      }
    }

    /** Carbon method RegisterWwiseObject. */
    RegisterWwiseObject() {
      if (_AudGameObjResource.manager?.enabled && !this.#gameObjRegistered) {
        _AudGameObjResource.backend?.RegisterGameObj?.(this.ID, this.name);
        this.#gameObjRegistered = true;
      }
    }

    /** Carbon method UnregisterWwiseObject. */
    UnregisterWwiseObject() {
      if (_AudGameObjResource.manager && this.#gameObjRegistered) {
        _AudGameObjResource.backend?.UnregisterGameObj?.(this.ID);
        this.#gameObjRegistered = false;
      }
    }

    /** Carbon method UpdateMaxAttenuationRadiusForEvent. */
    UpdateMaxAttenuationRadiusForEvent(eventName) {
      const repository = _AudGameObjResource.staticDataRepository;
      if (repository) {
        this.#maxAttenuationRadiusSq = Math.max(this.#maxAttenuationRadiusSq, repository.GetEventRadiusSq(eventName));
      }
    }

    /** Carbon method GetMaxAttenuationRadius: radiusSq scaled by the attenuation scaling factor. */
    GetMaxAttenuationRadius() {
      return this.#maxAttenuationRadiusSq * this.scalingFactor;
    }

    /** Carbon method UpdateEventSoundPrioritizationAttributes: recompute 2D/vital flags + max radius. */
    UpdateEventSoundPrioritizationAttributes() {
      const repository = _AudGameObjResource.staticDataRepository;
      if (this.#playingEvents.size === 0 && this.#eventsOnWake.size === 0) {
        this.#maxAttenuationRadiusSq = 0;
        this.playing2DSound = false;
        this.playingVitalSound = false;
        return;
      }
      if (!repository) {
        return;
      }
      let is2D = false;
      let isVital = false;
      let maxRadiusSq = 0;
      for (const collection of [this.#playingEvents.values(), this.#eventsOnWake.values()]) {
        for (const playing of collection) {
          is2D = is2D || repository.EventIs2D(playing);
          isVital = isVital || repository.EventIsVital(playing);
          maxRadiusSq = Math.max(maxRadiusSq, repository.GetEventRadiusSq(playing));
        }
      }
      this.playing2DSound = is2D;
      this.playingVitalSound = isVital;
      this.#maxAttenuationRadiusSq = maxRadiusSq;
    }

    /** Carbon method CalculateCullingWeight: refresh in-range/one-shot state and store the weight. */
    CalculateCullingWeight(now = NowMs()) {
      const prioritization = _AudGameObjResource.manager?.soundPrioritization;
      if (!prioritization) {
        return;
      }
      if (!this.#muted) {
        this.listenerInRange = this.playing2DSound || this.distanceFromListener < this.GetMaxAttenuationRadius();
      }
      let waitingOneShotWeight = 0;
      if (this.#culled && this.#waitingOneShotName) {
        if (now - this.#waitingOneShotTime > prioritization.GetOneShotWindow()) {
          this.#waitingOneShotTime = now;
          this.#waitingOneShotName = "";
        } else if (this.listenerInRange) {
          waitingOneShotWeight = prioritization.GetWaitingOneShotWeight();
        }
      }
      this.cumulativeWeight = _SoundPrioritization.calculateObjectWeight(this.distanceFromListener, this.#muted, this.listenerInRange, this.isUsed, this.isVisible, this.playing2DSound, this.playingVitalSound, this.additionalCullingWeight, this.#playingEvents.size, waitingOneShotWeight, prioritization.GetUsedEmitterWeight(), prioritization.GetRangeWeight(), prioritization.GetPlayingEventsWeight(), prioritization.GetVisibleWeight(), prioritization.GetPlaying2DWeight(), prioritization.GetPlayingVitalSoundWeight());
    }

    /** Carbon method GetCullingWeight. */
    GetCullingWeight() {
      return this.cumulativeWeight;
    }

    /** Carbon method GetID. */
    GetID() {
      return this.ID;
    }

    /** Carbon method GetPosition. */
    GetPosition() {
      return this.position;
    }

    /** Carbon method GetFront. */
    GetFront() {
      return this.#effectiveFront;
    }

    /** Carbon method GetTop. */
    GetTop() {
      return this.#effectiveTop;
    }

    /** Carbon method SetDistanceSqFromListener. */
    SetDistanceSqFromListener(distanceSq) {
      this.distanceFromListener = distanceSq;
    }

    /** Carbon method GetPlayingEvents: copy of playingID -> full event name. */
    GetPlayingEvents() {
      return new Map(this.#playingEvents);
    }

    /** Carbon method GetSwitches. */
    GetSwitches() {
      return this.#switchValues;
    }

    /** Queued events replayed on Wake (introspection/test surface). */
    GetEventsOnWake() {
      return [...this.#eventsOnWake];
    }

    /** The pending culled one-shot event name, "" when none. */
    GetWaitingOneShot() {
      return this.#waitingOneShotName;
    }

    /** Marks the object as positioned (C++ protected m_hasReceivedPosition; unblocks Wake). */
    MarkPositionReceived() {
      this.#hasReceivedPosition = true;
    }

    /** Whether the placement gate required by Wake/event curves has been satisfied. */
    HasReceivedPosition() {
      return this.#hasReceivedPosition;
    }

    /** Values settle hook: changing authored rotation immediately refreshes the effective placement. */
    OnModified(options = {}) {
      for (const parameter of this.parameters) {
        parameter?.SetGameObjectID?.(this.ID);
      }
      if (this.rotation && !quat.exactEquals(this.rotation, this.#appliedRotation)) {
        this.RefreshPlacementFromRotation();
      }
      return super.OnModified(options);
    }

    /** Carbon INotifyList method OnListModified: bind inserted parameters to this game-object id. */
    OnListModified(_event, _key, _key2, value, list = this.parameters) {
      if (list === this.parameters && value) {
        value.SetGameObjectID?.(this.ID);
      }
    }

    /** Values write hook: a supplied position counts as received placement. */
    SetValues(values = {}, options = {}) {
      const result = super.SetValues(values, options);
      if (values && values.position !== undefined) {
        this.#hasReceivedPosition = true;
      }
      return result;
    }

    // Realization seams (Carbon globals g_audioManager / g_staticDataRepository
    // and the AK:: call surface). Headless default null.
  }];
  manager = null;
  staticDataRepository = null;
  backend = null;
  constructor() {
    super(_AudGameObjResource), _initClass();
  }
}(); // C++ AudGameObjResource::PrepareEvent - trim always, prefix only when
function PrepareEvent(prefix, event, bypassPrefix) {
  const trimmed = String(event).trim();
  return prefix && !bypassPrefix ? `${prefix}${trimmed}` : trimmed;
}

export { _AudGameObjResource as AudGameObjResource, PrepareEvent };
//# sourceMappingURL=AudGameObjResource.js.map
