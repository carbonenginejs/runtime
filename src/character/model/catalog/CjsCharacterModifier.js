import { meta, type } from "#schema";

/**
 * One modifier of a part's metadata, as the character format reads it (`CjsCharacterYamlFormat.decodeModifier`):
 * its path and the weight the file states. Character library value record; no resource decoding or character
 * construction.
 */
@meta.define("CjsCharacterModifier")
export class CjsCharacterModifier
{

    /** The modifier's path, as written. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    path = "";

    /**
     * The weight the file states, or null for none. What no weight means is the reader's to resolve, in one place:
     * `CjsCharacterAppearanceResolver.dependantWeight` (a dependant at 1) and `decodeUtilityOcclusion` (an occlusion
     * that suppresses).
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    weight = null;

}
