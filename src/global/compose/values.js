// The values transport as COMPOSITION - the @compose.values decorator.
//
// Carbon keeps transport in SERVICES over its per-class VarEntry table:
// BlackReader, the Copier and Python's getattr/setattr all drive Be::ClassInfo
// from OUTSIDE the object, and no Blue base carries a GetValues. Ours put the
// same work on a base class, which is what made `extends CjsModel` mandatory
// for 886 classes and occupied the one `extends` slot JS has.
//
// `CjsSchema.getValues`/`setValues` are already the declared home - they exist
// as statics forwarding to a registered service. The service's third arm, for
// a decorated class carrying NEITHER method, threw by name:
//
//     "CjsSchema.setValues on a plain decorated class awaits the facade
//      migration's state-free transport."
//
// This module is that transport, and the decorator that installs it as
// GetValues/SetValues on a class that wants the methods rather than the
// statics. Nothing here touches CjsModel, so a class taking @compose.values
// pays for none of the base.
//
// STATE IS LAZY, NOT ABSENT, and the distinction is the whole contract.
// `setValues` does coercion, then the changed set, then dirty, then the settle
// WITH the changed field names. The settle is one of the three benefits the
// CjsModel audit found real - 95 classes override OnModified, and
// TriValueBinding drives it per frame - so a transport that skipped it would
// silently stop running every one of those bodies for any class that moved off
// the base. The error message this module replaced said "state-free
// transport"; that phrasing was a previous session's and contradicts the
// decision page, which rules edit state LAZY: materialising on first write,
// zero footprint until then.
//
// The mechanism is `ensureRuntimeState`, which creates the non-enumerable
// `__state` slot only when it is not already there - the same slot
// @compose.notify puts its listener map in, and the same one CjsModel fills
// with a CjsModelState. An unedited object carries nothing.
//
// This module imports nothing from the SCHEMA layer, for the reason
// compose/notify.js and compose/interface.js import nothing: CjsSchema installs
// these onto its own namespace, so a schema import here is a cycle that fails
// at load. Everything schema-shaped arrives through `services`. compose/
// siblings are fine - they import nothing themselves.

import { ensureRuntimeState, getRuntimeState } from "./runtimeState.js";


/** Bound for the JS values transport's cooperative settle. */
const MAX_UPDATE_PASSES = 32;

/** Records a member before a deferred or reentrant values update returns. */
export function queueModifiedMember(target, propertyName)
{
    const state = ensureRuntimeState(target);
    (state.pendingModified ??= new Set()).add(propertyName);
}

/**
 * JS values batching over Carbon's single-member INotify hook. The queue is
 * transport state, not class invalidation state. Callers apply their own
 * NOTIFY gate before recording a member. A null member preserves the existing
 * explicit, unnamed UpdateValues contract pending its separate policy review.
 */
export function settleModifiedMembers(target)
{
    const state = ensureRuntimeState(target);
    if (state.updating) return true;
    state.updating = true;
    try
    {
        for (let pass = 0; ; pass++)
        {
            if (pass >= MAX_UPDATE_PASSES)
            {
                throw new Error(`${target.constructor.name} exceeded ${MAX_UPDATE_PASSES} settle passes.`);
            }
            const pending = state.pendingModified ?? new Set();
            state.pendingModified = new Set();
            state.dirty = false;
            const members = Array.from(pending);
            for (let index = 0; index < members.length; index++)
            {
                let accepted;
                try
                {
                    accepted = typeof target.OnModified !== "function"
                        || target.OnModified(members[index]) !== false;
                }
                catch (error)
                {
                    restore(index);
                    throw error;
                }
                if (!accepted)
                {
                    restore(index);
                    state.dirty = true;
                    return false;
                }
            }
            if (!state.pendingModified.size) break;

            function restore(index)
            {
                const remaining = new Set();
                for (; index < members.length; index++) remaining.add(members[index]);
                for (const member of state.pendingModified) remaining.add(member);
                state.pendingModified = remaining;
            }
        }
        state.dirty = false;
        return true;
    }
    catch (error)
    {
        state.dirty = true;
        throw error;
    }
    finally
    {
        state.updating = false;
    }
}

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
        const changed = new Set();
        let notifyRequested = false;

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

        // Settle actual changes or explicitly requested equal-write notifications.
        if ((changed.size || notifyRequested) && options.markDirty !== false)
        {
            if (options.skipUpdate !== true) updateValues(target, options, changed);
        }

        // Preserve each successful mutation if a later import or setter throws.
        function recordWrite(field, didChange)
        {
            if (didChange) changed.add(field.name);
            if (options.markDirty !== false)
            {
                if (didChange) ensureRuntimeState(target).dirty = true;
                // BluePyWrap writes first, then tests NOTIFY without equality.
                if (options.notify !== false && field.edit?.notify)
                {
                    queueModifiedMember(target, field.name);
                    ensureRuntimeState(target).dirty = true;
                    notifyRequested = true;
                }
            }
        }

        return options.returnBoolean === true ? changed.size > 0 : changed;
    }

    /**
     * Settles queued single-member notifications and emits once after success.
     *
     * @param {object} target
     * @param {object} options
     * @param {Set<String>} changedFields
     * @returns {Boolean} False when a hook refused, leaving the target dirty.
     */
    function updateValues(target, options, changedFields)
    {
        const state = ensureRuntimeState(target);
        const properties = options.property ?? options.properties;
        if (properties != null)
        {
            for (const name of typeof properties === "string" ? [properties] : properties)
            {
                queueModifiedMember(target, name);
            }
        }
        else if (changedFields == null && (state.updating || !state.pendingModified?.size))
        {
            queueModifiedMember(target, null);
        }
        if (state.updating) return true;

        // INotify is OPTIONAL, in Carbon as here: an object that does not
        // implement the hook is simply never notified. The statics serve any
        // decorated class, including ones that never took @compose.values and
        // so have no OnModified - those settle trivially rather than throwing.
        const hook = target.OnModified;
        if (typeof hook !== "function")
        {
            state.pendingModified?.clear();
            state.dirty = false;
            return true;
        }

        const source = options.source ?? target;
        if (!settleModifiedMembers(target)) return false;

        // `HasListener` lives on the state slot itself, so it exists whatever
        // decorators the class took, and answers false when no emitter was
        // ever attached - which is also what keeps EmitEvent from being called
        // on a class that does not have it.
        //
        // The emitter no-ops without listeners anyway, so the guard is really
        // about the PAYLOAD: it stops one being built per settle for nobody,
        // the waste the audit measured on the per-frame binding path.
        if (options.skipEvents !== true && !state.suppressEvents && state.HasListener())
        {
            target.EmitEvent("modified", target, { source, changedFields });
        }

        return true;
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
            if (state.updating) queueModifiedMember(this, null);
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
