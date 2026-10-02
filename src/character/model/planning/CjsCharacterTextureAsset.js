import { meta } from "#schema";

/** Resolved texture asset with independent decoded placement and semantic role. */
@meta.define({ className: "CjsCharacterTextureAsset", family: "character" })
export class CjsCharacterTextureAsset
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    uri = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    role = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    region = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    quality = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec2
    imageSize = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec2
    atlasSize = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    atlasRect = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
