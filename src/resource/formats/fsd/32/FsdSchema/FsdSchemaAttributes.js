import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdSchema.h
// Source: fsd/FsdSchema.cpp
import { PyErr_SetString, PyExc } from "../pyErr.js";
import { PY_SCHEMA_CONSTANTS } from "../PY_SCHEMA_CONSTANTS.js";
import { SchemaType } from "../schemaTypes.js";
import { DictSchemaAttributes } from "./DictSchemaAttributes.js";
import { ListSchemaAttributes } from "./ListSchemaAttributes.js";
import { ObjectSchemaAttributes } from "./ObjectSchemaAttributes.js";
import { VectorSchemaAttributes } from "./VectorSchemaAttributes.js";

/**
 * A schema dictionary as Carbon's loader receives it from Python: a plain
 * object whose keys are the {@link PY_SCHEMA_CONSTANTS} strings.
 *
 * @typedef {Object<string, unknown>} FsdPySchema
 */

/**
 * The parsed form of one legacy FSD schema node (FsdSchema.h:19-39).
 *
 * Carbon's loader receives the binary schema as a Python dictionary and
 * converts it once, through Blue's argument extraction, into this tree.
 * `createSchema` is that conversion; the free functions of FsdSchema.cpp are
 * statics here.
 *
 * Failure reporting: Carbon's `Create*` functions set a Python error and
 * return false, and most callers ignore the return value, so the error
 * surfaces when the Python call returns. Here the error is thrown where Carbon
 * sets it. `createSchema` still returns false, without throwing, for a type
 * string it does not know, which is the one failure Carbon reports with no
 * error set; a nested unknown type therefore stays `UNKNOWN_SCHEMA_TYPE` and
 * fails only when a value of it is loaded.
 */
export class FsdSchemaAttributes
{
    /** @type {number} One of {@link SchemaType}. */
    schemaType = SchemaType.UNKNOWN_SCHEMA_TYPE;

    /** @type {string} The schema's `type` string, as written. */
    schemaTypeAsString = "";

    /** @type {boolean} The schema's `isOptional` flag; read by nothing in the loader. */
    isOptional = false;

    /** @type {boolean} True when the schema declared `default`. */
    hasDefault = false;

    /** @type {number} The schema's fixed byte `size`. */
    size = 0;

    /** @type {boolean} True when the schema declared `size`. */
    hasSize = false;

    /** @type {unknown} The schema's `default` value, returned as-is. */
    defaultValue = null;

    /** @type {VectorSchemaAttributes|null} Set for vector types. */
    vectorAttributes = null;

    /** @type {ListSchemaAttributes|null} Set for list types. */
    listAttributes = null;

    /** @type {DictSchemaAttributes|null} Set for dict types. */
    dictAttributes = null;

    /** @type {ObjectSchemaAttributes|null} Set for object types. */
    objectAttributes = null;

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FsdSchemaAttributes";

    /**
     * Read a required string entry (FsdSchema.cpp:76-88).
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @param {number} argID Argument index; unused, as in Carbon's message.
     * @returns {string} The entry.
     * @throws {Error} TypeError when the entry is missing or not a string.
     */
    static getRequiredStringDictValue(dict, dictKey, argID)
    {
        const out = BlueExtractString(PyDict_GetItemString(dict, dictKey));

        if (out === undefined) PyErr_SetString(PyExc.TypeError, "Schema has no '" + dictKey + "' key");
        return out;
    }

    /**
     * Read a required integer entry (FsdSchema.cpp:90-102).
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @param {number} argID Argument index; unused, as in Carbon's message.
     * @returns {number} The entry, as `int32_t`.
     * @throws {Error} TypeError when the entry is missing or not an int32.
     */
    static getRequiredIntDictValue(dict, dictKey, argID)
    {
        const out = BlueExtractInt(PyDict_GetItemString(dict, dictKey));

        if (out === undefined) PyErr_SetString(PyExc.TypeError, "Schema has no '" + dictKey + "' key");
        return out;
    }

    /**
     * Read an optional string entry (FsdSchema.cpp:104-119).
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @param {number} argID Argument index; unused, as in Carbon's message.
     * @param {string} out Value kept when the entry is absent.
     * @returns {string} The entry, or `out`.
     * @throws {Error} TypeError when the entry is present but not a string.
     */
    static getOptionalStringDictValue(dict, dictKey, argID, out)
    {
        const item = PyDict_GetItemString(dict, dictKey);
        if (item === undefined) return out;

        const value = BlueExtractString(item);
        if (value === undefined) PyErr_SetString(PyExc.TypeError, "Schema key '" + dictKey + "' is not a string");
        return value;
    }

    /**
     * Read an optional integer entry (FsdSchema.cpp:121-136).
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @param {number} argID Argument index; unused, as in Carbon's message.
     * @param {number} out Value kept when the entry is absent.
     * @returns {number} The entry, as `int32_t`, or `out`.
     * @throws {Error} TypeError when the entry is present but not an int32.
     */
    static getOptionalIntDictValue(dict, dictKey, argID, out)
    {
        const item = PyDict_GetItemString(dict, dictKey);
        if (item === undefined) return out;

        const value = BlueExtractInt(item);
        if (value === undefined) PyErr_SetString(PyExc.TypeError, "Schema key '" + dictKey + "' is not a int");
        return value;
    }

    /**
     * Read an optional boolean entry (FsdSchema.cpp:138-153).
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @param {number} argID Argument index; unused, as in Carbon's message.
     * @param {boolean} out Value kept when the entry is absent.
     * @returns {boolean} The entry, or `out`.
     * @throws {Error} TypeError when the entry is present but not a bool or int.
     */
    static getOptionalBoolDictValue(dict, dictKey, argID, out)
    {
        const item = PyDict_GetItemString(dict, dictKey);
        if (item === undefined) return out;

        const value = BlueExtractBool(item);
        if (value === undefined) PyErr_SetString(PyExc.TypeError, "Schema key '" + dictKey + "' is not a bool");
        return value;
    }

    /**
     * Read an optional float entry (FsdSchema.cpp:155-169). Carbon defines it
     * and calls it nowhere.
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @param {number} argID Argument index; unused, as in Carbon's message.
     * @param {number} out Value kept when the entry is absent.
     * @returns {number} The entry rounded to float32, or `out`.
     * @throws {Error} TypeError when the entry is present but not a number.
     */
    static getOptionalFloatDictValue(dict, dictKey, argID, out)
    {
        const item = PyDict_GetItemString(dict, dictKey);
        if (item === undefined) return out;

        const value = BlueExtractDouble(item);
        if (value === undefined) PyErr_SetString(PyExc.TypeError, "Schema key '" + dictKey + "' is not a float");
        return Math.fround(value);
    }

    /**
     * Read an optional double entry (FsdSchema.cpp:171-186). Carbon defines it
     * and calls it nowhere.
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @param {number} argID Argument index; unused, as in Carbon's message.
     * @param {number} out Value kept when the entry is absent.
     * @returns {number} The entry, or `out`.
     * @throws {Error} TypeError when the entry is present but not a number.
     */
    static getOptionalDoubleDictValue(dict, dictKey, argID, out)
    {
        const item = PyDict_GetItemString(dict, dictKey);
        if (item === undefined) return out;

        const value = BlueExtractDouble(item);
        if (value === undefined) PyErr_SetString(PyExc.TypeError, "Schema key '" + dictKey + "' is not a double");
        return value;
    }

    /**
     * Return a schema entry as-is (FsdSchema.cpp:188-193).
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @returns {unknown} The entry, or undefined when absent.
     */
    static getPyObjectValueFromDict(dict, dictKey)
    {
        return PyDict_GetItemString(dict, dictKey);
    }

    /**
     * Test whether a schema entry is present (FsdSchema.cpp:195-200).
     *
     * A present entry whose value is null (Python None) counts as present.
     *
     * @param {FsdPySchema} dict Schema dictionary.
     * @param {string} dictKey Entry name.
     * @returns {boolean} True when the entry exists.
     */
    static hasOptionalValue(dict, dictKey)
    {
        return PyDict_GetItemString(dict, dictKey) !== undefined;
    }

    /**
     * Fill a `bool` schema (FsdSchema.cpp:202-207).
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true.
     */
    static createBoolSchema(pySchema, result, argID)
    {
        result.schemaType = SchemaType.BOOL_SCHEMA_TYPE;
        return true;
    }

    /**
     * Fill an `int`, `typeID` or `localizationID` schema (FsdSchema.cpp:209-231).
     *
     * The integer is unsigned when `min >= 0` or `exclusiveMin >= -1`; both
     * default to -100.
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true; a bad bound throws.
     * @throws {Error} TypeError when `min` or `exclusiveMin` is not an int32.
     */
    static createIntSchema(pySchema, result, argID)
    {
        const min = FsdSchemaAttributes.getOptionalIntDictValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_MIN, argID, -100);
        const exclusiveMin = FsdSchemaAttributes.getOptionalIntDictValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_EXCLUSIVE_MIN, argID, -100);

        let type = SchemaType.SIGNED_32_BIT_INT_SCHEMA_TYPE;
        if (min >= 0 || exclusiveMin >= -1) type = SchemaType.UNSIGNED_32_BIT_INT_SCHEMA_TYPE;

        result.schemaType = type;
        return true;
    }

    /**
     * Fill a `float` schema (FsdSchema.cpp:233-251). Any `precision` other
     * than "float" selects double.
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true; a bad precision throws.
     * @throws {Error} TypeError when `precision` is not a string.
     */
    static createFloatSchema(pySchema, result, argID)
    {
        const precision = FsdSchemaAttributes.getOptionalStringDictValue(
            pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_PRECISION, argID, PY_SCHEMA_CONSTANTS.PRECISION_FLOAT);

        let type = SchemaType.FLOAT32_SCHEMA_TYPE;
        if (precision !== PY_SCHEMA_CONSTANTS.PRECISION_FLOAT) type = SchemaType.DOUBLE_SCHEMA_TYPE;

        result.schemaType = type;
        return true;
    }

    /**
     * Fill a `string` or `respath` schema (FsdSchema.cpp:253-257).
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true.
     */
    static createStringSchema(pySchema, result, argID)
    {
        result.schemaType = SchemaType.STRING_SCHEMA_TYPE;
        return true;
    }

    /**
     * Fill a `unicode` schema (FsdSchema.cpp:259-263).
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true.
     */
    static createUnicodeSchema(pySchema, result, argID)
    {
        result.schemaType = SchemaType.UTF8_SCHEMA_TYPE;
        return true;
    }

    /**
     * Fill a `vector2`, `vector3` or `vector4` schema (FsdSchema.cpp:265-326).
     *
     * The component count is the type string's last character; `precision`
     * other than "float" selects doubles. `aliases` maps component names to
     * indices, narrowed to `uint8_t`.
     *
     * Divergence: an alias index that is not an int32 leaves Carbon's `index`
     * uninitialised; the port throws TypeError instead.
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true; a bad entry throws.
     * @throws {Error} TypeError when `precision` or an alias index has the wrong type.
     */
    static createVectorSchema(pySchema, result, argID)
    {
        const precision = FsdSchemaAttributes.getOptionalStringDictValue(
            pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_PRECISION, argID, PY_SCHEMA_CONSTANTS.PRECISION_FLOAT);
        const vectorSize = Number.parseInt(result.schemaTypeAsString.at(-1), 10);
        const isFloat = precision === PY_SCHEMA_CONSTANTS.PRECISION_FLOAT;

        let type;
        switch (vectorSize)
        {
            case 2:
                type = isFloat ? SchemaType.FLOAT32_VECTOR2_TUPLE_SCHEMA_TYPE : SchemaType.DOUBLE_VECTOR2_TUPLE_SCHEMA_TYPE;
                break;
            case 3:
                type = isFloat ? SchemaType.FLOAT32_VECTOR3_TUPLE_SCHEMA_TYPE : SchemaType.DOUBLE_VECTOR3_TUPLE_SCHEMA_TYPE;
                break;
            case 4:
                type = isFloat ? SchemaType.FLOAT32_VECTOR4_TUPLE_SCHEMA_TYPE : SchemaType.DOUBLE_VECTOR4_TUPLE_SCHEMA_TYPE;
                break;
        }

        result.schemaType = type;
        result.vectorAttributes = new VectorSchemaAttributes();
        result.vectorAttributes.hasAliases = false;

        if (FsdSchemaAttributes.hasOptionalValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_ALIASES))
        {
            result.vectorAttributes.hasAliases = true;

            for (const [ alias, value ] of PyDict_Next(PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_ALIASES)))
            {
                const index = RequireExtractedInt(value, PY_SCHEMA_CONSTANTS.ATTRIBUTE_ALIASES);
                result.vectorAttributes.aliases.set(alias, index & 0xFF);
            }
        }

        return true;
    }

    /**
     * Fill a `list` schema (FsdSchema.cpp:328-346).
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true; the nested item schema's result is ignored, as in Carbon.
     * @throws {Error} TypeError when `itemTypes` is not a dictionary or `length` not an int32.
     */
    static createListSchema(pySchema, result, argID)
    {
        const itemTypes = PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_ITEMTYPES);

        result.listAttributes = new ListSchemaAttributes();
        result.listAttributes.listItemSchema = new FsdSchemaAttributes();
        result.schemaType = SchemaType.LIST_SCHEMA_TYPE;

        FsdSchemaAttributes.createSchema(itemTypes, result.listAttributes.listItemSchema, argID);

        if (FsdSchemaAttributes.hasOptionalValue(pySchema, PY_SCHEMA_CONSTANTS.LIST_LENGTH))
        {
            result.listAttributes.fixedSized = true;
            result.listAttributes.listSize = FsdSchemaAttributes.getRequiredIntDictValue(pySchema, PY_SCHEMA_CONSTANTS.LIST_LENGTH, argID) >>> 0;
        }

        return true;
    }

    /**
     * Fill a `dict` schema (FsdSchema.cpp:348-370).
     *
     * Divergence: Carbon passes a missing `keyTypes`, `keyFooter` or
     * `valueTypes` to `PyDict_Check(NULL)`, which dereferences null; the port
     * raises the TypeError CreateSchema gives any non-dictionary.
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true; nested results are ignored, as in Carbon.
     * @throws {Error} TypeError when a child schema is not a dictionary or a flag is not a bool.
     */
    static createDictSchema(pySchema, result, argID)
    {
        result.schemaType = SchemaType.DICT_SCHEMA_TYPE;

        const keyTypes = PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_KEYTYPES);
        const keyFooterSchema = PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_KEYFOOTERSCHEMA);
        const valueTypes = PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_VALUETYPES);

        result.dictAttributes = new DictSchemaAttributes();
        FsdSchemaAttributes.createSchema(keyTypes, result.dictAttributes.keySchema, argID);
        FsdSchemaAttributes.createSchema(keyFooterSchema, result.dictAttributes.keyFooterSchema, argID);
        FsdSchemaAttributes.createSchema(valueTypes, result.dictAttributes.valueSchema, argID);

        result.dictAttributes.multiIndex = FsdSchemaAttributes.getOptionalBoolDictValue(
            pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_MULTIINDEX, argID, result.dictAttributes.multiIndex);
        result.dictAttributes.buildIndex = FsdSchemaAttributes.getOptionalBoolDictValue(
            pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_BUILDINDEX, argID, result.dictAttributes.buildIndex);

        return true;
    }

    /**
     * Fill an `object` schema (FsdSchema.cpp:372-443).
     *
     * Every object reads `attributes` and `constantAttributeOffsets`. An
     * object without `size` also reads `endOfFixedSizeData`,
     * `attributesWithVariableOffsets` and `optionalValueLookups`. A missing
     * dictionary entry reads as empty, as `PyDict_Next(NULL)` does.
     *
     * Divergences: an offset or bit mask that is not an int32 leaves Carbon's
     * local uninitialised; the port throws TypeError. A missing
     * `attributesWithVariableOffsets` list fails in Carbon's `PyList_Size`;
     * the port throws SystemError, CPython's error for a bad internal call.
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill; `hasSize` is already set.
     * @param {number} argID Argument index for messages.
     * @returns {boolean} Always true; nested attribute results are ignored, as in Carbon.
     * @throws {Error} TypeError or SystemError for a malformed layout entry.
     */
    static createObjectSchema(pySchema, result, argID)
    {
        result.schemaType = SchemaType.OBJECT_SCHEMA_TYPE;
        result.objectAttributes = new ObjectSchemaAttributes();

        for (const [ attributeName, value ] of PyDict_Next(PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_ATTRIBUTES)))
        {
            const attributeSchema = new FsdSchemaAttributes();

            FsdSchemaAttributes.createSchema(value, attributeSchema, argID);
            result.objectAttributes.attributes.set(attributeName, attributeSchema);
        }

        for (const [ attributeName, value ] of PyDict_Next(PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.OBJECT_CONSTANT_ATTRIBUTE_OFFSETS)))
        {
            const offset = RequireExtractedInt(value, PY_SCHEMA_CONSTANTS.OBJECT_CONSTANT_ATTRIBUTE_OFFSETS);
            result.objectAttributes.constantAttributeOffsets.set(attributeName, offset >>> 0);
        }

        // A sized object is read only through its constant offsets.
        if (result.hasSize) return true;

        if (FsdSchemaAttributes.hasOptionalValue(pySchema, PY_SCHEMA_CONSTANTS.OBJECT_END_OF_FIXED_SIZED_DATA))
        {
            const endOfFixedSizeData = FsdSchemaAttributes.getRequiredIntDictValue(pySchema, PY_SCHEMA_CONSTANTS.OBJECT_END_OF_FIXED_SIZED_DATA, argID);
            result.objectAttributes.endOfFixedSizedData = endOfFixedSizeData >>> 0;
        }

        const attributesWithVariableOffset = PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.OBJECT_ATTRIBUTES_WITH_VARIABLE_OFFSET);
        if (!Array.isArray(attributesWithVariableOffset))
        {
            PyErr_SetString(PyExc.SystemError, "bad argument to internal function");
        }

        for (const attributeNameItem of attributesWithVariableOffset)
        {
            result.objectAttributes.attributesWithVariableOffset.push(BlueExtractString(attributeNameItem) ?? "");
        }

        for (const [ attributeName, value ] of PyDict_Next(PyDict_GetItemString(pySchema, PY_SCHEMA_CONSTANTS.OBJECT_OPTIONAL_VALUE_LOOKUP)))
        {
            const lookupIndex = RequireExtractedInt(value, PY_SCHEMA_CONSTANTS.OBJECT_OPTIONAL_VALUE_LOOKUP);
            result.objectAttributes.optionalValueLookups.set(attributeName, BigInt.asUintN(64, BigInt(lookupIndex)));
        }

        return true;
    }

    /**
     * Compare a schema type string (FsdSchema.cpp:445-448).
     *
     * @param {string} schemaType The schema's `type` string.
     * @param {string} expectedSchemaType A {@link PY_SCHEMA_CONSTANTS} type.
     * @returns {boolean} True when they are equal.
     */
    static isSchemaType(schemaType, expectedSchemaType)
    {
        return schemaType === expectedSchemaType;
    }

    /**
     * Test for `int`, `typeID` or `localizationID` (FsdSchema.cpp:450-453).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for an integer type.
     */
    static isIntSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_INT)
            || FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_TYPEID)
            || FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_LOCALIZATIONID);
    }

    /**
     * Test for `bool` (FsdSchema.cpp:455-458).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for the bool type.
     */
    static isBoolSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_BOOL);
    }

    /**
     * Test for `float` (FsdSchema.cpp:460-463).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for the float type.
     */
    static isFloatSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_FLOAT);
    }

    /**
     * Test for `string` or `respath` (FsdSchema.cpp:465-468).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for a byte-string type.
     */
    static isStringSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_STRING)
            || FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_RESPATH);
    }

    /**
     * Test for `unicode` (FsdSchema.cpp:470-473).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for the unicode type.
     */
    static isUnicodeSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_UNICODE);
    }

    /**
     * Test for `vector2`, `vector3` or `vector4` (FsdSchema.cpp:475-478).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for a vector type.
     */
    static isVectorSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_VECTOR2)
            || FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_VECTOR3)
            || FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_VECTOR4);
    }

    /**
     * Test for `list` (FsdSchema.cpp:480-483).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for the list type.
     */
    static isListSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_LIST);
    }

    /**
     * Test for `dict` (FsdSchema.cpp:485-488).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for the dict type.
     */
    static isDictSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_DICT);
    }

    /**
     * Test for `object` (FsdSchema.cpp:490-493).
     *
     * @param {string} schemaType The schema's `type` string.
     * @returns {boolean} True for the object type.
     */
    static isObjectSchema(schemaType)
    {
        return FsdSchemaAttributes.isSchemaType(schemaType, PY_SCHEMA_CONSTANTS.TYPE_OBJECT);
    }

    /**
     * Convert one schema dictionary into `result` (FsdSchema.cpp:495-571).
     *
     * `type` is the only required entry. `default`, `size` and `isOptional`
     * are read for every type before dispatching on the type string. There is
     * no `union` branch: a union schema returns false like any unknown type.
     *
     * @param {FsdPySchema} pySchema Schema dictionary.
     * @param {FsdSchemaAttributes} result Node to fill.
     * @param {number} [argID=0] Argument index for messages.
     * @returns {boolean} False, with nothing thrown, for an unknown type string; otherwise true.
     * @throws {Error} TypeError when `pySchema` is not a dictionary or an entry has the wrong type.
     */
    static createSchema(pySchema, result, argID = 0)
    {
        if (!PyDict_Check(pySchema))
        {
            PyErr_SetString(PyExc.TypeError, `Could not match pySchema ${argID} to expected type: dictionary.`);
        }

        const schemaType = FsdSchemaAttributes.getRequiredStringDictValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_TYPE, argID);

        if (FsdSchemaAttributes.hasOptionalValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_DEFAULT))
        {
            result.hasDefault = true;
            result.defaultValue = FsdSchemaAttributes.getPyObjectValueFromDict(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_DEFAULT);
        }

        if (FsdSchemaAttributes.hasOptionalValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_SIZE))
        {
            result.hasSize = true;
            result.size = FsdSchemaAttributes.getRequiredIntDictValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_SIZE, argID);
        }

        result.isOptional = FsdSchemaAttributes.getOptionalBoolDictValue(pySchema, PY_SCHEMA_CONSTANTS.ATTRIBUTE_ISOPTIONAL, argID, result.isOptional);
        result.schemaTypeAsString = schemaType;

        if (FsdSchemaAttributes.isBoolSchema(schemaType)) return FsdSchemaAttributes.createBoolSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isIntSchema(schemaType)) return FsdSchemaAttributes.createIntSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isFloatSchema(schemaType)) return FsdSchemaAttributes.createFloatSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isStringSchema(schemaType)) return FsdSchemaAttributes.createStringSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isUnicodeSchema(schemaType)) return FsdSchemaAttributes.createUnicodeSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isVectorSchema(schemaType)) return FsdSchemaAttributes.createVectorSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isListSchema(schemaType)) return FsdSchemaAttributes.createListSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isDictSchema(schemaType)) return FsdSchemaAttributes.createDictSchema(pySchema, result, argID);
        if (FsdSchemaAttributes.isObjectSchema(schemaType)) return FsdSchemaAttributes.createObjectSchema(pySchema, result, argID);

        return false;
    }
}

/**
 * Test for a schema dictionary, as CPython's `PyDict_Check` does.
 *
 * @param {unknown} value Candidate.
 * @returns {boolean} True for a plain, non-array object.
 */
function PyDict_Check(value)
{
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Look up a dictionary entry, as CPython's `PyDict_GetItemString` does.
 *
 * Returns undefined where CPython returns NULL, so a Python None (null)
 * stays a present value.
 *
 * @param {FsdPySchema} dict Schema dictionary.
 * @param {string} key Entry name.
 * @returns {unknown} The entry, or undefined when absent.
 */
function PyDict_GetItemString(dict, key)
{
    return PyDict_Check(dict) && Object.hasOwn(dict, key) ? dict[key] : undefined;
}

/**
 * Iterate a dictionary's entries, as CPython's `PyDict_Next` loop does.
 *
 * A missing or non-dictionary value yields nothing, as `PyDict_Next` returns
 * 0 for it.
 *
 * @param {unknown} dict Candidate dictionary.
 * @returns {Array<[string, unknown]>} Its entries, in insertion order.
 */
function PyDict_Next(dict)
{
    return PyDict_Check(dict) ? Object.entries(dict) : [];
}

/**
 * Extract a string as Blue's `BlueExtractString` does.
 *
 * @param {unknown} value Candidate.
 * @returns {string|undefined} The string, or undefined when it is not one.
 */
function BlueExtractString(value)
{
    return typeof value === "string" ? value : undefined;
}

/**
 * Extract an `int32_t` as Blue's `BlueExtractInt` does: any Python int,
 * including a bool, inside the int32 range.
 *
 * @param {unknown} value Candidate.
 * @returns {number|undefined} The integer, or undefined when it is not one.
 */
function BlueExtractInt(value)
{
    if (typeof value === "boolean") return value ? 1 : 0;

    if (typeof value === "bigint") value = Number(value);
    if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
    if (value > 0x7FFFFFFF || value < -0x80000000) return undefined;

    return value;
}

/**
 * Extract a bool as Blue's `BlueExtractBool` does: any Python int is accepted
 * and tested for non-zero.
 *
 * @param {unknown} value Candidate.
 * @returns {boolean|undefined} The flag, or undefined when it is not an int.
 */
function BlueExtractBool(value)
{
    if (typeof value === "boolean") return value;
    if (typeof value === "bigint") return value !== 0n;
    if (typeof value === "number" && Number.isInteger(value)) return value !== 0;

    return undefined;
}

/**
 * Extract a double as Blue's `BlueExtractDouble` does: a float or an exact
 * int, but not a bool. JavaScript has one Number type for both.
 *
 * @param {unknown} value Candidate.
 * @returns {number|undefined} The number, or undefined when it is not one.
 */
function BlueExtractDouble(value)
{
    return typeof value === "number" ? value : undefined;
}

/**
 * Extract an int32 whose failure Carbon ignores, leaving its local
 * uninitialised. The port throws TypeError instead.
 *
 * @param {unknown} value Candidate.
 * @param {string} dictKey Owning entry name, for the message.
 * @returns {number} The integer.
 * @throws {Error} TypeError when the value is not an int32.
 */
function RequireExtractedInt(value, dictKey)
{
    const out = BlueExtractInt(value);

    if (out === undefined) PyErr_SetString(PyExc.TypeError, "Schema key '" + dictKey + "' is not a int");
    return out;
}

export default FsdSchemaAttributes;

CjsSchema.blue.define(FsdSchemaAttributes, { className: "FsdSchemaAttributes" });
