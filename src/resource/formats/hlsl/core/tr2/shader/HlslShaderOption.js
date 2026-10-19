import { CjsSchema } from "#schema/CjsSchema";

/**
 * Name/value shader permutation option used during effect lookup.
 */
export class HlslShaderOption
{
    /**
     * Permutation axis name (Shader/Tr2EffectDescription.h:274); set by the constructor.
     * @type {string}
     */
    name = "";

    /**
     * Selected option value (Shader/Tr2EffectDescription.h:275); set by the constructor.
     * @type {string}
     */
    value = "";

    /**
   * Creates a shader option selection.
   *
   * @param {string} [name] Permutation axis name.
   * @param {string} [value] Selected option value.
   */
    constructor(name = "", value = "")
    {
        this.name = name;
        this.value = value;
    }

    /**
   * Returns a JSON-safe option selection.
   *
   * @returns {object} Serializable option selection.
   */
    toJSON()
    {
        return {
            name: this.name,
            value: this.value
        };
    }
}

CjsSchema.meta.define(HlslShaderOption, { className: "HlslShaderOption", donors: [ "Tr2ShaderOption" ] });
