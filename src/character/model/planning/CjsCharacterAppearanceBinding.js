import { exposure as be } from "#be";
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

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    consumerID = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sampler = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.unknown
    source = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    sampleBounds = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterBindingAlpha")
    alpha = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
