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


/** Carbon's own guard against a settle that will not converge. */
const MAX_UPDATE_PASSES = 32;

/**
 * Whether a declared field accepts an incoming value.
 *
 * Carbon's deserializer semantics, and deliberately identical to the model
 * path's rule: PERSIST or WRITE is writable, and the only refusal is read-only
 * WITHOUT persist - runtime-derived state the wire should never carry and
 * Initialize recomputes. There is no caller-side capability to relax this,
 * because a field Carbon persists is already writable here.
 *
 * @param {object} field
 * @returns {Boolean}
 */
export function isWritableField(field)
{
    const io = field?.io;
    if (!io) return true;
    if (io.write || io.persist || io.persistOnly) return true;
    if (io.read && !io.write) return false;
    return true;
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
            if (options.persistOnly && !(field.io?.persist || field.io?.persistOnly)) continue;
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
                if (coerced || field.io?.always === true) changed.add(field.name);
                continue;
            }

            const next = Import(incoming, field, options);
            if (field.io?.always === true || !IsEquivalent(current, next))
            {
                target[field.name] = next;
                changed.add(field.name);
            }
        }

        // Nothing moved, so nothing is dirty and no state is created. This is
        // what makes the slot free for an object that is only ever read.
        if (changed.size && options.markDirty !== false)
        {
            ensureRuntimeState(target).dirty = true;

            if (options.skipUpdate !== true) updateValues(target, options, changed);
        }

        return options.returnBoolean === true ? changed.size > 0 : changed;
    }

    /**
     * Carbon's INotify settle: run OnModified until nothing re-dirties.
     *
     * The changed field names ride through on the options bag. That is
     * ADDITIVE and verified safe: all 34 overrides carrying a positional
     * parameter receive the options OBJECT today, so gates comparing it to a
     * field name are false now and stay false. Passing a name POSITIONALLY
     * would instead flip the three `!propertyName || ...` arms from never
     * firing to always firing, which is why it is not done that way.
     *
     * @param {object} target
     * @param {object} options
     * @param {Set<String>} changedFields
     * @returns {Boolean} False when a hook refused, leaving the target dirty.
     */
    function updateValues(target, options, changedFields)
    {
        const state = ensureRuntimeState(target);
        if (state.updating) return true;

        // INotify is OPTIONAL, in Carbon as here: an object that does not
        // implement the hook is simply never notified. The statics serve any
        // decorated class, including ones that never took @compose.values and
        // so have no OnModified - those settle trivially rather than throwing.
        const hook = target.OnModified;
        if (typeof hook !== "function")
        {
            state.dirty = false;
            return true;
        }

        const source = options.source ?? target;
        state.updating = true;

        try
        {
            for (let pass = 0; ; pass++)
            {
                if (pass >= MAX_UPDATE_PASSES)
                {
                    throw new Error(
                        `${target.constructor?.name ?? "value"} exceeded ${MAX_UPDATE_PASSES} settle passes.`);
                }

                state.dirty = false;

                if (hook.call(target, { ...options, source, changedFields }) === false)
                {
                    state.dirty = true;
                    return false;
                }

                if (!state.dirty) break;
            }
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
        MarkDirty() { ensureRuntimeState(this).dirty = true; return this; },
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
