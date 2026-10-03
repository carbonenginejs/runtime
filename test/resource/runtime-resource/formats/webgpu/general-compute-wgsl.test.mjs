import { test } from "node:test";
import assert from "node:assert/strict";

import { lowerDxbcToIr } from "../../../../../src/resource/formats/webgpu/core/ir/lowerDxbcToIr.js";
import { buildWgslBindingPlan } from "../../../../../src/resource/formats/webgpu/core/wgsl/buildWgslBindingPlan.js";
import { buildWgsl } from "../../../../../src/resource/formats/webgpu/core/wgsl/emitWgsl.js";
import { buildContainer, buildShex, opcodeToken, operandToken } from "../dxbc/synthetic.js";

// A compute program no hand-matched profile claims lowers through the general
// instruction set shared with the fragment stage. The probe's filters
// (ReflectionFilterActivision*.fx, CopyCube.fx) are such programs: they sample
// a cube and write RWTexture2DArray<float4> at vThreadID. This is the smallest
// program of that shape, assembled from tokens.

const COMPUTE_SHADER = 5;
const OPCODE = Object.freeze({
    dcl_global_flags: 106,
    dcl_unordered_access_view_typed: 156,
    dcl_input: 95,
    dcl_thread_group: 155,
    store_uav_typed: 164,
    ret: 62
});
const TYPE = Object.freeze({ immediate32: 4, uav: 30, input_thread_id: 32 });
const FOUR_COMPONENTS = 2;
const SWIZZLE_MODE = 1 << 2;
const REFACTORING_ALLOWED = 1 << 11;
const TEXTURE2DARRAY = 8;
const FLOAT_X4 = 0x5555;

/** Components x=0 y=1 z=2 w=3, as the operand's 8-bit swizzle field. */
function swizzle(...lanes)
{
    return lanes.reduce((bits, lane, index) => bits | (lane << (index * 2)), 0) << 4;
}

function storeToTextureArrayProgram(dimension = TEXTURE2DARRAY, returnType = FLOAT_X4)
{
    const uav = operandToken(TYPE.uav, [ 0 ]);
    const tokens = [
        opcodeToken(OPCODE.dcl_global_flags, 1) | REFACTORING_ALLOWED,
        opcodeToken(OPCODE.dcl_unordered_access_view_typed, 4) | (dimension << 11),
        uav, 0, returnType,
        opcodeToken(OPCODE.dcl_input, 2),
        operandToken(TYPE.input_thread_id, []) | FOUR_COMPONENTS | (0x7 << 4),
        opcodeToken(OPCODE.dcl_thread_group, 4), 8, 8, 1,
        opcodeToken(OPCODE.store_uav_typed, 9),
        uav | FOUR_COMPONENTS | (0xf << 4), 0,
        operandToken(TYPE.input_thread_id, []) | FOUR_COMPONENTS | SWIZZLE_MODE | swizzle(0, 1, 2, 2),
        operandToken(TYPE.immediate32, []) | FOUR_COMPONENTS, 0x3f800000, 0, 0, 0x3f800000,
        opcodeToken(OPCODE.ret, 1)
    ].map((token) => token >>> 0);
    return buildContainer([ { fourCC: "SHEX", payload: buildShex(tokens, { programType: COMPUTE_SHADER }) } ]);
}

test("an unprofiled compute program writes a storage texture at the dispatch thread", () =>
{
    const { code: wgsl } = buildWgsl(storeToTextureArrayProgram());

    assert.match(wgsl, /var u0: texture_storage_2d_array<rgba16float, write>;/u);
    assert.match(wgsl, /@compute @workgroup_size\(8, 8, 1\)/u);
    assert.match(wgsl, /@builtin\(global_invocation_id\) dispatch_thread_id: vec3<u32>/u);
    // x, y and the layer all reach the store; the IR once kept only x.
    assert.match(wgsl, /vec3<u32>\(dispatch_thread_id\.x, dispatch_thread_id\.y, dispatch_thread_id\.z\)/u);
    // D3D drops an out-of-bounds typed-UAV write; the guard reproduces that.
    assert.match(wgsl, /textureDimensions\(u0\)\) && store_address\d+\.z < textureNumLayers\(u0\)/u);
    assert.match(wgsl, /textureStore\(u0, store_address\d+\.xy, store_address\d+\.z, vec4<f32>\(/u);
});

test("general 3D writes use xyz bounds and the binding's format, without effect-name policy", () =>
{
    // DXBC resource dimension 5 is texture3d. No semantic/effect name is supplied.
    for (const [view, format, returnType] of [
        [null, "rgba16float", FLOAT_X4],
        ["R8G8_UNORM", "rgba8unorm", FLOAT_X4],
        ["R32_FLOAT", "r32float", FLOAT_X4],
        ["R32_UINT", "r32uint", 0x4444],
        ["R32_SINT", "r32sint", 0x3333]
    ])
    {
        const ir = lowerDxbcToIr(storeToTextureArrayProgram(5, returnType));
        const bindingPlan = buildWgslBindingPlan([ir], view
            ? { typedViews: { "storage-resource:0:0": view } } : {});
        const { code } = buildWgsl(ir, { bindingPlan });
        assert.ok(code.includes(`texture_storage_3d<${format}, write>`), format);
        assert.match(code, /let store_address\d+: vec3<u32> = vec3<u32>\(dispatch_thread_id\.x, dispatch_thread_id\.y, dispatch_thread_id\.z\)/u);
        assert.match(code, /if \(all\(store_address\d+ < textureDimensions\(u0\)\)\)\s+\{\s+textureStore\(u0, store_address\d+,/u);
        assert.doesNotMatch(code, /textureNumLayers/u);
        if (view === "R32_SINT") assert.match(code, /textureStore\(u0, store_address\d+, vec4<i32>/u);
        if (view === "R32_UINT") assert.match(code, /textureStore\(u0, store_address\d+, vec4<u32>/u);
        if (view === "R8G8_UNORM")
            assert.match(code, /textureStore\(u0, store_address\d+, vec4<f32>\(\(vec4<f32>\([^;]+\)\)\.xy, 0\.0, 1\.0\)\);/u);
        else
            assert.doesNotMatch(code, /\)\.xy, 0\.0, 1\.0/u);
    }
});

test("RG8 missing-channel expansion applies to 2D and array storage too", () =>
{
    for (const dimension of [3, TEXTURE2DARRAY])
    {
        const ir = lowerDxbcToIr(storeToTextureArrayProgram(dimension));
        const bindingPlan = buildWgslBindingPlan([ir], { typedViews: { "storage-resource:0:0": "R8G8_UNORM" } });
        const { code } = buildWgsl(ir, { bindingPlan });
        assert.match(code, /rgba8unorm, write/u);
        assert.match(code, /\)\.xy, 0\.0, 1\.0/u);
        assert.match(code, /if \(all\(store_address/u);
    }
});
