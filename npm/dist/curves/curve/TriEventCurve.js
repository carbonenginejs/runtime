import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TRIEXTRAPOLATION } from '../enums.js';
import { TriEventKey as _TriEventKey } from '../key/TriEventKey.js';

let _initProto, _initClass, _init_extrapolation, _init_extra_extrapolation, _init_name, _init_extra_name, _init_eventListener, _init_extra_eventListener, _init_time, _init_extra_time, _init_length, _init_extra_length, _init_localTime, _init_extra_localTime, _init_value, _init_extra_value, _init_keys, _init_extra_keys;

/**
 * Time-keyed event track that fires each key once as the playhead passes it,
 * dispatching either a named event to a listener or a queued callable, and
 * restarting the key cursor when time rewinds or a cycle wraps.
 */
let _TriEventCurve;
new class extends _identity {
  static [class TriEventCurve extends CjsModel {
    static {
      ({
        e: [_init_extrapolation, _init_extra_extrapolation, _init_name, _init_extra_name, _init_eventListener, _init_extra_eventListener, _init_time, _init_extra_time, _init_length, _init_extra_length, _init_localTime, _init_extra_localTime, _init_value, _init_extra_value, _init_keys, _init_extra_keys, _initProto],
        c: [_TriEventCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriEventCurve",
        family: "curves"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("TRIEXTRAPOLATION")], 16, "extrapolation"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.readwrite, void 0, type.objectRef("IBlueEventListener")], 16, "eventListener"], [[io, io.read, type, type.float64], 16, "time"], [[io, io.read, type, type.float32], 16, "length"], [[io, io.read, type, type.float32], 16, "localTime"], [[io, io.persist, type, type.string], 16, "value"], [[io, io.persistOnly, void 0, type.list("TriEventKey")], 16, "keys"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.implemented], 18, "Sort"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddKey"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddCallableKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "InsertKey"], [[carbon, carbon.method, impl, impl.adapted], 18, "RemoveKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKeyValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKeyValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetCallableKeyValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetCallableKeyArgs"]], 0, void 0, CjsModel));
    }
    /** Queues work for the runtime's post-update phase. */
    static queuePostUpdateCallback(callback) {
      this.#postUpdateCallbacks.push(callback);
    }

    /** Runs one queued post-update callback. */
    static runNextPostUpdateCallback() {
      const callback = this.#postUpdateCallbacks.shift();
      if (!callback) {
        return false;
      }
      callback();
      return true;
    }

    /** Flushes queued post-update callbacks up to the supplied limit. */
    static flushPostUpdateCallbacks(limit = Number.POSITIVE_INFINITY) {
      let count = 0;
      while (count < limit && this.runNextPostUpdateCallback()) {
        count++;
      }
      return count;
    }

    /**
     * Gets the number of callable-key invocations still queued for the post-update
     * phase.
     */
    static getPostUpdateCallbackCount() {
      return this.#postUpdateCallbacks.length;
    }

    /** Discards every queued post-update callback without running it. */
    static clearPostUpdateCallbacks() {
      this.#postUpdateCallbacks.length = 0;
    }
    extrapolation = (_initProto(this), _init_extrapolation(this, TRIEXTRAPOLATION.NONE));
    name = (_init_extra_extrapolation(this), _init_name(this, ""));
    eventListener = (_init_extra_name(this), _init_eventListener(this, null));
    time = (_init_extra_eventListener(this), _init_time(this, 0));
    length = (_init_extra_time(this), _init_length(this, 0));
    localTime = (_init_extra_length(this), _init_localTime(this, 0));
    value = (_init_extra_localTime(this), _init_value(this, ""));
    keys = (_init_extra_value(this), _init_keys(this, []));
    #currentKeyIndex = (_init_extra_keys(this), 0);

    /**
     * Updates the curve time and fires newly-crossed event keys.
     */
    UpdateValue(time) {
      if (this.length === 0) {
        return;
      }
      const before = this.time;
      this.time = time;
      if (this.time < before) {
        this.#currentKeyIndex = 0;
        return;
      }
      if (this.extrapolation === TRIEXTRAPOLATION.CYCLE) {
        const localNow = this.time % this.length;
        if (localNow < this.localTime) {
          this.#currentKeyIndex = 0;
        }
        this.localTime = localNow;
      } else {
        this.localTime = this.time;
      }
      while (this.#currentKeyIndex < this.keys.length && this.localTime >= this.keys[this.#currentKeyIndex].time) {
        this.FireKey(this.keys[this.#currentKeyIndex]);
        this.#currentKeyIndex++;
      }
    }

    /**
     * Sorts keys after hydration.
     */
    Initialize() {
      this.Sort();
      return true;
    }

    /**
     * Gets the curve length.
     */
    Length() {
      return this.length;
    }

    /**
     * Sorts keys stably by time and resets the event cursor.
     */
    Sort() {
      this.keys = this.keys.map((key, index) => ({
        key: _TriEventCurve.#ensureEventKey(key),
        index
      })).sort((a, b) => a.key.time - b.key.time || a.index - b.index).map(entry => entry.key);
      this.#currentKeyIndex = 0;
      this.length = this.keys.length ? this.keys[this.keys.length - 1].time : 0;
    }

    /**
     * Adds a string event key.
     */
    AddKey(time, eventName) {
      const key = new _TriEventKey();
      key.time = time;
      key.value = eventName;
      this.InsertKey(key);
    }

    /**
     * Adds a callable event key.
     */
    AddCallableKey(time, callable, args) {
      const key = new _TriEventKey();
      key.time = time;
      key.callable = callable;
      key.callableArgs = args === undefined ? [] : args;
      this.InsertKey(key);
    }

    /**
     * Inserts an event key and refreshes key ordering.
     */
    InsertKey(key) {
      this.keys.push(_TriEventCurve.#ensureEventKey(key));
      this.Sort();
    }

    /**
     * Removes an event key by index.
     */
    RemoveKey(index) {
      if (index >= 0 && index < this.keys.length) {
        this.keys.splice(index, 1);
        this.Sort();
      }
    }

    /**
     * Gets the number of event keys.
     */
    GetKeyCount() {
      return this.keys.length;
    }

    /**
     * Gets a key time by index, or zero when out of range.
     */
    GetKeyTime(index) {
      return this.keys[index]?.time ?? 0;
    }

    /**
     * Gets a key string value by index, or an empty string when out of range.
     */
    GetKeyValue(index) {
      return this.keys[index]?.value ?? "";
    }

    /**
     * Sets a key time and refreshes key ordering.
     */
    SetKeyTime(index, time) {
      if (this.keys[index]) {
        this.keys[index].time = time;
        this.Sort();
      }
    }

    /**
     * Sets a key string value.
     */
    SetKeyValue(index, value) {
      if (this.keys[index]) {
        this.keys[index].value = value ?? "";
      }
    }

    /**
     * Gets a callable key by index.
     */
    GetCallableKeyValue(index) {
      return this.keys[index]?.callable ?? null;
    }

    /**
     * Gets callable arguments by index.
     */
    GetCallableKeyArgs(index) {
      return this.keys[index]?.callableArgs ?? null;
    }

    /**
     * Fires one event key.
     */
    FireKey(key) {
      this.value = key.value || "";
      if (typeof key.callable === "function") {
        const callable = key.callable;
        const args = _TriEventCurve.#normalizeCallableArgs(key.callableArgs);
        _TriEventCurve.queuePostUpdateCallback(() => callable(...args));
        return;
      }
      if (this.eventListener && this.value) {
        this.eventListener.HandleEvent(this.value);
      }
    }

    /**
     * Adopts a plain record as a TriEventKey so externally supplied keys carry the
     * full key shape.
     */

    /**
     * Normalizes callable-key arguments to an array, treating null or undefined as
     * no arguments and a bare value as a single argument.
     */
  }];
  #postUpdateCallbacks = [];
  #ensureEventKey(key) {
    return key instanceof _TriEventKey ? key : Object.assign(new _TriEventKey(), key);
  }
  #normalizeCallableArgs(args) {
    if (args === null || args === undefined) {
      return [];
    }
    return Array.isArray(args) ? args : [args];
  }
  TRIEXTRAPOLATION = TRIEXTRAPOLATION;
  constructor() {
    super(_TriEventCurve), _initClass();
  }
}();

export { _TriEventCurve as TriEventCurve };
//# sourceMappingURL=TriEventCurve.js.map
