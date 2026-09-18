import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Resolved texture asset with independent decoded placement and semantic role. */
@type.define({ className: "CjsCharacterTextureAsset", family: "character" })
export class CjsCharacterTextureAsset extends CjsModel
{

    @edit.readwrite
    @type.path
    uri = "";

    @edit.readwrite
    @type.string
    role = "";

    @edit.readwrite
    @type.string
    region = "";

    @edit.readwrite
    @type.string
    quality = null;

    @edit.readwrite
    @type.vec2
    imageSize = null;

    @edit.readwrite
    @type.vec2
    atlasSize = null;

    @edit.readwrite
    @type.vec4
    atlasRect = null;

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
