import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h

/**
 * One open `#if`, `#ifdef` or `#ifndef` block: Carbon's
 * `PreprocessorCondition`. `inheridedSkipMode` keeps Carbon's spelling.
 */
export class PreprocessorCondition
{
    /** Carbon leaves it unset. */
    skipMode = false;

    /** Carbon leaves it unset. */
    inheridedSkipMode = false;

    /** Carbon leaves it unset. */
    used = false;

    /** Carbon leaves it unset. */
    seenElse = false;
}

CjsSchema.meta.carbon("PreprocessorCondition")(PreprocessorCondition);
