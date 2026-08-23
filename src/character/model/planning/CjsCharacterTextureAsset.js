import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Resolved texture asset with independent decoded placement and semantic role. */
@type.define({ className: "CjsCharacterTextureAsset", family: "character" })
export class CjsCharacterTextureAsset extends CjsModel
{

    @io.readwrite
    @type.path
    uri = "";

    @io.readwrite
    @type.string
    role = "";

    @io.readwrite
    @type.string
    region = "";

    @io.readwrite
    @type.string
    quality = null;

    @io.readwrite
    @type.vec2
    imageSize = null;

    @io.readwrite
    @type.vec2
    atlasSize = null;

    @io.readwrite
    @type.vec4
    atlasRect = null;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterTextureAsset;
