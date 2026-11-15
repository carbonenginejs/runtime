import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

// Discovery: src/character/discovery/cameras.yaml
// Additional discovery: scenes_camera.yaml
// Resource pattern: res:/graphics/character/global/paperdolllibrary/cameras/*

/**
 * The keyed camera variant, preserving the authored keys and numeric precision.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterCamera")
@meta.exposureChainTo(CjsCharacterRecord)
export class CjsCharacterCamera extends CjsCharacterRecord
{

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    aspect_ratio = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    back_clip = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    field_of_view = 0;

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    front_clip = 0;

    /** Authored named camera hooks. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.object.ref("CjsCharacterHookNames")
    hook_names = null;

    /** The point the camera looks at, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    point_of_interest = new Float64Array(3); // alloc: field default, one per record

    /** The camera's position, at the authored double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec3d
    position = new Float64Array(3); // alloc: field default, one per record

    /** Authored numeric value, retained at JavaScript number precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    transform_hook_scale = 0;

    /** The authored viewport size, its components integers, at double precision. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec2d
    viewport_size = new Float64Array(2); // alloc: field default, one per record

}
