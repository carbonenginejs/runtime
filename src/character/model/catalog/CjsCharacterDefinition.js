import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Lossless JSON value decoded from one indexed character definition file.
 *
 * `values` is whatever the source decoder emitted and stays authoritative
 * source evidence even when no typed catalog projection exists; typed
 * projections are additive, never replacements. Schema 12 can additionally
 * retain original sourceText, preserving YAML tags, tuples and alias syntax
 * that a decoded JSON value cannot represent. Null means text was not supplied.
 */
@meta.define("CjsCharacterDefinition")
export class CjsCharacterDefinition extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    extension = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.unknown
    values = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    sourceText = null;

}

export default CjsCharacterDefinition;
