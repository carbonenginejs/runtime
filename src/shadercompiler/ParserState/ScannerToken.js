import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/ParserState.h
// Source: trinity/shadercompiler/ParserState.cpp:29-37

import { InlineString } from "../InlineString.js";
import { FileLocation } from "./FileLocation.js";
import { HLSLParserTokens } from "../hlslParserTokens.js";

/**
 * A token handed to the HLSL parser: Carbon's `ScannerToken`, copied by value.
 *
 * `type` is an `HLSLParserTokens` value; 0 means "no token", which is how
 * Carbon's `ASTNode` marks a missing one. `intValue` carries the dimensions of
 * a type keyword and the value of a boolean literal.
 */
export class ScannerToken
{
    type = null;

    intValue = null;

    stringValue = null;

    fileLocation = null;

    /**
     * @param {number} [type=0] Parser token type.
     * @param {number} [intValue=0] Integer payload.
     * @param {InlineString} [stringValue] The token's characters.
     * @param {FileLocation} [fileLocation] Where the token was scanned.
     */
    constructor(type = 0, intValue = 0, stringValue = new InlineString(), fileLocation = new FileLocation())
    {
        this.type = type;

        this.intValue = intValue;

        this.stringValue = stringValue;

        this.fileLocation = fileLocation;
    }

    /**
     * Returns a copy, as assigning a Carbon `ScannerToken` copies it.
     *
     * @returns {ScannerToken} An independent token.
     */
    Copy()
    {
        return new ScannerToken(this.type, this.intValue, this.stringValue.Copy(), this.fileLocation.Copy());
    }

    /**
     * Carbon's `ScannerToken::ID`: an identifier token with the given text.
     *
     * @param {InlineString} value The identifier's characters.
     * @param {FileLocation} [location] Where it stands; Carbon's default is a zeroed location.
     * @returns {ScannerToken} The token.
     */
    static id(value, location = new FileLocation())
    {
        return new ScannerToken(HLSLParserTokens.OP_ID, 0, value.Copy(), location.Copy());
    }

    /**
     * Carbon's `ScannerToken::FromTokenType`: a token with a type and no text.
     *
     * @param {number} type Parser token type.
     * @param {FileLocation} [location] Where it stands; Carbon's default is a zeroed location.
     * @returns {ScannerToken} The token.
     */
    static fromTokenType(type, location = new FileLocation())
    {
        return new ScannerToken(type, 0, new InlineString(), location.Copy());
    }
}

CjsSchema.blue.define(ScannerToken, {
    className: "ScannerToken",
    methods: {
        id: [meta.renamed("ID")],
        fromTokenType: [meta.renamed("FromTokenType")]
    }
});
