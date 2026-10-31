import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Named avatar-behavior resource record with its authored gender selector. */
@meta.define("CjsCharacterAvatarBehavior")
export class CjsCharacterAvatarBehavior extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    name = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    resPathList = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    resGender = 0;

}

export default CjsCharacterAvatarBehavior;
