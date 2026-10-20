import { shaderStageName } from "./shaderStageNames.js";
import {
    effectiveConstantDefaults, projectAnnotation, projectConstant,
    projectPipelineInput, projectProgram, projectRegister,
    projectResource, projectSampler, projectStaticSampler
} from "./effectProjection.js";

/**
 * Derive the existing shader-format binding manifest from canonical reflection.
 *
 * This is the single translator projection, not another reflection graph or
 * handle registry. The resource owns the description and the source programs;
 * the format supplies header context. Handles remain canonical unrealized
 * values until Trinity registers the shader.
 * @param {object} effectDescription Canonical Tr2EffectDescription.
 * @param {object} [context] Effect name, version and per-frame register context.
 * @returns {object} Existing binding records with resolve and toJSON operations.
 */
export function buildEffectBindingManifest(effectDescription, context = {})
{
    const manifest = {
        effectName: context.effectName || "",
        version: context.version || 0,
        passes: buildPasses(effectDescription),
        stages: buildStages(effectDescription, context),

        /**
         * Resolve a generated symbol at one stage and optional register space.
         * @param {object} query Technique/pass/stage and symbol coordinates.
         * @returns {object|null} Matching binding.
         */
        resolve(query)
        {
            const stage = this.stages.find(entry =>
                entry.techniqueName === query.techniqueName &&
                entry.passIndex === query.passIndex &&
                (Number.isInteger(query.stageType) ? entry.stageType === query.stageType : entry.stageName === query.stageName)
            );
            if (!stage) return null;
            return stage.bindings.find(entry =>
                entry.generatedSymbol === query.symbol &&
                (!Number.isInteger(query.registerSpace) || entry.registerSpace === query.registerSpace)
            ) || null;
        },

        /**
         * Return a detached JSON snapshot of the manifest.
         * @returns {object} Serializable manifest.
         */
        toJSON()
        {
            return {
                effectName: this.effectName,
                version: this.version,
                passes: this.passes.map(cloneJson),
                stages: this.stages.map(cloneJson)
            };
        }
    };
    return manifest;
}

/**
 * Builds pass render-state records from the decoded effect description.
 *
 * @param {object} effectDescription Decoded effect description.
 * @returns {object[]} Pass render-state manifest records.
 */
function buildPasses(effectDescription)
{
    const passes = [];
    for (const technique of effectDescription?.techniques || [])
    {
        for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1)
        {
            const pass = technique.passes[passIndex];
            passes.push({
                techniqueName: technique.name,
                passIndex,
                renderStates: pass.renderStates,
                states: pass.renderStateValues.map(({ state, value }) => ({
                    state,
                    value
                }))
            });
        }
    }
    return passes;
}

/**
 * Builds all stage records from the decoded effect description.
 *
 * @param {object} effectDescription Decoded effect description.
 * @returns {object[]} Stage binding manifest records.
 */
function buildStages(effectDescription, context)
{
    const stages = [];
    for (const technique of effectDescription?.techniques || [])
    {
        for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1)
        {
            const pass = technique.passes[passIndex];
            for (let stageType = 0; stageType < pass.stageInputs.length; stageType += 1)
            {
                const stage = pass.stageInputs[stageType];
                if (!stage?.exists) continue;
                stages.push(buildStage(effectDescription, technique.name, passIndex, pass, stageType, stage, context));
            }
        }
    }
    return stages;
}

/**
 * Builds one stage binding manifest record.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {string} techniqueName Technique name.
 * @param {number} passIndex Pass index.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @returns {object} Stage binding record.
 */
function buildStage(effectDescription, techniqueName, passIndex, pass, stageType, stage, context)
{
    const bindings = [];
    const seen = new Set();

    for (const register of stage.signature?.registers || [])
    {
        const binding = buildRegisterBinding(effectDescription, pass, stageType, stage, projectRegister(register, stageType, context));
        if (!binding) continue;
        const identity = bindingIdentity(binding.kind, binding.registerSpace, binding.registerIndex);
        if (seen.has(identity)) continue;
        seen.add(identity);
        bindings.push(binding);
    }

    addSignatureSamplerBindings(effectDescription, pass, stageType, stage, bindings, seen);

    addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, "resource", "t", stage.resources);
    addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, "sampler", "s", stage.samplers);
    addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, "uav", "u", stage.uavs);

    return {
        techniqueName,
        passIndex,
        stageType,
        stageName: shaderStageName(stageType),
        shaderHandle: stage.shader,
        shaderBytecode: projectProgram(stage.sourceProgram, stageType, context),
        pipelineInputs: (stage.signature?.pipelineInputs || []).map(projectPipelineInput),
        threadGroupSize: cloneJson(stage.signature?.threadGroupSize || null),
        bindings
    };
}

/**
 * Adds v13+ static samplers, which Carbon stores separately from the general
 * signature register list. In particular, SM 5.1 effects may declare `s0`
 * only in `signature.staticSamplers`.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @param {object[]} bindings Destination bindings.
 * @param {Set<string>} seen Class/space/register identities already added.
 */
function addSignatureSamplerBindings(effectDescription, pass, stageType, stage, bindings, seen)
{
    for (const entry of stage.signature?.staticSamplers || [])
    {
        const sampler = projectStaticSampler(entry);
        if (!Number.isInteger(sampler.registerIndex)) continue;
        const registerSpace = Number.isInteger(sampler.registerSpace) ? sampler.registerSpace : stageType;
        const identity = bindingIdentity("sampler", registerSpace, sampler.registerIndex);
        if (seen.has(identity)) continue;
        const mapMetadata = stage.samplers.get(sampler.registerIndex) || null;
        const name = metadataName("sampler", mapMetadata || sampler, stage, sampler.registerIndex);
        bindings.push({
            kind: "sampler",
            generatedSymbol: `s${sampler.registerIndex}`,
            registerIndex: sampler.registerIndex,
            registerType: 1,
            registerSpace,
            registerCount: 1,
            arrayCount: 1,
            dynamic: Boolean(mapMetadata?.isDynamic),
            metadataName: name,
            carbon: {
                name: mapMetadata?.isDynamic ? mapMetadata.name : null,
                sampler: cloneJson(sampler.sampler)
            },
            annotations: annotationsFor(effectDescription, name),
            heapView: isHeapView(effectDescription, pass, "sampler", stageType, sampler.registerIndex),
            sourceTruth: "carbon-signature-sampler"
        });
        seen.add(identity);
    }
}

/**
 * Builds one binding from a Carbon register declaration.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @param {object} register Carbon register declaration.
 * @returns {object|null} Binding record.
 */
function buildRegisterBinding(effectDescription, pass, stageType, stage, register)
{
    const classification = classifyRegister(register.registerType);
    if (!classification) return null;
    const metadata = metadataForBinding(stage, classification.kind, register.registerIndex);
    const generatedSymbol = `${classification.prefix}${register.registerIndex}`;
    return {
        kind: classification.kind,
        generatedSymbol,
        registerIndex: register.registerIndex,
        registerType: register.registerType,
        registerSpace: register.registerSpace,
        registerCount: register.registerCount,
        arrayCount: register.arrayCount,
        // A sampler's `dynamic` is the override authorisation, never the
        // per-frame register flag. `isRegisterDynamic` answers a constant-buffer
        // question -- it returns true for every register whose type is not a
        // constant buffer -- so reading it here marked every DX11 sampler
        // dynamic by construction, contradicting the `isDynamic: false` sitting
        // beside it in the same binding's `carbon.sampler`. DX12 reaches these
        // samplers through the signature path, which already uses the sampler
        // flag, so the same sampler disagreed across backends for no reason
        // other than which code path declared it.
        dynamic: classification.kind === "sampler"
            ? Boolean(metadata?.isDynamic)
            : Boolean(register.dynamic),
        metadataName: metadataName(classification.kind, metadata, stage, register.registerIndex),
        carbon: carbonPayload(classification.kind, metadata, stage, register.registerIndex),
        annotations: annotationsFor(effectDescription, metadataName(classification.kind, metadata, stage, register.registerIndex)),
        heapView: isHeapView(effectDescription, pass, classification.kind, stageType, register.registerIndex),
        sourceTruth: "carbon-stage-register"
    };
}

/**
 * Adds bindings found in Carbon maps but absent from the signature register list.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {object} pass Pass metadata.
 * @param {number} stageType Stage enum value.
 * @param {object} stage Stage input metadata.
 * @param {object[]} bindings Destination bindings.
 * @param {Set<string>} seen Generated symbols already added.
 * @param {string} kind Binding kind.
 * @param {string} prefix Generated symbol prefix.
 * @param {Map<number, object>} map Carbon register map.
 */
function addMapBindings(effectDescription, pass, stageType, stage, bindings, seen, kind, prefix, map)
{
    for (const [ registerIndex, metadata ] of map.entries())
    {
        // Carbon register maps do not carry a register space. When an exact
        // signature source already names this class/index, it wins regardless
        // of space; treating stageType as an additional exact space would
        // manufacture duplicate SM 5.1 bindings.
        if (bindings.some((entry) => entry.kind === kind && entry.registerIndex === registerIndex)) continue;
        const registerSpace = stageType;
        const identity = bindingIdentity(kind, registerSpace, registerIndex);
        const generatedSymbol = `${prefix}${registerIndex}`;
        if (seen.has(identity)) continue;
        bindings.push({
            kind,
            generatedSymbol,
            registerIndex,
            registerType: null,
            registerSpace,
            registerCount: metadata?.arrayElements || 1,
            arrayCount: metadata?.arrayElements || 1,
            dynamic: true,
            metadataName: metadataName(kind, metadata, stage, registerIndex),
            carbon: carbonPayload(kind, metadata, stage, registerIndex),
            annotations: annotationsFor(effectDescription, metadataName(kind, metadata, stage, registerIndex)),
            heapView: isHeapView(effectDescription, pass, kind, stageType, registerIndex),
            sourceTruth: "carbon-register-map"
        });
        seen.add(identity);
    }
}

/**
 * Builds a class-aware identity for one D3D register binding.
 *
 * @param {string} kind Binding class.
 * @param {number} registerSpace D3D register space.
 * @param {number} registerIndex D3D register index.
 * @returns {string} Stable identity.
 */
function bindingIdentity(kind, registerSpace, registerIndex)
{
    return `${kind}:${registerSpace}:${registerIndex}`;
}

/**
 * Classifies a Carbon register type into generated-symbol kind.
 *
 * @param {number} registerType Carbon register type.
 * @returns {{kind:string,prefix:string}|null} Binding classification.
 */
function classifyRegister(registerType)
{
    if (registerType === 0) return { kind: "constantBuffer", prefix: "cb" };
    if (registerType === 1) return { kind: "sampler", prefix: "s" };
    if (registerType >= 32 && registerType <= 63) return { kind: "resource", prefix: "t" };
    if (registerType >= 64 && registerType <= 95) return { kind: "uav", prefix: "u" };
    return null;
}

/**
 * Gets register metadata for a classified binding.
 *
 * @param {object} stage Stage input metadata.
 * @param {string} kind Binding kind.
 * @param {number} registerIndex Register index.
 * @returns {object|null} Carbon metadata object.
 */
function metadataForBinding(stage, kind, registerIndex)
{
    if (kind === "resource") return stage.resources.get(registerIndex) || null;
    if (kind === "sampler") return stage.samplers.get(registerIndex) || null;
    if (kind === "uav") return stage.uavs.get(registerIndex) || null;
    return null;
}

/**
 * Gets the best Carbon metadata name for one binding.
 *
 * @param {string} kind Binding kind.
 * @param {object|null} metadata Carbon metadata object.
 * @param {object} stage Stage input metadata.
 * @param {number} registerIndex Register index.
 * @returns {string|null} Metadata name.
 */
function metadataName(kind, metadata, stage, registerIndex)
{
    if (kind === "sampler") return metadata?.isDynamic ? metadata.name || null : null;
    if (metadata?.name) return metadata.name;
    if (kind === "constantBuffer" && registerIndex === 0 && stage.constants.length) return "$LocalConstants";
    return null;
}

/**
 * Builds the Carbon metadata payload for one binding.
 *
 * @param {string} kind Binding kind.
 * @param {object|null} metadata Carbon metadata object.
 * @param {object} stage Stage input metadata.
 * @param {number} registerIndex Register index.
 * @returns {object|null} JSON-safe Carbon payload.
 */
function carbonPayload(kind, metadata, stage, registerIndex)
{
    if (kind === "constantBuffer")
    {
        const hasLocalConstants = registerIndex === 0 && stage.constants.length > 0;
        const defaults = effectiveConstantDefaults(stage);
        return {
            hasLocalConstants,
            constantValueSize: hasLocalConstants ? defaults.constantValueSize : 0,
            constants: hasLocalConstants ? stage.constants.map(projectConstant) : [],
            // The exact authored default bytes for the stage's local constant
            // buffer. A consumer that zero-fills instead of using these
            // changes every authored default the scene does not override -
            // the effect-resource contract calls the bytes mandatory, and a
            // background effect whose Tint and intensity read zero renders
            // pure black while drawing "correctly".
            constantValues: hasLocalConstants ? Array.from(defaults.constantValues) : []
        };
    }
    if (!metadata) return null;
    return kind === "sampler" ? projectSampler(metadata) : projectResource(metadata);
}

/**
 * Gets top-level annotations for a named parameter.
 *
 * @param {object} effectDescription Decoded effect description.
 * @param {string|null} name Parameter name.
 * @returns {object[]} JSON-safe annotations.
 */
function annotationsFor(effectDescription, name)
{
    if (!name) return [];
    const annotations = effectDescription.annotations?.get(name) || [];
    return annotations.map(projectAnnotation);
}

/**
 * Checks whether a binding is marked as a heap view in the resource-set description.
 *
 * @param {object} pass Pass metadata.
 * @param {string} kind Binding kind.
 * @param {number} stageType Stage enum value.
 * @param {number} registerIndex Register index.
 * @returns {boolean} True when the binding is a heap view.
 */
function isHeapView(effectDescription, pass, kind, stageType, registerIndex)
{
    if (kind !== "resource" && kind !== "sampler" && kind !== "uav") return false;
    const stage = pass.stageInputs[stageType];
    const metadata = metadataForBinding(stage, kind, registerIndex);
    const name = metadataName(kind, metadata, stage, registerIndex);
    if (!name) return false;
    return (effectDescription.annotations.get(name) || []).some(entry =>
        entry.name === "IsHeapView" && entry.type === 0 && entry.boolValue);

}

/**
 * Deep-clones JSON-like values.
 *
 * @param {*} value Value to clone.
 * @returns {*} JSON-like clone.
 */
function cloneJson(value)
{
    if (Array.isArray(value)) return value.map(cloneJson);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [ key, cloneJson(entry) ]));
    }
    return value;
}
