import { edit, type } from "#schema";

/** Reference to one logical channel of a resolved character texture. */
@type.define({ className: "CjsCharacterTextureChannel", family: "character" })
export class CjsCharacterTextureChannel
{

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterTextureAsset")
    texture = null;

    @edit.readwrite
    @edit.persist
    @type.string
    channel = "a";

}

export default CjsCharacterTextureChannel;
