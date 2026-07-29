// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   audio/src/AudGameObjResource.h + AudGameObjResource.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudGameObjResource.json.
//
// Headless semantics = Carbon's null-manager semantics: with no
// AudGameObjResource.manager set, posts take the culled branch (events queue
// on wake / waiting one-shot), RTPC/switch values store-and-return-false, and
// Wake/Cull no-op. The realization layer later supplies `manager` (enabled
// state, bank statuses, prioritization) and `backend` (Wwise-shaped calls)
// via the statics at the bottom.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { SoundPrioritization } from "./SoundPrioritization.js";

// Wwise AK_INVALID_PLAYING_ID.
const INVALID_PLAYING_ID = 0;
// Audio2.h:20 START_GAME_OBJ_COUNT - ids below are reserved (listener is 4).
let nextEntityID = 5;

function GenerateEntityID()
{
  return nextEntityID++;
}

function NowMs()
{
  return globalThis.performance?.now() ?? Date.now();
}

/** AudGameObjResource (audio) - base Wwise game object: event/RTPC/switch bookkeeping + culling participation. */
@type.define({ className: "AudGameObjResource", family: "audio" })
export class AudGameObjResource extends CjsModel
{

  /** m_eventPrefix (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  eventPrefix = "";

  /** m_additionalCullingWeight (float) [READ] */
  @io.read
  @type.float32
  additionalCullingWeight = 0;

  /** m_ID (AkGameObjectID) [READ] */
  @io.read
  @type.rawStruct("AkGameObjectID")
  ID = null;

  /** m_parameters (PAudParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("AudParameter")
  parameters = [];

  /** m_name (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  name = "";

  /** m_playingVitalSound (bool) [READ] */
  @io.read
  @type.boolean
  playingVitalSound = false;

  /** m_playing2DSound (bool) [READ] */
  @io.read
  @type.boolean
  playing2DSound = false;

  /** m_listenerInRange (bool) [READ] */
  @io.read
  @type.boolean
  listenerInRange = false;

  /** m_isUsed (bool) [READ] */
  @io.read
  @type.boolean
  isUsed = false;

  /** m_eventName (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  eventName = "";

  /** m_cumulativeWeight (float) [READ] */
  @io.read
  @type.float32
  cumulativeWeight = 0;

  /** m_distanceSqFromListener (float) [READ] */
  @io.read
  @type.float32
  distanceFromListener = 0;

  /** m_scalingFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  scalingFactor = 1;

  /** m_isVisible (bool) [READ] */
  @io.read
  @type.boolean
  isVisible = false;

  /** m_forceCullingState (bool) [READ] */
  @io.read
  @type.boolean
  forceCullingState = false;

  /** m_position (Vector3) [AUTHORED] */
  @impl.adapted
  @impl.reason("Carbon routes this through Initialize(name, prefix, position) outside Blue serialization; CarbonEngineJS persists it for values interchange; OnModified derives placement from it.")
  @io.persist
  @type.vec3
  position = vec3.create();

  // Runtime bookkeeping (C++ members) - rebuildable, never serialized.
  #culled = true;

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
  constructor(gameObjID)
  {
    super();
    this.ID = gameObjID ?? GenerateEntityID();
    this.#waitingOneShotTime = NowMs();
    const manager = AudGameObjResource.manager;
    if (manager)
    {
      if (!manager.audioCullingEnabled)
      {
        this.#culled = false;
      }
      manager.RegisterGameObject?.(this.ID, this);
    }
  }

  /** Carbon method Initialize: optional (name, prefix, position), then register + replay eventName. */
  @carbon.method
  @impl.adapted
  @impl.reason("Single method covers Carbon's no-arg and (name, prefix, position) overloads; backend registration is a no-op until realization.")
  Initialize(name, prefix, position)
  {
    if (name !== undefined)
    {
      this.name = String(name);
      this.eventPrefix = String(prefix ?? "");
      if (position)
      {
        vec3.copy(this.position, position);
        this.#hasReceivedPosition = true;
      }
    }
    this.RegisterWwiseObject();
    this.SetPlacementFromParent([0, 0, 1], [0, 1, 0], this.position);
    if (this.eventName)
    {
      this.PostEvent(this.eventName);
    }
    return true;
  }

  /** Carbon method PostEvent: returns a playing id, or 0 when queued/culled/failed. */
  @carbon.method
  @impl.implemented
  PostEvent(eventName, bypassPrefix = false, additionalFlags = 0)
  {
    const repository = AudGameObjResource.staticDataRepository;
    if (!eventName || !repository)
    {
      return INVALID_PLAYING_ID;
    }
    this.isUsed = true;
    let eventUsed = false;
    const fullEventName = PrepareEvent(this.eventPrefix, eventName, bypassPrefix);
    const eventIsVital = repository.EventIsVital(fullEventName);
    let playingID = INVALID_PLAYING_ID;
    const manager = AudGameObjResource.manager;

    if (this.#culled || !manager || !manager.enabled)
    {
      this.ApplyEventStopRelationships(fullEventName);
      if (repository.EventIsLoop(fullEventName) || eventIsVital)
      {
        this.#eventsOnWake.add(fullEventName);
      }
      else
      {
        this.#waitingOneShotTime = NowMs();
        this.#waitingOneShotName = fullEventName;
      }
      eventUsed = true;
    }
    else if (this.#gameObjRegistered)
    {
      const banks = repository.SoundBanksRequiredForEvent(fullEventName);
      if (!banks.length)
      {
        return INVALID_PLAYING_ID;
      }
      let soundbanksLoaded = true;
      for (const bank of banks)
      {
        const status = manager.GetSoundBankStatus?.(bank);
        if (status !== "loaded")
        {
          soundbanksLoaded = false;
          if (status === "loading")
          {
            manager.RegisterEventAfterSoundBankLoad?.(bank, fullEventName, this);
            break;
          }
          return INVALID_PLAYING_ID;
        }
      }
      if (soundbanksLoaded)
      {
        const eventID = repository.GetEventID(fullEventName);
        playingID = AudGameObjResource.backend?.PostEvent?.(eventID, this.ID, additionalFlags, this, fullEventName) ?? INVALID_PLAYING_ID;
        manager.LogPostEvent?.(this.ID, playingID, eventID, fullEventName);
        if (playingID !== INVALID_PLAYING_ID)
        {
          this.ApplyEventStopRelationships(fullEventName);
          this.#playingEvents.set(playingID, fullEventName);
          eventUsed = true;
        }
      }
    }

    if (eventUsed)
    {
      this.UpdateMaxAttenuationRadiusForEvent(fullEventName);
      if (repository.EventIs2D(fullEventName))
      {
        this.playing2DSound = true;
      }
      if (eventIsVital)
      {
        this.playingVitalSound = true;
      }
    }
    return playingID;
  }

  /** Carbon method StopEvent: stops every playing instance of the (prefixed) event; returns whether any matched. */
  @carbon.method
  @impl.implemented
  StopEvent(eventName, fadeOutDuration = 1000)
  {
    const fullEventName = PrepareEvent(this.eventPrefix, eventName, false);
    let stopped = false;
    for (const [playingID, playing] of this.#playingEvents)
    {
      if (playing === fullEventName)
      {
        this.StopSound(playingID, fadeOutDuration);
        stopped = true;
      }
    }
    return stopped;
  }

  /** Carbon method StopSound: request stop for one playing id (removal happens in EventFinishedCallback). */
  @carbon.method
  @impl.implemented
  StopSound(playingID, fadeOutDuration = 1000)
  {
    if (AudGameObjResource.manager?.enabled)
    {
      this.MarkPlayingIDStoppedByRequest(playingID);
      this.ExecuteActionOnPlayingID(playingID, "stop", fadeOutDuration);
    }
  }

  /** Carbon method BreakSound: loops stop, one-shots play out. */
  @carbon.method
  @impl.implemented
  BreakSound(playingID, fadeOutDuration = 1000)
  {
    if (AudGameObjResource.manager?.enabled)
    {
      this.MarkPlayingIDStoppedByRequest(playingID);
      this.ExecuteActionOnPlayingID(playingID, "break", fadeOutDuration);
    }
  }

  /** Carbon method SeekOnEventPercent: seek a playing event owned by this object. */
  @carbon.method
  @impl.implemented
  SeekOnEventPercent(playingID, percentToSeek)
  {
    if (!AudGameObjResource.manager?.enabled || !this.#playingEvents.has(playingID))
    {
      return false;
    }
    return AudGameObjResource.backend?.SeekOnEventPercent?.(playingID, percentToSeek) === true;
  }

  /** Carbon method SeekOnEventMs: seek a playing event owned by this object. */
  @carbon.method
  @impl.implemented
  SeekOnEventMs(playingID, msToSeek)
  {
    if (!AudGameObjResource.manager?.enabled || !this.#playingEvents.has(playingID))
    {
      return false;
    }
    return AudGameObjResource.backend?.SeekOnEventMs?.(playingID, msToSeek) === true;
  }

  /** Carbon method StopAll. */
  @carbon.method
  @impl.implemented
  StopAll()
  {
    if (AudGameObjResource.manager?.enabled)
    {
      for (const playingID of this.#playingEvents.keys())
      {
        this.StopSound(playingID);
      }
    }
  }

  /** Carbon method ExecuteActionOnPlayingID: backend stop/break when the id is tracked. */
  @carbon.method
  @impl.implemented
  ExecuteActionOnPlayingID(playingID, action, fadeOutDuration = 1000)
  {
    if (!AudGameObjResource.manager?.enabled || !this.#playingEvents.has(playingID))
    {
      return false;
    }
    AudGameObjResource.backend?.ExecuteActionOnPlayingID?.(action, playingID, fadeOutDuration);
    const actionName = String(action).toLowerCase() === "break" ? "Break" : "Stop";
    AudGameObjResource.manager?.LogExecuteActionOnPlayingID?.(this.ID, playingID, actionName);
    return true;
  }

  /** Carbon method MarkPlayingIDStoppedByRequest: a stopped loop must not resume on wake. */
  @carbon.method
  @impl.implemented
  MarkPlayingIDStoppedByRequest(playingID)
  {
    const playing = this.#playingEvents.get(playingID);
    if (playing !== undefined)
    {
      this.#pendingStoppedPlayingIDs.add(playingID);
      this.#eventsOnWake.delete(playing);
      this.UpdateEventSoundPrioritizationAttributes();
    }
  }

  /** Carbon method EventFinishedCallback: the only place playing entries are removed (backend end-of-event). */
  @carbon.method
  @impl.implemented
  EventFinishedCallback(playingID)
  {
    this.#pendingStoppedPlayingIDs.delete(playingID);
    this.#playingEvents.delete(playingID);
    this.UpdateEventSoundPrioritizationAttributes();
  }

  /** Carbon method SetRTPC: value always stored; true only when live-applied. */
  @carbon.method
  @impl.implemented
  SetRTPC(rtpcName, rtpcValue)
  {
    this.#rtpcValues.set(String(rtpcName), Number(rtpcValue));
    if (!AudGameObjResource.manager?.enabled)
    {
      return false;
    }
    if (this.#gameObjRegistered)
    {
      if (AudGameObjResource.backend?.SetRTPCValue?.(rtpcName, rtpcValue, this.ID) === false)
      {
        return false;
      }
      AudGameObjResource.manager?.LogSetRTPC?.(this.ID, rtpcName, rtpcValue);
      return true;
    }
    return false;
  }

  /** Carbon method SetSwitch: value always stored; true only when live-applied. */
  @carbon.method
  @impl.implemented
  SetSwitch(switchGroup, switchState)
  {
    this.#switchValues.set(String(switchGroup), String(switchState));
    if (!AudGameObjResource.manager?.enabled)
    {
      return false;
    }
    if (this.#gameObjRegistered)
    {
      if (AudGameObjResource.backend?.SetSwitch?.(switchGroup, switchState, this.ID) === false)
      {
        return false;
      }
      AudGameObjResource.manager?.LogSetSwitch?.(this.ID, switchGroup, switchState);
      return true;
    }
    return false;
  }

  /** Carbon method Wake: register, restore position/params/attenuation, replay queued events. */
  @carbon.method
  @impl.implemented
  Wake()
  {
    if (!AudGameObjResource.manager?.enabled || this.forceCullingState || this.#muted || !this.#hasReceivedPosition)
    {
      return;
    }
    this.RegisterWwiseObject();
    this.ApplyEffectivePlacement(this.#effectiveFront, this.#effectiveTop, this.position);
    this.#culled = false;
    if (this.#waitingOneShotName && this.listenerInRange)
    {
      this.PostEvent(this.#waitingOneShotName, true);
      this.#waitingOneShotTime = NowMs();
      this.#waitingOneShotName = "";
    }
    for (const [rtpcName, rtpcValue] of this.#rtpcValues)
    {
      this.SetRTPC(rtpcName, rtpcValue);
    }
    for (const [switchGroup, switchState] of this.#switchValues)
    {
      this.SetSwitch(switchGroup, switchState);
    }
    this.SetAttenuationScalingFactor(this.scalingFactor);
    const queued = [...this.#eventsOnWake];
    this.#eventsOnWake.clear();
    for (const queuedEvent of queued)
    {
      this.PostEvent(queuedEvent, true);
    }
  }

  /** Carbon method Cull: loops saved to events-on-wake; in-range one-shots break, others stop. */
  @carbon.method
  @impl.implemented
  Cull()
  {
    if (!AudGameObjResource.manager?.enabled || this.forceCullingState)
    {
      return;
    }
    const repository = AudGameObjResource.staticDataRepository;
    for (const [playingID, playing] of this.#playingEvents)
    {
      if (repository?.EventIsLoop(playing))
      {
        if (!this.#pendingStoppedPlayingIDs.has(playingID) && this.ExecuteActionOnPlayingID(playingID, "stop", 3000))
        {
          this.#eventsOnWake.add(playing);
        }
      }
      else if (this.listenerInRange)
      {
        this.ExecuteActionOnPlayingID(playingID, "break");
      }
      else
      {
        this.ExecuteActionOnPlayingID(playingID, "stop");
      }
    }
    this.UnregisterWwiseObject();
    this.#culled = true;
  }

  /** Carbon method IsCulled. */
  @carbon.method
  @impl.implemented
  IsCulled()
  {
    return this.#culled;
  }

  /** Carbon method ForceCullingStateChange: toggle culled state, then hold it forced. */
  @carbon.method
  @impl.implemented
  ForceCullingStateChange()
  {
    this.forceCullingState = false;
    if (this.#culled)
    {
      this.Wake();
    }
    else
    {
      this.Cull();
    }
    this.forceCullingState = true;
  }

  /** Carbon method ReleaseForcedCullingState. */
  @carbon.method
  @impl.implemented
  ReleaseForcedCullingState()
  {
    this.forceCullingState = false;
  }

  /** Carbon method Mute: muting is forcibly culling. */
  @carbon.method
  @impl.implemented
  Mute()
  {
    if (this.#muted)
    {
      return;
    }
    if (!this.#culled)
    {
      this.ForceCullingStateChange();
    }
    this.#muted = true;
  }

  /** Carbon method Unmute. */
  @carbon.method
  @impl.implemented
  Unmute()
  {
    if (!this.#muted)
    {
      return;
    }
    this.#muted = false;
    if (this.#culled)
    {
      this.ForceCullingStateChange();
    }
    this.ReleaseForcedCullingState();
  }

  /** Carbon method IsMuted. */
  @carbon.method
  @impl.implemented
  IsMuted()
  {
    return this.#muted;
  }

  /**
   * Forces an orientation to unit-length, mutually perpendicular axes while
   * preserving the supplied front direction.
   */
  @carbon.method
  @impl.implemented
  static Orthonormalize(outFront, outTop, front, top, normalizedTop, cross)
  {
    vec3.normalize(outFront, front);
    vec3.normalize(normalizedTop, top);
    vec3.cross(cross, outFront, normalizedTop);
    vec3.cross(outTop, cross, outFront);
    vec3.normalize(outTop, outTop);
  }

  /** Carbon method SetPlacementFromParent: stores the parent pose, resolves authored rotation, then applies it. */
  @carbon.method
  @impl.adapted
  @impl.reason("The RH->LH conversion and Wwise SetPosition happen in the backend seam; the headless graph stores the position.")
  SetPlacementFromParent(front, top, positionValue)
  {
    vec3.copy(this.#parentFront, front);
    vec3.copy(this.#parentTop, top);
    const orientation = this.GetEffectiveOrientation();
    return this.ApplyEffectivePlacement(orientation.front, orientation.top, positionValue);
  }

  /** Carbon method ApplyEffectivePlacement: corrects, stores, exposes, and pushes the effective pose. */
  @carbon.method
  @impl.adapted
  @impl.reason("The RH->LH conversion and Wwise call remain in the backend seam; the runtime owns the effective orientation buffers.")
  ApplyEffectivePlacement(front, top, positionValue)
  {
    AudGameObjResource.Orthonormalize(
      this.#effectiveFront,
      this.#effectiveTop,
      front,
      top,
      this.#normalizedTop,
      this.#cross);
    vec3.copy(this.position, positionValue);
    if (this.front)
    {
      vec3.copy(this.front, this.#effectiveFront);
    }
    if (this.top)
    {
      vec3.copy(this.top, this.#effectiveTop);
    }
    if (this.rotation)
    {
      quat.copy(this.#appliedRotation, this.rotation);
    }
    if (AudGameObjResource.manager?.enabled && this.#gameObjRegistered)
    {
      AudGameObjResource.backend?.SetPosition?.(
        this.ID,
        this.#effectiveFront,
        this.#effectiveTop,
        this.position);
    }
    return 1;
  }

  /** Carbon method HasAuthoredRotation. */
  @carbon.method
  @impl.implemented
  HasAuthoredRotation()
  {
    return Boolean(
      this.rotation &&
      (
        this.rotation[0] !== 0 ||
        this.rotation[1] !== 0 ||
        this.rotation[2] !== 0 ||
        this.rotation[3] !== 1
      )
    );
  }

  /** Carbon method GetEffectiveOrientation: resolves parent axes through authored rotation into owned buffers. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns a value struct; CarbonEngineJS returns a stable object backed by owned buffers to avoid placement-path allocations.")
  GetEffectiveOrientation()
  {
    if (!this.HasAuthoredRotation() || quat.squaredLength(this.rotation) <= 0)
    {
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
  @carbon.method
  @impl.implemented
  RefreshPlacementFromRotation()
  {
    const orientation = this.GetEffectiveOrientation();
    return this.ApplyEffectivePlacement(orientation.front, orientation.top, this.position);
  }

  /** Carbon method SetAttenuationScalingFactor: stored only when live-applied (Carbon parity). */
  @carbon.method
  @impl.implemented
  SetAttenuationScalingFactor(value)
  {
    if (AudGameObjResource.manager?.enabled && this.#gameObjRegistered)
    {
      AudGameObjResource.backend?.SetScalingFactor?.(this.ID, value);
      this.scalingFactor = value;
      return true;
    }
    return false;
  }

  /** Carbon method SetEventName: replays the event when the name changes. */
  @carbon.method
  @impl.implemented
  SetEventName(eventName)
  {
    const changed = this.eventName !== eventName;
    this.eventName = String(eventName ?? "");
    if (changed)
    {
      this.PostEvent(this.eventName);
    }
  }

  /** Carbon method GetEventName. */
  @carbon.method
  @impl.implemented
  GetEventName()
  {
    return this.eventName;
  }

  /** Carbon method ApplyEventStopRelationships: purge queued/playing events this event stops. */
  @carbon.method
  @impl.implemented
  ApplyEventStopRelationships(stoppingEventName)
  {
    const repository = AudGameObjResource.staticDataRepository;
    if (!repository)
    {
      return;
    }
    let changed = false;
    for (const queued of [...this.#eventsOnWake])
    {
      if (repository.EventIsStopped(queued, stoppingEventName))
      {
        this.#eventsOnWake.delete(queued);
        changed = true;
      }
    }
    for (const [playingID, playing] of this.#playingEvents)
    {
      if (repository.EventIsStopped(playing, stoppingEventName))
      {
        this.#pendingStoppedPlayingIDs.add(playingID);
        changed = true;
      }
    }
    if (changed)
    {
      this.UpdateEventSoundPrioritizationAttributes();
    }
  }

  /** Carbon method RegisterWwiseObject. */
  @carbon.method
  @impl.implemented
  RegisterWwiseObject()
  {
    if (AudGameObjResource.manager?.enabled && !this.#gameObjRegistered)
    {
      AudGameObjResource.backend?.RegisterGameObj?.(this.ID, this.name);
      this.#gameObjRegistered = true;
    }
  }

  /** Carbon method UnregisterWwiseObject. */
  @carbon.method
  @impl.implemented
  UnregisterWwiseObject()
  {
    if (AudGameObjResource.manager && this.#gameObjRegistered)
    {
      AudGameObjResource.backend?.UnregisterGameObj?.(this.ID);
      this.#gameObjRegistered = false;
    }
  }

  /** Carbon method UpdateMaxAttenuationRadiusForEvent. */
  @carbon.method
  @impl.implemented
  UpdateMaxAttenuationRadiusForEvent(eventName)
  {
    const repository = AudGameObjResource.staticDataRepository;
    if (repository)
    {
      this.#maxAttenuationRadiusSq = Math.max(this.#maxAttenuationRadiusSq, repository.GetEventRadiusSq(eventName));
    }
  }

  /** Carbon method GetMaxAttenuationRadius: radiusSq scaled by the attenuation scaling factor. */
  @carbon.method
  @impl.implemented
  GetMaxAttenuationRadius()
  {
    return this.#maxAttenuationRadiusSq * this.scalingFactor;
  }

  /** Carbon method UpdateEventSoundPrioritizationAttributes: recompute 2D/vital flags + max radius. */
  @carbon.method
  @impl.implemented
  UpdateEventSoundPrioritizationAttributes()
  {
    const repository = AudGameObjResource.staticDataRepository;
    if (this.#playingEvents.size === 0 && this.#eventsOnWake.size === 0)
    {
      this.#maxAttenuationRadiusSq = 0;
      this.playing2DSound = false;
      this.playingVitalSound = false;
      return;
    }
    if (!repository)
    {
      return;
    }
    let is2D = false;
    let isVital = false;
    let maxRadiusSq = 0;
    for (const collection of [this.#playingEvents.values(), this.#eventsOnWake.values()])
    {
      for (const playing of collection)
      {
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
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the weights through g_audioManager property delegates; CarbonEngineJS reads the manager's SoundPrioritization directly (same multiplied values).")
  CalculateCullingWeight(now = NowMs())
  {
    const prioritization = AudGameObjResource.manager?.soundPrioritization;
    if (!prioritization)
    {
      return;
    }
    if (!this.#muted)
    {
      this.listenerInRange = this.playing2DSound || this.distanceFromListener < this.GetMaxAttenuationRadius();
    }
    let waitingOneShotWeight = 0;
    if (this.#culled && this.#waitingOneShotName)
    {
      if (now - this.#waitingOneShotTime > prioritization.GetOneShotWindow())
      {
        this.#waitingOneShotTime = now;
        this.#waitingOneShotName = "";
      }
      else if (this.listenerInRange)
      {
        waitingOneShotWeight = prioritization.GetWaitingOneShotWeight();
      }
    }
    this.cumulativeWeight = SoundPrioritization.calculateObjectWeight(
      this.distanceFromListener, this.#muted, this.listenerInRange, this.isUsed, this.isVisible,
      this.playing2DSound, this.playingVitalSound, this.additionalCullingWeight, this.#playingEvents.size,
      waitingOneShotWeight, prioritization.GetUsedEmitterWeight(), prioritization.GetRangeWeight(),
      prioritization.GetPlayingEventsWeight(), prioritization.GetVisibleWeight(),
      prioritization.GetPlaying2DWeight(), prioritization.GetPlayingVitalSoundWeight());
  }

  /** Carbon method GetCullingWeight. */
  @carbon.method
  @impl.implemented
  GetCullingWeight()
  {
    return this.cumulativeWeight;
  }

  /** Carbon method GetID. */
  @carbon.method
  @impl.implemented
  GetID()
  {
    return this.ID;
  }

  /** Carbon method GetPosition. */
  @carbon.method
  @impl.implemented
  GetPosition()
  {
    return this.position;
  }

  /** Carbon method GetFront. */
  @carbon.method
  @impl.implemented
  GetFront()
  {
    return this.#effectiveFront;
  }

  /** Carbon method GetTop. */
  @carbon.method
  @impl.implemented
  GetTop()
  {
    return this.#effectiveTop;
  }

  /** Carbon method SetDistanceSqFromListener. */
  @carbon.method
  @impl.implemented
  SetDistanceSqFromListener(distanceSq)
  {
    this.distanceFromListener = distanceSq;
  }

  /** Carbon method GetPlayingEvents: copy of playingID -> full event name. */
  @carbon.method
  @impl.implemented
  GetPlayingEvents()
  {
    return new Map(this.#playingEvents);
  }

  /** Carbon method GetSwitches. */
  @carbon.method
  @impl.implemented
  GetSwitches()
  {
    return this.#switchValues;
  }

  /** Queued events replayed on Wake (introspection/test surface). */
  @impl.custom
  @impl.reason("CarbonEngineJS-only accessor over private wake-queue state; Carbon exposes no equivalent read.")
  GetEventsOnWake()
  {
    return [...this.#eventsOnWake];
  }

  /** The pending culled one-shot event name, "" when none. */
  @impl.custom
  @impl.reason("CarbonEngineJS-only accessor over private one-shot state; Carbon exposes no equivalent read.")
  GetWaitingOneShot()
  {
    return this.#waitingOneShotName;
  }

  /** Marks the object as positioned (C++ protected m_hasReceivedPosition; unblocks Wake). */
  @impl.custom
  @impl.reason("JS #private fields are not subclass-visible; AudEmitter.SetPosition sets Carbon's protected m_hasReceivedPosition through this accessor.")
  MarkPositionReceived()
  {
    this.#hasReceivedPosition = true;
  }

  /** Whether the placement gate required by Wake/event curves has been satisfied. */
  @impl.custom
  @impl.reason("Carbon tests its FLT_MAX sentinel position; CarbonEngineJS tracks the equivalent state explicitly.")
  HasReceivedPosition()
  {
    return this.#hasReceivedPosition;
  }

  /** Values settle hook: changing authored rotation immediately refreshes the effective placement. */
  @impl.adapted
  @impl.reason("CjsModel hooks are broad-safe rather than field-addressed, so a cached quaternion detects the Carbon m_authoredRotation notification.")
  OnModified(options = {})
  {
    for (const parameter of this.parameters)
    {
      parameter?.SetGameObjectID?.(this.ID);
    }
    if (this.rotation && !quat.exactEquals(this.rotation, this.#appliedRotation))
    {
      this.RefreshPlacementFromRotation();
    }
    return super.OnModified(options);
  }

  /** Carbon INotifyList method OnListModified: bind inserted parameters to this game-object id. */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS receives cooperative list notifications rather than Blue IList event flags; an inserted AudParameter is bound directly.")
  OnListModified(_event, _key, _key2, value, list = this.parameters)
  {
    if (list === this.parameters && value)
    {
      value.SetGameObjectID?.(this.ID);
    }
  }

  /** Values write hook: a supplied position counts as received placement. */
  @impl.adapted
  @impl.reason("Carbon marks m_hasReceivedPosition in Initialize/SetPosition only; CarbonEngineJS also accepts it at values write time because the cooperative runtime-utils model pipeline holds per-field knowledge only here, so `from({ position })` emitters can Wake.")
  SetValues(values = {}, options = {})
  {
    const result = super.SetValues(values, options);
    if (values && values.position !== undefined)
    {
      this.#hasReceivedPosition = true;
    }
    return result;
  }

  // Realization seams (Carbon globals g_audioManager / g_staticDataRepository
  // and the AK:: call surface). Headless default null.
  static manager = null;

  static staticDataRepository = null;

  static backend = null;

}

// C++ AudGameObjResource::PrepareEvent - trim always, prefix only when
// non-empty and not bypassed.
export function PrepareEvent(prefix, event, bypassPrefix)
{
  const trimmed = String(event).trim();
  return prefix && !bypassPrefix ? `${prefix}${trimmed}` : trimmed;
}
