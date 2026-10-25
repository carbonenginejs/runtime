import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollLayer, PaperDollPass } from "./paperDollOrder.js";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";

/**
 * Application-owned face augmentation settings: one authored type, which
 * selects an augmentation and its variation. Augmentations paint onto the
 * skin (head, and a body patch for some) and replace or add normals and
 * specular, so they feed the head, body and surface passes.
 */
@meta.define("CjsPaperDollAugmentations")
export class CjsPaperDollAugmentations extends CjsPaperDollComponent
{
    static layer = PaperDollLayer.AUGMENTATIONS;
    static passes = PaperDollPass.HEAD | PaperDollPass.BODY | PaperDollPass.SURFACE;
    static category = "makeup/augmentations";

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem]]);

    @meta.property()
    @type.boolean
    @meta.ui.description("Augmentations")
    get enabled() { return super.enabled; }
    set enabled(value) { super.enabled = value; }

    @meta.property()
    @type.string
    @meta.ui.description("Style")
    get option() { return super.option; }
    set option(value) { super.option = value; }

    @meta.property()
    @type.object.embed("CjsPaperDollItem")
    get item() { return this._item; }
}
