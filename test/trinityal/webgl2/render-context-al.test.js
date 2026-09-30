import assert from "node:assert/strict";
import { test } from "node:test";

import {
    Tr2RenderContextALWebgl2,
    Tr2ShaderALWebgl2,
    Tr2ShaderProgramALWebgl2,
    Tr2VertexLayoutALWebgl2
} from "../../../npm/dist/trinityal/webgl2/index.js";
import { Tr2TextureAL, ALResult, Failed, Tr2BitmapDimensions, Tr2BufferDescriptionAL, Tr2ConstantUsageAL } from "../../../npm/dist/trinityal/index.js";
import { PixelFormat, RenderState, ShaderType, Topology, Tr2CpuUsage, Tr2GpuUsage } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeGlslBackendBlock } from "../../../npm/dist/resource/formats/webgl/core/glslBackendBlock.js";
import { FakeWebgl2 } from "./fakeWebgl2.js";

/** A context with a device and a 64x32 back buffer. */
function device()
{
    const { gl, calls } = FakeWebgl2();
    const context = new Tr2RenderContextALWebgl2({ gl });
    const result = context.CreateDevice({ mode: { width: 64, height: 32 } });
    return { gl, calls, context, result };
}

function texture(context, width, height, gpuUsage, format = PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM)
{
    const created = new Tr2TextureAL();
    assert.equal(created.Create(Tr2BitmapDimensions.texture2D(width, height, 1, format), { gpuUsage }, context), ALResult.S_OK);
    return created;
}

const calledWith = (calls, name) => calls.filter(call => call[0] === name).map(call => call.slice(1));

test("CreateDevice makes the back buffer, sizes the canvas and binds slot zero", () =>
{
    const { gl, context, result } = device();

    assert.equal(result, ALResult.S_OK);
    assert.equal(context.IsValid(), true);
    assert.deepEqual([ gl.canvas.width, gl.canvas.height ], [ 64, 32 ]);
    assert.notEqual(context.GetRenderTarget(0), context.GetDefaultBackBuffer());
    assert.equal(context.GetRenderTarget(0).Equals(context.GetDefaultBackBuffer()), true);
    assert.equal(context.GetBackBufferFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.deepEqual(context.GetViewport(), { x: 0, y: 0, width: 64, height: 32, minZ: 0, maxZ: 1 });
    assert.deepEqual(context.GetRenderTargetSize(0), { result: ALResult.S_OK, width: 64, height: 32 });

    const { gl: lost } = FakeWebgl2();
    lost.lost = true;
    assert.equal(new Tr2RenderContextALWebgl2({ gl: lost }).CreateDevice(), ALResult.E_FAIL);
});

test("render targets need render-target usage and a slot in range, as dx11's", () =>
{
    const { context } = device();
    const sampled = texture(context, 16, 16, Tr2GpuUsage.SHADER_RESOURCE);
    const target = texture(context, 16, 16, Tr2GpuUsage.RENDER_TARGET);

    assert.equal(context.SetRenderTarget(0, sampled), ALResult.E_INVALIDARG);
    assert.equal(context.SetRenderTarget(8, target), ALResult.E_INVALIDARG);
    assert.equal(context.SetRenderTarget(1, target), ALResult.S_OK);
    assert.equal(context.GetRenderTarget(1).Equals(target), true);
    assert.equal(context.SetDepthStencil(target), ALResult.E_INVALIDARG, "no depth-stencil usage");
});

test("binding slot zero resets the viewport and attaches the target", () =>
{
    const { gl, calls, context } = device();
    const target = texture(context, 16, 8, Tr2GpuUsage.RENDER_TARGET);
    calls.length = 0;

    context.SetRenderTarget(0, target);

    assert.deepEqual(context.GetViewport(), { x: 0, y: 0, width: 16, height: 8, minZ: 0, maxZ: 1 });
    assert.ok(calledWith(calls, "framebufferTexture2D").some(([ , point, , native ]) => point === gl.COLOR_ATTACHMENT0 && native === target.TrinityALImpl_GetObject().GetGpuResource()));
    assert.deepEqual(calledWith(calls, "drawBuffers").at(-1), [ [ gl.COLOR_ATTACHMENT0 ] ]);
});

test("a depth-stencil of another size is not attached until the target matches, as dx11's", () =>
{
    const { gl, calls, context } = device();
    const depth = texture(context, 16, 16, Tr2GpuUsage.DEPTH_STENCIL, PixelFormat.PIXEL_FORMAT_D32_FLOAT);
    calls.length = 0;

    context.SetDepthStencil(depth);
    assert.equal(calledWith(calls, "framebufferTexture2D").filter(([ , point ]) => point === gl.DEPTH_ATTACHMENT).length, 0, "64x32 back buffer, 16x16 depth");

    context.SetRenderTarget(0, texture(context, 16, 16, Tr2GpuUsage.RENDER_TARGET));
    assert.equal(calledWith(calls, "framebufferTexture2D").filter(([ , point ]) => point === gl.DEPTH_ATTACHMENT).length, 1);
});

test("render-target and depth stacks restore per slot, and an empty pop fails", () =>
{
    const { context } = device();
    const target = texture(context, 16, 16, Tr2GpuUsage.RENDER_TARGET);
    const backBuffer = context.GetDefaultBackBuffer();

    assert.equal(context.PushRenderTarget(0), ALResult.S_OK);
    context.SetRenderTarget(0, target);
    assert.equal(context.PopRenderTarget(0), ALResult.S_OK);
    assert.equal(context.GetRenderTarget(0).Equals(backBuffer), true);
    assert.ok(Failed(context.PopRenderTarget(0)));
    assert.ok(Failed(context.PopDepthStencil()));
    assert.equal(context.PushRenderTarget(8), ALResult.E_INVALIDARG);
});

test("Clear unpacks dx11's ARGB colour and clears depth, opening masks and scissor", () =>
{
    const { gl, calls, context } = device();
    context.SetRenderTarget(0, texture(context, 64, 32, Tr2GpuUsage.RENDER_TARGET));
    context.SetDepthStencil(texture(context, 64, 32, Tr2GpuUsage.DEPTH_STENCIL, PixelFormat.PIXEL_FORMAT_D32_FLOAT));
    calls.length = 0;

    assert.equal(context.Clear({ color: 0x80ff0000, depth: 0 }), ALResult.S_OK);

    const [ [ buffer, slot, colour ] ] = calledWith(calls, "clearBufferfv").filter(([ which ]) => which === gl.COLOR);
    assert.equal(buffer, gl.COLOR);
    assert.equal(slot, 0);
    assert.deepEqual(colour.map(value => Math.round(value * 255)), [ 255, 0, 0, 128 ]);
    assert.deepEqual(calledWith(calls, "clearBufferfv").find(([ which ]) => which === gl.DEPTH), [ gl.DEPTH, 0, [ 0 ] ]);
    assert.ok(calledWith(calls, "disable").some(([ what ]) => what === gl.SCISSOR_TEST));
    assert.ok(calledWith(calls, "depthMask").some(([ write ]) => write === true));
});

test("Present copies the back buffer to the canvas flipped, and counts frames by fence", () =>
{
    const { gl, calls, context } = device();
    calls.length = 0;

    assert.equal(context.GetRecordingFrameNumber(), 1);
    assert.equal(context.Present(), ALResult.S_OK);

    assert.deepEqual(calledWith(calls, "blitFramebuffer")[0], [ 0, 0, 64, 32, 0, 32, 64, 0, gl.COLOR_BUFFER_BIT, gl.NEAREST ],
        "row 0 of the back buffer is the top; row 0 of the canvas is the bottom");
    assert.equal(context.GetRecordingFrameNumber(), 2);
    assert.equal(context.GetRenderedFrameNumber(), 0, "the frame fence has not signalled");

    gl.finish();
    context.Present();
    assert.equal(context.GetRenderedFrameNumber(), 1, "frame 1's fence signalled; frame 2's was put after the finish");
});

// ---------------------------------------------------------------- drawing

const VERTEX = `#version 300 es
in highp vec4 in_POSITION0;
uniform vec4 cb1[1];
uniform vec3 ssyf;
void main() { gl_Position = in_POSITION0 + cb1[0]; }
`;

const PIXEL = `#version 300 es
precision highp float;
out vec4 SV_Target0;
void main() { SV_Target0 = vec4(1.0); }
`;

const BLOCK = {
    bytes: writeGlslBackendBlock({
        stages: {
            vertex: {
                bindings: [ { kind: "constantBuffer", registerIndex: 1, name: "cb1", sizeInVec4: 1, style: "array" } ],
                stageInputs: [ { register: 0, name: "in_POSITION0", semanticName: "POSITION", semanticIndex: 0, componentTypeName: "float32", mask: 15 } ]
            },
            pixel: { bindings: [] }
        }
    })
};

/** A context ready to draw one triangle list: program, layout, stream and indices. */
function drawable()
{
    const { gl, calls, context } = device();

    const shaders = [ [ ShaderType.VERTEX_SHADER, VERTEX ], [ ShaderType.PIXEL_SHADER, PIXEL ] ].map(([ type, source ]) =>
    {
        const shader = new Tr2ShaderALWebgl2();
        assert.equal(shader.Create(type, source, { backendBlock: BLOCK, registers: [], pipelineInputs: [ { usage: 0, usageIndex: 0, registerIndex: 0 } ] }, "test", context), ALResult.S_OK);
        return shader;
    });
    const program = context.CreateShaderProgram(shaders);
    const layout = context.CreateVertexLayout({ items: [ { usage: 0, usageIndex: 0, type: "FLOAT32_3", offset: 0, stream: 0, instanceStepRate: 0 } ] });
    const vertices = context.CreateBuffer(Tr2BufferDescriptionAL.FromStride(12, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE), new Float32Array(12));
    const indices = context.CreateBuffer(Tr2BufferDescriptionAL.FromStride(2, 6, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.NONE), new Uint16Array(6));

    context.SetShaderProgram(program);
    context.SetVertexLayout(layout);
    context.SetStreamSource(0, vertices, 0, 12);
    context.SetIndices(indices, 2);
    context.SetTopology(Topology.TOP_TRIANGLES);

    return { gl, calls, context, program, vertices, indices };
}

test("an indexed draw binds the program, points the attribute and draws elements", () =>
{
    const { gl, calls, context, program, vertices, indices } = drawable();
    calls.length = 0;

    assert.equal(context.DrawIndexedPrimitive(4, 3, 1), ALResult.S_OK);

    assert.deepEqual(calledWith(calls, "useProgram"), [ [ program.GetGpuResource() ] ]);
    assert.ok(calledWith(calls, "bindBuffer").some(([ target, buffer ]) => target === gl.ARRAY_BUFFER && buffer === vertices.TrinityALImpl_GetObject().GetGpuResource()));
    assert.deepEqual(calledWith(calls, "vertexAttribPointer"), [ [ 0, 3, gl.FLOAT, false, 12, 0 ] ]);
    assert.ok(calledWith(calls, "bindBuffer").some(([ target, buffer ]) => target === gl.ELEMENT_ARRAY_BUFFER && buffer === indices.TrinityALImpl_GetObject().GetGpuResource()));
    assert.deepEqual(calledWith(calls, "drawElementsInstanced"), [ [ gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 6, 1 ] ], "one triangle from index 3");
    assert.equal(context.GetDrawCount(), 1);
});

test("the base vertex moves the stream offset, which WebGL2 draws have no argument for", () =>
{
    const { calls, context } = drawable();
    calls.length = 0;

    context.DrawIndexedInstanced(3, 1, 0, 2, 0);
    assert.deepEqual(calledWith(calls, "vertexAttribPointer")[0].slice(-1), [ 24 ], "two 12-byte vertices in");
});

test("every target is drawn top-down: the clip flip uniform is set", () =>
{
    const { calls, context } = drawable();
    calls.length = 0;

    context.DrawPrimitive(0, 1);
    assert.deepEqual(calledWith(calls, "uniform3f").map(([ location, ...value ]) => [ location.name, ...value ]), [ [ "ssyf", 0, 0, -1 ] ]);
});

test("a ONE_SHOT constant buffer is copied when bound, so refilling it later changes nothing", () =>
{
    const { calls, context } = drawable();
    const constants = context.CreateConstantBuffer(16, Tr2ConstantUsageAL.ONE_SHOT, new Float32Array([ 1, 2, 3, 4 ]));

    assert.equal(context.SetConstants(constants, ShaderType.VERTEX_SHADER, 1), ALResult.S_OK);
    constants.GetMirror().set(new Uint8Array(new Float32Array([ 9, 9, 9, 9 ]).buffer));
    calls.length = 0;

    context.DrawPrimitive(0, 1);
    const [ [ location, values ] ] = calledWith(calls, "uniform4fv");
    assert.equal(location.name, "cb1");
    assert.deepEqual([ ...values ], [ 1, 2, 3, 4 ]);
    assert.equal(context.SetConstants(constants, ShaderType.VERTEX_SHADER, 16), ALResult.E_INVALIDARG, "past dx11's 16 registers");
});

// ---------------------------------------------------------------- render states

/** A setup as `Tr2RenderStateSetup` presents its authored pairs. */
const setup = pairs => ({ authoredStates: pairs });

test("render states reach GL at the draw: blend, depth and cull", () =>
{
    const { gl, calls, context } = drawable();
    context.SetRenderStates(setup([
        [ RenderState.RS_ALPHABLENDENABLE, 1 ], [ RenderState.RS_SRCBLEND, 5 ], [ RenderState.RS_DESTBLEND, 6 ],
        [ RenderState.RS_ZWRITEENABLE, 0 ], [ RenderState.RS_CULLMODE, 3 ]
    ]));
    calls.length = 0;

    context.DrawPrimitive(0, 1);

    assert.deepEqual(calledWith(calls, "blendFuncSeparate"), [ [ gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ] ]);
    assert.deepEqual(calledWith(calls, "depthMask"), [ [ false ] ]);
    assert.deepEqual(calledWith(calls, "cullFace"), [ [ gl.BACK ] ], "D3DCULL_CCW culls dx11's back faces");
    assert.deepEqual(calledWith(calls, "frontFace"), [ [ gl.CCW ] ], "dx11's clockwise front, mirrored by the top-down storage");

    calls.length = 0;
    context.DrawPrimitive(0, 1);
    assert.equal(calledWith(calls, "blendFuncSeparate").length, 0, "unchanged states are not set again");
});

test("the state manager's inverted cull and depth tables are applied to the pairs", () =>
{
    const { gl, calls, context } = drawable();
    context.SetRenderStates(setup([ [ RenderState.RS_CULLMODE, 3 ], [ RenderState.RS_ZFUNC, 4 ] ]), { invertedCullMode: true, invertedDepthTest: true });
    calls.length = 0;

    context.DrawPrimitive(0, 1);
    assert.deepEqual(calledWith(calls, "cullFace"), [ [ gl.FRONT ] ]);
    assert.deepEqual(calledWith(calls, "depthFunc"), [ [ gl.GEQUAL ] ], "LESSEQUAL inverts to GREATEREQUAL");
});

test("CE-48: without separate alpha, dx11 remaps a blend-factor source to SRC1_ALPHA", () =>
{
    const { gl, context } = drawable();
    context.SetRenderStates(setup([ [ RenderState.RS_ALPHABLENDENABLE, 1 ], [ RenderState.RS_SRCBLEND, 14 ], [ RenderState.RS_DESTBLEND, 1 ] ]));

    assert.equal(context.DrawPrimitive(0, 1), ALResult.E_FAIL, "SRC1_ALPHA needs WEBGL_blend_func_extended, which this device lacks");

    gl.extensions = { WEBGL_blend_func_extended: { SRC1_ALPHA_WEBGL: 0x8589 } };
    const { calls } = { calls: gl.calls };
    calls.length = 0;
    assert.equal(context.DrawPrimitive(0, 1), ALResult.S_OK);
    assert.deepEqual(calledWith(calls, "blendFuncSeparate"), [ [ gl.CONSTANT_COLOR, gl.ZERO, 0x8589, gl.ZERO ] ]);
});

test("wireframe cannot be rasterized, so the draw is refused", () =>
{
    const { context } = drawable();
    context.SetRenderStates(setup([ [ RenderState.RS_FILLMODE, 3 ] ]), { wireframe: true });

    assert.equal(context.DrawPrimitive(0, 1), ALResult.E_FAIL);
});
