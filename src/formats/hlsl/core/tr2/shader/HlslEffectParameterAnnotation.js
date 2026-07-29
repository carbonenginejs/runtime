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
   * Creates an empty string annotation record.
   */
    constructor()
    {
        this.name = "";
        this.type = HlslEffectParameterAnnotation.Type.STRING;
        this.boolValue = false;
        this.intValue = 0;
        this.floatValue = 0;
        this.stringValue = "";
        this.rawValue = 0;
    }

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
