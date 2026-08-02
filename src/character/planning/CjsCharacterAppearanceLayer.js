import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Ordered appearance layer separating selection ownership from asset contribution. */
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
