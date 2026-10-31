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

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    consumerID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sampler = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.unknown
    source = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    sampleBounds = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterBindingAlpha")
    alpha = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceBinding;
