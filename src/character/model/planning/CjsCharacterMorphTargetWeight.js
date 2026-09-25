import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * One exact renderer-neutral morph-target request in an appearance plan.
 *
 * Matching the name against loaded geometry and the deformation itself are
 * renderer-owned; the request never implies hiding another garment.
 */
@type.define({ className: "CjsCharacterMorphTargetWeight", family: "character" })
export class CjsCharacterMorphTargetWeight extends CjsModel
{

    @edit.readwrite
    @type.string
    modifierPath = "";

    @edit.readwrite
    @type.string
    targetName = "";

    @edit.readwrite
    @type.float64
    weight = 0;

    @edit.readwrite
    @type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
