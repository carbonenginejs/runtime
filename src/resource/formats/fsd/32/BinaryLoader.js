import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/BinaryLoader.h
// Source: fsd/BinaryLoader.cpp
// Source: fsd/BinaryLoader_Blue.cpp
import { BinaryLoaderHelper } from "./BinaryLoaderHelper.js";
import { FsdDict } from "./FsdDict.js";
import { FsdList } from "./FsdList.js";
import { FsdObject } from "./FsdObject.js";
import { FsdVector } from "./FsdVector.js";
import { PyErr_SetString, PyExc } from "./pyErr.js";
import { SchemaType } from "./schemaTypes.js";

/** @typedef {import("./FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */

/** Python's `str(bytes, "utf-8")`, as `PyUnicode_FromStringAndSize` decodes. */
const strictDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** The `std::codecvt_utf8` decode of Carbon's non-Windows build. */
const unicodeDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/**
 * Decodes one legacy FSD value from bytes and a schema (BinaryLoader.h).
 *
 * `loadBinaryFromString` is the entry point: Carbon exposes it to Python as
 * `LoadBinaryFromString` (BinaryLoader_Blue.cpp). Scalars and strings decode
 * at once. Objects, lists, dicts and aliased vectors return the lazy
 * {@link FsdObject}, {@link FsdList}, {@link FsdDict} and {@link FsdVector},
 * which decode their members when asked. A vector without aliases is the
 * component array Blue wraps a `Vector2`/`Vector3`/`Vector4` as.
 *
 * Carbon declares every member static; each `CLoad*` returns the C value and
 * its `Load*` twin the Python object Blue wraps it in. Both are kept: they
 * differ only for strings, where the C value is bytes.
 */
export class BinaryLoader
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "BinaryLoader";

    /**
     * Decode the value at `offset` with `schemaAttributes` (BinaryLoader.cpp:14-74).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {FsdSchemaAttributes} schemaAttributes Schema of the value.
     * @param {string} path Logical path, used in nested paths and messages.
     * @returns {unknown} The decoded value or lazy container.
     * @throws {Error} TypeError for an unsupported schema type, including `union` and unknown types.
     */
    static loadBinaryFromString(data, offset, schemaAttributes, path)
    {
        switch (schemaAttributes.schemaType)
        {
            case SchemaType.BOOL_SCHEMA_TYPE:
                return BinaryLoader.loadBoolFromBinaryString(data, offset, path);
            case SchemaType.SIGNED_32_BIT_INT_SCHEMA_TYPE:
                return BinaryLoader.loadSigned32BitIntFromBinaryString(data, offset, path);
            case SchemaType.UNSIGNED_32_BIT_INT_SCHEMA_TYPE:
                return BinaryLoader.loadUnsigned32BitIntFromBinaryString(data, offset, path);
            case SchemaType.FLOAT32_SCHEMA_TYPE:
                return BinaryLoader.loadFloatFromBinaryString(data, offset, path);
            case SchemaType.DOUBLE_SCHEMA_TYPE:
                return BinaryLoader.loadDoubleFromBinaryString(data, offset, path);
            case SchemaType.STRING_SCHEMA_TYPE:
                return BinaryLoader.loadStringFromBinaryString(data, offset, path);
            case SchemaType.UTF8_SCHEMA_TYPE:
                return BinaryLoader.loadUnicodeStringFromBinaryString(data, offset, path);
            case SchemaType.FLOAT32_VECTOR2_TUPLE_SCHEMA_TYPE:
                return BinaryLoader.loadVector2(data, offset, schemaAttributes, path);
            case SchemaType.FLOAT32_VECTOR3_TUPLE_SCHEMA_TYPE:
                return BinaryLoader.loadVector3(data, offset, schemaAttributes, path);
            case SchemaType.FLOAT32_VECTOR4_TUPLE_SCHEMA_TYPE:
                return BinaryLoader.loadVector4(data, offset, schemaAttributes, path);
            case SchemaType.DOUBLE_VECTOR2_TUPLE_SCHEMA_TYPE:
                return BinaryLoader.loadVector2d(data, offset, schemaAttributes, path);
            case SchemaType.DOUBLE_VECTOR3_TUPLE_SCHEMA_TYPE:
                return BinaryLoader.loadVector3d(data, offset, schemaAttributes, path);
            case SchemaType.DOUBLE_VECTOR4_TUPLE_SCHEMA_TYPE:
                return BinaryLoader.loadVector4d(data, offset, schemaAttributes, path);
            case SchemaType.OBJECT_SCHEMA_TYPE:
                return BinaryLoader.loadObjectFromString(data, offset, schemaAttributes, path);
            case SchemaType.LIST_SCHEMA_TYPE:
                return BinaryLoader.loadListFromString(data, offset, schemaAttributes, path);
            case SchemaType.DICT_SCHEMA_TYPE:
                return BinaryLoader.loadDictFromString(data, offset, schemaAttributes, path);
            default:
                return PyErr_SetString(PyExc.TypeError, "unsupported schema type '" + schemaAttributes.schemaTypeAsString + "'");
        }
    }

    /**
     * Read a one-byte `bool` (BinaryLoader.cpp:76-80). Any non-zero byte is true.
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {boolean} The value.
     */
    static cLoadBoolFromBinaryString(data, offset, path)
    {
        return BinaryLoaderHelper.getDataView(data).getUint8(data.byteOffset + offset) !== 0;
    }

    /**
     * Read a `uint32_t` (BinaryLoader.cpp:87-91).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value.
     */
    static cLoadUnsigned32BitIntFromBinaryString(data, offset, path)
    {
        return BinaryLoaderHelper.getDataView(data).getUint32(data.byteOffset + offset, true);
    }

    /**
     * Read an `int32_t` (BinaryLoader.cpp:98-102).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value.
     */
    static cLoadSigned32BitIntFromBinaryString(data, offset, path)
    {
        return BinaryLoaderHelper.getDataView(data).getInt32(data.byteOffset + offset, true);
    }

    /**
     * Read a `float` (BinaryLoader.cpp:109-113).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value, widened to double as Python's float is.
     */
    static cLoadFloatFromBinaryString(data, offset, path)
    {
        return BinaryLoaderHelper.getDataView(data).getFloat32(data.byteOffset + offset, true);
    }

    /**
     * Read a `double` (BinaryLoader.cpp:120-124).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value.
     */
    static cLoadDoubleFromBinaryString(data, offset, path)
    {
        return BinaryLoaderHelper.getDataView(data).getFloat64(data.byteOffset + offset, true);
    }

    /**
     * Read a `uint32_t`-length-prefixed byte string (BinaryLoader.cpp:131-137).
     *
     * Carbon returns the bytes as a `std::string`; so does this, as a copy.
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the length prefix.
     * @param {string} path Logical path; unused.
     * @returns {Uint8Array} The string's bytes.
     */
    static cLoadStringFromBinaryString(data, offset, path)
    {
        const stringLength = BinaryLoaderHelper.getUnsignedIntFromData(data, offset);
        return BinaryLoaderHelper.getSubsetOfData(data, offset + 4, stringLength);
    }

    /**
     * Read and decode a `uint32_t`-length-prefixed UTF-8 string
     * (BinaryLoader.cpp:144-176).
     *
     * Adapted: Carbon has two branches. This ports the non-Windows one,
     * `std::codecvt_utf8`, which rejects malformed UTF-8 with a RuntimeError.
     * The Windows branch, `MultiByteToWideChar`, replaces malformed sequences
     * with U+FFFD instead and fails on an empty string (CE-118). JavaScript
     * has one decoder for both; the strict WHATWG decoder matches the
     * non-Windows result. Carbon reports failure through a `bool&` out
     * parameter; this throws.
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the length prefix.
     * @param {string} path Logical path; unused.
     * @returns {string} The decoded string; a leading BOM is kept.
     * @throws {Error} RuntimeError when the bytes are not valid UTF-8.
     */
    static cLoadUnicodeStringFromBinaryString(data, offset, path)
    {
        const stringLength = BinaryLoaderHelper.getUnsignedIntFromData(data, offset);
        const bytes = BinaryLoaderHelper.getSubsetOfData(data, offset + 4, stringLength);

        try
        {
            return unicodeDecoder.decode(bytes);
        }
        catch
        {
            return PyErr_SetString(PyExc.RuntimeError, "wstring_convert::from_bytes");
        }
    }

    /**
     * Python wrapper of {@link BinaryLoader.cLoadBoolFromBinaryString} (BinaryLoader.cpp:82-85).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {boolean} The value.
     */
    static loadBoolFromBinaryString(data, offset, path)
    {
        return BinaryLoader.cLoadBoolFromBinaryString(data, offset, path);
    }

    /**
     * Python wrapper of {@link BinaryLoader.cLoadUnsigned32BitIntFromBinaryString} (BinaryLoader.cpp:93-96).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value.
     */
    static loadUnsigned32BitIntFromBinaryString(data, offset, path)
    {
        return BinaryLoader.cLoadUnsigned32BitIntFromBinaryString(data, offset, path);
    }

    /**
     * Python wrapper of {@link BinaryLoader.cLoadSigned32BitIntFromBinaryString} (BinaryLoader.cpp:104-107).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value.
     */
    static loadSigned32BitIntFromBinaryString(data, offset, path)
    {
        return BinaryLoader.cLoadSigned32BitIntFromBinaryString(data, offset, path);
    }

    /**
     * Python wrapper of {@link BinaryLoader.cLoadFloatFromBinaryString} (BinaryLoader.cpp:115-118).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value.
     */
    static loadFloatFromBinaryString(data, offset, path)
    {
        return BinaryLoader.cLoadFloatFromBinaryString(data, offset, path);
    }

    /**
     * Python wrapper of {@link BinaryLoader.cLoadDoubleFromBinaryString} (BinaryLoader.cpp:126-129).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset into `data`.
     * @param {string} path Logical path; unused.
     * @returns {number} The value.
     */
    static loadDoubleFromBinaryString(data, offset, path)
    {
        return BinaryLoader.cLoadDoubleFromBinaryString(data, offset, path);
    }

    /**
     * Python wrapper of {@link BinaryLoader.cLoadStringFromBinaryString} (BinaryLoader.cpp:139-142).
     *
     * Blue wraps the bytes with `PyUnicode_FromStringAndSize`, a strict UTF-8
     * decode.
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the length prefix.
     * @param {string} path Logical path; unused.
     * @returns {string} The decoded string; a leading BOM is kept.
     * @throws {Error} UnicodeDecodeError when the bytes are not valid UTF-8.
     */
    static loadStringFromBinaryString(data, offset, path)
    {
        const bytes = BinaryLoader.cLoadStringFromBinaryString(data, offset, path);

        try
        {
            return strictDecoder.decode(bytes);
        }
        catch
        {
            return PyErr_SetString(PyExc.UnicodeDecodeError, "'utf-8' codec can't decode bytes: invalid data");
        }
    }

    /**
     * Python wrapper of {@link BinaryLoader.cLoadUnicodeStringFromBinaryString} (BinaryLoader.cpp:178-189).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the length prefix.
     * @param {string} path Logical path; unused.
     * @returns {string} The decoded string.
     * @throws {Error} RuntimeError when the bytes are not valid UTF-8.
     */
    static loadUnicodeStringFromBinaryString(data, offset, path)
    {
        return BinaryLoader.cLoadUnicodeStringFromBinaryString(data, offset, path);
    }

    /**
     * Create the lazy {@link FsdObject} at `offset` (BinaryLoader.cpp:252-259).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the object.
     * @param {FsdSchemaAttributes} schemaAttributes Object schema.
     * @param {string} path Logical path.
     * @returns {FsdObject} The object.
     */
    static loadObjectFromString(data, offset, schemaAttributes, path)
    {
        const fsdObject = new FsdObject();

        fsdObject.SetObjectData(data, offset, schemaAttributes, path);
        return fsdObject;
    }

    /**
     * Create the lazy {@link FsdList} at `offset` (BinaryLoader.cpp:261-266).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the list.
     * @param {FsdSchemaAttributes} schemaAttributes List schema.
     * @param {string} path Logical path.
     * @returns {FsdList} The list.
     */
    static loadListFromString(data, offset, schemaAttributes, path)
    {
        return FsdList.createFsdList(data, offset, schemaAttributes, path);
    }

    /**
     * Create the lazy {@link FsdDict} at `offset` (BinaryLoader.cpp:268-273).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the dict.
     * @param {FsdSchemaAttributes} schemaAttributes Dict schema.
     * @param {string} path Logical path.
     * @returns {FsdDict} The dict.
     */
    static loadDictFromString(data, offset, schemaAttributes, path)
    {
        return FsdDict.createFsdDict(data, offset, schemaAttributes, path);
    }

    /**
     * Read a float32 `Vector2` (BinaryLoader.cpp:198-205).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {Array<number>|FsdVector} The components, or an aliased vector.
     */
    static loadVector2(data, offset, schemaAttributes, path)
    {
        if (schemaAttributes.vectorAttributes.hasAliases) return BinaryLoader.createVectorWithAliases(data, offset, schemaAttributes, path);
        return ReadComponents(data, offset, 2, false);
    }

    /**
     * Read a float32 `Vector3` (BinaryLoader.cpp:207-214).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {Array<number>|FsdVector} The components, or an aliased vector.
     */
    static loadVector3(data, offset, schemaAttributes, path)
    {
        if (schemaAttributes.vectorAttributes.hasAliases) return BinaryLoader.createVectorWithAliases(data, offset, schemaAttributes, path);
        return ReadComponents(data, offset, 3, false);
    }

    /**
     * Read a float32 `Vector4` (BinaryLoader.cpp:216-223).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {Array<number>|FsdVector} The components, or an aliased vector.
     */
    static loadVector4(data, offset, schemaAttributes, path)
    {
        if (schemaAttributes.vectorAttributes.hasAliases) return BinaryLoader.createVectorWithAliases(data, offset, schemaAttributes, path);
        return ReadComponents(data, offset, 4, false);
    }

    /**
     * Read a double `Vector2d` (BinaryLoader.cpp:225-232).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {Array<number>|FsdVector} The components, or an aliased vector.
     */
    static loadVector2d(data, offset, schemaAttributes, path)
    {
        if (schemaAttributes.vectorAttributes.hasAliases) return BinaryLoader.createVectorWithAliases(data, offset, schemaAttributes, path);
        return ReadComponents(data, offset, 2, true);
    }

    /**
     * Read a double `Vector3d` (BinaryLoader.cpp:234-241).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {Array<number>|FsdVector} The components, or an aliased vector.
     */
    static loadVector3d(data, offset, schemaAttributes, path)
    {
        if (schemaAttributes.vectorAttributes.hasAliases) return BinaryLoader.createVectorWithAliases(data, offset, schemaAttributes, path);
        return ReadComponents(data, offset, 3, true);
    }

    /**
     * Read a double `Vector4d` (BinaryLoader.cpp:243-250).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {Array<number>|FsdVector} The components, or an aliased vector.
     */
    static loadVector4d(data, offset, schemaAttributes, path)
    {
        if (schemaAttributes.vectorAttributes.hasAliases) return BinaryLoader.createVectorWithAliases(data, offset, schemaAttributes, path);
        return ReadComponents(data, offset, 4, true);
    }

    /**
     * Create an aliased {@link FsdVector} (BinaryLoader.cpp:191-196).
     *
     * @param {Uint8Array} data Source bytes.
     * @param {number} offset Byte offset of the vector.
     * @param {FsdSchemaAttributes} schemaAttributes Vector schema.
     * @param {string} path Logical path.
     * @returns {FsdVector} The vector.
     */
    static createVectorWithAliases(data, offset, schemaAttributes, path)
    {
        return FsdVector.createFsdVector(data, offset, schemaAttributes, path);
    }
}

/**
 * Read consecutive vector components, as Blue's `Vector*` wrappers return
 * them (`Py_BuildValue("(ff…)")` / `"(dd…)"`).
 *
 * @param {Uint8Array} data Source bytes.
 * @param {number} offset Byte offset of the first component.
 * @param {number} count Component count.
 * @param {boolean} isDouble True for double components, false for float.
 * @returns {Array<number>} The components.
 */
export function ReadComponents(data, offset, count, isDouble)
{
    const view = BinaryLoaderHelper.getDataView(data);
    const base = data.byteOffset + offset;
    const result = new Array(count);

    for (let i = 0; i < count; i++)
    {
        result[i] = isDouble ? view.getFloat64(base + i * 8, true) : view.getFloat32(base + i * 4, true);
    }

    return result;
}

export default BinaryLoader;

CjsSchema.blue.define(BinaryLoader, { className: "BinaryLoader" });
