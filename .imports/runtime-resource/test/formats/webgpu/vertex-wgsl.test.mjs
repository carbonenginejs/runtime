import { test } from "node:test";
import assert from "node:assert/strict";

import CjsWebgpuFormat from "../../../src/formats/webgpu/index.js";

function register(typeName, registerIndex, { mask = "", swizzle = "", selected = "", modifierName = "none" } = {})
{
    return {
        typeName,
        componentCount: 4,
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

function signature(semanticName, semanticIndex, registerIndex, mask, componentTypeName = "float32")
{
    const componentType = { uint32: 1, int32: 2, float32: 3 }[componentTypeName];
    return {
        semanticName,
        semanticIndex,
        systemValueType: semanticName.startsWith("SV_") ? 1 : 0,
        componentType,
        componentTypeName,
        registerIndex,
        mask,
        readWriteMask: mask,
        stream: 0,
        minPrecision: 0
    };
}

function structuredDeclaration(offset, minor, rangeId = null)
{
    const declaration = { registerIndex: 0, structureStride: 48 };
    const operand = register("resource", rangeId ?? 0);
    if (minor === 1)
    {
        declaration.bindingRange = {
            bindingModel: "sm5.1-range",
            rangeId,
            lowerBound: 0,
            upperBound: 0,
            unbounded: false,
            registerCount: 1,
            registerSpace: 0
        };
        operand.resourceReference = { bindingModel: "sm5.1-range", rangeId };
    }
    return {
        offset,
        opcode: 0,
        opcodeName: "dcl_resource_structured",
        isDeclaration: true,
        declaration,
        operands: [ operand ]
    };
}

function structuredResource(minor, swizzle, rangeId = null)
{
    const operand = register("resource", minor === 1 ? rangeId : 0, { swizzle });
    if (minor === 1) operand.resourceReference = { bindingModel: "sm5.1-range", rangeId };
    return operand;
}

function cbufferDeclaration(offset, registerIndex, sizeInVec4, rangeId = null)
{
    const declaration = { registerIndex, accessPattern: "immediate_indexed", sizeInVec4 };
    const operand = register("constant_buffer", rangeId ?? registerIndex);
    if (Number.isInteger(rangeId))
    {
        declaration.bindingRange = {
            bindingModel: "sm5.1-range",
            rangeId,
            lowerBound: registerIndex,
            upperBound: registerIndex,
            unbounded: false,
            registerCount: 1,
            registerSpace: 0
        };
        operand.resourceReference = { bindingModel: "sm5.1-range", rangeId };
    }
    return {
        offset,
        opcode: 0,
        opcodeName: "dcl_constant_buffer",
        isDeclaration: true,
        declaration,
        operands: [ operand ]
    };
}

function cbuffer(registerIndex, vectorIndex, swizzle, rangeId = null)
{
    const operand = register("constant_buffer", rangeId ?? registerIndex, { swizzle });
    operand.indices = Number.isInteger(rangeId)
        ? [
            { values: [ rangeId ], relative: null },
            { values: [ registerIndex ], relative: null },
            { values: [ vectorIndex ], relative: null }
        ]
        : [
            { values: [ registerIndex ], relative: null },
            { values: [ vectorIndex ], relative: null }
        ];
    if (Number.isInteger(rangeId)) operand.resourceReference = { bindingModel: "sm5.1-range", rangeId };
    return operand;
}

function instruction(offset, opcodeName, operands, values = {})
{
    return { offset, opcode: 0, opcodeName, isDeclaration: false, operands, ...values };
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

function arithmeticVertex(minor = 0)
{
    const range1 = minor === 1 ? 5 : null;
    const range3 = minor === 1 ? 7 : null;
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: minor },
        signatures: {
            input: [
                signature("POSITION", 0, 0, 15),
                signature("NORMAL", 0, 1, 7)
            ],
            output: [
                signature("SV_Position", 0, 0, 15),
                signature("TEXCOORD", 0, 1, 15)
            ]
        },
        instructions: [
            globalFlagsDeclaration(),
            cbufferDeclaration(2, 1, 4, range1),
            cbufferDeclaration(5, 3, 2, range3),
            instruction(8, "mov", [
                register("temp", 0, { mask: "xyzw" }),
                register("input", 0, { swizzle: "xyzw" })
            ]),
            instruction(12, "dp4", [
                register("temp", 1, { mask: "x" }),
                register("temp", 0, { swizzle: "xyzw" }),
                cbuffer(3, 0, "xyzw", range3)
            ]),
            instruction(17, "dp3", [
                register("temp", 1, { mask: "y" }),
                register("temp", 0, { swizzle: "xyzx" }),
                cbuffer(3, 1, "xyzx", range3)
            ], { saturate: true }),
            instruction(22, "add", [
                register("temp", 1, { mask: "z" }),
                register("temp", 1, { selected: "x" }),
                register("temp", 1, { selected: "y" })
            ]),
            instruction(26, "mul", [
                register("temp", 1, { mask: "w" }),
                register("temp", 1, { selected: "z" }),
                immediate([ 0x40000000 ])
            ]),
            instruction(30, "mad", [
                register("temp", 2, { mask: "xyz" }),
                register("temp", 0, { swizzle: "xyzx" }),
                immediate([ 0x3f800000, 0x3f800000, 0x3f800000, 0x3f800000 ]),
                cbuffer(1, 2, "xyzx", range1)
            ]),
            instruction(36, "rsq", [
                register("temp", 2, { mask: "w" }),
                register("temp", 1, { selected: "w" })
            ]),
            instruction(39, "log", [
                register("temp", 3, { mask: "x" }),
                register("temp", 2, { selected: "w" })
            ]),
            instruction(42, "exp", [
                register("temp", 3, { mask: "y" }),
                register("temp", 3, { selected: "x" })
            ]),
            instruction(45, "mov", [
                register("output", 0, { mask: "xy" }),
                register("temp", 1, { swizzle: "xyxx" })
            ]),
            instruction(49, "mov", [
                register("output", 0, { mask: "zw" }),
                register("temp", 1, { swizzle: "zwxx" })
            ]),
            instruction(53, "mov", [
                register("output", 1, { mask: "xyz" }),
                register("temp", 2, { swizzle: "xyzx" })
            ]),
            instruction(57, "mov", [
                register("output", 1, { mask: "w" }),
                register("temp", 3, { selected: "y" })
            ]),
            instruction(61, "ret", [])
        ]
    };
}

function packedMathVertex(minor = 0)
{
    const zero = immediate([ 0, 0, 0, 0 ]);
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: minor },
        signatures: {
            input: [ signature("POSITION", 0, 0, 15) ],
            output: [
                signature("SV_Position", 0, 0, 15),
                signature("TEXCOORD", 0, 1, 15)
            ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "sincos", [
                register("temp", 0, { mask: "xyzw" }),
                register("temp", 1, { mask: "xyzw" }),
                register("input", 0, { swizzle: "xyzw" })
            ]),
            instruction(7, "lt", [
                register("temp", 2, { mask: "xy" }),
                zero,
                register("temp", 1, { swizzle: "ywyy" })
            ]),
            instruction(12, "and", [
                register("temp", 2, { mask: "x" }),
                register("temp", 2, { selected: "y" }),
                register("temp", 2, { selected: "x" })
            ]),
            instruction(16, "movc", [
                register("temp", 3, { mask: "xyz" }),
                register("temp", 2, { swizzle: "xxxx" }),
                register("temp", 0, { swizzle: "xyzx" }),
                register("temp", 0, { swizzle: "xyzx", modifierName: "neg" })
            ]),
            instruction(22, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 1, { swizzle: "xyzw" })
            ]),
            instruction(26, "mov", [
                register("output", 1, { mask: "xyz" }),
                register("temp", 3, { swizzle: "xyzx" })
            ]),
            instruction(30, "mov", [
                register("output", 1, { mask: "w" }),
                register("temp", 0, { selected: "w" })
            ]),
            instruction(34, "ret", [])
        ]
    };
}

function structuredSkinningVertex(minor = 0, { precise = false, swizzle = "xzyw", mask = "xyzw" } = {})
{
    const cbRange = minor === 1 ? 7 : null;
    const resourceRange = minor === 1 ? 9 : null;
    const controls = (preciseMask) => precise ? { preciseMask } : {};
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: minor },
        signatures: {
            input: [ signature("BLENDINDICES", 0, 1, 15, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            cbufferDeclaration(2, 3, 27, cbRange),
            structuredDeclaration(6, minor, resourceRange),
            instruction(10, "iadd", [
                register("temp", 0, { mask: "x" }),
                register("input", 1, { selected: "x" }),
                cbuffer(3, 26, "xxxx", cbRange)
            ], controls("x")),
            instruction(16, "ld_structured", [
                register("temp", 1, { mask }),
                register("temp", 0, { selected: "x" }),
                immediate([ 16 ]),
                structuredResource(minor, swizzle, resourceRange)
            ], controls(mask)),
            instruction(22, "mov", [
                register("output", 0, { mask }),
                register("temp", 1, { swizzle: "xyzw" })
            ], controls(mask)),
            ...(mask === "xyzw" ? [] : [
                instruction(26, "mov", [
                    register("output", 0, { mask: Array.from("xyzw").filter((entry) => !mask.includes(entry)).join("") }),
                    immediate([ 0, 0, 0, 0 ])
                ])
            ]),
            instruction(30, "ret", [])
        ]
    };
}

function dualIndexStructuredVertex()
{
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("BLENDINDICES", 0, 1, 15, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            cbufferDeclaration(2, 3, 27),
            structuredDeclaration(6, 0),
            instruction(10, "iadd", [
                register("temp", 0, { mask: "xy" }),
                register("input", 1, { swizzle: "xyxx" }),
                cbuffer(3, 26, "xyxx")
            ]),
            instruction(16, "ld_structured", [
                register("temp", 1, { mask: "xyzw" }),
                register("temp", 0, { selected: "x" }),
                immediate([ 0 ]),
                structuredResource(0, "xyzw")
            ]),
            instruction(22, "ld_structured", [
                register("temp", 2, { mask: "xyzw" }),
                register("temp", 0, { selected: "y" }),
                immediate([ 16 ]),
                structuredResource(0, "xyzw")
            ]),
            instruction(28, "add", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 1, { swizzle: "xyzw" }),
                register("temp", 2, { swizzle: "xyzw" })
            ]),
            instruction(34, "ret", [])
        ]
    };
}

test("vertex lowering rejects float-only absolute modifiers on integer consumers", () =>
{
    const signedNegate = structuredSkinningVertex();
    signedNegate.instructions.find((entry) => entry.opcodeName === "iadd").operands[1].modifierName = "neg";
    assert.match(CjsWebgpuFormat.buildWgsl(signedNegate).code, /-\(bitcast<i32>/u);

    for (const modifierName of [ "abs", "absneg" ])
    {
        const malformed = structuredSkinningVertex();
        malformed.instructions.find((entry) => entry.opcodeName === "iadd").operands[1].modifierName = modifierName;
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(malformed),
            new RegExp(`unsupported ${modifierName} modifier for int32`, "u")
        );
    }

});

test("vertex structured-resource handles require default precision", () =>
{
    const malformed = structuredClone(CjsWebgpuFormat.buildShaderIr(structuredSkinningVertex()));
    malformed.instructions.find((entry) => entry.opcodeName === "ld_structured")
        .operands[3].minPrecisionName = "float_16";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(malformed), /default-precision resource handle/u);
});

test("vertex lowering emits the bounded arithmetic and uniform-buffer slice", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(arithmeticVertex(), { source: "synthetic-arithmetic-vs" });

    assert.equal(shader.stage, "vertex");
    assert.deepEqual(shader.program.bindings.map((entry) => ({
        symbol: entry.generatedSymbol,
        registerIndex: entry.registerIndex,
        size: entry.buffer.minBindingSize
    })), [
        { symbol: "cb1", registerIndex: 1, size: 64 },
        { symbol: "cb3", registerIndex: 3, size: 32 }
    ]);
    assert.match(shader.code, /@location\(0\) input0: vec4<f32>/u);
    assert.doesNotMatch(shader.code, /@location\(1\) input1/u);
    assert.match(shader.code, /dot\(vec4<f32>\([^\n]+\), vec4<f32>\(cb3\[0\]\.x, cb3\[0\]\.y, cb3\[0\]\.z, cb3\[0\]\.w\)\)/u);
    assert.match(shader.code, /clamp\(dot\(vec3<f32>\([^\n]+\), vec3<f32>\(cb3\[1\]\.x, cb3\[1\]\.y, cb3\[1\]\.z\)\), 0\.0, 1\.0\)/u);
    assert.match(shader.code, /bitcast<f32>\(0x40000000u\)/u);
    assert.match(shader.code, /inverseSqrt\(/u);
    assert.match(shader.code, /log2\(/u);
    assert.match(shader.code, /exp2\(/u);
    assert.equal(shader.program.statements.at(-1).kind, "return");
});

test("SM5.0 registers and SM5.1 ranges emit the same arithmetic vertex WGSL", () =>
{
    const dx11 = CjsWebgpuFormat.buildWgsl(arithmeticVertex(0));
    const dx12 = CjsWebgpuFormat.buildWgsl(arithmeticVertex(1));

    assert.equal(dx12.code, dx11.code);
    assert.deepEqual(
        dx12.program.bindings.map((entry) => [ entry.generatedSymbol, entry.registerIndex ]),
        [ [ "cb1", 1 ], [ "cb3", 3 ] ]
    );
});

test("packed vertex lowering emits paired sincos results and the complete mask-selection chain", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(packedMathVertex());
    const sincosStatements = shader.program.statements.filter((entry) => entry.dxbcOffset === 2);
    const sincosMappings = shader.sourceMap.filter((entry) => entry.dxbcOffset === 2);

    assert.equal(sincosStatements.length, 2);
    assert.deepEqual(sincosStatements.map((entry) => entry.kind), [ "let", "let" ]);
    assert.match(sincosStatements[0].expression.code, /^sin\(vec4<f32>\(/u);
    assert.match(sincosStatements[1].expression.code, /^cos\(vec4<f32>\(/u);
    assert.equal(sincosMappings.length, 2);
    assert.match(shader.code, /select\(vec2<u32>\(0u\), vec2<u32>\(0xffffffffu\), [^\n]+ < [^\n]+\)/u);
    assert.match(shader.code, /let value\d+: u32 = \(value\d+\.y & value\d+\.x\);/u);
    assert.match(shader.code, /select\(vec3<f32>\(-\([^\n]+\), -\([^\n]+\), -\([^\n]+\)\), vec3<f32>\([^\n]+\), vec3<u32>\([^\n]+\) != vec3<u32>\(0u\)\)/u);
});

test("SM5.0 and SM5.1 packed vertex math emit identical WGSL", () =>
{
    assert.equal(
        CjsWebgpuFormat.buildWgsl(packedMathVertex(1)).code,
        CjsWebgpuFormat.buildWgsl(packedMathVertex(0)).code
    );
});

test("vertex lowering splits a mixed-lane movc into per-component selects", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 3) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "lt", [
                register("temp", 0, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            instruction(6, "ftoi", [
                register("temp", 1, { mask: "x" }),
                register("input", 0, { selected: "x" })
            ]),
            instruction(10, "add", [
                register("temp", 1, { mask: "y" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            instruction(14, "mov", [
                register("temp", 1, { mask: "z" }),
                immediate([ 0x3f000000 ])
            ]),
            instruction(18, "movc", [
                register("temp", 2, { mask: "xyz" }),
                register("temp", 0, { swizzle: "xxxx" }),
                register("temp", 1, { swizzle: "xyzx", modifierName: "absneg" }),
                register("temp", 1, { swizzle: "xyzx" })
            ]),
            instruction(23, "iadd", [
                register("temp", 3, { mask: "x" }),
                register("temp", 2, { selected: "x" }),
                register("temp", 1, { selected: "x" })
            ]),
            instruction(27, "itof", [
                register("temp", 4, { mask: "x" }),
                register("temp", 3, { selected: "x" })
            ]),
            instruction(31, "add", [
                register("temp", 5, { mask: "x" }),
                register("temp", 4, { selected: "x" }),
                register("temp", 2, { selected: "y" })
            ]),
            instruction(35, "mov", [
                register("temp", 6, { mask: "z" }),
                register("temp", 2, { selected: "z" })
            ]),
            instruction(39, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 5, { selected: "x" })
            ]),
            instruction(43, "ret", [])
        ]
    };
    const ir = CjsWebgpuFormat.buildShaderIr(program, { source: "synthetic-vertex-mixed-movc" });
    const shader = CjsWebgpuFormat.buildWgsl(ir, { source: "synthetic-vertex-mixed-movc" });
    const movc = ir.instructions.find((entry) => entry.dxbcOffset === 18);
    const value = ir.values.find((entry) => entry.id === movc.dataflow.writes[0].valueId);
    const statements = shader.program.statements.filter((entry) => entry.dxbcOffset === 18);

    assert.deepEqual(value.componentTypes, { x: "int32", y: "float32", z: "bitpattern32" });
    assert.equal(statements.length, 3);
    assert.deepEqual(statements.map((entry) => entry.type), [ "i32", "f32", "u32" ]);
    assert(statements.every((entry) => entry.kind === "let"));
    assert(statements.every((entry) => /^select\(.+, .+, .+ != 0u\)$/u.test(entry.expression.code)));
    assert.match(statements[0].expression.code, /bitcast<i32>\(\(bitcast<u32>\(.+\) \| 0x80000000u\)\)/u);
    assert.match(statements[1].expression.code, /-\(abs\(.+\)\)/u);
    assert.match(statements[2].expression.code, /\| 0x80000000u/u);

    const negCondition = structuredClone(program);
    negCondition.instructions.find((entry) => entry.opcodeName === "movc").operands[1].modifierName = "neg";
    const negStatements = CjsWebgpuFormat.buildWgsl(negCondition).program.statements
        .filter((entry) => entry.dxbcOffset === 18);
    assert(negStatements.every((entry) => /\(0u - .+\) != 0u\)$/u.test(entry.expression.code)));

    for (const modifierName of [ "abs", "absneg" ])
    {
        const invalidCondition = structuredClone(program);
        invalidCondition.instructions.find((entry) => entry.opcodeName === "movc").operands[1].modifierName = modifierName;
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(invalidCondition),
            new RegExp(`unsupported ${modifierName} modifier for uint32`, "u")
        );
    }

    const malformedRead = structuredClone(ir);
    const malformedMovc = malformedRead.instructions.find((entry) => entry.dxbcOffset === 18);
    malformedMovc.dataflow.reads.find((entry) => entry.operandIndex === 2).refs.splice(1);
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(malformedRead),
        /too few source lanes/u
    );
});

test("structured skinning lowers signed indices and typeless SRV words for SM5.0 and SM5.1", () =>
{
    const dx11 = CjsWebgpuFormat.buildWgsl(structuredSkinningVertex(0));
    const dx12 = CjsWebgpuFormat.buildWgsl(structuredSkinningVertex(1));
    const structured = dx11.program.bindings.find((entry) => entry.generatedSymbol === "t0");

    assert.equal(dx12.code, dx11.code);
    assert.equal(structured.declaration, "var<storage, read>");
    assert.equal(structured.type, "array<u32>");
    assert.equal(structured.structureStride, 48);
    assert.deepEqual(structured.buffer, {
        type: "read-only-storage",
        hasDynamicOffset: false,
        minBindingSize: 48
    });
    assert.match(dx11.code, /let (value\d+): u32 = bitcast<u32>\(\(bitcast<i32>\(input\.input1\.x\) \+ bitcast<i32>\(cb3\[26\]\.x\)\)\);/u);
    const index = /let (value\d+): u32 = bitcast<u32>/u.exec(dx11.code)?.[1];
    assert(index);
    assert.match(dx11.code, new RegExp(`min\\(\\(\\(${index}\\) \\* 12u\\) \\+ 4u, arrayLength\\(&t0\\) - 1u\\)`, "u"));
    assert.match(dx11.code, new RegExp(`min\\(\\(\\(${index}\\) \\* 12u\\) \\+ 6u, arrayLength\\(&t0\\) - 1u\\)`, "u"));
    assert.match(dx11.code, new RegExp(`min\\(\\(\\(${index}\\) \\* 12u\\) \\+ 5u, arrayLength\\(&t0\\) - 1u\\)`, "u"));
    assert.match(dx11.code,
        new RegExp(`${index} < \\(arrayLength\\(&t0\\) / 12u\\)`, "u"));
    assert.match(dx11.code, /bitcast<f32>\(select\(0u, t0\[min\(/u);
});

test("structured skinning applies source swizzles before partial destination masks", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(structuredSkinningVertex(0, { mask: "x", swizzle: "zzzz" }));

    assert.match(shader.code, /let value\d+: f32 = bitcast<f32>\(select\(0u, t0\[min\(/u);
});

test("structured skinning requires complete vector result reinterpretation metadata", () =>
{
    const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(dualIndexStructuredVertex()));
    const iadd = ir.instructions.find((entry) => entry.opcodeName === "iadd");
    const shader = CjsWebgpuFormat.buildWgsl(ir);

    assert.equal(iadd.typeInfo.bitcasts.filter((entry) => entry.kind === "result-bitcast").length, 2);
    assert.match(shader.code, /let value\d+: vec2<u32> = bitcast<vec2<u32>>\(\(vec2<i32>\(/u);

    const missing = structuredClone(ir);
    const records = missing.instructions.find((entry) => entry.opcodeName === "iadd").typeInfo.bitcasts;
    records.splice(records.findIndex((entry) => entry.kind === "result-bitcast"), 1);
    assert.throws(() => CjsWebgpuFormat.buildWgsl(missing), /inconsistent register bitcast metadata/u);
});

test("structured skinning lowers precise transport operations and rejects precisionPolicy", () =>
{
    const decoded = structuredSkinningVertex(0, { precise: true });
    const shader = CjsWebgpuFormat.buildWgsl(decoded);
    assert.match(shader.code, /let value\d+: u32 = bitcast<u32>\(\(bitcast<i32>/u);
    assert.match(shader.code, /var<storage, read> t0: array<u32>/u);

    const partial = structuredClone(CjsWebgpuFormat.buildShaderIr(decoded));
    partial.instructions.find((entry) => entry.opcodeName === "ld_structured").preciseMask = "xz";
    assert.match(CjsWebgpuFormat.buildWgsl(partial).code, /bitcast<f32>\(select\(0u, t0\[min\(/u);

    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(decoded, { precisionPolicy: "relaxed" }),
        /precisionPolicy is not supported/u
    );
});

test("precise floating arithmetic lowers as ordinary math with an invariant position", () =>
{
    const decoded = arithmeticVertex();
    decoded.instructions.find((entry) => entry.opcodeName === "dp4").preciseMask = "x";
    const shader = CjsWebgpuFormat.buildWgsl(decoded);
    assert.match(shader.code, /@invariant @builtin\(position\)/u);
    assert.match(shader.code, /dot\(/u);
});

test("precise metadata rejects malformed masks and unrelated lanes", () =>
{
    const malformed = structuredSkinningVertex(0, { precise: true });
    malformed.instructions.find((entry) => entry.opcodeName === "iadd").preciseMask = "zx";
    assert.throws(() => CjsWebgpuFormat.buildShaderIr(malformed), /invalid precise component mask/u);

    const unrelated = structuredSkinningVertex(0, { precise: true });
    unrelated.instructions.find((entry) => entry.opcodeName === "iadd").preciseMask = "y";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(unrelated),
        /requires a destination write containing every precise lane/u
    );

    const direct = structuredClone(CjsWebgpuFormat.buildShaderIr(structuredSkinningVertex()));
    direct.instructions.find((entry) => entry.opcodeName === "mov").preciseMask = null;
    assert.throws(() => CjsWebgpuFormat.buildWgsl(direct), /malformed component mask null/u);
});

test("WGSL lowering requires consistent DXBC refactoring controls", () =>
{
    const absent = structuredSkinningVertex();
    absent.instructions = absent.instructions.filter((entry) => entry.opcodeName !== "dcl_global_flags");
    assert.throws(() => CjsWebgpuFormat.buildWgsl(absent), /requires exactly one dcl_global_flags/u);

    const disabled = structuredSkinningVertex();
    Object.assign(disabled.instructions[0].declaration, { globalFlags: 0, refactoringAllowed: false });
    assert.throws(() => CjsWebgpuFormat.buildWgsl(disabled), /disables refactoring globally/u);

    const duplicate = structuredSkinningVertex();
    duplicate.instructions.push(globalFlagsDeclaration());
    assert.throws(() => CjsWebgpuFormat.buildWgsl(duplicate), /requires exactly one dcl_global_flags/u);

    const inconsistent = structuredSkinningVertex();
    inconsistent.instructions[0].declaration.globalFlags = 0;
    assert.throws(() => CjsWebgpuFormat.buildWgsl(inconsistent), /inconsistent dcl_global_flags metadata/u);
});

test("structured skinning rejects unsupported minimum-precision kinds on every operand role", () =>
{
    for (const operandIndex of [ 0, 2 ])
    {
        const decoded = structuredSkinningVertex();
        const load = decoded.instructions.find((entry) => entry.opcodeName === "ld_structured");
        load.operands[operandIndex].minPrecisionName = operandIndex === 0 ? "sint_16" : "uint_16";
        assert.throws(() => CjsWebgpuFormat.buildWgsl(decoded), /minimum-precision kind (?:sint_16|uint_16) is not supported/u);
    }
});

test("float_16 minimum precision promotes to full precision unchanged", () =>
{
    const baseline = CjsWebgpuFormat.buildWgsl(structuredSkinningVertex());
    const decoded = structuredSkinningVertex();
    const load = decoded.instructions.find((entry) => entry.opcodeName === "ld_structured");
    load.operands[0].minPrecisionName = "float_16";
    load.operands[1].minPrecisionName = "float_16";
    assert.equal(CjsWebgpuFormat.buildWgsl(decoded).code, baseline.code);
});

test("packed vertex sincos rejects malformed multi-result metadata", () =>
{
    const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(packedMathVertex()));
    const sincos = ir.instructions.find((entry) => entry.opcodeName === "sincos");
    sincos.dataflow.writes.push({ ...structuredClone(sincos.dataflow.writes[0]), valueId: sincos.dataflow.writes[1].valueId });
    assert.throws(() => CjsWebgpuFormat.buildWgsl(ir), /sincos instruction \d+ has unsupported result writes/u);
});

test("packed vertex sincos rejects independently masked destination lanes", () =>
{
    const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(packedMathVertex()));
    const sincos = ir.instructions.find((entry) => entry.opcodeName === "sincos");
    sincos.dataflow.writes[0].mask = "z";
    sincos.dataflow.writes[1].mask = "x";

    assert.throws(() => CjsWebgpuFormat.buildWgsl(ir), /requires matching destination masks/u);
});

test("vertex sincos excludes a null destination from active source lanes", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 15) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "sincos", [
                register("null", null),
                register("temp", 0, { mask: "xz" }),
                register("input", 0, { swizzle: "wzyx" })
            ]),
            instruction(7, "mov", [
                register("output", 0, { mask: "xy" }),
                register("temp", 0, { swizzle: "xzzz" })
            ]),
            instruction(11, "mov", [
                register("output", 0, { mask: "zw" }),
                immediate([ 0, 0, 0x3f800000, 0x3f800000 ])
            ]),
            instruction(16, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-sincos-null-lanes" });
    assert.match(shader.code, /cos\(vec2<f32>\(input\.input0\.w, input\.input0\.y\)\)/u);
    assert.doesNotMatch(shader.code, /sin\(/u);
});

function vertexRcpProgram(sourceOperand, { mask = "xyzw", saturate = false } = {})
{
    const missing = Array.from("xyzw").filter((component) => !mask.includes(component)).join("");
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 15) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "rcp", [ register("output", 0, { mask }), sourceOperand ], { saturate }),
            ...(missing
                ? [ instruction(6, "mov", [ register("output", 0, { mask: missing }), immediate([ 0 ]) ]) ]
                : []),
            instruction(10, "ret", [])
        ]
    };
}

test("vertex rcp lowers dynamic values with modifiers before result saturation", () =>
{
    const source = register("input", 0, { selected: "z", modifierName: "absneg" });
    const shader = CjsWebgpuFormat.buildWgsl(vertexRcpProgram(source, { saturate: true }), {
        source: "synthetic-vertex-rcp-dynamic"
    });
    const expression = shader.program.statements.find((entry) => entry.dxbcOffset === 2)?.expression.code;
    assert.equal(expression,
        "clamp((vec4<f32>(1.0) / vec4<f32>(-(abs(input.input0.z)), -(abs(input.input0.z)), -(abs(input.input0.z)), -(abs(input.input0.z)))), vec4<f32>(0.0), vec4<f32>(1.0))");
});

test("vertex rcp validates only consumed immediate lanes and replicates scalar words", () =>
{
    const source = immediate([ 0x00000000, 0x00800000, 0x7f800000, 0x7f7fffff ]);
    source.swizzle = "yxwx";
    const shader = CjsWebgpuFormat.buildWgsl(vertexRcpProgram(source, { mask: "xz" }), {
        source: "synthetic-vertex-rcp-consumed-lanes"
    });
    const expression = shader.program.statements.find((entry) => entry.dxbcOffset === 2)?.expression.code;
    assert.equal(expression,
        "(vec2<f32>(1.0) / vec2<f32>(bitcast<f32>(0x00800000u), bitcast<f32>(0x7f7fffffu)))");

    const replicated = CjsWebgpuFormat.buildWgsl(
        vertexRcpProgram(immediate([ 0x3f000000 ]), { mask: "xyz" })
    );
    const replicatedExpression = replicated.program.statements
        .find((entry) => entry.dxbcOffset === 2)?.expression.code;
    assert.equal(replicatedExpression,
        "(vec3<f32>(1.0) / vec3<f32>(bitcast<f32>(0x3f000000u), bitcast<f32>(0x3f000000u), bitcast<f32>(0x3f000000u)))");

    const invalid = immediate([ 0x00000000, 0x00800000, 0x7f800000, 0x7f7fffff ]);
    invalid.swizzle = "xywx";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(vertexRcpProgram(invalid, { mask: "xz" })),
        /rcp instruction \d+ requires finite normal immediate source lanes/u
    );
});

test("vertex rcp rejects non-portable immediate exponent classes", () =>
{
    for (const bits of [
        0x00000000, 0x80000000, 0x00000001, 0x807fffff,
        0x7f800000, 0xff800000, 0x7fc00000, 0xff800001
    ])
    {
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(vertexRcpProgram(immediate([ bits ]))),
            /rcp instruction \d+ requires finite normal immediate source lanes/u
        );
    }

    const normalBoundaries = CjsWebgpuFormat.buildWgsl(vertexRcpProgram(
        immediate([ 0x00800000, 0x7f7fffff, 0x80800000, 0xff7fffff ])
    ));
    const expression = normalBoundaries.program.statements
        .find((entry) => entry.dxbcOffset === 2)?.expression.code;
    for (const bits of [ "0x00800000u", "0x7f7fffffu", "0x80800000u", "0xff7fffffu" ])
    {
        assert.match(expression, new RegExp(bits, "u"));
    }
});

test("BuildWgsl applies an explicit pass-global binding plan", () =>
{
    const ir = CjsWebgpuFormat.buildShaderIr(arithmeticVertex());
    const plan = structuredClone(CjsWebgpuFormat.buildWgslBindingPlan([ ir ]));
    plan.bindings.forEach((entry) => { entry.binding += 3; });
    const shader = CjsWebgpuFormat.buildWgsl(ir, { bindingPlan: plan });

    assert.match(shader.code, /@group\(0\) @binding\(3\) var<uniform> cb1/u);
    assert.match(shader.code, /@group\(0\) @binding\(4\) var<uniform> cb3/u);
});

test("vertex dot products replicate scalar results across multi-lane destinations", () =>
{
    const decoded = arithmeticVertex();
    const dot = decoded.instructions.find((entry) => entry.opcodeName === "dp3");
    dot.operands[0].mask = "yz";
    dot.saturate = false;
    const shader = CjsWebgpuFormat.buildWgsl(decoded);

    assert.match(shader.code, /let value\d+: vec2<f32> = vec2<f32>\(dot\(/u);
});

test("vertex dot products broadcast selected register components", () =>
{
    const decoded = arithmeticVertex();
    const dot = decoded.instructions.find((entry) => entry.opcodeName === "dp3");
    dot.operands[1] = register("temp", 0, { selected: "x" });
    const shader = CjsWebgpuFormat.buildWgsl(decoded);

    assert.match(shader.code, /dot\(vec3<f32>\(value\d+\.x, value\d+\.x, value\d+\.x\)/u);
});

test("unreachable instructions do not add live vertex inputs", () =>
{
    const decoded = arithmeticVertex();
    decoded.instructions.push(instruction(64, "mov", [
        register("temp", 4, { mask: "x" }),
        register("input", 1, { selected: "x" })
    ]));
    const shader = CjsWebgpuFormat.buildWgsl(decoded);

    assert.doesNotMatch(shader.code, /@location\(1\) input1/u);
});

test("vertex lowering materializes output writes that are read later", () =>
{
    const decoded = arithmeticVertex();
    const outputWrite = decoded.instructions.findIndex((entry) =>
        entry.opcodeName === "mov" && entry.operands[0]?.typeName === "output");
    decoded.instructions.splice(outputWrite + 1, 0, instruction(47, "mov", [
        register("temp", 4, { mask: "x" }),
        register("output", 0, { selected: "x" })
    ]));
    const shader = CjsWebgpuFormat.buildWgsl(decoded);
    const assignmentIndex = shader.program.statements.findIndex((entry) =>
        entry.kind === "assignment" && entry.target.fieldId === "output:r0");
    const materialized = shader.program.statements[assignmentIndex - 1];
    const readback = shader.program.statements[assignmentIndex + 1];

    assert.equal(materialized.kind, "let");
    assert.equal(shader.program.statements[assignmentIndex].expression.code, materialized.name);
    assert.equal(readback.kind, "let");
    assert.match(readback.expression.code, new RegExp(`^${materialized.name}\\.x$`, "u"));
    assert.match(shader.code, new RegExp(`let ${materialized.name}: vec2<f32>`, "u"));
});

test("vertex lowering rejects a malformed relative cbuffer index and inconsistent reinterpretation metadata", () =>
{
    const relative = arithmeticVertex();
    relative.instructions.find((entry) => entry.opcodeName === "dp4").operands[2].indices[1].relative = {
        typeName: "temp",
        registerIndex: 9
    };
    assert.throws(() => CjsWebgpuFormat.buildWgsl(relative), /relative index requires one scalar component/u);

    const ir = structuredClone(CjsWebgpuFormat.buildShaderIr(arithmeticVertex()));
    ir.instructions.find((entry) => entry.opcodeName === "mov").typeInfo.bitcasts.push({ kind: "read-bitcast" });
    assert.throws(() => CjsWebgpuFormat.buildWgsl(ir), /inconsistent register bitcast metadata/u);
});

function dynamicCbufferDeclaration(offset, registerIndex, sizeInVec4)
{
    const declaration = cbufferDeclaration(offset, registerIndex, sizeInVec4);
    declaration.declaration.accessPattern = "dynamic_indexed";
    return declaration;
}

function dynamicCbuffer(registerIndex, base, swizzle, relative)
{
    const operand = register("constant_buffer", registerIndex, { swizzle });
    operand.indices = [
        { values: [ registerIndex ], relative: null },
        { values: [ base ], relative }
    ];
    return operand;
}

function dynamicIndexVertex()
{
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("BLENDINDICES", 0, 1, 1, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            dynamicCbufferDeclaration(2, 3, 64),
            instruction(6, "mov", [
                register("output", 0, { mask: "xyzw" }),
                dynamicCbuffer(3, 35, "xyzw", register("input", 1, { selected: "x" }))
            ]),
            instruction(10, "ret", [])
        ]
    };
}

test("vertex lowering emits a dynamic constant-buffer index and accepts the dynamic_indexed layout", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(dynamicIndexVertex(), { source: "synthetic-dynamic-cb" });
    assert.match(shader.code, /cb3\[35 \+ i32\(input\.input1\)\]\.x/u);
    const binding = shader.program.bindings.find((entry) => entry.generatedSymbol === "cb3");
    assert.equal(binding.type, "array<vec4<f32>, 64>");
    assert.equal(binding.buffer.type, "uniform");
});

test("vertex lowering rejects dynamic constant-buffer register selection", () =>
{
    const program = dynamicIndexVertex();
    const operand = program.instructions.find((entry) => entry.opcodeName === "mov").operands[1];
    operand.indices[0].relative = register("input", 1, { selected: "x" });
    assert.throws(() => CjsWebgpuFormat.buildWgsl(program), /dynamic cbuffer register selection/u);
});

test("vertex lowering emits unsigned and signed integer-to-float conversions", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("BLENDINDICES", 0, 1, 1, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "utof", [
                register("temp", 0, { mask: "x" }),
                register("input", 1, { selected: "x" })
            ]),
            instruction(6, "mov", [
                register("output", 0, { mask: "xyzw" }),
                register("temp", 0, { swizzle: "xxxx" })
            ]),
            instruction(10, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-utof" });
    assert.match(shader.code, /f32\(input\.input1\)/u);
});

test("vertex lowering emits max, min, sqrt, and div", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 15) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "mov", [ register("temp", 0, { mask: "xyzw" }), register("input", 0, { swizzle: "xyzw" }) ]),
            instruction(6, "max", [ register("temp", 1, { mask: "x" }), register("temp", 0, { selected: "x" }), register("temp", 0, { selected: "y" }) ]),
            instruction(10, "min", [ register("temp", 1, { mask: "y" }), register("temp", 0, { selected: "z" }), register("temp", 0, { selected: "w" }) ]),
            instruction(14, "sqrt", [ register("temp", 1, { mask: "z" }), register("temp", 0, { selected: "x" }) ]),
            instruction(18, "div", [ register("temp", 1, { mask: "w" }), register("temp", 0, { selected: "x" }), register("temp", 0, { selected: "y" }) ]),
            instruction(22, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 1, { swizzle: "xyzw" }) ]),
            instruction(26, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-alu" });
    assert.match(shader.code, /max\(/u);
    assert.match(shader.code, /min\(/u);
    assert.match(shader.code, /sqrt\(/u);
    assert.match(shader.code, /\/ /u);
});

test("vertex lowering exposes SV_VertexID as the vertex_index builtin", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("SV_VertexID", 0, 0, 1, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(6, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xxxx" }) ]),
            instruction(10, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertexid" });
    assert.match(shader.code, /@builtin\(vertex_index\)/u);
    assert.match(shader.code, /f32\(input\.vertex_index\)/u);
});

test("vertex lowering handles a pure-relative constant-buffer index (implicit base 0)", () =>
{
    const cb = register("constant_buffer", 3, { swizzle: "xyzw" });
    cb.indices = [
        { values: [ 3 ], relative: null },
        { values: [], relative: register("input", 1, { selected: "x" }) }
    ];
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("BLENDINDICES", 0, 1, 1, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            dynamicCbufferDeclaration(2, 3, 64),
            instruction(6, "mov", [ register("output", 0, { mask: "xyzw" }), cb ]),
            instruction(10, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-pure-relative-cb" });
    assert.match(shader.code, /cb3\[i32\(input\.input1\)\]\.x/u);
});

test("vertex lowering emits an if/else selection with a scalar float merge", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 3) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "lt", [
                register("temp", 0, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            { ...instruction(6, "if", [ register("temp", 0, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(8, "add", [
                register("temp", 1, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "x" })
            ]),
            instruction(12, "else", []),
            instruction(13, "mul", [
                register("temp", 1, { mask: "x" }),
                register("input", 0, { selected: "y" }),
                register("input", 0, { selected: "y" })
            ]),
            instruction(17, "endif", []),
            instruction(18, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 1, { swizzle: "xxxx" }) ]),
            instruction(22, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-else" });
    assert.match(shader.code, /var value\d+: f32 = 0\.0;/u);
    assert.match(shader.code, /\}\n    else\n    \{/u);
    const assignments = shader.code.match(/value(\d+) = value\d+;/gu) || [];
    assert.equal(assignments.length, 2);
    assert.equal(assignments[0].split(" ")[0], assignments[1].split(" ")[0]);
});

test("vertex lowering emits a switch with grouped selectors and an N-way merge", () =>
{
    const selector = (value) => ({
        ...register("immediate32", null, {}),
        immediateValues: [ { uint32: value, float32: 0 } ]
    });
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 3, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "switch", [ register("input", 0, { selected: "x" }) ]),
            instruction(4, "case", [ selector(0) ]),
            instruction(6, "case", [ selector(3) ]),
            instruction(8, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(12, "break", []),
            instruction(13, "default", []),
            instruction(15, "utof", [ register("temp", 1, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(19, "add", [ register("temp", 0, { mask: "x" }), register("temp", 1, { selected: "x" }), register("temp", 1, { selected: "x" }) ]),
            instruction(23, "break", []),
            instruction(24, "endswitch", []),
            instruction(25, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xxxx" }) ]),
            instruction(29, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-switch" });
    assert.match(shader.code, /switch \(input\.input0\.x\)/u);
    assert.match(shader.code, /case 0u, 3u:/u);
    assert.match(shader.code, /default:/u);
    assert.match(shader.code, /var value\d+: f32 = 0\.0;/u);
    const assignments = shader.code.match(/value(\d+) = value\d+(?:\.[xyzw])?;/gu) || [];
    assert.equal(assignments.length, 2);
});

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

function indexableTempOperand(registerIndex, slot, { mask = "", swizzle = "", selected = "", relative = null } = {})
{
    return {
        ...register("indexable_temp", null, { mask, swizzle, selected }),
        registerIndex,
        indices: [
            { values: [ registerIndex ], relative: null },
            { values: [ slot ], relative }
        ]
    };
}

function constTableVertex({ mutable = false } = {})
{
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 15) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            indexableTempDeclaration(2, 0, 2),
            instruction(4, "mov", [
                indexableTempOperand(0, 0, { mask: "xy" }),
                immediate([ 0x3f800000, 0xbf800000, 0, 0 ])
            ]),
            instruction(8, "mov", [
                indexableTempOperand(0, 1, { mask: "xy" }),
                mutable
                    ? register("input", 0, { swizzle: "xyxx" })
                    : immediate([ 0xbf800000, 0x3f800000, 0, 0 ])
            ]),
            instruction(12, "ftou", [
                register("temp", 0, { mask: "x" }),
                register("input", 0, { selected: "z" })
            ]),
            instruction(16, "mov", [
                register("temp", 1, { mask: "xy" }),
                indexableTempOperand(0, 0, { swizzle: "xyxx", relative: register("temp", 0, { selected: "x" }) })
            ]),
            instruction(20, "mov", [
                register("output", 0, { mask: "xy" }),
                register("temp", 1, { swizzle: "xyxx" })
            ]),
            instruction(24, "mov", [
                register("output", 0, { mask: "zw" }),
                immediate([ 0, 0, 0, 0x3f800000 ])
            ]),
            instruction(28, "ret", [])
        ]
    };
}

function fixedIndexableVertex()
{
    return {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 3) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            indexableTempDeclaration(2, 0, 2),
            instruction(4, "mov", [
                indexableTempOperand(0, 0, { mask: "xy" }),
                immediate([ 0x3f800000, 0x40000000, 0, 0 ])
            ]),
            instruction(8, "mov", [
                indexableTempOperand(0, 1, { mask: "xy" }),
                register("input", 0, { swizzle: "xyxx" })
            ]),
            instruction(12, "lt", [
                register("temp", 0, { mask: "x" }),
                register("input", 0, { selected: "x" }),
                register("input", 0, { selected: "y" })
            ]),
            { ...instruction(16, "if", [ register("temp", 0, { selected: "x" }) ]), testBoolean: "nonzero" },
            instruction(18, "add", [
                indexableTempOperand(0, 0, { mask: "x" }),
                indexableTempOperand(0, 0, { selected: "x" }),
                indexableTempOperand(0, 1, { selected: "x" })
            ]),
            instruction(22, "else", []),
            instruction(23, "mul", [
                indexableTempOperand(0, 0, { mask: "x" }),
                indexableTempOperand(0, 0, { selected: "x" }),
                indexableTempOperand(0, 1, { selected: "x" })
            ]),
            instruction(27, "endif", []),
            instruction(28, "mov", [
                register("output", 0, { mask: "xy" }),
                indexableTempOperand(0, 0, { swizzle: "xyxx" })
            ]),
            instruction(32, "mov", [
                register("output", 0, { mask: "zw" }),
                immediate([ 0, 0, 0, 0x3f800000 ])
            ]),
            instruction(36, "ret", [])
        ]
    };
}

test("vertex lowering scalarizes declared fixed indexable-temp slots through masked writes and branch merges", () =>
{
    const program = fixedIndexableVertex();
    const ir = CjsWebgpuFormat.buildShaderIr(program, { source: "synthetic-vertex-fixed-indexable" });
    assert.ok(ir.values.some((value) => value.register === "indexable_temp[0,0]"));
    assert.ok(ir.values.some((value) => value.register === "indexable_temp[0,1]"));
    assert.ok(ir.values.some((value) =>
        value.origin === "control-flow-merge" && value.register === "indexable_temp[0,0]"));

    const shader = CjsWebgpuFormat.buildWgsl(ir);
    assert.doesNotMatch(shader.code, /\bxt0\b/u);
    assert.match(shader.code, /var value\d+: f32 = 0\.0;/u);
    assert.match(shader.code, /output\.position\.xy = vec2<f32>\(value\d+, value\d+\.y\);/u);
});

test("fixed indexable temps fail closed on undeclared, out-of-range, narrow, and inconsistent identities", () =>
{
    const undeclared = fixedIndexableVertex();
    undeclared.instructions.splice(1, 1);
    assert.throws(() => CjsWebgpuFormat.buildWgsl(undeclared), /x0 is undeclared/u);

    const outOfRange = fixedIndexableVertex();
    outOfRange.instructions[2].operands[0].indices[1].values[0] = 2;
    assert.throws(() => CjsWebgpuFormat.buildWgsl(outOfRange), /x0\[2\] is outside its declared range/u);

    const narrow = fixedIndexableVertex();
    narrow.instructions[1].declaration.componentCount = 2;
    assert.throws(() => CjsWebgpuFormat.buildWgsl(narrow), /not a four-component mutable operand/u);

    const inconsistent = structuredClone(CjsWebgpuFormat.buildShaderIr(fixedIndexableVertex()));
    const fixedWrite = inconsistent.instructions.find((entry) =>
        entry.dataflow.writes.some((write) => write.register === "indexable_temp[0,0]"));
    fixedWrite.dataflow.writes[0].register = "indexable_temp[0,1]";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(inconsistent), /inconsistent indexable-temp dataflow/u);

    const sourceMismatch = structuredClone(CjsWebgpuFormat.buildShaderIr(fixedIndexableVertex()));
    const add = sourceMismatch.instructions.find((entry) => entry.opcodeName === "add");
    add.operands[2].indices[1].values[0] = 0;
    assert.throws(() => CjsWebgpuFormat.buildWgsl(sourceMismatch), /fixed source has inconsistent register dataflow/u);

    const sourceLaneMismatch = structuredClone(CjsWebgpuFormat.buildShaderIr(fixedIndexableVertex()));
    sourceLaneMismatch.instructions.find((entry) => entry.opcodeName === "add").operands[1].selected = "y";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(sourceLaneMismatch), /fixed source has inconsistent register dataflow/u);

    const destinationMaskMismatch = structuredClone(CjsWebgpuFormat.buildShaderIr(fixedIndexableVertex()));
    destinationMaskMismatch.instructions.find((entry) => entry.opcodeName === "add").operands[0].mask = "y";
    assert.throws(() => CjsWebgpuFormat.buildWgsl(destinationMaskMismatch), /fixed destination has inconsistent indexable-temp dataflow/u);
});

test("vertex lowering emits a relative indexable temp as a module constant table", () =>
{
    const shader = CjsWebgpuFormat.buildWgsl(constTableVertex(), { source: "synthetic-vertex-const-table" });
    assert.match(shader.code, /const xt0 = array<vec4<f32>, 2>\(vec4<f32>\(1\.0, -1\.0, 0\.0, 0\.0\), vec4<f32>\(-1\.0, 1\.0, 0\.0, 0\.0\)\);/u);
    assert.match(shader.code, /xt0\[i32\(value\d+\)\]\.x/u);
    assert.doesNotMatch(shader.code, /xt0\[[^\]]*\]\s*=/u);

    const mismatched = structuredClone(CjsWebgpuFormat.buildShaderIr(constTableVertex()));
    const tableRead = mismatched.instructions.find((entry) =>
        entry.operands.some((operand) => operand.typeName === "indexable_temp"));
    tableRead.operands.find((operand) => operand.typeName === "indexable_temp").registerIndex = 1;
    assert.throws(() => CjsWebgpuFormat.buildWgsl(mismatched), /operand register identity does not match/u);

    const maskedSource = structuredClone(CjsWebgpuFormat.buildShaderIr(constTableVertex()));
    const maskedRead = maskedSource.instructions.find((entry) =>
        entry.operands.some((operand) => operand.typeName === "indexable_temp"));
    const maskedOperand = maskedRead.operands.find((operand) => operand.typeName === "indexable_temp");
    maskedOperand.swizzle = "";
    maskedOperand.mask = "xy";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(maskedSource),
        /source indexable temp requires swizzle or select component mode/u
    );

    const narrowOperand = structuredClone(CjsWebgpuFormat.buildShaderIr(constTableVertex()));
    const narrowRead = narrowOperand.instructions.find((entry) =>
        entry.operands.some((operand) => operand.typeName === "indexable_temp"));
    narrowRead.operands.find((operand) => operand.typeName === "indexable_temp").componentCount = 1;
    assert.throws(() => CjsWebgpuFormat.buildWgsl(narrowOperand), /operand is not four-component/u);
});

test("constant-table extraction maps initializer swizzles and routes fixed reads through the table", () =>
{
    const program = constTableVertex();
    program.instructions[2].operands[1].swizzle = "yxzw";
    program.instructions.splice(6, 0, instruction(18, "add", [
        register("temp", 1, { mask: "x" }),
        register("temp", 1, { selected: "x" }),
        indexableTempOperand(0, 1, { selected: "x" })
    ]));
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-const-table-fixed-read" });
    assert.match(shader.code, /const xt0 = array<vec4<f32>, 2>\(vec4<f32>\(-1\.0, 1\.0,/u);
    assert.match(shader.code, /\+ xt0\[1\]\.x/u);
});

test("constant-table extraction replicates scalar immediate initializers across written lanes", () =>
{
    const program = constTableVertex();
    for (const initializer of program.instructions.slice(2, 4))
    {
        initializer.operands[1] = immediate([ 0x3f800000 ]);
    }
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-const-table-scalar" });
    assert.match(shader.code, /const xt0 = array<vec4<f32>, 2>\(vec4<f32>\(1\.0, 1\.0, 0\.0, 0\.0\), vec4<f32>\(1\.0, 1\.0, 0\.0, 0\.0\)\);/u);
});

test("constant-table extraction rejects reads before initialization and relative second destinations", () =>
{
    const readFirst = constTableVertex();
    const [ global, declaration, write0, write1, index, read, output0, output1, ret ] = readFirst.instructions;
    [ index, read, write0, write1, output0, output1, ret ].forEach((entry, position) =>
    {
        entry.offset = 4 + position * 4;
    });
    readFirst.instructions = [ global, declaration, index, read, write0, write1, output0, output1, ret ];
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(readFirst),
        /all initializers must precede every read/u
    );

    const dualDestination = constTableVertex();
    dualDestination.instructions.splice(4, 0, instruction(10, "sincos", [
        register("temp", 2, { mask: "x" }),
        indexableTempOperand(0, 0, {
            mask: "x",
            relative: register("temp", 0, { selected: "x" })
        }),
        immediate([ 0x3f800000 ])
    ]));
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(dualDestination),
        /is only writable by non-saturating mov initializers/u
    );

    const mismatchedIdentity = constTableVertex();
    mismatchedIdentity.instructions[2].operands[0].registerIndex = 1;
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(mismatchedIdentity),
        /consistent fixed register identity/u
    );

    const shortSwizzle = constTableVertex();
    shortSwizzle.instructions[2].operands[1].swizzle = "x";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(shortSwizzle),
        /canonical destination and source component selection/u
    );

    const wideInitializerIndex = constTableVertex();
    wideInitializerIndex.instructions[2].operands[0].indices[1].values = [ 0, 1 ];
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(wideInitializerIndex),
        /initializers require an immediate slot index/u
    );

    const wideRelativeBase = constTableVertex();
    wideRelativeBase.instructions[5].operands[1].indices[1].values = [ 0, 1 ];
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(wideRelativeBase),
        /invalid relative slot base/u
    );
});

test("vertex fails closed on mutable relative indexable temps", () =>
{
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(constTableVertex({ mutable: true }), { source: "synthetic-vertex-mutable-table" }),
        /indexable temp x0 relative addressing is not supported: initializers require immediate32 sources/u
    );
});

test("vertex lowering emits udiv quotient and remainder for an immediate divisor", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 15) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "ftou", [
                register("temp", 0, { mask: "x" }),
                register("input", 0, { selected: "x" })
            ]),
            instruction(6, "udiv", [
                register("temp", 1, { mask: "x" }),
                register("temp", 2, { mask: "x" }),
                register("temp", 0, { selected: "x" }),
                immediate([ 6 ])
            ]),
            instruction(10, "utof", [
                register("output", 0, { mask: "x" }),
                register("temp", 1, { selected: "x" })
            ]),
            instruction(14, "utof", [
                register("output", 0, { mask: "y" }),
                register("temp", 2, { selected: "x" })
            ]),
            instruction(18, "mov", [
                register("output", 0, { mask: "zw" }),
                immediate([ 0, 0, 0, 0x3f800000 ])
            ]),
            instruction(22, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-udiv" });
    assert.match(shader.code, / \/ 0x00000006u\)/u);
    assert.match(shader.code, / % 0x00000006u\)/u);

    const dynamic = structuredClone(program);
    dynamic.instructions.find((entry) => entry.opcodeName === "udiv")
        .operands[3] = register("temp", 0, { selected: "x" });
    assert.match(
        CjsWebgpuFormat.buildWgsl(dynamic, { source: "synthetic-vertex-udiv-dynamic" }).code,
        /select\(0xffffffffu, \(value\d+ \/ max\(value\d+, 1u\)\), value\d+ != 0u\)/u
    );
    assert.match(
        CjsWebgpuFormat.buildWgsl(dynamic, { source: "synthetic-vertex-udiv-dynamic" }).code,
        /select\(0xffffffffu, \(value\d+ % max\(value\d+, 1u\)\), value\d+ != 0u\)/u
    );

    const mismatched = structuredClone(CjsWebgpuFormat.buildShaderIr(program));
    const mismatchedUdiv = mismatched.instructions.find((entry) => entry.opcodeName === "udiv");
    mismatchedUdiv.operands[1].mask = "y";
    mismatchedUdiv.dataflow.writes.find((entry) => entry.operandIndex === 1).mask = "y";
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(mismatched),
        /udiv instruction \d+ requires matching destination masks/u
    );
});

test("vertex switch merges accept a pass-through incoming for clauses that keep the prior value", () =>
{
    const selector = (value) => ({
        ...register("immediate32", null, {}),
        immediateValues: [ { uint32: value, float32: 0 } ]
    });
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 3, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            instruction(2, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(6, "switch", [ register("input", 0, { selected: "x" }) ]),
            instruction(8, "case", [ selector(1) ]),
            instruction(10, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(14, "break", []),
            instruction(15, "default", []),
            instruction(17, "break", []),
            instruction(18, "endswitch", []),
            instruction(19, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xxxx" }) ]),
            instruction(23, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-switch-passthrough" });
    assert.match(shader.code, /switch \(input\.input0\.x\)/u);
    const assignments = shader.code.match(/value\d+ = value\d+;/gu) || [];
    assert.equal(assignments.length, 2);
});

test("vertex switch merges reject pass-through values with indirect undefined ancestry", () =>
{
    const selector = (value) => ({
        ...register("immediate32", null, {}),
        immediateValues: [ { uint32: value, float32: 0 } ]
    });
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 3, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            { ...instruction(2, "if", [ register("input", 0, { selected: "y" }) ]), testBoolean: "nonzero" },
            instruction(4, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(8, "endif", []),
            instruction(9, "switch", [ register("input", 0, { selected: "x" }) ]),
            instruction(11, "case", [ selector(1) ]),
            instruction(13, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(17, "break", []),
            instruction(18, "default", []),
            instruction(20, "break", []),
            instruction(21, "endswitch", []),
            instruction(22, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xxxx" }) ]),
            instruction(26, "ret", [])
        ]
    };
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-switch-undefined-ancestry" }),
        /observable undefined path/i
    );
});

test("vertex shared if-switch merges preserve outer condition correlation", () =>
{
    const selector = (value) => ({
        ...register("immediate32", null, {}),
        immediateValues: [ { uint32: value, float32: 0 } ]
    });
    const fixture = (secondTestBoolean) => ({
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("POSITION", 0, 0, 3, "uint32") ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            { ...instruction(2, "if", [ register("input", 0, { selected: "y" }) ]), testBoolean: "nonzero" },
            instruction(4, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(8, "endif", []),
            {
                ...instruction(9, "if", [ register("input", 0, { selected: "y" }) ]),
                testBoolean: secondTestBoolean
            },
            instruction(11, "switch", [ register("input", 0, { selected: "x" }) ]),
            instruction(13, "case", [ selector(1) ]),
            instruction(15, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "x" }) ]),
            instruction(19, "break", []),
            instruction(20, "default", []),
            instruction(22, "utof", [ register("temp", 0, { mask: "x" }), register("input", 0, { selected: "y" }) ]),
            instruction(26, "break", []),
            instruction(27, "endswitch", []),
            instruction(28, "endif", []),
            instruction(29, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xxxx" }) ]),
            instruction(33, "ret", [])
        ]
    });

    const complementary = CjsWebgpuFormat.buildWgsl(fixture("zero"), {
        source: "synthetic-shared-switch-correlated"
    });
    assert.match(complementary.code, /if \(input\.input0\.y == 0u\)/u);
    assert.match(complementary.code, /switch \(input\.input0\.x\)/u);
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(fixture("nonzero"), {
            source: "synthetic-shared-switch-undefined-ancestry"
        }),
        /observable undefined path/i
    );
});

test("vertex lowering samples a texture with an explicit level of detail", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("TEXCOORD", 0, 0, 7) ],
            output: [ signature("SV_Position", 0, 0, 15) ]
        },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2, opcode: 0, opcodeName: "dcl_sampler", isDeclaration: true,
                declaration: { registerIndex: 0, samplerModeName: "default" },
                operands: [ register("sampler", 0) ]
            },
            {
                offset: 4, opcode: 0, opcodeName: "dcl_resource", isDeclaration: true,
                declaration: { registerIndex: 0, resourceDimensionName: "texture2d", returnType: { returnTypeNames: [ "float", "float", "float", "float" ] } },
                operands: [ register("resource", 0) ]
            },
            instruction(6, "sample_l", [
                register("temp", 0, { mask: "xyzw" }),
                register("input", 0, { swizzle: "xyxx" }),
                register("resource", 0, { swizzle: "xyzw" }),
                register("sampler", 0),
                register("input", 0, { selected: "z" })
            ]),
            instruction(11, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xyzw" }) ]),
            instruction(15, "ret", [])
        ]
    };
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-sample-l" });
    assert.match(shader.code, /textureSampleLevel\(t0, s0, vec2<f32>\([^)]+\), [^)]+\)/u);
    assert.match(shader.code, /@group\(0\) @binding\(\d+\) var t0: texture_2d<f32>;/u);

    const arrayProgram = structuredClone(program);
    arrayProgram.instructions.find((entry) => entry.opcodeName === "dcl_resource")
        .declaration.resourceDimensionName = "texture2darray";
    const arraySample = arrayProgram.instructions.find((entry) => entry.opcodeName === "sample_l");
    arraySample.operands[1] = register("input", 0, { swizzle: "xyzx" });
    const arrayShader = CjsWebgpuFormat.buildWgsl(arrayProgram, {
        source: "synthetic-vertex-array-sample-l"
    });
    assert.match(arrayShader.code,
        /textureSampleLevel\(.*\.xy, i32\(round\(.*\.z\)\), [^)]+\)/u);

    const arrayGradientProgram = structuredClone(arrayProgram);
    const arrayGradientSample = arrayGradientProgram.instructions.find((entry) => entry.opcodeName === "sample_l");
    arrayGradientSample.opcodeName = "sample_d";
    arrayGradientSample.operands[4] = register("input", 0, { swizzle: "xyxx" });
    arrayGradientSample.operands.push(register("input", 0, { swizzle: "yxyy" }));
    const arrayGradientShader = CjsWebgpuFormat.buildWgsl(arrayGradientProgram, {
        source: "synthetic-vertex-array-sample-d"
    });
    assert.match(arrayGradientShader.code,
        /textureSampleGrad\(.*\.xy, i32\(round\(.*\.z\)\), vec2<f32>\([^)]+\), vec2<f32>\([^)]+\)\)/u);

    const volumeGradientProgram = structuredClone(program);
    volumeGradientProgram.instructions.find((entry) => entry.opcodeName === "dcl_resource")
        .declaration.resourceDimensionName = "texture3d";
    const volumeGradientSample = volumeGradientProgram.instructions.find((entry) => entry.opcodeName === "sample_l");
    volumeGradientSample.opcodeName = "sample_d";
    volumeGradientSample.operands[1] = register("input", 0, { swizzle: "xyzx" });
    volumeGradientSample.operands[4] = register("input", 0, { swizzle: "yzxy" });
    volumeGradientSample.operands.push(register("input", 0, { swizzle: "zxyz" }));
    const volumeGradientShader = CjsWebgpuFormat.buildWgsl(volumeGradientProgram, {
        source: "synthetic-vertex-volume-sample-d"
    });
    assert.match(volumeGradientShader.code,
        /textureSampleGrad\(.*vec3<f32>\([^)]+\), vec3<f32>\([^)]+\), vec3<f32>\([^)]+\)\)/u);

    const sample = program.instructions.find((entry) => entry.opcodeName === "sample_l");
    sample.extensions = [ {
        token: 1,
        type: 1,
        typeName: "sample_controls",
        sampleOffsets: { u: -1, v: 1, w: 0 }
    } ];
    const offsetShader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-sample-l-offset" });
    assert.match(offsetShader.code, /textureSampleLevel\(.*vec2<i32>\(-1, 1\)\);/u);

    const gradientProgram = structuredClone(program);
    const gradientSample = gradientProgram.instructions.find((entry) => entry.opcodeName === "sample_l");
    gradientSample.opcodeName = "sample_d";
    gradientSample.operands[4] = register("input", 0, { swizzle: "xyxx" });
    gradientSample.operands.push(register("input", 0, { swizzle: "yxyy" }));
    const gradientShader = CjsWebgpuFormat.buildWgsl(gradientProgram, {
        source: "synthetic-vertex-sample-d-offset"
    });
    assert.match(gradientShader.code, /textureSampleGrad\(.*vec2<i32>\(-1, 1\)\);/u);

    sample.extensions.push({
        token: 1,
        type: 1,
        typeName: "sample_controls",
        sampleOffsets: { u: 0, v: 0, w: 0 }
    });
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-duplicate-sampled-offset" }),
        /has duplicate sample_controls extensions/u
    );
});

function typedBufferDeclaration(offset, returnTypeName)
{
    return {
        offset,
        opcode: 0,
        opcodeName: "dcl_resource",
        isDeclaration: true,
        declaration: {
            registerIndex: 0,
            resourceDimensionName: "buffer",
            returnType: { returnTypeNames: [ returnTypeName, returnTypeName, returnTypeName, returnTypeName ] }
        },
        operands: [ register("resource", 0) ]
    };
}

test("vertex typed Buffer SRVs require explicit bound-view format metadata", () =>
{
    for (const returnTypeName of [ "float", "uint" ])
    {
        const program = {
            program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
            signatures: { input: [], output: [ signature("SV_Position", 0, 0, 15) ] },
            instructions: [
                globalFlagsDeclaration(),
                typedBufferDeclaration(2, returnTypeName),
                instruction(4, "ld", [
                    register("temp", 0, { mask: "xyzw" }),
                    immediate([ 1, 0, 0, 0 ]),
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
                source: `synthetic-vertex-typed-buffer-${returnTypeName}`
            }),
            /is not supported in the vertex stage without explicit bound-view format metadata/u
        );
    }
});

test("vertex lowering fails closed on ld from texture resources", () =>
{
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Position", 0, 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_resource",
                isDeclaration: true,
                declaration: {
                    registerIndex: 0,
                    resourceDimensionName: "texture2d",
                    returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
                },
                operands: [ register("resource", 0) ]
            },
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
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-texture-ld" }),
        /only typed buffers are supported/u);
});

test("vertex lowering fails closed on storage-resource UAV bindings", () =>
{
    const uav = { ...register("uav", 0), componentCount: 0 };
    const program = {
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [ signature("SV_Position", 0, 0, 15) ] },
        instructions: [
            globalFlagsDeclaration(),
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_unordered_access_view_typed",
                isDeclaration: true,
                declaration: {
                    registerIndex: 0,
                    resourceDimensionName: "buffer",
                    returnType: { returnTypeNames: [ "uint", "uint", "uint", "uint" ] }
                },
                operands: [ uav ]
            },
            instruction(4, "mov", [ register("output", 0, { mask: "xyzw" }), immediate([ 0, 0, 0, 0 ]) ]),
            instruction(9, "ret", [])
        ]
    };
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vertex-uav" }),
        /is not supported in the vertex stage/u);
});
