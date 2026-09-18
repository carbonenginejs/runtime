import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One self-contained resource-version inventory with effective metadata and exact candidates. */
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
