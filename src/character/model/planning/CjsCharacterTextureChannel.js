import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Reference to one logical channel of a resolved character texture. */
@meta.define("CjsCharacterTextureChannel")
export class CjsCharacterTextureChannel
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterTextureAsset")
    texture = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    channel = "a";

}

export default CjsCharacterTextureChannel;
