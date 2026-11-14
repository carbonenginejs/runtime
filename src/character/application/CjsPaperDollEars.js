import { meta } from "#schema";
import { CjsPaperDollAccessory } from "./CjsPaperDollAccessory.js";

/**
 * Application-owned ears accessory (`accessories/ears`); see `CjsPaperDollAccessory`.
 *
 * Ours: the game has no ears location. It holds our own accessories, such as
 * cat ears, served from a tools-core overlay (non-carbon-extensions.md
 * § *Custom paperdoll accessory locations*).
 */
@meta.define("CjsPaperDollEars")
@meta.exposureChainTo(CjsPaperDollAccessory)
export class CjsPaperDollEars extends CjsPaperDollAccessory
{

}
