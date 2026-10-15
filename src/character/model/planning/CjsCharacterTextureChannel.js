import { meta, type } from "#schema";

/** Reference to one logical channel of a resolved character texture. */
@meta.define("CjsCharacterTextureChannel")
export class CjsCharacterTextureChannel
{

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterTextureAsset")
    texture = null;

    @meta.readwrite
    @meta.persist
    @type.string
    channel = "a";

}

export default CjsCharacterTextureChannel;
