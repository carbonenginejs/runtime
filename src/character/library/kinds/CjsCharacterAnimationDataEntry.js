import { meta, type } from "#schema";

// Discovery: src/character/discovery/animationdata.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * One named animation-data record.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAnimationDataEntry")
export class CjsCharacterAnimationDataEntry
{

    /** Authored female settings. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterFemale")
    female = null;

    /** Authored male settings. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterMale")
    male = null;

}
