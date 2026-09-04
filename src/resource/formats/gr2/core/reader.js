/**
 * Low-level pure-JavaScript Granny .gr2 reader.
 *
 * The reader walks Granny's embedded reflection type tree, applies pointer
 * fixups, decompresses sections through {@link decompressGr2Section}, and
 * reconstructs a shared object graph.
 */
import { decompressBitKnit2 } from "./bitknit2.js";
import { decompressOodle1 } from "./oodle1.js";

/**
 * Granny member type ids used by the reflected type tree.
 *
 * These values mirror the granny_member_type enum and are exposed for callers
 * that need to inspect raw type metadata.
 */
export const GRANNY_MEMBER_TYPES = Object.freeze({
    End: 0,
    Inline: 1,
    Reference: 2,
    ReferenceToArray: 3,
    ArrayOfReferences: 4,
    VariantReference: 5,
    UnsupportedRemove: 6,
    ReferenceToVariantArray: 7,
    String: 8,
    Transform: 9,
    Real32: 10,
    Int8: 11,
    UInt8: 12,
    BinormalInt8: 13,
    NormalUInt8: 14,
    Int16: 15,
    UInt16: 16,
    BinormalInt16: 17,
    NormalUInt16: 18,
    Int32: 19,
    UInt32: 20,
    Real16: 21,
    EmptyReference: 22
});
const M = GRANNY_MEMBER_TYPES;
/** Size in bytes of a reflected Granny transform member. */
export const GRANNY_TRANSFORM_SIZE = 68;
const TRANSFORM_SIZE = GRANNY_TRANSFORM_SIZE;

/**
 * Known GR2 file magic values mapped to their pointer size in bytes.
 *
 * The reader currently supports little-endian 32-bit and 64-bit Granny files.
 */
export const GR2_MAGICS = Object.freeze({
    "29de6cc0baa4532b25f5b7a5f666e2ee": 4,
    "e59b495e6f631f141e13eba990beedc4": 8
});
const MAGICS = GR2_MAGICS;

const HEX_BYTES = Array.from({ length: 256 }, (_, value) => value.toString(16).padStart(2, "0"));
const UTF8_DECODER = new TextDecoder("utf-8");
// Valid GState graphs in the pinned EVE corpus reach 210 unique reflected
// objects along one path. Keep a substantially higher finite guard so malformed
// input cannot exhaust the JavaScript stack while legitimate SDK-readable
// state resources remain readable.
const MAX_OBJECT_GRAPH_DEPTH = 512;

/**
 * Convert bytes to a lowercase hexadecimal string without relying on Node's Buffer.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @returns {string} Two hexadecimal characters per byte.
 */
export function bytesToHex(bytes)
{
    let out = "";
    for (let i = 0; i < bytes.length; i++) out += HEX_BYTES[bytes[i]];
    return out;
}

/**
 * Decode UTF-8 bytes using the browser and Node standard Encoding API.
 *
 * @param {Uint8Array} bytes UTF-8 encoded bytes.
 * @returns {string} Decoded text.
 */
export function decodeUtf8(bytes)
{
    return UTF8_DECODER.decode(bytes);
}

/**
 * Convert an IEEE 754 binary16 value to a JavaScript number.
 *
 * @param {number} h Unsigned 16-bit half-float bits.
 * @returns {number} Decoded floating-point value.
 */
function half2float(h)
{
    const
        s = (h & 0x8000) >> 15,
        e = (h & 0x7c00) >> 10,
        f = h & 0x03ff;
    if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
    if (e === 0x1f) return f ? NaN : (s ? -Infinity : Infinity);
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

/** Compression format id for uncompressed GR2 sections. */
export const GR2_COMPRESSION_NONE = 0;

/** Compression format id for legacy Granny Oodle0 sections. */
export const GR2_COMPRESSION_OODLE0 = 1;

/** Compression format id for legacy Granny Oodle1 sections. */
export const GR2_COMPRESSION_OODLE1 = 2;

/** Compression format id for Granny BitKnit2 sections. */
export const GR2_COMPRESSION_BITKNIT2 = 4;

/**
 * Decompress one GR2 section payload according to its section-directory format.
 *
 * @param {number} format Section compression format id.
 * @param {Uint8Array} bytes Compressed section payload.
 * @param {number} expandedSize Expected decompressed byte length.
 * @param {{first16: number, first8: number}} sec Section metadata used by Oodle1 streams.
 * @returns {Uint8Array} Raw section bytes, decompressed when needed.
 * @throws {Error} If the format is not supported or the codec rejects the stream.
 */
export function decompressGr2Section(format, bytes, expandedSize, sec)
{
    if (format === GR2_COMPRESSION_NONE) return bytes;
    if (format === GR2_COMPRESSION_OODLE0 || format === GR2_COMPRESSION_OODLE1)
        return decompressOodle1(bytes, expandedSize, { first16: sec.first16, first8: sec.first8 });
    if (format === GR2_COMPRESSION_BITKNIT2) return decompressBitKnit2(bytes, expandedSize);
    throw new Error(`section needs codec: format ${format} (0=None,2=Oodle1,4=BitKnit2)`);
}

/**
 * Reflected Granny file graph produced by the low-level reader.
 *
 * @typedef {object} RawGr2ReadResult
 * @property {number} version Granny file format revision from the file header.
 * @property {number} secCount Number of sections in the source file.
 * @property {object} fileInfo Reflected `granny_file_info` object graph with
 * references resolved to shared JavaScript objects.
 */

/**
 * Parse raw `.gr2` bytes into the reflected Granny object graph.
 *
 * This is the low-level reader used by the package entry point. It decompresses
 * sections, applies pointer fixups, walks the embedded type tree, and preserves
 * pointer identity for repeated references in the resulting object graph.
 *
 * @param {Uint8Array|Buffer} buf Raw `.gr2` file bytes.
 * @returns {RawGr2ReadResult} Parsed Granny file metadata and object graph.
 * @throws {Error} If the file magic, compression format, or reflected graph is
 * unsupported or malformed.
 */
export function readGr2Raw(buf)
{
    const dv0 = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    /**
     * Read a little-endian uint32 from the original file bytes.
     *
     * @param {number} o Byte offset in the file buffer.
     * @returns {number} Unsigned 32-bit integer.
     */
    const
        fu32 = o => dv0.getUint32(o, true),
        magic = bytesToHex(buf.subarray(0, 16)),
        P = MAGICS[magic];

    if (!P) throw new Error("unknown gr2 magic " + magic);

    const
        MEMBER_DEF_SIZE = 20 + 3 * P,
        H = 32,
        version = fu32(H),
        secBase = H + fu32(H + 12),
        secCount = fu32(H + 16),
        rootTypeSec = fu32(H + 20),
        rootTypeOff = fu32(H + 24),
        rootObjSec = fu32(H + 28),
        rootObjOff = fu32(H + 32);

    const secs = [];
    for (let i = 0; i < secCount; i++)
    {
        const b = secBase + i * 44;
        secs.push({
            format: fu32(b), dataOffset: fu32(b + 4), dataSize: fu32(b + 8), expandedSize: fu32(b + 12),
            first16: fu32(b + 20), first8: fu32(b + 24),
            pFixOff: fu32(b + 28), pFixCnt: fu32(b + 32)
        });
    }

    const sectionBase = new Array(secCount);
    let total = 0;
    const datas = secs.map(s =>
    {
        const raw = buf.subarray(s.dataOffset, s.dataOffset + s.dataSize);
        return decompressGr2Section(s.format, raw, s.expandedSize, s);
    });

    for (let i = 0; i < secCount; i++)
    {
        sectionBase[i] = total;
        total += secs[i].expandedSize;
    }

    const mem = new Uint8Array(total);
    for (let i = 0; i < secCount; i++)
    {
        mem.set(datas[i], sectionBase[i]);
    }

    const dv = new DataView(mem.buffer);

    /**
     * Read a little-endian uint32 from the relocated section memory.
     *
     * @param {number} o Byte offset in relocated section memory.
     * @returns {number} Unsigned 32-bit integer.
     */
    const u32 = o => dv.getUint32(o, true);

    /**
     * Read a little-endian int32 from the relocated section memory.
     *
     * @param {number} o Byte offset in relocated section memory.
     * @returns {number} Signed 32-bit integer.
     */
    const i32 = o => dv.getInt32(o, true);

    /**
     * Read a little-endian float32 from the relocated section memory.
     *
     * @param {number} o Byte offset in relocated section memory.
     * @returns {number} Float32 value widened to a JavaScript number.
     */
    const f32 = o => dv.getFloat32(o, true);

    const reloc = new Map();
    for (let i = 0; i < secCount; i++)
    {
        const s = secs[i];
        if (s.pFixCnt === 0) continue;

        let rel;
        if (s.format === 4)
        {
            const csz = fu32(s.pFixOff);
            rel = decompressBitKnit2(buf.subarray(s.pFixOff + 4, s.pFixOff + 4 + csz), s.pFixCnt * 12);
        }
        else
        {
            rel = buf.subarray(s.pFixOff, s.pFixOff + s.pFixCnt * 12);
        }

        const rdv = new DataView(rel.buffer, rel.byteOffset, rel.byteLength);
        for (let k = 0; k < s.pFixCnt; k++)
        {
            const
                b = k * 12,
                from = rdv.getUint32(b, true),
                toSec = rdv.getUint32(b + 4, true),
                toOff = rdv.getUint32(b + 8, true);
            reloc.set(sectionBase[i] + from, sectionBase[toSec] + toOff);
        }
    }

    const NULL = -1;

    /**
     * Resolve a relocated pointer field from a global section-memory offset.
     *
     * @param {number} g Global offset of the pointer field.
     * @returns {number} Global target offset, or the null sentinel when absent.
     */
    const ptr = g => (reloc.has(g) ? reloc.get(g) : NULL);

    /**
     * Read a null-terminated UTF-8 string from relocated section memory.
     *
     * @param {number} g Global string offset, or the null sentinel.
     * @returns {string|null} Decoded string, or null for absent references.
     */
    function readString(g)
    {
        if (g < 0) return null;
        let end = g;
        while (end < mem.length && mem[end] !== 0) end++;
        return decodeUtf8(mem.subarray(g, end));
    }

    const typeCache = new Map();

    /**
     * Read and cache a reflected Granny type definition.
     *
     * @param {number} g Global offset of the first member definition.
     * @returns {{type: number, name: string|null, refType: number, arrayWidth: number}[]} Member descriptors.
     */
    function readType(g)
    {
        if (typeCache.has(g)) return typeCache.get(g);
        const members = [];
        let t = g;

        while (true)
        {
            const type = u32(t);
            if (type === M.End) break;
            members.push({
                type,
                name: readString(ptr(t + 4)),
                refType: ptr(t + 4 + P),
                arrayWidth: i32(t + 4 + 2 * P)
            });
            t += MEMBER_DEF_SIZE;
            if (members.length > 4096) throw new Error("type member overflow");
        }

        typeCache.set(g, members);
        return members;
    }

    const sizeCache = new Map();

    /**
     * Compute the byte size of an object for a reflected Granny type.
     *
     * @param {number} typeOff Global type-definition offset.
     * @returns {number} Object size in bytes.
     */
    function objectSize(typeOff)
    {
        if (sizeCache.has(typeOff)) return sizeCache.get(typeOff);
        sizeCache.set(typeOff, 0);

        let sz = 0;
        for (const m of readType(typeOff))
        {
            sz += memberSize(m);
        }

        sizeCache.set(typeOff, sz);
        return sz;
    }

    /**
     * Compute the byte width of one reflected member.
     *
     * @param {{type: number, refType: number, arrayWidth: number}} m Member descriptor.
     * @returns {number} Member size in bytes.
     */
    function memberSize(m)
    {
        const w = m.arrayWidth > 0 ? m.arrayWidth : 1;
        switch (m.type)
        {
            case M.Inline:
                return objectSize(m.refType) * w;

            case M.Reference:
            case M.String:
                return P;

            case M.EmptyReference:
                return 4;

            case M.ReferenceToArray:
            case M.ArrayOfReferences:
                return 4 + P;

            case M.VariantReference:
                return 2 * P;

            case M.ReferenceToVariantArray:
                return 2 * P + 4;

            case M.Transform:
                return TRANSFORM_SIZE;

            case M.Real32:
            case M.Int32:
            case M.UInt32:
                return 4 * w;

            case M.Int16:
            case M.UInt16:
            case M.BinormalInt16:
            case M.NormalUInt16:
            case M.Real16:
                return 2 * w;

            case M.Int8:
            case M.UInt8:
            case M.BinormalInt8:
            case M.NormalUInt8:
                return 1 * w;

            default:
                return 0;
        }
    }

    const layoutCache = new Map();

    /**
     * Compute and cache the fixed per-member byte layout of a reflected type.
     *
     * Granny types are static structural definitions, so every instance of a
     * given type has an identical member layout; this only needs to run once
     * per type instead of once per object instance (as recomputing offsets
     * with {@link memberSize} inside {@link readObject} would).
     *
     * @param {number} typeOff Global type-definition offset.
     * @returns {{members: object[], offsets: number[]}} Cached member list and
     * each member's byte offset relative to the start of the object.
     */
    function typeLayout(typeOff)
    {
        if (layoutCache.has(typeOff)) return layoutCache.get(typeOff);

        const
            members = readType(typeOff),
            offsets = new Array(members.length);
        let size = 0;
        for (let i = 0; i < members.length; i++)
        {
            offsets[i] = size;
            size += memberSize(members[i]);
        }

        const layout = { members, offsets };
        layoutCache.set(typeOff, layout);
        return layout;
    }

    /**
     * Byte stride between consecutive elements of a fixed-width numeric member type.
     *
     * @param {number} type Granny member type id.
     * @returns {number} Element stride in bytes.
     */
    function numericStride(type)
    {
        switch (type)
        {
            case M.Real32:
            case M.Int32:
            case M.UInt32:
                return 4;

            case M.Int16:
            case M.UInt16:
            case M.BinormalInt16:
            case M.NormalUInt16:
            case M.Real16:
                return 2;

            default: // Int8, UInt8, BinormalInt8, NormalUInt8
                return 1;
        }
    }

    /**
     * Read one fixed-width numeric value from relocated memory.
     *
     * @param {number} type Granny member type id.
     * @param {number} o Global byte offset of the value.
     * @returns {number} Decoded value.
     */
    function numericAt(type, o)
    {
        switch (type)
        {
            case M.Real32:
                return f32(o);

            case M.Int32:
                return i32(o);

            case M.UInt32:
                return u32(o);

            case M.Int16:
            case M.BinormalInt16:
                return dv.getInt16(o, true);

            case M.UInt16:
            case M.NormalUInt16:
                return dv.getUint16(o, true);

            case M.Real16:
                return half2float(dv.getUint16(o, true));

            case M.Int8:
            case M.BinormalInt8:
                return dv.getInt8(o);

            case M.UInt8:
            case M.NormalUInt8:
                return mem[o];
        }
    }

    /**
     * Read a scalar or fixed-width numeric member from relocated memory.
     *
     * @param {{type: number, arrayWidth: number}} m Numeric member descriptor.
     * @param {number} off Global offset of the numeric field.
     * @returns {number|number[]} Decoded scalar or array.
     */
    function numeric(m, off)
    {
        const w = m.arrayWidth > 0 ? m.arrayWidth : 1;
        if (w === 1) return numericAt(m.type, off);

        const
            stride = numericStride(m.type),
            out = new Array(w);
        for (let i = 0; i < w; i++)
        {
            out[i] = numericAt(m.type, off + i * stride);
        }
        return out;
    }

    /**
     * Read a Granny transform struct from relocated memory.
     *
     * @param {number} o Global offset of the transform bytes.
     * @returns {{flags: number, position: number[], orientation: number[], scaleShear: number[]}} Decoded transform.
     */
    function readTransform(o)
    {
        return {
            flags: u32(o),
            position: [ f32(o + 4), f32(o + 8), f32(o + 12) ],
            orientation: [ f32(o + 16), f32(o + 20), f32(o + 24), f32(o + 28) ],
            scaleShear: [ f32(o + 32), f32(o + 36), f32(o + 40), f32(o + 44), f32(o + 48),
                f32(o + 52), f32(o + 56), f32(o + 60), f32(o + 64) ]
        };
    }

    let depth = 0;
    const objCache = new Map(); // typeOff -> Map<objOff, object>

    /**
     * Read a reflected object graph node, preserving pointer identity and cycles.
     *
     * @param {number} typeOff Global type-definition offset.
     * @param {number} objOff Global object-data offset.
     * @returns {object|null} Decoded object, or null for absent references.
     */
    function readObject(typeOff, objOff)
    {
        if (typeOff < 0 || objOff < 0) return null;

        let byOff = objCache.get(typeOff);
        if (byOff === undefined)
        {
            byOff = new Map();
            objCache.set(typeOff, byOff);
        }
        else
        {
            const cached = byOff.get(objOff);
            if (cached !== undefined) return cached;
        }

        if (++depth > MAX_OBJECT_GRAPH_DEPTH) { depth--; throw new Error("recursion too deep"); }

        const obj = {};
        byOff.set(objOff, obj);
        const { members, offsets } = typeLayout(typeOff);
        for (let idx = 0; idx < members.length; idx++)
        {
            const
                m = members[idx],
                field = objOff + offsets[idx];
            let name = m.name || "_";

            if (Object.prototype.hasOwnProperty.call(obj, name))
            {
                let n = 2;
                while (Object.prototype.hasOwnProperty.call(obj, name + " " + n)) n++;
                name = name + " " + n;
            }
            switch (m.type)
            {
                case M.String:
                    obj[name] = readString(ptr(field));
                    break;

                case M.Reference:
                    obj[name] = readObject(m.refType, ptr(field));
                    break;

                case M.Transform:
                    obj[name] = readTransform(field);
                    break;

                case M.Inline: {
                    const
                        w = m.arrayWidth > 0 ? m.arrayWidth : 1,
                        os = objectSize(m.refType);
                    if (m.arrayWidth > 1)
                    {
                        obj[name] = [];
                        for (let i = 0; i < w; i++)
                        {
                            obj[name].push(readObject(m.refType, field + i * os));
                        }
                    }
                    else
                    {
                        obj[name] = readObject(m.refType, field);
                    }
                    break;
                }

                case M.ReferenceToArray: {
                    const
                        count = i32(field),
                        p = ptr(field + 4),
                        os = objectSize(m.refType),
                        a = [];
                    for (let i = 0; i < count; i++)
                    {
                        a.push(readObject(m.refType, p + i * os));
                    }
                    obj[name] = a;
                    break;
                }

                case M.ArrayOfReferences: {
                    const
                        count = i32(field),
                        p = ptr(field + 4),
                        a = [];
                    for (let i = 0; i < count; i++)
                    {
                        a.push(readObject(m.refType, ptr(p + i * P)));
                    }
                    obj[name] = a;
                    break;
                }

                case M.VariantReference:
                    obj[name] = readObject(ptr(field), ptr(field + P));
                    break;

                case M.ReferenceToVariantArray: {
                    const
                        vt = ptr(field),
                        count = i32(field + P),
                        p = ptr(field + P + 4),
                        a = [],
                        os = vt >= 0 ? objectSize(vt) : 0;
                    for (let i = 0; i < count; i++)
                    {
                        a.push(readObject(vt, p + i * os));
                    }

                    if (vt >= 0) Object.defineProperty(a, "__type", { value: readType(vt), enumerable: false });
                    obj[name] = a;
                    break;
                }

                case M.Real32:
                case M.Int8:
                case M.UInt8:
                case M.BinormalInt8:
                case M.NormalUInt8:
                case M.Int16:
                case M.UInt16:
                case M.BinormalInt16:
                case M.NormalUInt16:
                case M.Int32:
                case M.UInt32:
                case M.Real16:
                    obj[name] = numeric(m, field);
                    break;

                default:
                    obj[name] = null;
            }
        }
        depth--;
        return obj;
    }

    const
        rootTypeG = sectionBase[rootTypeSec] + rootTypeOff,
        rootObjG = sectionBase[rootObjSec] + rootObjOff,
        fileInfo = readObject(rootTypeG, rootObjG);
    return { version, secCount, fileInfo };
}

/** Alias for {@link readGr2Raw} when importing from reader.js directly. */
export const readGr2 = readGr2Raw;

/**
 * Frozen convenience namespace for low-level GR2 reader helpers.
 *
 * The same constants and functions are also exported directly from reader.js.
 */
export const reader = Object.freeze({
    MEMBER_TYPES: GRANNY_MEMBER_TYPES,
    TRANSFORM_SIZE: GRANNY_TRANSFORM_SIZE,
    MAGICS: GR2_MAGICS,
    COMPRESSION_NONE: GR2_COMPRESSION_NONE,
    COMPRESSION_OODLE0: GR2_COMPRESSION_OODLE0,
    COMPRESSION_OODLE1: GR2_COMPRESSION_OODLE1,
    COMPRESSION_BITKNIT2: GR2_COMPRESSION_BITKNIT2,
    read: readGr2Raw,
    readRaw: readGr2Raw,
    readGr2Raw,
    decompressSection: decompressGr2Section,
    decompressGr2Section
});
