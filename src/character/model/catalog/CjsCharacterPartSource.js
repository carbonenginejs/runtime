import { meta, type } from "#schema";
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

    @meta.readwrite
    @meta.persist
    @type.path
    sourcePath = "";

    @meta.readwrite
    @meta.persist
    @type.list("string")
    sourcePaths = [];

    @meta.readwrite
    @meta.persist
    @type.string
    sex = "";

    @meta.readwrite
    @meta.persist
    @type.string
    partPath = "";

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterPartSourceVersion")
    versions = [];

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterPartMetadata")
    metadata = null;

}

export default CjsCharacterPartSource;
