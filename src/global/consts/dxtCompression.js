// Source: trinity/trinity/Tr2DxtCompressor.h:7-29,71-74.

/** Carbon's ten block encoders, shared by the DDS format and Trinity facade. */
export const Tr2DxtCompressionFormat = {
    TR2DXT_COMPRESS_RT_DXT1: 0,
    TR2DXT_COMPRESS_RT_DXT5: 1,
    TR2DXT_COMPRESS_RT_DXT5N: 2,
    TR2DXT_COMPRESS_RT_YCOCGDXT5: 3,
    TR2DXT_COMPRESS_RT_3DC: 4,
    TR2DXT_COMPRESS_SQUISH_DXT1: 5,
    TR2DXT_COMPRESS_SQUISH_DXT3: 6,
    TR2DXT_COMPRESS_SQUISH_DXT5: 7,
    TR2DXT_COMPRESS_SQUISH_KBC4: 8,
    TR2DXT_COMPRESS_SQUISH_KBC5: 9,
    TR2DXT_COMPRESS_COUNT: 10
};

/** Carbon's squish search modes, retaining native values and names. */
export const Tr2DxtCompressionSquishQuality = {
    TR2DXT_COMPRESS_SQ_ITER_CLUSTER_FIT: 0,
    TR2DXT_COMPRESS_SQ_CLUSTER_FIT: 1,
    TR2DXT_COMPRESS_SQ_RANGE_FIT: 2,
    TR2DXT_COMPRESS_SQ_COUNT: 3
};

/** The async Carbon wrapper resolves this sentinel to range fit. */
export const COMPRESS_SQUISH_QUALITY_DEFAULT = -1;
