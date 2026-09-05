// The notify surface as COMPOSITION - the @compose.notify decorator and the
// method map behind it (design record: docs/research/
// cjsmodel-value-audit-2026-09-05.md, direction items 9 and 11).
//
// Carbon's word for the concept is notify (INotify / Be::NOTIFY /
// IListNotify); this surface deliberately widens Carbon's single slot to a
// subscriber list, which is a registered non-Carbon extension (origin:
// ccpwgl Tw2EventEmitter). NO BRAND AND NO hasInstance, ruled: "we control
// the contract - if an OnEvent method didn't exist, it would throw", and
// discrimination exists only where Carbon itself casts.
//
// State is lazy on first listener and DELETED when the last listener leaves
// (the emitter costs nothing while unobserved - the operator's GC concern is
// the design constraint here). The state slot is the shared __state expando
// (./runtimeState.js) - both live in global/compose, the home of what
// @compose.* installs and the state those installations share.
//
// CjsEventEmitter remains as the inheritance packaging over this same map -
// one implementation, two deliveries.

import { ensureRuntimeState, getRuntimeState } from "./runtimeState.js";

const ANY_SOURCE = Symbol("CjsNotify.AnySource");

/**
 * Adds event listeners from a plain object. A key ending in ".once"
 * registers a once-only listener; values may be a function or
 * [function, source].
 *
 * @param {object|null} events
 * @returns {object} This emitter.
 */
function AddEvents(events = null)
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
 * @returns {object} This emitter.
 */
function OnEvent(eventName, listener, source = null, once = false)
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
 * @returns {object} This emitter.
 */
function OnceEvent(eventName, listener, source = null)
{
    return this.OnEvent(eventName, listener, source, true);
}

/**
 * Removes matching listeners from this emitter. `eventName="*"` means all
 * event buckets - cleanup matching only, not wildcard dispatch.
 *
 * @param {string} eventName
 * @param {?Function} listener
 * @param {*} source Optional callback source to match.
 * @returns {object} This emitter.
 */
function OffEvent(eventName = "*", listener = null, source = ANY_SOURCE)
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
 * @returns {object} This emitter.
 */
function EmitEvent(eventName, ...args)
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
        for (const record of [ ...records ])
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
function HasEvent(eventName = "*", listener = null, source = ANY_SOURCE)
{
    return FindEventRecords(this, eventName, listener, source).length > 0;
}

/**
 * Clears an event bucket or all event buckets from this emitter.
 *
 * @param {string} eventName
 * @returns {object} This emitter.
 */
function ClearEvent(eventName = "*")
{
    return this.OffEvent(eventName);
}

/**
 * Gets the lowercased exact event names with active listener buckets.
 *
 * @returns {Array<string>}
 */
function GetEventNames()
{
    const events = GetEventMap(this);
    return events ? [ ...events.keys() ] : [];
}

/**
 * Gets the number of active listener records for an event or all events.
 *
 * @param {string} eventName
 * @returns {number}
 */
function GetEventListenerCount(eventName = "*")
{
    return FindEventRecords(this, eventName).length;
}

/** The notify surface, one implementation for both deliveries. */
export const NOTIFY_METHODS = Object.freeze({
    AddEvents,
    OnEvent,
    OnceEvent,
    OffEvent,
    EmitEvent,
    HasEvent,
    ClearEvent,
    GetEventNames,
    GetEventListenerCount
});

/**
 * Installs the notify surface onto a class's prototype, install-if-absent:
 * a method the class (or its chain) already answers keeps its own.
 *
 * @param {Function} Constructor
 * @returns {Function} The same constructor.
 */
export function installNotify(Constructor)
{
    for (const [ name, method ] of Object.entries(NOTIFY_METHODS))
    {
        if (name in Constructor.prototype) continue;

        Object.defineProperty(Constructor.prototype, name, {
            value: method,
            writable: true,
            configurable: true
        });
    }
    return Constructor;
}

/**
 * The @compose.notify class decorator.
 *
 * @param {Function} value The decorated class.
 * @param {object} [context] Stage-3 decorator context.
 * @returns {void}
 */
export function composeNotifyDecorator(value, context)
{
    if (context && typeof context === "object" && context.kind !== "class")
    {
        throw new TypeError("compose.notify only supports classes.");
    }
    if (typeof value !== "function")
    {
        throw new TypeError("compose.notify requires a class constructor.");
    }
    installNotify(value);
}

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

function NormalizeEventName(eventName)
{
    const name = String(eventName || "").trim().toLowerCase();
    if (!name) throw new TypeError("CjsEventEmitter requires an event name.");
    return name;
}

function FindEventRecords(emitter, eventName = "*", listener = null, source = ANY_SOURCE)
{
    const events = GetEventMap(emitter);
    if (!events) return [];

    const names = eventName === "*" ? [ ...events.keys() ] : [ NormalizeEventName(eventName) ];
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
        [ listener, source = null ] = value;
    }

    if (typeof listener !== "function")
    {
        throw new TypeError("CjsEventEmitter.AddEvents requires listener functions.");
    }

    return { eventName, listener, source, once };
}

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
