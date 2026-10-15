import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/CachingIncludeHandler.h
//
// Carbon nests this struct publicly in `CachingIncludeHandler`
// (`CachingIncludeHandler::IncludedFile`); it is also reachable as
// `CachingIncludeHandler.IncludedFile`.

/**
 * A loaded include file: Carbon's `CachingIncludeHandler::IncludedFile`,
 * returned by value.
 */
export class IncludedFile
{
    /** @type {string} */
    fullPath = "";

    /**
     * The file's buffer, `{ text }`, whose text starts with Carbon's
     * leading newline. Carbon's `data` points one past it.
     *
     * @type {{ text: string }|null}
     */
    data = null;

    /** @type {number} The file's length, without the leading newline. */
    size = 0;

    /** @type {number} Carbon's `time_t`; -1 when unknown. */
    modifiedTime = -1;

    /**
     * Returns a copy, as Carbon returns the struct by value. The copy shares
     * the buffer, as a copied `const char*` does.
     *
     * @returns {IncludedFile} An independent struct.
     */
    Copy()
    {
        const copy = new IncludedFile();
        copy.fullPath = this.fullPath;
        copy.data = this.data;
        copy.size = this.size;
        copy.modifiedTime = this.modifiedTime;
        return copy;
    }
}

CjsSchema.blue.define(IncludedFile, {
    className: "IncludedFile",
    donors: ["CachingIncludeHandler::IncludedFile"]
});
