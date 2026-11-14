// Reads a Black file into plain records instead of instances, for consumers that
// need a file's values without building its objects. It is BlackReader: the same
// stream, tables and handlers, because a record is one more holder. Only what
// assumes an instance is replaced, here, so BlackReader has no branch for it:
//
// - a member is written under its name, not its key;
// - nothing is constructed, and neither Initialize nor notification runs;
// - a member holds no storage yet, so arrays and nested records are created;
// - an object met again is a `{ _ref }` marker, and the object it means gets `_id`.
import { VARTYPE } from "../../../global/model/graph/graphTypes.js";
import { InvalidAttributeException } from "../../format/InvalidAttributeException.js";
import { IRootReaderException } from "../../format/IRootReaderException.js";
import { BlackReader } from "./BlackReader.js";
import { cast } from "../../compose/interface.js";
import { BeClasses } from "../../exposure/classes/registry.js";
import { ClassInfo } from "../../base/ClassInfo.js";
import { BLACK_DESTINATION } from "../../base/VarEntry.js";
import { getWrapperLayout } from "./blueMathWrappers.js";
import { IRootReaderBase } from "./IRootReaderBase.js";

/** The record field that names the class. */
const TYPE_FIELD = "_type";

/** The record field that gives an object met again its id. */
const ID_FIELD = "_id";

/** The marker field that refers to an id. */
const REFERENCE_FIELD = "_ref";

/** The table of a reader that writes records: the shared one, with the handlers below replaced. */
const HANDLERS = IRootReaderBase.propertyHandlers.slice();

/**
 * BlackReader, reading into plain records.
 *
 * Modelled on: BlackReader (blue/src/BlackReader.h:17-160)
 */
export class CjsBlackRecordReader extends BlackReader
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsBlackRecordReader";

    /** @override */
    _propertyHandlers = HANDLERS;

    /**
     * Reads a file's root object into a record.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} stream The file.
     * @returns {{comments: Array, object: object}} The record, in the shape consumers of a payload read expect.
     * @throws {IRootReaderException} When it cannot be read.
     */
    ReadRecord(stream)
    {
        const object = this.ReadFromStream(stream);
        if (object === null) throw new IRootReaderException(this._errorMessage);
        return { comments: [], object };
    }

    /**
     * Writes one attribute under the member's name. An object is not told.
     *
     * @param {string} attributeName The attribute's name.
     * @param {object} instance The record.
     * @param {object} definition The record's class.
     * @param {object|null} notify Not used: a record has no notifications.
     * @throws {InvalidAttributeException} When the class has no PERSIST member of that name.
     * @throws {IRootReaderException} When the member has no handler, or its value cannot be read.
     */
    HandleAttribute(attributeName, instance, definition, notify)
    {
        const entry = this.FindEntry(attributeName, definition);

        if (entry === null)
        {
            throw new InvalidAttributeException(`Invalid attribute: ${attributeName}`);
        }

        if (entry.type === VARTYPE.BINARYBLOCK)
        {
            instance[entry.name] = this._ReadBinaryBlockValue(instance[TYPE_FIELD], entry);
            return;
        }

        const handler = this._propertyHandlers[entry.type];

        if (handler === null || handler === undefined)
        {
            throw new IRootReaderException(`Invalid attribute type: ${attributeName}`);
        }

        try
        {
            handler.call(this, instance, entry.name, entry);
        }
        catch (exc)
        {
            if (cast(exc, IRootReaderException) === null) throw exc;
            throw new IRootReaderException(`${attributeName}: ${exc.message}`);
        }
    }

    /**
     * Decodes a binary block through a new instance of its owner, because only the class can
     * decode its bytes, and returns the member that holds the result.
     *
     * @param {string} typeName The owner's class name, as the file gives it.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The block's member.
     * @returns {*} The decoded member.
     */
    _ReadBinaryBlockValue(typeName, entry)
    {
        const instance = BeClasses.CreateInstanceFromName(typeName);
        this.ReadBinaryBlock(instance, entry.name);
        return instance[entry.key];
    }

    /**
     * Reads a referenced object into a new record: null, a marker for one already read, or a new record.
     *
     * @returns {object|null} The record.
     * @throws {IRootReaderException} When no class of that name is registered.
     */
    ReadIRootClass()
    {
        const referenceIx = this.ReadValue__Int32();

        if (referenceIx === 0)
        {
            return null;
        }

        const existingInstance = this._referenceMap.get(referenceIx);
        if (existingInstance !== undefined)
        {
            if (!Object.hasOwn(existingInstance, ID_FIELD)) existingInstance[ID_FIELD] = referenceIx;
            return { [REFERENCE_FIELD]: referenceIx };
        }

        const record = this._ReadRecord();

        this._referenceMap.set(referenceIx, record);

        return record;
    }

    /**
     * Reads one object's data into a new record.
     *
     * @returns {object} The record. It has no prototype: its keys are data.
     * @throws {IRootReaderException} When no class of that name is registered.
     */
    _ReadRecord()
    {
        const dataSize = this.ReadValue__UInt32();

        const startPos = this._curData;

        const typeName = this.ReadString();

        // The class's ClassInfo from the injected registry, as BlackReader reads one; nothing is constructed.
        const registration = BeClasses.GetClassRegistration(typeName);

        if (registration === null)
        {
            throw new IRootReaderException(`Failed to create an instance of ${typeName}`);
        }

        const definition = ClassInfo.exposeToBlue(registration.type);

        const record = Object.create(null);
        record[TYPE_FIELD] = typeName;

        this.ReadMembers(record, definition, startPos + dataSize);

        return record;
    }

    /**
     * Reads a float array into a new array.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     */
    HandlePropertyFloatArray(holder, key, entry)
    {
        const value = [];
        for (let i = 0; i < entry.floatArraySize; i++)
        {
            value[i] = this.ReadValue__Float();
        }
        this._ReplaceNonFiniteElements(value, entry.floatArraySize, entry.name);
        holder[key] = value;
    }

    /**
     * Reads a signed 64-bit member as read: a record is data, not runtime storage.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     */
    HandlePropertyInt64(holder, key, entry)
    {
        holder[key] = this.ReadValue__Int64();
    }

    /**
     * Reads an unsigned 64-bit member as read: a record is data, not runtime storage.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     */
    HandlePropertyUInt64(holder, key, entry)
    {
        holder[key] = this.ReadValue__UInt64();
    }

    /**
     * Reads a reference member. A record or marker has no class to check against the declared one.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     */
    HandlePropertyIRootPtr(holder, key, entry)
    {
        holder[key] = this.ReadIRootClass();
    }

    /**
     * Reads a member stored inside its owner into new storage. The compiled
     * entry says what it is, as there is no destination to cast.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     */
    HandlePropertyIRoot(holder, key, entry)
    {
        switch (entry.destination)
        {
            case BLACK_DESTINATION.LIST:
            case BLACK_DESTINATION.ARRAY:
            case BLACK_DESTINATION.SET:
                this.ReadArray(holder, key, entry);
                return;

            case BLACK_DESTINATION.DICT:
                this.ReadDict(holder, key, entry);
                return;

            case BLACK_DESTINATION.STRUCTURELIST:
                this.ReadStructureList(holder, key, entry);
                return;

            case BLACK_DESTINATION.WRAPPER:
            {
                const value = getWrapperLayout(entry.wrapperClass, entry.wrapperKind).defaults.slice();
                this._ReadWrapperElements(value, entry);
                this._ReplaceNonFiniteElements(value, value.length, entry.name);
                holder[key] = value;
                return;
            }

            default:
                holder[key] = this._ReadRecord();
        }
    }

    /**
     * Reads a list into a new array. Null items stay: a record shows what the file holds.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     */
    ReadArray(holder, key, entry)
    {
        const numEntries = this.ReadValue__Int32();

        const items = [];
        for (let i = 0; i < numEntries; ++i)
        {
            items.push(this.ReadIRootClass());
        }

        holder[key] = items;
    }

    /**
     * Reads a dictionary into a new object. Its keys are data, `__proto__` included.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     */
    ReadDict(holder, key, entry)
    {
        const numEntries = this.ReadValue__Int32();

        const entries = [];
        for (let i = 0; i < numEntries; ++i)
        {
            const name = this.ReadString();
            entries.push([ name, this.ReadIRootClass() ]);
        }

        holder[key] = Object.fromEntries(entries);
    }

    /**
     * Reads a structure list into new plain records. Fields a short record does not hold are left out.
     *
     * @param {object} holder The record.
     * @param {string} key The member's name.
     * @param {import("../../base/VarEntry.js").VarEntry} entry The member's compiled entry.
     * @throws {IRootReaderException} When the records do not fit the layout.
     */
    ReadStructureList(holder, key, entry)
    {
        const numItems = this.ReadValue__Int32();
        const structureSize = this.ReadValue__UInt16();

        const { structure } = entry;
        const { fields, boundaries } = structure;

        const short = structureSize < structure.size && boundaries.includes(structureSize);

        if (numItems < 0 || (structureSize !== structure.size && !short))
        {
            throw new IRootReaderException("Structure is not compatible with data in file");
        }

        const handlers = this._propertyHandlers;
        const start = this._curData;

        const list = [];
        for (let i = 0; i < numItems; ++i)
        {
            const record = {};
            const base = start + i * structureSize;

            for (let j = 0; j < fields.length; ++j)
            {
                const field = fields[j];
                if (short && boundaries[j] > structureSize) continue;
                this._curData = base + field.offset;
                handlers[field.type].call(this, record, field.name, field);
            }

            list.push(record);
        }

        this._curData = start + numItems * structureSize;

        holder[key] = list;
    }
}

const prototype = CjsBlackRecordReader.prototype;

HANDLERS[VARTYPE.FLOATARRAY] = prototype.HandlePropertyFloatArray;
HANDLERS[VARTYPE.INT64] = prototype.HandlePropertyInt64;
HANDLERS[VARTYPE.UINT64] = prototype.HandlePropertyUInt64;
HANDLERS[VARTYPE.IROOT] = prototype.HandlePropertyIRoot;
HANDLERS[VARTYPE.IROOTPTR] = prototype.HandlePropertyIRootPtr;
HANDLERS[VARTYPE.IROOTWEAKREF] = prototype.HandlePropertyIRootPtr;
