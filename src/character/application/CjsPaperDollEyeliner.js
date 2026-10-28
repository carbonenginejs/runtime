import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned eyeliner settings: the style, its palette, custom
 * colours and opacity. A colourised head layer; edits invalidate the doll's
 * head pass.
 *
 * The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected style's zone map uses them.
 */
@meta.define("CjsPaperDollEyeliner")
export class CjsPaperDollEyeliner extends CjsPaperDollComponent
{

    _defaultWeight = 1;

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Eyeliner")
    enabled = true;

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.float32
    @meta.ui.description("Opacity")
    weight = 1;

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Palette")
    palette = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Custom colours")
    customColors = false;

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Colour")
    color1 = Float32Array.of(.5, .5, .5, 1);

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Secondary colour")
    color2 = Float32Array.of(.5, .5, .5, 1);

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Third colour")
    color3 = Float32Array.of(.5, .5, .5, 1);

    /** Installs prepared options and the reset opacity. */
    Configure(options, palettes, { option = "", weight = 1 } = {})
    {
        super.Configure(options, palettes, { option });
        this._defaultWeight = weight;
        this.weight = weight;
    }

    /** The captured selection plus its opacity, zero while no style is selected. */
    Capture(pass)
    {
        const state = super.Capture(pass);
        state.weight = state.option ? this.weight : 0;
        return state;
    }

    /** Restores the default style, palette and opacity. */
    Reset()
    {
        super.Reset();
        this.weight = this._defaultWeight;
    }

    static layer = PaperDollLayer.EYELINER;

    static passes = PaperDollPass.HEAD;

    static category = "makeup/eyeliner";

}
