// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinityal/Tr2RenderContextEnum.h (Tr2CpuUsage, Tr2GpuUsage namespaces)

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
