import { HlslEffectBindingManifest } from "../../../hlsl/core/tr2/shader/HlslEffectBindingManifest.js";
import { HlslShaderBytecode } from "../../../hlsl/core/HlslShaderBytecode.js";
import { hlslShaderStageName } from "../../../hlsl/core/tr2/HlslRenderContextEnum.js";
import { runtimeDescriptionFromCarbon } from "../../../hlsl/core/carbonDescriptionToRuntime.js";
import { buildEffectAnalysis } from "../helpers.js";
import { WGSL_SET_VERSION } from "../wgsl/buildWgslSet.js";
import { sha256Utf8 } from "../../../../format/effect/sha256.js";

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
/**
 * Names the option each axis carries for one permutation.
 *
 * The variant's `optionIndices` are the authority; an axis default is only the
 * fallback for an axis the variant does not pin. Shared by the analysis and
 * metadata views so the two cannot describe the same permutation differently.
 *
 * @param {object} container Loaded container.
 * @param {number} permutationIndex Permutation to describe.
 * @returns {Array<{name: string, value: *}>} Selected option per axis.
 */
function SelectedOptions(container, permutationIndex)
{
    const variant = container.permutationGraph?.variants?.[permutationIndex];

    return container.carbon.permutations.map((axis, axisIndex) =>
    {
        const optionIndex = variant?.optionIndices?.[axisIndex] ?? axis.defaultOption;

        // `optionIndex`, `defaultOption` and `defaultValue` are derived, not
        // stored: the axis carries its options and its default, and the variant
        // carries which option this permutation took. Emitting them lets a
        // consumer see that a selection departs from the defaults without
        // rebuilding the axis table itself.
        //
        // There is deliberately no `source` field. Carbon's build-time resolver
        // records whether a value arrived as "default", "local" or "global"
        // (formats/hlsl/core/metadata.js), and that is who CHOSE the value, not
        // what the value is. The container stores only which permutation was
        // translated, so a permutation that happens to equal the default is
        // indistinguishable from one explicitly requested. Synthesising a
        // plausible `source` here would be inventing build-time policy, which
        // this view already refuses to do for `bodyMode` and `completeness`.
        return {
            name: axis.name.value,
            value: axis.options[optionIndex]?.value ?? null,
            optionIndex,
            defaultOption: axis.defaultOption,
            defaultValue: axis.options[axis.defaultOption]?.value ?? null
        };
    });
}

/**
 * Derive the normalized effect analysis for one resolved permutation.
 * @param {object} container Loaded Carbon WebGPU container.
 * @param {object} [options] Analysis view options.
 * @param {string} [options.source] Source identity.
 * @param {number} [options.permutationIndex] Permutation to analyze.
 * @returns {object} Normalized effect analysis.
 */
export function deriveAnalysis(container, options = {})
{
    const source = options.source || container.sourcePath || "memory";
    const permutationIndex = options.permutationIndex ?? resolvedPermutationIndex(container);
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
            // Report the options of the permutation this view actually
            // resolved, not the axis defaults. Reading `axis.defaultOption`
            // here described permutation zero while `bodyIndex` named another,
            // so a package could report an option enabled in its metadata view
            // and disabled in its analysis view. `deriveMetadata` has always
            // read the variant; this now matches it.
            selectedOptions: SelectedOptions(container, permutationIndex)
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
    const permutationIndex = options.permutationIndex ?? resolvedPermutationIndex(container);
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
 * Derives the `WGSB` body-set view the chunk package used to store.
 *
 * `engine-webgpu` resolves a permutation's translated programs through this,
 * which is part of the recorded layering defect -- it should read the shader,
 * not a package document. The view keeps that path working unchanged while the
 * wire format moves underneath it, and goes away with the cleanup.
 *
 * Nothing here is stored. A body's status is whether its stages carry programs,
 * its passes are the record tree's passes, and a pass unit is that pass's
 * shaders and layouts. Bodies are keyed by distinct stored offset, which is
 * exactly what Carbon's alias dedupe produces.
 *
 * @param {object} container Loaded container.
 * @returns {object} Body-set document.
 */
export function deriveBackendBodySet(container)
{
    const bodyKeys = container.bodyKeyByOffset;
    const passUnits = [];
    const bodies = [];
    const seen = new Set();

    for (let index = 0; index < container.carbon.records.length; index += 1)
    {
        const offset = container.carbon.records[index].offset;
        if (seen.has(offset)) continue;
        seen.add(offset);

        const bodyKey = bodyKeys.get(offset);
        const body = container.GetBackendBodyPrograms(index);

        if (!body || body.status !== "translated")
        {
            bodies.push({
                bodyKey,
                representativePermutationIndex: index,
                status: "unsupported",
                error: body?.error ?? "body carries no translated programs",
                passCount: 0,
                passes: []
            });
            continue;
        }

        const passes = [];
        for (const pass of body.passes)
        {
            const unit = {
                key: `unit${passUnits.length}`,
                // Hashed from the unit's own content. The chunk body set stored
                // this digest to detect a unit drifting from what referenced it;
                // derived from the content it identifies, it cannot.
                sha256: sha256Utf8(`${JSON.stringify({
                    shaders: pass.shaders,
                    layouts: pass.layouts,
                    resourceTransforms: pass.resourceTransforms ?? []
                })}
`),
                wgslSetVersion: WGSL_SET_VERSION,
                shaders: pass.shaders,
                layouts: pass.layouts,
                ...(pass.resourceTransforms?.length
                    ? { resourceTransforms: pass.resourceTransforms }
                    : {})
            };
            passUnits.push(unit);
            passes.push({ passKey: pass.passKey, unitKey: unit.key });
        }

        bodies.push({
            bodyKey,
            representativePermutationIndex: index,
            status: "translated",
            error: null,
            passCount: passes.length,
            passes
        });
    }

    return {
        format: "CJS_WGSL_BODY_SET",
        formatVersion: 1,
        bodyCount: bodies.length,
        translatedBodyCount: bodies.filter((body) => body.status === "translated").length,
        passUnitCount: passUnits.length,
        passUnits,
        bodies
    };
}

/**
 * Finds the permutation a package resolves to.
 *
 * A "selected" package is not a different format -- the container always carries
 * every permutation. What makes it selected is that exactly one body was
 * translated, so the resolved permutation is the first one whose body carries
 * programs. When every body is translated, there is nothing to single out and
 * Carbon's own default applies.
 *
 * This is the default for *every* view, not just this one. The views used to
 * disagree -- analysis and wgsl fell back to `defaultPermutationIndex` while
 * metadata fell back to here -- so a direct caller that omitted an index got
 * documents describing different permutations of the same package. On a
 * selected package those differ: measured on a real QuadV5 package, the default
 * resolves to 0 and the translated body to 4. The public read path never hit it
 * because it resolves one index and passes it to all three; the divergence was
 * only reachable by calling a view directly. Falling back to here can never be
 * worse, because it degrades to Carbon's default in exactly the case where
 * there is no single translated body to prefer.
 *
 * @param {object} container Loaded container.
 * @returns {number} Permutation index.
 */
export function resolvedPermutationIndex(container)
{
    const translated = [];
    const seen = new Set();

    for (let index = 0; index < container.carbon.records.length; index += 1)
    {
        const offset = container.carbon.records[index].offset;
        if (seen.has(offset)) continue;
        seen.add(offset);

        const body = container.GetBackendBodyPrograms(index);
        if (body?.status === "translated") translated.push(index);
        if (translated.length > 1) return defaultPermutationIndex(container);
    }

    return translated.length === 1 ? translated[0] : defaultPermutationIndex(container);
}

/**
 * Derives the `META`-shaped view the chunk package used to store.
 *
 * Every field here is recovered from the records rather than carried:
 * `selectedOptions` from the resolved permutation's option indices, and
 * `wgslSelection` from which passes and stages actually hold programs. Build-time
 * *policy* -- `bodyMode`, `sourceIdentity`, `completeness` -- is deliberately not
 * here: it describes how the artifact was produced, not what it is, and Carbon
 * stores none of it.
 *
 * @param {object} container Loaded container.
 * @param {object} [options] View options.
 * @param {string} [options.source] Source label.
 * @param {number} [options.permutationIndex] Permutation to describe.
 * @returns {object} Metadata document.
 */
export function deriveMetadata(container, options = {})
{
    const source = options.source || container.sourcePath || "memory";
    const permutationIndex = options.permutationIndex ?? resolvedPermutationIndex(container);
    const selectedOptions = SelectedOptions(container, permutationIndex);

    const body = container.GetBackendBodyPrograms(permutationIndex);
    const selectedStageKeys = (body?.passes ?? [])
        .flatMap((pass) => pass.shaders.map((shader) => shader.key));
    const passKeys = (body?.passes ?? []).map((pass) => pass.passKey);

    return {
        effectName: source,
        sourcePath: source,
        bodyIndex: permutationIndex,
        selectedOptions,
        ...(passKeys.length === 1
            ? {
                wgslSelection: {
                    mode: "explicit",
                    completePasses: true,
                    techniqueName: passKeys[0].slice(0, passKeys[0].lastIndexOf(".pass")),
                    passIndex: Number(/\.pass([0-9]+)$/u.exec(passKeys[0])?.[1] ?? 0),
                    requestedStageNames: Array.from(new Set(
                        (body?.passes ?? []).flatMap((pass) => pass.shaders.map((shader) => shader.stageName))
                    )),
                    selectedStageKeys
                }
            }
            : {})
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
        format: "CARBON_WEBGPU",
        packageKind: "tr2-effect-webgpu",
        sourcePath: source,
        effectVersion: container.carbon.version,
        compilerVersion: [ ...container.carbon.compilerVersion ],
        permutationCount: graph.variants.length,
        uniqueBodyCount: graph.bodies.length
    };
}

export default deriveAnalysis;
