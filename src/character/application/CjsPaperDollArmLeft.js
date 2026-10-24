import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/**
 * Application-owned left arm augmentation settings: one authored type (a variation and
 * colour variant), its palette and custom colours. It bakes onto the body like
 * underwear: its diffuse into the body pass, and its normal (replacing the
 * normals under it inside its coverage) and specular into the surface pass.
 *
 * The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected garment's zone map uses them.
 */
@meta.define("CjsPaperDollArmLeft")
export class CjsPaperDollArmLeft extends CjsPaperDollComponent
{
    static layer = PaperDollLayer.ARMLEFT;
    static passes = PaperDollPass.BODY | PaperDollPass.SURFACE;

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([ "", "1", "2", "3", "1,2", "1,3", "2,3", "1,2,3" ].map(key => [ key, CjsPaperDollItem ]));

    @meta.property()
    @type.boolean
    @meta.ui.description("Left arm augmentation")
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
