import { meta } from "#schema";

/**
 * Final consumer/sampler binding to a resolved texture or composition target.
 *
 * `consumerID` is opaque; the binding never carries a shader path or live
 * effect object.
 */
@meta.define({ className: "CjsCharacterAppearanceBinding", family: "character" })
export class CjsCharacterAppearanceBinding
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    consumerID = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    sampler = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.unknown
    source = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    sampleBounds = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterBindingAlpha")
    alpha = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
