import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One logical character source with its exact authored resource folders and candidates.
 *
 * `sourcePaths` is the complete authored folder list; `sourcePath` is its
 * deterministic first entry for single-path consumers and is never used to
 * choose a source for rendering.
 */
@meta.define("CjsCharacterPartSource")
export class CjsCharacterPartSource extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.path
    sourcePath = "";

    @blue.readwrite
    @blue.persist
    @type.list("string")
    sourcePaths = [];

    @blue.readwrite
    @blue.persist
    @type.string
    sex = "";

    @blue.readwrite
    @blue.persist
    @type.string
    partPath = "";

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterPartSourceVersion")
    versions = [];

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterPartMetadata")
    metadata = null;

}

export default CjsCharacterPartSource;
