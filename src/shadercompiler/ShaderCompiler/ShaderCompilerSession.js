import { CjsSchema } from "#schema/CjsSchema";

// Source: trinity/shadercompiler/ShaderCompiler.cpp:28-75 (the globals)
//
// Not in Carbon as a class: ShaderCompiler.cpp keeps one compile's state in
// globals. Holding them on one object lets two compiles run in one page
// without sharing an include cache, messages or results.

import { CachingIncludeHandler } from "../CachingIncludeHandler/index.js";
import { CompileMessageQueue } from "../CompileMessageQueue.js";

/**
 * The state of one effect compile: Carbon's driver globals.
 */
export class ShaderCompilerSession
{
    /** Reads source files; also used by `GetSourceHash`. */
    read = null;

    /** Carbon's `g_includeHandler`. */
    includeHandler = null;

    /** Carbon's `g_messages`. */
    messages = null;

    /** Carbon's `g_error`. */
    error = false;

    /** Carbon's `g_compiledEffects`: EffectData by permutation index. @type {Map<number, import("../EffectData/EffectData.js").EffectData>} */
    compiledEffects = new Map();

    /** Carbon's `g_shaderSource` and `g_shaderLength`, as one range. @type {import("../InlineString.js").InlineString|null} */
    shaderSource = null;

    /** Carbon's `g_compilers`: created compilers by platform. @type {Map<number, object>} */
    compilers = new Map();

    /** How to create each platform's compiler; Carbon's switch in CompileShader. */
    compilerFactories = null;

    /** Carbon's `g_printWarnings`. */
    printWarnings = true;

    /** Carbon's `g_optimizationLevel`, hashed into the container. */
    optimizationLevel = 3;

    /** Carbon's `g_avoidFlowControl`, hashed into the container. */
    avoidFlowControl = false;

    /** Carbon's `g_generatePDB`, hashed into the container. */
    generatePDB = false;

    /** Carbon's `g_skipOptimization`, hashed into the container. */
    skipOptimization = false;

    /**
     * @param {object} options The compile's wiring.
     * @param {(fullPath: string) => (string|null)} options.read Reads a source file by full path.
     * @param {Map<number, (session: ShaderCompilerSession) => object>} options.compilerFactories Creates the compiler for each platform.
     * @param {((line: string) => void)|null} [options.onMessage=null] Receives each message as Carbon prints it.
     */
    constructor({ read, compilerFactories, onMessage = null })
    {
        this.read = read;

        this.includeHandler = new CachingIncludeHandler(read);

        this.messages = new CompileMessageQueue(onMessage);

        this.compilerFactories = compilerFactories;
    }

    /**
     * Carbon's direct `printf` lines, which bypass the message queue.
     *
     * @param {string} line The line.
     */
    log(line)
    {
        this.messages.output.push(line);
        if (this.messages._listener)
        {
            this.messages._listener(line);
        }
    }
}

CjsSchema.meta.define(ShaderCompilerSession, { className: "ShaderCompilerSession" });
