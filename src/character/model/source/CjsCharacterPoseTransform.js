import { meta, type } from "#schema";

// Discovery: src/character/discovery/pose.yaml
// Additional discovery: basefemalebindpose.yaml, basemalebindpose.yaml
// Resource pattern: res:/graphics/character/*

/**
 * The pose/bind-pose record: three vec3 values, not quaternion/SOF transform storage.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterPoseTransform")
export class CjsCharacterPoseTransform
{

    /** Authored 3-component numeric tuple. Plain number storage avoids float32 rounding; source length is 3. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    orientation = [0, 0, 0];

    /**
     * Authored three-component rotation; not a quaternion. Plain number storage avoids float32 rounding;
     * source length is 3.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    rotation = [0, 0, 0];

    /** Authored 3-component numeric tuple. Plain number storage avoids float32 rounding; source length is 3. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    translation = [0, 0, 0];

}
