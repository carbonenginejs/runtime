import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { readEffectAnalysis } from "../../../../src/resource/formats/webgpu/core/effectAnalysis.js";
import CjsFormatDxbc from "../../../../src/resource/formats/dxbc/index.js";
import CjsFormatWebgpu from "../../../../src/resource/formats/webgpu/index.js";

const summaryOnly = process.argv.includes("--summary");
const [ dx11Argument, dx12Argument, ...requestedPaths ] = process.argv.slice(2).filter((argument) => argument !== "--summary");
if (!dx11Argument || !dx12Argument)
{
    throw new Error("Usage: node scripts/qualify-effect-pairs.js [--summary] <dx11-root> <dx12-root> [relative-path ...]");
}

const dx11Root = resolve(dx11Argument);
const dx12Root = resolve(dx12Argument);

async function effectPaths(root, directory = root)
{
    const paths = [];
    for (const entry of await readdir(directory, { withFileTypes: true }))
    {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) paths.push(...await effectPaths(root, path));
        else if (/\.sm_(?:lo|hi|depth)$/i.test(entry.name)) paths.push(relative(root, path).replaceAll("\\", "/"));
    }
    return paths;
}

function stageRecords(resolved)
{
    const records = [];
    for (const technique of resolved.effectDescription?.techniques || [])
    {
        for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1)
        {
            for (const stage of technique.passes[passIndex].stageInputs.filter(Boolean))
            {
                const stageName = stage.cjsShaderBytecode?.stageName;
                const bytes = stage.cjsShaderBytecode?.bytes;
                if (stage.m_exists && stageName && bytes?.length)
                {
                    records.push({ key: `${technique.name}.pass${passIndex}.${stageName}`, bytes });
                }
            }
        }
    }
    return records;
}

function errorMessage(error)
{
    return String(error?.message || error).split(/\r?\n/, 1)[0];
}

async function qualifyEffect(path)
{
    const bytes = await readFile(path);
    const resolved = readEffectAnalysis(bytes, { source: path });
    return stageRecords(resolved).map(({ key, bytes: bytecode }) =>
    {
        try
        {
            const decoded = CjsFormatDxbc.read(bytecode, {
                emit: CjsFormatDxbc.OUTPUT_RAW,
                source: `${path}#${key}`,
                decodeInstructions: true
            });
            const ir = CjsFormatWebgpu.buildShaderIr(decoded, { source: `${path}#${key}` });
            let wgsl;
            try
            {
                const shader = CjsFormatWebgpu.buildWgsl(ir);
                wgsl = { status: "emitted", bytes: new TextEncoder().encode(shader.code).length };
            }
            catch (error)
            {
                wgsl = { status: "unsupported", reason: errorMessage(error) };
            }
            return {
                key,
                frontEnd: "qualified",
                stage: ir.stage,
                shaderModel: `${ir.shaderModel.major}.${ir.shaderModel.minor}`,
                instructions: ir.instructions.length,
                blocks: ir.blocks.length,
                regions: ir.controlFlow.regions.reduce((counts, region) => ({
                    ...counts,
                    [region.kind]: (counts[region.kind] || 0) + 1
                }), {}),
                merges: ir.values.filter((value) => value.origin === "control-flow-merge").length,
                opcodes: Array.from(new Set(ir.instructions.map((instruction) => instruction.opcodeName))).sort(),
                bindings: ir.bindings.map((binding) => binding.id),
                inputs: ir.signatures.input.length,
                outputs: ir.signatures.output.length,
                wgsl
            };
        }
        catch (error)
        {
            return { key, frontEnd: "failed", reason: errorMessage(error) };
        }
    });
}

const [ dx11Paths, dx12Paths ] = await Promise.all([ effectPaths(dx11Root), effectPaths(dx12Root) ]);
const dx11Set = new Set(dx11Paths);
const dx12Set = new Set(dx12Paths);
const candidates = requestedPaths.length
    ? requestedPaths.map((path) => path.replaceAll("\\", "/"))
    : Array.from(dx11Set).filter((path) => dx12Set.has(path)).sort();
const report = {
    format: "CJS_WEBGPU_EFFECT_QUALIFICATION",
    formatVersion: 1,
    roots: { dx11: dx11Root, dx12: dx12Root },
    pairs: []
};

for (const relativePath of candidates)
{
    const missing = [
        !dx11Set.has(relativePath) ? "dx11" : null,
        !dx12Set.has(relativePath) ? "dx12" : null
    ].filter(Boolean);
    if (missing.length)
    {
        report.pairs.push({ relativePath, status: "missing", missing });
        continue;
    }
    const [ dx11, dx12 ] = await Promise.all([
        qualifyEffect(resolve(dx11Root, relativePath)),
        qualifyEffect(resolve(dx12Root, relativePath))
    ]);
    const keysMatch = JSON.stringify(dx11.map((stage) => stage.key)) === JSON.stringify(dx12.map((stage) => stage.key));
    const frontEndQualified = keysMatch && [ ...dx11, ...dx12 ].every((stage) => stage.frontEnd === "qualified");
    report.pairs.push({
        relativePath,
        status: frontEndQualified ? "qualified" : "failed",
        keysMatch,
        dx11,
        dx12
    });
}

const stages = report.pairs.flatMap((pair) => [ ...(pair.dx11 || []), ...(pair.dx12 || []) ]);
const wgslBoundaries = stages
    .filter((stage) => stage.wgsl?.status === "unsupported")
    .reduce((counts, stage) => ({
        ...counts,
        [stage.wgsl.reason]: (counts[stage.wgsl.reason] || 0) + 1
    }), {});
report.summary = {
    pairs: report.pairs.length,
    qualifiedPairs: report.pairs.filter((pair) => pair.status === "qualified").length,
    failedPairs: report.pairs.filter((pair) => pair.status !== "qualified").length,
    qualifiedStages: stages.filter((stage) => stage.frontEnd === "qualified").length,
    failedStages: stages.filter((stage) => stage.frontEnd === "failed").length,
    emittedWgslStages: stages.filter((stage) => stage.wgsl?.status === "emitted").length,
    unsupportedWgslStages: stages.filter((stage) => stage.wgsl?.status === "unsupported").length,
    wgslBoundaries
};

const output = summaryOnly ? {
    ...report.summary,
    pairs: report.pairs.map((pair) => ({
        relativePath: pair.relativePath,
        status: pair.status,
        keysMatch: pair.keysMatch,
        qualifiedStages: [ ...(pair.dx11 || []), ...(pair.dx12 || []) ]
            .filter((stage) => stage.frontEnd === "qualified").length,
        failedStages: [ ...(pair.dx11 || []), ...(pair.dx12 || []) ]
            .filter((stage) => stage.frontEnd === "failed").length,
        emittedWgslStages: [ ...(pair.dx11 || []), ...(pair.dx12 || []) ]
            .filter((stage) => stage.wgsl?.status === "emitted").length,
        unsupportedWgslStages: [ ...(pair.dx11 || []), ...(pair.dx12 || []) ]
            .filter((stage) => stage.wgsl?.status === "unsupported").length,
        failures: [ ...(pair.dx11 || []), ...(pair.dx12 || []) ]
            .filter((stage) => stage.frontEnd === "failed")
            .map((stage) => ({ key: stage.key, reason: stage.reason }))
    }))
} : report;
console.log(JSON.stringify(output, null, 2));
if (report.summary.failedPairs) process.exitCode = 1;
