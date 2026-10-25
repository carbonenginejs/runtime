import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned upper earring (`accessories/earshigh`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollEarsHigh")
export class CjsPaperDollEarsHigh extends CjsPaperDollAccessory
{
    static category = "accessories/earshigh";
}
