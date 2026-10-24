import { meta, type } from "#schema";
import { CjsPaperDollEyeItem } from "./CjsPaperDollEyeItem.js";

/** One-area eye item configuration; colour identity follows the source zones. */
@meta.define("CjsPaperDollEyeItemOneColor")
export class CjsPaperDollEyeItemOneColor extends CjsPaperDollEyeItem
{
    @meta.property()
    @type.string
    @meta.ui.description("Eye palette")
    get palette() { return this._owner ? this._owner.palette : this._palette; }
    set palette(value) { if (typeof value !== "string") throw new TypeError("palette requires a string"); if (this._owner) this._owner.palette = value; else this._palette = value; }

    @meta.property()
    @type.boolean
    @meta.ui.description("Eye custom colours")
    get customColors() { return this._owner ? this._owner.customColors : this._customColors; }
    set customColors(value) { if (typeof value !== "boolean") throw new TypeError("customColors requires a boolean"); if (this._owner) this._owner.customColors = value; else this._customColors = value; }

    @meta.property()
    @type.color
    @meta.ui.description("Iris outer (ciliary zone)")
    get color1() { return this._GetColor(0); }
    set color1(value) { this._SetColor(0, value); }
}
