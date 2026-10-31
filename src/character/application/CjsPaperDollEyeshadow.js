import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned eye shadow settings: the style, two independent swatch
 * picks, custom colours and opacity. A colourised head layer; edits invalidate
 * the doll's head pass.
 *
 * As in the game's creator, Colour and Secondary colour are separate picks:
 * `palette` is an A swatch (`<name>_a.color`), which supplies colour area 1,
 * and `secondaryPalette` a BC swatch (`<name>_bc.color`), which supplies areas
 * 2 and 3. The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected style's zone map uses them.
 */
@meta.define("CjsPaperDollEyeshadow")
export class CjsPaperDollEyeshadow extends CjsPaperDollComponent
{

    _defaultWeight = 1;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Eye shadow")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.float32
    @meta.ui.description("Opacity")
    weight = 1;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Colour")
    palette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Secondary colour")
    secondaryPalette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Custom colours")
    customColors = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Custom colour")
    color1 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Custom secondary colour")
    color2 = Float32Array.of(.5, .5, .5, 1);

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.color
    @meta.ui.description("Custom third colour")
    color3 = Float32Array.of(.5, .5, .5, 1);

    /** The selected style's secondary swatches. */
    GetSecondaryPalettes()
    {
        return [...(this._options.get(this.option)?.secondaryPalettes ?? [])];
    }

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

    /** Restores the default style, swatches and opacity. */
    Reset()
    {
        this.secondaryPalette = "";
        super.Reset();
        this.weight = this._defaultWeight;
    }

    static layer = PaperDollLayer.EYESHADOW;

    static passes = PaperDollPass.HEAD;

    static category = "makeup/eyeshadow";

}
