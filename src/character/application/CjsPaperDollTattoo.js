import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/**
 * Application-owned head tattoo settings: the projected profile, its ink
 * palette and custom ink colours. Edits invalidate the doll's head pass.
 *
 * The colour slots are this component's own properties; there are no
 * per-shape item classes. `GetControls` offers the palette and only the
 * slots the selected profile's zone map uses. Every head tattoo in build
 * 3646012 is zoned to colour area 1, the one qualified shape; other shapes
 * are refused until their zones are qualified.
 */
@meta.define("CjsPaperDollTattoo")
export class CjsPaperDollTattoo extends CjsPaperDollComponent
{
    static layer = PaperDollLayer.TATTOO;
    static passes = PaperDollPass.HEAD;
    static shapeDependent = true;

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([ [ "", CjsPaperDollItem ], [ "1", CjsPaperDollItem ] ]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Tattoo")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Tattoo option")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Tattoo ink")
    get palette() { return super.palette; }
    set palette(value) { super.palette = value; }

    @meta.property()
    @type.boolean
    @meta.ui.description("Tattoo custom ink")
    get customColors() { return super.customColors; }
    set customColors(value) { super.customColors = value; }

    @meta.property()
    @type.color
    @meta.ui.description("Ink colour")
    get color1() { return this.GetColors()[0]; }
    set color1(value) { this.SetColor(0, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Ink colour")
    get color2() { return this.GetColors()[1]; }
    set color2(value) { this.SetColor(1, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Ink colour")
    get color3() { return this.GetColors()[2]; }
    set color3(value) { this.SetColor(2, value); }

    /** The palette, the custom switch and the colour slots the selected profile's zone map uses. */
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
