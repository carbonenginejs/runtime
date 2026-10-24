// Source: trinity/shadercompiler/EffectData.h:787-809

/**
 * One technique of an effect: Carbon's `Technique`.
 */
export class Technique
{
    /** Stable name independent of minification; no registry is required. */
    static className = "Technique";

    name = "";

    /** @type {import("./Pass.js").Pass[]} */
    passes = [];

    /** @type {import("./Library.js").Library[]} */
    libraries = [];
}
