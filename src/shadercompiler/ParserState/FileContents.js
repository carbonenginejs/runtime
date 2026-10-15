import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h:274-281
//
// Carbon nests this struct privately in `ParserState` (`ParserState::FileContents`);
// it is not exported from the folder's index.

import { FileLocation } from "./FileLocation.js";
import { InlineString } from "../InlineString.js";

/**
 * One entry of the file stack the scanner reads: a source file, an included
 * file, a macro body or a macro argument. Carbon's `ParserState::FileContents`.
 */
export class FileContents
{
    /** @type {FileLocation} */
    location = new FileLocation();

    /** @type {InlineString} */
    code = new InlineString();

    /** @type {number} Carbon's `const char* position`, as an offset into `code`'s buffer. */
    position = 0;

    /** @type {boolean} */
    isMacro = false;

    /**
     * The macro's arguments by parameter name. Carbon's `std::map` is only
     * searched here, never iterated, so its order does not show.
     *
     * @type {Map<string, import("./PreprocessorDefine.js").PreprocessorDefine>}
     */
    arguments = new Map();
}

CjsSchema.blue.define(FileContents, {
    className: "FileContents",
    donors: ["ParserState::FileContents"]
});
