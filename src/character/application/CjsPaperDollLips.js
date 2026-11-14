import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned lip piercing (`accessories/lips`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollLips")
@meta.exposureChainTo(CjsPaperDollAccessory)
export class CjsPaperDollLips extends CjsPaperDollAccessory
{

}
