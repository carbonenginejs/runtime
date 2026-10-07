import { test } from "node:test";
import assert from "node:assert/strict";
import { CjsCarbonEffectReader } from "../../src/resource/format/index.js";
import { CompileEffectFile, AddPermutationsToWorkQueue, GetSourceHash, ShaderCompilerVersion } from "../../src/shadercompiler/ShaderCompiler/shaderCompiler.js";
import { ShaderCompilerSession } from "../../src/shadercompiler/ShaderCompiler/ShaderCompilerSession.js";
import { Macro } from "../../src/shadercompiler/Macro.js";
import { Platform } from "../../src/shadercompiler/platforms.js";
import { Technique } from "../../src/shadercompiler/EffectData/Technique.js";
import { Pass } from "../../src/shadercompiler/EffectData/Pass.js";
import { StageInput } from "../../src/shadercompiler/EffectData/StageInput.js";
import { ParserState } from "../../src/shadercompiler/ParserState/ParserState.js";

const SOURCE = [
    "#pragma permutation(MODE, (MODE_A, MODE_B, MODE_C), MODE_B, \"The mode\", dynamic)",
    "#pragma permutation(FAST, (FAST_OFF, FAST_ON))",
    "float x;"
].join("\n");

/**
 * A stand-in for a platform compiler: one technique whose program text is
 * what the preprocessor made of MODE and FAST, so equal text means equal
 * bodies.
 *
 * @param {ShaderCompilerSession} session The compile.
 * @returns {object} The compiler.
 */
function probeCompiler(session)
{
    return {
        Create: () => true,
        CompileEffect(source, defines, result)
        {
            const state = new ParserState(source, { includeHandler: session.includeHandler, messages: session.messages });
            // FAST does not change the program, so FAST_ON aliases FAST_OFF.
            const mode = defines.find(define => define.name === "MODE").value;
            const technique = new Technique();
            technique.name = "Main";
            const pass = new Pass();
            const stage = new StageInput();
            stage.shaderData = `mode ${mode}; tokens ${state.GetSymbolTable() ? "ok" : ""}`;
            pass.stages.push(stage);
            technique.passes.push(pass);
            result.techniques.push(technique);
            return true;
        }
    };
}

// Absolute paths, as Carbon's build passes them: GetSourceHash only hashes
// an absolute entry path (Carbon known defect CE-97).
const files = { "/fx/probe.fx": SOURCE };
const read = path => (Object.hasOwn(files, path) ? files[path] : null);

test("permutations enumerate with the first axis fastest, as Carbon's driver does", () =>
{
    const queue = [];
    const permutations = [
        { name: "A", options: [{ value: 0 }, { value: 1 }] },
        { name: "B", options: [{ value: 0 }, { value: 1 }, { value: 2 }] }
    ];
    AddPermutationsToWorkQueue(queue, permutations, false, [new Macro("PLATFORM", "webgpu")]);
    assert.deepEqual(queue.map(args => [args.permutation, args.defines.map(d => `${d.name}=${d.value}`).join(" ")]), [
        [0, "PLATFORM=webgpu A=0 B=0"],
        [1, "PLATFORM=webgpu A=1 B=0"],
        [2, "PLATFORM=webgpu A=0 B=1"],
        [3, "PLATFORM=webgpu A=1 B=1"],
        [4, "PLATFORM=webgpu A=0 B=2"],
        [5, "PLATFORM=webgpu A=1 B=2"]
    ]);
});

test("an effect compiles into a container the runtime reads back, identical bodies shared", () =>
{
    const { bytes, messages } = CompileEffectFile("/fx/probe.fx", { read, compilers: new Map([[Platform.PLATFORM_WEBGPU, probeCompiler]]) });
    assert.deepEqual(messages, []);
    const reader = new CjsCarbonEffectReader(bytes);
    assert.equal(reader.permutationProduct, 6);
    assert.deepEqual(reader.permutations.map(axis => [axis.name.value, axis.defaultOption, axis.options.map(o => o.value)]), [
        ["MODE", 1, ["MODE_A", "MODE_B", "MODE_C"]],
        ["FAST", 0, ["FAST_OFF", "FAST_ON"]]
    ]);
    const texts = [];
    for (let index = 0; index < 6; ++index)
    {
        texts.push(new TextDecoder().decode(reader.readDescription(index).techniques[0].passes[0].stages[0].shaderData.bytes));
    }
    // MODE's options are defined as their values by the prefix, so MODE is 0, 1, 2.
    assert.deepEqual(texts, ["mode 0; tokens ok", "mode 1; tokens ok", "mode 2; tokens ok", "mode 0; tokens ok", "mode 1; tokens ok", "mode 2; tokens ok"]);
});

test("the header carries Carbon's compiler version and the source hash", () =>
{
    const { bytes } = CompileEffectFile("/fx/probe.fx", { read, compilers: new Map([[Platform.PLATFORM_WEBGPU, probeCompiler]]) });
    assert.deepEqual([...bytes.subarray(4, 8)], ShaderCompilerVersion);
    const session = new ShaderCompilerSession({ read, compilerFactories: new Map() });
    const hash = GetSourceHash("/fx/probe.fx", [], session);
    assert.match(hash, /^[0-9a-f]{32}$/u);
    assert.equal(new TextDecoder().decode(bytes.subarray(8, 40)), hash);
    // The hash follows the source.
    files["/fx/other.fx"] = `${SOURCE}\n// changed`;
    assert.notEqual(GetSourceHash("/fx/other.fx", [], session), hash);
});

test("an unknown platform stops the compile with Carbon's message", () =>
{
    const { bytes, messages } = CompileEffectFile("/fx/probe.fx", { read, compilers: new Map(), defines: [new Macro("PLATFORM", "10")] });
    assert.equal(bytes, null);
    assert.match(messages.join("\n"), /error X0000: unsupported platform 10/u);
});

test("a browser target's passes carry the runtime's backend block reference; Carbon's own targets do not", () =>
{
    const compilers = new Map([[Platform.PLATFORM_WEBGPU, probeCompiler], [Platform.PLATFORM_DX11, probeCompiler]]);
    const webgpu = CompileEffectFile("/fx/probe.fx", { read, compilers }).bytes;
    const dx11 = CompileEffectFile("/fx/probe.fx", { read, compilers, defines: [new Macro("PLATFORM", "dx11")] }).bytes;
    // Each of the six bodies' one pass gains an 8-byte {size, offset} reference.
    assert.equal(webgpu.length - dx11.length, 3 * 8);
    assert.equal(new CjsCarbonEffectReader(webgpu, { backend: true }).readDescription(0).techniques.length, 1);
});
