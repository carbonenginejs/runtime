import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored portrait resource classified by its source category and optional type identity. */
@meta.define({ className: "CjsCharacterPortraitResource", family: "character" })
export class CjsCharacterPortraitResource extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    resPath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    resourceCategory = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    typeID = null;

}

export default CjsCharacterPortraitResource;
