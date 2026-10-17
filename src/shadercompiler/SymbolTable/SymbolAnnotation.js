import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/SymbolTable.h

import { InlineString } from "../InlineString.js";
import { ScannerToken } from "../ParserState/ScannerToken.js";

/**
 * One `<type name = value;>` annotation: Carbon's `SymbolAnnotation`.
 *
 * `type` is the annotation's type token (`OP_FLOAT`, `OP_STRING`, ...);
 * `value` is the literal's token. Carbon's `SymbolAnnotations` is an array of
 * these.
 */
export class SymbolAnnotation
{
    /** Carbon leaves it unset. */
    type = 0;

    name = new InlineString();

    value = new ScannerToken();
}

CjsSchema.blue.define(SymbolAnnotation, {
    className: "SymbolAnnotation"
});
