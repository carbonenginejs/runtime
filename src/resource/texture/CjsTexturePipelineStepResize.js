// Not Carbon. A texture-pipeline step of our own, registered in
// /docs/architecture/non-carbon-extensions.md.
import { CjsSchema, edit, impl, type } from "#schema";
import { CjsModel } from "#model";
import { HostBitmap } from "#imageio";
import { GetBytesPerPixel, IsCompressedFormat } from "#consts/render-context";

/**
 * Resamples the pipeline's INPUTS to one size before a later step reads them.
 *
 * Carbon's `Tr2TexturePipelineStepPack` refuses inputs of different sizes: CCP
 * packs in a controlled pipeline over sources it authors. We join files we do
 * not control, by our own choice, so matching their sizes is our job. With no
 * size set, every input is resampled up to the largest one.
 *
 * Bilinear, on the top mip, for uncompressed byte formats - run
 * `CjsTexturePipelineStepConvert` first for block formats. The result has one
 * mip; add `Tr2TexturePipelineStepGenerateMips` after the pack for a chain.
 * Each resized input is a COPY that replaces its entry in the pipeline's
 * `inputs` map, so the cached source bitmap is never changed.
 */
export class CjsTexturePipelineStepResize extends CjsModel
{

  /** Target width; 0 takes the widest input. */
  width = 0;

  /** Target height; 0 takes the tallest input. */
  height = 0;

  /** Input paths to resize; empty resizes every input. */
  paths = [];

  /**
   * Names no resources: it works on inputs other steps name.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set, unchanged.
   */
  GetResourceDependencies(resources = new Set())
  {
    return resources;
  }

  /**
   * Replace each named input with a copy at the target size.
   *
   * @param {HostBitmap} _bitmap The pipeline's bitmap (unused).
   * @param {Map<string, HostBitmap>} inputs Loaded inputs by path; entries are replaced.
   * @returns {boolean} False when an input is missing or cannot be resampled.
   */
  Execute(_bitmap, inputs)
  {
    const paths = this.paths.length ? this.paths : [ ...inputs.keys() ];
    const sources = paths.map(path => inputs.get(path));

    if (sources.some(source => !source)) return false;

    const width = this.width || Math.max(...sources.map(source => source.GetWidth()));
    const height = this.height || Math.max(...sources.map(source => source.GetHeight()));

    for (let index = 0; index < paths.length; index++)
    {
      const source = sources[index];

      if (source.GetWidth() === width && source.GetHeight() === height && source.GetTrueMipCount() === 1) continue;

      const resized = CjsTexturePipelineStepResize.resample(source, width, height);
      if (!resized) return false;

      inputs.set(paths[index], resized);
    }
    return true;
  }

  /**
   * Bilinear resample of a bitmap's top mip into a new one-mip bitmap.
   *
   * @param {HostBitmap} source Uncompressed byte-per-channel bitmap.
   * @param {number} width Target width.
   * @param {number} height Target height.
   * @returns {HostBitmap|null} The resampled copy, or null for an unsupported format.
   */
  static resample(source, width, height)
  {
    const format = source.GetFormat();

    if (IsCompressedFormat(format)) return null;

    const channels = GetBytesPerPixel(format);
    const result = new HostBitmap();

    if (!result.Create(width, height, 1, format)) return null;

    const sourceWidth = source.GetWidth();
    const sourceHeight = source.GetHeight();
    const from = source.GetMipRawData(0);
    const fromPitch = source.GetMipPitch(0);
    const to = result.GetMipRawData(0);
    const toPitch = result.GetMipPitch(0);

    for (let y = 0; y < height; y++)
    {
      // Pixel centres map to pixel centres.
      const sy = Math.min(Math.max((y + 0.5) * sourceHeight / height - 0.5, 0), sourceHeight - 1);
      const y0 = Math.floor(sy);
      const y1 = Math.min(y0 + 1, sourceHeight - 1);
      const fy = sy - y0;

      for (let x = 0; x < width; x++)
      {
        const sx = Math.min(Math.max((x + 0.5) * sourceWidth / width - 0.5, 0), sourceWidth - 1);
        const x0 = Math.floor(sx);
        const x1 = Math.min(x0 + 1, sourceWidth - 1);
        const fx = sx - x0;

        for (let c = 0; c < channels; c++)
        {
          const top = from[y0 * fromPitch + x0 * channels + c] * (1 - fx) + from[y0 * fromPitch + x1 * channels + c] * fx;
          const bottom = from[y1 * fromPitch + x0 * channels + c] * (1 - fx) + from[y1 * fromPitch + x1 * channels + c] * fx;
          to[y * toPitch + x * channels + c] = Math.round(top * (1 - fy) + bottom * fy);
        }
      }
    }
    return result;
  }

}

CjsSchema.define(CjsTexturePipelineStepResize, {
  className: "CjsTexturePipelineStepResize", family: "resources",
  fields: {
    width: [ edit.persist, type.uint32 ],
    height: [ edit.persist, type.uint32 ],
    paths: [ edit.persist, type.list("string") ]
  },
  methods: {
    GetResourceDependencies: impl.custom,
    Execute: impl.custom,
    resample: impl.custom
  }
});
