import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Lossless JSON value decoded from one indexed character definition file.
 *
 * `values` is whatever the source decoder emitted and stays authoritative
 * source evidence even when no typed catalog projection exists; typed
 * projections are additive, never replacements.
 */
@meta.define({ className: "CjsCharacterDefinition", family: "character" })
export class CjsCharacterDefinition extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    sourcePath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    extension = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.unknown
    values = null;

}

export default CjsCharacterDefinition;
