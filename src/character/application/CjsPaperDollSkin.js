import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";
import { CjsPaperDollSkinItem } from "./CjsPaperDollSkinItem.js";

/** Shared head/body skin palette, independent of foundation shape strength. */
@meta.define("CjsPaperDollSkin")
export class CjsPaperDollSkin extends CjsPaperDollComponent
{
    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem], ...["1", "2", "3", "1,2", "1,3", "2,3", "1,2,3"].map(key => [key, CjsPaperDollSkinItem])]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Skin colour")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.object.embed("CjsPaperDollItem")
    get item() { return this._item; }
}
