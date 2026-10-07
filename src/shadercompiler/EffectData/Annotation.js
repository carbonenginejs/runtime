// Source: trinity/shadercompiler/EffectData.h:572-595

/**
 * One annotation value: Carbon's `Annotation`.
 *
 * Carbon stores `floatValue` and `intValue` in a union and saves the four
 * bytes as a float for every non-string type, so an int or bool annotation
 * is saved as its integer's bit pattern. The two accessors here share four
 * bytes the same way.
 */
export class Annotation
{
    /** An `AnnotationType` value. */
    type = 0;

    _bits = new DataView(new ArrayBuffer(4));

    stringValue = "";

    /** @returns {number} The union read as a 32-bit float. */
    get floatValue()
    {
        return this._bits.getFloat32(0, true);
    }

    /** @param {number} value Stored as a 32-bit float. */
    set floatValue(value)
    {
        this._bits.setFloat32(0, value, true);
    }

    /** @returns {number} The union read as a 32-bit signed integer. */
    get intValue()
    {
        return this._bits.getInt32(0, true);
    }

    /** @param {number} value Stored as a 32-bit signed integer. */
    set intValue(value)
    {
        this._bits.setInt32(0, value, true);
    }

    /** @returns {number} The union's four bytes as an unsigned integer, as the container stores them. */
    GetBits()
    {
        return this._bits.getUint32(0, true);
    }

    // Source: trinity/shadercompiler/EffectData.h:35-41

    /**
     * Carbon's `AnnotationType`.
     */
    static AnnotationType = Object.freeze({
        ANNOTATION_TYPE_BOOL: 0,
        ANNOTATION_TYPE_INT: 1,
        ANNOTATION_TYPE_FLOAT: 2,
        ANNOTATION_TYPE_STRING: 3
    });
}
