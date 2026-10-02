import { edit, type } from "#schema";

/**
 * One exact renderer-neutral morph-target request in an appearance plan.
 *
 * Matching the name against loaded geometry and the deformation itself are
 * renderer-owned; the request never implies hiding another garment.
 */
@type.define({ className: "CjsCharacterMorphTargetWeight", family: "character" })
export class CjsCharacterMorphTargetWeight
{

    @edit.readwrite
    @edit.persist
    @type.string
    modifierPath = "";

    @edit.readwrite
    @edit.persist
    @type.string
    targetName = "";

    @edit.readwrite
    @edit.persist
    @type.float64
    weight = 0;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
