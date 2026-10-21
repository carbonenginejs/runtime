import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h

/**
 * One option of a `#pragma permutation`: Carbon's `PermutationOption`.
 */
export class PermutationOption
{
    name = "";

    /** Carbon leaves it unset. */
    value = 0;
}

CjsSchema.meta.carbon("PermutationOption")(PermutationOption);
