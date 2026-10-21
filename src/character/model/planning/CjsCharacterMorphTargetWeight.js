import { exposure as be } from "#be";
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

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    modifierPath = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    targetName = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterAppearanceSelection")
    owner = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
