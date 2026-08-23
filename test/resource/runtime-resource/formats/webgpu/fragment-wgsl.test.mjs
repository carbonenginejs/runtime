import { test } from "node:test";
import assert from "node:assert/strict";

import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";

function register(typeName, registerIndex, { mask = "", swizzle = "", selected = "", modifierName = "none" } = {})
{
    return {
        typeName,
        componentCount: [ "resource", "sampler" ].includes(typeName) ? 0 : 4,
        mask,
        swizzle,
        selected,
        modifierName,
        minPrecisionName: "default",
        registerIndex,
        indices: Number.isInteger(registerIndex) ? [ { values: [ registerIndex ], relative: null } ] : []
    };
}

function immediate(bits)
{
    return {
        ...register("immediate32", null, { swizzle: "xyzw" }),
        immediateValues: bits.map((uint32) => ({ uint32, float32: 0 }))
    };
}

function signature(semanticName, registerIndex, mask)
{
    return {
        semanticName,
        semanticIndex: 0,
        systemValueType: semanticName.startsWith("SV_") ? 1 : 0,
        componentType: 3,
        componentTypeName: "float32",
        registerIndex,
        mask,
        readWriteMask: mask,
        stream: 0,
        minPrecision: 0
    };
}

function declaration(offset, opcodeName, operandType, data)
{
    return {
        offset,
        opcode: 0,
        opcodeName,
        isDeclaration: true,
        declaration: { registerIndex: 0, ...data },
        operands: [ register(operandType, 0) ]
    };
}

function instruction(offset, opcodeName, operands)
{
    return { offset, opcode: 0, opcodeName, isDeclaration: false, operands };
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

function indexableTempDeclaration(offset, registerIndex, registerCount)
{
    return {
        offset,
        opcode: 0,
        opcodeName: "dcl_indexable_temp",
        isDeclaration: true,
        declaration: { registerIndex, registerCount, componentCount: 4 },
        operands: []
    };
}

function indexableTempOperand(registerIndex, slot, { mask = "", swizzle = "", selected = "" } = {})
{
    return {
        ...register("indexable_temp", null, { mask, swizzle, selected }),
        registerIndex,
        indices: [
            { values: [ registerIndex ], relative: null },
            { values: [ slot ], relative: null }
        ]
    };
}

function fragmentFixture(minor = 0)
{
    const zeroOne = immediate([ 0, 0, 0x3f800000, 0x3f800000 ]);
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: minor },
        signatures: {
            input: [ signature("SV_Position", 0, 15), signature("TEXCOORD", 1, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_constant_buffer", "constant_buffer", { accessPattern: "immediate_indexed", sizeInVec4: 3 }),
            declaration(5, "dcl_sampler", "sampler", { samplerModeName: "default" }),
            declaration(7, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            {
                offset: 9,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(12, "lt", [
                register("temp", 0, { mask: "x" }),
                immediate([ 0 ]),
                immediate([ 0x3f800000 ])
            ]),
            { ...instruction(16, "if", [ register("temp", 0, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(18, "sample", [
                register("temp", 1, { mask: "yz" }),
                register("input", 1, { swizzle: "xyxx" }),
                register("resource", 0, { swizzle: "zxyw" }),
                register("sampler", 0)
            ]),
            instruction(23, "dp2", [
                register("temp", 2, { mask: "x" }),
                register("temp", 1, { swizzle: "yzyy" }),
                register("temp", 1, { swizzle: "yzyy" })
            ]),
            instruction(27, "mov", [ register("output", 0, { mask: "x" }), register("temp", 2, { selected: "x" }) ]),
            instruction(30, "mov", [ register("output", 0, { mask: "y" }), register("temp", 1, { selected: "z" }) ]),
            instruction(33, "mov", [ register("output", 0, { mask: "zw" }), zeroOne ]),
            instruction(37, "ret", []),
            instruction(38, "endif", []),
            instruction(39, "sample", [
                register("temp", 3, { mask: "xyzw" }),
                register("input", 1, { swizzle: "xyxx" }),
                register("resource", 0, { swizzle: "xyzw" }),
                register("sampler", 0)
            ]),
            instruction(44, "mov", [ register("output", 0, { mask: "xy" }), register("temp", 3, { swizzle: "xyxx" }) ]),
            instruction(47, "mov", [ register("output", 0, { mask: "zw" }), zeroOne ]),
            instruction(51, "ret", [])
        ]
    };
}

function inputlessFragmentFixture()
{
    const color = immediate([ 0x3f800000, 0, 0x3f000000, 0x3f800000 ]);
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "mov", [ register("output", 0, { mask: "xyzw" }), color ]),
            instruction(10, "ret", [])
        ]
    };
}

function roundingFragmentFixture(minor = 0)
{
    const values = immediate([ 0x3fc00000, 0xbfc00000, 0x3fc00000, 0xbfc00000 ]);
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: minor },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "frc", [ register("output", 0, { mask: "xy" }), values ]),
            instruction(6, "round_ni", [ register("output", 0, { mask: "zw" }), values ]),
            instruction(10, "ret", [])
        ]
    };
}

function integerDiscardFragmentFixture(minor = 0, { projection = "nonzero", explicitFlow = false } = {})
{
    const zero = immediate([ 0 ]);
    const color = immediate([ 0x3f800000, 0, 0x3f000000, 0x3f800000 ]);
    const instructions = [
        globalFlagsDeclaration(),
        {
            offset: 2,
            opcode: 0,
            opcodeName: "dcl_input_ps",
            isDeclaration: true,
            declaration: { registerIndex: 0, interpolationModeName: "linear" },
            operands: [ register("input", 0) ]
        },
        instruction(5, "lt", [
            register("temp", 0, { mask: "x" }),
            register("input", 0, { selected: "x" }),
            register("input", 0, { selected: "y" })
        ]),
        instruction(9, "lt", [
            register("temp", 0, { mask: "y" }),
            register("input", 0, { selected: "y" }),
            register("input", 0, { selected: "x" })
        ]),
        instruction(13, "iadd", [
            register("temp", 0, { mask: "z" }),
            register("temp", 0, { selected: "x", modifierName: "neg" }),
            register("temp", 0, { selected: "y" })
        ]),
        instruction(17, "itof", [
            register("temp", 0, { mask: "w" }),
            register("temp", 0, { selected: "z" })
        ]),
        instruction(21, "lt", [
            register("temp", 1, { mask: "x" }),
            register("temp", 0, { selected: "w" }),
            zero
        ])
    ];
    if (explicitFlow)
    {
        instructions.push(
            { ...instruction(25, "if", [ register("temp", 1, { selected: "x" }) ]), testBoolean: "nonzero" },
            { ...instruction(28, "discard", [ immediate([ 0xffffffff ]) ]), testBoolean: "nonzero" },
            instruction(29, "endif", []),
            instruction(30, "mov", [ register("output", 0, { mask: "xyzw" }), color ]),
            instruction(35, "ret", [])
        );
    }
    else
    {
        instructions.push(
            { ...instruction(25, "discard", [ register("temp", 1, { selected: "x" }) ]), testBoolean: projection },
            instruction(28, "mov", [ register("output", 0, { mask: "xyzw" }), color ]),
            instruction(33, "ret", [])
        );
    }
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: minor },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions
    };
}

function bitpatternInputFragmentFixture()
{
    const color = immediate([ 0x3f800000, 0, 0x3f000000, 0x3f800000 ]);
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 1) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            { ...instruction(9, "discard", [ register("temp", 0, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(12, "mov", [ register("output", 0, { mask: "xyzw" }), color ]),
            instruction(17, "ret", [])
        ]
    };
}

function bitpatternOutputFragmentFixture()
{
    const color = immediate([ 0, 0x3f800000, 0x3f000000, 0x3f800000 ]);
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "lt", [
                register("output", 0, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            instruction(9, "mov", [ register("output", 0, { mask: "yzw" }), color ]),
            instruction(14, "ret", [])
        ]
    };
}

function outputReadFragmentFixture(bitpattern = false)
{
    const first = bitpattern
        ? instruction(5, "lt", [
            register("output", 0, { mask: "x" }),
            register("input", 0, { selected: "x" }),
            register("input", 0, { selected: "y" })
        ])
        : instruction(5, "mov", [
            register("output", 0, { mask: "x" }),
            register("input", 0, { selected: "x" })
        ]);
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            first,
            instruction(9, "add", [
                register("output", 0, { mask: "y" }),
                register("output", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            instruction(13, "mov", [ register("output", 0, { mask: "zw" }), immediate([ 0, 0 ]) ]),
            instruction(17, "ret", [])
        ]
    };
}

function threeLaneDotFragmentFixture(selected = false)
{
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 7) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "mov", [
                register("temp", 0, { mask: "xyz" }),
                register("input", 0, { swizzle: "xyzx" })
            ]),
            instruction(9, "dp3", [
                register("temp", 1, { mask: "x" }),
                register("temp", 0, selected ? { selected: "x" } : { swizzle: "xyzw" }),
                register("temp", 0, { swizzle: "xyzw" })
            ]),
            instruction(14, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 1, { selected: "x" })
            ]),
            instruction(18, "ret", [])
        ]
    };
}

function scalarMergeFixture()
{
    const constants = immediate([ 0x3f800000, 0x3f800000, 0x3f800000, 0x3f800000 ]);
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 1 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(9, "lt", [
                register("temp", 1, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            { ...instruction(13, "if", [ register("temp", 1, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(16, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(20, "endif", []),
            instruction(21, "mov", [ register("output", 0, { mask: "x" }), register("temp", 0, { selected: "x" }) ]),
            instruction(25, "mov", [ register("output", 0, { mask: "yzw" }), constants ]),
            instruction(30, "ret", [])
        ]
    };
}

function undefinedMergeChainFixture(secondTestBoolean = "zero", secondConditionComponent = "x")
{
    const constants = immediate([ 0x3f800000, 0x3f800000, 0x3f800000, 0x3f800000 ]);
    const vectorConditions = secondConditionComponent !== "x";
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 1 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "lt", [
                register("temp", 1, { mask: vectorConditions ? "xy" : "x" }),
                register("input", 0, vectorConditions ? { swizzle: "xyxx" } : { selected: "x" }),
                register("input", 0, vectorConditions ? { swizzle: "yxxx" } : { selected: "y" })
            ]),
            { ...instruction(9, "if", [ register("temp", 1, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(12, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(16, "endif", []),
            {
                ...instruction(17, "if", [ register("temp", 1, { selected: secondConditionComponent }) ]),
                testBoolean: secondTestBoolean
            },
            instruction(20, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(24, "endif", []),
            instruction(25, "mov", [ register("output", 0, { mask: "x" }), register("temp", 0, { selected: "x" }) ]),
            instruction(29, "mov", [ register("output", 0, { mask: "yzw" }), constants ]),
            instruction(34, "ret", [])
        ]
    };
}

function undefinedAndMaskFixture({
    carrierOperand = 2,
    carrierSwizzle = "wxyz",
    conditionSwizzle = "xxxx",
    opcodeName = "and",
    testBoolean = "nonzero",
    maskSource = "condition",
    extraUse = false,
    sourceModifier = null,
    sourceMinPrecision = null,
    saturate = false
} = {})
{
    const instructions = [
        globalFlagsDeclaration(),
        {
            offset: 2,
            opcode: 0,
            opcodeName: "dcl_input_ps",
            isDeclaration: true,
            declaration: { registerIndex: 0, interpolationModeName: "linear" },
            operands: [ register("input", 0) ]
        },
        instruction(5, "mov", [
            register("temp", 0, { mask: "xyz" }),
            register("input", 0, { swizzle: "xyzw" })
        ]),
        instruction(9, "lt", [
            register("temp", 1, { mask: "xy" }),
            register("input", 0, { swizzle: "xyxx" }),
            register("input", 0, { swizzle: "yxxx" })
        ]),
        { ...instruction(13, "if", [ register("temp", 1, { selected: "x" }) ]), testBoolean },
        instruction(16, "mov", [
            register("temp", 0, { mask: "w" }),
            register("input", 0, { selected: "w" })
        ]),
        instruction(20, "endif", [])
    ];
    let condition = register("temp", 1, { swizzle: conditionSwizzle });
    if (maskSource === "derived")
    {
        instructions.push(instruction(21, "mov", [
            register("temp", 3, { mask: "x" }),
            register("temp", 1, { selected: "x" })
        ]));
        condition = register("temp", 3, { swizzle: "xxxx" });
    }
    else if (maskSource === "different")
    {
        instructions.push(instruction(21, "lt", [
            register("temp", 3, { mask: "x" }),
            register("input", 0, { selected: "z" }),
            register("input", 0, { selected: "w" })
        ]));
        condition = register("temp", 3, { swizzle: "xxxx" });
    }
    else if (maskSource === "overwritten")
    {
        instructions.push(instruction(21, "mov", [
            register("temp", 1, { mask: "x" }),
            register("input", 0, { selected: "z" })
        ]));
    }
    const carrier = register("temp", 0, { swizzle: carrierSwizzle });
    const sources = carrierOperand === 1 ? [ carrier, condition ] : [ condition, carrier ];
    if (sourceModifier)
    {
        sources[0].modifierName = sourceModifier;
    }
    if (sourceMinPrecision)
    {
        sources[0].minPrecisionName = sourceMinPrecision;
    }
    instructions.push({ ...instruction(25, opcodeName, [
        register("temp", 2, { mask: "xyzw" }),
        ...sources
    ]), saturate });
    if (extraUse)
    {
        instructions.push(
            instruction(30, "mov", [ register("output", 0, { mask: "x" }), register("temp", 2, { selected: "x" }) ]),
            instruction(34, "mov", [ register("output", 0, { mask: "y" }), register("temp", 0, { selected: "w" }) ]),
            instruction(38, "mov", [ register("output", 0, { mask: "zw" }), register("temp", 2, { swizzle: "xyzw" }) ])
        );
    }
    else
    {
        instructions.push(instruction(30, "mov", [
            register("output", 0, { mask: "xyzw" }),
            register("temp", 2, { swizzle: "xyzw" })
        ]));
    }
    instructions.push(instruction(42, "ret", []));
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 1 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 15) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions
    };
}

test("fragment lowering accepts declaration-backed fixed indexable-temp locals", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            indexableTempDeclaration(2, 0, 1),
            instruction(4, "mov", [
                indexableTempOperand(0, 0, { mask: "xy" }),
                register("input", 0, { swizzle: "xyxx" })
            ]),
            instruction(8, "add", [
                indexableTempOperand(0, 0, { mask: "x" }),
                indexableTempOperand(0, 0, { selected: "x" }),
                immediate([ 0x3f800000 ])
            ]),
            instruction(12, "mov", [
                register("output", 0, { mask: "xy" }),
                indexableTempOperand(0, 0, { swizzle: "xyxx" })
            ]),
            instruction(16, "mov", [
                register("output", 0, { mask: "zw" }),
                immediate([ 0, 0, 0, 0x3f800000 ])
            ]),
            instruction(20, "ret", [])
        ]
    };
    const ir = CjsWebgpuFormat.buildShaderIr(program, { source: "synthetic-fragment-fixed-indexable" });
    const shader = CjsWebgpuFormat.buildWgsl(ir);
    assert.doesNotMatch(shader.code, /\bxt0\b/u);
    assert.match(shader.code, /output\.output0\.xy = vec2<f32>\(value\d+, value\d+\.y\);/u);

    const sourceMismatch = structuredClone(ir);
    sourceMismatch.instructions.find((entry) => entry.opcodeName === "add").operands[1].selected = "y";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(sourceMismatch), /fixed source has inconsistent register dataflow/u);
});

test("BuildWgsl emits the bounded fragment interface, bindings, and positional sample lanes", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(fragmentFixture(), { source: "synthetic-copyblit-ps" });

    assert.equal(shader.stage, "fragment");
    assert.match(shader.code, /@location\(1\) input1: vec2<f32>/);
    assert.doesNotMatch(shader.code, /SV_Position|input0/);
    assert.match(shader.code, /@binding\(0\) var<uniform> cb0: array<vec4<f32>, 3>/);
    assert.match(shader.code, /@binding\(1\) var t0: texture_2d<f32>/);
    assert.match(shader.code, /@binding\(2\) var s0: sampler/);
    assert.match(shader.code, /textureSample\(t0, s0, vec2<f32>\([^\n]+\)\)\.xy/);
    assert.doesNotMatch(shader.code, /textureSample\([^\n]+\)\.zx/);
    assert.match(shader.code, /dot\(vec2<f32>\([^\n]+\), vec2<f32>\([^\n]+\)\)/);
    assert.match(shader.code, /bitcast<f32>\(0x3f800000u\)/);
    assert.equal(shader.program.bindings[0].buffer.minBindingSize, 48);
    assert.equal(shader.sourceMap.some((entry) => entry.dxbcOffset === 38), false);

    const offsetProgram = fragmentFixture();
    offsetProgram.instructions.find((entry) => entry.offset === 39).extensions = [ {
        typeName: "sample_controls",
        sampleOffsets: { u: -2, v: 2, w: 0 }
    } ];
    const offsetShader = CjsWebgpuFormat.buildWgsl(offsetProgram, { source: "synthetic-copyblit-offset-ps" });
    assert.match(offsetShader.code,
        /textureSample\(t0, s0, vec2<f32>\([^\n]+, vec2<i32>\(-2, 2\)\);/u);
});

test("fragment lowering emits a parameterless entry point when declared inputs are dead", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(inputlessFragmentFixture(), { source: "synthetic-inputless-ps" });

    assert.deepEqual(shader.program.interface.inputs, []);
    assert.equal(shader.code, [
        "struct FragmentOutput",
        "{",
        "    @location(0) output0: vec4<f32>,",
        "};",
        "",
        "@fragment",
        "fn main() -> FragmentOutput",
        "{",
        "    var output: FragmentOutput;",
        "    output.output0 = vec4<f32>(bitcast<f32>(0x3f800000u), bitcast<f32>(0x00000000u), bitcast<f32>(0x3f000000u), bitcast<f32>(0x3f800000u));",
        "    return output;",
        "}",
        ""
    ].join("\n"));
    assert.deepEqual(shader.sourceMap.map(({ line, dxbcOffset }) => ({ line, dxbcOffset })), [
        { line: 10, dxbcOffset: 5 },
        { line: 11, dxbcOffset: 10 }
    ]);

    const noDeclaredInput = inputlessFragmentFixture();
    noDeclaredInput.signatures.input = [];
    noDeclaredInput.instructions.splice(
        noDeclaredInput.instructions.findIndex((entry) => entry.opcodeName === "dcl_input_ps"),
        1
    );
    assert.equal(CjsWebgpuFormat.buildWgsl(noDeclaredInput).code, shader.code);

    const missingOutput = inputlessFragmentFixture();
    missingOutput.signatures.output = [];
    assert.throws(() => CjsWebgpuFormat.buildWgsl(missingOutput), /requires output signatures/i);
});

test("fragment lowering maps DXBC frc and round_ni to component-wise WGSL rounding", () =>
{
    const dx11 = CjsWebgpuFormat.buildWgsl(roundingFragmentFixture(0));
    const dx12 = CjsWebgpuFormat.buildWgsl(roundingFragmentFixture(1));

    assert.equal(dx12.code, dx11.code);
    assert.match(dx11.code, /output\.output0\.xy = fract\(vec2<f32>\(/);
    assert.match(dx11.code, /output\.output0\.zw = floor\(vec2<f32>\(/);
    assert.deepEqual(dx11.sourceMap.map(({ line, dxbcOffset }) => ({ line, dxbcOffset })), [
        { line: 10, dxbcOffset: 2 },
        { line: 11, dxbcOffset: 6 },
        { line: 12, dxbcOffset: 10 }
    ]);
});

test("fragment lowering preserves signed comparison-mask iadd before numeric itof conversion", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(integerDiscardFragmentFixture());

    assert.match(shader.code, /let (value\d+): i32 = \(-\(bitcast<i32>\(value\d+\)\) \+ bitcast<i32>\(value\d+\)\);/);
    const integerValue = /let (value\d+): i32/.exec(shader.code)?.[1];
    assert(integerValue);
    assert.match(shader.code, new RegExp(`let value\\d+: f32 = f32\\(${integerValue}\\);`));
});

test("fragment lowering materializes full result bitcasts and rejects partial records", () =>
{
    const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(integerDiscardFragmentFixture()));
    const iadd = ir.instructions.find((entry) => entry.opcodeName === "iadd");
    const itof = ir.instructions.find((entry) => entry.opcodeName === "itof");
    const write = iadd.dataflow.writes[0];
    const component = write.mask;
    const value = ir.values.find((entry) => entry.id === write.valueId);
    const read = itof.dataflow.reads.find((entry) => entry.operandIndex === 1);
    value.componentTypes[component] = "bitpattern32";
    iadd.typeInfo.bitcasts.push({
        kind: "result-bitcast",
        operandIndex: write.operandIndex,
        valueId: write.valueId,
        component,
        from: "int32",
        to: "bitpattern32"
    });
    itof.typeInfo.bitcasts.push({
        kind: "read-bitcast",
        operandIndex: 1,
        componentIndex: 0,
        valueId: read.refs[0].valueId,
        component: read.refs[0].component,
        from: "bitpattern32",
        to: "int32"
    });

    const shader = CjsWebgpuFormat.buildWgsl(ir);
    assert.match(shader.code, new RegExp(`let ${write.valueId}: u32 = bitcast<u32>\\(`, "u"));
    assert.match(shader.code, new RegExp(`f32\\(bitcast<i32>\\(${write.valueId}\\)\\)`, "u"));

    const partial = structuredClone(ir);
    partial.instructions.find((entry) => entry.opcodeName === "iadd").typeInfo.bitcasts
        .find((entry) => entry.kind === "result-bitcast").component = "x";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(partial), /inconsistent register bitcast metadata/u);

    for (const mutate of [
        (record) => { record.from = "uint32"; },
        (record) => { record.to = "float32"; }
    ])
    {
        const malformed = structuredClone(ir);
        mutate(malformed.instructions.find((entry) => entry.opcodeName === "iadd").typeInfo.bitcasts
            .find((entry) => entry.kind === "result-bitcast"));
        assert.throws(() => CjsWebgpuFormat.buildWgsl(malformed), /inconsistent register bitcast metadata/u);
    }

    const missingRead = structuredClone(ir);
    const readCasts = missingRead.instructions.find((entry) => entry.opcodeName === "itof").typeInfo.bitcasts;
    readCasts.splice(readCasts.findIndex((entry) => entry.kind === "read-bitcast"), 1);
    assert.throws(() => CjsWebgpuFormat.buildWgsl(missingRead), /inconsistent register bitcast metadata/u);
});

test("fragment lowering reinterprets float-backed cbuffer lanes for integer consumers", () =>
{
    const decoded = integerDiscardFragmentFixture();
    decoded.instructions.unshift(declaration(1, "dcl_constant_buffer", "constant_buffer", {
        accessPattern: "immediate_indexed",
        sizeInVec4: 1
    }));
    const cb = register("constant_buffer", 0, { selected: "x" });
    cb.indices = [
        { values: [ 0 ], relative: null },
        { values: [ 0 ], relative: null }
    ];
    decoded.instructions.find((entry) => entry.opcodeName === "iadd").operands[2] = structuredClone(cb);
    decoded.instructions.find((entry) => entry.opcodeName === "itof").operands[1] = structuredClone(cb);
    decoded.instructions.find((entry) => entry.opcodeName === "discard").operands[0] = structuredClone(cb);

    const shader = CjsWebgpuFormat.buildWgsl(decoded);
    assert.match(shader.code, /\+ bitcast<i32>\(cb0\[0\]\.x\)/u);
    assert.match(shader.code, /f32\(bitcast<i32>\(cb0\[0\]\.x\)\)/u);
    assert.match(shader.code, /if \(bitcast<u32>\(cb0\[0\]\.x\) != 0u\)/u);
});

test("fragment lowering reconciles inferred bitpatterns with physical interface types", () =>
{
    const input = CjsWebgpuFormat.buildWgsl(bitpatternInputFragmentFixture());
    const output = CjsWebgpuFormat.buildWgsl(bitpatternOutputFragmentFixture());

    assert.match(input.code, /let value\d+: u32 = bitcast<u32>\(input\.input0\);/u);
    assert.match(output.code, /output\.output0\.x = bitcast<f32>\(select\(0u, 0xffffffffu,/u);
});

test("fragment lowering materializes float and bitpattern output values before later reads", () =>
{
    const floatShader = CjsWebgpuFormat.buildWgsl(outputReadFragmentFixture(false));
    const bitpatternShader = CjsWebgpuFormat.buildWgsl(outputReadFragmentFixture(true));

    const floatValue = /let (value\d+): f32 = input\.input0\.x;/u.exec(floatShader.code)?.[1];
    assert(floatValue);
    assert.match(floatShader.code, new RegExp(`output\\.output0\\.x = ${floatValue};`, "u"));
    assert.match(floatShader.code, new RegExp(`output\\.output0\\.y = \\(${floatValue} \\+ input\\.input0\\.y\\);`, "u"));

    const bitValue = /let (value\d+): u32 = select\(0u, 0xffffffffu,/u.exec(bitpatternShader.code)?.[1];
    assert(bitValue);
    assert.match(bitpatternShader.code, new RegExp(`output\\.output0\\.x = bitcast<f32>\\(${bitValue}\\);`, "u"));
    assert.match(bitpatternShader.code, new RegExp(`bitcast<f32>\\(${bitValue}\\) \\+ input\\.input0\\.y`, "u"));
});

test("fragment dot products consume exact lanes and replicate selected scalar sources", () =>
{
    const vector = CjsWebgpuFormat.buildWgsl(threeLaneDotFragmentFixture(false));
    const selected = CjsWebgpuFormat.buildWgsl(threeLaneDotFragmentFixture(true));

    assert.match(vector.code, /dot\(vec3<f32>\(value\d+\.x, value\d+\.y, value\d+\.z\),/u);
    assert.match(selected.code, /dot\(vec3<f32>\(value\d+\.x, value\d+\.x, value\d+\.x\),/u);
    assert.doesNotMatch(vector.code, /\.w/u);
});

test("fragment lowering maps direct and explicit tested discards with owned source locations", () =>
{
    const direct = CjsWebgpuFormat.buildWgsl(integerDiscardFragmentFixture(0));
    const explicit = CjsWebgpuFormat.buildWgsl(integerDiscardFragmentFixture(1, { explicitFlow: true }));

    assert.match(direct.code, /if \(value\d+ != 0u\)\n    \{\n        discard;\n    \}/);
    assert.match(explicit.code, /if \(value\d+ != 0u\)\n    \{\n        if \(0xffffffffu != 0u\)\n        \{\n            discard;\n        \}\n    \}/);

    const directDiscardMap = direct.sourceMap.filter((entry) => entry.dxbcOffset === 25);
    const explicitDiscardMap = explicit.sourceMap.filter((entry) => entry.dxbcOffset === 28);
    assert.equal(directDiscardMap.length, 1);
    assert.equal(explicitDiscardMap.length, 1);
    assert.match(direct.code.split("\n")[directDiscardMap[0].line - 1], /if \(value\d+ != 0u\)/);
    assert.match(explicit.code.split("\n")[explicitDiscardMap[0].line - 1], /if \(0xffffffffu != 0u\)/);
});

test("fragment lowering preserves discard_z zero projection", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(integerDiscardFragmentFixture(0, { projection: "zero" }));
    assert.match(shader.code, /if \(value\d+ == 0u\)\n    \{\n        discard;\n    \}/);
});

test("fragment lowering rejects malformed tested-discard metadata", () =>
{
    const cases = [
        (discard) => { discard.testBoolean = null; },
        (discard) => { discard.testBoolean = "either"; },
        (discard) => { discard.operands[0].modifierName = "neg"; },
        (discard) => { discard.saturate = true; },
        (discard) => { discard.operands[0] = immediate([ 0, 1 ]); }
    ];
    for (const mutate of cases)
    {
        const decoded = integerDiscardFragmentFixture();
        mutate(decoded.instructions.find((entry) => entry.opcodeName === "discard"));
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(decoded),
            /discard instruction \d+ (has no supported condition projection|cannot modify|cannot saturate|requires one scalar condition)/u
        );
    }
});

test("fragment lowering maps a live SV_Position input to the WebGPU position builtin", () =>
{
    const decoded = fragmentFixture();
    // Make SV_Position (input0) live through a top-level read rather than the
    // branch condition, so the sample inside the branch stays in uniform
    // control flow while SV_Position still maps to the position builtin.
    decoded.instructions.find((entry) => entry.offset === 44).operands[1] = register("input", 0, { swizzle: "xyxx" });
    const shader = CjsWebgpuFormat.buildWgsl(decoded);

    assert.match(shader.code, /@builtin\(position\) position: vec4<f32>/);
    assert.match(shader.code, /input\.position\.x/);
    assert.doesNotMatch(shader.code, /@location\(0\) input0/);
});

test("fragment lowering emits an explicit texture bias for sample_b", () =>
{
    const decoded = fragmentFixture();
    const sample = decoded.instructions.find((entry) => entry.offset === 18);
    sample.opcodeName = "sample_b";
    sample.operands.push(immediate([ 0x3dcccccd ]));
    sample.extensions = [ {
        typeName: "sample_controls",
        sampleOffsets: { u: 2, v: -2, w: 0 }
    } ];
    const shader = CjsWebgpuFormat.buildWgsl(decoded);

    assert.match(shader.code,
        /textureSampleBias\(t0, s0, vec2<f32>\([^\n]+, bitcast<f32>\(0x3dcccccdu\), vec2<i32>\(2, -2\)\)\.xy/u);
});

test("fragment fixed-width cbuffer sources use intrinsic lanes instead of destination lanes", () =>
{
    const decoded = fragmentFixture();
    const sample = decoded.instructions.find((entry) => entry.offset === 18);
    const coordinates = register("constant_buffer", 0, { swizzle: "xyzw" });
    coordinates.indices = [
        { values: [ 0 ], relative: null },
        { values: [ 0 ], relative: null }
    ];
    sample.operands[1] = coordinates;

    const shader = CjsWebgpuFormat.buildWgsl(decoded);
    assert.match(shader.code, /textureSample\(t0, s0, vec2<f32>\(cb0\[0\]\.x, cb0\[0\]\.y\)\)/u);
    assert.doesNotMatch(shader.code, /textureSample\(t0, s0, vec2<f32>\(cb0\[0\]\.y, cb0\[0\]\.z\)\)/u);
});

test("fragment lowering clamps saturated float results componentwise", () =>
{
    const decoded = fragmentFixture();
    decoded.instructions.find((entry) => entry.offset === 18).saturate = true;
    const shader = CjsWebgpuFormat.buildWgsl(decoded);

    assert.match(shader.code, /clamp\(textureSample\([^\n]+\)\.xy, vec2<f32>\(0\.0\), vec2<f32>\(1\.0\)\)/);
});

test("fragment lowering preserves absolute and negated-absolute source modifiers", () =>
{
    const decoded = fragmentFixture();
    decoded.instructions.find((entry) => entry.offset === 23).operands[1].modifierName = "absneg";
    const shader = CjsWebgpuFormat.buildWgsl(decoded);

    assert.match(shader.code, /dot\(vec2<f32>\(-\(abs\([^\n]+\)\), -\(abs\([^\n]+\)\)\)/);
});

test("fragment lowering rejects float-only absolute modifiers on integer consumers", () =>
{
    const signedNegate = integerDiscardFragmentFixture();
    assert.match(CjsWebgpuFormat.buildWgsl(signedNegate).code, /-\(bitcast<i32>/u);

    for (const modifierName of [ "abs", "absneg" ])
    {
        const malformed = integerDiscardFragmentFixture();
        malformed.instructions.find((entry) => entry.opcodeName === "iadd").operands[1].modifierName = modifierName;
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(malformed),
            new RegExp(`unsupported ${modifierName} modifier for int32`, "u")
        );
    }

    const rawMover = bitpatternInputFragmentFixture();
    rawMover.instructions.find((entry) => entry.offset === 5).operands[1].modifierName = "absneg";
    assert.match(CjsWebgpuFormat.buildWgsl(rawMover).code, /\| 0x80000000u/u);
});

test("fragment sampled handles require fixed unmodified default-precision identities", () =>
{
    const base = CjsWebgpuFormat.buildShaderIr(fragmentFixture());
    const sampleAt = (ir) => ir.instructions.find((entry) => entry.dxbcOffset === 39);
    const malformed = [
        [ (operand) => { operand.minPrecisionName = "float_16"; }, /default-precision resource handle/u ],
        [ (operand) => { operand.modifierName = "neg"; }, /unmodified.*resource handle/u ],
        [ (operand) => { operand.indices[0].relative = {}; }, /fixed.*resource handle/u ],
        [ (operand) => { operand.resourceReference = { absoluteIndex: { values: [ 0 ], relative: {} } }; },
            /fixed.*resource handle/u ],
        [ (operand) => { operand.typeName = "temp"; }, /resource handle/u ]
    ];
    for (const [ mutate, pattern ] of malformed)
    {
        const ir = structuredClone(base);
        mutate(sampleAt(ir).operands[2]);
        assert.throws(() => CjsWebgpuFormat.buildWgsl(ir), pattern);
    }

    const samplerPrecision = structuredClone(base);
    sampleAt(samplerPrecision).operands[3].minPrecisionName = "float_16";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(samplerPrecision), /default-precision sampler handle/u);

    const rangeMismatch = structuredClone(base);
    sampleAt(rangeMismatch).operands[2].resourceReference = {
        absoluteIndex: { values: [ 1 ], relative: null }
    };
    assert.throws(() => CjsWebgpuFormat.buildWgsl(rangeMismatch), /out-of-range fixed handle identity/u);

    const swizzled = structuredClone(base);
    sampleAt(swizzled).operands[2].swizzle = "wzyx";
    assert.match(CjsWebgpuFormat.buildWgsl(swizzled).code, /textureSample\([^\n]+\)\.wzyx/u);
});

test("fragment lowering checks output coverage on each return path", () =>
{
    const decoded = fragmentFixture();
    decoded.instructions.find((entry) => entry.offset === 33).operands[0].mask = "z";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(decoded), /leaves w unwritten before return/i);
});

test("fragment lowering emits the derivative-uniformity opt-out for implicit-LOD sampling under a non-uniform branch", () =>
{
    // Gating the branch on an interpolated input makes the control flow
    // non-uniform, where WGSL forbids implicit-LOD sampling by default. The
    // module reproduces D3D11's permissive behavior with the standard opt-out.
    const uniform = fragmentFixture();
    assert.doesNotMatch(CjsWebgpuFormat.buildWgsl(uniform).code, /diagnostic\(off, derivative_uniformity\)/);

    const nonUniform = fragmentFixture();
    nonUniform.instructions.find((entry) => entry.offset === 12).operands[1] = register("input", 1, { selected: "x" });
    const code = CjsWebgpuFormat.buildWgsl(nonUniform).code;
    assert.match(code, /^diagnostic\(off, derivative_uniformity\);/m);
    assert.match(code, /textureSample\(/);
});

test("fragment lowering opts out for derivatives under a non-uniform branch but keeps them clean under a uniform one", () =>
{
    // Uniform (immediate-gated) branch: a derivative inside is legal, no opt-out.
    const uniform = fragmentFixture();
    const uniformSample = uniform.instructions.find((entry) => entry.offset === 18);
    uniformSample.opcodeName = "deriv_rtx";
    uniformSample.operands = [ register("temp", 1, { mask: "yz" }), register("input", 1, { swizzle: "xyxx" }) ];
    const uniformCode = CjsWebgpuFormat.buildWgsl(uniform).code;
    assert.match(uniformCode, /dpdx\(/);
    assert.doesNotMatch(uniformCode, /diagnostic\(off, derivative_uniformity\)/);

    // Non-uniform (input-gated) branch: the same derivative triggers the opt-out.
    const nonUniform = fragmentFixture();
    nonUniform.instructions.find((entry) => entry.offset === 12).operands[1] = register("input", 1, { selected: "x" });
    const nonUniformSample = nonUniform.instructions.find((entry) => entry.offset === 18);
    nonUniformSample.opcodeName = "deriv_rtx";
    nonUniformSample.operands = [ register("temp", 1, { mask: "yz" }), register("input", 1, { swizzle: "xyxx" }) ];
    const code = CjsWebgpuFormat.buildWgsl(nonUniform).code;
    assert.match(code, /^diagnostic\(off, derivative_uniformity\);/m);
    assert.match(code, /dpdx\(/);
});

test("fragment lowering rejects live undefined reads and accepts bounded SM5.1 control metadata", () =>
{
    const undefinedRead = fragmentFixture();
    undefinedRead.instructions.find((entry) => entry.offset === 12).operands[1] = register("temp", 9, { selected: "x" });
    assert.throws(() => CjsWebgpuFormat.buildWgsl(undefinedRead), /reads undefined temp\[9\]\.x/i);

    const dx12 = fragmentFixture(1);
    dx12.instructions.find((entry) => entry.offset === 16).testBoolean = "zero";
    const cbDeclaration = dx12.instructions.find((entry) => entry.opcodeName === "dcl_constant_buffer").declaration;
    cbDeclaration.registerIndex = 2;
    cbDeclaration.bindingRange = {
        bindingModel: "sm5.1-range",
        rangeId: 3,
        lowerBound: 2,
        upperBound: 2,
        unbounded: false,
        registerCount: 1,
        registerSpace: 0
    };
    const cb = register("constant_buffer", 3, { swizzle: "xyzw" });
    cb.resourceReference = { bindingModel: "sm5.1-range", rangeId: 3 };
    cb.indices = [
        { values: [ 0 ], relative: null },
        { values: [ 0 ], relative: null },
        { values: [ 2 ], relative: null }
    ];
    dx12.instructions.find((entry) => entry.offset === 33).operands[1] = cb;
    const shader = CjsWebgpuFormat.buildWgsl(dx12);
    assert.match(shader.code, /if \([^\n]+ == 0u\)/);
    assert.match(shader.code, /cb2\[2\]/);
});

test("SM5.1 scalar merge lowering emits one mutable phi without synthetic source mappings", () =>
{
    const ir = CjsWebgpuFormat.buildShaderIr(scalarMergeFixture());
    const merge = ir.values.find((value) => value.origin === "control-flow-merge");
    const shader = CjsWebgpuFormat.buildWgsl(ir);

    assert(merge);
    assert.match(shader.code, new RegExp(`var ${merge.id}: f32 = value\\d+(?:\\.[xyzw])?;`));
    assert.match(shader.code, new RegExp(`${merge.id} = value\\d+(?:\\.[xyzw])?;`));
    assert.equal(shader.sourceMap.some((entry) => entry.instructionIndex === null), false);
    assert.equal(shader.sourceMap.some((entry) => entry.dxbcOffset === 20), false);
});

test("SM5.1 scalar merge resolves an inherited incoming edge by elimination", () =>
{
    const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(scalarMergeFixture()));
    const merge = ir.values.find((value) => value.origin === "control-flow-merge");
    assert(merge);
    // Simulate an arm tail that inherits the register: the phi records the
    // upstream definition block rather than the arm-tail predecessor, so one
    // incoming no longer matches its arm's blockId directly. With the other arm
    // matching, the remaining incoming must belong to it by elimination, and the
    // (unchanged) value id still yields correct output.
    const trueIncoming = merge.incoming.find((incoming) => incoming.valueId !== merge.incoming[0].valueId)
        || merge.incoming[1];
    trueIncoming.blockId = "block-inherited";
    const shader = CjsWebgpuFormat.buildWgsl(ir);
    assert.match(shader.code, new RegExp(`var ${merge.id}: f32 = value\\d+(?:\\.[xyzw])?;`));
    assert.match(shader.code, new RegExp(`${merge.id} = value\\d+(?:\\.[xyzw])?;`));
});

const mergeCorruptions = [
    [ "cycles", (ir, merge) => { merge.incoming[0].valueId = merge.id; }, /merge graph contains a cycle/i ],
    [ "unresolved types", (ir, merge) => { merge.componentTypes[merge.writeMask] = "unknown"; }, /not a scalar float predecessor phi/i ],
    [ "unknown predecessor edges", (ir, merge) => { merge.incoming[0].blockId = "block999"; merge.incoming[1].blockId = "block998"; }, /unsupported incoming edges/i ],
    [ "false-edge dominance violations", (ir, merge) => { merge.incoming[0].valueId = merge.incoming[1].valueId; }, /false input does not dominate/i ],
    [ "observable undefined carriers", (ir, merge) => {
        const exemplar = ir.values.find((value) => value.origin === "undefined-register");
        assert(exemplar);
        const undefinedValue = {
            ...structuredClone(exemplar),
            id: `value${ir.values.length}`,
            register: merge.register,
            writeMask: merge.writeMask,
            componentTypes: { ...merge.componentTypes }
        };
        ir.values.push(undefinedValue);
        merge.incoming[0].valueId = undefinedValue.id;
    }, /observable undefined/i ]
];

for (const [ name, mutate, pattern ] of mergeCorruptions)
{
    test(`SM5.1 scalar merge validation rejects ${name}`, () =>
    {
        const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(scalarMergeFixture()));
        const merge = ir.values.find((value) => value.origin === "control-flow-merge");
        assert(merge);
        mutate(ir, merge);
        assert.throws(() => CjsWebgpuFormat.buildWgsl(ir), pattern);
    });
}

test("SM5.1 undefined carriers require a correlated complementary overwrite", () =>
{
    const complementary = CjsWebgpuFormat.buildWgsl(undefinedMergeChainFixture("zero"));
    assert.match(complementary.code, /var value\d+: f32 = 0\.0;/);
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(undefinedMergeChainFixture("nonzero")),
        /observable undefined path/i
    );
});

test("SM5.1 undefined-path correlation distinguishes components of one condition value", () =>
{
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(undefinedMergeChainFixture("zero", "y")),
        /observable undefined path/i
    );
});

test("SM5.1 undefined carriers are safe only under a lane-matched zero AND mask", () =>
{
    const cases = [
        { carrierOperand: 2, carrierSwizzle: "wxyz", undefinedLane: 0 },
        { carrierOperand: 1, carrierSwizzle: "xyzw", undefinedLane: 3 }
    ];
    for (const options of cases)
    {
        const decoded = undefinedAndMaskFixture(options);
        const ir = CjsWebgpuFormat.buildShaderIr(decoded);
        const andInstruction = ir.instructions.find((entry) => entry.opcodeName === "and");
        const ifInstruction = ir.instructions.find((entry) => entry.opcodeName === "if");
        const carrierRead = andInstruction.dataflow.reads.find((entry) => entry.operandIndex === options.carrierOperand);
        const conditionRead = andInstruction.dataflow.reads.find((entry) => entry.operandIndex !== options.carrierOperand);
        const ifRef = ifInstruction.dataflow.reads[0].refs[0];
        const mergeRef = carrierRead.refs[options.undefinedLane];
        const merge = ir.values.find((entry) => entry.id === mergeRef.valueId);

        assert.deepEqual(carrierRead.refs.map((ref) => ref.component), Array.from(options.carrierSwizzle));
        assert.deepEqual(conditionRead.refs.map((ref) => ref.component), [ "x", "x", "x", "x" ]);
        assert.equal(merge.origin, "control-flow-merge");
        assert.equal(merge.register, "temp[0]");
        assert.equal(merge.writeMask, "w");
        assert.equal(conditionRead.refs[options.undefinedLane].valueId, ifRef.valueId);
        assert.equal(conditionRead.refs[options.undefinedLane].component, ifRef.component);
        assert.match(CjsWebgpuFormat.buildWgsl(ir).code, / & /u);
    }
});

test("SM5.1 undefined AND masking rejects wrong operations and correlations", () =>
{
    const unsafe = [
        { opcodeName: "or" },
        { opcodeName: "xor" },
        { opcodeName: "mul" },
        { conditionSwizzle: "yyyy" },
        { maskSource: "different" },
        { maskSource: "derived" },
        { maskSource: "overwritten" }
    ];
    for (const options of unsafe)
    {
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(undefinedAndMaskFixture(options)),
            /observable undefined path/i
        );
    }
});

test("SM5.1 undefined AND masking remains per-use and fail-closed on malformed sources", () =>
{
    const unsafe = [
        { testBoolean: "zero" },
        { extraUse: true },
        { sourceModifier: "neg" },
        { sourceMinPrecision: "float_16" },
        { carrierOperand: 1, sourceModifier: "neg" },
        { carrierOperand: 1, sourceMinPrecision: "float_16" },
        { saturate: true }
    ];
    for (const options of unsafe)
    {
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(undefinedAndMaskFixture(options)),
            /observable undefined path/i
        );
    }

    const malformed = structuredClone(CjsWebgpuFormat.buildShaderIr(undefinedAndMaskFixture()));
    const andInstruction = malformed.instructions.find((entry) => entry.opcodeName === "and");
    andInstruction.dataflow.reads.push(structuredClone(
        andInstruction.dataflow.reads.find((entry) => entry.operandIndex === 1)
    ));
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(malformed),
        /observable undefined path/i
    );

    const indexUse = structuredClone(CjsWebgpuFormat.buildShaderIr(undefinedAndMaskFixture()));
    const indexAnd = indexUse.instructions.find((entry) => entry.opcodeName === "and");
    indexAnd.dataflow.reads.find((entry) => entry.operandIndex === 2).kind = "index-read";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(indexUse),
        /observable undefined path/i
    );

    const cbOperand = register("constant_buffer", 3, { swizzle: "xyzw" });
    cbOperand.indices = [
        { values: [ 3 ], relative: null },
        { values: [ 0 ], relative: register("temp", 0, { selected: "x" }) }
    ];
    const undefinedIndex = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_constant_buffer", isDeclaration: true,
                declaration: { registerIndex: 3, accessPattern: "dynamic_indexed", sizeInVec4: 4 },
                operands: [ register("constant_buffer", 3) ]
            },
            {
                offset: 6, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(9, "lt", [
                register("temp", 1, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            { ...instruction(13, "if", [ register("temp", 1, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(16, "ftou", [
                register("temp", 0, { mask: "x" }),
                register("input", 0, { selected: "x" })
            ]),
            instruction(20, "endif", []),
            instruction(21, "mov", [ register("output", 0, { mask: "xyzw" }), cbOperand ]),
            instruction(25, "ret", [])
        ]
    };
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(undefinedIndex),
        /observable undefined path/i
    );
});

test("fragment lowering emits a dynamic constant-buffer index", () =>
{
    const uintIndex = {
        semanticName: "TEXCOORD", semanticIndex: 0, systemValueType: 0,
        componentType: 1, componentTypeName: "uint32", registerIndex: 1,
        mask: 1, readWriteMask: 1, stream: 0, minPrecision: 0
    };
    const cbOperand = register("constant_buffer", 3, { swizzle: "xyzw" });
    cbOperand.indices = [
        { values: [ 3 ], relative: null },
        { values: [ 35 ], relative: register("input", 1, { selected: "x" }) }
    ];
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ uintIndex ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_constant_buffer", isDeclaration: true,
                declaration: { registerIndex: 3, accessPattern: "dynamic_indexed", sizeInVec4: 64 },
                operands: [ register("constant_buffer", 3) ]
            },
            {
                offset: 6, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(9, "mov", [ register("output", 0, { mask: "xyzw" }), cbOperand ]),
            instruction(13, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-dynamic-cb" });
    assert.match(shader.code, /cb3\[35 \+ i32\(input\.input1\)\]\.x/u);
});

test("fragment lowering emits both sincos destinations and min", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 1) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(4, "sincos", [
                register("temp", 2, { mask: "x" }),
                register("temp", 3, { mask: "x" }),
                register("input", 1, { selected: "x" })
            ]),
            instruction(8, "min", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 2, { swizzle: "xxxx" }),
                register("temp", 3, { swizzle: "xxxx" })
            ]),
            instruction(12, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-sincos" });
    assert.match(shader.code, /sin\(/u);
    assert.match(shader.code, /cos\(/u);
    assert.match(shader.code, /min\(/u);
});

test("fragment sincos excludes a null destination from active source lanes", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 15) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(4, "sincos", [
                register("null", null),
                register("temp", 0, { mask: "yw" }),
                register("input", 1, { swizzle: "xyzw" })
            ]),
            instruction(8, "mov", [
                register("output", 0, { mask: "xy" }),
                register("temp", 0, { swizzle: "ywww" })
            ]),
            instruction(12, "mov", [
                register("output", 0, { mask: "zw" }),
                immediate([ 0, 0, 0, 0 ])
            ]),
            instruction(16, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-sincos-null-lanes" });
    assert.match(shader.code, /cos\(vec2<f32>\(input\.input1\.y, input\.input1\.w\)\)/u);
    assert.doesNotMatch(shader.code, /sin\(/u);
});

function fragmentRcpProgram(sourceOperand, { mask = "xyzw", saturate = false } = {})
{
    const rcp = instruction(4, "rcp", [ register("output", 0, { mask }), sourceOperand ]);
    rcp.saturate = saturate;
    const missing = Array.from("xyzw").filter((component) => !mask.includes(component)).join("");
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 1, 15) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            rcp,
            ...(missing
                ? [ instruction(8, "mov", [ register("output", 0, { mask: missing }), immediate([ 0 ]) ]) ]
                : []),
            instruction(12, "ret", [])
        ]
    };
}

test("fragment rcp lowers dynamic values with modifiers before result saturation", () =>
{
    const source = register("input", 1, { selected: "x", modifierName: "absneg" });
    const shader = CjsWebgpuFormat.buildWgsl(fragmentRcpProgram(source, { saturate: true }), {
        source: "synthetic-fragment-rcp-dynamic"
    });
    const expression = shader.program.statements.find((entry) => entry.dxbcOffset === 4)?.expression.code;
    assert.equal(expression,
        "clamp((vec4<f32>(1.0) / vec4<f32>(-(abs(input.input1.x)), -(abs(input.input1.x)), -(abs(input.input1.x)), -(abs(input.input1.x)))), vec4<f32>(0.0), vec4<f32>(1.0))");
});

test("fragment rcp validates only consumed immediate lanes", () =>
{
    const source = immediate([ 0x00000000, 0x00800000, 0x7f800000, 0x7f7fffff ]);
    source.swizzle = "yxwx";
    const shader = CjsWebgpuFormat.buildWgsl(fragmentRcpProgram(source, { mask: "xz" }), {
        source: "synthetic-fragment-rcp-consumed-lanes"
    });
    const expression = shader.program.statements.find((entry) => entry.dxbcOffset === 4)?.expression.code;
    assert.equal(expression,
        "(vec2<f32>(1.0) / vec2<f32>(bitcast<f32>(0x00800000u), bitcast<f32>(0x7f7fffffu)))");

    const replicated = CjsWebgpuFormat.buildWgsl(
        fragmentRcpProgram(immediate([ 0x3f000000 ]), { mask: "xyz" })
    );
    const replicatedExpression = replicated.program.statements
        .find((entry) => entry.dxbcOffset === 4)?.expression.code;
    assert.equal(replicatedExpression,
        "(vec3<f32>(1.0) / vec3<f32>(bitcast<f32>(0x3f000000u), bitcast<f32>(0x3f000000u), bitcast<f32>(0x3f000000u)))");

    const invalid = immediate([ 0x00000000, 0x00800000, 0x7f800000, 0x7f7fffff ]);
    invalid.swizzle = "xywx";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(fragmentRcpProgram(invalid, { mask: "xz" })),
        /rcp instruction \d+ requires finite normal immediate source lanes/u
    );
});

test("fragment rcp rejects non-portable immediate exponent classes", () =>
{
    for (const bits of [
        0x00000000, 0x80000000, 0x00000001, 0x807fffff,
        0x7f800000, 0xff800000, 0x7fc00000, 0xff800001
    ])
    {
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(fragmentRcpProgram(immediate([ bits ]))),
            /rcp instruction \d+ requires finite normal immediate source lanes/u
        );
    }

    const modified = immediate([ 0x7fc00000 ]);
    modified.modifierName = "absneg";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(fragmentRcpProgram(modified, { saturate: true })),
        /rcp instruction \d+ requires finite normal immediate source lanes/u
    );
});

test("fragment rcp accepts positive and negative finite normal boundaries", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(fragmentRcpProgram(
        immediate([ 0x00800000, 0x7f7fffff, 0x80800000, 0xff7fffff ])
    ));
    const expression = shader.program.statements.find((entry) => entry.dxbcOffset === 4)?.expression.code;
    for (const bits of [ "0x00800000u", "0x7f7fffffu", "0x80800000u", "0xff7fffffu" ])
    {
        assert.match(expression, new RegExp(bits, "u"));
    }
});

function udivProgram(quotientOperand, divisorOperand)
{
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 1) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(4, "ftou", [
                register("temp", 1, { mask: "x" }),
                register("input", 1, { selected: "x" })
            ]),
            instruction(8, "udiv", [
                quotientOperand,
                register("temp", 3, { mask: "x" }),
                register("temp", 1, { selected: "x" }),
                divisorOperand
            ]),
            instruction(12, "umax", [
                register("temp", 4, { mask: "x" }),
                register("temp", 3, { selected: "x" }),
                quotientOperand.typeName === "temp"
                    ? register("temp", 2, { selected: "x" })
                    : register("temp", 3, { selected: "x" })
            ]),
            instruction(16, "utof", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 4, { swizzle: "xxxx" })
            ]),
            instruction(20, "ret", [])
        ]
    };
}

test("fragment noperspective inputs emit @interpolate(linear)", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 1) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear_noperspective" },
                operands: [ register("input", 1) ]
            },
            instruction(4, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("input", 1, { swizzle: "xxxx" })
            ]),
            instruction(8, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-noperspective" });
    assert.match(shader.code, /@location\(1\) @interpolate\(linear\) input1: f32/u);
});

test("fragment rejects centroid and constant interpolation modes", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 1) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear_centroid" },
                operands: [ register("input", 1) ]
            },
            instruction(4, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("input", 1, { swizzle: "xxxx" })
            ]),
            instruction(8, "ret", [])
        ]
    };
    assert.throws(() => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-centroid" }),
        /input r1 has unsupported interpolation linear_centroid/u);
});

test("fragment lowering emits udiv quotient and remainder for an immediate divisor", () =>
{
    const program = udivProgram(register("temp", 2, { mask: "x" }), immediate([ 7 ]));
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-udiv" });
    assert.match(shader.code, / \/ 0x00000007u\)/u);
    assert.match(shader.code, / % 0x00000007u\)/u);
});

test("fragment lowering emits udiv remainder alone when the quotient destination is null", () =>
{
    const program = udivProgram(register("null", null), immediate([ 3 ]));
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-udiv-null" });
    assert.match(shader.code, / % 0x00000003u\)/u);
    assert.doesNotMatch(shader.code, / \/ 0x00000003u\)/u);
});

test("fragment udiv guards a dynamic divisor without evaluating divide by zero", () =>
{
    const program = udivProgram(register("null", null), register("temp", 1, { selected: "x" }));
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-udiv-dynamic" });
    assert.match(shader.code,
        /select\(0xffffffffu, \(value\d+ % max\(value\d+, 1u\)\), value\d+ != 0u\)/u);
});

test("fragment udiv guards an immediate zero divisor", () =>
{
    const program = udivProgram(register("null", null), immediate([ 0 ]));
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-udiv-zero" });
    assert.match(shader.code,
        /select\(0xffffffffu, \(value\d+ % max\(0x00000000u, 1u\)\), 0x00000000u != 0u\)/u);
});

test("fragment udiv excludes null destinations from active source lanes", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 15) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(4, "ftou", [
                register("temp", 0, { mask: "yz" }),
                register("input", 0, { swizzle: "xyzw" })
            ]),
            instruction(8, "udiv", [
                register("null", null),
                register("temp", 1, { mask: "yz" }),
                register("temp", 0),
                immediate([ 2, 0, 4, 5 ])
            ]),
            instruction(12, "utof", [
                register("output", 0, { mask: "yz" }),
                register("temp", 1, { swizzle: "xyzw" })
            ]),
            instruction(16, "mov", [
                register("output", 0, { mask: "xw" }),
                immediate([ 0, 0, 0, 0 ])
            ]),
            instruction(20, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-udiv-null-lanes" });
    assert.match(shader.code, /vec2<u32>\(vec2<f32>\(input\.input0\.y, input\.input0\.z\)\)/u);
    assert.match(shader.code, /select\(vec2<u32>\(0xffffffffu\), \(vec2<u32>\(value\d+\.x, value\d+\.y\) % max\(/u);
    assert.match(shader.code, /vec2<u32>\(0x00000000u, 0x00000004u\), vec2<u32>\(1u\)\)/u);
    assert.doesNotMatch(shader.code, /input\.input0\.[xw]/u);
});

test("fragment udiv guards modified divisors and rejects mismatched live destination masks", () =>
{
    const modified = udivProgram(register("null", null), immediate([ 2 ]));
    modified.instructions.find((entry) => entry.opcodeName === "udiv").operands[3].modifierName = "neg";
    assert.match(
        CjsWebgpuFormat.buildWgsl(modified).code,
        /max\(\(0u - 0x00000002u\), 1u\).*\(0u - 0x00000002u\) != 0u/u
    );

    const mismatched = structuredClone(CjsWebgpuFormat.buildShaderIr(
        udivProgram(register("temp", 2, { mask: "x" }), immediate([ 2 ]))));
    const mismatchedUdiv = mismatched.instructions.find((entry) => entry.opcodeName === "udiv");
    mismatchedUdiv.operands[1].mask = "y";
    mismatchedUdiv.dataflow.writes.find((entry) => entry.operandIndex === 1).mask = "y";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(mismatched), /udiv instruction \d+ requires matching destination masks/u);
});

test("fragment lowering samples a cube texture with a three-component coordinate", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 7) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_sampler", "sampler", { samplerModeName: "default" }),
            declaration(4, "dcl_resource", "resource", {
                resourceDimensionName: "texturecube",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            {
                offset: 6, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(9, "sample", [
                register("temp", 0, { mask: "xyzw" }),
                register("input", 1, { swizzle: "xyzx" }),
                register("resource", 0, { swizzle: "xyzw" }),
                register("sampler", 0)
            ]),
            instruction(14, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xyzw" }) ]),
            instruction(18, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-cube-sample" });
    const cube = shader.program.bindings.find((entry) => entry.resourceKind === "sampled-resource");
    assert.equal(cube.type, "texture_cube<f32>");
    assert.match(shader.code, /textureSample\([^,]+, [^,]+, vec3<f32>\(/u);

    program.instructions.find((entry) => entry.opcodeName === "sample").extensions = [ {
        typeName: "sample_controls",
        sampleOffsets: { u: 1, v: 0, w: 0 }
    } ];
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-cube-offset" }),
        /immediate sample offsets support only 2d textures/u
    );
});

test("fragment lowering samples a 2d-array texture with a split coordinate and array index", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 7) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_sampler", "sampler", { samplerModeName: "default" }),
            declaration(4, "dcl_resource", "resource", {
                resourceDimensionName: "texture2darray",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            {
                offset: 6, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(9, "sample", [
                register("temp", 0, { mask: "xyzw" }),
                register("input", 1, { swizzle: "xyzx" }),
                register("resource", 0, { swizzle: "xyzw" }),
                register("sampler", 0)
            ]),
            instruction(14, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xyzw" }) ]),
            instruction(18, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-2d-array-sample" });
    const array = shader.program.bindings.find((entry) => entry.resourceKind === "sampled-resource");
    assert.equal(array.type, "texture_2d_array<f32>");
    assert.match(shader.code, /textureSample\(.*\.xy, i32\(round\(.*\.z\)\)\)/u);

    const gradientProgram = structuredClone(program);
    const gradientSample = gradientProgram.instructions.find((entry) => entry.opcodeName === "sample");
    gradientSample.opcodeName = "sample_d";
    gradientSample.operands.push(
        register("input", 1, { swizzle: "xyxx" }),
        register("input", 1, { swizzle: "yxyy" })
    );
    const gradientShader = CjsWebgpuFormat.buildWgsl(gradientProgram, {
        source: "synthetic-2d-array-gradient-sample"
    });
    assert.match(gradientShader.code,
        /textureSampleGrad\(.*\.xy, i32\(round\(.*\.z\)\), vec2<f32>\([^)]+\), vec2<f32>\([^)]+\)\)/u);

    program.instructions.find((entry) => entry.opcodeName === "sample").extensions = [ {
        typeName: "sample_controls",
        sampleOffsets: { u: 1, v: 0, w: 0 }
    } ];
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-2d-array-offset" }),
        /immediate sample offsets support only 2d textures/u
    );
});

test("fragment sample_d keeps three spatial gradients for 3d textures", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 7) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_sampler", "sampler", { samplerModeName: "default" }),
            declaration(4, "dcl_resource", "resource", {
                resourceDimensionName: "texture3d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            {
                offset: 6, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(9, "sample_d", [
                register("temp", 0, { mask: "xyzw" }),
                register("input", 1, { swizzle: "xyzx" }),
                register("resource", 0, { swizzle: "xyzw" }),
                register("sampler", 0),
                register("input", 1, { swizzle: "yzxy" }),
                register("input", 1, { swizzle: "zxyz" })
            ]),
            instruction(16, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xyzw" }) ]),
            instruction(20, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-3d-gradient-sample" });
    assert.match(shader.code,
        /textureSampleGrad\(.*vec3<f32>\([^)]+\), vec3<f32>\([^)]+\), vec3<f32>\([^)]+\)\)/u);
});

test("fragment lowering emits an if/else selection with a scalar float merge", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 3) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(5, "lt", [
                register("temp", 0, { mask: "x" }),
                register("input", 1, { selected: "x" }),
                register("input", 1, { selected: "y" })
            ]),
            { ...instruction(9, "if", [ register("temp", 0, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(11, "add", [
                register("temp", 1, { mask: "x" }),
                register("input", 1, { selected: "x" }),
                register("input", 1, { selected: "x" })
            ]),
            instruction(15, "else", []),
            instruction(16, "mul", [
                register("temp", 1, { mask: "x" }),
                register("input", 1, { selected: "y" }),
                register("input", 1, { selected: "y" })
            ]),
            instruction(20, "endif", []),
            instruction(21, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 1, { swizzle: "xxxx" }) ]),
            instruction(25, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-else" });
    assert.match(shader.code, /var value\d+: f32 = 0\.0;/u);
    assert.match(shader.code, /\}\n    else\n    \{/u);
    assert.match(shader.code, /let (value\d+): f32 = \(input\.input1\.x \+ input\.input1\.x\);\n        value(\d+) = value\d+;/u);
    const assignments = shader.code.match(/value(\d+) = value\d+;/gu) || [];
    assert.equal(assignments.length, 2);
    assert.equal(assignments[0].split(" ")[0], assignments[1].split(" ")[0]);
});

test("fragment lowering emits resinfo and texel loads for 2d textures", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            { ...instruction(4, "resinfo", [
                register("temp", 0, { mask: "xy" }),
                immediate([ 0 ]),
                register("resource", 0, { swizzle: "xyzw" })
            ]), resinfoReturnTypeName: "uint" },
            instruction(8, "mov", [ register("temp", 1, { mask: "zw" }), immediate([ 0, 0, 0, 0 ]) ]),
            instruction(12, "mov", [ register("temp", 1, { mask: "xy" }), register("temp", 0, { swizzle: "xyxx" }) ]),
            instruction(16, "ld", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 1, { swizzle: "xyzw" }),
                register("resource", 0, { swizzle: "xyzw" })
            ]),
            instruction(21, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-ld" });
    assert.match(shader.code, /textureDimensions\(t0, 0\)/u);
    assert.match(shader.code, /select\(vec4<f32>\(\), textureLoad\(t0, min\(/u);
    assert.match(shader.code, /textureNumLevels\(t0\) - 1u/u);
    assert.match(shader.code, /&& all\(/u);
});

test("fragment resinfo emits ordinary float dimensions", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            { ...instruction(4, "resinfo", [
                register("temp", 0, { mask: "xy" }),
                immediate([ 0 ]),
                register("resource", 0, { swizzle: "xyzw" })
            ]), resinfoReturnTypeName: "float" },
            instruction(8, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 0, { swizzle: "xyxy" })
            ]),
            instruction(12, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-float" });
    assert.match(shader.code,
        /vec2<f32>\(f32\(textureDimensions\(t0, 0\)\.x\), f32\(textureDimensions\(t0, 0\)\.y\)\)/u);
});

test("fragment resinfo applies the resource swizzle including w", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            { ...instruction(4, "resinfo", [
                register("output", 0, { mask: "xyzw" }),
                immediate([ 0 ]),
                register("resource", 0, { swizzle: "wyyx" })
            ]), resinfoReturnTypeName: "float" },
            instruction(8, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-swizzle-w" });
    assert.match(shader.code,
        /vec4<f32>\(f32\(textureNumLevels\(t0\)\), f32\(textureDimensions\(t0, 0\)\.y\), f32\(textureDimensions\(t0, 0\)\.y\), f32\(textureDimensions\(t0, 0\)\.x\)\)/u);
});

test("fragment resinfo guards out-of-range mips and keeps rcpfloat mip counts unchanged", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture3d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            { ...instruction(4, "resinfo", [
                register("output", 0, { mask: "xyzw" }),
                immediate([ 7 ]),
                register("resource", 0, { swizzle: "xyzw" })
            ]), resinfoReturnTypeName: "rcpfloat" },
            instruction(8, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-rcpfloat" });
    assert.match(shader.code,
        /textureDimensions\(t0, min\(7u, textureNumLevels\(t0\) - 1u\)\)\.x/u);
    assert.match(shader.code,
        /select\(0u, textureDimensions\(t0, .*?\)\.z, 7u < textureNumLevels\(t0\)\)/u);
    assert.match(shader.code, /1\.0 \/ f32\(select\(0u, textureDimensions/u);
    assert.match(shader.code, /f32\(textureNumLevels\(t0\)\)/u);
    assert.doesNotMatch(shader.code, /1\.0 \/ f32\(textureNumLevels\(t0\)\)/u);
});

test("fragment partial texture ld takes its mip from the original address w lane", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            instruction(4, "ld", [
                register("temp", 0, { mask: "x" }),
                immediate([ 1, 2, 3, 4 ]),
                register("resource", 0, { swizzle: "xyzw" })
            ]),
            instruction(9, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 0, { swizzle: "xxxx" })
            ]),
            instruction(13, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-ld-mip-lane" });
    assert.match(shader.code, /vec3<u32>\(0x00000001u, 0x00000002u, 0x00000004u\)/u);
    assert.doesNotMatch(shader.code, /0x00000003u/u);
});

test("fragment resinfo rejects malformed mip operands and return types", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            { ...instruction(4, "resinfo", [
                register("output", 0, { mask: "xyzw" }),
                immediate([ 0, 1 ]),
                register("resource", 0, { swizzle: "xyww" })
            ]), resinfoReturnTypeName: "float" },
            instruction(8, "ret", [])
        ]
    };
    assert.throws(() => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-vector-mip" }),
        /requires an immediate mip level/u);

    program.instructions[2].operands[1] = immediate([ 0 ]);
    program.instructions[2].resinfoReturnTypeName = "return_type_3";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-return-type" }),
        /unsupported return type return_type_3/u);

});

test("fragment resinfo fails closed on currently unsupported ordinary float saturation", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            {
                ...instruction(4, "resinfo", [
                    register("output", 0, { mask: "xyzw" }),
                    immediate([ 0 ]),
                    register("resource", 0, { swizzle: "xyww" })
                ]),
                resinfoReturnTypeName: "float",
                saturate: true
            },
            instruction(8, "ret", [])
        ]
    };
    assert.throws(() => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-float-saturate" }),
        /resinfo instruction \d+ cannot saturate/u);
});

test("fragment resinfo rejects invalid uint saturation", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            {
                ...instruction(4, "resinfo", [
                    register("output", 0, { mask: "xyzw" }),
                    immediate([ 0 ]),
                    register("resource", 0, { swizzle: "xyww" })
                ]),
                resinfoReturnTypeName: "uint",
                saturate: true
            },
            instruction(8, "ret", [])
        ]
    };
    assert.throws(() => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-resinfo-uint-saturate" }),
        /resinfo instruction \d+ cannot saturate/u);
});

test("fragment lowering emits a counted loop with carried phis and a conditional break", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "mov", [ register("temp", 0, { mask: "x" }), immediate([ 0 ]) ]),
            instruction(6, "mov", [ register("temp", 1, { mask: "x" }), immediate([ 0 ]) ]),
            instruction(10, "loop", []),
            instruction(11, "ige", [
                register("temp", 2, { mask: "x" }),
                register("temp", 0, { selected: "x" }),
                immediate([ 4 ])
            ]),
            { ...instruction(15, "breakc", [ register("temp", 2, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(17, "iadd", [
                register("temp", 1, { mask: "x" }),
                register("temp", 1, { selected: "x" }),
                register("temp", 0, { selected: "x" })
            ]),
            instruction(21, "iadd", [
                register("temp", 0, { mask: "x" }),
                register("temp", 0, { selected: "x" }),
                immediate([ 1 ])
            ]),
            instruction(25, "endloop", []),
            instruction(26, "itof", [ register("temp", 3, { mask: "x" }), register("temp", 1, { selected: "x" }) ]),
            instruction(30, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 3, { swizzle: "xxxx" }) ]),
            instruction(34, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-fragment-loop" });
    assert.match(shader.code, /loop\n    \{/u);
    assert.match(shader.code, /break;/u);
    const varCount = (shader.code.match(/var value\d+: i32 =/gu) || []).length;
    assert.equal(varCount, 2);
    const assignments = shader.code.match(/value\d+ = value\d+;/gu) || [];
    assert.ok(assignments.length >= 2);

    const selfLatchIr = structuredClone(CjsWebgpuFormat.buildShaderIr(program));
    const loopRegion = selfLatchIr.controlFlow.regions.find((region) => region.kind === "loop");
    const header = selfLatchIr.blocks.find((block) => block.startInstruction === loopRegion.startInstruction);
    const merge = selfLatchIr.values.find((value) => header.mergeSite.valueIds.includes(value.id));
    const backedgeOutput = selfLatchIr.blocks
        .filter((block) => block.startInstruction <= loopRegion.endInstruction)
        .sort((left, right) => right.startInstruction - left.startInstruction)
        .flatMap((block) => block.outputValues)
        .find((entry) => entry.register === merge.register && entry.component === merge.writeMask);
    assert(backedgeOutput);
    backedgeOutput.ref = { valueId: merge.id, component: merge.writeMask };
    assert.match(CjsWebgpuFormat.buildWgsl(selfLatchIr).code, /loop\n    \{/u);

    const inheritedEntryIr = structuredClone(CjsWebgpuFormat.buildShaderIr(program));
    const inheritedLoop = inheritedEntryIr.controlFlow.regions.find((region) => region.kind === "loop");
    const inheritedHeader = inheritedEntryIr.blocks.find((block) =>
        block.startInstruction === inheritedLoop.startInstruction);
    const inheritedBackedge = inheritedEntryIr.blocks.find((block) =>
        inheritedLoop.endInstruction >= block.startInstruction
        && inheritedLoop.endInstruction <= block.endInstruction);
    const inheritedMerge = inheritedEntryIr.values.find((value) =>
        inheritedHeader.mergeSite.valueIds.includes(value.id));
    const inheritedEntry = inheritedMerge.incoming.find((incoming) =>
        incoming.blockId !== inheritedBackedge.id);
    inheritedEntry.blockId = "prebuilt-inherited-entry";
    assert.match(CjsWebgpuFormat.buildWgsl(inheritedEntryIr).code, /loop\n    \{/u);
});

test("fragment loop headers reject carried entry values with indirect undefined ancestry", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "mov", [ register("temp", 0, { mask: "x" }), immediate([ 0 ]) ]),
            instruction(9, "lt", [
                register("temp", 4, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            { ...instruction(13, "if", [ register("temp", 4, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(16, "mov", [ register("temp", 1, { mask: "x" }), immediate([ 0 ]) ]),
            instruction(20, "endif", []),
            instruction(21, "loop", []),
            instruction(22, "ige", [
                register("temp", 2, { mask: "x" }),
                register("temp", 0, { selected: "x" }),
                immediate([ 4 ])
            ]),
            { ...instruction(26, "breakc", [ register("temp", 2, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(28, "iadd", [
                register("temp", 1, { mask: "x" }),
                register("temp", 1, { selected: "x" }),
                register("temp", 0, { selected: "x" })
            ]),
            instruction(32, "iadd", [
                register("temp", 0, { mask: "x" }),
                register("temp", 0, { selected: "x" }),
                immediate([ 1 ])
            ]),
            instruction(36, "endloop", []),
            instruction(37, "itof", [ register("temp", 3, { mask: "x" }), register("temp", 1, { selected: "x" }) ]),
            instruction(41, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 3, { swizzle: "xxxx" }) ]),
            instruction(45, "ret", [])
        ]
    };
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-loop-undefined-entry" }),
        /observable undefined path/i
    );
});

test("fragment loop backedges and exits reject indirect undefined ancestry", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_input_ps",
                isDeclaration: true,
                declaration: { registerIndex: 0, interpolationModeName: "linear" },
                operands: [ register("input", 0) ]
            },
            instruction(5, "lt", [
                register("temp", 3, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            { ...instruction(9, "if", [ register("temp", 3, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(12, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(16, "endif", []),
            { ...instruction(17, "if", [ register("temp", 3, { selected: "x" }) ]), testBoolean: "zero" },
            instruction(20, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(24, "endif", []),
            instruction(25, "loop", []),
            instruction(26, "mov", [ register("temp", 7, { mask: "x" }), register("temp", 0, { selected: "x" }) ]),
            instruction(30, "lt", [
                register("temp", 4, { mask: "x" }),
                register("input", 0, { selected: "y" }),
                register("input", 0, { selected: "x" })
            ]),
            { ...instruction(34, "breakc", [ register("temp", 4, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(36, "mov", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(40, "lt", [
                register("temp", 5, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            { ...instruction(44, "breakc", [ register("temp", 5, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(46, "endloop", []),
            instruction(47, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 0, { swizzle: "xxxx" })
            ]),
            instruction(51, "ret", [])
        ]
    };
    assert.match(CjsWebgpuFormat.buildWgsl(program).code, /loop\n    \{/u);

    const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(program));
    const selectionRegion = ir.controlFlow.regions.find((region) => region.kind === "selection");
    const selectionJoin = ir.blocks.find((block) => block.startInstruction === selectionRegion.endInstruction);
    const undefinedMerge = ir.values.find((value) =>
        selectionJoin.mergeSite.valueIds.includes(value.id) && value.register === "temp[0]");
    const loopRegion = ir.controlFlow.regions.find((region) => region.kind === "loop");
    const exitJoin = ir.blocks.find((block) => block.startInstruction === loopRegion.endInstruction + 1);
    const exitMerge = ir.values.find((value) =>
        exitJoin.mergeSite.valueIds.includes(value.id) && value.register === "temp[0]");
    const firstBreak = ir.instructions.find((entry) =>
        entry.opcodeName === "breakc" && entry.index > loopRegion.startInstruction);
    const firstBreakBlock = ir.blocks.find((block) =>
        firstBreak.index >= block.startInstruction && firstBreak.index <= block.endInstruction);
    assert(undefinedMerge);
    assert(exitMerge);

    const backedgeIr = structuredClone(ir);
    const backedgeLoop = backedgeIr.controlFlow.regions.find((region) => region.kind === "loop");
    const backedgeHeader = backedgeIr.blocks.find((block) =>
        block.startInstruction === backedgeLoop.startInstruction);
    const backedgeMerge = backedgeIr.values.find((value) =>
        backedgeHeader.mergeSite.valueIds.includes(value.id) && value.register === "temp[0]");
    const unsafeBackedgeValue = backedgeIr.values.find((value) => value.id === undefinedMerge.id);
    const latchOutput = backedgeIr.blocks
        .filter((block) => block.startInstruction <= backedgeLoop.endInstruction)
        .sort((left, right) => right.startInstruction - left.startInstruction)
        .flatMap((block) => block.outputValues)
        .find((entry) =>
            entry.register === backedgeMerge.register && entry.component === backedgeMerge.writeMask);
    assert(latchOutput);
    latchOutput.ref = { valueId: unsafeBackedgeValue.id, component: unsafeBackedgeValue.writeMask };
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(backedgeIr, { source: "synthetic-loop-backedge-undefined-ancestry" }),
        /observable undefined path/i
    );

    const inheritedOutput = firstBreakBlock.outputValues.find((entry) =>
        entry.register === exitMerge.register && entry.component === exitMerge.writeMask);
    const undefinedRef = { valueId: undefinedMerge.id, component: undefinedMerge.writeMask };
    if (inheritedOutput) inheritedOutput.ref = undefinedRef;
    else
    {
        firstBreakBlock.outputValues.push({
            register: exitMerge.register,
            component: exitMerge.writeMask,
            ref: undefinedRef
        });
    }
    exitMerge.incoming[0].valueId = undefinedMerge.id;
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(ir, { source: "synthetic-loop-exit-undefined-ancestry" }),
        /observable undefined path/i
    );
});

test("fragment lowering splits a mixed-lane movc into per-component selects", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 3) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(5, "lt", [
                register("temp", 0, { mask: "x" }),
                register("input", 1, { selected: "x" }),
                register("input", 1, { selected: "y" })
            ]),
            instruction(9, "lt", [
                register("temp", 1, { mask: "x" }),
                register("input", 1, { selected: "y" }),
                register("input", 1, { selected: "x" })
            ]),
            instruction(13, "add", [
                register("temp", 1, { mask: "y" }),
                register("input", 1, { selected: "x" }),
                register("input", 1, { selected: "y" })
            ]),
            instruction(17, "movc", [
                register("temp", 2, { mask: "xy" }),
                register("temp", 0, { swizzle: "xxxx" }),
                register("temp", 1, { swizzle: "xyxx" }),
                register("temp", 1, { swizzle: "xyxx" })
            ]),
            instruction(22, "and", [
                register("temp", 3, { mask: "x" }),
                register("temp", 2, { selected: "x" }),
                register("temp", 1, { selected: "x" })
            ]),
            instruction(26, "utof", [ register("temp", 4, { mask: "x" }), register("temp", 3, { selected: "x" }) ]),
            instruction(30, "add", [
                register("temp", 5, { mask: "x" }),
                register("temp", 4, { selected: "x" }),
                register("temp", 2, { selected: "y" })
            ]),
            instruction(34, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 5, { swizzle: "xxxx" }) ]),
            instruction(38, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-mixed-movc" });
    assert.match(shader.code, /let value\d+_x: u32 = select\(/u);
    assert.match(shader.code, /let value\d+_y: f32 = select\(/u);

    const negCondition = structuredClone(program);
    negCondition.instructions.find((entry) => entry.opcodeName === "movc").operands[1].modifierName = "neg";
    assert.match(CjsWebgpuFormat.buildWgsl(negCondition).code, /select\(.+, .+, \(0u - .+\) != 0u\)/u);

    for (const modifierName of [ "abs", "absneg" ])
    {
        const invalidCondition = structuredClone(program);
        invalidCondition.instructions.find((entry) => entry.opcodeName === "movc").operands[1].modifierName = modifierName;
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(invalidCondition),
            new RegExp(`unsupported ${modifierName} modifier for uint32`, "u")
        );
    }
});

test("fragment lowering treats a fully-returning if/else as terminal and ignores the dead tail", () =>
{
    const color = (r) => immediate([ r, 0, 0, 0x3f800000 ]);
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 3) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(5, "lt", [
                register("temp", 0, { mask: "x" }),
                register("input", 1, { selected: "x" }),
                register("input", 1, { selected: "y" })
            ]),
            { ...instruction(9, "if", [ register("temp", 0, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(11, "mov", [ register("output", 0, { mask: "xyzw" }), color(0x3f800000) ]),
            instruction(15, "ret", []),
            instruction(16, "else", []),
            instruction(17, "mov", [ register("output", 0, { mask: "xyzw" }), color(0) ]),
            instruction(21, "ret", []),
            instruction(22, "endif", []),
            instruction(23, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-terminal-if" });
    assert.match(shader.code, /\}\n    else\n    \{/u);
    assert.equal((shader.code.match(/return output;/gu) || []).length, 2);
});

test("fragment lowering reads a dynamically indexed immediate constant buffer", () =>
{
    const icbOperand = register("immediate_constant_buffer", null, { swizzle: "xyzw" });
    icbOperand.indices = [ { values: [], relative: register("temp", 0, { selected: "x" }) } ];
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("BLENDINDICES", 1, 1) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "customdata", isDeclaration: true, operands: [],
                customData: { immediateConstantBuffer: [
                    [ { uint32: 0x3f800000, float32: 1 }, { uint32: 0x80000000, float32: -0 }, { uint32: 0, float32: 0 }, { uint32: 0, float32: 0 } ],
                    [ { uint32: 0, float32: 0 }, { uint32: 0x40000000, float32: 2 }, { uint32: 0, float32: 0 }, { uint32: 0, float32: 0 } ]
                ] }
            },
            {
                offset: 4, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(6, "ftou", [ register("temp", 0, { mask: "x" }), register("input", 1, { selected: "x" }) ]),
            instruction(10, "mov", [ register("output", 0, { mask: "xyzw" }), icbOperand ]),
            instruction(14, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-icb" });
    assert.match(shader.code, /const icb = array<vec4<f32>, 2>\(vec4<f32>\(1\.0, bitcast<f32>\(0x80000000u\), 0\.0, 0\.0\), vec4<f32>\(0\.0, 2\.0, 0\.0, 0\.0\)\);/u);
    assert.match(shader.code, /icb\[[^\]]+\]\.x/u);
});

test("fragment lowering emits gradient sampling, ceil, shifts, and integer min/max", () =>
{
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature("TEXCOORD", 1, 15) ], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_sampler", "sampler", { samplerModeName: "default" }),
            declaration(4, "dcl_resource", "resource", {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            {
                offset: 6, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" },
                operands: [ register("input", 1) ]
            },
            instruction(9, "sample_d", [
                register("temp", 0, { mask: "xyzw" }),
                register("input", 1, { swizzle: "xyxx" }),
                register("resource", 0, { swizzle: "xyzw" }),
                register("sampler", 0),
                register("input", 1, { swizzle: "zwzz" }),
                register("input", 1, { swizzle: "zwzz" })
            ]),
            instruction(15, "round_pi", [ register("temp", 1, { mask: "x" }), register("temp", 0, { selected: "x" }) ]),
            instruction(19, "ftou", [ register("temp", 2, { mask: "xy" }), register("input", 1, { swizzle: "xyxx" }) ]),
            instruction(23, "ishl", [ register("temp", 2, { mask: "z" }), register("temp", 2, { selected: "x" }), register("temp", 2, { selected: "y" }) ]),
            instruction(27, "imax", [ register("temp", 2, { mask: "w" }), register("temp", 2, { selected: "z" }), register("temp", 2, { selected: "x" }) ]),
            instruction(31, "utof", [ register("temp", 3, { mask: "x" }), register("temp", 2, { selected: "w" }) ]),
            instruction(35, "add", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xyzw" }), register("temp", 3, { swizzle: "xxxx" }) ]),
            instruction(39, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-sampled" });
    assert.match(shader.code, /textureSampleGrad\(t0, s0, vec2<f32>\([^)]+\), vec2<f32>\([^)]+\), vec2<f32>\([^)]+\)\)/u);
    assert.match(shader.code, /ceil\(/u);
    assert.match(shader.code, /<< u32\(/u);
    assert.match(shader.code, /max\(/u);

    const sample = program.instructions.find((entry) => entry.opcodeName === "sample_d");
    sample.extensions = [
        { typeName: "resource_dimension" },
        { typeName: "resource_return_type" },
        {
            token: 1,
            type: 1,
            typeName: "sample_controls",
            sampleOffsets: { u: 1, v: -1, w: 7 }
        }
    ];
    const offsetShader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-sampled-offset" });
    assert.match(offsetShader.code, /textureSampleGrad\(.*vec2<i32>\(1, -1\)\);/u);

    sample.extensions.push({ typeName: "unknown_extension" });
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-unknown-extension" }),
        /opcode extension unknown_extension is not supported/u
    );
    sample.extensions.pop();
    sample.extensions.at(-1).sampleOffsets.u = 8;
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-invalid-sampled-offset" }),
        /has invalid immediate sample offsets/u
    );
    delete sample.extensions.at(-1).sampleOffsets;
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-missing-sampled-offset" }),
        /has invalid immediate sample offsets/u
    );
});

test("fragment typed Buffer SRVs require explicit bound-view format metadata", () =>
{
    for (const returnTypeName of [ "float", "uint", "sint" ])
    {
        const program = {
            program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
            signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
            instructions: [
                globalFlagsDeclaration(),
                declaration(2, "dcl_resource", "resource", {
                    resourceDimensionName: "buffer",
                    returnType: {
                        returnTypeNames: [
                            returnTypeName,
                            returnTypeName,
                            returnTypeName,
                            returnTypeName
                        ]
                    }
                }),
                instruction(4, "ld", [
                    register("temp", 0, { mask: "xyzw" }),
                    immediate([ 0, 0, 0, 0 ]),
                    register("resource", 0, { swizzle: "xyzw" })
                ]),
                instruction(9, "mov", [
                    register("output", 0, { mask: "xyzw" }),
                    register("temp", 0, { swizzle: "xyzw" })
                ]),
                instruction(13, "ret", [])
            ]
        };
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(program, {
                source: `synthetic-typed-buffer-${returnTypeName}`
            }),
            /is not supported in the pixel stage without explicit bound-view format metadata/u
        );
    }
});

test("fragment lowering emits guarded storage atomics for typed uint buffer UAVs", () =>
{
    const uav = { ...register("uav", 0), componentCount: 0 };
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_unordered_access_view_typed", "uav", {
                resourceDimensionName: "buffer",
                returnType: { returnTypeNames: [ "uint", "uint", "uint", "uint" ] }
            }),
            instruction(4, "atomic_iadd", [ uav, immediate([ 5 ]), immediate([ 1 ]) ]),
            instruction(9, "mov", [ register("output", 0, { mask: "xyzw" }), immediate([ 0, 0, 0, 0 ]) ]),
            instruction(13, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-uav-atomic" });
    const binding = shader.program.bindings.find((entry) => entry.generatedSymbol === "u0");
    assert.equal(binding.declaration, "var<storage, read_write>");
    assert.equal(binding.type, "array<atomic<u32>>");
    assert.deepEqual(binding.buffer, { type: "storage", hasDynamicOffset: false, minBindingSize: 4 });
    assert.match(shader.code, /@group\(0\) @binding\(\d+\) var<storage, read_write> u0: array<atomic<u32>>;/u);
    assert.match(shader.code, /if \(0x00000005u < arrayLength\(&u0\)\)/u);
    assert.match(shader.code, /atomicAdd\(&u0\[0x00000005u\], 0x00000001u\);/u);

    const malformed = structuredClone(CjsWebgpuFormat.buildShaderIr(program));
    malformed.instructions.find((entry) => entry.opcodeName === "atomic_iadd")
        .operands[0].minPrecisionName = "float_16";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(malformed), /default-precision uav handle/u);
});

test("fragment lowering fails closed on non-uint typed buffer UAVs", () =>
{
    const uav = { ...register("uav", 0), componentCount: 0 };
    const program = {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Target", 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            declaration(2, "dcl_unordered_access_view_typed", "uav", {
                resourceDimensionName: "buffer",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            }),
            instruction(4, "atomic_iadd", [ uav, immediate([ 0 ]), immediate([ 1 ]) ]),
            instruction(9, "mov", [ register("output", 0, { mask: "xyzw" }), immediate([ 0, 0, 0, 0 ]) ]),
            instruction(13, "ret", [])
        ]
    };
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-uav-float" }),
        /only typed uint buffer UAVs are supported/u);
});
