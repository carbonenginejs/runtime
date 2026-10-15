import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored portrait resource classified by its source category and optional type identity. */
@meta.define("CjsCharacterPortraitResource")
export class CjsCharacterPortraitResource extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.path
    resPath = "";

    @blue.readwrite
    @blue.persist
    @type.string
    resourceCategory = "";

    @blue.readwrite
    @blue.persist
    @type.string
    typeID = null;

}

export default CjsCharacterPortraitResource;
