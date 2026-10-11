// Source: fsd/FsdList.h
// Source: fsd/FsdList.cpp
import { BinaryLoader } from "./BinaryLoader.js";
import { BinaryLoaderHelper } from "./BinaryLoaderHelper.js";
import { PyErr_SetString, PyExc } from "./pyErr.js";

/** @typedef {import("./FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */
/** @typedef {import("./FsdSchema/ListSchemaAttributes.js").ListSchemaAttributes} ListSchemaAttributes */

/**
 * A lazily decoded legacy FSD list (FsdList.h).
 *
 * Layout: a list whose schema has no `length` starts with a `uint32_t`
 * count. Items of a sized schema follow at a fixed stride; otherwise a
 * `uint32_t` offset per item, relative to the list start, locates each one.
 * The offsets are computed when the list is created; items decode on access.
 *
 * Carbon's Python type gives `len()` and indexing through `GetLength` and
 * `GetIndex`, which are called directly here.
 */
export class FsdList
{
    /** @type {ListSchemaAttributes|null} The list's schema. */
    _schemaAttributes = null;

    /** @type {Uint8Array|null} Bytes starting at the list. */
    _data = null;

    /** @type {string} Logical path, used in item paths and messages. */
    _path = "";

    /** @type {number} Byte offset of the list in the original data. */
    _offset = 0;

    /** @type {number} Item count. */
    _listLength = 0;

    /** @type {Array<number>} Byte offset of each item from the list start. */
    _offsetLookup = [];

    /**
     * Bind the list to its bytes and compute its item offsets
     * (FsdList.cpp:9-47).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the list.
     * @param {FsdSchemaAttributes} schemaAttributes List schema.
     * @param {string} path Logical path.
     */
    Initialize(data, offset, schemaAttributes, path)
    {
        this._schemaAttributes = schemaAttributes.listAttributes;
        this._path = path;
        this._offset = offset;

        let offsetToData = 0;
        if (this._schemaAttributes.fixedSized)
        {
            this._listLength = this._schemaAttributes.listSize;
        }
        else
        {
            offsetToData = 4;
            this._listLength = BinaryLoaderHelper.getUnsignedIntFromData(data, offset);
        }

        this._data = data.subarray(offset);

        const itemSchema = this._schemaAttributes.listItemSchema;
        for (let i = 0; i < this._listLength; i++)
        {
            this._offsetLookup.push(itemSchema.hasSize
                ? offsetToData + i * itemSchema.size
                : BinaryLoaderHelper.getUnsignedIntFromData(this._data, offsetToData + i * 4));
        }
    }

    /**
     * Return the item count (FsdList.h:21).
     *
     * @returns {number} The count.
     */
    GetLength()
    {
        return this._listLength;
    }

    /**
     * Decode one item (FsdList.cpp:49-70). A negative index counts from the end.
     *
     * Divergence: Carbon's bound check is `index > length`, so `index ==
     * length` passes and reads one entry past its offset vector, which is
     * undefined behaviour (CE-117). The port raises the same IndexError for
     * it. Carbon also sets the IndexError and returns None, which CPython
     * turns into SystemError (CE-119); the port throws the IndexError.
     *
     * @param {number} index Item index, narrowed to `int32_t`.
     * @returns {unknown} The decoded item or lazy container.
     * @throws {Error} IndexError when the index is out of range.
     */
    GetIndex(index)
    {
        index = index | 0;
        const originalIndex = index >>> 0;

        if (index < 0) index += this._listLength;

        if ((index >>> 0) > this._listLength || index < 0 || index === this._listLength)
        {
            PyErr_SetString(PyExc.IndexError, "FsdList: trying to get index " + originalIndex
                + "from a list that has " + this._listLength + "elements");
        }

        const offset = this._offsetLookup[index];
        const fmt = this._path + "[" + index + "]";

        return BinaryLoader.loadBinaryFromString(this._data, offset, this._schemaAttributes.listItemSchema, fmt);
    }

    /**
     * Create and initialise a list (FsdList.cpp:171-177).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the list.
     * @param {FsdSchemaAttributes} schemaAttributes List schema.
     * @param {string} path Logical path.
     * @returns {FsdList} The list.
     */
    static createFsdList(data, offset, schemaAttributes, path)
    {
        const fsdList = new FsdList();

        fsdList.Initialize(data, offset, schemaAttributes, path);
        return fsdList;
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FsdList";
}

export default FsdList;
