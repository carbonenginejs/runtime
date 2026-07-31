import { HlslEffectBindingManifest } from "../../../hlsl/core/tr2/shader/HlslEffectBindingManifest.js";
import { HlslShaderBytecode } from "../../../hlsl/core/HlslShaderBytecode.js";
import { hlslShaderStageName } from "../../../hlsl/core/tr2/HlslRenderContextEnum.js";
import { runtimeDescriptionFromCarbon } from "../../../hlsl/core/carbonDescriptionToRuntime.js";
import { buildEffectAnalysis } from "../helpers.js";
import { WGSL_SET_VERSION } from "../wgsl/buildWgslSet.js";

/**
 * Derived compatibility views over a container.
 *
 * The chunk package stored `ANLS` and `WGSL` as documents beside the reflection
 * they were computed from, and carried digests to detect the two disagreeing.
 * The container stores one document, so these are **views**: functions of the
 * records, computed on read. The class of bug the digests guarded cannot occur,
 * because there is no second copy to drift.
 *
 * The analysis view is deliberately not a reimplementation. It runs
 * `buildEffectAnalysis` — the same function the packager runs on source — over a
 * description rebuilt by `runtimeDescriptionFromCarbon`. That is what keeps the
 * view honest: if it were rewritten to emit the fields consumers read today, it
 * would be free to drift from the real analysis, and nothing would notice.
 * `carbon-analysis-adapter-corpus.test.mjs` diffs the two over every shipped
 * permutation and finds zero differences.
 *
 * These views exist for `engine-webgpu`, which reads format-package JSON for
 * Carbon reflection instead of reading `Tr2Shader`. That is a recorded layering
 * defect and is not this port's to fix; the views keep it working unchanged
 * while the wire format moves underneath it. They go away with that cleanup.
 */

/**
 * Resolves the permutation Carbon's own `GetShader()` would select with no
 * option overrides.
 *
 * Carbon multiplies each axis's default option by the running product of the
 * preceding axes' option counts. The chunk package stored a single selected
 * body and its index; the container carries every permutation, so the view has
 * to name a default rather than inherit one, and Carbon's own default is the
 * only defensible choice.
 *
 * @param {object} container Loaded container.
 * @returns {number} Permutation index.
 */
export function defaultPermutationIndex(container)
{
    let multiplier = 1;
    let index = 0;
    for (const axis of container.carbon.permutations)
    {
        index += axis.defaultOption * multiplier;
        multiplier *= axis.options.length || 1;
    }
    return index < container.carbon.records.length ? index : 0;
}

/**
 * Rebuilds the runtime effect description for one permutation.
 *
 * @param {object} container Loaded container.
 * @param {number} permutationIndex Permutation index.
 * @param {string} source Source label.
 * @returns {object} Runtime-shaped effect description.
 */
function describeRuntime(container, permutationIndex, source)
{
    return runtimeDescriptionFromCarbon(container.GetDescription(permutationIndex), {
        effectName: source,
        version: container.carbon.version,
        bytecodeFor: (stage, stageType) => new HlslShaderBytecode({
            stageType,
            // Carbon's six stage names, not WebGPU's three. A three-entry table
            // reports a geometry stage as null, which the corpus caught.
            stageName: hlslShaderStageName(stageType),
            bytes: stage.shaderData.bytes,
            shaderSize: stage.shaderData.size,
            stringTableOffset: stage.shaderData.offset,
            effectName: source
        })
    });
}

/**
 * Derives the analysis document for one permutation.
 *
 * One field is honestly different from the stored `ANLS` it replaces:
 * `stages[].shaderBytecode` describes the **WGSL** program the container
 * carries, where the stored document described the source DXBC. The container
 * does not carry DXBC, so reproducing the old numbers would mean inventing
 * them. Nothing in the engine's read surface uses this field; it is a
 * diagnostic.
 *
 * @param {object} container Loaded container.
 * @param {object} [options] View options.
 * @param {string} [options.source] Source label.
 * @param {number} [options.permutationIndex] Permutation to describe.
 * @returns {object} Analysis document.
 */
export function deriveAnalysis(container, options = {})
{
    const source = options.source || container.sourcePath || "memory";
    const permutationIndex = options.permutationIndex ?? defaultPermutationIndex(container);
    const effectDescription = describeRuntime(container, permutationIndex, source);

    return buildEffectAnalysis({
        effectDescription,
        bindingManifest: HlslEffectBindingManifest.fromEffectDescription(effectDescription, {
            effectName: source
        }),
        effectRes: {
            sourcePath: source,
            m_compilerVersion: null
        },
        selection: {
            bodyIndex: permutationIndex,
            selectedOptions: container.carbon.permutations.map((axis) => ({
                name: axis.name.value,
                value: axis.options[axis.defaultOption]?.value ?? null
            }))
        }
    }, { source, decodeBytecode: false, decodeInstructions: false });
}

/**
 * Derives the WGSL set document for one permutation.
 *
 * `sourceMap` is absent rather than empty, and that is not an oversight: its
 * offsets index DXBC bytes the container does not carry, so it is a translator
 * diagnostic and was dropped on write. It was separately measured to suppress
 * no sharing, so keeping it would have bought nothing either.
 *
 * @param {object} container Loaded container.
 * @param {object} [options] View options.
 * @param {number} [options.permutationIndex] Permutation to describe.
 * @returns {object} WGSL set document.
 */
export function deriveWgsl(container, options = {})
{
    const permutationIndex = options.permutationIndex ?? defaultPermutationIndex(container);
    const body = container.GetBackendBodyPrograms(permutationIndex);
    const shaders = [];
    const layouts = [];
    const resourceTransforms = [];

    for (const pass of body?.passes ?? [])
    {
        for (const shader of pass.shaders)
        {
            shaders.push({
                key: shader.key,
                techniqueName: shader.techniqueName,
                passIndex: shader.passIndex,
                stageName: shader.stageName,
                stage: shader.stage,
                stageType: shader.stageType,
                entryPoint: shader.entryPoint,
                code: shader.code,
                ...(shader.threadGroupSize ? { threadGroupSize: [ ...shader.threadGroupSize ] } : {})
            });
        }
        for (const layout of pass.layouts) layouts.push(layout);
        for (const transform of pass.resourceTransforms ?? []) resourceTransforms.push(transform);
    }

    return {
        format: "CJS_WGSL_SET",
        formatVersion: WGSL_SET_VERSION,
        shaders,
        layouts,
        ...(resourceTransforms.length ? { resourceTransforms } : {})
    };
}

/**
 * Derives the `INFO`-shaped summary the chunk package used to store.
 *
 * Everything here is counted from the records rather than trusted from a stored
 * field, which is why no digest accompanies it: a count derived from the thing
 * it counts cannot disagree with it.
 *
 * @param {object} container Loaded container.
 * @param {object} [options] View options.
 * @param {string} [options.source] Source label.
 * @returns {object} Info document.
 */
export function deriveInfo(container, options = {})
{
    const source = options.source || container.sourcePath || "memory";
    const graph = container.permutationGraph;
    return {
        format: "CEWGPU",
        packageKind: "tr2-effect-webgpu",
        sourcePath: source,
        effectVersion: container.carbon.version,
        compilerVersion: [ ...container.carbon.compilerVersion ],
        permutationCount: graph.variants.length,
        uniqueBodyCount: graph.bodies.length
    };
}

export default deriveAnalysis;
