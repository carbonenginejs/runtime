import { readEffectAnalysis } from "./effectAnalysis.js";
import { buildEffectAnalysis, buildPackage, inspectWithValues } from "./helpers.js";
import { lowerDxbcToIr } from "./ir/lowerDxbcToIr.js";
import { buildWgslBindingPlan } from "./wgsl/buildWgslBindingPlan.js";
import { buildWgsl } from "./wgsl/emitWgsl.js";
import { buildWgslSet } from "./wgsl/buildWgslSet.js";
import { buildResourceTransformPlan } from "./wgsl/buildResourceTransformPlan.js";
import {
    buildEffectPermutationGraph,
    EFFECT_PERMUTATION_GRAPH_CHUNK,
    EFFECT_PERMUTATION_GRAPH_FORMAT,
    EFFECT_PERMUTATION_GRAPH_VERSION
} from "../../../format/effect/effectPermutationGraph.js";
import {
    buildCompleteEffectReflection,
    EFFECT_REFLECTION_BLOB_CHUNK,
    EFFECT_REFLECTION_CHUNK
} from "../../../format/effect/effectReflectionPackage.js";
import {
    buildEffectBackendBodySet,
    EFFECT_BACKEND_BODY_SET_CHUNK,
    EFFECT_BACKEND_BODY_SET_FORMAT,
    EFFECT_BACKEND_BODY_SET_VERSION
} from "./effectBackendBodySet.js";
import {
    DXBC_WGSL_TRANSLATOR_NAME,
    DXBC_WGSL_TRANSLATOR_VERSION,
    FORMAT_WEBGPU_PACKAGE_NAME,
    FORMAT_WEBGPU_PACKAGE_VERSION,
    WEBGPU_BACKEND_NAME
} from "./packageMetadata.js";
import { sha256Bytes, sha256Utf8 } from "../../../format/effect/sha256.js";
import {
    isParticleClearEffectCandidate,
    particleClearEffectProofFor,
    preflightParticleClearEffectProfile
} from "./wgsl/lowerParticleClearComputePrograms.js";
import {
    buildWgslSelectionMetadata,
    normalizeEffectPermutation,
    selectEffectStages,
    validateResolvedPermutation
} from "./packageEffectSelection.js";

/**
 * Build one structurally valid CEWGPU package from compiled Tr2 effect bytes.
 *
 * Version-15 packages preserve every unique body's source reflection while
 * resolving one backend body and emitting complete passes within the requested
 * stage selection. Filesystem concerns remain in callers.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
 * @param {object} [options] Source, body-mode, permutation, and stage-selection policy.
 * @returns {object} Package bytes plus inspection and provenance documents.
 */
export function buildEffectPackage(input, options = {})
{
    const mode = normalizeMode(options.mode, options.allPermutations);
    const source = normalizeSource(options.source);
    const outputPath = normalizeOptionalString(options.outputPath, "Effect outputPath");
    const sourceIdentity = normalizeSourceIdentity(
        options.sourceIdentity,
        source,
        input
    );
    const permutation = normalizeEffectPermutation(options.permutation);
    const selection = normalizeSelection(options.selection);
    const resolved = readEffectAnalysis(input, { source, permutation });

    validateResolvedPermutation(permutation, resolved.selection?.selectedOptions ?? []);

    const analysis = buildEffectAnalysis(resolved, {
        source,
        decodeBytecode: false,
        decodeInstructions: false
    });
    const bytecodeByKey = resolved.stageBytecodeByKey;
    const selectedStages = selectEffectStages(analysis.stages, selection);
    const programsByKey = new Map();
    const programForKey = (key) =>
    {
        if (programsByKey.has(key)) return programsByKey.get(key);
        const bytecode = bytecodeByKey.get(key)?.bytes;

        if (!bytecode?.length)
        {
            throw new Error(`${key} has no shader bytecode`);
        }
        const program = lowerDxbcToIr(
            bytecode,
            { source: `${source}#${key}` }
        );
        programsByKey.set(key, program);
        return program;
    };
    let effectProfileContext = null;
    if (isParticleClearEffectCandidate(resolved.effectDescription))
    {
        programForKey("Main.pass0.compute");
        programForKey("Main.pass1.compute");
        effectProfileContext = preflightParticleClearEffectProfile(
            resolved.effectDescription,
            programsByKey
        );
    }
    const irEntries = selectedStages.map((stage) => ({
        key: stage.key,
        passKey: `${stage.techniqueName}.pass${stage.passIndex}`,
        ir: programForKey(stage.key),
        semanticBindings: analysis.stages.find((candidate) =>
            candidate.techniqueName === stage.techniqueName
            && candidate.passIndex === stage.passIndex
            && candidate.stageName === stage.stageName)?.bindings || [],
        effectProfileProof: particleClearEffectProofFor(
            effectProfileContext,
            stage.key
        )
    }));
    const programsByPass = new Map();

    for (const entry of irEntries)
    {
        if (!programsByPass.has(entry.passKey))
        {
            programsByPass.set(entry.passKey, []);
        }

        programsByPass.get(entry.passKey).push(entry);
    }

    const resourceTransformPlans = new Map(Array.from(programsByPass, ([ key, entries ]) => [
        key,
        buildResourceTransformPlan(
            entries.map((entry) => ({
                ir: entry.ir,
                semanticBindings: entry.semanticBindings
            })),
            { layoutKey: key }
        )
    ]));
    const plans = new Map(Array.from(programsByPass, ([ key, entries ]) =>
    {
        const proof = entries.find((entry) => entry.effectProfileProof)
            ?.effectProfileProof ?? null;
        const resourceTransformPlan = resourceTransformPlans.get(key);
        return [
            key,
            buildWgslBindingPlan(
                entries.map((entry) => entry.ir),
                {
                    ...(options.bindingPolicy ?? {}),
                    ...(proof ? { effectProfileProof: proof } : {}),
                    ...(resourceTransformPlan ? { resourceTransformPlan } : {})
                }
            )
        ];
    }));
    const shaderEntries = irEntries.map((entry) => ({
        key: entry.key,
        shader: buildWgsl(entry.ir, {
            bindingPlan: plans.get(entry.passKey),
            ...(resourceTransformPlans.get(entry.passKey)
                ? { resourceTransformPlan: resourceTransformPlans.get(entry.passKey) }
                : {}),
            ...(entry.effectProfileProof
                ? { effectProfileProof: entry.effectProfileProof }
                : {})
        })
    }));
    const wgsl = buildWgslSet(shaderEntries);
    const wgslSelection = buildWgslSelectionMetadata(selection, selectedStages);
    const permutationGraph = buildEffectPermutationGraph(resolved.effectRes);
    const effectReflection = resolved.effectRes.m_version === 15
        ? buildCompleteEffectReflection(
            resolved.effectRes,
            permutationGraph,
            { sourceIdentity, sourcePath: source }
        )
        : null;
    if (mode === "all" && !effectReflection)
    {
        throw new Error(
            "Effect package mode all requires complete version-15 source reflection"
        );
    }

    const backendBodySet = mode === "all"
        ? buildEffectBackendBodySet(resolved.effectRes, permutationGraph, {
            source,
            selection,
            bindingPolicy: options.bindingPolicy
        })
        : null;
    const completeness = Object.freeze({
        packageValid: true,
        sourceComplete: effectReflection !== null,
        backendComplete: false,
        runtimeComplete: false
    });
    const info = {
        format: "CEWGPU",
        formatVersion: effectReflection ? 3 : 2,
        packageKind: "tr2-effect-webgpu",
        sourcePath: source,
        outputPath,
        sourceIdentity,
        targetBackend: WEBGPU_BACKEND_NAME,
        backendPackage: FORMAT_WEBGPU_PACKAGE_NAME,
        backendPackageVersion: FORMAT_WEBGPU_PACKAGE_VERSION,
        translator: DXBC_WGSL_TRANSLATOR_NAME,
        translatorVersion: DXBC_WGSL_TRANSLATOR_VERSION,
        permutationGraph: Object.freeze({
            chunk: EFFECT_PERMUTATION_GRAPH_CHUNK,
            format: EFFECT_PERMUTATION_GRAPH_FORMAT,
            formatVersion: EFFECT_PERMUTATION_GRAPH_VERSION,
            ...(effectReflection ? {
                sha256: sha256Utf8(`${JSON.stringify(permutationGraph)}\n`)
            } : {}),
            permutationCount: permutationGraph.variants.length,
            uniqueBodyCount: permutationGraph.bodies.length
        }),
        ...(effectReflection
            ? {
                effectReflection: effectReflection.pointer,
                sourceBodyCoverage: "all-unique",
                backendBodyCoverage: backendBodySet
                    ? backendBodySet.coverage.bodies
                    : "selected"
            }
            : {}),
        ...(backendBodySet
            ? {
                backendBodySet: Object.freeze({
                    chunk: EFFECT_BACKEND_BODY_SET_CHUNK,
                    format: EFFECT_BACKEND_BODY_SET_FORMAT,
                    formatVersion: EFFECT_BACKEND_BODY_SET_VERSION,
                    sha256: sha256Utf8(`${JSON.stringify(backendBodySet)}\n`),
                    bodyCount: backendBodySet.bodyCount,
                    translatedBodyCount: backendBodySet.translatedBodyCount,
                    passUnitCount: backendBodySet.passUnitCount
                })
            }
            : {}),
        bodyMode: mode,
        completeness,
        stageCount: analysis.stages.length,
        selectedStageCount: selectedStages.length,
        shaderCount: wgsl.shaders.length,
        layoutCount: wgsl.layouts.length
    };
    const metadata = {
        effectName: analysis.effectName,
        sourcePath: source,
        bodyMode: mode,
        bodyIndex: analysis.bodyIndex,
        selectedOptions: analysis.selectedOptions,
        ...(wgslSelection ? { wgslSelection } : {})
    };
    const bytes = buildPackage([
        [ "INFO", info ],
        [ "META", metadata ],
        [ EFFECT_PERMUTATION_GRAPH_CHUNK, permutationGraph ],
        ...(effectReflection ? [
            [ EFFECT_REFLECTION_CHUNK, effectReflection.reflection ],
            [ EFFECT_REFLECTION_BLOB_CHUNK, effectReflection.blobBytes ]
        ] : []),
        [ "ANLS", analysis ],
        [ "WGSL", wgsl ],
        ...(backendBodySet ? [ [ EFFECT_BACKEND_BODY_SET_CHUNK, backendBodySet ] ] : [])
    ]);
    const inspection = inspectWithValues(bytes, {
        source,
        emit: "json"
    });
    const qualification = Object.freeze({
        ok: true,
        level: "structural",
        validator: "cewgpu-structural",
        mode,
        ...completeness,
        selectedStageCount: selectedStages.length,
        shaderCount: wgsl.shaders.length,
        layoutCount: wgsl.layouts.length,
        ...(backendBodySet
            ? {
                backendBodyCount: backendBodySet.bodyCount,
                backendTranslatedBodyCount: backendBodySet.translatedBodyCount,
                backendPassUnitCount: backendBodySet.passUnitCount
            }
            : {}),
        nativeComparison: false
    });

    return Object.freeze({
        bytes,
        info: Object.freeze(info),
        metadata: Object.freeze(metadata),
        permutationGraph,
        reflection: effectReflection?.reflection ?? null,
        reflectionBlobs: effectReflection?.blobBytes ?? null,
        analysis,
        wgsl,
        backendBodySet,
        inspection: Object.freeze(inspection),
        qualification
    });
}

function normalizeMode(value, allPermutations)
{
    if (allPermutations !== undefined && typeof allPermutations !== "boolean")
    {
        throw new TypeError("Effect allPermutations compatibility option must be boolean");
    }

    const mode = String(allPermutations === true ? "all" : value ?? "selected").trim();

    if (mode !== "selected" && mode !== "all")
    {
        throw new Error(
            `Effect package mode ${mode || "<empty>"} is not supported; `
            + "supported modes are selected and all"
        );
    }

    return mode;
}

function normalizeSource(value)
{
    const source = String(value ?? "memory").trim();

    return source || "memory";
}

function normalizeOptionalString(value, name)
{
    if (value === undefined || value === null)
    {
        return null;
    }

    const result = String(value).trim();

    if (!result)
    {
        throw new TypeError(`${name} must be a non-empty string or null`);
    }

    return result;
}

function normalizeSelection(value)
{
    if (value === undefined || value === null)
    {
        return null;
    }

    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError("Effect stage selection must be an object");
    }

    const techniqueName = String(value.techniqueName ?? "").trim();
    const passIndex = value.passIndex ?? null;
    const stageNames = value.stageNames ?? [];

    if (!techniqueName)
    {
        throw new TypeError("Effect stage selection requires techniqueName");
    }

    if (passIndex !== null && (!Number.isSafeInteger(passIndex) || passIndex < 0))
    {
        throw new TypeError("Effect stage selection passIndex must be a non-negative integer or null");
    }

    if (!Array.isArray(stageNames)
        || stageNames.some((stageName) => ![ "vertex", "pixel", "compute" ].includes(stageName)))
    {
        throw new TypeError("Effect stage selection supports only vertex, pixel, and compute stageNames");
    }

    if (stageNames.length && passIndex === null)
    {
        throw new TypeError("Effect stageNames require an exact passIndex");
    }

    return Object.freeze({
        techniqueName,
        passIndex,
        stageNames: Object.freeze([ ...new Set(stageNames) ])
    });
}

function normalizeSourceIdentity(value, source, input)
{
    if (value !== undefined && value !== null
        && (!value || typeof value !== "object" || Array.isArray(value)))
    {
        throw new TypeError("Effect sourceIdentity must be an object");
    }

    const bytes = input instanceof Uint8Array
        ? input
        : input instanceof ArrayBuffer
            ? new Uint8Array(input)
            : ArrayBuffer.isView(input)
                ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
                : null;

    if (!bytes)
    {
        throw new TypeError("Effect input must be Uint8Array, ArrayBuffer, or ArrayBufferView bytes");
    }

    const sha256 = sha256Bytes(bytes);
    if (value?.sha256 !== undefined && value?.sha256 !== null
        && value.sha256 !== sha256)
    {
        throw new Error(
            "Effect sourceIdentity.sha256 does not match the exact effect input bytes"
        );
    }

    return Object.freeze({
        logicalPath: value?.logicalPath ?? source,
        game: value?.game ?? null,
        client: value?.client ?? null,
        build: value?.build === undefined || value?.build === null ? null : String(value.build),
        byteLength: bytes.byteLength,
        md5: value?.md5 ?? null,
        sha256
    });
}
