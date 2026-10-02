// Source: trinity/trinity/Curves/TriEventCurve.h
// Source: trinity/trinity/Curves/TriEventCurve.cpp
import { ITriFunction, IInitialize, ITriCurveLength, BlueList } from "#blue";
import { CjsSchema, carbon, impl, edit, type } from "#schema";
import { TRIEXTRAPOLATION } from "#consts/graphics";
import { TriEventKey } from "../key/TriEventKey.js";
import "#blue/registerTrinityEnums";


/**
 * Time-keyed event track that fires each key once as the playhead passes it,
 * dispatching either a named event to a listener or a queued callable, and
 * restarting the key cursor when time rewinds or a cycle wraps.
 */
@type.define({
  className: "TriEventCurve",
  family: "curves"
})
@carbon.inherit(IInitialize, ITriCurveLength)
export class TriEventCurve extends ITriFunction
{
  static _postUpdateCallbacks = [];

  /**
   * Queues work in the retained class-local JavaScript post-update queue.
   * @param {Function} callback Work to run.
   * @returns {void}
   */
  @impl.custom
  static queuePostUpdateCallback(callback)
  {
    this._postUpdateCallbacks.push(callback);
  }

  /**
   * Runs one class-local callback in JavaScript.
   * @returns {boolean} Whether one ran.
   */
  @impl.custom
  static runNextPostUpdateCallback()
  {
    const callback = this._postUpdateCallbacks.shift();
    if (!callback)
    {
      return false;
    }
    callback();
    return true;
  }

  /**
   * Flushes class-local callbacks up to a JavaScript limit.
   * @param {number} limit Maximum callbacks.
   * @returns {number} Callbacks run.
   */
  @impl.custom
  static flushPostUpdateCallbacks(limit = Number.POSITIVE_INFINITY)
  {
    let count = 0;
    while (count < limit && this.runNextPostUpdateCallback())
    {
      count++;
    }
    return count;
  }

  /**
   * Returns the class-local callback count.
   * @returns {number}
   */
  @impl.custom
  static getPostUpdateCallbackCount()
  {
    return this._postUpdateCallbacks.length;
  }

  /**
   * Clears the class-local JavaScript callback queue.
   * @returns {void}
   */
  @impl.custom
  static clearPostUpdateCallbacks()
  {
    this._postUpdateCallbacks.length = 0;
  }

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.read
  @type.float64
  time = 0;

  @edit.read
  @type.float32
  length = 0;

  @edit.read
  @type.float32
  localTime = 0;

  @edit.readwrite
  @edit.persist
  @type.wstring
  value = "";

  @edit.persistOnly
  @type.list("TriEventKey")
  keys = new BlueList(TriEventKey, { className: "TriEventKey", listOps: 0 });

  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("blue.TRIEXTRAPOLATION")
  extrapolation = TRIEXTRAPOLATION.TRIEXT_NONE;

  @edit.readwrite
  @type.objectRef("IBlueEventListener")
  eventListener = null;

  _currentKeyIndex = 0;

  /**
   * Advances event time, preserving the existing JavaScript callback-queue adaptation.
   * JavaScript retains numeric seconds, cursor indices and the class-local post-update queue; native uses device callbacks and key lifetimes.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  UpdateValue(time)
  {
    if (this.length === 0)
    {
      return;
    }
    const before = this.time;
    this.time = time;
    if (this.time < before)
    {
      this._currentKeyIndex = 0;
      return;
    }
    if (this.extrapolation === TRIEXTRAPOLATION.TRIEXT_CYCLE)
    {
      const localNow = this.time % this.length;
      if (localNow < this.localTime)
      {
        this._currentKeyIndex = 0;
      }
      this.localTime = localNow;
    }
    else
    {
      this.localTime = this.time;
    }
    while (this._currentKeyIndex < this.keys.length && this.localTime >= this.keys[this._currentKeyIndex].time)
    {
      this.FireKey(this.keys[this._currentKeyIndex]);
      this._currentKeyIndex++;
    }
  }

  /**
   * Sorts hydrated keys using the retained JavaScript helper.
   * The helper resets an empty track length to zero, unlike the native empty-list branch.
   * @returns {boolean} True.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.Sort();
    return true;
  }

  /**
   * Returns the cached track length.
   * @returns {number} Duration in seconds.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return this.length;
  }

  /**
   * Sorts constructor-owned keys in place and resets the cursor.
   * Native declares Sort without a donor body; this retained JavaScript helper also resets empty length to zero.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  Sort()
  {
    this.keys.Sort((_context, a, b) => a.time < b.time, null);
    this._currentKeyIndex = 0;
    this.length = this.keys.length ? this.keys[this.keys.length - 1].time : 0;
  }

  /**
   * Creates and inserts a named event key.
   * @param {number} time Key time in seconds.
   * @param {string} eventName Event name.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  AddKey(time, eventName)
  {
    const key = new TriEventKey();
    key.time = time;
    key.value = eventName;
    this.InsertKey(key);
  }

  /**
   * Creates and inserts a callable event key.
   * JavaScript functions and argument arrays replace Python objects; omitted arguments remain an empty array.
   * @param {number} time Key time in seconds.
   * @param {Function} callable Function to queue.
   * @param {*} args Callable arguments.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  AddCallableKey(time, callable, args)
  {
    const key = new TriEventKey();
    key.time = time;
    key.callable = callable;
    key.callableArgs = args === undefined ? [] : args;
    this.InsertKey(key);
  }

  /**
   * Inserts a key into the owned typed list and refreshes ordering.
   * JavaScript retains plain-record adoption before native list insertion.
   * @param {TriEventKey|object} key Key or compatible record.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  InsertKey(key)
  {
    this.keys.Insert(-1, TriEventCurve._ensureEventKey(key));
    this.Sort();
  }

  /**
   * Removes an in-range key and refreshes ordering.
   * JavaScript retains range checks and empty-length reset through Sort.
   * @param {number} index Key index.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RemoveKey(index)
  {
    if (index >= 0 && index < this.keys.length)
    {
      this.keys.Remove(index);
      this.Sort();
    }
  }

  /**
   * Returns the number of event keys.
   * @returns {number}
   */
  @carbon.method
  @impl.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /**
   * Returns a key time or zero outside the list.
   * @param {number} index Key index.
   * @returns {number}
   */
  @carbon.method
  @impl.implemented
  GetKeyTime(index)
  {
    return this.keys[index]?.time ?? 0;
  }

  /**
   * Returns a key string or an empty string outside the list.
   * @param {number} index Key index.
   * @returns {string}
   */
  @carbon.method
  @impl.implemented
  GetKeyValue(index)
  {
    return this.keys[index]?.value ?? "";
  }

  /**
   * Sets an in-range key time and reorders the list.
   * JavaScript retains Sort cursor reset; the native setter does not reset its iterator.
   * @param {number} index Key index.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  SetKeyTime(index, time)
  {
    if (this.keys[index])
    {
      this.keys[index].time = time;
      this.Sort();
    }
  }

  /**
   * Sets an in-range key event string.
   * JavaScript retains nullish-value coercion to an empty string.
   * @param {number} index Key index.
   * @param {string|null} value Event name.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  SetKeyValue(index, value)
  {
    if (this.keys[index])
    {
      this.keys[index].value = value ?? "";
    }
  }

  /**
   * Returns a JavaScript callable instead of a Python object.
   * @param {number} index Key index.
   * @returns {Function|null}
   */
  @carbon.method
  @impl.adapted
  GetCallableKeyValue(index)
  {
    return this.keys[index]?.callable ?? null;
  }

  /**
   * Returns JavaScript arguments instead of a Python tuple.
   * @param {number} index Key index.
   * @returns {*}
   */
  @carbon.method
  @impl.adapted
  GetCallableKeyArgs(index)
  {
    return this.keys[index]?.callableArgs ?? null;
  }

  /**
   * Dispatches the named event or queues a JavaScript callable.
   * Extracted helper retains capture-at-queue-time and existing invalid-callable handling; native device-queue/key-lifetime behavior is not reworked.
   * @param {TriEventKey} key Event key.
   * @returns {void}
   */
  @impl.custom
  FireKey(key)
  {
    this.value = key.value || "";
    if (typeof key.callable === "function")
    {
      const callable = key.callable;
      const args = TriEventCurve._normalizeCallableArgs(key.callableArgs);
      TriEventCurve.queuePostUpdateCallback(() => callable(...args));
      return;
    }
    if (this.eventListener && this.value)
    {
      this.eventListener.HandleEvent(this.value);
    }
  }

  /**
   * Adopts a plain JavaScript record as a registered event key.
   * @param {TriEventKey|object} key Input record.
   * @returns {TriEventKey}
   */
  @impl.custom
  static _ensureEventKey(key)
  {
    return CjsSchema.cast(key, TriEventKey) ? key : Object.assign(new TriEventKey(), key);
  }

  /**
   * Normalizes JavaScript callable arguments without Python tuple ownership.
   * @param {*} args Input arguments.
   * @returns {Array}
   */
  @impl.custom
  static _normalizeCallableArgs(args)
  {
    if (args === null || args === undefined)
    {
      return [];
    }
    return Array.isArray(args) ? args : [args];
  }

  static TRIEXTRAPOLATION = TRIEXTRAPOLATION;

}

// Exact native exposure table, with no inherited exposure chain.
carbon.interfaceTable({ interfaces: [TriEventCurve, ITriFunction, IInitialize, ITriCurveLength], chainTo: null })(TriEventCurve);
