import { CjsSchema } from "#schema/CjsSchema";

import { HlslSamplerDescription } from "./HlslSamplerDescription.js";

/**
 * Trinity sampler binding that pairs a metadata name with a sampler descriptor.
 */
export class HlslSamplerSetup
{
    /**
     * Sampler name (Shader/Tr2EffectDescription.h:114); null for a non-dynamic sampler.
     * @type {string|null}
     */
    name = null;

    /**
     * Sampler descriptor (Shader/Tr2EffectDescription.h:115).
     * @type {HlslSamplerDescription}
     */
    sampler = new HlslSamplerDescription();

    /**
   * Returns a JSON-safe sampler binding.
   *
   * @returns {object} Serializable sampler setup.
   */
    toJSON()
    {
        return {
            name: this.name,
            sampler: this.sampler?.toJSON() ?? null
        };
    }
}

CjsSchema.meta.define(HlslSamplerSetup, { className: "HlslSamplerSetup", donors: [ "Tr2SamplerSetup" ] });
