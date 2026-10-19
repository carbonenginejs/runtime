import { CjsSchema } from "#schema/CjsSchema";

/**
 * Constant-buffer parameter metadata read from a Trinity effect body.
 */
export class HlslEffectConstant
{
    static Type = Object.freeze({
        FLOAT: 0,
        INT: 1,
        UINT: 2,
        BOOL: 3,
        OTHER: 4
    });

    /**
     * Constant name (Shader/Tr2EffectDescription.h:46). Carbon leaves it unset.
     * @type {string}
     */
    name = "";

    /**
     * Data offset in the constant buffer (Shader/Tr2EffectDescription.h:48). Carbon leaves it unset.
     * @type {number}
     */
    offset = 0;

    /**
     * Size in bytes (Shader/Tr2EffectDescription.h:50). Carbon leaves it unset.
     * @type {number}
     */
    size = 0;

    /**
     * Constant type (Shader/Tr2EffectDescription.h:52). Carbon leaves it unset; FLOAT is 0.
     * @type {number}
     */
    type = HlslEffectConstant.Type.FLOAT;

    /**
     * Vector dimension (Shader/Tr2EffectDescription.h:54). Carbon leaves it unset.
     * @type {number}
     */
    dimension = 0;

    /**
     * Element count (Shader/Tr2EffectDescription.h:56). Carbon leaves it unset.
     * @type {number}
     */
    elements = 0;

    /**
     * Tr2SRGB annotation value (Shader/Tr2EffectDescription.h:58). Carbon leaves it unset.
     * @type {boolean}
     */
    isSRGB = false;

    /**
     * Autoregister annotation value (Shader/Tr2EffectDescription.h:60). Carbon leaves it unset.
     * @type {boolean}
     */
    isAutoregister = false;

    /**
   * Returns a JSON-safe constant metadata snapshot.
   *
   * @returns {object} Serializable constant metadata.
   */
    toJSON()
    {
        return { ...this };
    }
}

CjsSchema.meta.define(HlslEffectConstant, { className: "HlslEffectConstant", donors: [ "Tr2EffectConstant" ] });
