// Source: fsd/SchemaTypes.h
// Source: fsd/SchemaTypes.cpp
//
// The schema type enumeration of Carbon's legacy FSD loader. Unlike the
// Python schema vocabulary it separates signed and unsigned integers and float
// and double precision. `PY_SCHEMA_CONSTANTS`, the other declaration in
// SchemaTypes.h, has its own file.

/**
 * Carbon's `SchemaType` enumeration, member names and values unchanged.
 *
 * @enum {number}
 */
export const SchemaType = Object.freeze({
    UNKNOWN_SCHEMA_TYPE: 0,
    BOOL_SCHEMA_TYPE: 1,
    UNSIGNED_32_BIT_INT_SCHEMA_TYPE: 2,
    SIGNED_32_BIT_INT_SCHEMA_TYPE: 3,
    FLOAT32_SCHEMA_TYPE: 4,
    DOUBLE_SCHEMA_TYPE: 5,
    STRING_SCHEMA_TYPE: 6,
    UTF8_SCHEMA_TYPE: 7,
    FLOAT32_VECTOR2_TUPLE_SCHEMA_TYPE: 8,
    FLOAT32_VECTOR3_TUPLE_SCHEMA_TYPE: 9,
    FLOAT32_VECTOR4_TUPLE_SCHEMA_TYPE: 10,
    DOUBLE_VECTOR2_TUPLE_SCHEMA_TYPE: 11,
    DOUBLE_VECTOR3_TUPLE_SCHEMA_TYPE: 12,
    DOUBLE_VECTOR4_TUPLE_SCHEMA_TYPE: 13,
    OBJECT_SCHEMA_TYPE: 14,
    UNION_SCHEMA_TYPE: 15,
    DICT_SCHEMA_TYPE: 16,
    LIST_SCHEMA_TYPE: 17,
    SCHEMA_TYPES_COUNT: 18,
});

/**
 * The names Carbon registers for `SchemaType` on the Python module as
 * `SCHEMA_TYPES` (`SchemaTypeEnumChooser`, SchemaTypes.cpp:6-91).
 *
 * Carbon's chooser has no entry for `DOUBLE_SCHEMA_TYPE`,
 * `DICT_SCHEMA_TYPE` or `LIST_SCHEMA_TYPE`; neither does this one.
 *
 * @enum {number}
 */
export const SCHEMA_TYPES = Object.freeze({
    UNKNOWN: SchemaType.UNKNOWN_SCHEMA_TYPE,
    UNSIGNED_32_BIT_INT: SchemaType.UNSIGNED_32_BIT_INT_SCHEMA_TYPE,
    SIGNED_32_BIT_INT: SchemaType.SIGNED_32_BIT_INT_SCHEMA_TYPE,
    FLOAT32: SchemaType.FLOAT32_SCHEMA_TYPE,
    STRING: SchemaType.STRING_SCHEMA_TYPE,
    UTF8: SchemaType.UTF8_SCHEMA_TYPE,
    BOOL: SchemaType.BOOL_SCHEMA_TYPE,
    FLOAT32_VECTOR2_TUPLE: SchemaType.FLOAT32_VECTOR2_TUPLE_SCHEMA_TYPE,
    FLOAT32_VECTOR3_TUPLE: SchemaType.FLOAT32_VECTOR3_TUPLE_SCHEMA_TYPE,
    FLOAT32_VECTOR4_TUPLE: SchemaType.FLOAT32_VECTOR4_TUPLE_SCHEMA_TYPE,
    DOUBLE_VECTOR2_TUPLE: SchemaType.DOUBLE_VECTOR2_TUPLE_SCHEMA_TYPE,
    DOUBLE_VECTOR3_TUPLE: SchemaType.DOUBLE_VECTOR3_TUPLE_SCHEMA_TYPE,
    DOUBLE_VECTOR4_TUPLE: SchemaType.DOUBLE_VECTOR4_TUPLE_SCHEMA_TYPE,
    OBJECT: SchemaType.OBJECT_SCHEMA_TYPE,
    UNION: SchemaType.UNION_SCHEMA_TYPE,
});
