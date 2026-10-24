import { CjsPaperDollEyeItem } from "./CjsPaperDollEyeItem.js";
import { CjsPaperDollEyeItemOneColor } from "./CjsPaperDollEyeItemOneColor.js";
import { CjsPaperDollEyeItemTwoColors } from "./CjsPaperDollEyeItemTwoColors.js";
import { CjsPaperDollEyeItemThreeColors } from "./CjsPaperDollEyeItemThreeColors.js";

/**
 * The currently qualified exposed shapes. Reject new layouts until their
 * semantics are qualified; never silently offer controls for absent areas.
 */
export const eyeItemClasses = new Map([
    ["", CjsPaperDollEyeItem], ["1", CjsPaperDollEyeItemOneColor],
    ["1,2", CjsPaperDollEyeItemTwoColors], ["1,2,3", CjsPaperDollEyeItemThreeColors]
]);
