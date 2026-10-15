import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation ancestry record linked to its owning bloodline. */
@meta.define("CjsCharacterAncestry")
export class CjsCharacterAncestry extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.string
    shortDescription = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterBloodline")
    bloodlineID = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    charisma = 0;

    @blue.readwrite
    @blue.persist
    @type.string
    descriptionID = null;

    @blue.readwrite
    @blue.persist
    @type.string
    iconID = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    intelligence = 0;

    @blue.readwrite
    @blue.persist
    @type.int32
    memory = 0;

    @blue.readwrite
    @blue.persist
    @type.string
    nameID = null;

    @blue.readwrite
    @blue.persist
    @type.int32
    perception = 0;

    @blue.readwrite
    @blue.persist
    @type.int32
    willpower = 0;

}

export default CjsCharacterAncestry;
