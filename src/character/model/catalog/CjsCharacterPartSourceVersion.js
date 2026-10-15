import { meta, type } from "#schema";

/**
 * One self-contained resource-version inventory with effective metadata and exact candidates.
 *
 * Candidate arrays are the complete effective inventory for this version,
 * not overrides of the unversioned record; an empty array means no
 * candidates. Producers must materialize them, and the resolver never merges
 * version records.
 */
@meta.define("CjsCharacterPartSourceVersion")
export class CjsCharacterPartSourceVersion
{

    @meta.readwrite
    @meta.persist
    @type.string
    resourceVersion = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterPartMetadata")
    metadata = null;

    @meta.readwrite
    @meta.persist
    @type.list("string")
    configurationCandidates = [];

    @meta.readwrite
    @meta.persist
    @type.list("string")
    geometryCandidates = [];

    @meta.readwrite
    @meta.persist
    @type.list("CjsCharacterPartModelBundle")
    modelBundles = [];

    @meta.readwrite
    @meta.persist
    @type.list("string")
    textureCandidates = [];

}

export default CjsCharacterPartSourceVersion;
