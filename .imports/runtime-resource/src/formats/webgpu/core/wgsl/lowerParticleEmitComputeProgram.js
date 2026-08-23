import { analyzeRegisterValues } from "../ir/analyzeRegisterValues.js";
import { buildControlFlow } from "../ir/buildControlFlow.js";
import { inferValueTypes } from "../ir/inferValueTypes.js";
import { resolveRegisterFlow } from "../ir/resolveRegisterFlow.js";
import { lowerBindingLayout } from "./lowerBindingLayout.js";
import {
    particleEmitSemanticDigest
} from "./particleEmitSemanticDigest.js";
import { requireRefactoringAllowed } from "./precisionControls.js";
import { buildSelectionPlans } from "./selectionPlans.js";

const DECLARATION_OPCODES = Object.freeze([
    "dcl_global_flags",
    "dcl_constant_buffer",
    "dcl_unordered_access_view_structured",
    "dcl_unordered_access_view_typed",
    "dcl_unordered_access_view_structured",
    "dcl_input",
    "dcl_input",
    "dcl_input",
    "dcl_temps",
    "dcl_thread_group_shared_memory_raw",
    "dcl_thread_group"
]);
const OPCODES_SM50 = Object.freeze([
    "if", "imul", "store_raw", "store_raw", "store_raw", "store_raw",
    "store_raw", "store_raw", "store_raw", "endif", "sync", "ld_raw",
    "ushr", "iadd", "xor", "ushr", "xor", "imul", "ushr", "xor",
    "imul", "ushr", "xor", "imad", "ld_raw", "ld_raw", "add",
    "ld_raw", "ge", "movc", "add", "ld_raw", "ld_raw", "add",
    "ld_raw", "mov", "add", "ld_raw", "add", "mov", "mov", "mov",
    "loop", "uge", "breakc", "imm_atomic_iadd", "iadd", "ige", "if",
    "ishl", "xor", "ushr", "xor", "ishl", "xor", "utof", "mul",
    "mad", "dp3", "rsq", "mul", "ishl", "xor", "ushr", "xor",
    "ishl", "xor", "utof", "mul", "ishl", "xor", "ushr", "xor",
    "ishl", "xor", "utof", "ishl", "xor", "ushr", "xor", "ishl",
    "xor", "mad", "mul", "sincos", "mul", "sincos", "mul", "mul",
    "mul", "mul", "mul", "mad", "mul", "mad", "mul", "mad", "mad",
    "mad", "mad", "mad", "mad", "mad", "lt", "movc", "mul", "mad",
    "dp3", "rsq", "mul", "mul", "mad", "mul", "mad", "mad",
    "ld_structured", "mad", "mad", "ishl", "xor", "ushr", "xor",
    "ishl", "xor", "utof", "mul", "mad", "mad", "mad", "ishl",
    "xor", "ushr", "xor", "ishl", "xor", "bfi", "store_structured",
    "store_structured", "else", "break", "endif", "iadd", "endloop", "ret"
]);
const OPCODES_SM51 = Object.freeze([
    "if", "imul", "store_raw", "store_raw", "store_raw", "store_raw",
    "store_raw", "store_raw", "store_raw", "endif", "sync", "ld_raw",
    "ushr", "iadd", "xor", "ushr", "xor", "imul", "ushr", "xor",
    "imul", "ushr", "xor", "imad", "ld_raw", "ld_raw", "ld_raw",
    "add", "ld_raw", "ge", "mov", "mov", "mov", "loop", "uge",
    "breakc", "imm_atomic_iadd", "iadd", "ige", "if", "ishl", "xor",
    "ushr", "xor", "ishl", "xor", "utof", "mul", "mad", "dp3",
    "rsq", "mul", "ishl", "xor", "ushr", "xor", "ishl", "xor",
    "utof", "mul", "ishl", "xor", "ushr", "xor", "ishl", "xor",
    "utof", "ishl", "xor", "ushr", "xor", "ishl", "xor", "if",
    "mov", "else", "mov", "endif", "add", "mad", "mul", "sincos",
    "mul", "sincos", "mul", "mul", "mul", "mul", "mul", "mad",
    "mul", "mad", "mul", "mad", "mad", "mad", "mad", "mad", "mad",
    "mad", "lt", "movc", "mul", "mad", "dp3", "rsq", "mul", "mul",
    "mad", "mul", "mad", "mad", "ld_structured", "ld_raw", "ld_raw",
    "add", "mad", "mad", "ld_raw", "ld_raw", "ishl", "xor", "ushr",
    "xor", "ishl", "xor", "utof", "mul", "add", "mad", "ld_raw",
    "add", "mad", "mad", "ishl", "xor", "ushr", "xor", "ishl",
    "xor", "bfi", "store_structured", "store_structured", "else", "break",
    "endif", "iadd", "endloop", "ret"
]);
const PARTICLE_EMIT_SEMANTIC_DIGESTS = Object.freeze({
    0: "34136a691e74b7b0dabda66147d71bb6d663e962e300aaddda453e26cbcd8190",
    1: "70a206cc8d2c0cbfb44ad7ce1ae96bb1c5d90787ea63b5ae6bcefd4e50917dd1"
});

function deepFreeze(value)
{
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const entry of Object.values(value)) deepFreeze(entry);
    return Object.freeze(value);
}

function ownData(value, key)
{
    const descriptor = value && typeof value === "object"
        ? Object.getOwnPropertyDescriptor(value, key)
        : null;
    if (!descriptor) return { missing: key };
    if (!Object.hasOwn(descriptor, "value")) return { accessor: key };
    return descriptor.value;
}

function exactRecordEqual(actual, expected)
{
    if (Object.is(actual, expected)) return true;
    if (!actual || !expected
        || typeof actual !== "object"
        || typeof expected !== "object"
        || Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected))
    {
        return false;
    }
    const actualKeys = Reflect.ownKeys(actual);
    const expectedKeys = Reflect.ownKeys(expected);
    if (actualKeys.some((key) => typeof key !== "string")
        || expectedKeys.some((key) => typeof key !== "string"))
    {
        return false;
    }
    actualKeys.sort();
    expectedKeys.sort();
    if (actualKeys.length !== expectedKeys.length
        || actualKeys.some((key, index) => key !== expectedKeys[index]))
    {
        return false;
    }
    return actualKeys.every((key) =>
    {
        const actualDescriptor = Object.getOwnPropertyDescriptor(actual, key);
        const expectedDescriptor = Object.getOwnPropertyDescriptor(
            expected, key);
        const actualHasValue = Object.hasOwn(actualDescriptor, "value");
        return actualHasValue
            && Object.hasOwn(expectedDescriptor, "value")
            && exactRecordEqual(
                actualDescriptor.value, expectedDescriptor.value);
    });
}

function clonePlain(value)
{
    if (Array.isArray(value)) return value.map(clonePlain);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) =>
            [ key, clonePlain(entry) ]));
    }
    return value;
}

function buildBlocks(instructions)
{
    const before = new Set([
        "loop", "else", "endif", "endloop", "case", "default", "endswitch"
    ]);
    const after = new Set([
        "if", "loop", "switch", "break", "breakc", "continue", "continuec",
        "ret", "retc", "discard", "else", "endif", "endloop", "case",
        "default", "endswitch"
    ]);
    const control = {
        loop: "loop", breakc: "loop", break: "loop", endloop: "loop",
        if: "selection", else: "selection", endif: "selection",
        ret: "termination"
    };
    const leaders = new Set([ 0 ]);
    instructions.forEach((instruction, index) =>
    {
        if (before.has(instruction.opcodeName)) leaders.add(index);
        if (after.has(instruction.opcodeName) && index + 1 < instructions.length)
        {
            leaders.add(index + 1);
        }
    });
    const starts = Array.from(leaders).sort((left, right) => left - right);
    return starts.map((start, blockIndex) =>
    {
        const end = (starts[blockIndex + 1] ?? instructions.length) - 1;
        return {
            kind: "basic-block",
            id: `block${blockIndex}`,
            index: blockIndex,
            startInstruction: start,
            endInstruction: end,
            startDxbcOffset: instructions[start].dxbcOffset,
            endDxbcOffset: instructions[end].dxbcOffset,
            instructionIndices: Array.from(
                { length: end - start + 1 }, (_, offset) => start + offset),
            terminator: control[instructions[end].opcodeName]
                ? instructions[end].opcodeName
                : null
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
            ...Object.keys(left), ...Object.keys(right)
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

function validateAnalysis(program)
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
        const difference = firstDifference(
            analysisSnapshot(program), analysisSnapshot(rebuilt));
        throw new Error(
            "WGSL particle emit CFG, SSA, or type metadata is inconsistent"
                + (difference ? ` at ${difference}` : "")
        );
    }
    const plans = buildSelectionPlans(program, "particle emit compute");
    if (plans.size !== 3
        || plans.get(0)?.kind !== "selection"
        || plans.get(0).hasElse
        || plans.get(0).merges.length
        || plans.get(42)?.kind !== "loop"
        || plans.get(42).merges.length !== 2
        || plans.get(42).exitMerges.length
        || plans.get(48)?.kind !== "selection"
        || !plans.get(48).hasElse
        || plans.get(48).merges.length)
    {
        throw new Error(
            "WGSL particle emit requires the exact initialization, loop, and atomic-result selection plan"
        );
    }
}

/**
 * Declaration-family selector for the particle emit shader.
 *
 * @param {object} program CJS shader IR.
 * @returns {boolean} Whether particle-emit validation owns this program.
 */
export function isParticleEmitComputeCandidate(program)
{
    if (program?.kind !== "shader-program"
        || program.format !== "CJS_SHADER_IR"
        || program.formatVersion !== 1
        || program.stage !== "compute"
        || program.programType !== 5
        || program.shaderModel?.major !== 5
        || ![ 0, 1 ].includes(program.shaderModel.minor)
        || program.declarations?.length !== DECLARATION_OPCODES.length
        || DECLARATION_OPCODES.some((opcode, index) =>
            program.declarations[index]?.opcodeName !== opcode))
    {
        return false;
    }
    const [ , constants, particle, counter, dead, flattened, groupId,
        localId, temps, shared, group ] = program.declarations;
    const familyMatches =
        constants.data?.registerIndex === 3
        && constants.data?.sizeInVec4 === 4096
        && particle.data?.structureStride === 32
        && counter.data?.resourceDimensionName === "buffer"
        && counter.data?.returnType?.returnTypeNames?.every(
            (entry) => entry === "sint")
        && dead.data?.structureStride === 4
        && flattened.data?.operandTypeName
            === "input_thread_id_in_group_flattened"
        && groupId.data?.operandTypeName === "input_thread_group_id"
        && localId.data?.operandTypeName === "input_thread_id_in_group"
        && temps.data?.tempCount === (program.shaderModel.minor ? 11 : 14)
        && shared.data?.byteCount === 112
        && group.data?.threadGroupX === 16
        && group.data.threadGroupY === 16
        && group.data.threadGroupZ === 1;
    if (!familyMatches) return false;
    try
    {
        return particleEmitSemanticDigest(program)
            === PARTICLE_EMIT_SEMANTIC_DIGESTS[program.shaderModel.minor];
    }
    catch
    {
        return false;
    }
}

/**
 * Resolves the signed typed-UAV layout owned by the particle-emit profile.
 * Admission is self-proving: the exact declaration family and semantic digest
 * checked by `isParticleEmitComputeCandidate` are the whole proof, so binding
 * plans and the lowerer share one identity source instead of duplicating an
 * unvalidated list.
 *
 * @param {object} program CJS shader IR.
 * @returns {object|null} Narrow lowerBindingLayout policy.
 */
export function particleEmitSignedAtomicLayoutPolicy(program)
{
    if (!isParticleEmitComputeCandidate(program)) return null;
    return {
        signedAtomicI32Identities: [ "storage-resource:0:1" ]
    };
}

function validateProgram(program)
{
    if (!isParticleEmitComputeCandidate(program))
    {
        throw new Error(
            "WGSL particle emit requires the exact declaration family"
        );
    }
    const expectedOpcodes = program.shaderModel.minor === 0
        ? OPCODES_SM50
        : OPCODES_SM51;
    if (program.instructions?.length !== expectedOpcodes.length
        || expectedOpcodes.some((opcode, index) =>
            program.instructions[index]?.opcodeName !== opcode))
    {
        throw new Error(
            "WGSL particle emit requires the exact backend instruction schedule"
        );
    }
    if (program.shaderModel.minor === 1)
    {
        throw new Error(
            "WGSL particle emit SM5.1 is comparison-only; only the literal SM5.0 schedule may emit WGSL"
        );
    }
    requireRefactoringAllowed(program, "particle emit compute");
    const identity = {
        kind: ownData(program, "kind"),
        format: ownData(program, "format"),
        formatVersion: ownData(program, "formatVersion"),
        stage: ownData(program, "stage"),
        programType: ownData(program, "programType"),
        shaderModel: ownData(program, "shaderModel")
    };
    if (!exactRecordEqual(identity, {
        kind: "shader-program",
        format: "CJS_SHADER_IR",
        formatVersion: 1,
        stage: "compute",
        programType: 5,
        shaderModel: { major: 5, minor: 0 }
    }))
    {
        throw new Error(
            "WGSL particle emit requires exact own SM5.0 program identity fields"
        );
    }
    if (!exactRecordEqual(ownData(program, "signatures"), {
        input: [],
        output: [],
        patch: []
    })
        || ownData(program, "immediateConstantBuffer") !== null
        || ownData(program, "constTables") !== null)
    {
        throw new Error(
            "WGSL particle emit requires exact dense empty signatures and null constant tables"
        );
    }
    const instructions = ownData(program, "instructions");
    if (!Array.isArray(instructions) || instructions.length !== 144
        || instructions.some((instruction, index) =>
            instruction?.kind !== "instruction"
            || !Number.isInteger(instruction.opcode)
            || instruction.opcodeName !== OPCODES_SM50[index]))
    {
        throw new Error(
            "WGSL particle emit requires exact instruction kind, numeric opcode, and opcode name fields"
        );
    }
    validateAnalysis(program);
}

function validateBindings(bindings)
{
    const expected = [
        [ "uniform-buffer", "cb3", "var<uniform>",
            "array<vec4<f32>, 4096>", "uniform", 65536, null ],
        [ "storage-resource", "u0", "var<storage, read_write>",
            "array<u32>", "storage", 32, 32 ],
        [ "storage-resource", "u1", "var<storage, read_write>",
            "array<atomic<i32>>", "storage", 4, null ],
        [ "storage-resource", "u2", "var<storage, read_write>",
            "array<u32>", "storage", 4, 4 ]
    ];
    if (bindings.length !== expected.length
        || expected.some((entry, index) =>
        {
            const binding = bindings[index];
            return binding?.resourceKind !== entry[0]
                || binding.generatedSymbol !== entry[1]
                || binding.registerIndex !== [ 3, 0, 1, 2 ][index]
                || binding.registerSpace !== 0
                || binding.rangeId !== null
                || binding.group !== 0
                || binding.binding !== index
                || binding.visibility !== "compute"
                || binding.declaration !== entry[2]
                || binding.type !== entry[3]
                || binding.buffer?.type !== entry[4]
                || binding.buffer.hasDynamicOffset !== false
                || binding.buffer.minBindingSize !== entry[5]
                || (binding.structureStride ?? null) !== entry[6];
        }))
    {
        throw new Error(
            "WGSL particle emit requires the exact cb3/u0/u1/u2 layout"
        );
    }
}

function location(instruction)
{
    return {
        instructionIndex: instruction.index,
        dxbcOffset: instruction.dxbcOffset
    };
}

function expression(code, type)
{
    return { code, type };
}

function call(instruction, code)
{
    return {
        kind: "call",
        ...location(instruction),
        expression: expression(code, "void")
    };
}

function assign(instruction, name, code)
{
    return {
        kind: "value-assignment",
        ...location(instruction),
        name,
        expression: expression(code, "u32")
    };
}

function immediate(bits)
{
    return `0x${(bits >>> 0).toString(16).padStart(8, "0")}u`;
}

function valueWidth(operand, requested)
{
    if (requested) return requested;
    if (operand.selected) return 1;
    if (operand.swizzle) return operand.swizzle.length;
    if (operand.immediateValues?.length) return operand.immediateValues.length;
    return 1;
}

function vector(type, width, values)
{
    if (width === 1) return values[0];
    return `vec${width}<${type}>(${values.join(", ")})`;
}

function rawSource(operand, requestedWidth)
{
    const width = valueWidth(operand, requestedWidth);
    if (operand.typeName === "temp")
    {
        const selector = operand.selected || operand.swizzle;
        const components = selector
            ? Array.from({ length: width }, (_, index) =>
                selector[Math.min(index, selector.length - 1)])
            : [ "x", "y", "z", "w" ].slice(0, width);
        if (width === 1) return `r${operand.registerIndex}.${components[0]}`;
        return `r${operand.registerIndex}.${components.join("")}`;
    }
    if (operand.typeName === "immediate32")
    {
        const bits = operand.immediateValues.map((entry) =>
            immediate(entry.uint32));
        const values = Array.from({ length: width }, (_, index) =>
            bits[Math.min(index, bits.length - 1)]);
        return vector("u32", width, values);
    }
    if (operand.typeName === "input_thread_id_in_group_flattened")
    {
        return width === 1
            ? "local_index"
            : `vec${width}<u32>(local_index)`;
    }
    if (operand.typeName === "input_thread_group_id")
    {
        const component = operand.selected || "x";
        return width === 1
            ? `workgroup_id.${component}`
            : `vec${width}<u32>(workgroup_id.${component})`;
    }
    if (operand.typeName === "input_thread_id_in_group")
    {
        const component = operand.selected || "x";
        return width === 1
            ? `local_invocation_id.${component}`
            : `vec${width}<u32>(local_invocation_id.${component})`;
    }
    throw new Error(
        `WGSL particle emit cannot translate source ${operand.typeName}`
    );
}

function typedSource(operand, type, width)
{
    const raw = rawSource(operand, width);
    const shape = width === 1 ? type : `vec${width}<${type}>`;
    let code = type === "u32" ? raw : `bitcast<${shape}>(${raw})`;
    if (operand.modifierName === "neg") code = `(-${code})`;
    else if (operand.modifierName === "abs") code = `abs(${code})`;
    return code;
}

function bitsCode(code, type, width)
{
    if (type === "u32" || type === "bitpattern32") return code;
    const shape = width === 1 ? "u32" : `vec${width}<u32>`;
    return `bitcast<${shape}>(${code})`;
}

function destination(instruction, operandIndex, code, type)
{
    const operand = instruction.operands[operandIndex];
    const mask = operand.mask;
    const width = mask.length;
    return assign(
        instruction,
        `r${operand.registerIndex}.${mask}`,
        bitsCode(code, type, width)
    );
}

function comparison(instruction, type, operator)
{
    const destinationOperand = instruction.operands[0];
    const width = destinationOperand.mask.length;
    const left = typedSource(instruction.operands[1], type, width);
    const right = typedSource(instruction.operands[2], type, width);
    const zero = width === 1 ? "0u" : `vec${width}<u32>(0u)`;
    const ones = width === 1
        ? "0xffffffffu"
        : `vec${width}<u32>(0xffffffffu)`;
    return destination(
        instruction, 0, `select(${zero}, ${ones}, ${left} ${operator} ${right})`,
        "u32"
    );
}

function translateArithmetic(instruction)
{
    const op = instruction.opcodeName;
    const destinationIndex = op === "imul" ? 1 : 0;
    const destinationOperand = instruction.operands[destinationIndex];
    const width = destinationOperand.mask.length;
    const sourceStart = op === "imul" ? 2 : 1;
    if (op === "mov")
    {
        return [ destination(
            instruction, 0, rawSource(instruction.operands[1], width),
            "bitpattern32") ];
    }
    if (op === "xor")
    {
        return [ destination(
            instruction, 0,
            `(${typedSource(instruction.operands[1], "u32", width)} ^ `
                + `${typedSource(instruction.operands[2], "u32", width)})`,
            "u32") ];
    }
    if (op === "ushr")
    {
        return [ destination(
            instruction, 0,
            `(${typedSource(instruction.operands[1], "u32", width)} >> `
                + `${typedSource(instruction.operands[2], "u32", width)})`,
            "u32") ];
    }
    if (op === "ishl")
    {
        return [ destination(
            instruction, 0,
            `(${typedSource(instruction.operands[1], "i32", width)} << `
                + `${typedSource(instruction.operands[2], "u32", width)})`,
            "i32") ];
    }
    if (op === "iadd" || op === "imul" || op === "imad")
    {
        const sources = instruction.operands.slice(sourceStart).map(
            (operand) => typedSource(operand, "i32", width));
        const code = op === "imad"
            ? `((${sources[0]} * ${sources[1]}) + ${sources[2]})`
            : `(${sources[0]} ${op === "iadd" ? "+" : "*"} ${sources[1]})`;
        return [ destination(
            instruction, destinationIndex, code, "i32") ];
    }
    if (op === "utof")
    {
        const type = width === 1 ? "f32" : `vec${width}<f32>`;
        return [ destination(
            instruction, 0,
            `${type}(${typedSource(instruction.operands[1], "u32", width)})`,
            "f32") ];
    }
    if (op === "uge") return [ comparison(instruction, "u32", ">=") ];
    if (op === "ige") return [ comparison(instruction, "i32", ">=") ];
    if (op === "ge") return [ comparison(instruction, "f32", ">=") ];
    if (op === "lt") return [ comparison(instruction, "f32", "<") ];
    if ([ "add", "mul", "mad" ].includes(op))
    {
        const sources = instruction.operands.slice(1).map(
            (operand) => typedSource(operand, "f32", width));
        const code = op === "mad"
            ? `((${sources[0]} * ${sources[1]}) + ${sources[2]})`
            : `(${sources[0]} ${op === "add" ? "+" : "*"} ${sources[1]})`;
        return [ destination(instruction, 0, code, "f32") ];
    }
    if (op === "dp3")
    {
        const code = `dot(${typedSource(
            instruction.operands[1], "f32", 3)}, ${typedSource(
            instruction.operands[2], "f32", 3)})`;
        return [ destination(instruction, 0, code, "f32") ];
    }
    if (op === "rsq")
    {
        return [ destination(
            instruction, 0,
            `inverseSqrt(${typedSource(
                instruction.operands[1], "f32", width)})`,
            "f32") ];
    }
    if (op === "movc")
    {
        const condition = typedSource(
            instruction.operands[1], "u32", width);
        const zero = width === 1 ? "0u" : `vec${width}<u32>(0u)`;
        const whenTrue = typedSource(
            instruction.operands[2], "f32", width);
        const whenFalse = typedSource(
            instruction.operands[3], "f32", width);
        return [ destination(
            instruction, 0,
            `select(${whenFalse}, ${whenTrue}, ${condition} != ${zero})`,
            "f32") ];
    }
    if (op === "sincos")
    {
        const width = instruction.operands[0].mask.length;
        const source = typedSource(instruction.operands[2], "f32", width);
        return [
            destination(instruction, 0, `sin(${source})`, "f32"),
            destination(instruction, 1, `cos(${source})`, "f32")
        ];
    }
    throw new Error(`WGSL particle emit cannot translate ${op}`);
}

function translateRawLoad(instruction)
{
    const destinationOperand = instruction.operands[0];
    const width = destinationOperand.mask.length;
    const byteOffset = instruction.operands[1].immediateValues[0].uint32;
    const firstWord = byteOffset / 4;
    const words = Array.from(
        { length: width }, (_, index) => `g0[${firstWord + index}u]`);
    return [ destination(
        instruction, 0, vector("u32", width, words), "u32") ];
}

function translateInstruction(program, index, bindings)
{
    const instruction = program.instructions[index];
    if (instruction.opcodeName === "ld_raw")
    {
        return translateRawLoad(instruction);
    }
    if (instruction.opcodeName === "imm_atomic_iadd")
    {
        return [ destination(
            instruction, 0,
            `atomicAdd(&${bindings[2].generatedSymbol}[0u], -1i)`,
            "i32") ];
    }
    if (instruction.opcodeName === "ld_structured")
    {
        const dead = bindings[3].generatedSymbol;
        return [
            {
                kind: "let",
                ...location(instruction),
                name: "dead_length",
                type: "u32",
                expression: expression(`arrayLength(&${dead})`, "u32")
            },
            {
                kind: "let",
                ...location(instruction),
                name: "dead_safe_index",
                type: "u32",
                expression: expression(
                    "min(r7.y, dead_length - 1u)", "u32")
            },
            assign(
                instruction,
                "r7.y",
                `select(0u, ${dead}[dead_safe_index], r7.y < dead_length)`)
        ];
    }
    if (instruction.opcodeName === "bfi")
    {
        return [ assign(
            instruction, "r9.w",
            "((r7.x & 0x0000ffffu) | (r1.x << 16u))") ];
    }
    return translateArithmetic(instruction);
}

function initializeShared(program, constants)
{
    const first = program.instructions[0];
    const body = [ translateInstruction(program, 1, [])[0] ];
    for (let row = 1; row <= 7; row += 1)
    {
        const instruction = program.instructions[row + 1];
        body.push({
            kind: "let",
            ...location(instruction),
            name: `cb_row_${row}`,
            type: "u32",
            expression: expression(`(r0.x + ${row}u)`, "u32")
        });
        body.push({
            kind: "let",
            ...location(instruction),
            name: `cb_value_${row}`,
            type: "vec4<f32>",
            expression: expression(
                `select(vec4<f32>(), ${constants}[min(cb_row_${row}, 4095u)], cb_row_${row} < 4096u)`,
                "vec4<f32>"
            )
        });
        const components = row === 7 ? [ "x" ] : [ "x", "y", "z", "w" ];
        const firstWord = (row - 1) * 4;
        components.forEach((component, index) =>
        {
            body.push(assign(
                instruction,
                `g0[${firstWord + index}u]`,
                `bitcast<u32>(cb_value_${row}.${component})`
            ));
        });
    }
    return {
        kind: "if",
        ...location(first),
        condition: expression("local_index == 0u", "bool"),
        statements: body
    };
}

function recordStores(program, particle)
{
    const first = program.instructions[136];
    const second = program.instructions[137];
    const words = [
        ...[ "x", "y", "z", "w" ].map((component, index) =>
            assign(first, `u0[(record_word_base + ${index}u)]`, `r8.${component}`)),
        ...[ "x", "y", "z", "w" ].map((component, index) =>
            assign(second, `u0[(record_word_base + ${index + 4}u)]`, `r9.${component}`))
    ];
    return {
        kind: "if",
        ...location(first),
        condition: expression(
            `r7.y < (arrayLength(&${particle}) / 8u)`, "bool"),
        statements: [ {
            kind: "let",
            ...location(first),
            name: "record_word_base",
            type: "u32",
            expression: expression("(r7.y * 8u)", "u32")
        }, ...words ]
    };
}

function lowerBody(program, bindings)
{
    const statements = [
        ...Array.from({ length: 14 }, (_, index) => ({
            kind: "var",
            name: `r${index}`,
            type: "vec4<u32>",
            expression: expression("vec4<u32>(0u)", "vec4<u32>")
        })),
        {
            kind: "let",
            name: "local_index",
            type: "u32",
            expression: expression(
                "((local_invocation_id.y * 16u) + local_invocation_id.x)",
                "u32"
            )
        },
        initializeShared(program, bindings[0].generatedSymbol),
        call(program.instructions[10], "workgroupBarrier()")
    ];
    for (let index = 11; index <= 41; index += 1)
    {
        statements.push(...translateInstruction(program, index, bindings));
    }
    const loopStatements = [
        ...translateInstruction(program, 43, bindings),
        {
            kind: "if",
            ...location(program.instructions[44]),
            condition: expression("r7.y != 0u", "bool"),
            statements: [ {
                kind: "break",
                ...location(program.instructions[44])
            } ]
        },
        ...translateInstruction(program, 45, bindings),
        ...translateInstruction(program, 46, bindings),
        ...translateInstruction(program, 47, bindings)
    ];
    const successful = [];
    for (let index = 49; index <= 135; index += 1)
    {
        successful.push(...translateInstruction(program, index, bindings));
    }
    successful.push(recordStores(
        program, bindings[1].generatedSymbol));
    loopStatements.push({
        kind: "if",
        ...location(program.instructions[48]),
        condition: expression("r7.z != 0u", "bool"),
        statements: successful,
        elseStatements: [ {
            kind: "break",
            ...location(program.instructions[139])
        } ]
    });
    loopStatements.push(...translateInstruction(program, 141, bindings));
    statements.push({
        kind: "loop",
        ...location(program.instructions[42]),
        statements: loopStatements
    });
    statements.push({
        kind: "return",
        ...location(program.instructions[143])
    });
    return statements;
}

/**
 * Lowers the one audited SM5.0 particle-emit schedule.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {object} [options] Optional exact compute binding plan.
 * @returns {object} Frozen typed compute program.
 */
export function lowerParticleEmitComputeProgram(program, options = {})
{
    validateProgram(program);
    const bindings = lowerBindingLayout(
        program,
        options.bindingPlan ?? null,
        particleEmitSignedAtomicLayoutPolicy(program)
    );
    validateBindings(bindings);
    return deepFreeze({
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "compute",
        entryPoint: "main",
        builtinInputs: [
            {
                builtin: "workgroup_id",
                name: "workgroup_id",
                type: "vec3<u32>"
            },
            {
                builtin: "local_invocation_id",
                name: "local_invocation_id",
                type: "vec3<u32>"
            }
        ],
        threadGroupSize: [ 16, 16, 1 ],
        workgroupVariables: [
            { name: "g0", elementType: "u32", elementCount: 28 }
        ],
        bindings,
        statements: lowerBody(program, bindings)
    });
}
