import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Named avatar-behavior resource record with its authored gender selector. */
@type.define({ className: "CjsCharacterAvatarBehavior", family: "character" })
export class CjsCharacterAvatarBehavior extends CjsCharacterRecord
{

    @io.readwrite
    @type.string
    name = "";

    @io.readwrite
    @type.list("string")
    resPathList = [];

    @io.readwrite
    @type.uint8
    resGender = 0;

}

export default CjsCharacterAvatarBehavior;
