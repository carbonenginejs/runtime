import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned lip piercing (`accessories/lips`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollLips")
export class CjsPaperDollLips extends CjsPaperDollAccessory
{
    static category = "accessories/lips";
}
