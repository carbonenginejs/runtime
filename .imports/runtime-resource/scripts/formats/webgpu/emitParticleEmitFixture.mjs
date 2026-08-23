import { createHash } from "node:crypto";
import fs from "node:fs/promises";

import CjsFormatDxbc from "../../../src/formats/dxbc/index.js";
import CjsFormatWebgpu from "../../../src/formats/webgpu/index.js";
import { readEffectAnalysis } from "../../../src/formats/webgpu/core/effectAnalysis.js";
import { lowerDxbcToIr } from "../../../src/formats/webgpu/core/ir/lowerDxbcToIr.js";
import {
    particleEmitSemanticDigest
} from "../../../src/formats/webgpu/core/wgsl/particleEmitSemanticDigest.js";
import {
    isParticleEmitComputeCandidate
} from "../../../src/formats/webgpu/core/wgsl/lowerParticleEmitComputeProgram.js";

// The audited particles/gpu/emit.sm_hi effect and internal compute DXBC
// hashes. Trusted admission constants may only be regenerated from these
// exact audited bytes; any other input fails closed.
const AUDITED_EFFECTS = Object.freeze({
    "6992c04a8727142642be87aa3b0a4117e4ef1f05e95bdc827b5d495e7ebea4cf":
        "ad89856157709e282cb74b03d0212dbbb3963c9a119ccf60a49699875f96d8c2",
    "71b5a46824813df2a39f91cc4ee5189903df55abfc86b80e1382dfbbbe4eaeac":
        "337b1d706354d84e0ca1914dadc929cfa6f0a5447c0b1570acc1e58f24a818bd"
});

const input = process.argv.find((entry) => entry.startsWith("--input="))
    ?.slice("--input=".length);
if (!input)
{
    throw new Error(
        "emitParticleEmitFixture requires --input=<audited emit.sm_hi path>"
    );
}

function collectProgram(effectDescription)
{
    for (const technique of effectDescription.techniques || [])
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
    throw new Error("Missing compute program");
}

function normalizeIndex(index)
{
    return [
        index.dimension,
        index.representation,
        index.values || [],
        index.relative ? normalizeOperand(index.relative) : null
    ];
}

function normalizeOperand(operand)
{
    return [
        operand.typeName,
        operand.registerIndex ?? null,
        operand.componentCount,
        operand.selectionModeName,
        operand.mask || "",
        operand.swizzle || "",
        operand.selected || "",
        operand.modifierName,
        operand.minPrecisionName,
        operand.nonUniform,
        (operand.indices || []).map(normalizeIndex),
        (operand.immediateValues || []).map((entry) => entry.uint32 >>> 0),
        operand.resourceReference ?? null,
        operand.token,
        operand.type,
        operand.length
    ];
}

const operandTypeIds = new Map([
    "null", "temp", "input_thread_group_id", "immediate32",
    "thread_group_shared_memory", "constant_buffer",
    "input_thread_id_in_group_flattened", "input_thread_id_in_group",
    "uav"
].map((entry, index) => [ entry, index ]));
const selectionIds = new Map(
    [ "none", "mask", "select1", "swizzle" ].map(
        (entry, index) => [ entry, index ]));
const modifierIds = new Map(
    [ "none", "neg", "abs" ].map((entry, index) => [ entry, index ]));

function compactOperand(operand)
{
    return [
        operandTypeIds.get(operand.typeName),
        operand.registerIndex ?? null,
        operand.componentCount,
        selectionIds.get(operand.selectionModeName),
        operand.mask || operand.swizzle || operand.selected || "",
        modifierIds.get(operand.modifierName),
        operand.minPrecisionName === "default" ? 0 : operand.minPrecisionName,
        operand.nonUniform ? 1 : 0,
        (operand.indices || []).map((index) => [
            index.dimension,
            index.representation,
            index.values || [],
            index.relative ? compactOperand(index.relative) : null
        ]),
        (operand.immediateValues || []).map((entry) => entry.uint32 >>> 0),
        operand.resourceReference ?? null,
        operand.token,
        operand.type,
        operand.length
    ];
}

function compactInstruction(instruction)
{
    return [
        instruction.index,
        instruction.dxbcOffset,
        instruction.opcode,
        instruction.controlKind,
        instruction.testBoolean,
        instruction.saturate ? 1 : 0,
        instruction.preciseMask,
        instruction.syncFlags ?? null,
        instruction.syncFlagNames ?? null,
        instruction.resinfoReturnTypeName ?? null,
        instruction.extensions || [],
        instruction.tailTokens || [],
        instruction.operands.map(compactOperand)
    ];
}

function normalizeInstruction(instruction)
{
    return [
        instruction.kind,
        instruction.index,
        instruction.dxbcOffset,
        instruction.opcode,
        instruction.opcodeName,
        instruction.controlKind,
        instruction.testBoolean,
        instruction.saturate,
        instruction.preciseMask,
        instruction.syncFlags ?? null,
        instruction.syncFlagNames ?? null,
        instruction.resinfoReturnTypeName ?? null,
        instruction.extensions || [],
        instruction.tailTokens || [],
        instruction.operands.map(normalizeOperand)
    ];
}

function canonicalValue(value)
{
    if (value === undefined) return [ "undefined" ];
    if (value === null) return [ "null" ];
    if (typeof value === "number")
    {
        if (Number.isNaN(value)) return [ "number", "NaN" ];
        if (Object.is(value, -0)) return [ "number", "-0" ];
        return [ "number", value ];
    }
    if ([ "string", "boolean" ].includes(typeof value))
    {
        return [ typeof value, value ];
    }
    if (Array.isArray(value))
    {
        return [
            "array",
            value.length,
            Array.from({ length: value.length }, (_, index) =>
                Object.hasOwn(value, index)
                    ? canonicalValue(value[index])
                    : [ "hole" ])
        ];
    }
    const keys = Object.keys(value).sort();
    return [
        "object",
        keys,
        keys.map((key) => canonicalValue(value[key]))
    ];
}

function own(value, key)
{
    return Object.hasOwn(value, key) ? value[key] : { missing: key };
}

function instructionSurface(instruction)
{
    return {
        kind: own(instruction, "kind"),
        index: own(instruction, "index"),
        dxbcOffset: own(instruction, "dxbcOffset"),
        opcode: own(instruction, "opcode"),
        opcodeName: own(instruction, "opcodeName"),
        controlKind: own(instruction, "controlKind"),
        testBoolean: own(instruction, "testBoolean"),
        saturate: own(instruction, "saturate"),
        preciseMask: own(instruction, "preciseMask"),
        syncFlags: own(instruction, "syncFlags"),
        syncFlagNames: own(instruction, "syncFlagNames"),
        resinfoReturnTypeName: own(instruction, "resinfoReturnTypeName"),
        extensions: own(instruction, "extensions"),
        tailTokens: own(instruction, "tailTokens"),
        operands: own(instruction, "operands")
    };
}

function serializeJavascript(value)
{
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "number")
    {
        if (Number.isNaN(value)) return "Number.NaN";
        if (Object.is(value, -0)) return "-0";
        return `${value}`;
    }
    if (typeof value === "string" || typeof value === "boolean")
    {
        return JSON.stringify(value);
    }
    if (Array.isArray(value))
    {
        const entries = Array.from({ length: value.length }, (_, index) =>
            Object.hasOwn(value, index)
                ? serializeJavascript(value[index])
                : "");
        const trailingHole = value.length > 0
            && !Object.hasOwn(value, value.length - 1);
        return `[${entries.join(",")}${trailingHole ? "," : ""}]`;
    }
    return `{${Object.keys(value).sort().map((key) =>
        `${JSON.stringify(key)}:${serializeJavascript(value[key])}`)
        .join(",")}}`;
}

function fnv64(text)
{
    let hash = 0xcbf29ce484222325n;
    for (let index = 0; index < text.length; index += 1)
    {
        hash ^= BigInt(text.charCodeAt(index));
        hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
    return hash.toString(16).padStart(16, "0");
}

const effectBytes = new Uint8Array(await fs.readFile(input));
const effectSha256 = createHash("sha256").update(effectBytes).digest("hex");
const expectedDxbcSha256 = AUDITED_EFFECTS[effectSha256];
if (!expectedDxbcSha256)
{
    throw new Error(
        `emitParticleEmitFixture input SHA-256 ${effectSha256} is not one of the audited emit.sm_hi effects`
    );
}
const effect = readEffectAnalysis(effectBytes, { source: input });
const bytes = collectProgram(effect.effectDescription);
const dxbcSha256 = createHash("sha256").update(bytes).digest("hex");
if (dxbcSha256 !== expectedDxbcSha256)
{
    throw new Error(
        `emitParticleEmitFixture internal DXBC SHA-256 ${dxbcSha256} does not match the audited compute program`
    );
}
const raw = CjsFormatDxbc.read(bytes, {
    emit: CjsFormatDxbc.OUTPUT_RAW,
    source: input,
    decodeInstructions: true
});
const ir = lowerDxbcToIr(raw, { source: input });
const instructions = ir.instructions.map(normalizeInstruction);
const mode = process.argv.find((entry) => entry.startsWith("--mode="))
    ?.slice("--mode=".length) || "hashes";
if (mode === "instructions")
{
    const from = Number(process.argv.find((entry) => entry.startsWith("--from="))
        ?.slice("--from=".length) || 0);
    const to = Number(process.argv.find((entry) => entry.startsWith("--to="))
        ?.slice("--to=".length) || instructions.length);
    console.log(Buffer.from(JSON.stringify(instructions.slice(from, to)))
        .toString("base64"));
}
else if (mode === "declarations")
{
    console.log(Buffer.from(JSON.stringify(ir.declarations)).toString("base64"));
}
else if (mode === "declarations-json")
{
    console.log(JSON.stringify(ir.declarations));
}
else if (mode === "bindings")
{
    console.log(Buffer.from(JSON.stringify(ir.bindings)).toString("base64"));
}
else if (mode === "bindings-json")
{
    console.log(JSON.stringify(ir.bindings));
}
else if (mode === "shader")
{
    console.log(Buffer.from(bytes).toString("base64"));
}
else if (mode === "shader-lines")
{
    const encoded = Buffer.from(bytes).toString("base64");
    console.log(Array.from(
        { length: Math.ceil(encoded.length / 88) },
        (_, index) => `    "${encoded.slice(index * 88, (index + 1) * 88)}"`
    ).join(",\n"));
}
else if (mode === "wgsl")
{
    console.log(CjsFormatWebgpu.buildWgsl(bytes, {
        source: "particle-emit-sm50"
    }).code);
}
else if (mode === "compact")
{
    const from = Number(process.argv.find((entry) => entry.startsWith("--from="))
        ?.slice("--from=".length) || 0);
    const to = Number(process.argv.find((entry) => entry.startsWith("--to="))
        ?.slice("--to=".length) || instructions.length);
    console.log(JSON.stringify(ir.instructions.slice(from, to)
        .map(compactInstruction)));
}
else if (mode === "exact-records")
{
    console.log(JSON.stringify({
        declarations: canonicalValue(ir.declarations),
        bindings: canonicalValue(ir.bindings),
        instructions: ir.instructions.map((instruction) =>
            canonicalValue(instructionSurface(instruction)))
    }));
}
else if (mode === "direct-module")
{
    const records = {
        declarations: ir.declarations,
        bindings: ir.bindings,
        instructions: ir.instructions.map(instructionSurface)
    };
    console.log(`function deepFreeze(value)
{
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const entry of Object.values(value)) deepFreeze(entry);
    return Object.freeze(value);
}

const RECORDS = ${serializeJavascript(records)};

export const PARTICLE_EMIT_SM50_DECLARATIONS =
    deepFreeze(RECORDS.declarations);
export const PARTICLE_EMIT_SM50_BINDINGS = deepFreeze(RECORDS.bindings);
export const PARTICLE_EMIT_SM50_INSTRUCTIONS =
    deepFreeze(RECORDS.instructions);
`);
}
else if (mode === "direct-section")
{
    const section = process.argv.find((entry) =>
        entry.startsWith("--section="))?.slice("--section=".length);
    const from = Number(process.argv.find((entry) => entry.startsWith("--from="))
        ?.slice("--from=".length) || 0);
    const to = Number(process.argv.find((entry) => entry.startsWith("--to="))
        ?.slice("--to=".length) || ir.instructions.length);
    const values = section === "declarations"
        ? ir.declarations
        : section === "bindings"
            ? ir.bindings
            : ir.instructions.slice(from, to).map(instructionSurface);
    console.log(serializeJavascript(values));
}
else if (mode === "digest")
{
    console.log(particleEmitSemanticDigest(ir));
}
else if (mode === "digest-public")
{
    const publicIr = CjsFormatWebgpu.buildShaderIr(bytes, {
        source: "particle-emit-sm50"
    });
    console.log(JSON.stringify(Object.keys(ir)));
    console.log(JSON.stringify(Object.keys(publicIr)));
    console.log(particleEmitSemanticDigest(publicIr));
}
else if (mode === "candidate")
{
    console.log(isParticleEmitComputeCandidate(ir));
    console.log(JSON.stringify(ir.declarations.map((entry) => ({
        opcodeName: entry.opcodeName,
        data: entry.data
    })), null, 2));
}
else
{
    console.log(JSON.stringify({
        declarations: fnv64(JSON.stringify(ir.declarations)),
        bindings: fnv64(JSON.stringify(ir.bindings)),
        instructionHashes: instructions.map((entry) =>
            fnv64(JSON.stringify(entry))),
        analysis: fnv64(JSON.stringify({
            blocks: ir.blocks,
            controlFlow: ir.controlFlow,
            values: ir.values,
            instructions: ir.instructions.map((instruction) => ({
                dataflow: instruction.dataflow,
                typeInfo: instruction.typeInfo
            }))
        }))
    }, null, 2));
}
