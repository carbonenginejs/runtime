import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/** Character-creation race record with authored localization and starting-skill identities. */
@meta.define("CjsCharacterRace")
export class CjsCharacterRace extends CjsCharacterRecord
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.map("int32")
    skills = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    descriptionID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    iconID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    nameID = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    shipTypeID = null;

}

export default CjsCharacterRace;
