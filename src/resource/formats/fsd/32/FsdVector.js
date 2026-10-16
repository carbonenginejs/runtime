import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdVector.h
// Source: fsd/FsdVector.cpp
import { BinaryLoaderHelper } from "./BinaryLoaderHelper.js";
import { ReadComponents } from "./BinaryLoader.js";
import { PyErr_SetString, PyExc } from "./pyErr.js";
import { SchemaType } from "./schemaTypes.js";

/** @typedef {import("./FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */

/**
 * Carbon's `VectorType` enumeration (FsdVector.h:10-18).
 *
 * @enum {number}
 */
export const VectorType = Object.freeze({
    FSD_VECTOR2: 0,
    FSD_VECTOR3: 1,
    FSD_VECTOR4: 2,
    FSD_VECTOR2D: 3,
    FSD_VECTOR3D: 4,
    FSD_VECTOR4D: 5,
    UNKNOWN_VECTOR_TYPE: 6,
});

/**
 * A legacy FSD vector whose schema names its components (FsdVector.h).
 *
 * A vector schema with `aliases` loads as this instead of a plain component
 * array. An alias reads one component; `data` is the whole component array,
 * decoded when the vector is created. Carbon's Python type routes attribute
 * access, `len()` and indexing to `GetByAttribute`, `GetLength` and
 * `GetByIndex`, which are called directly here.
 */
export class FsdVector
{
    /** @type {number} One of {@link VectorType}. */
    _vectorType = VectorType.UNKNOWN_VECTOR_TYPE;

    /** @type {FsdSchemaAttributes|null} The vector's schema. */
    _schemaAttributes = null;

    /** @type {Uint8Array|null} Bytes starting at the vector. */
    _data = null;

    /** @type {string} Logical path. */
    _path = "";

    /** @type {Array<number>|null} The components, as Blue wraps the vector. */
    _exposedData = null;

    /**
     * Bind the vector to its bytes and decode its components
     * (FsdVector.cpp:6-40). An unrecognised schema type reads as `Vector4d`,
     * as Carbon's `default` case does.
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     */
    Initialize(data, offset, schemaAttributes, path)
    {
        this._data = data.subarray(offset);
        this._schemaAttributes = schemaAttributes;
        this._path = path;

        switch (schemaAttributes.schemaType)
        {
            case SchemaType.FLOAT32_VECTOR2_TUPLE_SCHEMA_TYPE:
                this._vectorType = VectorType.FSD_VECTOR2;
                this._exposedData = ReadComponents(this._data, 0, 2, false);
                break;
            case SchemaType.FLOAT32_VECTOR3_TUPLE_SCHEMA_TYPE:
                this._vectorType = VectorType.FSD_VECTOR3;
                this._exposedData = ReadComponents(this._data, 0, 3, false);
                break;
            case SchemaType.FLOAT32_VECTOR4_TUPLE_SCHEMA_TYPE:
                this._vectorType = VectorType.FSD_VECTOR4;
                this._exposedData = ReadComponents(this._data, 0, 4, false);
                break;
            case SchemaType.DOUBLE_VECTOR2_TUPLE_SCHEMA_TYPE:
                this._vectorType = VectorType.FSD_VECTOR2D;
                this._exposedData = ReadComponents(this._data, 0, 2, true);
                break;
            case SchemaType.DOUBLE_VECTOR3_TUPLE_SCHEMA_TYPE:
                this._vectorType = VectorType.FSD_VECTOR3D;
                this._exposedData = ReadComponents(this._data, 0, 3, true);
                break;
            case SchemaType.DOUBLE_VECTOR4_TUPLE_SCHEMA_TYPE:
            default:
                this._vectorType = VectorType.FSD_VECTOR4D;
                this._exposedData = ReadComponents(this._data, 0, 4, true);
                break;
        }
    }

    /**
     * Read a component by alias, or the component array as `data`
     * (FsdVector.cpp:42-58). An alias named "data" wins over the array.
     *
     * @param {string} attribute_name Alias or "data".
     * @returns {number|Array<number>} The component, or the component array.
     * @throws {Error} AttributeError for any other name.
     */
    GetByAttribute(attribute_name)
    {
        const aliases = this._schemaAttributes.vectorAttributes.aliases;

        if (aliases.has(attribute_name)) return this._GetValueByIndex(aliases.get(attribute_name));
        if (attribute_name === "data") return this._exposedData;

        return PyErr_SetString(PyExc.AttributeError, "Attribute '" + attribute_name + "' does not exist on this instance");
    }

    /**
     * Read a component by index (FsdVector.cpp:74-94).
     *
     * The index is narrowed to `uint8_t`, so it is never negative. Carbon's
     * bound check is `index > length`: `index == length` reads the four bytes
     * after the last float component (CE-117). The port reproduces that read.
     *
     * @param {number} index Component index.
     * @returns {number} The component.
     * @throws {Error} IndexError when the index exceeds the length.
     */
    GetByIndex(index)
    {
        const length = this.GetLength() & 0xFF;
        const originalIndex = index & 0xFF;

        index = index & 0xFF;
        if (index > length)
        {
            PyErr_SetString(PyExc.IndexError, `FsdVector: ${this._schemaAttributes.schemaTypeAsString} trying to get index ${originalIndex} of a vector that is ${length} long.`);
        }

        return this._GetValueByIndex(index);
    }

    /**
     * Return the component count (FsdVector.cpp:96-114).
     *
     * @returns {number} 2, 3 or 4.
     * @throws {Error} AttributeError for an unknown vector type, which Initialize never leaves.
     */
    GetLength()
    {
        switch (this._vectorType)
        {
            case VectorType.FSD_VECTOR2:
            case VectorType.FSD_VECTOR2D:
                return 2;
            case VectorType.FSD_VECTOR3:
            case VectorType.FSD_VECTOR3D:
                return 3;
            case VectorType.FSD_VECTOR4:
            case VectorType.FSD_VECTOR4D:
                return 4;
            default:
                return PyErr_SetString(PyExc.AttributeError, "pyFSD.FsdVector: Could not determine length of vector with vectorType: " + this._vectorType);
        }
    }

    /**
     * Read the component at `index` (FsdVector.cpp:60-72).
     *
     * Carbon steps four bytes per index for doubles too, so for a double
     * vector index 1 reads a double from bytes 4-11 (CE-116). The port
     * reproduces that read.
     *
     * @param {number} index Component index.
     * @returns {number} The value read.
     */
    _GetValueByIndex(index)
    {
        const view = BinaryLoaderHelper.getDataView(this._data);
        const position = this._data.byteOffset + 4 * index;

        if (this._vectorType <= VectorType.FSD_VECTOR4) return view.getFloat32(position, true);
        return view.getFloat64(position, true);
    }

    /**
     * Create and initialise a vector (FsdVector.cpp:219-225).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {FsdVector} The vector.
     */
    static createFsdVector(data, offset, schemaAttributes, path)
    {
        const fsdVector = new FsdVector();

        fsdVector.Initialize(data, offset, schemaAttributes, path);
        return fsdVector;
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FsdVector";

    /** Carbon's `VectorType`, owned by this class. */
    static VectorType = VectorType;
}

export default FsdVector;

CjsSchema.blue.define(FsdVector, { className: "FsdVector" });
