import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserState.h

/**
 * One option of a `#pragma permutation`: Carbon's `PermutationOption`.
 */
export class PermutationOption
{
    name = "";

    value = 0;
}

CjsSchema.blue.define(PermutationOption, {
    className: "PermutationOption"
});
