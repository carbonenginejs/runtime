import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/** Application-owned scarring settings (the creator's Complexion "Scarring": relief and shine only); edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollScarring")
export class CjsPaperDollScarring extends CjsPaperDollComponent
{
    static layer = PaperDollLayer.SCARRING;
    static passes = PaperDollPass.SURFACE;

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem]]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Scarring")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Level")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.object.embed("CjsPaperDollItem")
    get item() { return this._item; }
}
