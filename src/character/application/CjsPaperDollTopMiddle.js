import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

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
    static layer = PaperDollLayer.TOPMIDDLE;
    static passes = PaperDollPass.BODY | PaperDollPass.SURFACE;
    static category = "topmiddle";
    static optionNamesPalette = true;

    _item = new CjsPaperDollItem(this);
    _tuck = 0;
    _itemClasses = new Map([ "", "1", "2", "3", "1,2", "1,3", "2,3", "1,2,3" ].map(key => [ key, CjsPaperDollItem ]));

    @meta.property()
    @type.boolean
    @meta.ui.description("Top")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Style")
    get option() { return super.option; }
    set option(value) { super.option = value; }

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

    @meta.property()
    @type.int32
    @meta.ui.description("Tucking")
    get tuck() { return this._tuck; }
    set tuck(value)
    {
        if (!Number.isInteger(value) || value < 0) throw new RangeError("Tucking must be a tuck state index");
        if (value !== this._tuck) { this._tuck = value; this.Rebuild(); }
    }

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
    Reset() { super.Reset(); this.tuck = 0; }

    /** The palette, the custom switch and the colour slots the selected garment's zone map uses. */
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
}
