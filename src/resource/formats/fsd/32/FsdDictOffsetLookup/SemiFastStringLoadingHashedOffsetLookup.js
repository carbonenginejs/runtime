import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdDictOffsetLookup.h
// Source: fsd/FsdDictOffsetLookup.cpp
import { BinaryLoader } from "../BinaryLoader.js";
import { FooterOffsetSize } from "./FooterOffsetSize.js";
import { FsdDictOffsetLookup, OFFSET_LOOKUP_RESULT } from "./FsdDictOffsetLookup.js";

/** @typedef {import("../FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */

const encoder = new TextEncoder();

/**
 * Hash index for a dict keyed by `string`
 * (FsdDictOffsetLookup.h:57-67, FsdDictOffsetLookup.cpp:100-177).
 *
 * The footer is a variable-sized list of key/offset objects. Carbon skips the
 * list's offset table and walks the items in order, assuming each item is the
 * fixed data, the 8-byte optional bit field, one 4-byte offset entry and the
 * key string, so the key sits at `endOfFixedSizedData + 12`.
 *
 * Adapted: Carbon hashes the key's bytes (`std::string`) and looks up the
 * UTF-8 bytes of a Python `str`. Keys here are those bytes held one per
 * character, so the match is byte-exact as in Carbon.
 */
export class SemiFastStringLoadingHashedOffsetLookup extends FsdDictOffsetLookup
{
    /** @type {Map<string, FooterOffsetSize>} Offset and size by key bytes. */
    _hash = new Map();

    /**
     * Index every footer entry.
     *
     * @param {Uint8Array} footerData The dict's key footer.
     * @param {FsdSchemaAttributes} offsetTableSchema The key footer's list schema.
     * @param {boolean} hasSize True when entries carry a size.
     */
    constructor(footerData, offsetTableSchema, hasSize)
    {
        super();

        const keyOffsetObject = offsetTableSchema.listAttributes.listItemSchema.objectAttributes;
        const offsetToKey = keyOffsetObject.endOfFixedSizedData + 12;
        const offsetToOffset = keyOffsetObject.constantAttributeOffsets.get("offset") ?? 0;
        const offsetToSize = hasSize ? keyOffsetObject.constantAttributeOffsets.get("size") ?? 0 : 0;
        const dictLength = BinaryLoader.cLoadUnsigned32BitIntFromBinaryString(footerData, 0, "");

        let offsetToStartOfData = 4 + dictLength * 4;
        for (let i = 0; i < dictLength; i++)
        {
            const key = BinaryLoader.cLoadStringFromBinaryString(footerData, offsetToStartOfData + offsetToKey, "");
            const fos = new FooterOffsetSize();

            fos.offset = BinaryLoader.cLoadUnsigned32BitIntFromBinaryString(footerData, offsetToStartOfData + offsetToOffset, "");
            fos.size = hasSize ? BinaryLoader.cLoadSigned32BitIntFromBinaryString(footerData, offsetToStartOfData + offsetToSize, "") : -1;
            this._hash.set(ByteKey(key), fos);

            offsetToStartOfData += offsetToKey + 4 + key.length;
        }
    }

    /**
     * Find a key's value offset and size (FsdDictOffsetLookup.cpp:141-156).
     *
     * Divergence: Carbon builds a `std::string` from `PyUnicode_AsUTF8`
     * before checking for failure, so a non-string key dereferences null; the
     * port returns OFFSET_LOOKUP_ERROR_INVALID_KEY.
     *
     * @param {unknown} key Lookup key.
     * @param {FooterOffsetSize} fos Filled on success.
     * @returns {number} One of {@link OFFSET_LOOKUP_RESULT}.
     */
    GetOffsetAndSize(key, fos)
    {
        const convertedKey = Utf8Key(key);
        if (convertedKey === undefined) return OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_ERROR_INVALID_KEY;

        const findResult = this._hash.get(convertedKey);
        if (findResult === undefined) return OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_ERROR_KEY_NOT_PRESENT;

        fos.offset = findResult.offset;
        fos.size = findResult.size;
        return OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_OK;
    }

    /**
     * Test whether a key is present (FsdDictOffsetLookup.cpp:158-177).
     *
     * @param {unknown} key Lookup key.
     * @returns {boolean} True when present; false for a key that is not a well-formed string.
     */
    Contains(key)
    {
        const convertedKey = Utf8Key(key);
        if (convertedKey === undefined) return false;

        return this._hash.has(convertedKey);
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "SemiFastStringLoadingHashedOffsetLookup";
}

/**
 * Hold bytes one per character, so equal bytes give equal map keys.
 *
 * @param {Uint8Array} bytes Key bytes.
 * @returns {string} One character per byte.
 */
function ByteKey(bytes)
{
    let result = "";
    for (let i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
    return result;
}

/**
 * Encode a lookup key as `PyUnicode_AsUTF8` does.
 *
 * @param {unknown} key Lookup key.
 * @returns {string|undefined} Its UTF-8 bytes one per character, or undefined when it is not a well-formed string.
 */
function Utf8Key(key)
{
    if (typeof key !== "string" || !key.isWellFormed()) return undefined;
    return ByteKey(encoder.encode(key));
}

export default SemiFastStringLoadingHashedOffsetLookup;

CjsSchema.meta.carbon("SemiFastStringLoadingHashedOffsetLookup")(SemiFastStringLoadingHashedOffsetLookup);
