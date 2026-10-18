import assert from "node:assert/strict";
import { test } from "node:test";

import { AttributeFormat, Tr2VertexLayoutALWebgl2 } from "../../../npm/dist/trinityal/webgl2/index.js";
import { ALResult } from "../../../npm/dist/trinityal/index.js";
import { FakeRenderContext, FakeWebgl2 } from "./fakeWebgl2.js";
import { Tr2VertexDefinition } from "../../../npm/dist/trinity/core/index.js";

// Carbon's Tr2VertexDefinition::UsageCode values (Tr2VertexDefinition.h:17-30).
const POSITION = 0;
const NORMAL = 2;
const TEXCOORD = 5;

/** A POSITION/NORMAL mesh on stream 0 plus an instanced TEXCOORD1 on stream 1. */
const ITEMS = [
    { usage: POSITION, usageIndex: 0, type: "FLOAT32_3", offset: 0, stream: 0, instanceStepRate: 0 },
    { usage: NORMAL, usageIndex: 0, type: "UBYTE_4_NORM", offset: 12, stream: 0, instanceStepRate: 0 },
    { usage: TEXCOORD, usageIndex: 1, type: "FLOAT32_4", offset: 0, stream: 1, instanceStepRate: 1 }
];

/** A vertex stage as the layout sees it: only its signature's pipeline inputs. */
function vertexShader(pipelineInputs)
{
    return { GetSignature: () => ({ pipelineInputs }) };
}

function created(gl, items = ITEMS)
{
    const layout = new Tr2VertexLayoutALWebgl2();
    const result = layout.Create({ items }, FakeRenderContext(gl));
    return { layout, result };
}

test("the attribute format table reads Carbon's data type names in GL's terms", () =>
{
    const { gl } = FakeWebgl2();

    assert.deepEqual(AttributeFormat(gl, "FLOAT32_3"), { size: 3, type: gl.FLOAT, normalized: false, integer: false, bytes: 12 });
    assert.deepEqual(AttributeFormat(gl, "FLOAT16_4"), { size: 4, type: gl.HALF_FLOAT, normalized: false, integer: false, bytes: 8 });
    assert.deepEqual(AttributeFormat(gl, "UBYTE_4_NORM"), { size: 4, type: gl.UNSIGNED_BYTE, normalized: true, integer: false, bytes: 4 });
    assert.deepEqual(AttributeFormat(gl, "SHORT_2"), { size: 2, type: gl.SHORT, normalized: false, integer: true, bytes: 4 });
    assert.deepEqual(AttributeFormat(gl, "UINT32_1"), { size: 1, type: gl.UNSIGNED_INT, normalized: false, integer: true, bytes: 4 });
    assert.deepEqual(AttributeFormat(gl, "UBYTE_3"), { size: 3, type: gl.UNSIGNED_BYTE, normalized: false, integer: true, bytes: 3 },
        "three-component bytes have no DXGI format, and WebGL2 reads them");
    assert.equal(AttributeFormat(gl, "FLOAT32_5"), null);
    assert.equal(AttributeFormat(gl, "DOUBLE_2"), null);
});

test("Create converts every item, and refuses an unknown type or an invalid context", () =>
{
    const { gl } = FakeWebgl2();
    const { layout, result } = created(gl);

    assert.equal(result, ALResult.S_OK);
    assert.equal(layout.IsValid(), true);

    assert.equal(created(gl, [ { ...ITEMS[0], type: "FLOAT32_9" } ]).result, ALResult.E_INVALIDARG);
    assert.equal(new Tr2VertexLayoutALWebgl2().Create({ items: ITEMS }, FakeRenderContext(gl, false)), ALResult.E_FAIL);
});

test("SetLayout plans one attribute per shader input, in the shader's order, at its register", () =>
{
    const { gl } = FakeWebgl2();
    const { layout } = created(gl);
    const shader = vertexShader([
        { usage: TEXCOORD, usageIndex: 1, registerIndex: 2 },
        { usage: POSITION, usageIndex: 0, registerIndex: 0 }
    ]);

    assert.equal(layout.SetLayout(shader, FakeRenderContext(gl)), ALResult.S_OK);
    assert.deepEqual(layout.GetCurrentPlan(), [
        { location: 2, format: AttributeFormat(gl, "FLOAT32_4"), stream: 1, offset: 0, divisor: 1, constant: null },
        { location: 0, format: AttributeFormat(gl, "FLOAT32_3"), stream: 0, offset: 0, divisor: 0, constant: null }
    ], "the NORMAL no input reads is absent from the plan");
});

test("an input the definition cannot feed becomes a constant of its declared type", () =>
{
    const { gl } = FakeWebgl2();
    const { layout } = created(gl);
    const shader = vertexShader([
        { usage: POSITION, usageIndex: 0, registerIndex: 0 },
        { usage: TEXCOORD, usageIndex: 0, registerIndex: 1, type: "UINT" },
        { usage: TEXCOORD, usageIndex: 3, registerIndex: 3 }
    ]);

    layout.SetLayout(shader, FakeRenderContext(gl));
    const [ , declared, undeclared ] = layout.GetCurrentPlan();

    assert.deepEqual(declared, { location: 1, format: null, stream: null, offset: 0, divisor: 0, constant: "UINT" },
        "matching is semantic and index only: TEXCOORD1 does not serve TEXCOORD0");
    assert.equal(undeclared.constant, "FLOAT", "Carbon's default: case");
});

test("plans are cached per vertex shader, and Create clears the cache", () =>
{
    const { gl } = FakeWebgl2();
    const context = FakeRenderContext(gl);
    const { layout } = created(gl);
    const a = vertexShader([ { usage: POSITION, usageIndex: 0, registerIndex: 0 } ]);
    const b = vertexShader([ { usage: POSITION, usageIndex: 0, registerIndex: 4 } ]);

    layout.SetLayout(a, context);
    const planA = layout.GetCurrentPlan();
    layout.SetLayout(b, context);
    assert.equal(layout.GetCurrentPlan()[0].location, 4);
    layout.SetLayout(a, context);
    assert.equal(layout.GetCurrentPlan(), planA, "the second SetLayout for a shader reuses its plan");

    layout.Create({ items: ITEMS }, context);
    assert.equal(layout.GetCurrentPlan(), null);
    layout.SetLayout(a, context);
    assert.notEqual(layout.GetCurrentPlan(), planA, "a new definition builds a new plan");
});

test("SetLayout fails without a definition, a shader or a valid context", () =>
{
    const { gl } = FakeWebgl2();
    const shader = vertexShader([ { usage: POSITION, usageIndex: 0, registerIndex: 0 } ]);

    assert.equal(new Tr2VertexLayoutALWebgl2().SetLayout(shader, FakeRenderContext(gl)), ALResult.E_FAIL);
    assert.equal(created(gl).layout.SetLayout(null, FakeRenderContext(gl)), ALResult.E_FAIL);
    assert.equal(created(gl).layout.SetLayout(shader, FakeRenderContext(gl, false)), ALResult.E_FAIL);
});

test("Destroy clears the definition and every plan", () =>
{
    const { gl } = FakeWebgl2();
    const { layout } = created(gl);
    layout.SetLayout(vertexShader([ { usage: POSITION, usageIndex: 0, registerIndex: 0 } ]), FakeRenderContext(gl));

    layout.Destroy();
    assert.equal(layout.IsValid(), false);
    assert.equal(layout.GetCurrentPlan(), null);
});


/**
 * EveChildInstancedMeshes::RebuildCachedData's combined declaration
 * (EveChildInstancedMeshes.cpp:713-725): the mesh's own items - here one
 * geometry-payload POSITION, as CarbonVertexElements hands them over - then six
 * FLOAT32_4, a UINT32_1 and a UINT32_2 at TEXCOORD8-15 on stream 1 with step
 * rate 1. Carbon resets stream 1's ledger after TEXCOORD10 (:719), so
 * TEXCOORD11-13 restart at offset 0.
 */
function instancedMeshDeclaration(Tr2VertexDefinition)
{
    const elements = new Tr2VertexDefinition();

    elements.items.push({ usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0, instanceStepRate: 0 });
    elements.nextOffset[0] = 12;

    elements.Add("FLOAT32_4", "TEXCOORD", 8, 1, 1);
    elements.Add("FLOAT32_4", "TEXCOORD", 9, 1, 1);
    elements.Add("FLOAT32_4", "TEXCOORD", 10, 1, 1);
    elements.nextOffset[1] = 0;
    elements.Add("FLOAT32_4", "TEXCOORD", 11, 1, 1);
    elements.Add("FLOAT32_4", "TEXCOORD", 12, 1, 1);
    elements.Add("FLOAT32_4", "TEXCOORD", 13, 1, 1);
    elements.Add("UINT32_1", "TEXCOORD", 14, 1, 1);
    elements.Add("UINT32_2", "TEXCOORD", 15, 1, 1);

    return elements;
}

/** The vertex stage's inputs for that declaration, each at its own register. */
const INSTANCED_MESH_INPUTS = [
    { usage: 0, usageIndex: 0, registerIndex: 0 },
    ...[ 8, 9, 10, 11, 12, 13, 14, 15 ].map((usageIndex, index) => ({ usage: 5, usageIndex, registerIndex: index + 1 }))
];

test("the format table reads UINT32_2 and a geometry payload's type plus count", () =>
{
    const { gl } = FakeWebgl2();

    assert.deepEqual(AttributeFormat(gl, "UINT32_2"), { size: 2, type: gl.UNSIGNED_INT, normalized: false, integer: true, bytes: 8 });
    assert.deepEqual(AttributeFormat(gl, { type: "Float32", elementCount: 3 }), { size: 3, type: gl.FLOAT, normalized: false, integer: false, bytes: 12 });
    assert.deepEqual(AttributeFormat(gl, { type: "UInt8Norm", elementCount: 4 }), { size: 4, type: gl.UNSIGNED_BYTE, normalized: true, integer: false, bytes: 4 });
    assert.equal(AttributeFormat(gl, { type: "Float64", elementCount: 2 }), null);
});

test("the instanced-mesh declaration plans integer, per-instance attributes on stream 1", () =>
{
    // Integer formats are bound with vertexAttribIPointer
    // (Tr2RenderContextALWebgl2._ApplyVertexAttributes), the step rate is the divisor.
    const { gl } = FakeWebgl2();
    const layout = new Tr2VertexLayoutALWebgl2();

    assert.equal(layout.Create(instancedMeshDeclaration(Tr2VertexDefinition), FakeRenderContext(gl)), ALResult.S_OK);
    assert.equal(layout.SetLayout(vertexShader(INSTANCED_MESH_INPUTS), FakeRenderContext(gl)), ALResult.S_OK);

    const float4 = AttributeFormat(gl, "FLOAT32_4");

    assert.deepEqual(layout.GetCurrentPlan(), [
        { location: 0, format: AttributeFormat(gl, { type: "Float32", elementCount: 3 }), stream: 0, offset: 0, divisor: 0, constant: null },
        { location: 1, format: float4, stream: 1, offset: 0, divisor: 1, constant: null },
        { location: 2, format: float4, stream: 1, offset: 16, divisor: 1, constant: null },
        { location: 3, format: float4, stream: 1, offset: 32, divisor: 1, constant: null },
        { location: 4, format: float4, stream: 1, offset: 0, divisor: 1, constant: null },
        { location: 5, format: float4, stream: 1, offset: 16, divisor: 1, constant: null },
        { location: 6, format: float4, stream: 1, offset: 32, divisor: 1, constant: null },
        { location: 7, format: AttributeFormat(gl, "UINT32_1"), stream: 1, offset: 48, divisor: 1, constant: null },
        { location: 8, format: AttributeFormat(gl, "UINT32_2"), stream: 1, offset: 52, divisor: 1, constant: null }
    ]);
    assert.equal(layout.GetCurrentPlan()[8].format.integer, true);
});
