// Source: trinity/shadercompiler/ShaderCompiler.cpp
// Source: trinity/shadercompiler/ModifiedTime.cpp:50, :115-164 (GetSourceHash)
//
// Carbon's compile driver: discovers an effect's permutations, compiles each
// with the platform's compiler, and writes every result into one container.
//
// Adapted: Carbon's driver is a command-line program over globals
// (g_includeHandler, g_compiledEffects, g_messages, g_shaderSource...) with a
// worker thread per core. Here each compile is a ShaderCompilerSession holding
// those globals, and permutations compile one after another; a browser has no
// threads to share them with, and the results do not depend on the order.
// `main` becomes `CompileEffectFile`, which returns the container's bytes
// instead of writing a file. Packing, alias detection and the container
// layout are the runtime's Carbon effect writer, which ports EffectData::Save
// and this file's "Packing", "Find aliases" and "Saving" blocks.
//
// Not ported: the command line (ExtractCommandLineArguments, PrintUsage),
// /mtime (PrintOutOfDateFiles), listings and PDBs, which belong to the
// native tool and its D3D compilers.

import { CjsCarbonEffectWriter } from "../../resource/format/index.js";
import { InlineString } from "../InlineString.js";
import { CachingIncludeHandler } from "../CachingIncludeHandler/index.js";
import { CompileMessageQueue } from "../CompileMessageQueue.js";
import { ParserState } from "../ParserState/ParserState.js";
import { DATA_VERSION, EffectData } from "../EffectData/EffectData.js";
import { toDescriptionRecord } from "../EffectData/toDescriptionRecord.js";
import { Macro } from "../Macro.js";
import { MD5 } from "../MD5.js";
import { Platform, ParsePlatform, GetPlatformLongName } from "../platforms.js";
import { ShaderCompilerSession } from "./ShaderCompilerSession.js";
import { CompileShaderArguments } from "./CompileShaderArguments.js";

/**
 * Carbon's `ShaderCompilerVersion`, from `project(ShaderCompiler VERSION 1.2.6)`
 * (CMakeLists.txt:5) with no tweak: the version this port follows. Shipped
 * containers carry the same four bytes.
 */
export const ShaderCompilerVersion = Object.freeze([1, 2, 6, 0]);

/** Carbon's `s_include` (ModifiedTime.cpp:50). */
const INCLUDE_PATTERN = /#[ \t\n\v\f\r]*include[ \t\n\v\f\r]*[<"]([^>"]*)/gu;

/**
 * Carbon's `GetPlatform`: the platform the `PLATFORM` define names.
 *
 * Adapted: with no `PLATFORM` define Carbon picks its host's native target
 * (dx11 on Windows, metal elsewhere); a browser's native target is WebGPU.
 *
 * @param {Macro[]} defines The compile's defines.
 * @param {ShaderCompilerSession} session Reports an unrecognised platform.
 * @returns {number} A `Platform` value.
 */
export function GetPlatform(defines, session)
{
    const macro = Macro.findMacro(defines, "PLATFORM");
    if (macro)
    {
        const platform = ParsePlatform(macro.value);
        if (platform === Platform.PLATFORM_INVALID)
        {
            session.log(`Unrecognized platform define "${macro.value}". Reverting to dx11`);
            return Platform.PLATFORM_DX11;
        }
        return platform;
    }
    return Platform.PLATFORM_WEBGPU;
}

/**
 * Carbon's `CompileShader`: compiles one permutation with its platform's
 * compiler into the session's compiled effects.
 *
 * @param {CompileShaderArguments} args The permutation and its defines.
 * @param {ShaderCompilerSession} session The compile.
 * @returns {boolean} False after an error, which stops every later permutation.
 */
export function CompileShader(args, session)
{
    if (session.error)
    {
        return false;
    }
    const platform = GetPlatform(args.defines, session);
    if (session.compiledEffects.has(args.permutation))
    {
        return true;
    }

    let compiler = session.compilers.get(platform);
    if (!compiler)
    {
        const create = session.compilerFactories.get(platform);
        if (!create)
        {
            session.messages.AddMessage(`\\memory(0): error X0000: unsupported platform ${platform}`);
            session.error = true;
            return false;
        }
        compiler = create(session);
        if (!compiler.Create())
        {
            session.messages.AddMessage(`\\memory(0): error X0000: failed to create ${GetPlatformLongName(platform)} compiler`);
            session.error = true;
            return false;
        }
        session.compilers.set(platform, compiler);
    }

    const data = new EffectData();
    if (!compiler.CompileEffect(session.shaderSource, args.defines, data))
    {
        session.error = true;
        return false;
    }
    session.compiledEffects.set(args.permutation, data);
    return true;
}

/**
 * Carbon's `DiscoverPermutations`: reads the effect's `#pragma permutation`
 * axes.
 *
 * @param {Array<import("../ParserState/Permutation.js").Permutation>} permutations Receives the axes.
 * @param {InlineString} shaderSource The effect's source, after the leading newline.
 * @param {ShaderCompilerSession} session The compile.
 * @returns {boolean} False after reporting a malformed pragma.
 */
export function DiscoverPermutations(permutations, shaderSource, session)
{
    const state = new ParserState(shaderSource, { includeHandler: session.includeHandler, messages: session.messages });
    return state.DiscoverPermutations(permutations);
}

/**
 * Carbon's `AddPermutationsToWorkQueue`: one compile per combination of
 * options, the first axis varying fastest. Each defines every axis's name as
 * its option's value, after the caller's defines.
 *
 * @param {CompileShaderArguments[]} queue Receives the compiles.
 * @param {Array<import("../ParserState/Permutation.js").Permutation>} permutations The axes.
 * @param {boolean} ignorePermutations Compile one permutation with no axis defines.
 * @param {Macro[]} defines The caller's defines.
 */
export function AddPermutationsToWorkQueue(queue, permutations, ignorePermutations, defines)
{
    const indexes = new Array(permutations.length).fill(0);
    let permutation = 0;
    let done = false;
    while (!done)
    {
        const args = new CompileShaderArguments();
        args.permutation = permutation;
        args.defines.push(...defines.map(define => new Macro(define.name, define.value)));

        if (!ignorePermutations)
        {
            for (let i = 0; i < permutations.length; ++i)
            {
                args.defines.push(new Macro(permutations[i].name, String(permutations[i].options[indexes[i]].value)));
            }
        }

        queue.push(args);

        for (let i = 0; i < permutations.length; ++i)
        {
            ++indexes[i];
            if (indexes[i] >= permutations[i].options.length)
            {
                if (i + 1 === permutations.length)
                {
                    done = true;
                }
                indexes[i] = 0;
            }
            else
            {
                break;
            }
        }
        if (ignorePermutations || permutations.length === 0)
        {
            break;
        }
        ++permutation;
    }
}

/**
 * Carbon's `GetSourceHash`: MD5 over the defines, the compiler settings that
 * change the output, and the entry file with everything it includes.
 *
 * @param {string} sourcePath The entry file.
 * @param {Macro[]} defines The caller's defines.
 * @param {ShaderCompilerSession} session Reads the files, and holds the settings.
 * @returns {string} 32 hex characters.
 */
export function GetSourceHash(sourcePath, defines, session)
{
    const md5 = new MD5();
    const encoder = new TextEncoder();
    for (const each of defines)
    {
        md5.add(encoder.encode(each.name));
        md5.add(encoder.encode(each.value));
    }
    // Carbon hashes the raw bytes of `unsigned g_optimizationLevel` and of
    // three `bool`s.
    const settings = new Uint8Array(7);
    new DataView(settings.buffer).setUint32(0, session.optimizationLevel, true);
    settings[4] = session.avoidFlowControl ? 1 : 0;
    settings[5] = session.generatePDB ? 1 : 0;
    settings[6] = session.skipOptimization ? 1 : 0;
    md5.add(settings);

    // Carbon opens these through ModifiedTime.cpp's own handler, so a
    // separate handler stands in for it.
    //
    // Quirk (ModifiedTime.cpp:162, CachingIncludeHandler.cpp:100-119; Carbon
    // known defect CE-97): the entry file's own path is passed as the root
    // directory, so a relative entry path resolves to `fx/a.fx/fx/a.fx`, is
    // not found, and no source is hashed; only defines and settings are. An
    // absolute entry path is used as written.
    const handler = new CachingIncludeHandler(session.read);
    const visited = new Set();
    const visit = (path, parentData) =>
    {
        if (visited.has(path))
        {
            return;
        }
        visited.add(path);
        const opened = handler.Open(path, parentData, sourcePath);
        if (!opened)
        {
            return;
        }
        const text = opened.data.text.slice(1);
        md5.add(encoder.encode(text));
        for (const match of text.matchAll(INCLUDE_PATTERN))
        {
            visit(match[1], { buffer: opened.data, offset: 1 });
        }
    };
    visit(sourcePath, null);
    return md5.getHash();
}

/**
 * Carbon's `main` without the command line: compiles one effect file for a
 * platform and returns the container.
 *
 * @param {string} shaderPath The entry file, as `read` resolves it.
 * @param {object} options The compile.
 * @param {(fullPath: string) => (string|null)} options.read Reads a source file by full path.
 * @param {Map<number, (session: ShaderCompilerSession) => { Create: () => boolean, CompileEffect: (source: InlineString, defines: Macro[], result: EffectData) => boolean }>} options.compilers
 *   Creates the compiler for each platform: Carbon's `EffectCompilerBase` (EffectCompilerBase.h:8-17).
 * @param {Macro[]} [options.defines=[]] Defines for every permutation; `PLATFORM` picks the target.
 * @param {boolean} [options.ignorePermutations=false] Compile one permutation, ignoring the pragmas.
 * @param {(line: string) => void} [options.onMessage] Receives each compiler message as Carbon prints it.
 * @returns {{ bytes: Uint8Array|null, messages: string[] }} The container, or null after an error, and the messages.
 */
export function CompileEffectFile(shaderPath, { read, compilers, defines = [], ignorePermutations = false, onMessage = null })
{
    const session = new ShaderCompilerSession({ read, compilerFactories: compilers, onMessage });
    const done = bytes =>
    {
        session.messages.Flush();
        return { bytes, messages: session.messages.output };
    };

    const shader = session.includeHandler.Open(shaderPath);
    if (!shader)
    {
        session.log(`${shaderPath}: error X0000: Could not open input file "${shaderPath}"`);
        return done(null);
    }
    session.shaderSource = InlineString.makeInlineString__StartEnd(shader.data, 1, shader.data.text.length);
    session.includeHandler.SetRootPath(shaderPath);
    session.messages.SetEntryFileName(shaderPath);

    const permutations = [];
    if (!DiscoverPermutations(permutations, session.shaderSource, session))
    {
        return done(null);
    }

    let prefix = "\n";
    for (const permutation of permutations)
    {
        for (const option of permutation.options)
        {
            prefix += `#line ${permutation.location.lineNumber}\n#define ${option.name} ${option.value}\n`;
        }
    }
    prefix += "#line 1\n";
    const prefixed = session.includeHandler.AddPrefix(shaderPath, prefix);
    if (prefixed)
    {
        session.shaderSource = InlineString.makeInlineString__StartEnd(prefixed.data, 1, prefixed.data.text.length);
    }

    const queue = [];
    AddPermutationsToWorkQueue(queue, permutations, ignorePermutations, defines);
    for (const args of queue)
    {
        CompileShader(args, session);
    }
    if (session.error)
    {
        return done(null);
    }

    // Not in Carbon: a browser target's passes each end in the runtime's
    // backend block reference, which its readers expect under effect.webgpu/
    // and the WebGL2 path with no fallback (runtime carbon-effect-container.md,
    // "The optional trailing block").
    const platform = GetPlatform(defines, session);
    const writer = new CjsCarbonEffectWriter({
        version: DATA_VERSION,
        compilerVersion: ShaderCompilerVersion,
        sourceHash: GetSourceHash(shaderPath, defines, session),
        backend: platform === Platform.PLATFORM_WEBGPU || platform === Platform.PLATFORM_WEBGL2
    });
    for (const permutation of permutations)
    {
        // Carbon writes the default's index only when an option has the
        // default's name (ShaderCompiler.cpp:774-782); GetPermutationInfo has
        // already refused any other default.
        const defaultOption = permutation.options.findIndex(option => option.name === permutation.defaultOption);
        if (defaultOption < 0)
        {
            throw new Error(`ShaderCompiler: permutation ${permutation.name} has no option named ${permutation.defaultOption}`);
        }
        writer.addPermutation({
            name: permutation.name,
            defaultOption,
            description: permutation.description,
            type: permutation.type,
            options: permutation.options.map(option => option.name)
        });
    }
    for (const [index, data] of [...session.compiledEffects].sort((a, b) => a[0] - b[0]))
    {
        writer.addBody(index, toDescriptionRecord(data));
    }
    return done(writer.toBytes());
}
