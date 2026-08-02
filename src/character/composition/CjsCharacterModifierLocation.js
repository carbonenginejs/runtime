import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored modifier location naming one category and variation. */
@type.define({ className: "CjsCharacterModifierLocation", family: "character" })
export class CjsCharacterModifierLocation extends CjsCharacterRecord
{

    @io.readwrite
    @type.string
    modifierKey = "";

    @io.readwrite
    @type.string
    variationKey = "";

}

export default CjsCharacterModifierLocation;
