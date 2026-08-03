import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Appearance contribution separating selection ownership from the asset that supplies it. */
@type.define({ className: "CjsCharacterAppearanceLayer", family: "character" })
export class CjsCharacterAppearanceLayer extends CjsModel
{

    @io.readwrite
    @type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @io.readwrite
    @type.model("CjsCharacterResolvedPart")
    contributor = null;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceLayer;
