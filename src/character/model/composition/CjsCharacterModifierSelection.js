import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One authored paper-doll resource selection at a resolved modifier location. */
@type.define({ className: "CjsCharacterModifierSelection", family: "character" })
export class CjsCharacterModifierSelection extends CjsModel
{

    @edit.readwrite
    @type.model("CjsCharacterModifierLocation")
    modifierLocationID = null;

    @edit.readwrite
    @type.model("CjsCharacterResource")
    paperdollResourceID = null;

    @edit.readwrite
    @type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
