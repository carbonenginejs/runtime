import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored portrait resource classified by its source category and optional type identity. */
@meta.define("CjsCharacterPortraitResource")
export class CjsCharacterPortraitResource extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.path
    resPath = "";

    @meta.readwrite
    @meta.persist
    @type.string
    resourceCategory = "";

    @meta.readwrite
    @meta.persist
    @type.string
    typeID = null;

}

export default CjsCharacterPortraitResource;
