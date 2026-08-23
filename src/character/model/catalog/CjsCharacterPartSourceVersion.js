import { io, type } from "#schema";
import { CjsModel } from "#model";

/** One self-contained resource-version inventory with effective metadata and exact candidates. */
@type.define({ className: "CjsCharacterPartSourceVersion", family: "character" })
export class CjsCharacterPartSourceVersion extends CjsModel
{

    @io.readwrite
    @type.string
    resourceVersion = null;

    @io.readwrite
    @type.model("CjsCharacterPartMetadata")
    metadata = null;

    @io.readwrite
    @type.list("string")
    configurationCandidates = [];

    @io.readwrite
    @type.list("string")
    geometryCandidates = [];

    @io.readwrite
    @type.list("CjsCharacterPartModelBundle")
    modelBundles = [];

    @io.readwrite
    @type.list("string")
    textureCandidates = [];

}

export default CjsCharacterPartSourceVersion;
