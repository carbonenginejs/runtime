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

    /** The entry name, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored female settings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterFemale")
    female = null;

    /** Authored male settings. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterMale")
    male = null;

}
