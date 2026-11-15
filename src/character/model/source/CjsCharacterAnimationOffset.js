import { meta, type } from "#schema";

// Discovery: src/character/discovery/animationoffsets.yaml
// Resource pattern: res:/graphics/character/unique/characterselect/*/animationoffsets.yaml

/**
 * One bone's animation offset (`CjsCharacterAnimationOffsets.value`): the bone, its key in the file, and its
 * three-component offset.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterAnimationOffset")
export class CjsCharacterAnimationOffset
{

    /** The bone name, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The offset, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    value = new Float64Array(3);

}
