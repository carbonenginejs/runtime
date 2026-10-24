import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/** Application-owned freckle settings; edits invalidate the doll's update pass. */
@meta.define("CjsPaperDollFreckles")
export class CjsPaperDollFreckles extends CjsPaperDollComponent
{
    static layer = PaperDollLayer.FRECKLES;
    static passes = PaperDollPass.HEAD | PaperDollPass.BODY;

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem]]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Freckles")
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
