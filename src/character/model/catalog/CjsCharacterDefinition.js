import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Lossless JSON value decoded from one indexed character definition file.
 *
 * `values` is whatever the source decoder emitted and stays authoritative
 * source evidence even when no typed catalog projection exists; typed
 * projections are additive, never replacements.
 */
@type.define({ className: "CjsCharacterDefinition", family: "character" })
export class CjsCharacterDefinition extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.path
    sourcePath = "";

    @edit.readwrite
    @edit.persist
    @type.string
    extension = "";

    @edit.readwrite
    @edit.persist
    @type.unknown
    values = null;

}

export default CjsCharacterDefinition;
