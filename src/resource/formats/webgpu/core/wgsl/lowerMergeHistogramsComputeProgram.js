import { clonePlain } from "#utils/object";
import { analyzeRegisterValues } from "../ir/analyzeRegisterValues.js";
import { buildControlFlow } from "../ir/buildControlFlow.js";
import { inferValueTypes } from "../ir/inferValueTypes.js";
import { resolveRegisterFlow } from "../ir/resolveRegisterFlow.js";
import { lowerBindingLayout } from "./lowerBindingLayout.js";
import { requireRefactoringAllowed } from "./precisionControls.js";
import { buildSelectionPlans } from "./selectionPlans.js";

const COMPONENTS = Object.freeze([ "x", "y", "z", "w" ]);
const DECLARATION_OPCODES = Object.freeze([
    "dcl_global_flags",
    "dcl_constant_buffer",
    "dcl_resource",
    "dcl_unordered_access_view_typed",
    "dcl_input",
    "dcl_input",
    "dcl_temps",
    "dcl_thread_group_shared_memory_structured",
    "dcl_thread_group"
]);
const BODY_OPCODES = Object.freeze([
    "ult", "if", "store_structured", "endif", "sync", "ftou", "imul", "ult",
    "if", "ishl", "ushr", "mov", "mov", "mov", "loop", "uge", "breakc",
    "ushr", "iadd", "ld", "atomic_iadd", "iadd", "atomic_iadd", "iadd",
    "atomic_iadd", "atomic_iadd", "iadd", "endloop", "endif", "sync", "if",
    "ld_structured", "atomic_iadd", "endif", "ret"
]);
const BODY_OPERANDS_SM50 = Object.freeze([
    "temp:0:x:0::none:default:uniform:4 | input_thread_id_in_group::x:::none:default:uniform:4 | immediate32::::#64:none:default:uniform:1",
    "temp:0:x:0::none:default:uniform:4",
    "thread_group_shared_memory:0:x:0::none:default:uniform:4 | input_thread_id_in_group::x:::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | immediate32::::#0:none:default:uniform:1",
    "",
    "",
    "temp:0:yz:0::none:default:uniform:4 | constant_buffer:0:xxyx:0,0::none:default:uniform:4",
    "null:::::none:default:uniform:0 | temp:0:y:0::none:default:uniform:4 | temp:0:z:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:0:y:0::none:default:uniform:4 | input_thread_id::x:::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:0:y:0::none:default:uniform:4",
    "temp:0:y:0::none:default:uniform:4 | input_thread_id::x:::none:default:uniform:4 | immediate32::::#6:none:default:uniform:1",
    "temp:0:y:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4 | immediate32::::#2:none:default:uniform:1",
    "temp:1:z:1::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1",
    "temp:2:yw:2::none:default:uniform:4 | immediate32::::#0,#0,#0,#0:none:default:uniform:4",
    "temp:2:x:2::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1",
    "",
    "temp:0:z:0::none:default:uniform:4 | temp:2:x:2::none:default:uniform:4 | immediate32::::#64:none:default:uniform:1",
    "temp:0:z:0::none:default:uniform:4",
    "temp:0:z:0::none:default:uniform:4 | temp:2:x:2::none:default:uniform:4 | immediate32::::#2:none:default:uniform:1",
    "temp:0:z:0::none:default:uniform:4 | temp:0:z:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:3:xyzw:3::none:default:uniform:4 | temp:0:zzzz:0::none:default:uniform:4 | resource:0:xyzw:0::none:default:uniform:4",
    "thread_group_shared_memory:0::0::none:default:uniform:0 | temp:2:xyxx:2::none:default:uniform:4 | temp:3:x:3::none:default:uniform:4",
    "temp:1:xy:1::none:default:uniform:4 | temp:2:xxxx:2::none:default:uniform:4 | immediate32::::#1,#3,#0,#0:none:default:uniform:4",
    "thread_group_shared_memory:0::0::none:default:uniform:0 | temp:1:xzxx:1::none:default:uniform:4 | temp:3:y:3::none:default:uniform:4",
    "temp:2:z:2::none:default:uniform:4 | temp:2:x:2::none:default:uniform:4 | immediate32::::#2:none:default:uniform:1",
    "thread_group_shared_memory:0::0::none:default:uniform:0 | temp:2:zwzz:2::none:default:uniform:4 | temp:3:z:3::none:default:uniform:4",
    "thread_group_shared_memory:0::0::none:default:uniform:0 | temp:1:yzyy:1::none:default:uniform:4 | temp:3:w:3::none:default:uniform:4",
    "temp:2:x:2::none:default:uniform:4 | temp:2:x:2::none:default:uniform:4 | immediate32::::#4:none:default:uniform:1",
    "",
    "",
    "",
    "temp:0:x:0::none:default:uniform:4",
    "temp:0:x:0::none:default:uniform:4 | input_thread_id_in_group::x:::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | thread_group_shared_memory:0:xxxx:0::none:default:uniform:4",
    "uav:0::0::none:default:uniform:0 | input_thread_id_in_group::x:::none:default:uniform:4 | temp:0:x:0::none:default:uniform:4",
    "",
    ""
]);
const BODY_OPERANDS_SM51 = Object.freeze(BODY_OPERANDS_SM50.map((signature) =>
    signature
        .replaceAll("constant_buffer:0:xxyx:0,0::", "constant_buffer:0:xxyx:0,0,0::")
        .replaceAll("resource:0:xyzw:0::", "resource:0:xyzw:0,0::")
        .replaceAll("uav:0::0::", "uav:0::0,0::")));
const BLOCK_BEFORE = new Set([
    "loop", "else", "endif", "endloop", "case", "default", "endswitch"
]);
const BLOCK_AFTER = new Set([
    "if", "loop", "switch", "break", "breakc", "continue", "continuec",
    "ret", "retc", "discard", "else", "endif", "endloop", "case", "default",
    "endswitch"
]);
const CONTROL_KIND = Object.freeze({
    if: "selection",
    endif: "selection",
    loop: "loop",
    breakc: "loop",
    endloop: "loop",
    ret: "termination"
});
const SELECTION_STARTS = Object.freeze([ 1, 8, 30 ]);

function buildBlocks(instructions)
{
    const leaders = new Set([ 0 ]);
    for (let index = 0; index < instructions.length; index += 1)
    {
        if (BLOCK_BEFORE.has(instructions[index].opcodeName)) leaders.add(index);
        if (BLOCK_AFTER.has(instructions[index].opcodeName)
            && index + 1 < instructions.length)
        {
            leaders.add(index + 1);
        }
    }
    const starts = Array.from(leaders).sort((left, right) => left - right);
    return starts.map((start, blockIndex) =>
    {
        const end = (starts[blockIndex + 1] ?? instructions.length) - 1;
        const last = instructions[end];
        return {
            kind: "basic-block",
            id: `block${blockIndex}`,
            index: blockIndex,
            startInstruction: start,
            endInstruction: end,
            startDxbcOffset: instructions[start].dxbcOffset,
            endDxbcOffset: last.dxbcOffset,
            instructionIndices: Array.from(
                { length: end - start + 1 },
                (_, offset) => start + offset
            ),
            terminator: CONTROL_KIND[last.opcodeName] ? last.opcodeName : null
        };
    });
}

function analysisSnapshot(program)
{
    return {
        blocks: program.blocks,
        controlFlow: program.controlFlow,
        values: program.values,
        instructions: program.instructions.map((instruction) => ({
            dataflow: instruction.dataflow,
            typeInfo: instruction.typeInfo
        }))
    };
}

function validateAnalysisMetadata(program)
{
    const rebuilt = clonePlain(program);
    rebuilt.instructions = rebuilt.instructions.map((instruction) =>
    {
        delete instruction.dataflow;
        delete instruction.typeInfo;
        return instruction;
    });
    rebuilt.blocks = buildBlocks(rebuilt.instructions);
    delete rebuilt.controlFlow;
    delete rebuilt.values;
    buildControlFlow(rebuilt);
    analyzeRegisterValues(rebuilt);
    resolveRegisterFlow(rebuilt);
    inferValueTypes(rebuilt);
    if (JSON.stringify(analysisSnapshot(program))
        !== JSON.stringify(analysisSnapshot(rebuilt)))
    {
        throw new Error(
            "WGSL merge-histograms compute CFG, SSA, or type metadata is inconsistent"
        );
    }
}

function operandSignature(operand)
{
    const index = (operand.indices || [])
        .map((entry) => entry.values?.join(":") || "?")
        .join(",");
    const immediate = (operand.immediateValues || [])
        .map((entry) => `#${entry.uint32 >>> 0}`)
        .join(",");
    return [
        operand.typeName,
        Number.isInteger(operand.registerIndex) ? operand.registerIndex : "",
        operand.mask || operand.swizzle || operand.selected || "",
        index,
        immediate,
        operand.modifierName ?? "none",
        operand.minPrecisionName ?? "default",
        operand.nonUniform === true ? "nonuniform" : "uniform",
        Number.isInteger(operand.componentCount) ? operand.componentCount : ""
    ].join(":");
}

function instructionOperandSignature(instruction)
{
    return (instruction.operands || []).map(operandSignature).join(" | ");
}

function validateCanonicalIndices(operand, context)
{
    for (const [ index, entry ] of (operand.indices || []).entries())
    {
        if (entry?.dimension !== index
            || entry.representation !== 0
            || entry.relative !== null
            || entry.values?.length !== 1
            || !Number.isInteger(entry.values[0])
            || entry.values[0] < 0)
        {
            throw new Error(
                `WGSL merge-histograms ${context} has non-canonical index metadata`
            );
        }
    }
}

function validateCommonOperand(operand, context)
{
    if (!operand
        || (operand.modifierName ?? "none") !== "none"
        || (operand.minPrecisionName ?? "default") !== "default"
        || operand.nonUniform === true)
    {
        throw new Error(
            `WGSL merge-histograms ${context} has unsupported operand modifiers`
        );
    }
    validateCanonicalIndices(operand, context);
}

function isCanonicalIndex(entry, dimension, value)
{
    return entry?.dimension === dimension
        && entry.representation === 0
        && entry.relative === null
        && entry.values?.length === 1
        && entry.values[0] === value;
}

function validateSm51Range(data, context)
{
    const range = data?.bindingRange;
    if (data?.bindingModel !== "sm5.1-range"
        || range?.bindingModel !== "sm5.1-range"
        || range.rangeId !== 0
        || range.lowerBound !== 0
        || range.upperBound !== 0
        || range.unbounded !== false
        || range.registerCount !== 1
        || range.registerSpace !== 0)
    {
        throw new Error(
            `WGSL merge-histograms ${context} requires one finite SM5.1 range`
        );
    }
}

function validateDeclarationOperand(operand, {
    componentCount, indices, registerIndex, selector, typeName
}, context)
{
    validateCommonOperand(operand, context);
    if (operand.typeName !== typeName
        || operand.registerIndex !== registerIndex
        || operand.componentCount !== componentCount
        || (operand.mask || operand.swizzle || operand.selected || "") !== selector
        || operand.indices?.length !== indices.length
        || indices.some((value, index) => operand.indices[index].values[0] !== value)
        || operand.immediateValues?.length
        || (operand.resourceReference !== undefined
            && operand.resourceReference !== null))
    {
        throw new Error(`WGSL merge-histograms ${context} is malformed`);
    }
}

function validateBuiltinDeclaration(
    declaration,
    typeName,
    operandType,
    componentCount,
    selector
)
{
    const operand = declaration.operands?.[0];
    validateDeclarationOperand(operand, {
        typeName,
        registerIndex: null,
        componentCount,
        selector,
        indices: []
    }, `${typeName} declaration`);
    if (declaration.data?.registerIndex !== null
        || declaration.data.operandType !== operandType
        || declaration.data.operandTypeName !== typeName
        || declaration.operands.length !== 1)
    {
        throw new Error(
            `WGSL merge-histograms compute requires exactly ${typeName}.${selector}`
        );
    }
}

/**
 * Whether declarations select the isolated merge-histograms compute profile.
 * Once selected, all detailed validation errors are final.
 *
 * @param {object} program CJS shader IR program.
 * @returns {boolean} True for the merge-histograms declaration family.
 */
export function isMergeHistogramsComputeProfile(program)
{
    return program?.stage === "compute"
        && program.declarations?.length === DECLARATION_OPCODES.length
        && program.instructions?.length === BODY_OPCODES.length
        && DECLARATION_OPCODES.every((opcodeName, index) =>
            program.declarations[index]?.opcodeName === opcodeName);
}

function validateTypedUintBuffer(declaration, kind, minor)
{
    const label = kind === "resource" ? "t0" : "u0";
    const data = declaration.data;
    if (data?.registerIndex !== 0
        || data.resourceDimension !== 1
        || data.resourceDimensionName !== "buffer"
        || (kind === "resource" && data.sampleCount !== 0)
        || (kind === "uav" && data.globallyCoherent !== false)
        || data.returnType?.returnTypes?.length !== 4
        || data.returnType.returnTypes.some((entry) => entry !== 4)
        || data.returnType?.returnTypeNames?.length !== 4
        || data.returnType.returnTypeNames.some((entry) => entry !== "uint")
        || declaration.operands?.length !== 1)
    {
        throw new Error(
            `WGSL merge-histograms compute requires typed uint Buffer ${label}`
        );
    }
    validateDeclarationOperand(declaration.operands[0], minor === 0
        ? {
            typeName: kind,
            registerIndex: 0,
            componentCount: 0,
            selector: "",
            indices: [ 0 ]
        }
        : {
            typeName: kind,
            registerIndex: 0,
            componentCount: 4,
            selector: "xyzw",
            indices: [ 0, 0, 0 ]
        },
    `${label} declaration`);
}

function validateDeclarations(program)
{
    const minor = program?.shaderModel?.minor;
    if (program?.format !== "CJS_SHADER_IR"
        || program.formatVersion !== 1
        || program.stage !== "compute"
        || program.shaderModel?.major !== 5
        || ![ 0, 1 ].includes(minor))
    {
        throw new TypeError(
            "WGSL merge-histograms compute profile requires CJS SM5.0 or finite-range SM5.1 compute IR"
        );
    }
    if (!isMergeHistogramsComputeProfile(program))
    {
        throw new Error(
            "WGSL merge-histograms compute declaration shape is not supported"
        );
    }
    if (program.declarations.some((declaration) => declaration.tailTokens?.length))
    {
        throw new Error(
            "WGSL merge-histograms compute declarations must not contain trailing payload words"
        );
    }
    if ((program.signatures?.input || []).length
        || (program.signatures?.output || []).length
        || (program.signatures?.patch || []).length
        || program.immediateConstantBuffer
        || program.constTables)
    {
        throw new Error(
            "WGSL merge-histograms compute profile does not support signatures or constant tables"
        );
    }
    requireRefactoringAllowed(program, "merge-histograms compute");

    const [
        global, constants, input, output, localId, dispatchId, temps, shared, group
    ] = program.declarations;
    if (global.data?.globalFlags !== (1 << 11)
        || global.data.refactoringAllowed !== true
        || global.operands?.length)
    {
        throw new Error(
            "WGSL merge-histograms compute requires only the refactoring-allowed global flag"
        );
    }
    if (constants.data?.accessPattern !== "immediate_indexed"
        || constants.data.registerIndex !== 0
        || constants.data.sizeInVec4 !== 1
        || constants.operands?.length !== 1)
    {
        throw new Error(
            "WGSL merge-histograms compute requires immediate one-row cb0"
        );
    }
    validateDeclarationOperand(constants.operands[0], minor === 0
        ? {
            typeName: "constant_buffer",
            registerIndex: 0,
            componentCount: 4,
            selector: "xyzw",
            indices: [ 0, 1 ]
        }
        : {
            typeName: "constant_buffer",
            registerIndex: 0,
            componentCount: 4,
            selector: "xyzw",
            indices: [ 0, 0, 0 ]
        },
    "cb0 declaration");
    validateTypedUintBuffer(input, "resource", minor);
    validateTypedUintBuffer(output, "uav", minor);
    validateBuiltinDeclaration(
        localId, "input_thread_id_in_group", 34, 4, "x"
    );
    validateBuiltinDeclaration(dispatchId, "input_thread_id", 32, 4, "x");
    if (temps.data?.tempCount !== 4 || temps.operands?.length)
    {
        throw new Error(
            "WGSL merge-histograms compute requires exactly four temps"
        );
    }
    if (shared.data?.registerIndex !== 0
        || shared.data.structureStride !== 4
        || shared.data.structureCount !== 64
        || shared.operands?.length !== 1)
    {
        throw new Error(
            "WGSL merge-histograms compute requires g0 with stride 4 and 64 records"
        );
    }
    validateDeclarationOperand(shared.operands[0], {
        typeName: "thread_group_shared_memory",
        registerIndex: 0,
        componentCount: 0,
        selector: "",
        indices: [ 0 ]
    }, "g0 declaration");
    if (group.data?.threadGroupX !== 256
        || group.data?.threadGroupY !== 1
        || group.data?.threadGroupZ !== 1
        || group.operands?.length)
    {
        throw new Error(
            "WGSL merge-histograms compute requires dcl_thread_group 256,1,1"
        );
    }
    if (minor === 1)
    {
        validateSm51Range(constants.data, "cb0 declaration");
        validateSm51Range(input.data, "t0 declaration");
        validateSm51Range(output.data, "u0 declaration");
    }
    else if (constants.data.bindingModel || constants.data.bindingRange
        || input.data.bindingModel || input.data.bindingRange
        || output.data.bindingModel || output.data.bindingRange)
    {
        throw new Error(
            "WGSL merge-histograms SM5.0 declarations must use register bindings"
        );
    }
}

function validateBodyReference(program, instruction, operand, operandIndex)
{
    const context = `instruction ${instruction.index} operand ${operandIndex}`;
    validateCommonOperand(operand, context);
    if (program.shaderModel.minor === 0)
    {
        if (operand.resourceReference !== undefined
            && operand.resourceReference !== null)
        {
            throw new Error(
                `WGSL merge-histograms ${context} has unexpected SM5.1 reference metadata`
            );
        }
        return;
    }
    const reference = operand.resourceReference;
    if ([ "resource", "uav" ].includes(operand.typeName))
    {
        if (reference?.bindingModel !== "sm5.1-range"
            || reference.rangeId !== 0
            || reference.nonUniform !== false
            || !isCanonicalIndex(reference.absoluteIndex, 1, 0)
            || reference.bufferIndex !== null
            || reference.vectorOffset !== null)
        {
            throw new Error(
                `WGSL merge-histograms ${context} has an invalid SM5.1 resource reference`
            );
        }
    }
    else if (operand.typeName === "constant_buffer")
    {
        if (reference?.bindingModel !== "sm5.1-range"
            || reference.rangeId !== 0
            || reference.nonUniform !== false
            || reference.absoluteIndex !== null
            || !isCanonicalIndex(reference.bufferIndex, 1, 0)
            || !isCanonicalIndex(reference.vectorOffset, 2, 0))
        {
            throw new Error(
                `WGSL merge-histograms ${context} has an invalid SM5.1 constant-buffer reference`
            );
        }
    }
    else if (reference !== undefined && reference !== null)
    {
        throw new Error(
            `WGSL merge-histograms ${context} has unexpected resource reference metadata`
        );
    }
}

function validExtensions(program, instruction)
{
    const extensions = instruction.extensions || [];
    if (program.shaderModel.minor === 1) return extensions.length === 0;
    if (instruction.index === 19 && instruction.opcodeName === "ld")
    {
        return extensions.length === 2
            && extensions[0]?.token === 2147483714
            && extensions[0].type === 2
            && extensions[0].typeName === "resource_dimension"
            && extensions[0].resourceDimension === 1
            && extensions[0].resourceDimensionName === "buffer"
            && extensions[0].structureStride === 0
            && extensions[1]?.token === 1118467
            && extensions[1].type === 3
            && extensions[1].typeName === "resource_return_type"
            && extensions[1].resourceReturnTypes?.length === 4
            && extensions[1].resourceReturnTypes.every((entry) => entry === 4);
    }
    return extensions.length === 0;
}

function validateBody(program)
{
    const expectedOperands = program.shaderModel.minor === 0
        ? BODY_OPERANDS_SM50
        : BODY_OPERANDS_SM51;
    if (program.instructions?.length !== BODY_OPCODES.length
        || BODY_OPCODES.some((opcodeName, index) =>
            program.instructions[index]?.opcodeName !== opcodeName
            || instructionOperandSignature(program.instructions[index])
                !== expectedOperands[index]))
    {
        throw new Error(
            "WGSL merge-histograms compute requires the exact bounded body opcode, operand, and modifier sequence"
        );
    }
    for (const [ index, instruction ] of program.instructions.entries())
    {
        const conditional = [ "if", "breakc" ].includes(instruction.opcodeName);
        const sync = instruction.opcodeName === "sync";
        if (instruction.index !== index
            || (index > 0
                && instruction.dxbcOffset
                    <= program.instructions[index - 1].dxbcOffset)
            || instruction.controlKind !== (CONTROL_KIND[instruction.opcodeName] || null)
            || instruction.testBoolean !== (conditional ? "nonzero" : null)
            || instruction.saturate
            || instruction.preciseMask !== ""
            || instruction.tailTokens?.length
            || !validExtensions(program, instruction)
            || (sync
                ? instruction.syncFlags !== 3
                    || JSON.stringify(instruction.syncFlagNames)
                        !== JSON.stringify([
                            "threads_in_group",
                            "thread_group_shared_memory"
                        ])
                : instruction.syncFlags !== undefined
                    || instruction.syncFlagNames !== undefined))
        {
            throw new Error(
                `WGSL merge-histograms instruction ${index} has inconsistent envelope metadata`
            );
        }
        for (const [ operandIndex, operand ] of instruction.operands.entries())
        {
            validateBodyReference(
                program, instruction, operand, operandIndex
            );
        }
    }

    validateAnalysisMetadata(program);
    const originCounts = program.values.reduce((counts, value) =>
    {
        counts[value.origin] = (counts[value.origin] || 0) + 1;
        return counts;
    }, {});
    if (program.blocks.length !== 14
        || program.controlFlow.edgeCount !== 17
        || program.controlFlow.regions.length !== 4
        || program.controlFlow.unreachableBlockIds.length
        || program.values.length !== 30
        || originCounts["instruction-write"] !== 17
        || originCounts["undefined-register"] !== 8
        || originCounts["program-input"] !== 2
        || originCounts["control-flow-merge"] !== 3)
    {
        throw new Error(
            "WGSL merge-histograms compute requires the canonical CFG and register-value shape"
        );
    }
    const values = new Map(program.values.map((value) => [ value.id, value ]));
    for (const instruction of program.instructions)
    {
        for (const ref of instruction.dataflow.reads.flatMap((read) => read.refs))
        {
            if (values.get(ref.valueId)?.origin === "undefined-register")
            {
                throw new Error(
                    `WGSL merge-histograms instruction ${instruction.index} reads undefined register data`
                );
            }
        }
    }

    const plans = buildSelectionPlans(program, "merge-histograms compute");
    if (plans.size !== 4
        || SELECTION_STARTS.some((start) =>
            plans.get(start)?.kind !== "selection"
            || plans.get(start).hasElse
            || plans.get(start).merges.length))
    {
        throw new Error(
            "WGSL merge-histograms compute requires the canonical no-else selections"
        );
    }
    const loop = plans.get(14);
    const merge = loop?.merges?.[0];
    if (loop?.kind !== "loop"
        || loop.preheaderBlockId !== "block4"
        || loop.backedgeBlockId !== "block8"
        || loop.merges.length !== 1
        || merge.id !== "value68"
        || merge.type !== "u32"
        || merge.entryIncoming?.blockId !== "block4"
        || merge.entryIncoming?.valueId !== "value25"
        || merge.entryIncoming?.component !== "x"
        || merge.backedgeIncoming?.valueId !== "value44"
        || merge.backedgeIncoming?.component !== "x"
        || loop.exitMerges.length
        || loop.exitEdges.size)
    {
        throw new Error(
            "WGSL merge-histograms compute requires the canonical four-bin loop merge"
        );
    }
}

function validateBindings(bindings)
{
    const expected = [
        [
            "uniform-buffer", "cb0", "var<uniform>", "array<vec4<f32>, 1>",
            null, "uniform", 16
        ],
        [
            "sampled-resource", "t0", "var<storage, read>", "array<u32>",
            null, "read-only-storage", 4
        ],
        [
            "storage-resource", "u0", "var<storage, read_write>",
            "array<atomic<u32>>", null, "storage", 4
        ]
    ];
    if (bindings.length !== expected.length
        || expected.some(([
            kind, symbol, declaration, type, stride, bufferType, minSize
        ], index) =>
        {
            const binding = bindings[index];
            return binding?.resourceKind !== kind
                || binding.registerIndex !== 0
                || binding.registerSpace !== 0
                || binding.generatedSymbol !== symbol
                || binding.declaration !== declaration
                || binding.type !== type
                || (binding.structureStride ?? null) !== stride
                || binding.buffer?.type !== bufferType
                || binding.buffer.hasDynamicOffset !== false
                || binding.buffer.minBindingSize !== minSize;
        }))
    {
        throw new Error(
            "WGSL merge-histograms compute binding layout does not match cb0/t0/u0"
        );
    }
}

function uintLiteral(value)
{
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}u`;
}

function selectedComponents(operand, active)
{
    if (operand.selected) return active.map(() => operand.selected);
    const swizzle = operand.swizzle || "xyzw";
    return active.map((component) => swizzle[COMPONENTS.indexOf(component)]);
}

function rawSourcePart(operand, component)
{
    if (operand.typeName === "temp")
    {
        return `r${operand.registerIndex}.${component}`;
    }
    if (operand.typeName === "input_thread_id_in_group")
    {
        return `local_invocation_id.${component}`;
    }
    if (operand.typeName === "input_thread_id")
    {
        return `dispatch_thread_id.${component}`;
    }
    if (operand.typeName === "immediate32")
    {
        const sourceIndex = operand.immediateValues.length === 1
            ? 0
            : COMPONENTS.indexOf(component);
        return uintLiteral(operand.immediateValues[sourceIndex].uint32);
    }
    throw new Error(
        `WGSL merge-histograms source ${operand.typeName || "unknown"} cannot be materialized`
    );
}

function sourceParts(instruction, operandIndex, active)
{
    const operand = instruction.operands[operandIndex];
    return selectedComponents(operand, active)
        .map((component) => rawSourcePart(operand, component));
}

function assignment(instruction, destination, parts)
{
    const type = destination.mask.length === 1
        ? "u32"
        : `vec${destination.mask.length}<u32>`;
    return {
        kind: "value-assignment",
        instructionIndex: instruction.index,
        dxbcOffset: instruction.dxbcOffset,
        name: `r${destination.registerIndex}.${destination.mask}`,
        type,
        expression: {
            code: parts.length === 1 ? parts[0] : `${type}(${parts.join(", ")})`,
            type
        }
    };
}

function aluStatement(instruction, constants)
{
    if (instruction.opcodeName === "ftou")
    {
        const destination = instruction.operands[0];
        const active = Array.from(destination.mask);
        const components = selectedComponents(instruction.operands[1], active);
        return assignment(
            instruction,
            destination,
            components.map((component) =>
                `u32(${constants.generatedSymbol}[0u].${component})`)
        );
    }
    if (instruction.opcodeName === "imul")
    {
        const destination = instruction.operands[1];
        const active = Array.from(destination.mask);
        const left = sourceParts(instruction, 2, active);
        const right = sourceParts(instruction, 3, active);
        return assignment(
            instruction,
            destination,
            left.map((part, index) => `(${part} * ${right[index]})`)
        );
    }

    const destination = instruction.operands[0];
    const active = Array.from(destination.mask);
    const source = (operandIndex) =>
        sourceParts(instruction, operandIndex, active);
    let parts;
    switch (instruction.opcodeName)
    {
        case "mov":
            parts = source(1);
            break;
        case "iadd":
        case "ishl":
        case "ushr":
        {
            const left = source(1);
            const right = source(2);
            const operator = {
                iadd: "+",
                ishl: "<<",
                ushr: ">>"
            }[instruction.opcodeName];
            parts = left.map((part, index) =>
                `(${part} ${operator} ${right[index]})`);
            break;
        }
        case "ult":
        case "uge":
        {
            const left = source(1);
            const right = source(2);
            const operator = instruction.opcodeName === "ult" ? "<" : ">=";
            parts = left.map((part, index) =>
                `select(0u, 0xffffffffu, ${part} ${operator} ${right[index]})`);
            break;
        }
        default:
            throw new Error(
                `WGSL merge-histograms ${instruction.opcodeName} instruction ${instruction.index} is not an ALU operation`
            );
    }
    return assignment(instruction, destination, parts);
}

function typedLoad(instruction, input)
{
    const destination = instruction.operands[0];
    const active = Array.from(destination.mask);
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    const length = `arrayLength(&${input.generatedSymbol})`;
    const recordCount = `(${length} / 4u)`;
    const safeRecord = `min(${address}, max(${recordCount}, 1u) - 1u)`;
    const safeBase = `((${safeRecord}) * 4u)`;
    const parts = active.map((_, word) =>
        `select(0u, ${input.generatedSymbol}[min(${safeBase} + ${word}u, ${length} - 1u)], ${address} < ${recordCount})`);
    return assignment(instruction, destination, parts);
}

function sharedStore(instruction)
{
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    const byteOffset = sourceParts(instruction, 2, [ "x" ])[0];
    const value = sourceParts(instruction, 3, [ "x" ])[0];
    const index = `(${address} + (${byteOffset} >> 2u))`;
    return {
        kind: "call",
        instructionIndex: instruction.index,
        dxbcOffset: instruction.dxbcOffset,
        expression: {
            code: `atomicStore(&g0[${index}], ${value})`,
            type: "void"
        }
    };
}

function sharedLoad(instruction)
{
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    const byteOffset = sourceParts(instruction, 2, [ "x" ])[0];
    const index = `(${address} + (${byteOffset} >> 2u))`;
    return assignment(instruction, instruction.operands[0], [
        `atomicLoad(&g0[${index}])`
    ]);
}

function atomicAddStatement(instruction, output)
{
    const target = instruction.operands[0];
    const value = sourceParts(instruction, 2, [ "x" ])[0];
    if (target.typeName === "thread_group_shared_memory")
    {
        const address = sourceParts(instruction, 1, [ "x", "y" ]);
        const index = `(${address[0]} + (${address[1]} >> 2u))`;
        return [ {
            kind: "call",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            expression: {
                code: `atomicAdd(&g0[${index}], ${value})`,
                type: "void"
            }
        } ];
    }
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    return [ {
        kind: "if",
        instructionIndex: instruction.index,
        dxbcOffset: instruction.dxbcOffset,
        condition: {
            code: `${address} < arrayLength(&${output.generatedSymbol})`,
            type: "bool"
        },
        statements: [ {
            kind: "call",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            expression: {
                code: `atomicAdd(&${output.generatedSymbol}[${address}], ${value})`,
                type: "void"
            }
        } ]
    } ];
}

function binding(bindings, resourceKind)
{
    return bindings.find((entry) =>
        entry.resourceKind === resourceKind
        && entry.registerIndex === 0
        && entry.registerSpace === 0);
}

function lowerBody(program, bindings)
{
    const constants = binding(bindings, "uniform-buffer");
    const input = binding(bindings, "sampled-resource");
    const output = binding(bindings, "storage-resource");
    const statements = Array.from({ length: 4 }, (_, registerIndex) => ({
        kind: "var",
        name: `r${registerIndex}`,
        type: "vec4<u32>",
        expression: { code: "vec4<u32>(0u)", type: "vec4<u32>" }
    }));
    const stack = [];
    let current = statements;
    for (const instruction of program.instructions)
    {
        if (instruction.opcodeName === "if")
        {
            const condition = sourceParts(instruction, 0, [ "x" ])[0];
            const statement = {
                kind: "if",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                condition: { code: `${condition} != 0u`, type: "bool" },
                statements: []
            };
            current.push(statement);
            stack.push({ kind: "if", parent: current });
            current = statement.statements;
            continue;
        }
        if (instruction.opcodeName === "endif")
        {
            const owner = stack.pop();
            if (owner?.kind !== "if")
            {
                throw new Error(
                    `WGSL merge-histograms endif ${instruction.index} has malformed nesting`
                );
            }
            current = owner.parent;
            continue;
        }
        if (instruction.opcodeName === "loop")
        {
            const statement = {
                kind: "loop",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                statements: []
            };
            current.push(statement);
            stack.push({ kind: "loop", parent: current });
            current = statement.statements;
            continue;
        }
        if (instruction.opcodeName === "endloop")
        {
            const owner = stack.pop();
            if (owner?.kind !== "loop")
            {
                throw new Error(
                    `WGSL merge-histograms endloop ${instruction.index} has malformed nesting`
                );
            }
            current = owner.parent;
            continue;
        }
        if (instruction.opcodeName === "breakc")
        {
            const condition = sourceParts(instruction, 0, [ "x" ])[0];
            current.push({
                kind: "if",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                condition: { code: `${condition} != 0u`, type: "bool" },
                statements: [ {
                    kind: "break",
                    instructionIndex: instruction.index,
                    dxbcOffset: instruction.dxbcOffset
                } ]
            });
            continue;
        }
        if (instruction.opcodeName === "sync")
        {
            current.push({
                kind: "call",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                expression: { code: "workgroupBarrier()", type: "void" }
            });
            continue;
        }
        if (instruction.opcodeName === "ret")
        {
            if (stack.length)
            {
                throw new Error(
                    `WGSL merge-histograms return ${instruction.index} has malformed nesting`
                );
            }
            current.push({
                kind: "return",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset
            });
            continue;
        }
        if (instruction.opcodeName === "store_structured")
        {
            current.push(sharedStore(instruction));
        }
        else if (instruction.opcodeName === "ld_structured")
        {
            current.push(sharedLoad(instruction));
        }
        else if (instruction.opcodeName === "ld")
        {
            current.push(typedLoad(instruction, input));
        }
        else if (instruction.opcodeName === "atomic_iadd")
        {
            current.push(...atomicAddStatement(instruction, output));
        }
        else
        {
            current.push(aluStatement(instruction, constants));
        }
    }
    if (stack.length)
    {
        throw new Error(
            "WGSL merge-histograms compute contains unterminated control-flow nesting"
        );
    }
    return statements;
}

/**
 * Lowers the exact SM5.0/finite-SM5.1 merge-histograms compute profile.
 *
 * The source accumulates 64 uint bins per workgroup. Typed Buffer t0 is
 * flattened to DWORD storage; one uint4 load is admitted only when all four
 * physical words exist. Missing input records therefore read as zero. The
 * final typed uint UAV atomic is guarded by arrayLength so an OOB destination
 * drops the write. TGSM indices are fixed by the exact 0..63 source loop.
 *
 * @param {object} program CJS shader IR program.
 * @param {object} [options] Exact compute-only binding options.
 * @returns {object} Typed compute program.
 */
export function lowerMergeHistogramsComputeProgram(program, options = {})
{
    validateDeclarations(program);
    validateBody(program);
    const bindings = lowerBindingLayout(
        program,
        options.bindingPlan ?? null
    );
    validateBindings(bindings);
    return {
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "compute",
        entryPoint: "main",
        builtinInputs: [
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
        ],
        threadGroupSize: [ 256, 1, 1 ],
        workgroupVariables: [
            { name: "g0", elementType: "atomic<u32>", elementCount: 64 }
        ],
        bindings,
        statements: lowerBody(program, bindings)
    };
}
