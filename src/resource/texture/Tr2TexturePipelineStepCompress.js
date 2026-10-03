// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.h
// Schema: format-carbon resources/Tr2TexturePipelineStepCompress.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";
import { CjsDdsFormat } from "#resource/formats/dds";
import { createDdsBitmap } from "./ddsBitmap.js";
import { PixelFormat as P } from "#consts/render-context";
import { Tr2DxtCompressionFormat as F } from "#consts/trinity";

const MODES = new Map([
  [P.PIXEL_FORMAT_BC1_UNORM, F.TR2DXT_COMPRESS_SQUISH_DXT1],
  [P.PIXEL_FORMAT_BC1_UNORM_SRGB, F.TR2DXT_COMPRESS_SQUISH_DXT1],
  [P.PIXEL_FORMAT_BC2_UNORM, F.TR2DXT_COMPRESS_SQUISH_DXT3],
  [P.PIXEL_FORMAT_BC2_UNORM_SRGB, F.TR2DXT_COMPRESS_SQUISH_DXT3],
  [P.PIXEL_FORMAT_BC3_UNORM, F.TR2DXT_COMPRESS_SQUISH_DXT5],
  [P.PIXEL_FORMAT_BC3_UNORM_SRGB, F.TR2DXT_COMPRESS_SQUISH_DXT5],
  [P.PIXEL_FORMAT_BC4_UNORM, F.TR2DXT_COMPRESS_SQUISH_KBC4],
  [P.PIXEL_FORMAT_BC5_UNORM, F.TR2DXT_COMPRESS_SQUISH_KBC5]
]);

/** Persisted pipeline-step record mirroring Carbon's compress step, naming the target pixel format and per-channel error weights. */
export class Tr2TexturePipelineStepCompress
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  format = 71;

  /** m_bWeight (float) [READWRITE, PERSIST] */
  b = 1;

  /** m_gWeight (float) [READWRITE, PERSIST] */
  g = 1;

  /** m_rWeight (float) [READWRITE, PERSIST] */
  r = 1;

  /**
   * Carbon's ITr2TexturePipelineStep default (ITr2TexturePipelineStep.h:21):
   * this step names no resources.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set, unchanged.
   */
  GetResourceDependencies(resources = new Set())
  {
    return resources;
  }

  /**
   * Carbon Execute (cpp:15-21) checks validity and returns true, compressing
   * nothing, so a pipeline asking for compression silently gets uncompressed
   * output (issue 20, /docs/research/carbon-imageio-issue.md).
   *
   * Approved correction: encode through the shared DDS worker, then publish
   * the complete bitmap. Browser workers require an asynchronous result.
   * Carbon's unused channel-weight fields remain persisted; squish uses its
   * uniform metric and default range-fit quality.
   *
   * @param {import("#imageio").HostBitmap} bitmap The pipeline's bitmap.
   * @param {Map} inputs Pipeline inputs (unused by this step).
   * @param {object} params Pipeline dimensions (unused by this step).
   * @param {object} [options] Worker construction and cancellation options.
   * @returns {Promise<boolean>} Whether the step succeeded.
   */
  async Execute(bitmap, inputs, params, options = {})
  {
    if (!bitmap.IsValid()) return false;

    if (bitmap.GetFormat() === this.format) return true;
    const mode = MODES.get(this.format);
    if (mode === undefined) return false;
    try
    {
      const encoded = await CjsDdsFormat.compressBitmapAsync({ description: {
        type: bitmap.GetType(), format: bitmap.GetFormat(), width: bitmap.GetWidth(),
        height: bitmap.GetHeight(), depth: bitmap.GetDepth(), mipCount: bitmap.GetMipCount(),
        arraySize: bitmap.GetArraySize()
      }, data: bitmap.GetRawData(), metadata: bitmap.metadata || { cutout: {}, metadata: [] } }, mode,
      { ...options, srgb: [P.PIXEL_FORMAT_BC1_UNORM_SRGB, P.PIXEL_FORMAT_BC2_UNORM_SRGB, P.PIXEL_FORMAT_BC3_UNORM_SRGB].includes(this.format) });
      if (options.signal?.aborted) return false;
      bitmap.Swap(createDdsBitmap(encoded));
      return true;
    }
    catch
    {
      return false;
    }
  }

}

CjsSchema.define(Tr2TexturePipelineStepCompress, {
  className: "Tr2TexturePipelineStepCompress", family: "resources",
  fields: {
    format: [ meta.blue.persist, meta.type.int32, meta.type.enum("PixelFormat") ],
    b: [ meta.blue.persist, meta.type.float32 ],
    g: [ meta.blue.persist, meta.type.float32 ],
    r: [ meta.blue.persist, meta.type.float32 ]
  },
  methods: {
    GetResourceDependencies: [ meta.blue.method, meta.implemented ],
    Execute: [ meta.blue.method, meta.adapted ]
  }
});
