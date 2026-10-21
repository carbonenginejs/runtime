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

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    sourcePaths = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sex = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    partPath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    resourceVersion = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorVariant = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    bloodlineIDs = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterPartSource")
    partSource = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterPartSource")
    partSources = [];

}

export default CjsCharacterPartType;
