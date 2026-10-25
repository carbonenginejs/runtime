import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/** Application-owned large scar settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollScars")
export class CjsPaperDollScars extends CjsPaperDollComponent
{
    static layer = PaperDollLayer.SCARS;
    static passes = PaperDollPass.HEAD | PaperDollPass.SURFACE;
    static category = "scars";

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem]]);

    /** Whether this retained selection contributes to composition. */
    @meta.property()
    @type.boolean
    @meta.ui.description("Scars")
    get enabled() { return super.enabled; }
    /** Enable or disable without discarding the selected option. */
    set enabled(value) { super.enabled = value; }

    /** Selected prepared scar option identifier. */
    @meta.property()
    @type.string
    @meta.ui.description("Scar")
    get option() { return super.option; }
    /** Select a configured option and invalidate dependent outputs. */
    set option(value) { super.option = value; }

    /** Item capabilities for the selected non-colourable scar. */
    @meta.property()
    @type.object.embed("CjsPaperDollItem")
    get item() { return this._item; }
}
