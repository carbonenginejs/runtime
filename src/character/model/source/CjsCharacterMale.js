import { meta, type } from "#schema";

// Discovery: src/character/discovery/animationdata.yaml
// Resource pattern: res:/graphics/character/global/facesetup/*

/**
 * Male animation settings, kept separate from the female record.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterMale")
export class CjsCharacterMale
{

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    BlinkMult = 0;

}
