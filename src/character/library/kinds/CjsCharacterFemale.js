import { meta, type } from "#schema";

// Discovery: src/character/discovery/animationdata.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * Female animation settings, retaining the authored female record.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterFemale")
export class CjsCharacterFemale
{

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    BlinkMult = 0;

}
