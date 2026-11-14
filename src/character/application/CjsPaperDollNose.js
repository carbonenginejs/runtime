import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned nose piercing (`accessories/nose`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollNose")
@meta.exposureChainTo(CjsPaperDollAccessory)
export class CjsPaperDollNose extends CjsPaperDollAccessory
{

}
