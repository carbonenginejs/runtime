// Source: trinity/trinityal/dx11/Tr2TextureALDx11.h
// Source: trinity/trinityal/dx11/Tr2TextureALDx11.cpp
// Source: trinity/trinityal/include/Tr2TextureAL.h
//
// The WebGL2 texture, ported from dx11.
//
// Creation keeps every refusal dx11 makes, in dx11's order
// (`Tr2TextureALDx11.cpp:339-400`), because each is a request no backend should
// honour. What changes is what a texture IS on WebGL2:
//
// - VIEWS. D3D11 creates shader-resource views over one resource - a linear
//   view and an sRGB view (`CreateViews`, `:530-590`). WebGL2 has no texture
//   views, so a texture is created in its description's format and the other
//   colour space needs a second texture holding the same pixels. Carbon makes
//   exactly that copy itself when a device cannot view one texture both ways
//   (the WARP BC7 workaround, `:417-452`), and falls back to the linear view
//   when an sRGB view cannot be made (`:578-582`). This backend does both: the
//   sRGB twin is built on first request from the initial data it was created
//   with, and a texture that has no initial data to build one from (a render
//   target, one written later) answers the linear texture for both.
// - MULTISAMPLING. WebGL2 has no multisampled textures, only multisampled
//   renderbuffers, which a shader cannot read. A multisampled texture is
//   therefore a renderbuffer, resolved with `blitFramebuffer`, and one that
//   also asks to be a shader resource is refused.
// - BC FORMATS. S3TC, RGTC and BPTC arrive as WebGL extensions, and no
//   extension lets a compressed format fill a `TEXTURE_3D`. Where the device
//   cannot take the blocks, they are decompressed on the CPU - Metal's rule for
//   the same gap (`Tr2TextureALMetal.mm:166-186`), widened to a missing
//   extension. The DECODER is not Metal's, deliberately (operator, 2026-09-27):
//   Carbon's `BcDecompress` is a CPU helper only its Mac client runs, and it
//   carries CE-36 and CE-37. EVE on PC decodes BC in D3D11 hardware, to the
//   specification, so this uses the DDS format's spec decoder
//   (`CjsDdsFormat.decodeBlockSlice`): RGBA8 for BC1-BC5 and BC7, RGBA float
//   for BC6H. Copying Metal's helper would put the Mac client's defects on
//   every platform.
// - BGRA. WebGL2 has no BGRA texture format; BGRA and BGRX data is swizzled to
//   RGBA on upload and back on read.
// - NO UNORDERED ACCESS, and no 1D textures: a 1D texture is a 2D texture one
//   row high.
//
// TWO dx11 METHODS ARE NOT PORTED, and why:
//
// - `GetResourceDx11` is dx11's name for the native-resource accessor; here it
//   is `GetGpuResource`, the name the dx11 BUFFER uses for the same thing.
// - `Attach` adopts an existing `ID3D11Texture2D` - the swap chain's back
//   buffer. WebGL2 presents through the canvas's default framebuffer, which
//   is not a texture, so there is nothing to attach; the swap chain draws to
//   that framebuffer directly.

import { CjsSchema, impl } from "#schema";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { CjsDdsFormat } from "../../resource/formats/dds/CjsDdsFormat.js";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { Crop, Tr2MsaaDesc, Tr2TextureSubresource } from "../Tr2HalHelperStructures/index.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { CopyRegion } from "../stub/Tr2TextureALStub.js";
import {
  Tr2ColorSpace,
  GetBytesPerPixel,
  HasBufferFlags,
  HasFlag,
  IsCompressedFormat,
  IsWritable,
  MakeSrgb,
  PixelFormat,
  PixelFormatFromCanonical,
  TextureType,
  Tr2CpuUsage,
  Tr2GpuUsage
} from "../../global/consts/renderContext/index.js";


/** Carbon's "no descriptor heap index". */
const NO_HEAP_INDEX = 0xffffffff;

const F = PixelFormat;

/**
 * The DDS format's name for each BC pixel format, which `decodeBlockSlice` is
 * addressed by: `PixelFormatFromCanonical` inverted, with each TYPELESS format
 * read as its UNORM member.
 */
const CANONICAL_BC = new Map([
  ...Object.entries(PixelFormatFromCanonical).filter(([ name ]) => name.startsWith("bc")).map(([ name, format ]) => [ format, name ]),
  [ PixelFormat.PIXEL_FORMAT_BC1_TYPELESS, "bc1-rgba-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC2_TYPELESS, "bc2-rgba-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC3_TYPELESS, "bc3-rgba-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC4_TYPELESS, "bc4-r-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC5_TYPELESS, "bc5-rg-unorm" ],
  [ PixelFormat.PIXEL_FORMAT_BC6H_TYPELESS, "bc6h-rgb-ufloat" ],
  [ PixelFormat.PIXEL_FORMAT_BC7_TYPELESS, "bc7-rgba-unorm" ]
]);

/** WebGL extension names for the compressed families. */
const S3TC = "WEBGL_compressed_texture_s3tc";
const S3TC_SRGB = "WEBGL_compressed_texture_s3tc_srgb";
const RGTC = "EXT_texture_compression_rgtc";
const BPTC = "EXT_texture_compression_bptc";

/**
 * Compressed internal formats, by pixel format: the extension enum values
 * from the WebGL extension registry.
 */
const COMPRESSED = new Map([
  [ F.PIXEL_FORMAT_BC1_TYPELESS, { internalFormat: 0x83f1, extension: S3TC } ],
  [ F.PIXEL_FORMAT_BC1_UNORM, { internalFormat: 0x83f1, extension: S3TC } ],
  [ F.PIXEL_FORMAT_BC1_UNORM_SRGB, { internalFormat: 0x8c4d, extension: S3TC_SRGB } ],
  [ F.PIXEL_FORMAT_BC2_TYPELESS, { internalFormat: 0x83f2, extension: S3TC } ],
  [ F.PIXEL_FORMAT_BC2_UNORM, { internalFormat: 0x83f2, extension: S3TC } ],
  [ F.PIXEL_FORMAT_BC2_UNORM_SRGB, { internalFormat: 0x8c4e, extension: S3TC_SRGB } ],
  [ F.PIXEL_FORMAT_BC3_TYPELESS, { internalFormat: 0x83f3, extension: S3TC } ],
  [ F.PIXEL_FORMAT_BC3_UNORM, { internalFormat: 0x83f3, extension: S3TC } ],
  [ F.PIXEL_FORMAT_BC3_UNORM_SRGB, { internalFormat: 0x8c4f, extension: S3TC_SRGB } ],
  [ F.PIXEL_FORMAT_BC4_TYPELESS, { internalFormat: 0x8dbb, extension: RGTC } ],
  [ F.PIXEL_FORMAT_BC4_UNORM, { internalFormat: 0x8dbb, extension: RGTC } ],
  [ F.PIXEL_FORMAT_BC4_SNORM, { internalFormat: 0x8dbc, extension: RGTC } ],
  [ F.PIXEL_FORMAT_BC5_TYPELESS, { internalFormat: 0x8dbd, extension: RGTC } ],
  [ F.PIXEL_FORMAT_BC5_UNORM, { internalFormat: 0x8dbd, extension: RGTC } ],
  [ F.PIXEL_FORMAT_BC5_SNORM, { internalFormat: 0x8dbe, extension: RGTC } ],
  [ F.PIXEL_FORMAT_BC6H_TYPELESS, { internalFormat: 0x8e8f, extension: BPTC } ],
  [ F.PIXEL_FORMAT_BC6H_UF16, { internalFormat: 0x8e8f, extension: BPTC } ],
  [ F.PIXEL_FORMAT_BC6H_SF16, { internalFormat: 0x8e8e, extension: BPTC } ],
  [ F.PIXEL_FORMAT_BC7_TYPELESS, { internalFormat: 0x8e8c, extension: BPTC } ],
  [ F.PIXEL_FORMAT_BC7_UNORM, { internalFormat: 0x8e8c, extension: BPTC } ],
  [ F.PIXEL_FORMAT_BC7_UNORM_SRGB, { internalFormat: 0x8e8d, extension: BPTC } ]
]);

/**
 * The WebGL2 layout of an uncompressed pixel format.
 *
 * Typeless formats take the layout their typed members share; a typeless
 * format a depth-stencil texture is made from takes the depth layout (dx11
 * makes such textures typeless so it can view them both ways).
 *
 * @param {WebGL2RenderingContext} gl The context whose enums to use.
 * @param {number} format A `PixelFormat` value.
 * @param {boolean} depthStencil Whether the texture is a depth-stencil target.
 * @returns {{internalFormat: number, format: number, type: number, bgra: boolean}|null}
 *   The layout, or null for a format WebGL2 cannot hold.
 */
export function UncompressedLayout(gl, format, depthStencil)
{
  const L = (internalFormat, glFormat, type, bgra = false) => ({ internalFormat, format: glFormat, type, bgra });

  if (depthStencil)
  {
    switch (format)
    {
      case F.PIXEL_FORMAT_D32_FLOAT:
      case F.PIXEL_FORMAT_R32_TYPELESS:
        return L(gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT);
      case F.PIXEL_FORMAT_D24_UNORM_S8_UINT:
      case F.PIXEL_FORMAT_R24G8_TYPELESS:
        return L(gl.DEPTH24_STENCIL8, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8);
      case F.PIXEL_FORMAT_D16_UNORM:
      case F.PIXEL_FORMAT_R16_TYPELESS:
        return L(gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT);
      case F.PIXEL_FORMAT_D32_FLOAT_S8X24_UINT:
      case F.PIXEL_FORMAT_R32G8X24_TYPELESS:
        return L(gl.DEPTH32F_STENCIL8, gl.DEPTH_STENCIL, gl.FLOAT_32_UNSIGNED_INT_24_8_REV);
      default:
        return null;
    }
  }

  switch (format)
  {
    case F.PIXEL_FORMAT_R32G32B32A32_TYPELESS:
    case F.PIXEL_FORMAT_R32G32B32A32_FLOAT: return L(gl.RGBA32F, gl.RGBA, gl.FLOAT);
    case F.PIXEL_FORMAT_R32G32B32A32_UINT: return L(gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT);
    case F.PIXEL_FORMAT_R32G32B32A32_SINT: return L(gl.RGBA32I, gl.RGBA_INTEGER, gl.INT);
    case F.PIXEL_FORMAT_R32G32B32_TYPELESS:
    case F.PIXEL_FORMAT_R32G32B32_FLOAT: return L(gl.RGB32F, gl.RGB, gl.FLOAT);
    case F.PIXEL_FORMAT_R16G16B16A16_TYPELESS:
    case F.PIXEL_FORMAT_R16G16B16A16_FLOAT: return L(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    case F.PIXEL_FORMAT_R16G16B16A16_UINT: return L(gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT);
    case F.PIXEL_FORMAT_R16G16B16A16_SINT: return L(gl.RGBA16I, gl.RGBA_INTEGER, gl.SHORT);
    case F.PIXEL_FORMAT_R32G32_TYPELESS:
    case F.PIXEL_FORMAT_R32G32_FLOAT: return L(gl.RG32F, gl.RG, gl.FLOAT);
    case F.PIXEL_FORMAT_R32G32_UINT: return L(gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT);
    case F.PIXEL_FORMAT_R10G10B10A2_TYPELESS:
    case F.PIXEL_FORMAT_R10G10B10A2_UNORM: return L(gl.RGB10_A2, gl.RGBA, gl.UNSIGNED_INT_2_10_10_10_REV);
    case F.PIXEL_FORMAT_R11G11B10_FLOAT: return L(gl.R11F_G11F_B10F, gl.RGB, gl.UNSIGNED_INT_10F_11F_11F_REV);
    case F.PIXEL_FORMAT_R8G8B8A8_TYPELESS:
    case F.PIXEL_FORMAT_R8G8B8A8_UNORM: return L(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    case F.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB: return L(gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE);
    case F.PIXEL_FORMAT_R8G8B8A8_UINT: return L(gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE);
    case F.PIXEL_FORMAT_R8G8B8A8_SNORM: return L(gl.RGBA8_SNORM, gl.RGBA, gl.BYTE);
    case F.PIXEL_FORMAT_R8G8B8A8_SINT: return L(gl.RGBA8I, gl.RGBA_INTEGER, gl.BYTE);
    case F.PIXEL_FORMAT_B8G8R8A8_TYPELESS:
    case F.PIXEL_FORMAT_B8G8R8A8_UNORM:
    case F.PIXEL_FORMAT_B8G8R8X8_TYPELESS:
    case F.PIXEL_FORMAT_B8G8R8X8_UNORM: return L(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, true);
    case F.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB:
    case F.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB: return L(gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, true);
    case F.PIXEL_FORMAT_R16G16_TYPELESS:
    case F.PIXEL_FORMAT_R16G16_FLOAT: return L(gl.RG16F, gl.RG, gl.HALF_FLOAT);
    case F.PIXEL_FORMAT_R16G16_UINT: return L(gl.RG16UI, gl.RG_INTEGER, gl.UNSIGNED_SHORT);
    case F.PIXEL_FORMAT_R32_TYPELESS:
    case F.PIXEL_FORMAT_R32_FLOAT: return L(gl.R32F, gl.RED, gl.FLOAT);
    case F.PIXEL_FORMAT_R32_UINT: return L(gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT);
    case F.PIXEL_FORMAT_R32_SINT: return L(gl.R32I, gl.RED_INTEGER, gl.INT);
    case F.PIXEL_FORMAT_R8G8_TYPELESS:
    case F.PIXEL_FORMAT_R8G8_UNORM: return L(gl.RG8, gl.RG, gl.UNSIGNED_BYTE);
    case F.PIXEL_FORMAT_R8G8_UINT: return L(gl.RG8UI, gl.RG_INTEGER, gl.UNSIGNED_BYTE);
    case F.PIXEL_FORMAT_R8G8_SNORM: return L(gl.RG8_SNORM, gl.RG, gl.BYTE);
    case F.PIXEL_FORMAT_R16_TYPELESS:
    case F.PIXEL_FORMAT_R16_FLOAT: return L(gl.R16F, gl.RED, gl.HALF_FLOAT);
    case F.PIXEL_FORMAT_R16_UINT: return L(gl.R16UI, gl.RED_INTEGER, gl.UNSIGNED_SHORT);
    case F.PIXEL_FORMAT_R16_SINT: return L(gl.R16I, gl.RED_INTEGER, gl.SHORT);
    case F.PIXEL_FORMAT_R8_TYPELESS:
    case F.PIXEL_FORMAT_R8_UNORM: return L(gl.R8, gl.RED, gl.UNSIGNED_BYTE);
    case F.PIXEL_FORMAT_R8_UINT: return L(gl.R8UI, gl.RED_INTEGER, gl.UNSIGNED_BYTE);
    case F.PIXEL_FORMAT_R8_SNORM: return L(gl.R8_SNORM, gl.RED, gl.BYTE);
    case F.PIXEL_FORMAT_R8_SINT: return L(gl.R8I, gl.RED_INTEGER, gl.BYTE);
    case F.PIXEL_FORMAT_R9G9B9E5_SHAREDEXP: return L(gl.RGB9_E5, gl.RGB, gl.UNSIGNED_INT_5_9_9_9_REV);
    case F.PIXEL_FORMAT_B5G6R5_UNORM: return L(gl.RGB565, gl.RGB, gl.UNSIGNED_SHORT_5_6_5);
    default: return null;
  }
}

/** Swaps the R and B bytes of every four-byte pixel, into a new array. */
function SwapRedBlue(source)
{
  const out = new Uint8Array(source.length);
  for (let i = 0; i + 3 < source.length; i += 4)
  {
    out[i] = source[i + 2];
    out[i + 1] = source[i + 1];
    out[i + 2] = source[i];
    out[i + 3] = source[i + 3];
  }
  return out;
}

/** A byte view over any `ArrayBufferView`. */
function BytesOf(view)
{
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

/** The typed array a GL upload of `type` expects, over the same bytes. */
function PixelsFor(gl, type, bytes)
{
  const aligned = bytes.byteOffset % 4 === 0 ? bytes : bytes.slice();
  switch (type)
  {
    case gl.FLOAT: return new Float32Array(aligned.buffer, aligned.byteOffset, aligned.byteLength >>> 2);
    case gl.UNSIGNED_INT:
    case gl.UNSIGNED_INT_24_8:
    case gl.UNSIGNED_INT_2_10_10_10_REV:
    case gl.UNSIGNED_INT_10F_11F_11F_REV:
    case gl.UNSIGNED_INT_5_9_9_9_REV: return new Uint32Array(aligned.buffer, aligned.byteOffset, aligned.byteLength >>> 2);
    case gl.INT: return new Int32Array(aligned.buffer, aligned.byteOffset, aligned.byteLength >>> 2);
    case gl.HALF_FLOAT:
    case gl.UNSIGNED_SHORT:
    case gl.UNSIGNED_SHORT_5_6_5: return new Uint16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength >>> 1);
    case gl.SHORT: return new Int16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength >>> 1);
    case gl.BYTE: return new Int8Array(aligned.buffer, aligned.byteOffset, aligned.byteLength);
    default: return bytes;
  }
}


/**
 * A texture on a WebGL2 device.
 */
export class Tr2TextureALWebgl2 extends Tr2DeviceResourceAL
{
  /**
   * dx11's `DepthOption::Type` (Tr2TextureALDx11.h:71-79): which depth-stencil
   * view `CreateViews` makes, writable or read-only. WebGL2 attaches the
   * texture itself (`AttachToFramebuffer`) and has no views, so nothing here
   * selects one; the vocabulary is kept with the port.
   */
  static DepthOption = Object.freeze({
    READ_WRITE: 0,
    READ_ONLY: 1,
    COUNT: 2
  });

  /** m_texture: the `WebGLTexture`, or null for a multisampled texture. */
  _texture = null;

  /** The multisampled `WebGLRenderbuffer` a multisampled texture is. */
  _renderbuffer = null;

  /** The other colour space's texture, built on first request; see the head comment. */
  _twin = null;

  /** Initial data kept until the twin is built. */
  _twinSource = null;

  /** The texture target: `TEXTURE_2D`, `TEXTURE_2D_ARRAY`, `TEXTURE_CUBE_MAP` or `TEXTURE_3D`. */
  _target = 0;

  /** The GL layout the texture was created in. */
  _layout = null;

  /** Whether the stored pixels are BC data decompressed to RGBA8. */
  _decompressed = false;

  /** m_desc */
  _desc = new Tr2BitmapDimensions();

  /** m_msaa */
  _msaa = new Tr2MsaaDesc();

  /** m_gpuUsage */
  _gpuUsage = Tr2GpuUsage.NONE;

  /** m_cpuUsage */
  _cpuUsage = Tr2CpuUsage.NONE;

  /** The staging bytes of the last read map, kept only when read often. */
  _stagingTexture = null;

  /** m_writeStaging */
  _writeStaging = null;

  /** m_writeBox, and the subresource the write map is for. */
  _writeRegion = null;

  /** A framebuffer for reads and copies, made on first use. */
  _framebuffer = null;

  /** m_name */
  _name = "";

  /** The context the texture was created on. */
  _gl = null;

  /**
   * Creates the texture.
   *
   * The refusals are dx11's in dx11's order (`Tr2TextureALDx11.cpp:339-400`);
   * the three WebGL2 refusals after them are named where they are made.
   *
   * @param {Tr2BitmapDimensions} desc The texture description.
   * @param {object} options Creation options.
   * @param {number} [options.gpuUsage] A `Tr2GpuUsage` bit set.
   * @param {number} [options.cpuUsage] A `Tr2CpuUsage` bit set.
   * @param {Tr2MsaaDesc} [options.msaa] Multisample description.
   * @param {object[]} [options.initialData] Initial subresource data, slices
   *   by mips, as Carbon indexes it.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(desc, options, renderContext)
  {
    this._Reset();

    const {
      gpuUsage = Tr2GpuUsage.NONE,
      cpuUsage = Tr2CpuUsage.NONE,
      msaa = new Tr2MsaaDesc(),
      initialData = null
    } = options;

    if (HasBufferFlags(gpuUsage)) return ALResult.E_INVALIDARG;

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    if (msaa.samples > 1)
    {
      if (HasFlag(gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS)) return ALResult.E_INVALIDARG;
      if (cpuUsage !== Tr2CpuUsage.NONE) return ALResult.E_INVALIDARG;
      if (desc.GetType() !== TextureType.TEX_TYPE_2D) return ALResult.E_INVALIDARG;
    }

    if (desc.GetType() !== TextureType.TEX_TYPE_2D)
    {
      if (desc.GetType() === TextureType.TEX_TYPE_CUBE)
      {
        if (desc.GetArraySize() !== 6) return ALResult.E_INVALIDARG;
      }
      else if (desc.GetArraySize() > 1)
      {
        return ALResult.E_INVALIDARG;
      }
    }

    if (desc.GetType() !== TextureType.TEX_TYPE_2D && HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL)) return ALResult.E_INVALIDARG;
    if (msaa.samples > 1 && desc.GetTrueMipCount() > 1) return ALResult.E_INVALIDARG;
    if (HasFlag(gpuUsage, Tr2GpuUsage.RENDER_TARGET) && HasFlag(cpuUsage, Tr2CpuUsage.WRITE)) return ALResult.E_INVALIDARG;
    if (HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL) && cpuUsage !== Tr2CpuUsage.NONE) return ALResult.E_INVALIDARG;
    if (HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL) && desc.GetTrueMipCount() > 1) return ALResult.E_INVALIDARG;

    // WebGL2: no storage textures, and a multisampled texture is a renderbuffer
    // no shader can read. See the head comment.
    if (HasFlag(gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS)) return ALResult.E_INVALIDARG;
    if (msaa.samples > 1 && HasFlag(gpuUsage, Tr2GpuUsage.SHADER_RESOURCE)) return ALResult.E_INVALIDARG;

    const gl = al.GetWebgl2();
    const format = desc.GetFormat();
    const layout = this._ResolveLayout(gl, desc, gpuUsage);
    if (!layout) return ALResult.E_INVALIDARG;

    this._gl = gl;
    this._layout = layout;
    this._decompressed = layout.decompressed;
    this._desc = desc;
    this._gpuUsage = gpuUsage;
    this._cpuUsage = cpuUsage;
    this._msaa = msaa;

    if (msaa.samples > 1)
    {
      this._renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, msaa.samples, layout.internalFormat, desc.GetWidth(), desc.GetHeight());
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      return ALResult.S_OK;
    }

    this._target = this._TargetOf(gl, desc);
    this._texture = this._CreateStorage(gl, layout, initialData);
    if (!this._texture)
    {
      this.Destroy();
      return ALResult.E_FAIL;
    }

    return this.CreateViews(this._texture, desc, msaa, gpuUsage, cpuUsage, true, renderContext, initialData);
  }

  /**
   * Prepares the views dx11 creates over a texture (`Tr2TextureALDx11.cpp:530-750`).
   *
   * WebGL2 has no view objects. A render target or depth-stencil is attached
   * by the render context directly, so the only view left to prepare is the
   * sRGB shader-resource view, which needs a second texture. It is built on
   * first request from the initial data kept here; see the head comment and
   * `GetShaderResourceTexture`.
   *
   * @param {WebGLTexture} _texture The texture the views are over.
   * @param {Tr2BitmapDimensions} desc The description.
   * @param {Tr2MsaaDesc} _msaa The multisample description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} _cpuUsage A `Tr2CpuUsage` bit set.
   * @param {boolean} createSrgb Whether an sRGB view is wanted, as dx11 is told.
   * @param {object} _renderContext The context.
   * @param {object[]|null} initialData The pixels the sRGB texture is built
   *   from; an addition to dx11's signature, which views the same resource.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  CreateViews(_texture, desc, _msaa, gpuUsage, _cpuUsage, createSrgb, _renderContext, initialData = null)
  {
    const format = desc.GetFormat();

    if (createSrgb && initialData && HasFlag(gpuUsage, Tr2GpuUsage.SHADER_RESOURCE) && MakeSrgb(format) !== format)
    {
      this._twinSource = initialData;
    }

    return ALResult.S_OK;
  }

  /**
   * The layout a description is stored in on this device: its compressed
   * format when the device takes the blocks, RGBA8 decompressed from BC1-BC3
   * when it cannot, or an uncompressed layout.
   *
   * @param {WebGL2RenderingContext} gl The context.
   * @param {Tr2BitmapDimensions} desc The description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} [format] The format to resolve; the description's by default.
   * @returns {object|null} The layout, or null when it cannot be held.
   */
  @impl.custom
  _ResolveLayout(gl, desc, gpuUsage, format = desc.GetFormat())
  {
    if (IsCompressedFormat(format))
    {
      const compressed = COMPRESSED.get(format);
      const volume = desc.GetType() === TextureType.TEX_TYPE_3D;

      if (compressed && !volume && gl.getExtension(compressed.extension))
      {
        return { ...compressed, compressed: true, decompressed: false, bgra: false };
      }

      // The spec decoder; see the head comment for why not Metal's.
      const name = CANONICAL_BC.get(format);
      if (!name || !CjsDdsFormat.canDecodeBlockSlice(name)) return null;

      if (name.startsWith("bc6h-"))
      {
        return { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.FLOAT, compressed: false, decompressed: true, bgra: false, canonical: name };
      }

      return {
        internalFormat: name.endsWith("-srgb") ? gl.SRGB8_ALPHA8 : gl.RGBA8,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        compressed: false,
        decompressed: true,
        bgra: false,
        canonical: name
      };
    }

    const layout = UncompressedLayout(gl, format, HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL));
    return layout ? { ...layout, compressed: false, decompressed: false } : null;
  }

  /** The GL texture target for a description. */
  @impl.custom
  _TargetOf(gl, desc)
  {
    switch (desc.GetType())
    {
      case TextureType.TEX_TYPE_CUBE: return gl.TEXTURE_CUBE_MAP;
      case TextureType.TEX_TYPE_3D: return gl.TEXTURE_3D;
      default: return desc.GetArraySize() > 1 ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D;
    }
  }

  /**
   * Allocates immutable storage for every mip and uploads the initial data,
   * slices by mips as Carbon indexes it (`Tr2TextureALMetal.mm:204-243`).
   *
   * @returns {WebGLTexture|null} The texture.
   */
  @impl.custom
  _CreateStorage(gl, layout, initialData)
  {
    const desc = this._desc;
    const texture = gl.createTexture();
    if (!texture) return null;

    const target = this._target;
    const mips = desc.GetTrueMipCount();
    const previous = gl.getParameter(this._BindingOf(gl, target));

    gl.bindTexture(target, texture);

    if (target === gl.TEXTURE_3D || target === gl.TEXTURE_2D_ARRAY)
    {
      const depth = target === gl.TEXTURE_3D ? desc.GetDepth() : desc.GetArraySize();
      gl.texStorage3D(target, mips, layout.internalFormat, desc.GetWidth(), desc.GetHeight(), depth);
    }
    else
    {
      gl.texStorage2D(target, mips, layout.internalFormat, desc.GetWidth(), desc.GetHeight());
    }

    if (initialData)
    {
      const slices = target === gl.TEXTURE_3D ? 1 : desc.GetArraySize();
      let index = 0;

      for (let slice = 0; slice < slices; ++slice)
      {
        for (let mip = 0; mip < mips; ++mip)
        {
          const data = initialData[index++];
          if (data && data.m_sysMem) this._UploadLevel(gl, layout, texture, slice, mip, null, data.m_sysMem, data.m_sysMemPitch, data.m_sysMemSlicePitch);
        }
      }
    }

    gl.bindTexture(target, previous);
    return texture;
  }

  /** The `getParameter` name of a target's binding. */
  @impl.custom
  _BindingOf(gl, target)
  {
    switch (target)
    {
      case gl.TEXTURE_CUBE_MAP: return gl.TEXTURE_BINDING_CUBE_MAP;
      case gl.TEXTURE_3D: return gl.TEXTURE_BINDING_3D;
      case gl.TEXTURE_2D_ARRAY: return gl.TEXTURE_BINDING_2D_ARRAY;
      default: return gl.TEXTURE_BINDING_2D;
    }
  }

  /**
   * Uploads one subresource, or a box of it, into a texture bound to its target.
   *
   * Decompresses first when the layout says so, swizzles BGRA, and sets the
   * unpack row length from the source pitch.
   *
   * @param {WebGL2RenderingContext} gl The context.
   * @param {object} layout The texture's layout.
   * @param {WebGLTexture} texture The texture, already bound.
   * @param {number} slice Array slice or cube face.
   * @param {number} mip Mip level.
   * @param {object|null} box `{left, top, front, right, bottom, back}`, or null for the whole level.
   * @param {ArrayBufferView} source The pixels.
   * @param {number} pitch Bytes per row (per block row for compressed data).
   * @param {number} slicePitch Bytes per depth slice.
   */
  @impl.custom
  _UploadLevel(gl, layout, texture, slice, mip, box, source, pitch, slicePitch)
  {
    const desc = this._desc;
    const target = this._target;
    const mipWidth = desc.GetMipWidth(mip);
    const mipHeight = desc.GetMipHeight(mip);
    const mipDepth = target === gl.TEXTURE_3D ? desc.GetMipDepth(mip) : 1;
    const x = box ? box.left : 0;
    const y = box ? box.top : 0;
    const z = box ? box.front : 0;
    const width = box ? box.right - box.left : mipWidth;
    const height = box ? box.bottom - box.top : mipHeight;
    const depth = box ? Math.max(1, box.back - box.front) : mipDepth;
    const faceTarget = target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + slice : target;
    const layered = target === gl.TEXTURE_3D || target === gl.TEXTURE_2D_ARRAY;
    const zOffset = target === gl.TEXTURE_2D_ARRAY ? slice : z;

    let bytes = BytesOf(source);

    if (layout.compressed)
    {
      if (layered) gl.compressedTexSubImage3D(target, mip, x, y, zOffset, width, height, depth, layout.internalFormat, bytes);
      else gl.compressedTexSubImage2D(faceTarget, mip, x, y, width, height, layout.internalFormat, bytes);
      return;
    }

    let rowLength = 0;

    if (layout.decompressed)
    {
      bytes = this._DecodeBlocks(layout.canonical, bytes, width, height, depth, pitch, slicePitch);
    }
    else
    {
      const bytesPerPixel = GetBytesPerPixel(desc.GetFormat());
      if (pitch && bytesPerPixel && pitch !== width * bytesPerPixel) rowLength = pitch / bytesPerPixel;
    }

    if (layout.bgra) bytes = SwapRedBlue(bytes);

    const pixels = PixelsFor(gl, layout.type, bytes);

    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, rowLength);
    if (layered) gl.texSubImage3D(target, mip, x, y, zOffset, width, height, depth, layout.format, layout.type, pixels);
    else gl.texSubImage2D(faceTarget, mip, x, y, width, height, layout.format, layout.type, pixels);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
  }

  /**
   * Decodes every depth slice of a compressed level with the DDS format's spec
   * decoder, into one array (bytes for RGBA8, floats for BC6H).
   *
   * @param {string} canonical The DDS format's name for the pixel format.
   * @param {Uint8Array} bytes The blocks.
   * @param {number} width Level width in pixels.
   * @param {number} height Level height in pixels.
   * @param {number} depth Depth slices.
   * @param {number} pitch Bytes per block row.
   * @param {number} slicePitch Bytes per depth slice.
   * @returns {Uint8Array|Float32Array} The decoded pixels.
   */
  @impl.custom
  _DecodeBlocks(canonical, bytes, width, height, depth, pitch, slicePitch)
  {
    const rowPitch = pitch || undefined;
    const slices = [];

    for (let k = 0; k < depth; ++k)
    {
      const slice = depth > 1 ? bytes.subarray(k * slicePitch, (k + 1) * slicePitch) : bytes;
      slices.push(CjsDdsFormat.decodeBlockSlice(slice, { pixelFormat: canonical, width, height, rowPitch }));
    }

    if (slices.length === 1) return slices[0];

    const out = new slices[0].constructor(slices[0].length * slices.length);
    slices.forEach((slice, k) => out.set(slice, k * slice.length));
    return out;
  }

  /**
   * Adopts a texture shared by another device. WebGL2 cannot share textures
   * between contexts.
   *
   * @returns {number} An `ALResult` value.
   */
  OpenShared()
  {
    return ALResult.E_FAIL;
  }

  /** Carbon's impl `Destroy`, before the registry is left. */
  _Reset()
  {
    const gl = this._gl;

    if (gl)
    {
      if (this._texture) gl.deleteTexture(this._texture);
      if (this._twin) gl.deleteTexture(this._twin);
      if (this._renderbuffer) gl.deleteRenderbuffer(this._renderbuffer);
      if (this._framebuffer) gl.deleteFramebuffer(this._framebuffer);
    }

    this._texture = null;
    this._renderbuffer = null;
    this._twin = null;
    this._twinSource = null;
    this._target = 0;
    this._layout = null;
    this._decompressed = false;
    this._desc = new Tr2BitmapDimensions();
    this._msaa = new Tr2MsaaDesc();
    this._gpuUsage = Tr2GpuUsage.NONE;
    this._cpuUsage = Tr2CpuUsage.NONE;
    this._stagingTexture = null;
    this._writeStaging = null;
    this._writeRegion = null;
    this._framebuffer = null;
    this._gl = null;
  }

  /** Releases the texture and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /** Whether the texture exists on the device. */
  IsValid()
  {
    return this._texture !== null || this._renderbuffer !== null;
  }

  /** Which memory class this texture occupies. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /** The texture description. */
  GetDesc()
  {
    return this._desc;
  }

  /** The multisample description. */
  GetMsaaDesc()
  {
    return this._msaa;
  }

  /** The GPU usage. */
  GetGpuUsage()
  {
    return this._gpuUsage;
  }

  /** The CPU usage. */
  GetCpuUsage()
  {
    return this._cpuUsage;
  }

  /** Width of the top mip. */
  GetWidth()
  {
    return this._desc.GetWidth();
  }

  /** Height of the top mip. */
  GetHeight()
  {
    return this._desc.GetHeight();
  }

  /** Depth of the top mip. */
  GetDepth()
  {
    return this._desc.GetDepth();
  }

  /** Mip count as described. */
  GetMipCount()
  {
    return this._desc.GetMipCount();
  }

  /** Mip count as allocated. */
  GetTrueMipCount()
  {
    return this._desc.GetTrueMipCount();
  }

  /** The pixel format. */
  GetFormat()
  {
    return this._desc.GetFormat();
  }

  /** The texture type. */
  GetType()
  {
    return this._desc.GetType();
  }

  /** Array size, six for a cube. */
  GetArraySize()
  {
    return this._desc.GetArraySize();
  }

  /**
   * Bytes in one mip.
   *
   * @param {number} mip Mip level.
   * @returns {number} Size in bytes.
   */
  GetMipSize(mip)
  {
    return this._desc.GetMipSize(mip);
  }

  /**
   * A framebuffer with one subresource of this texture attached for reading.
   *
   * @returns {WebGLFramebuffer} The framebuffer, bound to `READ_FRAMEBUFFER`.
   */
  @impl.custom
  _BindForRead(gl, mip, slice)
  {
    if (!this._framebuffer) this._framebuffer = gl.createFramebuffer();

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._framebuffer);
    this.AttachToFramebuffer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, mip, slice);

    return this._framebuffer;
  }

  /**
   * Maps one subresource, or a box of it, for reading.
   *
   * dx11 copies into a staging texture and maps it (`:802-876`); WebGL2 reads
   * the pixels back with `readPixels` from a framebuffer, which waits for the
   * GPU as dx11's `Map(READ)` does. `synchronize` is ignored, as dx11 ignores
   * it. A compressed texture has no framebuffer attachment and is refused.
   *
   * @param {Tr2TextureSubresource} region The subresource to map.
   * @param {boolean} _synchronize Ignored, as on dx11.
   * @param {object} renderContext The context to map against.
   * @returns {{result: number, data: Uint8Array|null, pitch: number}} The mapping.
   */
  @impl.adapted
  MapForReading(region, _synchronize, renderContext)
  {
    const fail = result => ({ result, data: null, pitch: 0 });

    if (!HasFlag(this._cpuUsage, Tr2CpuUsage.READ)) return fail(ALResult.E_INVALIDCALL);

    const al = RenderContextALOf(renderContext);
    if (!this.IsValid() || !al || !al.IsValid()) return fail(ALResult.E_FAIL);
    if (this._desc.GetType() === TextureType.TEX_TYPE_3D) return fail(ALResult.E_FAIL);
    if (!region.IsValidForBitmap(this._desc)) return fail(ALResult.E_INVALIDARG);
    if (!region.IsSingleSubresource()) return fail(ALResult.E_INVALIDARG);
    if (this._layout.compressed || this._decompressed) return fail(ALResult.E_FAIL);

    const gl = this._gl;
    const mip = region.m_startMipLevel;
    const box = region.HasBox() ? region.m_box : null;
    const x = box ? box.left : 0;
    const y = box ? box.top : 0;
    const width = box ? box.right - box.left : this._desc.GetMipWidth(mip);
    const height = box ? box.bottom - box.top : this._desc.GetMipHeight(mip);
    const pitch = width * GetBytesPerPixel(this._desc.GetFormat());

    const bytes = new Uint8Array(pitch * height);
    const previous = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);

    this._BindForRead(gl, mip, region.m_startFace);
    gl.readPixels(x, y, width, height, this._layout.format, this._layout.type, PixelsFor(gl, this._layout.type, bytes));
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previous);

    this._stagingTexture = this._layout.bgra ? SwapRedBlue(bytes) : bytes;
    return { result: ALResult.S_OK, data: this._stagingTexture, pitch };
  }

  /**
   * Ends a read mapping; the staging copy is let go unless read often, as dx11
   * lets go of its staging texture.
   *
   * @param {object} _renderContext The context the map was made against.
   */
  UnmapForReading(_renderContext)
  {
    if (!HasFlag(this._cpuUsage, Tr2CpuUsage.READ_OFTEN)) this._stagingTexture = null;
  }

  /**
   * Maps one subresource, or a box of it, for writing.
   *
   * Both of dx11's routes hand back CPU memory the upload happens from at
   * unmap (`:891-1006`); WebGL2 cannot map a texture, so `WRITE_OFTEN` takes
   * the same staging route as `WRITE`.
   *
   * @param {Tr2TextureSubresource} region The subresource to map.
   * @param {object} renderContext The context to map against.
   * @returns {{result: number, data: Uint8Array|null, pitch: number}} The mapping.
   */
  @impl.adapted
  MapForWriting(region, renderContext)
  {
    const fail = result => ({ result, data: null, pitch: 0 });

    if (!HasFlag(this._cpuUsage, Tr2CpuUsage.WRITE)) return fail(ALResult.E_INVALIDCALL);

    const al = RenderContextALOf(renderContext);
    if (!this.IsValid() || !al || !al.IsValid()) return fail(ALResult.E_FAIL);
    if (!region.IsValidForBitmap(this._desc)) return fail(ALResult.E_INVALIDARG);
    if (!region.IsSingleSubresource()) return fail(ALResult.E_INVALIDARG);
    if (region.HasBox() && IsCompressedFormat(this._desc.GetFormat())) return fail(ALResult.E_INVALIDARG);

    const mip = region.m_startMipLevel;
    const box = region.HasBox()
      ? { ...region.m_box }
      : { left: 0, top: 0, front: 0, right: this._desc.GetMipWidth(mip), bottom: this._desc.GetMipHeight(mip), back: this._desc.GetMipDepth(mip) };

    if (box.right > this._desc.GetMipWidth(mip) || box.bottom > this._desc.GetMipHeight(mip) || box.back > this._desc.GetMipDepth(mip))
    {
      return fail(ALResult.E_FAIL);
    }

    const pitch = region.HasBox()
      ? (box.right - box.left) * GetBytesPerPixel(this._desc.GetFormat())
      : this._desc.GetMipPitch(mip);
    const rows = region.HasBox() ? box.bottom - box.top : this._desc.GetMipNumRows(mip);
    const depth = Math.max(1, box.back - box.front);

    this._writeStaging = new Uint8Array(pitch * rows * depth);
    this._writeRegion = { mip, face: region.m_startFace, box: region.HasBox() ? box : null, pitch, slicePitch: pitch * rows };

    return { result: ALResult.S_OK, data: this._writeStaging, pitch };
  }

  /**
   * Ends a write mapping by uploading the staging bytes, dx11's
   * `UpdateSubresource` at unmap (`:1008-1050`).
   *
   * @param {object} renderContext The context the map was made against.
   */
  @impl.adapted
  UnmapForWriting(renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid() || !this._writeStaging) return;

    const { mip, face, box, pitch, slicePitch } = this._writeRegion;
    this._Upload(face, mip, box, this._writeStaging, pitch, slicePitch);

    this._writeStaging = null;
    this._writeRegion = null;
  }

  /** Binds the texture, uploads one subresource, and restores the binding. */
  @impl.custom
  _Upload(slice, mip, box, source, pitch, slicePitch)
  {
    const gl = this._gl;
    const previous = gl.getParameter(this._BindingOf(gl, this._target));

    gl.bindTexture(this._target, this._texture);
    this._UploadLevel(gl, this._layout, this._texture, slice, mip, box, source, pitch, slicePitch);
    gl.bindTexture(this._target, previous);
  }

  /**
   * Writes pixels into one subresource (`:1052-1097`).
   *
   * @param {Tr2TextureSubresource} region The subresource to write.
   * @param {ArrayBufferView} source The pixels.
   * @param {number} pitch Bytes per row in the source.
   * @param {number} slicePitch Bytes per slice in the source.
   * @param {object} renderContext The context to write against.
   * @returns {number} An `ALResult` value.
   */
  UpdateSubresource(region, source, pitch, slicePitch, renderContext)
  {
    if (HasFlag(this._cpuUsage, Tr2CpuUsage.WRITE_OFTEN)) return ALResult.E_INVALIDCALL;
    if (!HasFlag(this._cpuUsage, Tr2CpuUsage.WRITE) && !IsWritable(this._gpuUsage)) return ALResult.E_INVALIDCALL;

    const al = RenderContextALOf(renderContext);
    if (!this.IsValid() || !al || !al.IsValid()) return ALResult.E_INVALIDCALL;
    if (!region.IsValidForBitmap(this._desc)) return ALResult.E_INVALIDARG;
    if (!region.IsSingleSubresource()) return ALResult.E_INVALIDARG;
    if (this._renderbuffer) return ALResult.E_INVALIDCALL;

    this._Upload(region.m_startFace, region.m_startMipLevel, region.HasBox() ? region.m_box : null, source, pitch, slicePitch);
    return ALResult.S_OK;
  }

  /**
   * Copies a region from another texture (`:1099-1165`).
   *
   * WebGL2 copies through a framebuffer: the source subresource is attached
   * for reading and `copyTexSubImage` writes it into this texture, mip by mip
   * and face by face, halving the box as dx11 does. Compressed textures have
   * no framebuffer attachment, so a copy involving one fails.
   *
   * @param {Tr2TextureSubresource} destSubresource The region to write.
   * @param {Tr2TextureALWebgl2} source The texture to read.
   * @param {Tr2TextureSubresource} sourceSubresource The region to read.
   * @param {object} renderContext The context to copy against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  CopySubresourceRegion(destSubresource, source, sourceSubresource, renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!this.IsValid() || !al || !al.IsValid()) return ALResult.E_INVALIDCALL;
    if (!source.IsValid()) return ALResult.E_INVALIDARG;
    if (!HasFlag(this._cpuUsage, Tr2CpuUsage.WRITE) && !IsWritable(this._gpuUsage)) return ALResult.E_INVALIDCALL;
    if (this._layout.compressed || source._layout.compressed || !this._texture) return ALResult.E_FAIL;

    const src = CopyRegion(sourceSubresource);
    const dst = CopyRegion(destSubresource);

    if (!(destSubresource.IsSubresourceFull(this._desc) && sourceSubresource.IsSubresourceFull(source.GetDesc())))
    {
      if (!Crop(src, source.GetDesc(), dst, this._desc)) return ALResult.E_FAIL;
    }
    else
    {
      src.ClampToTexture(source.GetDesc());
      dst.ClampToTexture(this._desc);
    }

    const gl = this._gl;
    const previousRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const previousTexture = gl.getParameter(this._BindingOf(gl, this._target));
    const box = { ...src.m_box };
    const mipCount = Math.min(src.GetMipCount(), dst.GetMipCount());

    gl.bindTexture(this._target, this._texture);

    for (let mip = 0; mip < mipCount; ++mip)
    {
      for (let face = 0; face < src.GetFaceCount(); ++face)
      {
        source._BindForRead(gl, src.m_startMipLevel + mip, src.m_startFace + face);

        const destMip = dst.m_startMipLevel + mip;
        const destFace = dst.m_startFace + face;
        const x = dst.m_box.left >> mip;
        const y = dst.m_box.top >> mip;
        const width = Math.max(1, box.right - box.left);
        const height = Math.max(1, box.bottom - box.top);

        if (this._target === gl.TEXTURE_2D_ARRAY || this._target === gl.TEXTURE_3D)
        {
          gl.copyTexSubImage3D(this._target, destMip, x, y, destFace, box.left, box.top, width, height);
        }
        else
        {
          const faceTarget = this._target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + destFace : gl.TEXTURE_2D;
          gl.copyTexSubImage2D(faceTarget, destMip, x, y, box.left, box.top, width, height);
        }
      }

      box.left = box.left >> 1;
      box.right = Math.max(box.right >> 1, box.left + 1);
      box.top = box.top >> 1;
      box.bottom = Math.max(box.bottom >> 1, box.top + 1);
    }

    gl.bindTexture(this._target, previousTexture);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previousRead);

    return ALResult.S_OK;
  }

  /**
   * Regenerates the mip chain (`:1167-1179`).
   *
   * @param {object} _renderContext The context to generate against.
   * @returns {number} An `ALResult` value.
   */
  GenerateMipMaps(_renderContext)
  {
    if (!HasFlag(this._gpuUsage, Tr2GpuUsage.RENDER_TARGET) || !HasFlag(this._gpuUsage, Tr2GpuUsage.SHADER_RESOURCE))
    {
      return ALResult.E_INVALIDCALL;
    }

    if (this._desc.GetTrueMipCount() <= 1) return ALResult.S_OK;

    const gl = this._gl;
    const previous = gl.getParameter(this._BindingOf(gl, this._target));
    gl.bindTexture(this._target, this._texture);
    gl.generateMipmap(this._target);
    gl.bindTexture(this._target, previous);

    return ALResult.S_OK;
  }

  /**
   * Resolves a multisampled texture into a single-sampled one (`:1181-1216`).
   *
   * With one sample it is a plain copy, as on dx11. Otherwise the
   * renderbuffer is blitted into the destination's top mip.
   *
   * @param {Tr2TextureALWebgl2} destination The texture to resolve into.
   * @param {object} renderContext The context to resolve against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Resolve(destination, renderContext)
  {
    if (this._msaa.samples <= 1)
    {
      return destination.CopySubresourceRegion(new Tr2TextureSubresource(), this, new Tr2TextureSubresource(), renderContext);
    }

    const al = RenderContextALOf(renderContext);
    if (!this.IsValid() || !al || !al.IsValid()) return ALResult.E_INVALIDCALL;
    if (!destination.IsValid()) return ALResult.E_INVALIDARG;
    if (!HasFlag(destination.GetCpuUsage(), Tr2CpuUsage.WRITE) && !IsWritable(destination.GetGpuUsage())) return ALResult.E_INVALIDARG;
    if (this._desc.GetWidth() !== destination.GetWidth() || this._desc.GetHeight() !== destination.GetHeight()) return ALResult.E_INVALIDARG;
    if (this._desc.GetFormat() !== destination.GetFormat()) return ALResult.E_INVALIDARG;
    if (destination.GetMsaaDesc().samples > 1) return ALResult.E_INVALIDARG;

    const gl = this._gl;
    const previousRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const previousDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);

    this._BindForRead(gl, 0, 0);

    if (!destination._framebuffer) destination._framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destination._framebuffer);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, destination.GetGpuResource(), 0);

    const width = this._desc.GetWidth(), height = this._desc.GetHeight();
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previousRead);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previousDraw);

    return ALResult.S_OK;
  }

  /**
   * The handle another device could open this texture by.
   *
   * @returns {number} Always zero; WebGL2 shares nothing.
   */
  GetSharedHandle()
  {
    return 0;
  }

  /**
   * Where the shader-resource view sits in the descriptor heap.
   *
   * @returns {number} Carbon's "no index"; dx11 has no heap either.
   */
  GetSrvIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * Where the unordered-access view sits in the descriptor heap.
   *
   * @returns {number} Carbon's "no index".
   */
  GetUavIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * Names the texture. WebGL has no debug names, so it is kept for `Describe`
   * and `GetName`.
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }

  /** The debug name. */
  GetName()
  {
    return this._name;
  }

  /**
   * Describes the texture for the device-resource registry.
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2TextureAL";
    description.width = String(this._desc.GetWidth());
    description.height = String(this._desc.GetHeight());
    description.depth = String(this._desc.GetDepth());
    description.mips = String(this._desc.GetTrueMipCount());
    description.format = String(this._desc.GetFormat());
    description.name = this._name;
  }

  /**
   * The native texture, dx11's `GetResourceDx11`; here the `WebGLTexture`,
   * or null for a multisampled texture.
   *
   * @returns {WebGLTexture|null} The texture.
   */
  GetGpuResource()
  {
    return this._texture;
  }

  /**
   * The texture a shader reads for a colour space: dx11's `m_view[colorSpace]`.
   *
   * The sRGB view of a format with an sRGB twin is a second texture, built on
   * first request from the initial data. Where it cannot be built, the linear
   * texture answers both, which is Carbon's own fallback when an sRGB view
   * fails (`Tr2TextureALDx11.cpp:578-582`). See the head comment.
   *
   * @param {number} [colorSpace] A `Tr2ColorSpace` value.
   * @returns {WebGLTexture|null} The texture.
   */
  @impl.custom
  GetShaderResourceTexture(colorSpace = Tr2ColorSpace.COLOR_SPACE_LINEAR)
  {
    if (colorSpace !== Tr2ColorSpace.COLOR_SPACE_SRGB || !this._texture) return this._texture;

    const format = this._desc.GetFormat();
    const srgb = MakeSrgb(format);

    if (srgb === format) return this._texture;
    if (this._twin) return this._twin;
    if (!this._twinSource) return this._texture;

    const gl = this._gl;
    const layout = this._ResolveLayout(gl, this._desc, this._gpuUsage, srgb);
    if (!layout) return this._texture;

    const twin = this._CreateStorage(gl, layout, this._twinSource);
    this._twinSource = null;
    if (!twin) return this._texture;

    this._twin = twin;
    return twin;
  }

  /**
   * The GL texture target, for binding.
   *
   * @returns {number} A GL target.
   */
  @impl.custom
  GetTarget()
  {
    return this._target;
  }

  /**
   * The multisampled renderbuffer, for attaching as a render target.
   *
   * @returns {WebGLRenderbuffer|null} The renderbuffer.
   */
  @impl.custom
  GetRenderbuffer()
  {
    return this._renderbuffer;
  }

  /**
   * Attaches one subresource of this texture to the framebuffer bound at
   * `target`: dx11's render-target and depth-stencil views
   * (`m_renderTarget[colorSpace + slice * 2]`, `m_depthStencil`), which WebGL2
   * expresses as attachments. A multisampled texture attaches its renderbuffer.
   *
   * @param {number} target `FRAMEBUFFER`, `DRAW_FRAMEBUFFER` or `READ_FRAMEBUFFER`.
   * @param {number} attachment The attachment point.
   * @param {number} mip The mip level.
   * @param {number} slice The array slice, cube face or depth slice.
   */
  @impl.custom
  AttachToFramebuffer(target, attachment, mip, slice)
  {
    const gl = this._gl;

    if (this._renderbuffer)
    {
      gl.framebufferRenderbuffer(target, attachment, gl.RENDERBUFFER, this._renderbuffer);
    }
    else if (this._target === gl.TEXTURE_3D || this._target === gl.TEXTURE_2D_ARRAY)
    {
      gl.framebufferTextureLayer(target, attachment, this._texture, mip, slice);
    }
    else
    {
      const faceTarget = this._target === gl.TEXTURE_CUBE_MAP ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + slice : gl.TEXTURE_2D;
      gl.framebufferTexture2D(target, attachment, faceTarget, this._texture, mip);
    }
  }

  /**
   * The attachment point a depth-stencil texture takes: depth with stencil,
   * or depth alone.
   *
   * @returns {number} `DEPTH_STENCIL_ATTACHMENT` or `DEPTH_ATTACHMENT`.
   */
  @impl.custom
  GetDepthAttachmentPoint()
  {
    const gl = this._gl;
    return this._layout && this._layout.format === gl.DEPTH_STENCIL ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;
  }
}

CjsSchema.define(Tr2TextureALWebgl2, { className: "Tr2TextureALWebgl2", carbon: "Tr2TextureAL" });
