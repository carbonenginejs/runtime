import { edit, type } from "#schema";

/** One authored paper-doll resource selection at a resolved modifier location. */
@type.define({ className: "CjsCharacterModifierSelection", family: "character" })
export class CjsCharacterModifierSelection
{

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterModifierLocation")
    modifierLocationID = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterResource")
    paperdollResourceID = null;

    @edit.readwrite
    @edit.persist
    @type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
