import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned brow piercing (`accessories/brow`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollBrow")
export class CjsPaperDollBrow extends CjsPaperDollAccessory
{
    static category = "accessories/brow";
}
