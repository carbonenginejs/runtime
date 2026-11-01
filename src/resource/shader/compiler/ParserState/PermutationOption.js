// Source: trinity/shadercompiler/ParserState.h

/**
 * One option of a `#pragma permutation`: Carbon's `PermutationOption`.
 */
export class PermutationOption
{
    /** Stable name independent of minification; no registry is required. */
    static className = "PermutationOption";

    name = "";

    /** Carbon leaves it unset. */
    value = 0;
}
