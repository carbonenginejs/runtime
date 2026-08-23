import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Final consumer/sampler binding to a resolved texture or composition target. */
@type.define({ className: "CjsCharacterAppearanceBinding", family: "character" })
export class CjsCharacterAppearanceBinding extends CjsModel
{

    @io.readwrite
    @type.string
    consumerID = "";

    @io.readwrite
    @type.string
    sampler = "";

    @io.readwrite
    @type.unknown
    source = null;

    @io.readwrite
    @type.vec4
    sampleBounds = null;

    @io.readwrite
    @type.model("CjsCharacterBindingAlpha")
    alpha = null;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
