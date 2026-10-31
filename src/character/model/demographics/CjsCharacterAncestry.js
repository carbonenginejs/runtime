import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation ancestry record linked to its owning bloodline. */
@meta.define("CjsCharacterAncestry")
export class CjsCharacterAncestry extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    shortDescription = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST, "bloodlineID")
    @type.object.ref("CjsCharacterBloodline")
    bloodline = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    charisma = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    descriptionID = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    iconID = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    intelligence = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    memory = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    nameID = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    perception = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.int32
    willpower = 0;

}

export default CjsCharacterAncestry;
