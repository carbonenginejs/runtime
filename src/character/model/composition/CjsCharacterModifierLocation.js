import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored modifier location naming one category and variation. */
@meta.define({ className: "CjsCharacterModifierLocation", family: "character" })
export class CjsCharacterModifierLocation extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    modifierKey = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    variationKey = "";

}

export default CjsCharacterModifierLocation;
