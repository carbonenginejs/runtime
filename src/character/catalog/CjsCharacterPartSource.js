import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** One character source folder with exact external resource candidates. */
@type.define({ className: "CjsCharacterPartSource", family: "character" })
export class CjsCharacterPartSource extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

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
