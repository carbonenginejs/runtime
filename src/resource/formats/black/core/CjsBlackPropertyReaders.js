import {
    CARBON_TYPE,
    normalizeCarbonTypeDescriptor
} from "#schema/types";

/**
 * Static set of read and skip routines that decode or skip individual Black
 * property values (primitives, strings, arrays, structure lists,
 * dictionaries, and binary blocks) from their type descriptors.
 */
export class CjsBlackPropertyReaders
{
    /** Reads value from the current Black object-graph reader. */
    static readValue(reader, field)
    {
        const descriptor = normalizeCarbonTypeDescriptor(field);
        if (field?.black?.beType)
        {
            return CjsBlackPropertyReaders.readBlackValue(reader, field.black, descriptor);
        }

        switch (descriptor.kind)
        {
            case CARBON_TYPE.BOOLEAN:
                return reader.ReadU8() !== 0;

            case CARBON_TYPE.STRING:
            case CARBON_TYPE.EXPRESSION:
                return reader.ReadStringRef();

            case CARBON_TYPE.PATH:
                return reader.context.TransformPath(reader.ReadStringRef());

            case CARBON_TYPE.ENUM:
                return reader.ReadI32();

            case CARBON_TYPE.FLOAT32:
                return reader.ReadF32();

            case CARBON_TYPE.FLOAT64:
                return reader.ReadF64();

            case CARBON_TYPE.INT8:
                return reader.ReadI8();

            case CARBON_TYPE.UINT8:
                return reader.ReadU8();

            case CARBON_TYPE.INT16:
                return reader.ReadI16();

            case CARBON_TYPE.UINT16:
                return reader.ReadU16();

            case CARBON_TYPE.INT32:
                return reader.ReadI32();

            case CARBON_TYPE.UINT32:
                return reader.ReadU32();

            case CARBON_TYPE.INT64:
                return reader.ReadI64();

            case CARBON_TYPE.UINT64:
                return reader.ReadU64();

            case CARBON_TYPE.VECTOR2:
                return CjsBlackPropertyReaders.readFloatArray(reader, 2);

            case CARBON_TYPE.VECTOR3:
                return CjsBlackPropertyReaders.readFloatArray(reader, 3);

            case CARBON_TYPE.VECTOR4:
            case CARBON_TYPE.COLOR:
            case CARBON_TYPE.QUATERNION:
                return CjsBlackPropertyReaders.readFloatArray(reader, 4);

            case CARBON_TYPE.MATRIX3:
                return CjsBlackPropertyReaders.readFloatArray(reader, 9);

            case CARBON_TYPE.MATRIX4:
                return CjsBlackPropertyReaders.readFloatArray(reader, 16);

            case CARBON_TYPE.ARRAY:
                return CjsBlackPropertyReaders.readArray(reader, descriptor);

            case CARBON_TYPE.TYPED_ARRAY:
                return CjsBlackPropertyReaders.readTypedArray(reader, descriptor);

            case CARBON_TYPE.STRUCT:
            case CARBON_TYPE.RAW_STRUCT:
                return reader.context.ReadEmbeddedObject(reader);

            case CARBON_TYPE.OBJECT_REF:
            case CARBON_TYPE.UNKNOWN:
            default:
                return reader.context.ReadObject(reader);
        }
    }

    /** Reads black value from the current Black object-graph reader. */
    static readBlackValue(reader, black, descriptor)
    {
        switch (black.beType)
        {
            case "IROOT":
                if (black.container === "list" && black.cppType && /StructureList/.test(String(black.cppType)))
                {
                    return CjsBlackPropertyReaders.readBlackStructureList(reader, black);
                }
                return CjsBlackPropertyReaders.readBlackIRoot(reader, black, descriptor);

            case "BOOL":
                return reader.ReadU8() !== 0;

            case "CSTRING":
            case "STDSTRING":
            case "SHAREDSTRING":
            case "REFERENCE":
                return CjsBlackPropertyReaders.readStringRef(reader, descriptor);

            case "WCSTRING":
            case "STDWSTRING":
            case "SHAREDSTRINGW":
            case "WREFERENCE":
                return reader.ReadWideStringRef();

            case "FLOAT":
                return reader.ReadF32();

            case "DOUBLE":
                return reader.ReadF64();

            case "LONG":
                return reader.ReadI32();

            case "ULONG":
                return reader.ReadU32();

            case "INT64":
                return reader.ReadI64();

            case "UINT64":
                return reader.ReadU64();

            case "BYTE":
                return black.signed ? reader.ReadI8() : reader.ReadU8();

            case "SHORT":
                return black.signed ? reader.ReadI16() : reader.ReadU16();

            case "FLOATARRAY":
                return CjsBlackPropertyReaders.readFloatArray(reader, black.length || descriptor.length || 0);

            case "BINARYBLOCK":
                return CjsBlackPropertyReaders.readBinaryBlock(reader, black);

            case "IROOTPTR":
            case "IROOTWEAKREF":
                return reader.context.ReadObject(reader);

            default:
                return CjsBlackPropertyReaders.readValueWithoutBlack(reader, descriptor);
        }
    }

    /** Advances past value in the current Black object-graph reader. */
    static skipValue(reader, field)
    {
        const descriptor = normalizeCarbonTypeDescriptor(field);
        if (field?.black?.beType)
        {
            CjsBlackPropertyReaders.skipBlackValue(reader, field.black, descriptor);
            return;
        }

        switch (descriptor.kind)
        {
            case CARBON_TYPE.BOOLEAN:
            case CARBON_TYPE.INT8:
            case CARBON_TYPE.UINT8:
                reader.Skip(1);
                return;
            case CARBON_TYPE.STRING:
            case CARBON_TYPE.PATH:
            case CARBON_TYPE.EXPRESSION:
            case CARBON_TYPE.INT16:
            case CARBON_TYPE.UINT16:
                reader.Skip(2);
                return;
            case CARBON_TYPE.ENUM:
            case CARBON_TYPE.FLOAT32:
            case CARBON_TYPE.INT32:
            case CARBON_TYPE.UINT32:
                reader.Skip(4);
                return;
            case CARBON_TYPE.FLOAT64:
            case CARBON_TYPE.INT64:
            case CARBON_TYPE.UINT64:
                reader.Skip(8);
                return;
            case CARBON_TYPE.VECTOR2:
                reader.Skip(8);
                return;
            case CARBON_TYPE.VECTOR3:
                reader.Skip(12);
                return;
            case CARBON_TYPE.VECTOR4:
            case CARBON_TYPE.COLOR:
            case CARBON_TYPE.QUATERNION:
                reader.Skip(16);
                return;
            case CARBON_TYPE.MATRIX3:
                reader.Skip(36);
                return;
            case CARBON_TYPE.MATRIX4:
                reader.Skip(64);
                return;
            case CARBON_TYPE.ARRAY:
                CjsBlackPropertyReaders.skipArray(reader, descriptor);
                return;
            case CARBON_TYPE.TYPED_ARRAY:
                CjsBlackPropertyReaders.skipTypedArray(reader);
                return;
            case CARBON_TYPE.STRUCT:
            case CARBON_TYPE.RAW_STRUCT:
                reader.context.SkipEmbeddedObject(reader);
                return;
            case CARBON_TYPE.OBJECT_REF:
            case CARBON_TYPE.UNKNOWN:
            default:
                reader.context.SkipObject(reader);
        }
    }

    /** Advances past black value in the current Black object-graph reader. */
    static skipBlackValue(reader, black, descriptor)
    {
        switch (black.beType)
        {
            case "IROOT":
                if (black.container === "list" && black.cppType && /StructureList/.test(String(black.cppType)))
                {
                    CjsBlackPropertyReaders.skipStructureList(reader);
                    return;
                }
                CjsBlackPropertyReaders.skipBlackIRoot(reader, black, descriptor);
                return;
            case "BOOL":
            case "BYTE":
                reader.Skip(1);
                return;
            case "CSTRING":
            case "STDSTRING":
            case "SHAREDSTRING":
            case "REFERENCE":
            case "WCSTRING":
            case "STDWSTRING":
            case "SHAREDSTRINGW":
            case "WREFERENCE":
            case "SHORT":
                reader.Skip(2);
                return;
            case "FLOAT":
            case "LONG":
            case "ULONG":
                reader.Skip(4);
                return;
            case "DOUBLE":
            case "INT64":
            case "UINT64":
                reader.Skip(8);
                return;
            case "FLOATARRAY":
                reader.Skip((black.length || descriptor.length || 0) * 4);
                return;
            case "BINARYBLOCK":
                CjsBlackPropertyReaders.skipBinaryBlock(reader);
                return;
            case "IROOTPTR":
            case "IROOTWEAKREF":
                reader.context.SkipObject(reader);
                return;
            default:
                CjsBlackPropertyReaders.skipValue(reader, { jsType: descriptor });
        }
    }

    /** Reads black structure list from the current Black object-graph reader. */
    static readBlackStructureList(reader, black)
    {
        return CjsBlackPropertyReaders.readStructureList(reader, {
            cppType: black.cppType,
            elementType: {
                kind: CARBON_TYPE.RAW_STRUCT,
                cppType: black.cppType
            }
        });
    }

    /**
     * Reads a schema field through the non-Black fallback decoder for the Black
     * object-graph reader.
     */
    static readValueWithoutBlack(reader, descriptor)
    {
        return CjsBlackPropertyReaders.readValue(reader, { jsType: descriptor });
    }

    /**
     * Reads a schema field whose wire value references the Black string table
     * for the Black object-graph reader.
     */
    static readStringRef(reader, descriptor)
    {
        const value = reader.ReadStringRef();
        return descriptor.kind === CARBON_TYPE.PATH ? reader.context.TransformPath(value) : value;
    }

    /**
     * Reads a nested Black root-interface value for the Black object-graph
     * reader.
     */
    static readBlackIRoot(reader, black, descriptor)
    {
        if (black.container === "dict") return CjsBlackPropertyReaders.readDict(reader);
        if (black.container === "list" || black.container === "set") return CjsBlackPropertyReaders.readArray(reader, descriptor);
        return reader.context.ReadEmbeddedObject(reader);
    }

    /**
     * Advances past a nested Black root-interface value for the Black
     * object-graph reader.
     */
    static skipBlackIRoot(reader, black, descriptor)
    {
        if (black.container === "dict")
        {
            CjsBlackPropertyReaders.skipDict(reader);
            return;
        }
        if (black.container === "list" || black.container === "set")
        {
            CjsBlackPropertyReaders.skipArray(reader, descriptor);
            return;
        }
        reader.context.SkipEmbeddedObject(reader);
    }

    /** Reads dict from the current Black object-graph reader. */
    static readDict(reader)
    {
        const count = reader.ReadU32();
        const result = {};
        for (let i = 0; i < count; i++)
        {
            result[reader.ReadStringRef()] = reader.context.ReadObject(reader);
        }
        return result;
    }

    /** Advances past dict in the current Black object-graph reader. */
    static skipDict(reader)
    {
        const count = reader.ReadU32();
        for (let i = 0; i < count; i++)
        {
            reader.Skip(2);
            reader.context.SkipObject(reader);
        }
    }

    /** Reads binary block from the current Black object-graph reader. */
    static readBinaryBlock(reader, black)
    {
        const byteLength = reader.ReadI32();
        const bytes = reader.ReadBytes(byteLength);
        if (CjsBlackPropertyReaders.isUint32IndexBufferBlock(reader, black, byteLength))
        {
            return CjsBlackPropertyReaders.readUint32Array(bytes);
        }

        return {
            $type: "black.binaryBlock",
            beType: black.beType,
            byteLength,
            bytes: Array.from(bytes)
        };
    }

    /**
     * Reports whether a binary block is tagged as a 32-bit index buffer for the
     * Black object-graph reader.
     */
    static isUint32IndexBufferBlock(reader, black, byteLength)
    {
        if (byteLength % 4 !== 0) return false;
        if (reader.context?.readMode === "document" && !reader.context?.options.decodeBinaryBlocks) return false;
        return black.name === "indexBuffer" ||
            black.fieldName === "indexBuffer" ||
            black.storageName === "indexBuffer";
    }

    /**
     * Reads a binary block as an array of unsigned 32-bit integers for the Black
     * object-graph reader.
     */
    static readUint32Array(bytes)
    {
        const result = new Uint32Array(bytes.byteLength / 4);
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        for (let i = 0; i < result.length; i++)
        {
            result[i] = view.getUint32(i * 4, true);
        }
        return result;
    }

    /** Reads array from the current Black object-graph reader. */
    static readArray(reader, descriptor)
    {
        const elementType = normalizeCarbonTypeDescriptor(descriptor.elementType);
        if (elementType.kind === CARBON_TYPE.RAW_STRUCT)
        {
            return CjsBlackPropertyReaders.readStructureList(reader, descriptor);
        }

        const count = reader.ReadU32();
        const result = [];
        for (let i = 0; i < count; i++)
        {
            if (!descriptor.elementType || elementType.kind === CARBON_TYPE.OBJECT_REF || elementType.kind === CARBON_TYPE.UNKNOWN)
            {
                result[i] = reader.context.ReadObject(reader);
            }
            else
            {
                result[i] = CjsBlackPropertyReaders.readValue(reader, { jsType: elementType });
            }
        }
        return result;
    }

    /** Advances past array in the current Black object-graph reader. */
    static skipArray(reader, descriptor)
    {
        const elementType = normalizeCarbonTypeDescriptor(descriptor.elementType);
        if (elementType.kind === CARBON_TYPE.RAW_STRUCT)
        {
            CjsBlackPropertyReaders.skipStructureList(reader);
            return;
        }

        const count = reader.ReadU32();
        for (let i = 0; i < count; i++)
        {
            if (!descriptor.elementType || elementType.kind === CARBON_TYPE.OBJECT_REF || elementType.kind === CARBON_TYPE.UNKNOWN)
            {
                reader.context.SkipObject(reader);
            }
            else
            {
                CjsBlackPropertyReaders.skipValue(reader, { jsType: elementType });
            }
        }
    }

    /** Reads float array from the current Black object-graph reader. */
    static readFloatArray(reader, count)
    {
        const result = [];
        for (let i = 0; i < count; i++)
        {
            result[i] = reader.ReadF32();
        }
        return result;
    }

    /** Reads structure list from the current Black object-graph reader. */
    static readStructureList(reader, descriptor)
    {
        const count = reader.ReadI32();
        const structureSize = reader.ReadU16();
        const bytes = reader.ReadBytes(count * structureSize);
        return {
            $type: "black.structureList",
            count,
            structureSize,
            cppType: descriptor.cppType || null,
            elementType: descriptor.elementType?.cppType || null,
            bytes: Array.from(bytes)
        };
    }

    /** Advances past structure list in the current Black object-graph reader. */
    static skipStructureList(reader)
    {
        const count = reader.ReadI32();
        const structureSize = reader.ReadU16();
        reader.Skip(count * structureSize);
    }

    /** Reads typed array from the current Black object-graph reader. */
    static readTypedArray(reader, descriptor)
    {
        const count = reader.ReadU32();
        const elementSize = reader.ReadU16();
        const bytes = reader.ReadBytes(count * elementSize);
        return {
            $type: "black.typedArray",
            count,
            elementSize,
            js: descriptor.js || null,
            bytes: Array.from(bytes)
        };
    }

    /** Advances past typed array in the current Black object-graph reader. */
    static skipTypedArray(reader)
    {
        const count = reader.ReadU32();
        const elementSize = reader.ReadU16();
        reader.Skip(count * elementSize);
    }

    /** Advances past binary block in the current Black object-graph reader. */
    static skipBinaryBlock(reader)
    {
        const byteLength = reader.ReadI32();
        reader.Skip(byteLength);
    }
}
