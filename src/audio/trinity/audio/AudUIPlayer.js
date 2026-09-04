// Source: audio/src/AudUIPlayer.h + AudUIPlayer.cpp
// Hand-owned since 2026-07-23 (behavior port); the generator skips this file.
// Verify against audio/AudUIPlayer.json.
import { carbon, impl, io, type } from "#schema";
import { AudEmitter } from "./AudEmitter.js";

export const UI_GAME_OBJ_ID = 2;

const FLOAT_MAX = 3.4028234663852886e38;

/** AudUIPlayer (audio) - fixed UI emitter with dialogue position and finish callbacks. */
@type.define({ className: "AudUIPlayer", family: "audio" })
export class AudUIPlayer extends AudEmitter
{

  /** m_callback (BlueScriptCallback) [READWRITE] */
  @io.readwrite
  @type.rawStruct("BlueScriptCallback")
  eventSenderCallback = null;

  #callbackEvents = new Map();

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

  /** Carbon method GetEventPlayPosition (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetEventPlayPosition(playingID)
  {
    if (!this.constructor.manager?.enabled)
    {
      return -1;
    }
    return this.constructor.backend?.GetSourcePlayPosition?.(playingID) ?? -1;
  }

  /** Carbon method PostDialogueEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  PostDialogueEvent(eventName)
  {
    return this.constructor.manager?.enabled ? this.PostEvent(eventName, false, 0) : 0;
  }

  /** Carbon method SendEventWithCallback (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon stores one callback event name; CarbonEngineJS captures the callback per playing ID so overlapping UI events complete independently. Browser callbacks already run on the main event loop and are deferred to a microtask.")
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
      this.#callbackEvents.set(playingID, {
        callback,
        eventName: this.GetPlayingEvents().get(playingID) ?? String(name ?? "")
      });
    }
    return playingID;
  }

  /** Carbon EventFinishedCallback override: base bookkeeping first, then the UI callback. */
  @carbon.method
  @impl.adapted
  @impl.reason("Wwise marshals its audio-thread callback to Carbon's main thread; WebAudio completion is already delivered on the browser event loop, so CarbonEngineJS defers one microtask.")
  EventFinishedCallback(playingID)
  {
    const callbackEvent = this.#callbackEvents.get(playingID) ?? null;
    this.#callbackEvents.delete(playingID);
    super.EventFinishedCallback(playingID);
    if (callbackEvent)
    {
      queueMicrotask(() => AudUIPlayer.#InvokeCallback(callbackEvent.callback, callbackEvent.eventName));
    }
  }

  /** Invokes one function- or Blue-style UI completion callback. */
  static #InvokeCallback(callback, eventName)
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
