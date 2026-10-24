import { meta, type } from "#schema";
import { CjsPaperDollEyeItemTwoColors } from "./CjsPaperDollEyeItemTwoColors.js";

/** Three-area configuration extends the actual two-area shape. */
@meta.define("CjsPaperDollEyeItemThreeColors")
export class CjsPaperDollEyeItemThreeColors extends CjsPaperDollEyeItemTwoColors
{
    @meta.property()
    @type.color
    @meta.ui.description("Eye colour 3")
    get color3() { return this._GetColor(2); }
    set color3(value) { this._SetColor(2, value); }
}
