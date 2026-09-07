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
// STATE-FREE, exactly as the seam's own name says. The dirty flag, the settle
// loop, the modified event and the child-mutation surface are the EDITING
// contract and stay with the authoring path; this is coercion, the writability
// gate, and a changed set. A reader wants precisely this much - CjsBlueReader
// already pins {markDirty:false, skipUpdate:true, skipEvents:true} on every
// hydration, which is the editing half switched off.
//
// This module imports nothing from the schema layer, for the reason
// compose/notify.js and compose/interface.js import nothing: CjsSchema installs
// these onto its own namespace, so a schema import here is a cycle that fails
// at load. Everything it needs arrives through `services`.

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

        return options.returnBoolean === true ? changed.size > 0 : changed;
    }

    return { getValues, setValues };
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
        SetValues(values = {}, options = {}) { return transport.setValues(this, values, options); }
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
