import { readEffectAnalysis } from "./effectAnalysis.js";
import { buildEffectAnalysis, inspectWithValues } from "./helpers.js";
import { buildCarbonEffectContainer } from "./buildCarbonEffectContainer.js";
import { lowerDxbcToIr } from "./ir/lowerDxbcToIr.js";
import { buildWgslBindingPlan } from "./wgsl/buildWgslBindingPlan.js";
import { buildWgsl } from "./wgsl/emitWgsl.js";
import { buildWgslSet } from "./wgsl/buildWgslSet.js";
import { buildResourceTransformPlan } from "./wgsl/buildResourceTransformPlan.js";
import {
    buildEffectPermutationGraph,
    EFFECT_PERMUTATION_GRAPH_FORMAT,
    EFFECT_PERMUTATION_GRAPH_VERSION
} from "../../../format/effect/effectPermutationGraph.js";
import {
    buildEffectBackendBodySet,
    EFFECT_BACKEND_BODY_SET_FORMAT,
    EFFECT_BACKEND_BODY_SET_VERSION
} from "./effectBackendBodySet.js";
import {
    DXBC_WGSL_TRANSLATOR_NAME,
    DXBC_WGSL_TRANSLATOR_VERSION,
    EFFECT_INFO_VERSION,
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
 * Build one structurally valid Carbon WebGPU package from compiled Tr2 effect bytes.
 *
 * The version-15 build result retains every unique body's portable source
 * reflection as in-memory evidence while the emitted Carbon wire stores WGSL
 * or empty program slots plus representable non-program fields. Filesystem
 * concerns remain in callers.
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

    // One INFO version means one contract, and that contract requires complete
    // source reflection, which only version-15 input can supply.
    if (resolved.effectRes?.m_version !== 15)
    {
        throw new Error(
            "Effect package requires a version-15 compiled effect, got version "
            + (resolved.effectRes?.m_version ?? "unknown")
        );
    }

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
    // The source is complete when it is a version-15 container. This used to be
    // read off a built reflection document, which made the document look load
    // bearing when it was only ever a consequence of the same version check.
    const sourceComplete = resolved.effectRes.m_version === 15;
    if (mode === "all" && !sourceComplete)
    {
        throw new Error(
            "Effect package mode all requires a complete version-15 source"
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
        sourceComplete,
        backendComplete: false,
        runtimeComplete: false
    });
    const info = {
        format: "CARBON_WEBGPU",
        formatVersion: EFFECT_INFO_VERSION,
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
            format: EFFECT_PERMUTATION_GRAPH_FORMAT,
            formatVersion: EFFECT_PERMUTATION_GRAPH_VERSION,
            sha256: sha256Utf8(`${JSON.stringify(permutationGraph)}\n`),
            permutationCount: permutationGraph.variants.length,
            uniqueBodyCount: permutationGraph.bodies.length
        }),
        ...(sourceComplete
            ? {
                sourceBodyCoverage: "all-unique",
                backendBodyCoverage: backendBodySet
                    ? backendBodySet.coverage.bodies
                    : "selected"
            }
            : {}),
        ...(backendBodySet
            ? {
                backendBodySet: Object.freeze({
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
    // The switchover. Former stored chunks are now compatibility views over the
    // Carbon records: the permutation graph comes from the header and offset
    // table, and a translated pass comes from shaderData plus its trailing
    // block. The description tree retains only representable non-program
    // reflection; full portable source reflection remains in the rich
    // in-memory return value below.
    //
    // The wire no longer stores cross-chunk digests. The rich return value keeps
    // hashes as build evidence; they are not records in the emitted container.
    const emittedBodySet = backendBodySet
        ?? selectedModeBodySet(permutationGraph, wgsl, analysis.bodyIndex);
    const container = buildCarbonEffectContainer(
        resolved.effectRes,
        permutationGraph,
        emittedBodySet,
        { compilerVersion: resolved.effectRes.m_compilerVersionBytes }
    );
    const bytes = container.bytes;
    const inspection = inspectWithValues(bytes, {
        source,
        emit: "json"
    });
    const qualification = Object.freeze({
        ok: true,
        level: "structural",
        validator: "carbon-webgpu-structural",
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
        analysis,
        wgsl,
        backendBodySet,
        inspection: Object.freeze(inspection),
        qualification
    });
}

/**
 * Wraps a selected-mode translation as the body set the container emitter takes.
 *
 * `mode: "all"` builds a real body set covering every unique body. `mode:
 * "selected"` translates exactly one, and the container still carries every
 * permutation — that asymmetry is the format working as intended rather than a
 * gap. When the container emitter rebuilds an untranslated body, it retains
 * representable non-program description fields and writes zero-length program
 * slots.
 *
 * So this does not translate anything. It reshapes the one translation already
 * performed into the body-set contract, and marks every other body unsupported.
 *
 * @param {object} permutationGraph Validated permutation graph.
 * @param {object} wgsl Emitted WGSL set for the selected body.
 * @param {number} bodyIndex Selected permutation index.
 * @returns {object} Body set covering one translated body.
 */
function selectedModeBodySet(permutationGraph, wgsl, bodyIndex)
{
    const selectedBodyKey = permutationGraph.variants
        .find((variant) => variant.permutationIndex === bodyIndex)?.bodyKey
        ?? permutationGraph.variants[0]?.bodyKey
        ?? null;

    const shadersByPass = new Map();
    for (const shader of wgsl.shaders)
    {
        const passKey = `${shader.techniqueName}.pass${shader.passIndex}`;
        if (!shadersByPass.has(passKey)) shadersByPass.set(passKey, []);
        shadersByPass.get(passKey).push(shader);
    }

    const passUnits = [];
    const passes = [];
    for (const [ passKey, shaders ] of shadersByPass)
    {
        const transforms = (wgsl.resourceTransforms ?? [])
            .filter((transform) => transform.layoutKey === passKey);
        const unit = {
            key: `unit${passUnits.length}`,
            wgslSetVersion: wgsl.formatVersion,
            shaders,
            layouts: wgsl.layouts.filter((layout) => layout.key === passKey),
            ...(transforms.length ? { resourceTransforms: transforms } : {})
        };
        passUnits.push(unit);
        passes.push({ passKey, unitKey: unit.key });
    }

    const bodies = permutationGraph.bodies.map((body) => (body.key === selectedBodyKey
        ? {
            bodyKey: body.key,
            representativePermutationIndex: bodyIndex,
            status: "translated",
            error: null,
            passCount: passes.length,
            passes
        }
        : {
            bodyKey: body.key,
            representativePermutationIndex: permutationGraph.variants
                .find((variant) => variant.bodyKey === body.key)?.permutationIndex ?? 0,
            status: "unsupported",
            error: "not translated in selected mode",
            passCount: 0,
            passes: []
        }));

    return {
        bodyCount: bodies.length,
        translatedBodyCount: 1,
        passUnitCount: passUnits.length,
        passUnits,
        bodies
    };
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
