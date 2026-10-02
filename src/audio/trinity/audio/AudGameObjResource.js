// Source: audio/src/AudGameObjResource.h + AudGameObjResource.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudGameObjResource.json.
//
// Headless semantics = Carbon's null-manager semantics: with no
// AudGameObjResource.manager set, posts take the culled branch (events queue
// on wake / waiting one-shot), RTPC/switch values store-and-return-false, and
// Wake/Cull no-op. The realization layer later supplies `manager` (enabled
// state, bank statuses, prioritization) and `backend` (Wwise-shaped calls)
// via the statics at the bottom.
import { BLUELISTEVENT } from "#consts/blue";
import { IInitialize } from "#blue/IInitialize";
import { IListNotify } from "#blue/IListNotify";
import { INotify } from "#blue/INotify";
import { carbon, impl, edit, type } from "#schema";
import { BlueList } from "#blue/BlueList";
import { AudParameter } from "./AudParameter.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { SoundPrioritization } from "./SoundPrioritization.js";

// Wwise AK_INVALID_PLAYING_ID.
const INVALID_PLAYING_ID = 0;
// Audio2.h:31 WWISE_INIT_POSITION - the FLT_MAX far-away init sentinel.
const WWISE_INIT_POSITION = 3.4028234663852886e38;

/**
 * Whether a position is still Carbon's `WWISE_INIT_POSITION` sentinel, the
 * value every game object starts at until something places it. Carbon compares
 * `GetPosition() != WWISE_INIT_POSITION` directly (AudEventCurve.cpp:59,72).
 *
 * @param {ArrayLike<number>} position Position to test.
 * @returns {boolean} True while the object has never been placed.
 */
export function IsWwiseInitPosition(position)
{
  return position[0] === WWISE_INIT_POSITION
    && position[1] === WWISE_INIT_POSITION
    && position[2] === WWISE_INIT_POSITION;
}

/** Whether a position is a real world placement. Source: Audio2.h:35 IsUsableWorldPosition. */
function IsUsableWorldPosition(position)
{
  const [ x, y, z ] = position;

  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
    && !(x === WWISE_INIT_POSITION && y === WWISE_INIT_POSITION && z === WWISE_INIT_POSITION);
}
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

/**
 * The base Wwise game object: per-object event, RTPC, switch, placement and
 * culling state. Abstract in Carbon (`BLUE_DEFINE_ABSTRACT`, _Blue.cpp:8):
 * AudEmitter, AudListener, AudUIPlayer and AudMusicPlayer build on it.
 */
@type.define({ className: "AudGameObjResource", family: "audio", abstract: true })
@carbon.inherit(IInitialize, IListNotify, INotify)
export class AudGameObjResource
{

  /** m_eventPrefix (std::wstring) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  eventPrefix = "";

  /** m_additionalCullingWeight (float) [READ] */
  @edit.read
  @type.float32
  additionalCullingWeight = 0;

  /** m_ID (AkGameObjectID) [READ] */
  @edit.read
  @type.rawStruct("AkGameObjectID")
  ID = null;

  /** m_parameters (PAudParameterVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("AudParameter")
  parameters = new BlueList(AudParameter);

  /** m_name (std::string) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_playingVitalSound (bool) [READ] */
  @edit.read
  @type.boolean
  playingVitalSound = false;

  /** m_playing2DSound (bool) [READ] */
  @edit.read
  @type.boolean
  playing2DSound = false;

  /** m_listenerInRange (bool) [READ] */
  @edit.read
  @type.boolean
  listenerInRange = false;

  /** m_isUsed (bool) [READ] */
  @edit.read
  @type.boolean
  isUsed = false;

  /** m_eventName (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  eventName = "";

  /** m_cumulativeWeight (float) [READ] */
  @edit.read
  @type.float32
  cumulativeWeight = 0;

  /** m_distanceSqFromListener (float) [READ] */
  @edit.read
  @type.float32
  distanceFromListener = 0;

  /** m_scalingFactor (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  scalingFactor = 1;

  /** m_isVisible (bool) [READ] */
  @edit.read
  @type.boolean
  isVisible = false;

  /** m_forceCullingState (bool) [READ] */
  @edit.read
  @type.boolean
  forceCullingState = false;

  /**
   * m_position (Vector3) [READ]. Starts at the `WWISE_INIT_POSITION` sentinel
   * (cpp:30,69), so an object nobody has placed reports no usable position.
   */
  @edit.read
  @type.vec3
  position = vec3.fromValues(WWISE_INIT_POSITION, WWISE_INIT_POSITION, WWISE_INIT_POSITION);

  /**
   * m_authoredRotation (Quaternion), identity by default (cpp:33). A base
   * member in Carbon; only AudEmitter maps it to Blue, as `rotation`.
   */
  rotation = quat.create();

  // Runtime bookkeeping (C++ protected members) - rebuildable, never serialized.
  _culled = true;

  _muted = false;

  _gameObjRegistered = false;

  _hasReceivedPosition = false;

  _maxAttenuationRadiusSq = 0;

  _playingEvents = new Map();

  _eventsOnWake = new Set();

  _pendingStoppedPlayingIDs = new Set();

  _rtpcValues = new Map();

  _switchValues = new Map();

  _waitingOneShotTime = 0;

  _waitingOneShotName = "";

  _parentFront = vec3.fromValues(0, 0, 1);

  _parentTop = vec3.fromValues(0, 1, 0);

  _effectiveFront = vec3.fromValues(0, 0, 1);

  _effectiveTop = vec3.fromValues(0, 1, 0);

  _candidateFront = vec3.fromValues(0, 0, 1);

  _candidateTop = vec3.fromValues(0, 1, 0);

  _candidateOrientation = {
    front: this._candidateFront,
    top: this._candidateTop
  };

  _normalizedTop = vec3.fromValues(0, 1, 0);

  _cross = vec3.fromValues(-1, 0, 0);

  _normalizedRotation = quat.create();



  // Mirrors Carbon's two ctors: default generates an entity id; the protected
  // (AkGameObjectID) variant takes a fixed id (AudListener passes 4) so the
  // id is correct BEFORE manager registration.
  /** Creates a generated-id game object or Carbon's fixed-id protected variant. */
  constructor(gameObjID)
  {
    this.parameters.SetNotify(this);
    this.ID = gameObjID ?? GenerateEntityID();
    this._waitingOneShotTime = NowMs();
    const manager = AudGameObjResource.manager;
    if (manager)
    {
      if (!manager.audioCullingEnabled)
      {
        this._culled = false;
      }
      manager.RegisterGameObject(this.ID, this);
    }
  }

  /**
   * `IInitialize::Initialize` (cpp:442-453): registers the Wwise object,
   * applies the default parent placement at the current position, and posts
   * `eventName` when one is set. Readers call this after building the object.
   *
   * @returns {boolean} True.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.RegisterWwiseObject();
    this.SetPlacementFromParent([0, 0, 1], [0, 1, 0], this.position);
    if (this.eventName)
    {
      this.PostEvent(this.eventName);
    }
    return true;
  }

  /**
   * Carbon's `Initialize(name, prefix, position)` overload (cpp:489-495).
   * Adapted: renamed because JavaScript has no overloads and readers call the
   * no-argument `Initialize`. Sets the name, event prefix and position, then
   * runs `Initialize()`. Like Carbon, it does not mark the position as
   * received; only `AudEmitter.SetPosition` does.
   *
   * @param {string} name Logical object name.
   * @param {string} prefix Event prefix.
   * @param {ArrayLike<number>} position World position.
   */
  @carbon.renamed("Initialize")
  @impl.adapted
  InitializeWithParameters(name, prefix, position)
  {
    this.name = name;
    this.eventPrefix = prefix;
    vec3.copy(this.position, position);
    this.Initialize();
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

    if (this._culled || !manager || !manager.enabled)
    {
      this.ApplyEventStopRelationships(fullEventName);
      if (repository.EventIsLoop(fullEventName) || eventIsVital)
      {
        this._eventsOnWake.add(fullEventName);
      }
      else
      {
        this._waitingOneShotTime = NowMs();
        this._waitingOneShotName = fullEventName;
      }
      eventUsed = true;
    }
    else if (this._gameObjRegistered)
    {
      const banks = repository.SoundBanksRequiredForEvent(fullEventName);
      if (!banks.length)
      {
        return INVALID_PLAYING_ID;
      }
      let soundbanksLoaded = true;
      for (const bank of banks)
      {
        const status = manager.GetSoundBankStatus(bank);
        if (status !== "loaded")
        {
          soundbanksLoaded = false;
          if (status === "loading")
          {
            manager.RegisterEventAfterSoundBankLoad(bank, fullEventName, this);
            break;
          }
          return INVALID_PLAYING_ID;
        }
      }
      if (soundbanksLoaded)
      {
        const eventID = repository.GetEventID(fullEventName);
        playingID = AudGameObjResource.backend?.PostEvent(eventID, this.ID, additionalFlags, this, fullEventName) ?? INVALID_PLAYING_ID;
        manager.LogPostEvent(this.ID, playingID, eventID, fullEventName);
        if (playingID !== INVALID_PLAYING_ID)
        {
          this.ApplyEventStopRelationships(fullEventName);
          this._playingEvents.set(playingID, fullEventName);
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
    for (const [playingID, playing] of this._playingEvents)
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
    if (!AudGameObjResource.manager?.enabled || !this._playingEvents.has(playingID))
    {
      return false;
    }
    return AudGameObjResource.backend?.SeekOnEventPercent(playingID, percentToSeek) === true;
  }

  /** Carbon method SeekOnEventMs: seek a playing event owned by this object. */
  @carbon.method
  @impl.implemented
  SeekOnEventMs(playingID, msToSeek)
  {
    if (!AudGameObjResource.manager?.enabled || !this._playingEvents.has(playingID))
    {
      return false;
    }
    return AudGameObjResource.backend?.SeekOnEventMs(playingID, msToSeek) === true;
  }

  /** Carbon method StopAll. */
  @carbon.method
  @impl.implemented
  StopAll()
  {
    if (AudGameObjResource.manager?.enabled)
    {
      for (const playingID of this._playingEvents.keys())
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
    if (!AudGameObjResource.manager?.enabled || !this._playingEvents.has(playingID))
    {
      return false;
    }
    AudGameObjResource.backend?.ExecuteActionOnPlayingID(action, playingID, fadeOutDuration);
    const actionName = String(action).toLowerCase() === "break" ? "Break" : "Stop";
    AudGameObjResource.manager?.LogExecuteActionOnPlayingID(this.ID, playingID, actionName);
    return true;
  }

  /** Carbon method MarkPlayingIDStoppedByRequest: a stopped loop must not resume on wake. */
  @carbon.method
  @impl.implemented
  MarkPlayingIDStoppedByRequest(playingID)
  {
    const playing = this._playingEvents.get(playingID);
    if (playing !== undefined)
    {
      this._pendingStoppedPlayingIDs.add(playingID);
      this._eventsOnWake.delete(playing);
      this.UpdateEventSoundPrioritizationAttributes();
    }
  }

  /** Carbon method EventFinishedCallback: the only place playing entries are removed (backend end-of-event). */
  @carbon.method
  @impl.implemented
  EventFinishedCallback(playingID)
  {
    this._pendingStoppedPlayingIDs.delete(playingID);
    this._playingEvents.delete(playingID);
    this.UpdateEventSoundPrioritizationAttributes();
  }

  /** Carbon method SetRTPC: value always stored; true only when live-applied. */
  @carbon.method
  @impl.implemented
  SetRTPC(rtpcName, rtpcValue)
  {
    this._rtpcValues.set(String(rtpcName), Number(rtpcValue));
    if (!AudGameObjResource.manager?.enabled)
    {
      return false;
    }
    if (this._gameObjRegistered)
    {
      if (AudGameObjResource.backend?.SetRTPCValue(rtpcName, rtpcValue, this.ID) === false)
      {
        return false;
      }
      AudGameObjResource.manager?.LogSetRTPC(this.ID, rtpcName, rtpcValue);
      return true;
    }
    return false;
  }

  /** Carbon method SetSwitch: value always stored; true only when live-applied. */
  @carbon.method
  @impl.implemented
  SetSwitch(switchGroup, switchState)
  {
    this._switchValues.set(String(switchGroup), String(switchState));
    if (!AudGameObjResource.manager?.enabled)
    {
      return false;
    }
    if (this._gameObjRegistered)
    {
      if (AudGameObjResource.backend?.SetSwitch(switchGroup, switchState, this.ID) === false)
      {
        return false;
      }
      AudGameObjResource.manager?.LogSetSwitch(this.ID, switchGroup, switchState);
      return true;
    }
    return false;
  }

  /** Carbon method Wake: register, restore position/params/attenuation, replay queued events. */
  @carbon.method
  @impl.implemented
  Wake()
  {
    if (!AudGameObjResource.manager?.enabled || this.forceCullingState || this._muted || !this._hasReceivedPosition)
    {
      return;
    }
    // AudGameObjResource.cpp:641 (commit 2756050): a NaN/infinite position
    // must not wake and register - Carbon culls it. Carbon calls the FREE
    // function on m_position here, not the virtual accessor, so the UI and
    // music players' always-false overrides do not block their wake.
    if (!IsUsableWorldPosition(this.position))
    {
      return;
    }
    this.RegisterWwiseObject();
    this.ApplyEffectivePlacement(this._effectiveFront, this._effectiveTop, this.position);
    this._culled = false;
    if (this._waitingOneShotName && this.listenerInRange)
    {
      this.PostEvent(this._waitingOneShotName, true);
      this._waitingOneShotTime = NowMs();
      this._waitingOneShotName = "";
    }
    for (const [rtpcName, rtpcValue] of this._rtpcValues)
    {
      this.SetRTPC(rtpcName, rtpcValue);
    }
    for (const [switchGroup, switchState] of this._switchValues)
    {
      this.SetSwitch(switchGroup, switchState);
    }
    this.SetAttenuationScalingFactor(this.scalingFactor);
    const queued = [...this._eventsOnWake];
    this._eventsOnWake.clear();
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
    for (const [playingID, playing] of this._playingEvents)
    {
      if (repository?.EventIsLoop(playing))
      {
        if (!this._pendingStoppedPlayingIDs.has(playingID) && this.ExecuteActionOnPlayingID(playingID, "stop", 3000))
        {
          this._eventsOnWake.add(playing);
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
    this._culled = true;
  }

  /** Carbon method IsCulled. */
  @carbon.method
  @impl.implemented
  IsCulled()
  {
    return this._culled;
  }

  /** Carbon method ForceCullingStateChange: toggle culled state, then hold it forced. */
  @carbon.method
  @impl.implemented
  ForceCullingStateChange()
  {
    this.forceCullingState = false;
    if (this._culled)
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
    if (this._muted)
    {
      return;
    }
    if (!this._culled)
    {
      this.ForceCullingStateChange();
    }
    this._muted = true;
  }

  /**
   * Carbon method Unmute (cpp:1026-1040), in Carbon's order: the forced wake
   * runs while the object is still muted, so `Wake` returns early and a culled
   * object stays culled until the prioritization system wakes it; the muted
   * flag clears last. Kept as shipped (carbon-known-defects: Unmute order).
   */
  @carbon.method
  @impl.implemented
  Unmute()
  {
    if (!this._muted)
    {
      return;
    }
    if (this._culled)
    {
      this.ForceCullingStateChange();
    }
    this.ReleaseForcedCullingState();
    this._muted = false;
  }

  /** Carbon method IsMuted. */
  @carbon.method
  @impl.implemented
  IsMuted()
  {
    return this._muted;
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
    vec3.copy(this._parentFront, front);
    vec3.copy(this._parentTop, top);
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
      this._effectiveFront,
      this._effectiveTop,
      front,
      top,
      this._normalizedTop,
      this._cross);
    vec3.copy(this.position, positionValue);
    if (AudGameObjResource.manager?.enabled && this._gameObjRegistered)
    {
      AudGameObjResource.backend?.SetPosition(
        this.ID,
        this._effectiveFront,
        this._effectiveTop,
        this.position);
    }
    return 1;
  }

  /** Carbon method HasAuthoredRotation (cpp:415-418): the authored rotation is not identity. */
  @carbon.method
  @impl.implemented
  HasAuthoredRotation()
  {
    return this.rotation[0] !== 0
      || this.rotation[1] !== 0
      || this.rotation[2] !== 0
      || this.rotation[3] !== 1;
  }

  /** Carbon method GetEffectiveOrientation: resolves parent axes through authored rotation into owned buffers. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns a value struct; CarbonEngineJS returns a stable object backed by owned buffers to avoid placement-path allocations.")
  GetEffectiveOrientation()
  {
    if (!this.HasAuthoredRotation() || quat.squaredLength(this.rotation) <= 0)
    {
      vec3.copy(this._candidateFront, this._parentFront);
      vec3.copy(this._candidateTop, this._parentTop);
      return this._candidateOrientation;
    }

    quat.normalize(this._normalizedRotation, this.rotation);
    vec3.transformQuat(this._candidateFront, this._parentFront, this._normalizedRotation);
    vec3.transformQuat(this._candidateTop, this._parentTop, this._normalizedRotation);
    return this._candidateOrientation;
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
    if (AudGameObjResource.manager?.enabled && this._gameObjRegistered)
    {
      if (AudGameObjResource.backend?.SetScalingFactor(this.ID, value) === false)
      {
        return false;
      }
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
  @impl.adapted
  @impl.reason("Carbon relies on Wwise to execute the posted Stop action; the portable backend executes an installed authored program or falls back to the equivalent metadata stop.")
  ApplyEventStopRelationships(stoppingEventName)
  {
    const repository = AudGameObjResource.staticDataRepository;
    if (!repository)
    {
      return;
    }
    const backendOwnsStop = AudGameObjResource.backend?.HandlesEventStops(stoppingEventName) === true;
    let changed = false;
    const playingIDsToStop = [];
    for (const queued of [...this._eventsOnWake])
    {
      if (repository.EventIsStopped(queued, stoppingEventName))
      {
        this._eventsOnWake.delete(queued);
        changed = true;
      }
    }
    for (const [playingID, playing] of this._playingEvents)
    {
      if (repository.EventIsStopped(playing, stoppingEventName))
      {
        if (!backendOwnsStop)
        {
          this._pendingStoppedPlayingIDs.add(playingID);
          playingIDsToStop.push(playingID);
          changed = true;
        }
      }
    }
    if (!backendOwnsStop)
    {
      for (const playingID of playingIDsToStop)
      {
        this.ExecuteActionOnPlayingID(playingID, "stop", 1000);
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
    if (AudGameObjResource.manager?.enabled && !this._gameObjRegistered)
    {
      AudGameObjResource.backend?.RegisterGameObj(this.ID, this.name);
      this._gameObjRegistered = true;
    }
  }

  /** Carbon method UnregisterWwiseObject (cpp:134-146): any state but uninitialized. */
  @carbon.method
  @impl.implemented
  UnregisterWwiseObject()
  {
    if (AudGameObjResource.manager && AudGameObjResource.manager.GetStateValue() !== 0 && this._gameObjRegistered)
    {
      AudGameObjResource.backend?.UnregisterGameObj(this.ID);
      this._gameObjRegistered = false;
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
      this._maxAttenuationRadiusSq = Math.max(this._maxAttenuationRadiusSq, repository.GetEventRadiusSq(eventName));
    }
  }

  /**
   * Carbon method GetMaxAttenuationRadius: radiusSq scaled by the attenuation scaling factor.
   *
   * Carbon multiplies the squared radius by the factor, so the effective
   * culling radius is `authoredRadius * sqrt(scalingFactor)` while Wwise
   * playback range scales linearly. With a factor above 1 a scaled voice can
   * be culled before its distance curve reaches its endpoint; the quirk is
   * kept as shipped.
   */
  @carbon.method
  @impl.implemented
  GetMaxAttenuationRadius()
  {
    return this._maxAttenuationRadiusSq * this.scalingFactor;
  }

  /**
   * Carbon method UpdateEventSoundPrioritizationAttributes (cpp:896-939):
   * recomputes the 2D and vital flags from playing and queued events. The max
   * attenuation radius only GROWS here (through UpdateMaxAttenuationRadiusForEvent)
   * and resets to zero only when nothing plays or waits, as in Carbon.
   */
  @carbon.method
  @impl.implemented
  UpdateEventSoundPrioritizationAttributes()
  {
    const repository = AudGameObjResource.staticDataRepository;
    if (this._playingEvents.size === 0 && this._eventsOnWake.size === 0)
    {
      this._maxAttenuationRadiusSq = 0;
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
    for (const collection of [this._playingEvents.values(), this._eventsOnWake.values()])
    {
      for (const playing of collection)
      {
        this.UpdateMaxAttenuationRadiusForEvent(playing);
        is2D = is2D || repository.EventIs2D(playing);
        isVital = isVital || repository.EventIsVital(playing);
      }
    }
    this.playing2DSound = is2D;
    this.playingVitalSound = isVital;
  }

  /** Carbon method CalculateCullingWeight: refresh in-range/one-shot state and store the weight. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads complete authored radii and manager property delegates. CarbonEngineJS reads the manager's SoundPrioritization directly and treats a nonpositive radius as unknown/unbounded so optional metadata cannot make an event inaudible.")
  CalculateCullingWeight(now = NowMs())
  {
    const prioritization = AudGameObjResource.manager?.soundPrioritization;
    if (!prioritization)
    {
      return;
    }
    if (!this._muted)
    {
      // Carbon AudGameObjResource.cpp:741 compares the squared distance
      // strictly against complete authored metadata. Portable libraries may
      // omit that optional radius; zero therefore means unknown, not silent.
      const maxAttenuationRadius = this.GetMaxAttenuationRadius();
      this.listenerInRange = this.playing2DSound
        || maxAttenuationRadius <= 0
        || this.distanceFromListener < maxAttenuationRadius;
    }
    let waitingOneShotWeight = 0;
    if (this._culled && this._waitingOneShotName)
    {
      if (now - this._waitingOneShotTime > prioritization.GetOneShotWindow())
      {
        this._waitingOneShotTime = now;
        this._waitingOneShotName = "";
      }
      else if (this.listenerInRange)
      {
        waitingOneShotWeight = prioritization.GetWaitingOneShotWeight();
      }
    }
    this.cumulativeWeight = SoundPrioritization.calculateObjectWeight(
      this.distanceFromListener, this._muted, this.listenerInRange, this.isUsed, this.isVisible,
      this.playing2DSound, this.playingVitalSound, this.additionalCullingWeight, this._playingEvents.size,
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
    return this._effectiveFront;
  }

  /** Carbon method GetTop. */
  @carbon.method
  @impl.implemented
  GetTop()
  {
    return this._effectiveTop;
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
    return new Map(this._playingEvents);
  }

  /** Carbon method GetSwitches. */
  @carbon.method
  @impl.implemented
  GetSwitches()
  {
    return this._switchValues;
  }

  /** Queued events replayed on Wake (introspection/test surface). */
  @impl.custom
  @impl.reason("CarbonEngineJS-only accessor over private wake-queue state; Carbon exposes no equivalent read.")
  GetEventsOnWake()
  {
    return [...this._eventsOnWake];
  }

  /** The pending culled one-shot event name, "" when none. */
  @impl.custom
  @impl.reason("CarbonEngineJS-only accessor over private one-shot state; Carbon exposes no equivalent read.")
  GetWaitingOneShot()
  {
    return this._waitingOneShotName;
  }

  /**
   * Whether the position is a real world placement: finite on all three
   * components and not Carbon's FLT_MAX WWISE_INIT_POSITION sentinel.
   * Source: audio/src/Audio2.h:35 IsUsableWorldPosition,
   * AudGameObjResource.cpp:1067 (commit 2756050).
   */
  @carbon.method
  @impl.implemented
  HasUsableWorldPosition()
  {
    return IsUsableWorldPosition(this.position);
  }

  /** Values settle hook: refresh notified event-name and rotation consequences. */
  @impl.adapted
  @impl.reason("JS identifies Carbon's member address by its exposed name; playback remains on the injected audio backend.")
  OnModified(propertyName)
  {
    if (propertyName === "rotation")
    {
      this.RefreshPlacementFromRotation();
      return true;
    }
    if (propertyName === "eventName")
    {
      this.StopAll();
      if (this.eventName) this.PostEvent(this.eventName);
    }
    return true;
  }

  /** Binds only a newly inserted, non-loading parameter to this object. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon friendship assigning AudParameter::m_ID uses the class-owned SetGameObjectID seam.")
  OnListModified(event, _key, _key2, value, list = this.parameters)
  {
    if (!(event & BLUELISTEVENT.BELIST_LOADING) && list === this.parameters
      && (event & BLUELISTEVENT.BELIST_EVENTMASK) === BLUELISTEVENT.BELIST_INSERTED)
    {
      value.SetGameObjectID(this.ID);
    }
  }

  /**
   * Carbon PrepareEvent (AudGameObjResource.cpp:610-620): trim the event name
   * and, unless bypassed, prepend this emitter's prefix. The module helper
   * below carries the logic so the two internal call sites (cpp:184, cpp:311
   * equivalents) can use it without an instance.
   */
  @carbon.method
  @impl.implemented
  PrepareEvent(event, bypassPrefix = false)
  {
    return PrepareEvent(this.eventPrefix, event, bypassPrefix);
  }

  // Realization seams (Carbon globals g_audioManager / g_staticDataRepository
  // and the AK:: call surface). Headless default null.
  static manager = null;

  static staticDataRepository = null;

  static backend = null;

}

// C++ AudGameObjResource::PrepareEvent - trim always, prefix only when
// non-empty and not bypassed.
/** Trims an event name and conditionally prepends its game-object prefix. */
export function PrepareEvent(prefix, event, bypassPrefix)
{
  const trimmed = String(event).trim();
  return prefix && !bypassPrefix ? `${prefix}${trimmed}` : trimmed;
}

carbon.interfaceTable({ interfaces: [IInitialize, IListNotify, INotify, AudGameObjResource], chainTo: null })(AudGameObjResource, { kind: "class" });
