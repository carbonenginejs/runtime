import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ParserUtils, ASTNode } from "../../src/shadercompiler/index.js";
import { CjsFxCBufferHeader } from "../../src/shadercompiler/library/CjsFxCBufferHeader.js";
import { buildHeaders, runtimeRoot, LIBRARY_ROOT } from "../../scripts/shadercompiler/cbuffer-headers.mjs";
import { parse } from "./support/parse.js";

const RUNTIME = runtimeRoot();
const runtimeSkip = existsSync(join(RUNTIME, "src", "trinity", "core", "rawData", "CjsPerFrameLayouts.js"))
    ? false
    : `runtime checkout not found at ${RUNTIME} (set CARBON_RUNTIME_ROOT)`;

const HEADERS = ["Tr2PerFrame", "Tr2PerFrameDebug", "Tr2PerFrameShadow", "EveSpaceScenePerFrame", "EveSpaceObject"];

/**
 * Parses `source` with the library's headers includable by their library path.
 *
 * @param {string} source HLSL text.
 * @returns {ReturnType<typeof parse>} The parse.
 */
function parseWithLibrary(source)
{
    const files = {};
    for (const name of HEADERS)
    {
        files[`cbuffers/${name}.fxh`] = readFileSync(join(LIBRARY_ROOT, "cbuffers", `${name}.fxh`), "utf8");
    }
    return parse(source, files);
}

/**
 * A layout for the packing checks, offsets laid out the C++ way: tightly, in
 * declaration order.
 *
 * @param {Array<[string, string, number?]>} fields Name, catalog type and count.
 * @returns {{ struct: string, fields: object[], stride: number }} The layout.
 */
function cppLayout(fields)
{
    const lanes = { matrix4: 16, vector4: 4, vector3: 3, vector2: 2, float: 1, uint32: 1 };
    let offset = 0;
    const out = fields.map(([name, type, count = 1]) =>
    {
        const field = { name, type, offset, count };
        offset += lanes[type] * count;
        return field;
    });
    return { struct: "Probe", fields: out, stride: Math.ceil(offset / 4) * 4 };
}

test("the committed headers match the runtime's catalog", { skip: runtimeSkip }, async () =>
{
    const headers = await buildHeaders(RUNTIME);
    assert.deepEqual([...headers.keys()].sort(), HEADERS.map(name => `cbuffers/${name}.fxh`).sort());
    for (const [path, text] of headers)
    {
        // A checkout may turn the committed LF line ends into CRLF.
        assert.equal(readFileSync(join(LIBRARY_ROOT, path), "utf8").replace(/\r\n/gu, "\n"), text, `library/${path} is stale; run node scripts/cbuffer-headers.mjs`);
    }
});

test("each header compiles, and a shader reads its members with their types", () =>
{
    const { ok, messages, state } = parseWithLibrary([
        "#include \"cbuffers/EveSpaceScenePerFrame.fxh\"",
        "float4 vs(float3 p : POSITION) : SV_Position { return mul(float4(p, 1), PerFrameVS.ViewProjectionMat); }",
        "float4 ps() : SV_Target { return float4(PerFramePS.Sun.DirWorld, PerFramePS.VolumetricSlices[2]); }"
    ].join("\n"));
    assert.deepEqual(messages, []);
    assert.equal(ok, true);
    const symbols = state.GetSymbolTable();
    assert.equal(symbols.LookupGlobal("PerFrameVS").type.ToString(), "EveSpaceScenePerFrameVSData");
    assert.equal(symbols.LookupGlobal("PerFramePS").type.ToString(), "EveSpaceScenePerFramePSData");

    for (const name of ["Tr2PerFrame", "Tr2PerFrameDebug", "Tr2PerFrameShadow"])
    {
        const result = parseWithLibrary(`#include "cbuffers/${name}.fxh"\n#include "cbuffers/${name}.fxh"\nfloat x;`);
        assert.deepEqual(result.messages, [], name);
        assert.equal(result.ok, true, name);
    }
});

test("Carbon's compiler moves PerFrameVS into b1 and PerFramePS into b2", () =>
{
    const { state } = parseWithLibrary("#include \"cbuffers/Tr2PerFrame.fxh\"\nfloat x;");
    ParserUtils.PatchCBuffers(state);
    // PatchCBuffers wraps each declaration where it stands, inside its
    // declaration list.
    const slots = [];
    const walk = node =>
    {
        if (node.GetNodeType() === ASTNode.ASTNodeType.NT_CBUFFER)
        {
            slots.push([node.GetSymbol().name.ToString(), [...node.GetSymbol().registerSpecifier.values()].map(r => `${r.registerType}${r.registerNumber}`)]);
        }
        node.GetChildren().filter(Boolean).forEach(walk);
    };
    walk(state.GetTree());
    assert.deepEqual(slots, [["PerFrameVS", ["b1"]], ["PerFramePS", ["b2"]]]);
});

test("a packed scalar array becomes a vector, and each member is placed as C++ places it", () =>
{
    const members = CjsFxCBufferHeader.layOut(cppLayout([["a", "float"], ["b", "float", 3], ["c", "vector3"], ["d", "float"]]), {});
    assert.deepEqual(members.map(({ hlsl, offset }) => [hlsl, offset]), [["float a", 0], ["float3 b", 1], ["float3 c", 4], ["float d", 7]]);
});

test("a layout HLSL would pack differently from C++ is refused", () =>
{
    // HLSL would move b to the next register; C++ leaves it straddling.
    assert.throws(() => CjsFxCBufferHeader.layOut(cppLayout([["a", "vector2"], ["pad", "float"], ["b", "vector3"], ["c", "vector2"]]), {}), /b is at float 4 in HLSL but 3 in C\+\+/u);
    // HLSL pads each element of a float2 array to a register.
    assert.throws(() => CjsFxCBufferHeader.layOut(cppLayout([["a", "vector2", 2]]), {}), /array of 2-lane vectors/u);
    // Five packed scalars fit no HLSL type.
    assert.throws(() => CjsFxCBufferHeader.layOut(cppLayout([["a", "float", 5], ["b", "vector3"]]), {}), /5 packed scalars/u);
    // Three packed scalars that would cross a register.
    assert.throws(() => CjsFxCBufferHeader.layOut(cppLayout([["a", "vector2"], ["b", "float", 3], ["c", "vector3"]]), {}), /b is at float 4 in HLSL but 2 in C\+\+/u);
    // A nested member needs its HLSL struct type.
    assert.throws(() => CjsFxCBufferHeader.layOut(cppLayout([["S.a", "vector4"]]), {}), /nested struct whose HLSL type is not given/u);
});
