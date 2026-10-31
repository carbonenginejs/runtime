import { exposure as be } from "#be";
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

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.path
    sourcePath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    sourcePaths = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    sex = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    partPath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterPartSourceVersion")
    versions = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsAvatarPartMetaData")
    metadata = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterMaterialBinding")
    materialBindings = [];

}

export default CjsCharacterPartSource;
