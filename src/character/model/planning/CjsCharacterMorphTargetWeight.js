import { meta } from "#schema";

/**
 * One exact renderer-neutral morph-target request in an appearance plan.
 *
 * Matching the name against loaded geometry and the deformation itself are
 * renderer-owned; the request never implies hiding another garment.
 */
@meta.define({ className: "CjsCharacterMorphTargetWeight", family: "character" })
export class CjsCharacterMorphTargetWeight
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    modifierPath = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    targetName = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weight = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterAppearanceSelection")
    owner = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
