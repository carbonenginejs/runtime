import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h:284-289
//
// Carbon nests this struct privately in `ParserState` (`ParserState::Pragma`);
// it is not exported from the folder's index.

import { FileLocation } from "./FileLocation.js";
import { InlineString } from "../InlineString.js";

/**
 * A `#pragma` seen while scanning, waiting for the code writer to emit it at
 * its location. Carbon's `ParserState::Pragma`.
 */
export class Pragma
{
    /** @type {InlineString} */
    pragma = new InlineString();

    /** @type {FileLocation} */
    location = new FileLocation();

    /** @type {boolean} */
    used = false;
}

CjsSchema.meta.define(Pragma, {
    className: "Pragma",
    carbon: "ParserState::Pragma"
});
