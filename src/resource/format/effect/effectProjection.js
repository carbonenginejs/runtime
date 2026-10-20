import { dwordToFloat } from "#math/num";
import { shaderStageName, shaderUsageNames } from "./shaderStageNames.js";

/**
 * Terminal JSON projections of canonical shader reflection for the translators.
 *
 * These functions never change the canonical graph. In particular, authored
 * sampler names, float bits and complete constant defaults remain available to
 * the Carbon writer, while the translator receives Carbon's effective view.
 */

/**
 * Emit a constant's existing translator fields, in their established order.
 * @param {object} constant Canonical constant.
 * @returns {object} Constant metadata.
 */
export function projectConstant(constant)
{
    return {
        name: constant.name,
        offset: constant.offset,
        size: constant.size,
        type: constant.type,
        dimension: constant.dimension,
        elements: constant.elements,
        isSRGB: constant.isSRGB,
        isAutoregister: constant.isAutoregister
    };
}

/**
 * Emit an SRV or UAV's existing translator fields.
 * @param {object} resource Canonical resource.
 * @returns {object} Resource metadata.
 */
export function projectResource(resource)
{
    return {
        name: resource.name,
        type: resource.type,
        arrayElements: resource.arrayElements,
        isSRGB: resource.isSRGB,
        isAutoregister: resource.isAutoregister
    };
}

/**
 * Preserve the format's numeric union views without changing typed annotations.
 * @param {object} annotation Canonical annotation.
 * @returns {object} Annotation metadata.
 */
export function projectAnnotation(annotation)
{
    const bits = annotation.rawValue;
    return {
        name: annotation.name,
        type: annotation.type,
        boolValue: bits !== 0,
        intValue: bits | 0,
        floatValue: dwordToFloat(bits),
        stringValue: annotation.stringValue,
        rawValue: bits
    };
}

/**
 * Expand a canonical sampler descriptor for the existing translator contract.
 * Carbon expands the static border enum in Tr2EffectDescription.cpp:340-362.
 * @param {object} descriptor Canonical raw-bit descriptor.
 * @param {boolean} isDynamic Override authorization from the sampler setup.
 * @param {boolean} [isStatic] Whether the border is the static one-byte enum.
 * @returns {object} Numeric sampler descriptor.
 */
export function projectSamplerDescriptor(descriptor, isDynamic, isStatic = false)
{
    const borderColor = isStatic
        ? descriptor.borderColor === 1 ? [ 0, 0, 0, 1 ]
            : descriptor.borderColor === 2 ? [ 1, 1, 1, 1 ] : [ 0, 0, 0, 0 ]
        : descriptor.borderColorRaw.map(dwordToFloat);
    return {
        comparison: descriptor.comparison,
        minFilter: descriptor.minFilter,
        magFilter: descriptor.magFilter,
        mipFilter: descriptor.mipFilter,
        addressU: descriptor.addressU,
        addressV: descriptor.addressV,
        addressW: descriptor.addressW,
        mipLODBias: dwordToFloat(descriptor.mipLODBiasRaw),
        maxAnisotropy: descriptor.maxAnisotropy,
        comparisonFunc: descriptor.comparisonFunc,
        borderColor,
        minLOD: dwordToFloat(descriptor.minLODRaw),
        maxLOD: dwordToFloat(descriptor.maxLODRaw),
        isDynamic
    };
}

/**
 * Project the effective sampler name and descriptor.
 * Carbon suppresses non-dynamic names in Tr2EffectDescription.cpp:430-433.
 * @param {object} setup Canonical sampler setup.
 * @returns {object} Translator sampler metadata.
 */
export function projectSampler(setup)
{
    return {
        name: setup.isDynamic ? setup.name : null,
        sampler: projectSamplerDescriptor(setup.sampler, setup.isDynamic)
    };
}

/**
 * Emit a static signature sampler using the same numeric descriptor projection.
 * @param {object} entry Canonical static sampler.
 * @returns {object} Translator static sampler.
 */
export function projectStaticSampler(entry)
{
    return {
        registerIndex: entry.registerIndex,
        registerSpace: entry.registerSpace,
        sampler: projectSamplerDescriptor(entry.descriptor, false, true)
    };
}

/**
 * Emit a pipeline input with its established display-name field.
 * @param {object} entry Canonical pipeline input.
 * @returns {object} Pipeline-input metadata.
 */
export function projectPipelineInput(entry)
{
    return {
        usage: entry.usage,
        usageName: shaderUsageNames[entry.usage] || `USAGE_${entry.usage}`,
        registerIndex: entry.registerIndex,
        usageIndex: entry.usageIndex,
        usedMask: entry.usedMask,
        type: entry.type,
        dimension: entry.dimension
    };
}

/**
 * Emit a register declaration's derived per-frame flag.
 * @param {object} entry Canonical register.
 * @param {number} stageType Stage index.
 * @param {object} [context] Optional per-frame register assignments.
 * @returns {object} Register metadata.
 */
export function projectRegister(entry, stageType, context = {})
{
    const dynamic = entry.registerType !== 0
        || !((stageType === 0 && entry.registerIndex === context.perFrameVSStartRegister)
            || (stageType === 1 && entry.registerIndex === context.perFramePSStartRegister));
    return {
        registerType: entry.registerType,
        registerIndex: entry.registerIndex,
        registerCount: entry.registerCount,
        arrayCount: entry.arrayCount,
        registerSpace: entry.registerSpace,
        dynamic
    };
}

/**
 * Derive the effective default block without modifying the authored bytes.
 * The clamp is Carbon's ReadInput (Tr2EffectDescription.cpp:381-386); sampler
 * heap-index constants extend it at :629-632. This preserves the translator's
 * existing allocation policy while the canonical graph keeps the source blob.
 * @param {object} stage Canonical stage or library input.
 * @returns {{constantValueSize:number,constantValues:Uint8Array}} Effective defaults.
 */
export function effectiveConstantDefaults(stage)
{
    const sourceSize = Math.min(stage.constantValueSize, 4096);
    let size = sourceSize;
    for (const constant of stage.constants)
    {
        if (constant.type !== 2 || constant.dimension !== 1) continue;
        for (const sampler of stage.samplers.values())
        {
            if (!sampler.isDynamic || sampler.name !== constant.name) continue;
            size = Math.max(size, constant.offset + constant.size);
            break;
        }
    }

    // alloc: an owned, variable-length projection; source defaults stay intact.
    const values = new Uint8Array(size);
    values.set(stage.constantValues.subarray(0, sourceSize));
    return { constantValueSize: size, constantValues: values };
}

/**
 * Describe a retained source program without copying its bytes or inventing an
 * arena offset. Canonical reflection retains offsets only for empty blobs.
 * @param {object|null} program Canonical source program.
 * @param {number} stageType Stage index.
 * @param {object} [context] Source name and optional display-name override.
 * @returns {object|null} Program summary.
 */
export function projectProgram(program, stageType, context = {})
{
    if (!program) return null;
    return {
        stageType,
        stageName: context.stageName || shaderStageName(stageType),
        shaderSize: program.shaderSize,
        stringTableOffset: program.shaderSize === 0 ? program.unsetOffset : null,
        effectName: context.effectName || ""
    };
}
