import { CjsHlslFormat } from "../../hlsl/index.js";
import { HlslEffectBindingManifest } from "../../hlsl/core/tr2/shader/HlslEffectBindingManifest.js";
import { HlslRenderContextEnum, hlslShaderStageName } from "../../hlsl/core/tr2/HlslRenderContextEnum.js";

import {
    buildEffectPermutationGraph,
    EFFECT_PERMUTATION_GRAPH_CHUNK,
    EFFECT_PERMUTATION_GRAPH_FORMAT,
    EFFECT_PERMUTATION_GRAPH_VERSION
} from "../../../format/effect/effectPermutationGraph.js";
import { buildCompleteEffectReflection } from "../../../format/effect/effectReflectionPackage.js";
import { emitGlslWithOptions } from "./helpers.js";
import { inspectGlslEffectContainer } from "./inspectGlslEffectContainer.js";
import { inspectRasterCompleteness } from "./glslEffectCompleteness.js";
import { recogniseDetailMapFamily } from "../../hlsl/core/detailMapFamily.js";
import {
    recogniseLocalLightFamily,
    stripLocalLightBindings
} from "../../hlsl/core/localLightFamily.js";
import { buildGlslBackendBodySet } from "./glslBackendBodySet.js";
import { buildGlslEffectContainer } from "./buildGlslEffectContainer.js";
import { sha256Bytes, sha256Utf8 } from "../../../format/effect/sha256.js";

/**
 * INFO record version for the in-memory build result.
 *
 * This lived in effectPackageValidation.js, which validated a written chunk
 * package by reading it back. There is no chunk package to read back, so that
 * file is gone and its one surviving constant lives with its only user.
 */
const EFFECT_INFO_VERSION = 3;

const PACKAGE_VERSION = "0.11.1";

/**
 * Builds a complete CEWG package from compiled Tr2 effect bytes.
 *
 * This browser-safe path owns whole-effect selection, stage translation,
 * package assembly, and structural qualification. Filesystem and native-tool
 * concerns remain in Node callers.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
 * @param {object} [options] Selection, provenance, and emitter policy.
 * @returns {object} Package bytes plus inspection and qualification records.
 */
export function buildEffectPackage(input, options = {})
{
    const values = normalizeOptions(input, options);
    const effectRes = CjsHlslFormat.read(values.sourceBytes, {
        emit: CjsHlslFormat.OUTPUT_RAW,
        source: values.source
    });

    if (!effectRes.IsGood())
    {
        throw effectRes.loadError || new Error("Tr2EffectRes failed to load input");
    }

    const sourceIdentity = normalizeSourceIdentity(values);
    // One INFO version means one contract, and that contract requires complete
    // source reflection, which only version-15 input can supply.
    if (effectRes.m_version !== 15)
    {
        throw new Error(
            "Effect package requires a version-15 compiled effect, got version "
            + (effectRes.m_version ?? "unknown")
        );
    }

    const permutationGraph = buildEffectPermutationGraph(effectRes);
    const reflectionPackage = effectRes.m_version === 15
        ? buildCompleteEffectReflection(
            effectRes,
            permutationGraph,
            {
                sourceIdentity,
                sourcePath: values.source
            }
        )
        : null;
    const variants = buildExportVariants(effectRes, values.allPermutations);
    const bodyMap = new Map();
    const stageMap = new Map();
    const shaderMap = new Map();

    for (const variant of variants)
    {
        if (bodyMap.has(variant.bodyKey))
        {
            continue;
        }

        const shader = effectRes.GetShader(toShaderOptions(variant.options));

        if (!shader)
        {
            bodyMap.set(variant.bodyKey, {
                key: variant.bodyKey,
                bodyOffset: variant.bodyOffset,
                bodySize: variant.bodySize,
                firstVariantKey: variant.key,
                error: "Tr2EffectRes.GetShader returned null",
                manifest: null,
                stages: []
            });
            continue;
        }

        const effectDescription = shader.GetEffectDescription();
        const manifest = HlslEffectBindingManifest.fromEffectDescription(effectDescription);
        const collection = collectStages(effectDescription, values.selection);
        const body = {
            key: variant.bodyKey,
            bodyOffset: variant.bodyOffset,
            bodySize: variant.bodySize,
            firstVariantKey: variant.key,
            error: collection.errors.length ? collection.errors.join("; ") : null,
            // Dropping the light family removes its declarations from the
            // shader, so the manifest must stop advertising them too.
            manifest: values.localLights === "drop"
                ? stripLocalLightBindings(manifest.toJSON())
                : manifest.toJSON(),
            stages: []
        };

        for (const stage of collection.stages)
        {
            const stageKey = `${variant.bodyKey}.${stage.key}`;
            const shaderKey = `shader_${stageKey}`;
            const contract = buildStageContract(stage);
            const stageRecord = {
                key: stageKey,
                bodyKey: variant.bodyKey,
                localKey: stage.key,
                techniqueName: stage.techniqueName,
                passIndex: stage.passIndex,
                stageType: stage.stageType,
                stageName: stage.stageName,
                shaderHandle: stage.shaderHandle,
                shaderSize: stage.bytecode.shaderSize,
                stringTableOffset: stage.bytecode.stringTableOffset,
                shaderKey,
                contract
            };

            stageMap.set(stageKey, stageRecord);
            body.stages.push(stageKey);
            shaderMap.set(shaderKey, {
                key: shaderKey,
                firstStageKey: stageKey,
                firstBodyKey: variant.bodyKey,
                stageName: stage.stageName,
                shaderSize: stage.bytecode.shaderSize,
                stringTableOffset: stage.bytecode.stringTableOffset,
                bytes: stage.bytecode.bytes,
                detailMapArray: stage.detailMapArray,
                localLights: stage.localLights,
                contracts: [ {
                    stageKey,
                    techniqueName: stage.techniqueName,
                    passIndex: stage.passIndex,
                    stageName: stage.stageName,
                    contract
                } ]
            });
        }

        bodyMap.set(variant.bodyKey, body);
    }

    translateStages(shaderMap, stageMap, values);

    const bodies = Array.from(bodyMap.values());
    const stages = Array.from(stageMap.values());
    const translatedShaders = Array.from(shaderMap.values()).map((record) =>
    {
        const { bytes, emit, ...output } = record;

        output.primaryContract = mergeShaderContracts(output.contracts);
        return output;
    });
    const failedShaders = translatedShaders.filter((record) =>
        !record.hlsl2webgl?.ok && !record.excluded);
    const excludedShaders = translatedShaders.filter((record) => record.excluded);
    const failedBodies = bodies.filter((body) => body.error);
    // The same rule the validator applies to a finished file. This function used
    // to carry its own copy, and the two had already drifted: the local one had
    // dropped `hlsl2webgl.reason` from its reason chain, so the library and the
    // validator could describe one incomplete pass two different ways. If two
    // places must agree, one of them calls the other.
    const rasterCompleteness = inspectRasterCompleteness(stages, translatedShaders);
    const availableShaderCount = translatedShaders.filter((record) =>
        record.hlsl2webgl?.ok && record.source).length;
    const info = {
        format: "CEWG",
        formatVersion: EFFECT_INFO_VERSION,
        packageKind: values.allPermutations
            ? "tr2-effect-webgl-permutations"
            : "tr2-effect-webgl",
        targetBackend: "webgl",
        backendPackage: "@carbonenginejs/runtime-resource/formats/webgl",
        backendPackageVersion: PACKAGE_VERSION,
        generatedAt: values.generatedAt,
        sourcePath: values.source,
        outputPath: values.outputPath,
        sourceByteLength: sourceIdentity.byteLength,
        sourceMd5: sourceIdentity.md5,
        sourceSha256: sourceIdentity.sha256,
        sourceIdentity,
        translator: "dxbc-js-emitter",
        translatorVersion: PACKAGE_VERSION,
        language: "es300",
        flags: null,
        selection: values.selection,
        permutationMode: values.allPermutations ? "all" : "selected",
        defaultPermutationIndex: defaultPermutationIndex(effectRes.m_permutations),
        sourceEffectVersion: effectRes.m_version,
        ...(reflectionPackage ? {
            sourceBodyCoverage: "all-unique",
            backendBodyCoverage: values.allPermutations ? "all" : "selected",
            backendProgramCoverage: selectionCoversWholeEffect(values.selection)
                ? "all-stages"
                : "filtered"
        } : {}),
        permutationCount: variants.length,
        uniqueBodyCount: bodies.length,
        sourcePermutationCount: permutationGraph.variants.length,
        sourceUniqueBodyCount: permutationGraph.bodies.length,
        permutationGraph: {
            chunk: EFFECT_PERMUTATION_GRAPH_CHUNK,
            format: EFFECT_PERMUTATION_GRAPH_FORMAT,
            formatVersion: EFFECT_PERMUTATION_GRAPH_VERSION,
            sha256: sha256Utf8(`${JSON.stringify(permutationGraph)}\n`),
            permutationCount: permutationGraph.variants.length,
            uniqueBodyCount: permutationGraph.bodies.length
        },
        ...(reflectionPackage
            ? { effectReflection: reflectionPackage.pointer }
            : {}),
        bodyStageCount: stages.length,
        uniqueShaderCount: translatedShaders.length,
        translatedShaderCount: translatedShaders.length - failedShaders.length - excludedShaders.length,
        excludedShaderCount: excludedShaders.length,
        failedShaderCount: failedShaders.length,
        failedBodyCount: failedBodies.length,
        expectedRasterPassCount: rasterCompleteness.expectedPassCount,
        completeRasterPassCount: rasterCompleteness.completePassCount,
        incompleteRasterPassCount: rasterCompleteness.incompletePasses.length,
        availableShaderCount,
        allowFailures: values.allowFailures,
        completeness: {
            packageValid: true,
            sourceComplete: reflectionPackage !== null,
            backendComplete: false,
            runtimeComplete: false
        }
    };
    const metadata = {
        generatedAt: values.generatedAt,
        sourcePath: values.source,
        effectResource: effectRes.toJSON(),
        permutations: effectRes.GetPermutationDescription(),
        variants,
        bodies: bodies.map((body) => ({
            key: body.key,
            bodyOffset: body.bodyOffset,
            bodySize: body.bodySize,
            firstVariantKey: body.firstVariantKey,
            error: body.error,
            manifest: body.manifest
        }))
    };
    const glsl = {
        format: "CEWG_GLSL_SET",
        formatVersion: 1,
        language: "es300",
        permutationMode: info.permutationMode,
        selection: values.selection,
        variants: variants.map((variant) => ({
            key: variant.key,
            permutationIndex: variant.permutationIndex,
            bodyKey: variant.bodyKey
        })),
        bodies: bodies.map((body) => ({
            key: body.key,
            error: body.error,
            stages: body.stages
        })),
        stages,
        shaders: translatedShaders
    };
    const qualification = qualifyEffectPackage({
        info,
        metadata,
        glsl,
        failedShaders,
        excludedShaders,
        failedBodies,
        rasterCompleteness,
        availableShaderCount
    });
    if (!qualification.ok && !values.allowFailures)
    {
        throw new Error(
            `CEWG target is incomplete; output was not built. ${qualification.errors.join("; ")}`
        );
    }

    // The container is the effect. `bytes` is its bytes, and there is no second
    // artifact — the chunk package this function used to build alongside it is
    // gone, along with the chunk assembly that produced it.
    //
    // `info`, `metadata`, `glsl`, `permutationGraph` and the reflection are
    // still returned. They are the in-memory build result, which is richer than
    // anything the wire carries: the reasons a translation failed live there and
    // nowhere else. What changed is that they are no longer *also* serialised
    // into tagged chunks beside the container.
    const backendBodySet = buildGlslBackendBodySet({
        bodies,
        stages,
        shaders: translatedShaders,
        variants,
        permutationGraph
    });
    const container = buildGlslEffectContainer(
        effectRes,
        permutationGraph,
        backendBodySet,
        { compilerVersion: effectRes.m_compilerVersionBytes }
    );

    const bytes = container.bytes;
    const inspection = inspectGlslEffectContainer(bytes, {
        source: values.source
    });

    return Object.freeze({
        bytes,
        permutationCount: container.permutationCount,
        bodyCount: container.bodyCount,
        backendBodySet,
        info: Object.freeze(info),
        metadata: Object.freeze(metadata),
        permutationGraph,
        reflection: reflectionPackage?.reflection ?? null,
        reflectionBlobs: reflectionPackage?.blobBytes ?? null,
        glsl: Object.freeze(glsl),
        inspection: Object.freeze(inspection),
        qualification: Object.freeze(qualification)
    });
}

function normalizeOptions(input, options)
{
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
        throw new TypeError("CEWG effect options must be an object");
    }

    const sourceBytes = toBytes(input);
    const source = String(options.source ?? "memory").trim() || "memory";
    const selection = Object.freeze({
        technique: options.technique === undefined || options.technique === null
            ? null
            : String(options.technique),
        pass: options.pass === undefined || options.pass === null ? null : Number(options.pass),
        stage: options.stage === undefined || options.stage === null
            ? null
            : String(options.stage).toLowerCase()
    });

    if (selection.pass !== null
        && (!Number.isSafeInteger(selection.pass) || selection.pass < 0))
    {
        throw new TypeError("CEWG effect pass must be a non-negative integer or null");
    }

    if (selection.stage !== null
        && ![ "vertex", "pixel", "compute" ].includes(selection.stage))
    {
        throw new TypeError(`Unsupported CEWG effect stage: ${selection.stage}`);
    }

    if (options.emitterOptions !== undefined
        && (!options.emitterOptions || typeof options.emitterOptions !== "object"
            || Array.isArray(options.emitterOptions)))
    {
        throw new TypeError("CEWG emitterOptions must be an object");
    }

    return {
        sourceBytes,
        source,
        outputPath: normalizeOptionalString(options.outputPath, "CEWG outputPath"),
        sourceIdentity: options.sourceIdentity ?? null,
        generatedAt: options.generatedAt === undefined || options.generatedAt === null
            ? null
            : new Date(options.generatedAt).toISOString(),
        allPermutations: options.allPermutations !== false,
        allowFailures: options.allowFailures === true,
        selection,
        // How to lower a recognised local-light family. Defaults to leaving it
        // alone, so a caller that does not ask gets the shader's own resources
        // and the honest texture count.
        localLights: normalizeLocalLightMode(options.localLights),
        emitterOptions: { ...(options.emitterOptions ?? {}) }
    };
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

function selectionCoversWholeEffect(selection)
{
    return selection.technique === null
        && selection.pass === null
        && selection.stage === null;
}

function toBytes(input)
{
    if (input instanceof Uint8Array)
    {
        return input;
    }

    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input);
    }

    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    throw new TypeError("CEWG effect input must be Uint8Array, ArrayBuffer, or ArrayBufferView bytes");
}

function defaultPermutationIndex(permutations)
{
    let multiplier = 1;
    let index = 0;

    for (const permutation of permutations)
    {
        index += (permutation.defaultOption || 0) * multiplier;
        multiplier *= permutation.options.length || 1;
    }

    return index;
}

function bodyKey(record)
{
    return `body_${record.offset}_${record.size}`;
}

function decodePermutationOptions(permutations, permutationIndex)
{
    let remaining = permutationIndex;

    return permutations.map((permutation) =>
    {
        const optionCount = permutation.options.length || 1;
        const optionIndex = optionCount ? remaining % optionCount : 0;

        remaining = Math.floor(remaining / optionCount);
        return {
            name: permutation.name,
            value: permutation.options[optionIndex] || "",
            optionIndex,
            defaultOption: permutation.defaultOption
        };
    });
}

function toShaderOptions(options)
{
    return options.map((option) => ({ name: option.name, value: option.value }));
}

function buildExportVariants(effectRes, allPermutations)
{
    if (allPermutations)
    {
        return effectRes.m_offsets.map((record, variantIndex) =>
        {
            const permutationIndex = Number.isInteger(record.index)
                ? record.index
                : variantIndex;

            return {
                key: `variant_${permutationIndex}`,
                variantIndex,
                permutationIndex,
                tableIndex: variantIndex,
                bodyKey: bodyKey(record),
                bodyOffset: record.offset,
                bodySize: record.size,
                options: decodePermutationOptions(
                    effectRes.m_permutations,
                    permutationIndex
                ),
                tableIndexMatchesPermutationIndex:
                    variantIndex === permutationIndex
            };
        });
    }

    const permutationIndex = defaultPermutationIndex(effectRes.m_permutations);
    const record = effectRes.m_offsets[permutationIndex];

    if (!record)
    {
        throw new Error(`Default permutation index ${permutationIndex} is not present`);
    }

    return [ {
        key: `variant_${permutationIndex}`,
        variantIndex: permutationIndex,
        permutationIndex,
        tableIndex: permutationIndex,
        bodyKey: bodyKey(record),
        bodyOffset: record.offset,
        bodySize: record.size,
        options: decodePermutationOptions(effectRes.m_permutations, permutationIndex),
        tableIndexMatchesPermutationIndex: Number.isInteger(record.index)
            ? record.index === permutationIndex
            : true
    } ];
}

function collectStages(effectDescription, selection)
{
    const stages = [];
    const errors = [];

    for (const technique of effectDescription.techniques ?? [])
    {
        if (selection.technique && technique.name !== selection.technique)
        {
            continue;
        }

        if (!selection.stage && !Number.isInteger(selection.pass)
            && technique.passes.length === 0)
        {
            errors.push(`${technique.name} declares no passes`);
        }

        for (let passIndex = 0; passIndex < technique.passes.length; passIndex++)
        {
            if (Number.isInteger(selection.pass) && passIndex !== selection.pass)
            {
                continue;
            }

            const pass = technique.passes[passIndex];
            let declaredStageCount = 0;

            for (let stageType = 0;
                stageType < HlslRenderContextEnum.SHADER_TYPE_COUNT;
                stageType++)
            {
                const stageInput = pass.stageInputs[stageType];

                if (!stageInput?.m_exists)
                {
                    continue;
                }

                declaredStageCount++;
                const stageName = hlslShaderStageName(stageType);

                if (selection.stage && stageName !== selection.stage)
                {
                    continue;
                }

                if (!stageInput.cjsShaderBytecode)
                {
                    errors.push(
                        `${technique.name}.pass${passIndex}.${stageName} declares shader handle `
                        + `${stageInput.m_shader ?? "unknown"} but has no shader bytecode`
                    );
                    continue;
                }

                stages.push({
                    key: `${technique.name}.pass${passIndex}.${stageName}`,
                    techniqueName: technique.name,
                    passIndex,
                    stageType,
                    stageName,
                    shaderHandle: stageInput.m_shader,
                    bytecode: stageInput.cjsShaderBytecode,
                    pipelineInputs: cloneJson(stageInput.signature?.pipelineInputs ?? []),
                    registers: cloneJson(stageInput.signature?.registers ?? []),
                    resources: mapToJson(stageInput.resources),
                    samplers: mapToJson(stageInput.samplers),
                    uavs: mapToJson(stageInput.uavs),
                    constants: cloneJson(stageInput.constants ?? []),
                    // Recognised from reflection here, applied by the emitter.
                    // The recogniser is shared with WebGPU so both backends
                    // merge exactly the same registers.
                    detailMapArray: recogniseDetailMapFamily(mapToJson(stageInput.resources)),
                    localLights: recogniseLocalLightFamily(mapToJson(stageInput.resources))
                });
            }

            if (!selection.stage && declaredStageCount === 0)
            {
                errors.push(`${technique.name}.pass${passIndex} declares no shader stages`);
            }
        }
    }

    return { stages, errors };
}

/** Local-light lowering modes this packager accepts. */
const LOCAL_LIGHT_MODES = Object.freeze([ "none", "packed-texture", "constant-buffer", "drop" ]);

/**
 * Normalizes the local-light lowering mode.
 *
 * @param {string|undefined|null} value Requested mode.
 * @returns {string} Normalized mode.
 */
function normalizeLocalLightMode(value)
{
    if (value === undefined || value === null) return "none";

    const mode = String(value);
    if (!LOCAL_LIGHT_MODES.includes(mode))
    {
        throw new TypeError(
            `CEWG localLights must be one of ${LOCAL_LIGHT_MODES.join(", ")}; got "${mode}"`
        );
    }
    return mode;
}

/**
 * Builds the emitter profile that lowers a recognised local-light family.
 *
 * Carbon's local lights are two structured buffers plus an optional profile
 * texture. WebGL 2 has no structured buffers, so one of these lowerings is
 * required for the shader to bind its lights at all; WebGPU needs none of it and
 * binds them natively.
 *
 * The constants here match the CLI packager's resolvers exactly, so the two
 * pipelines produce identical output while they still both exist. They are not
 * endorsements: `dataTexelBase` and `capacity` are values that happened to work,
 * and the constant-buffer route is known to fail on light count.
 *
 * @param {object} plan Recognised local-light family.
 * @param {string} mode Lowering mode.
 * @returns {object|null} Emitter options fragment, or null when not lowering.
 */
function localLightEmitterOptions(plan, mode)
{
    if (!plan || mode === "none") return null;

    if (mode === "drop")
    {
        // No lighting at all: the declarations go and every read lowers to zero.
        // Kept because isolating a lighting problem is easier without lights,
        // not because the texture budget needs it any more.
        return { stubResourceRegisters: plan.registers };
    }

    if (mode === "packed-texture")
    {
        return {
            lightPackedTexture: {
                indexRegister: plan.indexRegister,
                dataRegister: plan.dataRegister,
                profileRegister: plan.profileRegister,
                registerIndex: plan.indexRegister,
                name: "cewgLocalLightTexture",
                dataTexelBase: 131072
            }
        };
    }

    if (mode === "constant-buffer")
    {
        // Slot 6 is `g_uiTransforms` in the constant-buffer slot contract. There
        // is no collision on space-object shaders, which carry no UI transforms,
        // but this is squatting on a reserved number and should move.
        return {
            lightConstantBuffer: {
                indexRegister: plan.indexRegister,
                dataRegister: plan.dataRegister,
                profileRegister: plan.profileRegister,
                registerIndex: 6,
                name: "cb6",
                capacity: 40
            }
        };
    }

    throw new Error(`Unknown local-light lowering mode "${mode}"`);
}

function translateStages(shaderMap, stageMap, values)
{
    const emitInto = (record, pairVaryings) =>
    {
        try
        {
            const result = emitGlslWithOptions(record.bytes, {
                ...values.emitterOptions,
                source: `${values.source}#${record.firstStageKey}`,
                ...(pairVaryings?.length ? { pairVaryings } : {}),
                ...(record.detailMapArray
                    ? { detailMapArrayRegisters: record.detailMapArray.registers }
                    : {}),
                ...(localLightEmitterOptions(record.localLights, values.localLights) ?? {})
            });
            const stageInterface = normalizeBitangentStageInterface(
                result,
                record
            );

            record.emit = {
                ...result,
                source: stageInterface.source,
                inputs: stageInterface.inputs
            };
            record.source = stageInterface.source;
            record.bindings = result.bindings;
            record.stageInputs = stageInterface.inputs;
            record.stageOutputs = result.outputs;
            record.emitWarnings = result.warnings;
            record.translator = "dxbc-js-emitter";
            record.hlsl2webgl = { ok: true, mode: "js-emitter" };

            if (result.stageName === "compute")
            {
                record.computeFragment = result.computeFragment;
            }

            const issue = validateStageSourceShape(record);

            if (issue)
            {
                record.hlsl2webgl = { ok: false, validationError: issue };
                record.source = null;
            }
        }
        catch (error)
        {
            const message = error?.message || String(error);

            record.hlsl2webgl = {
                ok: false,
                error: message,
                details: error?.details ?? null
            };

            if (/not supported|No GLSL lowering|unimplementable/iu.test(message))
            {
                record.excluded = {
                    reason: message,
                    ...(error?.details?.opcodeName
                        ? { opcodeName: error.details.opcodeName }
                        : {}),
                    ...(error?.details?.dimensionName
                        ? { dimensionName: error.details.dimensionName }
                        : {})
                };
            }
        }
    };

    for (const record of shaderMap.values())
    {
        if (record.stageName !== "vertex")
        {
            emitInto(record, null);
        }
    }

    const pixelVaryingsByPass = new Map();

    for (const stage of stageMap.values())
    {
        if (stage.stageName !== "pixel")
        {
            continue;
        }

        const record = shaderMap.get(stage.shaderKey);

        if (!record?.emit)
        {
            continue;
        }

        pixelVaryingsByPass.set(
            `${stage.bodyKey}|${stage.techniqueName}|${stage.passIndex}`,
            record.emit.inputs
                .filter((input) => typeof input.name === "string"
                    && input.name.startsWith("vs_r"))
                .map((input) => input.register)
                .sort((left, right) => left - right)
        );
    }

    for (const stage of stageMap.values())
    {
        if (stage.stageName !== "vertex")
        {
            continue;
        }

        const record = shaderMap.get(stage.shaderKey);
        const varyings = pixelVaryingsByPass.get(
            `${stage.bodyKey}|${stage.techniqueName}|${stage.passIndex}`
        ) ?? [];

        if (record)
        {
            record.pairVaryings = varyings;
            emitInto(record, varyings);
        }
    }
}

function cloneJson(value)
{
    if (value === undefined || value === null)
    {
        return value;
    }

    return JSON.parse(JSON.stringify(value));
}

function mapToJson(map)
{
    if (!(map instanceof Map))
    {
        return [];
    }

    return Array.from(map.entries()).map(([ registerIndex, value ]) => ({
        registerIndex,
        ...cloneJson(value)
    }));
}

function buildStageContract(stage)
{
    const pipelineInputs = cloneJson(stage.pipelineInputs ?? []);
    const inputSemantics = pipelineInputs.map((input) => ({
        semantic: `${input.usageName || `USAGE_${input.usage}`}${input.usageIndex || ""}`,
        usage: input.usage,
        usageName: input.usageName,
        usageIndex: input.usageIndex,
        registerIndex: input.registerIndex,
        usedMask: input.usedMask,
        type: input.type,
        dimension: input.dimension
    }));
    const inputNames = new Set(inputSemantics.map((input) => input.usageName));
    const hasNormal = inputNames.has("NORMAL");
    const hasTangent = inputNames.has("TANGENT");
    const hasBinormal = inputNames.has("BINORMAL") || inputNames.has("BITANGENT");
    const hasBlendIndices = inputNames.has("BLENDINDICES")
        || inputNames.has("BLENDINDICE");
    let tangentContract = "none";

    if (hasNormal && hasTangent && hasBinormal)
    {
        tangentContract = "split_tbn";
    }
    else if (!hasNormal && hasTangent)
    {
        tangentContract = "packed_tangent_or_tangent_only";
    }
    else if (hasNormal || hasTangent || hasBinormal)
    {
        tangentContract = "partial_tbn";
    }

    const resources = cloneJson(stage.resources ?? []);
    const samplers = cloneJson(stage.samplers ?? []);
    const uavs = cloneJson(stage.uavs ?? []);
    const constants = cloneJson(stage.constants ?? []);
    const resourceNames = resources.map((entry) => entry.name).filter(Boolean);

    return {
        stageName: stage.stageName,
        stageType: stage.stageType,
        vertex: stage.stageName === "vertex" ? {
            inputs: inputSemantics,
            tangentContract,
            requiresSplitTbn: tangentContract === "split_tbn",
            requiresPackedTangent: tangentContract === "packed_tangent_or_tangent_only",
            requiresSkinning: hasBlendIndices || resourceNames.includes("BoneTransforms"),
            hasBlendIndices
        } : null,
        texturePacking: classifyTexturePacking(resourceNames),
        constantBuffers: (stage.registers ?? [])
            .filter((entry) => entry.registerType === 0)
            .map((entry) => ({
                registerIndex: entry.registerIndex,
                registerSpace: entry.registerSpace,
                registerCount: entry.registerCount,
                arrayCount: entry.arrayCount,
                dynamic: Boolean(entry.dynamic)
            })),
        resources,
        samplers,
        uavs,
        constants
    };
}

function classifyTexturePacking(names)
{
    const values = new Set(names);

    if ([ "NoMap", "PmdgMap", "ArMap" ].some((name) => values.has(name)))
    {
        return "packed_textures";
    }

    if ([ "NormalMap", "RoughnessMap", "MaterialMap", "AlbedoMap",
        "AoMap", "PaintMaskMap" ].some((name) => values.has(name)))
    {
        return "unpacked_textures";
    }

    return "unknown";
}

function mergeShaderContracts(contracts)
{
    const first = contracts?.[0]?.contract ?? null;

    if (!first)
    {
        return null;
    }

    return {
        stageName: first.stageName,
        stageType: first.stageType,
        vertex: first.vertex ? cloneJson(first.vertex) : null,
        texturePacking: first.texturePacking,
        constantBuffers: cloneJson(first.constantBuffers ?? []),
        resourceNames: (first.resources ?? []).map((entry) => entry.name).filter(Boolean),
        samplerNames: (first.samplers ?? []).map((entry) => entry.name).filter(Boolean),
        sharedByStageCount: contracts.length
    };
}

function normalizeBitangentStageInterface(result, shaderRecord)
{
    if (shaderRecord?.stageName !== "vertex")
    {
        return {
            source: result.source,
            inputs: result.inputs
        };
    }

    const bitangentRegisters = new Set((shaderRecord.contracts ?? [])
        .flatMap((entry) => entry.contract?.vertex?.inputs ?? [])
        .filter((input) => input.usageName === "BITANGENT")
        .map((input) => input.registerIndex));
    let source = result.source;
    const inputs = result.inputs.map((input) =>
    {
        if (!bitangentRegisters.has(input.register)
            || input.semanticName !== "BINORMAL")
        {
            return input;
        }
        const name = `in_BITANGENT${input.semanticIndex}`;
        source = source.replaceAll(input.name, name);
        return {
            ...input,
            name,
            semanticName: "BITANGENT"
        };
    });
    return { source, inputs };
}

function validateStageSourceShape(record)
{
    const source = record?.source ?? "";

    if (!source)
    {
        return null;
    }

    const hasVertexOutput = /\bgl_Position\b/u.test(source);
    const hasVertexInterface = /\bin\s+(?:lowp|mediump|highp)?\s*\w+\s+attr\d+\b/u.test(source)
        || /\bout\s+(?:lowp|mediump|highp)?\s*\w+\s+vs_TEXCOORD\d+\b/u.test(source)
        || /\bin_[A-Z]+[0-9]+\b/u.test(source);
    const hasFragmentOutput = /\bout\s+(?:lowp|mediump|highp)?\s*vec4\s+SV_Target\d+\b/u.test(source)
        || /\bgl_FragColor\b/u.test(source);

    if (record.stageName === "vertex" && !hasVertexOutput)
    {
        return "vertex stage source does not write gl_Position";
    }

    if (record.stageName === "pixel"
        && (hasVertexOutput || hasVertexInterface) && !hasFragmentOutput)
    {
        return "pixel stage source looks like vertex GLSL";
    }

    if (record.stageName === "compute" && !/\bcewgUav\d+(_s\d+)?\b/u.test(source))
    {
        return "compute stage source does not write any cewgUav output";
    }

    return null;
}

function normalizeSourceIdentity(values)
{
    const identity = values.sourceIdentity;

    if (identity !== null
        && (!identity || typeof identity !== "object" || Array.isArray(identity)))
    {
        throw new TypeError("CEWG sourceIdentity must be an object");
    }

    const sha256 = sha256Bytes(values.sourceBytes);
    if (identity?.sha256 !== undefined && identity?.sha256 !== null
        && identity.sha256 !== sha256)
    {
        throw new Error(
            "CEWG sourceIdentity.sha256 does not match the exact effect input bytes"
        );
    }

    return Object.freeze({
        filePath: identity?.filePath ?? values.source,
        logicalPath: identity?.logicalPath ?? values.source,
        game: identity?.game ?? null,
        client: identity?.client ?? null,
        build: identity?.build === undefined || identity?.build === null
            ? null
            : String(identity.build),
        byteLength: values.sourceBytes.byteLength,
        md5: identity?.md5 ?? null,
        sha256
    });
}

function qualifyEffectPackage({
    info,
    metadata,
    glsl,
    failedShaders,
    excludedShaders,
    failedBodies,
    rasterCompleteness,
    availableShaderCount
})
{
    const errors = [];

    if (info.format !== "CEWG" || glsl.format !== "CEWG_GLSL_SET")
    {
        errors.push("invalid CEWG package envelope");
    }

    if (!Array.isArray(metadata.variants) || !Array.isArray(glsl.shaders))
    {
        errors.push("missing CEWG graph arrays");
    }

    if (failedShaders.length)
    {
        errors.push(`${failedShaders.length} shader translation(s) failed`);
    }

    if (excludedShaders.length)
    {
        errors.push(`${excludedShaders.length} shader translation(s) are unsupported`);
    }

    if (failedBodies.length)
    {
        errors.push(`${failedBodies.length} effect body/bodies failed`);
    }

    if (rasterCompleteness.incompletePasses.length)
    {
        errors.push(`${rasterCompleteness.incompletePasses.length} raster pass(es) are incomplete`);
    }

    if (!availableShaderCount)
    {
        errors.push("no translated shaders are available");
    }

    return {
        ok: errors.length === 0,
        level: errors.length ? "diagnostic" : "structural",
        errors: Object.freeze(errors),
        incompletePasses: Object.freeze(rasterCompleteness.incompletePasses)
    };
}
