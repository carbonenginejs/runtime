import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:461-485

/** The HLSL semantic of each `UsageCode` (EffectData.cpp:6-21). */
const USAGE_STRINGS = ["POSITION", "COLOR", "NORMAL", "TANGENT", "BINORMAL", "TEXCOORD", "BLENDINDICES", "BLENDWEIGHT"];

/**
 * One vertex input of a vertex stage: Carbon's `PipelineInputDescription`.
 * `name` is a `UsageCode` byte, not text; `index` the usage index.
 */
export class PipelineInputDescription
{
    name = 0;

    registerIndex = 0;

    index = 0;

    usedMask = 0;

    /** A `ConstantType` value. */
    type = 0;

    dimension = 0;

    /**
     * Carbon's `operator==`.
     *
     * @param {PipelineInputDescription} other The input to compare with.
     * @returns {boolean} Whether every field matches.
     */
    Equals(other)
    {
        return this.name === other.name && this.registerIndex === other.registerIndex && this.index === other.index &&
            this.usedMask === other.usedMask && this.type === other.type && this.dimension === other.dimension;
    }

    /**
     * Carbon's `GetStringForUsageCode`: the HLSL semantic name of a usage. Carbon
     * asserts the code is in range; this throws.
     *
     * @param {number} usageCode A `UsageCode` value below `UC_NUM_USAGE_CODE`.
     * @returns {string} The semantic name.
     */
    static getStringForUsageCode(usageCode)
    {
        if (!(usageCode >= 0 && usageCode < USAGE_STRINGS.length))
        {
            throw new RangeError(`GetStringForUsageCode: no usage code ${usageCode}`);
        }
        return USAGE_STRINGS[usageCode];
    }

    // Source: trinity/shadercompiler/EffectData.h:72-85
    // Source: trinity/shadercompiler/EffectData.cpp:6-21

    /**
     * Carbon's `UsageCode`: vertex input usages.
     */
    static UsageCode = Object.freeze({
        UC_POSITION: 0,
        UC_COLOR: 1,
        UC_NORMAL: 2,
        UC_TANGENT: 3,
        UC_BITANGENT: 4,
        UC_TEXCOORD: 5,
        UC_BLENDINDICES: 6,
        UC_BLENDWEIGHTS: 7,

        UC_NUM_USAGE_CODE: 8
    });
}

CjsSchema.decorateMethod(PipelineInputDescription, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("PipelineInputDescription")(PipelineInputDescription);
