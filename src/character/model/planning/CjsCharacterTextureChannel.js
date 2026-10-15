import { meta, type, blue } from "#schema";

/** Reference to one logical channel of a resolved character texture. */
@meta.define("CjsCharacterTextureChannel")
export class CjsCharacterTextureChannel
{

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterTextureAsset")
    texture = null;

    @blue.readwrite
    @blue.persist
    @type.string
    channel = "a";

}

export default CjsCharacterTextureChannel;
