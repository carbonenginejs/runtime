import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Resolved texture asset with independent decoded placement and semantic role. */
@meta.define("CjsCharacterTextureAsset")
export class CjsCharacterTextureAsset
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.path
    uri = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    role = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    region = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    quality = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.vec2
    imageSize = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.vec2
    atlasSize = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    atlasRect = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
