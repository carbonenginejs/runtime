import { meta, type } from "#schema";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/** Qualified one-area blush item configuration. */
@meta.define("CjsPaperDollBlushItem")
export class CjsPaperDollBlushItem extends CjsPaperDollItem
{
    @meta.property()
    @type.string
    @meta.ui.description("Blush palette")
    get palette() { return this._owner ? this._owner.palette : this._palette; }
    set palette(value) { if (typeof value !== "string") throw new TypeError("palette requires a string"); if (this._owner) this._owner.palette = value; else this._palette = value; }

    @meta.property()
    @type.boolean
    @meta.ui.description("Blush custom colours")
    get customColors() { return this._owner ? this._owner.customColors : this._customColors; }
    set customColors(value) { if (typeof value !== "boolean") throw new TypeError("customColors requires a boolean"); if (this._owner) this._owner.customColors = value; else this._customColors = value; }

    @meta.property()
    @type.color
    @meta.ui.description("Blush colour")
    get color1() { return this._GetColor(0); }
    set color1(value) { this._SetColor(0, value); }
}
