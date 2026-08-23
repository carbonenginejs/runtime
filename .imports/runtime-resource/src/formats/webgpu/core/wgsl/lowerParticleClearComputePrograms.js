import { analyzeRegisterValues } from "../ir/analyzeRegisterValues.js";
import { buildControlFlow } from "../ir/buildControlFlow.js";
import { inferValueTypes } from "../ir/inferValueTypes.js";
import { resolveRegisterFlow } from "../ir/resolveRegisterFlow.js";
import { lowerBindingLayout } from "./lowerBindingLayout.js";
import { requireRefactoringAllowed } from "./precisionControls.js";
import { buildSelectionPlans } from "./selectionPlans.js";

const RESET_KEY = "Main.pass0.compute";
const CLEAR_KEY = "Main.pass1.compute";
const PROOF_CLASS = "particle-clear-r32sint-v1";
const RESET_DECLARATIONS = Object.freeze([
    "dcl_global_flags",
    "dcl_unordered_access_view_typed",
    "dcl_thread_group"
]);
const CLEAR_DECLARATIONS = Object.freeze([
    "dcl_global_flags",
    "dcl_constant_buffer",
    "dcl_unordered_access_view_structured",
    "dcl_unordered_access_view_typed",
    "dcl_unordered_access_view_structured",
    "dcl_input",
    "dcl_temps",
    "dcl_thread_group"
]);
const RESET_OPCODES = Object.freeze([ "store_uav_typed", "ret" ]);
const CLEAR_OPCODES = Object.freeze([
    "ushr", "mov", "loop", "uge", "breakc", "bfi",
    "store_structured", "store_structured", "imm_atomic_iadd",
    "store_structured", "iadd", "endloop",
    "if", "and", "mov", "loop", "uge", "breakc",
    "store_structured", "store_structured", "imm_atomic_iadd",
    "store_structured", "iadd", "endloop", "endif", "ret"
]);
const BLOCK_BEFORE = new Set([
    "loop", "else", "endif", "endloop", "case", "default", "endswitch"
]);
const BLOCK_AFTER = new Set([
    "if", "loop", "switch", "break", "breakc", "continue", "continuec",
    "ret", "retc", "discard", "else", "endif", "endloop", "case", "default",
    "endswitch"
]);
const CONTROL_KIND = Object.freeze({
    loop: "loop",
    breakc: "loop",
    endloop: "loop",
    if: "selection",
    endif: "selection",
    ret: "termination"
});
const proofRecords = new WeakMap();
const contextRecords = new WeakMap();

function expectedOperand(
    typeName,
    registerIndex,
    componentCount,
    selectionModeName,
    selector = "",
    indices = [],
    immediateValues = [],
    resourceReference = null
)
{
    return Object.freeze({
        typeName,
        registerIndex,
        componentCount,
        selectionModeName,
        selector,
        indices: Object.freeze(indices),
        immediateValues: Object.freeze(immediateValues),
        resourceReference
    });
}

function registerOperand(typeName, registerIndex, selector, destination = false)
{
    return expectedOperand(
        typeName,
        registerIndex,
        4,
        destination ? "mask" : "select1",
        selector,
        [ registerIndex ]
    );
}

function temp(registerIndex, selector, destination = false)
{
    return registerOperand("temp", registerIndex, selector, destination);
}

function flattenedInput()
{
    return expectedOperand(
        "input_thread_id_in_group_flattened",
        null,
        4,
        "select1",
        "x"
    );
}

function immediate(...values)
{
    return expectedOperand(
        "immediate32",
        null,
        values.length,
        values.length === 1 ? "none" : "mask",
        "",
        [],
        values
    );
}

function sm51UavReference(registerIndex)
{
    return Object.freeze({
        bindingModel: "sm5.1-range",
        rangeId: registerIndex,
        nonUniform: false,
        absoluteIndex: Object.freeze({
            dimension: 1,
            representation: 0,
            values: Object.freeze([ registerIndex ]),
            relative: null
        }),
        bufferIndex: null,
        vectorOffset: null
    });
}

function sm51ConstantBufferReference()
{
    return Object.freeze({
        bindingModel: "sm5.1-range",
        rangeId: 0,
        nonUniform: false,
        absoluteIndex: null,
        bufferIndex: Object.freeze({
            dimension: 1,
            representation: 0,
            values: Object.freeze([ 3 ]),
            relative: null
        }),
        vectorOffset: Object.freeze({
            dimension: 2,
            representation: 0,
            values: Object.freeze([ 0 ]),
            relative: null
        })
    });
}

function uav(registerIndex, selector, minor, destination = false, atomic = false)
{
    return expectedOperand(
        "uav",
        registerIndex,
        atomic ? 0 : 4,
        atomic ? "none" : destination ? "mask" : "select1",
        atomic ? "" : selector,
        minor === 0 ? [ registerIndex ] : [ registerIndex, registerIndex ],
        [],
        minor === 0 ? null : sm51UavReference(registerIndex)
    );
}

function constantBuffer(minor)
{
    return expectedOperand(
        "constant_buffer",
        minor === 0 ? 3 : 0,
        4,
        "select1",
        "x",
        minor === 0 ? [ 3, 0 ] : [ 0, 3, 0 ],
        [],
        minor === 0 ? null : sm51ConstantBufferReference()
    );
}

function body(opcodeName, operands = [], testBoolean = null)
{
    return Object.freeze({
        opcodeName,
        operands: Object.freeze(operands),
        testBoolean
    });
}

function clearBody(minor)
{
    return Object.freeze([
        body("ushr", [
            temp(0, "x", true),
            constantBuffer(minor),
            immediate(8)
        ]),
        body("mov", [ temp(0, "y", true), immediate(0) ]),
        body("loop"),
        body("uge", [
            temp(0, "z", true),
            temp(0, "y"),
            temp(0, "x")
        ]),
        body("breakc", [ temp(0, "z") ], "nonzero"),
        body("bfi", [
            temp(0, "z", true),
            immediate(24),
            immediate(8),
            temp(0, "y"),
            flattenedInput()
        ]),
        body("store_structured", [
            uav(2, "xyzw", minor, true),
            temp(0, "z"),
            immediate(0),
            immediate(0, 0, 0, 0xbf800000)
        ]),
        body("store_structured", [
            uav(2, "xyzw", minor, true),
            temp(0, "z"),
            immediate(16),
            immediate(0, 0, 0, 0)
        ]),
        body("imm_atomic_iadd", [
            temp(1, "x", true),
            uav(1, "", minor, false, true),
            immediate(0),
            immediate(1)
        ]),
        body("store_structured", [
            uav(0, "x", minor, true),
            temp(1, "x"),
            immediate(0),
            temp(0, "z")
        ]),
        body("iadd", [
            temp(0, "y", true),
            temp(0, "y"),
            immediate(1)
        ]),
        body("endloop"),
        body("if", [ flattenedInput() ], "zero"),
        body("and", [
            temp(0, "x", true),
            constantBuffer(minor),
            immediate(0xffffff00)
        ]),
        body("mov", [ temp(0, "y", true), temp(0, "x") ]),
        body("loop"),
        body("uge", [
            temp(0, "z", true),
            temp(0, "y"),
            constantBuffer(minor)
        ]),
        body("breakc", [ temp(0, "z") ], "nonzero"),
        body("store_structured", [
            uav(2, "xyzw", minor, true),
            temp(0, "y"),
            immediate(0),
            immediate(0, 0, 0, 0xbf800000)
        ]),
        body("store_structured", [
            uav(2, "xyzw", minor, true),
            temp(0, "y"),
            immediate(16),
            immediate(0, 0, 0, 0)
        ]),
        body("imm_atomic_iadd", [
            temp(1, "x", true),
            uav(1, "", minor, false, true),
            immediate(0),
            immediate(1)
        ]),
        body("store_structured", [
            uav(0, "x", minor, true),
            temp(1, "x"),
            immediate(0),
            temp(0, "y")
        ]),
        body("iadd", [
            temp(0, "y", true),
            temp(0, "y"),
            immediate(1)
        ]),
        body("endloop"),
        body("endif"),
        body("ret")
    ]);
}

function clonePlain(value)
{
    if (Array.isArray(value)) return value.map(clonePlain);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(
            Object.entries(value).map(([ key, entry ]) => [
                key,
                clonePlain(entry)
            ])
        );
    }
    return value;
}

function deepFreeze(value)
{
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const entry of Object.values(value)) deepFreeze(entry);
    return Object.freeze(value);
}

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

function firstDifference(left, right, path = "$")
{
    if (Object.is(left, right)) return null;
    if (Array.isArray(left) && Array.isArray(right))
    {
        if (left.length !== right.length)
        {
            return `${path}.length (${left.length} != ${right.length})`;
        }
        for (let index = 0; index < left.length; index += 1)
        {
            const difference = firstDifference(
                left[index], right[index], `${path}[${index}]`);
            if (difference) return difference;
        }
        return null;
    }
    if (left && right
        && typeof left === "object"
        && typeof right === "object")
    {
        const keys = Array.from(new Set([
            ...Object.keys(left),
            ...Object.keys(right)
        ])).sort();
        for (const key of keys)
        {
            const difference = firstDifference(
                left[key], right[key], `${path}.${key}`);
            if (difference) return difference;
        }
        return null;
    }
    return `${path} (${JSON.stringify(left)} != ${JSON.stringify(right)})`;
}

function validateAnalysisMetadata(program, label)
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
    const originalSnapshot = analysisSnapshot(program);
    const rebuiltSnapshot = analysisSnapshot(rebuilt);
    if (JSON.stringify(originalSnapshot) !== JSON.stringify(rebuiltSnapshot))
    {
        const difference = firstDifference(originalSnapshot, rebuiltSnapshot);
        throw new Error(
            `WGSL particle ${label} CFG, SSA, or type metadata is inconsistent`
                + (difference ? ` at ${difference}` : "")
        );
    }
}

function selector(operand)
{
    return operand.mask || operand.swizzle || operand.selected || "";
}

function canonicalIndex(entry, dimension, value)
{
    return entry?.dimension === dimension
        && entry.representation === 0
        && entry.relative === null
        && entry.values?.length === 1
        && entry.values[0] === value;
}

function validateIndices(operand, expected, context)
{
    if (operand.indices?.length !== expected.length
        || expected.some((value, dimension) =>
            !canonicalIndex(operand.indices[dimension], dimension, value)))
    {
        throw new Error(
            `WGSL particle ${context} has non-canonical index metadata`
        );
    }
}

function validateResourceReference(operand, expected, context)
{
    const actual = operand.resourceReference ?? null;
    if (JSON.stringify(actual) !== JSON.stringify(expected))
    {
        throw new Error(
            `WGSL particle ${context} has inconsistent SM5.1 resource-reference metadata`
        );
    }
}

function validateOperand(operand, expected, context)
{
    const immediateValues = (operand.immediateValues || [])
        .map((entry) => entry.uint32);
    if (operand.typeName !== expected.typeName
        || (operand.registerIndex ?? null) !== expected.registerIndex
        || operand.componentCount !== expected.componentCount
        || operand.selectionModeName !== expected.selectionModeName
        || selector(operand) !== expected.selector
        || operand.modifierName !== "none"
        || operand.minPrecisionName !== "default"
        || operand.nonUniform !== false
        || JSON.stringify(immediateValues)
            !== JSON.stringify(expected.immediateValues))
    {
        throw new Error(
            `WGSL particle ${context} does not match the exact operand shape`
        );
    }
    validateIndices(operand, expected.indices, context);
    validateResourceReference(
        operand,
        expected.resourceReference,
        context
    );
}

function exactOpcodeShape(program, declarations, instructions)
{
    return program?.format === "CJS_SHADER_IR"
        && program.formatVersion === 1
        && program.stage === "compute"
        && program.shaderModel?.major === 5
        && (program.shaderModel.minor === 0 || program.shaderModel.minor === 1)
        && program.declarations?.length === declarations.length
        && declarations.every((opcode, index) =>
            program.declarations[index]?.opcodeName === opcode)
        && program.instructions?.length === instructions.length
        && instructions.every((opcode, index) =>
            program.instructions[index]?.opcodeName === opcode);
}

/**
 * Declaration-shaped selector for the effect-authorized scalar reset.
 *
 * @param {object} program CJS shader IR.
 * @returns {boolean} Whether validation must be final in the reset profile.
 */
export function isParticleClearResetCandidate(program)
{
    if (!exactOpcodeShape(program, RESET_DECLARATIONS, RESET_OPCODES))
    {
        return false;
    }
    const declaration = program.declarations[1];
    const group = program.declarations[2]?.data;
    return declaration.data?.resourceDimensionName === "buffer"
        && declaration.data?.returnType?.returnTypeNames?.every(
            (entry) => entry === "sint")
        && group?.threadGroupX === 1
        && group.threadGroupY === 1
        && group.threadGroupZ === 1;
}

/**
 * Declaration/body selector for the self-proving particle initialization pass.
 *
 * @param {object} program CJS shader IR.
 * @returns {boolean} Whether the exact clear validator owns the program.
 */
export function isParticleClearInitializeCandidate(program)
{
    return exactOpcodeShape(program, CLEAR_DECLARATIONS, CLEAR_OPCODES);
}

function validateFiniteRange(data, rangeId, binding, context)
{
    const range = data?.bindingRange;
    if (data?.bindingModel !== "sm5.1-range"
        || range?.bindingModel !== "sm5.1-range"
        || range.rangeId !== rangeId
        || range.lowerBound !== binding
        || range.upperBound !== binding
        || range.unbounded !== false
        || range.registerCount !== 1
        || range.registerSpace !== 0)
    {
        throw new Error(
            `WGSL particle ${context} requires the exact finite SM5.1 range`
        );
    }
}

function validateDeclarationOperand(
    operand,
    expected,
    token,
    type,
    length,
    context
)
{
    validateOperand(operand, expected, context);
    if (operand.token !== token
        || operand.type !== type
        || operand.length !== length)
    {
        throw new Error(
            `WGSL particle ${context} has inconsistent raw operand framing`
        );
    }
}

function typedSintData(data, registerIndex)
{
    return data?.resourceDimension === 1
        && data.resourceDimensionName === "buffer"
        && data.globallyCoherent === false
        && data.registerIndex === registerIndex
        && data.returnType?.token === 13107
        && JSON.stringify(data.returnType.returnTypes) === "[3,3,3,3]"
        && JSON.stringify(data.returnType.returnTypeNames)
            === "[\"sint\",\"sint\",\"sint\",\"sint\"]";
}

function validateBinding(
    program,
    resourceKind,
    registerIndex,
    rangeId,
    structureStride,
    typed,
    context
)
{
    const binding = program.bindings.find((entry) =>
        entry.resourceKind === resourceKind
        && entry.registerIndex === registerIndex);
    const range = binding?.range;
    const minor = program.shaderModel.minor;
    if (!binding
        || range?.bindingModel !== (minor === 0
            ? "sm5.0-register"
            : "sm5.1-range")
        || range.rangeId !== (minor === 0 ? null : rangeId)
        || range.lowerBound !== registerIndex
        || range.upperBound !== registerIndex
        || range.unbounded !== false
        || range.registerCount !== 1
        || range.registerSpace !== 0
        || (binding.structureStride ?? null) !== structureStride
        || (typed
            ? binding.resourceDimension !== "buffer"
                || binding.returnType?.token !== 13107
                || binding.returnType.returnTypeNames?.some(
                    (entry) => entry !== "sint")
            : structureStride !== null
                && (binding.resourceDimension !== null
                    || binding.returnType !== null)))
    {
        throw new Error(
            `WGSL particle ${context} has inconsistent binding metadata`
        );
    }
}

function validateResetDeclarations(program)
{
    if (!isParticleClearResetCandidate(program))
    {
        throw new Error(
            "WGSL particle counter reset requires the exact declaration and body family"
        );
    }
    requireRefactoringAllowed(program, "particle counter reset compute");
    const minor = program.shaderModel.minor;
    const declaration = program.declarations[1];
    const group = program.declarations[2];
    if (!typedSintData(declaration.data, 0)
        || declaration.operands?.length !== 1
        || group.operands?.length
        || program.declarations.some((entry) => entry.tailTokens?.length))
    {
        throw new Error(
            "WGSL particle counter reset requires one exact signed typed UAV"
        );
    }
    const expected = expectedOperand(
        "uav",
        0,
        minor === 0 ? 0 : 4,
        minor === 0 ? "none" : "swizzle",
        minor === 0 ? "" : "xyzw",
        minor === 0 ? [ 0 ] : [ 0, 0, 0 ]
    );
    validateDeclarationOperand(
        declaration.operands[0],
        expected,
        minor === 0 ? 1171456 : 3272262,
        30,
        minor === 0 ? 2 : 4,
        "counter-reset UAV declaration"
    );
    if (minor === 0)
    {
        if (declaration.data.bindingModel !== undefined
            || declaration.data.bindingRange !== undefined)
        {
            throw new Error(
                "WGSL particle counter reset SM5.0 declaration has unexpected range metadata"
            );
        }
    }
    else validateFiniteRange(declaration.data, 0, 0, "counter-reset UAV");
    validateBinding(
        program,
        "storage-resource",
        0,
        0,
        null,
        true,
        "counter-reset u0"
    );
    if (program.bindings.length !== 1)
    {
        throw new Error(
            "WGSL particle counter reset requires exactly one binding"
        );
    }
}

function validateResetBody(program)
{
    const minor = program.shaderModel.minor;
    const expected = [
        body("store_uav_typed", [
            uav(0, "xyzw", minor, true),
            immediate(0, 0, 0, 0),
            immediate(0, 0, 0, 0)
        ]),
        body("ret")
    ];
    for (const [ index, entry ] of expected.entries())
    {
        const instruction = program.instructions[index];
        if (instruction.index !== index
            || instruction.opcodeName !== entry.opcodeName
            || instruction.operands?.length !== entry.operands.length)
        {
            throw new Error(
                "WGSL particle counter reset requires the exact two-instruction body"
            );
        }
        for (const [ operandIndex, operand ] of entry.operands.entries())
        {
            validateOperand(
                instruction.operands[operandIndex],
                operand,
                `counter-reset instruction ${index} operand ${operandIndex}`
            );
        }
        if (instruction.controlKind
                !== (CONTROL_KIND[instruction.opcodeName] || null)
            || instruction.testBoolean !== null
            || instruction.saturate !== false
            || instruction.preciseMask !== ""
            || instruction.tailTokens?.length
            || instruction.extensionRecords?.length)
        {
            throw new Error(
                `WGSL particle counter-reset instruction ${index} has inconsistent envelope metadata`
            );
        }
    }
    validateAnalysisMetadata(program, "counter-reset");
    if (program.blocks.length !== 1
        || program.controlFlow.edgeCount !== 0
        || program.controlFlow.regions.length
        || program.controlFlow.unreachableBlockIds.length
        || program.values.length
        || buildSelectionPlans(program, "particle counter reset").size)
    {
        throw new Error(
            "WGSL particle counter reset requires the canonical empty dataflow"
        );
    }
}

function validateClearDeclarationOperand(
    declaration,
    typeName,
    registerIndex,
    minor,
    context
)
{
    const constantBuffer = typeName === "constant_buffer";
    const input = typeName === "input_thread_id_in_group_flattened";
    const expected = expectedOperand(
        typeName,
        input ? null : minor === 0 || !constantBuffer ? registerIndex : 0,
        input ? 0 : minor === 0 && !constantBuffer ? 0 : 4,
        input || minor === 0 && !constantBuffer ? "none" : "swizzle",
        input || minor === 0 && !constantBuffer ? "" : "xyzw",
        input
            ? []
            : constantBuffer
                ? minor === 0 ? [ 3, 1 ] : [ 0, 3, 3 ]
                : minor === 0
                    ? [ registerIndex ]
                    : [ registerIndex, registerIndex, registerIndex ]
    );
    const token = input
        ? 147456
        : constantBuffer
            ? minor === 0 ? 2133574 : 3182150
            : minor === 0 ? 1171456 : 3272262;
    const type = input ? 36 : constantBuffer ? 8 : 30;
    const length = input ? 1 : minor === 0 ? constantBuffer ? 3 : 2 : 4;
    validateDeclarationOperand(
        declaration.operands[0],
        expected,
        token,
        type,
        length,
        context
    );
}

function validateClearDeclarations(program)
{
    if (!isParticleClearInitializeCandidate(program))
    {
        throw new Error(
            "WGSL particle clear requires the exact declaration and 26-opcode family"
        );
    }
    requireRefactoringAllowed(program, "particle clear compute");
    const minor = program.shaderModel.minor;
    if (program.declarations.some((entry) => entry.tailTokens?.length)
        || program.declarations.slice(1, 6).some((entry) =>
            entry.operands?.length !== 1)
        || program.declarations.slice(6).some((entry) =>
            entry.operands?.length))
    {
        throw new Error(
            "WGSL particle clear declarations contain unsupported framing"
        );
    }
    const cb = program.declarations[1];
    const dead = program.declarations[2];
    const counter = program.declarations[3];
    const particles = program.declarations[4];
    const input = program.declarations[5];
    const temps = program.declarations[6];
    const group = program.declarations[7];
    if (cb.data?.accessPattern !== "immediate_indexed"
        || cb.data.registerIndex !== 3
        || cb.data.sizeInVec4 !== 1
        || dead.data?.globallyCoherent !== false
        || dead.data.structureStride !== 4
        || dead.data.registerIndex !== 0
        || !typedSintData(counter.data, 1)
        || particles.data?.globallyCoherent !== false
        || particles.data.structureStride !== 32
        || particles.data.registerIndex !== 2
        || input.data?.registerIndex !== null
        || input.data.operandType !== 36
        || input.data.operandTypeName
            !== "input_thread_id_in_group_flattened"
        || temps.data?.tempCount !== 2
        || group.data?.threadGroupX !== 16
        || group.data.threadGroupY !== 16
        || group.data.threadGroupZ !== 1)
    {
        throw new Error(
            "WGSL particle clear declarations do not match cb3/u0/u1/u2/local-index/temp2/16x16x1"
        );
    }
    validateClearDeclarationOperand(
        cb, "constant_buffer", 3, minor, "clear cb3 declaration");
    validateClearDeclarationOperand(
        dead, "uav", 0, minor, "clear DeadBuffer declaration");
    validateClearDeclarationOperand(
        counter, "uav", 1, minor, "clear ParticleCounters declaration");
    validateClearDeclarationOperand(
        particles, "uav", 2, minor, "clear ParticleBuffer declaration");
    validateClearDeclarationOperand(
        input,
        "input_thread_id_in_group_flattened",
        null,
        minor,
        "clear local-index declaration"
    );
    if (minor === 0)
    {
        for (const declaration of [ cb, dead, counter, particles ])
        {
            if (declaration.data.bindingModel !== undefined
                || declaration.data.bindingRange !== undefined)
            {
                throw new Error(
                    "WGSL particle clear SM5.0 declarations have unexpected range metadata"
                );
            }
        }
    }
    else
    {
        validateFiniteRange(cb.data, 0, 3, "clear cb3");
        validateFiniteRange(dead.data, 0, 0, "clear DeadBuffer");
        validateFiniteRange(counter.data, 1, 1, "clear ParticleCounters");
        validateFiniteRange(particles.data, 2, 2, "clear ParticleBuffer");
    }
    validateBinding(
        program, "uniform-buffer", 3, 0, null, false, "clear cb3");
    validateBinding(
        program, "storage-resource", 0, 0, 4, false, "clear DeadBuffer");
    validateBinding(
        program, "storage-resource", 1, 1, null, true,
        "clear ParticleCounters");
    validateBinding(
        program, "storage-resource", 2, 2, 32, false,
        "clear ParticleBuffer");
    if (program.bindings.length !== 4)
    {
        throw new Error("WGSL particle clear requires exactly four bindings");
    }
}

function validateClearBody(program)
{
    const expectedBody = clearBody(program.shaderModel.minor);
    for (const [ index, expected ] of expectedBody.entries())
    {
        const instruction = program.instructions[index];
        if (instruction?.index !== index
            || instruction.opcodeName !== expected.opcodeName
            || instruction.operands?.length !== expected.operands.length)
        {
            throw new Error(
                "WGSL particle clear requires the exact 26-instruction schedule"
            );
        }
        for (const [ operandIndex, operand ] of expected.operands.entries())
        {
            validateOperand(
                instruction.operands[operandIndex],
                operand,
                `clear instruction ${index} operand ${operandIndex}`
            );
        }
        if ((index > 0
                && instruction.dxbcOffset
                    <= program.instructions[index - 1].dxbcOffset)
            || instruction.controlKind
                !== (CONTROL_KIND[instruction.opcodeName] || null)
            || instruction.testBoolean !== expected.testBoolean
            || instruction.saturate !== false
            || instruction.preciseMask !== ""
            || instruction.tailTokens?.length
            || instruction.extensionRecords?.length
            || instruction.syncFlags !== undefined
            || instruction.syncFlagNames !== undefined
            || instruction.resinfoReturnTypeName !== undefined)
        {
            throw new Error(
                `WGSL particle clear instruction ${index} has inconsistent envelope metadata`
            );
        }
    }
    validateAnalysisMetadata(program, "clear");
    const origins = program.values.reduce((counts, value) =>
    {
        counts[value.origin] = (counts[value.origin] || 0) + 1;
        return counts;
    }, {});
    if (program.blocks.length !== 13
        || program.controlFlow.edgeCount !== 15
        || program.controlFlow.regions.length !== 3
        || program.controlFlow.unreachableBlockIds.length
        || program.values.length !== 20
        || origins["instruction-write"] !== 11
        || origins["control-flow-merge"] !== 2
        || origins["program-input"] !== 1
        || origins["undefined-register"] !== 6)
    {
        throw new Error(
            "WGSL particle clear requires the canonical CFG and SSA shape"
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
                    `WGSL particle clear instruction ${instruction.index} reads undefined register data`
                );
            }
        }
    }
    const plans = buildSelectionPlans(program, "particle clear compute");
    const first = plans.get(2);
    const selection = plans.get(12);
    const tail = plans.get(15);
    const firstMerge = first?.merges?.[0];
    const tailMerge = tail?.merges?.[0];
    if (plans.size !== 3
        || first?.kind !== "loop"
        || first.preheaderBlockId !== "block0"
        || first.backedgeBlockId !== "block4"
        || first.merges.length !== 1
        || firstMerge.id !== "value41"
        || firstMerge.type !== "u32"
        || firstMerge.entryIncoming?.blockId !== "block0"
        || firstMerge.entryIncoming?.valueId !== "value4"
        || firstMerge.entryIncoming?.component !== "y"
        || firstMerge.backedgeIncoming?.valueId !== "value18"
        || firstMerge.backedgeIncoming?.component !== "y"
        || first.exitMerges.length
        || first.exitEdges.size
        || selection?.kind !== "selection"
        || selection.hasElse
        || selection.merges.length
        || tail?.kind !== "loop"
        || tail.preheaderBlockId !== "block6"
        || tail.backedgeBlockId !== "block10"
        || tail.merges.length !== 1
        || tailMerge.id !== "value51"
        || tailMerge.type !== "u32"
        || tailMerge.entryIncoming?.blockId !== "block6"
        || tailMerge.entryIncoming?.valueId !== "value24"
        || tailMerge.entryIncoming?.component !== "y"
        || tailMerge.backedgeIncoming?.valueId !== "value37"
        || tailMerge.backedgeIncoming?.component !== "y"
        || tail.exitMerges.length
        || tail.exitEdges.size)
    {
        throw new Error(
            "WGSL particle clear requires the canonical loop and selection merges"
        );
    }
}

function validateResetProgram(program)
{
    validateResetDeclarations(program);
    validateResetBody(program);
}

function validateClearProgram(program)
{
    validateClearDeclarations(program);
    validateClearBody(program);
}

function activeStages(pass)
{
    return (pass?.stageInputs || []).filter((stage) => stage?.m_exists);
}

function reflectedUavs(stage)
{
    return Array.from(stage?.uavs || [], ([ registerIndex, resource ]) => ({
        registerIndex,
        name: resource?.name,
        type: resource?.type,
        arrayElements: resource?.arrayElements
    })).sort((left, right) => left.registerIndex - right.registerIndex);
}

function exactReflection(stage, expected)
{
    const resources = Array.from(stage?.resources || []);
    return resources.length === 0
        && JSON.stringify(reflectedUavs(stage)) === JSON.stringify(expected);
}

function effectStages(effectDescription)
{
    const techniques = effectDescription?.techniques;
    if (!Array.isArray(techniques)
        || techniques.length !== 1
        || techniques[0]?.name !== "Main"
        || !Array.isArray(techniques[0].passes)
        || techniques[0].passes.length !== 2)
    {
        return null;
    }
    const resetStages = activeStages(techniques[0].passes[0]);
    const clearStages = activeStages(techniques[0].passes[1]);
    if (resetStages.length !== 1
        || clearStages.length !== 1
        || resetStages[0].cjsShaderBytecode?.stageName !== "compute"
        || clearStages[0].cjsShaderBytecode?.stageName !== "compute")
    {
        return null;
    }
    return { reset: resetStages[0], clear: clearStages[0] };
}

/**
 * Cheap reflection/topology candidate check used before companion decoding.
 *
 * @param {object} effectDescription Resolved complete effect description.
 * @returns {boolean} Whether exact particle-clear preflight should run.
 */
export function isParticleClearEffectCandidate(effectDescription)
{
    const stages = effectStages(effectDescription);
    return !!stages
        && exactReflection(stages.reset, [
            {
                registerIndex: 0,
                name: "ParticleCounters",
                type: 10,
                arrayElements: 1
            }
        ])
        && exactReflection(stages.clear, [
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
        ]);
}

/**
 * Mints per-program opaque authorization after validating the complete two-pass
 * effect, reflection identity, and both exact shader profiles.
 *
 * @param {object} effectDescription Resolved complete effect description.
 * @param {Map<string, object>} programsByKey Both companion CJS shader IRs.
 * @returns {object|null} Opaque effect context, or null for an unrelated effect.
 */
export function preflightParticleClearEffectProfile(
    effectDescription,
    programsByKey
)
{
    if (!isParticleClearEffectCandidate(effectDescription)) return null;
    if (!(programsByKey instanceof Map))
    {
        throw new TypeError(
            "Particle-clear effect preflight requires a program map"
        );
    }
    const reset = programsByKey.get(RESET_KEY);
    const clear = programsByKey.get(CLEAR_KEY);
    if (!reset || !clear)
    {
        throw new Error(
            "Particle-clear effect preflight requires both exact companion programs"
        );
    }
    validateResetProgram(reset);
    validateClearProgram(clear);
    const resetProof = Object.freeze({});
    const clearProof = Object.freeze({});
    proofRecords.set(resetProof, {
        proofClass: PROOF_CLASS,
        role: "reset",
        program: reset
    });
    proofRecords.set(clearProof, {
        proofClass: PROOF_CLASS,
        role: "clear",
        program: clear
    });
    const context = Object.freeze({});
    contextRecords.set(context, {
        proofClass: PROOF_CLASS,
        proofs: new Map([
            [ RESET_KEY, resetProof ],
            [ CLEAR_KEY, clearProof ]
        ])
    });
    return context;
}

/**
 * Returns one proof token only from a branded effect context.
 *
 * @param {object|null} context Opaque preflight result.
 * @param {string} key Canonical effect-stage key.
 * @returns {object|null} Per-program proof token.
 */
export function particleClearEffectProofFor(context, key)
{
    return contextRecords.get(context)?.proofs.get(key) ?? null;
}

/**
 * Returns the stable cache class of one authentic effect context.
 *
 * @param {object|null} context Opaque preflight result.
 * @returns {string|null} Cache-key proof class.
 */
export function particleClearEffectProofClass(context)
{
    return contextRecords.get(context)?.proofClass ?? null;
}

function assertProof(program, proof, role)
{
    const record = proofRecords.get(proof);
    if (record?.proofClass !== PROOF_CLASS
        || record.role !== role
        || record.program !== program)
    {
        throw new Error(
            `WGSL particle ${role} requires an exact whole-effect R32_SINT companion proof`
        );
    }
}

/**
 * Resolves the only signed typed-UAV layout admitted by this compiler.
 * Pass 0 requires its whole-effect proof; pass 1 proves its width through its
 * exact returned typed atomic.
 *
 * @param {object} program CJS shader IR.
 * @param {object|null} proof Optional per-program opaque proof.
 * @returns {object|null} Narrow lowerBindingLayout policy.
 */
export function particleClearSignedAtomicLayoutPolicy(program, proof = null)
{
    if (isParticleClearResetCandidate(program))
    {
        assertProof(program, proof, "reset");
        validateResetProgram(program);
        return {
            signedAtomicI32Identities: [ "storage-resource:0:0" ]
        };
    }
    if (isParticleClearInitializeCandidate(program))
    {
        validateClearProgram(program);
        if (proof !== null && proof !== undefined)
        {
            assertProof(program, proof, "clear");
        }
        return {
            signedAtomicI32Identities: [ "storage-resource:0:1" ]
        };
    }
    return null;
}

function validateResetBindings(bindings)
{
    const binding = bindings[0];
    if (bindings.length !== 1
        || binding?.resourceKind !== "storage-resource"
        || binding.registerSpace !== 0
        || binding.registerIndex !== 0
        || binding.generatedSymbol !== "u0"
        || binding.declaration !== "var<storage, read_write>"
        || binding.type !== "array<atomic<i32>>"
        || binding.buffer?.type !== "storage"
        || binding.buffer.hasDynamicOffset !== false
        || binding.buffer.minBindingSize !== 4)
    {
        throw new Error(
            "WGSL particle counter-reset binding layout does not match signed u0"
        );
    }
}

function validateClearBindings(bindings)
{
    const expected = [
        [
            "uniform-buffer", 3, "cb3", "var<uniform>",
            "array<vec4<f32>, 1>", null, "uniform", 16
        ],
        [
            "storage-resource", 0, "u0", "var<storage, read_write>",
            "array<u32>", 4, "storage", 4
        ],
        [
            "storage-resource", 1, "u1", "var<storage, read_write>",
            "array<atomic<i32>>", null, "storage", 4
        ],
        [
            "storage-resource", 2, "u2", "var<storage, read_write>",
            "array<u32>", 32, "storage", 32
        ]
    ];
    if (bindings.length !== expected.length
        || expected.some(([
            kind, registerIndex, symbol, declaration, type, stride,
            bufferType, minSize
        ], index) =>
        {
            const binding = bindings[index];
            return binding?.resourceKind !== kind
                || binding.registerSpace !== 0
                || binding.registerIndex !== registerIndex
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
            "WGSL particle clear binding layout does not match cb3/u0/u1/u2"
        );
    }
}

function location(program, instructionIndex)
{
    const instruction = program.instructions[instructionIndex];
    return {
        instructionIndex,
        dxbcOffset: instruction.dxbcOffset
    };
}

function expression(code, type)
{
    return { code, type };
}

function letStatement(program, index, name, type, code)
{
    return {
        kind: "let",
        ...location(program, index),
        name,
        type,
        expression: expression(code, type)
    };
}

function varStatement(program, index, name, type, code)
{
    return {
        kind: "var",
        ...location(program, index),
        name,
        type,
        expression: expression(code, type)
    };
}

function assignment(program, index, name, type, code)
{
    return {
        kind: "value-assignment",
        ...location(program, index),
        name,
        type,
        expression: expression(code, type)
    };
}

function call(program, index, code)
{
    return {
        kind: "call",
        ...location(program, index),
        expression: expression(code, "void")
    };
}

function particleStores(program, index, particle, suffix)
{
    const base = `${particle} * 8u`;
    return [
        {
            kind: "if",
            ...location(program, index),
            condition: expression(
                `${particle} < arrayLength(&u2) / 8u`,
                "bool"
            ),
            statements: [
                assignment(program, index, `u2[${base} + 0u]`, "u32", "0u"),
                assignment(program, index, `u2[${base} + 1u]`, "u32", "0u"),
                assignment(program, index, `u2[${base} + 2u]`, "u32", "0u"),
                assignment(
                    program,
                    index,
                    `u2[${base} + 3u]`,
                    "u32",
                    "0xbf800000u"
                ),
                assignment(program, index + 1, `u2[${base} + 4u]`, "u32", "0u"),
                assignment(program, index + 1, `u2[${base} + 5u]`, "u32", "0u"),
                assignment(program, index + 1, `u2[${base} + 6u]`, "u32", "0u"),
                assignment(program, index + 1, `u2[${base} + 7u]`, "u32", "0u")
            ]
        },
        letStatement(
            program,
            index + 2,
            `old_counter_${suffix}`,
            "i32",
            "atomicAdd(&u1[0u], 1i)"
        ),
        letStatement(
            program,
            index + 2,
            `dead_index_${suffix}`,
            "u32",
            `bitcast<u32>(old_counter_${suffix})`
        ),
        {
            kind: "if",
            ...location(program, index + 3),
            condition: expression(
                `dead_index_${suffix} < arrayLength(&u0)`,
                "bool"
            ),
            statements: [
                assignment(
                    program,
                    index + 3,
                    `u0[dead_index_${suffix}]`,
                    "u32",
                    particle
                )
            ]
        }
    ];
}

function lowerClearBody(program)
{
    const blockParticle = "particle_index_blocks";
    const tailParticle = "particle_index_tail";
    return [
        letStatement(
            program, 0, "count", "u32", "bitcast<u32>(cb3[0u].x)"),
        letStatement(program, 0, "full_blocks", "u32", "count >> 8u"),
        varStatement(program, 1, "block_index", "u32", "0u"),
        {
            kind: "loop",
            ...location(program, 2),
            statements: [
                {
                    kind: "if",
                    ...location(program, 3),
                    condition: expression(
                        "block_index >= full_blocks",
                        "bool"
                    ),
                    statements: [ {
                        kind: "break",
                        ...location(program, 4)
                    } ]
                },
                letStatement(
                    program,
                    5,
                    blockParticle,
                    "u32",
                    "insertBits(local_invocation_index, block_index, 8u, 24u)"
                ),
                ...particleStores(program, 6, blockParticle, "blocks"),
                assignment(
                    program,
                    10,
                    "block_index",
                    "u32",
                    "block_index + 1u"
                )
            ]
        },
        {
            kind: "if",
            ...location(program, 12),
            condition: expression("local_invocation_index == 0u", "bool"),
            statements: [
                letStatement(
                    program,
                    13,
                    "tail_base",
                    "u32",
                    "count & 0xffffff00u"
                ),
                varStatement(
                    program,
                    14,
                    tailParticle,
                    "u32",
                    "tail_base"
                ),
                {
                    kind: "loop",
                    ...location(program, 15),
                    statements: [
                        {
                            kind: "if",
                            ...location(program, 16),
                            condition: expression(
                                `${tailParticle} >= count`,
                                "bool"
                            ),
                            statements: [ {
                                kind: "break",
                                ...location(program, 17)
                            } ]
                        },
                        ...particleStores(
                            program,
                            18,
                            tailParticle,
                            "tail"
                        ),
                        assignment(
                            program,
                            22,
                            tailParticle,
                            "u32",
                            `${tailParticle} + 1u`
                        )
                    ]
                }
            ]
        },
        {
            kind: "return",
            ...location(program, 25)
        }
    ];
}

/**
 * Lowers the exact effect-authorized particle counter reset.
 *
 * @param {object} program CJS shader IR.
 * @param {object} [options] Binding plan and opaque effect proof.
 * @returns {object} Typed compute program.
 */
export function lowerParticleClearResetComputeProgram(program, options = {})
{
    const policy = particleClearSignedAtomicLayoutPolicy(
        program,
        options.effectProfileProof ?? null
    );
    const bindings = lowerBindingLayout(
        program,
        options.bindingPlan ?? null,
        policy
    );
    validateResetBindings(bindings);
    return deepFreeze({
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "compute",
        entryPoint: "main",
        threadGroupSize: [ 1, 1, 1 ],
        bindings,
        statements: [
            call(program, 0, "atomicStore(&u0[0u], 0i)"),
            { kind: "return", ...location(program, 1) }
        ]
    });
}

/**
 * Lowers the exact self-proving particle/dead-list initialization shader.
 *
 * @param {object} program CJS shader IR.
 * @param {object} [options] Optional binding plan/effect proof.
 * @returns {object} Typed compute program.
 */
export function lowerParticleClearInitializeComputeProgram(
    program,
    options = {}
)
{
    const policy = particleClearSignedAtomicLayoutPolicy(
        program,
        options.effectProfileProof ?? null
    );
    const bindings = lowerBindingLayout(
        program,
        options.bindingPlan ?? null,
        policy
    );
    validateClearBindings(bindings);
    return deepFreeze({
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "compute",
        entryPoint: "main",
        builtinInputs: [
            {
                builtin: "local_invocation_index",
                name: "local_invocation_index",
                type: "u32"
            }
        ],
        threadGroupSize: [ 16, 16, 1 ],
        bindings,
        statements: lowerClearBody(program)
    });
}
