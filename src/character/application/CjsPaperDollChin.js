import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned chin piercing (`accessories/chin`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollChin")
export class CjsPaperDollChin extends CjsPaperDollAccessory
{

    static category = "accessories/chin";

}
