import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h

/**
 * One open `#if`, `#ifdef` or `#ifndef` block: Carbon's
 * `PreprocessorCondition`. `inheridedSkipMode` keeps Carbon's spelling.
 */
export class PreprocessorCondition
{
    skipMode = false;

    inheridedSkipMode = false;

    used = false;

    seenElse = false;
}

CjsSchema.blue.define(PreprocessorCondition, {
    className: "PreprocessorCondition"
});
