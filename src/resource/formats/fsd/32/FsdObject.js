import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdObject.h
// Source: fsd/FsdObject.cpp
// Source: fsd/FsdObject_Blue.cpp
import { BinaryLoader } from "./BinaryLoader.js";
import { BinaryLoaderHelper } from "./BinaryLoaderHelper.js";
import { PyErr_SetString, PyExc } from "./pyErr.js";

/** @typedef {import("./FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */
/** @typedef {import("./FsdSchema/ObjectSchemaAttributes.js").ObjectSchemaAttributes} ObjectSchemaAttributes */

/**
 * A lazily decoded legacy FSD object (FsdObject.h).
 *
 * Layout: attributes listed in `constantAttributeOffsets` sit at fixed
 * offsets from the object start. An object without a schema `size` then has,
 * at `endOfFixedSizedData`, a `uint64_t` bit field of the optional
 * attributes present, a `uint32_t` offset per present variable-offset
 * attribute, and the variable-sized data those offsets are relative to.
 *
 * Carbon exposes `GetAttr` to Python as `__getattr__` (FsdObject_Blue.cpp);
 * here it is called directly. Carbon's FsdObject is a Blue class, but the FSD
 * format module may import nothing outside FSD and the shared format helpers,
 * so it is a plain class here.
 */
export class FsdObject
{
    /** @type {ObjectSchemaAttributes|null} The object's schema. */
    _objectSchemaAttributes = null;

    /** @type {Map<string, number>} Byte offset of each present variable-offset attribute. */
    _offsetAttributeLookupTable = new Map();

    /** @type {number} Byte offset of the variable-sized data. */
    _offsetToVariableSizedData = 0;

    /** @type {boolean} True when the schema declared `size`. */
    _isFixedSize = false;

    /** @type {Uint8Array|null} Source bytes. */
    _data = null;

    /** @type {number} Byte offset of the object in `_data`. */
    _offset = 0;

    /** @type {string} Logical path, used in messages. */
    _path = "";

    /**
     * Bind the object to its bytes and map its variable-offset attributes
     * (FsdObject.cpp:22-70).
     *
     * Divergence: Carbon erases an absent optional attribute from its copy of
     * `attributesWithVariableOffset` without checking that it is listed there;
     * an unlisted one erases `end()`, which is undefined behaviour (CE-121).
     * The port throws instead.
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the object.
     * @param {FsdSchemaAttributes} schemaAttributes Object schema.
     * @param {string} path Logical path.
     * @throws {Error} With code `CJS_FSD_32_SCHEMA_INVALID` for an optional attribute without a variable offset.
     */
    SetObjectData(data, offset, schemaAttributes, path)
    {
        this._data = data;
        this._offset = offset;
        this._objectSchemaAttributes = schemaAttributes.objectAttributes;
        this._path = path;
        this._isFixedSize = schemaAttributes.hasSize;

        // A fixed-size object is read only through its constant offsets.
        if (this._isFixedSize) return;

        // 1. Drop the optional attributes this instance does not carry.
        const attributesWithVariableOffset = [ ...this._objectSchemaAttributes.attributesWithVariableOffset ];
        const optionalValueLookup = this._objectSchemaAttributes.optionalValueLookups;

        if (optionalValueLookup.size !== 0)
        {
            const view = BinaryLoaderHelper.getDataView(data);
            const optionalAttributesField = view.getBigUint64(data.byteOffset + offset + this._objectSchemaAttributes.endOfFixedSizedData, true);

            for (const [ attributeName, attributeBit ] of optionalValueLookup)
            {
                if (optionalAttributesField & attributeBit) continue;

                const index = attributesWithVariableOffset.indexOf(attributeName);
                if (index === -1) ThrowUnlistedOptional(attributeName, path);
                attributesWithVariableOffset.splice(index, 1);
            }
        }

        // 2. Map each present attribute to its offset in the variable data.
        const offsetAttributeArrayStart = this._offset + this._objectSchemaAttributes.endOfFixedSizedData + 8;
        const sizeOfOffsetAttributeTable = 4 * attributesWithVariableOffset.length;

        this._offsetToVariableSizedData = offsetAttributeArrayStart + sizeOfOffsetAttributeTable;

        for (let offsetTableOffset = 0; offsetTableOffset < sizeOfOffsetAttributeTable; offsetTableOffset += 4)
        {
            const name = attributesWithVariableOffset[offsetTableOffset / 4];
            const relative = BinaryLoaderHelper.getUnsignedIntFromData(this._data, offsetAttributeArrayStart + offsetTableOffset);

            this._offsetAttributeLookupTable.set(name, relative + this._offsetToVariableSizedData);
        }
    }

    /**
     * Decode one attribute by name (FsdObject.cpp:72-115).
     *
     * Order: an attribute missing from the schema is a KeyError; a constant
     * offset wins over a variable one; an absent optional attribute returns
     * its schema `default`; otherwise AttributeError.
     *
     * @param {string} attributeName Attribute name.
     * @returns {unknown} The decoded value or lazy container.
     * @throws {Error} KeyError when the schema has no such attribute; AttributeError when this instance lacks it and it has no default.
     */
    GetAttr(attributeName)
    {
        const newPath = this._path + "." + attributeName;
        const attributes = this._objectSchemaAttributes.attributes;

        if (!attributes.has(attributeName))
        {
            PyErr_SetString(PyExc.KeyError, "Object: " + this._path + " - Attribute '" + attributeName
                + "' is not in the schema for this object. It may be removed by the 'usage' flag under the build configuration that produced this data.");
        }

        const constantOffset = this._objectSchemaAttributes.constantAttributeOffsets.get(attributeName);
        if (constantOffset !== undefined)
        {
            return BinaryLoader.loadBinaryFromString(this._data, this._offset + constantOffset, attributes.get(attributeName), newPath);
        }

        const variableOffset = this._offsetAttributeLookupTable.get(attributeName);
        if (variableOffset !== undefined)
        {
            return BinaryLoader.loadBinaryFromString(this._data, variableOffset, attributes.get(attributeName), newPath);
        }

        const defaultValue = this._GetDefaultValue(attributeName);
        if (defaultValue !== undefined) return defaultValue;

        return PyErr_SetString(PyExc.AttributeError, "Object: " + this._path + " - Attribute '" + attributeName + "' does not exist on this instance");
    }

    /**
     * Return an attribute's schema default (FsdObject.cpp:117-137).
     *
     * Adapted: Carbon returns a `BlueStdResult` and writes the value to an out
     * parameter. A schema default comes from data and can never be
     * `undefined`, so `undefined` reports "no default" here.
     *
     * @param {string} attributeName Attribute name.
     * @returns {unknown} The default, the same value the schema holds, or undefined.
     */
    _GetDefaultValue(attributeName)
    {
        const schema = this._objectSchemaAttributes.attributes.get(attributeName);

        if (schema === undefined) return undefined;
        if (!schema.hasDefault) return undefined;

        return schema.defaultValue;
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FsdObject";
}

/**
 * Report an optional attribute that Carbon would erase from outside its list.
 *
 * @param {string} attributeName Optional attribute name.
 * @param {string} path Object path.
 * @returns {never} Always throws.
 * @throws {Error} With code `CJS_FSD_32_SCHEMA_INVALID`.
 */
function ThrowUnlistedOptional(attributeName, path)
{
    const error = new Error(`Object: ${path} - optional attribute '${attributeName}' is not in attributesWithVariableOffsets.`);

    error.code = "CJS_FSD_32_SCHEMA_INVALID";
    error.variant = "fsd32";
    throw error;
}

export default FsdObject;

CjsSchema.exposure.define("FsdObject")(FsdObject);
