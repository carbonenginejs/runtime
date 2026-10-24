import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

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
    static layer = PaperDollLayer.LIPSTICK;
    static passes = PaperDollPass.HEAD | PaperDollPass.SURFACE;

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([ [ "", CjsPaperDollItem ], [ "1", CjsPaperDollItem ], [ "1,2", CjsPaperDollItem ] ]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Lipstick")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Lipstick style")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Lipstick colour")
    get palette() { return super.palette; }
    set palette(value) { super.palette = value; }

    @meta.property()
    @type.boolean
    @meta.ui.description("Lipstick custom colours")
    get customColors() { return super.customColors; }
    set customColors(value) { super.customColors = value; }

    @meta.property()
    @type.color
    @meta.ui.description("Lip colour")
    get color1() { return this.GetColors()[0]; }
    set color1(value) { this.SetColor(0, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Lip second colour")
    get color2() { return this.GetColors()[1]; }
    set color2(value) { this.SetColor(1, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Lip third colour")
    get color3() { return this.GetColors()[2]; }
    set color3(value) { this.SetColor(2, value); }

    /**
     * The head pass reads the diffuse colours. The surface pass reads only the
     * style and the palette its specular colours and gloss come from, so a custom
     * colour edit does not rebuild the specular.
     */
    Capture(pass)
    {
        const state = super.Capture(pass);
        if (pass !== PaperDollPass.SURFACE) return state;
        return { option: state.option, palette: state.option ? this.palette : "", colorAreas: [], colors: [] };
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
}
