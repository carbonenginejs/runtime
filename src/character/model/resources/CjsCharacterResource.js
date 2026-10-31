import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@meta.define("CjsCharacterResource")
export class CjsCharacterResource extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    empireRestrictions = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    resPath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterPartType")
    partType = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST, "clothingAlsoCoversCategory")
    @type.object.ref("CjsCharacterModifierLocation")
    clothingAlsoCoversModifierLocation = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST, "clothingAlsoCoversCategory2")
    @type.object.ref("CjsCharacterModifierLocation")
    clothingAlsoCoversModifierLocation2 = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST, "clothingRemovesCategory")
    @type.object.ref("CjsCharacterModifierLocation")
    clothingRemovesModifierLocation = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST, "clothingRemovesCategory2")
    @type.object.ref("CjsCharacterModifierLocation")
    clothingRemovesModifierLocation2 = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    typeID = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.uint8
    clothingRuleException = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.uint8
    resGender = null;

}

export default CjsCharacterResource;
