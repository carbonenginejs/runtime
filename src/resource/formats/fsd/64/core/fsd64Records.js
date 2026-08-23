import { CjsFsd64Binary } from "./CjsFsd64Binary.js";

/** Decodes one map using a caller-supplied fixed-record function. */
export function ReadFsdMap(bytes, options, readRecord)
{
    const binary = new CjsFsd64Binary(bytes, options);
    const result = new Map();

    for (const offset of binary.MapEntries(options.recordSize))
    {
        const [ key, value ] = readRecord(binary, offset);

        if (result.has(key))
        {
            const error = new Error(`Duplicate FSD map key in ${options.path}: ${key}`);
            error.code = "CJS_FSD_DUPLICATE_KEY";
            error.key = key;
            error.path = options.path;
            throw error;
        }

        result.set(key, value);
    }

    return result;
}

/** Reads a required UTF-8 field and reports its logical field identity on failure. */
export function ReadRequiredString(binary, pointerOffset, path, field)
{
    const value = binary.Utf8StringAtDataPointer(binary.Uint64(pointerOffset));

    if (value === null)
    {
        const error = new Error(`Invalid FSD string for ${path} field ${field}.`);
        error.code = "CJS_FSD_STRING_INVALID";
        error.field = field;
        error.path = path;
        throw error;
    }

    return value;
}

/** Reads a required string-list field and reports its logical field identity on failure. */
export function ReadRequiredStringList(binary, pointerOffset, path, field, maximumCount = 100)
{
    const value = binary.StringList(binary.Uint64(pointerOffset), maximumCount);

    if (value === null)
    {
        const error = new Error(`Invalid FSD string list for ${path} field ${field}.`);
        error.code = "CJS_FSD_LIST_INVALID";
        error.field = field;
        error.path = path;
        throw error;
    }

    return value;
}

/** Rejects presence flags outside a reader's supported mask. */
export function AssertFlags(flags, mask, path)
{
    if ((flags & ~mask) !== 0)
    {
        const error = new Error(`Unsupported FSD presence flags for ${path}: ${flags}`);
        error.code = "CJS_FSD_FLAGS_UNSUPPORTED";
        error.flags = flags;
        error.mask = mask;
        error.path = path;
        throw error;
    }
}
