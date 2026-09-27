import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Resolved texture asset with independent decoded placement and semantic role. */
@type.define({ className: "CjsCharacterTextureAsset", family: "character" })
export class CjsCharacterTextureAsset extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.path
    uri = "";

    @edit.readwrite
    @edit.persist
    @type.string
    role = "";

    @edit.readwrite
    @edit.persist
    @type.string
    region = "";

    @edit.readwrite
    @edit.persist
    @type.string
    quality = null;

    @edit.readwrite
    @edit.persist
    @type.vec2
    imageSize = null;

    @edit.readwrite
    @edit.persist
    @type.vec2
    atlasSize = null;

    @edit.readwrite
    @edit.persist
    @type.vec4
    atlasRect = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
