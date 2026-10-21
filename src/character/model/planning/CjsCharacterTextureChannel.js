import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Reference to one logical channel of a resolved character texture. */
@meta.define("CjsCharacterTextureChannel")
export class CjsCharacterTextureChannel
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterTextureAsset")
    texture = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    channel = "a";

}

export default CjsCharacterTextureChannel;
