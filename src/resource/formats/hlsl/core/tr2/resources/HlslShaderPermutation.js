import { CjsSchema } from "#schema/CjsSchema";

/**
 * Trinity shader permutation axis and option metadata.
 */
export class HlslShaderPermutation
{
    /** Permutation name (BlueSharedString). */
    name = "";

    /** Option names (std::vector<BlueSharedString>). */
    options = [];

    /** Default option index (size_t). Carbon leaves it unset (Resources/Tr2EffectRes.h:22). */
    defaultOption = 0;

    /** Description (std::string). */
    description = "";

    /** Permutation type (uint8_t). Carbon leaves it unset (Resources/Tr2EffectRes.h:24). */
    type = 0;

    /**
   * Returns the permutation metadata in report-friendly form.
   *
   * @returns {object} Serializable permutation description.
   */
    toJSON()
    {
        return {
            name: this.name,
            options: this.options.slice(),
            defaultOption: this.defaultOption,
            description: this.description,
            type: this.type
        };
    }
}

CjsSchema.meta.define(HlslShaderPermutation, { className: "HlslShaderPermutation", donors: [ "Tr2ShaderPermutation" ] });
