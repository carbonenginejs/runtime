// Source: trinity/shadercompiler/EffectCompilerMetal.cpp:54-58
//
// Carbon declares this struct in EffectCompilerMetal.cpp's anonymous
// namespace; it is not exported from the folder's index. Its
// `operator<<( CodeStream&, const AtomicFn& )` is `WriteAtomicFn` in
// EffectCompilerMetal.js.

/**
 * One HLSL `Interlocked*` operation and the Metal `atomic_fetch_*_explicit`
 * it maps to: Carbon's `AtomicFn`. The Metal compiler prints a family of
 * `Interlocked<opHlsl>` overloads for each before the shader.
 */
export class AtomicFn
{
    /** Carbon's `m_opMsl`. */
    opMsl = null;

    /** Carbon's `m_opHlsl`. */
    opHlsl = null;

    /**
     * @param {string} [opMsl=""] Carbon's `m_opMsl`: the Metal operation, such as `add`.
     * @param {string} [opHlsl=""] Carbon's `m_opHlsl`: the HLSL operation, such as `Add`.
     */
    constructor(opMsl = "", opHlsl = "")
    {
        this.opMsl = opMsl;

        this.opHlsl = opHlsl;
    }
}
