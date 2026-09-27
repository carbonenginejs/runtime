import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2ShaderALWebgl2, Tr2ShaderProgramALWebgl2 } from "../../../npm/dist/trinityal/webgl2/index.js";
import { ALResult } from "../../../npm/dist/trinityal/index.js";
import { ShaderType } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeGlslBackendBlock } from "../../../npm/dist/resource/formats/webgl/core/glslBackendBlock.js";
import { FakeRenderContext, FakeWebgl2 } from "./fakeWebgl2.js";

const VERTEX = `#version 300 es
in highp vec4 in_POSITION0;
in highp vec2 in_TEXCOORD0;
uniform vec4 cb1[4];
void main() { gl_Position = in_POSITION0; }
`;

const PIXEL = `#version 300 es
precision highp float;
uniform vec4 cb7[2];
uniform mediump sampler2D s0;
uniform mediump sampler2D s1;
out vec4 SV_Target0;
void main() { SV_Target0 = texture(s0, vec2(0.0)) + texture(s1, vec2(0.0)); }
`;

/** A real WebGL2 backend block for the two stages above. */
function block()
{
    return {
        bytes: writeGlslBackendBlock({
            stages: {
                vertex: {
                    bindings: [ { kind: "constantBuffer", registerIndex: 1, name: "cb1", sizeInVec4: 4, style: "array" } ],
                    stageInputs: [
                        { register: 0, name: "in_POSITION0", semanticName: "POSITION", semanticIndex: 0, componentTypeName: "float32", mask: 15 },
                        { register: 1, name: "in_TEXCOORD0", semanticName: "TEXCOORD", semanticIndex: 0, componentTypeName: "float32", mask: 3 }
                    ]
                },
                pixel: {
                    bindings: [
                        { kind: "constantBuffer", registerIndex: 0, name: "cb7", sizeInVec4: 2, style: "array" },
                        { kind: "resource", registerIndex: 0, name: "s0", dimensionName: "texture2d", pairedSamplerRegisters: [ 3 ] },
                        { kind: "resource", registerIndex: 1, name: "s1", dimensionName: "texture2d", pairedSamplerRegisters: [ 0, 2 ] }
                    ]
                }
            }
        })
    };
}

function shader(gl, type, source, signature = { backendBlock: block(), registers: [] })
{
    const created = new Tr2ShaderALWebgl2();
    const result = created.Create(type, source, signature, "test", FakeRenderContext(gl));
    return { shader: created, result };
}

test("a shader compiles its GLSL and keeps its own stage of the backend block", () =>
{
    const { gl } = FakeWebgl2();
    const { shader: vertex, result } = shader(gl, ShaderType.VERTEX_SHADER, VERTEX);

    assert.equal(result, ALResult.S_OK);
    assert.equal(vertex.IsValid(), true);
    assert.equal(vertex.GetStageBlock().stageInputs.length, 2);
    assert.equal(new TextDecoder().decode(vertex.GetBytecode().bytecode), VERTEX);
});

test("a compile failure answers E_FAIL and keeps the log", () =>
{
    const { gl } = FakeWebgl2();
    const { shader: broken, result } = shader(gl, ShaderType.PIXEL_SHADER, "#error nope");

    assert.equal(result, ALResult.E_FAIL);
    assert.equal(broken.IsValid(), false);
    assert.match(broken.GetCompileLog(), /#error/);
});

test("stages WebGL2 does not have, static samplers and foreign blocks are refused", () =>
{
    const { gl } = FakeWebgl2();

    assert.equal(shader(gl, ShaderType.GEOMETRY_SHADER, VERTEX).result, ALResult.E_INVALIDARG);
    assert.equal(shader(gl, ShaderType.VERTEX_SHADER, VERTEX, { samplers: [ {} ], registers: [] }).result, ALResult.E_INVALIDARG);
    assert.equal(shader(gl, ShaderType.VERTEX_SHADER, VERTEX, { backendBlock: { bytes: new Uint8Array([ 1, 0 ]) } }).result, ALResult.E_INVALIDARG);
    assert.equal(shader(gl, ShaderType.VERTEX_SHADER, "").result, ALResult.E_OUTOFMEMORY);
});

test("a program links its stages, binding vertex inputs to their registers", () =>
{
    const { gl } = FakeWebgl2();
    const vertex = shader(gl, ShaderType.VERTEX_SHADER, VERTEX).shader;
    const pixel = shader(gl, ShaderType.PIXEL_SHADER, PIXEL).shader;
    const program = new Tr2ShaderProgramALWebgl2();

    assert.equal(program.Create([ vertex, pixel ], FakeRenderContext(gl)), ALResult.S_OK);
    assert.equal(program.IsValid(), true);

    const linked = program.GetGpuResource();
    assert.equal(linked.attributes.get("in_POSITION0"), 0);
    assert.equal(linked.attributes.get("in_TEXCOORD0"), 1);
});

test("the program gives each sampler uniform a unit and records its paired sampler", () =>
{
    const { gl, calls } = FakeWebgl2();
    const program = new Tr2ShaderProgramALWebgl2();
    program.Create([ shader(gl, ShaderType.VERTEX_SHADER, VERTEX).shader, shader(gl, ShaderType.PIXEL_SHADER, PIXEL).shader ], FakeRenderContext(gl));

    const textures = program.GetTextures();
    assert.deepEqual(textures.map(t => [ t.name, t.unit, t.samplerRegister, t.samplerConflict ]),
        [ [ "s0", 0, 3, false ], [ "s1", 1, 0, true ] ], "s1 is sampled through two samplers: a conflict WebGL2 cannot express");

    const unitCalls = calls.filter(call => call[0] === "uniform1i").map(call => [ call[1], call[2] ]);
    assert.deepEqual(unitCalls, [ [ "s0", 0 ], [ "s1", 1 ] ]);

    const constants = program.GetConstantBuffers();
    assert.deepEqual(constants.map(c => [ c.stage, c.registerIndex, c.name, c.style ]),
        [ [ ShaderType.VERTEX_SHADER, 1, "cb1", "array" ], [ ShaderType.PIXEL_SHADER, 0, "cb7", "array" ] ]);
    assert.ok(constants.every(c => c.location));
});

test("dx11's refusals: no stages, an invalid stage, two stages of one type", () =>
{
    const { gl } = FakeWebgl2();
    const context = FakeRenderContext(gl);
    const vertex = shader(gl, ShaderType.VERTEX_SHADER, VERTEX).shader;

    assert.equal(new Tr2ShaderProgramALWebgl2().Create([], context), ALResult.E_INVALIDARG);
    assert.equal(new Tr2ShaderProgramALWebgl2().Create([ vertex, vertex ], context), ALResult.E_INVALIDARG);
    assert.equal(new Tr2ShaderProgramALWebgl2().Create([ new Tr2ShaderALWebgl2() ], context), ALResult.E_INVALIDARG);
});

test("a link failure answers E_FAIL and keeps the log", () =>
{
    const { gl } = FakeWebgl2();
    const vertex = shader(gl, ShaderType.VERTEX_SHADER, `${VERTEX}\n// #nolink`).shader;
    const program = new Tr2ShaderProgramALWebgl2();

    assert.equal(program.Create([ vertex ], FakeRenderContext(gl)), ALResult.E_FAIL);
    assert.equal(program.IsValid(), false);
    assert.equal(program.GetLinkLog(), "link failed");
});

test("a compute-only program links with a full-screen vertex stage of its own", () =>
{
    const { gl, calls } = FakeWebgl2();
    const compute = shader(gl, ShaderType.COMPUTE_SHADER, PIXEL).shader;
    const program = new Tr2ShaderProgramALWebgl2();

    assert.equal(program.Create([ compute ], FakeRenderContext(gl)), ALResult.S_OK);
    const attached = program.GetGpuResource().shaders;
    assert.equal(attached.length, 2);
    assert.match(attached[0].source, /gl_VertexID/);
    assert.ok(calls.some(call => call[0] === "createShader" && call[1] === attached[0]));
});
