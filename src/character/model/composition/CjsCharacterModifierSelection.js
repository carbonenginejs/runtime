import { meta } from "#schema";

/** One authored paper-doll resource selection at a resolved modifier location. */
@meta.define({ className: "CjsCharacterModifierSelection", family: "character" })
export class CjsCharacterModifierSelection
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterModifierLocation")
    modifierLocationID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterResource")
    paperdollResourceID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    paperdollResourceVariation = 0;

}

export default CjsCharacterModifierSelection;
