import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Reference to one logical channel of a resolved character texture. */
@type.define({ className: "CjsCharacterTextureChannel", family: "character" })
export class CjsCharacterTextureChannel extends CjsModel
{

    @io.readwrite
    @type.model("CjsCharacterTextureAsset")
    texture = null;

    @io.readwrite
    @type.string
    channel = "a";

}

export default CjsCharacterTextureChannel;
