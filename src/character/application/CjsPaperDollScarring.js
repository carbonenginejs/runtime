import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/** Application-owned scarring settings (the creator's Complexion "Scarring": relief and shine only); edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollScarring")
export class CjsPaperDollScarring extends CjsPaperDollComponent
{

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Scarring")
    enabled = true;

    @meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Level")
    option = "";

    static layer = PaperDollLayer.SCARRING;

    static passes = PaperDollPass.SURFACE;

    static category = "makeup/scarring";

}
