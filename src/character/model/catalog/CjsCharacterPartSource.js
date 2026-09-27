import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One logical character source with its exact authored resource folders and candidates.
 *
 * `sourcePaths` is the complete authored folder list; `sourcePath` is its
 * deterministic first entry for single-path consumers and is never used to
 * choose a source for rendering.
 */
@type.define({ className: "CjsCharacterPartSource", family: "character" })
export class CjsCharacterPartSource extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.path
    sourcePath = "";

    @edit.readwrite
    @edit.persist
    @type.list("string")
    sourcePaths = [];

    @edit.readwrite
    @edit.persist
    @type.string
    sex = "";

    @edit.readwrite
    @edit.persist
    @type.string
    partPath = "";

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterPartSourceVersion")
    versions = [];

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterPartMetadata")
    metadata = null;

}

export default CjsCharacterPartSource;
