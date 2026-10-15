import { meta, type, blue } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Named avatar-behavior resource record with its authored gender selector. */
@meta.define("CjsCharacterAvatarBehavior")
export class CjsCharacterAvatarBehavior extends CjsCharacterRecord
{

    @blue.readwrite
    @blue.persist
    @type.string
    name = "";

    @blue.readwrite
    @blue.persist
    @type.list("string")
    resPathList = [];

    @blue.readwrite
    @blue.persist
    @type.uint8
    resGender = 0;

}

export default CjsCharacterAvatarBehavior;
