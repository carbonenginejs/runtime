/**
 * Legacy incremental hydration adapters and canonical reader member operations.
 *
 * resolveHydrationAdapter preserves existing caller adapter phases, including
 * whole-graph finalization and the legacy values path. Canonical readers instead
 * apply stored declarations as bytes are decoded and complete each object during
 * recursion, using the helpers below without values transport or editor state.
 */

import { CjsSchema } from "./CjsSchema.js";
import { mappedInterfaces } from "../compose/interface.js";
import { normalizeCarbonTypeDescriptor, typedArrayConstructor } from "./types/carbonTypes.js";

/**
 * Resolves a normalized adapter from hydration options. The returned object
 * always exposes construct/applyValues/finalize with the documented defaults.
 *
 * @param {Object} [options]
 * @param {Object} [options.adapter] Per-hook overrides: construct/applyValues/finalize.
 * @returns {{ construct: Function, applyValues: Function, finalize: Function }}
 */
export function resolveHydrationAdapter(options = {})
{
    const custom = options.adapter || null;

    return {
        construct(kind, ctx)
        {
            if (custom && typeof custom.construct === "function") return custom.construct(kind, ctx);
            return undefined;
        },
        applyValues(instance, values, ctx)
        {
            if (custom && typeof custom.applyValues === "function") return custom.applyValues(instance, values, ctx);
            if (instance && typeof instance.SetValues === "function")
            {
                instance.SetValues(values, ctx?.options);
                return instance;
            }
            if (ctx?.declared === true)
            {
                CjsSchema.setValues(instance, values, ctx.options);
                return instance;
            }
            return Object.assign(instance, values);
        },
        finalize(instance, ctx)
        {
            if (custom && typeof custom.finalize === "function")
            {
                custom.finalize(instance, ctx);
                return;
            }
            if (instance && typeof instance.Initialize === "function") instance.Initialize();
        }
    };
}

/**
 * Reads the JavaScript storage selected by a native member declaration.
 *
 * Carbon addresses the member by offset (IRootReader.cpp, HandleAttribute).
 * JavaScript uses an explicit data key and optional array index instead. A
 * property accessor is never a substitute for that backing storage.
 *
 * @param {object} instance Destination instance.
 * @param {object} member Canonical stored-member declaration.
 * @returns {*} The current stored value.
 */
export function getReaderMemberValue(instance, member)
{
    return readerMemberStorage(instance, member).value;
}

/**
 * Applies one successfully decoded persisted member without editor state.
 *
 * IRootReaderBase::HandleAttribute writes storage, then sends NOTIFY even
 * for equal values. BlackReader::ReadMembers suppresses those notifications
 * whenever IInitialize is mapped, including when initialization is disabled.
 * Readers ignore the notification's boolean result. The exposed member name
 * replaces Carbon's Be::Var pointer in the JavaScript INotify contract.
 *
 * @param {object} instance Destination instance.
 * @param {object} member Canonical stored-member declaration.
 * @param {*} value Decoded value, with object references already resolved.
 * @returns {object} The destination instance.
 */
export function applyReaderMember(instance, member, value)
{
    if (member.role !== "member" || member.edit?.persist !== true || member.type?.runtimeOnly === true)
    {
        throw new TypeError(`Reader member ${member.name} is not stored PERSIST data.`);
    }

    const storage = readerMemberStorage(instance, member);
    const next = readerMemberValue(storage.value, value, member);
    if (!Object.is(next, storage.value)) storage.target[storage.key] = next;

    const interfaces = readerInterfaces(instance.constructor);
    if (!interfaces.initialize && interfaces.notify && member.edit.notify === true)
    {
        instance.OnModified(member.name);
    }
    return instance;
}

/**
 * Completes one object immediately after its members have been read.
 *
 * BlackReader::ReadIRootClass calls only mapped IInitialize here and ignores
 * its boolean result. The transport owns call ordering and reference identity;
 * this function neither walks the graph nor schedules a values settle pass.
 *
 * @param {object} instance Completed destination instance.
 * @param {object} [options] Reader initialization options.
 * @param {boolean} [options.initialize=true] Whether to initialize the object.
 * @returns {object} The completed instance.
 */
export function finalizeReaderObject(instance, { initialize = true } = {})
{
    if (initialize && readerInterfaces(instance.constructor).initialize)
    {
        instance.Initialize();
    }
    return instance;
}

/** Reads mapped interface identities without importing their implementations. */
function readerInterfaces(Constructor)
{
    let initialize = false;
    let notify = false;
    for (const Interface of mappedInterfaces(Constructor))
    {
        const name = CjsSchema.getClassName(Interface);
        if (!name) throw new TypeError("Reader interface mappings require a declared class identity.");
        if (name === "IInitialize") initialize = true;
        if (name === "INotify") notify = true;
    }
    return { initialize, notify };
}

/** Resolves actual backing storage; inspecting a descriptor never runs a getter. */
function readerMemberStorage(instance, member)
{
    if (member.role !== "member" || typeof member.key !== "string" || !member.key)
    {
        throw new TypeError("Reader storage requires a canonical member and JavaScript key.");
    }
    let target = instance;
    let key = member.key;
    let value = readerDataValue(target, key);
    if (member.index !== undefined)
    {
        if (!Number.isInteger(member.index) || member.index < 0)
        {
            throw new TypeError(`Reader member ${member.name} has an invalid storage index.`);
        }
        if (!Array.isArray(value) && !(ArrayBuffer.isView(value) && !(value instanceof DataView)))
        {
            throw new TypeError(`Reader member ${member.name} requires existing indexed storage.`);
        }
        if (member.index >= value.length)
        {
            throw new RangeError(`Reader member ${member.name} exceeds its indexed storage length.`);
        }
        target = value;
        key = member.index;
        value = readerDataValue(target, key);
    }
    return { target, key, value };
}

/** Finds data storage through the prototype chain without invoking accessors. */
function readerDataValue(target, key)
{
    let current = target;
    while (current !== null)
    {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor)
        {
            if (!Object.hasOwn(descriptor, "value"))
            {
                throw new TypeError(`Reader storage ${String(key)} is an accessor; declare its backing key.`);
            }
            return descriptor.value;
        }
        current = Object.getPrototypeOf(current);
    }
    return undefined;
}

/** Exact registered IList mapping, without importing Blue into schema initialization. */
export function isReaderIList(value)
{
    const Interface = CjsSchema.GetConstructor("IList");
    return value !== null && typeof value === "object" && Interface !== null
        && mappedInterfaces(value.constructor).has(Interface);
}

/** Keeps decoded graph identities while adapting scalar and container storage. */
function readerMemberValue(current, value, member)
{
    const type = member.type;
    if (!type || typeof type.kind !== "string" || type.kind === "unknown")
    {
        throw new TypeError(`Reader member ${member.name} requires a precise type declaration.`);
    }

    switch (type.kind)
    {
        case "model":
        case "objectRef":
        case "weakRef":
        case "rawStruct":
            return value;
        case "struct":
            if (current == null || value !== current)
            {
                throw new TypeError(`Embedded member ${member.name} must be decoded into its existing destination.`);
            }
            return current;
        case "list":
        case "array":
        {
            // Black has already populated this destination through native operations.
            // A mapped IList need not use Array storage (BlueList is only one implementation).
            if (type.kind === "list" && value === current && isReaderIList(current)) return current;
            if (!Array.isArray(value)) throw new TypeError(`Reader member ${member.name} requires an array.`);
            if (value === current) return current;
            const result = current == null ? [] : current;
            if (!Array.isArray(result)) throw new TypeError(`Reader member ${member.name} has incompatible array storage.`);
            result.length = 0;
            for (const item of value)
            {
                if (type.kind !== "list" || item != null) result.push(item);
            }
            return result;
        }
        case "set":
        {
            if (!(value instanceof Set) && !Array.isArray(value))
            {
                throw new TypeError(`Reader member ${member.name} requires a set or array.`);
            }
            if (value === current) return current;
            const result = current == null ? new Set() : current;
            if (!(result instanceof Set)) throw new TypeError(`Reader member ${member.name} has incompatible set storage.`);
            result.clear();
            for (const item of value) if (item != null) result.add(item);
            return result;
        }
        case "map":
        {
            const result = current == null ? new Map() : current;
            const mapTarget = result instanceof Map;
            if (!mapTarget && (typeof result !== "object" || Array.isArray(result)))
            {
                throw new TypeError(`Reader member ${member.name} has incompatible map storage.`);
            }
            const entries = value instanceof Map ? value.entries() : readerRecordEntries(value, member.name);
            for (const [key, item] of entries)
            {
                // BlackReader::ReadDict retains old entries and ignores nulls.
                if (item == null) continue;
                if (mapTarget) result.set(key, item);
                else
                {
                    readerDataValue(result, key);
                    Object.defineProperty(result, key, { value: item, writable: true, enumerable: true, configurable: true });
                }
            }
            return result;
        }
        default:
            return readerNumericStorage(current, value, type, member.name);
    }
}

/** Enumerates only a decoded dictionary's own data entries. */
function* readerRecordEntries(value, name)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`Reader member ${name} requires dictionary data.`);
    }
    for (const key of Object.keys(value))
    {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!Object.hasOwn(descriptor, "value"))
        {
            throw new TypeError(`Reader dictionary ${name} contains accessor ${key}.`);
        }
        yield [key, descriptor.value];
    }
}

/**
 * Copies already-decoded numeric data without editor coercion.
 *
 * BlackReader reads floating-point bytes directly, including NaN, infinities
 * and signed zero. Typed-array assignment supplies the declared scalar width;
 * editor normalization and numeric equality are not valid substitutes.
 */
function readerNumericStorage(current, value, type, name)
{
    const descriptor = normalizeCarbonTypeDescriptor(type);
    const fixed = Number.isInteger(descriptor.length);
    if (!fixed && descriptor.kind !== "typedArray") return value;
    if (!Array.isArray(value) && !(ArrayBuffer.isView(value) && !(value instanceof DataView)))
    {
        throw new TypeError(`Reader member ${name} requires numeric array data.`);
    }
    if (fixed && value.length !== descriptor.length)
    {
        throw new RangeError(`Reader member ${name} has the wrong numeric array length.`);
    }

    if (fixed && Array.isArray(current))
    {
        if (current.length !== value.length) throw new RangeError(`Reader member ${name} has incompatible numeric storage.`);
        for (let i = 0; i < value.length; i++) current[i] = value[i];
        return current;
    }

    const scalarArrays = {
        int8: "Int8Array", uint8: "Uint8Array", int16: "Int16Array", uint16: "Uint16Array",
        int32: "Int32Array", uint32: "Uint32Array", float32: "Float32Array", float64: "Float64Array"
    };
    const Constructor = typedArrayConstructor(descriptor.kind === "typedArray"
        ? descriptor.arrayType
        : scalarArrays[descriptor.scalar]);
    if (!Constructor) throw new TypeError(`Reader member ${name} requires a declared numeric storage type.`);
    const compatible = ArrayBuffer.isView(current) && Constructor.prototype.isPrototypeOf(current);
    if (fixed && current != null && (!compatible || current.length !== value.length))
    {
        throw new TypeError(`Reader member ${name} has incompatible numeric storage.`);
    }
    const result = compatible && current.length === value.length
        ? current
        : new Constructor(value.length);
    result.set(value);
    return result;
}
