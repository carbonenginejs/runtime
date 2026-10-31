import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Plan-local resolved character choice with explicit selection-group ownership. */
@meta.define("CjsCharacterAppearanceSelection")
export class CjsCharacterAppearanceSelection
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    groupID = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceSelection;
