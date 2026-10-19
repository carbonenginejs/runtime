import { CjsSchema } from "#schema/CjsSchema";

/**
 * Trinity effect technique containing passes and optional shader libraries.
 */
export class HlslEffectTechnique
{
    /**
     * Technique name (Shader/Tr2EffectDescription.h:241).
     * @type {string}
     */
    name = "";

    /**
     * Passes (Shader/Tr2EffectDescription.h:242).
     * @type {HlslPass[]}
     */
    passes = [];

    /**
     * Ray-tracing libraries (Shader/Tr2EffectDescription.h:243).
     * @type {HlslEffectLibrary[]}
     */
    libraries = [];

    /**
     * Shader-stage bit mask (Shader/Tr2EffectDescription.h:237).
     * @type {number}
     */
    shaderTypeMask = 0;

    /**
   * Returns a JSON-safe technique metadata snapshot.
   *
   * @returns {object} Serializable technique metadata.
   */
    toJSON()
    {
        return {
            name: this.name,
            passes: this.passes.map((entry) => entry.toJSON()),
            libraries: this.libraries.map((entry) => entry.toJSON()),
            shaderTypeMask: this.shaderTypeMask
        };
    }
}

CjsSchema.meta.define(HlslEffectTechnique, { className: "HlslEffectTechnique", donors: [ "Tr2EffectTechnique" ] });
