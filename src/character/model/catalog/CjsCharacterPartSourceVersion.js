import { meta, type, blue } from "#schema";

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

    @blue.readwrite
    @blue.persist
    @type.string
    resourceVersion = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterPartMetadata")
    metadata = null;

    @blue.readwrite
    @blue.persist
    @type.list("string")
    configurationCandidates = [];

    @blue.readwrite
    @blue.persist
    @type.list("string")
    geometryCandidates = [];

    @blue.readwrite
    @blue.persist
    @type.list("CjsCharacterPartModelBundle")
    modelBundles = [];

    @blue.readwrite
    @blue.persist
    @type.list("string")
    textureCandidates = [];

}

export default CjsCharacterPartSourceVersion;
