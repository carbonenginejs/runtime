import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored portrait resource classified by its source category and optional type identity. */
@type.define({ className: "CjsCharacterPortraitResource", family: "character" })
export class CjsCharacterPortraitResource extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.path
    resPath = "";

    @edit.readwrite
    @edit.persist
    @type.string
    resourceCategory = "";

    @edit.readwrite
    @edit.persist
    @type.string
    typeID = null;

}

export default CjsCharacterPortraitResource;
