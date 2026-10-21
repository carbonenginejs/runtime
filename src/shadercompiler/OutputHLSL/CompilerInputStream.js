import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/OutputHLSL.h
// Source: trinity/shadercompiler/OutputHLSL.cpp:702-753

import { CodeStream } from "./CodeStream.js";
import { FileLocation } from "../ParserState/FileLocation.js";
import { InlineString } from "../InlineString.js";

/**
 * The stream Carbon prints shader code into before handing it to a
 * platform compiler: Carbon's `CompilerInputStream`.
 *
 * It keeps source positions: moving to the next line writes a newline, any
 * other move writes a `#line N "file"` directive, and the pragmas recorded
 * for the new position are written after it. `Endl`, `Indent` and `Unindent`
 * do nothing, so the output's line breaks follow the source's.
 */
export class CompilerInputStream extends CodeStream
{
    _state = null;

    _location = new FileLocation(0xffffffff, InlineString.makeInlineString(""));

    /**
     * @param {import("../ParserState/ParserState.js").ParserState} state Supplies the pragmas.
     * @param {number} lang A `ShadingLanguage` value.
     */
    constructor(state, lang)
    {
        super(lang);

        this._state = state;
    }

    /** Leaves line breaks to source-location changes. */
    Endl()
    {
    }

    /**
     * Carbon's `CompilerInputStream::ChangeLocation`.
     *
     * @param {FileLocation} location The location of the node about to print.
     */
    ChangeLocation(location)
    {
        if (this._location.lineNumber !== location.lineNumber || !this._location.fileName.Equals(location.fileName))
        {
            if (this._location.fileName.Equals(location.fileName) && ((this._location.lineNumber + 1) >>> 0) === location.lineNumber)
            {
                this.Write("\n");
            }
            else
            {
                const fileName = location.fileName.ToString().replace(/\\/gu, "/");
                this.Write(`\n#line ${location.lineNumber >>> 0} "${fileName}"\n`);
            }
            this._location = location.Copy();
            const pragma = { value: null };
            while (this._state.GetPragma(this._location, pragma))
            {
                this.Write("#pragma ").Write(pragma.value).Write("\n");
                this._location.lineNumber = (this._location.lineNumber + 1) >>> 0;
            }
        }
    }

    /** Preserves source formatting without adding indentation. */
    Indent()
    {
    }

    /** Leaves indentation unchanged because this stream does not track it. */
    Unindent()
    {
    }
}

CjsSchema.decorateMethod(CompilerInputStream, "Endl", blue.method, meta.noop);
CjsSchema.decorateMethod(CompilerInputStream, "ChangeLocation", blue.method, meta.adapted);
CjsSchema.decorateMethod(CompilerInputStream, "Indent", blue.method, meta.noop);
CjsSchema.decorateMethod(CompilerInputStream, "Unindent", blue.method, meta.noop);
CjsSchema.meta.carbon("CompilerInputStream")(CompilerInputStream);
