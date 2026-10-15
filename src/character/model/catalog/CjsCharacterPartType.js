import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * One published character type definition folded into the combined catalog.
 *
 * `partSources` keeps every exact sex-specific source relationship;
 * `partSource` is set only when that relationship is unique.
 * `bloodlineIDs` keeps authored identities without asserting availability,
 * allow-list or deny-list meaning.
 */
@meta.define("CjsCharacterPartType")
export class CjsCharacterPartType extends CjsCharacterRecord
{

    @meta.readwrite
    @meta.persist
    @type.path
    sourcePath = "";

    @meta.readwrite
    @meta.persist
    @type.list("string")
    sourcePaths = [];

    @meta.readwrite
    @meta.persist
    @type.string
    sex = "";

    @meta.readwrite
    @meta.persist
    @type.string
    partPath = "";

    @meta.readwrite
    @meta.persist
    @type.string
    resourceVersion = null;

    @meta.readwrite
    @meta.persist
    @type.string
    colorVariant = null;

    @meta.readwrite
    @meta.persist
    @type.list("string")
    bloodlineIDs = [];

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterPartSource")
    partSource = null;

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterPartSource")
    partSources = [];

}

export default CjsCharacterPartType;
