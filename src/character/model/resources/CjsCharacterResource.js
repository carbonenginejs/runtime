import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@meta.define({ className: "CjsCharacterResource", family: "character" })
export class CjsCharacterResource extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    empireRestrictions = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    resPath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterPartType")
    partType = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory2 = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory2 = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    typeID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    clothingRuleException = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    resGender = null;

}

export default CjsCharacterResource;
