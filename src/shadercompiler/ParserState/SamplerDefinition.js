import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h:256-260
//
// Carbon nests this struct publicly in `ParserState`; it is also reachable as
// `ParserState.SamplerDefinition`.

/**
 * A bindless sampler's symbol and declaration. Carbon's
 * `ParserState::SamplerDefinition`.
 */
export class SamplerDefinition
{
    /** @type {import("../SymbolTable/Symbol.js").Symbol|null} */
    name = null;

    /** @type {import("../ASTNode/ASTNode.js").ASTNode|null} */
    definition = null;
}

CjsSchema.meta.define(SamplerDefinition, {
    className: "SamplerDefinition",
    carbon: "ParserState::SamplerDefinition"
});
