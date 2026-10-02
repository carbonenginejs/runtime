import { edit, type } from "#schema";

/**
 * One self-contained resource-version inventory with effective metadata and exact candidates.
 *
 * Candidate arrays are the complete effective inventory for this version,
 * not overrides of the unversioned record; an empty array means no
 * candidates. Producers must materialize them, and the resolver never merges
 * version records.
 */
@type.define({ className: "CjsCharacterPartSourceVersion", family: "character" })
export class CjsCharacterPartSourceVersion
{

    @edit.readwrite
    @edit.persist
    @type.string
    resourceVersion = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterPartMetadata")
    metadata = null;

    @edit.readwrite
    @edit.persist
    @type.list("string")
    configurationCandidates = [];

    @edit.readwrite
    @edit.persist
    @type.list("string")
    geometryCandidates = [];

    @edit.readwrite
    @edit.persist
    @type.list("CjsCharacterPartModelBundle")
    modelBundles = [];

    @edit.readwrite
    @edit.persist
    @type.list("string")
    textureCandidates = [];

}

export default CjsCharacterPartSourceVersion;
