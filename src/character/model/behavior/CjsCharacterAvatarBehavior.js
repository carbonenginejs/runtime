import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Named avatar-behavior resource record with its authored gender selector. */
@meta.define({ className: "CjsCharacterAvatarBehavior", family: "character" })
export class CjsCharacterAvatarBehavior extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    name = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    resPathList = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    resGender = 0;

}

export default CjsCharacterAvatarBehavior;
