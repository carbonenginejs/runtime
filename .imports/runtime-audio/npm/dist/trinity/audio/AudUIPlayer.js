import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { AudEmitter as _AudEmitter } from './AudEmitter.js';

let _initProto, _initClass, _init_eventSenderCallback, _init_extra_eventSenderCallback;
const UI_GAME_OBJ_ID = 2;
const FLOAT_MAX = 3.4028234663852886e38;

/** AudUIPlayer (audio) - fixed UI emitter with dialogue position and finish callbacks. */
let _AudUIPlayer;
new class extends _identity {
  static [class AudUIPlayer extends _AudEmitter {
    static {
      ({
        e: [_init_eventSenderCallback, _init_extra_eventSenderCallback, _initProto],
        c: [_AudUIPlayer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "AudUIPlayer",
        family: "audio"
      })], [[[io, io.readwrite, void 0, type.rawStruct("BlueScriptCallback")], 16, "eventSenderCallback"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEventPlayPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "PostDialogueEvent"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon stores one callback event name; CarbonEngineJS captures the callback per playing ID so overlapping UI events complete independently. Browser callbacks already run on the main event loop and are deferred to a microtask.")], 18, "SendEventWithCallback"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Wwise marshals its audio-thread callback to Carbon's main thread; WebAudio completion is already delivered on the browser event loop, so CarbonEngineJS defers one microtask.")], 18, "EventFinishedCallback"]], 0, void 0, _AudEmitter));
    }
    /** m_callback (BlueScriptCallback) [READWRITE] */
    eventSenderCallback = (_initProto(this), _init_eventSenderCallback(this, null));
    #callbackEvents = (_init_extra_eventSenderCallback(this), new Map());

    /** Creates Carbon's fixed-id UI emitter at its authored origin pose. */
    constructor() {
      super(UI_GAME_OBJ_ID);
      this.name = "UI";
      this.additionalCullingWeight = FLOAT_MAX;
      this.SetPosition([1, 0, 0], [0, 1, 0], [0, 0, 0]);
    }

    /** Carbon method GetEventPlayPosition (MAP_METHOD_AND_WRAP). */
    GetEventPlayPosition(playingID) {
      if (!this.constructor.manager?.enabled) {
        return -1;
      }
      return this.constructor.backend?.GetSourcePlayPosition?.(playingID) ?? -1;
    }

    /** Carbon method PostDialogueEvent (MAP_METHOD_AND_WRAP). */
    PostDialogueEvent(eventName) {
      return this.constructor.manager?.enabled ? this.PostEvent(eventName, false, 0) : 0;
    }

    /** Carbon method SendEventWithCallback (MAP_METHOD_AND_WRAP). */
    SendEventWithCallback(name) {
      if (!this.constructor.manager?.enabled || !this.eventSenderCallback) {
        return 0;
      }
      const callback = this.eventSenderCallback;
      const playingID = this.PostEvent(name, false, 0);
      if (playingID) {
        this.#callbackEvents.set(playingID, {
          callback,
          eventName: this.GetPlayingEvents().get(playingID) ?? String(name ?? "")
        });
      }
      return playingID;
    }

    /** Carbon EventFinishedCallback override: base bookkeeping first, then the UI callback. */
    EventFinishedCallback(playingID) {
      const callbackEvent = this.#callbackEvents.get(playingID) ?? null;
      this.#callbackEvents.delete(playingID);
      super.EventFinishedCallback(playingID);
      if (callbackEvent) {
        queueMicrotask(() => _AudUIPlayer.#InvokeCallback(callbackEvent.callback, callbackEvent.eventName));
      }
    }

    /** Invokes one function- or Blue-style UI completion callback. */
  }];
  #InvokeCallback(callback, eventName) {
    if (typeof callback === "function") {
      callback(eventName);
    } else if (typeof callback?.CallVoid === "function") {
      callback.CallVoid(eventName);
    } else {
      callback?.Invoke?.(eventName);
    }
  }
  constructor() {
    super(_AudUIPlayer), _initClass();
  }
}();

export { _AudUIPlayer as AudUIPlayer, UI_GAME_OBJ_ID };
//# sourceMappingURL=AudUIPlayer.js.map
