import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** One authored resource-version inventory with unresolved external candidates. */
@type.define({ className: "CjsCharacterPartSourceVersion", family: "character" })
export class CjsCharacterPartSourceVersion extends CjsModel
{

    @io.readwrite
    @type.string
    resourceVersion = null;

    @io.readwrite
    @type.list("string")
    configurationCandidates = [];

    @io.readwrite
    @type.list("string")
    geometryCandidates = [];

    @io.readwrite
    @type.list("string")
    textureCandidates = [];

}

export default CjsCharacterPartSourceVersion;
