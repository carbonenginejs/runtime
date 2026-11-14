import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollBlend, PaperDollLayer, PaperDollTarget } from "./paperDollOrder.js";

/** Application-owned scarring settings (the creator's Complexion "Scarring": relief and shine only); edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollScarring")
@meta.exposureChainTo(CjsPaperDollComponent)
export class CjsPaperDollScarring extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Scarring")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Level")
    option = "";

    static layer = PaperDollLayer.SCARRING;

    static targets = PaperDollTarget.SURFACE;

    static blend = PaperDollBlend.DECAL;

}
