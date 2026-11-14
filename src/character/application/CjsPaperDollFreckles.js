import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollBlend, PaperDollLayer, PaperDollTarget } from "./paperDollOrder.js";

/** Application-owned freckle settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollFreckles")
@meta.exposureChainTo(CjsPaperDollComponent)
export class CjsPaperDollFreckles extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Freckles")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Level")
    option = "";

    static layer = PaperDollLayer.FRECKLES;

    static targets = PaperDollTarget.HEAD | PaperDollTarget.BODY;

    static blend = PaperDollBlend.DECAL;

}
