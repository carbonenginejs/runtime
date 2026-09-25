// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.h
// Schema: format-carbon resources/Tr2TexturePipelineStepLimitSize.json; maintained by the runtime resource layer.
import { carbon, CjsSchema, edit, impl, type } from "#schema";
import { HostBitmap } from "#imageio";
import { CjsModel } from "#model";

/** Persisted pipeline-step record mirroring Carbon's size-limit step, holding the maximum width and height the bitmap may keep. */
export class Tr2TexturePipelineStepLimitSize extends CjsModel
{

  /** m_maxHeight (uint32_t) [READWRITE, PERSIST] */
  maxHeight = 0;

  /** m_maxWidth (uint32_t) [READWRITE, PERSIST] */
  maxWidth = 0;

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
   * Carbon Execute (cpp:24-31): the step's own limits, not the pipeline's.
   *
   * @param {import("#imageio").HostBitmap} bitmap The pipeline's bitmap.
   * @returns {boolean} Whether the step succeeded.
   */
  Execute(bitmap)
  {
    return Tr2TexturePipelineStepLimitSize.limitSize(bitmap, this.maxWidth, this.maxHeight);
  }

  /**
   * Carbon's static LimitSize (cpp:34-87): drop whole mip levels until the
   * bitmap fits, keeping the levels below.
   *
   * diverged: Carbon computes the kept level count BEFORE generating the mips
   * it may need, as `GetTrueMipCount() - (mip + 1)`, and copies
   * `m = mip; m < mipCount`. For a single-mip bitmap over the limit that
   * count is 1 and the loop copies nothing, so the result is an all-zero
   * texture; with a full chain the last level stays zeroed. Here the mips are
   * generated first, the count is `GetTrueMipCount() - mip`, and the copy runs
   * to `mip + mipCount` (issue 1, /docs/research/carbon-imageio-issue.md).
   *
   * @param {import("#imageio").HostBitmap} bitmap Bitmap to shrink in place.
   * @param {number} maxWidth Width limit, 0 for none.
   * @param {number} maxHeight Height limit, 0 for none.
   * @returns {boolean} Whether it now fits.
   */
  static limitSize(bitmap, maxWidth, maxHeight)
  {
    if (!maxWidth && !maxHeight) return true;

    // Carbon: CCP_LOGERR("Tr2TexturePipelineStepLimitSize: invalid input bitmap")
    if (!bitmap.IsValid()) return false;

    let mip = 0;
    let width = bitmap.GetWidth();
    let height = bitmap.GetHeight();

    if (maxWidth > 0)
    {
      while (width > maxWidth)
      {
        width = Math.floor(width / 2);
        height = Math.floor(height / 2);
        mip++;
      }
    }

    if (maxHeight > 0)
    {
      while (height > maxHeight)
      {
        width = Math.floor(width / 2);
        height = Math.floor(height / 2);
        mip++;
      }
    }

    if (mip === 0) return true;

    if (mip + 1 > bitmap.GetTrueMipCount() && !bitmap.GenerateMipMaps()) return false;

    const mipCount = Math.max(bitmap.GetTrueMipCount() - mip, 1);
    const result = new HostBitmap();

    // Carbon: CCP_LOGERR("Tr2TexturePipelineStepLimitSize: could not create resulting bitmap")
    if (!result.Create(bitmap.GetMipWidth(mip), bitmap.GetMipHeight(mip), mipCount, bitmap.GetFormat())) return false;

    for (let m = mip; m < mip + mipCount; ++m)
    {
      result.GetMipRawData(m - mip).set(bitmap.GetMipRawData(m).subarray(0, bitmap.GetMipSize(m)));
    }

    bitmap.Swap(result);
    return true;
  }

}

CjsSchema.define(Tr2TexturePipelineStepLimitSize, {
  className: "Tr2TexturePipelineStepLimitSize", family: "resources",
  fields: {
    maxHeight: [ edit.persist, type.uint32 ],
    maxWidth: [ edit.persist, type.uint32 ]
  },
  methods: {
    GetResourceDependencies: [ carbon.method, impl.implemented ],
    Execute: [ carbon.method, impl.implemented ],
    limitSize: [ carbon.method, impl.adapted, impl.reason("Carbon's LimitSize returns an all-zero texture for single-mip input and leaves the last level zeroed for a full chain (issue 1); fixed here.") ]
  }
});
