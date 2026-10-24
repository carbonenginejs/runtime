import { meta, type } from "#schema";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/** Qualified one-area eyebrow item configuration. */
@meta.define("CjsPaperDollEyebrowsItem")
export class CjsPaperDollEyebrowsItem extends CjsPaperDollItem
{
    @meta.property()
    @type.string
    @meta.ui.description("Eyebrow palette")
    get palette() { return this._owner ? this._owner.palette : this._palette; }
    set palette(value) { if (typeof value !== "string") throw new TypeError("palette requires a string"); if (this._owner) this._owner.palette = value; else this._palette = value; }

    @meta.property()
    @type.boolean
    @meta.ui.description("Eyebrow custom colours")
    get customColors() { return this._owner ? this._owner.customColors : this._customColors; }
    set customColors(value) { if (typeof value !== "boolean") throw new TypeError("customColors requires a boolean"); if (this._owner) this._owner.customColors = value; else this._customColors = value; }

    @meta.property()
    @type.color
    @meta.ui.description("Eyebrow colour")
    get color1() { return this._GetColor(0); }
    set color1(value) { this._SetColor(0, value); }
}
