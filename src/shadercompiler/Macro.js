// Source: trinity/shadercompiler/Macro.h
//
// Not ported: `FillDxMacros`, which fills D3D's own macro array for the DX
// compilers; no D3D compiler runs here.

/**
 * A preprocessor define given to a compile: Carbon's `Macro`.
 */
export class Macro
{
    /** @type {string} */
    name = null;

    /** @type {string} */
    value = null;

    /**
     * @param {string} [name=""] The macro's name.
     * @param {string} [value=""] Its value.
     */
    constructor(name = "", value = "")
    {
        this.name = name;

        this.value = value;
    }

    /**
     * Carbon's free `FindMacro`: the first macro of a name.
     *
     * @param {Macro[]} macros The macros.
     * @param {string} name The name.
     * @returns {Macro|null} The macro, or null.
     */
    static findMacro(macros, name)
    {
        for (const macro of macros)
        {
            if (macro.name === name)
            {
                return macro;
            }
        }
        return null;
    }
}
