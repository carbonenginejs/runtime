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
// - `TA_BORDER` has no GL wrap mode. It is set to `CLAMP_TO_EDGE` here, which
//   is right wherever the border colour matches the edge and wrong elsewhere
//   (decals need the real thing); the WebGPU backend emulates border addressing
//   in the shader (runtime `038d1e0b`), and the GLSL path will need the same.
// - `TA_MIRROR_ONCE` has no GL mode either; `MIRRORED_REPEAT` is used, which
//   agrees inside [-1, 2] and repeats outside it where D3D clamps.
// - `MipLODBias` has no sampler parameter in WebGL2. It is ignored here.
// - Anisotropy needs `EXT_texture_filter_anisotropic`; without it the sampler
//   filters linearly.
//
// `g_forceAnisotropy` is Carbon's shared AL global
// (`trinityal/src/Tr2SamplerStateAL.cpp:17`, default 0, registered as the
// Trinity setting `forceAnisotropy`). No shared JavaScript home exists for it
// yet, so it is the static `forceAnisotropy` on this class.

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
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
    case TextureAddressMode.TA_MIRROR_ONCE: return gl.MIRRORED_REPEAT;
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

  /** m_name */
  _name = "";

  /** The context the sampler was created on. */
  _gl = null;

  /**
   * Creates the sampler from a description, following dx11's field mapping
   * (`Tr2SamplerStateALDx11.cpp:23-56`).
   *
   * @param {import("../Tr2HalHelperStructures/Tr2SamplerDescription.js").Tr2SamplerDescription} description
   *   The authored state.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(description, renderContext)
  {
    const al = RenderContextALOf(renderContext);
    const gl = al ? al.GetWebgl2() : null;
    if (!gl) return ALResult.E_FAIL;

    this._Reset();

    const sampler = gl.createSampler();
    if (!sampler) return ALResult.E_OUTOFMEMORY;

    const force = Tr2SamplerStateALWebgl2.forceAnisotropy;
    const anisotropic = force !== 1 && (description.m_minFilter === TextureFilter.TF_ANISOTROPIC
      || description.m_magFilter === TextureFilter.TF_ANISOTROPIC
      || description.m_mipFilter === TextureFilter.TF_ANISOTROPIC);

    // An anisotropic filter is linear in every stage (D3D11_ENCODE_ANISOTROPIC_FILTER).
    const minLinear = anisotropic || description.m_minFilter !== TextureFilter.TF_POINT;
    const magLinear = anisotropic || description.m_magFilter !== TextureFilter.TF_POINT;
    const mipLinear = anisotropic || (description.m_mipFilter !== TextureFilter.TF_POINT
      && description.m_mipFilter !== TextureFilter.TF_NONE);

    gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, MinFilter(gl, minLinear, mipLinear));
    gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, magLinear ? gl.LINEAR : gl.NEAREST);
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, WrapMode(gl, description.m_addressU));
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, WrapMode(gl, description.m_addressV));
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_R, WrapMode(gl, description.m_addressW));

    // dx11 pins MaxLOD to MinLOD when there is no mip filter.
    const maxLOD = description.m_mipFilter === TextureFilter.TF_NONE ? description.m_minLOD : description.m_maxLOD;
    gl.samplerParameterf(sampler, gl.TEXTURE_MIN_LOD, description.m_minLOD);
    gl.samplerParameterf(sampler, gl.TEXTURE_MAX_LOD, Math.min(maxLOD, 1000));

    if (description.m_isComparisonFilter)
    {
      gl.samplerParameteri(sampler, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.samplerParameteri(sampler, gl.TEXTURE_COMPARE_FUNC, GL_NEVER + description.m_comparisonFunc - 1);
    }

    if (anisotropic)
    {
      const extension = gl.getExtension("EXT_texture_filter_anisotropic");
      if (extension)
      {
        const limit = gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        const level = force ? force : description.m_maxAnisotropy;
        gl.samplerParameterf(sampler, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.max(1, Math.min(level, limit)));
      }
    }

    this._gl = gl;
    this._samplerState = sampler;

    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy`, before the registry is left. */
  _Reset()
  {
    if (this._gl && this._samplerState) this._gl.deleteSampler(this._samplerState);

    this._samplerState = null;
    this._gl = null;
  }

  /** Releases the sampler and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Where the sampler sits in the descriptor heap.
   *
   * @returns {number} Carbon's "no index"; dx11 has no heap either.
   */
  GetIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * Whether the sampler exists on the device.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._samplerState !== null;
  }

  /**
   * Which memory class this sampler occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the sampler for the device-resource registry, with dx11's keys.
   *
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
  @impl.custom
  GetGpuResource()
  {
    return this._samplerState;
  }
}

CjsSchema.define(Tr2SamplerStateALWebgl2, { className: "Tr2SamplerStateALWebgl2", carbon: "Tr2SamplerStateAL" });
