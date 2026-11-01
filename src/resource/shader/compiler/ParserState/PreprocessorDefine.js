// Source: trinity/shadercompiler/ParserState.h

import { InlineString } from "../InlineString.js";
import { FileLocation } from "./FileLocation.js";

/**
 * A `#define`: Carbon's `PreprocessorDefine`.
 *
 * `value` is the range of the definition's body in its source buffer. A macro
 * argument is stored the same way while its macro expands, with the
 * argument's range as the value.
 */
export class PreprocessorDefine
{
    /** Stable name independent of minification; no registry is required. */
    static className = "PreprocessorDefine";

    /** @type {FileLocation} */
    location = new FileLocation();

    /** @type {InlineString[]} */
    parameters = [];

    /** @type {InlineString} */
    value = new InlineString();
}
