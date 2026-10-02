// Optional values methods and batched editing state for explicitly composed classes.
// Schema services use the same write/notification operations without an instance base.
// State is created lazily on the first edit or event subscription.
import { NOTIFY_METHODS } from "./notify.js";
import { ensureRuntimeState, getRuntimeState } from "./runtimeState.js";


/**
 * Whether a declared field accepts an incoming value.
 *
 * The JS values import accepts WRITE, PERSIST and RPERSIST independently.
 * RPERSIST follows BlueTypes' load-only contract, including where the donor's
 * DictReader currently checks only PERSIST. This is a serialization service,
 * not BluePyWrap property access; unflagged declared fields retain JS support.
 *
 * @param {object} field
 * @returns {Boolean}
 */
export function isWritableField(field)
{
    if (field?.type?.runtimeOnly === true) return false;
    const edit = field?.edit;
    if (!edit) return true;
    if (edit.write || edit.persist || edit.rpersist || edit.persistOnly) return true;
    if (edit.read && !edit.write) return false;
    return true;
}


/**
 * Selects persisted output by PERSIST, not RPERSIST.
 * The unrestricted JS values view retains all declared fields.
 * @param {object} field Declared field metadata.
 * @param {object} options Values export options.
 * @returns {boolean} Whether this field belongs in the exported values.
 */
export function isExportableField(field, options = {})
{
    if (field?.type?.runtimeOnly === true) return false;
    // A round trip (clone) exports exactly what the import reads back: a
    // READ-only member is otherwise written, skipped on the way in, and any
    // anchor inside it leaves later `{ _ref }`s dangling.
    if (options.roundTrip && !isWritableField(field)) return false;
    const edit = field?.edit;
    const persist = edit?.persist || edit?.persistOnly;
    return !options.persistOnly || !!persist;
}

/**
 * Builds the state-free transport over a set of schema services.
 *
 * @param {object} services
 * @param {Function} services.GetFields Effective field records for a class.
 * @param {Function} services.Export Exports one declared value.
 * @param {Function} services.Import Coerces one incoming value.
 * @param {Function} services.CoerceInto In-place coercion; null when it does
 *     not apply, so the caller falls back to an allocating import.
 * @param {Function} services.IsEquivalent Compares two declared values.
 * @returns {{getValues: Function, setValues: Function}}
 */
export function createValuesTransport(services)
{
    const { GetFields, Export, Import, CoerceInto, IsEquivalent } = services;

    /**
     * Exports a decorated class's declared fields into a plain bag.
     *
     * @param {object} target
     * @param {object} [out] A bag the caller owns, for composing several
     *     exports into one object - the reason the static carries `out` while
     *     the instance method does not.
     * @param {object} [options]
     * @returns {object}
     */
    function getValues(target, out = {}, options = {})
    {
        for (const field of GetFields(target.constructor))
        {
            if (!isExportableField(field, options)) continue;
            out[field.name] = Export(target[field.name], field, options);
        }
        return out;
    }

    /**
     * Applies a plain bag to a decorated class's declared fields.
     *
     * @param {object} target
     * @param {object} [values]
     * @param {object} [options]
     * @returns {Set<String>|Boolean} The changed field names, or a boolean when
     *     `options.returnBoolean` is set - the shape Carbon's Change and Set
     *     methods return.
     */
    function setValues(target, values = {}, options = {})
    {
        return applyValues(target, options, recordWrite =>
        {
            for (const field of GetFields(target.constructor))
            {
                if (!isWritableField(field)) continue;
                if (!Object.hasOwn(values, field.name)) continue;

                const incoming = values[field.name];
                const current = target[field.name];

                // In place first, so a typed array keeps its identity and anything
                // holding a reference to it keeps seeing live values.
                const coerced = CoerceInto(current, incoming, field);
                if (coerced !== null)
                {
                    recordWrite(field, coerced);
                    continue;
                }

                const next = Import(incoming, field, options);
                const didChange = !IsEquivalent(current, next);
                target[field.name] = next;
                recordWrite(field, didChange);
            }
        });
    }

    return { getValues, setValues, updateValues };
}


/**
 * The `@compose.values` class decorator.
 *
 * Installs `GetValues(options)` and `SetValues(values, options)` install-if-
 * absent, so a class that hand-rolls either keeps its own. The instance shapes
 * match the model's exactly: `GetValues` takes options only, because a fresh
 * bag is the only sensible target for `this`, while the static keeps `out`.
 *
 * @param {object} transport The transport from createValuesTransport.
 * @returns {Function} A stage-3 class decorator.
 */
export function composeValuesDecorator(transport)
{
    const METHODS = {
        GetValues(options = {}) { return transport.getValues(this, {}, options); },
        SetValues(values = {}, options = {}) { return transport.setValues(this, values, options); },
        UpdateValues(options = {}) { return transport.updateValues(this, options, options.changedFields ?? null); },

        /**
         * Carbon's INotify hook. The default accepts, exactly as the model
         * base's does; a class overrides it to react to its own changes.
         */
        OnModified() { return true; },

        IsDirty() { return getRuntimeState(this)?.dirty === true; },
        MarkDirty()
        {
            const state = ensureRuntimeState(this);
            state.dirty = true;
            return this;
        },
        ClearDirty() { const state = getRuntimeState(this); if (state) state.dirty = false; return this; }
    };

    return function (value, context)
    {
        if (context && typeof context === "object" && context.kind !== "class")
        {
            throw new TypeError("compose.values only supports classes.");
        }
        if (typeof value !== "function")
        {
            throw new TypeError("compose.values requires a class constructor.");
        }

        for (const [ name, method ] of Object.entries(METHODS))
        {
            if (name in value.prototype) continue;
            Object.defineProperty(value.prototype, name, {
                value: method,
                writable: true,
                configurable: true
            });
        }
    };
}

/** Applies writes and reports each changed NOTIFY member once per call. */
export function applyValues(target, options, populate)
{
    const changed = new Set();
    const notified = new Set();
    populate(recordWrite);

    if (changed.size && options.markDirty !== false && options.skipUpdate !== true)
    {
        dispatchModified(target, [...notified], options, changed);
    }

    function recordWrite(field, didChange)
    {
        if (!didChange) return;
        changed.add(field.name);
        if (options.markDirty !== false)
        {
            ensureRuntimeState(target).dirty = true;
            if (options.notify !== false && field.edit?.notify) notified.add(field.name);
        }
    }

    return options.returnBoolean === true ? changed.size > 0 : changed;
}

/**
 * Reports explicit changes made outside SetValues. Names are canonical member
 * names; the caller chooses them independently of the member NOTIFY flag.
 *
 * @param {object} target Changed object.
 * @param {string|string[]} names Changed member or members; duplicates collapse.
 * @param {object} [options] Event source and notification suppression options.
 * @returns {boolean} False when OnModified refuses the change.
 */
export function NotifyModified(target, names, options = {})
{
    if (typeof names !== "string" && !Array.isArray(names))
    {
        throw new TypeError("NotifyModified requires a member name or array of names.");
    }
    const changed = new Set(typeof names === "string" ? [names] : names);
    for (const name of changed)
    {
        if (typeof name !== "string") throw new TypeError("Modified member names must be strings.");
    }
    if (!changed.size || options.markDirty === false) return true;
    ensureRuntimeState(target).dirty = true;
    if (options.skipUpdate === true) return true;
    return dispatchModified(target, options.notify === false ? [] : [...changed], options, changed);
}

/** Preserves the composed UpdateValues options form without retaining a queue. */
function updateValues(target, options = {}, changedFields = null)
{
    const names = options.property ?? options.properties ?? changedFields;
    if (names != null)
    {
        return NotifyModified(target, typeof names === "string" ? names : [...names], options);
    }
    if (options.markDirty === false) return true;
    ensureRuntimeState(target).dirty = true;
    if (options.skipUpdate === true) return true;
    return dispatchModified(target, options.notify === false ? [] : null, options, null);
}

/** Calls the hook once, then emits this operation's event after acceptance. */
function dispatchModified(target, names, options, changedFields)
{
    const state = ensureRuntimeState(target);
    // Clear before the hook: nested skipped or failed edits must stay dirty.
    state.dirty = false;
    const hook = target.OnModified;
    try
    {
        if (typeof hook === "function" && (names === null || names.length))
        {
            const argument = names === null ? null : names.length === 1 ? names[0] : names.slice();
            if (hook.call(target, argument) === false)
            {
                state.dirty = true;
                return false;
            }
        }
    }
    catch (error)
    {
        state.dirty = true;
        throw error;
    }
    if (options.skipEvents !== true && !state.suppressEvents && state.HasListener())
    {
        NOTIFY_METHODS.EmitEvent.call(target, "modified", target, { source: options.source ?? target, changedFields });
    }
    return true;
}
