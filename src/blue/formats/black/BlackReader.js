// Source: blue/src/BlackReader.h
// Source: blue/src/BlackReader.cpp
// Source: blue/src/BlackReader_Blue.cpp
//
// BESIDE, NOT LIVE. This is the port of Carbon's BlackReader, step 7 of the Blue
// plan. CjsBlackReader stays the live reader until every .black file loads
// identically through this one, and at least as fast
// (scripts/resource/blackBuildCorpus.js).
//
// A declared class is read because its definition exists: nothing here names a
// class, and no class supplies reader code. It asks the injected Blue for each
// class and its ClassInfo, and reads no schema.
//
// Yielding is not ported: there are no tasklets, so CreateObjectWithYield is
// CreateObject and a read runs to the end.
import { exposure as be } from "#be";
import { IRootReader } from "../../format/IRootReader.js";
import { IRootReaderException } from "../../format/IRootReaderException.js";
import { IBlueObjectBuilder } from "../../interfaces/IBlueObjectBuilder.js";
import { ICacheable } from "../../interfaces/ICacheable.js";
import { BLUELISTEVENT } from "#consts/blue";
import { cast } from "../../compose/interface.js";
import { BeClasses } from "../../exposure/classes/registry.js";
import { ClassInfo } from "../../base/ClassInfo.js";
import { getWrapperLayout } from "./blueMathWrappers.js";
import { IRootReaderBase } from "./IRootReaderBase.js";

/** The file's magic value (BlackReader.cpp:53). */
const BLACK_MAGIC = 0xb1acf11e;

/** Decodes the string table. */
const UTF8 = new TextDecoder("utf-8");

/** Decodes the wide string table. */
const UTF16 = new TextDecoder("utf-16le");

/**
 * Splits a decoded table on its terminators, as FillStringTable walks them.
 *
 * @param {string} text The decoded table.
 * @param {number} count The strings it should hold.
 * @returns {string[]|null} The strings, or null when the table does not hold exactly that many.
 */
function splitTable(text, count)
{
    if (count === 0) return text.length === 0 ? [] : null;
    const strings = text.split("\0");
    if (strings.length !== count + 1 || strings[count] !== "") return null;
    strings.length = count;
    return strings;
}

/**
 * Constructs Blue objects from Black files.
 *
 * Carbon: BlackReader (blue/src/BlackReader.h:17-160)
 */
export class BlackReader extends IRootReaderBase
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "BlackReader";

    /** `m_errorMessage`: the last error. */
    _errorMessage = "";

    /** `m_doInitialize`: whether Initialize is called on objects created. */
    _doInitialize = true;

    /** `m_timeSlice`: kept for SetTimeSlice; there is nothing to yield to. */
    _timeSlice = Math.fround(0.005);

    /** `m_strings`: the string table. @type {string[]} */
    _strings = [];

    /** `m_stringDataSize`: bytes in the string table. */
    _stringDataSize = 0;

    /** `m_wstrings`: the wide string table. @type {string[]} */
    _wstrings = [];

    /** `m_wstringDataSize`: bytes in the wide string table. */
    _wstringDataSize = 0;

    /**
     * `m_data`, as a view of the whole file: nothing needs a copy.
     *
     * @type {DataView|null}
     */
    _data = null;

    /** `m_dataSize`: bytes after the string tables. */
    _dataSize = 0;

    /** Where `m_data` starts in the view. @cjs */
    _dataStart = 0;

    /** `m_curData`: the cursor, as an offset in the view. */
    _curData = 0;

    /** `m_objectMarkers`: where each buildable object starts. @type {number[]} */
    _objectMarkers = [];

    /** `m_referenceMap`: objects by reference index, for one build. @type {Map<number, object|null>} */
    _referenceMap = new Map();

    /**
     * Checks the header. `stream` is the file's view, and the cursor moves past the header.
     *
     * @adapted a loader already holds the file's bytes, so the cursor stands in for the stream
     * @param {DataView} stream The file.
     * @returns {boolean} Whether this is a Black file of a version we read.
     */
    IsHeaderValid(stream)
    {
        if (stream.byteLength < 8 || stream.getUint32(0, true) !== BLACK_MAGIC)
        {
            this.Cleanup();
            return false;
        }

        if (stream.getInt32(4, true) !== 1)
        {
            // Note - keep GetVersionsSupported up to date if this version changes.
            this.Cleanup();
            return false;
        }

        this._curData = 8;
        return true;
    }

    /**
     * Reads a file and builds its root object.
     *
     * @adapted takes the file's bytes, which a loader already holds
     * @param {Uint8Array|ArrayBuffer|DataView} stream The file.
     * @returns {object|null} The root object, or null with GetErrorMessage set.
     */
    ReadFromStream(stream)
    {
        this.Cleanup();

        if (!this.ReadForCachingFromStream(stream))
        {
            return null;
        }

        return this.CreateObject(0, null);
    }

    /**
     * Reads a file's tables so that objects can be built from it later.
     *
     * @adapted takes the file's bytes, which a loader already holds
     * @param {Uint8Array|ArrayBuffer|DataView} stream The file.
     * @returns {boolean} Whether the file is readable.
     */
    ReadForCachingFromStream(stream)
    {
        this._errorMessage = "";

        try
        {
            const view = ArrayBuffer.isView(stream)
                ? new DataView(stream.buffer, stream.byteOffset, stream.byteLength)
                : new DataView(stream);

            if (!this.IsHeaderValid(view))
            {
                this.Cleanup();
                throw new IRootReaderException("Invalid file");
            }

            if (!this.FillStringTable(view))
            {
                this.Cleanup();
                throw new IRootReaderException("String table is invalid");
            }

            if (!this.FillWStringTable(view))
            {
                this.Cleanup();
                throw new IRootReaderException("Wide string table is invalid");
            }

            this._data = view;
            this._dataStart = this._curData;
            this._dataSize = view.byteLength - this._curData;

            this._objectMarkers.push(this._dataStart);

            return true;
        }
        catch (exc)
        {
            if (cast(exc, IRootReaderException) === null) throw exc;
            this._errorMessage = exc.message;
            return false;
        }
    }

    /**
     * Reads a signed 64-bit value.
     *
     * @implemented
     * @returns {bigint} The value.
     */
    ReadValue__Int64()
    {
        const value = this._data.getBigInt64(this._curData, true);
        this._curData += 8;
        return value;
    }

    /**
     * Reads an unsigned 64-bit value.
     *
     * @implemented
     * @returns {bigint} The value.
     */
    ReadValue__UInt64()
    {
        const value = this._data.getBigUint64(this._curData, true);
        this._curData += 8;
        return value;
    }

    /**
     * Reads a signed 32-bit value.
     *
     * @implemented
     * @returns {number} The value.
     */
    ReadValue__Int32()
    {
        const value = this._data.getInt32(this._curData, true);
        this._curData += 4;
        return value;
    }

    /**
     * Reads an unsigned 32-bit value.
     *
     * @implemented
     * @returns {number} The value.
     */
    ReadValue__UInt32()
    {
        const value = this._data.getUint32(this._curData, true);
        this._curData += 4;
        return value;
    }

    /**
     * Reads an unsigned 16-bit value.
     *
     * @implemented
     * @returns {number} The value.
     */
    ReadValue__UInt16()
    {
        const value = this._data.getUint16(this._curData, true);
        this._curData += 2;
        return value;
    }

    /**
     * Reads the same bits as signed: Carbon's member type gives the sign.
     *
     * @cjs
     * @returns {number} The value.
     */
    ReadValue__Int16()
    {
        const value = this._data.getInt16(this._curData, true);
        this._curData += 2;
        return value;
    }

    /**
     * Reads an unsigned 8-bit value.
     *
     * @implemented
     * @returns {number} The value.
     */
    ReadValue__UInt8()
    {
        const value = this._data.getUint8(this._curData);
        this._curData += 1;
        return value;
    }

    /**
     * Reads the same bits as signed: Carbon's member type gives the sign.
     *
     * @cjs
     * @returns {number} The value.
     */
    ReadValue__Int8()
    {
        const value = this._data.getInt8(this._curData);
        this._curData += 1;
        return value;
    }

    /**
     * Reads a boolean.
     *
     * @implemented
     * @returns {boolean} The value.
     */
    ReadValue__Bool()
    {
        const value = this._data.getUint8(this._curData) !== 0;
        this._curData += 1;
        return value;
    }

    /**
     * Reads a float.
     *
     * @implemented
     * @returns {number} The value.
     */
    ReadValue__Float()
    {
        const value = this._data.getFloat32(this._curData, true);
        this._curData += 4;
        return value;
    }

    /**
     * Reads a double.
     *
     * @implemented
     * @returns {number} The value.
     */
    ReadValue__Double()
    {
        const value = this._data.getFloat64(this._curData, true);
        this._curData += 8;
        return value;
    }

    /**
     * Builds an object from the file. There is nothing to yield to.
     *
     * @adapted no tasklets, so it is CreateObject
     * @param {number} objectMarker Which object to build.
     * @param {object|null} callingProxy The proxy asking, if any.
     * @returns {object|null} The object, or null with GetErrorMessage set.
     */
    CreateObjectWithYield(objectMarker, callingProxy = null)
    {
        return this.CreateObjectHelper(objectMarker, callingProxy);
    }

    /**
     * Builds an object from the file.
     *
     * @implemented
     * @param {number} [objectMarker] Which object to build.
     * @param {object|null} [callingProxy] The proxy asking, if any.
     * @returns {object|null} The object, or null with GetErrorMessage set.
     */
    CreateObject(objectMarker = 0, callingProxy = null)
    {
        return this.CreateObjectHelper(objectMarker, callingProxy);
    }

    /**
     * Builds an object from a marker.
     *
     * @adapted no tasklets; DataView throws RangeError where ReadValueImpl throws "Reading out of bounds"
     * @param {number} objectMarker Which object to build.
     * @param {object|null} callingProxy The proxy asking, if any.
     * @returns {object|null} The object, or null with GetErrorMessage set.
     */
    CreateObjectHelper(objectMarker, callingProxy)
    {
        this._errorMessage = "";

        this._curData = this._objectMarkers[objectMarker];

        let ret = null;

        try
        {
            ret = this.ReadIRootClass();
        }
        catch (exc)
        {
            if (exc.name === "RangeError") this._errorMessage = "Reading out of bounds";
            else if (cast(exc, IRootReaderException) !== null) this._errorMessage = exc.message;
            else
            {
                this._referenceMap.clear();
                throw exc;
            }
            ret = null;
        }

        this._referenceMap.clear();

        return ret;
    }

    /**
     * Reads a referenced object: null, one already read, or a new one.
     *
     * @adapted a new object comes from the compiled definition, and there is no reference count
     * @returns {object|null} The object.
     * @throws {IRootReaderException} When the class cannot be created, or a proxy's property is not `object`.
     */
    ReadIRootClass()
    {
        const referenceIx = this.ReadValue__Int32();

        if (referenceIx === 0)
        {
            // Object is a nullptr - this can happen if the default value is non-null
            // but the saved object had it explicitly nulled out.
            return null;
        }

        const existingInstance = this._referenceMap.get(referenceIx);
        if (existingInstance !== undefined)
        {
            // We've seen this object before
            return existingInstance;
        }

        const dataSize = this.ReadValue__UInt32();

        const startPos = this._curData;

        const typeName = this.ReadString();

        // Carbon creates through the injected registry (BlackReader.cpp:347); without Blue there is no library.
        const instance = BeClasses.CreateInstanceFromName(typeName);

        if (instance === null)
        {
            throw new IRootReaderException(`Failed to create an instance of ${typeName}`);
        }

        // Carbon reads members through instance->ClassType() (IRootReader.cpp:58). IRoot.ClassType returns
        // ClassInfo.exposeToBlue(this.constructor), and 213 Blue classes do not extend IRoot yet, so the reader
        // asks for it directly: the port's current state (needs-owner.md), not a JavaScript limitation.
        const definition = ClassInfo.exposeToBlue(instance.constructor).meta;

        if (definition.isProxy)
        {
            // Note that the proxy might be empty
            if (this._curData < startPos + dataSize)
            {
                const propertyName = this.ReadString();

                if (propertyName === "object")
                {
                    const objectMarker = this._objectMarkers.length;
                    this._objectMarkers.push(this._curData);

                    const proxiedObjReferenceIx = this.ReadValue__UInt32();

                    this._referenceMap.set(proxiedObjReferenceIx, null);

                    const proxiedDataSize = this.ReadValue__UInt32();

                    this._curData += proxiedDataSize;

                    instance.SetBuilder(this, objectMarker);
                }
                else
                {
                    throw new IRootReaderException(`Invalid property: ${propertyName}`);
                }
            }
        }
        else
        {
            this.ReadMembers(instance, definition, startPos + dataSize);
        }

        if (this._doInitialize && definition.isInitialize)
        {
            instance.Initialize();
        }

        this._referenceMap.set(referenceIx, instance);

        return instance;
    }

    /**
     * Reads attributes up to the end of an object's data.
     *
     * @adapted `definition` stands in for `instance->ClassType()`, which the reader already holds
     * @param {object} instance The object.
     * @param {object} definition Its compiled class.
     * @param {number} streamEnd Where its data ends.
     */
    ReadMembers(instance, definition, streamEnd)
    {
        // Unless IInitialize is present, we look for INotify to pass down
        // to HandleProperty, to issue notifications to the object.
        const notify = !definition.isInitialize && definition.isNotify ? instance : null;

        while (this._curData < streamEnd)
        {
            const attributeName = this.ReadString();
            this.HandleAttribute(attributeName, instance, definition, notify);
        }
    }

    /**
     * Fills a member's array in place.
     *
     * @adapted Carbon copies bytes over the member; the member's array is its storage, and is checked because nothing
     * guarantees what a JavaScript member holds
     * @param {Float32Array} dest The array.
     * @param {number} count Number of floats.
     * @throws {IRootReaderException} When the member does not hold a typed array of that length.
     */
    ReadFloatArray(dest, count)
    {
        if (!ArrayBuffer.isView(dest) || dest.length !== count)
        {
            throw new IRootReaderException(`Member does not hold ${count} floats`);
        }

        for (let i = 0; i < count; i++)
        {
            dest[i] = this._data.getFloat32(this._curData, true);
            this._curData += 4;
        }
    }

    /**
     * Reads a string table index, looks it up and returns the string.
     *
     * @implemented
     * @returns {string} The string.
     * @throws {IRootReaderException} When the index is out of range.
     */
    ReadString()
    {
        const stringIndex = this.ReadValue__UInt16();

        if (stringIndex < this._strings.length)
        {
            return this._strings[stringIndex];
        }

        throw new IRootReaderException("Invalid string index");
    }

    /**
     * Reads a wide string table index, looks it up and returns the string.
     *
     * @implemented
     * @returns {string} The string.
     * @throws {IRootReaderException} When the index is out of range.
     */
    ReadWString()
    {
        const stringIndex = this.ReadValue__UInt16();

        if (stringIndex < this._wstrings.length)
        {
            return this._wstrings[stringIndex];
        }

        throw new IRootReaderException("Invalid string index");
    }

    /**
     * Reads a list through its own methods.
     *
     * @adapted no reference count; GetInfo returns its record in the object it is given
     * @param {object} list The object as IList.
     */
    ReadList(list)
    {
        list.Remove(-1);

        const numEntries = this.ReadValue__Int32();

        const info = {};
        list.GetInfo(info);
        list.SetNotify(null);

        for (let i = 0; i < numEntries; ++i)
        {
            const p = this.ReadIRootClass();
            if (p !== null)
            {
                list.Append(p);
            }
        }

        list.SetNotify(info.notify);
        if (info.notify)
        {
            info.notify.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, list);
        }
    }

    /**
     * Reads a list member that holds a plain array, for members not yet on BlueList.
     *
     * @cjs Carbon's list members are all IList; these are the ones still being converted
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     * @throws {IRootReaderException} When the member holds something else.
     */
    ReadArray(holder, key, entry)
    {
        const numEntries = this.ReadValue__Int32();

        const items = [];
        for (let i = 0; i < numEntries; ++i)
        {
            const p = this.ReadIRootClass();
            if (p !== null || entry.keepsNulls) items.push(p);
        }

        const current = holder[key];
        const result = current === null || current === undefined ? [] : current;
        if (!Array.isArray(result))
        {
            throw new IRootReaderException(`Member ${entry.name} has incompatible array storage`);
        }

        result.length = 0;
        for (let i = 0; i < items.length; ++i)
        {
            result.push(items[i]);
        }

        if (entry.isProperty || result !== current) holder[key] = result;
    }

    /**
     * Reads a list member that holds a JavaScript Set.
     *
     * @cjs Carbon has no set member
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     * @throws {IRootReaderException} When the member holds something else.
     */
    ReadSet(holder, key, entry)
    {
        const numEntries = this.ReadValue__Int32();

        const items = [];
        for (let i = 0; i < numEntries; ++i)
        {
            const p = this.ReadIRootClass();
            if (p !== null) items.push(p);
        }

        const current = holder[key];
        const result = current === null || current === undefined ? new Set() : current;
        if (typeof result.clear !== "function" || typeof result.add !== "function")
        {
            throw new IRootReaderException(`Member ${entry.name} has incompatible set storage`);
        }

        result.clear();
        for (let i = 0; i < items.length; ++i)
        {
            result.add(items[i]);
        }

        if (entry.isProperty || result !== current) holder[key] = result;
    }

    /**
     * Reads a dictionary. Old entries stay, as Carbon's do, and nulls are skipped.
     *
     * @adapted a member's dictionary is a JavaScript Map, created if the member holds none
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     * @throws {IRootReaderException} When the member holds something else.
     */
    ReadDict(holder, key, entry)
    {
        const numEntries = this.ReadValue__Int32();

        const current = holder[key];
        const dict = current === null || current === undefined ? new Map() : current;
        if (typeof dict.set !== "function" || typeof dict.get !== "function")
        {
            throw new IRootReaderException(`Member ${entry.name} has incompatible map storage`);
        }

        for (let i = 0; i < numEntries; ++i)
        {
            const name = this.ReadString();
            const p = this.ReadIRootClass();

            if (p !== null)
            {
                dict.set(name, p);
            }
        }

        if (entry.isProperty || dict !== current) holder[key] = dict;
    }

    /**
     * Reads a structure list into instances of its item class, one field at a time.
     *
     * @adapted Carbon copies packed records and patches their strings (BlackReader.cpp:534-597); ours are objects, so
     * each field goes through its handler at its offset. Not Carbon: a record may also end on a member boundary, for
     * data written before Carbon appended members (Locator.partTag, trinity a9a60056). The rest keep their defaults.
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     * @throws {IRootReaderException} When the records do not fit the layout.
     */
    ReadStructureList(holder, key, entry)
    {
        const numItems = this.ReadValue__Int32();
        const structureSize = this.ReadValue__UInt16();

        const { structure } = entry;
        const { fields, boundaries, Item } = structure;

        const short = structureSize < structure.size && boundaries.includes(structureSize);

        if (numItems < 0 || (structureSize !== structure.size && !short))
        {
            throw new IRootReaderException("Structure is not compatible with data in file");
        }

        const current = holder[key];
        const list = Array.isArray(current) ? current : [];
        list.length = 0;

        const handlers = this._propertyHandlers;
        const start = this._curData;

        for (let i = 0; i < numItems; ++i)
        {
            const record = new Item();
            const base = start + i * structureSize;

            for (let j = 0; j < fields.length; ++j)
            {
                const field = fields[j];
                if (short && boundaries[j] > structureSize) continue;
                this._curData = base + field.offset;
                if (field.index >= 0) handlers[field.type].call(this, record[field.key], field.index, field);
                else handlers[field.type].call(this, record, field.key, field);
            }

            list.push(record);
        }

        this._curData = start + numItems * structureSize;

        if (entry.isProperty || list !== current) holder[key] = list;
    }

    /**
     * Reads a block of bytes and hands it to the object.
     *
     * @adapted the bytes are copied into whichever typed array AllocateReadBuffer returns
     * @param {object} cPersist The object as ICustomPersist.
     * @param {string} propertyName The block's member name.
     */
    ReadBinaryBlock(cPersist, propertyName)
    {
        const size = this.ReadValue__Int32();

        const data = cPersist.AllocateReadBuffer(propertyName, size);
        const target = new Uint8Array(data.buffer, data.byteOffset, data.byteLength); // alloc: byte view
        const source = new Uint8Array(this._data.buffer, this._data.byteOffset + this._curData, Math.min(size, target.byteLength)); // alloc: byte view
        target.set(source);

        // The persist class needs to handles the data from here.
        cPersist.SetBufferAndSize(propertyName, data, size);

        this._curData += size;
    }

    /**
     * Reads an embedded math object into its member's array.
     *
     * @cjs Carbon's member is a TriMatrix, TriVector or similar object; ours is its typed array
     * @param {Float32Array} value The member's array.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     * @throws {IRootReaderException} When the member does not hold an array of the right length.
     */
    ReadWrapper(value, entry)
    {
        const elements = getWrapperLayout(entry.wrapperClass, entry.wrapperKind).elements;
        if (!ArrayBuffer.isView(value) || value.length !== elements.length)
        {
            throw new IRootReaderException(`Member does not hold ${elements.length} floats`);
        }

        this._ReadWrapperElements(value, entry);
    }

    /**
     * Reads an embedded math object's elements into an array.
     *
     * @cjs Carbon's are the members of a TriMatrix, TriVector or similar object
     * @param {Float32Array|number[]} value The array.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     * @throws {IRootReaderException} When the file holds another class, or a member it does not have.
     */
    _ReadWrapperElements(value, entry)
    {
        const elements = getWrapperLayout(entry.wrapperClass, entry.wrapperKind).elements;

        const dataSize = this.ReadValue__UInt32();
        const streamEnd = this._curData + dataSize;

        const typeName = this.ReadString();
        if (typeName !== entry.wrapperClass)
        {
            throw new IRootReaderException(`Member declares ${entry.wrapperClass} but holds ${typeName}`);
        }

        while (this._curData < streamEnd)
        {
            const attributeName = this.ReadString();
            const index = elements.indexOf(attributeName);
            if (index < 0)
            {
                throw new IRootReaderException(`Invalid attribute: ${attributeName}`);
            }
            value[index] = this.ReadValue__Float();
        }
    }

    /**
     * Reads an embedded object into the one already there; the name in the file is not used.
     *
     * @adapted the object's definition stands in for its `ClassType()`
     * @param {object} obj The embedded object.
     */
    ReadIRoot(obj)
    {
        const dataSize = this.ReadValue__UInt32();

        const startPos = this._curData;

        this.ReadString();

        // obj->ClassType(), as in CreateObject above.
        const definition = ClassInfo.exposeToBlue(obj.constructor).meta;

        this.ReadMembers(obj, definition, startPos + dataSize);

        if (this._doInitialize && definition.isInitialize)
        {
            obj.Initialize();
        }
    }

    /**
     * Sets whether objects built are initialized.
     *
     * @implemented
     * @param {boolean} b Whether to call Initialize.
     */
    SetDoInitialize(b)
    {
        this._doInitialize = b;
    }

    /**
     * Sets the time slice, which has no effect here: there are no tasklets.
     *
     * @adapted kept for the interface; nothing reads it
     * @param {number} t Seconds.
     */
    SetTimeSlice(t)
    {
        this._timeSlice = t < 0 ? 0 : t;
    }

    /**
     * Whether GetMemoryUsage can be asked.
     *
     * @implemented
     * @returns {boolean} True.
     */
    IsMemoryUsageKnown()
    {
        return true;
    }

    /**
     * The bytes this reader holds.
     *
     * @adapted `sizeof( this )` has no JavaScript meaning, so it is left out
     * @returns {number} Bytes.
     */
    GetMemoryUsage()
    {
        return this._dataSize + this._stringDataSize + this._wstringDataSize;
    }

    /**
     * Sets the file name reported in errors.
     *
     * @implemented
     * @param {string} name The file name.
     */
    SetFileName(name)
    {
        this._filename = name;
    }

    /**
     * Reads the string table.
     *
     * @adapted the table is decoded whole and split on its terminators, which is where Carbon's walk stops
     * @param {DataView} stream The file, with the cursor at the table.
     * @returns {boolean} Whether the table is valid.
     */
    FillStringTable(stream)
    {
        const stringTableDataSize = stream.getUint32(this._curData, true);
        this._curData += 4;

        // Guard against bogus values - file could be corrupt
        if (stringTableDataSize > stream.byteLength || stringTableDataSize < 2)
        {
            return false;
        }

        const numStrings = stream.getUint16(this._curData, true);
        const size = stringTableDataSize - 2;
        const bytes = new Uint8Array(stream.buffer, stream.byteOffset + this._curData + 2, size); // alloc: byte view
        const strings = splitTable(UTF8.decode(bytes), numStrings);
        this._curData += stringTableDataSize;

        if (strings === null)
        {
            return false;
        }

        this._strings = strings;
        this._stringDataSize = size;
        return true;
    }

    /**
     * Reads the wide string table.
     *
     * @adapted the table is decoded whole and split on its terminators, which is where Carbon's walk stops
     * @param {DataView} stream The file, with the cursor at the table.
     * @returns {boolean} Whether the table is valid.
     */
    FillWStringTable(stream)
    {
        const wstringTableDataSize = stream.getUint32(this._curData, true);
        this._curData += 4;

        // Guard against bogus values - file could be corrupt
        if (wstringTableDataSize > stream.byteLength || wstringTableDataSize < 2)
        {
            return false;
        }

        const numWStrings = stream.getUint16(this._curData, true);
        const size = wstringTableDataSize - 2;
        const bytes = new Uint8Array(stream.buffer, stream.byteOffset + this._curData + 2, size); // alloc: byte view
        const wstrings = splitTable(UTF16.decode(bytes), numWStrings);
        this._curData += wstringTableDataSize;

        if (wstrings === null)
        {
            return false;
        }

        this._wstrings = wstrings;
        this._wstringDataSize = size;
        return true;
    }

    /**
     * Releases everything read.
     *
     * @implemented
     */
    Cleanup()
    {
        this._strings = [];
        this._stringDataSize = 0;

        this._wstrings = [];
        this._wstringDataSize = 0;

        this._data = null;
        this._dataSize = 0;

        this._curData = 0;
        this._loggedNonFinite = false;
        this._objectMarkers.length = 0;
        this._referenceMap.clear();
    }

    /**
     * The last error.
     *
     * @adapted a C++ output reference becomes the return value
     * @returns {string} The message.
     */
    GetErrorMessage()
    {
        return this._errorMessage;
    }

    /**
     * The Black versions this reader reads.
     *
     * @implemented
     * @returns {number[]} The versions.
     */
    GetVersionsSupported()
    {
        return [ 1 ];
    }

    /**
     * The synchronous native BePaths stream API is not ported; no host filesystem is invented.
     *
     * @notImplemented
     * @param {string} _filename The res path.
     */
    CreateObjectFromFile(_filename)
    {
        throw new Error("BlackReader.CreateObjectFromFile requires BePaths.GetStreamFromPathW.");
    }

    /**
     * Builds the root object of a file.
     *
     * @adapted a C++ output pointer becomes the return value, and a failed native Result becomes a reader exception
     * @param {Uint8Array|ArrayBuffer|DataView} stream The file.
     * @returns {object} The root object.
     * @throws {IRootReaderException} When it cannot be built.
     */
    CreateObjectFromStream(stream)
    {
        const res = this.ReadFromStream(stream);
        if (res !== null) return res;
        throw new IRootReaderException(this._errorMessage);
    }
}

// Explicit registration keeps the public Blue source importable without a decorator transform.
be.mapMethodAndWrap()(BlackReader.prototype, "CreateObjectFromStream");
be.mapMethodAndWrap()(BlackReader.prototype, "CreateObjectFromFile");
be.mapMethodAndWrap()(BlackReader.prototype, "GetVersionsSupported");
be.mapICacheableMethods()(BlackReader);
be.define("BlackReader")(BlackReader);
be.mapInterface(IRootReader)(BlackReader);
be.mapInterface(IBlueObjectBuilder)(BlackReader);
be.mapInterface(ICacheable)(BlackReader);
