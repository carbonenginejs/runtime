import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** One authored paper-doll resource selection at a resolved modifier location. */
@meta.define("CjsCharacterModifierSelection")
export class CjsCharacterModifierSelection
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterModifierLocation")
    modifierLocationID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterResource")
    paperdollResourceID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
