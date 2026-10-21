import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Authored portrait resource classified by its source category and optional type identity. */
@meta.define("CjsCharacterPortraitResource")
export class CjsCharacterPortraitResource extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    resPath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    resourceCategory = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    typeID = null;

}

export default CjsCharacterPortraitResource;
