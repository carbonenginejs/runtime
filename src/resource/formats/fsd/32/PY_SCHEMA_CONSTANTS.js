import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/SchemaTypes.h
// Source: fsd/SchemaTypes.cpp

/**
 * The key and type strings of the Python schema dictionary that Carbon's
 * legacy FSD loader reads (SchemaTypes.cpp:95-133).
 *
 * Carbon declares these as static `const char*` members of a class used only
 * as a namespace; they stay statics here, under Carbon's names.
 */
export class PY_SCHEMA_CONSTANTS
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "PY_SCHEMA_CONSTANTS";

    static TYPE_BOOL = "bool";

    static TYPE_INT = "int";

    static TYPE_TYPEID = "typeID";

    static TYPE_LOCALIZATIONID = "localizationID";

    static TYPE_FLOAT = "float";

    static TYPE_STRING = "string";

    static TYPE_UNICODE = "unicode";

    static TYPE_RESPATH = "respath";

    static TYPE_VECTOR2 = "vector2";

    static TYPE_VECTOR3 = "vector3";

    static TYPE_VECTOR4 = "vector4";

    static TYPE_LIST = "list";

    static TYPE_DICT = "dict";

    static TYPE_OBJECT = "object";

    static TYPE_UNION = "union";

    static ATTRIBUTE_TYPE = "type";

    static ATTRIBUTE_SIZE = "size";

    static ATTRIBUTE_MIN = "min";

    static ATTRIBUTE_EXCLUSIVE_MIN = "exclusiveMin";

    static ATTRIBUTE_DEFAULT = "default";

    static ATTRIBUTE_PRECISION = "precision";

    static ATTRIBUTE_ALIASES = "aliases";

    static ATTRIBUTE_ITEMTYPES = "itemTypes";

    static ATTRIBUTE_KEYTYPES = "keyTypes";

    static ATTRIBUTE_VALUETYPES = "valueTypes";

    static ATTRIBUTE_KEYFOOTERSCHEMA = "keyFooter";

    static ATTRIBUTE_INDEXBY = "indexBy";

    static ATTRIBUTE_MULTIINDEX = "multiIndex";

    static ATTRIBUTE_BUILDINDEX = "buildIndex";

    static ATTRIBUTE_ATTRIBUTES = "attributes";

    static ATTRIBUTE_ISOPTIONAL = "isOptional";

    static PRECISION_FLOAT = "float";

    static PRECISION_DOUBLE = "double";

    static OBJECT_END_OF_FIXED_SIZED_DATA = "endOfFixedSizeData";

    static OBJECT_OPTIONAL_VALUE_LOOKUP = "optionalValueLookups";

    static OBJECT_ATTRIBUTES_WITH_VARIABLE_OFFSET = "attributesWithVariableOffsets";

    static OBJECT_MAX_BIT_FIELD_VALUE = "maxBitFieldValue";

    static OBJECT_CONSTANT_ATTRIBUTE_OFFSETS = "constantAttributeOffsets";

    static LIST_LENGTH = "length";
}

export default PY_SCHEMA_CONSTANTS;

CjsSchema.blue.define(PY_SCHEMA_CONSTANTS, { className: "PY_SCHEMA_CONSTANTS" });
