import { test } from "node:test";
import assert from "node:assert/strict";

import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";

function register(typeName, registerIndex, mask = "", swizzle = "")
{
    return {
        typeName,
        componentCount: 4,
        mask,
        swizzle,
        selected: "",
        modifierName: "none",
        minPrecisionName: "default",
        registerIndex,
        indices: [ { values: [ registerIndex ], relative: null } ]
    };
}

function signature(semanticName, registerIndex, mask, readWriteMask)
{
    return {
        semanticName,
        semanticIndex: 0,
        systemValueType: semanticName === "SV_Position" ? 1 : 0,
        componentType: 3,
        componentTypeName: "float32",
        registerIndex,
        mask,
        readWriteMask,
        stream: 0,
        minPrecision: 0
    };
}

function globalFlagsDeclaration(refactoringAllowed = true)
{
    return {
        offset: 0,
        opcode: 0,
        opcodeName: "dcl_global_flags",
        isDeclaration: true,
        declaration: {
            globalFlags: refactoringAllowed ? 1 << 11 : 0,
            refactoringAllowed
        },
        operands: []
    };
}

function copyblitVertex(minor = 0, includeTexcoordMove = true)
{
    const instructions = [ globalFlagsDeclaration(), {
        offset: 16,
        opcode: 54,
        opcodeName: "mov",
        isDeclaration: false,
        operands: [ register("output", 0, "xyzw"), register("input", 0, "", "xyzw") ]
    } ];
    if (includeTexcoordMove)
    {
        instructions.push({
            offset: 21,
            opcode: 54,
            opcodeName: "mov",
            isDeclaration: false,
            operands: [ register("output", 1, "xy"), register("input", 1, "", "xyxx") ]
        });
    }
    instructions.push({ offset: 26, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] });
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: minor },
        signatures: {
            input: [
                signature("POSITION", 0, 15, 15),
                signature("TEXCOORD", 1, 3, 3)
            ],
            output: [
                signature("SV_Position", 0, 15, 0),
                signature("TEXCOORD", 1, 3, 12)
            ]
        },
        instructions
    };
}

const EXPECTED_WGSL = `struct VertexInput
{
    @location(0) input0: vec4<f32>,
    @location(1) input1: vec2<f32>,
};

struct VertexOutput
{
    @invariant @builtin(position) position: vec4<f32>,
    @location(1) output1: vec2<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput
{
    var output: VertexOutput;
    output.position = vec4<f32>(input.input0.x, input.input0.y, input.input0.z, input.input0.w);
    output.output1 = vec2<f32>(input.input1.x, input.input1.y);
    return output;
}
`;

test("BuildWgsl emits deterministic straight-line copyblit vertex WGSL", () =>
{
    const ir = CjsWebgpuFormat.buildShaderIr(copyblitVertex(), { source: "synthetic-copyblit-vs" });
    const shader = CjsWebgpuFormat.buildWgsl(ir);

    assert.equal(shader.kind, "wgsl-shader");
    assert.equal(shader.stage, "vertex");
    assert.equal(shader.entryPoint, "main");
    assert.equal(shader.code, EXPECTED_WGSL);
    assert.deepEqual(shader.sourceMap, [
        { line: 17, instructionIndex: 0, dxbcOffset: 16 },
        { line: 18, instructionIndex: 1, dxbcOffset: 21 },
        { line: 19, instructionIndex: 2, dxbcOffset: 26 }
    ]);
    assert.equal(shader.program.statements[1].expression.code, "vec2<f32>(input.input1.x, input.input1.y)");
    assert.equal(Object.isFrozen(shader), true);
    assert.deepEqual(CjsWebgpuFormat.buildWgsl(ir), shader);
});

test("DX11 and DX12 copyblit vertex descriptions emit identical WGSL", () =>
{
    assert.equal(
        CjsWebgpuFormat.buildWgsl(copyblitVertex(0)).code,
        CjsWebgpuFormat.buildWgsl(copyblitVertex(1)).code
    );
});

test("BuildWgsl zero-fills unwritten location outputs but still requires builtin outputs", () =>
{
    // A location varying left unwritten is allowed: WGSL zero-initializes the
    // output struct, matching D3D's undefined-but-safe-as-zero semantics.
    const shader = CjsWebgpuFormat.buildWgsl(copyblitVertex(0, false));
    assert.equal(shader.stage, "vertex");
    assert.match(shader.code, /@location\(1\) output1: vec2<f32>/u);
    assert.doesNotMatch(shader.code, /output\.output1 =/u);

    // A builtin output (SV_Position) left unwritten still fails closed.
    const noPosition = copyblitVertex(0, false);
    noPosition.instructions.splice(1, 1);
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(noPosition),
        /output SV_Position0 leaves .*unwritten/i
    );
});

test("BuildWgsl rejects unsupported reachable vertex operations", () =>
{
    const decoded = copyblitVertex();
    const index = decoded.instructions.findIndex((entry) => !entry.isDeclaration);
    decoded.instructions[index] = {
        ...decoded.instructions[index],
        opcode: 0,
        opcodeName: "deriv_rtx",
        operands: [
            register("output", 0, "xyzw"),
            register("input", 0, "", "xyzw")
        ]
    };
    assert.throws(() => CjsWebgpuFormat.buildWgsl(decoded), /opcode deriv_rtx.*not supported/i);
});

test("generated WGSL descriptors carry the emitter's entry point and code", () =>
{
    // This asserted the same values after a round trip through a Carbon WebGPU WGSL
    // chunk. Chunks are gone, and a container cannot be assembled from a bare
    // WGSL document -- the set is derived from description records, not stored
    // beside them. So the values are asserted at the emitter, and their survival
    // across the wire is proven against real effects in carbon-webgpu-container.test.js.
    const shader = CjsWebgpuFormat.buildWgsl(copyblitVertex());

    assert.equal(shader.entryPoint, "main");
    assert.equal(shader.code, EXPECTED_WGSL);
});
