import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Lossless JSON value decoded from one indexed character definition file. */
@type.define({ className: "CjsCharacterDefinition", family: "character" })
export class CjsCharacterDefinition extends CjsCharacterRecord
{

    @io.readwrite
    @type.path
    sourcePath = "";

    @io.readwrite
    @type.string
    extension = "";

    @io.readwrite
    @type.unknown
    values = null;

}

export default CjsCharacterDefinition;
