// Source: blueexposure/include/BlueRegistration.h:117 (BlueRegistration::GetEnumRegs)
// Source: blueexposure/include/BlueRegistration.h:242-268 (EnumRegistration<T>)
// Source: blueexposure/include/BlueRegistration.h:270-301 (EnumTypeRegistration)
// Source: blueexposure/BlueRegistration.cpp:9-91 (value-name lookup)
// Source: blueexposure/BlueRegistrationPython.cpp:24-209 (PyBlueEnumObject, blue.BlueEnum)
//
// One registry folds those four together: a registration's member records
// (EnumRegistration<T>), registration by name (EnumTypeRegistration), the
// name-to-values table (GetEnumRegs), and the Python enum object's lookups
// (PyBlueEnumObject). BlueRegistration's non-enum facilities stay where they
// are. Schema attribution is installed by CjsSchema after its own
// initialization, because schema and Blue both need this storage while their
// modules load.

/** Stable enum identity, shared by definition sites and schema without an import cycle. */
export const CJS_ENUM_NAME = Symbol.for("carbonenginejs.enum.name");

/** Native enum exposure flags, retained as metadata without Python module mutation. */
export const EnumRegistrationType = Object.freeze({
    ENUM_REG_VALUES_ON_MODULE: 1,
    ENUM_REG_ENUM_OBJECT_ON_MODULE: 2
});

/**
 * Combines Carbon enum registration and BlueEnum lookup in a dependency-free registry.
 *
 * Adapted from the donors in the file header: module execution replaces
 * Carbon's static registrars, qualified names share one table where Carbon
 * keeps one per module, and JS errors replace Python exceptions.
 *
 * Values are signed or unsigned 32-bit integers, and both spellings of one bit
 * pattern compare equal. Errors: a missing enum throws ReferenceError, a value
 * or mask with no matching entry throws RangeError, and invalid input
 * (fractions, out-of-range integers, strings, BigInt, malformed metadata)
 * throws TypeError.
 */
export class CjsBlueEnumRegistry
{
    _byName = new Map();
    _byObject = new WeakMap();

    /**
     * Registers a read-only named-value object and its ordered chooser metadata.
     *
     * Carbon: the EnumTypeRegistration constructor (BlueRegistration.h:272-288),
     * which inserts the type into GetEnumRegs and calls
     * EnumRegistration<T>::RegisterValue (:252-257) for each chooser entry. Here
     * one call does both.
     *
     * Freezes and returns the same object. Values may repeat as aliases; names
     * must be non-numeric. `definition.members` orders and describes members
     * (unlisted members follow in declaration order); `source`, `family`,
     * `line`, `exposure`, `exposedName` and `chooserSource` are provenance
     * only and register no aliases.
     *
     * `definition.chooser` preserves the native chooser: its names may differ
     * from the identifiers and may omit sentinels, but its values must be
     * declared. When present it is authoritative for name and bitmask lookup;
     * omitted entries are not appended, and an explicit empty chooser matches
     * nothing.
     *
     * Registering the same object, name and metadata again is harmless. A
     * conflicting registration, or a second name for one object, throws
     * TypeError before publication and does not freeze the rejected object.
     */
    Register(name, values, definition = {})
    {
        return this._Register(name, values, definition, false);
    }

    /**
     * Creates a named, frozen flat enum at its definition site (BLUE_REGISTER_ENUM).
     * The supplied literal retains its identity; its non-enumerable symbol is
     * installed only after all registration checks pass, before freezing.
     * Pre-frozen unnamed objects must use Register or provide an unfrozen literal.
     */
    Create(name, values, definition = {})
    {
        return this._Register(name, values, definition, true);
    }

    /** Sets a registration using the same conflict checks; never silently replaces a type. */
    Set(name, values, definition = {})
    {
        return this.Register(name, values, definition);
    }

    /** Returns the registered enum; the shorter spelling of GetEnum. */
    Get(name)
    {
        return this.GetEnum(name);
    }

    /** Compatibility spelling for existing registration callers. */
    RegisterEnum(name, values, definition = {})
    {
        return this.Register(name, values, definition);
    }

    /** Carbon EnumRegistration<T>::GetValueName, with the native alias ordering. */
    GetValueName(name, value)
    {
        return this.GetNameFromValue(name, value);
    }

    /** Carbon EnumRegistration<T>::GetValueNameAsBitMask, including contained composites. */
    GetValueNameAsBitMask(name, value)
    {
        return this.GetNameFromBitmask(name, value);
    }

    /** Validates the full registration before mutating either the enum or registry. */
    _Register(name, values, definition, create)
    {
        if (typeof name !== "string" || !name || name.trim() !== name)
        {
            throw new TypeError("Enum name must be a non-empty, unpadded string.");
        }
        if (!values || (Object.getPrototypeOf(values) !== Object.prototype
            && Object.getPrototypeOf(values) !== null) || Array.isArray(values))
        {
            throw new TypeError("Enum values must be a plain name-to-integer object.");
        }
        const records = new Map();
        for (const key of Object.keys(values))
        {
            const property = Object.getOwnPropertyDescriptor(values, key);
            if (!key || Number.isFinite(Number(key)) || !Object.hasOwn(property, "value"))
            {
                throw new TypeError("Enum members must have nonnumeric names and data values.");
            }
            uint32(property.value);
            records.set(key, { name: key, value: property.value });
        }
        const ordered = [];
        if (definition.members !== undefined && !Array.isArray(definition.members))
        {
            throw new TypeError("Enum members metadata must be an array.");
        }
        for (const member of definition.members || [])
        {
            const record = records.get(member.name);
            if (!record || record.value !== member.value)
            {
                throw new TypeError("Enum member metadata must agree with the named-value object.");
            }
            if (member.description !== undefined)
            {
                if (typeof member.description !== "string") throw new TypeError("Enum descriptions must be strings.");
                record.description = member.description;
            }
            ordered.push(record);
            records.delete(member.name);
        }
        for (const record of records.values()) ordered.push(record);
        const info = { name, type: values, members: ordered };
        // Native VarChooser names are exposed labels, not necessarily C++ enum
        // identifiers. Its ordered selection may omit sentinels and aliases.
        if (definition.chooser !== undefined)
        {
            if (!Array.isArray(definition.chooser)) throw new TypeError("Enum chooser must be an array.");
            const allowed = new Set(ordered.map(member => uint32(member.value)));
            info.chooser = definition.chooser.map(member => {
                if (typeof member.name !== "string" || !member.name || !allowed.has(uint32(member.value)))
                {
                    throw new TypeError("Enum chooser entries must name declared enum values.");
                }
                const entry = { name: member.name, value: member.value };
                if (member.description !== undefined)
                {
                    if (typeof member.description !== "string") throw new TypeError("Enum descriptions must be strings.");
                    entry.description = member.description;
                }
                return entry;
            });
        }
        for (const key of ["source", "family", "line", "exposure", "exposedName", "chooserSource"])
        {
            if (definition[key] === undefined) continue;
            if (key === "line" || key === "exposure")
            {
                if (!Number.isInteger(definition[key]) || definition[key] < 0)
                {
                    throw new TypeError(`Enum ${key} must be a nonnegative integer.`);
                }
            }
            else if (typeof definition[key] !== "string") throw new TypeError(`Enum ${key} must be a string.`);
            info[key] = definition[key];
        }
        const identity = Object.getOwnPropertyDescriptor(values, CJS_ENUM_NAME);
        if (identity && (!Object.hasOwn(identity, "value") || identity.value !== name || (create && identity.enumerable)))
        {
            throw new TypeError("Enum object already has a canonical name.");
        }
        if (create && !identity && !Object.isExtensible(values))
        {
            throw new TypeError("Create requires an unfrozen enum literal or an already named enum.");
        }
        const existing = this._byName.get(name);
        if (existing)
        {
            if (existing.type !== values || JSON.stringify({ ...existing, type: null }) !== JSON.stringify({ ...info, type: null }))
            {
                throw new TypeError(`Enum registration conflicts with ${name}.`);
            }
            return values;
        }
        if (this._byObject.has(values)) throw new TypeError("Enum object already has a canonical name.");
        if (create && !identity)
        {
            Object.defineProperty(values, CJS_ENUM_NAME, { value: name });
        }
        Object.freeze(values);
        this._byName.set(name, info);
        this._byObject.set(values, name);
        return values;
    }

    /**
     * Reports whether an enum name is registered without resolving a domain.
     *
     * Carbon: a lookup in `BlueRegistration::GetEnumRegs`
     * (BlueRegistration.h:117), as EnumTypeRegistration::GetTypeValuesGetter
     * does (:290-300), tested for presence.
     */
    HasEnum(name)
    {
        return this._byName.has(name);
    }

    /**
     * Returns the registered read-only named-value object.
     *
     * Carbon: EnumTypeRegistration::GetTypeValuesGetter (BlueRegistration.h:290-300)
     * finds the registration in GetEnumRegs, and its getter returns the values.
     */
    GetEnum(name)
    {
        return this.GetEnumInfo(name).type;
    }

    /**
     * Returns ordered chooser metadata, descriptions and donor provenance.
     *
     * Carbon: the GetEnumRegs entry (BlueRegistration.h:117) with its
     * EnumRegistration<T>::GetValues records (:245-250). Differs: an unknown
     * name throws ReferenceError, where GetTypeValuesGetter returns NULL.
     */
    GetEnumInfo(name)
    {
        const info = this._byName.get(name);
        if (!info) throw new ReferenceError(`Enum is not registered: ${name}`);
        return info;
    }

    /**
     * Returns an object's canonical registration name, or null.
     *
     * No single Carbon originator: a PyBlueEnumObject (BlueRegistrationPython.cpp:24)
     * is created per registration name, so Carbon never has to look the name up
     * from the values object. This reverse lookup is ours.
     */
    GetEnumName(values)
    {
        return this._byObject.get(values) || null;
    }

    /**
     * Joins every exact alias in chooser order.
     *
     * Carbon: blue.BlueEnum.GetNameFromValue, the same name
     * (BlueRegistrationPython.cpp:47, PyGetNameFromValue :141), which calls
     * GetEnumValueName_Impl (BlueRegistration.cpp:58-78); C++ callers reach the
     * same lookup as EnumRegistration<T>::GetValueName (BlueRegistration.h:264)
     * and GetEnumValueName (BlueRegistration.cpp:80-91). Carbon quirk: the
     * Python docstring says "the first value found", but the implementation
     * joins every exact match, as this does. Differs: no match throws
     * RangeError where Python raises AttributeError("Enum value not found"),
     * and the C++ functions return an empty string.
     */
    GetNameFromValue(name, value)
    {
        const info = this.GetEnumInfo(name);
        const members = info.chooser ?? info.members;
        const bits = uint32(value);
        const matches = members.filter(member => uint32(member.value) === bits);
        if (!matches.length) throw new RangeError(`Enum value not found in ${name}: ${value}`);
        return matches.map(member => member.name).join(" | ");
    }

    /**
     * Returns the first exact mask name, or every contained nonzero chooser entry.
     *
     * Carbon: blue.BlueEnum.GetNameFromBitmask, the same name
     * (BlueRegistrationPython.cpp:53, PyGetNameFromBitmask :175), which calls
     * GetEnumValuesAsBitMask_Impl (BlueRegistration.cpp:9-42); C++ callers
     * reach it as EnumRegistration<T>::GetValueNameAsBitMask
     * (BlueRegistration.h:259) and GetEnumValueNameAsBitMask
     * (BlueRegistration.cpp:44-56). Differs: no match throws RangeError, where
     * Python raises AttributeError and C++ returns an empty string.
     *
     * An exact match wins; otherwise every non-zero entry whose bits are all in
     * the mask is joined with " | ", including aliases and composites. Unknown
     * remaining bits do not invalidate known matches, and zero matches only an
     * explicit zero entry.
     */
    GetNameFromBitmask(name, mask)
    {
        const info = this.GetEnumInfo(name);
        const members = info.chooser ?? info.members;
        const bits = uint32(mask);
        const exact = members.find(member => uint32(member.value) === bits);
        if (exact) return exact.name;
        // Carbon permits unknown remaining bits and includes contained composites.
        const matches = members.filter(member => {
            const value = uint32(member.value);
            return value !== 0 && ((value & bits) >>> 0) === value;
        });
        if (!matches.length) throw new RangeError(`Enum value not found in ${name}: ${mask}`);
        return matches.map(member => member.name).join(" | ");
    }
}

function uint32(value)
{
    // Python accepts signed int; JS additionally accepts its unsigned spelling.
    if (!Number.isInteger(value) || value < -2147483648 || value > 4294967295)
    {
        throw new TypeError("Enum values must be signed or unsigned 32-bit integers.");
    }
    return value >>> 0;
}

/** Shared enum storage used by Blue and schema without importing either facade. */
export const blueEnums = new CjsBlueEnumRegistry();
