import { meta, type } from "#schema";

/** Resolved texture asset with independent decoded placement and semantic role. */
@meta.define("CjsCharacterTextureAsset")
export class CjsCharacterTextureAsset
{

    @meta.readwrite
    @meta.persist
    @type.path
    uri = "";

    @meta.readwrite
    @meta.persist
    @type.string
    role = "";

    @meta.readwrite
    @meta.persist
    @type.string
    region = "";

    @meta.readwrite
    @meta.persist
    @type.string
    quality = null;

    @meta.readwrite
    @meta.persist
    @type.vec2
    imageSize = null;

    @meta.readwrite
    @meta.persist
    @type.vec2
    atlasSize = null;

    @meta.readwrite
    @meta.persist
    @type.vec4
    atlasRect = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
