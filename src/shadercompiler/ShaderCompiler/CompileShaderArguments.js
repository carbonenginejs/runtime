import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ShaderCompiler.cpp:101-105

/**
 * One permutation to compile: Carbon's `CompileShaderArguments`.
 */
export class CompileShaderArguments
{
    /** @type {number} The permutation's index in the container. */
    permutation = 0;

    /** @type {import("../Macro.js").Macro[]} */
    defines = [];
}

CjsSchema.blue.define(CompileShaderArguments, {
    className: "CompileShaderArguments"
});
