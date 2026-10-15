import { meta, type } from "#schema";

/**
 * Final consumer/sampler binding to a resolved texture or composition target.
 *
 * `consumerID` is opaque; the binding never carries a shader path or live
 * effect object.
 */
@meta.define("CjsCharacterAppearanceBinding")
export class CjsCharacterAppearanceBinding
{

    @meta.readwrite
    @meta.persist
    @type.string
    consumerID = "";

    @meta.readwrite
    @meta.persist
    @type.string
    sampler = "";

    @meta.readwrite
    @meta.persist
    @type.unknown
    source = null;

    @meta.readwrite
    @meta.persist
    @type.vec4
    sampleBounds = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterBindingAlpha")
    alpha = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
