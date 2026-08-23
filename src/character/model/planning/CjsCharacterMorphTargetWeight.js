import { io, type } from "#schema";
import { CjsModel } from "#model";

/** One exact renderer-neutral morph-target request in an appearance plan. */
@type.define({ className: "CjsCharacterMorphTargetWeight", family: "character" })
export class CjsCharacterMorphTargetWeight extends CjsModel
{

    @io.readwrite
    @type.string
    modifierPath = "";

    @io.readwrite
    @type.string
    targetName = "";

    @io.readwrite
    @type.float64
    weight = 0;

    @io.readwrite
    @type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
