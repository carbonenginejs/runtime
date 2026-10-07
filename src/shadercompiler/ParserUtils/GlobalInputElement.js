// Source: trinity/shadercompiler/ParserUtils.h

import { InlineString } from "../InlineString.js";
import { Type } from "../Type.js";

/**
 * One name of a `[globalinput("...")]` attribute: Carbon's `GlobalInputElement`.
 */
export class GlobalInputElement
{
    type = null;

    name = null;

    declaration = null;

    symbol = null;

    /**
     * @param {Type} [type] The global's type, copied.
     * @param {InlineString} [name] The global's name.
     * @param {import("../ASTNode/ASTNode.js").ASTNode|null} [declaration] Its declaration.
     * @param {import("../SymbolTable/Symbol.js").Symbol|null} [symbol] Its symbol.
     */
    constructor(type = new Type(), name = new InlineString(), declaration = null, symbol = null)
    {
        this.type = type.Copy();

        this.name = name.Copy();

        this.declaration = declaration;

        this.symbol = symbol;
    }

    /**
     * Carbon's `operator==`: same type and name.
     *
     * @param {GlobalInputElement} other The element to compare with.
     * @returns {boolean} Whether they match.
     */
    Equals(other)
    {
        return this.type.Equals(other.type) && this.name.Equals(other.name);
    }
}
