import { ARRAYS, arrayType, isRecord } from "../../graph/core/dataTypes.js";
import { bytes, readEnvelope, writeEnvelope } from "../../graph/core/text.js";

const TYPES = new Map(Object.values(ARRAYS).map(([Ctor, type]) => [type, Ctor]));
TYPES.set("bytes", Uint8Array);
const MAGIC = [67, 74, 83, 66];
const ENDIAN_WORD = Uint16Array.of(1);
const LITTLE_ENDIAN = new Uint8Array(ENDIAN_WORD.buffer)[0] === 1;

/** V1 has no byte-swapping or host-endianness option. */
export function requireLittleEndian()
{
    if (!LITTLE_ENDIAN) throw new TypeError("Graph binary v1 requires a little-endian host");
}

/** Arithmetic alignment avoids signed-32-bit truncation of large offsets. */
function align8(value) { return Math.ceil(value / 8) * 8; }

/** Build a binary section without per-element typed-array decoding. */
export function createBinaryWriter()
{
    requireLittleEndian();
    const bufferViews = [];
    const chunks = [];
    let length = 0;
    return {
        bufferViews,
        write(value, type)
        {
            const Ctor = TYPES.get(type);
            if (!Ctor || !ArrayBuffer.isView(value)
                || (type === "bytes" ? !(value instanceof Uint8Array) : value.constructor !== Ctor)) throw new TypeError(`Expected '${type}' typed payload`);
            const byteOffset = align8(length);
            length = byteOffset + value.byteLength;
            if (length > 0xffffffff) throw new RangeError("Binary section exceeds v1 limit");
            const index = bufferViews.length;
            bufferViews.push({ byteOffset, byteLength: value.byteLength, type, count: value.length });
            chunks.push(bytes(value));
            return index;
        },
        finish(root, format)
        {
            const json = writeEnvelope({ format, version: 1, root, bufferViews });
            if (json.byteLength > 0xffffffff) throw new RangeError("JSON section exceeds v1 limit");
            const binStart = align8(16 + json.byteLength);
            const result = new Uint8Array(binStart + length); // alloc: variable-length encoded file returned to the caller.
            result.set(MAGIC);
            const header = new DataView(result.buffer);
            header.setUint32(4, 1, true);
            header.setUint32(8, json.byteLength, true);
            header.setUint32(12, length, true);
            result.set(json, 16);
            for (let index = 0; index < chunks.length; index++) result.set(chunks[index], binStart + bufferViews[index].byteOffset);
            return result;
        }
    };
}

/** Validate framing once; bad individual views remain member-local failures when requested. */
export function openBinary(input, format)
{
    requireLittleEndian();
    const source = bytes(input);
    if (source.length < 16 || MAGIC.some((value, index) => source[index] !== value)) throw new TypeError("Invalid CJSB header");
    const header = new DataView(source.buffer, source.byteOffset, source.byteLength);
    if (header.getUint32(4, true) !== 1) throw new RangeError("Unsupported CJSB version");
    const jsonLength = header.getUint32(8, true);
    const binLength = header.getUint32(12, true);
    const binStart = align8(16 + jsonLength);
    if (binStart + binLength !== source.byteLength) throw new RangeError("CJSB section length mismatch");
    for (let index = 16 + jsonLength; index < binStart; index++)
    {
        if (source[index] !== 0) throw new TypeError("Nonzero CJSB JSON padding");
    }
    const envelope = readEnvelope(source.subarray(16, 16 + jsonLength), format);
    if (!Array.isArray(envelope.bufferViews)) throw new TypeError("Missing bufferViews");
    return {
        root: envelope.root,
        read(index, type = null)
        {
            if (!Number.isSafeInteger(index) || index < 0 || index >= envelope.bufferViews.length) throw new RangeError("Invalid bufferView index");
            const view = envelope.bufferViews[index];
            if (!isRecord(view) || !TYPES.has(view.type)) throw new TypeError("Unknown bufferView type");
            if (type !== null && view.type !== type) throw new TypeError(`bufferView type '${view.type}' does not match '${type}'`);
            const Ctor = TYPES.get(view.type);
            const { byteOffset, byteLength, count } = view;
            if (![byteOffset, byteLength, count].every(value => Number.isSafeInteger(value) && value >= 0)
                || byteOffset % 8 !== 0 || !Number.isSafeInteger(count * Ctor.BYTES_PER_ELEMENT)
                || byteLength !== count * Ctor.BYTES_PER_ELEMENT || byteOffset + byteLength > binLength)
            {
                throw new RangeError("Invalid bufferView range, alignment or count");
            }
            // A byte copy preserves bits and owns aligned storage even when the input is a slice.
            const owned = source.slice(binStart + byteOffset, binStart + byteOffset + byteLength);
            return new Ctor(owned.buffer, owned.byteOffset, count);
        }
    };
}

/** Binary's own typed-array handler never sends bulk elements through JSON scalar handlers. */
export function binaryArray(value, type, context)
{
    const [Ctor, kind] = arrayType(type);
    if (context.writing)
    {
        if (!ArrayBuffer.isView(value) || value.constructor !== Ctor) throw new TypeError(`Expected declared '${kind}' typed array`);
        return { _view: context.options.binary.write(value, kind) };
    }
    if (!isRecord(value) || Object.keys(value).length !== 1) throw new TypeError("Expected _view wrapper");
    return context.options.binary.read(value._view, kind);
}

/** Explicit typed JS payloads make class-free producer storage unambiguous. */
export function writePayload(value, binary)
{
    if (isRecord(value) && Object.hasOwn(value, "_view")) throw new TypeError("Caller-authored _view requires an owned typed payload");
    if (isRecord(value) && Object.hasOwn(value, "_custom") && Object.hasOwn(value, "bytes"))
    {
        if (Object.keys(value).length !== 2 || typeof value._custom !== "string" || !value._custom) throw new TypeError("Invalid opaque payload wrapper");
        return { _custom: value._custom, _view: binary.write(value.bytes, "bytes") };
    }
    if (!ArrayBuffer.isView(value)) return value;
    for (const [Ctor, type] of Object.values(ARRAYS))
    {
        if (value.constructor === Ctor) return { _view: binary.write(value, type) };
    }
    throw new TypeError("Unsupported binary payload view");
}
