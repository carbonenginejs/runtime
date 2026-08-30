import { CjsByteWriter } from "../../../format/CjsByteWriter.js";
import { CjsFormatWriteError } from "../../../format/CjsFormatError.js";
import { GRANNY_MEMBER_TYPES } from "./reader.js";

const M = GRANNY_MEMBER_TYPES;
const MAGIC_32_LE = new Uint8Array([
    0x29, 0xde, 0x6c, 0xc0, 0xba, 0xa4, 0x53, 0x2b,
    0x25, 0xf5, 0xb7, 0xa5, 0xf6, 0x66, 0xe2, 0xee
]);
const MEMBER_SIZE = 32;
const FILE_HEADER_OFFSET = 32;
const SECTION_DIRECTORY_OFFSET = 104;
const SECTION_RECORD_SIZE = 44;
const TYPE_TAG_2_12 = 0x80000039;
const UTF8 = new TextEncoder();

function align(value, alignment)
{
    return Math.ceil(value / alignment) * alignment;
}

function bytesWith(size, write)
{
    const bytes = new Uint8Array(size);
    write(new DataView(bytes.buffer));
    return bytes;
}

function crc32(bytes, start = 0)
{
    let crc = 0xffffffff;
    for (let index = start; index < bytes.length; index++)
    {
        crc ^= bytes[index];
        for (let bit = 0; bit < 8; bit++)
        {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function primitiveSize(type)
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

        case M.Int8:
        case M.UInt8:
        case M.BinormalInt8:
        case M.NormalUInt8:
            return 1;

        default:
            return 0;
    }
}

function memberSize(member, sizeOf)
{
    const width = member.arrayWidth > 0 ? member.arrayWidth : 1;
    switch (member.type)
    {
        case M.Inline:
            return sizeOf(member.ref) * width;

        case M.Reference:
        case M.String:
            return 4;

        case M.EmptyReference:
            return 4;

        case M.ReferenceToArray:
        case M.ArrayOfReferences:
            return 8;

        case M.VariantReference:
            return 8;

        case M.ReferenceToVariantArray:
            return 12;

        case M.Transform:
            return 68;

        default:
            return primitiveSize(member.type) * width;
    }
}

/** Define one reflected Granny type used by the pure-JavaScript writer. */
export function gr2Type(name, members)
{
    return { name, members: members.map((member) => ({
        arrayWidth: 0,
        ref: null,
        ...member
    })) };
}

/** Wrap a dynamic object or array with its reflected Granny type. */
export function gr2Variant(type, value)
{
    return { type, value };
}

/** Serializes one reflected Granny object graph into relocatable section data. */
class SectionSerializer
{
    /** Create a serializer for a closed set of reflected types. */
    constructor(types)
    {
        this.types = types;
        this.writer = new CjsByteWriter();
        this.typeOffsets = new Map();
        this.stringOffsets = new Map();
        this.objectOffsets = new Map();
        this.sizeCache = new Map();
        this.fixups = [];
        this.mixedFixups = [];
    }

    /** Serialize the root graph and return section bytes plus relocation metadata. */
    Serialize(rootType, root)
    {
        for (const type of this.types)
        {
            this.typeOffsets.set(type, this.Allocate((type.members.length + 1) * MEMBER_SIZE));
        }
        for (const type of this.types) this.WriteType(type);
        const rootOffset = this.WriteObject(rootType, root);
        this.Align(4);
        this.fixups.sort((a, b) => a.from - b.from);
        this.mixedFixups.sort((a, b) => a.offset - b.offset);
        return {
            bytes: this.writer.toBytes(),
            fixups: this.fixups,
            mixedFixups: this.mixedFixups,
            rootTypeOffset: this.TypeOffset(rootType),
            rootOffset
        };
    }

    /** Advance the section cursor to the requested byte alignment. */
    Align(alignment)
    {
        const size = align(this.writer.length, alignment) - this.writer.length;
        if (size) this.writer.reserve(size);
    }

    /** Allocate a four-byte-aligned zeroed section block. */
    Allocate(size)
    {
        this.Align(4);
        return this.writer.reserve(size);
    }

    /** Resolve the section offset of a registered reflected type. */
    TypeOffset(type)
    {
        const offset = this.typeOffsets.get(type);
        if (offset === undefined)
        {
            throw new CjsFormatWriteError(`GR2 writer did not register reflected type "${type?.name ?? ""}"`);
        }
        return offset;
    }

    /** Compute the tightly packed 32-bit object size of a reflected type. */
    ObjectSize(type)
    {
        if (this.sizeCache.has(type)) return this.sizeCache.get(type);
        this.sizeCache.set(type, 0);
        let size = 0;
        for (const member of type.members) size += memberSize(member, (ref) => this.ObjectSize(ref));
        this.sizeCache.set(type, size);
        return size;
    }

    /** Record a non-null pointer relocation. */
    FixPointer(from, target)
    {
        if (target === null || target === undefined) return;
        this.fixups.push({ from, target });
    }

    /** Patch a signed 16-bit section value. */
    PatchI16(offset, value)
    {
        this.writer.patchBytes(offset, bytesWith(2, view => view.setInt16(0, value | 0, true)));
    }

    /** Patch an unsigned 16-bit section value. */
    PatchU16(offset, value)
    {
        this.writer.patchBytes(offset, bytesWith(2, view => view.setUint16(0, value & 0xffff, true)));
    }

    /** Patch a float32 section value. */
    PatchF32(offset, value)
    {
        this.writer.patchBytes(offset, bytesWith(4, view => view.setFloat32(0, Number(value) || 0, true)));
    }

    /** Deduplicate and write a null-terminated UTF-8 string. */
    WriteString(value)
    {
        const text = String(value ?? "");
        if (this.stringOffsets.has(text)) return this.stringOffsets.get(text);
        const encoded = UTF8.encode(text);
        const offset = this.writer.reserve(encoded.length + 1);
        this.writer.patchBytes(offset, encoded);
        this.stringOffsets.set(text, offset);
        return offset;
    }

    /** Write one reflected member-definition array. */
    WriteType(type)
    {
        const base = this.TypeOffset(type);
        for (let index = 0; index < type.members.length; index++)
        {
            const member = type.members[index];
            const offset = base + index * MEMBER_SIZE;
            this.writer.patchU32(offset, member.type);
            this.FixPointer(offset + 4, this.WriteString(member.name));
            if (member.ref) this.FixPointer(offset + 8, this.TypeOffset(member.ref));
            this.writer.patchU32(offset + 12, member.arrayWidth >>> 0);
        }
    }

    /** Get the identity cache for one reflected object type. */
    ObjectMap(type)
    {
        let map = this.objectOffsets.get(type);
        if (!map)
        {
            map = new WeakMap();
            this.objectOffsets.set(type, map);
        }
        return map;
    }

    /** Write or reuse one referenced object. */
    WriteObject(type, value)
    {
        if (value === null || value === undefined) return null;
        if (typeof value === "object")
        {
            const map = this.ObjectMap(type);
            if (map.has(value)) return map.get(value);
            const offset = this.Allocate(this.ObjectSize(type));
            map.set(value, offset);
            this.WriteObjectAt(type, value, offset);
            return offset;
        }
        const offset = this.Allocate(this.ObjectSize(type));
        this.WriteObjectAt(type, value, offset);
        return offset;
    }

    /** Resolve a member value, including scalar-wrapper shorthand. */
    MemberValue(type, value, member)
    {
        if (value && typeof value === "object" && Object.hasOwn(value, member.name)) return value[member.name];
        if (type.members.length === 1 && primitiveSize(member.type)) return value;
        return undefined;
    }

    /** Write an object into an already allocated section block. */
    WriteObjectAt(type, value, base)
    {
        let offset = base;
        for (const member of type.members)
        {
            this.WriteMember(member, this.MemberValue(type, value, member), offset);
            offset += memberSize(member, (ref) => this.ObjectSize(ref));
        }
    }

    /** Write a contiguous reflected object array. */
    WriteArray(type, values)
    {
        if (!values.length) return null;
        const stride = this.ObjectSize(type);
        const offset = this.Allocate(stride * values.length);
        for (let index = 0; index < values.length; index++)
        {
            this.WriteObjectAt(type, values[index], offset + index * stride);
        }
        return offset;
    }

    /** Write a contiguous array of relocated object pointers. */
    WriteReferences(type, values)
    {
        if (!values.length) return null;
        const offset = this.Allocate(values.length * 4);
        for (let index = 0; index < values.length; index++)
        {
            this.FixPointer(offset + index * 4, this.WriteObject(type, values[index]));
        }
        return offset;
    }

    /** Encode one member according to its reflected Granny member type. */
    WriteMember(member, value, offset)
    {
        switch (member.type)
        {
            case M.Inline: {
                const width = member.arrayWidth > 0 ? member.arrayWidth : 1;
                const values = width === 1 ? [ value ?? {} ] : value ?? [];
                const stride = this.ObjectSize(member.ref);
                for (let index = 0; index < width; index++)
                {
                    this.WriteObjectAt(member.ref, values[index] ?? {}, offset + index * stride);
                }
                return;
            }

            case M.Reference:
                this.FixPointer(offset, this.WriteObject(member.ref, value));
                return;

            case M.String:
                if (value !== null && value !== undefined) this.FixPointer(offset, this.WriteString(value));
                return;

            case M.ReferenceToArray: {
                const values = Array.isArray(value) ? value : [];
                this.writer.patchU32(offset, values.length);
                this.FixPointer(offset + 4, this.WriteArray(member.ref, values));
                return;
            }

            case M.ArrayOfReferences: {
                const values = Array.isArray(value) ? value : [];
                this.writer.patchU32(offset, values.length);
                this.FixPointer(offset + 4, this.WriteReferences(member.ref, values));
                return;
            }

            case M.VariantReference:
                if (value)
                {
                    const target = this.WriteObject(value.type, value.value);
                    this.FixPointer(offset, this.TypeOffset(value.type));
                    this.FixPointer(offset + 4, target);
                    this.mixedFixups.push({ count: 1, offset: target, typeOffset: this.TypeOffset(value.type) });
                }
                return;

            case M.ReferenceToVariantArray:
                if (value)
                {
                    const values = Array.isArray(value.value) ? value.value : [];
                    const target = this.WriteArray(value.type, values);
                    this.FixPointer(offset, this.TypeOffset(value.type));
                    this.writer.patchU32(offset + 4, values.length);
                    this.FixPointer(offset + 8, target);
                    if (values.length)
                    {
                        this.mixedFixups.push({ count: values.length, offset: target, typeOffset: this.TypeOffset(value.type) });
                    }
                }
                return;

            case M.Transform:
                this.WriteTransform(offset, value);
                return;

            case M.EmptyReference:
                return;

            default:
                this.WriteNumeric(member, value, offset);
        }
    }

    /** Encode Granny's fixed 68-byte transform value. */
    WriteTransform(offset, value = {})
    {
        const
            position = value?.position ?? value?.Position ?? [ 0, 0, 0 ],
            orientation = value?.orientation ?? value?.Orientation ?? [ 0, 0, 0, 1 ],
            scaleShear = value?.scaleShear ?? value?.ScaleShear ?? [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ];
        this.writer.patchU32(offset, value?.flags ?? value?.Flags ?? 7);
        let cursor = offset + 4;
        for (const component of position) { this.PatchF32(cursor, component); cursor += 4; }
        for (const component of orientation) { this.PatchF32(cursor, component); cursor += 4; }
        for (const component of scaleShear) { this.PatchF32(cursor, component); cursor += 4; }
    }

    /** Encode a scalar or fixed-width numeric member. */
    WriteNumeric(member, value, offset)
    {
        const width = member.arrayWidth > 0 ? member.arrayWidth : 1;
        const values = width === 1 ? [ value ?? 0 ] : value ?? [];
        const stride = primitiveSize(member.type);
        for (let index = 0; index < width; index++)
        {
            const item = values[index] ?? 0;
            switch (member.type)
            {
                case M.Real32:
                    this.PatchF32(offset + index * stride, item);
                    break;

                case M.Int32:
                    this.writer.patchBytes(offset + index * stride,
                        bytesWith(4, view => view.setInt32(0, item | 0, true)));
                    break;

                case M.UInt32:
                    this.writer.patchU32(offset + index * stride, item);
                    break;

                case M.Int16:
                case M.BinormalInt16:
                    this.PatchI16(offset + index * stride, item);
                    break;

                case M.UInt16:
                case M.NormalUInt16:
                case M.Real16:
                    this.PatchU16(offset + index * stride, item);
                    break;

                case M.Int8:
                case M.BinormalInt8:
                    this.writer.patchU8(offset + index, item);
                    break;

                case M.UInt8:
                case M.NormalUInt8:
                    this.writer.patchU8(offset + index, item);
                    break;

                default:
                    throw new CjsFormatWriteError(`GR2 writer cannot encode member type ${member.type}`);
            }
        }
    }
}

/** Serialize one standard reflected graph as a canonical 32-bit little-endian GR2 file. */
export function writeGr2Container(rootType, root, types)
{
    const section = new SectionSerializer(types).Serialize(rootType, root);
    const headerSize = SECTION_DIRECTORY_OFFSET + SECTION_RECORD_SIZE;
    const pointerFixupOffset = headerSize + section.bytes.length;
    const mixedFixupOffset = pointerFixupOffset + section.fixups.length * 12;
    const writer = new CjsByteWriter(mixedFixupOffset + section.mixedFixups.length * 16);
    writer.reserve(headerSize);
    writer.bytes(section.bytes);
    for (const fixup of section.fixups)
    {
        writer.u32(fixup.from);
        writer.u32(0);
        writer.u32(fixup.target);
    }
    for (const fixup of section.mixedFixups)
    {
        writer.u32(fixup.count);
        writer.u32(fixup.offset);
        writer.u32(0);
        writer.u32(fixup.typeOffset);
    }

    const totalSize = writer.length;
    writer.patchBytes(0, MAGIC_32_LE);
    writer.patchU32(16, headerSize);
    writer.patchU32(FILE_HEADER_OFFSET, 7);
    writer.patchU32(FILE_HEADER_OFFSET + 4, totalSize);
    writer.patchU32(FILE_HEADER_OFFSET + 12, SECTION_DIRECTORY_OFFSET - FILE_HEADER_OFFSET);
    writer.patchU32(FILE_HEADER_OFFSET + 16, 1);
    writer.patchU32(FILE_HEADER_OFFSET + 20, 0);
    writer.patchU32(FILE_HEADER_OFFSET + 24, section.rootTypeOffset);
    writer.patchU32(FILE_HEADER_OFFSET + 28, 0);
    writer.patchU32(FILE_HEADER_OFFSET + 32, section.rootOffset);
    writer.patchU32(FILE_HEADER_OFFSET + 36, TYPE_TAG_2_12);

    writer.patchU32(SECTION_DIRECTORY_OFFSET, 0);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 4, headerSize);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 8, section.bytes.length);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 12, section.bytes.length);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 16, 4);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 28, section.fixups.length ? pointerFixupOffset : 0);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 32, section.fixups.length);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 36, section.mixedFixups.length ? mixedFixupOffset : 0);
    writer.patchU32(SECTION_DIRECTORY_OFFSET + 40, section.mixedFixups.length);

    const bytes = writer.toBytes();
    new DataView(bytes.buffer).setUint32(FILE_HEADER_OFFSET + 8, crc32(bytes, SECTION_DIRECTORY_OFFSET), true);
    return bytes;
}

export const container = {
    MAGIC_32_LE,
    TYPE_TAG_2_12,
    crc32,
    gr2Type,
    gr2Variant,
    write: writeGr2Container,
    writeGr2Container
};
