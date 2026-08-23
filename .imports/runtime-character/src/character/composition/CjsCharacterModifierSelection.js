import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** One authored paper-doll resource selection at a resolved modifier location. */
@type.define({ className: "CjsCharacterModifierSelection", family: "character" })
export class CjsCharacterModifierSelection extends CjsModel
{

    @io.readwrite
    @type.model("CjsCharacterModifierLocation")
    modifierLocationID = null;

    @io.readwrite
    @type.model("CjsCharacterResource")
    paperdollResourceID = null;

    @io.readwrite
    @type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
