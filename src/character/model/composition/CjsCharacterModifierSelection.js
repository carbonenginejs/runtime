import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** One authored paper-doll resource selection at a resolved modifier location. */
@meta.define("CjsCharacterModifierSelection")
export class CjsCharacterModifierSelection
{

    @meta.attribute(meta.READWRITE | meta.PERSIST, "modifierLocationID")
    @type.object.ref("CjsCharacterModifierLocation")
    modifierLocation = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST, "paperdollResourceID")
    @type.object.ref("CjsCharacterResource")
    paperdollResource = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
