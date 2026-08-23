// Source: E:\carbonengine\trinity\trinity\Curves\TriEventCurve.h
// Source: E:\carbonengine\trinity\trinity\Curves\TriEventCurve.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriExtrapolation } from "@carbonenginejs/runtime-utils/graphics";
import { TriEventKey } from "../key/TriEventKey.js";


/**
 * Time-keyed event track that fires each key once as the playhead passes it,
 * dispatching either a named event to a listener or a queued callable, and
 * restarting the key cursor when time rewinds or a cycle wraps.
 */
@type.define({
  className: "TriEventCurve",
  family: "curves"
})
export class TriEventCurve extends CjsModel
{
  static #postUpdateCallbacks = [];

  /** Queues work for the runtime's post-update phase. */
  static queuePostUpdateCallback(callback)
  {
    this.#postUpdateCallbacks.push(callback);
  }

  /** Runs one queued post-update callback. */
  static runNextPostUpdateCallback()
  {
    const callback = this.#postUpdateCallbacks.shift();
    if (!callback)
    {
      return false;
    }
    callback();
    return true;
  }

  /** Flushes queued post-update callbacks up to the supplied limit. */
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
   * Gets the number of callable-key invocations still queued for the post-update
   * phase.
   */
  static getPostUpdateCallbackCount()
  {
    return this.#postUpdateCallbacks.length;
  }

  /** Discards every queued post-update callback without running it. */
  static clearPostUpdateCallbacks()
  {
    this.#postUpdateCallbacks.length = 0;
  }

  @io.persist
  @type.int32
  @type.enum("TRIEXTRAPOLATION")
  extrapolation = TriExtrapolation.TRIEXT_NONE;

  @io.persist
  @type.string
  name = "";

  @io.readwrite
  @type.objectRef("IBlueEventListener")
  eventListener = null;

  @io.read
  @type.float64
  time = 0;

  @io.read
  @type.float32
  length = 0;

  @io.read
  @type.float32
  localTime = 0;

  @io.persist
  @type.string
  value = "";

  @io.persistOnly
  @type.list("TriEventKey")
  keys = [];

  #currentKeyIndex = 0;

  /**
   * Updates the curve time and fires newly-crossed event keys.
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
      this.#currentKeyIndex = 0;
      return;
    }
    if (this.extrapolation === TriExtrapolation.TRIEXT_CYCLE)
    {
      const localNow = this.time % this.length;
      if (localNow < this.localTime)
      {
        this.#currentKeyIndex = 0;
      }
      this.localTime = localNow;
    }
    else
    {
      this.localTime = this.time;
    }
    while (this.#currentKeyIndex < this.keys.length && this.localTime >= this.keys[this.#currentKeyIndex].time)
    {
      this.FireKey(this.keys[this.#currentKeyIndex]);
      this.#currentKeyIndex++;
    }
  }

  /**
   * Sorts keys after hydration.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.Sort();
    return true;
  }

  /**
   * Gets the curve length.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return this.length;
  }

  /**
   * Sorts keys stably by time and resets the event cursor.
   */
  @carbon.method
  @impl.implemented
  Sort()
  {
    this.keys = this.keys.map((key, index) => ({
      key: TriEventCurve.#ensureEventKey(key),
      index
    })).sort((a, b) => a.key.time - b.key.time || a.index - b.index).map(entry => entry.key);
    this.#currentKeyIndex = 0;
    this.length = this.keys.length ? this.keys[this.keys.length - 1].time : 0;
  }

  /**
   * Adds a string event key.
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
   * Adds a callable event key.
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
   * Inserts an event key and refreshes key ordering.
   */
  @carbon.method
  @impl.implemented
  InsertKey(key)
  {
    this.keys.push(TriEventCurve.#ensureEventKey(key));
    this.Sort();
  }

  /**
   * Removes an event key by index.
   */
  @carbon.method
  @impl.adapted
  RemoveKey(index)
  {
    if (index >= 0 && index < this.keys.length)
    {
      this.keys.splice(index, 1);
      this.Sort();
    }
  }

  /**
   * Gets the number of event keys.
   */
  @carbon.method
  @impl.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /**
   * Gets a key time by index, or zero when out of range.
   */
  @carbon.method
  @impl.implemented
  GetKeyTime(index)
  {
    return this.keys[index]?.time ?? 0;
  }

  /**
   * Gets a key string value by index, or an empty string when out of range.
   */
  @carbon.method
  @impl.implemented
  GetKeyValue(index)
  {
    return this.keys[index]?.value ?? "";
  }

  /**
   * Sets a key time and refreshes key ordering.
   */
  @carbon.method
  @impl.implemented
  SetKeyTime(index, time)
  {
    if (this.keys[index])
    {
      this.keys[index].time = time;
      this.Sort();
    }
  }

  /**
   * Sets a key string value.
   */
  @carbon.method
  @impl.implemented
  SetKeyValue(index, value)
  {
    if (this.keys[index])
    {
      this.keys[index].value = value ?? "";
    }
  }

  /**
   * Gets a callable key by index.
   */
  @carbon.method
  @impl.adapted
  GetCallableKeyValue(index)
  {
    return this.keys[index]?.callable ?? null;
  }

  /**
   * Gets callable arguments by index.
   */
  @carbon.method
  @impl.adapted
  GetCallableKeyArgs(index)
  {
    return this.keys[index]?.callableArgs ?? null;
  }

  /**
   * Fires one event key.
   */
  FireKey(key)
  {
    this.value = key.value || "";
    if (typeof key.callable === "function")
    {
      const callable = key.callable;
      const args = TriEventCurve.#normalizeCallableArgs(key.callableArgs);
      TriEventCurve.queuePostUpdateCallback(() => callable(...args));
      return;
    }
    if (this.eventListener && this.value)
    {
      this.eventListener.HandleEvent(this.value);
    }
  }

  /**
   * Adopts a plain record as a TriEventKey so externally supplied keys carry the
   * full key shape.
   */
  static #ensureEventKey(key)
  {
    return key instanceof TriEventKey ? key : Object.assign(new TriEventKey(), key);
  }

  /**
   * Normalizes callable-key arguments to an array, treating null or undefined as
   * no arguments and a bare value as a single argument.
   */
  static #normalizeCallableArgs(args)
  {
    if (args === null || args === undefined)
    {
      return [];
    }
    return Array.isArray(args) ? args : [args];
  }

  static TRIEXTRAPOLATION = TriExtrapolation;

}
