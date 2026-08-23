/**
 * Tr2 effect JSON emitter.
 *
 * Converts the internal HlslEffectRes/HlslShader graph (src/core/tr2, internal
 * parsing machinery — not part of this package's public surface) into the
 * plain, documented JSON shape that IS the public contract of this reader.
 *
 * `emitEffectJson(effect, shader, options)` returns a plain object whose key
 * order mirrors the reader schema below. When `options.classes` is given,
 * matching node kinds are instantiated and populated as class instances
 * instead of plain object literals — an opt-in alternative to walking the
 * returned JSON into application-specific classes by hand.
 */

import { hlslShaderStageName } from "./tr2/HlslRenderContextEnum.js";

/**
 * Node keys accepted by {@link emitEffectJson}'s `options.classes` map.
 *
 * Each key names one node shape in the emitted effect graph; the mapped
 * constructor is instantiated with `new` and populated with that node's
 * usual fields instead of a plain object literal.
 *
 * This is a first-pass hydration surface: it covers the top-level effect
 * graph (the header, the default-permutation effect description, its
 * techniques/passes/stage inputs, and per-stage constants/resources/
 * samplers/bytecode). Nested detail that has no dedicated class key yet
 * (shader libraries, parameter annotations, pipeline-input/register
 * signatures) is still emitted as plain, JSON-compatible data.
 */
export const CLASS_KEYS = Object.freeze([
    "Root",
    "Permutation",
    "EffectDescription",
    "Technique",
    "Pass",
    "StageInput",
    "Constant",
    "Resource",
    "Sampler",
    "ShaderBytecode"
]);

/**
 * Instantiate and populate a node class, or return the plain props unchanged.
 *
 * @param {object} classes Opt-in node class map.
 * @param {string} key Node key to look up in `classes`.
 * @param {object} props Fields to populate onto the instance.
 * @returns {object} A populated class instance, or `props` when no
 * constructor is registered for `key`.
 */
function build(classes, key, props)
{
    const Ctor = classes[key];
    return Ctor ? Object.assign(new Ctor(), props) : props;
}

/**
 * Emit one HlslShaderPermutation node.
 *
 * @param {object} permutation Decoded permutation axis.
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted permutation record.
 */
function emitPermutation(permutation, classes)
{
    return build(classes, "Permutation", {
        name: permutation.name,
        options: permutation.options.slice(),
        defaultOption: permutation.defaultOption,
        description: permutation.description,
        type: permutation.type
    });
}

/**
 * Emit one HlslShaderBytecode node. Bytes are included as a plain number
 * array (opaque payload; this package does not decode DXBC/HLSL bytecode).
 *
 * @param {object|null} bytecode Captured shader bytecode, or null.
 * @param {object} classes Opt-in node class map.
 * @returns {object|null} Emitted bytecode record, or null.
 */
function emitShaderBytecode(bytecode, classes)
{
    if (!bytecode) return null;
    return build(classes, "ShaderBytecode", {
        stageType: bytecode.stageType,
        stageName: bytecode.stageName,
        shaderSize: bytecode.shaderSize,
        stringTableOffset: bytecode.stringTableOffset,
        effectName: bytecode.effectName,
        bytes: Array.from(bytecode.bytes)
    });
}

/**
 * Emit one HlslEffectConstant node.
 *
 * @param {object} constant Decoded constant-buffer field metadata.
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted constant record.
 */
function emitConstant(constant, classes)
{
    return build(classes, "Constant", {
        name: constant.name,
        offset: constant.offset,
        size: constant.size,
        type: constant.type,
        dimension: constant.dimension,
        elements: constant.elements,
        isSRGB: constant.isSRGB,
        isAutoregister: constant.isAutoregister
    });
}

/**
 * Emit one HlslEffectResource (SRV or UAV) node.
 *
 * @param {number} registerIndex Shader register index.
 * @param {object} resource Decoded resource metadata.
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted resource record.
 */
function emitResource(registerIndex, resource, classes)
{
    return build(classes, "Resource", {
        registerIndex,
        name: resource.name,
        type: resource.type,
        arrayElements: resource.arrayElements,
        isSRGB: resource.isSRGB,
        isAutoregister: resource.isAutoregister
    });
}

/**
 * Emit one HlslSamplerSetup node.
 *
 * @param {number} registerIndex Shader register index.
 * @param {object} samplerSetup Decoded sampler setup (name + descriptor).
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted sampler record.
 */
function emitSampler(registerIndex, samplerSetup, classes)
{
    const sampler = samplerSetup.sampler || {};
    return build(classes, "Sampler", {
        registerIndex,
        name: samplerSetup.name,
        isDynamic: !!sampler.isDynamic,
        comparison: !!sampler.comparison,
        minFilter: sampler.minFilter,
        magFilter: sampler.magFilter,
        mipFilter: sampler.mipFilter,
        addressU: sampler.addressU,
        addressV: sampler.addressV,
        addressW: sampler.addressW,
        mipLODBias: sampler.mipLODBias,
        maxAnisotropy: sampler.maxAnisotropy,
        comparisonFunc: sampler.comparisonFunc,
        borderColor: (sampler.borderColor || []).slice(),
        minLOD: sampler.minLOD,
        maxLOD: sampler.maxLOD
    });
}

/**
 * Emit one HlslEffectStageInput node, or null for stages absent from a pass.
 *
 * @param {object|undefined} stageInput Decoded stage input, if present.
 * @param {number} stageType Trinity shader stage enum value.
 * @param {object} classes Opt-in node class map.
 * @returns {object|null} Emitted stage-input record, or null.
 */
function emitStageInput(stageInput, stageType, classes)
{
    if (!stageInput || !stageInput.m_exists) return null;

    const signature = stageInput.signature || {};

    return build(classes, "StageInput", {
        stageType,
        stageName: hlslShaderStageName(stageType),
        constants: (stageInput.constants || []).map((constant) => emitConstant(constant, classes)),
        resources: Array.from(
            stageInput.resources || [],
            ([ registerIndex, resource ]) => emitResource(registerIndex, resource, classes)
        ),
        samplers: Array.from(
            stageInput.samplers || [],
            ([ registerIndex, sampler ]) => emitSampler(registerIndex, sampler, classes)
        ),
        uavs: Array.from(
            stageInput.uavs || [],
            ([ registerIndex, resource ]) => emitResource(registerIndex, resource, classes)
        ),
        bytecode: emitShaderBytecode(stageInput.cjsShaderBytecode, classes),
        signature: {
            pipelineInputs: (signature.pipelineInputs || []).map((entry) => ({ ...entry })),
            registers: (signature.registers || []).map((entry) => ({ ...entry })),
            threadGroupSize: signature.threadGroupSize ? { ...signature.threadGroupSize } : null
        }
    });
}

/**
 * Emit one HlslPass node.
 *
 * @param {object} pass Decoded technique pass.
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted pass record.
 */
function emitPass(pass, classes)
{
    return build(classes, "Pass", {
        shaderTypeMask: pass.shaderTypeMask,
        stageInputs: pass.stageInputs.map((stageInput, stageType) => emitStageInput(stageInput, stageType, classes)),
        renderStates: pass.cjsRenderStateSetup ? pass.cjsRenderStateSetup.toJSON() : []
    });
}

/**
 * Emit one HlslEffectTechnique node.
 *
 * @param {object} technique Decoded technique.
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted technique record.
 */
function emitTechnique(technique, classes)
{
    return build(classes, "Technique", {
        name: technique.name,
        shaderTypeMask: technique.shaderTypeMask,
        passes: technique.passes.map((pass) => emitPass(pass, classes)),
        // Shader-library (v14+ ray tracing) metadata has no dedicated class
        // key yet; emitted as plain, JSON-compatible data.
        libraries: technique.libraries.map((library) => library?.toJSON?.() ?? library)
    });
}

/**
 * Serializes a map of parameter names to annotation arrays as plain data.
 *
 * @param {Map<string, object[]>} annotations Annotation map.
 * @returns {object[]} JSON-safe annotation groups.
 */
function emitAnnotations(annotations)
{
    return Array.from(annotations.entries(), ([ name, entries ]) => ({
        name,
        annotations: entries.map((entry) => entry?.toJSON?.() ?? entry)
    }));
}

/**
 * Emit one HlslEffectDescription node: one resolved permutation's decoded
 * techniques, passes, and stage metadata.
 *
 * @param {object} description Decoded effect description (`HlslShader.GetEffectDescription()`).
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted effect-description record.
 */
function emitEffectDescription(description, classes)
{
    return build(classes, "EffectDescription", {
        version: description.version,
        effectName: description.effectName,
        techniques: description.techniques.map((technique) => emitTechnique(technique, classes)),
        annotations: emitAnnotations(description.annotations),
        readError: description.readError
            ? { name: description.readError.name, message: description.readError.message }
            : null
    });
}

/**
 * Convert a loaded HlslEffectRes (and, when resolvable, its default- or
 * selected-permutation HlslShader) into the documented plain JSON shape.
 *
 * @param {object} effect Loaded HlslEffectRes instance.
 * @param {object|null} shader Resolved HlslShader for one permutation, or null.
 * @param {object} [options] Emission options.
 * @param {object} [options.classes] Opt-in node class map. See {@link CLASS_KEYS}.
 * @returns {object} Plain JSON-compatible effect graph, or a populated
 * `classes.Root` instance when provided.
 */
export function emitEffectJson(effect, shader, options = {})
{
    const { classes = {} } = options;

    return build(classes, "Root", {
        version: effect.m_version,
        compilerVersion: effect.m_compilerVersion,
        sourcePath: effect.sourcePath,
        bodyCount: effect.m_offsetCount,
        permutations: effect.m_permutations.map((permutation) => emitPermutation(permutation, classes)),
        effect: shader ? emitEffectDescription(shader.GetEffectDescription(), classes) : null,
        loadError: effect.loadError ? { name: effect.loadError.name, message: effect.loadError.message } : null
    });
}
