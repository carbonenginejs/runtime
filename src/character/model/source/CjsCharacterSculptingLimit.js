import { meta, type } from "#schema";

// Discovery: src/character/discovery/scultpinglimits.yaml
// Resource pattern: res:/graphics/character/global/facesetup/scultpinglimits/*.yaml

/**
 * One sculpting shape's limits (`CjsCharacterSculptingLimits.limits`): the shape, its key in the file, and the pair the
 * file writes (`CheeksMiddle_backShape: [0, 0.33]`), read as its lowest and highest weight.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterSculptingLimit")
export class CjsCharacterSculptingLimit
{

    /** The shape name, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The pair's first value, the lowest weight. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    min = 0;

    /** The pair's second value, the highest weight. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    max = 0;

}
