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
    "dcl_resource",
    "dcl_unordered_access_view_structured",
    "dcl_input",
    "dcl_input",
    "dcl_input",
    "dcl_temps",
    "dcl_thread_group_shared_memory_structured",
    "dcl_thread_group"
]);
const BODY_OPCODES = Object.freeze([
    "ld", "ishl", "iadd", "imax", "imin", "imad", "ilt", "if", "ilt", "if",
    "ld_structured", "store_structured", "endif", "iadd", "ilt", "if", "iadd",
    "ld_structured", "store_structured", "endif", "endif", "sync", "mov", "loop",
    "ige", "breakc", "iadd", "and", "iadd", "ishl", "iadd", "iadd", "ilt", "if",
    "iadd", "ld_structured", "ld_structured", "lt", "if", "store_structured",
    "store_structured", "endif", "endif", "sync", "ishr", "endloop", "if", "ilt",
    "if", "ld_structured", "store_structured", "endif", "iadd", "ilt", "if", "iadd",
    "ld_structured", "store_structured", "endif", "endif", "ret"
]);
const BODY_OPERANDS_SM50 = Object.freeze([
    "temp:0:x:0::none:default:uniform:4 | immediate32::::#3,#3,#3,#3:none:default:uniform:4 | resource:0:xyzw:0::none:default:uniform:4",
    "temp:0:y:0::none:default:uniform:4 | input_thread_group_id::x:::none:default:uniform:4 | immediate32::::#9:none:default:uniform:1",
    "temp:0:y:0::none:default:uniform:4 | temp:0:y:0::neg:default:uniform:4 | temp:0:x:0::none:default:uniform:4",
    "temp:0:y:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1",
    "temp:0:y:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4 | immediate32::::#512:none:default:uniform:1",
    "temp:0:z:0::none:default:uniform:4 | input_thread_group_id::x:::none:default:uniform:4 | immediate32::::#512:none:default:uniform:1 | input_thread_id_in_group::x:::none:default:uniform:4",
    "temp:0:x:0::none:default:uniform:4 | temp:0:z:0::none:default:uniform:4 | temp:0:x:0::none:default:uniform:4",
    "temp:0:x:0::none:default:uniform:4",
    "temp:0:w:0::none:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:0:w:0::none:default:uniform:4",
    "temp:1:xy:1::none:default:uniform:4 | temp:0:z:0::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | uav:0:xyxx:0::none:default:uniform:4",
    "thread_group_shared_memory:0:xy:0::none:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | temp:1:xyxx:1::none:default:uniform:4",
    "",
    "temp:0:w:0::none:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4 | immediate32::::#256:none:default:uniform:1",
    "temp:1:x:1::none:default:uniform:4 | temp:0:w:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:1:x:1::none:default:uniform:4",
    "temp:1:x:1::none:default:uniform:4 | temp:0:z:0::none:default:uniform:4 | immediate32::::#256:none:default:uniform:1",
    "temp:1:xy:1::none:default:uniform:4 | temp:1:x:1::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | uav:0:xyxx:0::none:default:uniform:4",
    "thread_group_shared_memory:0:xy:0::none:default:uniform:4 | temp:0:w:0::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | temp:1:xyxx:1::none:default:uniform:4",
    "",
    "",
    "",
    "temp:0:w:0::none:default:uniform:4 | immediate32::::#256:none:default:uniform:1",
    "",
    "temp:1:x:1::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | temp:0:w:0::none:default:uniform:4",
    "temp:1:x:1::none:default:uniform:4",
    "temp:1:x:1::none:default:uniform:4 | temp:0:w:0::none:default:uniform:4 | immediate32::::#4294967295:none:default:uniform:1",
    "temp:1:x:1::none:default:uniform:4 | temp:1:x:1::none:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4",
    "temp:1:y:1::none:default:uniform:4 | temp:1:x:1::neg:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4",
    "temp:1:y:1::none:default:uniform:4 | temp:1:y:1::none:default:uniform:4 | immediate32::::#1:none:default:uniform:1",
    "temp:1:z:1::none:default:uniform:4 | temp:0:w:0::none:default:uniform:4 | temp:1:y:1::none:default:uniform:4",
    "temp:1:z:1::none:default:uniform:4 | temp:1:x:1::none:default:uniform:4 | temp:1:z:1::none:default:uniform:4",
    "temp:1:w:1::none:default:uniform:4 | temp:1:z:1::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:1:w:1::none:default:uniform:4",
    "temp:1:x:1::none:default:uniform:4 | temp:1:x:1::none:default:uniform:4 | temp:1:y:1::none:default:uniform:4",
    "temp:1:yw:1::none:default:uniform:4 | temp:1:x:1::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | thread_group_shared_memory:0:xxxy:0::none:default:uniform:4",
    "temp:2:xy:2::none:default:uniform:4 | temp:1:z:1::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | thread_group_shared_memory:0:xyxx:0::none:default:uniform:4",
    "temp:2:z:2::none:default:uniform:4 | temp:2:y:2::none:default:uniform:4 | temp:1:w:1::none:default:uniform:4",
    "temp:2:z:2::none:default:uniform:4",
    "thread_group_shared_memory:0:xy:0::none:default:uniform:4 | temp:1:x:1::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | temp:2:xyxx:2::none:default:uniform:4",
    "thread_group_shared_memory:0:xy:0::none:default:uniform:4 | temp:1:z:1::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | temp:1:ywyy:1::none:default:uniform:4",
    "",
    "",
    "",
    "temp:0:w:0::none:default:uniform:4 | temp:0:w:0::none:default:uniform:4 | immediate32::::#1:none:default:uniform:1",
    "",
    "temp:0:x:0::none:default:uniform:4",
    "temp:0:x:0::none:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:0:x:0::none:default:uniform:4",
    "temp:0:xw:0::none:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | thread_group_shared_memory:0:xxxy:0::none:default:uniform:4",
    "uav:0:xy:0::none:default:uniform:4 | temp:0:z:0::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | temp:0:xwxx:0::none:default:uniform:4",
    "",
    "temp:0:x:0::none:default:uniform:4 | input_thread_id_in_group_flattened::x:::none:default:uniform:4 | immediate32::::#256:none:default:uniform:1",
    "temp:0:y:0::none:default:uniform:4 | temp:0:x:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4",
    "temp:0:y:0::none:default:uniform:4",
    "temp:0:y:0::none:default:uniform:4 | temp:0:z:0::none:default:uniform:4 | immediate32::::#256:none:default:uniform:1",
    "temp:0:xz:0::none:default:uniform:4 | temp:0:x:0::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | thread_group_shared_memory:0:xxyx:0::none:default:uniform:4",
    "uav:0:xy:0::none:default:uniform:4 | temp:0:y:0::none:default:uniform:4 | immediate32::::#0:none:default:uniform:1 | temp:0:xzxx:0::none:default:uniform:4",
    "",
    "",
    ""
]);
const BODY_OPERANDS_SM51 = Object.freeze(BODY_OPERANDS_SM50.map((signature) =>
    signature
        .replaceAll("resource:0:xyzw:0::", "resource:0:xyzw:0,0::")
        .replaceAll("uav:0:xyxx:0::", "uav:0:xyxx:0,0::")
        .replaceAll("uav:0:xy:0::", "uav:0:xy:0,0::")));
const BLOCK_BEFORE = new Set([ "loop", "else", "endif", "endloop", "case", "default", "endswitch" ]);
const BLOCK_AFTER = new Set([
    "if", "loop", "switch", "break", "breakc", "continue", "continuec",
    "ret", "retc", "discard", "else", "endif", "endloop", "case", "default", "endswitch"
]);
const CONTROL_KIND = Object.freeze({
    if: "selection",
    endif: "selection",
    loop: "loop",
    breakc: "loop",
    endloop: "loop",
    ret: "termination"
});
const SELECTION_STARTS = Object.freeze([ 7, 9, 15, 33, 38, 46, 48, 54 ]);

function buildBlocks(instructions)
{
    const leaders = new Set([ 0 ]);
    for (let index = 0; index < instructions.length; index += 1)
    {
        if (BLOCK_BEFORE.has(instructions[index].opcodeName)) leaders.add(index);
        if (BLOCK_AFTER.has(instructions[index].opcodeName) && index + 1 < instructions.length)
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
            instructionIndices: Array.from({ length: end - start + 1 }, (_, offset) => start + offset),
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
    if (JSON.stringify(analysisSnapshot(program)) !== JSON.stringify(analysisSnapshot(rebuilt)))
    {
        throw new Error("WGSL sort-inner compute CFG, SSA, or type metadata is inconsistent");
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
            throw new Error(`WGSL sort-inner ${context} has non-canonical index metadata`);
        }
    }
}

function validateCommonOperand(operand, context)
{
    if (!operand
        || ![ "none", "neg" ].includes(operand.modifierName ?? "none")
        || (operand.minPrecisionName ?? "default") !== "default"
        || operand.nonUniform === true)
    {
        throw new Error(`WGSL sort-inner ${context} has unsupported operand modifiers`);
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
        throw new Error(`WGSL sort-inner ${context} requires one finite SM5.1 range`);
    }
}

function validateDeclarationOperand(operand, {
    componentCount, indices, registerIndex, selector, typeName
}, context)
{
    validateCommonOperand(operand, context);
    if ((operand.modifierName ?? "none") !== "none"
        || operand.typeName !== typeName
        || operand.registerIndex !== registerIndex
        || operand.componentCount !== componentCount
        || (operand.mask || operand.swizzle || operand.selected || "") !== selector
        || operand.indices?.length !== indices.length
        || indices.some((value, index) => operand.indices[index].values[0] !== value)
        || operand.immediateValues?.length)
    {
        throw new Error(`WGSL sort-inner ${context} is malformed`);
    }
}

function validateBuiltinDeclaration(declaration, typeName, operandType, componentCount, selector)
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
        throw new Error(`WGSL sort-inner compute requires exactly ${typeName}${selector ? `.${selector}` : ""}`);
    }
}

/**
 * Whether declarations select the isolated sort-inner compute profile.
 * Once selected, all detailed validation errors are final.
 *
 * @param {object} program CJS shader IR program.
 * @returns {boolean} True for the sort-inner declaration family.
 */
export function isSortInnerComputeProfile(program)
{
    return program?.stage === "compute"
        && program.declarations?.length === DECLARATION_OPCODES.length
        && program.instructions?.length === BODY_OPCODES.length
        && DECLARATION_OPCODES.every((opcodeName, index) =>
            program.declarations[index]?.opcodeName === opcodeName);
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
        throw new TypeError("WGSL sort-inner compute profile requires CJS SM5.0 or finite-range SM5.1 compute IR");
    }
    if (!isSortInnerComputeProfile(program))
    {
        throw new Error("WGSL sort-inner compute declaration shape is not supported");
    }
    if (program.declarations.some((declaration) => declaration.tailTokens?.length))
    {
        throw new Error("WGSL sort-inner compute declarations must not contain trailing payload words");
    }
    if ((program.signatures?.input || []).length
        || (program.signatures?.output || []).length
        || (program.signatures?.patch || []).length
        || program.immediateConstantBuffer
        || program.constTables)
    {
        throw new Error("WGSL sort-inner compute profile does not support signatures or constant tables");
    }
    requireRefactoringAllowed(program, "sort-inner compute");

    const [ global, input, output, flattenedId, groupId, localId, temps, shared, group ] =
        program.declarations;
    if (global.data?.globalFlags !== (1 << 11)
        || global.data.refactoringAllowed !== true
        || global.operands?.length)
    {
        throw new Error("WGSL sort-inner compute requires only the refactoring-allowed global flag");
    }
    if (input.data?.registerIndex !== 0
        || input.data.resourceDimension !== 1
        || input.data.resourceDimensionName !== "buffer"
        || input.data.sampleCount !== 0
        || input.data.returnType?.returnTypes?.length !== 4
        || input.data.returnType.returnTypes.some((entry) => entry !== 4)
        || input.data.returnType?.returnTypeNames?.length !== 4
        || input.data.returnType.returnTypeNames.some((entry) => entry !== "uint")
        || input.operands?.length !== 1)
    {
        throw new Error("WGSL sort-inner compute requires typed uint Buffer t0");
    }
    validateDeclarationOperand(input.operands[0], minor === 0
        ? { typeName: "resource", registerIndex: 0, componentCount: 0, selector: "", indices: [ 0 ] }
        : { typeName: "resource", registerIndex: 0, componentCount: 4, selector: "xyzw", indices: [ 0, 0, 0 ] },
    "t0 declaration");
    if (output.data?.registerIndex !== 0
        || output.data.structureStride !== 8
        || output.data.globallyCoherent !== false
        || output.operands?.length !== 1)
    {
        throw new Error("WGSL sort-inner compute requires noncoherent stride-8 structured UAV u0");
    }
    validateDeclarationOperand(output.operands[0], minor === 0
        ? { typeName: "uav", registerIndex: 0, componentCount: 0, selector: "", indices: [ 0 ] }
        : { typeName: "uav", registerIndex: 0, componentCount: 4, selector: "xyzw", indices: [ 0, 0, 0 ] },
    "u0 declaration");

    validateBuiltinDeclaration(flattenedId, "input_thread_id_in_group_flattened", 36, 0, "");
    validateBuiltinDeclaration(groupId, "input_thread_group_id", 33, 4, "x");
    validateBuiltinDeclaration(localId, "input_thread_id_in_group", 34, 4, "x");
    if (temps.data?.tempCount !== 3 || temps.operands?.length)
    {
        throw new Error("WGSL sort-inner compute requires exactly three temps");
    }
    if (shared.data?.registerIndex !== 0
        || shared.data.structureStride !== 8
        || shared.data.structureCount !== 512
        || shared.operands?.length !== 1)
    {
        throw new Error("WGSL sort-inner compute requires g0 with stride 8 and 512 records");
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
        throw new Error("WGSL sort-inner compute requires dcl_thread_group 256,1,1");
    }
    if (minor === 1)
    {
        validateSm51Range(input.data, "t0 declaration");
        validateSm51Range(output.data, "u0 declaration");
    }
    else if (input.data.bindingModel || input.data.bindingRange
        || output.data.bindingModel || output.data.bindingRange)
    {
        throw new Error("WGSL sort-inner SM5.0 declarations must use register bindings");
    }
}

function validateBodyReference(program, instruction, operand, operandIndex)
{
    const context = `instruction ${instruction.index} operand ${operandIndex}`;
    validateCanonicalIndices(operand, context);
    if (program.shaderModel.minor === 0)
    {
        if (operand.resourceReference !== undefined && operand.resourceReference !== null)
        {
            throw new Error(`WGSL sort-inner ${context} has unexpected SM5.1 reference metadata`);
        }
        return;
    }
    if ([ "resource", "uav" ].includes(operand.typeName))
    {
        const reference = operand.resourceReference;
        if (reference?.bindingModel !== "sm5.1-range"
            || reference.rangeId !== 0
            || reference.nonUniform !== false
            || !isCanonicalIndex(reference.absoluteIndex, 1, 0)
            || reference.bufferIndex !== null
            || reference.vectorOffset !== null)
        {
            throw new Error(`WGSL sort-inner ${context} has an invalid SM5.1 resource reference`);
        }
    }
    else if (operand.resourceReference !== undefined && operand.resourceReference !== null)
    {
        throw new Error(`WGSL sort-inner ${context} has unexpected resource reference metadata`);
    }
}

function validExtensions(program, instruction)
{
    const extensions = instruction.extensions || [];
    if (program.shaderModel.minor === 1) return extensions.length === 0;
    if (instruction.opcodeName === "ld")
    {
        return extensions.length === 2
            && extensions[0]?.token === 2147483714
            && extensions[0].type === 2
            && extensions[0]?.typeName === "resource_dimension"
            && extensions[0].resourceDimension === 1
            && extensions[0].resourceDimensionName === "buffer"
            && extensions[0].structureStride === 0
            && extensions[1]?.token === 1118467
            && extensions[1].type === 3
            && extensions[1]?.typeName === "resource_return_type"
            && extensions[1].resourceReturnTypes?.length === 4
            && extensions[1].resourceReturnTypes.every((entry) => entry === 4);
    }
    if (instruction.opcodeName === "ld_structured"
        && instruction.operands?.[3]?.typeName === "uav")
    {
        return extensions.length === 2
            && extensions[0]?.token === 2147500802
            && extensions[0].type === 2
            && extensions[0]?.typeName === "resource_dimension"
            && extensions[0].resourceDimension === 12
            && extensions[0].resourceDimensionName === "structured_buffer"
            && extensions[0].structureStride === 8
            && extensions[1]?.token === 1677699
            && extensions[1].type === 3
            && extensions[1]?.typeName === "resource_return_type"
            && extensions[1].resourceReturnTypes?.length === 4
            && extensions[1].resourceReturnTypes.every((entry) => entry === 6);
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
            || instructionOperandSignature(program.instructions[index]) !== expectedOperands[index]))
    {
        throw new Error("WGSL sort-inner compute requires the exact bounded body opcode, operand, and modifier sequence");
    }
    for (const [ index, instruction ] of program.instructions.entries())
    {
        const conditional = [ "if", "breakc" ].includes(instruction.opcodeName);
        if (instruction.index !== index
            || (index > 0 && instruction.dxbcOffset <= program.instructions[index - 1].dxbcOffset)
            || instruction.controlKind !== (CONTROL_KIND[instruction.opcodeName] || null)
            || instruction.testBoolean !== (conditional ? "nonzero" : null)
            || instruction.saturate
            || instruction.preciseMask !== ""
            || instruction.tailTokens?.length
            || !validExtensions(program, instruction)
            || (instruction.opcodeName === "sync"
                && (instruction.syncFlags !== 3
                    || JSON.stringify(instruction.syncFlagNames) !==
                        JSON.stringify([ "threads_in_group", "thread_group_shared_memory" ]))))
        {
            throw new Error(`WGSL sort-inner instruction ${index} has inconsistent envelope metadata`);
        }
        for (const [ operandIndex, operand ] of instruction.operands.entries())
        {
            validateBodyReference(program, instruction, operand, operandIndex);
        }
    }

    validateAnalysisMetadata(program);
    const originCounts = program.values.reduce((counts, value) =>
    {
        counts[value.origin] = (counts[value.origin] || 0) + 1;
        return counts;
    }, {});
    if (program.blocks.length !== 27
        || program.controlFlow.edgeCount !== 35
        || program.controlFlow.regions.length !== 9
        || program.values.length !== 56
        || originCounts["instruction-write"] !== 33
        || originCounts["undefined-register"] !== 8
        || originCounts["program-input"] !== 3
        || originCounts["control-flow-merge"] !== 12)
    {
        throw new Error("WGSL sort-inner compute requires the canonical CFG and register-value shape");
    }
    const values = new Map(program.values.map((value) => [ value.id, value ]));
    for (const instruction of program.instructions)
    {
        for (const ref of instruction.dataflow.reads.flatMap((read) => read.refs))
        {
            if (values.get(ref.valueId)?.origin === "undefined-register")
            {
                throw new Error(`WGSL sort-inner instruction ${instruction.index} reads undefined register data`);
            }
        }
    }

    const plans = buildSelectionPlans(program, "sort-inner compute");
    if (plans.size !== 9
        || SELECTION_STARTS.some((start) =>
            plans.get(start)?.kind !== "selection"
            || plans.get(start).hasElse
            || plans.get(start).merges.length))
    {
        throw new Error("WGSL sort-inner compute requires the canonical no-else selections");
    }
    const loop = plans.get(23);
    const merge = loop?.merges?.[0];
    const entry = values.get(merge?.entryIncoming?.valueId);
    const backedge = values.get(merge?.backedgeIncoming?.valueId);
    const loopReadInstructions = program.instructions
        .filter((instruction) => instruction.dataflow.reads.some((read) =>
            read.refs.some((ref) => ref.valueId === "value123")))
        .map((instruction) => instruction.index);
    const deadExitMerge = values.get("value166");
    if (loop?.kind !== "loop"
        || loop.merges.length !== 1
        || merge.id !== "value123"
        || merge.type !== "i32"
        || values.get("value123")?.register !== "temp[0]"
        || values.get("value123")?.writeMask !== "w"
        || values.get("value123")?.blockId !== "block9"
        || merge.entryIncoming.valueId !== "value41"
        || entry?.origin !== "instruction-write"
        || entry.instructionIndex !== 22
        || merge.backedgeIncoming.valueId !== "value80"
        || backedge?.origin !== "instruction-write"
        || backedge.instructionIndex !== 44
        || JSON.stringify(loopReadInstructions) !== JSON.stringify([ 24, 26, 30, 44 ])
        || deadExitMerge?.origin !== "control-flow-merge"
        || deadExitMerge.register !== "temp[0]"
        || deadExitMerge.writeMask !== "w"
        || program.instructions.some((instruction) => instruction.dataflow.reads.some((read) =>
            read.refs.some((ref) => ref.valueId === "value166")))
        || loop.exitMerges.length
        || loop.exitEdges.size)
    {
        throw new Error("WGSL sort-inner compute requires the canonical scalar stride loop merge");
    }
}

function validateBindings(bindings)
{
    const expected = [
        [ "sampled-resource", "t0", "array<u32>", null, "read-only-storage", 4 ],
        [ "storage-resource", "u0", "array<u32>", 8, "storage", 8 ]
    ];
    if (bindings.length !== expected.length
        || expected.some(([ kind, symbol, type, stride, bufferType, minSize ], index) =>
        {
            const binding = bindings[index];
            return binding?.resourceKind !== kind
                || binding.registerIndex !== 0
                || binding.registerSpace !== 0
                || binding.generatedSymbol !== symbol
                || binding.type !== type
                || (binding.structureStride ?? null) !== stride
                || binding.buffer?.type !== bufferType
                || binding.buffer.hasDynamicOffset !== false
                || binding.buffer.minBindingSize !== minSize;
        }))
    {
        throw new Error("WGSL sort-inner compute binding layout does not match t0/u0");
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

function rawSourcePart(instruction, operand, component)
{
    let code;
    if (operand.typeName === "temp")
    {
        const loopStrideRead = operand.registerIndex === 0
            && component === "w"
            && [ 24, 26, 30, 44 ].includes(instruction.index);
        code = loopStrideRead ? "stride" : `r${operand.registerIndex}.${component}`;
    }
    else if ([ "input_thread_id_in_group", "input_thread_id_in_group_flattened" ]
        .includes(operand.typeName))
    {
        code = `local_invocation_id.${component}`;
    }
    else if (operand.typeName === "input_thread_group_id")
    {
        code = `workgroup_id.${component}`;
    }
    else if (operand.typeName === "immediate32")
    {
        const sourceIndex = operand.immediateValues.length === 1
            ? 0
            : COMPONENTS.indexOf(component);
        code = uintLiteral(operand.immediateValues[sourceIndex].uint32);
    }
    else
    {
        throw new Error(`WGSL sort-inner source ${operand.typeName || "unknown"} cannot be materialized`);
    }
    return operand.modifierName === "neg" ? `(0u - ${code})` : code;
}

function sourceParts(instruction, operandIndex, active)
{
    const operand = instruction.operands[operandIndex];
    return selectedComponents(operand, active)
        .map((component) => rawSourcePart(instruction, operand, component));
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

function typedLoad(instruction, binding)
{
    const address = uintLiteral(instruction.operands[1].immediateValues[0].uint32);
    const length = `arrayLength(&${binding.generatedSymbol})`;
    return assignment(instruction, instruction.operands[0], [
        `select(0u, ${binding.generatedSymbol}[min(${address}, ${length} - 1u)], ${address} < ${length})`
    ]);
}

function structuredLoad(instruction, binding)
{
    const destination = instruction.operands[0];
    const active = Array.from(destination.mask);
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    const resource = instruction.operands[3];
    const resourceComponents = selectedComponents(resource, active);
    if (resource.typeName === "thread_group_shared_memory")
    {
        const parts = resourceComponents.map((component) =>
            `g0[((${address}) * 2u) + ${COMPONENTS.indexOf(component)}u]`);
        return assignment(instruction, destination, parts);
    }
    const wordCount = `arrayLength(&${binding.generatedSymbol})`;
    const recordCount = `(${wordCount} / 2u)`;
    const safeRecord = `min(${address}, ${recordCount} - 1u)`;
    const inRange = `${address} < ${recordCount}`;
    const parts = resourceComponents.map((component) =>
    {
        const word = COMPONENTS.indexOf(component);
        if (word > 1)
        {
            throw new Error(`WGSL sort-inner structured load ${instruction.index} exceeds its two-word record`);
        }
        return `select(0u, ${binding.generatedSymbol}[((${safeRecord}) * 2u) + ${word}u], ${inRange})`;
    });
    return assignment(instruction, destination, parts);
}

function structuredStore(instruction, binding)
{
    const destination = instruction.operands[0];
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    const values = sourceParts(instruction, 3, [ "x", "y" ]);
    const base = `((${address}) * 2u)`;
    if (destination.typeName === "thread_group_shared_memory")
    {
        return values.map((value, word) => ({
            kind: "call",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            expression: {
                code: `g0[${base} + ${word}u] = ${value}`,
                type: "void"
            }
        }));
    }
    const recordCount = `(arrayLength(&${binding.generatedSymbol}) / 2u)`;
    return [ {
        kind: "if",
        instructionIndex: instruction.index,
        dxbcOffset: instruction.dxbcOffset,
        condition: { code: `${address} < ${recordCount}`, type: "bool" },
        statements: values.map((value, word) => ({
            kind: "call",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            expression: {
                code: `${binding.generatedSymbol}[${base} + ${word}u] = ${value}`,
                type: "void"
            }
        }))
    } ];
}

function aluStatement(instruction)
{
    const destination = instruction.operands[0];
    const active = Array.from(destination.mask);
    const source = (operandIndex) => sourceParts(instruction, operandIndex, active);
    if (instruction.index === 24)
    {
        const left = source(1)[0];
        const right = source(2)[0];
        return {
            kind: "let",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            name: "stride_done",
            type: "bool",
            expression: {
                code: `bitcast<i32>(${left}) >= bitcast<i32>(${right})`,
                type: "bool"
            }
        };
    }
    let parts;
    switch (instruction.opcodeName)
    {
        case "mov":
            parts = source(1);
            break;
        case "imad":
        {
            const left = source(1);
            const right = source(2);
            const addend = source(3);
            parts = left.map((part, index) => `((${part} * ${right[index]}) + ${addend[index]})`);
            break;
        }
        case "iadd":
        case "and":
        case "ishl":
        {
            const left = source(1);
            const right = source(2);
            const operator = { iadd: "+", and: "&", ishl: "<<" }[instruction.opcodeName];
            parts = left.map((part, index) => `(${part} ${operator} ${right[index]})`);
            break;
        }
        case "imax":
        case "imin":
        {
            const left = source(1);
            const right = source(2);
            const intrinsic = instruction.opcodeName === "imax" ? "max" : "min";
            parts = left.map((part, index) =>
                `bitcast<u32>(${intrinsic}(bitcast<i32>(${part}), bitcast<i32>(${right[index]})))`);
            break;
        }
        case "ilt":
        case "ige":
        {
            const left = source(1);
            const right = source(2);
            const operator = instruction.opcodeName === "ilt" ? "<" : ">=";
            parts = left.map((part, index) =>
                `select(0u, 0xffffffffu, bitcast<i32>(${part}) ${operator} bitcast<i32>(${right[index]}))`);
            break;
        }
        case "lt":
        {
            const left = source(1);
            const right = source(2);
            parts = left.map((part, index) =>
                `select(0u, 0xffffffffu, bitcast<f32>(${part}) < bitcast<f32>(${right[index]}))`);
            break;
        }
        case "ishr":
        {
            const left = source(1);
            const right = source(2);
            parts = left.map((part, index) =>
                `bitcast<u32>(bitcast<i32>(${part}) >> ${right[index]})`);
            break;
        }
        default:
            throw new Error(`WGSL sort-inner ${instruction.opcodeName} instruction ${instruction.index} is not an ALU operation`);
    }
    const statement = assignment(instruction, destination, parts);
    if (instruction.index === 22)
    {
        return {
            kind: "var",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            name: "stride",
            type: "u32",
            expression: statement.expression
        };
    }
    if (instruction.index === 44)
    {
        return { ...statement, name: "stride" };
    }
    return statement;
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
    const typedInput = binding(bindings, "sampled-resource");
    const output = binding(bindings, "storage-resource");
    const statements = Array.from({ length: 3 }, (_, registerIndex) => ({
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
                throw new Error(`WGSL sort-inner endif ${instruction.index} has malformed nesting`);
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
                throw new Error(`WGSL sort-inner endloop ${instruction.index} has malformed nesting`);
            }
            current = owner.parent;
            continue;
        }
        if (instruction.opcodeName === "breakc")
        {
            current.push({
                kind: "if",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                condition: { code: "stride_done", type: "bool" },
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
                throw new Error(`WGSL sort-inner return ${instruction.index} has malformed nesting`);
            }
            current.push({
                kind: "return",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset
            });
            continue;
        }

        if (instruction.opcodeName === "ld")
        {
            current.push(typedLoad(instruction, typedInput));
        }
        else if (instruction.opcodeName === "ld_structured")
        {
            current.push(structuredLoad(instruction, output));
        }
        else if (instruction.opcodeName === "store_structured")
        {
            current.push(...structuredStore(instruction, output));
        }
        else
        {
            current.push(aluStatement(instruction));
        }
    }
    if (stack.length)
    {
        throw new Error("WGSL sort-inner compute contains unterminated control-flow nesting");
    }
    return statements;
}

/**
 * Lowers the exact SM5.0/finite-SM5.1 sort-inner bitonic-merge profile.
 *
 * Correct shared-memory initialization retains the source shader's external
 * orchestration premise: N <= 33,553,920 and workgroup_id.x within
 * ceil(max(N, 1) / 512). Those dispatch facts are not encoded in shader IR;
 * callers outside that domain inherit the source program's undefined behavior.
 *
 * @param {object} program CJS shader IR program.
 * @param {object} [options] Exact compute-only binding options.
 * @returns {object} Typed compute program.
 */
export function lowerSortInnerComputeProgram(program, options = {})
{
    validateDeclarations(program);
    validateBody(program);
    const bindings = lowerBindingLayout(program, options.bindingPlan ?? null);
    validateBindings(bindings);
    return {
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "compute",
        entryPoint: "main",
        builtinInputs: [
            { builtin: "workgroup_id", name: "workgroup_id", type: "vec3<u32>" },
            { builtin: "local_invocation_id", name: "local_invocation_id", type: "vec3<u32>" }
        ],
        threadGroupSize: [ 256, 1, 1 ],
        workgroupVariables: [
            { name: "g0", elementType: "u32", elementCount: 1024 }
        ],
        bindings,
        statements: lowerBody(program, bindings)
    };
}
