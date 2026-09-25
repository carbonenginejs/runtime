import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Final consumer/sampler binding to a resolved texture or composition target.
 *
 * `consumerID` is opaque; the binding never carries a shader path or live
 * effect object.
 */
@type.define({ className: "CjsCharacterAppearanceBinding", family: "character" })
export class CjsCharacterAppearanceBinding extends CjsModel
{

    @edit.readwrite
    @type.string
    consumerID = "";

    @edit.readwrite
    @type.string
    sampler = "";

    @edit.readwrite
    @type.unknown
    source = null;

    @edit.readwrite
    @type.vec4
    sampleBounds = null;

    @edit.readwrite
    @type.model("CjsCharacterBindingAlpha")
    alpha = null;

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
