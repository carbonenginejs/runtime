// Source: blueexposure/include/BlueRegistration.h (enum registration only)
// Source: blueexposure/BlueRegistration.cpp:10-91 (ordered name lookup)
// Source: blueexposure/BlueRegistrationPython.cpp (PyBlueEnumObject / blue.BlueEnum)
// Absorbed: EnumRegistration<T> -> ordered member records; EnumTypeRegistration
// -> RegisterEnum; PyBlueEnumObject -> read-only values and registry lookups.
// BlueRegistration's non-enum facilities and other VarChooser uses survive.
// JS adaptation: qualified names share one table instead of per-module tables;
// module bodies replace static constructors; no Python extension object exists.
// Schema attribution is installed by CjsSchema after its own initialization.

/** Native enum exposure flags, retained as metadata without Python module mutation. */
export const EnumRegistrationType = Object.freeze({
    ENUM_REG_VALUES_ON_MODULE: 1,
    ENUM_REG_ENUM_OBJECT_ON_MODULE: 2
});

/** Combines Carbon enum registration and BlueEnum lookup in a dependency-free registry. */
export class CjsBlueEnumRegistry
{
    #byName = new Map();
    #byObject = new WeakMap();

    /** Registers a read-only named-value object and its ordered chooser metadata. */
    RegisterEnum(name, values, definition = {})
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
            ordered.push(Object.freeze(record));
            records.delete(member.name);
        }
        for (const record of records.values()) ordered.push(Object.freeze(record));
        const info = { name, type: values, members: Object.freeze(ordered) };
        // Native VarChooser names are exposed labels, not necessarily C++ enum
        // identifiers. Its ordered selection may omit sentinels and aliases.
        if (definition.chooser !== undefined)
        {
            if (!Array.isArray(definition.chooser)) throw new TypeError("Enum chooser must be an array.");
            const allowed = new Set(ordered.map(member => uint32(member.value)));
            info.chooser = Object.freeze(definition.chooser.map(member => {
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
                return Object.freeze(entry);
            }));
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
        const existing = this.#byName.get(name);
        if (existing)
        {
            if (existing.type !== values || JSON.stringify({ ...existing, type: null }) !== JSON.stringify({ ...info, type: null }))
            {
                throw new TypeError(`Enum registration conflicts with ${name}.`);
            }
            return values;
        }
        if (this.#byObject.has(values)) throw new TypeError("Enum object already has a canonical name.");
        Object.freeze(values);
        this.#byName.set(name, Object.freeze(info));
        this.#byObject.set(values, name);
        return values;
    }

    /** Reports whether an enum name is registered without resolving a domain. */
    HasEnum(name)
    {
        return this.#byName.has(name);
    }

    /** Returns the registered read-only named-value object. */
    GetEnum(name)
    {
        return this.GetEnumInfo(name).type;
    }

    /** Returns ordered chooser metadata, descriptions and donor provenance. */
    GetEnumInfo(name)
    {
        const info = this.#byName.get(name);
        if (!info) throw new ReferenceError(`Enum is not registered: ${name}`);
        return info;
    }

    /** Returns an object's canonical registration name, or null. */
    GetEnumName(values)
    {
        return this.#byObject.get(values) || null;
    }

    /** Joins every exact alias in chooser order, matching GetEnumValueName_Impl. */
    GetNameFromValue(name, value)
    {
        const info = this.GetEnumInfo(name);
        const members = info.chooser ?? info.members;
        const bits = uint32(value);
        const matches = members.filter(member => uint32(member.value) === bits);
        if (!matches.length) throw new RangeError(`Enum value not found in ${name}: ${value}`);
        return matches.map(member => member.name).join(" | ");
    }

    /** Returns the first exact mask name, or every contained nonzero chooser entry. */
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
