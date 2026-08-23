import { sha256Utf8 } from "../../../../format/effect/sha256.js";

export { sha256Utf8 };

function encodeString(value, parts)
{
    parts.push("s", `${value.length}`, ":", value, ";");
}

function propertyKeyRecord(key)
{
    if (typeof key === "string") return `s${key.length}:${key}`;
    return `y${String(key).length}:${String(key)}`;
}

function objectKind(value)
{
    if (Array.isArray(value)) return "array";
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype) return "object";
    if (prototype === null) return "null-prototype";
    return "foreign-prototype";
}

function encodeDescriptor(descriptor, parts, seen, transform = null)
{
    if (!descriptor)
    {
        parts.push("missing;");
        return;
    }
    if (!Object.hasOwn(descriptor, "value"))
    {
        parts.push("accessor;");
        return;
    }
    parts.push("data:");
    if (transform) transform(descriptor.value, parts, seen);
    else encodeValue(descriptor.value, parts, seen);
}

function sortedKeys(value, omitted = null)
{
    return Reflect.ownKeys(value)
        .filter((key) => !omitted?.has(key))
        .map((key) => ({ key, record: propertyKeyRecord(key) }))
        .sort((left, right) =>
            left.record < right.record ? -1 : left.record > right.record ? 1 : 0);
}

function encodeObject(
    value,
    parts,
    seen,
    omitted = null,
    transformProperty = null)
{
    if (seen.has(value))
    {
        throw new TypeError("Exact semantic records must be acyclic");
    }
    seen.add(value);
    const kind = objectKind(value);
    parts.push("o", `${kind.length}`, ":", kind, "{");
    const keys = sortedKeys(value, omitted);
    parts.push(`${keys.length}`, ":");
    for (const { key, record } of keys)
    {
        parts.push("k", record, "=");
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        const transform = transformProperty
            ? transformProperty(key)
            : null;
        encodeDescriptor(descriptor, parts, seen, transform);
    }
    parts.push("}");
    seen.delete(value);
}

function encodeValue(value, parts, seen)
{
    if (value === undefined) parts.push("undefined;");
    else if (value === null) parts.push("null;");
    else if (typeof value === "boolean")
    {
        parts.push(value ? "boolean:true;" : "boolean:false;");
    }
    else if (typeof value === "number")
    {
        if (Number.isNaN(value)) parts.push("number:NaN;");
        else if (Object.is(value, -0)) parts.push("number:-0;");
        else if (value === Number.POSITIVE_INFINITY)
        {
            parts.push("number:+Infinity;");
        }
        else if (value === Number.NEGATIVE_INFINITY)
        {
            parts.push("number:-Infinity;");
        }
        else parts.push("number:", `${value}`, ";");
    }
    else if (typeof value === "string") encodeString(value, parts);
    else if (typeof value === "bigint")
    {
        parts.push("bigint:", value.toString(), ";");
    }
    else if (typeof value === "symbol")
    {
        parts.push("symbol:", propertyKeyRecord(value), ";");
    }
    else if (typeof value === "function") parts.push("function;");
    else encodeObject(value, parts, seen);
}

function encodeInstruction(instruction, parts, seen)
{
    if (!instruction || typeof instruction !== "object")
    {
        encodeValue(instruction, parts, seen);
        return;
    }
    encodeObject(
        instruction,
        parts,
        seen,
        new Set([ "dataflow", "typeInfo" ]));
}

function instructionTransform(key)
{
    return typeof key === "string" && /^\d+$/u.test(key)
        ? encodeInstruction
        : null;
}

function encodeInstructions(value, parts, seen)
{
    if (!Array.isArray(value))
    {
        encodeValue(value, parts, seen);
        return;
    }
    encodeObject(value, parts, seen, null, instructionTransform);
}

/**
 * Produces the lossless semantic digest used only by the particle-emitter
 * exact profile. Source labels and derived CFG/SSA/type annotations are
 * deliberately excluded.
 *
 * @param {object} program CJS shader IR candidate.
 * @returns {string} Lower-case SHA-256 digest.
 */
export function particleEmitSemanticDigest(program)
{
    const parts = [ "particle-emit-semantic-profile:1{" ];
    const seen = new WeakSet();
    if (!program || typeof program !== "object")
    {
        encodeValue(program, parts, seen);
    }
    else
    {
        encodeObject(
            program,
            parts,
            seen,
            new Set([ "source", "blocks", "controlFlow", "values" ]),
            (key) => key === "instructions" ? encodeInstructions : null);
    }
    parts.push("}");
    return sha256Utf8(parts.join(""));
}
