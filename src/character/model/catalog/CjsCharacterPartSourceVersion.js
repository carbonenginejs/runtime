import { exposure as be } from "#be";
import { meta, type } from "#schema";

/**
 * One self-contained resource-version inventory with effective metadata and exact candidates.
 *
 * Candidate arrays are the complete effective inventory for this version,
 * not overrides of the unversioned record; an empty array means no
 * candidates. Producers must materialize them, and the resolver never merges
 * version records. Schema 12 separately retains the original candidate input
 * and producer-qualified effective channels; these do not change the meaning
 * of the legacy inventory arrays.
 */
@meta.define("CjsCharacterPartSourceVersion")
export class CjsCharacterPartSourceVersion
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    resourceVersion = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterPartMetadata")
    metadata = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    configurationCandidates = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    geometryCandidates = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("CjsCharacterPartModelBundle")
    modelBundles = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.list("string")
    textureCandidates = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterCatalogTextureBinding")
    effectiveTextureBindings = [];

    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterTextureCandidateInput")
    textureCandidateInput = null;

}

export default CjsCharacterPartSourceVersion;
