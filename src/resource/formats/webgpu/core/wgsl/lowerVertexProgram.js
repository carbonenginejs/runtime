import { deepFreeze } from "#utils/object";
import { fixedSourceLanes } from "../ir/sourceLanes.js";
import {
    validateIndexableTempOperand,
    validateIndexableTempRead,
    validateIndexableTempWrite
} from "../ir/indexableTemps.js";
import { hoistEscapingValues } from "./hoistEscapingValues.js";
import { lowerBindingLayout } from "./lowerBindingLayout.js";
import { requireRefactoringAllowed, validatePreciseInstruction } from "./precisionControls.js";
import { buildSelectionPlans, cloneWritten, terminatesAllPaths } from "./selectionPlans.js";
import { validateFixedHandleBinding, validateFixedHandleOperand } from "./validateHandleOperand.js";

function containsOutputAssignment(statements)
{
    return statements.some((statement) => statement.kind === "assignment"
        || (statement.kind === "if" && (containsOutputAssignment(statement.statements)
            || (statement.elseStatements ? containsOutputAssignment(statement.elseStatements) : false)))
        || (statement.kind === "switch" && statement.clauses.some((clause) => containsOutputAssignment(clause.statements)))
        || (statement.kind === "loop" && containsOutputAssignment(statement.statements)));
}

const COMPONENTS = [ "x", "y", "z", "w" ];
const SYSTEM_BUILTINS = Object.freeze({
    SV_POSITION: "position"
});
const INPUT_BUILTINS = Object.freeze({
    SV_VERTEXID: { name: "vertex_index", scalarType: "uint32" },
    SV_INSTANCEID: { name: "instance_index", scalarType: "uint32" }
});
const SUPPORTED_OPCODES = new Set([
    "add", "and", "div", "dp2", "dp3", "dp4", "eq", "exp", "f16tof32",
    "f32tof16", "frc", "ftoi", "ftou",
    "ge", "iadd", "ieq", "ige", "ilt", "imad", "imax", "imin", "imul", "ine",
    "ishl", "ishr", "itof", "ld", "ld_structured", "log", "lt", "mad", "max", "min",
    "mov", "movc", "mul", "ne", "or", "rcp", "round_ni", "round_pi", "round_z", "rsq",
    "sample_d", "sample_l", "sincos", "sqrt", "udiv", "uge", "ult", "umax",
    "umin", "ushr", "utof", "xor", "ret"
]);
const METADATA_OPCODE_EXTENSIONS = new Set([ "resource_dimension", "resource_return_type" ]);
const SAMPLE_OFFSET_OPCODES = new Set([ "sample_d", "sample_l" ]);
const NUMERIC_CONVERSIONS = Object.freeze({
    itof: [ "int32", "float32" ],
    utof: [ "uint32", "float32" ],
    ftoi: [ "float32", "int32" ],
    ftou: [ "float32", "uint32" ]
});

function sampleOffsetArgument(instruction, viewDimension)
{
    const controls = instruction.extensions?.filter((extension) => extension.typeName === "sample_controls") || [];
    if (!controls.length) return "";
    if (controls.length !== 1)
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} has duplicate sample_controls extensions`);
    }
    if (viewDimension !== "2d")
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} immediate sample offsets support only 2d textures`);
    }
    const offsets = controls[0].sampleOffsets;
    if (![ offsets?.u, offsets?.v, offsets?.w ].every((value) =>
        Number.isInteger(value) && value >= -8 && value <= 7))
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} has invalid immediate sample offsets`);
    }
    // D3D ignores the w offset for Texture2D. WGSL takes the same signed,
    // texel-space u/v constants as the final sampling argument.
    return `, vec2<i32>(${offsets.u}, ${offsets.v})`;
}

function componentsFromMask(mask)
{
    return COMPONENTS.filter((_, index) => (mask & (1 << index)) !== 0);
}

function scalarTypeName(type)
{
    return ({ float32: "f32", int32: "i32", uint32: "u32", bool: "bool", bitpattern32: "u32" })[type] || null;
}

function fieldType(scalarType, count)
{
    const scalar = scalarTypeName(scalarType);
    if (!scalar) throw new Error(`WGSL vertex interface cannot use unresolved scalar type ${scalarType}`);
    return count === 1 ? scalar : `vec${count}<${scalar}>`;
}

function interfaceFields(program, direction)
{
    const groups = new Map();
    for (const signature of program.signatures?.[direction] || [])
    {
        if (!groups.has(signature.registerIndex)) groups.set(signature.registerIndex, []);
        groups.get(signature.registerIndex).push(signature);
    }
    return Array.from(groups.values()).map((rows) =>
    {
        const registerIndex = rows[0].registerIndex;
        const mask = rows.reduce((accumulator, signature) => accumulator | signature.mask, 0);
        const components = componentsFromMask(mask);
        if (!components.length || !components.every((component, componentIndex) => component === COMPONENTS[componentIndex]))
        {
            throw new Error(`WGSL vertex ${direction} signature register ${registerIndex} has a non-prefix mask`);
        }
        const semantic = String(rows[0].semanticName || "").toUpperCase();
        const outputBuiltin = direction === "output" ? SYSTEM_BUILTINS[semantic] || null : null;
        const inputBuiltin = direction === "input" ? INPUT_BUILTINS[semantic] || null : null;
        const builtinName = outputBuiltin || inputBuiltin?.name || null;
        if (rows.some((signature) => String(signature.semanticName || "").toUpperCase().startsWith("SV_")) && !builtinName)
        {
            throw new Error(`WGSL vertex ${direction} system semantic ${semantic} is not supported`);
        }
        const componentTypeName = rows[0].componentTypeName;
        if (rows.some((signature) => signature.componentTypeName !== componentTypeName))
        {
            throw new Error(`WGSL vertex ${direction} register ${registerIndex} packs mixed component types`);
        }
        const scalarType = inputBuiltin?.scalarType || componentTypeName;
        return {
            kind: "interface-field",
            id: `${direction}:r${registerIndex}`,
            direction,
            registerIndex,
            semanticName: rows[0].semanticName,
            semanticIndex: rows[0].semanticIndex,
            components,
            scalarType,
            type: inputBuiltin?.scalarType ? scalarTypeName(scalarType) : fieldType(componentTypeName, components.length),
            name: builtinName || `${direction}${registerIndex}`,
            attribute: builtinName
                ? { kind: "builtin", name: builtinName }
                : { kind: "location", index: registerIndex }
        };
    });
}

function packedComponent(mask, component)
{
    const index = Array.from(mask).indexOf(component);
    if (index < 0) throw new Error(`WGSL value mask ${mask} does not contain component ${component}`);
    return COMPONENTS[index];
}

function valueType(program, write)
{
    const value = program.values.find((entry) => entry.id === write.valueId);
    const types = Array.from(write.mask).map((component) => value?.componentTypes?.[component]);
    if (!types.length || types.some((type) => !scalarTypeName(type)) || new Set(types).size !== 1)
    {
        throw new Error(`WGSL vertex value ${write.valueId} has an unresolved or mixed result type that is not supported`);
    }
    const scalarType = types[0];
    return {
        scalarType,
        wgslType: fieldType(scalarType, types.length)
    };
}

function isDeadUntypedWrite(program, write, readValueIds, localSsaDestination)
{
    if (!localSsaDestination || readValueIds.has(write.valueId)) return false;
    const value = program.values.find((entry) => entry.id === write.valueId);
    return Array.from(write.mask).some((component) => !scalarTypeName(value?.componentTypes?.[component]));
}

function mixedImmediateTypes(program, write)
{
    const value = program.values.find((entry) => entry.id === write.valueId);
    if (!value || write.mask.length < 2) return null;
    const types = Array.from(write.mask).map((component) => value.componentTypes?.[component]);
    if (types.some((type) => !scalarTypeName(type)) || new Set(types).size === 1) return null;
    return types;
}


function liveInputRegisters(program)
{
    const values = new Map(program.values.map((value) => [ value.id, value ]));
    const reachableBlocks = new Set(program.controlFlow.reachableBlockIds);
    const reachableInstructions = new Set(program.blocks
        .filter((block) => reachableBlocks.has(block.id))
        .flatMap((block) => block.instructionIndices));
    const registers = new Set();
    for (const instruction of program.instructions)
    {
        if (!reachableInstructions.has(instruction.index)) continue;
        for (const ref of instruction.dataflow.reads.flatMap((read) => read.refs))
        {
            const value = values.get(ref.valueId);
            if (value?.origin === "undefined-register")
            {
                throw new Error(`WGSL vertex instruction ${instruction.index} reads undefined ${value.register}.${ref.component}`);
            }
            const match = value?.origin === "program-input" && /^input\[(\d+)\]$/.exec(value.register);
            if (match) registers.add(Number(match[1]));
        }
    }
    return registers;
}

function sourceRead(instruction, operandIndex)
{
    return instruction.dataflow.reads.find((entry) =>
        entry.kind !== "index-read" && entry.operandIndex === operandIndex) || null;
}

function vectorCode(parts, scalarType)
{
    if (parts.length === 1) return parts[0];
    return `vec${parts.length}<${scalarTypeName(scalarType)}>(${parts.join(", ")})`;
}

function reinterpretCode(code, fromType, toType, count, context)
{
    const from = scalarTypeName(fromType);
    const to = scalarTypeName(toType);
    if (!from || !to) throw new Error(`WGSL vertex cannot resolve ${context} type ${fromType} to ${toType}`);
    if (from === to) return code;
    if (![ "f32", "i32", "u32" ].includes(from) || ![ "f32", "i32", "u32" ].includes(to))
    {
        throw new Error(`WGSL vertex cannot reinterpret ${context} from ${fromType} to ${toType}`);
    }
    return `bitcast<${fieldType(toType, count)}>(${code})`;
}

function valueReference(program, ref, inputs)
{
    const value = program.values.find((entry) => entry.id === ref.valueId);
    if (!value) throw new Error(`WGSL vertex references missing value ${ref.valueId}`);
    if (value.origin === "undefined-register") throw new Error(`WGSL vertex reads undefined ${value.register}.${ref.component}`);
    if (value.origin === "program-input")
    {
        const registerIndex = Number(/^input\[(\d+)\]$/.exec(value.register)?.[1]);
        const field = inputs.find((entry) => entry.registerIndex === registerIndex);
        if (!field) throw new Error(`WGSL vertex has no live input field for ${value.register}`);
        const packed = packedComponent(field.components.join(""), ref.component);
        const code = field.components.length === 1 ? `input.${field.name}` : `input.${field.name}.${packed}`;
        return reinterpretCode(code, field.scalarType, value.componentTypes?.[ref.component], 1, `${value.register}.${ref.component}`);
    }
    if (value.origin === "instruction-write" && value.writeMask.length > 1)
    {
        const componentTypes = Array.from(value.writeMask).map((component) => value.componentTypes?.[component]);
        if (new Set(componentTypes).size > 1) return `${value.id}_${ref.component}`;
    }
    const packed = packedComponent(value.writeMask, ref.component);
    return value.writeMask.length === 1 ? value.id : `${value.id}.${packed}`;
}

function sourceComponents(operand, destinationMask, count, activeComponents = null)
{
    const selected = operand.selected || "";
    if (selected) return Array.from({ length: count }, () => selected);
    const swizzle = operand.swizzle || "xyzw";
    const positions = activeComponents || (count > destinationMask.length
        ? COMPONENTS.slice(0, count)
        : Array.from(destinationMask).slice(0, count));
    return positions.map((component) => swizzle[COMPONENTS.indexOf(component)] || swizzle[0]);
}

function immediateRawBits(operand, destinationMask, count, activeComponents = null)
{
    const values = operand.immediateValues || [];
    const components = sourceComponents(operand, destinationMask, count, activeComponents);
    return components.map((component, index) =>
    {
        const sourceIndex = values.length === 1 ? 0 : COMPONENTS.indexOf(component);
        const bits = values[sourceIndex]?.uint32 ?? values[index]?.uint32;
        if (!Number.isInteger(bits)) throw new Error("WGSL vertex immediate has no raw uint32 bits");
        return bits >>> 0;
    });
}

function immediateParts(operand, destinationMask, count, expectedType, activeComponents = null)
{
    return immediateRawBits(operand, destinationMask, count, activeComponents).map((bits) =>
    {
        const hex = `0x${(bits >>> 0).toString(16).padStart(8, "0")}u`;
        if (expectedType === "float32") return `bitcast<f32>(${hex})`;
        if (expectedType === "int32") return `bitcast<i32>(${hex})`;
        return hex;
    });
}

function validateRcpImmediate(program, instruction, write)
{
    const operand = instruction.operands[1];
    if (operand?.typeName !== "immediate32") return;
    const activeComponents = fixedSourceLanes(instruction, 1, program);
    const bits = immediateRawBits(operand, write.mask, write.mask.length, activeComponents);
    if (bits.some((value) =>
    {
        const exponent = (value >>> 23) & 0xff;
        return exponent === 0 || exponent === 0xff;
    }))
    {
        throw new Error(`WGSL vertex rcp instruction ${instruction.index} requires finite normal immediate source lanes`);
    }
}

function bindingForOperand(bindings, resourceKind, operand)
{
    const rangeId = operand.resourceReference?.rangeId;
    if (Number.isInteger(rangeId))
    {
        const matches = bindings.filter((entry) => entry.resourceKind === resourceKind && entry.rangeId === rangeId);
        if (matches.length > 1) throw new Error(`WGSL vertex ${resourceKind} range ${rangeId} is ambiguous`);
        const binding = matches[0] || null;
        return resourceKind === "uniform-buffer"
            ? binding
            : validateFixedHandleBinding(operand, binding, "vertex");
    }
    const binding = bindings.find((entry) =>
        entry.resourceKind === resourceKind && entry.registerIndex === operand.registerIndex) || null;
    return resourceKind === "uniform-buffer"
        ? binding
        : validateFixedHandleBinding(operand, binding, "vertex");
}

function cbufferVectorIndex(program, instruction, operandIndex, operand, inputs)
{
    const indices = operand.indices || [];
    for (let dimension = 0; dimension < indices.length - 1; dimension += 1)
    {
        if (indices[dimension].relative) throw new Error("WGSL vertex does not support dynamic cbuffer register selection");
    }
    const last = indices.at(-1);
    const base = last?.values?.length ? last.values[0] : (last?.relative ? 0 : undefined);
    if (!Number.isInteger(base) || base < 0) throw new Error("WGSL vertex cbuffer operand has no immediate vector index");
    if (!last.relative) return `${base}`;
    const read = instruction.dataflow.reads.find((entry) => entry.kind === "index-read"
        && entry.operandIndex === operandIndex && entry.dimension === indices.length - 1);
    if (!read || read.refs.length !== 1) throw new Error("WGSL vertex dynamic cbuffer index has no resolved register");
    if (last.relative?.typeName === "indexable_temp")
    {
        validateIndexableTempRead(program, last.relative, read, sourceComponents(last.relative, "x", 1));
    }
    const ref = read.refs[0];
    const storage = valueStorageType(program, ref);
    let indexCode = valueReference(program, ref, inputs);
    if (storage === "uint32" || storage === "bitpattern32") indexCode = `i32(${indexCode})`;
    else if (storage !== "int32") throw new Error(`WGSL vertex dynamic cbuffer index has unsupported type ${storage}`);
    return base === 0 ? indexCode : `${base} + ${indexCode}`;
}

function cbufferParts(program, instruction, operandIndex, operand, destinationMask, count, bindings, expectedScalarType, inputs, activeComponents = null)
{
    const binding = bindingForOperand(bindings, "uniform-buffer", operand);
    if (!binding) throw new Error(`WGSL vertex cannot resolve cb${operand.registerIndex}`);
    const vectorIndex = cbufferVectorIndex(program, instruction, operandIndex, operand, inputs);
    const parts = sourceComponents(operand, destinationMask, count, activeComponents)
        .map((component) => `${binding.generatedSymbol}[${vectorIndex}].${component}`);
    if (expectedScalarType === "float32") return parts;
    if (![ "int32", "uint32", "bitpattern32" ].includes(expectedScalarType))
    {
        throw new Error(`WGSL vertex cannot reinterpret cbuffer lanes as ${expectedScalarType}`);
    }
    const target = scalarTypeName(expectedScalarType);
    return parts.map((part) => `bitcast<${target}>(${part})`);
}

function icbParts(program, instruction, operandIndex, operand, destinationMask, count, expectedScalarType, inputs, activeComponents = null)
{
    if (!program.immediateConstantBuffer?.length)
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} has no immediate constant buffer`);
    }
    const vectorIndex = cbufferVectorIndex(program, instruction, operandIndex, operand, inputs);
    const parts = sourceComponents(operand, destinationMask, count, activeComponents)
        .map((component) => `icb[${vectorIndex}].${component}`);
    if (expectedScalarType === "float32") return parts;
    if (![ "int32", "uint32", "bitpattern32" ].includes(expectedScalarType))
    {
        throw new Error(`WGSL vertex cannot reinterpret icb lanes as ${expectedScalarType}`);
    }
    const target = scalarTypeName(expectedScalarType);
    return parts.map((part) => `bitcast<${target}>(${part})`);
}

function constTableParts(program, instruction, operandIndex, operand, destinationMask, count, expectedScalarType, inputs, activeComponents = null)
{
    if (validateIndexableTempOperand(program, operand, "source") !== null)
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} fixed indexable temp has no resolved SSA read`);
    }
    const registerIndex = operand.indices?.[0]?.values?.[0];
    const table = (program.constTables || []).find((entry) => entry.registerIndex === registerIndex);
    if (!table)
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} indexable temp x${registerIndex} is not a supported constant table`);
    }
    const vectorIndex = cbufferVectorIndex(program, instruction, operandIndex, operand, inputs);
    const parts = sourceComponents(operand, destinationMask, count, activeComponents)
        .map((component) => `${table.symbol}[${vectorIndex}].${component}`);
    if (expectedScalarType === "float32") return parts;
    if (![ "int32", "uint32", "bitpattern32" ].includes(expectedScalarType))
    {
        throw new Error(`WGSL vertex cannot reinterpret constant-table lanes as ${expectedScalarType}`);
    }
    const target = scalarTypeName(expectedScalarType);
    return parts.map((part) => `bitcast<${target}>(${part})`);
}

// DXBC float source modifiers are selected by the consuming opcode. Integer
// consumers admit two's-complement negation only. Bit-preserving movers
// (unknown expected type) apply the FLOAT semantics to raw lane bits
// ("modifiers assume float data"), represented as sign-bit arithmetic.
function modifierOnStorage(part, storage, modifier)
{
    if (storage === "float32")
    {
        if (modifier === "neg") return `-(${part})`;
        if (modifier === "abs") return `abs(${part})`;
        return `-(abs(${part}))`;
    }
    const bit = modifier === "neg" ? "^ 0x80000000u" : modifier === "abs" ? "& 0x7fffffffu" : "| 0x80000000u";
    const raw = storage === "int32" ? `bitcast<u32>(${part})` : part;
    const masked = `(${raw} ${bit})`;
    return storage === "int32" ? `bitcast<i32>(${masked})` : masked;
}

const MODIFIER_STORAGE_TYPES = new Set([ "float32", "int32", "uint32", "bitpattern32" ]);

function applyModifier(parts, operand, expected, storageTypes, instruction, operandIndex)
{
    const modifier = operand.modifierName || "none";
    if (modifier === "none") return parts;
    if (![ "neg", "abs", "absneg" ].includes(modifier))
    {
        throw new Error(`WGSL vertex operand modifier ${modifier} is not supported`);
    }
    if (expected === "float32")
    {
        if (modifier === "neg") return parts.map((part) => `-(${part})`);
        if (modifier === "abs") return parts.map((part) => `abs(${part})`);
        return parts.map((part) => `-(abs(${part}))`);
    }
    if (expected === "int32" && modifier === "neg")
    {
        return parts.map((part) => `-(${part})`);
    }
    if (expected === "uint32" && modifier === "neg")
    {
        return parts.map((part) => `(0u - ${part})`);
    }
    if (expected === "bitpattern32")
    {
        return parts.map((part) => modifierOnStorage(part, "bitpattern32", modifier));
    }
    if (expected === "unknown" && storageTypes?.length === parts.length
        && storageTypes.every((storage) => MODIFIER_STORAGE_TYPES.has(storage)))
    {
        return parts.map((part, index) => modifierOnStorage(part, storageTypes[index], modifier));
    }
    throw new Error(`WGSL vertex instruction ${instruction?.index} operand ${operandIndex} uses an unsupported ${modifier} modifier for ${expected}`);
}

function applyLaneModifier(code, operand, targetType, instruction, operandIndex)
{
    const modifier = operand.modifierName || "none";
    if (modifier === "none") return code;
    if (![ "neg", "abs", "absneg" ].includes(modifier) || !MODIFIER_STORAGE_TYPES.has(targetType))
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} lane operand ${operandIndex} uses an unsupported ${modifier} modifier for ${targetType}`);
    }
    // The per-lane path is reached only from bit-preserving movc lanes, where
    // DXBC applies the float modifier semantics to the raw lane bits; the lane
    // code is already reinterpreted to targetType.
    return modifierOnStorage(code, targetType, modifier);
}

function expectedType(instruction, operandIndex)
{
    return instruction.typeInfo.operandTypes.find((entry) => entry.operandIndex === operandIndex)?.expectedType || "unknown";
}

function valueStorageType(program, ref)
{
    const value = program.values.find((entry) => entry.id === ref.valueId);
    return value?.componentTypes?.[ref.component] || "unknown";
}

function bitcastKey(entry)
{
    if (entry.kind === "read-bitcast")
    {
        return [ entry.kind, entry.operandIndex, entry.componentIndex, entry.valueId, entry.component,
            entry.from, entry.to ].join(":");
    }
    return [ entry.kind, entry.operandIndex, entry.valueId, entry.component, entry.from, entry.to ].join(":");
}

function validateRegisterBitcasts(program, instruction)
{
    const required = [];
    for (const read of instruction.dataflow.reads)
    {
        if (read.kind === "index-read") continue;
        const expected = expectedType(instruction, read.operandIndex);
        if (expected === "unknown") continue;
        read.refs.forEach((ref, componentIndex) =>
        {
            const storage = valueStorageType(program, ref);
            if (storage !== "unknown" && storage !== expected)
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
    const intrinsicResult = instruction.typeInfo.resultType;
    if (intrinsicResult !== "unknown")
    {
        for (const write of instruction.dataflow.writes)
        {
            for (const component of write.mask)
            {
                const storage = valueStorageType(program, { valueId: write.valueId, component });
                if (storage !== "unknown" && storage !== intrinsicResult)
                {
                    required.push({
                        kind: "result-bitcast",
                        operandIndex: write.operandIndex,
                        valueId: write.valueId,
                        component,
                        from: intrinsicResult,
                        to: storage
                    });
                }
            }
        }
    }
    const actual = instruction.typeInfo.bitcasts.filter((entry) =>
        entry.kind === "read-bitcast" || entry.kind === "result-bitcast");
    const requiredKeys = required.map(bitcastKey).sort();
    const actualKeys = actual.map(bitcastKey).sort();
    if (new Set(actualKeys).size !== actualKeys.length
        || requiredKeys.length !== actualKeys.length
        || requiredKeys.some((entry, index) => entry !== actualKeys[index]))
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} has inconsistent register bitcast metadata`);
    }
}

function unsupportedMinPrecision(operand)
{
    // D3D minimum precision is a floor, not a format: computing float_16
    // operands at full 32-bit is a conforming implementation, so they promote
    // to ordinary f32 lanes (registers are 32-bit either way). Other kinds
    // stay fail-closed until a shader needs them.
    const name = operand.minPrecisionName || "default";
    return name !== "default" && name !== "float_16";
}

function operandLaneExpression(program, instruction, operandIndex, destinationMask, laneIndex, targetType, inputs, bindings,
    moverData = false)
{
    const operand = instruction.operands[operandIndex];
    if (!operand) throw new Error(`WGSL vertex instruction ${instruction.index} has no operand ${operandIndex}`);
    if (unsupportedMinPrecision(operand))
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} minimum-precision kind ${operand.minPrecisionName} is not supported`);
    }
    const read = sourceRead(instruction, operandIndex);
    const activeComponents = fixedSourceLanes(instruction, operandIndex, program);
    if (read && operand.typeName === "indexable_temp")
    {
        validateIndexableTempRead(
            program, operand, read,
            sourceComponents(operand, destinationMask, read.refs.length, activeComponents));
    }
    if (read)
    {
        const replicated = read.refs.length === 1 && Boolean(operand.selected);
        if (!replicated && laneIndex >= read.refs.length)
        {
            throw new Error(`WGSL vertex instruction ${instruction.index} has too few source lanes`);
        }
        const ref = replicated ? read.refs[0] : read.refs[laneIndex];
        const storage = valueStorageType(program, ref);
        const code = reinterpretCode(valueReference(program, ref, inputs), storage, targetType, 1,
            `instruction ${instruction.index} lane read`);
        return moverData
            ? applyLaneModifier(code, operand, targetType, instruction, operandIndex)
            : applyModifier([ code ], operand, targetType, null, instruction, operandIndex)[0];
    }
    const component = destinationMask[laneIndex];
    if (operand.typeName === "immediate32")
    {
        const code = immediateParts(operand, component, 1, targetType)[0];
        return moverData
            ? applyLaneModifier(code, operand, targetType, instruction, operandIndex)
            : applyModifier([ code ], operand, targetType, null, instruction, operandIndex)[0];
    }
    if (operand.typeName === "constant_buffer")
    {
        const code = cbufferParts(program, instruction, operandIndex, operand, component, 1, bindings, targetType, inputs)[0];
        return moverData
            ? applyLaneModifier(code, operand, targetType, instruction, operandIndex)
            : applyModifier([ code ], operand, targetType, null, instruction, operandIndex)[0];
    }
    throw new Error(`WGSL vertex instruction ${instruction.index} cannot lower ${operand.typeName} lane operand ${operandIndex}`);
}

function operandExpression(program, instruction, operandIndex, destinationMask, count, inputs, bindings)
{
    const operand = instruction.operands[operandIndex];
    if (!operand) throw new Error(`WGSL vertex instruction ${instruction.index} has no operand ${operandIndex}`);
    if (unsupportedMinPrecision(operand))
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} minimum-precision kind ${operand.minPrecisionName} is not supported`);
    }
    const type = expectedType(instruction, operandIndex);
    const read = sourceRead(instruction, operandIndex);
    const activeComponents = fixedSourceLanes(instruction, operandIndex, program);
    if (read && operand.typeName === "indexable_temp")
    {
        validateIndexableTempRead(
            program, operand, read,
            sourceComponents(operand, destinationMask, read.refs.length, activeComponents));
    }
    let parts;
    let modifierStorageTypes = null;
    if (read)
    {
        if (read.refs.length < count && !(read.refs.length === 1 && operand.selected))
        {
            throw new Error(`WGSL vertex instruction ${instruction.index} has too few source lanes`);
        }
        const refs = read.refs.length === 1 && operand.selected
            ? Array.from({ length: count }, () => read.refs[0])
            : read.refs.slice(0, count);
        if ((operand.modifierName || "none") !== "none" && type === "unknown")
        {
            modifierStorageTypes = refs.map((ref) => valueStorageType(program, ref));
        }
        const replicatedSelected = read.refs.length === 1 && Boolean(operand.selected);
        parts = refs.map((ref, componentIndex) =>
        {
            let part = valueReference(program, ref, inputs);
            const sourceComponentIndex = replicatedSelected ? 0 : componentIndex;
            const bitcast = instruction.typeInfo.bitcasts.find((entry) => entry.kind === "read-bitcast"
                && entry.operandIndex === operandIndex && entry.componentIndex === sourceComponentIndex
                && entry.valueId === ref.valueId && entry.component === ref.component);
            if (bitcast)
            {
                part = reinterpretCode(part, bitcast.from, bitcast.to, 1, `instruction ${instruction.index} read`);
            }
            return part;
        });
    }
    else if (operand.typeName === "immediate32")
    {
        parts = immediateParts(operand, destinationMask, count, type, activeComponents);
    }
    else if (operand.typeName === "constant_buffer")
    {
        parts = cbufferParts(program, instruction, operandIndex, operand, destinationMask, count, bindings, type, inputs, activeComponents);
    }
    else if (operand.typeName === "indexable_temp")
    {
        parts = constTableParts(program, instruction, operandIndex, operand, destinationMask, count, type, inputs, activeComponents);
    }
    else if (operand.typeName === "immediate_constant_buffer")
    {
        parts = icbParts(program, instruction, operandIndex, operand, destinationMask, count, type, inputs, activeComponents);
    }
    else
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} cannot lower ${operand.typeName} operand ${operandIndex}`);
    }
    return vectorCode(applyModifier(parts, operand, type, modifierStorageTypes, instruction, operandIndex), type);
}

function floatBound(count, value)
{
    return count === 1 ? value : `vec${count}<f32>(${value})`;
}

function zeroMask(count)
{
    return count === 1 ? "0u" : `vec${count}<u32>(0u)`;
}

function fullMask(count)
{
    return count === 1 ? "0xffffffffu" : `vec${count}<u32>(0xffffffffu)`;
}

function oneMask(count)
{
    return count === 1 ? "1u" : `vec${count}<u32>(1u)`;
}

function splatScalar(code, count)
{
    return count === 1 ? code : `vec${count}<f32>(${code})`;
}

function structuredLoadExpression(program, instruction, write, type, inputs, bindings)
{
    const count = write.mask.length;
    if (instruction.operands.length !== 4)
    {
        throw new Error(`WGSL vertex structured load ${instruction.index} requires four operands`);
    }
    const addressOperand = instruction.operands[1];
    if (!COMPONENTS.includes(addressOperand?.selected) || (addressOperand.modifierName || "none") !== "none")
    {
        throw new Error(`WGSL vertex structured load ${instruction.index} requires one unmodified scalar address`);
    }
    const address = operandExpression(program, instruction, 1, write.mask, 1, inputs, bindings);
    const byteOffsetOperand = instruction.operands[2];
    const byteOffset = byteOffsetOperand?.immediateValues?.[0]?.uint32;
    if (byteOffsetOperand?.typeName !== "immediate32" || byteOffsetOperand.immediateValues?.length !== 1
        || (byteOffsetOperand.modifierName || "none") !== "none"
        || !Number.isInteger(byteOffset))
    {
        throw new Error(`WGSL vertex structured load ${instruction.index} requires an immediate byte offset`);
    }
    const resource = validateFixedHandleOperand(instruction, 3, "resource", "vertex");
    const binding = bindingForOperand(bindings, "sampled-resource", resource);
    if (!binding?.buffer || !Number.isInteger(binding.structureStride))
    {
        throw new Error(`WGSL vertex structured load ${instruction.index} has no structured buffer binding`);
    }
    const strideWords = binding.structureStride / 4;
    const firstWord = byteOffset / 4;
    if (byteOffset % 4 !== 0)
    {
        throw new Error(`WGSL vertex structured load ${instruction.index} has a non-DWORD byte offset`);
    }
    const swizzle = sourceComponents(resource, write.mask, count);
    const symbol = binding.generatedSymbol;
    const wordCount = `arrayLength(&${symbol})`;
    const addressInRange = `${address} < (${wordCount} / ${strideWords}u)`;
    const selected = swizzle.map((component) =>
    {
        const index = COMPONENTS.indexOf(component);
        const word = firstWord + index;
        if (index < 0 || word >= strideWords)
        {
            throw new Error(`WGSL vertex structured load ${instruction.index} exceeds its ${binding.structureStride}-byte stride`);
        }
        const wordAddress = `((${address}) * ${strideWords}u) + ${word}u`;
        const safeWordAddress = `min(${wordAddress}, ${wordCount} - 1u)`;
        return `select(0u, ${symbol}[${safeWordAddress}], ${addressInRange})`;
    });
    if (type === null) return selected;
    const parts = selected.map((part) => reinterpretCode(part, "uint32", type.scalarType, 1,
        `structured load ${instruction.index}`));
    return vectorCode(parts, type.scalarType);
}

function expressionFor(program, instruction, write, type, inputs, bindings)
{
    const mask = write.mask;
    const count = mask.length;
    const source = (index, forcedCount = count) =>
        operandExpression(program, instruction, index, mask, forcedCount, inputs, bindings);
    const op = instruction.opcodeName;
    if ([ "add", "iadd", "mul", "div" ].includes(op))
    {
        const operator = { add: "+", iadd: "+", mul: "*", div: "/" }[op];
        return `(${source(1)} ${operator} ${source(2)})`;
    }
    if (op === "mad" || op === "imad" || op === "umad") return `((${source(1)} * ${source(2)}) + ${source(3)})`;
    if (op === "f16tof32" || op === "f32tof16")
    {
        const src = source(1);
        const lane = (index) => (count === 1 ? `(${src})` : `(${src})[${index}]`);
        const parts = Array.from({ length: count }, (_, index) => (op === "f16tof32"
            ? `unpack2x16float(${lane(index)}).x`
            : `(pack2x16float(vec2<f32>(${lane(index)}, 0.0)) & 0xffffu)`));
        return vectorCode(parts, op === "f16tof32" ? "float32" : "uint32");
    }
    if (op === "imul" || op === "umul")
    {
        if (write.operandIndex !== 1)
        {
            throw new Error(`WGSL vertex instruction ${instruction.index} does not support the ${op} high result`);
        }
        return `(${source(2)} * ${source(3)})`;
    }
    if (op === "udiv")
    {
        const divisor = instruction.operands[3];
        const lanes = (divisor?.immediateValues || []).map((value) => value.uint32);
        const operator = write.operandIndex === 0 ? "/" : write.operandIndex === 1 ? "%" : null;
        if (!operator) throw new Error(`WGSL vertex udiv instruction ${instruction.index} has an unexpected destination operand`);
        if (divisor?.typeName === "immediate32" && (divisor.modifierName ?? "none") === "none" && lanes.length
            && lanes.every((value) => Number.isInteger(value) && value !== 0))
        {
            return `(${source(2)} ${operator} ${source(3)})`;
        }
        const dividendCode = source(2);
        const divisorCode = source(3);
        return `select(${fullMask(count)}, (${dividendCode} ${operator} max(${divisorCode}, ${oneMask(count)})), ${divisorCode} != ${zeroMask(count)})`;
    }
    if (op === "and") return `(${source(1)} & ${source(2)})`;
    if (op === "or") return `(${source(1)} | ${source(2)})`;
    if (op === "xor") return `(${source(1)} ^ ${source(2)})`;
    if (op === "ushr") return `(${source(1)} >> ${source(2)})`;
    if ([ "lt", "ge", "eq", "ne", "ilt", "ige", "ieq", "ine", "ult", "uge" ].includes(op))
    {
        const operator = { lt: "<", ge: ">=", eq: "==", ne: "!=", ilt: "<", ige: ">=", ieq: "==", ine: "!=", ult: "<", uge: ">=" }[op];
        return `select(${zeroMask(count)}, ${fullMask(count)}, ${source(1)} ${operator} ${source(2)})`;
    }
    if (op === "mov") return source(1);
    if (op === "movc") return `select(${source(3)}, ${source(2)}, ${source(1)} != ${zeroMask(count)})`;
    if (op === "exp") return `exp2(${source(1)})`;
    if (op === "log") return `log2(${source(1)})`;
    if (op === "rcp")
    {
        validateRcpImmediate(program, instruction, write);
        return `(${floatBound(count, "1.0")} / ${source(1)})`;
    }
    if (op === "rsq") return `inverseSqrt(${source(1)})`;
    if (op === "sqrt") return `sqrt(${source(1)})`;
    if ([ "max", "imax", "umax" ].includes(op)) return `max(${source(1)}, ${source(2)})`;
    if ([ "min", "imin", "umin" ].includes(op)) return `min(${source(1)}, ${source(2)})`;
    if (op === "ishl") return `(${source(1)} << u32(${source(2)}))`;
    if (op === "ishr") return `(${source(1)} >> u32(${source(2)}))`;
    if (op === "frc") return `fract(${source(1)})`;
    if (op === "round_ni") return `floor(${source(1)})`;
    if (op === "round_pi") return `ceil(${source(1)})`;
    if (op === "round_z") return `trunc(${source(1)})`;
    if (op === "sincos")
    {
        const fn = write.operandIndex === 0 ? "sin" : write.operandIndex === 1 ? "cos" : null;
        if (!fn) throw new Error(`WGSL vertex sincos instruction ${instruction.index} has an unexpected destination operand`);
        return `${fn}(${source(2)})`;
    }
    if (op === "ld_structured") return structuredLoadExpression(program, instruction, write, type, inputs, bindings);
    if (op === "ld")
    {
        const resource = validateFixedHandleOperand(instruction, 2, "resource", "vertex");
        const bufferBinding = bindingForOperand(bindings, "sampled-resource", resource);
        if (!bufferBinding) throw new Error(`WGSL vertex instruction ${instruction.index} has an unresolved load resource`);
        if (!bufferBinding.buffer || Number.isInteger(bufferBinding.structureStride))
        {
            throw new Error(`WGSL vertex load instruction ${instruction.index} resource shape is not supported; only typed buffers are supported`);
        }
        // Typed Buffer SRV: storage-array element fetch. D3D ld returns
        // zero out of bounds. Clamp the eagerly evaluated WGSL load itself
        // before selecting zero so no invalid memory reference is formed.
        const element = bufferBinding.type.slice("array<".length, -1);
        const address = source(1, 1);
        const symbol = bufferBinding.generatedSymbol;
        const length = `arrayLength(&${symbol})`;
        const loaded = `select(${element}(), ${symbol}[min(${address}, ${length} - 1u)], ${address} < ${length})`;
        const components = sourceComponents(resource, write.mask, count);
        return count === 4 && components.join("") === "xyzw" ? loaded : `${loaded}.${components.join("")}`;
    }
    if (op === "sample_l" || op === "sample_d")
    {
        const resource = validateFixedHandleOperand(instruction, 2, "resource", "vertex");
        const sampler = validateFixedHandleOperand(instruction, 3, "sampler", "vertex");
        const textureBinding = bindingForOperand(bindings, "sampled-resource", resource);
        const samplerBinding = bindingForOperand(bindings, "sampler", sampler);
        if (!textureBinding || !samplerBinding) throw new Error(`WGSL vertex instruction ${instruction.index} has unresolved sample bindings`);
        const viewDimension = textureBinding.texture?.viewDimension;
        const coordComponents = viewDimension === "2d" ? 2 : 3;
        const gradientComponents = [ "2d", "2d-array" ].includes(viewDimension) ? 2 : 3;
        let coord;
        let arrayArg = "";
        if (viewDimension === "2d-array")
        {
            const coord3 = source(1, 3);
            coord = `${coord3}.xy`;
            arrayArg = `, i32(round(${coord3}.z))`;
        }
        else
        {
            coord = source(1, coordComponents);
        }
        const tex = `${textureBinding.generatedSymbol}, ${samplerBinding.generatedSymbol}`;
        const offsetArg = sampleOffsetArgument(instruction, viewDimension);
        const sampled = op === "sample_l"
            ? `textureSampleLevel(${tex}, ${coord}${arrayArg}, ${source(4, 1)}${offsetArg})`
            : `textureSampleGrad(${tex}, ${coord}${arrayArg}, ${source(4, gradientComponents)}, ${source(5, gradientComponents)}${offsetArg})`;
        const components = sourceComponents(resource, write.mask, count);
        return count === 4 && components.join("") === "xyzw" ? sampled : `${sampled}.${components.join("")}`;
    }
    if (op === "dp2") return splatScalar(`dot(${source(1, 2)}, ${source(2, 2)})`, count);
    if (op === "dp3") return splatScalar(`dot(${source(1, 3)}, ${source(2, 3)})`, count);
    if (op === "dp4") return splatScalar(`dot(${source(1, 4)}, ${source(2, 4)})`, count);
    if (NUMERIC_CONVERSIONS[op])
    {
        const conversion = instruction.typeInfo.conversion;
        const [ from, to ] = NUMERIC_CONVERSIONS[op];
        if (conversion?.from !== from || conversion?.to !== to)
        {
            throw new Error(`WGSL vertex instruction ${instruction.index} has invalid ${op} conversion metadata`);
        }
        return `${fieldType(to, count)}(${source(1)})`;
    }
    throw new Error(`WGSL vertex opcode ${op} at instruction ${instruction.index} is not supported`);
}

function applyResultBitcast(program, instruction, write, expression, type)
{
    const components = Array.from(write.mask);
    const records = instruction.typeInfo.bitcasts.filter((entry) => entry.kind === "result-bitcast"
        && entry.operandIndex === write.operandIndex && entry.valueId === write.valueId);
    if (!records.length) return expression;
    const intrinsicType = instruction.typeInfo.resultType;
    if (records.length !== components.length || records.some((entry) =>
        entry.from !== intrinsicType || entry.to !== type.scalarType)
        || components.some((component) => !records.some((entry) => entry.component === component)))
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} has unsupported result bitcasts`);
    }
    return reinterpretCode(expression, intrinsicType, type.scalarType, components.length,
        `instruction ${instruction.index} result`);
}

function lowerInstruction(program, instruction, inputs, outputs, bindings, written, readValueIds)
{
    if (!SUPPORTED_OPCODES.has(instruction.opcodeName))
    {
        throw new Error(`WGSL vertex opcode ${instruction.opcodeName} at instruction ${instruction.index} is not supported`);
    }
    const unsupportedExtension = instruction.extensions?.find((extension) =>
        !METADATA_OPCODE_EXTENSIONS.has(extension.typeName)
        && !(extension.typeName === "sample_controls"
            && SAMPLE_OFFSET_OPCODES.has(instruction.opcodeName)));
    if (unsupportedExtension)
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} opcode extension ${unsupportedExtension.typeName} is not supported`);
    }
    validatePreciseInstruction(instruction, "vertex");
    const imprecise = instruction.operands.find(unsupportedMinPrecision);
    if (imprecise)
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} minimum-precision kind ${imprecise.minPrecisionName} is not supported`);
    }
    validateRegisterBitcasts(program, instruction);
    if (instruction.opcodeName === "ld_structured" && instruction.saturate)
    {
        throw new Error(`WGSL vertex structured load ${instruction.index} cannot saturate its result`);
    }
    if (instruction.opcodeName === "ret")
    {
        for (const field of outputs)
        {
            const missing = field.components.filter((component) => !written.get(field.id).has(component));
            // A builtin output (SV_Position) must be fully written — zero is not a
            // meaningful position. A location varying (COLOR/TEXCOORD) left unwritten
            // is undefined under D3D; WGSL zero-initializes `var output`, so the
            // unwritten lanes read as 0 — a safe, valid choice. Some EVE shaders
            // (e.g. ui/ubershader3d) declare outputs a given permutation never fills.
            if (missing.length && field.attribute?.kind === "builtin")
            {
                throw new Error(`WGSL vertex output ${field.semanticName}${field.semanticIndex} leaves ${missing.join("")} unwritten before return`);
            }
        }
        return { kind: "return", instructionIndex: instruction.index, dxbcOffset: instruction.dxbcOffset };
    }
    const writes = instruction.dataflow.writes;
    if (!writes.length) throw new Error(`WGSL vertex instruction ${instruction.index} has no result write`);
    if (instruction.opcodeName === "sincos" || instruction.opcodeName === "udiv")
    {
        const destinationOperands = writes.map((write) => write.operandIndex);
        if (writes.length > 2 || new Set(destinationOperands).size !== writes.length
            || destinationOperands.some((operandIndex) => ![ 0, 1 ].includes(operandIndex)))
        {
            throw new Error(`WGSL vertex ${instruction.opcodeName} instruction ${instruction.index} has unsupported result writes`);
        }
        if (writes.length === 2 && writes[0].mask !== writes[1].mask)
        {
            throw new Error(`WGSL vertex ${instruction.opcodeName} instruction ${instruction.index} requires matching destination masks`);
        }
    }
    else if (writes.length !== 1)
    {
        throw new Error(`WGSL vertex instruction ${instruction.index} has unsupported multiple result writes`);
    }

    function lowerWrite(write)
    {
        const destination = instruction.operands[write.operandIndex];
        const indexableAddress = destination?.typeName === "indexable_temp"
            ? validateIndexableTempWrite(program, destination, write)
            : null;
        const localSsaDestination = destination?.typeName === "temp" || Boolean(indexableAddress);
        if (isDeadUntypedWrite(program, write, readValueIds, localSsaDestination)) return [];
        const mixedTypes = mixedImmediateTypes(program, write);
        if (mixedTypes)
        {
            if (instruction.opcodeName === "ld_structured" && localSsaDestination && !instruction.saturate)
            {
                const words = structuredLoadExpression(program, instruction, write, null, inputs, bindings);
                return Array.from(write.mask).map((component, laneIndex) => ({
                    kind: "let",
                    instructionIndex: instruction.index,
                    dxbcOffset: instruction.dxbcOffset,
                    name: `${write.valueId}_${component}`,
                    type: scalarTypeName(mixedTypes[laneIndex]),
                    expression: {
                        code: reinterpretCode(words[laneIndex], "uint32", mixedTypes[laneIndex], 1, `structured load ${instruction.index}`),
                        type: scalarTypeName(mixedTypes[laneIndex])
                    }
                }));
            }
            const intrinsic = instruction.typeInfo.resultType;
            if (localSsaDestination && scalarTypeName(intrinsic) && instruction.opcodeName !== "mov")
            {
                let packedCode = expressionFor(program, instruction, write,
                    { scalarType: intrinsic, wgslType: fieldType(intrinsic, write.mask.length) }, inputs, bindings);
                if (instruction.saturate)
                {
                    if (intrinsic !== "float32") throw new Error(`WGSL vertex instruction ${instruction.index} saturates a non-float result`);
                    packedCode = `clamp(${packedCode}, ${floatBound(write.mask.length, "0.0")}, ${floatBound(write.mask.length, "1.0")})`;
                }
                const packedName = `${write.valueId}_p`;
                const packedType = fieldType(intrinsic, write.mask.length);
                const statements = [ {
                    kind: "let", instructionIndex: instruction.index, dxbcOffset: instruction.dxbcOffset,
                    name: packedName, type: packedType, expression: { code: packedCode, type: packedType }
                } ];
                Array.from(write.mask).forEach((component, laneIndex) =>
                {
                    const laneType = mixedTypes[laneIndex];
                    const access = write.mask.length === 1 ? packedName : `${packedName}.${COMPONENTS[laneIndex]}`;
                    statements.push({
                        kind: "let", name: `${write.valueId}_${component}`, type: scalarTypeName(laneType),
                        expression: { code: reinterpretCode(access, intrinsic, laneType, 1, `mixed write ${instruction.index}`), type: scalarTypeName(laneType) }
                    });
                });
                return statements;
            }
            if (instruction.opcodeName === "movc" && localSsaDestination && !instruction.saturate)
            {
                return Array.from(write.mask).map((component, laneIndex) =>
                {
                    const laneType = mixedTypes[laneIndex];
                    const condition = operandLaneExpression(program, instruction, 1, write.mask, laneIndex, "uint32", inputs, bindings);
                    const whenTrue = operandLaneExpression(program, instruction, 2, write.mask, laneIndex, laneType, inputs, bindings, true);
                    const whenFalse = operandLaneExpression(program, instruction, 3, write.mask, laneIndex, laneType, inputs, bindings, true);
                    return {
                        kind: "let",
                        instructionIndex: instruction.index,
                        dxbcOffset: instruction.dxbcOffset,
                        name: `${write.valueId}_${component}`,
                        type: scalarTypeName(laneType),
                        expression: {
                            code: `select(${whenFalse}, ${whenTrue}, ${condition} != 0u)`,
                            type: scalarTypeName(laneType)
                        }
                    };
                });
            }
            const immediateSource = instruction.operands[1];
            if (instruction.opcodeName !== "mov" || instruction.saturate
                || !localSsaDestination || immediateSource?.typeName !== "immediate32")
            {
                throw new Error(`WGSL vertex value ${write.valueId} has an unresolved or mixed result type that is not supported`);
            }
            return Array.from(write.mask).map((component, laneIndex) => ({
                kind: "let",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset,
                name: `${write.valueId}_${component}`,
                type: scalarTypeName(mixedTypes[laneIndex]),
                expression: {
                    code: immediateParts(immediateSource, component, 1, mixedTypes[laneIndex])[0],
                    type: scalarTypeName(mixedTypes[laneIndex])
                }
            }));
        }
        const type = valueType(program, write);
        let expression = expressionFor(program, instruction, write, type, inputs, bindings);
        if (instruction.saturate)
        {
            const clampBounds = `${floatBound(write.mask.length, "0.0")}, ${floatBound(write.mask.length, "1.0")}`;
            if (instruction.typeInfo.resultType === "float32")
            {
                expression = `clamp(${expression}, ${clampBounds})`;
            }
            else if ([ "mov", "movc" ].includes(instruction.opcodeName)
                && [ "int32", "uint32", "bitpattern32" ].includes(type.scalarType))
            {
                // D3D saturate assumes float data (like source modifiers); on a
                // bit-preserving mover whose lanes resolved to integer storage,
                // clamp the float interpretation of the bits and keep the storage.
                const floatType = fieldType("float32", write.mask.length);
                expression = `bitcast<${type.wgslType}>(clamp(bitcast<${floatType}>(${expression}), ${clampBounds}))`;
            }
            else
            {
                throw new Error(`WGSL vertex instruction ${instruction.index} saturates a non-float result`);
            }
        }
        expression = applyResultBitcast(program, instruction, write, expression, type);
        if (destination.typeName === "output")
        {
            const field = outputs.find((entry) => entry.registerIndex === destination.registerIndex);
            if (!field) throw new Error(`WGSL vertex instruction ${instruction.index} references undeclared output r${destination.registerIndex}`);
            const components = Array.from(write.mask).map((component) => packedComponent(field.components.join(""), component));
            const outputType = fieldType(field.scalarType, write.mask.length);
            const assignmentExpression = reinterpretCode(expression, type.scalarType, field.scalarType, write.mask.length,
                `output r${destination.registerIndex}`);
            Array.from(write.mask).forEach((component) => written.get(field.id).add(component));
            const assignment = {
                kind: "assignment",
                target: { fieldId: field.id, components, type: outputType },
                expression: { code: assignmentExpression, type: outputType }
            };
            if (!readValueIds.has(write.valueId))
            {
                return { ...assignment, instructionIndex: instruction.index, dxbcOffset: instruction.dxbcOffset };
            }
            return [
                {
                    kind: "let",
                    instructionIndex: instruction.index,
                    dxbcOffset: instruction.dxbcOffset,
                    name: write.valueId,
                    type: type.wgslType,
                    expression: { code: expression, type: type.wgslType }
                },
                {
                    ...assignment,
                    expression: {
                        code: reinterpretCode(write.valueId, type.scalarType, field.scalarType, write.mask.length,
                            `output r${destination.registerIndex}`),
                        type: outputType
                    }
                }
            ];
        }
        if (!localSsaDestination)
        {
            throw new Error(`WGSL vertex instruction ${instruction.index} writes unsupported ${destination.typeName}`);
        }
        return {
            kind: "let",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            name: write.valueId,
            type: type.wgslType,
            expression: { code: expression, type: type.wgslType }
        };
    }

    const statements = writes.flatMap((write) => lowerWrite(write));
    return statements.length === 1 ? statements[0] : statements;
}

/**
 * Lowers the bounded straight-line vertex slice into typed SSA expressions,
 * interface assignments, and canonical uniform-buffer bindings.
 *
 * @param {object} program Frozen CJS shader IR.
 * @returns {object} Frozen typed vertex program.
 */
export function lowerVertexProgram(program, options = {})
{
    if (program?.format !== "CJS_SHADER_IR") throw new TypeError("WGSL vertex lowering expects CJS_SHADER_IR input");
    if (program.stage !== "vertex") throw new Error(`WGSL vertex lowering cannot lower ${program.stage}`);
    if (program.shaderModel.major !== 5 || ![ 0, 1 ].includes(program.shaderModel.minor))
    {
        throw new Error("WGSL vertex body slice currently supports only SM5.0/SM5.1");
    }
    requireRefactoringAllowed(program, "vertex");
    const liveRegisters = liveInputRegisters(program);
    const inputs = interfaceFields(program, "input").filter((field) => liveRegisters.has(field.registerIndex));
    const outputs = interfaceFields(program, "output");
    // Mirror the fragment stage's non-default interpolation modes (recorded on
    // the pass-global plan) — WebGPU requires both sides of a location to match.
    for (const field of outputs)
    {
        const interpolation = options.bindingPlan?.varyingInterpolation?.[field.registerIndex];
        if (interpolation && field.attribute.kind === "location") field.interpolation = interpolation;
    }
    for (const fields of [ inputs, outputs ])
    {
        if (new Set(fields.map((field) => field.registerIndex)).size !== fields.length)
        {
            throw new Error("WGSL vertex body slice does not support packed signature registers");
        }
    }
    const bindings = lowerBindingLayout(program, options.bindingPlan);
    if (bindings.some((binding) => ![ "uniform-buffer", "sampled-resource", "sampler" ].includes(binding.resourceKind)))
    {
        throw new Error("WGSL vertex body slice supports only uniform, texture, sampler, and read-only structured-buffer bindings");
    }
    const plans = buildSelectionPlans(program, "vertex");
    const written = new Map(outputs.map((field) => [ field.id, new Set() ]));
    const reachableInstructions = new Set(program.blocks
        .filter((block) => block.reachable !== false)
        .flatMap((block) => block.instructionIndices));
    const readValueIds = new Set([
        ...program.instructions.flatMap((instruction) => (reachableInstructions.has(instruction.index)
            ? instruction.dataflow.reads.flatMap((read) => read.refs.map((ref) => ref.valueId))
            : [])),
        ...program.values.flatMap((value) => (value.incoming || []).map((incoming) => incoming.valueId))
    ]);

    function exitMergeAssignments(loopExit, breakIndex)
    {
        return (loopExit?.get(breakIndex) || []).map((assign) => ({
            kind: "value-assignment", name: assign.id, type: assign.type,
            expression: { code: valueReference(program, assign.ref, inputs), type: assign.type }
        }));
    }

    function lowerRange(start, end, rangeWritten, inLoop = false, loopExit = null)
    {
        const statements = [];
        for (let index = start; index < end; index += 1)
        {
            if (!reachableInstructions.has(index)) continue;
            const plan = plans.get(index);
            if (!plan)
            {
                const marker = program.instructions[index].opcodeName;
                if (marker === "break" || marker === "breakc")
                {
                    if (!inLoop) throw new Error(`WGSL vertex has an unmatched ${marker} at instruction ${index}`);
                    const breakInstruction = program.instructions[index];
                    if (marker === "break")
                    {
                        statements.push(...exitMergeAssignments(loopExit, breakInstruction.index));
                        statements.push({ kind: "break", instructionIndex: breakInstruction.index, dxbcOffset: breakInstruction.dxbcOffset });
                        continue;
                    }
                    validatePreciseInstruction(breakInstruction, "vertex");
                    validateRegisterBitcasts(program, breakInstruction);
                    const conditionOperand = breakInstruction.operands[0];
                    const conditionRead = sourceRead(breakInstruction, 0);
                    if (breakInstruction.saturate || (conditionOperand?.modifierName || "none") !== "none"
                        || !COMPONENTS.includes(conditionOperand?.selected) || conditionRead?.refs.length !== 1
                        || ![ "zero", "nonzero" ].includes(breakInstruction.testBoolean))
                    {
                        throw new Error(`WGSL vertex breakc instruction ${breakInstruction.index} requires one unmodified scalar condition`);
                    }
                    const condition = operandExpression(program, breakInstruction, 0, "x", 1, inputs, bindings);
                    statements.push({
                        kind: "if",
                        instructionIndex: breakInstruction.index,
                        dxbcOffset: breakInstruction.dxbcOffset,
                        condition: { code: `${condition} ${breakInstruction.testBoolean === "zero" ? "==" : "!="} 0u`, type: "bool" },
                        statements: [ ...exitMergeAssignments(loopExit, breakInstruction.index), { kind: "break" } ]
                    });
                    continue;
                }
                if (marker === "continue" || marker === "continuec")
                {
                    if (!inLoop) throw new Error(`WGSL vertex has an unmatched ${marker} at instruction ${index}`);
                    const continueInstruction = program.instructions[index];
                    if (marker === "continue")
                    {
                        statements.push({ kind: "continue", instructionIndex: continueInstruction.index, dxbcOffset: continueInstruction.dxbcOffset });
                        continue;
                    }
                    validatePreciseInstruction(continueInstruction, "vertex");
                    validateRegisterBitcasts(program, continueInstruction);
                    const conditionOperand = continueInstruction.operands[0];
                    const conditionRead = sourceRead(continueInstruction, 0);
                    if (continueInstruction.saturate || (conditionOperand?.modifierName || "none") !== "none"
                        || !COMPONENTS.includes(conditionOperand?.selected) || conditionRead?.refs.length !== 1
                        || ![ "zero", "nonzero" ].includes(continueInstruction.testBoolean))
                    {
                        throw new Error(`WGSL vertex continuec instruction ${continueInstruction.index} requires one unmodified scalar condition`);
                    }
                    const condition = operandExpression(program, continueInstruction, 0, "x", 1, inputs, bindings);
                    statements.push({
                        kind: "if",
                        instructionIndex: continueInstruction.index,
                        dxbcOffset: continueInstruction.dxbcOffset,
                        condition: { code: `${condition} ${continueInstruction.testBoolean === "zero" ? "==" : "!="} 0u`, type: "bool" },
                        statements: [ { kind: "continue" } ]
                    });
                    continue;
                }
                if ([ "endif", "else", "case", "default", "endswitch", "endloop" ].includes(marker))
                {
                    throw new Error(`WGSL vertex has an unmatched ${marker} at instruction ${index}`);
                }
                const lowered = lowerInstruction(
                    program, program.instructions[index], inputs, outputs, bindings, rangeWritten, readValueIds);
                statements.push(...(Array.isArray(lowered) ? lowered : [ lowered ]));
                continue;
            }
            if (plan.kind === "loop")
            {
                const loopInstruction = program.instructions[index];
                if (loopInstruction.opcodeName !== "loop"
                    || program.instructions[plan.region.endInstruction].opcodeName !== "endloop")
                {
                    throw new Error("WGSL vertex loop boundaries are malformed");
                }
                for (const merge of plan.merges)
                {
                    statements.push({ kind: "var", name: merge.id, type: merge.type,
                        expression: { code: valueReference(program, merge.entryIncoming, inputs), type: merge.type } });
                }
                for (const merge of plan.exitMerges || [])
                {
                    statements.push({ kind: "var", name: merge.id, type: merge.type,
                        expression: { code: merge.zeroCode, type: merge.type } });
                }
                const bodyWritten = cloneWritten(rangeWritten);
                const body = lowerRange(index + 1, plan.region.endInstruction, bodyWritten, true, plan.exitEdges);
                if (body.at(-1)?.kind === "return")
                {
                    throw new Error(`WGSL vertex loop at ${index} terminates before latch assignments`);
                }
                // Latch phi updates go in a `continuing` block so they run on both
                // fall-through and `continue` paths.
                const latch = plan.merges.map((merge) => ({ kind: "value-assignment", name: merge.id, type: merge.type,
                    expression: { code: valueReference(program, merge.backedgeIncoming, inputs), type: merge.type } }));
                statements.push({ kind: "loop", instructionIndex: loopInstruction.index, dxbcOffset: loopInstruction.dxbcOffset,
                    statements: body, continuing: latch });
                index = plan.region.endInstruction;
                continue;
            }
            if (plan.kind === "switch")
            {
                const switchInstruction = program.instructions[index];
                if (switchInstruction.opcodeName !== "switch"
                    || program.instructions[plan.region.endInstruction].opcodeName !== "endswitch")
                {
                    throw new Error("WGSL vertex switch boundaries are malformed");
                }
                validatePreciseInstruction(switchInstruction, "vertex");
                validateRegisterBitcasts(program, switchInstruction);
                const selectorOperand = switchInstruction.operands[0];
                const selectorRead = sourceRead(switchInstruction, 0);
                if (switchInstruction.saturate || (selectorOperand?.modifierName || "none") !== "none"
                    || !COMPONENTS.includes(selectorOperand?.selected) || selectorRead?.refs.length !== 1)
                {
                    throw new Error(`WGSL vertex switch instruction ${switchInstruction.index} requires one unmodified scalar selector`);
                }
                for (const merge of plan.merges)
                {
                    statements.push({ kind: "var", name: merge.id, type: merge.type, expression: { code: merge.zeroCode, type: merge.type } });
                }
                const selector = operandExpression(program, switchInstruction, 0, "x", 1, inputs, bindings);
                const clauses = [];
                const clauseResults = [];
                for (let clauseIndex = 0; clauseIndex < plan.clauses.length; clauseIndex += 1)
                {
                    const clause = plan.clauses[clauseIndex];
                    const clauseWritten = cloneWritten(rangeWritten);
                    const body = lowerRange(clause.bodyStart, clause.bodyEnd, clauseWritten, false, loopExit);
                    if ((plan.merges.length || plan.outerMerges?.length) && containsOutputAssignment(body))
                    {
                        throw new Error(`WGSL vertex switch at ${index} writes output before a live merge`);
                    }
                    if (body.at(-1)?.kind === "return" && (plan.merges.length || plan.outerMerges?.length))
                    {
                        throw new Error(`WGSL vertex switch at ${index} terminates before merge assignments`);
                    }
                    for (const merge of [ ...plan.merges, ...(plan.outerMerges || []) ])
                    {
                        body.push({
                            kind: "value-assignment",
                            name: merge.id,
                            type: merge.type,
                            expression: { code: valueReference(program, merge.perClause[clauseIndex], inputs), type: merge.type }
                        });
                    }
                    clauses.push({ selectors: clause.selectors, isDefault: clause.isDefault, statements: body });
                    clauseResults.push({ clauseWritten, returns: body.at(-1)?.kind === "return" });
                }
                statements.push({
                    kind: "switch",
                    instructionIndex: switchInstruction.index,
                    dxbcOffset: switchInstruction.dxbcOffset,
                    selector: { code: selector, type: "u32" },
                    clauses
                });
                if (plan.region.defaultInstruction !== null)
                {
                    const continuing = clauseResults.filter((entry) => !entry.returns);
                    for (const [ fieldId, target ] of rangeWritten)
                    {
                        if (!continuing.length) break;
                        const sets = continuing.map((entry) => entry.clauseWritten.get(fieldId) || new Set());
                        for (const component of sets[0])
                        {
                            if (sets.every((set) => set.has(component))) target.add(component);
                        }
                    }
                }
                if (terminatesAllPaths(statements))
                {
                    return statements;
                }
                index = plan.region.endInstruction;
                continue;
            }
            const ifInstruction = program.instructions[index];
            const endInstruction = program.instructions[plan.region.endInstruction];
            if (ifInstruction.opcodeName !== "if" || endInstruction.opcodeName !== "endif"
                || (plan.hasElse && program.instructions[plan.region.elseInstruction].opcodeName !== "else"))
            {
                throw new Error("WGSL vertex selection boundaries are malformed");
            }
            validatePreciseInstruction(ifInstruction, "vertex");
            validateRegisterBitcasts(program, ifInstruction);
            const conditionOperand = ifInstruction.operands[0];
            const conditionRead = sourceRead(ifInstruction, 0);
            if (ifInstruction.saturate || (conditionOperand?.modifierName || "none") !== "none"
                || !COMPONENTS.includes(conditionOperand?.selected) || conditionRead?.refs.length !== 1)
            {
                throw new Error(`WGSL vertex if instruction ${ifInstruction.index} requires one unmodified scalar condition`);
            }
            for (const merge of plan.merges)
            {
                const expression = plan.hasElse
                    ? merge.zeroCode
                    : (merge.falseCode || valueReference(program, merge.falseIncoming, inputs));
                statements.push({ kind: "var", name: merge.id, type: merge.type, expression: { code: expression, type: merge.type } });
            }
            const condition = operandExpression(program, ifInstruction, 0, "x", 1, inputs, bindings);
            const comparison = ifInstruction.testBoolean === "zero" ? "==" : "!=";
            const trueBodyEnd = plan.hasElse ? plan.region.elseInstruction : plan.region.endInstruction;
            const trueWritten = cloneWritten(rangeWritten);
            const trueStatements = lowerRange(index + 1, trueBodyEnd, trueWritten, inLoop, loopExit);
            if (trueStatements.at(-1)?.kind === "return" && plan.merges.length)
            {
                throw new Error(`WGSL vertex selection at ${index} terminates before merge assignments`);
            }
            for (const merge of plan.merges)
            {
                if (merge.viaSwitch) continue;
                trueStatements.push({
                    kind: "value-assignment",
                    name: merge.id,
                    type: merge.type,
                    expression: { code: valueReference(program, merge.trueIncoming, inputs), type: merge.type }
                });
            }
            let falseStatements = null;
            let falseWritten = null;
            if (plan.hasElse)
            {
                falseWritten = cloneWritten(rangeWritten);
                falseStatements = lowerRange(plan.region.elseInstruction + 1, plan.region.endInstruction, falseWritten, inLoop, loopExit);
                if (falseStatements.at(-1)?.kind === "return" && plan.merges.length)
                {
                    throw new Error(`WGSL vertex selection at ${index} terminates before merge assignments`);
                }
                for (const merge of plan.merges)
                {
                    falseStatements.push({
                        kind: "value-assignment",
                        name: merge.id,
                        type: merge.type,
                        expression: { code: merge.falseCode || valueReference(program, merge.falseIncoming, inputs), type: merge.type }
                    });
                }
            }
            statements.push({
                kind: "if",
                instructionIndex: ifInstruction.index,
                dxbcOffset: ifInstruction.dxbcOffset,
                condition: { code: `${condition} ${comparison} 0u`, type: "bool" },
                statements: trueStatements,
                ...(falseStatements ? { elseStatements: falseStatements } : {})
            });
            if (plan.hasElse)
            {
                const trueReturns = trueStatements.at(-1)?.kind === "return";
                const falseReturns = falseStatements.at(-1)?.kind === "return";
                for (const [ fieldId, target ] of rangeWritten)
                {
                    const fromTrue = trueWritten.get(fieldId) || new Set();
                    const fromFalse = falseWritten.get(fieldId) || new Set();
                    if (trueReturns && !falseReturns) for (const component of fromFalse) target.add(component);
                    else if (falseReturns && !trueReturns) for (const component of fromTrue) target.add(component);
                    else if (!trueReturns && !falseReturns)
                    {
                        for (const component of fromTrue) if (fromFalse.has(component)) target.add(component);
                    }
                }
            }
            if (terminatesAllPaths(statements))
            {
                return statements;
            }
            index = plan.region.endInstruction;
        }
        return statements;
    }

    const lowered = lowerRange(0, program.instructions.length, written);
    if (!terminatesAllPaths(lowered)) throw new Error("WGSL vertex path must end in return");
    const statements = hoistEscapingValues(lowered);

    return deepFreeze({
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "vertex",
        entryPoint: "main",
        interface: { inputs, outputs },
        bindings,
        immediateConstantBuffer: program.immediateConstantBuffer || null,
        constTables: program.constTables || null,
        statements
    });
}
