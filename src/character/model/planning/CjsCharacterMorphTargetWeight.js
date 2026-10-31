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

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    modifierPath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    targetName = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterAppearanceSelection")
    owner = null;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterMorphTargetWeight;
