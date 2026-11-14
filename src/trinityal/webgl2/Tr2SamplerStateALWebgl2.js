// Source: trinity/trinityal/dx11/Tr2SamplerStateALDx11.h
// Source: trinity/trinityal/dx11/Tr2SamplerStateALDx11.cpp
// Source: trinity/trinityal/include/Tr2SamplerStateAL.h
//
// The WebGL2 sampler state: a `WebGLSampler`.
//
// WebGL2 has sampler objects, bound per texture unit beside the texture, so
// dx11's `ID3D11SamplerState` maps onto one directly. The pairing of a texture
// with its sampler lives only in the DXBC operands; the emitter records it and
// the render context binds both to the same unit.
//
// WHAT DOES NOT MAP, and what happens instead:
//
// - `TA_BORDER` and `TA_MIRROR_ONCE` have no GL wrap mode. Both use
//   `CLAMP_TO_EDGE`; translated sampling emulates them using the resolved
//   Carbon modes retained here and uploaded by the resource-set binding path.
// - `MipLODBias` has no sampler parameter in WebGL2. It is ignored here.
// - Anisotropy needs `EXT_texture_filter_anisotropic`; without it the sampler
//   filters linearly.
//
// `g_forceAnisotropy` is Carbon's shared AL global
// (`trinityal/src/Tr2SamplerStateAL.cpp:17`, default 0, registered as the
// Trinity setting `forceAnisotropy`). No shared JavaScript home exists for it
// yet, so it is the static `forceAnisotropy` on this class.

import { CjsSchema } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { NormalizeSamplerDescription } from "../Tr2HalHelperStructures/Tr2SamplerDescription.js";
import { TextureAddressMode, TextureFilter } from "../../global/consts/renderContext/index.js";


/** Carbon's "no descriptor heap index". */
const NO_HEAP_INDEX = 0xffffffff;

/** GL's `NEVER`; Carbon's `CompareFunc` runs in the same order from 1. */
const GL_NEVER = 0x0200;


/**
 * The GL wrap mode for a Carbon address mode. See the head comment for the
 * two that have none.
 *
 * @param {WebGL2RenderingContext} gl The context whose enums to use.
 * @param {number} mode A `TextureAddressMode` value.
 * @returns {number} A GL wrap mode.
 */
function WrapMode(gl, mode)
{
  switch (mode)
  {
    case TextureAddressMode.TA_WRAP: return gl.REPEAT;
    case TextureAddressMode.TA_MIRROR: return gl.MIRRORED_REPEAT;
    default: return gl.CLAMP_TO_EDGE;
  }
}

/**
 * The GL minification filter for dx11's basic-filter encoding: `min` and `mip`
 * together, with `TF_NONE` on the mip read as point, as dx11 reads it.
 *
 * @param {WebGL2RenderingContext} gl The context whose enums to use.
 * @param {boolean} minLinear Whether minification is linear.
 * @param {boolean} mipLinear Whether mip selection is linear.
 * @returns {number} A GL filter.
 */
function MinFilter(gl, minLinear, mipLinear)
{
  if (minLinear) return mipLinear ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR_MIPMAP_NEAREST;
  return mipLinear ? gl.NEAREST_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST;
}


/**
 * A sampler state on a WebGL2 device.
 *
 * Carbon: Tr2SamplerStateAL (trinity/trinityal/dx11/Tr2SamplerStateALDx11.h:12)
 */
export class Tr2SamplerStateALWebgl2 extends Tr2DeviceResourceAL
{
  /**
   * Carbon's `g_forceAnisotropy`: 0 uses the description's anisotropy, 1 turns
   * anisotropic filtering off, anything else forces that level.
   *
   * @type {number}
   */
  static forceAnisotropy = 0;

  /** m_samplerState: the `WebGLSampler`, or null. */
  _samplerState = null;

  /** Cached point sampler for shader-filtered raw depth; allocated on first use. */
  _rawDepthSampler = null;

  /** m_name */
  _name = "";

  /** The context the sampler was created on. */
  _gl = null;

  /** The normalized Carbon description, retained for shader-emulated modes. */
  _description = null;

  /**
   * Creates the sampler from a description, following dx11's field mapping
   * (`Tr2SamplerStateALDx11.cpp:23-56`).
   *
   * @adapted the description is normalised first, as the WebGPU backend does
   *   (`CjsWebgpuSamplerStateAL.Create`). Descriptions reach the AL in two
   *   spellings - the effect reader's, with raw float bits (`minLODRaw`,
   *   `maxLODRaw`, `mipLODBiasRaw`, `borderColorRaw`) and `comparison` for the
   *   flag, and the override's plain floats - and Carbon's single struct is the
   *   normal form both reduce to.
   * @param {object} description A `Tr2SamplerDescription`, either spelling.
   *   The authored state.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(description, renderContext)
  {
    const al = RenderContextALOf(renderContext);
    const gl = al ? al.GetWebgl2() : null;
    if (!gl) return ALResult.E_FAIL;

    const normalized = NormalizeSamplerDescription(description);
    if (!normalized) return ALResult.E_INVALIDARG;

    this._Reset();

    const sampler = gl.createSampler();
    if (!sampler) return ALResult.E_OUTOFMEMORY;

    const force = Tr2SamplerStateALWebgl2.forceAnisotropy;
    const anisotropic = force !== 1 && (normalized.minFilter === TextureFilter.TF_ANISOTROPIC
      || normalized.magFilter === TextureFilter.TF_ANISOTROPIC
      || normalized.mipFilter === TextureFilter.TF_ANISOTROPIC);

    // An anisotropic filter is linear in every stage (D3D11_ENCODE_ANISOTROPIC_FILTER).
    const minLinear = anisotropic || normalized.minFilter !== TextureFilter.TF_POINT;
    const magLinear = anisotropic || normalized.magFilter !== TextureFilter.TF_POINT;
    const mipLinear = anisotropic || (normalized.mipFilter !== TextureFilter.TF_POINT
      && normalized.mipFilter !== TextureFilter.TF_NONE);

    gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, MinFilter(gl, minLinear, mipLinear));
    gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, magLinear ? gl.LINEAR : gl.NEAREST);
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, WrapMode(gl, normalized.addressU));
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, WrapMode(gl, normalized.addressV));
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_R, WrapMode(gl, normalized.addressW));

    // dx11 pins MaxLOD to MinLOD when there is no mip filter.
    const maxLOD = normalized.mipFilter === TextureFilter.TF_NONE ? normalized.minLOD : normalized.maxLOD;
    gl.samplerParameterf(sampler, gl.TEXTURE_MIN_LOD, normalized.minLOD);
    gl.samplerParameterf(sampler, gl.TEXTURE_MAX_LOD, Math.min(maxLOD, 1000));

    if (normalized.isComparisonFilter)
    {
      gl.samplerParameteri(sampler, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.samplerParameteri(sampler, gl.TEXTURE_COMPARE_FUNC, GL_NEVER + normalized.comparisonFunc - 1);
    }

    if (anisotropic)
    {
      const extension = gl.getExtension("EXT_texture_filter_anisotropic");
      if (extension)
      {
        const limit = gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        const level = force ? force : normalized.maxAnisotropy;
        gl.samplerParameterf(sampler, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.max(1, Math.min(level, limit)));
      }
    }

    this._gl = gl;
    this._samplerState = sampler;
    this._description = normalized;

    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy`, before the registry is left. */
  _Reset()
  {
    if (this._gl && this._samplerState) this._gl.deleteSampler(this._samplerState);

    if (this._gl && this._rawDepthSampler) this._gl.deleteSampler(this._rawDepthSampler);

    this._rawDepthSampler = null;
    this._samplerState = null;
    this._gl = null;
    this._description = null;
  }

  /**
   * Releases the sampler and leaves the device-resource registry.
   *
   * @implemented
   */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Where the sampler sits in the descriptor heap.
   *
   * @implemented
   * @returns {number} Carbon's "no index"; dx11 has no heap either.
   */
  GetIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * Whether the sampler exists on the device.
   *
   * @implemented
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._samplerState !== null;
  }

  /**
   * Which memory class this sampler occupies.
   *
   * @implemented
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the sampler for the device-resource registry, with dx11's keys.
   *
   * @implemented
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2SamplerStateAL";
    description.name = this._name;
  }

  /**
   * Names the sampler. WebGL has no debug names, so it is kept for `Describe`.
   *
   * @adapted
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }

  /**
   * The `WebGLSampler` the render context binds with `bindSampler`. dx11's
   * render context reads `m_samplerState` as a friend.
   *
   * @returns {WebGLSampler|null} The sampler.
   */
  GetGpuResource()
  {
    return this._samplerState;
  }

  /**
   * Supplies point fetches for shader-emulated linear minification of raw depth.
   * @adapted GLES 3.0 section 3.8.13 forbids filtering non-comparison depth.
   *   Only this exact single-mip shader helper's sampler contract is accepted;
   *   authored color, comparison and other filtering states remain unchanged.
   * @returns {WebGLSampler|null} The cached sampler, or null for unsupported state.
   */
  GetRawDepthLinearResource()
  {
    const desc = this._description;
    if (!this._samplerState || desc.isComparisonFilter
      || desc.minFilter !== TextureFilter.TF_LINEAR || desc.magFilter !== TextureFilter.TF_POINT
      || desc.mipFilter !== TextureFilter.TF_POINT || desc.mipLODBias !== 0
      || desc.addressU !== TextureAddressMode.TA_CLAMP || desc.addressV !== TextureAddressMode.TA_CLAMP
      || desc.minLOD > 0 || desc.maxLOD < 0) return null;

    if (!this._rawDepthSampler)
    {
      const gl = this._gl;
      const sampler = gl.createSampler();
      if (!sampler) return null;

      gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      this._rawDepthSampler = sampler;
    }

    return this._rawDepthSampler;
  }

  /**
   * The resolved Carbon state before GL substitutes unsupported address modes.
   * Native DX11 keeps these modes in ID3D11SamplerState; WebGL cannot query them
   * back after substitution. This backend accessor also exists on WebGPU.
   * @adapted WebGL loses native address modes after sampler substitution.
   * @returns {object|null} The normalized description, or null before creation.
   */
  GetDescription()
  {
    return this._description;
  }
}

CjsSchema.decorateMethod(Tr2SamplerStateALWebgl2, "Create");
// States against dx11/Tr2SamplerStateALDx11.cpp. GetIndexInHeap is 0xffffffff, as dx11. Donor: the dx11 body of the same Carbon class. Destroy/IsValid/GetMemoryClass/Describe are the same contract on GL objects; SetName stores the name but sets no native debug label, which WebGL has no call for.
CjsSchema.meta.define("Tr2SamplerStateALWebgl2")(Tr2SamplerStateALWebgl2);
CjsSchema.meta.exposureChainTo(Tr2DeviceResourceAL)(Tr2SamplerStateALWebgl2);
