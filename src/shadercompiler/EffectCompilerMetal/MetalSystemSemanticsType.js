import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/EffectCompilerMetal.h
// Source: trinity/shadercompiler/EffectCompilerMetal.cpp:4791-4838

const STRINGS = [
    "position",
    "position, invariant",
    "front_facing",
    "vertex_id",
    "instance_id",
    "primitive_id",
    "clip_distance",
    "point_size",
    "color(0)",
    "color(1)",
    "color(2)",
    "color(3)",
    "color(4)",
    "color(5)",
    "color(6)",
    "color(7)",
    "depth",
    "stencil",
    "thread_position_in_grid",
    "thread_position_in_threadgroup",
    "thread_index_in_threadgroup",
    "threadgroup_position_in_grid",
    "sample_id",
    "threads_per_grid",
    "payload",
    "barycentric_coord",
    "origin",
    "direction",
    "min_distance",
    "distance",
    "instance_intersection_function_table_offset",
    "object_to_world_transform",
    "world_to_object_transform",
    "base_vertex",
    "base_instance"
];

/**
 * Carbon's `MetalSystemSemanticsType`: Metal's built-in attributes, stored as
 * the register number of a `MetalRegister.Enum.System` binding.
 */
export class MetalSystemSemanticsType
{
    /**
     * Carbon's `MetalSystemSemanticsType::GetString`: the attribute's text.
     *
     * @param {number} type An `Enum` value.
     * @returns {string} The attribute, or `!!invalid_system_semantic!!`.
     */
    static getString(type)
    {
        return type >= 0 && type < STRINGS.length ? STRINGS[type] : "!!invalid_system_semantic!!";
    }

    /** Carbon's `MetalSystemSemanticsType::Enum`. */
    static Enum = Object.freeze({
        position: 0,
        position_invariant: 1,
        front_facing: 2,
        vertex_id: 3,
        instance_id: 4,
        primitive_id: 5,
        clip_distance: 6,
        point_size: 7,
        color_0: 8,
        color_1: 9,
        color_2: 10,
        color_3: 11,
        color_4: 12,
        color_5: 13,
        color_6: 14,
        color_7: 15,
        depth: 16,
        stencil: 17,
        thread_position_in_grid: 18,
        thread_position_in_threadgroup: 19,
        thread_index_in_threadgroup: 20,
        threadgroup_position_in_grid: 21,
        sample_id: 22,
        threads_per_grid: 23,

        payload: 24,
        barycentric_coord: 25,
        origin: 26,
        direction: 27,
        min_distance: 28,
        distance: 29,
        instance_intersection_function_table_offset: 30,
        object_to_world_transform: 31,
        world_to_object_transform: 32,

        // these two are only available since shader model 6.8 in hlsl, which we don't use (yet).
        // but we need them to emulate the behaviour of SV_VertexID and SV_InstanceID
        base_vertex: 33,
        base_instance: 34
    });
}

CjsSchema.decorateMethod(MetalSystemSemanticsType, "getString", meta.renamed("GetString"));
CjsSchema.meta.carbon("MetalSystemSemanticsType")(MetalSystemSemanticsType);
