import { exposure as be } from "#be";
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

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    sourcePaths = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sex = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    partPath = "";

    /** The resource version of the part source this type uses; "" is the baseline, unversioned source. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    resourceVersion = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorVariant = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    bloodlineIDs = [];

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterPartSource")
    partSource = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterPartSource")
    partSources = [];

}

export default CjsCharacterPartType;
