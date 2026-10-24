import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { CjsPaperDollEyeItem } from "./CjsPaperDollEyeItem.js";
import { eyeItemClasses } from "./eyeItemClasses.js";

/** Application-owned eye settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollEyes")
export class CjsPaperDollEyes extends CjsPaperDollComponent
{
    _item = new CjsPaperDollEyeItem(this);
    _itemClasses = eyeItemClasses;

    @meta.property()
    @type.boolean
    @meta.ui.description("Eye modifier")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Eye option")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.object.embed("CjsPaperDollEyeItem")
    get item() { return this._item; }
}
