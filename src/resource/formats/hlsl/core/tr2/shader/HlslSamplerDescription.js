import { CjsSchema } from "#schema/CjsSchema";

/**
 * Trinity sampler descriptor read from compiled effect metadata.
 */
export class HlslSamplerDescription
{
    /**
     * Comparison filter flag (m_isComparisonFilter, trinityal/Tr2HalHelperStructures.h:142).
     * @type {boolean}
     */
    comparison = false;

    /**
     * Minification filter; TF_POINT (trinityal/Tr2HalHelperStructures.h:139).
     * @type {number}
     */
    minFilter = 1;

    /**
     * Magnification filter; TF_POINT (trinityal/Tr2HalHelperStructures.h:140).
     * @type {number}
     */
    magFilter = 1;

    /**
     * Mip filter; TF_POINT (trinityal/Tr2HalHelperStructures.h:141).
     * @type {number}
     */
    mipFilter = 1;

    /**
     * U address mode; TA_WRAP (trinityal/Tr2HalHelperStructures.h:143).
     * @type {number}
     */
    addressU = 1;

    /**
     * V address mode; TA_WRAP (trinityal/Tr2HalHelperStructures.h:144).
     * @type {number}
     */
    addressV = 1;

    /**
     * W address mode; TA_WRAP (trinityal/Tr2HalHelperStructures.h:145).
     * @type {number}
     */
    addressW = 1;

    /**
     * Mip LOD bias (trinityal/Tr2HalHelperStructures.h:146).
     * @type {number}
     */
    mipLODBias = 0;

    /**
     * Raw float bits of mipLODBias; ours.
     * @type {number}
     */
    mipLODBiasRaw = 0;

    /**
     * Maximum anisotropy (trinityal/Tr2HalHelperStructures.h:147).
     * @type {number}
     */
    maxAnisotropy = 1;

    /**
     * Comparison function; CMP_ALWAYS (trinityal/Tr2HalHelperStructures.h:148).
     * @type {number}
     */
    comparisonFunc = 8;

    /**
     * Border colour (trinityal/Tr2HalHelperStructures.h:152-155).
     * @type {number[]}
     */
    borderColor = [ 0, 0, 0, 0 ];

    /**
     * Raw float bits of borderColor; ours.
     * @type {number[]}
     */
    borderColorRaw = [ 0, 0, 0, 0 ];

    /**
     * Minimum LOD (trinityal/Tr2HalHelperStructures.h:149).
     * @type {number}
     */
    minLOD = 0;

    /**
     * Raw float bits of minLOD; ours.
     * @type {number}
     */
    minLODRaw = 0;

    /**
     * Maximum LOD; FLT_MAX (trinityal/Tr2HalHelperStructures.h:150).
     * @type {number}
     */
    maxLOD = 3.4028234663852886e38;

    /**
     * Raw float bits of maxLOD; ours.
     * @type {number}
     */
    maxLODRaw = 0;

    /**
     * Whether the sampler may be overridden; ours. A pre-v13 record carries no flag, and dynamic is the legacy reading.
     * @type {boolean}
     */
    isDynamic = true;

    /**
   * Returns a JSON-safe sampler snapshot.
   *
   * @returns {object} Serializable sampler descriptor.
   */
    toJSON()
    {
        return {
            comparison: this.comparison,
            minFilter: this.minFilter,
            magFilter: this.magFilter,
            mipFilter: this.mipFilter,
            addressU: this.addressU,
            addressV: this.addressV,
            addressW: this.addressW,
            mipLODBias: this.mipLODBias,
            maxAnisotropy: this.maxAnisotropy,
            comparisonFunc: this.comparisonFunc,
            borderColor: this.borderColor.slice(),
            minLOD: this.minLOD,
            maxLOD: this.maxLOD,
            isDynamic: this.isDynamic
        };
    }
}

CjsSchema.meta.define(HlslSamplerDescription, { className: "HlslSamplerDescription", donors: [ "Tr2SamplerDescription" ] });
