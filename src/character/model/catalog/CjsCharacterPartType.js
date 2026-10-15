import { meta, type, blue } from "#schema";
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

    @blue.readwrite
    @blue.persist
    @type.path
    sourcePath = "";

    @blue.readwrite
    @blue.persist
    @type.list("string")
    sourcePaths = [];

    @blue.readwrite
    @blue.persist
    @type.string
    sex = "";

    @blue.readwrite
    @blue.persist
    @type.string
    partPath = "";

    @blue.readwrite
    @blue.persist
    @type.string
    resourceVersion = null;

    @blue.readwrite
    @blue.persist
    @type.string
    colorVariant = null;

    @blue.readwrite
    @blue.persist
    @type.list("string")
    bloodlineIDs = [];

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterPartSource")
    partSource = null;

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterPartSource")
    partSources = [];

}

export default CjsCharacterPartType;
