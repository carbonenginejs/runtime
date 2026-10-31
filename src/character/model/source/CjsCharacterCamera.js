import { meta, type } from "#schema";

// Discovery: src/character/discovery/cameras.yaml
// Additional discovery: scenes_camera.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/cameras/*

/**
 * The keyed camera variant, preserving the authored keys and numeric precision.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterCamera")
export class CjsCharacterCamera
{

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    aspect_ratio = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    back_clip = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    field_of_view = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    front_clip = 0;

    /** Authored named camera hooks. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterHookNames")
    hook_names = null;

    /** Authored 3-component numeric tuple. Plain number storage avoids float32 rounding; source length is 3. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    point_of_interest = [0, 0, 0];

    /** Authored 3-component numeric tuple. Plain number storage avoids float32 rounding; source length is 3. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    position = [0, 0, 0];

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    transform_hook_scale = 0;

    /**
     * Authored two-component viewport size, with integer components. Plain number storage avoids float32
     * rounding; source length is 2.
     */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.list("float64")
    viewport_size = [0, 0];

}
