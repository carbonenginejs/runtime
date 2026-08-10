import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { TriExtrapolation } from '@carbonenginejs/runtime-utils/graphics';
import { AudEmitter as _AudEmitter } from './AudEmitter.js';
import { AudEventKey as _AudEventKey } from './AudEventKey.js';

let _initProto, _initClass, _init_extrapolation, _init_extra_extrapolation, _init_time, _init_extra_time, _init_length, _init_extra_length, _init_localTime, _init_extra_localTime, _init_name, _init_extra_name, _init_value, _init_extra_value, _init_sourceTriObserver, _init_extra_sourceTriObserver, _init_keys, _init_extra_keys, _init_audioEmitter, _init_extra_audioEmitter;

/** AudEventCurve (audio) - timeline curve whose keys fire audio events. */
let _AudEventCurve;
new class extends _identity {
  static [class AudEventCurve extends CjsModel {
    static {
      ({
        e: [_init_extrapolation, _init_extra_extrapolation, _init_time, _init_extra_time, _init_length, _init_extra_length, _init_localTime, _init_extra_localTime, _init_name, _init_extra_name, _init_value, _init_extra_value, _init_sourceTriObserver, _init_extra_sourceTriObserver, _init_keys, _init_extra_keys, _init_audioEmitter, _init_extra_audioEmitter, _initProto],
        c: [_AudEventCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "AudEventCurve",
        family: "audio"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("TRIEXTRAPOLATION")], 16, "extrapolation"], [[io, io.read, type, type.float64], 16, "time"], [[io, io.read, type, type.float32], 16, "length"], [[io, io.read, type, type.float32], 16, "localTime"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "value"], [[io, io.persist, void 0, type.model("ITriObserverLocal")], 16, "sourceTriObserver"], [[io, io.persistOnly, void 0, type.list("AudEventKey")], 16, "keys"], [[io, io.read, void 0, type.objectRef("AudEmitter")], 16, "audioEmitter"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "InsertKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "RemoveKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSourceTriObserver"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSourceTriObserver"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The placement-observer contract is consumed structurally to keep runtime-audio independent of runtime-trinity.")], 18, "CreateAudioEmitter"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"]], 0, void 0, CjsModel));
    }
    /** m_extrapolation (TRIEXTRAPOLATION - enum TRIEXTRAPOLATION) [READWRITE, PERSIST, ENUM] */
    extrapolation = (_initProto(this), _init_extrapolation(this, 0));

    /** m_time (double) [READ] */
    time = (_init_extra_extrapolation(this), _init_time(this, 0));

    /** m_length (float) [READ] */
    length = (_init_extra_time(this), _init_length(this, 0));

    /** m_localTime (float) [READ] */
    localTime = (_init_extra_length(this), _init_localTime(this, 0));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_localTime(this), _init_name(this, ""));

    /** m_value (std::wstring) [READWRITE, PERSIST] */
    value = (_init_extra_name(this), _init_value(this, ""));

    /** m_sourceTriObserver (ITriObserverLocalPtr) [READWRITE, PERSIST] */
    sourceTriObserver = (_init_extra_value(this), _init_sourceTriObserver(this, null));

    /** m_keys (PAudEventKeyVector) [PERSISTONLY] */
    keys = (_init_extra_sourceTriObserver(this), _init_keys(this, []));

    /** m_audioEmitter (AudEmitterPtr) [READ] */
    audioEmitter = (_init_extra_keys(this), _init_audioEmitter(this, null));

    // Playback cursor (C++ m_currentKeyIt) - runtime state, rebuildable.
    #currentKeyIndex = (_init_extra_audioEmitter(this), 0);
    #queuedEvent = "";

    /** Carbon method AddKey (MAP_METHOD_AND_WRAP). Appends a key and resorts. */
    AddKey(time, evtName) {
      const key = new _AudEventKey();
      key.time = Number(time) || 0;
      key.value = String(evtName ?? "");
      this.InsertKey(key);
    }

    /** Carbon method InsertKey (not Blue-mapped): insert, sort, reset cursor, refresh length. */
    InsertKey(key) {
      this.keys.push(key);
      SortKeys(this.keys);
      this.#currentKeyIndex = 0;
      this.length = this.keys[this.keys.length - 1].time;
    }

    /** Carbon method GetKeyCount (MAP_METHOD_AND_WRAP). */
    GetKeyCount() {
      return this.keys.length;
    }

    /** Carbon method GetKeyTime (MAP_METHOD_AND_WRAP). Returns 0 out of range. */
    GetKeyTime(ix) {
      return InRange(this.keys, ix) ? this.keys[ix].time : 0;
    }

    /** Carbon method GetKeyValue (MAP_METHOD_AND_WRAP). Returns "" out of range. */
    GetKeyValue(ix) {
      return InRange(this.keys, ix) ? this.keys[ix].value : "";
    }

    /** Carbon method SetKeyTime (MAP_METHOD_AND_WRAP). Resorts and refreshes length. */
    SetKeyTime(ix, time) {
      if (!InRange(this.keys, ix)) {
        return;
      }
      this.keys[ix].time = Number(time) || 0;
      SortKeys(this.keys);
      this.length = this.keys[this.keys.length - 1].time;
    }

    /** Carbon method SetKeyValue (MAP_METHOD_AND_WRAP). */
    SetKeyValue(ix, value) {
      if (InRange(this.keys, ix)) {
        this.keys[ix].value = String(value ?? "");
      }
    }

    // Carbon leaves length untouched when the last key is removed - preserved.
    /** Carbon method RemoveKey (MAP_METHOD_AND_WRAP). */
    RemoveKey(ix) {
      if (!InRange(this.keys, ix)) {
        return;
      }
      this.keys.splice(ix, 1);
      SortKeys(this.keys);
      this.#currentKeyIndex = 0;
      if (this.keys.length > 0) {
        this.length = this.keys[this.keys.length - 1].time;
      }
    }

    /** Carbon method Initialize (IInitialize, not Blue-mapped): sort persisted keys, refresh length and attach an emitter. */
    Initialize() {
      SortKeys(this.keys);
      this.#currentKeyIndex = 0;
      if (this.keys.length > 0) {
        this.length = this.keys[this.keys.length - 1].time;
      }
      if (this.sourceTriObserver) {
        this.CreateAudioEmitter();
      }
      return true;
    }

    /** Carbon method Length (ITriCurveLength): returns the cached final key time. */
    Length() {
      return this.length;
    }

    /** Carbon method Reset (ITriFunction, not Blue-mapped): rewind the playback cursor. */
    Reset() {
      this.#currentKeyIndex = 0;
    }

    /** Carbon method GetSourceTriObserver (MAP_METHOD_AND_WRAP). */
    GetSourceTriObserver() {
      return this.sourceTriObserver;
    }

    /** Carbon method SetSourceTriObserver (MAP_METHOD_AND_WRAP). */
    SetSourceTriObserver(sourceTriObserver) {
      this.sourceTriObserver = sourceTriObserver;
      this.CreateAudioEmitter();
    }

    /** Carbon method CreateAudioEmitter: reuse or attach an AudEmitter placement observer. */
    CreateAudioEmitter() {
      if (!this.sourceTriObserver) {
        return null;
      }
      const existing = this.sourceTriObserver.GetObserver?.() ?? this.sourceTriObserver.observer ?? null;
      if (existing instanceof _AudEmitter) {
        this.audioEmitter = existing;
        return existing;
      }
      const emitter = new _AudEmitter();
      emitter.Initialize(this.name);
      this.sourceTriObserver.SetObserver?.(emitter);
      if (!this.sourceTriObserver.SetObserver) {
        this.sourceTriObserver.observer = emitter;
      }
      this.audioEmitter = emitter;
      return emitter;
    }

    /** Carbon method UpdateValue (ITriFunction): fires keyed events as time advances. */
    UpdateValue(time) {
      if (this.length === 0) {
        return;
      }
      const before = this.time;
      this.time = Number(time) || 0;
      if (this.time < before) {
        this.#currentKeyIndex = 0;
      }
      if (this.extrapolation === TriExtrapolation.TRIEXT_CYCLE) {
        const localNow = this.time % this.length;
        if (localNow < this.localTime) {
          this.#currentKeyIndex = 0;
        }
        this.localTime = localNow;
      } else {
        this.localTime = this.time;
      }
      if (!this.audioEmitter && this.sourceTriObserver) {
        this.CreateAudioEmitter();
      }
      const positioned = this.audioEmitter?.HasReceivedPosition?.() === true;
      if (this.#queuedEvent && positioned) {
        this.audioEmitter.SendEvent(this.#queuedEvent);
        this.#queuedEvent = "";
      }
      while (this.#currentKeyIndex < this.keys.length && this.localTime >= this.keys[this.#currentKeyIndex].time) {
        const eventName = this.keys[this.#currentKeyIndex].value;
        if (eventName) {
          if (positioned) {
            this.audioEmitter.SendEvent(eventName);
          } else {
            this.#queuedEvent = eventName;
          }
        }
        this.#currentKeyIndex++;
      }
    }

    // Carbon enum TRIEXTRAPOLATION (blue/include/ITriConstants.h:33) - shared
    // vocabulary owned by runtime-utils; aliased as a class static per the org
    // enum rule so @type.enum("TRIEXTRAPOLATION") resolves and users address
    // AudEventCurve.TRIEXTRAPOLATION.TRIEXT_CYCLE (TriOperator pattern).
  }];
  TRIEXTRAPOLATION = TriExtrapolation;
  constructor() {
    super(_AudEventCurve), _initClass();
  }
}();
function SortKeys(keys) {
  keys.sort((a, b) => a.time - b.time);
}
function InRange(keys, ix) {
  return Number.isInteger(ix) && ix >= 0 && ix < keys.length;
}

export { _AudEventCurve as AudEventCurve };
//# sourceMappingURL=AudEventCurve.js.map
