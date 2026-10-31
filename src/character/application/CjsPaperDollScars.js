import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";

/** Application-owned large scar settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollScars")
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

    static passes = PaperDollPass.HEAD | PaperDollPass.SURFACE;

    static category = "scars";

}
