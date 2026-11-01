import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned lipstick settings: the style, its palette and custom
 * colours. A palette also selects the style's specular colours and gloss,
 * which the doll's surface pass applies; custom colours replace only the
 * diffuse colours. Edits invalidate both the head and surface passes.
 *
 * The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected style's zone map uses them. In build
 * 3646012 lipstick_01 to _03 use colour area 1, and _04 and _05 use areas 1 and 2.
 */
@meta.define("CjsPaperDollLipstick")
export class CjsPaperDollLipstick extends CjsPaperDollComponent
{

    /** The applied palette's three specular colours (W is the gloss); empty until a palette is applied. */
    _specularColors = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Lipstick")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Lipstick colour")
    palette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Lipstick custom colours")
    customColors = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Colour")
    color1 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Secondary colour")
    color2 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Third colour")
    color3 = Float32Array.of(.5, .5, .5, 1);

    /**
     * The head pass reads the diffuse colours. The surface pass reads only the
     * style, the palette and that palette's specular colours (their W is the
     * gloss), so a custom colour edit does not rebuild the specular.
     */
    Capture(pass)
    {
        const state = super.Capture(pass);
        if (pass !== PaperDollPass.SURFACE) return state;
        const palette = state.option ? this.palette : "";
        return {
            option: state.option,
            palette,
            colorAreas: [],
            colors: [],
            specularColors: palette ? this._specularColors.map(color => Float32Array.from(color)) : []
        };
    }

    /**
     * Takes the applied palette's specular colours, which the UI fetches with the palette; the surface pass
     * draws them. An empty list leaves the surface undrawn.
     * @param {ArrayLike<number>[]} colors The palette's three specular colours, or an empty list.
     * @returns {void}
     */
    SetSpecularColors(colors)
    {
        this._specularColors = colors.map(color => Float32Array.from(color));
        this.Rebuild();
    }

    /** Restores the configured inputs and forgets the applied palette's specular colours. */
    Reset()
    {
        this._specularColors = [];
        super.Reset();
    }

    static layer = PaperDollLayer.LIPSTICK;

    static passes = PaperDollPass.HEAD | PaperDollPass.SURFACE;

    static category = "makeup/lipstick";

    static paletteSpecular = true;

}
