// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
//   trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.cpp
// Schema: format-carbon resources/Tr2TexturePipelineStepPack.json; maintained by the runtime resource layer.
//
// Carbon's private static `Pack` (h:47, cpp:181-207) is ported as the static
// `pack`: a per-channel byte interleaver whose independent pixel and row
// strides exist because the inputs are separate host bitmaps with their own
// formats and mip pitches.
import * as CcpLog from "../../global/logging/ccpLog.js";
import { CjsSchema, meta } from "#schema";
import { GetBytesPerPixel, PixelFormat, TextureType } from "#consts/render-context";

// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h:26
const s_texturePipelineChannel = CcpLog.CCP_LOG_DEFINE_CHANNEL("TexturePipeline", "trinity");

/** Persisted pipeline-step record mirroring Carbon's pack step, naming the target pixel format and the four per-channel pack sources. */
export class Tr2TexturePipelineStepPack
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  format = 87;

  /** m_a (PTr2TexturePackChannel) [READ, PERSIST] */
  a = null;

  /** m_b (PTr2TexturePackChannel) [READ, PERSIST] */
  b = null;

  /** m_g (PTr2TexturePackChannel) [READ, PERSIST] */
  g = null;

  /** m_r (PTr2TexturePackChannel) [READ, PERSIST] */
  r = null;

  /**
   * Carbon GetResourceDependencies (cpp:39-57), the ITr2TexturePipelineStep
   * virtual: insert each channel's non-empty path into the caller's set.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set, for the caller that omitted it.
   */
  GetResourceDependencies(resources = new Set())
  {
    for (const channel of [ this.r, this.g, this.b, this.a ])
    {
      if (channel?.path) resources.add(String(channel.path));
    }
    return resources;
  }

  /**
   * Carbon Execute (cpp:60-179): pack up to four single-byte channels, each
   * from its own input bitmap or a constant fill, into one bitmap.
   *
   * diverged, both from Carbon imageio issue 2:
   * Carbon's format switch tests `PIXEL_FORMAT_R8_UINT` while the guard above
   * it accepts `R8_UNORM`, so an R8 pack falls to the default and writes four
   * bytes per pixel into a one-byte-per-pixel bitmap - a heap overflow. And
   * its BGRX case writes three bytes per pixel into a four-byte pixel, so
   * every pixel after the first is shifted. Here R8 is tested as declared and
   * the destination advances by its own pixel size.
   *
   * @param {import("#imageio").HostBitmap} bitmap The pipeline's bitmap.
   * @param {Map<string, import("#imageio").HostBitmap>} inputs Loaded inputs by path.
   * @returns {boolean} Whether the step succeeded.
   */
  Execute(bitmap, inputs)
  {
    const F = PixelFormat;
    if (bitmap.IsValid())
    {
      // Carbon's pack step also uses the StepLoad wording.
      CcpLog.CCP_LOGWARN_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepLoad: output bitmap is not empty");
    }

    if (this.format !== F.PIXEL_FORMAT_B8G8R8A8_UNORM
      && this.format !== F.PIXEL_FORMAT_B8G8R8X8_UNORM
      && this.format !== F.PIXEL_FORMAT_R8_UNORM)
    {
      CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepPack: only supports b8g8r8a8, b8g8r8 and r8 textures");
      return false;
    }

    // Carbon's channel order is b, g, r, a (cpp:72).
    const channels = [ this.b, this.g, this.r, this.a ];
    const channelInputs = [];

    for (const channel of channels)
    {
      const path = channel?.path ? String(channel.path) : "";
      if (!path) { channelInputs.push(null); continue; }

      const input = inputs?.get(path) ?? null;

      if (!input)
      {
        CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepPack: failed to get input texture %S", path);
        return false;
      }

      channelInputs.push(input);
    }

    let width = 4;
    let height = 4;
    let mips = 1;
    let defaultSize = true;

    for (const [inputIndex, input] of channelInputs.entries())
    {
      if (!input) continue;

      if (input.GetArraySize() > 1)
      {
        CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepPack: no support for texture arrays");
        return false;
      }
      if (input.GetType() !== TextureType.TEX_TYPE_2D)
      {
        CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepPack: only supports 2D textures");
        return false;
      }

      const format = input.GetFormat();
      if (format !== F.PIXEL_FORMAT_B8G8R8A8_UNORM
        && format !== F.PIXEL_FORMAT_B8G8R8X8_UNORM
        && format !== F.PIXEL_FORMAT_R8_UNORM)
      {
        CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepPack: only supports b8g8r8a8, b8g8r8 and r8 textures");
        return false;
      }

      if (defaultSize)
      {
        width = input.GetWidth();
        height = input.GetHeight();
        mips = input.GetTrueMipCount();
        defaultSize = false;
        continue;
      }

      if (width !== input.GetWidth() || height !== input.GetHeight())
      {
        CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepPack: inconsistent texture size for %S", channels[inputIndex].path);
        return false;
      }

      mips = Math.min(mips, input.GetTrueMipCount());
    }

    if (!bitmap.Create(width, height, mips, this.format))
    {
      CcpLog.CCP_LOGERR_CH(s_texturePipelineChannel, "Tr2TexturePipelineStepPack: failed to create output");
      return false;
    }

    for (let mip = 0; mip < mips; ++mip)
    {
      const sources = channelInputs.map((input, index) =>
      {
        const channel = channels[index];
        if (!input) return { pixelStride: 0, rowStride: 0, data: new Uint8Array([ channel?.fill ?? 0 ]), offset: 0 };

        const pixelStride = GetBytesPerPixel(input.GetFormat());

        return {
          pixelStride,
          rowStride: input.GetMipPitch(mip),
          data: input.GetMipRawData(mip),
          offset: Math.min(pixelStride - 1, Tr2TexturePipelineStepPack.swapRedBlue(channel?.channel ?? 0))
        };
      });

      let sourceCount = 4;

      // diverged: Carbon tests PIXEL_FORMAT_R8_UINT here, which the guard above rejects (issue 2).
      if (this.format === F.PIXEL_FORMAT_R8_UNORM)
      {
        sourceCount = 1;
        const first = sources[0];
        sources[0] = sources[2];
        sources[2] = first;
      }
      else if (this.format === F.PIXEL_FORMAT_B8G8R8X8_UNORM)
      {
        sourceCount = 3;
      }

      Tr2TexturePipelineStepPack.pack(bitmap, sources, sourceCount, mip);
    }

    return true;
  }

  /**
   * Carbon's SwapRedBlue (cpp:10-21): a channel index is authored in RGBA
   * order and read from BGRA memory.
   *
   * @param {number} channel Authored channel index.
   * @returns {number} Byte index within the pixel.
   */
  static swapRedBlue(channel)
  {
    if (channel === 0) return 2;
    if (channel === 2) return 0;
    return channel;
  }

  /**
   * Carbon's Pack (cpp:181-207): write one byte per channel per pixel.
   *
   * diverged: the destination advances by the output's own bytes per pixel,
   * so a BGRX output leaves its X byte alone instead of shifting every pixel
   * after the first (issue 2).
   *
   * @param {import("#imageio").HostBitmap} bitmap Destination bitmap.
   * @param {object[]} channels Four sources: data, offset, pixelStride, rowStride.
   * @param {number} channelCount How many of them to write per pixel.
   * @param {number} mip Mip level being packed.
   */
  static pack(bitmap, channels, channelCount, mip)
  {
    const width = bitmap.GetMipWidth(mip);
    const height = bitmap.GetMipHeight(mip);
    const pitch = bitmap.GetMipPitch(mip);
    const destination = bitmap.GetMipRawData(mip);
    const destinationStride = GetBytesPerPixel(bitmap.GetFormat());
    const rows = channels.map(channel => channel.offset);

    for (let y = 0; y < height; ++y)
    {
      const source = [ ...rows ];
      let target = y * pitch;

      for (let x = 0; x < width; ++x)
      {
        for (let c = 0; c < channelCount; ++c)
        {
          destination[target + c] = channels[c].data[source[c]];
          source[c] += channels[c].pixelStride;
        }
        target += destinationStride;
      }

      for (let c = 0; c < 4; ++c) rows[c] += channels[c].rowStride;
    }
  }

}

CjsSchema.define(Tr2TexturePipelineStepPack, {
  className: "Tr2TexturePipelineStepPack", family: "resources",
  fields: {
    format: [ meta.blue.persist, meta.type.int32, meta.type.enum("PixelFormat") ],
    a: [ meta.blue.persist, meta.type.objectRef("Tr2TexturePackChannel") ],
    b: [ meta.blue.persist, meta.type.objectRef("Tr2TexturePackChannel") ],
    g: [ meta.blue.persist, meta.type.objectRef("Tr2TexturePackChannel") ],
    r: [ meta.blue.persist, meta.type.objectRef("Tr2TexturePackChannel") ]
  },
  methods: {
    GetResourceDependencies: meta.implemented,
    Execute: [ meta.blue.method, meta.adapted, meta.reason("Carbon's R8 case tests a format its own guard rejects (a heap overflow) and its BGRX case shifts every pixel after the first; both fixed (issue 2).") ],
    swapRedBlue: [ meta.blue.method, meta.implemented ],
    pack: [ meta.blue.method, meta.adapted, meta.reason("The destination advances by the output's bytes per pixel, so a BGRX output is not shifted (issue 2).") ]
  }
});
