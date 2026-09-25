import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * One self-contained resource-version inventory with effective metadata and exact candidates.
 *
 * Candidate arrays are the complete effective inventory for this version,
 * not overrides of the unversioned record; an empty array means no
 * candidates. Producers must materialize them, and the resolver never merges
 * version records.
 */
@type.define({ className: "CjsCharacterPartSourceVersion", family: "character" })
export class CjsCharacterPartSourceVersion extends CjsModel
{

    @edit.readwrite
    @type.string
    resourceVersion = null;

    @edit.readwrite
    @type.model("CjsCharacterPartMetadata")
    metadata = null;

    @edit.readwrite
    @type.list("string")
    configurationCandidates = [];

    @edit.readwrite
    @type.list("string")
    geometryCandidates = [];

    @edit.readwrite
    @type.list("CjsCharacterPartModelBundle")
    modelBundles = [];

    @edit.readwrite
    @type.list("string")
    textureCandidates = [];

}

export default CjsCharacterPartSourceVersion;
