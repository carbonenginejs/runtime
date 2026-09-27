import assert from "node:assert/strict";
import { test } from "node:test";

import { AttributeFormat, Tr2VertexLayoutALWebgl2 } from "../../../npm/dist/trinityal/webgl2/index.js";
import { ALResult } from "../../../npm/dist/trinityal/index.js";
import { FakeRenderContext, FakeWebgl2 } from "./fakeWebgl2.js";

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
