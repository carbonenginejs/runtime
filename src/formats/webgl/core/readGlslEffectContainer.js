import { CjsCarbonEffectReader } from "../../../format/carbonEffect/CjsCarbonEffectReader.js";
import { readGlslBackendBlock } from "./glslBackendBlock.js";
import {
    hlslShaderStageName,
    HlslUsageCodeNames
} from "../../hlsl/core/tr2/HlslRenderContextEnum.js";

/**
 * Decodes a WebGL effect container into the stage/shader records the
 * completeness rules consume.
 *
 * This exists so the rules run from container bytes alone. The alternative was
 * to hand them the in-memory translation, which works inside `buildEffectPackage`
 * and nowhere else — the validator reads a finished file and has no translation
 * in scope. That would have cost the validator its completeness check while
 * still requiring a decoder to produce the programs it compiles in a browser, so
 * it was strictly more work for strictly less checking.
 *
 * The vocabulary is deliberately the one the rules already speak — `stages` with
 * pass coordinates, `shaders` with source and a translation verdict. The rules
 * are about the translation, not about how it was stored, so retargeting them
 * meant changing where the records come from and nothing about what they mean.
 *
 * **What the wire cannot tell you.** `buildCarbonEffectContainer` stores a body
 * the translator could not lower as its full pass tree with zero-length
 * programs; the *reason* it failed stays in the in-memory build result and is
 * never written. So a shader decoded from bytes reports `ok: false` with
 * "no program was stored" and nothing more specific. That is the honest answer:
 * a file on disk does not know why a translation failed months ago. Callers that
 * do know — `buildEffectPackage`, at build time — keep their specific
 * diagnostics by feeding the rules their own records instead.
 */

/** The verdict a stage carrying no stored program gets. */
const NO_PROGRAM_REASON = "no program was stored";

/**
 * Reshapes one Carbon stage's own reflection into the manifest vocabulary the
 * runtime-ABI rules read.
 *
 * The chunk package carried this as a separate META manifest, which is why the
 * old rules cross-checked two chunks against each other. The container needs no
 * such cross-check: `pipelineInputs`, `textures` and `samplers` are Carbon's own
 * per-stage reflection, read straight out of the description. There is only one
 * copy, so there is nothing for a second copy to disagree with — the class of
 * bug those cross-chunk rules existed to catch cannot occur here.
 *
 * `usageName` is derived from the `usage` byte rather than carried, the same way
 * `carbonDescriptionToRuntime.js:261` derives it.
 *
 * @param {object} stage Decoded Carbon stage record.
 * @returns {{pipelineInputs:object[], bindings:object[]}} Manifest-shaped reflection.
 */
function stageManifest(stage)
{
    return {
        pipelineInputs: (stage.pipelineInputs ?? []).map((input) => ({
            registerIndex: input.registerIndex,
            usageName: HlslUsageCodeNames[input.usage] || `USAGE_${input.usage}`,
            usageIndex: input.usageIndex,
            usedMask: input.usedMask
        })),
        bindings: [
            ...(stage.textures ?? []).map((texture) => ({
                kind: "resource",
                registerIndex: texture.registerIndex,
                // Named so a rule can ask whether a described resource belongs
                // to a family the packager is known to lower away.
                name: texture.name.value
            })),
            ...(stage.samplers ?? []).map((sampler) => ({
                kind: "sampler",
                registerIndex: sampler.registerIndex,
                // Carbon stores the flag as a byte; the rule compares against
                // `=== true`, so the conversion has to happen here rather than
                // letting a truthy 1 pass a strict check by accident.
                carbon: { sampler: { comparison: sampler.comparison !== 0 } }
            }))
        ]
    };
}

/**
 * Decodes one pass's backend block, tolerating a pass that has none.
 *
 * @param {object} pass Decoded pass record.
 * @param {string} passKey Enclosing pass key.
 * @param {string} source Source name for error details.
 * @returns {object} Per-stage backend data, keyed by stage name.
 */
function backendStages(pass, passKey, source)
{
    if (!pass.backendBlock?.size) return { stages: {}, transforms: [] };
    const block = readGlslBackendBlock(pass.backendBlock.bytes, { layoutKey: passKey, source });
    return { stages: block.stages ?? {}, transforms: block.transforms ?? [] };
}

/**
 * Decodes container bytes into stage and shader records.
 *
 * Bodies are decoded once each rather than once per permutation row: rows alias
 * onto shared bodies, and a rule that saw the same body 4,096 times would report
 * 4,096 identical incomplete passes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Container payload.
 * @param {object} [values] Read values.
 * @param {string} [values.source] Source name, for diagnostics.
 * @returns {{stages:object[], shaders:object[], recordCount:number, bodyCount:number}}
 *   Stage graph in the completeness rules' vocabulary.
 */
export function readGlslEffectContainer(input, values = {})
{
    const source = values.source ?? "memory";
    const reader = new CjsCarbonEffectReader(input, { source });

    const stages = [];
    const shaders = [];
    const bodyKeyByOffset = new Map();

    // Distinct program texts share one shader record, so `shaders` counts unique
    // translations the way the chunk package's shader table did. Empty stages are
    // deliberately *not* pooled: each keeps its own record so a report can name
    // every pass that is missing a program rather than one shared "absent".
    //
    // The pool key is the program text *and* the backend reflection that came
    // with it, not the text alone. A pooled record carries the bindings and
    // stage inputs of whichever stage was seen first, and
    // `validateShaderRuntimeContract` judges the emitted GLSL against them — so
    // pooling on text alone would let two stages with identical source but
    // different reflection be checked against the wrong metadata, silently. It
    // is unlikely that identical GLSL ever carries different reflection, which
    // is exactly why it would not be noticed.
    const shaderKeyByIdentity = new Map();

    for (let index = 0; index < reader.records.length; index += 1)
    {
        const { offset } = reader.records[index];
        if (bodyKeyByOffset.has(offset)) continue;

        const bodyKey = `body_${bodyKeyByOffset.size}`;
        bodyKeyByOffset.set(offset, bodyKey);

        const description = reader.readDescription(index, { backend: true });

        for (const technique of description.techniques)
        {
            const techniqueName = technique.name.value;
            for (const [ passIndex, pass ] of technique.passes.entries())
            {
                const passKey = `${techniqueName}.pass${passIndex}`;
                const { stages: backend, transforms } = backendStages(
                    pass,
                    passKey,
                    source
                );

                for (const stage of pass.stages)
                {
                    const name = hlslShaderStageName(stage.type);
                    const stageKey = `${bodyKey}.${passKey}.${name}`;
                    const stageBackend = backend[name] ?? {};

                    let shaderKey;
                    if (stage.shaderData?.size)
                    {
                        const code = new TextDecoder().decode(stage.shaderData.bytes);
                        const identity = `${JSON.stringify([
                            stageBackend.bindings ?? [],
                            stageBackend.stageInputs ?? [],
                            stageBackend.computeFragment ?? null
                        ])} ${code}`;
                        const pooled = shaderKeyByIdentity.get(identity);
                        if (pooled)
                        {
                            shaderKey = pooled;
                        }
                        else
                        {
                            shaderKey = `shader_${shaderKeyByIdentity.size}`;
                            shaderKeyByIdentity.set(identity, shaderKey);
                            shaders.push({
                                key: shaderKey,
                                stageName: name,
                                source: code,
                                hlsl2webgl: { ok: true },
                                bindings: stageBackend.bindings ?? [],
                                stageInputs: stageBackend.stageInputs ?? [],
                                ...(stageBackend.computeFragment
                                    ? { computeFragment: stageBackend.computeFragment }
                                    : {})
                            });
                        }
                    }
                    else
                    {
                        shaderKey = `${stageKey}.absent`;
                        shaders.push({
                            key: shaderKey,
                            stageName: name,
                            source: "",
                            hlsl2webgl: { ok: false, reason: NO_PROGRAM_REASON },
                            bindings: stageBackend.bindings ?? [],
                            stageInputs: stageBackend.stageInputs ?? []
                        });
                    }

                    stages.push({
                        key: stageKey,
                        bodyKey,
                        techniqueName,
                        passIndex,
                        stageName: name,
                        stageType: stage.type,
                        shaderKey,
                        manifest: stageManifest(stage),
                        // The pass's transforms, so a rule can ask whether a
                        // description resource was merged away rather than lost.
                        transforms
                    });
                }
            }
        }
    }

    return {
        stages,
        shaders,
        recordCount: reader.records.length,
        bodyCount: bodyKeyByOffset.size
    };
}

export default readGlslEffectContainer;
