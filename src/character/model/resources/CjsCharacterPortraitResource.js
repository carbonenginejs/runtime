import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored portrait resource classified by its source category and optional type identity. */
@type.define({ className: "CjsCharacterPortraitResource", family: "character" })
export class CjsCharacterPortraitResource extends CjsCharacterRecord
{

    @edit.readwrite
    @type.path
    resPath = "";

    @edit.readwrite
    @type.string
    resourceCategory = "";

    @edit.readwrite
    @type.string
    typeID = null;

}

export default CjsCharacterPortraitResource;
