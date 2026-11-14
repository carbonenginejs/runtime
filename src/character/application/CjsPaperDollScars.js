import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollBlend, PaperDollLayer, PaperDollTarget } from "./paperDollOrder.js";

/** Application-owned large scar settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollScars")
@meta.exposureChainTo(CjsPaperDollComponent)
export class CjsPaperDollScars extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Scars")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Scar")
    option = "";

    static layer = PaperDollLayer.SCARS;

    static targets = PaperDollTarget.HEAD | PaperDollTarget.SURFACE;

    static blend = PaperDollBlend.DECAL;

}
