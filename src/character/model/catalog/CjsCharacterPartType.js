import { edit, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One published character type definition folded into the combined catalog.
 *
 * `partSources` keeps every exact sex-specific source relationship;
 * `partSource` is set only when that relationship is unique.
 * `bloodlineIDs` keeps authored identities without asserting availability,
 * allow-list or deny-list meaning.
 */
@type.define({ className: "CjsCharacterPartType", family: "character" })
export class CjsCharacterPartType extends CjsCharacterRecord
{

    @edit.readwrite
    @edit.persist
    @type.path
    sourcePath = "";

    @edit.readwrite
    @edit.persist
    @type.list("string")
    sourcePaths = [];

    @edit.readwrite
    @edit.persist
    @type.string
    sex = "";

    @edit.readwrite
    @edit.persist
    @type.string
    partPath = "";

    @edit.readwrite
    @edit.persist
    @type.string
    resourceVersion = null;

    @edit.readwrite
    @edit.persist
    @type.string
    colorVariant = null;

    @edit.readwrite
    @edit.persist
    @type.list("string")
    bloodlineIDs = [];

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterPartSource")
    partSource = null;

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterPartSource")
    partSources = [];

}

export default CjsCharacterPartType;
