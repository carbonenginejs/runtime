import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored character resource with explicit gender, type, and clothing-category rules. */
@meta.define("CjsCharacterResource")
export class CjsCharacterResource extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    empireRestrictions = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    resPath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterPartType")
    partType = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterModifierLocation")
    clothingAlsoCoversCategory2 = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterModifierLocation")
    clothingRemovesCategory = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterModifierLocation")
    clothingRemovesCategory2 = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    typeID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    clothingRuleException = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    resGender = null;

}

export default CjsCharacterResource;
