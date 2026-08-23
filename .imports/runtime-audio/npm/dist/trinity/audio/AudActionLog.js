import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass;
function Now() {
  return globalThis.performance?.now() ?? Date.now();
}

/** Provides the base value contract for one queued Carbon audio action. */
class AudActionRecord {
  /** Carbon's Python bridge returns a tuple; JavaScript uses the equivalent array. */
  ToPyObject() {
    return [];
  }
}

/** Records one event post with time, emitter, playing, event, and name identities. */
class AudActionRecordPostEvent extends AudActionRecord {
  /** Creates one event-post record. */
  constructor(time = 0, emitterID = 0, playID = 0, eventID = 0, name = "") {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.playID = playID;
    this.eventID = eventID;
    this.name = String(name);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject() {
    return ["AudActionRecordPostEvent", this.time, this.emitterID, this.playID, this.eventID, this.name];
  }
}

/** Records one stop or break action applied to a playing identity. */
class AudActionRecordExecuteActionOnPlayingID extends AudActionRecord {
  /** Creates one playing-id action record. */
  constructor(time = 0, emitterID = 0, playID = 0, action = "") {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.playID = playID;
    this.action = String(action);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject() {
    return ["AudActionRecordExecuteActionOnPlayingID", this.time, this.emitterID, this.playID, this.action];
  }
}

/** Records one emitter-local switch group and state change. */
class AudActionRecordSetSwitch extends AudActionRecord {
  /** Creates one emitter-local switch record. */
  constructor(time = 0, emitterID = 0, group = "", state = "") {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.group = String(group);
    this.state = String(state);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject() {
    return ["AudActionRecordSetSwitch", this.time, this.emitterID, this.group, this.state];
  }
}

/** Records one global audio state-group change. */
class AudActionRecordSetState extends AudActionRecord {
  /** Creates one global state record. */
  constructor(time = 0, group = "", state = "") {
    super();
    this.time = time;
    this.group = String(group);
    this.state = String(state);
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject() {
    return ["AudActionRecordSetState", this.time, this.group, this.state];
  }
}

/** Records one global or emitter-local real-time parameter change. */
class AudActionRecordSetRTPC extends AudActionRecord {
  /** Creates one global or emitter-local RTPC record. */
  constructor(time = 0, emitterID = 0, name = "", value = 0, playID = 0) {
    super();
    this.time = time;
    this.emitterID = emitterID;
    this.name = String(name);
    this.value = Number(value);
    this.playID = playID;
  }

  /** Returns Carbon's Python-bridge tuple as a JavaScript array. */
  ToPyObject() {
    return ["AudActionRecordSetRTPC", this.time, this.emitterID, this.name, this.value, this.playID];
  }
}

/**
 * Queues Carbon-shaped audio action records and flushes them to a registered
 * JavaScript callback during manager processing.
 */
let _AudActionLogCB;
class AudActionLogCB extends CjsModel {
  static {
    ({
      e: [_initProto],
      c: [_AudActionLogCB, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudActionLogCB",
      family: "audio"
    })], [[[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("BlueScriptCallback is represented by a JavaScript function or an object exposing CallVoid(record).")], 18, "RegisterCallback"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogPostEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogExecuteActionOnPlayingID"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogSetSwitch"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogSetState"], [[carbon, carbon.method, impl, impl.implemented], 18, "LogSetRTPC"], [[carbon, carbon.method, impl, impl.implemented], 18, "Flush"]], 0, void 0, CjsModel));
  }
  #callback = (_initProto(this), null);
  #queue = [];

  /** Carbon method RegisterCallback. Null unregisters without discarding queued records. */
  RegisterCallback(callback) {
    if (callback !== null && callback !== undefined && typeof callback !== "function" && typeof callback?.CallVoid !== "function") {
      throw new TypeError("AudActionLogCB.RegisterCallback requires a function, CallVoid object, or null.");
    }
    this.#callback = callback ?? null;
  }

  /** Carbon IAudActionLog method LogPostEvent. */
  LogPostEvent(emitterID, playID, eventID, name) {
    this.#queue.push(new AudActionRecordPostEvent(Now(), emitterID, playID, eventID, name));
  }

  /** Carbon IAudActionLog method LogExecuteActionOnPlayingID. */
  LogExecuteActionOnPlayingID(emitterID, playID, action) {
    this.#queue.push(new AudActionRecordExecuteActionOnPlayingID(Now(), emitterID, playID, action));
  }

  /** Carbon IAudActionLog method LogSetSwitch. */
  LogSetSwitch(emitterID, group, state) {
    this.#queue.push(new AudActionRecordSetSwitch(Now(), emitterID, group, state));
  }

  /** Carbon IAudActionLog method LogSetState. */
  LogSetState(group, state) {
    this.#queue.push(new AudActionRecordSetState(Now(), group, state));
  }

  /** Carbon IAudActionLog method LogSetRTPC. */
  LogSetRTPC(emitterID, name, value, playID = 0) {
    this.#queue.push(new AudActionRecordSetRTPC(Now(), emitterID, name, value, playID));
  }

  /** Carbon method Flush. Records remain queued until a callback exists. */
  Flush() {
    while (this.#callback && this.#queue.length) {
      const record = this.#queue[0].ToPyObject();
      if (typeof this.#callback === "function") {
        this.#callback(record);
      } else {
        this.#callback.CallVoid(record);
      }
      this.#queue.shift();
    }
  }
  static {
    _initClass();
  }
}

export { _AudActionLogCB as AudActionLogCB, AudActionRecord, AudActionRecordExecuteActionOnPlayingID, AudActionRecordPostEvent, AudActionRecordSetRTPC, AudActionRecordSetState, AudActionRecordSetSwitch };
//# sourceMappingURL=AudActionLog.js.map
