import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@type.define({ className: "CjsCharacterResource", family: "character" })
export class CjsCharacterResource extends CjsCharacterRecord
{

    @edit.readwrite
    @type.list("string")
    empireRestrictions = null;

    @edit.readwrite
    @type.path
    resPath = "";

    @edit.readwrite
    @type.model("CjsCharacterPartType")
    partType = null;

    @edit.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory = null;

    @edit.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory2 = null;

    @edit.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory = null;

    @edit.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory2 = null;

    @edit.readwrite
    @type.string
    typeID = null;

    @edit.readwrite
    @type.uint8
    clothingRuleException = null;

    @edit.readwrite
    @type.uint8
    resGender = null;

}

export default CjsCharacterResource;
