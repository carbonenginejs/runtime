import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectCompilerMetal.h:78-84
//
// Carbon nests this struct privately in `EffectCompilerMetal`; it is not
// exported from the folder's index.

/**
 * One entry of the Metal compiler's compile cache: Carbon's
 * `EffectCompilerMetal::SyncData`.
 *
 * Adapted: Carbon's entry also holds a `std::mutex` and a
 * `std::condition_variable`, on which the worker threads compiling other
 * permutations wait for the one thread that compiles a given program. The
 * port's driver compiles permutations one after another on one thread (see
 * ShaderCompiler.js), so nothing ever waits and those two members have
 * nothing to do.
 */
export class SyncData
{
    /** Carbon's `compiled`: whether `compiledCode` is final. */
    compiled = false;

    /**
     * Carbon's `compiledCode`: the compiled program, empty after a failed
     * compile. Carbon holds Apple's AIR bytes; the port's `CompileCode`
     * seam holds the Metal source text instead.
     *
     * @type {string|Uint8Array}
     */
    compiledCode = "";
}

CjsSchema.blue.define(SyncData, {
    className: "SyncData",
    donors: ["EffectCompilerMetal::SyncData"]
});
