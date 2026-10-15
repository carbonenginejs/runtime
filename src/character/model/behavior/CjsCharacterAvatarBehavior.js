import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Named avatar-behavior resource record with its authored gender selector. */
@meta.define("CjsCharacterAvatarBehavior")
export class CjsCharacterAvatarBehavior extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.string
    name = "";

    @meta.readwrite
    @meta.persist
    @type.list("string")
    resPathList = [];

    @meta.readwrite
    @meta.persist
    @type.uint8
    resGender = 0;

}

export default CjsCharacterAvatarBehavior;
