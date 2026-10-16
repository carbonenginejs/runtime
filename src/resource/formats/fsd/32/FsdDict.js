import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdDict.h
// Source: fsd/FsdDict.cpp
import { BinaryLoader } from "./BinaryLoader.js";
import { BinaryLoaderHelper } from "./BinaryLoaderHelper.js";
import { createFsdDictOffsetLookup } from "./FsdDictOffsetLookup/createFsdDictOffsetLookup.js";
import { FooterOffsetSize } from "./FsdDictOffsetLookup/FooterOffsetSize.js";
import { OFFSET_LOOKUP_RESULT } from "./FsdDictOffsetLookup/FsdDictOffsetLookup.js";
import { PyErr_SetString, PyExc, PyObject_Repr } from "./pyErr.js";

/** @typedef {import("./FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */
/** @typedef {import("./FsdDictOffsetLookup/FsdDictOffsetLookup.js").FsdDictOffsetLookup} FsdDictOffsetLookup */

/**
 * A lazily decoded legacy FSD dict (FsdDict.h).
 *
 * Values sit after the dict's `uint32_t` data size; the key footer gives each
 * value's offset from there. Carbon's Python type supports only `d[key]` and
 * `key in d`, through `GetValue` and `Contains`, which are called directly
 * here. It has no length, iteration or key listing: `len()` raises
 * AttributeError and `dir()` returns NULL. So neither does this class.
 */
export class FsdDict
{
    /** @type {FsdSchemaAttributes|null} The dict's schema. */
    _schemaAttributes = null;

    /** @type {FsdSchemaAttributes|null} The value schema. */
    _valueSchemaAttributes = null;

    /** @type {Uint8Array|null} Source bytes. */
    _data = null;

    /** @type {string} Logical path, used in value paths and messages. */
    _path = "";

    /** @type {number} Byte offset of the first value byte. */
    _offsetToData = 0;

    /** @type {FsdDictOffsetLookup|null} The key index. */
    _offsetLookup = null;

    /**
     * Bind the dict to its bytes and key index (FsdDict.cpp:22-32).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the dict.
     * @param {FsdSchemaAttributes} schemaAttributes Dict schema.
     * @param {FsdDictOffsetLookup} offsetLookup Key index.
     * @param {string} path Logical path.
     */
    Initialize(data, offset, schemaAttributes, offsetLookup, path)
    {
        this._data = data;
        this._schemaAttributes = schemaAttributes;
        this._valueSchemaAttributes = schemaAttributes.dictAttributes.valueSchema;
        this._path = path;

        // The data starts after the dict's uint32_t data size.
        this._offsetToData = offset + 4;
        this._offsetLookup = offsetLookup;
    }

    /**
     * Decode the value of one key (FsdDict.cpp:34-59).
     *
     * A footer that records a positive size has the value copied out first
     * and decoded from offset 0 of the copy.
     *
     * Divergences: Carbon sets the KeyError and returns None, which CPython
     * turns into SystemError (CE-119); the port throws the KeyError. Carbon's
     * copy is a local `std::string` that is freed on return while a lazy
     * object, list, dict or vector decoded from it keeps pointing into it
     * (CE-122); here the copy stays alive with the value.
     *
     * @param {unknown} key Dict key: an integer for int-keyed dicts, a string for string-keyed ones.
     * @returns {unknown} The decoded value or lazy container.
     * @throws {Error} KeyError when the key is absent or of the wrong type.
     */
    GetValue(key)
    {
        const offsetAndSize = new FooterOffsetSize();
        const s = PyObject_Repr(key);

        if (!this._FindKeyValueOffset(key, offsetAndSize))
        {
            PyErr_SetString(PyExc.KeyError, "FsdDict '" + this._path + "': does not have the following key " + s);
        }

        const newPath = this._path + "[" + s + "]";

        if (offsetAndSize.size > 0)
        {
            const objectData = BinaryLoaderHelper.getSubsetOfData(this._data, this._offsetToData + offsetAndSize.offset, offsetAndSize.size);
            return BinaryLoader.loadBinaryFromString(objectData, 0, this._valueSchemaAttributes, newPath);
        }

        return BinaryLoader.loadBinaryFromString(this._data, this._offsetToData + offsetAndSize.offset, this._valueSchemaAttributes, newPath);
    }

    /**
     * Test whether a key is present (FsdDict.cpp:71-74).
     *
     * @param {unknown} key Dict key.
     * @returns {boolean} True when present.
     */
    Contains(key)
    {
        return this._offsetLookup.Contains(key);
    }

    /**
     * Look a key up in the index (FsdDict.cpp:61-65).
     *
     * @param {unknown} key Dict key.
     * @param {FooterOffsetSize} offset Filled on success.
     * @returns {boolean} True when found.
     */
    _FindKeyValueOffset(key, offset)
    {
        return this._offsetLookup.GetOffsetAndSize(key, offset) === OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_OK;
    }

    /**
     * Create a dict with its key index (FsdDict.cpp:205-212).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the dict.
     * @param {FsdSchemaAttributes} schemaAttributes Dict schema.
     * @param {string} path Logical path.
     * @returns {FsdDict} The dict.
     */
    static createFsdDict(data, offset, schemaAttributes, path)
    {
        const fsdDictOffset = createFsdDictOffsetLookup(data, offset, schemaAttributes);
        const fsdDict = new FsdDict();

        fsdDict.Initialize(data, offset, schemaAttributes, fsdDictOffset, path);
        return fsdDict;
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FsdDict";
}

export default FsdDict;

CjsSchema.blue.define(FsdDict, { className: "FsdDict" });
