import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored portrait resource classified by its source category and optional type identity. */
@type.define({ className: "CjsCharacterPortraitResource", family: "character" })
export class CjsCharacterPortraitResource extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    resPath = "";

    @io.readwrite
    @type.string
    resourceCategory = "";

    @io.readwrite
    @type.string
    typeID = null;

}

export default CjsCharacterPortraitResource;
