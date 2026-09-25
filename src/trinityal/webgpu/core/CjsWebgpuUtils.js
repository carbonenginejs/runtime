// Source: trinity/trinityal/metal/MetalUtils.h
//   trinity/trinityal/metal/MetalUtils.mm:12-133, 353-357
//
// The WebGPU backend's translation tables, modelled on Metal's. Carbon's
// Metal backend owns one `MetalUtils` on its context (`MetalContext.h:34`)
// and reaches it as `metalContext->m_utils->GetMTLPixelFormat(...)`. Our
// render context plays `MetalContext`'s part, so it owns this one as
// `m_utils`. D3D needs no such table: Carbon's pixel format values are DXGI's.
//
// Only the pixel format table is ported so far. Metal's other translations
// (vertex format, texture type, cull mode, blend, compare, stencil, colour
// write) belong here as they are needed.
import { CjsSchema } from "#schema";
import { PixelFormat } from "#consts/render-context";

const { PIXEL_FORMAT_SENTINEL } = PixelFormat;

/**
 * Carbon's pixel format to the `GPUTextureFormat` a texture is created with.
 *
 * Metal's table (`MetalUtils.mm:12-121`), entry for entry. Where Metal has a
 * format that core WebGPU does not (16-bit unorm/snorm, A8, the packed-stencil
 * depth format behind an optional feature), the entry is absent, which is
 * Metal's `MTLPixelFormatInvalid`: the texture is refused.
 *
 * One entry differs from Metal on purpose. Metal maps `D24_UNORM_S8_UINT` to
 * `Depth32Float` because Apple GPUs lack a 24-bit depth format; WebGPU has
 * `depth24plus-stencil8` in core, which keeps the stencil.
 */
const PIXEL_FORMATS = [
  [ PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT, "rgba32float" ],
  [ PixelFormat.PIXEL_FORMAT_R32G32B32A32_UINT, "rgba32uint" ],
  [ PixelFormat.PIXEL_FORMAT_R32G32B32A32_SINT, "rgba32sint" ],
  [ PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT, "rgba16float" ],
  [ PixelFormat.PIXEL_FORMAT_R16G16B16A16_UINT, "rgba16uint" ],
  [ PixelFormat.PIXEL_FORMAT_R16G16B16A16_SINT, "rgba16sint" ],
  [ PixelFormat.PIXEL_FORMAT_R32G32_FLOAT, "rg32float" ],
  [ PixelFormat.PIXEL_FORMAT_R32G32_UINT, "rg32uint" ],
  [ PixelFormat.PIXEL_FORMAT_R32G32_SINT, "rg32sint" ],
  [ PixelFormat.PIXEL_FORMAT_R10G10B10A2_UNORM, "rgb10a2unorm" ],
  [ PixelFormat.PIXEL_FORMAT_R10G10B10A2_UINT, "rgb10a2uint" ],
  [ PixelFormat.PIXEL_FORMAT_R11G11B10_FLOAT, "rg11b10ufloat" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, "rgba8unorm" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB, "rgba8unorm-srgb" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8B8A8_UINT, "rgba8uint" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8B8A8_SNORM, "rgba8snorm" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8B8A8_SINT, "rgba8sint" ],
  [ PixelFormat.PIXEL_FORMAT_R16G16_FLOAT, "rg16float" ],
  [ PixelFormat.PIXEL_FORMAT_R16G16_UINT, "rg16uint" ],
  [ PixelFormat.PIXEL_FORMAT_R16G16_SINT, "rg16sint" ],
  [ PixelFormat.PIXEL_FORMAT_D32_FLOAT, "depth32float" ],
  [ PixelFormat.PIXEL_FORMAT_R32_FLOAT, "r32float" ],
  [ PixelFormat.PIXEL_FORMAT_R32_UINT, "r32uint" ],
  [ PixelFormat.PIXEL_FORMAT_R32_SINT, "r32sint" ],
  [ PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT, "depth24plus-stencil8" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8_UNORM, "rg8unorm" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8_UINT, "rg8uint" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8_SNORM, "rg8snorm" ],
  [ PixelFormat.PIXEL_FORMAT_R8G8_SINT, "rg8sint" ],
  [ PixelFormat.PIXEL_FORMAT_R16_FLOAT, "r16float" ],
  [ PixelFormat.PIXEL_FORMAT_D16_UNORM, "depth16unorm" ],
  [ PixelFormat.PIXEL_FORMAT_R16_UINT, "r16uint" ],
  [ PixelFormat.PIXEL_FORMAT_R16_SINT, "r16sint" ],
  [ PixelFormat.PIXEL_FORMAT_R8_UNORM, "r8unorm" ],
  [ PixelFormat.PIXEL_FORMAT_R8_UINT, "r8uint" ],
  [ PixelFormat.PIXEL_FORMAT_R8_SNORM, "r8snorm" ],
  [ PixelFormat.PIXEL_FORMAT_R8_SINT, "r8sint" ],
  [ PixelFormat.PIXEL_FORMAT_R9G9B9E5_SHAREDEXP, "rgb9e5ufloat" ],
  [ PixelFormat.PIXEL_FORMAT_BC1_UNORM, "bc1-rgba-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC1_UNORM_SRGB, "bc1-rgba-unorm-srgb" ],
  [ PixelFormat.PIXEL_FORMAT_BC2_UNORM, "bc2-rgba-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC2_UNORM_SRGB, "bc2-rgba-unorm-srgb" ],
  [ PixelFormat.PIXEL_FORMAT_BC3_UNORM, "bc3-rgba-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC3_UNORM_SRGB, "bc3-rgba-unorm-srgb" ],
  [ PixelFormat.PIXEL_FORMAT_BC4_UNORM, "bc4-r-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC4_SNORM, "bc4-r-snorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC5_UNORM, "bc5-rg-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC5_SNORM, "bc5-rg-snorm" ],
  [ PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, "bgra8unorm" ],
  // BGRX has no WebGPU format any more than a Metal one; Metal reads it as
  // BGRA and ignores the fourth byte, and so does this.
  [ PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM, "bgra8unorm" ],
  [ PixelFormat.PIXEL_FORMAT_B8G8R8A8_TYPELESS, "bgra8unorm" ],
  [ PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB, "bgra8unorm-srgb" ],
  [ PixelFormat.PIXEL_FORMAT_B8G8R8X8_TYPELESS, "bgra8unorm" ],
  [ PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB, "bgra8unorm-srgb" ],
  [ PixelFormat.PIXEL_FORMAT_BC6H_UF16, "bc6h-rgb-ufloat" ],
  [ PixelFormat.PIXEL_FORMAT_BC6H_SF16, "bc6h-rgb-float" ],
  [ PixelFormat.PIXEL_FORMAT_BC7_UNORM, "bc7-rgba-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC7_UNORM_SRGB, "bc7-rgba-unorm-srgb" ]
];

/**
 * The linear formats Metal makes an sRGB view of, and the view's format
 * (`MetalContext.mm:342-357`, where Metal adds one to the format).
 */
const SRGB_VIEW_FORMATS = new Map([
  [ "rgba8unorm", "rgba8unorm-srgb" ],
  [ "bgra8unorm", "bgra8unorm-srgb" ],
  [ "bc1-rgba-unorm", "bc1-rgba-unorm-srgb" ],
  [ "bc2-rgba-unorm", "bc2-rgba-unorm-srgb" ],
  [ "bc3-rgba-unorm", "bc3-rgba-unorm-srgb" ],
  [ "bc7-rgba-unorm", "bc7-rgba-unorm-srgb" ]
]);

/** The WebGPU backend's counterpart of Metal's `MetalUtils`. */
export class CjsWebgpuUtils
{

  /** Carbon's pixel format to `GPUTextureFormat`, indexed by format; null is refused. */
  _pixelFormatConversionTable = new Array(PIXEL_FORMAT_SENTINEL).fill(null);

  /** Builds the tables, as `MetalUtils::MetalUtils` does (`MetalUtils.mm:353-357`). */
  constructor()
  {
    this.SetupPixelFormatConversionTable();
  }

  /**
   * The `GPUTextureFormat` for a Carbon pixel format, as
   * `MetalUtils::GetMTLPixelFormat` (`MetalUtils.mm:124-133`).
   *
   * @param {number} pixelFormat A Carbon `PixelFormat`.
   * @returns {string|null} The format, or null when WebGPU has none.
   */
  GetGPUTextureFormat(pixelFormat)
  {
    return pixelFormat >= 0 && pixelFormat < PIXEL_FORMAT_SENTINEL
      ? this._pixelFormatConversionTable[pixelFormat]
      : null;
  }

  /**
   * The format of a texture's sRGB view, the format half of
   * `MetalContext::CreateSRGBViewOfMetalTexture` (`MetalContext.mm:342-357`).
   * WebGPU must list a view format when the texture is created, so the format
   * is needed before any view exists.
   *
   * @param {string} format A linear `GPUTextureFormat`.
   * @returns {string|null} The sRGB view format, or null when there is none.
   */
  GetSRGBViewFormat(format)
  {
    return SRGB_VIEW_FORMATS.get(format) ?? null;
  }

  /** Fills the pixel format table (`MetalUtils.mm:12-121`). */
  SetupPixelFormatConversionTable()
  {
    this._pixelFormatConversionTable.fill(null);

    for (const [ pixelFormat, format ] of PIXEL_FORMATS)
    {
      this._pixelFormatConversionTable[pixelFormat] = format;
    }
  }

}

// Declared as a call, as the other AL classes are: the layer is imported
// straight from source by its tests.
CjsSchema.define(CjsWebgpuUtils, { className: "CjsWebgpuUtils", modelledOn: "MetalUtils" });
