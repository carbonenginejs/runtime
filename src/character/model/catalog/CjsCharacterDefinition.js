import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Lossless JSON value decoded from one indexed character definition file.
 *
 * `values` is whatever the source decoder emitted and stays authoritative
 * source evidence even when no typed catalog projection exists; typed
 * projections are additive, never replacements.
 */
@meta.define("CjsCharacterDefinition")
export class CjsCharacterDefinition extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.path
    sourcePath = "";

    @meta.readwrite
    @meta.persist
    @type.string
    extension = "";

    @meta.readwrite
    @meta.persist
    @type.unknown
    values = null;

}

export default CjsCharacterDefinition;
