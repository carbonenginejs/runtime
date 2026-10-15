import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@meta.define("CjsCharacterResource")
export class CjsCharacterResource extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.list("string")
    empireRestrictions = null;

    @blue.readwrite
    @blue.persist
    @type.path
    resPath = "";

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterPartType")
    partType = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory2 = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingRemovesCategory = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingRemovesCategory2 = null;

    @blue.readwrite
    @blue.persist
    @type.string
    typeID = null;

    @blue.readwrite
    @blue.persist
    @type.uint8
    clothingRuleException = null;

    @blue.readwrite
    @blue.persist
    @type.uint8
    resGender = null;

}

export default CjsCharacterResource;
