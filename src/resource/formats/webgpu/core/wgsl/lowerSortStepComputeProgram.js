import { clonePlain, deepFreeze } from "#utils/object";
import { analyzeRegisterValues } from "../ir/analyzeRegisterValues.js";
import { buildControlFlow } from "../ir/buildControlFlow.js";
import { inferValueTypes } from "../ir/inferValueTypes.js";
import { resolveRegisterFlow } from "../ir/resolveRegisterFlow.js";
import { lowerBindingLayout } from "./lowerBindingLayout.js";
import { requireRefactoringAllowed } from "./precisionControls.js";
import { buildSelectionPlans } from "./selectionPlans.js";
import { validateSm50ResourceExtensions } from "./validateExactComputeIr.js";

const COMPONENTS = Object.freeze([ "x", "y", "z", "w" ]);
const DECLARATION_OPCODES = Object.freeze([
    "dcl_global_flags",
    "dcl_constant_buffer",
    "dcl_resource",
    "dcl_unordered_access_view_structured",
    "dcl_input",
    "dcl_input",
    "dcl_temps",
    "dcl_thread_group"
]);
const BODY_OPCODES = Object.freeze([
    "ld", "imad", "iadd", "and", "iadd", "ishl", "iadd", "imad",
    "ult", "if", "iadd", "ld_structured", "ld_structured", "lt", "if",
    "store_structured", "store_structured", "endif", "endif", "ret"
]);
const BODY_OPERANDS_BASE_SM50 = Object.freeze([
    "temp:0:x:0::none:default:uniform | immediate32::::#3,#3,#3,#3:none:default:uniform | resource:0:xyzw:0::none:default:uniform",
    "temp:0:y:0::none:default:uniform | input_thread_group_id::x:::none:default:uniform | immediate32::::#256:none:default:uniform | input_thread_id_in_group::x:::none:default:uniform",
    "temp:0:z:0::none:default:uniform | constant_buffer:3:x:3,0::none:default:uniform | immediate32::::#4294967295:none:default:uniform",
    "temp:0:z:0::none:default:uniform | temp:0:z:0::none:default:uniform | temp:0:y:0::none:default:uniform",
    "temp:0:y:0::none:default:uniform | temp:0:z:0::neg:default:uniform | temp:0:y:0::none:default:uniform",
    "temp:0:y:0::none:default:uniform | temp:0:y:0::none:default:uniform | immediate32::::#1:none:default:uniform",
    "temp:0:w:0::none:default:uniform | temp:0:y:0::none:default:uniform | constant_buffer:3:y:3,0::none:default:uniform",
    "temp:0:w:0::none:default:uniform | constant_buffer:3:z:3,0::none:default:uniform | temp:0:z:0::none:default:uniform | temp:0:w:0::none:default:uniform",
    "temp:0:x:0::none:default:uniform | temp:0:w:0::none:default:uniform | temp:0:x:0::none:default:uniform",
    "temp:0:x:0::none:default:uniform",
    "temp:0:x:0::none:default:uniform | temp:0:z:0::none:default:uniform | temp:0:y:0::none:default:uniform",
    "temp:0:yz:0::none:default:uniform | temp:0:x:0::none:default:uniform | immediate32::::#0:none:default:uniform | uav:0:xxyx:0::none:default:uniform",
    "temp:1:xy:1::none:default:uniform | temp:0:w:0::none:default:uniform | immediate32::::#0:none:default:uniform | uav:0:xyxx:0::none:default:uniform",
    "temp:1:z:1::none:default:uniform | temp:1:y:1::none:default:uniform | temp:0:z:0::none:default:uniform",
    "temp:1:z:1::none:default:uniform",
    "uav:0:xy:0::none:default:uniform | temp:0:x:0::none:default:uniform | immediate32::::#0:none:default:uniform | temp:1:xyxx:1::none:default:uniform",
    "uav:0:xy:0::none:default:uniform | temp:0:w:0::none:default:uniform | immediate32::::#0:none:default:uniform | temp:0:yzyy:0::none:default:uniform",
    "",
    "",
    ""
]);
const BODY_COMPONENT_COUNTS = Object.freeze([
    [ 4, 4, 4 ],
    [ 4, 4, 1, 4 ],
    [ 4, 4, 1 ],
    [ 4, 4, 4 ],
    [ 4, 4, 4 ],
    [ 4, 4, 1 ],
    [ 4, 4, 4 ],
    [ 4, 4, 4, 4 ],
    [ 4, 4, 4 ],
    [ 4 ],
    [ 4, 4, 4 ],
    [ 4, 4, 1, 4 ],
    [ 4, 4, 1, 4 ],
    [ 4, 4, 4 ],
    [ 4 ],
    [ 4, 4, 1, 4 ],
    [ 4, 4, 1, 4 ],
    [],
    [],
    []
]);
const BODY_OPERANDS_SM50 = Object.freeze(BODY_OPERANDS_BASE_SM50.map((signature, instructionIndex) =>
    signature
        ? signature.split(" | ").map((operand, operandIndex) =>
            `${operand}:${BODY_COMPONENT_COUNTS[instructionIndex][operandIndex]}`).join(" | ")
        : ""));
const BODY_OPERANDS_SM51 = Object.freeze(BODY_OPERANDS_SM50.map((signature) =>
    signature
        .replaceAll("constant_buffer:3:", "constant_buffer:0:")
        .replaceAll(":3,0::none:default:uniform", ":0,3,0::none:default:uniform")
        .replaceAll("resource:0:xyzw:0::", "resource:0:xyzw:0,0::")
        .replaceAll("uav:0:xxyx:0::", "uav:0:xxyx:0,0::")
        .replaceAll("uav:0:xyxx:0::", "uav:0:xyxx:0,0::")
        .replaceAll("uav:0:xy:0::", "uav:0:xy:0,0::")));
const BLOCK_BEFORE = new Set([ "endif" ]);
const BLOCK_AFTER = new Set([ "if", "endif", "ret" ]);
const CONTROL_KIND = Object.freeze({
    if: "selection",
    endif: "selection",
    ret: "termination"
});

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
        throw new Error("WGSL sort-step compute CFG, SSA, or type metadata is inconsistent");
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
            throw new Error(`WGSL sort-step ${context} has non-canonical index metadata`);
        }
    }
}

function validateCommonOperand(operand, context, allowedModifier = "none")
{
    if (!operand
        || (operand.modifierName ?? "none") !== allowedModifier
        || (operand.minPrecisionName ?? "default") !== "default"
        || operand.nonUniform === true)
    {
        throw new Error(`WGSL sort-step ${context} has unsupported operand modifiers`);
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

function validateSm51Range(data, registerIndex, context)
{
    const range = data?.bindingRange;
    if (data?.bindingModel !== "sm5.1-range"
        || range?.bindingModel !== "sm5.1-range"
        || range.rangeId !== 0
        || range.lowerBound !== registerIndex
        || range.upperBound !== registerIndex
        || range.unbounded !== false
        || range.registerCount !== 1
        || range.registerSpace !== 0)
    {
        throw new Error(`WGSL sort-step ${context} requires one finite SM5.1 range`);
    }
}

function validateSm51Reference(operand, kind, context)
{
    const reference = operand.resourceReference;
    if (reference?.bindingModel !== "sm5.1-range"
        || reference.rangeId !== 0
        || reference.nonUniform !== false)
    {
        throw new Error(`WGSL sort-step ${context} has an invalid SM5.1 resource reference`);
    }
    if (kind === "constant-buffer")
    {
        if (reference.absoluteIndex !== null
            || !isCanonicalIndex(reference.bufferIndex, 1, 3)
            || !isCanonicalIndex(reference.vectorOffset, 2, 0))
        {
            throw new Error(`WGSL sort-step ${context} has an invalid SM5.1 cb3 reference`);
        }
    }
    else if (!isCanonicalIndex(reference.absoluteIndex, 1, 0)
        || reference.bufferIndex !== null
        || reference.vectorOffset !== null)
    {
        throw new Error(`WGSL sort-step ${context} has an invalid SM5.1 handle reference`);
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
        || operand.immediateValues?.length)
    {
        throw new Error(`WGSL sort-step ${context} is malformed`);
    }
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
        throw new TypeError("WGSL sort-step compute profile requires CJS SM5.0 or finite-range SM5.1 compute IR");
    }
    if (!isSortStepComputeProfile(program))
    {
        throw new Error("WGSL sort-step compute declaration shape is not supported");
    }
    if ((program.signatures?.input || []).length
        || (program.signatures?.output || []).length
        || (program.signatures?.patch || []).length
        || program.immediateConstantBuffer
        || program.constTables)
    {
        throw new Error("WGSL sort-step compute profile does not support signatures or constant tables");
    }
    requireRefactoringAllowed(program, "sort-step compute");

    const [ global, cb, input, output, groupId, localId, temps, group ] = program.declarations;
    if (global.data?.globalFlags !== (1 << 11)
        || global.data.refactoringAllowed !== true
        || global.operands?.length)
    {
        throw new Error("WGSL sort-step compute requires only the refactoring-allowed global flag");
    }
    if (cb.data?.registerIndex !== 3
        || cb.data.sizeInVec4 !== 1
        || cb.data.accessPattern !== "immediate_indexed"
        || cb.operands?.length !== 1)
    {
        throw new Error("WGSL sort-step compute requires immediate cb3 with one vec4 row");
    }
    validateDeclarationOperand(cb.operands[0], minor === 0
        ? { typeName: "constant_buffer", registerIndex: 3, componentCount: 4, selector: "xyzw", indices: [ 3, 1 ] }
        : { typeName: "constant_buffer", registerIndex: 0, componentCount: 4, selector: "xyzw", indices: [ 0, 3, 3 ] },
    "cb3 declaration");

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
        throw new Error("WGSL sort-step compute requires typed uint Buffer t0");
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
        throw new Error("WGSL sort-step compute requires noncoherent stride-8 structured UAV u0");
    }
    validateDeclarationOperand(output.operands[0], minor === 0
        ? { typeName: "uav", registerIndex: 0, componentCount: 0, selector: "", indices: [ 0 ] }
        : { typeName: "uav", registerIndex: 0, componentCount: 4, selector: "xyzw", indices: [ 0, 0, 0 ] },
    "u0 declaration");

    for (const [ declaration, typeName, operandType ] of [
        [ groupId, "input_thread_group_id", 33 ],
        [ localId, "input_thread_id_in_group", 34 ]
    ])
    {
        const operand = declaration.operands?.[0];
        validateCommonOperand(operand, `${typeName} declaration`);
        if (declaration.data?.registerIndex !== null
            || declaration.data.operandType !== operandType
            || declaration.data.operandTypeName !== typeName
            || declaration.operands?.length !== 1
            || operand.typeName !== typeName
            || operand.registerIndex !== null
            || operand.componentCount !== 4
            || operand.mask !== "x"
            || operand.swizzle || operand.selected
            || operand.indices?.length
            || operand.immediateValues?.length)
        {
            throw new Error(`WGSL sort-step compute requires exactly ${typeName}.x`);
        }
    }
    if (temps.data?.tempCount !== 2
        || group.data?.threadGroupX !== 256
        || group.data?.threadGroupY !== 1
        || group.data?.threadGroupZ !== 1
        || temps.operands?.length
        || group.operands?.length)
    {
        throw new Error("WGSL sort-step compute requires two temps and dcl_thread_group 256,1,1");
    }
    if (minor === 1)
    {
        validateSm51Range(cb.data, 3, "cb3 declaration");
        validateSm51Range(input.data, 0, "t0 declaration");
        validateSm51Range(output.data, 0, "u0 declaration");
    }
    else if (cb.data.bindingModel || cb.data.bindingRange
        || input.data.bindingModel || input.data.bindingRange
        || output.data.bindingModel || output.data.bindingRange)
    {
        throw new Error("WGSL sort-step SM5.0 declarations must use register bindings");
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
            throw new Error(`WGSL sort-step ${context} has unexpected SM5.1 reference metadata`);
        }
        return;
    }
    if (operand.typeName === "constant_buffer")
    {
        validateSm51Reference(operand, "constant-buffer", context);
    }
    else if ([ "resource", "uav" ].includes(operand.typeName))
    {
        validateSm51Reference(operand, "handle", context);
    }
    else if (operand.resourceReference !== undefined && operand.resourceReference !== null)
    {
        throw new Error(`WGSL sort-step ${context} has unexpected resource reference metadata`);
    }
}

function validExtensions(program, instruction)
{
    const extensions = instruction.extensions || [];
    if (program.shaderModel.minor === 1) return extensions.length === 0;
    if (instruction.opcodeName === "ld")
    {
        return validateSm50ResourceExtensions(extensions, {
            resourceDimension: 1,
            resourceDimensionName: "buffer",
            structureStride: 0,
            resourceReturnTypes: [ 4, 4, 4, 4 ]
        }, `WGSL sort-step instruction ${instruction.index}`);
    }
    if (instruction.opcodeName === "ld_structured")
    {
        return validateSm50ResourceExtensions(extensions, {
            resourceDimension: 12,
            resourceDimensionName: "structured_buffer",
            structureStride: 8,
            resourceReturnTypes: [ 6, 6, 6, 6 ]
        }, `WGSL sort-step instruction ${instruction.index}`);
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
        throw new Error("WGSL sort-step compute requires the exact bounded body opcode, operand, and modifier sequence");
    }
    for (const [ index, instruction ] of program.instructions.entries())
    {
        const expectedControl = CONTROL_KIND[instruction.opcodeName] || null;
        if (instruction.index !== index
            || (index > 0 && instruction.dxbcOffset <= program.instructions[index - 1].dxbcOffset)
            || instruction.controlKind !== expectedControl
            || instruction.testBoolean !== (instruction.opcodeName === "if" ? "nonzero" : null)
            || instruction.saturate
            || instruction.preciseMask !== ""
            || !validExtensions(program, instruction))
        {
            throw new Error(`WGSL sort-step instruction ${index} has inconsistent envelope metadata`);
        }
        for (const [ operandIndex, operand ] of instruction.operands.entries())
        {
            validateBodyReference(program, instruction, operand, operandIndex);
        }
    }
    validateAnalysisMetadata(program);
    const values = new Map(program.values.map((value) => [ value.id, value ]));
    for (const instruction of program.instructions)
    {
        for (const ref of instruction.dataflow.reads.flatMap((read) => read.refs))
        {
            if (values.get(ref.valueId)?.origin === "undefined-register")
            {
                throw new Error(`WGSL sort-step instruction ${instruction.index} reads undefined register data`);
            }
        }
    }
    const plans = buildSelectionPlans(program, "sort-step compute");
    if (plans.size !== 2
        || plans.get(9)?.kind !== "selection"
        || plans.get(9).hasElse
        || plans.get(9).merges.length
        || plans.get(14)?.kind !== "selection"
        || plans.get(14).hasElse
        || plans.get(14).merges.length)
    {
        throw new Error("WGSL sort-step compute requires the canonical nested no-else selections without live merges");
    }
}

function validateBindings(bindings)
{
    const expected = [
        [ "uniform-buffer", 3, "cb3", "array<vec4<f32>, 1>", null, "uniform", 16 ],
        [ "sampled-resource", 0, "t0", "array<u32>", null, "read-only-storage", 4 ],
        [ "storage-resource", 0, "u0", "array<u32>", 8, "storage", 8 ]
    ];
    if (bindings.length !== expected.length
        || expected.some(([ kind, registerIndex, symbol, type, stride, bufferType, minSize ], index) =>
        {
            const binding = bindings[index];
            return binding?.resourceKind !== kind
                || binding.registerIndex !== registerIndex
                || binding.registerSpace !== 0
                || binding.generatedSymbol !== symbol
                || binding.type !== type
                || (binding.structureStride ?? null) !== stride
                || binding.buffer?.type !== bufferType
                || binding.buffer.hasDynamicOffset !== false
                || binding.buffer.minBindingSize !== minSize;
        }))
    {
        throw new Error("WGSL sort-step compute binding layout does not match cb3/t0/u0");
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

function constantBufferRow(program, operand)
{
    return operand.indices[program.shaderModel.minor === 0 ? 1 : 2].values[0];
}

function rawSourcePart(program, operand, component)
{
    let code;
    if (operand.typeName === "temp")
    {
        code = `r${operand.registerIndex}.${component}`;
    }
    else if (operand.typeName === "constant_buffer")
    {
        code = `bitcast<u32>(cb3[${constantBufferRow(program, operand)}].${component})`;
    }
    else if (operand.typeName === "input_thread_group_id")
    {
        code = `workgroup_id.${component}`;
    }
    else if (operand.typeName === "input_thread_id_in_group")
    {
        code = `local_invocation_id.${component}`;
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
        throw new Error(`WGSL sort-step source ${operand.typeName || "unknown"} cannot be materialized`);
    }
    return operand.modifierName === "neg" ? `(0u - ${code})` : code;
}

function sourceParts(program, instruction, operandIndex, active)
{
    const operand = instruction.operands[operandIndex];
    const components = selectedComponents(operand, active);
    return components.map((component) => rawSourcePart(program, operand, component));
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

function structuredLoad(program, instruction, binding)
{
    const destination = instruction.operands[0];
    const active = Array.from(destination.mask);
    const address = sourceParts(program, instruction, 1, [ "x" ])[0];
    const resourceComponents = selectedComponents(instruction.operands[3], active);
    const wordCount = `arrayLength(&${binding.generatedSymbol})`;
    const recordCount = `(${wordCount} / 2u)`;
    const safeRecord = `min(${address}, ${recordCount} - 1u)`;
    const inRange = `${address} < ${recordCount}`;
    const parts = resourceComponents.map((component) =>
    {
        const word = COMPONENTS.indexOf(component);
        if (word > 1)
        {
            throw new Error(`WGSL sort-step structured load ${instruction.index} exceeds its two-word record`);
        }
        return `select(0u, ${binding.generatedSymbol}[((${safeRecord}) * 2u) + ${word}u], ${inRange})`;
    });
    return assignment(instruction, destination, parts);
}

function structuredStore(program, instruction, binding)
{
    const address = sourceParts(program, instruction, 1, [ "x" ])[0];
    const values = sourceParts(program, instruction, 3, [ "x", "y" ]);
    const recordCount = `(arrayLength(&${binding.generatedSymbol}) / 2u)`;
    const base = `((${address}) * 2u)`;
    return {
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
    };
}

function aluStatement(program, instruction)
{
    const destination = instruction.operands[0];
    const active = Array.from(destination.mask);
    const source = (operandIndex) => sourceParts(program, instruction, operandIndex, active);
    let parts;
    switch (instruction.opcodeName)
    {
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
        case "ult":
        {
            const left = source(1);
            const right = source(2);
            parts = left.map((part, index) =>
                `select(0u, 0xffffffffu, ${part} < ${right[index]})`);
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
        default:
            throw new Error(`WGSL sort-step ${instruction.opcodeName} instruction ${instruction.index} is not an ALU operation`);
    }
    return assignment(instruction, destination, parts);
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
    const statements = Array.from({ length: 2 }, (_, registerIndex) => ({
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
            const condition = sourceParts(program, instruction, 0, [ "x" ])[0];
            const statement = {
                kind: "if",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                condition: { code: `${condition} != 0u`, type: "bool" },
                statements: []
            };
            current.push(statement);
            stack.push({ parent: current, statement });
            current = statement.statements;
            continue;
        }
        if (instruction.opcodeName === "endif")
        {
            if (!stack.length)
            {
                throw new Error(`WGSL sort-step endif ${instruction.index} has malformed nesting`);
            }
            current = stack.pop().parent;
            continue;
        }
        if (instruction.opcodeName === "ret")
        {
            if (stack.length)
            {
                throw new Error(`WGSL sort-step return ${instruction.index} has malformed nesting`);
            }
            current.push({
                kind: "return",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset
            });
            continue;
        }
        const statement = instruction.opcodeName === "ld"
            ? typedLoad(instruction, typedInput)
            : instruction.opcodeName === "ld_structured"
                ? structuredLoad(program, instruction, output)
                : instruction.opcodeName === "store_structured"
                    ? structuredStore(program, instruction, output)
                    : aluStatement(program, instruction);
        current.push(statement);
    }
    if (stack.length)
    {
        throw new Error("WGSL sort-step compute contains unterminated selection nesting");
    }
    return statements;
}

/**
 * Whether declarations select the isolated sort-step compute profile.
 * Detailed validation belongs to the selected profile and never falls through.
 *
 * @param {object} program CJS shader IR program.
 * @returns {boolean} True for the sort-step declaration family.
 */
export function isSortStepComputeProfile(program)
{
    return program?.stage === "compute"
        && program.declarations?.length === DECLARATION_OPCODES.length
        && DECLARATION_OPCODES.every((opcodeName, index) =>
            program.declarations[index]?.opcodeName === opcodeName);
}

/**
 * Lowers the exact SM5.0/finite-SM5.1 sort-step compute profile.
 *
 * @param {object} program CJS shader IR program.
 * @param {object} [options] Exact compute-only binding options.
 * @returns {object} Typed compute program.
 */
export function lowerSortStepComputeProgram(program, options = {})
{
    validateDeclarations(program);
    validateBody(program);
    const bindings = lowerBindingLayout(program, options.bindingPlan ?? null);
    validateBindings(bindings);
    return deepFreeze({
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
        bindings,
        statements: lowerBody(program, bindings)
    });
}
