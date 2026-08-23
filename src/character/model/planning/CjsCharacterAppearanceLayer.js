import { io, type } from "#schema";
import { CjsModel } from "#model";

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

    /** Authored contribution weight when the dependency carries one. */
    @io.readwrite
    @type.float64
    weight = null;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceLayer;
