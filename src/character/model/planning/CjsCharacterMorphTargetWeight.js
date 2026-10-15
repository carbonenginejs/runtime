import { meta, type } from "#schema";

/**
 * One exact renderer-neutral morph-target request in an appearance plan.
 *
 * Matching the name against loaded geometry and the deformation itself are
 * renderer-owned; the request never implies hiding another garment.
 */
@meta.define("CjsCharacterMorphTargetWeight")
export class CjsCharacterMorphTargetWeight
{

    @meta.readwrite
    @meta.persist
    @type.string
    modifierPath = "";

    @meta.readwrite
    @meta.persist
    @type.string
    targetName = "";

    @meta.readwrite
    @meta.persist
    @type.float64
    weight = 0;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterAppearanceSelection")
    owner = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
