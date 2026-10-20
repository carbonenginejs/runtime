import { emitLibrary } from "./metadata.js";
/**
 * Tr2 effect JSON emitter.
 *
 * Converts canonical Tr2EffectRes/Tr2Shader reflection into the format's
 * plain JSON contract. Source/header context is supplied explicitly because
 * the canonical description does not own container metadata.
 *
 * `emitEffectJson(effect, shader, options)` returns a plain object whose key
 * order mirrors the reader schema below. When `options.classes` is given,
 * matching node kinds are instantiated and populated as class instances
 * instead of plain object literals — an opt-in alternative to walking the
 * returned JSON into application-specific classes by hand.
 */

import { shaderStageName } from "../../../format/effect/shaderStageNames.js";
import { effectHeader } from "../../../format/effect/effectHeader.js";
import {
    effectiveConstantDefaults, projectAnnotation, projectSampler,
    projectPipelineInput, projectRegister, projectProgram
} from "../../../format/effect/effectProjection.js";

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
 * Emit one Tr2ShaderPermutation node.
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
 * Emit one source-program node. Bytes are included as a plain number
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
 * Emit one Tr2EffectConstant node.
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
 * Emit one Tr2EffectResource (SRV or UAV) node.
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
 * Emit one Tr2SamplerSetup node.
 *
 * @param {number} registerIndex Shader register index.
 * @param {object} samplerSetup Decoded sampler setup (name + descriptor).
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted sampler record.
 */
function emitSampler(registerIndex, samplerSetup, classes)
{
    const { name, sampler } = projectSampler(samplerSetup);
    return build(classes, "Sampler", {
        registerIndex,
        name,
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
 * Emit one Tr2EffectStageInput node, or null for stages absent from a pass.
 *
 * @param {object|undefined} stageInput Decoded stage input, if present.
 * @param {number} stageType Trinity shader stage enum value.
 * @param {object} classes Opt-in node class map.
 * @returns {object|null} Emitted stage-input record, or null.
 */
function emitStageInput(stageInput, stageType, classes, context)
{
    if (!stageInput || !stageInput.exists) return null;

    const signature = stageInput.signature || {};

    return build(classes, "StageInput", {
        stageType,
        stageName: shaderStageName(stageType),
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
        bytecode: emitShaderBytecode(stageInput.sourceProgram ? { ...projectProgram(stageInput.sourceProgram, stageType, context), bytes: stageInput.sourceProgram.bytes } : null, classes),
        signature: {
            pipelineInputs: (signature.pipelineInputs || []).map(projectPipelineInput),
            registers: (signature.registers || []).map(entry => projectRegister(entry, stageType)),
            threadGroupSize: signature.threadGroupSize ? { ...signature.threadGroupSize } : null
        }
    });
}

/**
 * Emit one Tr2Pass node.
 *
 * @param {object} pass Decoded technique pass.
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted pass record.
 */
function emitPass(pass, classes, context)
{
    return build(classes, "Pass", {
        shaderTypeMask: pass.shaderTypeMask,
        stageInputs: pass.stageInputs.map((stageInput, stageType) => emitStageInput(stageInput, stageType, classes, context)),
        renderStates: pass.renderStateValues.map(({ state, value }) => ({ key: state, value }))
    });
}

/**
 * Emit one Tr2EffectTechnique node.
 *
 * @param {object} technique Decoded technique.
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted technique record.
 */
function emitTechnique(technique, classes, context)
{
    return build(classes, "Technique", {
        name: technique.name,
        shaderTypeMask: technique.shaderTypeMask,
        passes: technique.passes.map((pass) => emitPass(pass, classes, context)),
        // Shader-library (v14+ ray tracing) metadata has no dedicated class
        // key yet; emitted as plain, JSON-compatible data.
        libraries: technique.libraries.map(library =>
        {
            const metadata = emitLibrary(library);
            return {
                ...metadata,
                globalInput: {
                    ...metadata.globalInput,
                    constantValues: Array.from(effectiveConstantDefaults(library.globalInput).constantValues)
                },
                localInput: {
                    ...metadata.localInput,
                    constantValues: Array.from(effectiveConstantDefaults(library.localInput).constantValues)
                },
                libraryHandle: library.libraryHandle,
                sourceProgram: library.sourceProgram ? {
                    ...projectProgram(library.sourceProgram, 2, { ...context, stageName: "library" }),
                    bytes: Array.from(library.sourceProgram.bytes)
                } : null
            };
        })
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
        annotations: entries.map(projectAnnotation)
    }));
}

/**
 * Emit one Tr2EffectDescription node: one resolved permutation's decoded
 * techniques, passes, and stage metadata.
 *
 * @param {object} description Decoded effect description (`Tr2Shader.GetEffectDescription()`).
 * @param {object} classes Opt-in node class map.
 * @returns {object} Emitted effect-description record.
 */
function emitEffectDescription(description, classes, context)
{
    return build(classes, "EffectDescription", {
        version: context.version,
        effectName: context.effectName,
        techniques: description.techniques.map((technique) => emitTechnique(technique, classes, context)),
        annotations: emitAnnotations(description.annotations),
        readError: null
    });
}

/**
 * The `emit: "json"` effect graph (node keys in parentheses are the
 * `classes` keys that may replace a plain object):
 *
 * ```text
 * Root: version, compilerVersion, sourcePath, bodyCount, loadError,
 *       permutations: Permutation[], effect: EffectDescription | null
 * Permutation: name, options, defaultOption, description, type
 * EffectDescription: version, effectName, techniques: Technique[],
 *       annotations: { name, annotations[] }[], readError
 * Technique: name, shaderTypeMask, passes: Pass[], libraries (plain data)
 * Pass: shaderTypeMask, stageInputs: (StageInput | null)[],
 *       renderStates: { key, value }[]
 * StageInput: stageType, stageName, constants: Constant[],
 *       resources: Resource[], samplers: Sampler[], uavs: Resource[],
 *       bytecode: ShaderBytecode | null,
 *       signature: { pipelineInputs, registers, threadGroupSize }
 * Constant: name, offset, size, type, dimension, elements, isSRGB, isAutoregister
 * Resource: registerIndex, name, type, arrayElements, isSRGB, isAutoregister
 * Sampler: registerIndex, name, isDynamic, comparison, min/mag/mipFilter,
 *       addressU/V/W, mipLODBias, maxAnisotropy, comparisonFunc,
 *       borderColor, minLOD, maxLOD
 * ShaderBytecode: stageType, stageName, shaderSize, stringTableOffset,
 *       effectName, bytes (number[])
 * ```
 *
 * `effect` is the body selected by the `permutation` option (an array of
 * `{ name, value }` or a `Map`) over the container's default option set;
 * canonical global effect options take precedence over both.
 * `stageInputs` is indexed by stage type; an absent stage is `null`. Bytecode
 * bytes are opaque; the `dxbc` format decodes them. `loadError` and
 * `readError` are `{ name, message }` when the container or the selected body
 * failed to decode, otherwise `null`.
 *
 * @typedef {object} HlslEffectJson
 */

/**
 * Convert a loaded Tr2EffectRes (and, when resolvable, its default- or
 * selected-permutation Tr2Shader) into the documented plain JSON shape.
 *
 * @param {object} effect Loaded Tr2EffectRes instance.
 * @param {object|null} shader Resolved Tr2Shader for one permutation, or null.
 * @param {object} [options] Emission options.
 * @param {object} [options.classes] Opt-in node class map. See {@link CLASS_KEYS}.
 * @returns {object} Plain JSON-compatible effect graph, or a populated
 * `classes.Root` instance when provided.
 */
export function emitEffectJson(effect, shader, options = {})
{
    const { classes = {} } = options;
    const header = effectHeader(effect);
    const context = { version: header.version, effectName: effect.GetPath() };

    return build(classes, "Root", {
        version: header.version,
        compilerVersion: header.compilerVersion,
        sourcePath: effect.GetPath(),
        bodyCount: header.records.length,
        permutations: header.permutations.map((permutation) => emitPermutation(permutation, classes)),
        effect: shader ? emitEffectDescription(shader.GetEffectDescription(), classes, context) : null,
        loadError: null
    });
}
