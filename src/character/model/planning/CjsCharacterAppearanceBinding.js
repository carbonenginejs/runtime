import { edit, type } from "#schema";

/**
 * Final consumer/sampler binding to a resolved texture or composition target.
 *
 * `consumerID` is opaque; the binding never carries a shader path or live
 * effect object.
 */
@type.define({ className: "CjsCharacterAppearanceBinding", family: "character" })
export class CjsCharacterAppearanceBinding
{

    @edit.readwrite
    @edit.persist
    @type.string
    consumerID = "";

    @edit.readwrite
    @edit.persist
    @type.string
    sampler = "";

    @edit.readwrite
    @edit.persist
    @type.unknown
    source = null;

    @edit.readwrite
    @edit.persist
    @type.vec4
    sampleBounds = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterBindingAlpha")
    alpha = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
