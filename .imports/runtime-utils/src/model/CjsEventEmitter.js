import { ensureRuntimeState, getRuntimeState } from "../runtime/CjsRuntimeState.js";

const ANY_SOURCE = Symbol("CjsEventEmitter.AnySource");

/**
 * Minimal event emitter with lowercase exact-name dispatch.
 *
 * Event storage is allocated lazily and remains owned by the emitter.
 */
export class CjsEventEmitter
{
    /**
     * Adds event listeners from a plain object.
     *
     * A key ending in ".once" registers a once-only listener. Values may be a
     * function or [function, source].
     *
     * @param {object|null} events
     * @returns {CjsEventEmitter}
     */
    AddEvents(events = null)
    {
        if (!events || typeof events !== "object") return this;

        for (const key of Object.keys(events))
        {
            const entry = NormalizeEventEntry(key, events[key]);
            this.OnEvent(entry.eventName, entry.listener, entry.source, entry.once);
        }

        return this;
    }

    /**
     * Adds a listener for a lowercased exact event name.
     *
     * @param {string} eventName
     * @param {Function} listener
     * @param {*} source Optional callback source and `this` value.
     * @param {boolean} once
     * @returns {CjsEventEmitter}
     */
    OnEvent(eventName, listener, source = null, once = false)
    {
        CreateEventRecord(this, eventName, listener, source, once);
        return this;
    }

    /**
     * Adds a listener that is removed before its first callback is invoked.
     *
     * @param {string} eventName
     * @param {Function} listener
     * @param {*} source Optional callback source and `this` value.
     * @returns {CjsEventEmitter}
     */
    OnceEvent(eventName, listener, source = null)
    {
        return this.OnEvent(eventName, listener, source, true);
    }

    /**
     * Removes matching listeners from this emitter.
     *
     * `eventName="*"` means all event buckets. It is cleanup matching only, not
     * wildcard dispatch.
     *
     * @param {string} eventName
     * @param {?Function} listener
     * @param {*} source Optional callback source to match.
     * @returns {CjsEventEmitter}
     */
    OffEvent(eventName = "*", listener = null, source = ANY_SOURCE)
    {
        for (const record of FindEventRecords(this, eventName, listener, source))
        {
            RemoveEventRecord(record);
        }

        return this;
    }

    /**
     * Emits a lowercased exact event name to all currently registered records.
     *
     * @param {string} eventName
     * @param {...*} args
     * @returns {CjsEventEmitter}
     */
    EmitEvent(eventName, ...args)
    {
        if ((getRuntimeState(this)?.suppressEvents ?? 0) > 0) return this;
        const events = GetEventMap(this);
        if (!events) return this;

        const name = NormalizeEventName(eventName);
        const records = events.get(name);
        if (!records) return this;

        let error = null;

        try
        {
            for (const record of [...records])
            {
                if (!records.has(record)) continue;
                if (record.once) RemoveEventRecord(record);
                record.listener.call(record.source, ...args);
            }
        }
        catch (err)
        {
            error = err;
        }

        if (error) throw error;
        return this;
    }

    /**
     * Checks whether this emitter has a matching listener record.
     *
     * @param {string} eventName
     * @param {?Function} listener
     * @param {*} source Optional callback source to match.
     * @returns {boolean}
     */
    HasEvent(eventName = "*", listener = null, source = ANY_SOURCE)
    {
        return FindEventRecords(this, eventName, listener, source).length > 0;
    }

    /**
     * Clears an event bucket or all event buckets from this emitter.
     *
     * @param {string} eventName
     * @returns {CjsEventEmitter}
     */
    ClearEvent(eventName = "*")
    {
        return this.OffEvent(eventName);
    }

    /**
     * Gets the lowercased exact event names with active listener buckets.
     *
     * @returns {Array<string>}
     */
    GetEventNames()
    {
        const events = GetEventMap(this);
        return events ? [...events.keys()] : [];
    }

    /**
     * Gets the number of active listener records for an event or all events.
     *
     * @param {string} eventName
     * @returns {number}
     */
    GetEventListenerCount(eventName = "*")
    {
        return FindEventRecords(this, eventName).length;
    }

}

/**
 * Creates and indexes a listener record.
 *
 * @param {CjsEventEmitter} emitter
 * @param {string} eventName
 * @param {Function} listener
 * @param {*} source
 * @param {boolean} once
 * @returns {object}
 * @private
 */
function CreateEventRecord(emitter, eventName, listener, source, once)
{
    const name = NormalizeEventName(eventName);
    if (typeof listener !== "function")
    {
        throw new TypeError("CjsEventEmitter.OnEvent requires a listener function.");
    }

    const record = {
        emitter,
        eventName: name,
        listener,
        source,
        once: !!once
    };

    const events = GetEventMap(emitter, true);

    let records = events.get(name);
    if (!records)
    {
        records = new Set();
        events.set(name, records);
    }

    records.add(record);

    return record;
}

/**
 * Removes a listener record from its emitter index.
 *
 * @param {object} record
 * @returns {void}
 * @private
 */
function RemoveEventRecord(record)
{
    const events = GetEventMap(record.emitter);
    const records = events?.get(record.eventName);

    if (records)
    {
        records.delete(record);
        if (!records.size) events.delete(record.eventName);
        if (!events.size) delete getRuntimeState(record.emitter).events;
    }
}

/**
 * Normalizes exact event names to lowercase.
 *
 * @param {*} eventName
 * @returns {string}
 * @private
 */
function NormalizeEventName(eventName)
{
    const name = String(eventName || "").trim().toLowerCase();
    if (!name) throw new TypeError("CjsEventEmitter requires an event name.");
    return name;
}

/**
 * Finds listener records indexed on an emitter.
 *
 * @param {CjsEventEmitter} emitter
 * @param {string} eventName
 * @param {?Function} listener
 * @param {*} source
 * @returns {Array<object>}
 */
function FindEventRecords(emitter, eventName = "*", listener = null, source = ANY_SOURCE)
{
    const events = GetEventMap(emitter);
    if (!events) return [];

    const names = eventName === "*" ? [...events.keys()] : [NormalizeEventName(eventName)];
    const result = [];

    for (const name of names)
    {
        const records = events.get(name);
        if (!records) continue;

        for (const record of records)
        {
            if (listener && record.listener !== listener) continue;
            if (source !== ANY_SOURCE && record.source !== source) continue;
            result.push(record);
        }
    }

    return result;
}

/**
 * Normalizes an AddEvents() object entry.
 *
 * @param {string} key
 * @param {*} value
 * @returns {{eventName: string, listener: Function, source: *, once: boolean}}
 */
function NormalizeEventEntry(key, value)
{
    let eventName = String(key);
    let once = false;
    let listener = value;
    let source = null;

    if (eventName.endsWith(".once"))
    {
        eventName = eventName.slice(0, -5);
        once = true;
    }

    if (Array.isArray(value))
    {
        [listener, source = null] = value;
    }

    if (typeof listener !== "function")
    {
        throw new TypeError("CjsEventEmitter.AddEvents requires listener functions.");
    }

    return { eventName, listener, source, once };
}

/**
 * Gets or lazily creates an emitter's event map.
 *
 * @param {CjsEventEmitter} emitter
 * @param {boolean} create
 * @returns {Map<string, Set<object>>|null}
 * @private
 */
function GetEventMap(emitter, create = false)
{
    const state = create ? ensureRuntimeState(emitter) : getRuntimeState(emitter);
    if (!state) return null;

    if (state.events === undefined)
    {
        if (!create) return null;
        state.events = new Map();
    }
    else if (!(state.events instanceof Map))
    {
        throw new TypeError("CjsEventEmitter requires __state.events to be a Map.");
    }

    return state.events;
}
