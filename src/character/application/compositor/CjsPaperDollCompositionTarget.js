import { TriTextureRes } from "../../../trinity/resources/texture/TriTextureRes.js";

/**
 * A composition target and the texture resource its consumers bind, drawn through the compositor that made it.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper-doll compositor; the client's is Python. Moved from Graphene's
 * character composer (character-structure-and-plugins.md, R4); the name is the structure review's working name.
 */
export class CjsPaperDollCompositionTarget
{

    /**
     * Its width in pixels.
     * @type {number}
     */
    width = 0;

    /**
     * Its height in pixels.
     * @type {number}
     */
    height = 0;

    /**
     * The render target the draws fill.
     * @type {?object}
     */
    target = null;

    /**
     * The texture resource over the target, which materials bind.
     * @type {?TriTextureRes}
     */
    resource = null;

    /**
     * The compositor that owns the target and draws into it.
     * @type {?import("./CjsPaperDollCompositor.js").CjsPaperDollCompositor}
     */
    _compositor = null;

    /**
     * Creates the target through its compositor, which releases it.
     * @param {import("./CjsPaperDollCompositor.js").CjsPaperDollCompositor} compositor The compositor that owns it.
     * @param {number} width Its width.
     * @param {number} height Its height.
     * @param {boolean} [mips=false] Whether it has a full mip chain (`Finish` regenerates it after drawing).
     */
    constructor(compositor, width, height, mips = false)
    {
        this._compositor = compositor;
        this.width = width;
        this.height = height;
        this.target = compositor.MakeTarget(width, height, mips);
        this.resource = new TriTextureRes();
        this.resource.SetTextureFromRT(this.target);
    }

    /**
     * Draws one effect into a region of the target.
     * @param {object} effect The compositing effect.
     * @param {Float32Array} region The region, as (x, y, width, height) in 0..1.
     * @param {boolean} [clear=false] Whether to clear the whole target first.
     * @param {boolean} [writeRGBA=clear] Whether to write RGBA as is rather than blend.
     * @returns {void}
     */
    Draw(effect, region, clear = false, writeRGBA = clear)
    {
        this._compositor.Draw(this.target, this.width, this.height, effect, region, clear, writeRGBA);
    }

    /**
     * Regenerates the mip chain after the draws, for a mipped target.
     * @returns {void}
     */
    Finish()
    {
        this._compositor.Finish(this.target);
    }

    static className = "CjsPaperDollCompositionTarget";

}
