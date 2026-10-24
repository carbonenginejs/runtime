import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";
import { CjsPaperDollEyebrowsItem } from "./CjsPaperDollEyebrowsItem.js";

/** Application-owned eyebrow settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollEyebrows")
export class CjsPaperDollEyebrows extends CjsPaperDollComponent
{
    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem], ["1", CjsPaperDollEyebrowsItem]]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Eyebrow modifier")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Eyebrow option")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.object.embed("CjsPaperDollItem")
    get item() { return this._item; }
}
