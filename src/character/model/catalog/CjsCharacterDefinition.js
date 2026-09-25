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
    @type.path
    sourcePath = "";

    @edit.readwrite
    @type.string
    extension = "";

    @edit.readwrite
    @type.unknown
    values = null;

}

export default CjsCharacterDefinition;
