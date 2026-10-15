import { meta, type, blue } from "#schema";

/**
 * One exact renderer-neutral morph-target request in an appearance plan.
 *
 * Matching the name against loaded geometry and the deformation itself are
 * renderer-owned; the request never implies hiding another garment.
 */
@meta.define("CjsCharacterMorphTargetWeight")
export class CjsCharacterMorphTargetWeight
{

    @blue.readwrite
    @blue.persist
    @type.string
    modifierPath = "";

    @blue.readwrite
    @blue.persist
    @type.string
    targetName = "";

    @blue.readwrite
    @blue.persist
    @type.float64
    weight = 0;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterAppearanceSelection")
    owner = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
