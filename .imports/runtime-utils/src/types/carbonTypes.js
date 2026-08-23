export const CARBON_META = Symbol.for("carbonenginejs.type");
export const CARBON_RAW_STRUCT_TYPE = Symbol.for("carbonenginejs.rawStructType");

export const CARBON_TYPE = Object.freeze({
    UNKNOWN: "unknown",
    BOOLEAN: "boolean",
    STRING: "string",
    PATH: "path",
    EXPRESSION: "expression",
    ENUM: "enum",
    FLOAT32: "float32",
    FLOAT64: "float64",
    INT8: "int8",
    UINT8: "uint8",
    INT16: "int16",
    UINT16: "uint16",
    INT32: "int32",
    UINT32: "uint32",
    INT64: "int64",
    UINT64: "uint64",
    VECTOR2: "vector2",
    VECTOR3: "vector3",
    VECTOR4: "vector4",
    COLOR: "color",
    QUATERNION: "quaternion",
    MATRIX3: "matrix3",
    MATRIX4: "matrix4",
    ARRAY: "array",
    MAP: "map",
    SET: "set",
    MODEL: "model",
    OBJECT_REF: "objectRef",
    STRUCT: "struct",
    RAW_STRUCT: "rawStruct",
    TYPED_ARRAY: "typedArray"
});

const FLOAT32_VECTOR_DEFINITIONS = Object.freeze({
    [CARBON_TYPE.VECTOR2]: Object.freeze({ kind: CARBON_TYPE.VECTOR2, js: "vec2", scalar: CARBON_TYPE.FLOAT32, length: 2, default: [0, 0] }),
    [CARBON_TYPE.VECTOR3]: Object.freeze({ kind: CARBON_TYPE.VECTOR3, js: "vec3", scalar: CARBON_TYPE.FLOAT32, length: 3, default: [0, 0, 0] }),
    [CARBON_TYPE.VECTOR4]: Object.freeze({ kind: CARBON_TYPE.VECTOR4, js: "vec4", scalar: CARBON_TYPE.FLOAT32, length: 4, default: [0, 0, 0, 0] }),
    [CARBON_TYPE.COLOR]: Object.freeze({ kind: CARBON_TYPE.COLOR, js: "vec4", semantic: CARBON_TYPE.COLOR, scalar: CARBON_TYPE.FLOAT32, length: 4, default: [0, 0, 0, 0] }),
    [CARBON_TYPE.QUATERNION]: Object.freeze({ kind: CARBON_TYPE.QUATERNION, js: "quat", scalar: CARBON_TYPE.FLOAT32, length: 4, default: [0, 0, 0, 1] }),
    [CARBON_TYPE.MATRIX3]: Object.freeze({ kind: CARBON_TYPE.MATRIX3, js: "mat3", scalar: CARBON_TYPE.FLOAT32, length: 9, default: [1, 0, 0, 0, 1, 0, 0, 0, 1] }),
    [CARBON_TYPE.MATRIX4]: Object.freeze({ kind: CARBON_TYPE.MATRIX4, js: "mat4", scalar: CARBON_TYPE.FLOAT32, length: 16, default: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] })
});

const TYPE_DEFINITIONS = Object.freeze({
    [CARBON_TYPE.UNKNOWN]: Object.freeze({ kind: CARBON_TYPE.UNKNOWN, js: "*" }),
    [CARBON_TYPE.BOOLEAN]: Object.freeze({ kind: CARBON_TYPE.BOOLEAN, js: "boolean" }),
    [CARBON_TYPE.STRING]: Object.freeze({ kind: CARBON_TYPE.STRING, js: "string" }),
    [CARBON_TYPE.PATH]: Object.freeze({ kind: CARBON_TYPE.PATH, js: "string" }),
    [CARBON_TYPE.EXPRESSION]: Object.freeze({ kind: CARBON_TYPE.EXPRESSION, js: "string", semantic: CARBON_TYPE.EXPRESSION }),
    [CARBON_TYPE.ENUM]: Object.freeze({ kind: CARBON_TYPE.ENUM, js: "number|string|null" }),
    [CARBON_TYPE.FLOAT32]: Object.freeze({ kind: CARBON_TYPE.FLOAT32, js: "number", bits: 32, signed: true, floating: true }),
    [CARBON_TYPE.FLOAT64]: Object.freeze({ kind: CARBON_TYPE.FLOAT64, js: "number", bits: 64, signed: true, floating: true }),
    [CARBON_TYPE.INT8]: Object.freeze({ kind: CARBON_TYPE.INT8, js: "number", bits: 8, signed: true, integer: true }),
    [CARBON_TYPE.UINT8]: Object.freeze({ kind: CARBON_TYPE.UINT8, js: "number", bits: 8, signed: false, integer: true }),
    [CARBON_TYPE.INT16]: Object.freeze({ kind: CARBON_TYPE.INT16, js: "number", bits: 16, signed: true, integer: true }),
    [CARBON_TYPE.UINT16]: Object.freeze({ kind: CARBON_TYPE.UINT16, js: "number", bits: 16, signed: false, integer: true }),
    [CARBON_TYPE.INT32]: Object.freeze({ kind: CARBON_TYPE.INT32, js: "number", bits: 32, signed: true, integer: true }),
    [CARBON_TYPE.UINT32]: Object.freeze({ kind: CARBON_TYPE.UINT32, js: "number", bits: 32, signed: false, integer: true }),
    [CARBON_TYPE.INT64]: Object.freeze({ kind: CARBON_TYPE.INT64, js: "bigint", bits: 64, signed: true, integer: true }),
    [CARBON_TYPE.UINT64]: Object.freeze({ kind: CARBON_TYPE.UINT64, js: "bigint", bits: 64, signed: false, integer: true }),
    [CARBON_TYPE.ARRAY]: Object.freeze({ kind: CARBON_TYPE.ARRAY, js: "Array" }),
    [CARBON_TYPE.MAP]: Object.freeze({ kind: CARBON_TYPE.MAP, js: "Map" }),
    [CARBON_TYPE.SET]: Object.freeze({ kind: CARBON_TYPE.SET, js: "Set" }),
    [CARBON_TYPE.MODEL]: Object.freeze({ kind: CARBON_TYPE.MODEL, js: "object|null" }),
    [CARBON_TYPE.OBJECT_REF]: Object.freeze({ kind: CARBON_TYPE.OBJECT_REF, js: "object|null" }),
    [CARBON_TYPE.STRUCT]: Object.freeze({ kind: CARBON_TYPE.STRUCT, js: "object" }),
    [CARBON_TYPE.RAW_STRUCT]: Object.freeze({ kind: CARBON_TYPE.RAW_STRUCT, js: "object" }),
    [CARBON_TYPE.TYPED_ARRAY]: Object.freeze({ kind: CARBON_TYPE.TYPED_ARRAY, js: "TypedArray" }),
    ...FLOAT32_VECTOR_DEFINITIONS
});

const TYPE_ALIASES = Object.freeze({
    bool: CARBON_TYPE.BOOLEAN,
    float: CARBON_TYPE.FLOAT32,
    double: CARBON_TYPE.FLOAT64,
    vec2: CARBON_TYPE.VECTOR2,
    vec3: CARBON_TYPE.VECTOR3,
    vec4: CARBON_TYPE.VECTOR4,
    quat: CARBON_TYPE.QUATERNION,
    mat3: CARBON_TYPE.MATRIX3,
    mat4: CARBON_TYPE.MATRIX4
});

const TYPED_ARRAY_CTORS = Object.freeze({
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array
});

const num = Object.freeze({
    int8,
    uint8,
    int16,
    uint16,
    int32,
    uint32,
    int64,
    uint64,
    float32,
    float64
});

const CARBON_MATH_KINDS = new Set(Object.keys(FLOAT32_VECTOR_DEFINITIONS));

export function createCarbonMathValue(type, value = undefined)
{
    const descriptor = normalizeCarbonTypeDescriptor(type);
    const values = normalizeMathValues(value, descriptor.length, descriptor.default);

    // Carbon math values are plain Float32Arrays. Their descriptors remain
    // independent of the gl-matrix-backed math helpers. Defaults already
    // encode identity/zero, matching gl-matrix's create() output.
    return CARBON_MATH_KINDS.has(descriptor.kind) ? Float32Array.from(values) : values;
}

/**
 * Coerce a math value INTO an existing Float32Array target, in place, with no
 * allocation. Returns `true`/`false` (whether any element changed) when the fast
 * path applies — a math kind, `target` a compatible Float32Array, and `value`
 * array-like. Returns `null` when it does not apply (non-math kind, incompatible
 * or absent target, or a null/undefined value) so the caller falls back to a
 * normal allocating assignment.
 */
export function coerceCarbonMathInto(target, value, type)
{
    const descriptor = normalizeCarbonTypeDescriptor(type);
    if (!CARBON_MATH_KINDS.has(descriptor.kind)) return null;
    if (!(target instanceof Float32Array) || target.length !== descriptor.length) return null;

    const source = ArrayBuffer.isView(value) || Array.isArray(value) ? value : null;
    if (!source) return null;

    const defaults = descriptor.default;
    let changed = false;
    for (let i = 0; i < descriptor.length; i++)
    {
        const next = num.float32(i < source.length ? source[i] : defaults[i]);
        if (target[i] !== next)
        {
            target[i] = next;
            changed = true;
        }
    }
    return changed;
}

export function getCarbonTypeDefinition(type)
{
    const descriptor = normalizeCarbonTypeDescriptor(type);
    return TYPE_DEFINITIONS[descriptor.kind] || TYPE_DEFINITIONS[CARBON_TYPE.UNKNOWN];
}

export function normalizeCarbonTypeDescriptor(type)
{
    if (!type) return TYPE_DEFINITIONS[CARBON_TYPE.UNKNOWN];
    if (typeof type === "string") return carbonTypeDefinitionForKind(type);
    if (type.kind) return mergeCarbonTypeDefinition(type);
    if (type.jsType) return normalizeCarbonTypeDescriptor(type.jsType);
    if (type.cppType) return inferCarbonTypeFromCpp(type.cppType, type.name);
    if (type.pythonType) return inferCarbonTypeFromPython(type.pythonType);
    return TYPE_DEFINITIONS[CARBON_TYPE.UNKNOWN];
}

export function inferCarbonTypeFromCpp(cppType, propertyName = "")
{
    const original = String(cppType || "").trim();
    const type = normalizeCppType(original);
    const named = normalizeCppTypeName(original);

    if (!type) return TYPE_DEFINITIONS[CARBON_TYPE.UNKNOWN];
    if (type.includes("std::vector") || /(?:Vector|List)$/.test(named)) return containerDescriptor(CARBON_TYPE.ARRAY, original);
    if (type.includes("std::map") || /(?:Map)$/.test(named)) return containerDescriptor(CARBON_TYPE.MAP, original);
    if (type.includes("std::set") || /(?:Set)$/.test(named)) return containerDescriptor(CARBON_TYPE.SET, original);
    if (/\*$/.test(type) || /^P(?:I)?[A-Z]\w+$/.test(named) || /(?:Ptr|Ref)$/.test(named)) return objectRefDescriptor(original);

    switch (named)
    {
        case "bool":
            return TYPE_DEFINITIONS[CARBON_TYPE.BOOLEAN];
        case "char":
        case "int8_t":
            return TYPE_DEFINITIONS[CARBON_TYPE.INT8];
        case "uint8_t":
        case "byte":
            return TYPE_DEFINITIONS[CARBON_TYPE.UINT8];
        case "int16_t":
        case "short":
            return TYPE_DEFINITIONS[CARBON_TYPE.INT16];
        case "uint16_t":
        case "ushort":
            return TYPE_DEFINITIONS[CARBON_TYPE.UINT16];
        case "int":
        case "int32_t":
        case "long":
            return TYPE_DEFINITIONS[CARBON_TYPE.INT32];
        case "uint":
        case "uint32_t":
        case "ulong":
            return TYPE_DEFINITIONS[CARBON_TYPE.UINT32];
        case "int64_t":
        case "longlong":
            return TYPE_DEFINITIONS[CARBON_TYPE.INT64];
        case "uint64_t":
        case "size_t":
        case "ulonglong":
            return TYPE_DEFINITIONS[CARBON_TYPE.UINT64];
        case "float":
            return TYPE_DEFINITIONS[CARBON_TYPE.FLOAT32];
        case "double":
            return TYPE_DEFINITIONS[CARBON_TYPE.FLOAT64];
        case "std::string":
        case "std::wstring":
        case "BlueSharedString":
            return isExpressionLike(propertyName) ? TYPE_DEFINITIONS[CARBON_TYPE.EXPRESSION] : TYPE_DEFINITIONS[CARBON_TYPE.STRING];
        case "Vector2":
            return TYPE_DEFINITIONS[CARBON_TYPE.VECTOR2];
        case "Vector3":
            return TYPE_DEFINITIONS[CARBON_TYPE.VECTOR3];
        case "Vector4":
            return isRotationLike(propertyName) ? TYPE_DEFINITIONS[CARBON_TYPE.QUATERNION] : TYPE_DEFINITIONS[CARBON_TYPE.VECTOR4];
        case "Color":
        case "ColorRGBA":
            return TYPE_DEFINITIONS[CARBON_TYPE.COLOR];
        case "Quaternion":
            return TYPE_DEFINITIONS[CARBON_TYPE.QUATERNION];
        case "Matrix3":
        case "Mat3":
            return TYPE_DEFINITIONS[CARBON_TYPE.MATRIX3];
        case "Matrix":
        case "Matrix4":
        case "Mat4":
        case "TriMatrix":
            return TYPE_DEFINITIONS[CARBON_TYPE.MATRIX4];
        default:
            break;
    }

    if (/::[A-Za-z_]\w*(?:Type|Usage|Mode|Enum)$/.test(type)) return TYPE_DEFINITIONS[CARBON_TYPE.ENUM];
    if (type.includes("::")) return rawStructDescriptor(original);
    if (/^[A-Z]\w*(?:Type|Usage|Mode|Enum)?$/.test(named)) return TYPE_DEFINITIONS[CARBON_TYPE.ENUM];
    return TYPE_DEFINITIONS[CARBON_TYPE.UNKNOWN];
}

export function inferCarbonTypeFromPython(pythonType)
{
    const type = String(pythonType || "").trim().toLowerCase();
    if (!type) return TYPE_DEFINITIONS[CARBON_TYPE.UNKNOWN];
    if (type === "bool" || type === "boolean") return TYPE_DEFINITIONS[CARBON_TYPE.BOOLEAN];
    if (type === "str" || type === "unicode" || type === "bytes") return TYPE_DEFINITIONS[CARBON_TYPE.STRING];
    if (type === "float") return TYPE_DEFINITIONS[CARBON_TYPE.FLOAT64];
    if (type === "int" || type === "long") return TYPE_DEFINITIONS[CARBON_TYPE.INT64];
    if (type === "list" || type === "tuple") return TYPE_DEFINITIONS[CARBON_TYPE.ARRAY];
    if (type === "dict") return TYPE_DEFINITIONS[CARBON_TYPE.MAP];
    if (type === "set") return TYPE_DEFINITIONS[CARBON_TYPE.SET];
    if (type === "none" || type === "nonetype") return objectRefDescriptor("NoneType");
    return TYPE_DEFINITIONS[CARBON_TYPE.UNKNOWN];
}

export function defaultValueForCarbonField(field)
{
    if (field && field.default && field.default.kind !== "expression")
    {
        return normalizeCarbonValue(field.default.json, field);
    }
    return defaultCarbonValue(field);
}

export function defaultCarbonValue(type)
{
    const descriptor = normalizeCarbonTypeDescriptor(type);
    switch (descriptor.kind)
    {
        case CARBON_TYPE.BOOLEAN:
            return false;
        case CARBON_TYPE.STRING:
        case CARBON_TYPE.PATH:
        case CARBON_TYPE.EXPRESSION:
            return "";
        case CARBON_TYPE.FLOAT32:
            return num.float32(0);
        case CARBON_TYPE.FLOAT64:
            return num.float64(0);
        case CARBON_TYPE.INT8:
            return num.int8(0);
        case CARBON_TYPE.UINT8:
            return num.uint8(0);
        case CARBON_TYPE.INT16:
            return num.int16(0);
        case CARBON_TYPE.UINT16:
            return num.uint16(0);
        case CARBON_TYPE.INT32:
            return num.int32(0);
        case CARBON_TYPE.UINT32:
            return num.uint32(0);
        case CARBON_TYPE.INT64:
            return num.int64(0);
        case CARBON_TYPE.UINT64:
            return num.uint64(0);
        case CARBON_TYPE.VECTOR2:
        case CARBON_TYPE.VECTOR3:
        case CARBON_TYPE.VECTOR4:
        case CARBON_TYPE.COLOR:
        case CARBON_TYPE.QUATERNION:
        case CARBON_TYPE.MATRIX3:
        case CARBON_TYPE.MATRIX4:
            return createCarbonMathValue(descriptor);
        case CARBON_TYPE.ARRAY:
            return [];
        case CARBON_TYPE.MAP:
            return new Map();
        case CARBON_TYPE.SET:
            return new Set();
        case CARBON_TYPE.ENUM:
        case CARBON_TYPE.MODEL:
        case CARBON_TYPE.OBJECT_REF:
        case CARBON_TYPE.STRUCT:
        case CARBON_TYPE.RAW_STRUCT:
        case CARBON_TYPE.UNKNOWN:
        default:
            return null;
    }
}

export function normalizeCarbonValue(value, type)
{
    const descriptor = normalizeCarbonTypeDescriptor(type);
    if (value === undefined) return defaultCarbonValue(descriptor);
    if (value === null) return null;

    switch (descriptor.kind)
    {
        case CARBON_TYPE.BOOLEAN:
            return Boolean(value);
        case CARBON_TYPE.STRING:
        case CARBON_TYPE.PATH:
        case CARBON_TYPE.EXPRESSION:
            return String(value);
        case CARBON_TYPE.FLOAT32:
            return num.float32(value);
        case CARBON_TYPE.FLOAT64:
            return num.float64(value);
        case CARBON_TYPE.INT8:
            return num.int8(value);
        case CARBON_TYPE.UINT8:
            return num.uint8(value);
        case CARBON_TYPE.INT16:
            return num.int16(value);
        case CARBON_TYPE.UINT16:
            return num.uint16(value);
        case CARBON_TYPE.INT32:
            return num.int32(value);
        case CARBON_TYPE.UINT32:
            return num.uint32(value);
        case CARBON_TYPE.INT64:
            return num.int64(value);
        case CARBON_TYPE.UINT64:
            return num.uint64(value);
        case CARBON_TYPE.VECTOR2:
        case CARBON_TYPE.VECTOR3:
        case CARBON_TYPE.VECTOR4:
        case CARBON_TYPE.COLOR:
        case CARBON_TYPE.QUATERNION:
        case CARBON_TYPE.MATRIX3:
        case CARBON_TYPE.MATRIX4:
            return createCarbonMathValue(descriptor, value);
        case CARBON_TYPE.ARRAY:
            return Array.isArray(value) ? value.map(cloneCarbonValue) : [cloneCarbonValue(value)];
        case CARBON_TYPE.MAP:
            return value instanceof Map ? cloneCarbonValue(value) : new Map(Object.entries(value || {}));
        case CARBON_TYPE.SET:
            return value instanceof Set ? new Set(value) : new Set(Array.isArray(value) ? value : [value]);
        default:
            return cloneCarbonValue(value);
    }
}

export function cloneCarbonValue(value)
{
    if (ArrayBuffer.isView(value)) return new value.constructor(value);
    if (typeof value === "bigint") return value;
    if (isSourceShapedObject(value)) return value;
    if (value instanceof Map) return new Map(Array.from(value.entries()).map(([key, item]) => [key, cloneCarbonValue(item)]));
    if (value instanceof Set) return new Set(Array.from(value.values()).map(cloneCarbonValue));
    if (Array.isArray(value)) return value.map(cloneCarbonValue);
    if (value && typeof value === "object")
    {
        const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneCarbonValue(item)]));
        if (isCarbonRawStruct(value)) return createCarbonRawStruct(getCarbonRawStructType(value), result);
        return result;
    }
    return value;
}

export function exportCarbonValue(value)
{
    if (ArrayBuffer.isView(value)) return Array.from(value, item => typeof item === "bigint" ? item.toString() : item);
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Map) return Object.fromEntries(Array.from(value.entries()).map(([key, item]) => [key, exportCarbonValue(item)]));
    if (value instanceof Set) return Array.from(value.values()).map(exportCarbonValue);
    if (Array.isArray(value)) return value.map(exportCarbonValue);
    if (value && typeof value === "object")
    {
        const result = Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !key.startsWith("_"))
                .map(([key, item]) => [key, exportCarbonValue(item)])
        );
        if (isCarbonRawStruct(value)) result.$type = getCarbonRawStructType(value);
        return result;
    }
    return value;
}

export function createCarbonRawStruct(typeName, values = {})
{
    const result = { ...values };
    Object.defineProperty(result, CARBON_META, {
        value: CARBON_TYPE.RAW_STRUCT,
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(result, CARBON_RAW_STRUCT_TYPE, {
        value: typeName || null,
        enumerable: false,
        configurable: true
    });
    return result;
}

export function isCarbonRawStruct(value)
{
    return Boolean(value && typeof value === "object" && value[CARBON_META] === CARBON_TYPE.RAW_STRUCT);
}

export function getCarbonRawStructType(value)
{
    return isCarbonRawStruct(value) ? value[CARBON_RAW_STRUCT_TYPE] : null;
}

export function carbonValueToJsExpression(value)
{
    if (ArrayBuffer.isView(value))
    {
        const values = Array.from(value, item => typeof item === "bigint" ? `${item}n` : formatJsNumber(item));
        return `new ${value.constructor.name}([${values.join(", ")}])`;
    }
    if (typeof value === "bigint") return `${value}n`;
    if (value instanceof Map) return "new Map()";
    if (value instanceof Set) return "new Set()";
    if (Array.isArray(value)) return `[${value.map(item => carbonValueToJsExpression(item)).join(", ")}]`;
    if (value && typeof value === "object") return JSON.stringify(exportCarbonValue(value), null, 4);
    return JSON.stringify(value);
}

export function typedArrayConstructor(name)
{
    return TYPED_ARRAY_CTORS[name] || null;
}

function carbonTypeDefinitionForKind(kind)
{
    const normalized = TYPE_ALIASES[kind] || kind;
    return TYPE_DEFINITIONS[normalized] || Object.freeze({ kind: normalized, js: "*" });
}

function mergeCarbonTypeDefinition(type)
{
    const definition = carbonTypeDefinitionForKind(type.kind);
    return Object.freeze({ ...definition, ...type, kind: definition.kind });
}

function uint8(value)
{
    return Number(value) & 0xff;
}

function int8(value)
{
    const result = uint8(value);
    return result > 0x7f ? result - 0x100 : result;
}

function uint16(value)
{
    return Number(value) & 0xffff;
}

function int16(value)
{
    const result = uint16(value);
    return result > 0x7fff ? result - 0x10000 : result;
}

function uint32(value)
{
    return Number(value) >>> 0;
}

function int32(value)
{
    return Number(value) | 0;
}

function uint64(value)
{
    return toBigInt(value, false);
}

function int64(value)
{
    return toBigInt(value, true);
}

function float32(value)
{
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

function float64(value)
{
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

function toBigInt(value, signed)
{
    let result = 0n;
    if (typeof value === "bigint") result = value;
    else if (typeof value === "number" && Number.isFinite(value)) result = BigInt(Math.trunc(value));
    else if (typeof value === "string" && value.trim()) result = BigInt(value.trim());

    // Clamp unsigned negatives but FALL THROUGH so safe-range values export
    // as ordinary numbers (an early BigInt return here leaked '0' strings
    // into values interchange - fixed 2026-07-23).
    if (!signed && result < 0n) result = 0n;

    // Safe-range 64-bit values stay ordinary numbers so a JSON round trip
    // (GetValues → SetValues) reproduces the exported representation; BigInt
    // is reserved for magnitudes JSON numbers cannot hold.
    if (result >= MIN_SAFE_BIGINT && result <= MAX_SAFE_BIGINT) return Number(result);
    return result;
}

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

const MIN_SAFE_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);

function containerDescriptor(kind, cppType)
{
    const elementCppType = extractTemplateArgument(cppType);
    return Object.freeze({
        kind,
        js: kind === CARBON_TYPE.MAP ? "Map" : kind === CARBON_TYPE.SET ? "Set" : "Array",
        cppType,
        elementType: elementCppType ? inferCarbonTypeFromCpp(elementCppType) : undefined
    });
}

function objectRefDescriptor(cppType)
{
    return Object.freeze({ ...TYPE_DEFINITIONS[CARBON_TYPE.OBJECT_REF], cppType });
}

function rawStructDescriptor(cppType)
{
    return Object.freeze({ ...TYPE_DEFINITIONS[CARBON_TYPE.RAW_STRUCT], cppType });
}

function extractTemplateArgument(cppType)
{
    const match = String(cppType || "").match(/<(.+)>/);
    return match ? match[1].trim() : null;
}

function normalizeCppType(cppType)
{
    return String(cppType || "")
        .replace(/\bconst\b/g, "")
        .replace(/&/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeCppTypeName(cppType)
{
    return normalizeCppType(cppType)
        .replace(/\s*\*+$/, "")
        .replace(/\bstd::basic_string\s*<[^>]+>/g, "std::string")
        .trim();
}

function isRotationLike(name)
{
    return /(?:^|[^A-Za-z0-9])(?:rotation|quat|quaternion)|(?:rotation|quat|quaternion)/i.test(String(name || ""));
}

function isExpressionLike(name)
{
    return /(?:^|[^A-Za-z0-9])expression(?:$|[^A-Za-z0-9])|expression/i.test(String(name || ""));
}

function normalizeMathValues(value, length, defaults)
{
    const result = Array.isArray(defaults) ? defaults.slice() : new Array(length).fill(0);
    const source = ArrayBuffer.isView(value) || Array.isArray(value) ? value : [];
    for (let i = 0; i < result.length && i < source.length; i++)
    {
        result[i] = num.float32(source[i]);
    }
    return result;
}

function formatJsNumber(value)
{
    if (Object.is(value, -0)) return "-0";
    return Number.isFinite(value) ? String(value) : "0";
}

function isSourceShapedObject(value)
{
    return Boolean(value && typeof value === "object" && typeof value._sourceClassName === "string");
}
