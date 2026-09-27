import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@type.define({ className: "CjsCharacterResource", family: "character" })
export class CjsCharacterResource extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.list("string")
    empireRestrictions = null;

    @edit.readwrite
    @edit.persist
    @type.path
    resPath = "";

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterPartType")
    partType = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory2 = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory2 = null;

    @edit.readwrite
    @edit.persist
    @type.string
    typeID = null;

    @edit.readwrite
    @edit.persist
    @type.uint8
    clothingRuleException = null;

    @edit.readwrite
    @edit.persist
    @type.uint8
    resGender = null;

}

export default CjsCharacterResource;
