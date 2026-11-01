import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/** Application-owned blush settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollBlush")
export class CjsPaperDollBlush extends CjsPaperDollComponent
{

    _defaultWeight = 1;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Blush")
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
    @meta.ui.description("Blush palette")
    palette = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Blush custom colours")
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

    /** Installs prepared options and the authored reset amount. */
    Configure(options, palettes, { option = "", weight = 1, resolve = null } = {})
    {
        super.Configure(options, palettes, { option, resolve });
        this._defaultWeight = weight;
        this.weight = weight;
    }

    /** The captured selection plus its amount, zero while no blush is selected. */
    Capture(pass)
    {
        const state = super.Capture(pass);
        state.weight = state.option ? this.weight : 0;
        return state;
    }

    /** Restores the authored option, palette and amount. */
    Reset()
    {
        super.Reset();
        this.weight = this._defaultWeight;
    }

    static layer = PaperDollLayer.BLUSH;

    static passes = PaperDollPass.HEAD;

    static category = "makeup/blush";

}
