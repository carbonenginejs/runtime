import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Resolved texture asset with independent decoded placement and semantic role. */
@meta.define("CjsCharacterTextureAsset")
export class CjsCharacterTextureAsset
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    uri = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    role = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    region = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    quality = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec2
    imageSize = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec2
    atlasSize = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    atlasRect = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
