import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

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
    static layer = PaperDollLayer.EYELINER;
    static passes = PaperDollPass.HEAD;
    static category = "makeup/eyeliner";

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([ "", "1", "2", "3", "1,2", "1,3", "2,3", "1,2,3" ].map(key => [ key, CjsPaperDollItem ]));
    _weight = 1;
    _defaultWeight = 1;

    @meta.property()
    @type.boolean
    @meta.ui.description("Eyeliner")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Style")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.float32
    @meta.ui.description("Opacity")
    get weight() { return this._weight; }
    set weight(value)
    {
        if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError("Opacity must be between zero and one");
        value = Math.fround(value);
        if (value !== this._weight) { this._weight = value; this.Rebuild(); }
    }

    @meta.property()
    @type.string
    @meta.ui.description("Palette")
    get palette() { return super.palette; }
    set palette(value) { super.palette = value; }

    @meta.property()
    @type.boolean
    @meta.ui.description("Custom colours")
    get customColors() { return super.customColors; }
    set customColors(value) { super.customColors = value; }

    @meta.property()
    @type.color
    @meta.ui.description("Colour")
    get color1() { return this.GetColors()[0]; }
    set color1(value) { this.SetColor(0, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Secondary colour")
    get color2() { return this.GetColors()[1]; }
    set color2(value) { this.SetColor(1, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Third colour")
    get color3() { return this.GetColors()[2]; }
    set color3(value) { this.SetColor(2, value); }

    /** Installs prepared options and the reset opacity. */
    Configure(options, palettes, { option = "", weight = 1 } = {})
    {
        if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new RangeError("Invalid default opacity");
        super.Configure(options, palettes, { option });
        this._defaultWeight = Math.fround(weight);
        this.weight = weight;
    }

    /** The captured selection plus its opacity, zero while no style is selected. */
    Capture(pass)
    {
        const state = super.Capture(pass);
        state.weight = state.option ? this.weight : 0;
        return state;
    }

    /** The palette, the custom switch and the colour slots the selected style's zone map uses. */
    GetControls()
    {
        const areas = this.GetColorAreas();
        if (!areas.length) return [];

        const order = [ "palette", "customColors", "color1", "color2", "color3" ];
        return CjsSchema.getSchema(this.constructor).properties
            .filter(property => order.includes(property.key))
            .filter(property => !/^color\d$/.test(property.key) || areas.includes(Number(property.key.slice(5))))
            .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    }

    /** Restores the default style, palette and opacity. */
    Reset() { super.Reset(); this.weight = this._defaultWeight; }
}
