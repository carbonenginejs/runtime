import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned glasses (`accessories/glasses`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollGlasses")
export class CjsPaperDollGlasses extends CjsPaperDollAccessory
{

    static category = "accessories/glasses";

}
