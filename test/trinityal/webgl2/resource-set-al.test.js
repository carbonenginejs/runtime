import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2ResourceSetALWebgl2, Tr2ShaderALWebgl2, Tr2ShaderProgramALWebgl2 } from "../../../npm/dist/trinityal/webgl2/index.js";
import { ALResult, Tr2RegisterMapAL, Tr2ResourceSetDescriptionAL } from "../../../npm/dist/trinityal/index.js";
import { ShaderType, Tr2ColorSpace } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeGlslBackendBlock } from "../../../npm/dist/resource/formats/webgl/core/glslBackendBlock.js";
import { FakeRenderContext, FakeWebgl2 } from "./fakeWebgl2.js";

// Register types as the register map reads them (Tr2RegisterMapAL).
const SAMPLER = 1;
const SRV = 32;
const UAV = 64;

const VERTEX = `#version 300 es
in highp vec4 in_POSITION0;
void main() { gl_Position = in_POSITION0; }
`;

const PIXEL = `#version 300 es
precision highp float;
uniform mediump sampler2D s0;
uniform mediump sampler2D s1;
out vec4 SV_Target0;
void main() { SV_Target0 = texture(s0, vec2(0.0)) + texture(s1, vec2(0.0)); }
`;

/** t0 is sampled through s3; t1 through both s0 and s2. */
const PIXEL_BLOCK = {
    bytes: writeGlslBackendBlock({
        stages: {
            pixel: {
                bindings: [
                    { kind: "resource", registerIndex: 0, name: "s0", dimensionName: "texture2d", pairedSamplerRegisters: [ 3 ] },
                    { kind: "resource", registerIndex: 1, name: "s1", dimensionName: "texture2d", pairedSamplerRegisters: [ 0, 2 ] }
                ]
            }
        }
    })
};

const PIXEL_REGISTERS = [
    { registerType: SRV, registerIndex: 0 },
    { registerType: SRV, registerIndex: 1 },
    { registerType: SAMPLER, registerIndex: 0 },
    { registerType: SAMPLER, registerIndex: 2 },
    { registerType: SAMPLER, registerIndex: 3 }
];

function shader(gl, type, source, signature)
{
    const created = new Tr2ShaderALWebgl2();
    assert.equal(created.Create(type, source, signature, "test", FakeRenderContext(gl)), ALResult.S_OK);
    return created;
}

/** A linked program, its stages carrying the given register lists. */
function program(gl, { vertexRegisters = [], pixelRegisters = PIXEL_REGISTERS } = {})
{
    const linked = new Tr2ShaderProgramALWebgl2();
    const stages = [
        shader(gl, ShaderType.VERTEX_SHADER, VERTEX, { registers: vertexRegisters }),
        shader(gl, ShaderType.PIXEL_SHADER, PIXEL, { backendBlock: PIXEL_BLOCK, registers: pixelRegisters })
    ];
    assert.equal(linked.Create(stages, FakeRenderContext(gl)), ALResult.S_OK);
    return linked;
}

function create(linked, description)
{
    const set = new Tr2ResourceSetALWebgl2();
    return { set, result: set.Create(description, linked, null) };
}

test("each texture unit gets its register's resource and its paired sampler", () =>
{
    const { gl } = FakeWebgl2();
    const linked = program(gl);
    const texture = { kind: "texture" };
    const buffer = { kind: "buffer" };
    const first = { kind: "sampler s3" };
    const second = { kind: "sampler s0" };

    const description = new Tr2ResourceSetDescriptionAL({ program: linked });
    description.SetSrv(ShaderType.PIXEL_SHADER, 0, texture, Tr2ColorSpace.COLOR_SPACE_SRGB);
    description.SetSrv(ShaderType.PIXEL_SHADER, 1, buffer, 0, 1);
    description.SetSampler(ShaderType.PIXEL_SHADER, 3, first);
    description.SetSampler(ShaderType.PIXEL_SHADER, 0, second);

    const { set, result } = create(linked, description);
    assert.equal(result, ALResult.S_OK);
    assert.equal(set.IsValid(), true);
    assert.deepEqual(set.GetUnits(), [
        { unit: 0, resource: texture, colorSpace: Tr2ColorSpace.COLOR_SPACE_SRGB, sampler: first, samplerConflict: false },
        { unit: 1, resource: buffer, colorSpace: 0, sampler: second, samplerConflict: true }
    ]);
});

test("an empty slot leaves its unit empty", () =>
{
    const { gl } = FakeWebgl2();
    const linked = program(gl);
    const { set, result } = create(linked, new Tr2ResourceSetDescriptionAL({ program: linked }));

    assert.equal(result, ALResult.S_OK);
    assert.ok(set.GetUnits().every(unit => unit.resource === null && unit.sampler === null));
});

test("dx11's refusals: another program's register map, and a descriptor heap view", () =>
{
    const { gl } = FakeWebgl2();
    const linked = program(gl);

    const foreign = new Tr2ResourceSetDescriptionAL({ registers: new Tr2RegisterMapAL() });
    assert.equal(create(linked, foreign).result, ALResult.E_INVALIDARG);

    const heap = new Tr2ResourceSetDescriptionAL({ program: linked });
    heap.SetSrvHeapView(ShaderType.PIXEL_SHADER, 0);
    const { set, result } = create(linked, heap);
    assert.equal(result, ALResult.E_INVALIDARG);
    assert.equal(set.IsValid(), false);
});

test("an unordered-access view outside the pixel and compute stages is refused", () =>
{
    const { gl } = FakeWebgl2();
    const linked = program(gl, { vertexRegisters: [ { registerType: UAV, registerIndex: 0 } ] });
    const description = new Tr2ResourceSetDescriptionAL({ program: linked });

    assert.equal(create(linked, description).result, ALResult.S_OK, "an empty UAV slot is skipped before the check");

    description.SetUav(ShaderType.VERTEX_SHADER, 0, { kind: "texture" });
    assert.equal(create(linked, description).result, ALResult.E_INVALIDARG);
});

test("a pixel-stage unordered-access view is accepted, and resolves to nothing", () =>
{
    const { gl } = FakeWebgl2();
    const linked = program(gl, { pixelRegisters: [ ...PIXEL_REGISTERS, { registerType: UAV, registerIndex: 1 } ] });
    const description = new Tr2ResourceSetDescriptionAL({ program: linked });
    description.SetUav(ShaderType.PIXEL_SHADER, 1, { kind: "texture" }, 0);

    const { set, result } = create(linked, description);
    assert.equal(result, ALResult.S_OK);
    assert.equal(set._uavs[1], null, "no WebGL2 resource has an unordered-access view");
});

test("Destroy clears the set", () =>
{
    const { gl } = FakeWebgl2();
    const linked = program(gl);
    const { set } = create(linked, new Tr2ResourceSetDescriptionAL({ program: linked }));

    set.Destroy();
    assert.equal(set.IsValid(), false);
    assert.deepEqual(set.GetUnits(), []);
});
