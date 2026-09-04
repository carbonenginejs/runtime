// Source: trinity/trinityal/Tr2RenderContextEnum.h (Tr2CpuUsage, Tr2GpuUsage namespaces)

/** CPU access usage flags. */
export const Tr2CpuUsage = Object.freeze({
    NONE: 0,
    READ: 1,
    WRITE: 2,
    READ_OFTEN: 5,
    WRITE_OFTEN: 10,
    NON_SYNCRONIZED_WRITE: 16
});

/** GPU resource usage flags. */
export const Tr2GpuUsage = Object.freeze({
    NONE: 0,
    VERTEX_BUFFER: 1,
    INDEX_BUFFER: 2,
    RENDER_TARGET: 4,
    DEPTH_STENCIL: 8,
    SHADER_RESOURCE: 16,
    UNORDERED_ACCESS: 32,
    COPY_DESTINATION: 64,
    DRAW_INDIRECT_ARGS: 128,
    ACCELERATION_STRUCTURE: 256,
    SHARED: 512
});


// Carbon declares these inside the same namespaces as the flags they test
// (`Tr2RenderContextEnum.h:455-514`), so they belong beside them here.

/**
 * Whether every bit of `flag` is set in `value`.
 *
 * Carbon's test is `( value & flag ) == flag`, NOT a non-zero check: the
 * composite flags matter. `READ_OFTEN` is `READ | 4`, so a resource marked
 * merely `READ` must not answer true to `READ_OFTEN`.
 *
 * @param {number} value A usage bit set.
 * @param {number} flag The flag to test for.
 * @returns {boolean} True when fully set.
 */
export function HasFlag(value, flag)
{
    return (value & flag) === flag;
}

/**
 * Whether the GPU may write this resource.
 *
 * @param {number} value A `Tr2GpuUsage` bit set.
 * @returns {boolean} True for render target, depth stencil, UAV or copy target.
 */
export function IsWritable(value)
{
    const writable = Tr2GpuUsage.RENDER_TARGET |
        Tr2GpuUsage.DEPTH_STENCIL |
        Tr2GpuUsage.UNORDERED_ACCESS |
        Tr2GpuUsage.COPY_DESTINATION;

    return (value & writable) !== 0;
}

/**
 * Whether the usage names a buffer rather than a texture.
 *
 * @param {number} value A `Tr2GpuUsage` bit set.
 * @returns {boolean} True for vertex, index or indirect-argument buffers.
 */
export function HasBufferFlags(value)
{
    const buffers = Tr2GpuUsage.VERTEX_BUFFER |
        Tr2GpuUsage.INDEX_BUFFER |
        Tr2GpuUsage.DRAW_INDIRECT_ARGS;

    return (value & buffers) !== 0;
}

/**
 * Whether the usage names a render target or depth stencil.
 *
 * @param {number} value A `Tr2GpuUsage` bit set.
 * @returns {boolean} True for either.
 */
export function HasTextureFlags(value)
{
    return (value & (Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.DEPTH_STENCIL)) !== 0;
}
