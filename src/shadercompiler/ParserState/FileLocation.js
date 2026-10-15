import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h

import { InlineString } from "../InlineString.js";

/**
 * Where a token came from: Carbon's `FileLocation`, copied by value.
 */
export class FileLocation
{
    lineNumber = null;

    fileName = null;

    /**
     * @param {number} [lineNumber=0] Line number, as the scanner counts it.
     * @param {InlineString} [fileName] The file's name, or Carbon's null string.
     */
    constructor(lineNumber = 0, fileName = new InlineString())
    {
        this.lineNumber = lineNumber;

        this.fileName = fileName;
    }

    /**
     * Returns a copy, as assigning a Carbon `FileLocation` copies it.
     *
     * @returns {FileLocation} An independent location.
     */
    Copy()
    {
        return new FileLocation(this.lineNumber, this.fileName.Copy());
    }
}

CjsSchema.blue.define(FileLocation, {
    className: "FileLocation"
});
