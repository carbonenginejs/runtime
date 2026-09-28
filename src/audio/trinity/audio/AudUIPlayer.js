// Source: audio/src/AudUIPlayer.h + AudUIPlayer.cpp
// Hand-owned since 2026-07-23 (behavior port); the generator skips this file.
// Verify against audio/AudUIPlayer.json.
import { carbon, impl, edit, type } from "#schema";
import { AudEmitter } from "./AudEmitter.js";

export const UI_GAME_OBJ_ID = 2;

const FLOAT_MAX = 3.4028234663852886e38;

/** Provides the fixed Carbon UI emitter with dialogue position and completion callbacks. */
@type.define({ className: "AudUIPlayer", family: "audio" })
export class AudUIPlayer extends AudEmitter
{

  /** m_callback (BlueScriptCallback) [READWRITE] */
  @edit.readwrite
  @type.rawStruct("BlueScriptCallback")
  eventSenderCallback = null;

  _callbackEvents = new Map();

  /** Creates Carbon's fixed-id UI emitter at its authored origin pose. */
  constructor()
  {
    super(UI_GAME_OBJ_ID);
    this.name = "UI";
    this.additionalCullingWeight = FLOAT_MAX;
    this.SetPosition([ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
  }

  /** The UI player has no world placement. Source: AudUIPlayer.cpp:20-23 (commit 2756050). */
  @carbon.method
  @impl.implemented
  HasUsableWorldPosition()
  {
    return false;
  }

  /**
   * Returns the backend play position in milliseconds, or -1 when unavailable.
   *
   * Adapted: The injected backend returns the position directly instead of Wwise's
   * result code and output parameter (audio/src/AudUIPlayer.cpp:76-89). A disabled
   * manager or missing backend method also returns -1.
   *
   * @param {number} playingID Event playing identifier.
   * @returns {number} Elapsed milliseconds, or -1.
   */
  @carbon.method
  @impl.adapted
  GetEventPlayPosition(playingID)
  {
    if (!this.constructor.manager?.enabled)
    {
      return -1;
    }
    return this.constructor.backend?.GetSourcePlayPosition(playingID) ?? -1;
  }

  /** Carbon method PostDialogueEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  PostDialogueEvent(eventName)
  {
    return this.constructor.manager?.enabled ? this.PostEvent(eventName, false, 0) : 0;
  }

  /**
   * Posts an event and captures its completion callback by playing ID.
   *
   * Adapted: Carbon retains one callback event name and reads the current callback
   * at dispatch (audio/src/AudUIPlayer.cpp:33-48,100-133). JavaScript captures the
   * callback and posted name for each playing ID, so overlapping requests and
   * callback replacement do not change earlier registrations. A missing callback
   * returns zero without Carbon's error log.
   *
   * The native prefix quirk prepares the name twice (AudUIPlayer.cpp:37-40 and
   * AudGameObjResource.cpp:184,610-619); this implementation prepares it only
   * through PostEvent and therefore does not reproduce that quirk.
   *
   * @param {string} name Event name.
   * @returns {number} Playing identifier, or zero when not posted.
   */
  @carbon.method
  @impl.adapted
  SendEventWithCallback(name)
  {
    if (!this.constructor.manager?.enabled || !this.eventSenderCallback)
    {
      return 0;
    }
    const callback = this.eventSenderCallback;
    const playingID = this.PostEvent(name, false, 0);
    if (playingID)
    {
      this._callbackEvents.set(playingID, {
        callback,
        eventName: this.GetPlayingEvents().get(playingID) ?? String(name ?? "")
      });
    }
    return playingID;
  }

  /**
   * Removes the completion registration, runs base bookkeeping, and schedules its callback.
   *
   * Adapted: A playing ID replaces Wwise's callback-info structure. Carbon queues
   * a main-thread callback that reads the player's current callback and event name;
   * JavaScript queues a microtask with this playing ID's captured registration
   * (audio/src/AudUIPlayer.cpp:100-133).
   *
   * @param {number} playingID Completed event identifier.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  EventFinishedCallback(playingID)
  {
    const callbackEvent = this._callbackEvents.get(playingID) ?? null;
    this._callbackEvents.delete(playingID);
    super.EventFinishedCallback(playingID);
    if (callbackEvent)
    {
      queueMicrotask(() => AudUIPlayer._InvokeCallback(callbackEvent.callback, callbackEvent.eventName));
    }
  }

  /** Invokes one function- or Blue-style UI completion callback. */
  static _InvokeCallback(callback, eventName)
  {
    if (typeof callback === "function")
    {
      callback(eventName);
    }
    else if (typeof callback?.CallVoid === "function")
    {
      callback.CallVoid(eventName);
    }
    else
    {
      callback?.Invoke?.(eventName);
    }
  }

}
