import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned top (`topmiddle`: shirts, tank tops, t-shirts) settings: the garment, its palette, custom
 * colours and tucking. The garment has no geometry; it bakes onto the body as underwear
 * does: its colourised diffuse into the body pass, and its normal (replacing
 * the normals under it inside its coverage) and specular into the surface pass.
 *
 * The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected garment's zone map uses them.
 *
 * Tucking is the creator's per-item stepper: an index into the garment's
 * tuck states (for a top, the versions of the drape dependant it lists), 0
 * being the dependant as authored. The host knows each garment's states.
 */
@meta.define("CjsPaperDollTopMiddle")
export class CjsPaperDollTopMiddle extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Top")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Palette")
    palette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Custom colours")
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

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.int32
    @meta.ui.description("Tucking")
    tuck = 0;

    /**
     * The selected garment and its colours, plus its tuck state (0 while nothing is selected).
     * @param {PaperDollPass} pass The pass being captured.
     * @returns {{option: string, colorAreas: number[], colors: Float32Array[], tuck: number}}
     */
    Capture(pass)
    {
        const state = super.Capture(pass);
        state.tuck = state.option ? this.tuck : 0;
        return state;
    }

    /** Restores the authored garment, palette and the untucked state. */
    Reset()
    {
        super.Reset();
        this.tuck = 0;
    }

    static layer = PaperDollLayer.TOPMIDDLE;

    static passes = PaperDollPass.BODY | PaperDollPass.SURFACE;

    static category = "topmiddle";

    static optionNamesPalette = true;

}
