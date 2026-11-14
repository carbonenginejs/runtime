import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned upper earring (`accessories/earshigh`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollEarsHigh")
@meta.exposureChainTo(CjsPaperDollAccessory)
export class CjsPaperDollEarsHigh extends CjsPaperDollAccessory
{

}
