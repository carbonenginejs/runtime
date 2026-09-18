import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Named avatar-behavior resource record with its authored gender selector. */
@type.define({ className: "CjsCharacterAvatarBehavior", family: "character" })
export class CjsCharacterAvatarBehavior extends CjsCharacterRecord
{

    @edit.readwrite
    @type.string
    name = "";

    @edit.readwrite
    @type.list("string")
    resPathList = [];

    @edit.readwrite
    @type.uint8
    resGender = 0;

}

export default CjsCharacterAvatarBehavior;
