import { clonePlain, deepFreeze } from "#utils/object";
import CjsDxbcFormat from "../../../dxbc/index.js";
import { analyzeRegisterValues, operandRoles } from "./analyzeRegisterValues.js";
import { buildControlFlow } from "./buildControlFlow.js";
import { resolveRegisterFlow } from "./resolveRegisterFlow.js";
import { inferValueTypes, SCALAR_TYPES } from "./inferValueTypes.js";

export const SHADER_IR_FORMAT = "CJS_SHADER_IR";
export const SHADER_IR_VERSION = 1;
const PRECISE_MASK = /^x?y?z?w?$/u;

const BINDING_KINDS = Object.freeze({
    dcl_constant_buffer: "uniform-buffer",
    dcl_sampler: "sampler",
    dcl_resource: "sampled-resource",
    dcl_resource_raw: "sampled-resource",
    dcl_resource_structured: "sampled-resource",
    dcl_unordered_access_view_typed: "storage-resource",
    dcl_unordered_access_view_raw: "storage-resource",
    dcl_unordered_access_view_structured: "storage-resource"
});

const BLOCK_BEFORE = new Set([ "loop", "else", "endif", "endloop", "case", "default", "endswitch" ]);
const BLOCK_AFTER = new Set([
    "if", "loop", "switch", "break", "breakc", "continue", "continuec",
    "ret", "retc", "discard", "else", "endif", "endloop", "case", "default", "endswitch"
]);

function readDecoded(input, options)
{
    if (input instanceof Uint8Array || input instanceof ArrayBuffer || ArrayBuffer.isView(input))
    {
        const raw = CjsDxbcFormat.read(input, {
            emit: CjsDxbcFormat.OUTPUT_RAW,
            source: options.source || "memory",
            decodeInstructions: true
        });
        return {
            program: raw.program,
            instructions: raw.decoder?.instructions || [],
            signatures: {
                input: raw.inputSignature?.elements || [],
                output: raw.outputSignature?.elements || [],
                patch: raw.patchSignature?.elements || []
            }
        };
    }
    if (input?.program && input?.decoder)
    {
        return {
            program: input.program,
            instructions: input.decoder.instructions || [],
            signatures: {
                input: input.inputSignature?.elements || input.signatures?.input || [],
                output: input.outputSignature?.elements || input.signatures?.output || [],
                patch: input.patchSignature?.elements || input.signatures?.patch || []
            }
        };
    }
    if (input?.program && Array.isArray(input.instructions))
    {
        return { program: input.program, instructions: input.instructions, signatures: input.signatures || {} };
    }
    throw new TypeError("CjsWebgpuFormat.BuildShaderIr: expected DXBC bytes or decoded program/instructions");
}

function normalizedRange(declaration)
{
    if (declaration.bindingRange) return clonePlain(declaration.bindingRange);
    const registerIndex = declaration.registerIndex ?? null;
    return {
        bindingModel: "sm5.0-register",
        rangeId: null,
        lowerBound: registerIndex,
        upperBound: registerIndex,
        unbounded: false,
        registerCount: registerIndex === null ? 0 : 1,
        registerSpace: 0
    };
}

function buildBinding(instruction)
{
    const resourceKind = BINDING_KINDS[instruction.opcodeName];
    if (!resourceKind) return null;
    const declaration = instruction.declaration || {};
    const range = normalizedRange(declaration);
    return {
        kind: "binding",
        id: `${resourceKind}:space${range.registerSpace}:range${range.rangeId ?? range.lowerBound}`,
        resourceKind,
        operandType: instruction.operands?.[0]?.typeName || null,
        declarationOffset: instruction.offset,
        registerIndex: declaration.registerIndex ?? range.lowerBound,
        range,
        accessPattern: declaration.accessPattern || null,
        resourceDimension: declaration.resourceDimensionName || null,
        structureStride: declaration.structureStride ?? null,
        returnType: clonePlain(declaration.returnType || null)
    };
}

function controlKind(opcodeName)
{
    if ([ "if", "else", "endif" ].includes(opcodeName)) return "selection";
    if ([ "loop", "endloop", "break", "breakc", "continue", "continuec" ].includes(opcodeName)) return "loop";
    if ([ "switch", "case", "default", "endswitch" ].includes(opcodeName)) return "switch";
    if ([ "ret", "retc", "discard", "abort" ].includes(opcodeName)) return "termination";
    return null;
}

const COMPONENT_ORDER = [ "x", "y", "z", "w" ];
const FLOAT_VIEW = new DataView(new ArrayBuffer(4));

function immediateRecord(value)
{
    const bits = (value?.uint32 ?? 0) >>> 0;
    FLOAT_VIEW.setUint32(0, bits);
    return { uint32: bits, float32: FLOAT_VIEW.getFloat32(0) };
}

/**
 * Recognizes indexable temps that are immutable constant tables: every write
 * is a straight-line pre-control-flow `mov x#[slot].mask, l(...)` immediate,
 * and at least one access uses relative addressing. Such registers lower to a
 * module-scope WGSL `const` array (the same shape as the DXBC icb), so their
 * dynamic reads never need mutable-register SSA. Any relative indexable-temp
 * usage that does not fit this shape fails closed here with a diagnostic.
 *
 * @param {object[]} declarationInstructions Decoded declaration instructions.
 * @param {object[]} executable Decoded executable instructions.
 * @returns {{tables: object[]|null, removed: Set<number>|null}} Tables and initializer indices.
 */
function extractConstTables(declarationInstructions, executable)
{
    const declared = new Map();
    const duplicateDeclarations = new Set();
    for (const declaration of declarationInstructions)
    {
        if (declaration.opcodeName !== "dcl_indexable_temp") continue;
        const data = declaration.declaration || {};
        if (declared.has(data.registerIndex)) duplicateDeclarations.add(data.registerIndex);
        declared.set(data.registerIndex, {
            slotCount: data.registerCount,
            componentCount: data.componentCount
        });
    }

    const touched = new Map();
    const entryFor = (registerIndex) =>
    {
        let entry = touched.get(registerIndex);
        if (!entry)
        {
            entry = { writes: [], hasRelative: false, invalid: null };
            touched.set(registerIndex, entry);
        }
        return entry;
    };
    const invalidate = (entry, reason) =>
    {
        if (!entry.invalid) entry.invalid = reason;
    };
    let firstControl = executable.findIndex((instruction) => controlKind(instruction.opcodeName) !== null);
    if (firstControl < 0) firstControl = executable.length;

    executable.forEach((instruction, instructionIndex) =>
    {
        operandRoles(instruction).forEach(({ operand, role }, operandIndex) =>
        {
            if (operand.typeName !== "indexable_temp") return;
            const indices = operand.indices || [];
            const registerIndex = indices[0]?.values?.[0];
            const entry = entryFor(registerIndex);
            if (indices.length !== 2 || indices[0]?.relative
                || indices[0]?.values?.length !== 1
                || !Number.isInteger(registerIndex) || registerIndex < 0
                || operand.registerIndex !== registerIndex)
            {
                return invalidate(entry, "requires one consistent fixed register identity and [register][slot] addressing");
            }
            if (indices[1]?.relative) entry.hasRelative = true;

            if (role === "source")
            {
                const lanes = operand.selected
                    ? [ operand.selected ]
                    : operand.swizzle
                        ? Array.from(new Set(operand.swizzle))
                        : COMPONENT_ORDER.slice();
                entry.reads = entry.reads || [];
                entry.reads.push({ instructionIndex, lanes });
                return;
            }

            // Destination use: only straight-line immediate table initializers
            // are representable; anything else is a mutable indexable temp.
            const source = instruction.operands?.[1];
            const slot = indices[1]?.values?.[0];
            if (instruction.opcodeName !== "mov" || instruction.saturate)
            {
                return invalidate(entry, "is only writable by non-saturating mov initializers");
            }
            if (instructionIndex >= firstControl)
            {
                return invalidate(entry, "initializers must precede all control flow");
            }
            if (indices[1]?.relative || indices[1]?.values?.length !== 1
                || !Number.isInteger(slot) || slot < 0)
            {
                return invalidate(entry, "initializers require an immediate slot index");
            }
            if (source?.typeName !== "immediate32" || (source.modifierName || "none") !== "none"
                || ![ 1, 4 ].includes(source.immediateValues?.length ?? 0))
            {
                return invalidate(entry, "initializers require immediate32 sources");
            }
            if ((operand.modifierName || "none") !== "none"
                || (operand.minPrecisionName || "default") !== "default"
                || (source.minPrecisionName || "default") !== "default"
                || instruction.extensions?.length)
            {
                return invalidate(entry, "initializers require canonical default-precision mov operands");
            }
            if (!operand.mask || operand.swizzle || operand.selected || source.mask
                || (source.swizzle && source.selected)
                || (source.selected && !COMPONENT_ORDER.includes(source.selected))
                || (source.swizzle && (source.swizzle.length !== 4
                    || Array.from(source.swizzle).some((lane) => !COMPONENT_ORDER.includes(lane)))))
            {
                return invalidate(entry, "initializers require canonical destination and source component selection");
            }
            const valuesByLane = {};
            for (const lane of operand.mask)
            {
                const destinationLane = COMPONENT_ORDER.indexOf(lane);
                const sourceLane = source.selected || source.swizzle?.[destinationLane] || lane;
                const sourceLaneIndex = COMPONENT_ORDER.indexOf(sourceLane);
                const value = source.immediateValues.length === 1
                    ? source.immediateValues[0]
                    : source.immediateValues[sourceLaneIndex];
                if (!value)
                {
                    return invalidate(entry, "an initializer selects an unavailable immediate lane");
                }
                valuesByLane[lane] = value;
            }
            entry.writes.push({ instructionIndex, slot, mask: operand.mask, valuesByLane });
        });
    });

    const tables = [];
    const removed = new Set();

    for (const [ registerIndex, entry ] of touched)
    {
        if (!entry.hasRelative) continue;
        const declaration = declared.get(registerIndex);
        const describe = (reason) => new Error(
            `Shader IR indexable temp x${registerIndex} relative addressing is not supported: ${reason}`);
        if (entry.invalid) throw describe(entry.invalid);
        if (duplicateDeclarations.has(registerIndex)) throw describe("it has duplicate declarations");
        if (!declaration || !Number.isInteger(declaration.slotCount) || declaration.slotCount < 1)
        {
            throw describe("it has no usable declaration");
        }
        if (!Number.isInteger(declaration.componentCount)
            || declaration.componentCount < 1 || declaration.componentCount > 4)
        {
            throw describe("it has an invalid component count");
        }
        const lastWrite = Math.max(...entry.writes.map((write) => write.instructionIndex));
        const firstRead = Math.min(...(entry.reads || []).map((read) => read.instructionIndex));
        if (lastWrite >= firstRead)
        {
            throw describe("all initializers must precede every read");
        }

        const laneMask = entry.writes[0]?.mask;
        if (Array.from(laneMask || "").some((lane) =>
            COMPONENT_ORDER.indexOf(lane) >= declaration.componentCount))
        {
            throw describe("an initializer writes outside the declared component range");
        }
        const rows = Array.from({ length: declaration.slotCount }, () =>
            COMPONENT_ORDER.map(() => null));
        for (const write of entry.writes)
        {
            if (write.mask !== laneMask) throw describe("initializers must share one write mask");
            if (write.slot < 0 || write.slot >= declaration.slotCount)
            {
                throw describe("an initializer writes outside the declared range");
            }
            for (const lane of write.mask)
            {
                const laneIndex = COMPONENT_ORDER.indexOf(lane);
                if (rows[write.slot][laneIndex] !== null) throw describe("a slot lane is written twice");
                rows[write.slot][laneIndex] = immediateRecord(write.valuesByLane[lane]);
            }
            removed.add(write.instructionIndex);
        }
        for (const [ slot, row ] of rows.entries())
        {
            for (const lane of laneMask || "")
            {
                if (row[COMPONENT_ORDER.indexOf(lane)] === null)
                {
                    throw describe(`slot ${slot} is never fully written`);
                }
            }
        }
        for (const read of entry.reads || [])
        {
            if (read.lanes.some((lane) => !(laneMask || "").includes(lane)))
            {
                throw describe("a read selects lanes the table never writes");
            }
        }

        tables.push(Object.freeze({
            kind: "const-table",
            registerIndex,
            symbol: `xt${registerIndex}`,
            slotCount: declaration.slotCount,
            laneMask: laneMask || "",
            rows: rows.map((row) => row.map((value) => value ?? { uint32: 0, float32: 0 }))
        }));
    }

    return tables.length ? { tables, removed } : { tables: null, removed: null };
}

function buildInstruction(instruction, index)
{
    return {
        kind: "instruction",
        index,
        dxbcOffset: instruction.offset,
        opcode: instruction.opcode,
        opcodeName: instruction.opcodeName,
        controlKind: controlKind(instruction.opcodeName),
        testBoolean: instruction.testBoolean || null,
        saturate: !!instruction.saturate,
        preciseMask: instruction.preciseMask || "",
        ...(instruction.opcodeName === "resinfo"
            ? { resinfoReturnTypeName: instruction.resinfoReturnTypeName || "float" }
            : {}),
        ...(instruction.opcodeName === "sync"
            ? {
                syncFlags: Number.isInteger(instruction.syncFlags)
                    ? instruction.syncFlags
                    : null,
                syncFlagNames: Array.isArray(instruction.syncFlagNames)
                    ? clonePlain(instruction.syncFlagNames)
                    : null
            }
            : {}),
        ...(instruction.extensions?.length
            ? { extensions: clonePlain(instruction.extensions) }
            : {}),
        ...(instruction.tailTokens?.length
            ? { tailTokens: clonePlain(instruction.tailTokens) }
            : {}),
        operands: clonePlain(instruction.operands || [])
    };
}

function buildBlocks(instructions)
{
    if (instructions.length === 0) return [];
    const leaders = new Set([ 0 ]);
    for (let index = 0; index < instructions.length; index += 1)
    {
        if (BLOCK_BEFORE.has(instructions[index].opcodeName)) leaders.add(index);
        if (BLOCK_AFTER.has(instructions[index].opcodeName) && index + 1 < instructions.length) leaders.add(index + 1);
    }

    const starts = Array.from(leaders).sort((a, b) => a - b);
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
            terminator: last.controlKind ? last.opcodeName : null
        };
    });
}

function validateProgram(program)
{
    if (!program.stage || !Number.isInteger(program.shaderModel.major))
    {
        throw new Error("Invalid shader IR program identity");
    }
    for (let index = 1; index < program.instructions.length; index += 1)
    {
        if (program.instructions[index].dxbcOffset <= program.instructions[index - 1].dxbcOffset)
        {
            throw new Error("Shader IR instruction offsets must be strictly increasing");
        }
    }
    const covered = program.blocks.flatMap((block) => block.instructionIndices);
    if (covered.length !== program.instructions.length || covered.some((value, index) => value !== index))
    {
        throw new Error("Shader IR basic blocks must cover every executable instruction exactly once");
    }
    const blockIds = new Set(program.blocks.map((block) => block.id));
    for (const block of program.blocks)
    {
        if (block.successors.some((edge) => !blockIds.has(edge.blockId)))
        {
            throw new Error("Shader IR control-flow edge references an unknown block");
        }
        for (const edge of block.successors)
        {
            const successor = program.blocks.find((entry) => entry.id === edge.blockId);
            if (!successor.predecessors.some((entry) => entry.blockId === block.id && entry.kind === edge.kind))
            {
                throw new Error("Shader IR control-flow successor/predecessor edges must be symmetric");
            }
        }
    }
    const bindingIds = new Set();
    for (const binding of program.bindings)
    {
        if (bindingIds.has(binding.id)) throw new Error(`Duplicate shader IR binding ${binding.id}`);
        bindingIds.add(binding.id);
    }
    const valueIds = new Set(program.values.map((value) => value.id));
    const valuesById = new Map(program.values.map((value) => [ value.id, value ]));
    if (valueIds.size !== program.values.length) throw new Error("Shader IR register value ids must be unique");
    for (const block of program.blocks)
    {
        if (block.inputValueIds.some((id) => !valueIds.has(id)))
        {
            throw new Error("Shader IR block input references an unknown value");
        }
        if (block.outputValues.some((output) => !valueIds.has(output.ref.valueId)))
        {
            throw new Error("Shader IR block output references an unknown value");
        }
        if (block.mergeSite?.valueIds?.some((id) =>
            !valueIds.has(id)
            || valuesById.get(id).origin !== "control-flow-merge"
            || valuesById.get(id).blockId !== block.id))
        {
            throw new Error("Shader IR merge site references an invalid merge value");
        }
    }
    for (const instruction of program.instructions)
    {
        if (!instruction.dataflow) throw new Error("Shader IR instruction is missing register dataflow");
        const refs = [
            ...instruction.dataflow.reads.flatMap((read) => read.refs),
            ...instruction.dataflow.writes.flatMap((write) => [
                { valueId: write.valueId },
                ...Object.values(write.previous || {}),
                ...Object.values(write.result || {})
            ])
        ];
        if (refs.some((ref) => !valueIds.has(ref.valueId)))
        {
            throw new Error("Shader IR register dataflow references an unknown value");
        }
    }
    for (const value of program.values)
    {
        if (value.origin === "block-input") throw new Error("Shader IR contains an unresolved block input");
        if (value.origin === "control-flow-merge")
        {
            if (value.incoming.length < 2) throw new Error("Shader IR merge value must have at least two incoming values");
            if (value.incoming.some((incoming) => !valueIds.has(incoming.valueId)))
            {
                throw new Error("Shader IR merge value references an unknown incoming value");
            }
            if (value.incoming.some((incoming) =>
                incoming.component !== value.writeMask
                || valuesById.get(incoming.valueId).register !== value.register))
            {
                throw new Error("Shader IR merge value has an incompatible incoming register component");
            }
        }
        if (!value.componentTypes || Object.values(value.componentTypes).some((type) => !SCALAR_TYPES.includes(type)))
        {
            throw new Error("Shader IR register value has an invalid component type");
        }
    }
    for (const instruction of program.instructions)
    {
        if (!instruction.typeInfo) throw new Error("Shader IR instruction is missing type information");
        if (typeof instruction.preciseMask !== "string" || !PRECISE_MASK.test(instruction.preciseMask))
        {
            throw new Error(`Shader IR instruction ${instruction.index} has an invalid precise component mask`);
        }
        if (instruction.typeInfo.bitcasts.some((bitcast) =>
            !SCALAR_TYPES.includes(bitcast.from) || !SCALAR_TYPES.includes(bitcast.to)))
        {
            throw new Error("Shader IR instruction has an invalid bitcast type");
        }
    }
}

/**
 * Lowers decoded DXBC framing into the stable front-end shader IR.
 * Type inference and SSA value reconstruction are later passes.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView|object} input DXBC bytes or decoded result.
 * @param {object} [options] IR provenance options.
 * @returns {object} Frozen, validated shader IR program.
 */
export function lowerDxbcToIr(input, options = {})
{
    const decoded = readDecoded(input, options);
    if (!decoded.program) throw new Error("DXBC input has no shader program");

    const declarationInstructions = decoded.instructions.filter((instruction) => instruction.isDeclaration);
    let executable = decoded.instructions.filter((instruction) => !instruction.isDeclaration);
    const constTableExtraction = extractConstTables(declarationInstructions, executable);
    if (constTableExtraction.removed)
    {
        executable = executable.filter((_, index) => !constTableExtraction.removed.has(index));
    }
    const instructions = executable.map(buildInstruction);
    const icbInstruction = declarationInstructions.find((instruction) => instruction.customData?.immediateConstantBuffer);
    const immediateConstantBuffer = icbInstruction
        ? clonePlain(icbInstruction.customData.immediateConstantBuffer)
        : null;
    const program = {
        kind: "shader-program",
        format: SHADER_IR_FORMAT,
        formatVersion: SHADER_IR_VERSION,
        source: options.source || decoded.program.source || "memory",
        stage: decoded.program.programTypeName,
        programType: decoded.program.programType,
        shaderModel: {
            major: decoded.program.majorVersion,
            minor: decoded.program.minorVersion
        },
        signatures: {
            input: clonePlain(decoded.signatures?.input || []),
            output: clonePlain(decoded.signatures?.output || []),
            patch: clonePlain(decoded.signatures?.patch || [])
        },
        declarations: declarationInstructions.map((instruction) => ({
            kind: "declaration",
            dxbcOffset: instruction.offset,
            opcodeName: instruction.opcodeName,
            data: clonePlain(instruction.declaration),
            operands: clonePlain(instruction.operands || []),
            ...(instruction.tailTokens?.length
                ? { tailTokens: clonePlain(instruction.tailTokens) }
                : {})
        })),
        bindings: declarationInstructions.map(buildBinding).filter(Boolean),
        immediateConstantBuffer,
        constTables: constTableExtraction.tables,
        instructions,
        blocks: buildBlocks(instructions)
    };
    buildControlFlow(program);
    analyzeRegisterValues(program);
    resolveRegisterFlow(program);
    inferValueTypes(program);
    validateProgram(program);
    return deepFreeze(program);
}
