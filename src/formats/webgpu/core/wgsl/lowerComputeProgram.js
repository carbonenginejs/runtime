import { requireRefactoringAllowed } from "./precisionControls.js";
import {
    validateExactComputeEnvelope,
    validateReturnTypeMirror,
    validateSm50ResourceExtensions
} from "./validateExactComputeIr.js";
import { validateFixedHandleBinding, validateFixedHandleOperand } from "./validateHandleOperand.js";
import {
    isSkinVerticesComputeProfile,
    lowerSkinVerticesComputeProgram
} from "./lowerSkinVerticesComputeProgram.js";
import {
    isCreateHistogramsComputeProfile,
    lowerCreateHistogramsComputeProgram
} from "./lowerCreateHistogramsComputeProgram.js";
import {
    isMergeHistogramsComputeProfile,
    lowerMergeHistogramsComputeProgram
} from "./lowerMergeHistogramsComputeProgram.js";
import {
    isParticleClearInitializeCandidate,
    isParticleClearResetCandidate,
    lowerParticleClearInitializeComputeProgram,
    lowerParticleClearResetComputeProgram
} from "./lowerParticleClearComputePrograms.js";
import {
    isParticleEmitComputeCandidate,
    lowerParticleEmitComputeProgram
} from "./lowerParticleEmitComputeProgram.js";
import {
    isSortStepComputeProfile,
    lowerSortStepComputeProgram
} from "./lowerSortStepComputeProgram.js";
import {
    isSortComputeProfile,
    lowerSortComputeProgram
} from "./lowerSortComputeProgram.js";
import {
    isSortInnerComputeProfile,
    lowerSortInnerComputeProgram
} from "./lowerSortInnerComputeProgram.js";

const COMPONENTS = Object.freeze([ "x", "y", "z", "w" ]);
const DECLARATION_OPCODES = Object.freeze([
    "dcl_global_flags",
    "dcl_resource",
    "dcl_unordered_access_view_typed",
    "dcl_temps",
    "dcl_thread_group"
]);
const ARITHMETIC_RULES = Object.freeze({
    imul: Object.freeze({
        rule: "signed-integer",
        resultType: "int32",
        destinationOperand: 1,
        sourceOperands: Object.freeze([ 2, 3 ]),
        sourceType: "int32",
        operator: "*"
    }),
    umax: Object.freeze({
        rule: "unsigned-integer",
        resultType: "uint32",
        destinationOperand: 0,
        sourceOperands: Object.freeze([ 1, 2 ]),
        sourceType: "uint32",
        functionName: "max"
    }),
    iadd: Object.freeze({
        rule: "signed-integer",
        resultType: "int32",
        destinationOperand: 0,
        sourceOperands: Object.freeze([ 1, 2 ]),
        sourceType: "int32",
        operator: "+"
    }),
    ushr: Object.freeze({
        rule: "unsigned-integer",
        resultType: "uint32",
        destinationOperand: 0,
        sourceOperands: Object.freeze([ 1, 2 ]),
        sourceType: "uint32",
        operator: ">>"
    })
});
const SUPPORTED_OPCODES = new Set([
    "ld", ...Object.keys(ARITHMETIC_RULES), "store_uav_typed", "ret"
]);
const KIND_ORDER = Object.freeze({ "sampled-resource": 0, "storage-resource": 1 });
const KIND_PREFIX = Object.freeze({ "sampled-resource": "t", "storage-resource": "u" });

function deepFreeze(value)
{
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const entry of Object.values(value)) deepFreeze(entry);
    return Object.freeze(value);
}

function scalarTypeName(type)
{
    return ({ int32: "i32", uint32: "u32", bitpattern32: "u32" })[type] || null;
}

function canonicalRef(ref)
{
    return `${ref?.valueId || ""}.${ref?.component || ""}`;
}

function sameRef(left, right)
{
    return canonicalRef(left) === canonicalRef(right);
}

function registerKey(operand)
{
    return `${operand.typeName}[${operand.registerIndex}]`;
}

function validateCommonOperand(operand, instruction, operandIndex)
{
    if (!operand
        || (operand.modifierName ?? "none") !== "none"
        || (operand.minPrecisionName ?? "default") !== "default"
        || operand.nonUniform === true)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} requires an unmodified, uniform, default-precision operand ${operandIndex}`);
    }
}

function validateFixedRegisterOperand(operand, instruction, operandIndex, typeName)
{
    validateCommonOperand(operand, instruction, operandIndex);
    const index = operand.indices?.[0];
    if (operand.typeName !== typeName
        || !Number.isInteger(operand.registerIndex) || operand.registerIndex < 0
        || operand.indices?.length !== 1
        || index?.relative
        || index?.values?.length !== 1
        || index.values[0] !== operand.registerIndex)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} operand ${operandIndex} has an invalid fixed ${typeName} identity`);
    }
    return operand;
}

function validateDestinationOperand(operand, instruction, operandIndex)
{
    validateFixedRegisterOperand(operand, instruction, operandIndex, "temp");
    if (operand.registerIndex !== 0
        || operand.componentCount !== 4
        || !COMPONENTS.includes(operand.mask)
        || operand.swizzle || operand.selected)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} operand ${operandIndex} requires one canonical temp[0] destination lane`);
    }
    return operand.mask;
}

function validateScalarTempSource(operand, instruction, operandIndex)
{
    validateFixedRegisterOperand(operand, instruction, operandIndex, "temp");
    if (operand.registerIndex !== 0
        || operand.componentCount !== 4
        || !COMPONENTS.includes(operand.selected)
        || operand.mask || operand.swizzle)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} operand ${operandIndex} requires one selected temp[0] source lane`);
    }
    return operand.selected;
}

function immediateBits(operand, instruction, operandIndex, replicated)
{
    validateCommonOperand(operand, instruction, operandIndex);
    const values = operand.immediateValues || [];
    if (operand.typeName !== "immediate32"
        || operand.registerIndex !== null
        || operand.indices?.length
        || operand.mask || operand.swizzle || operand.selected
        || ![ 1, 4 ].includes(operand.componentCount)
        || values.length !== operand.componentCount
        || values.some((value) => !Number.isInteger(value?.uint32)))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} operand ${operandIndex} requires canonical immediate32 data`);
    }
    const bits = values.map((value) => value.uint32 >>> 0);
    if (replicated && (bits.length !== 4 || bits.some((value) => value !== bits[0])))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} operand ${operandIndex} requires four replicated immediate lanes`);
    }
    if (!replicated && bits.length !== 1)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} operand ${operandIndex} requires one immediate lane`);
    }
    return bits[0];
}

function immediateCode(bits, type)
{
    const literal = `0x${(bits >>> 0).toString(16).padStart(8, "0")}u`;
    return type === "int32" ? `bitcast<i32>(${literal})` : literal;
}

function validateValueRef(program, ref, expectedRegister, expectedComponent)
{
    const value = program.values.find((entry) => entry.id === ref?.valueId);
    if (!value
        || value.register !== expectedRegister
        || ref.component !== expectedComponent
        || !value.writeMask.includes(expectedComponent))
    {
        throw new Error(`WGSL compute register dataflow references an incompatible ${expectedRegister}.${expectedComponent} value`);
    }
    if (value.origin === "undefined-register")
    {
        throw new Error(`WGSL compute reads undefined ${expectedRegister}.${expectedComponent}`);
    }
    return value;
}

function validateRead(program, instruction, operandIndex, operand, components, state, expectedReads)
{
    const register = registerKey(operand);
    const matches = instruction.dataflow.reads.filter((entry) =>
        entry.kind === "register-read" && entry.operandIndex === operandIndex);
    if (matches.length !== 1)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has inconsistent read metadata for operand ${operandIndex}`);
    }
    const read = matches[0];
    if (read.register !== register
        || read.components?.length !== components.length
        || read.refs?.length !== components.length
        || components.some((component, index) =>
            read.components[index] !== component
            || !sameRef(read.refs[index], state.get(`${register}.${component}`))))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has stale or mismatched SSA reads for operand ${operandIndex}`);
    }
    components.forEach((component, index) =>
        validateValueRef(program, read.refs[index], register, component));
    expectedReads.add(read);
    return read;
}

function validateNoUnexpectedReads(instruction, expectedReads)
{
    if (instruction.dataflow.reads.length !== expectedReads.size
        || instruction.dataflow.reads.some((read) => !expectedReads.has(read)))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has unexpected register or index reads`);
    }
}

function validateWrite(program, instruction, operandIndex, operand, state, writtenValueIds)
{
    const writes = instruction.dataflow.writes;
    if (writes.length !== 1 || writes[0].operandIndex !== operandIndex)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} requires one destination write at operand ${operandIndex}`);
    }
    const write = writes[0];
    const register = registerKey(operand);
    const component = operand.mask;
    const value = program.values.find((entry) => entry.id === write.valueId);
    if (write.register !== register || write.mask !== component
        || !value || value.origin !== "instruction-write"
        || value.instructionIndex !== instruction.index
        || value.register !== register || value.writeMask !== component
        || writtenValueIds.has(value.id))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has inconsistent destination SSA metadata`);
    }
    const previousComponents = COMPONENTS.filter((entry) => entry !== component);
    if (!write.previous
        || Object.keys(write.previous).sort().join("") !== previousComponents.slice().sort().join("")
        || previousComponents.some((entry) =>
            !sameRef(write.previous[entry], state.get(`${register}.${entry}`)))
        || Object.keys(write.result || {}).sort().join("") !== COMPONENTS.slice().sort().join("")
        || !sameRef(write.result[component], { valueId: value.id, component })
        || previousComponents.some((entry) =>
            !sameRef(write.result[entry], state.get(`${register}.${entry}`))))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has inconsistent previous/result SSA lanes`);
    }
    writtenValueIds.add(value.id);
    state.set(`${register}.${component}`, { valueId: value.id, component });
    return { write, value };
}

function valueStorageType(value, component)
{
    const type = value?.componentTypes?.[component];
    if (!scalarTypeName(type))
    {
        throw new Error(`WGSL compute value ${value?.id || "<missing>"}.${component} has an unresolved type`);
    }
    return type;
}

function reinterpretCode(code, fromType, toType)
{
    const from = scalarTypeName(fromType);
    const to = scalarTypeName(toType);
    if (!from || !to)
    {
        throw new Error(`WGSL compute cannot reinterpret ${fromType} to ${toType}`);
    }
    return from === to ? code : `bitcast<${to}>(${code})`;
}

function readCode(program, instruction, operandIndex, expectedType, state, expectedReads)
{
    const operand = instruction.operands[operandIndex];
    if (operand?.typeName === "immediate32")
    {
        return immediateCode(immediateBits(operand, instruction, operandIndex, false), expectedType);
    }
    const component = validateScalarTempSource(operand, instruction, operandIndex);
    const read = validateRead(program, instruction, operandIndex, operand, [ component ], state, expectedReads);
    const value = validateValueRef(program, read.refs[0], read.register, component);
    return reinterpretCode(value.id, valueStorageType(value, component), expectedType);
}

function replicatedStoreCode(program, instruction, operandIndex, state, expectedReads)
{
    const operand = instruction.operands[operandIndex];
    if (operand?.typeName === "immediate32")
    {
        return immediateCode(immediateBits(operand, instruction, operandIndex, true), "uint32");
    }
    validateFixedRegisterOperand(operand, instruction, operandIndex, "temp");
    if (operand.registerIndex !== 0
        || operand.componentCount !== 4 || operand.mask || operand.selected
        || operand.swizzle?.length !== 4
        || Array.from(operand.swizzle).some((component) => component !== operand.swizzle[0]))
    {
        throw new Error(`WGSL compute store instruction ${instruction.index} requires four replicated source lanes from temp[0]`);
    }
    const component = operand.swizzle[0];
    if (!COMPONENTS.includes(component))
    {
        throw new Error(`WGSL compute store instruction ${instruction.index} selects an invalid source lane`);
    }
    const components = Array(4).fill(component);
    const read = validateRead(program, instruction, operandIndex, operand, components, state, expectedReads);
    const value = validateValueRef(program, read.refs[0], read.register, component);
    return reinterpretCode(value.id, valueStorageType(value, component), "uint32");
}

function expectedOperandTypes(instruction)
{
    if (instruction.opcodeName === "ld")
    {
        return [
            [ "destination", "int32" ],
            [ "source", "uint32" ],
            [ "source", "unknown" ]
        ];
    }
    const arithmetic = ARITHMETIC_RULES[instruction.opcodeName];
    if (arithmetic)
    {
        return instruction.operands.map((_, operandIndex) => [
            operandIndex === arithmetic.destinationOperand ? "destination" : "source",
            operandIndex === arithmetic.destinationOperand || arithmetic.sourceOperands.includes(operandIndex)
                ? arithmetic.resultType
                : "unknown"
        ]);
    }
    if (instruction.opcodeName === "store_uav_typed")
    {
        return [
            [ "source", "unknown" ],
            [ "source", "uint32" ],
            [ "source", "uint32" ]
        ];
    }
    return [];
}

function expectedRule(instruction)
{
    if (instruction.opcodeName === "ld") return [ "texture-load", "int32" ];
    const arithmetic = ARITHMETIC_RULES[instruction.opcodeName];
    if (arithmetic) return [ arithmetic.rule, arithmetic.resultType ];
    if (instruction.opcodeName === "store_uav_typed") return [ "typed-uav-store", "unknown" ];
    return [ "untyped", "unknown" ];
}

function bitcastKey(entry)
{
    if (entry.kind === "read-bitcast")
    {
        return [
            entry.kind, entry.operandIndex, entry.componentIndex, entry.valueId,
            entry.component, entry.from, entry.to
        ].join(":");
    }
    if (entry.kind === "result-bitcast")
    {
        return [
            entry.kind, entry.operandIndex, entry.valueId, entry.component,
            entry.from, entry.to
        ].join(":");
    }
    return [
        entry.kind, entry.operandIndex, entry.component, entry.from, entry.to,
        entry.uint32 >>> 0
    ].join(":");
}

function validateTypeInfo(program, instruction)
{
    const [ rule, resultType ] = expectedRule(instruction);
    const operandTypes = expectedOperandTypes(instruction);
    const typeInfo = instruction.typeInfo;
    if (typeInfo?.kind !== "instruction-types"
        || typeInfo.rule !== rule
        || typeInfo.resultType !== resultType
        || typeInfo.conversion !== null
        || typeInfo.conditionProjection !== null
        || typeInfo.operandTypes?.length !== operandTypes.length
        || operandTypes.some(([ role, expectedType ], operandIndex) =>
        {
            const actual = typeInfo.operandTypes[operandIndex];
            return actual?.operandIndex !== operandIndex
                || actual.role !== role
                || actual.expectedType !== expectedType
                || actual.modifier !== "none"
                || actual.minPrecision !== "default";
        }))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has inconsistent type metadata`);
    }

    const required = [];
    for (const read of instruction.dataflow.reads)
    {
        if (read.kind !== "register-read")
        {
            throw new Error(`WGSL compute instruction ${instruction.index} has unsupported index-read type metadata`);
        }
        const expected = operandTypes[read.operandIndex]?.[1];
        if (!expected || expected === "unknown") continue;
        read.refs.forEach((ref, componentIndex) =>
        {
            const value = program.values.find((entry) => entry.id === ref.valueId);
            const storage = valueStorageType(value, ref.component);
            if (storage !== expected)
            {
                required.push({
                    kind: "read-bitcast",
                    operandIndex: read.operandIndex,
                    componentIndex,
                    valueId: ref.valueId,
                    component: ref.component,
                    from: storage,
                    to: expected
                });
            }
        });
    }
    if (resultType !== "unknown")
    {
        for (const write of instruction.dataflow.writes)
        {
            for (const component of write.mask)
            {
                const value = program.values.find((entry) => entry.id === write.valueId);
                const storage = valueStorageType(value, component);
                if (storage !== resultType)
                {
                    required.push({
                        kind: "result-bitcast",
                        operandIndex: write.operandIndex,
                        valueId: write.valueId,
                        component,
                        from: resultType,
                        to: storage
                    });
                }
            }
        }
    }
    operandTypes.forEach(([, expectedType ], operandIndex) =>
    {
        const operand = instruction.operands[operandIndex];
        if (operand?.typeName !== "immediate32" || expectedType !== "int32") return;
        operand.immediateValues.forEach((value, componentIndex) =>
        {
            required.push({
                kind: "immediate-bitcast",
                operandIndex,
                component: COMPONENTS[componentIndex],
                from: "uint32",
                to: "int32",
                uint32: value.uint32 >>> 0
            });
        });
    });
    const requiredKeys = required.map(bitcastKey).sort();
    const actualKeys = (typeInfo.bitcasts || []).map(bitcastKey).sort();
    if (new Set(actualKeys).size !== actualKeys.length
        || requiredKeys.length !== actualKeys.length
        || requiredKeys.some((entry, index) => entry !== actualKeys[index]))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has inconsistent bitcast metadata`);
    }
}

function bindingRegister(binding)
{
    return binding.range?.lowerBound ?? binding.registerIndex;
}

function bindingSpace(binding)
{
    return binding.range?.registerSpace ?? 0;
}

function bindingIdentity(binding)
{
    return `${binding.resourceKind}:${bindingSpace(binding)}:${bindingRegister(binding)}`;
}

function validateBindingRange(binding)
{
    const registerIndex = binding.registerIndex;
    const range = binding.range;
    if (!Number.isInteger(registerIndex) || registerIndex < 0
        || range?.bindingModel !== "sm5.0-register"
        || range.rangeId !== null
        || range.lowerBound !== registerIndex
        || range.upperBound !== registerIndex
        || range.unbounded !== false
        || range.registerCount !== 1
        || range.registerSpace !== 0)
    {
        throw new Error(`WGSL compute binding ${binding.id || "<unknown>"} requires one fixed SM5.0 register`);
    }
}

function validateBindingDeclaration(program, binding, opcodeName, operandType, returnType)
{
    const declarations = program.declarations.filter((entry) =>
        entry.dxbcOffset === binding.declarationOffset);
    if (declarations.length !== 1 || declarations[0].opcodeName !== opcodeName)
    {
        throw new Error(`WGSL compute binding ${binding.id} has inconsistent declaration identity`);
    }
    const declaration = declarations[0];
    const data = declaration.data;
    const operand = declaration.operands?.[0];
    validateReturnTypeMirror(
        binding.returnType,
        `WGSL compute binding ${binding.id}`);
    validateReturnTypeMirror(
        data?.returnType,
        `WGSL compute declaration at DXBC offset ${declaration.dxbcOffset}`);
    validateBindingRange(binding);
    if (binding.operandType !== operandType
        || binding.resourceDimension !== "buffer"
        || binding.structureStride !== null
        || binding.accessPattern !== null
        || binding.returnType?.returnTypeNames?.length !== 4
        || binding.returnType.returnTypeNames.some((entry) => entry !== returnType)
        || data?.registerIndex !== binding.registerIndex
        || data.resourceDimensionName !== "buffer"
        || (opcodeName === "dcl_resource" && data.sampleCount !== 0)
        || (opcodeName === "dcl_unordered_access_view_typed"
            && data.globallyCoherent !== false)
        || data.returnType?.returnTypeNames?.length !== 4
        || data.returnType.returnTypeNames.some((entry) => entry !== returnType)
        || declaration.operands?.length !== 1)
    {
        throw new Error(`WGSL compute binding ${binding.id} has an unsupported typed-buffer declaration`);
    }
    validateFixedRegisterOperand(
        operand,
        { index: `declaration@${declaration.dxbcOffset}` },
        0,
        operandType);
    if (operand.componentCount !== 0 || operand.mask || operand.swizzle || operand.selected)
    {
        throw new Error(`WGSL compute binding ${binding.id} declaration has a malformed handle operand`);
    }
}

function portableBinding(binding)
{
    return {
        identity: binding.identity,
        resourceKind: binding.resourceKind,
        generatedSymbol: binding.generatedSymbol,
        registerSpace: binding.registerSpace,
        registerIndex: binding.registerIndex,
        type: binding.type,
        buffer: binding.buffer
    };
}

function applyBindingPlan(bindings, bindingPlan)
{
    if (bindingPlan === null || bindingPlan === undefined) return bindings;
    if (bindingPlan?.format !== "CJS_WGSL_BINDING_PLAN"
        || bindingPlan.formatVersion !== 2
        || !Array.isArray(bindingPlan.bindings)
        || bindingPlan.bindings.length !== bindings.length)
    {
        throw new TypeError("WGSL compute binding plan must provide exact version 2 compute coverage");
    }
    const planned = new Map();
    const slots = new Set();
    for (const entry of bindingPlan.bindings)
    {
        const identity = `${entry.resourceKind}:${entry.registerSpace}:${entry.registerIndex}`;
        const slot = `${entry.group}:${entry.binding}`;
        if (entry.identity !== identity
            || entry.scopeIdentity !== `${identity}@compute`
            || entry.stages?.length !== 1 || entry.stages[0] !== "compute"
            || !Number.isInteger(entry.group) || entry.group < 0
            || !Number.isInteger(entry.binding) || entry.binding < 0
            || planned.has(identity) || slots.has(slot))
        {
            throw new Error(`WGSL compute binding plan contains an invalid entry ${entry.identity || identity}`);
        }
        planned.set(identity, entry);
        slots.add(slot);
    }
    return bindings.map((binding) =>
    {
        const entry = planned.get(binding.identity);
        if (!entry
            || JSON.stringify(portableBinding(binding)) !== JSON.stringify({
                identity: entry.identity,
                resourceKind: entry.resourceKind,
                generatedSymbol: entry.generatedSymbol,
                registerSpace: entry.registerSpace,
                registerIndex: entry.registerIndex,
                type: entry.type,
                buffer: entry.buffer
            }))
        {
            throw new Error(`WGSL compute binding plan layout for ${binding.identity} does not match the shader declaration`);
        }
        return { ...binding, scopeIdentity: entry.scopeIdentity, group: entry.group, binding: entry.binding };
    });
}

/**
 * Lowers the two scalar typed-buffer bindings used by the first compute slice.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {object|null} [bindingPlan] Optional exact compute-only binding plan.
 * @returns {object[]} Frozen WebGPU binding records.
 */
export function lowerComputeBindingLayout(program, bindingPlan = null)
{
    if (program?.format !== "CJS_SHADER_IR" || program.formatVersion !== 1)
    {
        throw new TypeError("WGSL compute binding lowering expects CJS_SHADER_IR version 1 input");
    }
    const bindings = Array.from(program.bindings || []).sort((left, right) =>
        bindingSpace(left) - bindingSpace(right)
        || (KIND_ORDER[left.resourceKind] ?? 99) - (KIND_ORDER[right.resourceKind] ?? 99)
        || bindingRegister(left) - bindingRegister(right)
        || left.declarationOffset - right.declarationOffset);
    if (bindings.length !== 2
        || bindings.filter((entry) => entry.resourceKind === "sampled-resource").length !== 1
        || bindings.filter((entry) => entry.resourceKind === "storage-resource").length !== 1)
    {
        throw new Error("WGSL compute body slice requires exactly one typed SRV and one typed UAV");
    }
    const identities = new Set();
    const lowered = bindings.map((binding, bindingIndex) =>
    {
        const identity = bindingIdentity(binding);
        if (identities.has(identity))
        {
            throw new Error(`WGSL compute binding layout contains duplicate ${identity}`);
        }
        identities.add(identity);
        const sampled = binding.resourceKind === "sampled-resource";
        validateBindingDeclaration(
            program,
            binding,
            sampled ? "dcl_resource" : "dcl_unordered_access_view_typed",
            sampled ? "resource" : "uav",
            sampled ? "sint" : "uint");
        const registerIndex = bindingRegister(binding);
        const registerSpace = bindingSpace(binding);
        return {
            kind: "wgsl-binding",
            id: binding.id,
            identity,
            scopeIdentity: `${identity}@compute`,
            resourceKind: binding.resourceKind,
            generatedSymbol: `${KIND_PREFIX[binding.resourceKind]}${registerIndex}`,
            registerSpace,
            registerIndex,
            rangeId: null,
            group: 0,
            binding: bindingIndex,
            visibility: "compute",
            declarationOffset: binding.declarationOffset,
            declaration: sampled ? "var<storage, read>" : "var<storage, read_write>",
            type: sampled ? "array<i32>" : "array<atomic<u32>>",
            buffer: {
                type: sampled ? "read-only-storage" : "storage",
                hasDynamicOffset: false,
                minBindingSize: 4
            }
        };
    });
    return deepFreeze(applyBindingPlan(lowered, bindingPlan));
}

function bindingForOperand(bindings, resourceKind, operand, instruction, operandIndex)
{
    validateFixedHandleOperand(instruction, operandIndex, operand.typeName, "compute");
    const matches = bindings.filter((entry) =>
        entry.resourceKind === resourceKind
        && entry.registerIndex === operand.registerIndex
        && entry.registerSpace === 0);
    if (matches.length !== 1)
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has an unresolved ${resourceKind} binding`);
    }
    return validateFixedHandleBinding(operand, matches[0], "compute");
}

function validateProgramShape(program)
{
    if (program?.format !== "CJS_SHADER_IR" || program.formatVersion !== 1)
    {
        throw new TypeError("WGSL compute lowering expects CJS_SHADER_IR version 1 input");
    }
    if (program.stage !== "compute") throw new Error(`WGSL compute lowering cannot lower ${program.stage}`);
    if (program.shaderModel?.major !== 5 || program.shaderModel.minor !== 0)
    {
        throw new Error("WGSL compute body slice currently supports only SM5.0");
    }
    if ((program.signatures?.input || []).length
        || (program.signatures?.output || []).length
        || (program.signatures?.patch || []).length
        || program.immediateConstantBuffer
        || program.constTables)
    {
        throw new Error("WGSL compute body slice does not support signatures or constant tables");
    }
    if (program.declarations?.length !== DECLARATION_OPCODES.length
        || DECLARATION_OPCODES.some((opcodeName, index) =>
            program.declarations[index]?.opcodeName !== opcodeName))
    {
        throw new Error("WGSL compute declaration shape is not supported; the bounded body slice requires canonical global/SRV/UAV/temp/thread-group declarations");
    }
    const temp = program.declarations[3];
    const group = program.declarations[4];
    if (temp.data?.tempCount !== 1
        || group.data?.threadGroupX !== 1
        || group.data?.threadGroupY !== 1
        || group.data?.threadGroupZ !== 1)
    {
        throw new Error("WGSL compute body slice requires one temporary and dcl_thread_group 1,1,1");
    }
    requireRefactoringAllowed(program, "compute");
    if (!Array.isArray(program.instructions) || program.instructions.length < 2
        || program.instructions.at(-1)?.opcodeName !== "ret"
        || program.instructions.slice(0, -1).some((instruction) => instruction.opcodeName === "ret")
        || program.instructions.some((instruction) => !SUPPORTED_OPCODES.has(instruction.opcodeName))
        || program.instructions.some((instruction, index) =>
            instruction.index !== index
            || (index > 0 && instruction.dxbcOffset <= program.instructions[index - 1].dxbcOffset)))
    {
        throw new Error("WGSL compute body slice requires one straight-line supported instruction sequence ending in ret");
    }
    const block = program.blocks?.[0];
    if (program.blocks?.length !== 1
        || block.id !== "block0" || block.index !== 0
        || block.startInstruction !== 0
        || block.endInstruction !== program.instructions.length - 1
        || block.terminator !== "ret"
        || block.reachable === false
        || block.successors?.length || block.predecessors?.length
        || block.mergeSite !== null
        || block.inputValueIds?.length
        || block.instructionIndices?.length !== program.instructions.length
        || block.instructionIndices.some((value, index) => value !== index))
    {
        throw new Error("WGSL compute body slice requires one canonical reachable return block");
    }
}

function validateInstructionEnvelope(instruction)
{
    const isReturn = instruction.opcodeName === "ret";
    if (instruction.controlKind !== (isReturn ? "termination" : null)
        || instruction.testBoolean !== null
        || instruction.saturate
        || instruction.preciseMask !== ""
        || (instruction.opcodeName !== "ld" && instruction.extensions?.length))
    {
        throw new Error(`WGSL compute instruction ${instruction.index} has unsupported control, modifier, or extension metadata`);
    }
    for (let operandIndex = 0; operandIndex < instruction.operands.length; operandIndex += 1)
    {
        validateCommonOperand(instruction.operands[operandIndex], instruction, operandIndex);
    }
}

function validateLoadExtensions(instruction)
{
    const extensions = instruction.extensions || [];
    validateSm50ResourceExtensions(extensions, {
        resourceDimension: 1,
        resourceDimensionName: "buffer",
        structureStride: 0,
        resourceReturnTypes: [ 3, 3, 3, 3 ]
    }, `WGSL compute load instruction ${instruction.index}`);
}

function validateNullHighDestination(instruction)
{
    const operand = instruction.operands[0];
    validateCommonOperand(operand, instruction, 0);
    if (operand.typeName !== "null"
        || operand.componentCount !== 0
        || operand.registerIndex !== null
        || operand.indices?.length
        || operand.mask || operand.swizzle || operand.selected
        || operand.immediateValues?.length)
    {
        throw new Error(`WGSL compute imul instruction ${instruction.index} requires a null high destination`);
    }
}

function seedRegisterState(program)
{
    const state = new Map();
    const valueIds = new Set();
    for (const value of program.values || [])
    {
        if (valueIds.has(value.id))
        {
            throw new Error(`WGSL compute program contains duplicate value ${value.id}`);
        }
        valueIds.add(value.id);
        if (![ "undefined-register", "instruction-write" ].includes(value.origin)
            || value.register !== "temp[0]"
            || value.writeMask.length !== 1
            || !COMPONENTS.includes(value.writeMask)
            || Object.keys(value.componentTypes || {}).length !== 1
            || (value.origin === "instruction-write"
                ? !scalarTypeName(value.componentTypes[value.writeMask])
                : value.componentTypes[value.writeMask] !== "unknown"))
        {
            throw new Error(`WGSL compute value ${value.id} is outside the bounded temp[0] scalar slice`);
        }
        if (value.origin === "undefined-register")
        {
            if (value.instructionIndex !== null || value.blockId !== null || value.previous !== null)
            {
                throw new Error(`WGSL compute undefined value ${value.id} has inconsistent origin metadata`);
            }
            const key = `${value.register}.${value.writeMask}`;
            if (state.has(key))
            {
                throw new Error(`WGSL compute program contains duplicate undefined ${key}`);
            }
            state.set(key, { valueId: value.id, component: value.writeMask });
        }
        else if (value.blockId !== "block0")
        {
            throw new Error(`WGSL compute instruction value ${value.id} belongs to an unexpected block`);
        }
    }
    return state;
}

function validateBlockOutput(program, state)
{
    const outputs = program.blocks[0].outputValues || [];
    const expected = Array.from(state, ([ key, ref ]) =>
    {
        const split = key.lastIndexOf(".");
        return { register: key.slice(0, split), component: key.slice(split + 1), ref };
    }).sort((left, right) =>
        left.register.localeCompare(right.register) || left.component.localeCompare(right.component));
    const actual = outputs.slice().sort((left, right) =>
        left.register.localeCompare(right.register) || left.component.localeCompare(right.component));
    if (actual.length !== expected.length
        || expected.some((entry, index) =>
            actual[index]?.register !== entry.register
            || actual[index]?.component !== entry.component
            || !sameRef(actual[index]?.ref, entry.ref)))
    {
        throw new Error("WGSL compute block output does not match the final scalar register state");
    }
}

/**
 * Lowers the bounded setdrawparameters/setsortargs compute slice into typed SSA.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {object} [options] Optional exact compute-only binding plan.
 * @returns {object} Frozen typed compute program.
 */
function lowerScalarWordComputeProgram(program, options = {})
{
    validateProgramShape(program);
    const bindings = lowerComputeBindingLayout(program, options.bindingPlan ?? null);
    const state = seedRegisterState(program);
    const writtenValueIds = new Set();
    const statements = [];

    for (const instruction of program.instructions)
    {
        validateInstructionEnvelope(instruction);
        validateTypeInfo(program, instruction);
        const expectedReads = new Set();

        if (instruction.opcodeName === "ret")
        {
            if (instruction.operands.length || instruction.dataflow.reads.length || instruction.dataflow.writes.length)
            {
                throw new Error(`WGSL compute return instruction ${instruction.index} must be operand-free`);
            }
            statements.push({
                kind: "return",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset
            });
            continue;
        }

        if (instruction.opcodeName === "ld")
        {
            if (instruction.operands.length !== 3)
            {
                throw new Error(`WGSL compute load instruction ${instruction.index} requires three operands`);
            }
            validateLoadExtensions(instruction);
            const destination = instruction.operands[0];
            validateDestinationOperand(destination, instruction, 0);
            if (destination.mask !== "x")
            {
                throw new Error(`WGSL compute load instruction ${instruction.index} scalar-word profile requires the x destination lane`);
            }
            const address = immediateCode(
                immediateBits(instruction.operands[1], instruction, 1, true),
                "uint32");
            const resource = validateFixedRegisterOperand(
                instruction.operands[2], instruction, 2, "resource");
            if (resource.componentCount !== 4 || resource.swizzle !== "xyzw"
                || resource.mask || resource.selected)
            {
                throw new Error(`WGSL compute load instruction ${instruction.index} requires a canonical xyzw resource selection`);
            }
            const binding = bindingForOperand(
                bindings, "sampled-resource", resource, instruction, 2);
            const { write, value } = validateWrite(
                program, instruction, 0, destination, state, writtenValueIds);
            validateNoUnexpectedReads(instruction, expectedReads);
            const length = `arrayLength(&${binding.generatedSymbol})`;
            const intrinsic = `select(0i, ${binding.generatedSymbol}[min(${address}, ${length} - 1u)], ${address} < ${length})`;
            const storage = valueStorageType(value, write.mask);
            statements.push({
                kind: "let",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                name: value.id,
                type: scalarTypeName(storage),
                expression: {
                    code: reinterpretCode(intrinsic, "int32", storage),
                    type: scalarTypeName(storage)
                }
            });
            continue;
        }

        const arithmetic = ARITHMETIC_RULES[instruction.opcodeName];
        if (arithmetic)
        {
            if (instruction.operands.length !== (instruction.opcodeName === "imul" ? 4 : 3))
            {
                throw new Error(`WGSL compute ${instruction.opcodeName} instruction ${instruction.index} has an unsupported operand count`);
            }
            if (instruction.opcodeName === "imul") validateNullHighDestination(instruction);
            const destination = instruction.operands[arithmetic.destinationOperand];
            validateDestinationOperand(destination, instruction, arithmetic.destinationOperand);
            const sources = arithmetic.sourceOperands.map((operandIndex) =>
                readCode(program, instruction, operandIndex, arithmetic.sourceType, state, expectedReads));
            validateNoUnexpectedReads(instruction, expectedReads);
            const intrinsic = arithmetic.functionName
                ? `${arithmetic.functionName}(${sources.join(", ")})`
                : `(${sources[0]} ${arithmetic.operator} ${sources[1]})`;
            const { write, value } = validateWrite(
                program, instruction, arithmetic.destinationOperand,
                destination, state, writtenValueIds);
            const storage = valueStorageType(value, write.mask);
            statements.push({
                kind: "let",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                name: value.id,
                type: scalarTypeName(storage),
                expression: {
                    code: reinterpretCode(intrinsic, arithmetic.resultType, storage),
                    type: scalarTypeName(storage)
                }
            });
            continue;
        }

        if (instruction.opcodeName === "store_uav_typed")
        {
            if (instruction.operands.length !== 3 || instruction.dataflow.writes.length)
            {
                throw new Error(`WGSL compute store instruction ${instruction.index} requires three source operands`);
            }
            const uav = validateFixedRegisterOperand(
                instruction.operands[0], instruction, 0, "uav");
            if (uav.componentCount !== 4 || uav.mask !== "xyzw"
                || uav.swizzle || uav.selected)
            {
                throw new Error(`WGSL compute store instruction ${instruction.index} requires a full xyzw UAV mask`);
            }
            const binding = bindingForOperand(
                bindings, "storage-resource", uav, instruction, 0);
            const address = immediateCode(
                immediateBits(instruction.operands[1], instruction, 1, true),
                "uint32");
            const value = replicatedStoreCode(
                program, instruction, 2, state, expectedReads);
            validateNoUnexpectedReads(instruction, expectedReads);
            statements.push({
                kind: "if",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                condition: {
                    code: `${address} < arrayLength(&${binding.generatedSymbol})`,
                    type: "bool"
                },
                statements: [ {
                    kind: "call",
                    instructionIndex: instruction.index,
                    dxbcOffset: instruction.dxbcOffset,
                    expression: {
                        code: `atomicStore(&${binding.generatedSymbol}[${address}], ${value})`,
                        type: "void"
                    }
                } ]
            });
        }
    }

    if (writtenValueIds.size !== program.values.filter((value) =>
        value.origin === "instruction-write").length)
    {
        throw new Error("WGSL compute program contains an unowned instruction-write value");
    }
    validateBlockOutput(program, state);
    return deepFreeze({
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "compute",
        entryPoint: "main",
        threadGroupSize: [ 1, 1, 1 ],
        bindings,
        statements
    });
}

/**
 * Routes one compute program to an exact declaration-shaped lowering profile.
 * Once a profile is selected its validation errors are final; malformed input
 * never falls through to a broader profile.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {object} [options] Optional exact compute-only binding plan.
 * @returns {object} Frozen typed compute program.
 */
export function lowerComputeProgram(program, options = {})
{
    validateExactComputeEnvelope(program, "WGSL compute");
    if (isParticleClearResetCandidate(program))
    {
        return lowerParticleClearResetComputeProgram(program, options);
    }
    if (isParticleClearInitializeCandidate(program))
    {
        return lowerParticleClearInitializeComputeProgram(program, options);
    }
    if (isParticleEmitComputeCandidate(program))
    {
        return lowerParticleEmitComputeProgram(program, options);
    }
    if (isCreateHistogramsComputeProfile(program))
    {
        return lowerCreateHistogramsComputeProgram(program, options);
    }
    if (isMergeHistogramsComputeProfile(program))
    {
        return lowerMergeHistogramsComputeProgram(program, options);
    }
    if (isSortComputeProfile(program))
    {
        return lowerSortComputeProgram(program, options);
    }
    if (isSortInnerComputeProfile(program))
    {
        return lowerSortInnerComputeProgram(program, options);
    }
    if (isSortStepComputeProfile(program))
    {
        return lowerSortStepComputeProgram(program, options);
    }
    if (isSkinVerticesComputeProfile(program))
    {
        return lowerSkinVerticesComputeProgram(program, options);
    }
    return lowerScalarWordComputeProgram(program, options);
}
