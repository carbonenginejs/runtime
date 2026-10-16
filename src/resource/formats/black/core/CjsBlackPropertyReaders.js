import { BLUELISTEVENT } from "#consts/blue";
import { CjsSchema } from "#schema";
import { applyStructRecordMember, getReaderMemberValue } from "#schema/hydration";
import {
    CARBON_TYPE,
    normalizeCarbonTypeDescriptor
} from "#schema/types";

/** Fixed-length float kinds: hydration fills the member's own array. */
const FLOAT_ARRAY_KINDS = new Set([
    CARBON_TYPE.VECTOR2, CARBON_TYPE.VECTOR3, CARBON_TYPE.VECTOR4, CARBON_TYPE.COLOR,
    CARBON_TYPE.QUATERNION, CARBON_TYPE.MATRIX3, CARBON_TYPE.MATRIX4
]);

/**
 * Carbon's Blue math wrappers: each persists its value's elements as FLOAT members
 * (TriMatrix_Blue.cpp:18-33, TriVector_Blue.cpp, TriQuaternion_Blue.cpp,
 * TriColor_Blue.cpp) and constructs with the given defaults (TriMatrix.cpp:72-90,
 * TriVector.cpp:203-206, TriQuaternion.cpp:53-56, TriColor.cpp:164-167).
 */
const WRAPPERS = {
    TriMatrix: {
        kinds: [ "mat4", "matrix4" ],
        elements: [ "_11", "_12", "_13", "_14", "_21", "_22", "_23", "_24", "_31", "_32", "_33", "_34", "_41", "_42", "_43", "_44" ],
        defaults: [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]
    },
    TriVector: { kinds: [ "vec3", "vector3" ], elements: [ "x", "y", "z" ], defaults: [ 0, 0, 0 ] },
    TriQuaternion: { kinds: [ "quat", "quaternion" ], elements: [ "x", "y", "z", "w" ], defaults: [ 0, 0, 0, 1 ] },
    TriColor: { kinds: [ "color" ], elements: [ "r", "g", "b", "a" ], defaults: [ 0, 0, 0, 0 ] }
};

/**
 * Static set of read and skip routines that decode or skip individual Black
 * property values (primitives, strings, arrays, structure lists,
 * dictionaries, and binary blocks) from their type descriptors.
 */
export class CjsBlackPropertyReaders
{
    /**
     * Decodes a field, carrying existing embedded storage through the transport.
     * @impl adapted JavaScript dispatches canonical descriptors to wire codecs;
     * the shared reader service owns storage writes and notifications.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the value.
     * @param {import("./helpers.js").BlackSourceField|object} field Schema field, `{ jsType }` wrapper, or type descriptor.
     * @param {object} [destination] Existing embedded object or list storage to read into.
     * @returns {*} The decoded value.
     * @throws {TypeError} When the type has no reader.
     */
    static readValue(reader, field, destination = undefined)
    {
        const descriptor = normalizeCarbonTypeDescriptor(field);
        if (field?.black?.beType)
        {
            return CjsBlackPropertyReaders.readBlackValue(reader, field.black, descriptor, destination);
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

            case CARBON_TYPE.WPATH:
                return reader.context.TransformPath(reader.ReadWideStringRef());

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
                return CjsBlackPropertyReaders.readFloatArray(reader, 2, destination);

            case CARBON_TYPE.VECTOR3:
                return CjsBlackPropertyReaders.readFloatArray(reader, 3, destination);

            case CARBON_TYPE.VECTOR4:
            case CARBON_TYPE.COLOR:
            case CARBON_TYPE.QUATERNION:
                return CjsBlackPropertyReaders.readFloatArray(reader, 4, destination);

            case CARBON_TYPE.MATRIX3:
                return CjsBlackPropertyReaders.readFloatArray(reader, 9, destination);

            case CARBON_TYPE.MATRIX4:
                return CjsBlackPropertyReaders.readFloatArray(reader, 16, destination);

            case CARBON_TYPE.ARRAY:
                return CjsBlackPropertyReaders.readArray(reader, descriptor);

            case CARBON_TYPE.TYPED_ARRAY:
                return CjsBlackPropertyReaders.readTypedArray(reader, descriptor);

            case CARBON_TYPE.ROOT:
            case CARBON_TYPE.RAW_STRUCT:
                return reader.context.ReadEmbeddedObject(reader, destination);

            case CARBON_TYPE.ROOT_REF:
            case CARBON_TYPE.UNKNOWN:
                return reader.context.ReadObject(reader);

            default:
                throw new TypeError(`Black has no reader for data type ${descriptor.kind}`);
        }
    }

    /**
     * Decodes one native Black wire type, preserving an embedded destination.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the value.
     * @param {import("./helpers.js").BlackWireField} black Black wire description of the field.
     * @param {object} descriptor Normalized Carbon type descriptor.
     * @param {object} [destination] Existing embedded object or list storage to read into.
     * @returns {*} The decoded value.
     * @impl adapted Native pointer offsets are replaced by a supplied JS object.
     */
    static readBlackValue(reader, black, descriptor, destination = undefined)
    {
        switch (black.beType)
        {
            case "IROOT":
                if (black.container === "list" && black.cppType && /StructureList/.test(String(black.cppType)))
                {
                    return CjsBlackPropertyReaders.readBlackStructureList(reader, black);
                }
                return CjsBlackPropertyReaders.readBlackIRoot(reader, black, descriptor, destination);

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
            {
                const value = reader.ReadWideStringRef();
                return descriptor.kind === CARBON_TYPE.WPATH ? reader.context.TransformPath(value) : value;
            }

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
                return CjsBlackPropertyReaders.readFloatArray(reader, black.length || descriptor.length || 0, destination);

            case "BINARYBLOCK":
                return CjsBlackPropertyReaders.readBinaryBlock(reader, black);

            case "IROOTPTR":
            case "IROOTWEAKREF":
                return reader.context.ReadObject(reader);

            default:
                return CjsBlackPropertyReaders.readValueWithoutBlack(reader, descriptor);
        }
    }

    /**
     * Advances past value in the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the value.
     * @param {import("./helpers.js").BlackSourceField|object} field Schema field, `{ jsType }` wrapper, or type descriptor.
     * @throws {TypeError} When the type has no skip handler.
     */
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
            case CARBON_TYPE.WPATH:
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
            case CARBON_TYPE.ROOT:
            case CARBON_TYPE.RAW_STRUCT:
                reader.context.SkipEmbeddedObject(reader);
                return;
            case CARBON_TYPE.ROOT_REF:
            case CARBON_TYPE.UNKNOWN:
                reader.context.SkipObject(reader);
                return;
            default:
                throw new TypeError(`Black has no skip handler for data type ${descriptor.kind}`);
        }
    }

    /**
     * Advances past black value in the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the value.
     * @param {import("./helpers.js").BlackWireField} black Black wire description of the field.
     * @param {object} descriptor Normalized Carbon type descriptor.
     */
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

    /**
     * Reads black structure list from the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the list.
     * @param {import("./helpers.js").BlackWireField} black Black wire description with the C++ type and structure layout.
     * @returns {object[]|object} Records projected through the layout, or a `black.structureList` byte record without one.
     */
    static readBlackStructureList(reader, black)
    {
        return CjsBlackPropertyReaders.readStructureList(reader, {
            cppType: black.cppType,
            structure: black.structure,
            itemClassName: black.itemClassName ?? null,
            elementType: {
                kind: CARBON_TYPE.RAW_STRUCT,
                cppType: black.cppType
            }
        });
    }

    /**
     * Reads a schema field through the non-Black fallback decoder for the Black
     * object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the value.
     * @param {object} descriptor Normalized Carbon type descriptor.
     * @returns {*} The decoded value.
     */
    static readValueWithoutBlack(reader, descriptor)
    {
        return CjsBlackPropertyReaders.readValue(reader, { jsType: descriptor });
    }

    /**
     * Reads a schema field whose wire value references the Black string table
     * for the Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the string index.
     * @param {object} descriptor Normalized Carbon type descriptor; a path kind goes through the path handler.
     * @returns {string} The string, transformed when it is a path.
     */
    static readStringRef(reader, descriptor)
    {
        const value = reader.ReadStringRef();
        return descriptor.kind === CARBON_TYPE.PATH ? reader.context.TransformPath(value) : value;
    }

    /**
     * Reads a nested Black root-interface value for the Black object-graph
     * reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the value.
     * @param {import("./helpers.js").BlackWireField} black Black wire description with the container kind.
     * @param {object} descriptor Normalized Carbon type descriptor.
     * @param {object} [destination] Existing embedded object or list storage to read into.
     * @returns {*} The list, dictionary, array or embedded object.
     * @impl adapted The transport receives the existing JS embedded destination.
     */
    static readBlackIRoot(reader, black, descriptor, destination = undefined)
    {
        if (black.wrapped) return CjsBlackPropertyReaders.readWrapper(reader, black.wrapped, destination);
        if (black.container === "list" && destination !== undefined)
            return CjsBlackPropertyReaders.readNativeList(reader, destination);
        if (black.container === "dict") return CjsBlackPropertyReaders.readDict(reader);
        if (black.container === "list" || black.container === "set") return CjsBlackPropertyReaders.readArray(reader, descriptor);
        return reader.context.ReadEmbeddedObject(reader, destination);
    }

    /**
     * The element layout of a Blue math wrapper class, checked against the value
     * kind the member declares.
     *
     * @param {string} className Wrapper class, e.g. "TriMatrix".
     * @param {string} kind The member's declared value kind.
     * @returns {{kinds: string[], elements: string[], defaults: number[]}} The layout.
     * @throws {TypeError} When the class is not a wrapper or does not hold that kind.
     */
    static getWrapperLayout(className, kind)
    {
        const layout = Object.hasOwn(WRAPPERS, className) ? WRAPPERS[className] : null;
        if (!layout) throw new TypeError(`${className} is not a Blue math wrapper.`);
        if (!layout.kinds.includes(kind)) throw new TypeError(`${className} holds ${layout.kinds[0]}, not ${kind}.`);
        return layout;
    }

    /**
     * Reads an embedded Blue math wrapper (TriMatrix, TriVector, ...) as its plain
     * value. Carbon's BlackReader reads the embedded object's members into the existing
     * one, so hydrating a class fills the member's own typed array in place and elements
     * the file leaves out keep their values; it never allocates a replacement. With no
     * destination (a payload read, or a discarded field) the new array starts from the
     * wrapper's constructor defaults.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the object payload size.
     * @param {string} className The wrapper class the member declares.
     * @param {Float32Array|null} [destination] The member's own typed array, when hydrating.
     * @returns {Float32Array|number[]} The filled destination, or the new array.
     * @throws {TypeError} When hydration's destination is null or not a typed array of the wrapper's length, the file holds another class, or a member the wrapper does not persist.
     */
    static readWrapper(reader, className, destination = undefined)
    {
        const { elements, defaults } = WRAPPERS[className];
        if (destination !== undefined && !(ArrayBuffer.isView(destination) && !(destination instanceof DataView) && destination.length === elements.length))
        {
            throw new TypeError(`Black ${className} fills the member's ${elements.length}-element typed array, but the member holds ${destination === null ? "null" : Object.prototype.toString.call(destination).slice(8, -1)}.`);
        }
        const objectReader = reader.ReadBinaryReader(reader.ReadU32());
        const kind = objectReader.ReadStringRef();
        if (kind !== className) throw new TypeError(`Black member declares ${className} but holds ${kind}.`);
        const value = destination ?? defaults.slice();
        while (!objectReader.AtEnd())
        {
            const name = objectReader.ReadStringRef();
            const index = elements.indexOf(name);
            if (index < 0) throw new TypeError(`${className} has no persisted member ${name}.`);
            value[index] = objectReader.ReadF32();
        }
        objectReader.ExpectEnd(`${className} did not read to end`);
        return value;
    }

    /**
     * Advances past a nested Black root-interface value for the Black
     * object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the value.
     * @param {import("./helpers.js").BlackWireField} black Black wire description with the container kind.
     * @param {object} descriptor Normalized Carbon type descriptor.
     */
    static skipBlackIRoot(reader, black, descriptor)
    {
        if (black.wrapped)
        {
            reader.Skip(reader.ReadU32());
            return;
        }
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

    /**
     * Reads dictionary entries as own data properties for the shared writer.
     * @impl adapted JS keys never invoke Object.prototype setters; the shared
     * member writer retains existing dictionary entries and skips null values.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the entry count.
     * @returns {Object<string, *>} Decoded objects by key.
     */
    static readDict(reader)
    {
        const count = reader.ReadU32();
        const result = {};
        for (let i = 0; i < count; i++)
        {
            const key = reader.ReadStringRef();
            const value = reader.context.ReadObject(reader);
            // Serialized dictionary keys are data, including "__proto__".
            Object.defineProperty(result, key, { value, writable: true, enumerable: true, configurable: true });
        }
        return result;
    }

    /**
     * Advances past dict in the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the entry count.
     */
    static skipDict(reader)
    {
        const count = reader.ReadU32();
        for (let i = 0; i < count; i++)
        {
            reader.Skip(2);
            reader.context.SkipObject(reader);
        }
    }

    /**
     * Reads a Carbon BINARYBLOCK's int32 size and raw bytes
     * (BlackReader::ReadBinaryBlock, BlackReader.cpp:599-612). The bytes are
     * not decoded here: the object reader hands them to the instance's
     * ICustomPersist, and a payload read keeps this record.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the block length.
     * @param {{beType: string}} black Black wire description of the block.
     * @returns {{$type: string, beType: string, byteLength: number, bytes: Uint8Array}} The `black.binaryBlock` record.
     * @throws {RangeError} When the length is negative.
     */
    static readBinaryBlock(reader, black)
    {
        const byteLength = reader.ReadI32();
        if (byteLength < 0) throw new RangeError("Black binary block length must be nonnegative.");
        const bytes = reader.ReadBytes(byteLength);
        return { $type: "black.binaryBlock", beType: black.beType, byteLength, bytes };
    }

    /**
     * Populates the canonical mapped IList destination supplied by the reader.
     * BlackReader.cpp:482-509 clears before reading and ignores Append rejection.
     * JS restores the observer on failure; accepted items are not rolled back.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the item count.
     * @param {object} list Mapped IList destination (`Remove`, `GetInfo`, `SetNotify`, `Append`).
     * @returns {object} The same list.
     */
    static readNativeList(reader, list)
    {
        list.Remove(-1);
        const count = reader.ReadU32();
        const info = {};
        list.GetInfo(info);
        list.SetNotify(null);
        try
        {
            for (let i = 0; i < count; i++)
            {
                const item = reader.context.ReadObject(reader);
                if (item !== null) list.Append(item);
            }
        }
        finally
        {
            list.SetNotify(info.notify);
        }
        if (info.notify) info.notify.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, list);
        return list;
    }

    /**
     * Reads array from the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the array.
     * @param {object} descriptor Array type descriptor with its `elementType`.
     * @returns {Array<*>|object} The elements, or a structure-list result for raw structures.
     */
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
            if (!descriptor.elementType || elementType.kind === CARBON_TYPE.ROOT_REF || elementType.kind === CARBON_TYPE.UNKNOWN)
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

    /**
     * Advances past array in the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the array.
     * @param {object} descriptor Array type descriptor with its `elementType`.
     */
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
            if (!descriptor.elementType || elementType.kind === CARBON_TYPE.ROOT_REF || elementType.kind === CARBON_TYPE.UNKNOWN)
            {
                reader.context.SkipObject(reader);
            }
            else
            {
                CjsBlackPropertyReaders.skipValue(reader, { jsType: elementType });
            }
        }
    }

    /**
     * Reads float array from the current Black object-graph reader. Hydrating a
     * class fills the member's own typed array in place; a payload read, with no
     * destination, returns a new array.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the floats.
     * @param {number} count Number of 32-bit floats.
     * @param {Float32Array|null} [destination] The member's own typed array, when hydrating.
     * @returns {Float32Array|number[]} The filled destination, or the new array.
     * @throws {TypeError} When hydration's destination is null or not a typed array of `count` elements.
     */
    static readFloatArray(reader, count, destination = undefined)
    {
        // A payload read has no instance: its output is a new array.
        if (destination === undefined)
        {
            const result = [];
            for (let i = 0; i < count; i++)
            {
                result[i] = reader.ReadF32();
            }
            return result;
        }
        // Hydration fills the member's own fixed-length typed array, never a replacement.
        if (!(ArrayBuffer.isView(destination) && !(destination instanceof DataView)) || destination.length !== count)
        {
            throw new TypeError(`Black fills the member's ${count}-element typed array, but the member holds ${destination === null ? "null" : `${Object.prototype.toString.call(destination).slice(8, -1)}(${destination.length})`}.`);
        }
        for (let i = 0; i < count; i++)
        {
            destination[i] = reader.ReadF32();
        }
        return destination;
    }

    /**
     * Reads structure list from the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the record count.
     * @param {{structure?: import("./helpers.js").BlackStructureLayout, cppType?: string, elementType?: object}} descriptor List descriptor.
     * @returns {object[]|object} Records projected through the layout, or a `black.structureList` byte record without one.
     * @throws {RangeError} When the record size does not fit the layout.
     */
    static readStructureList(reader, descriptor)
    {
        const count = reader.ReadI32();
        const structureSize = reader.ReadU16();
        // Source: blue/src/BlackReader.cpp ReadStructureList/PatchStringsInStructureList.
        // JS projects declared members instead of patching native pointers in-place.
        // Tr2Effect.h's Tr2ConstantEffectParameter has a shared string at 0 and vec4 at 8.
        const structure = descriptor.structure;
        if (structure)
        {
            // Carbon throws on any size but its own (BlackReader.cpp:585-588).
            // A class-derived layout also takes a record that ends exactly on
            // one of its member boundaries: data written before a later Carbon
            // revision appended members (Locator.partTag, trinity a9a60056,
            // leaves build-3503375 locators at 44 of 48 bytes). The missing
            // members keep the class defaults. Not Carbon.
            const exact = structureSize === structure.size;
            const earlier = structureSize < structure.size && Array.isArray(structure.boundaries) && structure.boundaries.includes(structureSize);
            if (count < 0 || (!exact && !earlier))
            {
                throw new RangeError(`Incompatible Black structure ${structure.name}: ${count} x ${structureSize}`);
            }
            const records = reader.ReadBinaryReader(count * structureSize);
            const result = [];
            // A runtime read of a declared structList builds each record as an
            // instance of its class; a payload read stays plain data.
            const Item = descriptor.itemClassName && reader.context?.readMode === "runtime"
                ? CjsSchema.getConstructor(descriptor.itemClassName) : null;
            if (descriptor.itemClassName && reader.context?.readMode === "runtime" && !Item)
            {
                throw new TypeError(`Black struct ${descriptor.itemClassName} is not registered (import its package)`);
            }
            const declarations = Item ? CjsBlackPropertyReaders.structMemberDeclarations(Item) : null;
            // A record instance's fixed-length float members are filled in place.
            const fills = structure.members.map(member => Item !== null
                && FLOAT_ARRAY_KINDS.has(normalizeCarbonTypeDescriptor({ kind: member.type }).kind));
            for (let index = 0; index < count; index++)
            {
                const record = records.ReadBinaryReader(structureSize);
                const value = Item ? new Item() : {};
                for (const [ memberIndex, member ] of structure.members.entries())
                {
                    // A member the record does not hold is not written, as Black reads
                    // nothing it was not given: an instance keeps its own value, and a
                    // payload record leaves the member out.
                    if (earlier && structure.boundaries[memberIndex] > structureSize) continue;
                    record.offset = member.offset;
                    const read = CjsBlackPropertyReaders.readValue(record, {
                        jsType: { kind: member.type }
                    }, fills[memberIndex] ? getReaderMemberValue(value, declarations.get(member.name)) ?? null : undefined);
                    if (Item) applyStructRecordMember(value, declarations.get(member.name), read);
                    else value[member.name] = read;
                }
                result.push(value);
            }
            return result;
        }
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

    /**
     * The persisted member declarations of a struct record class, by name.
     *
     * @param {Function} Item The struct record class.
     * @returns {Map<string, object>} Its member declarations.
     */
    static structMemberDeclarations(Item)
    {
        const declarations = new Map();
        for (const member of CjsSchema.getSchema(Item).members)
        {
            if (member.role === "member" && !declarations.has(member.name)) declarations.set(member.name, member);
        }
        return declarations;
    }

    /**
     * Advances past structure list in the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the record count.
     */
    static skipStructureList(reader)
    {
        const count = reader.ReadI32();
        const structureSize = reader.ReadU16();
        reader.Skip(count * structureSize);
    }

    /**
     * Reads typed array from the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the element count.
     * @param {object} descriptor Typed-array descriptor; its `js` is copied into the result.
     * @returns {{$type: string, count: number, elementSize: number, js: *, bytes: number[]}} A `black.typedArray` byte record.
     */
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

    /**
     * Advances past typed array in the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the element count.
     */
    static skipTypedArray(reader)
    {
        const count = reader.ReadU32();
        const elementSize = reader.ReadU16();
        reader.Skip(count * elementSize);
    }

    /**
     * Advances past binary block in the current Black object-graph reader.
     *
     * @param {import("./CjsBlackBinaryReader.js").CjsBlackBinaryReader} reader Cursor positioned at the block length.
     */
    static skipBinaryBlock(reader)
    {
        const byteLength = reader.ReadI32();
        reader.Skip(byteLength);
    }
}

CjsSchema.meta.define(CjsBlackPropertyReaders, { className: "CjsBlackPropertyReaders", donors: [ "BlackReader" ] });
