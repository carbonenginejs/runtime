import { CARBON_TYPE } from "../../../../global/schema/types/carbonTypes.js";

/** Storage vocabulary only; meaning declarations select one of these handlers. */
const ALIASES = {
    bool: CARBON_TYPE.BOOLEAN, float: CARBON_TYPE.FLOAT32, double: CARBON_TYPE.FLOAT64,
    vec2: CARBON_TYPE.VECTOR2, vec3: CARBON_TYPE.VECTOR3, vec4: CARBON_TYPE.VECTOR4,
    quat: CARBON_TYPE.QUATERNION, mat3: CARBON_TYPE.MATRIX3, mat4: CARBON_TYPE.MATRIX4,
    path: CARBON_TYPE.STRING, expression: CARBON_TYPE.STRING,
    rgb: CARBON_TYPE.VECTOR3, translation: CARBON_TYPE.VECTOR3, scale: CARBON_TYPE.VECTOR3,
    color: CARBON_TYPE.VECTOR4, rgba: CARBON_TYPE.VECTOR4, linear: CARBON_TYPE.VECTOR4,
    mixed: CARBON_TYPE.VECTOR4, rotation: CARBON_TYPE.QUATERNION,
    local: CARBON_TYPE.MATRIX4, world: CARBON_TYPE.MATRIX4
};

/** Platform array identities and their scalar encodings; no constructor-name inference. */
export const ARRAYS = {
    Int8Array: [Int8Array, "int8"], Uint8Array: [Uint8Array, "uint8"],
    Uint8ClampedArray: [Uint8ClampedArray, "uint8Clamped"],
    Int16Array: [Int16Array, "int16"], Uint16Array: [Uint16Array, "uint16"],
    Int32Array: [Int32Array, "int32"], Uint32Array: [Uint32Array, "uint32"],
    Float32Array: [Float32Array, "float32"], Float64Array: [Float64Array, "float64"],
    BigInt64Array: [BigInt64Array, "int64"], BigUint64Array: [BigUint64Array, "uint64"]
};

const RANGE = {
    int8: [-128, 127], uint8: [0, 255], uint8Clamped: [0, 255],
    int16: [-32768, 32767], uint16: [0, 65535],
    int32: [-2147483648, 2147483647], uint32: [0, 4294967295]
};
const LENGTH = { vector2: 2, vector3: 3, vector4: 4, quaternion: 4, matrix3: 9, matrix4: 16 };

/** Resolve meanings to data types before any table lookup. */
export function dataType(type, field = {})
{
    if (typeof type === "string") type = { kind: type };
    if (!type || typeof type !== "object") throw new TypeError("Missing data type declaration");
    let kind = type.kind;
    if (kind === "flags" || field.edit?.flags) return { ...type, kind: "uint32" };
    if (kind === "enum")
    {
        kind = type.scalar ?? type.underlyingType;
        if (!RANGE[kind]) throw new TypeError("Enum requires an underlying integer data type");
    }
    for (const [name, [Ctor]] of Object.entries(ARRAYS))
    {
        if (kind === name[0].toLowerCase() + name.slice(1)) return { ...type, kind: "typedArray", arrayType: Ctor };
    }
    return { ...type, kind: ALIASES[kind] ?? kind };
}

/** Validate a declared scalar without implicit coercion or integer wrapping. */
export function scalar(value, kind, writing = false)
{
    if (RANGE[kind])
    {
        const [min, max] = RANGE[kind];
        if (!Number.isInteger(value) || value < min || value > max) throw new TypeError(`Expected ${kind} integer`);
        return value;
    }
    if (kind === "int64" || kind === "uint64")
    {
        if (typeof value === "number" && !Number.isSafeInteger(value)) throw new TypeError(`Unsafe ${kind} number`);
        if (typeof value === "string" && !/^(0|-?[1-9][0-9]*)$/u.test(value)) throw new TypeError(`Invalid ${kind} decimal`);
        if (!["string", "number", "bigint"].includes(typeof value)) throw new TypeError(`Expected ${kind} integer`);
        const number = BigInt(value);
        const min = kind === "int64" ? -(1n << 63n) : 0n;
        const max = kind === "int64" ? (1n << 63n) - 1n : (1n << 64n) - 1n;
        if (number < min || number > max) throw new RangeError(`${kind} out of range`);
        return writing ? String(number) : number;
    }
    if (kind === "float32" || kind === "float64")
    {
        if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`Expected finite ${kind}`);
        const number = kind === "float32" ? Math.fround(value) : value;
        if (!Number.isFinite(number)) throw new RangeError(`${kind} overflow`);
        return number === 0 ? 0 : number;
    }
    if (kind === "boolean")
    {
        if (typeof value !== "boolean") throw new TypeError("Expected boolean");
        return value;
    }
    if (kind === "string" || kind === "wstring")
    {
        if (typeof value !== "string") throw new TypeError(`Expected ${kind}`);
        return value;
    }
    throw new TypeError(`Unknown scalar data type '${kind}'`);
}

/** Find the explicitly declared platform array class and scalar encoding. */
export function arrayType(type)
{
    for (const [name, entry] of Object.entries(ARRAYS))
    {
        if (type.arrayType === name || type.arrayType === entry[0]) return entry;
    }
    throw new TypeError("Unknown typed-array declaration");
}

/** Each format owns a fresh data-type handler table, including its custom opt-ins. */
export function createHandlers(binary = null)
{
    const handlers = new Map();
    for (const kind of [...Object.keys(RANGE), "int64", "uint64", "float32", "float64", "boolean", "string", "wstring"])
    {
        handlers.set(kind, (value, type, context) => scalar(value, kind, context.writing));
    }
    for (const [kind, length] of Object.entries(LENGTH))
    {
        handlers.set(kind, (value, type, context) =>
        {
            if ((!Array.isArray(value) && !ArrayBuffer.isView(value)) || value.length !== length)
            {
                throw new TypeError(`Expected ${kind} with ${length} components`);
            }
            const values = Array.from(value, item => scalar(item, type.scalar ?? "float32", context.writing));
            if (context.writing) return values;
            const Ctor = type.scalar === "float64" ? Float64Array : Float32Array;
            return Ctor.from(values);
        });
    }
    handlers.set("typedArray", (value, type, context) =>
    {
        const [Ctor, kind] = arrayType(type);
        if (binary) return binary(value, type, context);
        if (!Array.isArray(value) && !(ArrayBuffer.isView(value) && value.constructor === Ctor)) throw new TypeError(`Expected declared ${kind} array`);
        const values = Array.from(value, item => scalar(item, kind, context.writing));
        return context.writing ? values : Ctor.from(values);
    });
    return handlers;
}

/** Exact plain dictionary, never an arbitrary live instance or an accessor bag. */
export function isRecord(value)
{
    return value !== null && typeof value === "object"
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** JSON pointer escaping used by all format member reports. */
export function memberPath(path, name)
{
    return `${path}/${String(name).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

/** Set data keys safely, including arbitrary string Map keys such as __proto__. */
export function put(target, name, value)
{
    Object.defineProperty(target, name, { value, writable: true, enumerable: true, configurable: true });
}
