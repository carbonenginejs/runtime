import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned mask (`accessories/masks`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollMask")
export class CjsPaperDollMask extends CjsPaperDollAccessory
{

    static category = "accessories/masks";

}
