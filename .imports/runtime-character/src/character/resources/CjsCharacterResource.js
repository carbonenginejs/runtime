import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@type.define({ className: "CjsCharacterResource", family: "character" })
export class CjsCharacterResource extends CjsCharacterRecord
{

    @io.readwrite
    @type.list("string")
    empireRestrictions = null;

    @io.readwrite
    @type.path
    resPath = "";

    @io.readwrite
    @type.model("CjsCharacterPartType")
    partType = null;

    @io.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory = null;

    @io.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory2 = null;

    @io.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory = null;

    @io.readwrite
    @type.model("CjsCharacterModifierLocation")
    clothingRemovesCategory2 = null;

    @io.readwrite
    @type.string
    typeID = null;

    @io.readwrite
    @type.uint8
    clothingRuleException = null;

    @io.readwrite
    @type.uint8
    resGender = null;

}

export default CjsCharacterResource;
