import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation ancestry record linked to its owning bloodline. */
@meta.define("CjsCharacterAncestry")
export class CjsCharacterAncestry extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.string
    shortDescription = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterBloodline")
    bloodlineID = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    charisma = 0;

    @meta.readwrite
    @meta.persist
    @type.string
    descriptionID = null;

    @meta.readwrite
    @meta.persist
    @type.string
    iconID = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    intelligence = 0;

    @meta.readwrite
    @meta.persist
    @type.int32
    memory = 0;

    @meta.readwrite
    @meta.persist
    @type.string
    nameID = null;

    @meta.readwrite
    @meta.persist
    @type.int32
    perception = 0;

    @meta.readwrite
    @meta.persist
    @type.int32
    willpower = 0;

}

export default CjsCharacterAncestry;
