import { meta, type } from "#schema";

// Discovery: src/character/discovery/cameras.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/cameras/*

/**
 * The six-slot camera sequence, separate from the keyed camera variant.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterCameraSequence")
export class CjsCharacterCameraSequence
{

    /** Library identity for this unnamed root; not a key added to the original file. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /**
     * Two vec3 tuples, three scalars, then a five-string hook tuple. No semantic names are inferred for
     * these slots.
     */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("unknown")
    value = [];

}
