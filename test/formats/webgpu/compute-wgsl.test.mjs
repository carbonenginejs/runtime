import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import CjsWebgpuFormat from "../../../src/formats/webgpu/index.js";
import { readEffectAnalysis } from "../../../src/formats/webgpu/core/effectAnalysis.js";
import { lowerComputeProgram } from "../../../src/formats/webgpu/core/wgsl/lowerComputeProgram.js";
import {
    isParticleEmitComputeCandidate,
    lowerParticleEmitComputeProgram
} from "../../../src/formats/webgpu/core/wgsl/lowerParticleEmitComputeProgram.js";
import {
    particleClearEffectProofFor,
    preflightParticleClearEffectProfile
} from "../../../src/formats/webgpu/core/wgsl/lowerParticleClearComputePrograms.js";
import {
    particleEmitSemanticDigest,
    sha256Utf8
} from "../../../src/formats/webgpu/core/wgsl/particleEmitSemanticDigest.js";
import { sha256Bytes } from "../../../src/format/effect/sha256.js";

function register(typeName, registerIndex, {
    componentCount = 4,
    mask = "",
    swizzle = "",
    selected = ""
} = {})
{
    return {
        typeName,
        componentCount,
        mask,
        swizzle,
        selected,
        modifierName: "none",
        minPrecisionName: "default",
        nonUniform: false,
        registerIndex,
        indices: Number.isInteger(registerIndex)
            ? [ { values: [ registerIndex ], relative: null } ]
            : [],
        immediateValues: []
    };
}

function immediate(bits)
{
    return {
        ...register("immediate32", null, { componentCount: bits.length }),
        immediateValues: bits.map((uint32) => ({ uint32, float32: 0 }))
    };
}

function replicated(value)
{
    return immediate([ value, value, value, value ]);
}

function declaration(offset, opcodeName, data, operand = null)
{
    return {
        offset,
        opcode: 0,
        opcodeName,
        isDeclaration: true,
        declaration: data,
        operands: operand ? [ operand ] : []
    };
}

function instruction(offset, opcodeName, operands, values = {})
{
    return {
        offset,
        opcode: 0,
        opcodeName,
        isDeclaration: false,
        operands,
        ...values
    };
}

function typedReturn(typeName)
{
    const value = { sint: 3, uint: 4, float: 5 }[typeName];
    return {
        returnTypes: [ value, value, value, value ],
        returnTypeNames: [ typeName, typeName, typeName, typeName ]
    };
}

function load(offset, destinationLane)
{
    return instruction(offset, "ld", [
        register("temp", 0, { mask: destinationLane }),
        replicated(1),
        register("resource", 0, { swizzle: "xyzw" })
    ], {
        extensions: [
            {
                token: 2147483714,
                type: 2,
                typeName: "resource_dimension",
                resourceDimension: 1,
                resourceDimensionName: "buffer",
                structureStride: 0
            },
            {
                token: 838851,
                type: 3,
                typeName: "resource_return_type",
                resourceReturnTypes: [ 3, 3, 3, 3 ]
            }
        ]
    });
}

function store(offset, address, source)
{
    return instruction(offset, "store_uav_typed", [
        register("uav", 0, { mask: "xyzw" }),
        replicated(address),
        source
    ]);
}

function computeFixture(instructions)
{
    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion: 0
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(3, "dcl_resource", {
                resourceDimensionName: "buffer",
                sampleCount: 0,
                returnType: typedReturn("sint"),
                registerIndex: 0
            }, register("resource", 0, { componentCount: 0 })),
            declaration(7, "dcl_unordered_access_view_typed", {
                resourceDimensionName: "buffer",
                globallyCoherent: false,
                returnType: typedReturn("uint"),
                registerIndex: 0
            }, register("uav", 0, { componentCount: 0 })),
            declaration(11, "dcl_temps", { tempCount: 1 }),
            declaration(13, "dcl_thread_group", {
                threadGroupX: 1,
                threadGroupY: 1,
                threadGroupZ: 1
            }),
            ...instructions
        ]
    };
}

function setDrawParametersFixture()
{
    return computeFixture([
        load(17, "x"),
        instruction(29, "imul", [
            register("null", null, { componentCount: 0 }),
            register("temp", 0, { mask: "x" }),
            register("temp", 0, { selected: "x" }),
            immediate([ 6 ])
        ]),
        store(37, 0, register("temp", 0, { swizzle: "xxxx" })),
        store(47, 1, replicated(1)),
        store(60, 2, replicated(0)),
        store(73, 3, replicated(0)),
        instruction(86, "ret", [])
    ]);
}

function setSortArgsFixture()
{
    return computeFixture([
        load(17, "x"),
        instruction(29, "umax", [
            register("temp", 0, { mask: "y" }),
            register("temp", 0, { selected: "x" }),
            immediate([ 1 ])
        ]),
        instruction(36, "iadd", [
            register("temp", 0, { mask: "y" }),
            register("temp", 0, { selected: "y" }),
            immediate([ 0xffffffff ])
        ]),
        instruction(43, "ushr", [
            register("temp", 0, { mask: "y" }),
            register("temp", 0, { selected: "y" }),
            immediate([ 9 ])
        ]),
        instruction(50, "iadd", [
            register("temp", 0, { mask: "y" }),
            register("temp", 0, { selected: "y" }),
            immediate([ 1 ])
        ]),
        store(57, 0, register("temp", 0, { swizzle: "yyyy" })),
        store(67, 1, replicated(1)),
        store(80, 2, replicated(1)),
        store(93, 3, register("temp", 0, { swizzle: "xxxx" })),
        instruction(103, "ret", [])
    ]);
}

function lower(fixture, source)
{
    const ir = CjsWebgpuFormat.buildShaderIr(fixture, { source });
    return { ir, typed: lowerComputeProgram(ir) };
}

function skinDestination(registerIndex, mask)
{
    return register("temp", registerIndex, { mask });
}

function skinTemp(registerIndex, selector)
{
    return register("temp", registerIndex, selector.length === 1
        ? { selected: selector }
        : { swizzle: selector });
}

function skinConstantBuffer(rowIndex, selector)
{
    const operand = register("constant_buffer", 3, selector.length === 1
        ? { selected: selector }
        : { swizzle: selector });
    operand.indices = [
        { values: [ 3 ], relative: null },
        { values: [ rowIndex ], relative: null }
    ];
    return operand;
}

function skinThreadId(selector)
{
    return register("input_thread_id", null, selector.length === 1
        ? { selected: selector }
        : { swizzle: selector });
}

function skinResource(registerIndex, swizzle)
{
    return register("resource", registerIndex, { swizzle });
}

function skinLoad(offset, destinationRegister, destinationMask,
    addressRegister, addressLane, byteOffset, resourceIndex, swizzle)
{
    const structureStride = resourceIndex === 0 ? 48 : 4;
    return instruction(offset, "ld_structured", [
        skinDestination(destinationRegister, destinationMask),
        skinTemp(addressRegister, addressLane),
        immediate([ byteOffset ]),
        skinResource(resourceIndex, swizzle)
    ], {
        extensions: [
            {
                token: (0x80000000 | (structureStride << 11) | (12 << 6) | 2) >>> 0,
                type: 2,
                typeName: "resource_dimension",
                resourceDimension: 12,
                resourceDimensionName: "structured_buffer",
                structureStride
            },
            {
                token: 1677699,
                type: 3,
                typeName: "resource_return_type",
                resourceReturnTypes: [ 6, 6, 6, 6 ]
            }
        ]
    });
}

function skinOp(offset, opcodeName, destinationRegister, destinationMask, ...sources)
{
    return instruction(offset, opcodeName, [
        skinDestination(destinationRegister, destinationMask),
        ...sources
    ]);
}

function skinVerticesFixture()
{
    const cbDeclaration = register("constant_buffer", 3, { swizzle: "xyzw" });
    cbDeclaration.indices = [
        { values: [ 3 ], relative: null },
        { values: [ 3 ], relative: null }
    ];
    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion: 0
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(3, "dcl_constant_buffer", {
                accessPattern: "immediate_indexed",
                registerIndex: 3,
                sizeInVec4: 3
            }, cbDeclaration),
            declaration(7, "dcl_resource_structured", {
                structureStride: 48,
                registerIndex: 0
            }, register("resource", 0, { componentCount: 0 })),
            declaration(11, "dcl_resource_structured", {
                structureStride: 4,
                registerIndex: 1
            }, register("resource", 1, { componentCount: 0 })),
            declaration(15, "dcl_unordered_access_view_structured", {
                globallyCoherent: false,
                structureStride: 4,
                registerIndex: 0
            }, register("uav", 0, { componentCount: 0 })),
            declaration(19, "dcl_input", {
                registerIndex: null,
                operandType: 32,
                operandTypeName: "input_thread_id"
            }, register("input_thread_id", null, { mask: "x" })),
            declaration(21, "dcl_temps", { tempCount: 10 }),
            declaration(23, "dcl_thread_group", {
                threadGroupX: 64,
                threadGroupY: 1,
                threadGroupZ: 1
            }),
            skinOp(27, "ult", 0, "x",
                skinThreadId("x"), skinConstantBuffer(0, "x")),
            instruction(34, "if", [ skinTemp(0, "x") ], { testBoolean: "nonzero" }),
            skinOp(37, "imad", 0, "xy",
                skinThreadId("xxxx"),
                skinConstantBuffer(0, "yyyy"),
                skinConstantBuffer(0, "zwzz")),
            skinLoad(47, 1, "x", 0, "x", 0, 1, "xxxx"),
            skinOp(58, "iadd", 0, "xz", skinTemp(0, "xxxx"), immediate([ 1, 0, 2, 0 ])),
            skinLoad(68, 1, "y", 0, "x", 0, 1, "xxxx"),
            skinLoad(79, 1, "z", 0, "z", 0, 1, "xxxx"),
            skinLoad(90, 0, "x", 0, "y", 0, 1, "xxxx"),
            skinOp(101, "ine", 0, "y", skinConstantBuffer(1, "x"), immediate([ 0xffffffff ])),
            instruction(109, "if", [ skinTemp(0, "y") ], { testBoolean: "nonzero" }),
            skinOp(112, "and", 0, "y", skinTemp(0, "x"), immediate([ 255 ])),
            skinOp(119, "ubfe", 0, "zw",
                immediate([ 0, 0, 8, 8 ]),
                immediate([ 0, 0, 8, 16 ]),
                skinTemp(0, "xxxx")),
            skinOp(134, "ushr", 2, "x", skinTemp(0, "x"), immediate([ 24 ])),
            skinOp(141, "imad", 2, "y",
                skinThreadId("x"), skinConstantBuffer(0, "y"), skinConstantBuffer(1, "x")),
            skinLoad(151, 2, "y", 2, "y", 0, 1, "xxxx"),
            skinOp(162, "and", 2, "z", skinTemp(2, "y"), immediate([ 255 ])),
            skinOp(169, "ubfe", 3, "xy",
                immediate([ 8, 8, 0, 0 ]),
                immediate([ 8, 16, 0, 0 ]),
                skinTemp(2, "yyyy")),
            skinOp(184, "ushr", 2, "y", skinTemp(2, "y"), immediate([ 24 ])),
            skinOp(191, "utof", 4, "yz", skinTemp(3, "xxyx")),
            skinOp(196, "utof", 4, "xw", skinTemp(2, "zzzy")),
            skinOp(201, "mul", 3, "xyzw",
                skinTemp(4, "xyzw"), immediate([ 998277249, 998277249, 998277249, 998277249 ])),
            skinOp(211, "iadd", 0, "y", skinTemp(0, "y"), skinConstantBuffer(1, "y")),
            skinLoad(219, 4, "xyzw", 0, "y", 0, 0, "xyzw"),
            skinLoad(230, 5, "xyzw", 0, "y", 16, 0, "xyzw"),
            skinLoad(241, 6, "xyzw", 0, "y", 32, 0, "xyzw"),
            skinOp(252, "iadd", 0, "yz", skinTemp(0, "zzwz"), skinConstantBuffer(1, "yyyy")),
            skinLoad(260, 7, "xyzw", 0, "y", 0, 0, "xyzw"),
            skinLoad(271, 8, "xyzw", 0, "y", 16, 0, "xyzw"),
            skinLoad(282, 9, "xyzw", 0, "y", 32, 0, "xyzw"),
            skinOp(293, "mul", 7, "xyzw", skinTemp(3, "yyyy"), skinTemp(7, "xyzw")),
            skinOp(300, "mul", 8, "xyzw", skinTemp(3, "yyyy"), skinTemp(8, "xyzw")),
            skinOp(307, "mul", 9, "xyzw", skinTemp(3, "yyyy"), skinTemp(9, "xyzw")),
            skinOp(314, "mad", 4, "xyzw",
                skinTemp(4, "xyzw"), skinTemp(3, "xxxx"), skinTemp(7, "xyzw")),
            skinOp(323, "mad", 5, "xyzw",
                skinTemp(5, "xyzw"), skinTemp(3, "xxxx"), skinTemp(8, "xyzw")),
            skinOp(332, "mad", 6, "xyzw",
                skinTemp(6, "xyzw"), skinTemp(3, "xxxx"), skinTemp(9, "xyzw")),
            skinLoad(341, 7, "xyzw", 0, "z", 0, 0, "xyzw"),
            skinLoad(352, 8, "xyzw", 0, "z", 16, 0, "xyzw"),
            skinLoad(363, 9, "xyzw", 0, "z", 32, 0, "xyzw"),
            skinOp(374, "mad", 4, "xyzw",
                skinTemp(7, "xyzw"), skinTemp(3, "zzzz"), skinTemp(4, "xyzw")),
            skinOp(383, "mad", 5, "xyzw",
                skinTemp(8, "xyzw"), skinTemp(3, "zzzz"), skinTemp(5, "xyzw")),
            skinOp(392, "mad", 6, "xyzw",
                skinTemp(9, "xyzw"), skinTemp(3, "zzzz"), skinTemp(6, "xyzw")),
            skinOp(401, "iadd", 0, "y", skinTemp(2, "x"), skinConstantBuffer(1, "y")),
            skinLoad(409, 2, "xyzw", 0, "y", 0, 0, "xyzw"),
            skinLoad(420, 7, "xyzw", 0, "y", 16, 0, "xyzw"),
            skinLoad(431, 8, "xyzw", 0, "y", 32, 0, "xyzw"),
            skinOp(442, "mad", 2, "xyzw",
                skinTemp(2, "xyzw"), skinTemp(3, "wwww"), skinTemp(4, "xyzw")),
            skinOp(451, "mad", 4, "xyzw",
                skinTemp(7, "xyzw"), skinTemp(3, "wwww"), skinTemp(5, "xyzw")),
            skinOp(460, "mad", 3, "xyzw",
                skinTemp(8, "xyzw"), skinTemp(3, "wwww"), skinTemp(6, "xyzw")),
            instruction(469, "else", []),
            skinOp(470, "and", 0, "x", skinTemp(0, "x"), immediate([ 255 ])),
            skinOp(477, "iadd", 0, "x", skinTemp(0, "x"), skinConstantBuffer(1, "y")),
            skinLoad(485, 2, "xyzw", 0, "x", 0, 0, "xyzw"),
            skinLoad(496, 4, "xyzw", 0, "x", 16, 0, "xyzw"),
            skinLoad(507, 3, "xyzw", 0, "x", 32, 0, "xyzw"),
            instruction(518, "endif", []),
            skinOp(519, "mov", 1, "w", immediate([ 1065353216 ])),
            skinOp(524, "dp4", 0, "x", skinTemp(1, "xyzw"), skinTemp(2, "xyzw")),
            skinOp(531, "dp4", 0, "y", skinTemp(1, "xyzw"), skinTemp(4, "xyzw")),
            skinOp(538, "dp4", 0, "z", skinTemp(1, "xyzw"), skinTemp(3, "xyzw")),
            skinOp(545, "imad", 0, "w",
                skinThreadId("x"), immediate([ 3 ]), skinConstantBuffer(2, "x")),
            instruction(554, "store_structured", [
                register("uav", 0, { mask: "x" }),
                skinTemp(0, "w"),
                immediate([ 0 ]),
                skinTemp(0, "x")
            ]),
            skinOp(563, "iadd", 1, "xy", skinTemp(0, "wwww"), immediate([ 1, 2, 0, 0 ])),
            instruction(573, "store_structured", [
                register("uav", 0, { mask: "x" }),
                skinTemp(1, "x"),
                immediate([ 0 ]),
                skinTemp(0, "y")
            ]),
            instruction(582, "store_structured", [
                register("uav", 0, { mask: "x" }),
                skinTemp(1, "y"),
                immediate([ 0 ]),
                skinTemp(0, "z")
            ]),
            instruction(591, "endif", []),
            instruction(592, "ret", [])
        ]
    };
}

function skinVerticesIr()
{
    return CjsWebgpuFormat.buildShaderIr(skinVerticesFixture(), {
        source: "synthetic-skinvertices-compute"
    });
}

function sortIndex(dimension, value)
{
    return {
        dimension,
        representation: 0,
        values: [ value ],
        relative: null
    };
}

function sortRegister(typeName, registerIndex, selector = {})
{
    const operand = register(typeName, registerIndex, selector);
    operand.indices = Number.isInteger(registerIndex)
        ? [ sortIndex(0, registerIndex) ]
        : [];
    return operand;
}

function sortImmediate(values)
{
    const operand = immediate(values);
    operand.indices = [];
    return operand;
}

function sortConstantBuffer(minorVersion, selected)
{
    const operand = sortRegister(
        "constant_buffer",
        minorVersion === 0 ? 3 : 0,
        { selected });
    operand.indices = minorVersion === 0
        ? [ sortIndex(0, 3), sortIndex(1, 0) ]
        : [ sortIndex(0, 0), sortIndex(1, 3), sortIndex(2, 0) ];
    if (minorVersion === 1)
    {
        operand.resourceReference = {
            bindingModel: "sm5.1-range",
            rangeId: 0,
            nonUniform: false,
            absoluteIndex: null,
            bufferIndex: sortIndex(1, 3),
            vectorOffset: sortIndex(2, 0)
        };
    }
    return operand;
}

function sortHandle(minorVersion, typeName, selector)
{
    const operand = sortRegister(typeName, 0, selector);
    if (minorVersion === 1)
    {
        operand.indices = [ sortIndex(0, 0), sortIndex(1, 0) ];
        operand.resourceReference = {
            bindingModel: "sm5.1-range",
            rangeId: 0,
            nonUniform: false,
            absoluteIndex: sortIndex(1, 0),
            bufferIndex: null,
            vectorOffset: null
        };
    }
    return operand;
}

function sortDestination(registerIndex, mask)
{
    return sortRegister("temp", registerIndex, { mask });
}

function sortTemp(registerIndex, selector)
{
    return sortRegister("temp", registerIndex, selector.length === 1
        ? { selected: selector }
        : { swizzle: selector });
}

function sortBuiltin(typeName)
{
    return sortRegister(typeName, null, { selected: "x" });
}

function sortLoadExtensions(kind)
{
    const structured = kind === "structured";
    return [
        {
            token: structured ? 2147500802 : 2147483714,
            type: 2,
            typeName: "resource_dimension",
            resourceDimension: structured ? 12 : 1,
            resourceDimensionName: structured ? "structured_buffer" : "buffer",
            structureStride: structured ? 8 : 0
        },
        {
            token: structured ? 1677699 : 1118467,
            type: 3,
            typeName: "resource_return_type",
            resourceReturnTypes: Array(4).fill(structured ? 6 : 4)
        }
    ];
}

function sortInstruction(minorVersion, offset, opcodeName, operands, values = {})
{
    const loadKind = opcodeName === "ld"
        ? "typed"
        : opcodeName === "ld_structured"
            ? "structured"
            : null;
    return instruction(offset, opcodeName, operands, {
        ...(minorVersion === 0 && loadKind
            ? { extensions: sortLoadExtensions(loadKind) }
            : {}),
        ...values
    });
}

function sortRange(registerIndex)
{
    return {
        bindingModel: "sm5.1-range",
        rangeId: 0,
        lowerBound: registerIndex,
        upperBound: registerIndex,
        unbounded: false,
        registerCount: 1,
        registerSpace: 0
    };
}

function mergeHistogramsConstantBuffer(minorVersion)
{
    const operand = sortRegister("constant_buffer", 0, { swizzle: "xxyx" });
    operand.indices = minorVersion === 0
        ? [ sortIndex(0, 0), sortIndex(1, 0) ]
        : [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
    if (minorVersion === 1)
    {
        operand.resourceReference = {
            bindingModel: "sm5.1-range",
            rangeId: 0,
            nonUniform: false,
            absoluteIndex: null,
            bufferIndex: sortIndex(1, 0),
            vectorOffset: sortIndex(2, 0)
        };
    }
    return operand;
}

function mergeHistogramsFixture(minorVersion)
{
    const rangeData = minorVersion === 1
        ? { bindingModel: "sm5.1-range", bindingRange: sortRange(0) }
        : {};
    const declarationHandle = (typeName) =>
    {
        const operand = sortRegister(typeName, 0, minorVersion === 0
            ? { componentCount: 0 }
            : { swizzle: "xyzw" });
        if (minorVersion === 1)
        {
            operand.indices = [
                sortIndex(0, 0),
                sortIndex(1, 0),
                sortIndex(2, 0)
            ];
        }
        return operand;
    };
    const constants = sortRegister(
        "constant_buffer", 0, { swizzle: "xyzw" });
    constants.indices = minorVersion === 0
        ? [ sortIndex(0, 0), sortIndex(1, 1) ]
        : [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
    const shared = (selector = "") => sortRegister(
        "thread_group_shared_memory",
        0,
        selector ? { swizzle: selector } : { componentCount: 0 });
    const atomicShared = () => sortRegister(
        "thread_group_shared_memory", 0, { componentCount: 0 });
    const destination = (registerIndex, mask) =>
        sortDestination(registerIndex, mask);
    const temp = (registerIndex, selector) =>
        sortTemp(registerIndex, selector);
    let offset = 30;
    const op = (opcodeName, operands = [], values = {}) =>
    {
        const result = sortInstruction(
            minorVersion, offset, opcodeName, operands, values);
        if (opcodeName === "ld_structured") delete result.extensions;
        offset += 10;
        return result;
    };
    const body = [
        op("ult", [
            destination(0, "x"),
            sortBuiltin("input_thread_id_in_group"),
            sortImmediate([ 64 ])
        ]),
        op("if", [ temp(0, "x") ], { testBoolean: "nonzero" }),
        op("store_structured", [
            sortRegister("thread_group_shared_memory", 0, { mask: "x" }),
            sortBuiltin("input_thread_id_in_group"),
            sortImmediate([ 0 ]),
            sortImmediate([ 0 ])
        ]),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [
                "threads_in_group",
                "thread_group_shared_memory"
            ]
        }),
        op("ftou", [
            destination(0, "yz"),
            mergeHistogramsConstantBuffer(minorVersion)
        ]),
        op("imul", [
            sortRegister("null", null, { componentCount: 0 }),
            destination(0, "y"),
            temp(0, "z"),
            temp(0, "y")
        ]),
        op("ult", [
            destination(0, "y"),
            sortBuiltin("input_thread_id"),
            temp(0, "y")
        ]),
        op("if", [ temp(0, "y") ], { testBoolean: "nonzero" }),
        op("ishl", [
            destination(0, "y"),
            sortBuiltin("input_thread_id"),
            sortImmediate([ 6 ])
        ]),
        op("ushr", [
            destination(0, "y"),
            temp(0, "y"),
            sortImmediate([ 2 ])
        ]),
        op("mov", [ destination(1, "z"), sortImmediate([ 0 ]) ]),
        op("mov", [ destination(2, "yw"), sortImmediate([ 0, 0, 0, 0 ]) ]),
        op("mov", [ destination(2, "x"), sortImmediate([ 0 ]) ]),
        op("loop"),
        op("uge", [
            destination(0, "z"),
            temp(2, "x"),
            sortImmediate([ 64 ])
        ]),
        op("breakc", [ temp(0, "z") ], { testBoolean: "nonzero" }),
        op("ushr", [
            destination(0, "z"),
            temp(2, "x"),
            sortImmediate([ 2 ])
        ]),
        op("iadd", [
            destination(0, "z"),
            temp(0, "z"),
            temp(0, "y")
        ]),
        op("ld", [
            destination(3, "xyzw"),
            temp(0, "zzzz"),
            sortHandle(minorVersion, "resource", { swizzle: "xyzw" })
        ]),
        op("atomic_iadd", [
            atomicShared(),
            temp(2, "xyxx"),
            temp(3, "x")
        ]),
        op("iadd", [
            destination(1, "xy"),
            temp(2, "xxxx"),
            sortImmediate([ 1, 3, 0, 0 ])
        ]),
        op("atomic_iadd", [
            atomicShared(),
            temp(1, "xzxx"),
            temp(3, "y")
        ]),
        op("iadd", [
            destination(2, "z"),
            temp(2, "x"),
            sortImmediate([ 2 ])
        ]),
        op("atomic_iadd", [
            atomicShared(),
            temp(2, "zwzz"),
            temp(3, "z")
        ]),
        op("atomic_iadd", [
            atomicShared(),
            temp(1, "yzyy"),
            temp(3, "w")
        ]),
        op("iadd", [
            destination(2, "x"),
            temp(2, "x"),
            sortImmediate([ 4 ])
        ]),
        op("endloop"),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [
                "threads_in_group",
                "thread_group_shared_memory"
            ]
        }),
        op("if", [ temp(0, "x") ], { testBoolean: "nonzero" }),
        op("ld_structured", [
            destination(0, "x"),
            sortBuiltin("input_thread_id_in_group"),
            sortImmediate([ 0 ]),
            shared("xxxx")
        ]),
        op("atomic_iadd", [
            sortHandle(minorVersion, "uav", { componentCount: 0 }),
            sortBuiltin("input_thread_id_in_group"),
            temp(0, "x")
        ]),
        op("endif"),
        op("ret")
    ];

    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(3, "dcl_constant_buffer", {
                accessPattern: "immediate_indexed",
                registerIndex: 0,
                sizeInVec4: 1,
                ...rangeData
            }, constants),
            declaration(7, "dcl_resource", {
                resourceDimension: 1,
                resourceDimensionName: "buffer",
                sampleCount: 0,
                returnType: typedReturn("uint"),
                registerIndex: 0,
                ...rangeData
            }, declarationHandle("resource")),
            declaration(11, "dcl_unordered_access_view_typed", {
                resourceDimension: 1,
                resourceDimensionName: "buffer",
                globallyCoherent: false,
                returnType: typedReturn("uint"),
                registerIndex: 0,
                ...rangeData
            }, declarationHandle("uav")),
            declaration(15, "dcl_input", {
                registerIndex: null,
                operandType: 34,
                operandTypeName: "input_thread_id_in_group"
            }, sortRegister(
                "input_thread_id_in_group", null, { mask: "x" })),
            declaration(17, "dcl_input", {
                registerIndex: null,
                operandType: 32,
                operandTypeName: "input_thread_id"
            }, sortRegister("input_thread_id", null, { mask: "x" })),
            declaration(19, "dcl_temps", { tempCount: 4 }),
            declaration(21, "dcl_thread_group_shared_memory_structured", {
                registerIndex: 0,
                structureStride: 4,
                structureCount: 64
            }, sortRegister(
                "thread_group_shared_memory", 0, { componentCount: 0 })),
            declaration(25, "dcl_thread_group", {
                threadGroupX: 256,
                threadGroupY: 1,
                threadGroupZ: 1
            }),
            ...body
        ]
    };
}

function mergeHistogramsIr(minorVersion)
{
    return CjsWebgpuFormat.buildShaderIr(
        mergeHistogramsFixture(minorVersion),
        { source: `synthetic-merge-histograms-sm5${minorVersion}` }
    );
}

function createHistogramsOperand(
    typeName,
    registerIndex,
    selectionModeName,
    selector = "",
    componentCount = 4
)
{
    const options = { componentCount };
    if (selectionModeName === "mask") options.mask = selector;
    else if (selectionModeName === "swizzle") options.swizzle = selector;
    else if (selectionModeName === "select1") options.selected = selector;
    const operand = sortRegister(typeName, registerIndex, options);
    operand.selectionModeName = selectionModeName;
    return operand;
}

function createHistogramsImmediate(...values)
{
    const operand = sortImmediate(values);
    operand.selectionModeName = values.length === 1 ? "none" : "mask";
    return operand;
}

function createHistogramsHandle(
    minorVersion,
    typeName,
    selectionModeName,
    selector
)
{
    const operand = createHistogramsOperand(
        typeName, 0, selectionModeName, selector);
    if (minorVersion === 1)
    {
        operand.indices = [ sortIndex(0, 0), sortIndex(1, 0) ];
        operand.resourceReference = {
            bindingModel: "sm5.1-range",
            rangeId: 0,
            nonUniform: false,
            absoluteIndex: sortIndex(1, 0),
            bufferIndex: null,
            vectorOffset: null
        };
    }
    return operand;
}

function createHistogramsConstantBuffer(
    minorVersion,
    selected,
    modifierName = "none"
)
{
    const operand = createHistogramsOperand(
        "constant_buffer", 0, "select1", selected);
    operand.indices = minorVersion === 0
        ? [ sortIndex(0, 0), sortIndex(1, 0) ]
        : [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
    operand.modifierName = modifierName;
    if (minorVersion === 1)
    {
        operand.resourceReference = {
            bindingModel: "sm5.1-range",
            rangeId: 0,
            nonUniform: false,
            absoluteIndex: null,
            bufferIndex: sortIndex(1, 0),
            vectorOffset: sortIndex(2, 0)
        };
    }
    return operand;
}

function createHistogramsTextureExtensions()
{
    return [
        {
            token: 2147483842,
            type: 2,
            typeName: "resource_dimension",
            resourceDimension: 3,
            resourceDimensionName: "texture2d",
            structureStride: 0
        },
        {
            token: 1398083,
            type: 3,
            typeName: "resource_return_type",
            resourceReturnTypes: [ 5, 5, 5, 5 ]
        }
    ];
}

function createHistogramsFixture(minorVersion)
{
    const dst = (registerIndex, mask) => createHistogramsOperand(
        "temp", registerIndex, "mask", mask);
    const src = (registerIndex, swizzle, modifierName = "none") =>
    {
        const operand = createHistogramsOperand(
            "temp",
            registerIndex,
            swizzle.length === 1 ? "select1" : "swizzle",
            swizzle
        );
        operand.modifierName = modifierName;
        return operand;
    };
    const builtin = (typeName, value) => createHistogramsOperand(
        typeName,
        null,
        value.length === 1 ? "select1" : "swizzle",
        value
    );
    const shared = (selectionModeName, selector, componentCount = 4) =>
        createHistogramsOperand(
            "thread_group_shared_memory",
            0,
            selectionModeName,
            selector,
            componentCount
        );
    let offset = 30;
    const op = (opcodeName, operands = [], values = {}) =>
    {
        const result = instruction(offset, opcodeName, operands, {
            ...(minorVersion === 0
                && [ "resinfo", "ld" ].includes(opcodeName)
                ? { extensions: createHistogramsTextureExtensions() }
                : {}),
            ...values
        });
        offset += 10;
        return result;
    };
    const prelude = [
        op("resinfo", [
            dst(0, "xy"),
            createHistogramsImmediate(0),
            createHistogramsHandle(
                minorVersion, "resource", "swizzle", "xyzw")
        ], { resinfoReturnTypeName: "uint" }),
        op("imad", [
            dst(0, "z"),
            builtin("input_thread_id_in_group", "y"),
            createHistogramsImmediate(16),
            builtin("input_thread_id_in_group", "x")
        ])
    ];
    if (minorVersion === 1)
    {
        prelude.push(op("ftou", [
            dst(0, "w"),
            createHistogramsConstantBuffer(minorVersion, "z")
        ]));
    }
    const initialization = [
        op("ult", [
            dst(1, "xy"),
            src(0, "zzzz"),
            createHistogramsImmediate(64, 16, 0, 0)
        ]),
        op("if", [ src(1, "x") ], { testBoolean: "nonzero" }),
        op("store_structured", [
            shared("mask", "x"),
            src(0, "z"),
            createHistogramsImmediate(0),
            createHistogramsImmediate(0)
        ]),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [
                "threads_in_group",
                "thread_group_shared_memory"
            ]
        }),
        op("ult", [
            dst(0, "xy"),
            builtin("input_thread_id", "xyxx"),
            src(0, "xyxx")
        ]),
        op("and", [ dst(0, "x"), src(0, "y"), src(0, "x") ]),
        op("if", [ src(0, "x") ], { testBoolean: "nonzero" }),
        op("mov", [
            dst(2, "xy"),
            builtin("input_thread_id", "xyxx")
        ]),
        op("mov", [
            dst(2, "zw"),
            createHistogramsImmediate(0, 0, 0, 0)
        ])
    ];
    const pixelBody = minorVersion === 0
        ? [
            op("ld", [
                dst(0, "xyw"),
                src(2, "xyzw"),
                createHistogramsHandle(
                    minorVersion, "resource", "swizzle", "xywz")
            ]),
            op("lt", [
                dst(1, "xzw"),
                src(0, "xxyw"),
                createHistogramsImmediate(
                    1025879765, 0, 1025879765, 1025879765)
            ]),
            op("mul", [
                dst(2, "xyz"),
                src(0, "xywx"),
                createHistogramsImmediate(
                    1033798545, 1033798545, 1033798545, 0)
            ]),
            op("add", [
                dst(0, "xyw"),
                src(0, "xyxw"),
                createHistogramsImmediate(
                    1029785518, 1029785518, 0, 1029785518)
            ]),
            op("mul", [
                dst(0, "xyw"),
                src(0, "xyxw"),
                createHistogramsImmediate(
                    1064478575, 1064478575, 0, 1064478575)
            ]),
            op("log", [ dst(0, "xyw"), src(0, "xyxw", "abs") ]),
            op("mul", [
                dst(0, "xyw"),
                src(0, "xyxw"),
                createHistogramsImmediate(
                    1075419546, 1075419546, 0, 1075419546)
            ]),
            op("exp", [ dst(0, "xyw"), src(0, "xyxw") ]),
            op("movc", [
                dst(0, "xyw"),
                src(1, "xzxw"),
                src(2, "xyxz"),
                src(0, "xyxw")
            ]),
            op("dp3", [
                dst(0, "x"),
                src(0, "xywx"),
                createHistogramsImmediate(
                    1046059418, 1060578420, 1033087274, 0)
            ])
        ]
        : [
            op("ld", [
                dst(1, "xzw"),
                src(2, "xyzw"),
                createHistogramsHandle(
                    minorVersion, "resource", "swizzle", "xwyz")
            ]),
            op("lt", [
                dst(2, "xyz"),
                src(1, "xzwx"),
                createHistogramsImmediate(
                    1025879765, 1025879765, 1025879765, 0)
            ]),
            op("mul", [
                dst(3, "xyz"),
                src(1, "xzwx"),
                createHistogramsImmediate(
                    1033798545, 1033798545, 1033798545, 0)
            ]),
            op("add", [
                dst(1, "xzw"),
                src(1, "xxzw"),
                createHistogramsImmediate(
                    1029785518, 0, 1029785518, 1029785518)
            ]),
            op("mul", [
                dst(1, "xzw"),
                src(1, "xxzw"),
                createHistogramsImmediate(
                    1064478575, 0, 1064478575, 1064478575)
            ]),
            op("log", [ dst(1, "xzw"), src(1, "xxzw", "abs") ]),
            op("mul", [
                dst(1, "xzw"),
                src(1, "xxzw"),
                createHistogramsImmediate(
                    1075419546, 0, 1075419546, 1075419546)
            ]),
            op("exp", [ dst(1, "xzw"), src(1, "xxzw") ]),
            op("movc", [
                dst(1, "xzw"),
                src(2, "xxyz"),
                src(3, "xxyz"),
                src(1, "xxzw")
            ]),
            op("dp3", [
                dst(0, "x"),
                src(1, "xzwx"),
                createHistogramsImmediate(
                    1046059418, 1060578420, 1033087274, 0)
            ])
        ];
    const normalization = [
        op("log", [ dst(0, "x"), src(0, "x") ]),
        op("mad", [
            dst(0, "x"),
            src(0, "x"),
            createHistogramsImmediate(1060205080),
            createHistogramsConstantBuffer(minorVersion, "x", "neg")
        ]),
        op("add", [
            dst(0, "y"),
            createHistogramsConstantBuffer(minorVersion, "x", "neg"),
            createHistogramsConstantBuffer(minorVersion, "y")
        ]),
        op("div", [
            dst(0, "x"),
            src(0, "x"),
            src(0, "y")
        ], { saturate: true }),
        op("mul", [
            dst(0, "x"),
            src(0, "x"),
            createHistogramsImmediate(1115684864)
        ]),
        op("ftoi", [ dst(0, "x"), src(0, "x") ]),
        op("imin", [
            dst(0, "x"),
            src(0, "x"),
            createHistogramsImmediate(63)
        ]),
        op("mov", [ dst(0, "y"), createHistogramsImmediate(0) ]),
        op("atomic_iadd", [
            shared("none", "", 0),
            src(0, "xyxx"),
            createHistogramsImmediate(1)
        ]),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [
                "threads_in_group",
                "thread_group_shared_memory"
            ]
        }),
        op("if", [ src(1, "y") ], { testBoolean: "nonzero" })
    ];
    const output = [];
    if (minorVersion === 0)
    {
        output.push(op("ftou", [
            dst(0, "x"),
            createHistogramsConstantBuffer(minorVersion, "z")
        ]));
    }
    output.push(
        op("imad", [
            dst(0, "x"),
            builtin("input_thread_group_id", "y"),
            src(0, minorVersion === 0 ? "x" : "w"),
            builtin("input_thread_group_id", "x")
        ]),
        op("ishl", [
            dst(0, "x"),
            src(0, "x"),
            createHistogramsImmediate(4)
        ]),
        op("ishl", [
            dst(0, "y"),
            builtin("input_thread_id_in_group", "x"),
            createHistogramsImmediate(2)
        ]),
        op("imad", [
            dst(0, "y"),
            builtin("input_thread_id_in_group", "y"),
            createHistogramsImmediate(64),
            src(0, "y")
        ]),
        op("iadd", [ dst(0, "x"), src(0, "x"), src(0, "z") ]),
        op("ld_structured", [
            dst(1, "x"),
            src(0, "y"),
            createHistogramsImmediate(0),
            shared("swizzle", "xxxx")
        ]),
        op("iadd", [
            dst(0, "yw"),
            src(0, "yyyy"),
            createHistogramsImmediate(0, 1, 0, 3)
        ]),
        op("ld_structured", [
            dst(1, "y"),
            src(0, "y"),
            createHistogramsImmediate(0),
            shared("swizzle", "xxxx")
        ]),
        op("imad", [
            dst(0, "y"),
            src(0, "z"),
            createHistogramsImmediate(4),
            createHistogramsImmediate(2)
        ]),
        op("ld_structured", [
            dst(1, "z"),
            src(0, "y"),
            createHistogramsImmediate(0),
            shared("swizzle", "xxxx")
        ]),
        op("ld_structured", [
            dst(1, "w"),
            src(0, "w"),
            createHistogramsImmediate(0),
            shared("swizzle", "xxxx")
        ]),
        op("store_uav_typed", [
            createHistogramsHandle(
                minorVersion, "uav", "mask", "xyzw"),
            src(0, "xxxx"),
            src(1, "xyzw")
        ]),
        op("endif"),
        op("ret")
    );

    const rangeData = minorVersion === 1
        ? { bindingModel: "sm5.1-range", bindingRange: sortRange(0) }
        : {};
    const declarationHandle = (typeName) =>
    {
        const operand = minorVersion === 0
            ? createHistogramsOperand(typeName, 0, "none", "", 0)
            : createHistogramsOperand(typeName, 0, "swizzle", "xyzw");
        if (minorVersion === 1)
        {
            operand.indices = [
                sortIndex(0, 0),
                sortIndex(1, 0),
                sortIndex(2, 0)
            ];
        }
        return operand;
    };
    const constantDeclaration = createHistogramsOperand(
        "constant_buffer", 0, "swizzle", "xyzw");
    constantDeclaration.indices = minorVersion === 0
        ? [ sortIndex(0, 0), sortIndex(1, 1) ]
        : [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];

    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(3, "dcl_constant_buffer", {
                accessPattern: "immediate_indexed",
                registerIndex: 0,
                sizeInVec4: 1,
                ...rangeData
            }, constantDeclaration),
            declaration(7, "dcl_resource", {
                resourceDimension: 3,
                resourceDimensionName: "texture2d",
                sampleCount: 0,
                returnType: typedReturn("float"),
                registerIndex: 0,
                ...rangeData
            }, declarationHandle("resource")),
            declaration(11, "dcl_unordered_access_view_typed", {
                resourceDimension: 1,
                resourceDimensionName: "buffer",
                globallyCoherent: false,
                returnType: typedReturn("uint"),
                registerIndex: 0,
                ...rangeData
            }, declarationHandle("uav")),
            declaration(15, "dcl_input", {
                registerIndex: null,
                operandType: 33,
                operandTypeName: "input_thread_group_id"
            }, createHistogramsOperand(
                "input_thread_group_id", null, "mask", "xy")),
            declaration(17, "dcl_input", {
                registerIndex: null,
                operandType: 34,
                operandTypeName: "input_thread_id_in_group"
            }, createHistogramsOperand(
                "input_thread_id_in_group", null, "mask", "xy")),
            declaration(19, "dcl_input", {
                registerIndex: null,
                operandType: 32,
                operandTypeName: "input_thread_id"
            }, createHistogramsOperand(
                "input_thread_id", null, "mask", "xy")),
            declaration(21, "dcl_temps", {
                tempCount: minorVersion === 0 ? 3 : 4
            }),
            declaration(23, "dcl_thread_group_shared_memory_structured", {
                registerIndex: 0,
                structureStride: 4,
                structureCount: 64
            }, createHistogramsOperand(
                "thread_group_shared_memory", 0, "none", "", 0)),
            declaration(27, "dcl_thread_group", {
                threadGroupX: 16,
                threadGroupY: 16,
                threadGroupZ: 1
            }),
            ...prelude,
            ...initialization,
            ...pixelBody,
            ...normalization,
            ...output
        ]
    };
}

function createHistogramsIr(minorVersion)
{
    return CjsWebgpuFormat.buildShaderIr(
        createHistogramsFixture(minorVersion),
        { source: `synthetic-create-histograms-sm5${minorVersion}` }
    );
}

function sortStepFixture(minorVersion)
{
    const rangeData = (registerIndex) => minorVersion === 1
        ? { bindingModel: "sm5.1-range", bindingRange: sortRange(registerIndex) }
        : {};
    const cbDeclaration = sortRegister(
        "constant_buffer",
        minorVersion === 0 ? 3 : 0,
        { swizzle: "xyzw" });
    cbDeclaration.indices = minorVersion === 0
        ? [ sortIndex(0, 3), sortIndex(1, 1) ]
        : [ sortIndex(0, 0), sortIndex(1, 3), sortIndex(2, 3) ];
    const resourceDeclaration = sortRegister("resource", 0, minorVersion === 0
        ? { componentCount: 0 }
        : { swizzle: "xyzw" });
    const uavDeclaration = sortRegister("uav", 0, minorVersion === 0
        ? { componentCount: 0 }
        : { swizzle: "xyzw" });
    if (minorVersion === 1)
    {
        resourceDeclaration.indices = [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
        uavDeclaration.indices = [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
    }

    const negatedZ = sortTemp(0, "z");
    negatedZ.modifierName = "neg";
    const body = [
        sortInstruction(minorVersion, 27, "ld", [
            sortDestination(0, "x"),
            sortImmediate([ 3, 3, 3, 3 ]),
            sortHandle(minorVersion, "resource", { swizzle: "xyzw" })
        ]),
        sortInstruction(minorVersion, 37, "imad", [
            sortDestination(0, "y"),
            sortBuiltin("input_thread_group_id"),
            sortImmediate([ 256 ]),
            sortBuiltin("input_thread_id_in_group")
        ]),
        sortInstruction(minorVersion, 47, "iadd", [
            sortDestination(0, "z"),
            sortConstantBuffer(minorVersion, "x"),
            sortImmediate([ 0xffffffff ])
        ]),
        sortInstruction(minorVersion, 57, "and", [
            sortDestination(0, "z"),
            sortTemp(0, "z"),
            sortTemp(0, "y")
        ]),
        sortInstruction(minorVersion, 67, "iadd", [
            sortDestination(0, "y"),
            negatedZ,
            sortTemp(0, "y")
        ]),
        sortInstruction(minorVersion, 77, "ishl", [
            sortDestination(0, "y"),
            sortTemp(0, "y"),
            sortImmediate([ 1 ])
        ]),
        sortInstruction(minorVersion, 87, "iadd", [
            sortDestination(0, "w"),
            sortTemp(0, "y"),
            sortConstantBuffer(minorVersion, "y")
        ]),
        sortInstruction(minorVersion, 97, "imad", [
            sortDestination(0, "w"),
            sortConstantBuffer(minorVersion, "z"),
            sortTemp(0, "z"),
            sortTemp(0, "w")
        ]),
        sortInstruction(minorVersion, 107, "ult", [
            sortDestination(0, "x"),
            sortTemp(0, "w"),
            sortTemp(0, "x")
        ]),
        sortInstruction(minorVersion, 117, "if", [
            sortTemp(0, "x")
        ], { testBoolean: "nonzero" }),
        sortInstruction(minorVersion, 127, "iadd", [
            sortDestination(0, "x"),
            sortTemp(0, "z"),
            sortTemp(0, "y")
        ]),
        sortInstruction(minorVersion, 137, "ld_structured", [
            sortDestination(0, "yz"),
            sortTemp(0, "x"),
            sortImmediate([ 0 ]),
            sortHandle(minorVersion, "uav", { swizzle: "xxyx" })
        ]),
        sortInstruction(minorVersion, 147, "ld_structured", [
            sortDestination(1, "xy"),
            sortTemp(0, "w"),
            sortImmediate([ 0 ]),
            sortHandle(minorVersion, "uav", { swizzle: "xyxx" })
        ]),
        sortInstruction(minorVersion, 157, "lt", [
            sortDestination(1, "z"),
            sortTemp(1, "y"),
            sortTemp(0, "z")
        ]),
        sortInstruction(minorVersion, 167, "if", [
            sortTemp(1, "z")
        ], { testBoolean: "nonzero" }),
        sortInstruction(minorVersion, 177, "store_structured", [
            sortHandle(minorVersion, "uav", { mask: "xy" }),
            sortTemp(0, "x"),
            sortImmediate([ 0 ]),
            sortTemp(1, "xyxx")
        ]),
        sortInstruction(minorVersion, 187, "store_structured", [
            sortHandle(minorVersion, "uav", { mask: "xy" }),
            sortTemp(0, "w"),
            sortImmediate([ 0 ]),
            sortTemp(0, "yzyy")
        ]),
        sortInstruction(minorVersion, 197, "endif", []),
        sortInstruction(minorVersion, 207, "endif", []),
        sortInstruction(minorVersion, 217, "ret", [])
    ];

    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(3, "dcl_constant_buffer", {
                accessPattern: "immediate_indexed",
                registerIndex: 3,
                sizeInVec4: 1,
                ...rangeData(3)
            }, cbDeclaration),
            declaration(7, "dcl_resource", {
                resourceDimension: 1,
                resourceDimensionName: "buffer",
                sampleCount: 0,
                returnType: typedReturn("uint"),
                registerIndex: 0,
                ...rangeData(0)
            }, resourceDeclaration),
            declaration(11, "dcl_unordered_access_view_structured", {
                globallyCoherent: false,
                structureStride: 8,
                registerIndex: 0,
                ...rangeData(0)
            }, uavDeclaration),
            declaration(15, "dcl_input", {
                registerIndex: null,
                operandType: 33,
                operandTypeName: "input_thread_group_id"
            }, sortRegister("input_thread_group_id", null, { mask: "x" })),
            declaration(17, "dcl_input", {
                registerIndex: null,
                operandType: 34,
                operandTypeName: "input_thread_id_in_group"
            }, sortRegister("input_thread_id_in_group", null, { mask: "x" })),
            declaration(19, "dcl_temps", { tempCount: 2 }),
            declaration(21, "dcl_thread_group", {
                threadGroupX: 256,
                threadGroupY: 1,
                threadGroupZ: 1
            }),
            ...body
        ]
    };
}

function sortStepIr(minorVersion)
{
    return CjsWebgpuFormat.buildShaderIr(sortStepFixture(minorVersion), {
        source: `synthetic-sort-step-sm5${minorVersion}`
    });
}

function sortInnerInstruction(minorVersion, offset, opcodeName, operands = [], values = {})
{
    const externalStructuredLoad = opcodeName === "ld_structured"
        && operands[3]?.typeName === "uav";
    const loadKind = opcodeName === "ld"
        ? "typed"
        : externalStructuredLoad
            ? "structured"
            : null;
    return instruction(offset, opcodeName, operands, {
        ...(minorVersion === 0 && loadKind
            ? { extensions: sortLoadExtensions(loadKind) }
            : {}),
        ...values
    });
}

function sortInnerFixture(minorVersion)
{
    const rangeData = minorVersion === 1
        ? { bindingModel: "sm5.1-range", bindingRange: sortRange(0) }
        : {};
    const resourceDeclaration = sortRegister("resource", 0, minorVersion === 0
        ? { componentCount: 0 }
        : { swizzle: "xyzw" });
    const uavDeclaration = sortRegister("uav", 0, minorVersion === 0
        ? { componentCount: 0 }
        : { swizzle: "xyzw" });
    if (minorVersion === 1)
    {
        resourceDeclaration.indices = [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
        uavDeclaration.indices = [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
    }
    const shared = (selector) => sortRegister(
        "thread_group_shared_memory",
        0,
        selector.length === 2 && selector === "xy"
            ? { mask: selector }
            : { swizzle: selector });
    const destination = (registerIndex, mask) => sortDestination(registerIndex, mask);
    const temp = (registerIndex, selector) => sortTemp(registerIndex, selector);
    const negated = (operand) =>
    {
        operand.modifierName = "neg";
        return operand;
    };
    let offset = 30;
    const op = (opcodeName, operands = [], values = {}) =>
    {
        const result = sortInnerInstruction(minorVersion, offset, opcodeName, operands, values);
        offset += 10;
        return result;
    };
    const body = [
        op("ld", [
            destination(0, "x"),
            sortImmediate([ 3, 3, 3, 3 ]),
            sortHandle(minorVersion, "resource", { swizzle: "xyzw" })
        ]),
        op("ishl", [
            destination(0, "y"),
            sortBuiltin("input_thread_group_id"),
            sortImmediate([ 9 ])
        ]),
        op("iadd", [
            destination(0, "y"),
            negated(temp(0, "y")),
            temp(0, "x")
        ]),
        op("imax", [ destination(0, "y"), temp(0, "y"), sortImmediate([ 0 ]) ]),
        op("imin", [ destination(0, "y"), temp(0, "y"), sortImmediate([ 512 ]) ]),
        op("imad", [
            destination(0, "z"),
            sortBuiltin("input_thread_group_id"),
            sortImmediate([ 512 ]),
            sortBuiltin("input_thread_id_in_group")
        ]),
        op("ilt", [ destination(0, "x"), temp(0, "z"), temp(0, "x") ]),
        op("if", [ temp(0, "x") ], { testBoolean: "nonzero" }),
        op("ilt", [
            destination(0, "w"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            temp(0, "y")
        ]),
        op("if", [ temp(0, "w") ], { testBoolean: "nonzero" }),
        op("ld_structured", [
            destination(1, "xy"),
            temp(0, "z"),
            sortImmediate([ 0 ]),
            sortHandle(minorVersion, "uav", { swizzle: "xyxx" })
        ]),
        op("store_structured", [
            shared("xy"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            sortImmediate([ 0 ]),
            temp(1, "xyxx")
        ]),
        op("endif"),
        op("iadd", [
            destination(0, "w"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            sortImmediate([ 256 ])
        ]),
        op("ilt", [ destination(1, "x"), temp(0, "w"), temp(0, "y") ]),
        op("if", [ temp(1, "x") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(1, "x"), temp(0, "z"), sortImmediate([ 256 ]) ]),
        op("ld_structured", [
            destination(1, "xy"),
            temp(1, "x"),
            sortImmediate([ 0 ]),
            sortHandle(minorVersion, "uav", { swizzle: "xyxx" })
        ]),
        op("store_structured", [
            shared("xy"),
            temp(0, "w"),
            sortImmediate([ 0 ]),
            temp(1, "xyxx")
        ]),
        op("endif"),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [ "threads_in_group", "thread_group_shared_memory" ]
        }),
        op("mov", [ destination(0, "w"), sortImmediate([ 256 ]) ]),
        op("loop"),
        op("ige", [ destination(1, "x"), sortImmediate([ 0 ]), temp(0, "w") ]),
        op("breakc", [ temp(1, "x") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(1, "x"), temp(0, "w"), sortImmediate([ 0xffffffff ]) ]),
        op("and", [
            destination(1, "x"),
            temp(1, "x"),
            sortBuiltin("input_thread_id_in_group_flattened")
        ]),
        op("iadd", [
            destination(1, "y"),
            negated(temp(1, "x")),
            sortBuiltin("input_thread_id_in_group_flattened")
        ]),
        op("ishl", [ destination(1, "y"), temp(1, "y"), sortImmediate([ 1 ]) ]),
        op("iadd", [ destination(1, "z"), temp(0, "w"), temp(1, "y") ]),
        op("iadd", [ destination(1, "z"), temp(1, "x"), temp(1, "z") ]),
        op("ilt", [ destination(1, "w"), temp(1, "z"), temp(0, "y") ]),
        op("if", [ temp(1, "w") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(1, "x"), temp(1, "x"), temp(1, "y") ]),
        op("ld_structured", [
            destination(1, "yw"),
            temp(1, "x"),
            sortImmediate([ 0 ]),
            shared("xxxy")
        ]),
        op("ld_structured", [
            destination(2, "xy"),
            temp(1, "z"),
            sortImmediate([ 0 ]),
            shared("xyxx")
        ]),
        op("lt", [ destination(2, "z"), temp(2, "y"), temp(1, "w") ]),
        op("if", [ temp(2, "z") ], { testBoolean: "nonzero" }),
        op("store_structured", [
            shared("xy"),
            temp(1, "x"),
            sortImmediate([ 0 ]),
            temp(2, "xyxx")
        ]),
        op("store_structured", [
            shared("xy"),
            temp(1, "z"),
            sortImmediate([ 0 ]),
            temp(1, "ywyy")
        ]),
        op("endif"),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [ "threads_in_group", "thread_group_shared_memory" ]
        }),
        op("ishr", [ destination(0, "w"), temp(0, "w"), sortImmediate([ 1 ]) ]),
        op("endloop"),
        op("if", [ temp(0, "x") ], { testBoolean: "nonzero" }),
        op("ilt", [
            destination(0, "x"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            temp(0, "y")
        ]),
        op("if", [ temp(0, "x") ], { testBoolean: "nonzero" }),
        op("ld_structured", [
            destination(0, "xw"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            sortImmediate([ 0 ]),
            shared("xxxy")
        ]),
        op("store_structured", [
            sortHandle(minorVersion, "uav", { mask: "xy" }),
            temp(0, "z"),
            sortImmediate([ 0 ]),
            temp(0, "xwxx")
        ]),
        op("endif"),
        op("iadd", [
            destination(0, "x"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            sortImmediate([ 256 ])
        ]),
        op("ilt", [ destination(0, "y"), temp(0, "x"), temp(0, "y") ]),
        op("if", [ temp(0, "y") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(0, "y"), temp(0, "z"), sortImmediate([ 256 ]) ]),
        op("ld_structured", [
            destination(0, "xz"),
            temp(0, "x"),
            sortImmediate([ 0 ]),
            shared("xxyx")
        ]),
        op("store_structured", [
            sortHandle(minorVersion, "uav", { mask: "xy" }),
            temp(0, "y"),
            sortImmediate([ 0 ]),
            temp(0, "xzxx")
        ]),
        op("endif"),
        op("endif"),
        op("ret")
    ];

    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(3, "dcl_resource", {
                resourceDimension: 1,
                resourceDimensionName: "buffer",
                sampleCount: 0,
                returnType: typedReturn("uint"),
                registerIndex: 0,
                ...rangeData
            }, resourceDeclaration),
            declaration(7, "dcl_unordered_access_view_structured", {
                globallyCoherent: false,
                structureStride: 8,
                registerIndex: 0,
                ...rangeData
            }, uavDeclaration),
            declaration(11, "dcl_input", {
                registerIndex: null,
                operandType: 36,
                operandTypeName: "input_thread_id_in_group_flattened"
            }, sortRegister("input_thread_id_in_group_flattened", null, { componentCount: 0 })),
            declaration(13, "dcl_input", {
                registerIndex: null,
                operandType: 33,
                operandTypeName: "input_thread_group_id"
            }, sortRegister("input_thread_group_id", null, { mask: "x" })),
            declaration(15, "dcl_input", {
                registerIndex: null,
                operandType: 34,
                operandTypeName: "input_thread_id_in_group"
            }, sortRegister("input_thread_id_in_group", null, { mask: "x" })),
            declaration(17, "dcl_temps", { tempCount: 3 }),
            declaration(19, "dcl_thread_group_shared_memory_structured", {
                registerIndex: 0,
                structureStride: 8,
                structureCount: 512
            }, sortRegister("thread_group_shared_memory", 0, { componentCount: 0 })),
            declaration(24, "dcl_thread_group", {
                threadGroupX: 256,
                threadGroupY: 1,
                threadGroupZ: 1
            }),
            ...body
        ]
    };
}

function sortInnerIr(minorVersion)
{
    return CjsWebgpuFormat.buildShaderIr(sortInnerFixture(minorVersion), {
        source: `synthetic-sort-inner-sm5${minorVersion}`
    });
}

function sortComputeFixture(minorVersion)
{
    const rangeData = minorVersion === 1
        ? { bindingModel: "sm5.1-range", bindingRange: sortRange(0) }
        : {};
    const resourceDeclaration = sortRegister("resource", 0, minorVersion === 0
        ? { componentCount: 0 }
        : { swizzle: "xyzw" });
    const uavDeclaration = sortRegister("uav", 0, minorVersion === 0
        ? { componentCount: 0 }
        : { swizzle: "xyzw" });
    if (minorVersion === 1)
    {
        resourceDeclaration.indices = [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
        uavDeclaration.indices = [ sortIndex(0, 0), sortIndex(1, 0), sortIndex(2, 0) ];
    }
    const shared = (selector) => sortRegister(
        "thread_group_shared_memory",
        0,
        selector === "xy" ? { mask: selector } : { swizzle: selector });
    const destination = (registerIndex, mask) => sortDestination(registerIndex, mask);
    const temp = (registerIndex, selector) => sortTemp(registerIndex, selector);
    const negated = (operand) =>
    {
        operand.modifierName = "neg";
        return operand;
    };
    let offset = 30;
    const op = (opcodeName, operands = [], values = {}) =>
    {
        const result = sortInnerInstruction(minorVersion, offset, opcodeName, operands, values);
        offset += 10;
        return result;
    };
    const body = [
        op("ld", [
            destination(0, "x"),
            sortImmediate([ 3, 3, 3, 3 ]),
            sortHandle(minorVersion, "resource", { swizzle: "xyzw" })
        ]),
        op("if", [ temp(0, "x") ], { testBoolean: "zero" }),
        op("ret"),
        op("endif"),
        op("imad", [
            destination(0, "y"),
            sortBuiltin("input_thread_group_id"),
            sortImmediate([ 512 ]),
            sortBuiltin("input_thread_id_in_group")
        ]),
        op("ishl", [
            destination(0, "z"),
            sortBuiltin("input_thread_group_id"),
            sortImmediate([ 9 ])
        ]),
        op("iadd", [ destination(0, "x"), negated(temp(0, "z")), temp(0, "x") ]),
        op("imin", [ destination(0, "x"), temp(0, "x"), sortImmediate([ 512 ]) ]),
        op("imax", [ destination(0, "x"), temp(0, "x"), sortImmediate([ 0 ]) ]),
        op("ult", [
            destination(0, "z"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            temp(0, "x")
        ]),
        op("if", [ temp(0, "z") ], { testBoolean: "nonzero" }),
        op("ld_structured", [
            destination(1, "xy"),
            temp(0, "y"),
            sortImmediate([ 0 ]),
            sortHandle(minorVersion, "uav", { swizzle: "xyxx" })
        ]),
        op("store_structured", [
            shared("xy"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            sortImmediate([ 0 ]),
            temp(1, "xyxx")
        ]),
        op("endif"),
        op("iadd", [
            destination(0, "w"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            sortImmediate([ 256 ])
        ]),
        op("ult", [ destination(1, "x"), temp(0, "w"), temp(0, "x") ]),
        op("if", [ temp(1, "x") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(1, "y"), temp(0, "y"), sortImmediate([ 256 ]) ]),
        op("ld_structured", [
            destination(1, "yz"),
            temp(1, "y"),
            sortImmediate([ 0 ]),
            sortHandle(minorVersion, "uav", { swizzle: "xxyx" })
        ]),
        op("store_structured", [
            shared("xy"),
            temp(0, "w"),
            sortImmediate([ 0 ]),
            temp(1, "yzyy")
        ]),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [ "threads_in_group", "thread_group_shared_memory" ]
        }),
        op("mov", [ destination(1, "y"), sortImmediate([ 2 ]) ]),
        op("loop"),
        op("ult", [ destination(1, "z"), sortImmediate([ 512 ]), temp(1, "y") ]),
        op("breakc", [ temp(1, "z") ], { testBoolean: "nonzero" }),
        op("ushr", [ destination(1, "z"), temp(1, "y"), sortImmediate([ 1 ]) ]),
        op("mov", [ destination(1, "w"), temp(1, "z") ]),
        op("loop"),
        op("ige", [ destination(2, "x"), sortImmediate([ 0 ]), temp(1, "w") ]),
        op("breakc", [ temp(2, "x") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(2, "x"), temp(1, "w"), sortImmediate([ 0xffffffff ]) ]),
        op("and", [
            destination(2, "x"),
            temp(2, "x"),
            sortBuiltin("input_thread_id_in_group_flattened")
        ]),
        op("iadd", [
            destination(2, "y"),
            negated(temp(2, "x")),
            sortBuiltin("input_thread_id_in_group_flattened")
        ]),
        op("ishl", [ destination(2, "y"), temp(2, "y"), sortImmediate([ 1 ]) ]),
        op("ieq", [ destination(2, "z"), temp(1, "z"), temp(1, "w") ]),
        op("ishl", [ destination(2, "w"), temp(1, "w"), sortImmediate([ 1 ]) ]),
        op("iadd", [ destination(2, "w"), temp(2, "y"), temp(2, "w") ]),
        op("iadd", [ destination(2, "w"), temp(2, "w"), negated(temp(2, "x")) ]),
        op("iadd", [ destination(2, "w"), temp(2, "w"), sortImmediate([ 0xffffffff ]) ]),
        op("iadd", [ destination(3, "x"), temp(1, "w"), temp(2, "y") ]),
        op("iadd", [ destination(3, "x"), temp(2, "x"), temp(3, "x") ]),
        op("movc", [ destination(2, "z"), temp(2, "z"), temp(2, "w"), temp(3, "x") ]),
        op("ult", [ destination(2, "w"), temp(2, "z"), temp(0, "x") ]),
        op("if", [ temp(2, "w") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(2, "x"), temp(2, "x"), temp(2, "y") ]),
        op("ld_structured", [
            destination(2, "yw"),
            temp(2, "x"),
            sortImmediate([ 0 ]),
            shared("xxxy")
        ]),
        op("ld_structured", [
            destination(3, "xy"),
            temp(2, "z"),
            sortImmediate([ 0 ]),
            shared("xyxx")
        ]),
        op("lt", [ destination(3, "z"), temp(3, "y"), temp(2, "w") ]),
        op("if", [ temp(3, "z") ], { testBoolean: "nonzero" }),
        op("store_structured", [
            shared("xy"),
            temp(2, "x"),
            sortImmediate([ 0 ]),
            temp(3, "xyxx")
        ]),
        op("store_structured", [
            shared("xy"),
            temp(2, "z"),
            sortImmediate([ 0 ]),
            temp(2, "ywyy")
        ]),
        op("endif"),
        op("endif"),
        op("sync", [], {
            syncFlags: 3,
            syncFlagNames: [ "threads_in_group", "thread_group_shared_memory" ]
        }),
        op("ishr", [ destination(1, "w"), temp(1, "w"), sortImmediate([ 1 ]) ]),
        op("endloop"),
        op("ishl", [ destination(1, "y"), temp(1, "y"), sortImmediate([ 1 ]) ]),
        op("endloop"),
        op("if", [ temp(0, "z") ], { testBoolean: "nonzero" }),
        op("ld_structured", [
            destination(0, "xz"),
            sortBuiltin("input_thread_id_in_group_flattened"),
            sortImmediate([ 0 ]),
            shared("xxyx")
        ]),
        op("store_structured", [
            sortHandle(minorVersion, "uav", { mask: "xy" }),
            temp(0, "y"),
            sortImmediate([ 0 ]),
            temp(0, "xzxx")
        ]),
        op("endif"),
        op("if", [ temp(1, "x") ], { testBoolean: "nonzero" }),
        op("iadd", [ destination(0, "x"), temp(0, "y"), sortImmediate([ 256 ]) ]),
        op("ld_structured", [
            destination(0, "yz"),
            temp(0, "w"),
            sortImmediate([ 0 ]),
            shared("xxyx")
        ]),
        op("store_structured", [
            sortHandle(minorVersion, "uav", { mask: "xy" }),
            temp(0, "x"),
            sortImmediate([ 0 ]),
            temp(0, "yzyy")
        ]),
        op("endif"),
        op("ret")
    ];

    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(3, "dcl_resource", {
                resourceDimension: 1,
                resourceDimensionName: "buffer",
                sampleCount: 0,
                returnType: typedReturn("uint"),
                registerIndex: 0,
                ...rangeData
            }, resourceDeclaration),
            declaration(7, "dcl_unordered_access_view_structured", {
                globallyCoherent: false,
                structureStride: 8,
                registerIndex: 0,
                ...rangeData
            }, uavDeclaration),
            declaration(11, "dcl_input", {
                registerIndex: null,
                operandType: 36,
                operandTypeName: "input_thread_id_in_group_flattened"
            }, sortRegister("input_thread_id_in_group_flattened", null, { componentCount: 0 })),
            declaration(13, "dcl_input", {
                registerIndex: null,
                operandType: 33,
                operandTypeName: "input_thread_group_id"
            }, sortRegister("input_thread_group_id", null, { mask: "x" })),
            declaration(15, "dcl_input", {
                registerIndex: null,
                operandType: 34,
                operandTypeName: "input_thread_id_in_group"
            }, sortRegister("input_thread_id_in_group", null, { mask: "x" })),
            declaration(17, "dcl_temps", { tempCount: 4 }),
            declaration(19, "dcl_thread_group_shared_memory_structured", {
                registerIndex: 0,
                structureStride: 8,
                structureCount: 512
            }, sortRegister("thread_group_shared_memory", 0, { componentCount: 0 })),
            declaration(24, "dcl_thread_group", {
                threadGroupX: 256,
                threadGroupY: 1,
                threadGroupZ: 1
            }),
            ...body
        ]
    };
}

function sortComputeIr(minorVersion)
{
    return CjsWebgpuFormat.buildShaderIr(sortComputeFixture(minorVersion), {
        source: `synthetic-sort-sm5${minorVersion}`
    });
}

test("compute lowering canonicalizes the exact SM5.0 and finite SM5.1 create-histograms schedules", () =>
{
    const lowered = [ 0, 1 ].map((minorVersion) =>
    {
        const ir = createHistogramsIr(minorVersion);
        const typed = lowerComputeProgram(ir);
        assert.deepEqual(typed.threadGroupSize, [ 16, 16, 1 ]);
        assert.deepEqual(typed.builtinInputs, [
            {
                builtin: "workgroup_id",
                name: "workgroup_id",
                type: "vec3<u32>"
            },
            {
                builtin: "local_invocation_id",
                name: "local_invocation_id",
                type: "vec3<u32>"
            },
            {
                builtin: "global_invocation_id",
                name: "dispatch_thread_id",
                type: "vec3<u32>"
            }
        ]);
        assert.deepEqual(typed.workgroupVariables, [
            { name: "g0", elementType: "atomic<u32>", elementCount: 64 }
        ]);
        assert.deepEqual(typed.bindings.map((binding) => ({
            symbol: binding.generatedSymbol,
            type: binding.type,
            bufferType: binding.buffer?.type ?? null,
            minBindingSize: binding.buffer?.minBindingSize ?? null,
            texture: binding.texture ?? null
        })), [
            {
                symbol: "cb0",
                type: "array<vec4<f32>, 1>",
                bufferType: "uniform",
                minBindingSize: 16,
                texture: null
            },
            {
                symbol: "t0",
                type: "texture_2d<f32>",
                bufferType: null,
                minBindingSize: null,
                texture: {
                    sampleType: "float",
                    viewDimension: "2d",
                    multisampled: false
                }
            },
            {
                symbol: "u0",
                type: "array<atomic<u32>>",
                bufferType: "storage",
                minBindingSize: 4,
                texture: null
            }
        ]);

        const serialized = JSON.stringify(typed.statements);
        assert.equal((serialized.match(/workgroupBarrier\(\)/gu) || []).length, 2);
        assert.equal((serialized.match(/atomicAdd\(&g0\[/gu) || []).length, 1);
        assert.equal((serialized.match(/atomicStore\(&u0\[/gu) || []).length, 4);
        assert.match(serialized,
            /histogram_bin >= 0 && histogram_bin < 64/u);
        assert.match(serialized,
            /output_element < \(arrayLength\(&u0\) \/ 4u\)/u);
        assert.match(serialized,
            /select\(vec4<f32>\(\), textureLoad\(t0, safe_pixel, 0\), all\(dispatch_thread_id\.xy < texture_size\)\)/u);
        assert.match(serialized, /clamp\(log_luminance \/ luminance_range, 0\.0, 1\.0\)/u);

        const shader = CjsWebgpuFormat.buildWgsl(ir);
        assert.match(shader.code,
            /var<workgroup> g0: array<atomic<u32>, 64>;/u);
        assert.match(shader.code,
            /@compute @workgroup_size\(16, 16, 1\)/u);
        assert.match(shader.code,
            /fn main\(@builtin\(workgroup_id\) workgroup_id: vec3<u32>, @builtin\(local_invocation_id\) local_invocation_id: vec3<u32>, @builtin\(global_invocation_id\) dispatch_thread_id: vec3<u32>\)/u);
        assert.equal((shader.code.match(/workgroupBarrier\(\);/gu) || []).length, 2);
        assert.equal((shader.code.match(/atomicStore\(&u0\[/gu) || []).length, 4);
        assert.ok(
            shader.code.indexOf("let screen_tiles_x")
                < shader.code.indexOf("if (initialize_bin)")
        );
        assert.ok(shader.sourceMap.some((entry) =>
            entry.instructionIndex === (minorVersion === 0 ? 34 : 2)));
        assert.ok(shader.sourceMap.some((entry) =>
            entry.instructionIndex === (minorVersion === 0 ? 32 : 33)));
        return { shader, typed };
    });

    assert.equal(lowered[0].shader.code, lowered[1].shader.code);
    assert.deepEqual(
        lowered[0].typed.bindings.map((binding) => ({
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerIndex: binding.registerIndex,
            type: binding.type,
            buffer: binding.buffer ?? null,
            texture: binding.texture ?? null
        })),
        lowered[1].typed.bindings.map((binding) => ({
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerIndex: binding.registerIndex,
            type: binding.type,
            buffer: binding.buffer ?? null,
            texture: binding.texture ?? null
        }))
    );
});

test("create-histograms compute fails closed on both schedules, numeric modifiers, barriers, ranges, and replay metadata", () =>
{
    const mutate = (minorVersion, callback) =>
    {
        const ir = structuredClone(createHistogramsIr(minorVersion));
        callback(ir);
        return ir;
    };
    const lowerTampered = (minorVersion, callback) =>
        lowerComputeProgram(mutate(minorVersion, callback));

    for (const [ minorVersion, callback, pattern ] of [
        [ 0, (ir) => {
            ir.declarations[9].data.threadGroupX = 15;
        }, /dcl_thread_group 16,16,1/u ],
        [ 0, (ir) => {
            ir.declarations[8].data.structureStride = 8;
        }, /g0 with stride 4 and 64 records/u ],
        [ 1, (ir) => {
            ir.declarations[8].data.structureCount = 63;
        }, /g0 with stride 4 and 64 records/u ],
        [ 0, (ir) => {
            ir.declarations[7].data.tempCount = 4;
        }, /SM5\.0 requires exactly three temps/u ],
        [ 1, (ir) => {
            ir.declarations[7].data.tempCount = 3;
        }, /SM5\.1 requires exactly four temps/u ],
        [ 0, (ir) => {
            ir.declarations[2].data.returnType.returnTypeNames[0] = "uint";
        }, /float texture2d t0/u ],
        [ 0, (ir) => {
            ir.declarations[3].data.globallyCoherent = true;
        }, /non-coherent typed uint Buffer u0/u ],
        [ 0, (ir) => {
            ir.declarations[3].data.returnType.returnTypes[3] = 5;
        }, /non-coherent typed uint Buffer u0/u ],
        [ 0, (ir) => {
            ir.declarations[4].operands[0].mask = "x";
        }, /exact operand/u ],
        [ 0, (ir) => {
            ir.declarations[2].tailTokens = [ 0xdecafbad ];
        }, /must not contain trailing payload words/u ]
    ])
    {
        assert.throws(
            () => lowerTampered(minorVersion, callback),
            pattern
        );
    }

    for (const [ minorVersion, callback ] of [
        [ 0, (ir) => {
            ir.instructions[34].operands[0].mask = "w";
        } ],
        [ 1, (ir) => {
            ir.instructions[2].operands[0].mask = "x";
        } ],
        [ 0, (ir) => {
            ir.instructions[17].operands[1].modifierName = "none";
        } ],
        [ 1, (ir) => {
            ir.instructions[18].operands[1].modifierName = "neg_abs";
        } ],
        [ 0, (ir) => {
            ir.instructions[23].operands[3].modifierName = "none";
        } ],
        [ 1, (ir) => {
            ir.instructions[25].operands[1].modifierName = "none";
        } ],
        [ 0, (ir) => {
            ir.instructions[25].saturate = false;
        } ],
        [ 1, (ir) => {
            ir.instructions[26].saturate = false;
        } ],
        [ 0, (ir) => {
            ir.instructions[26].operands[2]
                .immediateValues[0].uint32 = 1115684865;
        } ],
        [ 1, (ir) => {
            ir.instructions[46].operands[0].mask = "xyz";
        } ],
        [ 0, (ir) => {
            ir.instructions[12].operands[2].swizzle = "xyzw";
        } ],
        [ 1, (ir) => {
            ir.instructions[13].operands[2].swizzle = "xyzw";
        } ],
        [ 0, (ir) => {
            ir.instructions[30].opcodeName = "atomic_and";
        } ],
        [ 1, (ir) => {
            ir.instructions[34].testBoolean = "zero";
        } ],
        [ 0, (ir) => {
            ir.instructions[13].operands[1].minPrecisionName = "float_16";
        } ],
        [ 1, (ir) => {
            ir.instructions[22].preciseMask = "x";
        } ]
    ])
    {
        assert.throws(
            () => lowerTampered(minorVersion, callback),
            /exact backend opcode and operand schedule|does not match the exact operand|inconsistent envelope metadata/u
        );
    }

    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[6].syncFlags = 1;
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.instructions[33].syncFlagNames.reverse();
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[32].tailTokens = [ 0xabad1dea ];
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[0].extensions[0].token += 1;
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.instructions[13].extensions =
            createHistogramsTextureExtensions();
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.declarations[2].data.bindingRange.upperBound = 1;
    }), /finite SM5\.1 range/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.instructions[13].operands[2]
            .resourceReference.absoluteIndex.values[0] = 1;
    }), /invalid SM5\.1 resource reference/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.instructions[24].operands[3]
            .resourceReference.vectorOffset.values[0] = 1;
    }), /invalid SM5\.1 constant-buffer reference/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[21].typeInfo.rule = "move";
    }), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.controlFlow.regions[1].endInstruction -= 1;
    }), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.values.find((value) =>
            value.origin === "instruction-write").writeMask = "xyzw";
    }), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        const read = ir.instructions.find((instruction) =>
            instruction.dataflow?.reads?.some((entry) => entry.refs?.length));
        read.dataflow.reads[0].refs[0].valueId = "value-does-not-exist";
    }), /CFG, SSA, or type metadata is inconsistent/u);

    const siblingBody = structuredClone(createHistogramsIr(0));
    siblingBody.instructions.push({
        ...structuredClone(siblingBody.instructions.at(-1)),
        index: siblingBody.instructions.length,
        dxbcOffset: siblingBody.instructions.at(-1).dxbcOffset + 1
    });
    assert.throws(() => lowerComputeProgram(siblingBody),
        /WGSL compute declaration shape is not supported/u);
});

test("create-histograms compute validates the exact texture and atomic-buffer binding plan", () =>
{
    const ir = createHistogramsIr(1);
    const typed = lowerComputeProgram(ir);
    const plan = {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: 2,
        bindings: typed.bindings.map((binding) => ({
            identity: binding.identity,
            scopeIdentity: binding.scopeIdentity,
            stages: [ "compute" ],
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerSpace: binding.registerSpace,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer ?? null,
            texture: binding.texture ?? null,
            sampler: binding.sampler ?? null,
            group: binding.group,
            binding: binding.binding
        }))
    };
    assert.deepEqual(lowerComputeProgram(ir, { bindingPlan: plan }).bindings
        .map((binding) => binding.binding), [ 0, 1, 2 ]);

    const wrongTexture = structuredClone(plan);
    wrongTexture.bindings[1].texture.sampleType = "uint";
    assert.throws(
        () => lowerComputeProgram(ir, { bindingPlan: wrongTexture }),
        /invalid entry|does not match/u);

    const wrongOutput = structuredClone(plan);
    wrongOutput.bindings[2].type = "array<u32>";
    assert.throws(
        () => lowerComputeProgram(ir, { bindingPlan: wrongOutput }),
        /invalid entry|does not match/u);

    const wrongRange = structuredClone(ir);
    const sampled = wrongRange.bindings.find((binding) =>
        binding.resourceKind === "sampled-resource");
    sampled.range.upperBound = 1;
    sampled.range.registerCount = 2;
    assert.throws(
        () => lowerComputeProgram(wrongRange),
        /array or unbounded range/u);
});

function createHistogramBin(rgb, minLuminance, maxLuminance)
{
    const f32 = Math.fround;
    const linear = rgb.map((channel) =>
    {
        const low = f32(channel * f32(0.07739938050508499));
        const shifted = f32(channel + f32(0.054999999701976776));
        const scaled = f32(shifted * f32(0.9478673338890076));
        const logged = f32(Math.log2(Math.abs(scaled)));
        const powered = f32(logged * f32(2.4000000953674316));
        const high = f32(2 ** powered);
        return channel < f32(0.04044993594288826) ? low : high;
    });
    const luminance = f32(
        f32(linear[0] * f32(0.21250000596046448))
            + f32(
                f32(linear[1] * f32(0.715399980545044))
                + f32(linear[2] * f32(0.07209999859333038))
            )
    );
    const logLuminance = f32(
        f32(Math.log2(luminance) * f32(0.6931471824645996))
            - f32(minLuminance)
    );
    const range = f32(f32(maxLuminance) - f32(minLuminance));
    const divided = f32(logLuminance / range);
    const normalized = Math.min(Math.max(divided, 0), 1);
    return Math.min(Math.trunc(f32(normalized * 64)), 63);
}

function createHistogramsReference(options)
{
    const {
        width,
        height,
        groupsX,
        groupsY,
        screenTilesX,
        pixels,
        minLuminance,
        maxLuminance,
        outputInitial
    } = options;
    const output = [ ...outputInitial ];
    const recordCount = Math.floor(output.length / 4);
    for (let groupY = 0; groupY < groupsY; groupY += 1)
    {
        for (let groupX = 0; groupX < groupsX; groupX += 1)
        {
            const shared = Array(64).fill(0);
            for (let localY = 0; localY < 16; localY += 1)
            {
                for (let localX = 0; localX < 16; localX += 1)
                {
                    const x = groupX * 16 + localX;
                    const y = groupY * 16 + localY;
                    if (x >= width || y >= height) continue;
                    const pixel = pixels[y * width + x];
                    const bin = createHistogramBin(
                        pixel, minLuminance, maxLuminance);
                    shared[bin] = (shared[bin] + 1) >>> 0;
                }
            }
            const groupLinear =
                (Math.imul(groupY, screenTilesX) + groupX) >>> 0;
            for (let local = 0; local < 16; local += 1)
            {
                const element = ((groupLinear << 4) + local) >>> 0;
                if (element >= recordCount) continue;
                for (let word = 0; word < 4; word += 1)
                {
                    output[element * 4 + word] =
                        shared[local * 4 + word];
                }
            }
        }
    }
    return output;
}

function createHistogramsLoweredModel(options)
{
    const {
        width,
        height,
        groupsX,
        groupsY,
        screenTilesX,
        pixels,
        minLuminance,
        maxLuminance,
        outputInitial
    } = options;
    const output = [ ...outputInitial ];
    const completeElements = Math.floor(output.length / 4);
    const canonicalScreenTilesX = screenTilesX >>> 0;
    for (let groupY = 0; groupY < groupsY; groupY += 1)
    {
        for (let groupX = 0; groupX < groupsX; groupX += 1)
        {
            const shared = Array(64).fill(0);
            for (let localIndex = 0; localIndex < 256; localIndex += 1)
            {
                const localX = localIndex & 15;
                const localY = localIndex >>> 4;
                const x = groupX * 16 + localX;
                const y = groupY * 16 + localY;
                if (x >= width || y >= height) continue;
                const bin = createHistogramBin(
                    pixels[y * width + x],
                    minLuminance,
                    maxLuminance
                );
                if (bin >= 0 && bin < 64)
                {
                    shared[bin] = (shared[bin] + 1) >>> 0;
                }
            }
            const groupLinear = (
                Math.imul(groupY, canonicalScreenTilesX) + groupX) >>> 0;
            for (let localIndex = 0; localIndex < 16; localIndex += 1)
            {
                const outputElement =
                    ((groupLinear << 4) + localIndex) >>> 0;
                if (outputElement >= completeElements) continue;
                const histogramBase = localIndex << 2;
                for (let word = 0; word < 4; word += 1)
                {
                    output[outputElement * 4 + word] =
                        shared[histogramBase + word];
                }
            }
        }
    }
    return output;
}

test("create-histograms CPU property oracle preserves finite bins, dispatch coverage, and complete uint4 stores", () =>
{
    let state = 0x91e10da5;
    const random = () =>
    {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    const cases = [];
    for (let index = 0; index < 160; index += 1)
    {
        const width = 1 + random() % 35;
        const height = 1 + random() % 35;
        const groupsX = Math.ceil(width / 16) + random() % 2;
        const groupsY = Math.ceil(height / 16) + random() % 2;
        const screenTilesX = groupsX + random() % 3;
        const outputLength = random()
            % (screenTilesX * groupsY * 64 + 9);
        const outputInitial = Array.from(
            { length: outputLength },
            () => random()
        );
        const pixels = Array.from(
            { length: width * height },
            () => [
                Math.fround((1 + random() % 10000) / 10000),
                Math.fround((1 + random() % 10000) / 10000),
                Math.fround((1 + random() % 10000) / 10000)
            ]
        );
        cases.push({
            width,
            height,
            groupsX,
            groupsY,
            screenTilesX,
            pixels,
            minLuminance: -10,
            maxLuminance: 4,
            outputInitial
        });
    }
    for (const options of cases)
    {
        const lowered = createHistogramsLoweredModel(options);
        const reference = createHistogramsReference(options);
        assert.deepEqual(lowered, reference);
        for (const pixel of options.pixels)
        {
            const bin = createHistogramBin(
                pixel, options.minLuminance, options.maxLuminance);
            assert.ok(bin >= 0 && bin < 64);
        }
    }
});

test("compute lowering emits pair-identical exact SM5.0 and finite SM5.1 merge-histograms profiles", () =>
{
    const lowered = [ 0, 1 ].map((minorVersion) =>
    {
        const ir = mergeHistogramsIr(minorVersion);
        const typed = lowerComputeProgram(ir);
        assert.deepEqual(typed.threadGroupSize, [ 256, 1, 1 ]);
        assert.deepEqual(typed.builtinInputs, [
            {
                builtin: "local_invocation_id",
                name: "local_invocation_id",
                type: "vec3<u32>"
            },
            {
                builtin: "global_invocation_id",
                name: "dispatch_thread_id",
                type: "vec3<u32>"
            }
        ]);
        assert.deepEqual(typed.workgroupVariables, [
            { name: "g0", elementType: "atomic<u32>", elementCount: 64 }
        ]);
        assert.deepEqual(typed.bindings.map((binding) => ({
            symbol: binding.generatedSymbol,
            type: binding.type,
            stride: binding.structureStride ?? null,
            bufferType: binding.buffer.type,
            minBindingSize: binding.buffer.minBindingSize
        })), [
            {
                symbol: "cb0",
                type: "array<vec4<f32>, 1>",
                stride: null,
                bufferType: "uniform",
                minBindingSize: 16
            },
            {
                symbol: "t0",
                type: "array<u32>",
                stride: null,
                bufferType: "read-only-storage",
                minBindingSize: 4
            },
            {
                symbol: "u0",
                type: "array<atomic<u32>>",
                stride: null,
                bufferType: "storage",
                minBindingSize: 4
            }
        ]);

        const serialized = JSON.stringify(typed.statements);
        assert.equal((serialized.match(/workgroupBarrier\(\)/gu) || []).length, 2);
        assert.equal((serialized.match(/atomicAdd\(&g0\[/gu) || []).length, 4);
        assert.equal((serialized.match(/atomicAdd\(&u0\[/gu) || []).length, 1);
        assert.match(serialized, /arrayLength\(&t0\) \/ 4u/u);
        assert.equal((serialized.match(/< \(arrayLength\(&t0\) \/ 4u\)/gu) || []).length, 4);
        assert.match(serialized, /local_invocation_id\.x < arrayLength\(&u0\)/u);
        assert.match(serialized,
            /\(dispatch_thread_id\.x << 0x00000006u\)/u);
        assert.match(serialized, /\(r0\.y >> 0x00000002u\)/u);

        const shader = CjsWebgpuFormat.buildWgsl(ir);
        assert.match(shader.code,
            /var<workgroup> g0: array<atomic<u32>, 64>;/u);
        assert.match(shader.code,
            /@compute @workgroup_size\(256, 1, 1\)/u);
        assert.equal((shader.code.match(/workgroupBarrier\(\);/gu) || []).length, 2);
        assert.equal((shader.code.match(/atomicAdd\(&g0\[/gu) || []).length, 4);
        assert.match(shader.code,
            /if \(local_invocation_id\.x < arrayLength\(&u0\)\)/u);
        assert.ok(shader.sourceMap.some((entry) =>
            entry.instructionIndex === 4));
        assert.ok(shader.sourceMap.some((entry) =>
            entry.instructionIndex === 29));
        assert.ok(shader.sourceMap.some((entry) =>
            entry.instructionIndex === 32));
        return { shader, typed };
    });

    const comparable = ({ typed }) => ({
        builtinInputs: typed.builtinInputs,
        threadGroupSize: typed.threadGroupSize,
        workgroupVariables: typed.workgroupVariables,
        bindings: typed.bindings.map((binding) => ({
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer
        })),
        statements: typed.statements
    });
    assert.deepEqual(comparable(lowered[0]), comparable(lowered[1]));
    assert.equal(lowered[0].shader.code, lowered[1].shader.code);
});

test("merge-histograms compute profile fails closed on declarations, body, barriers, ranges, and replay metadata", () =>
{
    const mutate = (minorVersion, callback) =>
    {
        const ir = structuredClone(mergeHistogramsIr(minorVersion));
        callback(ir);
        return ir;
    };
    const lowerTampered = (minorVersion, callback) =>
        lowerComputeProgram(mutate(minorVersion, callback));

    for (const [ callback, pattern ] of [
        [ (ir) => { ir.declarations[8].data.threadGroupX = 255; },
            /dcl_thread_group 256,1,1/u ],
        [ (ir) => { ir.declarations[7].data.structureStride = 8; },
            /g0 with stride 4 and 64 records/u ],
        [ (ir) => { ir.declarations[7].data.structureCount = 63; },
            /g0 with stride 4 and 64 records/u ],
        [ (ir) => { ir.declarations[6].data.tempCount = 3; },
            /exactly four temps/u ],
        [ (ir) => {
            ir.declarations[2].data.returnType.returnTypes[0] = 5;
        }, /typed uint Buffer t0/u ],
        [ (ir) => {
            ir.declarations[3].data.returnType.returnTypeNames[2] = "sint";
        }, /typed uint Buffer u0/u ],
        [ (ir) => {
            ir.declarations[4].data.operandType = 32;
        }, /input_thread_id_in_group/u ],
        [ (ir) => {
            ir.declarations[1].tailTokens = [ 0xdecafbad ];
        }, /must not contain trailing payload words/u ]
    ])
    {
        assert.throws(() => lowerTampered(0, callback), pattern);
    }

    for (const callback of [
        (ir) => { ir.instructions[0].operands[2].immediateValues[0].uint32 = 63; },
        (ir) => { ir.instructions[5].operands[1].swizzle = "xyxy"; },
        (ir) => { ir.instructions[9].operands[2].immediateValues[0].uint32 = 5; },
        (ir) => { ir.instructions[15].operands[2].immediateValues[0].uint32 = 63; },
        (ir) => { ir.instructions[19].operands[2].swizzle = "xxxx"; },
        (ir) => { ir.instructions[20].operands[1].swizzle = "xxxx"; },
        (ir) => { ir.instructions[26].operands[2].immediateValues[0].uint32 = 8; },
        (ir) => { ir.instructions[31].operands[2].immediateValues[0].uint32 = 4; },
        (ir) => { ir.instructions[32].operands[2].selected = "y"; },
        (ir) => { ir.instructions[24].opcodeName = "atomic_and"; },
        (ir) => { ir.instructions[1].testBoolean = "zero"; }
    ])
    {
        assert.throws(() => lowerTampered(0, callback),
            /exact bounded body opcode, operand, and modifier sequence|inconsistent envelope metadata/u);
    }

    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[4].syncFlags = 1;
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[29].syncFlagNames.reverse();
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[29].tailTokens = [ 0xabad1dea ];
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[19].extensions[0].token += 1;
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[31].extensions = sortLoadExtensions("structured");
    }), /inconsistent envelope metadata/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.declarations[2].data.bindingRange.upperBound = 1;
    }), /finite SM5\.1 range/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.instructions[19].operands[2].resourceReference.rangeId = 1;
    }), /invalid SM5\.1 resource reference/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.instructions[5].operands[1]
            .resourceReference.vectorOffset.values[0] = 1;
    }), /invalid SM5\.1 constant-buffer reference/u);
    assert.throws(() => lowerTampered(1, (ir) =>
    {
        ir.instructions[32].operands[0].resourceReference.absoluteIndex
            .values[0] = 1;
    }), /invalid SM5\.1 resource reference/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.instructions[15].typeInfo.rule = "integer";
    }), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.controlFlow.regions[2].endInstruction -= 1;
    }), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        ir.values.find((value) =>
            value.origin === "control-flow-merge").writeMask = "xy";
    }), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerTampered(0, (ir) =>
    {
        const read = ir.instructions.find((instruction) =>
            instruction.dataflow?.reads?.some((entry) => entry.refs?.length));
        read.dataflow.reads[0].refs[0].valueId = "value-does-not-exist";
    }), /CFG, SSA, or type metadata is inconsistent/u);

    const siblingBody = structuredClone(mergeHistogramsIr(0));
    siblingBody.instructions.push({
        ...structuredClone(siblingBody.instructions.at(-1)),
        index: siblingBody.instructions.length,
        dxbcOffset: siblingBody.instructions.at(-1).dxbcOffset + 1
    });
    assert.throws(() => lowerComputeProgram(siblingBody),
        /WGSL compute declaration shape is not supported/u);
});

test("merge-histograms compute validates exact binding plans and finite raw ranges", () =>
{
    const ir = mergeHistogramsIr(1);
    const typed = lowerComputeProgram(ir);
    const plan = {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: 2,
        bindings: typed.bindings.map((binding) => ({
            identity: binding.identity,
            scopeIdentity: binding.scopeIdentity,
            stages: [ "compute" ],
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerSpace: binding.registerSpace,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer,
            texture: binding.texture ?? null,
            sampler: binding.sampler ?? null,
            group: binding.group,
            binding: binding.binding
        }))
    };
    assert.deepEqual(lowerComputeProgram(ir, { bindingPlan: plan }).bindings
        .map((binding) => binding.binding), [ 0, 1, 2 ]);

    const wrongOutput = structuredClone(plan);
    wrongOutput.bindings[2].type = "array<u32>";
    assert.throws(
        () => lowerComputeProgram(ir, { bindingPlan: wrongOutput }),
        /invalid entry|does not match/u);

    const wrongInput = structuredClone(plan);
    wrongInput.bindings[1].buffer.minBindingSize = 16;
    assert.throws(
        () => lowerComputeProgram(ir, { bindingPlan: wrongInput }),
        /invalid entry|does not match/u);

    const wrongRange = structuredClone(ir);
    const sampled = wrongRange.bindings.find((binding) =>
        binding.resourceKind === "sampled-resource");
    sampled.range.upperBound = 1;
    sampled.range.registerCount = 2;
    assert.throws(
        () => lowerComputeProgram(wrongRange),
        /array or unbounded range/u);
});

function mergeHistogramsReference({
    dimensionX,
    dimensionY,
    dispatchCount,
    inputWords,
    outputLength
})
{
    const output = Array(outputLength).fill(0);
    const activeCount = Math.imul(dimensionX >>> 0, dimensionY >>> 0) >>> 0;
    const groupCount = Math.ceil(dispatchCount / 256);
    for (let group = 0; group < groupCount; group += 1)
    {
        const shared = Array(64).fill(0);
        for (let local = 0; local < 256; local += 1)
        {
            const global = group * 256 + local;
            if (global >= dispatchCount || global >= activeCount) continue;
            const recordBase = (global * 64) >>> 2;
            for (let bin = 0; bin < 64; bin += 4)
            {
                const record = recordBase + (bin >>> 2);
                const wordBase = record * 4;
                const lanes = wordBase + 3 < inputWords.length
                    ? inputWords.slice(wordBase, wordBase + 4)
                    : [ 0, 0, 0, 0 ];
                for (let lane = 0; lane < 4; lane += 1)
                {
                    shared[bin + lane] =
                        (shared[bin + lane] + lanes[lane]) >>> 0;
                }
            }
        }
        for (let bin = 0; bin < Math.min(64, outputLength); bin += 1)
        {
            output[bin] = (output[bin] + shared[bin]) >>> 0;
        }
    }
    return output;
}

function mergeHistogramsLoweredModel(options)
{
    const {
        dimensionX,
        dimensionY,
        dispatchCount,
        inputWords,
        outputLength
    } = options;
    const output = Array(outputLength).fill(0);
    const activeCount = Math.imul(dimensionX >>> 0, dimensionY >>> 0) >>> 0;
    const recordCount = Math.floor(inputWords.length / 4);
    const groupCount = Math.ceil(dispatchCount / 256);
    for (let group = 0; group < groupCount; group += 1)
    {
        const shared = Array(64).fill(0);
        for (let local = 0; local < 256; local += 1)
        {
            const global = group * 256 + local;
            if (global >= dispatchCount || global >= activeCount) continue;
            const recordBase = ((global << 6) >>> 2) >>> 0;
            for (let bin = 0; bin < 64; bin += 4)
            {
                const record = (recordBase + (bin >>> 2)) >>> 0;
                for (let lane = 0; lane < 4; lane += 1)
                {
                    const value = record < recordCount
                        ? inputWords[record * 4 + lane] >>> 0
                        : 0;
                    shared[bin + lane] =
                        (shared[bin + lane] + value) >>> 0;
                }
            }
        }
        for (let local = 0; local < 64; local += 1)
        {
            if (local < outputLength)
            {
                output[local] = (output[local] + shared[local]) >>> 0;
            }
        }
    }
    return output;
}

test("merge-histograms CPU property oracle preserves uint atomic sums and complete-record OOB semantics", () =>
{
    let state = 0xc0ffee01;
    const random = () =>
    {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    const cases = [
        {
            dimensionX: 1,
            dimensionY: 1,
            dispatchCount: 1,
            inputWords: [ 0xffffffff, 2, 3, 4 ],
            outputLength: 64
        },
        {
            dimensionX: 4,
            dimensionY: 2,
            dispatchCount: 8,
            inputWords: [ 9, 8, 7 ],
            outputLength: 3
        }
    ];
    for (let index = 0; index < 400; index += 1)
    {
        const active = random() % 24;
        const dimensionX = random() % 9;
        const dimensionY = dimensionX === 0
            ? random() % 9
            : Math.ceil(active / dimensionX);
        const inputLength = random() % (active * 64 + 13);
        cases.push({
            dimensionX,
            dimensionY,
            dispatchCount: random() % 40,
            inputWords: Array.from(
                { length: inputLength },
                () => random()
            ),
            outputLength: random() % 70
        });
    }
    for (const options of cases)
    {
        assert.deepEqual(
            mergeHistogramsLoweredModel(options),
            mergeHistogramsReference(options)
        );
    }
});

test("compute lowering emits equivalent exact SM5.0 and finite SM5.1 chunk-sort profiles", () =>
{
    const lowered = [ 0, 1 ].map((minorVersion) =>
    {
        const ir = sortComputeIr(minorVersion);
        const typed = lowerComputeProgram(ir);
        assert.deepEqual(typed.threadGroupSize, [ 256, 1, 1 ]);
        assert.deepEqual(typed.builtinInputs, [
            { builtin: "workgroup_id", name: "workgroup_id", type: "vec3<u32>" },
            { builtin: "local_invocation_id", name: "local_invocation_id", type: "vec3<u32>" }
        ]);
        assert.deepEqual(typed.workgroupVariables, [
            { name: "g0", elementType: "u32", elementCount: 1024 }
        ]);
        assert.deepEqual(typed.bindings.map((entry) => ({
            symbol: entry.generatedSymbol,
            type: entry.type,
            stride: entry.structureStride ?? null,
            bufferType: entry.buffer.type,
            minBindingSize: entry.buffer.minBindingSize
        })), [
            { symbol: "t0", type: "array<u32>", stride: null, bufferType: "read-only-storage", minBindingSize: 4 },
            { symbol: "u0", type: "array<u32>", stride: 8, bufferType: "storage", minBindingSize: 8 }
        ]);

        const serialized = JSON.stringify(typed.statements);
        assert.equal((serialized.match(/"kind":"return"/gu) || []).length, 1);
        assert.doesNotMatch(serialized, /"instructionIndex":(?:1|2|3),/u);
        assert.match(serialized, /"name":"merge_width"/u);
        assert.match(serialized, /"name":"merge_done"/u);
        assert.match(serialized, /"name":"half_width"/u);
        assert.match(serialized, /"name":"stride"/u);
        assert.match(serialized, /"name":"stride_done"/u);
        const outerLoop = typed.statements.find((statement) => statement.kind === "loop");
        const innerLoop = outerLoop?.statements.find((statement) => statement.kind === "loop");
        assert.ok(outerLoop && innerLoop);
        assert.doesNotMatch(JSON.stringify(outerLoop), /r1\.y/u);
        assert.doesNotMatch(JSON.stringify(innerLoop), /r1\.w/u);
        assert.deepEqual(outerLoop.statements.find((statement) =>
            statement.instructionIndex === 25)?.condition, { code: "merge_done", type: "bool" });
        assert.deepEqual(innerLoop.statements.find((statement) =>
            statement.instructionIndex === 30)?.condition, { code: "stride_done", type: "bool" });
        assert.match(serialized, /select\(r3\.x, r2\.w, r2\.z != 0u\)/u);
        assert.match(serialized, /bitcast<i32>\(half_width\) == bitcast<i32>\(stride\)/u);
        assert.match(serialized, /select\(0u, 0xffffffffu, local_invocation_id\.x < r0\.x\)/u);
        assert.equal((serialized.match(/workgroupBarrier\(\)/gu) || []).length, 2);
        assert.equal((serialized.match(/select\(0u, u0\[/gu) || []).length, 4);
        assert.equal((serialized.match(/< \(arrayLength\(&u0\) \/ 2u\)/gu) || []).length, 6);

        const shader = CjsWebgpuFormat.buildWgsl(ir);
        assert.match(shader.code, /var<workgroup> g0: array<u32, 1024>;/u);
        assert.match(shader.code, /var merge_width: u32 = 0x00000002u;/u);
        assert.match(shader.code, /let merge_done: bool = 0x00000200u < merge_width;/u);
        assert.match(shader.code, /let half_width: u32 = \(merge_width >> 0x00000001u\);/u);
        assert.match(shader.code, /var stride: u32 = half_width;/u);
        assert.match(shader.code,
            /let stride_done: bool = bitcast<i32>\(0x00000000u\) >= bitcast<i32>\(stride\);/u);
        assert.doesNotMatch(shader.code, /if \(r0\.x == 0u\)/u);
        assert.equal((shader.code.match(/workgroupBarrier\(\);/gu) || []).length, 2);
        assert.ok(!shader.sourceMap.some((entry) => [ 1, 2, 3 ].includes(entry.instructionIndex)));
        assert.ok(shader.sourceMap.some((entry) => entry.instructionIndex === 42));
        return { typed, shader };
    });

    const comparable = ({ typed }) => ({
        builtinInputs: typed.builtinInputs,
        threadGroupSize: typed.threadGroupSize,
        workgroupVariables: typed.workgroupVariables,
        bindings: typed.bindings.map((binding) => ({
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer
        })),
        statements: typed.statements
    });
    assert.deepEqual(comparable(lowered[0]), comparable(lowered[1]));
    assert.equal(lowered[0].shader.code, lowered[1].shader.code);
});

test("chunk-sort compute profile fails closed on declarations, body, barriers, ranges, and replay metadata", () =>
{
    const mutate = (minorVersion, callback) =>
    {
        const ir = structuredClone(sortComputeIr(minorVersion));
        callback(ir);
        return ir;
    };

    for (const [ callback, pattern ] of [
        [ (ir) => { ir.declarations[8].data.threadGroupX = 255; }, /dcl_thread_group 256,1,1/u ],
        [ (ir) => { ir.declarations[7].data.structureStride = 4; }, /g0 with stride 8 and 512 records/u ],
        [ (ir) => { ir.declarations[7].data.structureCount = 511; }, /g0 with stride 8 and 512 records/u ],
        [ (ir) => { ir.declarations[7].tailTokens = [ 0xdecafbad ]; }, /must not contain trailing payload words/u ],
        [ (ir) => { ir.declarations[3].data.operandType = 34; }, /input_thread_id_in_group_flattened/u ],
        [ (ir) => { ir.declarations[6].data.tempCount = 5; }, /exactly four temps/u ]
    ])
    {
        assert.throws(() => lowerComputeProgram(mutate(0, callback)), pattern);
    }

    for (const callback of [
        (ir) => { ir.instructions[6].operands[1].modifierName = "none"; },
        (ir) => { ir.instructions[6].operands[1].modifierName = "abs"; },
        (ir) => { ir.instructions[33].operands[1].modifierName = "none"; },
        (ir) => { ir.instructions[38].operands[2].modifierName = "none"; },
        (ir) => { ir.instructions[38].operands[2].minPrecisionName = "float_16"; },
        (ir) => { ir.instructions[1].testBoolean = "nonzero"; },
        (ir) => { ir.instructions[10].testBoolean = "zero"; },
        (ir) => { ir.instructions[24].operands[1].immediateValues[0].uint32 = 511; },
        (ir) => { ir.instructions[35].opcodeName = "ine"; },
        (ir) => { ir.instructions[42].operands[2].swizzle = "x"; },
        (ir) => { ir.instructions[60].operands[0].mask = "x"; }
    ])
    {
        assert.throws(() => lowerComputeProgram(mutate(0, callback)),
            /exact bounded body opcode, operand, and modifier sequence|inconsistent envelope metadata/u);
    }

    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[21].syncFlags = 1;
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[54].syncFlagNames.reverse();
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[54].tailTokens = [ 0xabad1dea ];
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[0].extensions[0].token += 1;
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[46].extensions = sortLoadExtensions("structured");
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.declarations[1].data.bindingRange.upperBound = 1;
    })), /finite SM5\.1 range/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.instructions[18].operands[3].resourceReference.rangeId = 1;
    })), /invalid SM5\.1 resource reference/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.instructions[46].operands[3].resourceReference = {
            bindingModel: "sm5.1-range"
        };
    })), /unexpected resource reference metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[35].typeInfo.rule = "integer";
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.controlFlow.regions[4].endInstruction -= 1;
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.values[0].writeMask = "xy";
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        const read = ir.instructions.find((instruction) =>
            instruction.dataflow?.reads?.some((entry) => entry.refs?.length));
        read.dataflow.reads[0].refs[0].valueId = "value-does-not-exist";
    })), /CFG, SSA, or type metadata is inconsistent/u);

    const siblingBody = structuredClone(sortComputeIr(0));
    siblingBody.instructions.push({
        ...structuredClone(siblingBody.instructions.at(-1)),
        index: siblingBody.instructions.length,
        dxbcOffset: siblingBody.instructions.at(-1).dxbcOffset + 1
    });
    assert.throws(() => lowerComputeProgram(siblingBody),
        /WGSL compute declaration shape is not supported/u);
});

test("chunk-sort compute validates exact binding plans and finite raw ranges", () =>
{
    const ir = sortComputeIr(1);
    const typed = lowerComputeProgram(ir);
    const plan = {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: 2,
        bindings: typed.bindings.map((binding) => ({
            identity: binding.identity,
            scopeIdentity: binding.scopeIdentity,
            stages: [ "compute" ],
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerSpace: binding.registerSpace,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer,
            texture: binding.texture ?? null,
            sampler: binding.sampler ?? null,
            group: binding.group,
            binding: binding.binding
        }))
    };
    assert.deepEqual(lowerComputeProgram(ir, { bindingPlan: plan }).bindings
        .map((binding) => binding.binding), [ 0, 1 ]);

    const wrongType = structuredClone(plan);
    wrongType.bindings[0].type = "array<i32>";
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongType }),
        /invalid entry|does not match/u);

    const wrongStride = structuredClone(plan);
    wrongStride.bindings[1].structureStride = 4;
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongStride }),
        /invalid entry|does not match/u);

    const wrongRange = structuredClone(ir);
    const sampled = wrongRange.bindings.find((binding) =>
        binding.resourceKind === "sampled-resource");
    sampled.range.upperBound = 1;
    sampled.range.registerCount = 2;
    assert.throws(() => lowerComputeProgram(wrongRange), /array or unbounded range/u);
});

test("compute lowering emits equivalent bounded SM5.0 and finite SM5.1 sort-inner profiles", () =>
{
    const typedPrograms = [ 0, 1 ].map((minorVersion) =>
    {
        const ir = sortInnerIr(minorVersion);
        const typed = lowerComputeProgram(ir);
        assert.equal(typed.stage, "compute");
        assert.deepEqual(typed.threadGroupSize, [ 256, 1, 1 ]);
        assert.deepEqual(typed.builtinInputs, [
            { builtin: "workgroup_id", name: "workgroup_id", type: "vec3<u32>" },
            { builtin: "local_invocation_id", name: "local_invocation_id", type: "vec3<u32>" }
        ]);
        assert.deepEqual(typed.workgroupVariables, [
            { name: "g0", elementType: "u32", elementCount: 1024 }
        ]);
        assert.deepEqual(typed.bindings.map((binding) => ({
            symbol: binding.generatedSymbol,
            type: binding.type,
            stride: binding.structureStride ?? null,
            bufferType: binding.buffer.type,
            minBindingSize: binding.buffer.minBindingSize
        })), [
            { symbol: "t0", type: "array<u32>", stride: null, bufferType: "read-only-storage", minBindingSize: 4 },
            { symbol: "u0", type: "array<u32>", stride: 8, bufferType: "storage", minBindingSize: 8 }
        ]);

        const serialized = JSON.stringify(typed.statements);
        assert.match(serialized, /0u - r0\.y/u);
        assert.match(serialized, /0u - r1\.x/u);
        assert.match(serialized, /bitcast<i32>\(r0\.z\) < bitcast<i32>\(r0\.x\)/u);
        assert.match(serialized, /bitcast<f32>\(r2\.y\) < bitcast<f32>\(r1\.w\)/u);
        assert.match(serialized, /"kind":"loop"/u);
        assert.match(serialized, /"name":"stride"/u);
        assert.match(serialized, /"name":"stride_done"/u);
        const loopStatement = typed.statements.find((statement) => statement.kind === "loop");
        assert.ok(loopStatement);
        assert.doesNotMatch(JSON.stringify(loopStatement), /r0\.w/u);
        const loopBreak = loopStatement.statements.find((statement) =>
            statement.instructionIndex === 25);
        assert.equal(loopBreak?.kind, "if");
        assert.deepEqual(loopBreak.condition, { code: "stride_done", type: "bool" });
        assert.doesNotMatch(JSON.stringify(loopBreak.condition), /r1\.x/u);
        assert.equal((serialized.match(/workgroupBarrier\(\)/gu) || []).length, 2);
        assert.equal((serialized.match(/select\(0u, u0\[/gu) || []).length, 4);
        assert.equal((serialized.match(/< \(arrayLength\(&u0\) \/ 2u\)/gu) || []).length, 6);

        const shader = CjsWebgpuFormat.buildWgsl(ir);
        assert.match(shader.code, /var<workgroup> g0: array<u32, 1024>;/u);
        assert.match(shader.code,
            /fn main\(@builtin\(workgroup_id\) workgroup_id: vec3<u32>, @builtin\(local_invocation_id\) local_invocation_id: vec3<u32>\)/u);
        assert.match(shader.code, /@compute @workgroup_size\(256, 1, 1\)/u);
        assert.match(shader.code, /var stride: u32 = 0x00000100u;/u);
        assert.match(shader.code,
            /let stride_done: bool = bitcast<i32>\(0x00000000u\) >= bitcast<i32>\(stride\);/u);
        assert.match(shader.code, /if \(stride_done\)/u);
        assert.match(shader.code, /loop\n\s+\{/u);
        assert.match(shader.code, /stride = bitcast<u32>\(bitcast<i32>\(stride\) >> 0x00000001u\);/u);
        assert.equal((shader.code.match(/workgroupBarrier\(\);/gu) || []).length, 2);
        assert.ok(shader.sourceMap.some((entry) => entry.instructionIndex === 39));
        assert.ok(shader.sourceMap.some((entry) => entry.instructionIndex === 50));
        return typed;
    });

    const comparable = (typed) => ({
        builtinInputs: typed.builtinInputs,
        threadGroupSize: typed.threadGroupSize,
        workgroupVariables: typed.workgroupVariables,
        bindings: typed.bindings.map((binding) => ({
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer
        })),
        statements: typed.statements
    });
    assert.deepEqual(comparable(typedPrograms[0]), comparable(typedPrograms[1]));
});

test("sort-inner compute profile fails closed on declarations, body, barriers, ranges, and replay metadata", () =>
{
    const mutate = (minorVersion, callback) =>
    {
        const ir = structuredClone(sortInnerIr(minorVersion));
        callback(ir);
        return ir;
    };

    for (const [ callback, pattern ] of [
        [ (ir) => { ir.declarations[8].data.threadGroupX = 255; }, /dcl_thread_group 256,1,1/u ],
        [ (ir) => { ir.declarations[7].data.structureStride = 4; }, /g0 with stride 8 and 512 records/u ],
        [ (ir) => { ir.declarations[7].data.structureCount = 511; }, /g0 with stride 8 and 512 records/u ],
        [ (ir) => { ir.declarations[7].tailTokens = [ 0xdecafbad ]; }, /must not contain trailing payload words/u ],
        [ (ir) => { ir.declarations[3].data.operandType = 34; }, /input_thread_id_in_group_flattened/u ],
        [ (ir) => { ir.declarations[6].data.tempCount = 4; }, /exactly three temps/u ]
    ])
    {
        assert.throws(() => lowerComputeProgram(mutate(0, callback)), pattern);
    }

    for (const callback of [
        (ir) => { ir.instructions[2].operands[1].modifierName = "none"; },
        (ir) => { ir.instructions[2].operands[1].modifierName = "abs"; },
        (ir) => { ir.instructions[28].operands[1].modifierName = "none"; },
        (ir) => { ir.instructions[28].operands[1].modifierName = "abs"; },
        (ir) => { ir.instructions[28].operands[1].minPrecisionName = "float_16"; },
        (ir) => { ir.instructions[0].operands[1].immediateValues[3].uint32 = 4; },
        (ir) => { ir.instructions[35].operands[3].swizzle = "xyxy"; },
        (ir) => { ir.instructions[39].operands[0].mask = "x"; },
        (ir) => { ir.instructions[37].opcodeName = "ult"; }
    ])
    {
        assert.throws(() => lowerComputeProgram(mutate(0, callback)),
            /exact bounded body opcode, operand, and modifier sequence/u);
    }

    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[21].syncFlags = 1;
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[43].syncFlagNames.reverse();
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[43].tailTokens = [ 0xabad1dea ];
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[10].extensions[0].token += 1;
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[35].extensions = sortLoadExtensions("structured");
    })), /inconsistent envelope metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.declarations[1].data.bindingRange.upperBound = 1;
    })), /finite SM5\.1 range/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.instructions[17].operands[3].resourceReference.rangeId = 1;
    })), /invalid SM5\.1 resource reference/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.instructions[35].operands[3].resourceReference = {
            bindingModel: "sm5.1-range"
        };
    })), /unexpected resource reference metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[37].typeInfo.rule = "integer";
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.controlFlow.regions[3].endInstruction -= 1;
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.values.find((value) => value.id === "value123").writeMask = "x";
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[24].dataflow.reads[0].refs[0].valueId = "value166";
    })), /CFG, SSA, or type metadata is inconsistent/u);

    const siblingBody = structuredClone(sortInnerIr(0));
    siblingBody.instructions.push({
        ...structuredClone(siblingBody.instructions.at(-1)),
        index: siblingBody.instructions.length,
        dxbcOffset: siblingBody.instructions.at(-1).dxbcOffset + 1
    });
    assert.throws(() => lowerComputeProgram(siblingBody),
        /WGSL compute declaration shape is not supported/u);
});

test("sort-inner compute validates exact binding plans and finite raw ranges", () =>
{
    const ir = sortInnerIr(1);
    const typed = lowerComputeProgram(ir);
    const plan = {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: 2,
        bindings: typed.bindings.map((binding) => ({
            identity: binding.identity,
            scopeIdentity: binding.scopeIdentity,
            stages: [ "compute" ],
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerSpace: binding.registerSpace,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer,
            texture: binding.texture ?? null,
            sampler: binding.sampler ?? null,
            group: binding.group,
            binding: binding.binding
        }))
    };
    assert.deepEqual(lowerComputeProgram(ir, { bindingPlan: plan }).bindings
        .map((binding) => binding.binding), [ 0, 1 ]);

    const wrongType = structuredClone(plan);
    wrongType.bindings[0].type = "array<i32>";
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongType }),
        /invalid entry|does not match/u);

    const wrongStride = structuredClone(plan);
    wrongStride.bindings[1].structureStride = 4;
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongStride }),
        /invalid entry|does not match/u);

    const wrongRange = structuredClone(ir);
    const sampled = wrongRange.bindings.find((binding) =>
        binding.resourceKind === "sampled-resource");
    sampled.range.upperBound = 1;
    sampled.range.registerCount = 2;
    assert.throws(() => lowerComputeProgram(wrongRange), /array or unbounded range/u);
});

test("compute lowering emits equivalent bounded SM5.0 and finite SM5.1 sort-step profiles", () =>
{
    const typedPrograms = [ 0, 1 ].map((minorVersion) =>
    {
        const ir = sortStepIr(minorVersion);
        const typed = lowerComputeProgram(ir);
        assert.equal(typed.stage, "compute");
        assert.deepEqual(typed.threadGroupSize, [ 256, 1, 1 ]);
        assert.deepEqual(typed.builtinInputs, [
            { builtin: "workgroup_id", name: "workgroup_id", type: "vec3<u32>" },
            { builtin: "local_invocation_id", name: "local_invocation_id", type: "vec3<u32>" }
        ]);
        assert.deepEqual(typed.bindings.map((binding) => ({
            symbol: binding.generatedSymbol,
            type: binding.type,
            stride: binding.structureStride ?? null,
            bufferType: binding.buffer.type,
            minBindingSize: binding.buffer.minBindingSize
        })), [
            { symbol: "cb3", type: "array<vec4<f32>, 1>", stride: null, bufferType: "uniform", minBindingSize: 16 },
            { symbol: "t0", type: "array<u32>", stride: null, bufferType: "read-only-storage", minBindingSize: 4 },
            { symbol: "u0", type: "array<u32>", stride: 8, bufferType: "storage", minBindingSize: 8 }
        ]);

        const serialized = JSON.stringify(typed.statements);
        assert.match(serialized, /0u - r0\.z/u);
        assert.match(serialized, /bitcast<f32>\(r1\.y\) < bitcast<f32>\(r0\.z\)/u);
        assert.match(serialized,
            /select\(0u, t0\[min\(0x00000003u, arrayLength\(&t0\) - 1u\)\], 0x00000003u < arrayLength\(&t0\)\)/u);
        assert.equal((serialized.match(/select\(0u, u0\[/gu) || []).length, 4);
        assert.equal((serialized.match(/< \(arrayLength\(&u0\) \/ 2u\)/gu) || []).length, 6);

        const shader = CjsWebgpuFormat.buildWgsl(ir);
        assert.match(shader.code,
            /fn main\(@builtin\(workgroup_id\) workgroup_id: vec3<u32>, @builtin\(local_invocation_id\) local_invocation_id: vec3<u32>\)/u);
        assert.match(shader.code, /@compute @workgroup_size\(256, 1, 1\)/u);
        assert.match(shader.code, /if \(r0\.x < \(arrayLength\(&u0\) \/ 2u\)\)/u);
        assert.match(shader.code, /u0\[\(\(r0\.x\) \* 2u\) \+ 0u\] = r1\.x/u);
        assert.ok(shader.sourceMap.some((entry) => entry.dxbcOffset === 177));
        return typed;
    });

    assert.deepEqual(typedPrograms[0].statements, typedPrograms[1].statements);
    assert.deepEqual(typedPrograms[0].bindings.map((binding) => ({
        resourceKind: binding.resourceKind,
        generatedSymbol: binding.generatedSymbol,
        registerIndex: binding.registerIndex,
        type: binding.type,
        structureStride: binding.structureStride ?? null,
        buffer: binding.buffer
    })), typedPrograms[1].bindings.map((binding) => ({
        resourceKind: binding.resourceKind,
        generatedSymbol: binding.generatedSymbol,
        registerIndex: binding.registerIndex,
        type: binding.type,
        structureStride: binding.structureStride ?? null,
        buffer: binding.buffer
    })));
});

test("sort-step compute profile fails closed on declarations, modifiers, ranges, and replay metadata", () =>
{
    const mutate = (minorVersion, callback) =>
    {
        const ir = structuredClone(sortStepIr(minorVersion));
        callback(ir);
        return ir;
    };

    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.declarations[7].data.threadGroupX = 255;
    })), /dcl_thread_group 256,1,1/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.declarations[4].operands[0].mask = "y";
    })), /exactly input_thread_group_id\.x/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.declarations[3].data.structureStride = 4;
    })), /stride-8 structured UAV/u);

    for (const callback of [
        (ir) => { ir.instructions[4].operands[1].modifierName = "none"; },
        (ir) => { ir.instructions[4].operands[1].modifierName = "abs"; },
        (ir) => { ir.instructions[4].operands[1].minPrecisionName = "float_16"; },
        (ir) => { ir.instructions[1].operands[2].componentCount = 4; },
        (ir) => { ir.instructions[0].operands[1].immediateValues[3].uint32 = 4; },
        (ir) => { ir.instructions[11].operands[3].swizzle = "xyzw"; },
        (ir) => { ir.instructions[15].operands[0].mask = "x"; },
        (ir) => { ir.instructions[13].opcodeName = "uge"; }
    ])
    {
        assert.throws(() => lowerComputeProgram(mutate(0, callback)),
            /exact bounded body opcode, operand, and modifier sequence/u);
    }

    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[11].operands[3].indices[0].relative = {
            typeName: "temp",
            registerIndex: 1
        };
    })), /non-canonical index metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[11].extensions[0].structureStride = 4;
    })), /inconsistent (?:envelope metadata|SM5\.0 resource-extension)/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.declarations[1].data.bindingRange.upperBound = 4;
    })), /finite SM5\.1 range/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.instructions[11].operands[3].resourceReference.rangeId = 1;
    })), /invalid SM5\.1 resource reference/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.instructions[1].operands[1].resourceReference = {
            bindingModel: "sm5.1-range"
        };
    })), /unexpected resource reference metadata/u);
    assert.throws(() => lowerComputeProgram(mutate(1, (ir) =>
    {
        ir.instructions[6].operands[2].resourceReference.vectorOffset.values[0] = 1;
    })), /invalid SM5\.1 cb3 reference/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.instructions[13].typeInfo.rule = "integer";
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        const undefinedValue = ir.values.find((value) =>
            value.origin === "undefined-register");
        assert.ok(undefinedValue);
        ir.instructions[3].dataflow.reads[0].refs[0].valueId = undefinedValue.id;
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate(0, (ir) =>
    {
        ir.controlFlow.regions[0].endInstruction -= 1;
    })), /CFG, SSA, or type metadata is inconsistent/u);
});

test("exact compute profiles reject noncanonical tails and binding provenance", () =>
{
    const profiles = [
        [ "SortStep SM5.0", () => sortStepIr(0) ],
        [ "SortStep SM5.1", () => sortStepIr(1) ],
        [ "SkinVertices", () => skinVerticesIr() ],
        [
            "SetDrawParameters",
            () => CjsWebgpuFormat.buildShaderIr(
                setDrawParametersFixture(), { source: "synthetic-setdrawparameters-envelope" })
        ],
        [
            "SetSortArgs",
            () => CjsWebgpuFormat.buildShaderIr(
                setSortArgsFixture(), { source: "synthetic-setsortargs-envelope" })
        ]
    ];
    const cases = [
        [
            "declaration tail",
            (program) => { program.declarations[0].tailTokens = [ 0xdecafbad ]; },
            /declaration .* has unconsumed tail tokens/u
        ],
        [
            "instruction tail",
            (program) => { program.instructions[0].tailTokens = [ 0xabad1dea ]; },
            /instruction .* has unconsumed tail tokens/u
        ],
        [
            "binding id",
            (program) => { program.bindings[0].id = "inconsistent-id"; },
            /binding inconsistent-id has noncanonical id/u
        ],
        [
            "binding declaration offset",
            (program) =>
            {
                const binding = program.bindings.find((entry) =>
                    entry.resourceKind !== "uniform-buffer");
                assert.ok(binding);
                binding.declarationOffset += 1_000_003;
            },
            /has inconsistent declaration identity/u
        ]
    ];

    for (const [ profileName, makeProgram ] of profiles)
    {
        for (const [ caseName, mutate, pattern ] of cases)
        {
            const program = structuredClone(makeProgram());
            mutate(program);
            assert.throws(
                () => lowerComputeProgram(program),
                pattern,
                `${profileName} accepted a noncanonical ${caseName}`);
        }
    }
});

test("older exact SM5.0 compute profiles reject inconsistent numeric extension mirrors", () =>
{
    const profiles = [
        [ "SortStep SM5.0", () => sortStepIr(0) ],
        [ "SkinVertices", () => skinVerticesIr() ],
        [
            "SetDrawParameters",
            () => CjsWebgpuFormat.buildShaderIr(
                setDrawParametersFixture(), { source: "synthetic-setdrawparameters-mirrors" })
        ],
        [
            "SetSortArgs",
            () => CjsWebgpuFormat.buildShaderIr(
                setSortArgsFixture(), { source: "synthetic-setsortargs-mirrors" })
        ]
    ];
    const cases = [
        [ "dimension token", (extensions) => { extensions[0].token += 1; } ],
        [ "dimension type", (extensions) => { extensions[0].type += 1; } ],
        [
            "numeric resource dimension",
            (extensions) => { extensions[0].resourceDimension += 1; }
        ],
        [ "return token", (extensions) => { extensions[1].token += 1; } ],
        [ "return type", (extensions) => { extensions[1].type += 1; } ],
        [
            "sparse return components",
            (extensions) => { delete extensions[1].resourceReturnTypes[0]; }
        ]
    ];

    for (const [ profileName, makeProgram ] of profiles)
    {
        for (const [ caseName, mutate ] of cases)
        {
            const program = structuredClone(makeProgram());
            const loadInstruction = program.instructions.find((entry) =>
                entry.extensions?.length === 2);
            assert.ok(loadInstruction, `${profileName} has no SM5.0 resource load`);
            mutate(loadInstruction.extensions);
            assert.throws(
                () => lowerComputeProgram(program),
                /inconsistent SM5\.0 resource-extension semantic or numeric mirrors/u,
                `${profileName} accepted an inconsistent ${caseName}`);
        }
    }
});

test("scalar-word profiles reject inconsistent declaration and binding return-type mirrors", () =>
{
    const profiles = [
        [ "SetDrawParameters", setDrawParametersFixture ],
        [ "SetSortArgs", setSortArgsFixture ]
    ];
    const copies = [
        {
            name: "sampled declaration",
            select: (program) => program.declarations.find((entry) =>
                entry.opcodeName === "dcl_resource").data.returnType
        },
        {
            name: "sampled binding",
            select: (program) => program.bindings.find((entry) =>
                entry.resourceKind === "sampled-resource").returnType
        },
        {
            name: "storage declaration",
            select: (program) => program.declarations.find((entry) =>
                entry.opcodeName === "dcl_unordered_access_view_typed").data.returnType
        },
        {
            name: "storage binding",
            select: (program) => program.bindings.find((entry) =>
                entry.resourceKind === "storage-resource").returnType
        }
    ];

    for (const [ profileName, makeFixture ] of profiles)
    {
        for (const copy of copies)
        {
            const program = structuredClone(CjsWebgpuFormat.buildShaderIr(makeFixture(), {
                source: `synthetic-${profileName.toLowerCase()}-${copy.name}`
            }));
            const returnType = copy.select(program);
            assert.ok(returnType);
            returnType.returnTypes[0] =
                returnType.returnTypes[0] === 3 ? 4 : 3;
            assert.throws(
                () => lowerComputeProgram(program),
                /inconsistent numeric\/name return-type component mirrors/u,
                `${profileName} accepted an inconsistent ${copy.name} copy`);
        }
    }

    const noncanonicalNumericMirrors = [
        [ "numeric string", "3" ],
        [ "boxed number", new Number(3) ],
        [ "fraction", 3.5 ],
        [ "NaN", Number.NaN ],
        [ "positive infinity", Number.POSITIVE_INFINITY ],
        [ "boolean", true ],
        [ "null", null ],
        [ "unknown integer class", 6 ]
    ];
    for (const [ profileName, makeFixture ] of profiles)
    {
        for (const copy of copies)
        {
            for (const [ caseName, value ] of noncanonicalNumericMirrors)
            {
                const program = structuredClone(CjsWebgpuFormat.buildShaderIr(makeFixture(), {
                    source: `synthetic-${profileName.toLowerCase()}-${copy.name}-${caseName}`
                }));
                const returnType = copy.select(program);
                assert.ok(returnType);
                returnType.returnTypes[0] = value;
                assert.throws(
                    () => lowerComputeProgram(program),
                    /inconsistent numeric\/name return-type component mirrors/u,
                    `${profileName} accepted ${caseName} in its ${copy.name} copy`);
            }
        }
    }

    for (const [ profileName, makeFixture ] of profiles)
    {
        for (const copy of copies)
        {
            const program = structuredClone(CjsWebgpuFormat.buildShaderIr(makeFixture(), {
                source: `synthetic-${profileName.toLowerCase()}-${copy.name}-sparse`
            }));
            const returnType = copy.select(program);
            assert.ok(returnType);
            delete returnType.returnTypes[0];
            assert.throws(
                () => lowerComputeProgram(program),
                /inconsistent numeric\/name return-type component mirrors/u,
                `${profileName} accepted a sparse ${copy.name} copy`);
        }
    }
});

test("canonical exact compute profiles preserve genuine baseline WGSL hashes", () =>
{
    const profiles = [
        [ "SortStep SM5.0", sortStepIr(0), "95feed182ff7a2fd8d635c18e424b6294764a36f44e3a4b5f1c6d1fe8e07ad7e" ],
        [ "SortStep SM5.1", sortStepIr(1), "95feed182ff7a2fd8d635c18e424b6294764a36f44e3a4b5f1c6d1fe8e07ad7e" ],
        [ "SkinVertices", skinVerticesIr(), "83420c2ce44061829c2b63f710ded2f6c252da06cbed31213182f78e4dee9580" ],
        [
            "SetDrawParameters",
            CjsWebgpuFormat.buildShaderIr(
                setDrawParametersFixture(), { source: "synthetic-setdrawparameters-hash" }),
            "658b2bc4e6d924371b63302cc61fd5ae5b3313f5c0222bd55718f118010dedda"
        ],
        [
            "SetSortArgs",
            CjsWebgpuFormat.buildShaderIr(
                setSortArgsFixture(), { source: "synthetic-setsortargs-hash" }),
            "28ef4b1392cb4f68183b74eeef5ddc07a4fee3e0c93a6931ad96b649042a3249"
        ]
    ];

    for (const [ profileName, program, expectedHash ] of profiles)
    {
        const code = CjsWebgpuFormat.buildWgsl(program).code;
        assert.equal(
            createHash("sha256").update(code).digest("hex"),
            expectedHash,
            `${profileName} changed from its genuine effect baseline`);
    }
});

test("exact compute envelope rejects ambiguous range forms and forged declaration handle indices", () =>
{
    const fixedRangeCases = [
        [
            "bindingModel only",
            (data) => { data.bindingModel = "sm5.1-range"; }
        ],
        [
            "null bindingModel",
            (data) => { data.bindingModel = null; }
        ],
        [
            "undefined bindingModel",
            (data) => { data.bindingModel = undefined; }
        ],
        [
            "false bindingModel",
            (data) => { data.bindingModel = false; }
        ],
        [
            "empty bindingModel",
            (data) => { data.bindingModel = ""; }
        ],
        [
            "null bindingRange only",
            (data) => { data.bindingRange = null; }
        ],
        [
            "undefined bindingRange only",
            (data) => { data.bindingRange = undefined; }
        ],
        [
            "false bindingRange only",
            (data) => { data.bindingRange = false; }
        ],
        [
            "zero bindingRange only",
            (data) => { data.bindingRange = 0; }
        ],
        [
            "empty bindingRange only",
            (data) => { data.bindingRange = ""; }
        ],
        [
            "SM5.1 model with null range",
            (data) =>
            {
                data.bindingModel = "sm5.1-range";
                data.bindingRange = null;
            }
        ]
    ];
    for (const [ caseName, mutate ] of fixedRangeCases)
    {
        const program = structuredClone(sortStepIr(0));
        mutate(program.declarations[1].data);
        assert.throws(
            () => lowerComputeProgram(program),
            /invalid finite SM5\.1 range declaration/u,
            `accepted fixed declaration with ${caseName}`);
    }

    const missingRangeModel = structuredClone(sortStepIr(1));
    delete missingRangeModel.declarations[1].data.bindingModel;
    assert.throws(
        () => lowerComputeProgram(missingRangeModel),
        /invalid finite SM5\.1 range declaration/u);

    const missingRange = structuredClone(sortStepIr(1));
    delete missingRange.declarations[1].data.bindingRange;
    assert.throws(
        () => lowerComputeProgram(missingRange),
        /invalid finite SM5\.1 range declaration/u);

    const extraFixedIndex = structuredClone(sortStepIr(0));
    extraFixedIndex.declarations[1].operands[0].indices.push({
        dimension: 1,
        representation: 0,
        values: [ 3 ],
        relative: null
    });
    assert.throws(
        () => lowerComputeProgram(extraFixedIndex),
        /inconsistent declaration handle identity/u);

    const extraFixedResourceIndex = structuredClone(sortStepIr(0));
    extraFixedResourceIndex.declarations[2].operands[0].indices.push({
        dimension: 1,
        representation: 0,
        values: [ 0 ],
        relative: null
    });
    assert.throws(
        () => lowerComputeProgram(extraFixedResourceIndex),
        /inconsistent declaration handle identity/u);

    const rangedIndexCases = [
        [
            "missing upper-bound index",
            (indices) => { indices.pop(); }
        ],
        [
            "extra index",
            (indices) => { indices.push(sortIndex(3, 3)); }
        ],
        [
            "wrong lower bound",
            (indices) => { indices[1].values[0] = 99; }
        ],
        [
            "wrong upper bound",
            (indices) => { indices[2].values[0] = 100; }
        ],
        [
            "wrong range dimension",
            (indices) => { indices[0].dimension = 1; }
        ],
        [
            "wrong lower-bound representation",
            (indices) => { indices[1].representation = 1; }
        ],
        [
            "relative upper bound",
            (indices) =>
            {
                indices[2].relative = {
                    typeName: "temp",
                    registerIndex: 0
                };
            }
        ],
        [
            "multiword lower bound",
            (indices) => { indices[1].values.push(3); }
        ]
    ];
    for (const [ caseName, mutate ] of rangedIndexCases)
    {
        const program = structuredClone(sortStepIr(1));
        mutate(program.declarations[1].operands[0].indices);
        assert.throws(
            () => lowerComputeProgram(program),
            /inconsistent declaration handle identity/u,
            `accepted SM5.1 handle with ${caseName}`);
    }
});

test("sort-step compute validates exact binding plans and finite raw ranges", () =>
{
    const ir = sortStepIr(1);
    const typed = lowerComputeProgram(ir);
    const plan = {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: 2,
        bindings: typed.bindings.map((binding) => ({
            identity: binding.identity,
            scopeIdentity: binding.scopeIdentity,
            stages: [ "compute" ],
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerSpace: binding.registerSpace,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer,
            texture: binding.texture ?? null,
            sampler: binding.sampler ?? null,
            group: binding.group,
            binding: binding.binding
        }))
    };
    assert.deepEqual(lowerComputeProgram(ir, { bindingPlan: plan }).bindings
        .map((binding) => binding.binding), [ 0, 1, 2 ]);

    const wrongType = structuredClone(plan);
    wrongType.bindings[1].type = "array<i32>";
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongType }),
        /invalid entry|does not match/u);

    const wrongStride = structuredClone(plan);
    wrongStride.bindings[2].structureStride = 4;
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongStride }),
        /invalid entry|does not match/u);

    const wrongRange = structuredClone(ir);
    const sampled = wrongRange.bindings.find((binding) =>
        binding.resourceKind === "sampled-resource");
    sampled.range.upperBound = 1;
    sampled.range.registerCount = 2;
    assert.throws(() => lowerComputeProgram(wrongRange), /array or unbounded range/u);
});

function floatBits(value)
{
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, true);
    return view.getUint32(0, true);
}

function bitsFloat(value)
{
    const view = new DataView(new ArrayBuffer(4));
    view.setUint32(0, value, true);
    return view.getFloat32(0, true);
}

function sortStepCpu(records, leftIndex, rightIndex)
{
    const output = records.map((record) => record.slice());
    const read = (index) => index < output.length ? output[index].slice() : [ 0, 0 ];
    const left = read(leftIndex);
    const right = read(rightIndex);
    if (bitsFloat(right[1]) < bitsFloat(left[1]))
    {
        if (leftIndex < output.length) output[leftIndex] = right;
        if (rightIndex < output.length) output[rightIndex] = left;
    }
    return output;
}

test("sort-step CPU oracle covers swap, no-swap, NaN, and robust OOB behavior", () =>
{
    const high = [ 10, floatBits(4) ];
    const low = [ 20, floatBits(1) ];
    assert.deepEqual(sortStepCpu([ high, low ], 0, 1), [ low, high ]);
    assert.deepEqual(sortStepCpu([ low, high ], 0, 1), [ low, high ]);

    const nan = [ 30, 0x7fc00000 ];
    assert.deepEqual(sortStepCpu([ nan, low ], 0, 1), [ nan, low ]);
    assert.deepEqual(sortStepCpu([ low, nan ], 0, 1), [ low, nan ]);

    assert.deepEqual(sortStepCpu([ low ], 4, 7), [ low ]);
    assert.deepEqual(sortStepCpu([ high ], 0, 7), [ [ 0, 0 ] ]);
    assert.equal(sortStepCpu([ high ], 0, 7).length, 1);
});

function signed32(value)
{
    return value >> 0;
}

function clampedChunkSortCount(n, groupId)
{
    const base = Math.imul(groupId, 512) >>> 0;
    const difference = signed32((n - base) >>> 0);
    return Math.min(Math.max(difference, 0), 512);
}

function chunkSortCpu(sortParameters, records, groupId = 0)
{
    const n = sortParameters.length > 3 ? sortParameters[3] >>> 0 : 0;
    const base = Math.imul(groupId, 512) >>> 0;
    const count = clampedChunkSortCount(n, groupId);
    const output = records.map((record) => record.slice());
    const robustRead = (index) =>
        index < records.length ? records[index].slice() : [ 0, 0 ];
    const sharedRecords = Array(512);

    for (let lane = 0; lane < 256; lane += 1)
    {
        if (lane < count)
        {
            sharedRecords[lane] = robustRead((base + lane) >>> 0);
        }
        if (lane + 256 < count)
        {
            sharedRecords[lane + 256] = robustRead((base + lane + 256) >>> 0);
        }
    }

    for (let mergeWidth = 2; mergeWidth <= 512; mergeWidth <<= 1)
    {
        const halfWidth = mergeWidth >>> 1;
        for (let stride = halfWidth; stride > 0; stride >>= 1)
        {
            for (let lane = 0; lane < 256; lane += 1)
            {
                const remainder = (stride - 1) & lane;
                const doubledBase = 2 * (lane - remainder);
                const low = doubledBase + remainder;
                const mirroredHigh = (2 * stride) + doubledBase - remainder - 1;
                const mergedHigh = stride + doubledBase + remainder;
                const high = halfWidth === stride ? mirroredHigh : mergedHigh;
                if (high >= count) continue;
                const lowRecord = sharedRecords[low];
                const highRecord = sharedRecords[high];
                assert.ok(lowRecord && highRecord,
                    `valid chunk-sort domain left shared records ${low}/${high} uninitialized`);
                if (bitsFloat(highRecord[1]) < bitsFloat(lowRecord[1]))
                {
                    sharedRecords[low] = highRecord;
                    sharedRecords[high] = lowRecord;
                }
            }
        }
    }

    for (let localIndex = 0; localIndex < count; localIndex += 1)
    {
        const recordIndex = (base + localIndex) >>> 0;
        if (recordIndex < output.length)
        {
            output[recordIndex] = sharedRecords[localIndex].slice();
        }
    }
    return output;
}

function clampedSortInnerCount(n, groupId)
{
    const base = Math.imul(groupId, 512) >>> 0;
    const difference = signed32((n - base) >>> 0);
    return Math.min(Math.max(difference, 0), 512);
}

function sortInnerCpu(sortParameters, records, groupId = 0)
{
    const n = sortParameters.length > 3 ? sortParameters[3] >>> 0 : 0;
    const base = Math.imul(groupId, 512) >>> 0;
    const count = clampedSortInnerCount(n, groupId);
    const output = records.map((record) => record.slice());
    const sharedRecords = Array(512);
    const robustRead = (index) =>
        index < records.length ? records[index].slice() : [ 0, 0 ];
    const outerGuard = (lane) =>
        signed32((base + lane) >>> 0) < signed32(n);

    for (let lane = 0; lane < 256; lane += 1)
    {
        if (!outerGuard(lane)) continue;
        if (lane < count) sharedRecords[lane] = robustRead((base + lane) >>> 0);
        if (lane + 256 < count)
        {
            sharedRecords[lane + 256] = robustRead((base + lane + 256) >>> 0);
        }
    }
    for (let stride = 256; stride > 0; stride >>= 1)
    {
        for (let lane = 0; lane < 256; lane += 1)
        {
            const remainder = (stride - 1) & lane;
            const low = (2 * (lane - remainder)) + remainder;
            const high = low + stride;
            if (high >= count) continue;
            const lowRecord = sharedRecords[low];
            const highRecord = sharedRecords[high];
            assert.ok(lowRecord && highRecord,
                `valid sort-inner domain left shared records ${low}/${high} uninitialized`);
            if (bitsFloat(highRecord[1]) < bitsFloat(lowRecord[1]))
            {
                sharedRecords[low] = highRecord;
                sharedRecords[high] = lowRecord;
            }
        }
    }
    for (let lane = 0; lane < 256; lane += 1)
    {
        if (!outerGuard(lane)) continue;
        for (const localIndex of [ lane, lane + 256 ])
        {
            const recordIndex = (base + localIndex) >>> 0;
            if (localIndex < count && recordIndex < output.length)
            {
                output[recordIndex] = sharedRecords[localIndex].slice();
            }
        }
    }
    return output;
}

function pairMultiset(records)
{
    return records.map(([ payload, key ]) =>
        `${payload >>> 0}:${key >>> 0}`).sort();
}

test("chunk-sort CPU oracle is a record-preserving finite-key sort with exact float and robust behavior", () =>
{
    let randomState = 0x12345678;
    const randomU32 = () =>
    {
        randomState ^= randomState << 13;
        randomState ^= randomState >>> 17;
        randomState ^= randomState << 5;
        return randomState >>> 0;
    };

    for (const count of [ 0, 1, 2, 3, 7, 31, 255, 256, 257, 511, 512 ])
    {
        for (let iteration = 0; iteration < 8; iteration += 1)
        {
            const records = Array.from({ length: count }, (_, index) => [
                (Math.imul(index + 1, 2654435761) ^ randomU32()) >>> 0,
                floatBits((randomU32() % 2001) - 1000)
            ]);
            const actual = chunkSortCpu([ 11, 22, 33, count ], records);
            assert.deepEqual(pairMultiset(actual), pairMultiset(records));
            const keys = actual.map((record) => bitsFloat(record[1]));
            assert.deepEqual(keys, keys.slice().sort((left, right) => left - right));
        }
    }

    const nan = 0x7fc00000;
    const special = [
        [ 101, nan ],
        [ 202, floatBits(Infinity) ],
        [ 303, floatBits(-Infinity) ],
        [ 404, floatBits(0) ],
        [ 505, floatBits(-0) ],
        [ 606, floatBits(1) ],
        [ 707, nan ]
    ];
    assert.deepEqual(pairMultiset(chunkSortCpu([ 0, 0, 0, special.length ], special)),
        pairMultiset(special), "NaN and signed zero preserve complete source records");

    const payloadA = 0x13579bdf;
    const payloadB = 0x2468ace0;
    const pair = (leftKey, rightKey) => [
        [ payloadA, leftKey ],
        [ payloadB, rightKey ]
    ];
    for (const [ input, expected ] of [
        [ pair(nan, floatBits(1)), pair(nan, floatBits(1)) ],
        [ pair(floatBits(1), nan), pair(floatBits(1), nan) ],
        [ pair(floatBits(2), floatBits(2)), pair(floatBits(2), floatBits(2)) ],
        [ pair(floatBits(0), floatBits(-0)), pair(floatBits(0), floatBits(-0)) ],
        [ pair(floatBits(-0), floatBits(0)), pair(floatBits(-0), floatBits(0)) ],
        [ pair(floatBits(Infinity), floatBits(-Infinity)),
            [ [ payloadB, floatBits(-Infinity) ], [ payloadA, floatBits(Infinity) ] ] ],
        [ pair(floatBits(-Infinity), floatBits(Infinity)),
            pair(floatBits(-Infinity), floatBits(Infinity)) ]
    ])
    {
        assert.deepEqual(chunkSortCpu([ 0, 0, 0, 2 ], input), expected);
        assert.deepEqual(pairMultiset(chunkSortCpu([ 0, 0, 0, 2 ], input)),
            pairMultiset(input));
    }

    assert.deepEqual(chunkSortCpu([], special), special,
        "removing the nonuniform N=0 early return is behavior-preserving");
    assert.deepEqual(chunkSortCpu([ 0, 0, 0, 2 ], [ [ 1, floatBits(4) ] ]),
        [ [ 0, 0 ] ], "an OOB structured load supplies one complete zero record");

    const boundary = Array.from({ length: 513 }, (_, index) => [
        index >>> 0,
        floatBits(513 - index)
    ]);
    const groupZero = chunkSortCpu([ 0, 0, 0, 513 ], boundary, 0);
    const bothGroups = chunkSortCpu([ 0, 0, 0, 513 ], groupZero, 1);
    assert.deepEqual(bothGroups.slice(0, 512).map((record) => bitsFloat(record[1])),
        Array.from({ length: 512 }, (_, index) => index + 2));
    assert.deepEqual(bothGroups[512], boundary[512]);
    assert.deepEqual(pairMultiset(bothGroups), pairMultiset(boundary));
});

test("chunk-sort shared-memory stages are initialized, bounded, and race-free for every admitted count", () =>
{
    let stagesPerInvocation = 0;
    for (let mergeWidth = 2; mergeWidth <= 512; mergeWidth <<= 1)
    {
        for (let stride = mergeWidth >>> 1; stride > 0; stride >>= 1)
        {
            stagesPerInvocation += 1;
        }
    }
    assert.equal(stagesPerInvocation, 45);
    assert.equal(1 + stagesPerInvocation, 46,
        "one initialization barrier plus one barrier after every stage");

    for (const n of [
        0, 1, 2, 255, 256, 257, 511, 512, 513,
        0x7fffffff, 0x80000000, 0xffffffff
    ])
    {
        for (const groupId of [ 0, 1, 65534, 65535, 0xffffffff ])
        {
            const count = clampedChunkSortCount(n, groupId);
            assert.ok(count >= 0 && count <= 512);
            const initialized = new Set(
                Array.from({ length: count }, (_, index) => index));
            for (let mergeWidth = 2; mergeWidth <= 512; mergeWidth <<= 1)
            {
                const halfWidth = mergeWidth >>> 1;
                for (let stride = halfWidth; stride > 0; stride >>= 1)
                {
                    const touched = [];
                    for (let lane = 0; lane < 256; lane += 1)
                    {
                        const remainder = (stride - 1) & lane;
                        const doubledBase = 2 * (lane - remainder);
                        const low = doubledBase + remainder;
                        const mirroredHigh =
                            (2 * stride) + doubledBase - remainder - 1;
                        const mergedHigh = stride + doubledBase + remainder;
                        const high = halfWidth === stride
                            ? mirroredHigh
                            : mergedHigh;
                        if (high >= count) continue;
                        assert.ok(low >= 0 && low < 512);
                        assert.ok(high >= 0 && high < 512);
                        assert.ok(initialized.has(low));
                        assert.ok(initialized.has(high));
                        touched.push(low, high);
                    }
                    assert.equal(new Set(touched).size, touched.length,
                        `stage width=${mergeWidth} stride=${stride} contains a race`);
                }
            }
        }
    }
});

test("sort-inner CPU oracle is a record-preserving bitonic merge with exact float and robust behavior", () =>
{
    const bitonic = Array.from({ length: 512 }, (_, index) =>
    {
        const rank = index < 256 ? index : 511 - index;
        return [ Math.imul(index + 17, 2654435761) >>> 0, floatBits(rank - 100) ];
    });
    const merged = sortInnerCpu([ 91, 92, 93, 512 ], bitonic);
    assert.deepEqual(merged.map((record) => bitsFloat(record[1])),
        Array.from({ length: 512 }, (_, index) => Math.floor(index / 2) - 100));
    assert.deepEqual(pairMultiset(merged), pairMultiset(bitonic));
    for (const record of merged)
    {
        assert.ok(bitonic.some((input) => input[0] === record[0] && input[1] === record[1]));
    }

    const arbitrary = Array.from({ length: 37 }, (_, index) => [
        Math.imul(index + 3, 2246822519) >>> 0,
        floatBits(((index * 17) % 29) - 11)
    ]);
    const arbitraryOutput = sortInnerCpu([ 7, 8, 9, arbitrary.length ], arbitrary);
    assert.deepEqual(pairMultiset(arbitraryOutput), pairMultiset(arbitrary));

    const payloadA = 0x13579bdf;
    const payloadB = 0x2468ace0;
    const pair = (leftKey, rightKey) => [
        [ payloadA, leftKey ],
        [ payloadB, rightKey ]
    ];
    for (const [ input, expected ] of [
        [ pair(floatBits(4), floatBits(1)),
            [ [ payloadB, floatBits(1) ], [ payloadA, floatBits(4) ] ] ],
        [ pair(floatBits(1), floatBits(4)), pair(floatBits(1), floatBits(4)) ],
        [ pair(0x7fc00000, floatBits(1)), pair(0x7fc00000, floatBits(1)) ],
        [ pair(floatBits(1), 0x7fc00000), pair(floatBits(1), 0x7fc00000) ],
        [ pair(floatBits(2), floatBits(2)), pair(floatBits(2), floatBits(2)) ],
        [ pair(floatBits(0), floatBits(-0)), pair(floatBits(0), floatBits(-0)) ],
        [ pair(floatBits(-0), floatBits(0)), pair(floatBits(-0), floatBits(0)) ],
        [ pair(floatBits(Infinity), floatBits(-Infinity)),
            [ [ payloadB, floatBits(-Infinity) ], [ payloadA, floatBits(Infinity) ] ] ],
        [ pair(floatBits(-Infinity), floatBits(Infinity)),
            pair(floatBits(-Infinity), floatBits(Infinity)) ]
    ])
    {
        assert.deepEqual(sortInnerCpu([ 0, 0, 0, 2 ], input), expected);
        assert.deepEqual(pairMultiset(sortInnerCpu([ 0, 0, 0, 2 ], input)),
            pairMultiset(input));
    }

    const untouched = pair(floatBits(9), floatBits(3));
    assert.deepEqual(sortInnerCpu([], untouched), untouched,
        "robust t0[3] OOB supplies N=0");
    assert.deepEqual(sortInnerCpu([ 0, 0, 0, 2 ], [ [ payloadA, floatBits(4) ] ]),
        [ [ 0, 0 ] ], "robust u0 OOB supplies a complete zero record before the guarded store");
});

test("sort-inner shared-memory initialization is proven under the explicit dispatch premise", () =>
{
    const boundaryCounts = [
        0, 1, 2, 255, 256, 257, 511, 512, 513,
        1048575, 1048576, 33553919, 33553920
    ];
    for (const n of boundaryCounts)
    {
        const dispatchCount = ((((Math.max(n, 1) - 1) >>> 9) + 1) >>> 0);
        assert.ok(dispatchCount <= 65535);
        for (const groupId of new Set([ 0, dispatchCount - 1 ]))
        {
            const base = Math.imul(groupId, 512) >>> 0;
            const count = clampedSortInnerCount(n, groupId);
            const initialized = new Set();
            for (let lane = 0; lane < 256; lane += 1)
            {
                const outer = signed32((base + lane) >>> 0) < signed32(n);
                if (lane < count)
                {
                    assert.ok(outer);
                    assert.ok((base + lane) < n);
                    initialized.add(lane);
                }
                if (lane + 256 < count)
                {
                    assert.ok(outer);
                    assert.ok((base + lane + 256) < n);
                    initialized.add(lane + 256);
                }
            }
            for (let stride = 256; stride > 0; stride >>= 1)
            {
                for (let lane = 0; lane < 256; lane += 1)
                {
                    const remainder = (stride - 1) & lane;
                    const low = (2 * (lane - remainder)) + remainder;
                    const high = low + stride;
                    if (high < count)
                    {
                        assert.ok(initialized.has(low));
                        assert.ok(initialized.has(high));
                    }
                }
            }
        }
    }

    const excludedN = 0x80000000;
    const excludedGroup = 1;
    const excludedCount = clampedSortInnerCount(excludedN, excludedGroup);
    assert.equal(excludedCount, 512);
    assert.equal(signed32((excludedGroup * 512) >>> 0) < signed32(excludedN), false);
    assert.ok(excludedCount > 0,
        "outside the runtime orchestration premise, the source shader can consume uninitialized shared records");
});

test("compute lowering emits the bounded SkinVertices structured-buffer profile", () =>
{
    const ir = skinVerticesIr();
    const typed = lowerComputeProgram(ir);
    assert.equal(typed.stage, "compute");
    assert.deepEqual(typed.threadGroupSize, [ 64, 1, 1 ]);
    assert.deepEqual(typed.builtinInputs, [ {
        builtin: "global_invocation_id",
        name: "dispatch_thread_id",
        type: "vec3<u32>"
    } ]);
    assert.deepEqual(typed.bindings.map((binding) => ({
        symbol: binding.generatedSymbol,
        type: binding.type,
        stride: binding.structureStride ?? null,
        bufferType: binding.buffer.type,
        minBindingSize: binding.buffer.minBindingSize
    })), [
        { symbol: "cb3", type: "array<vec4<f32>, 3>", stride: null, bufferType: "uniform", minBindingSize: 48 },
        { symbol: "t0", type: "array<u32>", stride: 48, bufferType: "read-only-storage", minBindingSize: 48 },
        { symbol: "t1", type: "array<u32>", stride: 4, bufferType: "read-only-storage", minBindingSize: 4 },
        { symbol: "u0", type: "array<u32>", stride: 4, bufferType: "storage", minBindingSize: 4 }
    ]);

    assert.deepEqual(typed.statements.slice(0, 10).map((statement) => statement.kind),
        Array(10).fill("var"));
    const outer = typed.statements[11];
    assert.equal(outer.kind, "if");
    assert.match(typed.statements[10].expression.code, /dispatch_thread_id\.x/u);
    const serialized = JSON.stringify(outer);
    assert.match(serialized, /arrayLength\(&t0\) \/ 12u/u);
    assert.match(serialized, /arrayLength\(&t1\) \/ 1u/u);
    assert.equal((serialized.match(/arrayLength\(&u0\)/gu) || []).length, 3);

    const shader = CjsWebgpuFormat.buildWgsl(ir);
    assert.match(shader.code,
        /fn main\(@builtin\(global_invocation_id\) dispatch_thread_id: vec3<u32>\)/u);
    assert.match(shader.code, /@compute @workgroup_size\(64, 1, 1\)/u);
    assert.equal((shader.code.match(/< arrayLength\(&u0\)/gu) || []).length, 3);
    for (const dxbcOffset of [ 554, 573, 582 ])
    {
        assert.ok(shader.sourceMap.some((entry) => entry.dxbcOffset === dxbcOffset));
    }
});

test("SkinVertices compute profile fails closed on declaration, body, and metadata tampering", () =>
{
    const mutate = (callback) =>
    {
        const ir = structuredClone(skinVerticesIr());
        callback(ir);
        return ir;
    };

    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.declarations.at(-1).data.threadGroupX = 63;
    })), /dcl_thread_group 64,1,1/u);
    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.declarations[5].operands[0].mask = "y";
    })), /exactly input_thread_id\.x/u);
    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.declarations[2].data.structureStride = 44;
    })), /resource0 stride 48/u);
    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.declarations[4].data.globallyCoherent = true;
    })), /uav0 stride 4/u);

    for (const callback of [
        (ir) => { ir.instructions[0].opcodeName = "uge"; },
        (ir) => { ir.instructions[9].operands[0].selected = "x"; },
        (ir) => { ir.instructions[11].operands[1].immediateValues[2].uint32 = 7; },
        (ir) => { ir.instructions[11].operands[2].immediateValues[3].uint32 = 8; },
        (ir) => { ir.instructions[3].operands[2].immediateValues[0].uint32 = 4; },
        (ir) =>
        {
            ir.instructions[3].operands[3].registerIndex = 0;
            ir.instructions[3].operands[3].indices[0].values[0] = 0;
        },
        (ir) => { ir.instructions[3].operands[3].swizzle = "xyzw"; },
        (ir) => { ir.instructions[60].operands[0].mask = "xy"; },
        (ir) => { ir.instructions[60].operands[2].immediateValues[0].uint32 = 4; },
        (ir) =>
        {
            [ ir.instructions[60], ir.instructions[63] ] =
                [ ir.instructions[63], ir.instructions[60] ];
        }
    ])
    {
        assert.throws(() => lowerComputeProgram(mutate(callback)),
            /exact bounded body opcode and operand sequence/u);
    }

    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.instructions[3].extensions[0].structureStride = 8;
    })), /inconsistent (?:envelope metadata|SM5\.0 resource-extension)/u);
    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.instructions[3].extensions[1].resourceReturnTypes[0] = 5;
    })), /inconsistent (?:envelope metadata|SM5\.0 resource-extension)/u);
    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.instructions[11].typeInfo.rule = "integer";
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        const undefinedValue = ir.values.find((value) => value.origin === "undefined-register");
        assert.ok(undefinedValue);
        ir.instructions[2].dataflow.reads[0].refs[0].valueId = undefinedValue.id;
    })), /CFG, SSA, or type metadata is inconsistent/u);
    assert.throws(() => lowerComputeProgram(mutate((ir) =>
    {
        ir.controlFlow.regions[0].endInstruction -= 1;
    })), /CFG, SSA, or type metadata is inconsistent/u);
});

test("SkinVertices compute profile validates raw structured binding fingerprints", () =>
{
    const ir = skinVerticesIr();
    const typed = lowerComputeProgram(ir);
    const plan = {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: 2,
        bindings: typed.bindings.map((binding) => ({
            identity: binding.identity,
            scopeIdentity: binding.scopeIdentity,
            stages: [ "compute" ],
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerSpace: binding.registerSpace,
            registerIndex: binding.registerIndex,
            type: binding.type,
            structureStride: binding.structureStride ?? null,
            buffer: binding.buffer,
            texture: binding.texture ?? null,
            sampler: binding.sampler ?? null,
            group: binding.group,
            binding: binding.binding
        }))
    };
    assert.deepEqual(lowerComputeProgram(ir, { bindingPlan: plan }).bindings
        .map((binding) => binding.binding), [ 0, 1, 2, 3 ]);

    const wrongPlan = structuredClone(plan);
    wrongPlan.bindings[3].type = "array<atomic<u32>>";
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongPlan }),
        /invalid entry|does not match/u);

    const wrongStride = structuredClone(ir);
    wrongStride.bindings.find((binding) =>
        binding.resourceKind === "storage-resource").structureStride = 8;
    assert.throws(() => lowerComputeProgram(wrongStride), /binding layout does not match/u);

    const typedMetadata = structuredClone(ir);
    typedMetadata.bindings.find((binding) =>
        binding.resourceKind === "storage-resource").returnType = {
        returnTypeNames: [ "uint", "uint", "uint", "uint" ]
    };
    assert.throws(() => lowerComputeProgram(typedMetadata), /unexpected typed-resource metadata/u);
});

test("compute lowering scalarizes setdrawparameters typed buffers with guarded zero/drop semantics", () =>
{
    const { ir, typed } = lower(setDrawParametersFixture(), "synthetic-setdrawparameters");
    assert.equal(typed.format, "CJS_TYPED_SHADER");
    assert.equal(typed.stage, "compute");
    assert.equal(typed.entryPoint, "main");
    assert.deepEqual(typed.threadGroupSize, [ 1, 1, 1 ]);
    assert.equal("interface" in typed, false);
    const shader = CjsWebgpuFormat.buildWgsl(ir);
    assert.equal(shader.stage, "compute");
    assert.deepEqual(shader.threadGroupSize, [ 1, 1, 1 ]);
    assert.match(shader.code, /@compute @workgroup_size\(1, 1, 1\)\nfn main\(\)\n\{/u);
    assert.doesNotMatch(shader.code, /(?:Compute|Vertex|Fragment)(?:Input|Output)/u);
    assert.match(shader.code, /\n    return;\n\}\n$/u);
    assert.deepEqual(typed.bindings.map((binding) => ({
        symbol: binding.generatedSymbol,
        declaration: binding.declaration,
        type: binding.type,
        visibility: binding.visibility,
        buffer: binding.buffer
    })), [
        {
            symbol: "t0",
            declaration: "var<storage, read>",
            type: "array<i32>",
            visibility: "compute",
            buffer: { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 4 }
        },
        {
            symbol: "u0",
            declaration: "var<storage, read_write>",
            type: "array<atomic<u32>>",
            visibility: "compute",
            buffer: { type: "storage", hasDynamicOffset: false, minBindingSize: 4 }
        }
    ]);

    assert.equal(typed.statements[0].kind, "let");
    assert.match(
        typed.statements[0].expression.code,
        /select\(0i, t0\[min\(0x00000001u, arrayLength\(&t0\) - 1u\)\], 0x00000001u < arrayLength\(&t0\)\)/u);
    assert.match(typed.statements[1].expression.code, /bitcast<u32>\(\(value3 \* bitcast<i32>\(0x00000006u\)\)\)/u);
    for (const statement of typed.statements.slice(2, 6))
    {
        assert.equal(statement.kind, "if");
        assert.match(statement.condition.code, /0x0000000[0-3]u < arrayLength\(&u0\)/u);
        assert.match(statement.statements[0].expression.code, /^atomicStore\(&u0\[/u);
    }
    assert.equal(typed.statements.at(-1).kind, "return");

    const storeType = ir.instructions[2].typeInfo;
    assert.equal(storeType.rule, "typed-uav-store");
    assert.equal(storeType.operandTypes[1].expectedType, "uint32");
    assert.equal(storeType.operandTypes[2].expectedType, "uint32");
    assert.ok(storeType.bitcasts.some((entry) =>
        entry.kind === "read-bitcast"
        && entry.from === "bitpattern32"
        && entry.to === "uint32"));
});

test("compute lowering preserves setSortArgs signed/unsigned reinterpretation metadata", () =>
{
    const { ir, typed } = lower(setSortArgsFixture(), "synthetic-setsortargs");
    assert.deepEqual(typed.statements.map((statement) => statement.kind), [
        "let", "let", "let", "let", "let",
        "if", "if", "if", "if", "return"
    ]);
    assert.match(typed.statements[0].expression.code, /^bitcast<u32>\(select\(0i,/u);
    assert.equal(typed.statements[1].expression.code, "max(value3, 0x00000001u)");
    assert.match(typed.statements[2].expression.code, /bitcast<u32>\(\(bitcast<i32>\(value4\) \+ bitcast<i32>\(0xffffffffu\)\)\)/u);
    assert.equal(typed.statements[3].expression.code, "(value5 >> 0x00000009u)");
    assert.match(typed.statements[4].expression.code, /bitcast<u32>\(\(bitcast<i32>\(value6\) \+ bitcast<i32>\(0x00000001u\)\)\)/u);
    assert.equal(typed.statements[5].statements[0].expression.code, "atomicStore(&u0[0x00000000u], value7)");
    assert.equal(typed.statements[8].statements[0].expression.code, "atomicStore(&u0[0x00000003u], value3)");

    const stores = ir.instructions.filter((instruction) => instruction.opcodeName === "store_uav_typed");
    assert.ok(stores.every((instruction) =>
        instruction.typeInfo.rule === "typed-uav-store"
        && instruction.typeInfo.operandTypes[1].expectedType === "uint32"
        && instruction.typeInfo.operandTypes[2].expectedType === "uint32"));
});

test("compute lowering fails closed on declaration, operand, SSA, and type-metadata tampering", () =>
{
    const base = CjsWebgpuFormat.buildShaderIr(
        setSortArgsFixture(), { source: "synthetic-compute-tamper" });

    const badGroup = structuredClone(base);
    badGroup.declarations.find((entry) => entry.opcodeName === "dcl_thread_group")
        .data.threadGroupX = 2;
    assert.throws(() => lowerComputeProgram(badGroup), /dcl_thread_group 1,1,1/u);

    const badAddress = structuredClone(base);
    badAddress.instructions[5].operands[1].immediateValues[3].uint32 = 7;
    assert.throws(() => lowerComputeProgram(badAddress), /four replicated immediate lanes/u);

    const nonScalarLoadFixture = setDrawParametersFixture();
    nonScalarLoadFixture.instructions[5].operands[0].mask = "y";
    nonScalarLoadFixture.instructions[6].operands[2].selected = "y";
    const nonScalarLoad = CjsWebgpuFormat.buildShaderIr(
        nonScalarLoadFixture, { source: "synthetic-compute-non-scalar-load" });
    assert.throws(() => lowerComputeProgram(nonScalarLoad), /requires the x destination lane/u);

    const undeclaredTempFixture = setDrawParametersFixture();
    for (const entry of undeclaredTempFixture.instructions)
    {
        for (const operand of entry.operands || [])
        {
            if (operand.typeName !== "temp") continue;
            operand.registerIndex = 1;
            operand.indices[0].values[0] = 1;
        }
    }
    const undeclaredTemp = CjsWebgpuFormat.buildShaderIr(
        undeclaredTempFixture, { source: "synthetic-compute-undeclared-temp" });
    assert.throws(() => lowerComputeProgram(undeclaredTemp), /temp\[0\]/u);

    const badReplication = structuredClone(base);
    badReplication.instructions[5].operands[2].swizzle = "xyzw";
    assert.throws(() => lowerComputeProgram(badReplication), /four replicated source lanes/u);

    const staleRead = structuredClone(base);
    staleRead.instructions[4].dataflow.reads[0].refs[0] = {
        ...staleRead.instructions[4].dataflow.reads[0].refs[0],
        valueId: "value4"
    };
    assert.throws(() => lowerComputeProgram(staleRead), /inconsistent bitcast metadata|stale or mismatched SSA reads/u);

    const missingBitcast = structuredClone(base);
    missingBitcast.instructions[2].typeInfo.bitcasts = [];
    assert.throws(() => lowerComputeProgram(missingBitcast), /inconsistent bitcast metadata/u);

    const badBinding = structuredClone(base);
    badBinding.bindings.find((entry) => entry.resourceKind === "storage-resource")
        .returnType.returnTypeNames[0] = "sint";
    assert.throws(() => lowerComputeProgram(badBinding),
        /inconsistent numeric\/name return-type|unsupported typed-buffer declaration/u);

    const coherent = structuredClone(base);
    coherent.declarations.find((entry) =>
        entry.opcodeName === "dcl_unordered_access_view_typed").data.globallyCoherent = true;
    assert.throws(() => lowerComputeProgram(coherent), /unsupported typed-buffer declaration/u);

    const precise = structuredClone(base);
    precise.instructions[1].preciseMask = "y";
    assert.throws(() => lowerComputeProgram(precise), /unsupported control, modifier, or extension metadata/u);
});

test("typed UAV store inference follows the declared component class", () =>
{
    for (const [ typeName, expectedType ] of [
        [ "uint", "uint32" ],
        [ "sint", "int32" ],
        [ "float", "float32" ]
    ])
    {
        const fixture = setDrawParametersFixture();
        fixture.instructions[2].declaration.returnType = typedReturn(typeName);
        const ir = CjsWebgpuFormat.buildShaderIr(
            fixture, { source: `synthetic-compute-${typeName}-store` });
        const stores = ir.instructions.filter((instruction) =>
            instruction.opcodeName === "store_uav_typed");
        assert.ok(stores.every((instruction) =>
            instruction.typeInfo.operandTypes[2].expectedType === expectedType));
    }
});

test("compute lowering validates exact compute-only binding-plan coverage", () =>
{
    const { ir, typed } = lower(setDrawParametersFixture(), "synthetic-compute-plan");
    const plan = {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: 2,
        bindings: typed.bindings.map((binding) => ({
            identity: binding.identity,
            scopeIdentity: binding.scopeIdentity,
            stages: [ "compute" ],
            resourceKind: binding.resourceKind,
            generatedSymbol: binding.generatedSymbol,
            registerSpace: binding.registerSpace,
            registerIndex: binding.registerIndex,
            type: binding.type,
            buffer: binding.buffer,
            group: binding.group,
            binding: binding.binding
        }))
    };
    const planned = lowerComputeProgram(ir, { bindingPlan: plan });
    assert.deepEqual(planned.bindings.map((binding) => binding.binding), [ 0, 1 ]);

    const overlapping = structuredClone(plan);
    overlapping.bindings[1].binding = 0;
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: overlapping }), /invalid entry/u);

    const wrongStage = structuredClone(plan);
    wrongStage.bindings[0].stages = [ "fragment" ];
    assert.throws(() => lowerComputeProgram(ir, { bindingPlan: wrongStage }), /invalid entry/u);
});

function particleOperand(
    typeName,
    registerIndex,
    selectionModeName,
    selector = "",
    componentCount = 4
)
{
    const options = { componentCount };
    if (selectionModeName === "mask") options.mask = selector;
    else if (selectionModeName === "swizzle") options.swizzle = selector;
    else if (selectionModeName === "select1") options.selected = selector;
    const operand = sortRegister(typeName, registerIndex, options);
    operand.selectionModeName = selectionModeName;
    return operand;
}

function particleImmediate(...values)
{
    const operand = sortImmediate(values);
    operand.selectionModeName = values.length === 1 ? "none" : "mask";
    return operand;
}

function particleFrame(operand, token, type, length)
{
    return Object.assign(operand, { token, type, length });
}

function particleRange(rangeId, binding)
{
    return {
        bindingModel: "sm5.1-range",
        rangeId,
        lowerBound: binding,
        upperBound: binding,
        unbounded: false,
        registerCount: 1,
        registerSpace: 0
    };
}

function particleUav(
    minorVersion,
    registerIndex,
    selector,
    destination = false,
    atomic = false
)
{
    const operand = particleOperand(
        "uav",
        registerIndex,
        atomic ? "none" : destination ? "mask" : "select1",
        atomic ? "" : selector,
        atomic ? 0 : 4
    );
    if (minorVersion === 1)
    {
        operand.indices = [
            sortIndex(0, registerIndex),
            sortIndex(1, registerIndex)
        ];
        operand.resourceReference = {
            bindingModel: "sm5.1-range",
            rangeId: registerIndex,
            nonUniform: false,
            absoluteIndex: sortIndex(1, registerIndex),
            bufferIndex: null,
            vectorOffset: null
        };
    }
    return operand;
}

function particleConstantBuffer(minorVersion)
{
    const operand = particleOperand(
        "constant_buffer",
        minorVersion === 0 ? 3 : 0,
        "select1",
        "x"
    );
    operand.indices = minorVersion === 0
        ? [ sortIndex(0, 3), sortIndex(1, 0) ]
        : [ sortIndex(0, 0), sortIndex(1, 3), sortIndex(2, 0) ];
    if (minorVersion === 1)
    {
        operand.resourceReference = {
            bindingModel: "sm5.1-range",
            rangeId: 0,
            nonUniform: false,
            absoluteIndex: null,
            bufferIndex: sortIndex(1, 3),
            vectorOffset: sortIndex(2, 0)
        };
    }
    return operand;
}

function particleTemp(registerIndex, selector, destination = false)
{
    return particleOperand(
        "temp",
        registerIndex,
        destination ? "mask" : "select1",
        selector
    );
}

function particleLocalIndex()
{
    return particleOperand(
        "input_thread_id_in_group_flattened",
        null,
        "select1",
        "x"
    );
}

function particleTypedDeclarationOperand(minorVersion, registerIndex)
{
    const operand = particleOperand(
        "uav",
        registerIndex,
        minorVersion === 0 ? "none" : "swizzle",
        minorVersion === 0 ? "" : "xyzw",
        minorVersion === 0 ? 0 : 4
    );
    operand.indices = minorVersion === 0
        ? [ sortIndex(0, registerIndex) ]
        : [
            sortIndex(0, registerIndex),
            sortIndex(1, registerIndex),
            sortIndex(2, registerIndex)
        ];
    return particleFrame(
        operand,
        minorVersion === 0 ? 1171456 : 3272262,
        30,
        minorVersion === 0 ? 2 : 4
    );
}

function particleStructuredDeclarationOperand(minorVersion, registerIndex)
{
    return particleTypedDeclarationOperand(minorVersion, registerIndex);
}

function particleConstantDeclarationOperand(minorVersion)
{
    const operand = particleOperand(
        "constant_buffer",
        minorVersion === 0 ? 3 : 0,
        "swizzle",
        "xyzw"
    );
    operand.indices = minorVersion === 0
        ? [ sortIndex(0, 3), sortIndex(1, 1) ]
        : [ sortIndex(0, 0), sortIndex(1, 3), sortIndex(2, 3) ];
    return particleFrame(
        operand,
        minorVersion === 0 ? 2133574 : 3182150,
        8,
        minorVersion === 0 ? 3 : 4
    );
}

function particleInputDeclarationOperand()
{
    return particleFrame(
        particleOperand(
            "input_thread_id_in_group_flattened",
            null,
            "none",
            "",
            0
        ),
        147456,
        36,
        1
    );
}

function particleBindingData(minorVersion, data, rangeId, binding)
{
    return minorVersion === 0
        ? data
        : {
            ...data,
            bindingModel: "sm5.1-range",
            bindingRange: particleRange(rangeId, binding)
        };
}

function particleResetFixture(minorVersion)
{
    const typed = typedReturn("sint");
    typed.token = 13107;
    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(
                3,
                "dcl_unordered_access_view_typed",
                particleBindingData(minorVersion, {
                    resourceDimension: 1,
                    resourceDimensionName: "buffer",
                    globallyCoherent: false,
                    returnType: typed,
                    registerIndex: 0
                }, 0, 0),
                particleTypedDeclarationOperand(minorVersion, 0)
            ),
            declaration(minorVersion === 0 ? 7 : 10, "dcl_thread_group", {
                threadGroupX: 1,
                threadGroupY: 1,
                threadGroupZ: 1
            }),
            instruction(20, "store_uav_typed", [
                particleUav(minorVersion, 0, "xyzw", true),
                particleImmediate(0, 0, 0, 0),
                particleImmediate(0, 0, 0, 0)
            ]),
            instruction(30, "ret", [])
        ]
    };
}

function particleClearFixture(minorVersion)
{
    const typed = typedReturn("sint");
    typed.token = 13107;
    const local = particleLocalIndex;
    let offset = 50;
    const op = (opcodeName, operands = [], values = {}) =>
    {
        const result = instruction(offset, opcodeName, operands, values);
        offset += 10;
        return result;
    };
    const body = [
        op("ushr", [
            particleTemp(0, "x", true),
            particleConstantBuffer(minorVersion),
            particleImmediate(8)
        ]),
        op("mov", [
            particleTemp(0, "y", true),
            particleImmediate(0)
        ]),
        op("loop"),
        op("uge", [
            particleTemp(0, "z", true),
            particleTemp(0, "y"),
            particleTemp(0, "x")
        ]),
        op("breakc", [ particleTemp(0, "z") ], {
            testBoolean: "nonzero"
        }),
        op("bfi", [
            particleTemp(0, "z", true),
            particleImmediate(24),
            particleImmediate(8),
            particleTemp(0, "y"),
            local()
        ]),
        op("store_structured", [
            particleUav(minorVersion, 2, "xyzw", true),
            particleTemp(0, "z"),
            particleImmediate(0),
            particleImmediate(0, 0, 0, 0xbf800000)
        ]),
        op("store_structured", [
            particleUav(minorVersion, 2, "xyzw", true),
            particleTemp(0, "z"),
            particleImmediate(16),
            particleImmediate(0, 0, 0, 0)
        ]),
        op("imm_atomic_iadd", [
            particleTemp(1, "x", true),
            particleUav(minorVersion, 1, "", false, true),
            particleImmediate(0),
            particleImmediate(1)
        ]),
        op("store_structured", [
            particleUav(minorVersion, 0, "x", true),
            particleTemp(1, "x"),
            particleImmediate(0),
            particleTemp(0, "z")
        ]),
        op("iadd", [
            particleTemp(0, "y", true),
            particleTemp(0, "y"),
            particleImmediate(1)
        ]),
        op("endloop"),
        op("if", [ local() ], { testBoolean: "zero" }),
        op("and", [
            particleTemp(0, "x", true),
            particleConstantBuffer(minorVersion),
            particleImmediate(0xffffff00)
        ]),
        op("mov", [
            particleTemp(0, "y", true),
            particleTemp(0, "x")
        ]),
        op("loop"),
        op("uge", [
            particleTemp(0, "z", true),
            particleTemp(0, "y"),
            particleConstantBuffer(minorVersion)
        ]),
        op("breakc", [ particleTemp(0, "z") ], {
            testBoolean: "nonzero"
        }),
        op("store_structured", [
            particleUav(minorVersion, 2, "xyzw", true),
            particleTemp(0, "y"),
            particleImmediate(0),
            particleImmediate(0, 0, 0, 0xbf800000)
        ]),
        op("store_structured", [
            particleUav(minorVersion, 2, "xyzw", true),
            particleTemp(0, "y"),
            particleImmediate(16),
            particleImmediate(0, 0, 0, 0)
        ]),
        op("imm_atomic_iadd", [
            particleTemp(1, "x", true),
            particleUav(minorVersion, 1, "", false, true),
            particleImmediate(0),
            particleImmediate(1)
        ]),
        op("store_structured", [
            particleUav(minorVersion, 0, "x", true),
            particleTemp(1, "x"),
            particleImmediate(0),
            particleTemp(0, "y")
        ]),
        op("iadd", [
            particleTemp(0, "y", true),
            particleTemp(0, "y"),
            particleImmediate(1)
        ]),
        op("endloop"),
        op("endif"),
        op("ret")
    ];
    return {
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion
        },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            declaration(2, "dcl_global_flags", {
                globalFlags: 1 << 11,
                refactoringAllowed: true
            }),
            declaration(
                3,
                "dcl_constant_buffer",
                particleBindingData(minorVersion, {
                    accessPattern: "immediate_indexed",
                    registerIndex: 3,
                    sizeInVec4: 1
                }, 0, 3),
                particleConstantDeclarationOperand(minorVersion)
            ),
            declaration(
                10,
                "dcl_unordered_access_view_structured",
                particleBindingData(minorVersion, {
                    globallyCoherent: false,
                    structureStride: 4,
                    registerIndex: 0
                }, 0, 0),
                particleStructuredDeclarationOperand(minorVersion, 0)
            ),
            declaration(
                17,
                "dcl_unordered_access_view_typed",
                particleBindingData(minorVersion, {
                    resourceDimension: 1,
                    resourceDimensionName: "buffer",
                    globallyCoherent: false,
                    returnType: typed,
                    registerIndex: 1
                }, 1, 1),
                particleTypedDeclarationOperand(minorVersion, 1)
            ),
            declaration(
                24,
                "dcl_unordered_access_view_structured",
                particleBindingData(minorVersion, {
                    globallyCoherent: false,
                    structureStride: 32,
                    registerIndex: 2
                }, 2, 2),
                particleStructuredDeclarationOperand(minorVersion, 2)
            ),
            declaration(31, "dcl_input", {
                registerIndex: null,
                operandType: 36,
                operandTypeName: "input_thread_id_in_group_flattened"
            }, particleInputDeclarationOperand()),
            declaration(33, "dcl_temps", { tempCount: 2 }),
            declaration(35, "dcl_thread_group", {
                threadGroupX: 16,
                threadGroupY: 16,
                threadGroupZ: 1
            }),
            ...body
        ]
    };
}

function particleIr(minorVersion, role)
{
    return CjsWebgpuFormat.buildShaderIr(
        role === "reset"
            ? particleResetFixture(minorVersion)
            : particleClearFixture(minorVersion),
        { source: `synthetic-particle-${role}-sm5${minorVersion}` }
    );
}

function particleEffectDescription()
{
    const stage = (stageName, uavs) => ({
        m_exists: true,
        cjsShaderBytecode: { stageName },
        resources: new Map(),
        uavs: new Map(uavs.map((entry) => [
            entry.registerIndex,
            {
                name: entry.name,
                type: entry.type,
                arrayElements: entry.arrayElements
            }
        ]))
    });
    return {
        techniques: [ {
            name: "Main",
            passes: [
                {
                    stageInputs: [ stage("compute", [
                        {
                            registerIndex: 0,
                            name: "ParticleCounters",
                            type: 10,
                            arrayElements: 1
                        }
                    ]) ]
                },
                {
                    stageInputs: [ stage("compute", [
                        {
                            registerIndex: 0,
                            name: "DeadBuffer",
                            type: 11,
                            arrayElements: 1
                        },
                        {
                            registerIndex: 1,
                            name: "ParticleCounters",
                            type: 10,
                            arrayElements: 1
                        },
                        {
                            registerIndex: 2,
                            name: "ParticleBuffer",
                            type: 11,
                            arrayElements: 1
                        }
                    ]) ]
                }
            ]
        } ]
    };
}

test("particle clear effect proof keeps reset effect-only and emits both exact profiles", () =>
{
    for (const minorVersion of [ 0, 1 ])
    {
        const reset = particleIr(minorVersion, "reset");
        const clear = particleIr(minorVersion, "clear");
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(reset),
            /whole-effect R32_SINT companion proof/u
        );
        assert.throws(
            () => CjsWebgpuFormat.buildWgslBindingPlan([ reset ]),
            /whole-effect R32_SINT companion proof/u
        );

        const context = preflightParticleClearEffectProfile(
            particleEffectDescription(),
            new Map([
                [ "Main.pass0.compute", reset ],
                [ "Main.pass1.compute", clear ]
            ])
        );
        const resetProof = particleClearEffectProofFor(
            context,
            "Main.pass0.compute"
        );
        const clearProof = particleClearEffectProofFor(
            context,
            "Main.pass1.compute"
        );
        const resetPlan = CjsWebgpuFormat.buildWgslBindingPlan(
            [ reset ],
            { effectProfileProof: resetProof }
        );
        const clearPlan = CjsWebgpuFormat.buildWgslBindingPlan(
            [ clear ],
            { effectProfileProof: clearProof }
        );
        const resetCode = CjsWebgpuFormat.buildWgsl(reset, {
            bindingPlan: resetPlan,
            effectProfileProof: resetProof
        }).code;
        const clearCode = CjsWebgpuFormat.buildWgsl(clear, {
            bindingPlan: clearPlan,
            effectProfileProof: clearProof
        }).code;

        assert.match(resetCode, /array<atomic<i32>>/u);
        assert.match(resetCode, /atomicStore\(&u0\[0u\], 0i\);/u);
        assert.match(
            clearCode,
            /@builtin\(local_invocation_index\) local_invocation_index: u32/u
        );
        assert.match(clearCode, /insertBits\(local_invocation_index, block_index, 8u, 24u\)/u);
        assert.equal(
            (clearCode.match(/atomicAdd\(&u1\[0u\], 1i\)/gu) || []).length,
            2
        );
        assert.equal(clearCode.includes("Barrier"), false);
        assert.match(clearCode, /particle_index_blocks < arrayLength\(&u2\) \/ 8u/u);
        assert.match(clearCode, /dead_index_blocks < arrayLength\(&u0\)/u);
        assert.ok(
            clearCode.indexOf("arrayLength(&u2)")
                < clearCode.indexOf("atomicAdd(&u1[0u], 1i)")
        );
    }
});

test("particle clear proof is opaque, program-bound, and reflection-bound", () =>
{
    const reset = particleIr(0, "reset");
    const clear = particleIr(0, "clear");
    const description = particleEffectDescription();
    const context = preflightParticleClearEffectProfile(
        description,
        new Map([
            [ "Main.pass0.compute", reset ],
            [ "Main.pass1.compute", clear ]
        ])
    );
    const proof = particleClearEffectProofFor(
        context,
        "Main.pass0.compute"
    );
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(reset, { effectProfileProof: {} }),
        /whole-effect R32_SINT companion proof/u
    );
    const clonedProgram = particleIr(0, "reset");
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(
            clonedProgram,
            { effectProfileProof: proof }
        ),
        /whole-effect R32_SINT companion proof/u
    );
    const otherReset = particleIr(1, "reset");
    const otherClear = particleIr(1, "clear");
    const otherContext = preflightParticleClearEffectProfile(
        particleEffectDescription(),
        new Map([
            [ "Main.pass0.compute", otherReset ],
            [ "Main.pass1.compute", otherClear ]
        ])
    );
    const otherProof = particleClearEffectProofFor(
        otherContext,
        "Main.pass0.compute"
    );
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(
            otherReset,
            { effectProfileProof: proof }
        ),
        /whole-effect R32_SINT companion proof/u
    );
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(
            reset,
            { effectProfileProof: otherProof }
        ),
        /whole-effect R32_SINT companion proof/u
    );
    assert.throws(
        () => preflightParticleClearEffectProfile(
            description,
            new Map([
                [ "Main.pass0.compute", clear ],
                [ "Main.pass1.compute", reset ]
            ])
        ),
        /particle counter reset requires the exact declaration and body family/u
    );

    const renamed = particleEffectDescription();
    renamed.techniques[0].passes[0].stageInputs[0].uavs.get(0).name
        = "OtherCounters";
    assert.equal(
        preflightParticleClearEffectProfile(
            renamed,
            new Map([
                [ "Main.pass0.compute", reset ],
                [ "Main.pass1.compute", clear ]
            ])
        ),
        null
    );

    const badAtomic = structuredClone(clear);
    badAtomic.instructions[8].operands[3].immediateValues[0].uint32 = 2;
    assert.throws(
        () => preflightParticleClearEffectProfile(
            description,
            new Map([
                [ "Main.pass0.compute", reset ],
                [ "Main.pass1.compute", badAtomic ]
            ])
        ),
        /exact operand shape/u
    );
});

test("particle clear exact validators reject schedule, range, and guard-coarsening drifts", () =>
{
    const clear = particleIr(1, "clear");
    const mutations = [
        (program) =>
        {
            program.instructions[5].operands[1]
                .immediateValues[0].uint32 = 23;
        },
        (program) =>
        {
            program.declarations[3].data.bindingRange.rangeId = 0;
        },
        (program) =>
        {
            program.instructions[9].operands[0].registerIndex = 2;
            program.instructions[9].operands[0].indices[0].values[0] = 2;
        },
        (program) =>
        {
            program.declarations[4].data.structureStride = 28;
        },
        (program) =>
        {
            program.declarations[6].data.tempCount = 3;
        },
        (program) =>
        {
            program.declarations[7].data.threadGroupX = 8;
        },
        (program) =>
        {
            program.declarations[5].data.operandTypeName
                = "input_thread_id_in_group";
        },
        (program) =>
        {
            program.declarations[3].data.returnType.token = 0;
        },
        (program) =>
        {
            program.declarations[2].operands[0].token = 0;
        },
        (program) =>
        {
            program.instructions[8].operands[1].modifierName = "neg";
        },
        (program) =>
        {
            program.instructions[20].operands[3].minPrecisionName
                = "uint_16";
        },
        (program) =>
        {
            program.instructions[18].tailTokens = [ 1 ];
        },
        (program) =>
        {
            program.instructions[12].testBoolean = "nonzero";
        },
        (program) =>
        {
            program.controlFlow.edgeCount += 1;
        },
        (program) =>
        {
            program.instructions[16].typeInfo.resultType = "int32";
        }
    ];
    for (const mutate of mutations)
    {
        const changed = structuredClone(clear);
        mutate(changed);
        assert.throws(
            () => lowerComputeProgram(changed),
            /WGSL (?:particle|compute)/u
        );
    }

    const reset = particleIr(0, "reset");
    const description = particleEffectDescription();
    const changedReset = structuredClone(reset);
    changedReset.instructions[0].operands[2]
        .immediateValues[3].uint32 = 1;
    assert.throws(
        () => preflightParticleClearEffectProfile(
            description,
            new Map([
                [ "Main.pass0.compute", changedReset ],
                [ "Main.pass1.compute", particleIr(0, "clear") ]
            ])
        ),
        /exact operand shape/u
    );
});

test("particle clear block and tail loops cover each u32 index below practical counts once", () =>
{
    const counts = [ 0, 1, 17, 255, 256, 257, 511, 512, 777, 4095 ];
    for (let seed = 0x91e10da5, index = 0; index < 40; index += 1)
    {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        counts.push(seed % 5000);
    }
    for (const count of counts)
    {
        const visits = [];
        const fullBlocks = count >>> 8;
        for (let lane = 0; lane < 256; lane += 1)
        {
            for (let block = 0; block < fullBlocks; block += 1)
            {
                visits.push(((block << 8) | lane) >>> 0);
            }
        }
        for (let particle = count & 0xffffff00;
            particle < count;
            particle += 1)
        {
            visits.push(particle >>> 0);
        }
        visits.sort((left, right) => left - right);
        assert.deepEqual(
            visits,
            Array.from({ length: count }, (_, particle) => particle)
        );
    }
});

function particleDigestFixture()
{
    return {
        kind: "shader-program",
        format: "CJS_SHADER_IR",
        formatVersion: 1,
        source: "ignored-source",
        stage: "compute",
        programType: 5,
        shaderModel: { major: 5, minor: 0 },
        signatures: { input: [], output: [], patch: [] },
        declarations: [ {
            kind: "declaration",
            opcodeName: "dcl_thread_group",
            data: {
                threadGroupX: 16,
                threadGroupY: 16,
                threadGroupZ: 1
            },
            operands: []
        } ],
        bindings: [ {
            kind: "binding",
            resourceKind: "storage-resource",
            registerIndex: 1,
            returnType: {
                returnTypeNames: [ "sint", "sint", "sint", "sint" ]
            }
        } ],
        immediateConstantBuffer: null,
        constTables: null,
        instructions: [ {
            kind: "instruction",
            index: 0,
            dxbcOffset: 45,
            opcode: 180,
            opcodeName: "imm_atomic_iadd",
            controlKind: null,
            testBoolean: null,
            saturate: false,
            preciseMask: "",
            operands: [ {
                typeName: "temp",
                registerIndex: 9,
                componentCount: 4,
                selectionModeName: "mask",
                mask: "x",
                swizzle: "",
                selected: "",
                modifierName: "none",
                minPrecisionName: "default",
                nonUniform: false,
                indices: [ {
                    dimension: 0,
                    representation: 0,
                    values: [ 9 ],
                    relative: null
                } ],
                immediateValues: [
                    { uint32: 0xffffffff, float32: Number.NaN },
                    { uint32: 0, float32: -0 }
                ]
            } ],
            dataflow: { ignored: true },
            typeInfo: { ignored: true }
        } ],
        blocks: [ { ignored: true } ],
        controlFlow: { ignored: true },
        values: [ { ignored: true } ],
        typeSystem: { scalar: "u32" }
    };
}

test("browser-safe SHA-256 matches node:crypto known and varied vectors", () =>
{
    const messages = [
        "",
        "abc",
        "The quick brown fox jumps over the lazy dog",
        "\u0000\u0001\u00ff\u0100",
        "particle-\u03c0-\ud83d\udc14",
        "x".repeat(55),
        "x".repeat(56),
        "x".repeat(63),
        "x".repeat(64),
        "x".repeat(65),
        "0123456789abcdef".repeat(257)
    ];
    let seed = 0x5eedc0de;
    for (let index = 0; index < 40; index += 1)
    {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        messages.push(`${index}:${seed.toString(16)}:${"z".repeat(seed % 173)}`);
    }
    for (const message of messages)
    {
        assert.equal(
            sha256Utf8(message),
            createHash("sha256").update(message).digest("hex")
        );
    }
});

test("browser-safe SHA-256 hashes exact byte views", () =>
{
    const storage = Uint8Array.from([
        0xde, 0xad, 0x00, 0xff, 0x80, 0x01, 0xbe, 0xef
    ]);
    const view = storage.subarray(2, 6);
    const expected = createHash("sha256").update(view).digest("hex");

    assert.equal(sha256Bytes(view), expected);
    assert.equal(
        sha256Bytes(new DataView(storage.buffer, 2, 4)),
        expected
    );
    assert.equal(
        sha256Bytes(view.slice().buffer),
        expected
    );
    assert.notEqual(
        sha256Bytes(storage),
        expected
    );
    assert.throws(
        () => sha256Bytes("not bytes"),
        /must be Uint8Array, ArrayBuffer, or ArrayBufferView/
    );
});

test("particle emit digest is lossless across aliases, presence, descriptors, and numeric types", () =>
{
    const fixture = particleDigestFixture();
    const expected = particleEmitSemanticDigest(fixture);
    const ignored = structuredClone(fixture);
    ignored.source = "another-source";
    ignored.blocks[0].ignored = false;
    ignored.controlFlow.ignored = false;
    ignored.values[0].ignored = false;
    ignored.instructions[0].dataflow.ignored = false;
    ignored.instructions[0].typeInfo.ignored = false;
    assert.equal(particleEmitSemanticDigest(ignored), expected);

    const operand = (program) => program.instructions[0].operands[0];
    const mutations = [
        (program) => { program.instructions[0].kind = "declaration"; },
        (program) => { program.instructions[0].opcode = "180"; },
        (program) => { program.instructions[0].opcode = -1; },
        (program) => { program.instructions[0].opcode = 0x100000000; },
        (program) => { program.instructions[0].opcode = -0; },
        (program) => { program.instructions[0].opcode = Number.NaN; },
        (program) => { program.instructions[0].opcode = Number.POSITIVE_INFINITY; },
        (program) => { program.instructions[0].opcodeName = "atomic_iadd"; },
        (program) => { program.instructions[0].saturate = 0; },
        (program) => { program.instructions[0].saturate = null; },
        (program) => { operand(program).nonUniform = 0; },
        (program) => { operand(program).nonUniform = null; },
        (program) => { operand(program).mask = ""; },
        (program) => { operand(program).swizzle = "x"; },
        (program) => { operand(program).selected = "x"; },
        (program) => { operand(program).indices[0].relative = false; },
        (program) => { delete operand(program).indices[0].relative; },
        (program) => { operand(program).indices[0].relative = undefined; },
        (program) => { program.instructions[0].extensions = false; },
        (program) => { program.instructions[0].extensions = null; },
        (program) => { program.instructions[0].extensions = undefined; },
        (program) =>
        {
            operand(program).immediateValues[0].uint32 = "4294967295";
        },
        (program) =>
        {
            operand(program).immediateValues[0].uint32 = -1;
        },
        (program) =>
        {
            operand(program).immediateValues[0].uint32 = 0x100000000;
        },
        (program) =>
        {
            operand(program).immediateValues[0].float32 = 0;
        },
        (program) =>
        {
            operand(program).immediateValues[1].float32 = 0;
        },
        (program) =>
        {
            delete operand(program).immediateValues[1];
        },
        (program) =>
        {
            program.signatures.input.push(undefined);
            delete program.signatures.input[0];
        },
        (program) => { delete program.signatures.patch; },
        (program) => { program.signatures.patch = undefined; },
        (program) => { program.immediateConstantBuffer = false; },
        (program) => { program.constTables = undefined; },
        (program) => { program.extraSemanticField = undefined; },
        (program) => { operand(program).extra = undefined; },
        (program) => { operand(program).toJSON = () => ({ mask: "x" }); },
        (program) =>
        {
            const value = operand(program);
            delete value.mask;
            Object.setPrototypeOf(value, { mask: "x" });
        },
        (program) =>
        {
            Object.defineProperty(
                operand(program).immediateValues[0],
                "uint32",
                { get: () => 0xffffffff, enumerable: true }
            );
        }
    ];
    for (const mutate of mutations)
    {
        const changed = structuredClone(fixture);
        mutate(changed);
        assert.notEqual(particleEmitSemanticDigest(changed), expected);
    }
});

const PARTICLE_EMIT_DX11_EFFECT =
    process.env.CJS_PARTICLE_EMIT_DX11_EFFECT || "";
const PARTICLE_EMIT_DX12_EFFECT =
    process.env.CJS_PARTICLE_EMIT_DX12_EFFECT || "";
const HAS_GENUINE_PARTICLE_EMIT_FIXTURES =
    Boolean(PARTICLE_EMIT_DX11_EFFECT && PARTICLE_EMIT_DX12_EFFECT);

function particleEmitShaderBytes(effectPath)
{
    const effectBytes = new Uint8Array(readFileSync(effectPath));
    const analysis = readEffectAnalysis(effectBytes, { source: effectPath });
    for (const technique of analysis.effectDescription.techniques || [])
    {
        for (const pass of technique.passes || [])
        {
            for (const stage of pass.stageInputs.filter(Boolean))
            {
                if (stage.m_exists
                    && stage.cjsShaderBytecode?.stageName === "compute")
                {
                    return Uint8Array.from(stage.cjsShaderBytecode.bytes);
                }
            }
        }
    }
    throw new Error("Genuine particle-emitter effect has no compute shader");
}

test("genuine SM5.0 particle emit lowers with guarded signed atomic and complete records", {
    skip: !HAS_GENUINE_PARTICLE_EMIT_FIXTURES
}, () =>
{
    const bytes = particleEmitShaderBytes(PARTICLE_EMIT_DX11_EFFECT);
    const ir = CjsWebgpuFormat.buildShaderIr(bytes, {
        source: "genuine-particle-emit-sm50"
    });
    assert.equal(isParticleEmitComputeCandidate(ir), true);
    const result = CjsWebgpuFormat.buildWgsl(ir);
    assert.deepEqual(
        result.threadGroupSize,
        [ 16, 16, 1 ]
    );
    assert.match(result.code, /var<workgroup> g0: array<u32, 28>;/u);
    assert.match(result.code, /array<vec4<f32>, 4096>/u);
    assert.match(result.code, /array<atomic<i32>>/u);
    assert.match(
        result.code,
        /bitcast<u32>\(atomicAdd\(&u1\[0u\], -1i\)\)/u
    );
    assert.match(
        result.code,
        /bitcast<i32>\(r7\.y\) >= bitcast<i32>\(0x00000000u\)/u
    );
    assert.equal(
        result.code.match(/workgroupBarrier\(\);/gu)?.length,
        1
    );
    assert.equal(
        result.code.match(/cb3\[min\(cb_row_\d+, 4095u\)\]/gu)?.length,
        7
    );
    assert.match(
        result.code,
        /select\(vec4<f32>\(\), cb3\[min\(cb_row_1, 4095u\)\], cb_row_1 < 4096u\)/u
    );
    assert.match(
        result.code,
        /r7\.y = select\(0u, u2\[dead_safe_index\], r7\.y < dead_length\);/u
    );
    assert.match(
        result.code,
        /if \(r7\.y < \(arrayLength\(&u0\) \/ 8u\)\)/u
    );
    assert.equal(
        result.code.match(/u0\[\(record_word_base \+ [0-7]u\)\] = r[89]\.[xyzw];/gu)
            ?.length,
        8
    );
    assert.ok(
        result.code.indexOf("workgroupBarrier();")
            < result.code.indexOf("atomicAdd(&u1[0u], -1i)")
    );
    assert.ok(
        result.code.indexOf("atomicAdd(&u1[0u], -1i)")
            < result.code.indexOf("if (r7.y < (arrayLength(&u0) / 8u))")
    );
});

test("genuine SM5.1 particle emit is exact comparison-only and fails closed", {
    skip: !HAS_GENUINE_PARTICLE_EMIT_FIXTURES
}, () =>
{
    const bytes = particleEmitShaderBytes(PARTICLE_EMIT_DX12_EFFECT);
    const ir = CjsWebgpuFormat.buildShaderIr(bytes, {
        source: "genuine-particle-emit-sm51"
    });
    assert.equal(isParticleEmitComputeCandidate(ir), true);
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(ir),
        /particle emit SM5\.1 is comparison-only/u
    );
    const nearMiss = structuredClone(ir);
    nearMiss.instructions[45].opcode = "180";
    assert.equal(isParticleEmitComputeCandidate(nearMiss), false);
    assert.throws(
        () => CjsWebgpuFormat.buildWgsl(nearMiss),
        /WGSL compute body slice currently supports only SM5\.0/u
    );
});

test("genuine SM5.0 particle emit rejects all former canonicalization aliases", {
    skip: !HAS_GENUINE_PARTICLE_EMIT_FIXTURES
}, () =>
{
    const bytes = particleEmitShaderBytes(PARTICLE_EMIT_DX11_EFFECT);
    const ir = CjsWebgpuFormat.buildShaderIr(bytes, {
        source: "genuine-particle-emit-attacks"
    });
    const baseline = particleEmitSemanticDigest(ir);
    const operand = (program) => program.instructions[1].operands[1];
    const mutations = [
        (program) => { program.instructions[45].opcode = "180"; },
        (program) =>
        {
            program.instructions[45].operands[3]
                .immediateValues[0].uint32 = -1;
        },
        (program) =>
        {
            program.instructions[45].operands[3]
                .immediateValues[0].uint32 = 0x100000000;
        },
        (program) => { program.instructions[1].saturate = 0; },
        (program) => { operand(program).nonUniform = 0; },
        (program) => { operand(program).mask = "y"; },
        (program) => { operand(program).swizzle = "x"; },
        (program) => { operand(program).selected = "x"; },
        (program) => { operand(program).indices[0].relative = false; },
        (program) => { delete operand(program).indices[0].relative; },
        (program) => { program.instructions[1].extensions = false; },
        (program) => { program.instructions[1].extensions = null; },
        (program) => { program.instructions[1].extensions = undefined; },
        (program) => { delete program.signatures.patch; },
        (program) => { program.signatures.patch = undefined; },
        (program) => { program.immediateConstantBuffer = false; },
        (program) => { program.constTables = false; },
        (program) => { program.extraSemanticField = undefined; },
        (program) => { operand(program).extra = undefined; },
        (program) => { operand(program).toJSON = () => ({}); },
        (program) =>
        {
            const value = operand(program);
            delete value.mask;
            Object.setPrototypeOf(value, { mask: "x" });
        },
        (program) =>
        {
            Object.defineProperty(
                program.instructions[45].operands[3].immediateValues[0],
                "uint32",
                { get: () => 0xffffffff, enumerable: true }
            );
        },
        (program) => { delete program.declarations[1]; },
        (program) => { delete program.instructions[1]; }
    ];
    for (const mutate of mutations)
    {
        const changed = structuredClone(ir);
        mutate(changed);
        assert.notEqual(particleEmitSemanticDigest(changed), baseline);
        assert.equal(isParticleEmitComputeCandidate(changed), false);
        assert.throws(
            () => lowerParticleEmitComputeProgram(changed),
            /particle emit requires the exact declaration family/u
        );
        assert.throws(
            () => CjsWebgpuFormat.buildWgsl(changed),
            /WGSL/u
        );
    }
});

test("particle emit CPU oracles cover TGSM, signed pop, OOB loads, and record stores", () =>
{
    const rowValue = (row, lane) => ((row << 4) | lane) >>> 0;
    const initialize = (groupId) =>
    {
        const words = new Array(28).fill(0xdecafbad);
        const base = Math.imul(groupId >>> 0, 7) >>> 0;
        let word = 0;
        for (let offset = 1; offset <= 7; offset += 1)
        {
            const row = (base + offset) >>> 0;
            const width = offset === 7 ? 1 : 4;
            for (let lane = 0; lane < width; lane += 1)
            {
                words[word] = row < 4096 ? rowValue(row, lane) : 0;
                word += 1;
            }
        }
        return words;
    };
    for (const groupId of [ 0, 1, 584, 585, 0xffffffff ])
    {
        const words = initialize(groupId);
        assert.equal(words.length, 28);
        assert.deepEqual(words.slice(25), new Array(3).fill(0xdecafbad));
        assert.ok(words.slice(0, 25).every((word) =>
            Number.isInteger(word) && word >= 0 && word <= 0xffffffff));
    }
    assert.ok(initialize(584).slice(0, 25).some((word) => word !== 0));
    assert.ok(initialize(585).slice(0, 25).every((word) => word === 0));

    const pop = (counter) =>
    {
        const old = counter | 0;
        const next = (old - 1) | 0;
        return { stored: next, old, deadIndex: next, success: next >= 0 };
    };
    assert.deepEqual(pop(2), {
        stored: 1, old: 2, deadIndex: 1, success: true
    });
    assert.deepEqual(pop(1), {
        stored: 0, old: 1, deadIndex: 0, success: true
    });
    assert.deepEqual(pop(0), {
        stored: -1, old: 0, deadIndex: -1, success: false
    });
    assert.equal(pop(-0x80000000).stored, 0x7fffffff);
    assert.equal(pop(-0x80000000).success, true);

    const deadLoad = (values, index) =>
        index >= 0 && index < values.length ? values[index] : 0;
    assert.equal(deadLoad([ 9, 7 ], 0), 9);
    assert.equal(deadLoad([ 9, 7 ], 2), 0);
    assert.equal(deadLoad([], 0), 0);

    const storeRecord = (wordLength, recordIndex) =>
    {
        const words = new Array(wordLength).fill(0);
        if (recordIndex < Math.floor(wordLength / 8))
        {
            for (let lane = 0; lane < 8; lane += 1)
            {
                words[recordIndex * 8 + lane] = lane + 1;
            }
        }
        return words;
    };
    for (let wordLength = 0; wordLength <= 65; wordLength += 1)
    {
        for (let record = 0; record < 10; record += 1)
        {
            const words = storeRecord(wordLength, record);
            const changed = words
                .map((value, index) => value ? index : -1)
                .filter((index) => index >= 0);
            const admitted = record < Math.floor(wordLength / 8);
            assert.equal(changed.length, admitted ? 8 : 0);
            if (admitted)
            {
                assert.deepEqual(
                    changed,
                    Array.from(
                        { length: 8 },
                        (_, lane) => record * 8 + lane)
                );
            }
        }
    }

    for (const limit of [ 0, 1, 255, 256, 257, 4095, 65535 ])
    {
        const visits = [];
        for (let lane = 0; lane < 256; lane += 1)
        {
            for (let index = lane; index < limit; index += 256)
            {
                visits.push(index);
            }
        }
        visits.sort((left, right) => left - right);
        assert.deepEqual(
            visits,
            Array.from({ length: limit }, (_, index) => index)
        );
    }
});
