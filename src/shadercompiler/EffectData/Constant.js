import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:280-310

/**
 * One constant of a stage's constant buffer: Carbon's `Constant`.
 *
 * `name` is the text Carbon keeps as a `StringReference` into its string
 * table; the container writer interns it. `offset` and `size` are bytes,
 * `type` a `ConstantType`, `dimension` the component count of one element.
 */
export class Constant
{
    name = "";

    offset = 0;

    size = 0;

    type = 0;

    dimension = 0;

    elements = 0;

    isSRGB = false;

    isAutoregister = false;

    /**
     * Carbon's `operator==`.
     *
     * @param {Constant} other The constant to compare with.
     * @returns {boolean} Whether every field matches.
     */
    Equals(other)
    {
        return this.name === other.name && this.offset === other.offset && this.size === other.size && this.type === other.type &&
            this.dimension === other.dimension && this.elements === other.elements && this.isSRGB === other.isSRGB &&
            this.isAutoregister === other.isAutoregister;
    }

    /**
     * Carbon's `ToString( ConstantType )`.
     *
     * @param {number} constType A `ConstantType` value.
     * @returns {string} Its name.
     */
    static toString__ConstantType(constType)
    {
        switch (constType)
        {
            case Constant.ConstantType.CONSTANT_TYPE_FLOAT: return "float";
            case Constant.ConstantType.CONSTANT_TYPE_INT: return "int";
            case Constant.ConstantType.CONSTANT_TYPE_UINT: return "uint";
            case Constant.ConstantType.CONSTANT_TYPE_BOOL: return "bool";
            default: return "other (struct, etc.)";
        }
    }

    // Source: trinity/shadercompiler/EffectData.h:24-31
    // Source: trinity/shadercompiler/EffectData.cpp:23-37

    /**
     * Carbon's `ConstantType`. Carbon notes these values must match the
     * corresponding Trinity enum.
     */
    static ConstantType = Object.freeze({
        CONSTANT_TYPE_FLOAT: 0,
        CONSTANT_TYPE_INT: 1,
        CONSTANT_TYPE_UINT: 2,
        CONSTANT_TYPE_BOOL: 3,
        CONSTANT_TYPE_OTHER: 4
    });
}

CjsSchema.decorateMethod(Constant, "Equals", meta.renamed("operator=="));
CjsSchema.meta.carbon("Constant")(Constant);
