import { meta, type } from "#schema";

// Discovery: src/character/discovery/pose.yaml
// Additional discovery: basefemalebindpose.yaml, basemalebindpose.yaml
// Resource pattern: res:/graphics/character/*

/**
 * The pose/bind-pose record: three vec3d values, not quaternion/SOF transform storage.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPoseTransform")
export class CjsCharacterPoseTransform
{

    /** The bone name, its key in the file. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Authored 3-component numeric tuple. Kept at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    orientation = new Float64Array(3);

    /**
     * Authored three-component rotation; not a quaternion. Kept at the authored double
     * precision.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    rotation = new Float64Array(3);

    /** Authored 3-component numeric tuple. Kept at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    translation = new Float64Array(3);

}
