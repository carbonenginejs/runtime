// Source: trinity/shadercompiler/ParserState.h

import { FileLocation } from "./FileLocation.js";

/**
 * A `#pragma permutation` axis: Carbon's `Permutation`. `type` is 0 for a
 * static axis and 1 for a dynamic one.
 */
export class Permutation
{
    /** Stable name independent of minification; no registry is required. */
    static className = "Permutation";

    name = "";

    /** @type {import("./PermutationOption.js").PermutationOption[]} */
    options = [];

    defaultOption = "";

    description = "";

    /** Carbon leaves it unset. */
    type = 0;

    location = new FileLocation();
}
