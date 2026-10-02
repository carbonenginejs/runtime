import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One published character type definition folded into the combined catalog.
 *
 * `partSources` keeps every exact sex-specific source relationship;
 * `partSource` is set only when that relationship is unique.
 * `bloodlineIDs` keeps authored identities without asserting availability,
 * allow-list or deny-list meaning.
 */
@meta.define({ className: "CjsCharacterPartType", family: "character" })
export class CjsCharacterPartType extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.path
    sourcePath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    sourcePaths = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    sex = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    partPath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    resourceVersion = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    colorVariant = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    bloodlineIDs = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterPartSource")
    partSource = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterPartSource")
    partSources = [];

}

export default CjsCharacterPartType;
