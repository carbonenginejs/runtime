/**
 * A worn item's layers in one region, by the effect resource each fills: its diffuse (colourised through its zone map
 * when it has one and a palette, else drawn as it is) and its normal and specular, each with the region it covers.
 *
 * Ours (no Carbon counterpart): moved from Graphene's character composer (character-structure-and-plugins.md, R4);
 * the name is the structure review's working name.
 */
export class CjsPaperDollMaterialLayer
{

    /**
     * Whether the diffuse is colourised, so a selection's colours apply.
     * @type {boolean}
     */
    colourised = false;

    /**
     * The diffuse effect and the region it covers.
     * @type {?{ effect: object, region: Float32Array }}
     */
    DiffuseMap = null;

    /**
     * The normal effect and its region, or null without a normal map.
     * @type {?{ effect: object, region: Float32Array }}
     */
    NormalMap = null;

    /**
     * The specular effect and its region, or null without a specular map.
     * @type {?{ effect: object, region: Float32Array }}
     */
    SpecularMap = null;

    /**
     * A patternblit diffuse for each patterned palette the item offers, by palette path.
     * @type {Map<string, object>}
     */
    patterns = new Map();

    /**
     * The diffuse effect for a captured selection: the selected palette's pattern effect when the palette is
     * patterned (its colours are the pattern's own), else the colourised or plain diffuse with the selection's colours.
     * @param {{ palette: string, colors: ArrayLike<number>[] }} value The captured selection.
     * @returns {object} The effect to draw.
     */
    DiffuseFor(value)
    {
        const patterned = this.patterns.get(value.palette);
        if (patterned) return patterned;
        this.SetColors(value.colors);
        return this.DiffuseMap.effect;
    }

    /**
     * Writes a selection's colours into a colourised diffuse; a plain diffuse keeps its own.
     * @param {ArrayLike<number>[]} colors The three RGBA colours.
     * @returns {void}
     */
    SetColors(colors)
    {
        if (this.colourised) CjsPaperDollMaterialLayer.setColors(this.DiffuseMap.effect, colors);
    }

    static className = "CjsPaperDollMaterialLayer";

    /**
     * Writes three colours into a colourise effect's `Color1` to `Color3`, one per colour area.
     * @param {object} effect The Tr2Effect.
     * @param {ArrayLike<number>[]} colors The three RGBA colours.
     * @returns {void}
     */
    static setColors(effect, colors)
    {
        for (let i = 0; i < 3; i++) effect.SetParameter__Vector4("Color" + (i + 1), colors[i]);
    }

}
