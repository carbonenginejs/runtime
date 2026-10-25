import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

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
    static layer = PaperDollLayer.EYESHADOW;
    static passes = PaperDollPass.HEAD;
    static category = "makeup/eyeshadow";

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([ "", "1", "2", "3", "1,2", "1,3", "2,3", "1,2,3" ].map(key => [ key, CjsPaperDollItem ]));
    _weight = 1;
    _defaultWeight = 1;
    _secondary = "";

    @meta.property()
    @type.boolean
    @meta.ui.description("Eye shadow")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Style")
    get option() { return super.option; }
    set option(value)
    {
        super.option = value;
        // A style chosen before any secondary pick starts from its default secondary swatch.
        const fallback = this._options.get(this._option)?.defaultSecondaryPalette;
        if (!this._secondary && fallback) { this._secondary = fallback; this._ApplySecondary(); }
    }

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
    @meta.ui.description("Colour")
    get palette() { return super.palette; }
    set palette(value) { super.palette = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Secondary colour")
    get secondaryPalette() { return this._secondary; }
    set secondaryPalette(value)
    {
        if (value !== "" && !this._palettes.has(value)) throw new RangeError("Unknown secondary swatch");
        this._secondary = value;
        this._ApplySecondary();
        this._custom = false;
        this.Rebuild();
    }

    /** The selected style's secondary swatches. */
    GetSecondaryPalettes() { return [...(this._options.get(this._option)?.secondaryPalettes ?? [])]; }

    /** Sets the primary swatch's colours, then the secondary swatch's over areas 2 and 3. */
    _SetPreset(id)
    {
        super._SetPreset(id);
        this._ApplySecondary();
    }

    /** Copies the secondary swatch's colours into areas 2 and 3 of the preset. */
    _ApplySecondary()
    {
        if (!this._secondary) return;
        const colors = this._palettes.get(this._secondary);
        for (const index of [ 1, 2 ])
        {
            this._preset[index].set(colors[index]);
            if (!this._initialized) this._colors[index].set(this._preset[index]);
        }
    }

    @meta.property()
    @type.boolean
    @meta.ui.description("Custom colours")
    get customColors() { return super.customColors; }
    set customColors(value) { super.customColors = value; }

    @meta.property()
    @type.color
    @meta.ui.description("Custom colour")
    get color1() { return this.GetColors()[0]; }
    set color1(value) { this.SetColor(0, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Custom secondary colour")
    get color2() { return this.GetColors()[1]; }
    set color2(value) { this.SetColor(1, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Custom third colour")
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

    /** The two swatch picks, the custom switch and the colour slots the selected style's zone map uses. */
    GetControls()
    {
        const areas = this.GetColorAreas();
        if (!areas.length) return [];

        const order = [ "palette", "secondaryPalette", "customColors", "color1", "color2", "color3" ];
        return CjsSchema.getSchema(this.constructor).properties
            .filter(property => order.includes(property.key))
            .filter(property => !/^color\d$/.test(property.key) || areas.includes(Number(property.key.slice(5))))
            .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    }

    /** Restores the default style, swatches and opacity. */
    Reset() { this._secondary = ""; super.Reset(); this.weight = this._defaultWeight; }
}
