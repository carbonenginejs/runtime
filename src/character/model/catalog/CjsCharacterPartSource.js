import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One logical character source with its exact authored resource folders and candidates.
 *
 * `sourcePaths` is the complete authored folder list; `sourcePath` is its
 * deterministic first entry for single-path consumers and is never used to
 * choose a source for rendering.
 */
@meta.define({ className: "CjsCharacterPartSource", family: "character" })
export class CjsCharacterPartSource extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    sourcePath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    sourcePaths = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    sex = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    partPath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterPartSourceVersion")
    versions = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterPartMetadata")
    metadata = null;

}

export default CjsCharacterPartSource;
