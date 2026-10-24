import { meta, type } from "#schema";
import { CjsPaperDollEyeItemOneColor } from "./CjsPaperDollEyeItemOneColor.js";

/** Two-area configuration extends the actual one-area shape. */
@meta.define("CjsPaperDollEyeItemTwoColors")
export class CjsPaperDollEyeItemTwoColors extends CjsPaperDollEyeItemOneColor
{
    @meta.property()
    @type.color
    @meta.ui.description("Sclera")
    get color2() { return this._GetColor(1); }
    set color2(value) { this._SetColor(1, value); }
}
