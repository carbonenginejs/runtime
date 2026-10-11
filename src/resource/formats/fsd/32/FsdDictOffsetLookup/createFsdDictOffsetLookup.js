// Source: fsd/FsdDictOffsetLookup.h
// Source: fsd/FsdDictOffsetLookup.cpp
//
// Carbon's free function CreateFsdDictOffsetLookup. It stays a module
// function rather than a static on FsdDictOffsetLookup because it constructs
// that class's subclasses, which import the base; a base that imported them
// back would be read before it is defined.
import { BinaryLoaderHelper } from "../BinaryLoaderHelper.js";
import { SchemaType } from "../schemaTypes.js";
import { FastLoadingHashedOffsetLookup } from "./FastLoadingHashedOffsetLookup.js";
import { SemiFastStringLoadingHashedOffsetLookup } from "./SemiFastStringLoadingHashedOffsetLookup.js";
import { SlowBinarySearchOffsetLookup } from "./SlowBinarySearchOffsetLookup.js";

/** @typedef {import("../FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */
/** @typedef {import("./FsdDictOffsetLookup.js").FsdDictOffsetLookup} FsdDictOffsetLookup */

/**
 * Build the key index of the dict at `offset` (FsdDictOffsetLookup.cpp:201-231).
 *
 * Dict layout: a `uint32_t` data size, then that many bytes. The last four of
 * them are the key footer's size, and the footer occupies the bytes just
 * before it. The footer records sizes when its item schema has a `size`
 * attribute. `uint32_t` and `int32_t` keys get the fast index, `string` keys
 * the string index, and every other key type an index that finds nothing.
 *
 * @param {Uint8Array} data Source bytes.
 * @param {number} offset Byte offset of the dict.
 * @param {FsdSchemaAttributes} schemaAttributes Dict schema.
 * @returns {FsdDictOffsetLookup} The index.
 */
export function createFsdDictOffsetLookup(data, offset, schemaAttributes)
{
    const dictKeySchemaType = schemaAttributes.dictAttributes.keySchema.schemaType;
    const totalDataSize = BinaryLoaderHelper.getUnsignedIntFromData(data, offset);
    const footerSize = BinaryLoaderHelper.getUnsignedIntFromData(data, offset + 4 + totalDataSize - 4);
    const footerData = BinaryLoaderHelper.getSubsetOfData(data, offset + totalDataSize - footerSize, footerSize);

    const offsetSizeObjectSchema = schemaAttributes.dictAttributes.keyFooterSchema.listAttributes.listItemSchema;
    const footerOffsetHasSize = offsetSizeObjectSchema.objectAttributes.attributes.has("size");

    switch (dictKeySchemaType)
    {
        case SchemaType.UNSIGNED_32_BIT_INT_SCHEMA_TYPE:
            return new FastLoadingHashedOffsetLookup(footerData, "I", footerOffsetHasSize);
        case SchemaType.SIGNED_32_BIT_INT_SCHEMA_TYPE:
            return new FastLoadingHashedOffsetLookup(footerData, "i", footerOffsetHasSize);
        case SchemaType.STRING_SCHEMA_TYPE:
            return new SemiFastStringLoadingHashedOffsetLookup(footerData, schemaAttributes.dictAttributes.keyFooterSchema, footerOffsetHasSize);
        default:
            return new SlowBinarySearchOffsetLookup(footerData, schemaAttributes.dictAttributes.keyFooterSchema, footerOffsetHasSize);
    }
}

export default createFsdDictOffsetLookup;
