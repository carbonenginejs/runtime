import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned chin piercing (`accessories/chin`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollChin")
@meta.exposureChainTo(CjsPaperDollAccessory)
export class CjsPaperDollChin extends CjsPaperDollAccessory
{

}
