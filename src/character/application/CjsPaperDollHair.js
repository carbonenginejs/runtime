import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/**
 * Application-owned hair settings: the style, two independent swatch picks and
 * custom colours. A style has a colourised layer baked into the head (the hair
 * painted on the scalp) with its normal and specular in the surface pass, and
 * its own mesh, which the host draws with the hair's composed maps.
 *
 * As for eye shadow, `palette` is an A swatch (`hair/colors/<name>_a.color`),
 * which supplies colour area 1, and `secondaryPalette` a BC swatch
 * (`<name>_bc.color`), which supplies areas 2 and 3. The colour slots are this
 * component's own properties, offered by `GetControls` only as the selected
 * style's zone map uses them.
 */
@meta.define("CjsPaperDollHair")
export class CjsPaperDollHair extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Hair")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

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

    /** Restores the default style and swatches. */
    Reset()
    {
        this.secondaryPalette = "";
        super.Reset();
    }

    static layer = PaperDollLayer.HAIR;

    static passes = PaperDollPass.HEAD | PaperDollPass.SURFACE;

    static category = "hair";

}
