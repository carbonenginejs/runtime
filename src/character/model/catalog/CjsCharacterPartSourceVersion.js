import { meta } from "#schema";

/**
 * One self-contained resource-version inventory with effective metadata and exact candidates.
 *
 * Candidate arrays are the complete effective inventory for this version,
 * not overrides of the unversioned record; an empty array means no
 * candidates. Producers must materialize them, and the resolver never merges
 * version records.
 */
@meta.define({ className: "CjsCharacterPartSourceVersion", family: "character" })
export class CjsCharacterPartSourceVersion
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    resourceVersion = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterPartMetadata")
    metadata = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    configurationCandidates = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    geometryCandidates = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("CjsCharacterPartModelBundle")
    modelBundles = [];

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.list("string")
    textureCandidates = [];

}

export default CjsCharacterPartSourceVersion;
