// Source: blue/src/IRootReader.h
// Source: blue/src/IRootReader.cpp
//
// The half of Blue's persistence every stream reader shares. HandleAttribute
// finds a member of an object and calls the handler for the member's VARTYPE.
// The handler reads one typed value through the Read functions a subclass
// provides, and writes it. BlackReader supplies those functions from bytes.
//
// BESIDE, NOT LIVE. `blue/format/IRootReaderBase.js` is shaped for values: it
// has one value in hand and a switch on kind, and DictReader and YamlReader
// stand on it. This is Carbon's stream shape. It replaces that class for the
// stream readers when step 7 of the Blue plan passes its gate.
//
// WHERE A VALUE GOES. Carbon's handler takes a `Be::Var*`, the address of the
// member. JavaScript has no addresses, so a handler takes a holder and a key
// instead. That is the only change to the handler's job.
//
// WHAT A MEMBER IS. Carbon casts the destination to choose list, dict or
// structure list (IRootReader.cpp:160-187). Ours mostly can too, but a member
// may hold plain JavaScript storage, so the compiled entry's iid (the interface
// Carbon would cast to) and collection (how JavaScript stores it) say what it is,
// and the cast decides only between a mapped IList and a plain array.
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { VARTYPE } from "../../../global/model/graph/graphTypes.js";
import { cast, mappedInterfaces } from "../../compose/interface.js";
import { IList } from "../../exposure/IList.js";
import { InvalidAttributeException } from "../../format/InvalidAttributeException.js";
import { IRootReaderException } from "../../format/IRootReaderException.js";
import { BLUE_MATH_WRAPPERS, getWrapperLayout } from "../../../global/model/graph/blueMathWrappers.js";

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

const MIN_SAFE_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * Runtime storage of a 64-bit integer: a number within the safe range, a BigInt beyond it.
 *
 * @param {bigint} value The value read.
 * @returns {number|bigint} The stored form.
 */
function storedInt64(value)
{
    return value >= MIN_SAFE_BIGINT && value <= MAX_SAFE_BIGINT ? Number(value) : value;
}

/**
 * Carbon's QueryInterface against `mIID`, for a member that accepts several classes: the
 * exposed interface table decides, not JavaScript inheritance, so a class must map itself.
 *
 * @param {object} obj The object read.
 * @param {object} entry The member's compiled entry.
 * @returns {boolean} True when the member may hold it.
 */
function isAccepted(obj, entry)
{
    const { iids } = entry;
    if (iids.length === 0) return true;
    const interfaces = mappedInterfaces(obj.constructor);
    for (let i = 0; i < iids.length; i++)
    {
        if (interfaces.has(iids[i])) return true;
    }
    return false;
}

/**
 * Carbon's `IRootReaderBase`: members found by name, values read by VARTYPE.
 *
 * Carbon: IRootReaderBase (blue/src/IRootReader.h:55-124)
 */
export class IRootReaderBase
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "IRootReaderBase";

    /**
     * `s_propertyHandlers`: the handler for each VARTYPE (IRootReader.cpp:13-44).
     * Filled below the class, as `PropertyHandlerTableSetup` fills it.
     *
     * @type {Array<Function|null>}
     */
    static propertyHandlers = new Array(VARTYPE.VARTYPE_MAX + 1).fill(null);

    /**
     * The table this reader uses. Ours, for the reader that writes plain records, which replaces the handlers
     * that assume a member already holds its storage.
     *
     * @cjs
     * @type {Array<Function|null>}
     */
    _propertyHandlers = IRootReaderBase.propertyHandlers;

    /**
     * `m_filename`: used for error reporting.
     */
    _filename = "";

    /**
     * Whether this file has already logged a non-finite number.
     *
     * @cjs
     */
    _loggedNonFinite = false;

    /**
     * The value that replaces a non-finite number read from a file, logged once per file.
     * `value - value` is 0 for every finite number and NaN otherwise, so callers test it before calling this.
     *
     * @cjs Not Carbon: these are authoring errors, 19 values in 4 client files
     * @param {string} memberName The member that held it.
     * @returns {number} 0.
     */
    _ReplaceNonFinite(memberName)
    {
        if (!this._loggedNonFinite)
        {
            this._loggedNonFinite = true;
            CcpLog.CCP_LOGWARN("%s", `${this._filename || "Object file"}: non-finite number in ${memberName}, read as 0`);
        }
        return 0;
    }

    /**
     * Replaces any non-finite number in a member's array.
     *
     * @cjs Not Carbon: see `_ReplaceNonFinite`
     * @param {Float32Array|number[]} value The array.
     * @param {number} count Elements to check.
     * @param {string} memberName The member.
     */
    _ReplaceNonFiniteElements(value, count, memberName)
    {
        for (let i = 0; i < count; i++)
        {
            const element = value[i];
            if (element - element !== 0) value[i] = this._ReplaceNonFinite(memberName);
        }
    }

    /**
     * Handles one attribute of an object: finds its member, reads its value, and notifies.
     *
     * @adapted `definition` stands in for `instance->ClassType()`, which the reader already holds; a persisted
     * property is written through its setter, which Fixes CE-179
     * @param {string} attributeName The attribute's name.
     * @param {object} instance The object being read.
     * @param {object} definition The object's compiled class.
     * @param {object|null} notify The object as INotify, or null to send no notification.
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

        let holder = instance;
        let key = entry.key;
        if (entry.index >= 0)
        {
            holder = instance[key];
            key = entry.index;
        }

        if (entry.type === VARTYPE.BINARYBLOCK)
        {
            // Quirk, reproduced: a class without ICustomPersist does not consume the
            // block, so the stream is left at its size field (IRootReader.cpp:83-87).
            if (definition.isCustomPersist)
            {
                this.ReadBinaryBlock(instance, attributeName);
            }
        }
        else
        {
            const handler = this._propertyHandlers[entry.type];

            if (handler === null || handler === undefined)
            {
                throw new IRootReaderException(`Invalid attribute type: ${attributeName}`);
            }

            try
            {
                handler.call(this, holder, key, entry);
            }
            catch (exc)
            {
                if (cast(exc, IRootReaderException) === null) throw exc;
                throw new IRootReaderException(`${attributeName}: ${exc.message}`);
            }
        }

        if (notify !== null && entry.notify)
        {
            notify.OnModified(entry.name);
        }
    }

    /**
     * Reads a signed 32-bit member.
     *
     * @adapted a holder and key stand in for `Be::Var*`
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyLong(holder, key, entry)
    {
        holder[key] = this.ReadValue__Int32();
    }

    /**
     * Reads an unsigned 32-bit member.
     *
     * @adapted a holder and key stand in for `Be::Var*`
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyULong(holder, key, entry)
    {
        holder[key] = this.ReadValue__UInt32();
    }

    /**
     * Reads an 8-bit member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; Carbon reads the bits into a member whose C++ type gives
     * the sign, and JavaScript takes the sign from the entry
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyByte(holder, key, entry)
    {
        holder[key] = entry.signed ? this.ReadValue__Int8() : this.ReadValue__UInt8();
    }

    /**
     * Reads a 16-bit member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; Carbon reads the bits into a member whose C++ type gives
     * the sign, and JavaScript takes the sign from the entry
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyShort(holder, key, entry)
    {
        holder[key] = entry.signed ? this.ReadValue__Int16() : this.ReadValue__UInt16();
    }

    /**
     * Reads a float member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; a non-finite number reads as 0, because those in client files are authoring errors
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyFloat(holder, key, entry)
    {
        const value = this.ReadValue__Float();
        holder[key] = value - value === 0 ? value : this._ReplaceNonFinite(entry.name);
    }

    /**
     * Fills a float array member in place.
     *
     * @adapted a holder and key stand in for `Be::Var*`; the member's array is its storage, and a property gets it
     * back through its setter; a non-finite number reads as 0, because those in client files are authoring errors; the
     * count is `entry.length`, not `GetFloatArraySize()`, because struct field records reach here as plain objects
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyFloatArray(holder, key, entry)
    {
        const value = holder[key];
        this.ReadFloatArray(value, entry.length);
        this._ReplaceNonFiniteElements(value, entry.length, entry.name);
        if (entry.isProperty) holder[key] = value;
    }

    /**
     * Reads a double member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; a non-finite number reads as 0, because those in client files are authoring errors
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyDouble(holder, key, entry)
    {
        const value = this.ReadValue__Double();
        holder[key] = value - value === 0 ? value : this._ReplaceNonFinite(entry.name);
    }

    /**
     * Reads a boolean member.
     *
     * @adapted a holder and key stand in for `Be::Var*`
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyBool(holder, key, entry)
    {
        holder[key] = this.ReadValue__Bool();
    }

    /**
     * Reads a member stored inside its owner: a list, a dictionary, a structure list or an embedded object.
     *
     * @adapted a holder and key stand in for `Be::Var*`; the entry says what the member is, because a member may hold
     * plain JavaScript storage that cannot be cast, and every reader's IROOT handling lands here
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     * @throws {IRootReaderException} When an embedded object has no existing storage.
     */
    HandlePropertyIRoot(holder, key, entry)
    {
        const value = holder[key];

        // Carbon casts the member to IList, IBlueDict, then IBlueStructureList (IRootReader.cpp:160-187): the row's
        // iid names the interface, so the three tests are exclusive and their order does not matter; its collection
        // says how JavaScript stores what has none.
        if (entry.iid === "IBlueStructureList")
        {
            this.ReadStructureList(holder, key, entry);
            return;
        }
        if (entry.iid === "IList")
        {
            if (value === null || value === undefined || !mappedInterfaces(value.constructor).has(IList))
            {
                this.ReadArray(holder, key, entry);
                return;
            }
            this.ReadList(value);
        }
        else if (entry.iid === "IBlueDict")
        {
            this.ReadDict(holder, key, entry);
            return;
        }
        else if (entry.collection === "array")
        {
            this.ReadArray(holder, key, entry);
            return;
        }
        else if (entry.collection === "set")
        {
            this.ReadSet(holder, key, entry);
            return;
        }
        else if (Object.hasOwn(BLUE_MATH_WRAPPERS, entry.iid))
        {
            this.ReadWrapper(value, entry);
            this._ReplaceNonFiniteElements(value, getWrapperLayout(entry.iid).elements.length, entry.name);
        }
        else
        {
            if (value === null || value === undefined)
            {
                throw new IRootReaderException(`Embedded ${entry.name} has no existing storage`);
            }
            this.ReadIRoot(value);
        }

        // Carbon wrote into the member itself; a property takes it back through its setter.
        if (entry.isProperty) holder[key] = value;
    }

    /**
     * Reads a reference member, checked against the class it declares.
     *
     * @adapted a holder and key stand in for `Be::Var*`, and there is no reference count to release
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     * @throws {IRootReaderException} When the object is not of the declared class.
     */
    HandlePropertyIRootPtr(holder, key, entry)
    {
        const obj = this.ReadIRootClass();

        if (obj !== null && !isAccepted(obj, entry))
        {
            throw new IRootReaderException("Incorrect type for member");
        }

        holder[key] = obj;
    }

    /**
     * Reads a weak reference member, checked against the class it declares.
     *
     * @adapted a holder and key stand in for `Be::Var*`, and a weak member is a plain reference
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     * @throws {IRootReaderException} When the object is not of the declared class.
     */
    HandlePropertyIRootWeakRef(holder, key, entry)
    {
        const obj = this.ReadIRootClass();

        if (obj !== null && !isAccepted(obj, entry))
        {
            throw new IRootReaderException("Incorrect type for member");
        }

        holder[key] = obj;
    }

    /**
     * Reads a string member.
     *
     * @adapted a holder and key stand in for `Be::Var*`
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyCString(holder, key, entry)
    {
        holder[key] = this.ReadString();
    }

    /**
     * Reads a string member.
     *
     * @adapted a holder and key stand in for `Be::Var*`
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyStdString(holder, key, entry)
    {
        holder[key] = this.ReadString();
    }

    /**
     * Reads a wide string member.
     *
     * @adapted a holder and key stand in for `Be::Var*`
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyStdWString(holder, key, entry)
    {
        holder[key] = this.ReadWString();
    }

    /**
     * Reads a wide string member.
     *
     * @adapted a holder and key stand in for `Be::Var*`
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyWCString(holder, key, entry)
    {
        holder[key] = this.ReadWString();
    }

    /**
     * Reads a signed 64-bit member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; JavaScript stores it as a number while it is exact
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyInt64(holder, key, entry)
    {
        holder[key] = storedInt64(this.ReadValue__Int64());
    }

    /**
     * Reads an unsigned 64-bit member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; JavaScript stores it as a number while it is exact
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyUInt64(holder, key, entry)
    {
        holder[key] = storedInt64(this.ReadValue__UInt64());
    }

    /**
     * Empty in Carbon too (IRootReader.cpp:284-287): HandleAttribute handles a binary block itself.
     *
     * @implemented
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertyBinaryBlock(holder, key, entry)
    {
    }

    /**
     * Reads a shared string member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; JavaScript strings are already shared
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertySharedString(holder, key, entry)
    {
        holder[key] = this.ReadString();
    }

    /**
     * Reads a shared wide string member.
     *
     * @adapted a holder and key stand in for `Be::Var*`; JavaScript strings are already shared
     * @param {object} holder The object or array holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    HandlePropertySharedStringW(holder, key, entry)
    {
        holder[key] = this.ReadWString();
    }

    /**
     * Finds a PERSIST member by name.
     *
     * @adapted one compiled lookup per class stands in for Carbon's walk of the member tables, and JavaScript has no
     * offset to return
     * @param {string} name The attribute's name.
     * @param {object} type The class.
     * @returns {object|null} The member's compiled entry, or null.
     */
    FindEntry(name, type)
    {
        return type.entries.get(name) ?? null;
    }

    /** @abstract @returns {bigint} `ReadValue( int64_t& )`. */
    ReadValue__Int64() {}

    /** @abstract @returns {bigint} `ReadValue( uint64_t& )`. */
    ReadValue__UInt64() {}

    /** @abstract @returns {number} `ReadValue( uint32_t& )`. */
    ReadValue__UInt32() {}

    /** @abstract @returns {number} `ReadValue( int32_t& )`. */
    ReadValue__Int32() {}

    /** @abstract @returns {number} `ReadValue( uint16_t& )`. */
    ReadValue__UInt16() {}

    /** @cjs @abstract @returns {number} A uint16 read as signed: Carbon's member type gives the sign. */
    ReadValue__Int16() {}

    /** @abstract @returns {number} `ReadValue( uint8_t& )`. */
    ReadValue__UInt8() {}

    /** @cjs @abstract @returns {number} A uint8 read as signed: Carbon's member type gives the sign. */
    ReadValue__Int8() {}

    /** @abstract @returns {boolean} `ReadValue( bool& )`. */
    ReadValue__Bool() {}

    /** @abstract @returns {number} `ReadValue( float& )`. */
    ReadValue__Float() {}

    /** @abstract @returns {number} `ReadValue( double& )`. */
    ReadValue__Double() {}

    /** @abstract @returns {string} The next string. */
    ReadString() {}

    /** @abstract @returns {string} The next wide string. */
    ReadWString() {}

    /**
     * @abstract
     * @param {object} customPersist The object as ICustomPersist.
     * @param {string} propertyName The block's member name.
     */
    ReadBinaryBlock(customPersist, propertyName) {}

    /**
     * @abstract
     * @param {Float32Array} value The array to fill.
     * @param {number} count Number of floats.
     */
    ReadFloatArray(value, count) {}

    /**
     * @abstract
     * @param {object} list The object as IList.
     */
    ReadList(list) {}

    /**
     * @cjs A member holding a plain array instead of an IList.
     * @abstract
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    ReadArray(holder, key, entry) {}

    /**
     * @cjs A member holding a JavaScript Set.
     * @abstract
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    ReadSet(holder, key, entry) {}

    /**
     * @adapted a member's dictionary is a JavaScript Map, which there may be none of yet
     * @abstract
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    ReadDict(holder, key, entry) {}

    /**
     * @adapted a member's records are a JavaScript array, which there may be none of yet
     * @abstract
     * @param {object} holder The object holding the member.
     * @param {string|number} key The member's place in the holder.
     * @param {object} entry The member's compiled entry.
     */
    ReadStructureList(holder, key, entry) {}

    /**
     * @cjs A math member: Carbon embeds a TriMatrix or TriVector object, and ours is a typed array.
     * @abstract
     * @param {Float32Array} value The member's array.
     * @param {object} entry The member's compiled entry.
     */
    ReadWrapper(value, entry) {}

    /**
     * @abstract
     * @param {object} obj The embedded object.
     */
    ReadIRoot(obj) {}

    /**
     * @abstract
     * @returns {object|null} The next object.
     */
    ReadIRootClass() {}
}

const handlers = IRootReaderBase.propertyHandlers;
const prototype = IRootReaderBase.prototype;

handlers[VARTYPE.LONG] = prototype.HandlePropertyLong;
handlers[VARTYPE.ULONG] = prototype.HandlePropertyULong;
handlers[VARTYPE.FLOAT] = prototype.HandlePropertyFloat;
handlers[VARTYPE.DOUBLE] = prototype.HandlePropertyDouble;
handlers[VARTYPE.BOOL] = prototype.HandlePropertyBool;
handlers[VARTYPE.IROOT] = prototype.HandlePropertyIRoot;
handlers[VARTYPE.IROOTPTR] = prototype.HandlePropertyIRootPtr;
handlers[VARTYPE.IROOTWEAKREF] = prototype.HandlePropertyIRootWeakRef;
handlers[VARTYPE.CSTRING] = prototype.HandlePropertyCString;
handlers[VARTYPE.INT64] = prototype.HandlePropertyInt64;
handlers[VARTYPE.UINT64] = prototype.HandlePropertyUInt64;
handlers[VARTYPE.REFERENCE] = prototype.HandlePropertyCString;
handlers[VARTYPE.WCSTRING] = prototype.HandlePropertyWCString;
handlers[VARTYPE.WREFERENCE] = prototype.HandlePropertyWCString;
handlers[VARTYPE.FLOATARRAY] = prototype.HandlePropertyFloatArray;
handlers[VARTYPE.STDSTRING] = prototype.HandlePropertyStdString;
handlers[VARTYPE.STDWSTRING] = prototype.HandlePropertyStdWString;
handlers[VARTYPE.BYTE] = prototype.HandlePropertyByte;
handlers[VARTYPE.SHORT] = prototype.HandlePropertyShort;
handlers[VARTYPE.SHAREDSTRING] = prototype.HandlePropertySharedString;
handlers[VARTYPE.SHAREDSTRINGW] = prototype.HandlePropertySharedStringW;
