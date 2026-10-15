import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored modifier location naming one category and variation. */
@meta.define("CjsCharacterModifierLocation")
export class CjsCharacterModifierLocation extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.string
    modifierKey = "";

    @meta.readwrite
    @meta.persist
    @type.string
    variationKey = "";

}

export default CjsCharacterModifierLocation;
