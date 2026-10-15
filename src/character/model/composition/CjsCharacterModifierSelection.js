import { meta, type } from "#schema";

/** One authored paper-doll resource selection at a resolved modifier location. */
@meta.define("CjsCharacterModifierSelection")
export class CjsCharacterModifierSelection
{

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterModifierLocation")
    modifierLocationID = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterResource")
    paperdollResourceID = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
