import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** One logical character source with its exact authored resource folders and candidates. */
@type.define({ className: "CjsCharacterPartSource", family: "character" })
export class CjsCharacterPartSource extends CjsCharacterRecord
{

    @edit.readwrite
    @type.path
    sourcePath = "";

    @edit.readwrite
    @type.list("string")
    sourcePaths = [];

    @edit.readwrite
    @type.string
    sex = "";

    @edit.readwrite
    @type.string
    partPath = "";

    @edit.readwrite
    @type.list("CjsCharacterPartSourceVersion")
    versions = [];

    @edit.readwrite
    @type.model("CjsCharacterPartMetadata")
    metadata = null;

}

export default CjsCharacterPartSource;
