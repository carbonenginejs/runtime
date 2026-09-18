import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored modifier location naming one category and variation. */
@type.define({ className: "CjsCharacterModifierLocation", family: "character" })
export class CjsCharacterModifierLocation extends CjsCharacterRecord
{

    @edit.readwrite
    @type.string
    modifierKey = "";

    @edit.readwrite
    @type.string
    variationKey = "";

}

export default CjsCharacterModifierLocation;
