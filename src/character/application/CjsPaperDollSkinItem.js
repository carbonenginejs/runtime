import { meta, type } from "#schema";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/** Authored skin palette selection; shader area labels remain unqualified. */
@meta.define("CjsPaperDollSkinItem")
export class CjsPaperDollSkinItem extends CjsPaperDollItem
{
    @meta.property()
    @type.string
    @meta.ui.description("Skin tone")
    get palette() { return this._owner ? this._owner.palette : this._palette; }
    set palette(value) { if (typeof value !== "string") throw new TypeError("palette requires a string"); if (this._owner) this._owner.palette = value; else this._palette = value; }
}
