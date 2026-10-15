import { meta, type, blue } from "#schema";

/** One authored paper-doll resource selection at a resolved modifier location. */
@meta.define("CjsCharacterModifierSelection")
export class CjsCharacterModifierSelection
{

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterModifierLocation")
    modifierLocationID = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterResource")
    paperdollResourceID = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
