// Source: trinity/shadercompiler/ShaderCompiler.cpp:101-105

/**
 * One permutation to compile: Carbon's `CompileShaderArguments`.
 */
export class CompileShaderArguments
{
    /** Stable name independent of minification; no registry is required. */
    static className = "CompileShaderArguments";

    /** @type {number} The permutation's index in the container. Carbon leaves it unset. */
    permutation = 0;

    /** @type {import("../Macro.js").Macro[]} */
    defines = [];
}
