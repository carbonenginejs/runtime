import { meta, type } from "#schema";
import { CjsPaperDollComponent } from "./CjsPaperDollComponent.js";
import { PaperDollBlend, PaperDollLayer, PaperDollTarget } from "./paperDollOrder.js";

/**
 * Application-owned face augmentation settings: one authored type, which
 * selects an augmentation and its variation. Augmentations paint onto the
 * skin (head, and a body patch for some) and replace or add normals and
 * specular, so they feed the head, body and surface passes.
 */
@meta.define("CjsPaperDollAugmentations")
@meta.exposureChainTo(CjsPaperDollComponent)
export class CjsPaperDollAugmentations extends CjsPaperDollComponent
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.boolean
    @meta.ui.description("Augmentations")
    enabled = true;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Style")
    option = "";

    static layer = PaperDollLayer.AUGMENTATIONS;

    static targets = PaperDollTarget.HEAD | PaperDollTarget.BODY | PaperDollTarget.SURFACE;

    static blend = PaperDollBlend.DECAL;

}
