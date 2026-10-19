import { CjsSchema } from "#schema/CjsSchema";

/**
 * Parameter annotation value attached to a Trinity effect parameter.
 */
export class HlslEffectParameterAnnotation
{
    static Type = Object.freeze({
        BOOL: 0,
        INT: 1,
        FLOAT: 2,
        STRING: 3
    });

    /**
     * Annotation name (Shader/Tr2EffectDescription.h:141). Carbon leaves it unset.
     * @type {string}
     */
    name = "";

    /**
     * Annotation type (Shader/Tr2EffectDescription.h:142). Carbon leaves it unset; ours starts as STRING.
     * @type {number}
     */
    type = HlslEffectParameterAnnotation.Type.STRING;

    /**
     * Bool member of Carbon's value union (Shader/Tr2EffectDescription.h:145).
     * @type {boolean}
     */
    boolValue = false;

    /**
     * Int member of Carbon's value union (Shader/Tr2EffectDescription.h:146).
     * @type {number}
     */
    intValue = 0;

    /**
     * Float member of Carbon's value union (Shader/Tr2EffectDescription.h:147).
     * @type {number}
     */
    floatValue = 0;

    /**
     * String member of Carbon's value union (Shader/Tr2EffectDescription.h:150).
     * @type {string}
     */
    stringValue = "";

    /**
     * Raw union bits; ours.
     * @type {number}
     */
    rawValue = 0;

    /**
   * Returns a JSON-safe annotation snapshot.
   *
   * @returns {object} Serializable annotation metadata.
   */
    toJSON()
    {
        return { ...this };
    }
}

CjsSchema.meta.define(HlslEffectParameterAnnotation, { className: "HlslEffectParameterAnnotation", donors: [ "Tr2EffectParameterAnnotation" ] });
