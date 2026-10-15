import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@meta.define("CjsCharacterResource")
export class CjsCharacterResource extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.list("string")
    empireRestrictions = null;

    @meta.readwrite
    @meta.persist
    @type.path
    resPath = "";

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterPartType")
    partType = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory2 = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingRemovesCategory = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterModifierLocation")
    clothingRemovesCategory2 = null;

    @meta.readwrite
    @meta.persist
    @type.string
    typeID = null;

    @meta.readwrite
    @meta.persist
    @type.uint8
    clothingRuleException = null;

    @meta.readwrite
    @meta.persist
    @type.uint8
    resGender = null;

}

export default CjsCharacterResource;
