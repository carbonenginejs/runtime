import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored modifier location naming one category and variation. */
@meta.define("CjsCharacterModifierLocation")
export class CjsCharacterModifierLocation extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.string
    modifierKey = "";

    @blue.readwrite
    @blue.persist
    @type.string
    variationKey = "";

}

export default CjsCharacterModifierLocation;
