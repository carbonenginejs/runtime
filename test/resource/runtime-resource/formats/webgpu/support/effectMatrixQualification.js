import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import CjsHlslFormat from "../../../../../../src/resource/formats/hlsl/index.js";
import CjsDxbcFormat from "../../../../../../src/resource/formats/dxbc/index.js";
import CjsWebgpuFormat from "../../../../../../src/resource/formats/webgpu/index.js";
import { buildResourceTransformPlan } from "../../../../../../src/resource/formats/webgpu/core/wgsl/buildResourceTransformPlan.js";
import {
    isParticleClearEffectCandidate,
    particleClearEffectProofClass,
    particleClearEffectProofFor,
    preflightParticleClearEffectProfile
} from "../../../../../../src/resource/formats/webgpu/core/wgsl/lowerParticleClearComputePrograms.js";
import {
    enumerateEffectPermutations,
    inspectEffectOffsets,
    validateEffectPermutationAxes
} from "./effectMatrixHelpers.js";

export {
    enumerateEffectPermutations,
    inspectEffectOffsets,
    parseEffectMatrixArguments,
    validateEffectPermutationAxes
} from "./effectMatrixHelpers.js";

const MATRIX_FORMAT = "CJS_WEBGPU_EFFECT_MATRIX";
const MATRIX_VERSION = 1;
const RENDER_STAGE_NAMES = Object.freeze([ "vertex", "pixel" ]);

function fail(message)
{
    throw new Error(`Effect matrix qualification: ${message}`);
}

function errorMessage(error)
{
    return String(error?.message || error).split(/\r?\n/u, 1)[0];
}

function hashBytes(bytes)
{
    return createHash("sha256").update(bytes).digest("hex");
}

function hashText(value)
{
    return createHash("sha256").update(value).digest("hex");
}

function increment(map, key, amount = 1)
{
    map.set(key, (map.get(key) || 0) + amount);
}

function mapCounts(map)
{
    return Object.fromEntries(Array.from(map).sort(([ left ], [ right ]) => left.localeCompare(right)));
}

function normalizeAxes(effect)
{
    validateEffectPermutationAxes(effect.m_permutations || []);
    return (effect.m_permutations || []).map((axis, axisIndex) =>
    {
        if (typeof axis?.name !== "string" || !axis.name) fail(`axis ${axisIndex} has no name`);
        if (!Array.isArray(axis.options) || !axis.options.length) fail(`axis ${axis.name} has no options`);
        if (!Number.isInteger(axis.defaultOption) || axis.defaultOption < 0 || axis.defaultOption >= axis.options.length)
        {
            fail(`axis ${axis.name} has an invalid default option`);
        }
        return Object.freeze({
            name: axis.name,
            options: Object.freeze(axis.options.slice()),
            defaultOption: axis.defaultOption,
            defaultValue: axis.options[axis.defaultOption],
            type: Number.isInteger(axis.type) ? axis.type : 0
        });
    });
}

function qualifyStage(bytecode, source)
{
    let ir;
    try
    {
        const decoded = CjsDxbcFormat.read(bytecode, {
            emit: CjsDxbcFormat.OUTPUT_RAW,
            source,
            decodeInstructions: true
        });
        ir = CjsWebgpuFormat.buildShaderIr(decoded, { source });
    }
    catch (error)
    {
        return { frontEnd: "failed", reason: errorMessage(error), ir: null, independentShader: null };
    }

    try
    {
        const independentShader = CjsWebgpuFormat.buildWgsl(ir);
        return {
            frontEnd: "qualified",
            stage: ir.stage,
            shaderModel: `${ir.shaderModel.major}.${ir.shaderModel.minor}`,
            instructions: ir.instructions.length,
            wgsl: "emitted",
            wgslBytes: new TextEncoder().encode(independentShader.code).length,
            ir,
            independentShader
        };
    }
    catch (error)
    {
        return {
            frontEnd: "qualified",
            stage: ir.stage,
            shaderModel: `${ir.shaderModel.major}.${ir.shaderModel.minor}`,
            instructions: ir.instructions.length,
            wgsl: "unsupported",
            reason: errorMessage(error),
            ir,
            independentShader: null
        };
    }
}

/**
 * Classifies the complete active stage set for one pipeline pass.
 *
 * @param {string[]} stageNames Active Trinity stage names.
 * @returns {"render"|"compute"|null} Supported topology, or null.
 */
export function classifyEffectPassTopology(stageNames)
{
    if (!Array.isArray(stageNames) || stageNames.some((stageName) => typeof stageName !== "string"))
    {
        throw new TypeError("Effect pass topology requires a stage-name array");
    }
    if (stageNames.length === 1 && stageNames[0] === "compute") return "compute";
    if (stageNames.length === RENDER_STAGE_NAMES.length
        && RENDER_STAGE_NAMES.every((stageName) => stageNames.includes(stageName)))
    {
        return "render";
    }
    return null;
}

function qualifyPass(
    passKey,
    stages,
    effectProfileProof = null,
    resourceTransformPlan = null
)
{
    const stageNames = stages.map((stage) => stage.stageName);
    if (!classifyEffectPassTopology(stageNames))
    {
        return {
            status: "unsupported",
            phase: "topology",
            reason: `pipeline pass requires exactly vertex+pixel or one compute stage, found ${stageNames.join("+") || "no active stages"}`
        };
    }
    const failed = stages.find((stage) => stage.qualification.frontEnd !== "qualified");
    if (failed)
    {
        return { status: "failed", phase: "front-end", reason: failed.qualification.reason };
    }

    let bindingPlan;
    try
    {
        bindingPlan = CjsWebgpuFormat.buildWgslBindingPlan(
            stages.map((stage) => stage.qualification.ir),
            {
                ...(effectProfileProof ? { effectProfileProof } : {}),
                ...(resourceTransformPlan ? { resourceTransformPlan } : {})
            }
        );
    }
    catch (error)
    {
        return { status: "unsupported", phase: "binding-plan", reason: errorMessage(error) };
    }

    let shaders;
    try
    {
        shaders = stages.map((stage) => ({
            key: `${passKey}.${stage.stageName}`,
            shader: CjsWebgpuFormat.buildWgsl(stage.qualification.ir, {
                bindingPlan,
                ...(resourceTransformPlan ? { resourceTransformPlan } : {}),
                ...(effectProfileProof ? { effectProfileProof } : {})
            })
        }));
    }
    catch (error)
    {
        return { status: "unsupported", phase: "wgsl", reason: errorMessage(error) };
    }

    try
    {
        return {
            status: "ready",
            phase: "complete",
            wgsl: CjsWebgpuFormat.buildWgslSet(shaders)
        };
    }
    catch (error)
    {
        return { status: "failed", phase: "wgsl-set", reason: errorMessage(error) };
    }
}

function cachedStageVariant(stageVariants, bytecode, source)
{
    const digest = hashBytes(bytecode);
    if (!stageVariants.has(digest))
    {
        stageVariants.set(digest, {
            digest,
            keys: new Set(),
            keyOccurrences: new Map(),
            occurrences: 0,
            qualification: qualifyStage(bytecode, source)
        });
    }
    return stageVariants.get(digest);
}

function preflightEffectProfile(description, sourcePath, stageVariants)
{
    if (!isParticleClearEffectCandidate(description)) return null;
    const programs = new Map();
    for (const [ passIndex, key ] of [
        [ 0, "Main.pass0.compute" ],
        [ 1, "Main.pass1.compute" ]
    ])
    {
        const stage = description.techniques[0].passes[passIndex]
            .stageInputs.filter(Boolean)
            .find((entry) =>
                entry.m_exists
                && entry.cjsShaderBytecode?.stageName === "compute");
        const qualification = cachedStageVariant(
            stageVariants,
            stage.cjsShaderBytecode.bytes,
            `${sourcePath}#${key}`
        ).qualification;
        if (qualification.frontEnd !== "qualified")
        {
            throw new Error(qualification.reason);
        }
        programs.set(key, qualification.ir);
    }
    return preflightParticleClearEffectProfile(description, programs);
}

/**
 * Builds the pass cache seed. Effect proof class is semantic input because an
 * otherwise identical pass-0 shader is unsupported outside its companion
 * particle-clear effect.
 *
 * @param {string} passKey Canonical pass key.
 * @param {object[]} stages Active stage/digest records.
 * @param {string|null} [effectContextClass] Branded effect-proof cache class.
 * @returns {string} Deterministic variant seed.
 */
export function buildEffectPassVariantSeed(
    passKey,
    stages,
    effectContextClass = null,
    resourceTransformFingerprint = null
)
{
    if (typeof passKey !== "string"
        || !Array.isArray(stages)
        || stages.some((stage) =>
            typeof stage?.stageName !== "string"
            || typeof stage?.digest !== "string")
        || (effectContextClass !== null
            && typeof effectContextClass !== "string")
        || (resourceTransformFingerprint !== null
            && typeof resourceTransformFingerprint !== "string"))
    {
        throw new TypeError("Effect matrix pass seed requires pass/stage/context strings");
    }
    return `${passKey}|${stages.map((stage) =>
        `${stage.stageName}:${stage.digest}`).join("|")}`
        + `|effectContext:${effectContextClass || "none"}`
        + (resourceTransformFingerprint
            ? `|resourceTransforms:${resourceTransformFingerprint}`
            : "");
}

function semanticBindingsForStage(stage)
{
    const resources = stage?.resources;
    const entries = resources instanceof Map
        ? Array.from(resources, ([ registerIndex, value ]) => ({ registerIndex, value }))
        : Array.isArray(resources) ? resources : [];
    return entries.map((resource) => ({
        kind: "resource",
        registerIndex: resource.registerIndex,
        registerSpace: 0,
        registerCount: 1,
        arrayCount: resource.value?.arrayElements ?? 1,
        metadataName: resource.value?.name ?? null,
        carbon: resource.value || null
    }));
}

function stageSummary(variants)
{
    const byKey = new Map();
    const boundaries = new Map();
    const output = {
        occurrences: 0,
        uniquePrograms: variants.size,
        frontEndQualifiedOccurrences: 0,
        frontEndFailedOccurrences: 0,
        emittedWgslOccurrences: 0,
        unsupportedWgslOccurrences: 0,
        uniqueFrontEndQualifiedPrograms: 0,
        uniqueFrontEndFailedPrograms: 0,
        uniqueEmittedWgslPrograms: 0,
        uniqueUnsupportedWgslPrograms: 0
    };
    for (const variant of variants.values())
    {
        output.occurrences += variant.occurrences;
        if (variant.qualification.frontEnd === "qualified")
        {
            output.frontEndQualifiedOccurrences += variant.occurrences;
            output.uniqueFrontEndQualifiedPrograms += 1;
        }
        else
        {
            output.frontEndFailedOccurrences += variant.occurrences;
            output.uniqueFrontEndFailedPrograms += 1;
        }
        if (variant.qualification.wgsl === "emitted")
        {
            output.emittedWgslOccurrences += variant.occurrences;
            output.uniqueEmittedWgslPrograms += 1;
        }
        else if (variant.qualification.frontEnd === "qualified")
        {
            output.unsupportedWgslOccurrences += variant.occurrences;
            output.uniqueUnsupportedWgslPrograms += 1;
            increment(boundaries, variant.qualification.reason, variant.occurrences);
        }
        for (const [ key, occurrences ] of variant.keyOccurrences)
        {
            if (!byKey.has(key))
            {
                byKey.set(key, {
                    occurrences: 0,
                    uniquePrograms: 0,
                    emittedWgslOccurrences: 0,
                    unsupportedWgslOccurrences: 0
                });
            }
            const keySummary = byKey.get(key);
            keySummary.occurrences += occurrences;
            keySummary.uniquePrograms += 1;
            if (variant.qualification.wgsl === "emitted") keySummary.emittedWgslOccurrences += occurrences;
            else if (variant.qualification.frontEnd === "qualified") keySummary.unsupportedWgslOccurrences += occurrences;
        }
    }
    return {
        ...output,
        byKey: Object.fromEntries(Array.from(byKey).sort(([ left ], [ right ]) => left.localeCompare(right))),
        boundaries: mapCounts(boundaries)
    };
}

function passSummary(variants)
{
    const output = {
        occurrences: 0,
        readyOccurrences: 0,
        unsupportedOccurrences: 0,
        failedOccurrences: 0,
        uniqueVariants: variants.size,
        uniqueReadyVariants: 0,
        uniqueUnsupportedVariants: 0,
        uniqueFailedVariants: 0
    };
    const byKey = new Map();
    const boundaries = new Map();
    for (const variant of variants.values())
    {
        output.occurrences += variant.occurrences;
        if (!byKey.has(variant.passKey))
        {
            byKey.set(variant.passKey, {
                occurrences: 0,
                readyOccurrences: 0,
                unsupportedOccurrences: 0,
                failedOccurrences: 0,
                uniqueVariants: 0,
                uniqueReadyVariants: 0
            });
        }
        const keySummary = byKey.get(variant.passKey);
        keySummary.occurrences += variant.occurrences;
        keySummary.uniqueVariants += 1;
        const field = `${variant.result.status}Occurrences`;
        output[field] += variant.occurrences;
        keySummary[field] += variant.occurrences;
        const uniqueField = `unique${variant.result.status[0].toUpperCase()}${variant.result.status.slice(1)}Variants`;
        output[uniqueField] += 1;
        if (variant.result.status === "ready") keySummary.uniqueReadyVariants += 1;
        else increment(boundaries, variant.result.reason, variant.occurrences);
    }
    return {
        ...output,
        byKey: Object.fromEntries(Array.from(byKey).sort(([ left ], [ right ]) => left.localeCompare(right))),
        boundaries: mapCounts(boundaries)
    };
}

/**
 * Serializes the portable shader fields retained on a matrix stage variant.
 *
 * @param {object|null} shader Emitted independent shader descriptor.
 * @returns {object|null} JSON-safe shader summary.
 */
export function serializeIndependentShader(shader)
{
    if (!shader) return null;
    return {
        stage: shader.stage,
        entryPoint: shader.entryPoint,
        code: shader.code,
        ...(Array.isArray(shader.threadGroupSize)
            ? { threadGroupSize: [ ...shader.threadGroupSize ] }
            : {})
    };
}

function serializeStageVariants(variants)
{
    return Array.from(variants.values(), (variant) => ({
        digest: variant.digest,
        keys: Array.from(variant.keys).sort(),
        occurrences: variant.occurrences,
        frontEnd: variant.qualification.frontEnd,
        stage: variant.qualification.stage || null,
        shaderModel: variant.qualification.shaderModel || null,
        instructions: variant.qualification.instructions ?? null,
        wgsl: variant.qualification.wgsl || null,
        wgslBytes: variant.qualification.wgslBytes ?? null,
        reason: variant.qualification.reason || null,
        independentShader: serializeIndependentShader(variant.qualification.independentShader)
    })).sort((left, right) => left.digest.localeCompare(right.digest));
}

function serializePassVariants(variants)
{
    return Array.from(variants.values(), (variant) => ({
        id: variant.id,
        passKey: variant.passKey,
        techniqueName: variant.techniqueName,
        passIndex: variant.passIndex,
        stageDigests: variant.stageDigests,
        occurrences: variant.occurrences,
        exampleBodyIndex: variant.exampleBodyIndex,
        exampleOptions: variant.exampleOptions,
        effectContextClass: variant.effectContextClass || null,
        status: variant.result.status,
        phase: variant.result.phase,
        reason: variant.result.reason || null,
        wgsl: variant.result.wgsl || null
    })).sort((left, right) => left.passKey.localeCompare(right.passKey) || left.id.localeCompare(right.id));
}

async function qualifyBackend(label, sourcePath)
{
    const bytes = await readFile(sourcePath);
    const effect = CjsHlslFormat.read(bytes, { emit: CjsHlslFormat.OUTPUT_RAW, source: sourcePath });
    const axes = normalizeAxes(effect);
    const selections = enumerateEffectPermutations(axes);
    const offsets = Array.isArray(effect.m_offsets) ? effect.m_offsets : [];
    const offsetCheck = inspectEffectOffsets(offsets, selections.length);
    const stageVariants = new Map();
    const passVariants = new Map();
    const emptyTechniques = new Map();
    const topologyCounts = new Map();
    const bodyResults = [];
    const bodyFailures = [];

    for (const selection of selections)
    {
        let description;
        try
        {
            description = effect.GetShader(selection.options).GetEffectDescription();
            if (!description || !Array.isArray(description.techniques) || !description.techniques.length)
            {
                throw new Error("resolved body has no effect techniques");
            }
        }
        catch (error)
        {
            bodyFailures.push({ bodyIndex: selection.bodyIndex, reason: errorMessage(error) });
            bodyResults.push({
                bodyIndex: selection.bodyIndex,
                optionIndices: selection.optionIndices,
                options: selection.options,
                status: "failed",
                reason: errorMessage(error),
                topology: null,
                emptyTechniques: [],
                passes: []
            });
            continue;
        }

        const topology = [];
        const bodyPasses = [];
        const bodyEmptyTechniques = [];
        let effectProfileContext = null;
        try
        {
            effectProfileContext = preflightEffectProfile(
                description,
                sourcePath,
                stageVariants
            );
        }
        catch
        {
            effectProfileContext = null;
        }
        for (const technique of description?.techniques || [])
        {
            if (!Array.isArray(technique.passes) || !technique.passes.length)
            {
                bodyEmptyTechniques.push(technique.name);
                increment(emptyTechniques, technique.name);
                continue;
            }
            for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1)
            {
                const passKey = `${technique.name}.pass${passIndex}`;
                const stages = [];
                for (const stage of technique.passes[passIndex].stageInputs.filter(Boolean))
                {
                    const stageName = stage.cjsShaderBytecode?.stageName || "";
                    const bytecode = stage.cjsShaderBytecode?.bytes;
                    if (!stage.m_exists) continue;
                    if (!stageName || !bytecode?.length)
                    {
                        stages.push({
                            stageName: stageName || "unknown",
                            digest: "missing",
                            qualification: { frontEnd: "failed", reason: `${passKey} has active stage data without bytecode` }
                        });
                        continue;
                    }
                    const digest = hashBytes(bytecode);
                    const variant = cachedStageVariant(
                        stageVariants,
                        bytecode,
                        `${sourcePath}#${passKey}.${stageName}`
                    );
                    const stageKey = `${passKey}.${stageName}`;
                    variant.keys.add(stageKey);
                    increment(variant.keyOccurrences, stageKey);
                    variant.occurrences += 1;
                    stages.push({
                        stageName,
                        digest,
                        qualification: variant.qualification,
                        semanticBindings: semanticBindingsForStage(stage)
                    });
                }
                topology.push(`${passKey}:${stages.map((stage) => stage.stageName).join("+")}`);
                const effectProfileProof = particleClearEffectProofFor(
                    effectProfileContext,
                    `${passKey}.compute`
                );
                const proofClass = effectProfileProof
                    ? particleClearEffectProofClass(effectProfileContext)
                    : null;
                const resourceTransformPlan = buildResourceTransformPlan(
                    stages.map((stage) => ({
                        ir: stage.qualification.ir,
                        semanticBindings: stage.semanticBindings || []
                    })),
                    { layoutKey: passKey }
                );
                const resourceTransformFingerprint = resourceTransformPlan
                    ? hashText(JSON.stringify(resourceTransformPlan))
                    : null;
                const variantSeed = buildEffectPassVariantSeed(
                    passKey,
                    stages,
                    proofClass,
                    resourceTransformFingerprint
                );
                const variantKey = variantSeed;
                if (!passVariants.has(variantKey))
                {
                    passVariants.set(variantKey, {
                        id: hashText(variantSeed).slice(0, 16),
                        passKey,
                        techniqueName: technique.name,
                        passIndex,
                        stageDigests: stages.map((stage) => ({ stageName: stage.stageName, digest: stage.digest })),
                        occurrences: 0,
                        exampleBodyIndex: selection.bodyIndex,
                        exampleOptions: selection.options,
                        effectContextClass: proofClass,
                        result: qualifyPass(
                            passKey,
                            stages,
                            effectProfileProof,
                            resourceTransformPlan
                        )
                    });
                }
                const passVariant = passVariants.get(variantKey);
                passVariant.occurrences += 1;
                bodyPasses.push({ passKey, variantId: passVariant.id, status: passVariant.result.status });
            }
        }
        const topologySignature = topology.join("|");
        increment(topologyCounts, topologySignature);
        bodyResults.push({
            bodyIndex: selection.bodyIndex,
            optionIndices: selection.optionIndices,
            options: selection.options,
            status: "qualified",
            topology: topologySignature,
            emptyTechniques: bodyEmptyTechniques.sort(),
            passes: bodyPasses
        });
    }

    const stages = stageSummary(stageVariants);
    const passes = passSummary(passVariants);
    return {
        label,
        sourcePath,
        byteLength: bytes.byteLength,
        version: effect.m_version,
        compilerVersion: effect.m_compilerVersion,
        axes,
        expectedBodies: selections.length,
        ...offsetCheck,
        resolvedBodies: selections.length - bodyFailures.length,
        failedBodies: bodyFailures.length,
        emptyTechniqueOccurrences: mapCounts(emptyTechniques),
        topologyCounts: mapCounts(topologyCounts),
        stages,
        passes,
        stageVariants: serializeStageVariants(stageVariants),
        passVariants: serializePassVariants(passVariants),
        bodyFailures,
        bodyResults
    };
}

function compareBackends(dx11, dx12)
{
    const axesMatch = JSON.stringify(dx11.axes) === JSON.stringify(dx12.axes);
    const activeTopologyMismatches = [];
    const emptyTechniqueDifferences = new Map();
    const count = Math.max(dx11.bodyResults.length, dx12.bodyResults.length);
    for (let bodyIndex = 0; bodyIndex < count; bodyIndex += 1)
    {
        const left = dx11.bodyResults[bodyIndex];
        const right = dx12.bodyResults[bodyIndex];
        if (left?.topology !== right?.topology)
        {
            activeTopologyMismatches.push({
                bodyIndex,
                dx11: left?.topology ?? null,
                dx12: right?.topology ?? null
            });
        }
        const leftEmpty = (left?.emptyTechniques || []).join("+") || "<none>";
        const rightEmpty = (right?.emptyTechniques || []).join("+") || "<none>";
        if (leftEmpty !== rightEmpty) increment(emptyTechniqueDifferences, `dx11:${leftEmpty}|dx12:${rightEmpty}`);
    }
    return {
        axesMatch,
        activeTopologyMatch: activeTopologyMismatches.length === 0,
        activeTopologyMismatchCount: activeTopologyMismatches.length,
        activeTopologyMismatches: activeTopologyMismatches.slice(0, 20),
        emptyTechniqueDifferences: mapCounts(emptyTechniqueDifferences)
    };
}

/**
 * Qualifies every permutation and active pipeline pass in one DX11/DX12 pair.
 * Unsupported WGSL is a recorded boundary, while body/front-end/topology
 * failures make the report fail.
 *
 * @param {string} dx11Path DX11 effect path.
 * @param {string} dx12Path DX12 effect path.
 * @returns {Promise<object>} Exhaustive matrix report.
 */
export async function qualifyEffectMatrix(dx11Path, dx12Path)
{
    const [ dx11, dx12 ] = await Promise.all([
        qualifyBackend("dx11", resolve(dx11Path)),
        qualifyBackend("dx12", resolve(dx12Path))
    ]);
    const comparison = compareBackends(dx11, dx12);
    const failed = dx11.failedBodies || dx12.failedBodies
        || dx11.stages.frontEndFailedOccurrences || dx12.stages.frontEndFailedOccurrences
        || dx11.passes.failedOccurrences || dx12.passes.failedOccurrences
        || !dx11.offsetCountMatch || !dx12.offsetCountMatch
        || !dx11.offsetIndicesMatch || !dx12.offsetIndicesMatch
        || !comparison.axesMatch || !comparison.activeTopologyMatch;
    return {
        format: MATRIX_FORMAT,
        formatVersion: MATRIX_VERSION,
        status: failed ? "failed" : "qualified",
        comparison,
        backends: { dx11, dx12 }
    };
}

/**
 * Removes per-body/code detail while retaining exhaustive coverage totals.
 *
 * @param {object} report Full matrix report.
 * @returns {object} Compact JSON-safe summary.
 */
export function summarizeEffectMatrix(report)
{
    const summarizeBackend = (backend) => ({
        sourcePath: backend.sourcePath,
        byteLength: backend.byteLength,
        expectedBodies: backend.expectedBodies,
        offsetRecords: backend.offsetRecords,
        offsetCountMatch: backend.offsetCountMatch,
        offsetIndicesMatch: backend.offsetIndicesMatch,
        resolvedBodies: backend.resolvedBodies,
        failedBodies: backend.failedBodies,
        axes: backend.axes,
        emptyTechniqueOccurrences: backend.emptyTechniqueOccurrences,
        topologyCounts: backend.topologyCounts,
        stages: backend.stages,
        passes: backend.passes
    });
    return {
        format: report.format,
        formatVersion: report.formatVersion,
        status: report.status,
        comparison: report.comparison,
        backends: {
            dx11: summarizeBackend(report.backends.dx11),
            dx12: summarizeBackend(report.backends.dx12)
        }
    };
}
