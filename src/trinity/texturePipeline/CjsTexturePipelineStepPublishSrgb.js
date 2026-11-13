// Not Carbon: WebGL2 has no texture views, so composed encoded bytes need their own sRGB storage.
import { blue } from "#blue";
import { CjsSchema } from "#schema";
import { MakeSrgb, PixelFormat, TextureType } from "#consts/render-context";
import { ITr2TexturePipelineStep } from "./ITr2TexturePipelineStep.js";

/** Publishes a composed UNORM image as sRGB without changing its bytes, alpha or existing mip chain. */
export class CjsTexturePipelineStepPublishSrgb
{

  /**
   * The source is supplied by the compositor, not loaded by resource path.
   * @param {Set<string>} [resources] Caller-owned dependency set.
   * @returns {Set<string>} The unchanged set.
   */
  GetResourceDependencies(resources = new Set())
  {
    return resources;
  }

  /**
   * Reads every existing mip through Tr2HostBitmap.CopyFromRenderTarget and changes only the format tag.
   * The caller uploads the result through TriTextureRes.CreateFromHostBitmap. There is no colour conversion
   * or mip generation: the compositing effects already produced encoded RGB and material alpha.
   * Like ExecuteFromScript, the class registry supplies Tr2HostBitmap without an upward resource-layer import.
   *
   * @param {import("#imageio").HostBitmap} bitmap Destination bitmap, replaced only on success.
   * @param {Map<string, import("#imageio").HostBitmap>} _inputs Unused loaded inputs.
   * @param {object} _params Unused pipeline size parameters; publication must retain every source mip.
   * @param {object} [options] Explicit GPU readback dependencies.
   * @param {object} options.source A retained, single-layer 2D Tr2TextureAL; the caller owns it across the await.
   * @param {object} options.renderContext The Tr2RenderContext which owns the source; execute between frames,
   *   after composition submits its draws, so WebGPU can submit each readback before awaiting its map.
   * @param {AbortSignal} [options.signal] Cancellation discards the readback; an already submitted copy completes.
   * @returns {Promise<boolean>} Whether the identical bytes are ready for an sRGB upload.
   */
  async Execute(bitmap, _inputs, _params, options = {})
  {
    const { source, renderContext, signal } = options;
    if (signal?.aborted || !source?.IsValid() || !renderContext
      || source.GetType() !== TextureType.TEX_TYPE_2D || source.GetArraySize() !== 1
      || source.GetDepth() !== 1 || source.GetMsaaDesc().samples > 1) return false;
    const format = source.GetFormat();
    if (format !== PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM
      && format !== PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM) return false;

    const readback = blue.classes.CreateInstance("Tr2HostBitmap");
    if (!readback) return false;
    try
    {
      if (!readback.CreateFromBitmapDimensions(source.GetDesc())
        || !await readback.CopyFromRenderTarget(source, renderContext)
        || signal?.aborted || !readback.ChangeFormat(MakeSrgb(format))) return false;
      bitmap.Swap(readback);
      return true;
    }
    finally
    {
      readback.Destroy();
    }
  }

}

CjsSchema.meta.define(CjsTexturePipelineStepPublishSrgb, {
  name: "CjsTexturePipelineStepPublishSrgb",
  methods: { GetResourceDependencies: [], Execute: [] }
});
CjsSchema.be.interface(ITr2TexturePipelineStep)(CjsTexturePipelineStepPublishSrgb, { kind: "class" });
