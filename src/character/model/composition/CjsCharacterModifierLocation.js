import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored modifier location naming one category and variation. */
@meta.define("CjsCharacterModifierLocation")
export class CjsCharacterModifierLocation extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    modifierKey = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    variationKey = "";

}

export default CjsCharacterModifierLocation;
