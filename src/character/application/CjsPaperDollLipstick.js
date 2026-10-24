import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/**
 * Application-owned lipstick settings: the style, its palette and custom
 * colours. A palette also selects the style's specular colours and gloss,
 * which the doll's surface pass applies; custom colours replace only the
 * diffuse colours. Edits invalidate both the head and surface passes.
 *
 * The colour slots are this component's own properties, offered by
 * `GetControls` only as the selected style's zone map uses them. Every
 * lipstick in build 3646012 is zoned to colour area 1.
 */
@meta.define("CjsPaperDollLipstick")
export class CjsPaperDollLipstick extends CjsPaperDollComponent
{
    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([ [ "", CjsPaperDollItem ], [ "1", CjsPaperDollItem ] ]);

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
    @meta.ui.description("Lip colour")
    get color2() { return this.GetColors()[1]; }
    set color2(value) { this.SetColor(1, value); }

    @meta.property()
    @type.color
    @meta.ui.description("Lip colour")
    get color3() { return this.GetColors()[2]; }
    set color3(value) { this.SetColor(2, value); }

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
