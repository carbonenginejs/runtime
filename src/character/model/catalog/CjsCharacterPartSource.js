import { io, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** One logical character source with its exact authored resource folders and candidates. */
@type.define({ className: "CjsCharacterPartSource", family: "character" })
export class CjsCharacterPartSource extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

    @io.readwrite
    @type.list("string")
    sourcePaths = [];

    @io.readwrite
    @type.string
    sex = "";

    @io.readwrite
    @type.string
    partPath = "";

    @io.readwrite
    @type.list("CjsCharacterPartSourceVersion")
    versions = [];

    @io.readwrite
    @type.model("CjsCharacterPartMetadata")
    metadata = null;

}

export default CjsCharacterPartSource;
