import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/** Application-owned nose piercing (`accessories/nose`); see `CjsPaperDollAccessory`. */
@meta.define("CjsPaperDollNose")
export class CjsPaperDollNose extends CjsPaperDollAccessory
{
    static category = "accessories/nose";
}
