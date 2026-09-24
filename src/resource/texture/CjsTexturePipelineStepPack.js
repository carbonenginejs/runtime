// Not Carbon. A texture-pipeline step of our own, registered in
// /docs/architecture/non-carbon-extensions.md.
import { CjsSchema, edit, impl, type } from "#schema";
import { HostBitmap } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { Tr2TexturePipelineStepPack } from "./Tr2TexturePipelineStepPack.js";

/**
 * Our packer: Carbon's `Tr2TexturePipelineStepPack`, plus output formats
 * Carbon's does not write.
 *
 * Carbon's Pack writes BGRA, BGRX or R8. A pair of channels packed into BGRA
 * costs four bytes a texel to carry two; this writes `PIXEL_FORMAT_R8G8_UNORM`
 * at two (operator ruling, 2026-09-24). Carbon's formats pass straight through
 * to Carbon's step, which is left exactly as Carbon has it.
 *
 * Same records as Carbon's: r, g, b and a are `Tr2TexturePackChannel`s. For RG8
 * only r and g are written.
 */
export class CjsTexturePipelineStepPack extends Tr2TexturePipelineStepPack
{

  /**
   * Pack the channels; RG8 here, every other format by Carbon's step.
   *
   * RG8 is built from Carbon's own BGRA pack - whose red and green bytes are
   * the r and g channels - so input lookup, size checks and mips are Carbon's.
   *
   * @param {HostBitmap} bitmap The pipeline's bitmap.
   * @param {Map<string, HostBitmap>} inputs Loaded inputs by path.
   * @param {object} [params] Pipeline parameters.
   * @returns {boolean} Whether the step succeeded.
   */
  Execute(bitmap, inputs, params)
  {
    if (this.format !== PixelFormat.PIXEL_FORMAT_R8G8_UNORM) return super.Execute(bitmap, inputs, params);

    const bgra = new HostBitmap();
    const format = this.format;

    this.format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;
    const packed = super.Execute(bgra, inputs, params);
    this.format = format;

    if (!packed) return false;

    const mips = bgra.GetTrueMipCount();

    if (!bitmap.Create(bgra.GetWidth(), bgra.GetHeight(), mips, format)) return false;

    for (let mip = 0; mip < mips; mip++)
    {
      const from = bgra.GetMipRawData(mip);
      const fromPitch = bgra.GetMipPitch(mip);
      const to = bitmap.GetMipRawData(mip);
      const toPitch = bitmap.GetMipPitch(mip);

      for (let y = 0; y < bgra.GetMipHeight(mip); y++)
      {
        for (let x = 0; x < bgra.GetMipWidth(mip); x++)
        {
          // BGRA memory: red is byte 2, green byte 1.
          to[y * toPitch + x * 2] = from[y * fromPitch + x * 4 + 2];
          to[y * toPitch + x * 2 + 1] = from[y * fromPitch + x * 4 + 1];
        }
      }
    }
    return true;
  }

}

CjsSchema.define(CjsTexturePipelineStepPack, {
  className: "CjsTexturePipelineStepPack", family: "resources",
  fields: {
    format: [ edit.persist, type.int32, type.enum("PixelFormat") ]
  },
  methods: {
    Execute: impl.custom
  }
});
