import { meta } from "#schema";

/** Reference to one logical channel of a resolved character texture. */
@meta.define({ className: "CjsCharacterTextureChannel", family: "character" })
export class CjsCharacterTextureChannel
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterTextureAsset")
    texture = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    channel = "a";

}

export default CjsCharacterTextureChannel;
