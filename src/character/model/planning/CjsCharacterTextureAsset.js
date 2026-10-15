import { meta, type, blue } from "#schema";

/** Resolved texture asset with independent decoded placement and semantic role. */
@meta.define("CjsCharacterTextureAsset")
export class CjsCharacterTextureAsset
{

    @blue.readwrite
    @blue.persist
    @type.path
    uri = "";

    @blue.readwrite
    @blue.persist
    @type.string
    role = "";

    @blue.readwrite
    @blue.persist
    @type.string
    region = "";

    @blue.readwrite
    @blue.persist
    @type.string
    quality = null;

    @blue.readwrite
    @blue.persist
    @type.vec2
    imageSize = null;

    @blue.readwrite
    @blue.persist
    @type.vec2
    atlasSize = null;

    @blue.readwrite
    @blue.persist
    @type.vec4
    atlasRect = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
