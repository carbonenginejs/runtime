import { CjsSchema, blue } from "#schema";
// Source: trinity/shadercompiler/SymbolTable.h
// Source: trinity/shadercompiler/SymbolTable.cpp:10-30

import { InlineString } from "../InlineString.js";
import { ParseRegisterID } from "../ParserUtils/parserUtils.js";
import { ParserState } from "../ParserState/ParserState.js";

/**
 * A `packoffset(...)` placement: Carbon's `PackOffset`, copied by value.
 */
export class PackOffset
{
    subComponent = 0;

    component = new InlineString();

    /**
     * Returns a copy, as assigning a Carbon `PackOffset` copies it.
     *
     * @returns {PackOffset} An independent placement.
     */
    Copy()
    {
        const copy = new PackOffset();
        copy.subComponent = this.subComponent;
        copy.component = this.component.Copy();
        return copy;
    }

    /**
     * Carbon's `PackOffset::Create`: reads `c<N>` and an optional component.
     * Carbon parses straight into `subComponent`, so a register of the wrong
     * class, such as `b3`, is reported but still leaves its number there.
     *
     * @param {import("../ParserState/ParserState.js").ParserState} state Reports a malformed offset.
     * @param {import("../ParserState/ScannerToken.js").ScannerToken} subComponentToken The `c<N>` token.
     * @param {import("../ParserState/ScannerToken.js").ScannerToken|null} componentToken The swizzle token, if any.
     * @returns {boolean} Whether the offset was valid.
     */
    Create(state, subComponentToken, componentToken)
    {
        this.subComponent = -1;
        this.component = new InlineString();

        const register = { registerType: "", registerNumber: this.subComponent };
        const parsed = ParseRegisterID(subComponentToken.stringValue, register);
        this.subComponent = register.registerNumber;
        if (!parsed || register.registerType !== "c")
        {
            state.ShowMessage__Location(subComponentToken.fileLocation, ParserState.ErrorCode.EC_INVALID_PACK_OFFSET);
            return false;
        }
        else if (componentToken)
        {
            this.component = componentToken.stringValue.Copy();
        }
        return true;
    }
}

CjsSchema.blue.define(PackOffset, {
    className: "PackOffset",
    methods: {
        Create: [blue.method]
    }
});
