import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned lower earring (`accessories/earslow`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollEarsLow")
@meta.exposureChainTo(CjsPaperDollAccessory)
export class CjsPaperDollEarsLow extends CjsPaperDollAccessory
{

}
