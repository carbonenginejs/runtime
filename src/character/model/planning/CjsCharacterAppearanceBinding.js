import { meta, type, blue } from "#schema";

/**
 * Final consumer/sampler binding to a resolved texture or composition target.
 *
 * `consumerID` is opaque; the binding never carries a shader path or live
 * effect object.
 */
@meta.define("CjsCharacterAppearanceBinding")
export class CjsCharacterAppearanceBinding
{

    @blue.readwrite
    @blue.persist
    @type.string
    consumerID = "";

    @blue.readwrite
    @blue.persist
    @type.string
    sampler = "";

    @blue.readwrite
    @blue.persist
    @type.unknown
    source = null;

    @blue.readwrite
    @blue.persist
    @type.vec4
    sampleBounds = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterBindingAlpha")
    alpha = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
