// Not Carbon. A texture-pipeline step of our own, registered in
// /docs/architecture/non-carbon-extensions.md.
import { CjsSchema, edit, impl, type } from "#schema";
import { CjsModel } from "#model";
import { HostBitmap } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { CjsImageFormat } from "../format/CjsImageFormat.js";

/**
 * Converts the pipeline's INPUTS to one pixel format before a later step reads
 * them - block formats decoded - so a `Pack` over EVE's compressed maps works.
 *
 * Carbon's `Tr2TexturePipelineStepPack` reads raw bytes and refuses block
 * formats, so in Carbon a pack of DXT1/BC4 sources fails. We decode on the CPU
 * because a browser cannot read a compressed texture back from the GPU.
 *
 * Each converted input is a COPY that replaces its entry in the pipeline's
 * `inputs` map, so the cached source bitmap is never changed.
 */
export class CjsTexturePipelineStepConvert extends CjsModel
{

  /** The pixel format every named input is converted to. */
  format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;

  /** Input paths to convert; empty converts every input. */
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
   * Replace each named input with a converted copy.
   *
   * @param {HostBitmap} _bitmap The pipeline's bitmap (unused).
   * @param {Map<string, HostBitmap>} inputs Loaded inputs by path; entries are replaced.
   * @returns {boolean} False when an input is missing or cannot be converted.
   */
  Execute(_bitmap, inputs)
  {
    for (const path of this.paths.length ? this.paths : [ ...inputs.keys() ])
    {
      const source = inputs.get(path);

      if (!source) return false;
      if (source.GetFormat() === this.format) continue;

      const copy = new HostBitmap();
      if (!copy.CreateFromBitmapDimensions(source)) return false;
      copy.GetRawData().set(source.GetRawData());

      if (!CjsImageFormat.convertImage(copy, this.format)) return false;

      inputs.set(path, copy);
    }
    return true;
  }

}

CjsSchema.define(CjsTexturePipelineStepConvert, {
  className: "CjsTexturePipelineStepConvert", family: "resources",
  fields: {
    format: [ edit.persist, type.int32, type.enum("PixelFormat") ],
    paths: [ edit.persist, type.list("string") ]
  },
  methods: {
    GetResourceDependencies: impl.custom,
    Execute: impl.custom
  }
});
