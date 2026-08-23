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
    "dcl_resource_structured",
    "dcl_resource_structured",
    "dcl_unordered_access_view_structured",
    "dcl_input",
    "dcl_temps",
    "dcl_thread_group"
]);
const BODY_OPCODES = Object.freeze([
    "ult", "if", "imad", "ld_structured", "iadd", "ld_structured",
    "ld_structured", "ld_structured", "ine", "if", "and", "ubfe", "ushr",
    "imad", "ld_structured", "and", "ubfe", "ushr", "utof", "utof", "mul",
    "iadd", "ld_structured", "ld_structured", "ld_structured", "iadd",
    "ld_structured", "ld_structured", "ld_structured", "mul", "mul", "mul",
    "mad", "mad", "mad", "ld_structured", "ld_structured", "ld_structured",
    "mad", "mad", "mad", "iadd", "ld_structured", "ld_structured",
    "ld_structured", "mad", "mad", "mad", "else", "and", "iadd",
    "ld_structured", "ld_structured", "ld_structured", "endif", "mov", "dp4",
    "dp4", "dp4", "imad", "store_structured", "iadd", "store_structured",
    "store_structured", "endif", "ret"
]);
const BODY_OPERANDS = Object.freeze([
    "temp:0:x:0: | input_thread_id::x:: | constant_buffer:3:x:3,0:",
    "temp:0:x:0:",
    "temp:0:xy:0: | input_thread_id::xxxx:: | constant_buffer:3:yyyy:3,0: | constant_buffer:3:zwzz:3,0:",
    "temp:1:x:1: | temp:0:x:0: | immediate32::::#0 | resource:1:xxxx:1:",
    "temp:0:xz:0: | temp:0:xxxx:0: | immediate32::::#1,#0,#2,#0",
    "temp:1:y:1: | temp:0:x:0: | immediate32::::#0 | resource:1:xxxx:1:",
    "temp:1:z:1: | temp:0:z:0: | immediate32::::#0 | resource:1:xxxx:1:",
    "temp:0:x:0: | temp:0:y:0: | immediate32::::#0 | resource:1:xxxx:1:",
    "temp:0:y:0: | constant_buffer:3:x:3,1: | immediate32::::#4294967295",
    "temp:0:y:0:",
    "temp:0:y:0: | temp:0:x:0: | immediate32::::#255",
    "temp:0:zw:0: | immediate32::::#0,#0,#8,#8 | immediate32::::#0,#0,#8,#16 | temp:0:xxxx:0:",
    "temp:2:x:2: | temp:0:x:0: | immediate32::::#24",
    "temp:2:y:2: | input_thread_id::x:: | constant_buffer:3:y:3,0: | constant_buffer:3:x:3,1:",
    "temp:2:y:2: | temp:2:y:2: | immediate32::::#0 | resource:1:xxxx:1:",
    "temp:2:z:2: | temp:2:y:2: | immediate32::::#255",
    "temp:3:xy:3: | immediate32::::#8,#8,#0,#0 | immediate32::::#8,#16,#0,#0 | temp:2:yyyy:2:",
    "temp:2:y:2: | temp:2:y:2: | immediate32::::#24",
    "temp:4:yz:4: | temp:3:xxyx:3:",
    "temp:4:xw:4: | temp:2:zzzy:2:",
    "temp:3:xyzw:3: | temp:4:xyzw:4: | immediate32::::#998277249,#998277249,#998277249,#998277249",
    "temp:0:y:0: | temp:0:y:0: | constant_buffer:3:y:3,1:",
    "temp:4:xyzw:4: | temp:0:y:0: | immediate32::::#0 | resource:0:xyzw:0:",
    "temp:5:xyzw:5: | temp:0:y:0: | immediate32::::#16 | resource:0:xyzw:0:",
    "temp:6:xyzw:6: | temp:0:y:0: | immediate32::::#32 | resource:0:xyzw:0:",
    "temp:0:yz:0: | temp:0:zzwz:0: | constant_buffer:3:yyyy:3,1:",
    "temp:7:xyzw:7: | temp:0:y:0: | immediate32::::#0 | resource:0:xyzw:0:",
    "temp:8:xyzw:8: | temp:0:y:0: | immediate32::::#16 | resource:0:xyzw:0:",
    "temp:9:xyzw:9: | temp:0:y:0: | immediate32::::#32 | resource:0:xyzw:0:",
    "temp:7:xyzw:7: | temp:3:yyyy:3: | temp:7:xyzw:7:",
    "temp:8:xyzw:8: | temp:3:yyyy:3: | temp:8:xyzw:8:",
    "temp:9:xyzw:9: | temp:3:yyyy:3: | temp:9:xyzw:9:",
    "temp:4:xyzw:4: | temp:4:xyzw:4: | temp:3:xxxx:3: | temp:7:xyzw:7:",
    "temp:5:xyzw:5: | temp:5:xyzw:5: | temp:3:xxxx:3: | temp:8:xyzw:8:",
    "temp:6:xyzw:6: | temp:6:xyzw:6: | temp:3:xxxx:3: | temp:9:xyzw:9:",
    "temp:7:xyzw:7: | temp:0:z:0: | immediate32::::#0 | resource:0:xyzw:0:",
    "temp:8:xyzw:8: | temp:0:z:0: | immediate32::::#16 | resource:0:xyzw:0:",
    "temp:9:xyzw:9: | temp:0:z:0: | immediate32::::#32 | resource:0:xyzw:0:",
    "temp:4:xyzw:4: | temp:7:xyzw:7: | temp:3:zzzz:3: | temp:4:xyzw:4:",
    "temp:5:xyzw:5: | temp:8:xyzw:8: | temp:3:zzzz:3: | temp:5:xyzw:5:",
    "temp:6:xyzw:6: | temp:9:xyzw:9: | temp:3:zzzz:3: | temp:6:xyzw:6:",
    "temp:0:y:0: | temp:2:x:2: | constant_buffer:3:y:3,1:",
    "temp:2:xyzw:2: | temp:0:y:0: | immediate32::::#0 | resource:0:xyzw:0:",
    "temp:7:xyzw:7: | temp:0:y:0: | immediate32::::#16 | resource:0:xyzw:0:",
    "temp:8:xyzw:8: | temp:0:y:0: | immediate32::::#32 | resource:0:xyzw:0:",
    "temp:2:xyzw:2: | temp:2:xyzw:2: | temp:3:wwww:3: | temp:4:xyzw:4:",
    "temp:4:xyzw:4: | temp:7:xyzw:7: | temp:3:wwww:3: | temp:5:xyzw:5:",
    "temp:3:xyzw:3: | temp:8:xyzw:8: | temp:3:wwww:3: | temp:6:xyzw:6:",
    "",
    "temp:0:x:0: | temp:0:x:0: | immediate32::::#255",
    "temp:0:x:0: | temp:0:x:0: | constant_buffer:3:y:3,1:",
    "temp:2:xyzw:2: | temp:0:x:0: | immediate32::::#0 | resource:0:xyzw:0:",
    "temp:4:xyzw:4: | temp:0:x:0: | immediate32::::#16 | resource:0:xyzw:0:",
    "temp:3:xyzw:3: | temp:0:x:0: | immediate32::::#32 | resource:0:xyzw:0:",
    "",
    "temp:1:w:1: | immediate32::::#1065353216",
    "temp:0:x:0: | temp:1:xyzw:1: | temp:2:xyzw:2:",
    "temp:0:y:0: | temp:1:xyzw:1: | temp:4:xyzw:4:",
    "temp:0:z:0: | temp:1:xyzw:1: | temp:3:xyzw:3:",
    "temp:0:w:0: | input_thread_id::x:: | immediate32::::#3 | constant_buffer:3:x:3,2:",
    "uav:0:x:0: | temp:0:w:0: | immediate32::::#0 | temp:0:x:0:",
    "temp:1:xy:1: | temp:0:wwww:0: | immediate32::::#1,#2,#0,#0",
    "uav:0:x:0: | temp:1:x:1: | immediate32::::#0 | temp:0:y:0:",
    "uav:0:x:0: | temp:1:y:1: | immediate32::::#0 | temp:0:z:0:",
    "",
    ""
]);
const BLOCK_BEFORE = new Set([ "else", "endif" ]);
const BLOCK_AFTER = new Set([ "if", "else", "endif", "ret" ]);
const CONTROL_KIND = Object.freeze({
    if: "selection",
    else: "selection",
    endif: "selection",
    ret: "termination"
});

function clonePlain(value)
{
    if (Array.isArray(value)) return value.map(clonePlain);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [ key, clonePlain(entry) ]));
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
        throw new Error("WGSL structured skinning compute CFG, SSA, or type metadata is inconsistent");
    }
}

function validateCommonOperand(operand, instruction, operandIndex)
{
    if (!operand
        || (operand.modifierName ?? "none") !== "none"
        || (operand.minPrecisionName ?? "default") !== "default"
        || operand.nonUniform === true)
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} requires default uniform unmodified data`);
    }
}

function validateFixedIndex(operand, instruction, operandIndex)
{
    const index = operand.indices?.[0];
    if (!Number.isInteger(operand.registerIndex) || operand.registerIndex < 0
        || operand.indices?.length !== 1
        || index?.relative
        || index?.values?.length !== 1
        || index.values[0] !== operand.registerIndex)
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} has an invalid fixed register identity`);
    }
}

function validateDestination(operand, instruction, operandIndex)
{
    validateCommonOperand(operand, instruction, operandIndex);
    validateFixedIndex(operand, instruction, operandIndex);
    if (operand.typeName !== "temp"
        || operand.registerIndex > 9
        || operand.componentCount !== 4
        || !/^(?:x|y|z|w|xy|xz|yz|zw|xw|xyzw)$/u.test(operand.mask)
        || operand.swizzle || operand.selected)
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} has an unsupported temp destination`);
    }
    return Array.from(operand.mask);
}

function validateScalarSource(operand, instruction, operandIndex, typeName = null)
{
    validateCommonOperand(operand, instruction, operandIndex);
    if (typeName && operand.typeName !== typeName)
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} requires ${typeName}`);
    }
    if (!COMPONENTS.includes(operand.selected) || operand.mask || operand.swizzle)
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} requires one selected scalar lane`);
    }
    if (operand.typeName === "temp")
    {
        validateFixedIndex(operand, instruction, operandIndex);
        if (operand.registerIndex > 9 || operand.componentCount !== 4)
        {
            throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} has an invalid temp source`);
        }
    }
    return operand;
}

function immediateValues(operand, instruction, operandIndex)
{
    validateCommonOperand(operand, instruction, operandIndex);
    if (operand.typeName !== "immediate32"
        || operand.registerIndex !== null
        || operand.indices?.length
        || operand.mask || operand.swizzle || operand.selected
        || ![ 1, 4 ].includes(operand.componentCount)
        || operand.immediateValues?.length !== operand.componentCount
        || operand.immediateValues.some((value) => !Number.isInteger(value?.uint32)))
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} requires canonical immediate32 data`);
    }
    return operand.immediateValues.map((value) => value.uint32 >>> 0);
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
        immediate
    ].join(":");
}

function instructionOperandSignature(instruction)
{
    return (instruction.operands || []).map(operandSignature).join(" | ");
}

function validateSource(operand, instruction, operandIndex)
{
    validateCommonOperand(operand, instruction, operandIndex);
    if (operand.mask || (operand.selected && operand.swizzle))
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} has an invalid source selector`);
    }
    if (operand.typeName === "temp")
    {
        validateFixedIndex(operand, instruction, operandIndex);
        if (operand.registerIndex > 9 || operand.componentCount !== 4
            || (!COMPONENTS.includes(operand.selected) && !/^[xyzw]{4}$/u.test(operand.swizzle)))
        {
            throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} has an invalid temp source`);
        }
        return;
    }
    if (operand.typeName === "constant_buffer")
    {
        const [ bufferIndex, rowIndex ] = operand.indices || [];
        if (operand.registerIndex !== 3
            || operand.componentCount !== 4
            || operand.indices?.length !== 2
            || bufferIndex?.relative || bufferIndex?.values?.length !== 1 || bufferIndex.values[0] !== 3
            || rowIndex?.relative || rowIndex?.values?.length !== 1
            || !Number.isInteger(rowIndex.values[0]) || rowIndex.values[0] < 0 || rowIndex.values[0] > 2
            || (!COMPONENTS.includes(operand.selected) && !/^[xyzw]{4}$/u.test(operand.swizzle)))
        {
            throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} has an invalid cb3 source`);
        }
        return;
    }
    if (operand.typeName === "input_thread_id")
    {
        if (operand.registerIndex !== null || operand.indices?.length || operand.componentCount !== 4
            || (!COMPONENTS.includes(operand.selected) && !/^[xyzw]{4}$/u.test(operand.swizzle))
            || Array.from(operand.selected || operand.swizzle).some((component) => component !== "x"))
        {
            throw new Error(`WGSL structured skinning instruction ${instruction.index} may read only input_thread_id.x`);
        }
        return;
    }
    if (operand.typeName === "immediate32")
    {
        immediateValues(operand, instruction, operandIndex);
        return;
    }
    throw new Error(`WGSL structured skinning instruction ${instruction.index} operand ${operandIndex} has unsupported source ${operand.typeName || "unknown"}`);
}

function selectedComponents(operand, activeComponents)
{
    if (operand.selected) return activeComponents.map(() => operand.selected);
    const swizzle = operand.swizzle || "xyzw";
    return activeComponents.map((component) => swizzle[COMPONENTS.indexOf(component)]);
}

function uintLiteral(value)
{
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}u`;
}

function sourceParts(instruction, operandIndex, activeComponents)
{
    const operand = instruction.operands[operandIndex];
    validateSource(operand, instruction, operandIndex);
    const components = selectedComponents(operand, activeComponents);
    if (operand.typeName === "temp")
    {
        return components.map((component) => `r${operand.registerIndex}.${component}`);
    }
    if (operand.typeName === "constant_buffer")
    {
        const row = operand.indices[1].values[0];
        return components.map((component) => `bitcast<u32>(cb3[${row}].${component})`);
    }
    if (operand.typeName === "input_thread_id")
    {
        return components.map((component) => `dispatch_thread_id.${component}`);
    }
    const values = immediateValues(operand, instruction, operandIndex);
    return components.map((component, index) =>
    {
        const sourceIndex = values.length === 1 ? 0 : COMPONENTS.indexOf(component);
        return uintLiteral(values[sourceIndex] ?? values[index]);
    });
}

function rawVector(parts)
{
    return parts.length === 1 ? parts[0] : `vec${parts.length}<u32>(${parts.join(", ")})`;
}

function floatVector(parts)
{
    const values = parts.map((part) => `bitcast<f32>(${part})`);
    return values.length === 1 ? values[0] : `vec${values.length}<f32>(${values.join(", ")})`;
}

function rawFloatExpression(code, count)
{
    return `bitcast<${count === 1 ? "u32" : `vec${count}<u32>`}>(${code})`;
}

function assignment(instruction, destination, parts)
{
    return {
        kind: "value-assignment",
        instructionIndex: instruction.index,
        dxbcOffset: instruction.dxbcOffset,
        name: `r${destination.registerIndex}.${destination.mask}`,
        type: destination.mask.length === 1 ? "u32" : `vec${destination.mask.length}<u32>`,
        expression: {
            code: rawVector(parts),
            type: destination.mask.length === 1 ? "u32" : `vec${destination.mask.length}<u32>`
        }
    };
}

function bindingForHandle(bindings, kind, operand, instruction, operandIndex)
{
    validateCommonOperand(operand, instruction, operandIndex);
    validateFixedIndex(operand, instruction, operandIndex);
    const typeName = kind === "sampled-resource" ? "resource" : "uav";
    if (operand.typeName !== typeName || operand.componentCount !== 4)
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} has an invalid ${typeName} handle`);
    }
    const binding = bindings.find((entry) =>
        entry.resourceKind === kind
        && entry.registerIndex === operand.registerIndex
        && entry.registerSpace === 0);
    if (!binding)
    {
        throw new Error(`WGSL structured skinning instruction ${instruction.index} has an unresolved ${kind} binding`);
    }
    return binding;
}

function safeStructuredLoad(program, instruction, bindings)
{
    if (instruction.operands.length !== 4)
    {
        throw new Error(`WGSL structured skinning load ${instruction.index} requires four operands`);
    }
    const destination = instruction.operands[0];
    const active = validateDestination(destination, instruction, 0);
    validateScalarSource(instruction.operands[1], instruction, 1, "temp");
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    const byteOffsets = immediateValues(instruction.operands[2], instruction, 2);
    if (byteOffsets.length !== 1 || byteOffsets[0] % 4 !== 0)
    {
        throw new Error(`WGSL structured skinning load ${instruction.index} requires one immediate DWORD byte offset`);
    }
    const resource = instruction.operands[3];
    if (!/^[xyzw]{4}$/u.test(resource.swizzle) || resource.mask || resource.selected)
    {
        throw new Error(`WGSL structured skinning load ${instruction.index} requires a four-lane resource swizzle`);
    }
    const binding = bindingForHandle(bindings, "sampled-resource", resource, instruction, 3);
    const strideWords = binding.structureStride / 4;
    const firstWord = byteOffsets[0] / 4;
    if ((binding.registerIndex === 0 && ![ 0, 4, 8 ].includes(firstWord))
        || (binding.registerIndex === 1 && firstWord !== 0))
    {
        throw new Error(`WGSL structured skinning load ${instruction.index} uses an unexpected structured byte offset`);
    }
    const wordCount = `arrayLength(&${binding.generatedSymbol})`;
    const addressInRange = `${address} < (${wordCount} / ${strideWords}u)`;
    const resourceComponents = selectedComponents(resource, active);
    const parts = resourceComponents.map((component) =>
    {
        const word = firstWord + COMPONENTS.indexOf(component);
        if (word < 0 || word >= strideWords)
        {
            throw new Error(`WGSL structured skinning load ${instruction.index} exceeds its ${binding.structureStride}-byte stride`);
        }
        const wordAddress = `((${address}) * ${strideWords}u) + ${word}u`;
        const safeWordAddress = `min(${wordAddress}, ${wordCount} - 1u)`;
        return `select(0u, ${binding.generatedSymbol}[${safeWordAddress}], ${addressInRange})`;
    });
    return assignment(instruction, destination, parts);
}

function structuredStore(program, instruction, bindings)
{
    void program;
    if (instruction.operands.length !== 4)
    {
        throw new Error(`WGSL structured skinning store ${instruction.index} requires four operands`);
    }
    const uav = instruction.operands[0];
    if (uav.mask !== "x" || uav.swizzle || uav.selected)
    {
        throw new Error(`WGSL structured skinning store ${instruction.index} requires the scalar x UAV mask`);
    }
    const binding = bindingForHandle(bindings, "storage-resource", uav, instruction, 0);
    if (binding.structureStride !== 4 || binding.type !== "array<u32>")
    {
        throw new Error(`WGSL structured skinning store ${instruction.index} requires a stride-4 raw-word UAV`);
    }
    validateScalarSource(instruction.operands[1], instruction, 1, "temp");
    const address = sourceParts(instruction, 1, [ "x" ])[0];
    const byteOffsets = immediateValues(instruction.operands[2], instruction, 2);
    if (byteOffsets.length !== 1 || byteOffsets[0] !== 0)
    {
        throw new Error(`WGSL structured skinning store ${instruction.index} requires byte offset zero`);
    }
    validateScalarSource(instruction.operands[3], instruction, 3, "temp");
    const value = sourceParts(instruction, 3, [ "x" ])[0];
    return {
        kind: "if",
        instructionIndex: instruction.index,
        dxbcOffset: instruction.dxbcOffset,
        condition: { code: `${address} < arrayLength(&${binding.generatedSymbol})`, type: "bool" },
        statements: [ {
            kind: "call",
            instructionIndex: instruction.index,
            dxbcOffset: instruction.dxbcOffset,
            expression: {
                code: `${binding.generatedSymbol}[${address}] = ${value}`,
                type: "void"
            }
        } ]
    };
}

function aluStatement(instruction)
{
    const destination = instruction.operands[0];
    const active = validateDestination(destination, instruction, 0);
    const count = active.length;
    const source = (operandIndex) => sourceParts(instruction, operandIndex, active);
    let parts;
    switch (instruction.opcodeName)
    {
        case "ult":
        case "ine":
        {
            if (instruction.operands.length !== 3) break;
            const left = source(1);
            const right = source(2);
            const operator = instruction.opcodeName === "ult" ? "<" : "!=";
            parts = left.map((part, index) =>
                `select(0u, 0xffffffffu, ${part} ${operator} ${right[index]})`);
            break;
        }
        case "imad":
        {
            if (instruction.operands.length !== 4) break;
            const left = source(1);
            const right = source(2);
            const addend = source(3);
            parts = left.map((part, index) => `((${part} * ${right[index]}) + ${addend[index]})`);
            break;
        }
        case "iadd":
        case "and":
        case "ushr":
        {
            if (instruction.operands.length !== 3) break;
            const left = source(1);
            const right = source(2);
            const operator = { iadd: "+", and: "&", ushr: ">>" }[instruction.opcodeName];
            parts = left.map((part, index) => `(${part} ${operator} ${right[index]})`);
            break;
        }
        case "ubfe":
        {
            if (instruction.operands.length !== 4) break;
            const widths = immediateValues(instruction.operands[1], instruction, 1);
            const offsets = immediateValues(instruction.operands[2], instruction, 2);
            const values = source(3);
            const lanes = selectedComponents(instruction.operands[1], active);
            parts = lanes.map((component, index) =>
            {
                const lane = COMPONENTS.indexOf(component);
                const width = widths.length === 1 ? widths[0] : widths[lane];
                const offset = offsets.length === 1 ? offsets[0] : offsets[lane];
                if (width !== 8 || ![ 8, 16 ].includes(offset))
                {
                    throw new Error(`WGSL structured skinning ubfe ${instruction.index} requires the bounded 8-bit packed fields`);
                }
                return `((${values[index]} >> ${uintLiteral(offset)}) & 0x000000ffu)`;
            });
            break;
        }
        case "utof":
        {
            if (instruction.operands.length !== 2) break;
            parts = source(1).map((part) => `bitcast<u32>(f32(${part}))`);
            break;
        }
        case "mul":
        case "mad":
        {
            const expected = instruction.opcodeName === "mul" ? 3 : 4;
            if (instruction.operands.length !== expected) break;
            const left = source(1);
            const right = source(2);
            const addend = instruction.opcodeName === "mad" ? source(3) : null;
            parts = left.map((part, index) =>
            {
                const product = `(bitcast<f32>(${part}) * bitcast<f32>(${right[index]}))`;
                const code = addend
                    ? `(${product} + bitcast<f32>(${addend[index]}))`
                    : product;
                return `bitcast<u32>(${code})`;
            });
            break;
        }
        case "mov":
            if (instruction.operands.length === 2) parts = source(1);
            break;
        case "dp4":
        {
            if (instruction.operands.length !== 3 || count !== 1) break;
            const left = sourceParts(instruction, 1, COMPONENTS);
            const right = sourceParts(instruction, 2, COMPONENTS);
            parts = [ rawFloatExpression(`dot(${floatVector(left)}, ${floatVector(right)})`, 1) ];
            break;
        }
        default:
            break;
    }
    if (!parts)
    {
        throw new Error(`WGSL structured skinning ${instruction.opcodeName} instruction ${instruction.index} has an unsupported operand shape`);
    }
    return assignment(instruction, destination, parts);
}

function validateDeclarationOperand(declaration, typeName, registerIndex)
{
    const operand = declaration.operands?.[0];
    validateCommonOperand(operand, { index: `declaration@${declaration.dxbcOffset}` }, 0);
    validateFixedIndex(operand, { index: `declaration@${declaration.dxbcOffset}` }, 0);
    if (declaration.operands.length !== 1
        || operand.typeName !== typeName
        || operand.registerIndex !== registerIndex
        || operand.componentCount !== 0
        || operand.mask || operand.swizzle || operand.selected)
    {
        throw new Error(`WGSL structured skinning declaration ${declaration.opcodeName} has a malformed handle`);
    }
}

function validateDeclarations(program)
{
    if (program?.format !== "CJS_SHADER_IR" || program.formatVersion !== 1
        || program.stage !== "compute"
        || program.shaderModel?.major !== 5 || program.shaderModel.minor !== 0)
    {
        throw new TypeError("WGSL structured skinning compute profile requires CJS SM5.0 compute IR");
    }
    if ((program.signatures?.input || []).length
        || (program.signatures?.output || []).length
        || (program.signatures?.patch || []).length
        || program.immediateConstantBuffer
        || program.constTables)
    {
        throw new Error("WGSL structured skinning compute profile does not support signatures or constant tables");
    }
    if (!isSkinVerticesComputeProfile(program))
    {
        throw new Error("WGSL structured skinning compute declaration shape is not supported");
    }
    requireRefactoringAllowed(program, "structured skinning compute");
    const [ global, cb, bone, input, output, builtin, temps, group ] = program.declarations;
    if (global.data?.globalFlags !== (1 << 11)
        || global.data.refactoringAllowed !== true
        || global.operands?.length)
    {
        throw new Error("WGSL structured skinning compute requires only the refactoring-allowed global flag");
    }
    if (cb.data?.registerIndex !== 3 || cb.data.sizeInVec4 !== 3
        || cb.data.accessPattern !== "immediate_indexed")
    {
        throw new Error("WGSL structured skinning compute requires immediate cb3 with three vec4 rows");
    }
    const cbOperand = cb.operands?.[0];
    validateCommonOperand(cbOperand, { index: `declaration@${cb.dxbcOffset}` }, 0);
    if (cb.operands?.length !== 1
        || cbOperand.typeName !== "constant_buffer"
        || cbOperand.registerIndex !== 3
        || cbOperand.componentCount !== 4
        || cbOperand.swizzle !== "xyzw"
        || cbOperand.mask || cbOperand.selected
        || cbOperand.indices?.length !== 2
        || cbOperand.indices.some((index) =>
            index.relative
            || index.values?.length !== 1
            || index.values[0] !== 3))
    {
        throw new Error("WGSL structured skinning compute requires the canonical cb3[3] declaration operand");
    }
    for (const [ declaration, typeName, registerIndex, stride ] of [
        [ bone, "resource", 0, 48 ],
        [ input, "resource", 1, 4 ],
        [ output, "uav", 0, 4 ]
    ])
    {
        if (declaration.data?.registerIndex !== registerIndex
            || declaration.data.structureStride !== stride
            || (typeName === "uav" && declaration.data.globallyCoherent !== false))
        {
            throw new Error(`WGSL structured skinning compute requires ${typeName}${registerIndex} stride ${stride}`);
        }
        validateDeclarationOperand(declaration, typeName, registerIndex);
    }
    const inputOperand = builtin.operands?.[0];
    validateCommonOperand(inputOperand, { index: `declaration@${builtin.dxbcOffset}` }, 0);
    if (builtin.data?.operandTypeName !== "input_thread_id"
        || builtin.data.registerIndex !== null
        || builtin.operands?.length !== 1
        || inputOperand.typeName !== "input_thread_id"
        || inputOperand.componentCount !== 4
        || inputOperand.mask !== "x"
        || inputOperand.registerIndex !== null
        || inputOperand.indices?.length
        || inputOperand.selected || inputOperand.swizzle)
    {
        throw new Error("WGSL structured skinning compute requires exactly input_thread_id.x");
    }
    if (temps.data?.tempCount !== 10
        || group.data?.threadGroupX !== 64
        || group.data?.threadGroupY !== 1
        || group.data?.threadGroupZ !== 1
        || temps.operands?.length
        || group.operands?.length)
    {
        throw new Error("WGSL structured skinning compute requires ten temps and dcl_thread_group 64,1,1");
    }
}

function validateBindings(bindings)
{
    const expected = [
        [ "uniform-buffer", 3, "cb3", "array<vec4<f32>, 3>", null, "uniform", 48 ],
        [ "sampled-resource", 0, "t0", "array<u32>", 48, "read-only-storage", 48 ],
        [ "sampled-resource", 1, "t1", "array<u32>", 4, "read-only-storage", 4 ],
        [ "storage-resource", 0, "u0", "array<u32>", 4, "storage", 4 ]
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
        throw new Error("WGSL structured skinning compute binding layout does not match cb3/t0/t1/u0");
    }
}

function validateBody(program)
{
    if (program.instructions?.length !== BODY_OPCODES.length
        || BODY_OPCODES.some((opcodeName, index) =>
            program.instructions[index]?.opcodeName !== opcodeName
            || instructionOperandSignature(program.instructions[index]) !== BODY_OPERANDS[index]))
    {
        throw new Error("WGSL structured skinning compute requires the exact bounded body opcode and operand sequence");
    }
    for (const [ index, instruction ] of program.instructions.entries())
    {
        const expectedControl = CONTROL_KIND[instruction.opcodeName] || null;
        const extensions = instruction.extensions || [];
        const resourceIndex = instruction.operands?.[3]?.registerIndex;
        const expectedStride = resourceIndex === 0 ? 48 : resourceIndex === 1 ? 4 : null;
        const hasValidExtensions = instruction.opcodeName === "ld_structured"
            ? validateSm50ResourceExtensions(extensions, {
                resourceDimension: 12,
                resourceDimensionName: "structured_buffer",
                structureStride: expectedStride,
                resourceReturnTypes: [ 6, 6, 6, 6 ]
            }, `WGSL structured skinning instruction ${index}`)
            : extensions.length === 0;
        if (instruction.index !== index
            || (index > 0 && instruction.dxbcOffset <= program.instructions[index - 1].dxbcOffset)
            || instruction.controlKind !== expectedControl
            || instruction.testBoolean !== (instruction.opcodeName === "if" ? "nonzero" : null)
            || instruction.saturate
            || instruction.preciseMask !== ""
            || !hasValidExtensions)
        {
            throw new Error(`WGSL structured skinning instruction ${index} has inconsistent envelope metadata`);
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
                throw new Error(`WGSL structured skinning instruction ${instruction.index} reads undefined register data`);
            }
        }
    }
    const plans = buildSelectionPlans(program, "structured skinning compute");
    if (plans.size !== 2
        || plans.get(1)?.kind !== "selection" || plans.get(1).hasElse || plans.get(1).merges.length
        || plans.get(9)?.kind !== "selection" || !plans.get(9).hasElse
        || plans.get(9).merges.length !== 12)
    {
        throw new Error("WGSL structured skinning compute requires the canonical nested selection and live merges");
    }
}

function lowerBody(program, bindings)
{
    const statements = Array.from({ length: 10 }, (_, registerIndex) => ({
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
            if (instruction.operands.length !== 1)
            {
                throw new Error(`WGSL structured skinning if ${instruction.index} requires one condition`);
            }
            validateScalarSource(instruction.operands[0], instruction, 0, "temp");
            const condition = sourceParts(instruction, 0, [ "x" ])[0];
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
        if (instruction.opcodeName === "else")
        {
            if (instruction.operands.length || !stack.length || stack.at(-1).statement.elseStatements)
            {
                throw new Error(`WGSL structured skinning else ${instruction.index} has malformed nesting`);
            }
            stack.at(-1).statement.elseStatements = [];
            current = stack.at(-1).statement.elseStatements;
            continue;
        }
        if (instruction.opcodeName === "endif")
        {
            if (instruction.operands.length || !stack.length)
            {
                throw new Error(`WGSL structured skinning endif ${instruction.index} has malformed nesting`);
            }
            current = stack.pop().parent;
            continue;
        }
        if (instruction.opcodeName === "ret")
        {
            if (instruction.operands.length || stack.length)
            {
                throw new Error(`WGSL structured skinning return ${instruction.index} has malformed nesting`);
            }
            current.push({
                kind: "return",
                instructionIndex: instruction.index,
                dxbcOffset: instruction.dxbcOffset
            });
            continue;
        }
        const statement = instruction.opcodeName === "ld_structured"
            ? safeStructuredLoad(program, instruction, bindings)
            : instruction.opcodeName === "store_structured"
                ? structuredStore(program, instruction, bindings)
                : aluStatement(instruction);
        current.push(statement);
    }
    if (stack.length)
    {
        throw new Error("WGSL structured skinning compute contains unterminated selection nesting");
    }
    return statements;
}

/**
 * Whether declarations select the isolated structured skinning compute
 * profile. Detailed declaration/body validation belongs to the selected
 * profile and never falls through to another lowerer.
 *
 * @param {object} program CJS shader IR program.
 * @returns {boolean} True for the structured skinning declaration family.
 */
export function isSkinVerticesComputeProfile(program)
{
    return program?.stage === "compute"
        && program.declarations?.length === DECLARATION_OPCODES.length
        && DECLARATION_OPCODES.every((opcodeName, index) =>
            program.declarations[index]?.opcodeName === opcodeName);
}

/**
 * Lowers the bounded structured skinning compute profile.
 *
 * @param {object} program CJS shader IR program.
 * @param {object} [options] Exact compute-only binding options.
 * @returns {object} Typed compute program.
 */
export function lowerSkinVerticesComputeProgram(program, options = {})
{
    validateDeclarations(program);
    validateBody(program);
    const bindings = lowerBindingLayout(program, options.bindingPlan ?? null);
    validateBindings(bindings);
    const statements = lowerBody(program, bindings);
    return deepFreeze({
        kind: "typed-shader-program",
        format: "CJS_TYPED_SHADER",
        formatVersion: 1,
        source: program.source,
        stage: "compute",
        entryPoint: "main",
        builtinInputs: [ {
            builtin: "global_invocation_id",
            name: "dispatch_thread_id",
            type: "vec3<u32>"
        } ],
        threadGroupSize: [ 64, 1, 1 ],
        bindings,
        statements
    });
}
