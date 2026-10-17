import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h

import { InlineString } from "../InlineString.js";
import { FileLocation } from "./FileLocation.js";

/**
 * A preprocessor token: Carbon's `PreprocessorToken`. `type` is a
 * `PreprocessorTokenType` value.
 */
export class PreprocessorToken
{
    /** Carbon leaves it unset. */
    type = 0;

    string = new InlineString();

    fileLocation = new FileLocation();

    /**
     * @param {number} [type=0] Preprocessor token type.
     * @param {InlineString} [string] The token's characters.
     * @param {FileLocation} [fileLocation] Where the token was scanned.
     */
    constructor(type = 0, string = new InlineString(), fileLocation = new FileLocation())
    {
        this.type = type;

        this.string = string;

        this.fileLocation = fileLocation;
    }
}

CjsSchema.blue.define(PreprocessorToken, {
    className: "PreprocessorToken"
});
