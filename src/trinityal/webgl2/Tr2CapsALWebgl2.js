// Source: trinity/trinityal/dx11/Tr2CapsALDx11.h
// Source: trinity/trinityal/dx11/Tr2CapsALDx11.cpp
//
// What the WebGL2 backend says it can do: dx11's six questions and its platform
// constants, answered for this backend.
//
// A CAP DESCRIBES THIS BACKEND, NOT THE API (the lesson recorded at
// `webgpu/CjsWebgpuCapsAL.js`): a caller reads a cap to choose a branch, and a
// cap that says yes to something the backend then refuses leaves the caller no
// branch to take. So compute is denied until dispatch works here, even though
// the plan is to lower it to fragment passes.

import { CjsSchema, meta } from "#schema";

/**
 * The platform capability constants (`Tr2CapsALDx11.h:9-18`), WebGL2's answers.
 */
export const Tr2Webgl2PlatformCaps = Object.freeze({
  /** A buffer is read through a data texture (`Tr2BufferALWebgl2.GetShaderResourceTexture`). */
  SUPPORTS_BUFFER_SHADER_RESOURCES: true,

  SUPPORTS_BUFFER_COUNTERS: false,

  /** No WebGL2 buffer or texture is created with unordered access. */
  SUPPORTS_UNORDERED_ACCESS: false,

  /** Not until dispatch is lowered to fragment passes; see the head comment. */
  SUPPORTS_COMPUTE: false,

  SUPPORTS_TEXTURE_ARRAYS: true,

  /** WebGL2 cannot sample a multisampled surface: MSAA is a renderbuffer, resolved by blit. */
  SUPPORTS_MSAA_SAMPLE: false,

  SUPPORTS_RENDER_PASS_HINTS: false,

  IS_LOW_PERFORMANCE: false,

  /**
   * WebGL2's guaranteed `MAX_UNIFORM_BLOCK_SIZE`, 16 KiB, which bounds a
   * `std140` constant buffer. An `array`-style buffer is bounded instead by the
   * stage's uniform vector budget, which is device-dependent.
   */
  MAX_CONSTANT_BUFFER_SIZE: 16 * 1024,

  SUPPORTS_RAY_TRACING: false
});


/**
 * The capabilities the WebGL2 backend reports.
 */
export class Tr2CapsALWebgl2
{
  /** The context asked about optional features, or null. */
  _gl = null;

  /**
   * @param {WebGL2RenderingContext|null} [gl] The context the render context owns.
   */
  constructor(gl = null)
  {
    this._gl = gl;
  }

  /**
   * Whether half-precision floats are available. dx11 answers true outright;
   * WebGL2 samples half-float textures in core but renders into them only
   * with a colour-buffer extension, so the device is asked.
   *
   * @returns {boolean} Whether half-float render targets work.
   */
  @meta.adapted
  SupportsFloat16()
  {
    const gl = this._gl;
    if (!gl) return false;

    return Boolean(gl.getExtension("EXT_color_buffer_half_float") || gl.getExtension("EXT_color_buffer_float"));
  }

  /**
   * Whether a shader can read a buffer resource: yes, through a data texture.
   *
   * @returns {boolean} True.
   */
  SupportsGpuBuffer()
  {
    return true;
  }

  /**
   * Whether a swap chain can exist apart from the device's own. dx11 says
   * yes; a WebGL2 context draws to the one canvas it was created on.
   *
   * @returns {boolean} False.
   */
  @meta.adapted
  SupportsStandaloneSwapChain()
  {
    return false;
  }

  /**
   * Whether a vertex shader can sample a texture; WebGL2 guarantees 16 units.
   *
   * @returns {boolean} True.
   */
  SupportsVertexShaderTextures()
  {
    return true;
  }

  /**
   * Whether the display can refresh at a variable rate.
   *
   * @returns {boolean} False.
   */
  SupportsVariableRefreshRate()
  {
    return false;
  }

  /**
   * Whether hardware ray tracing is available.
   *
   * @returns {boolean} False.
   */
  SupportsRaytracing()
  {
    return false;
  }
}

CjsSchema.define(Tr2CapsALWebgl2, { className: "Tr2CapsALWebgl2", carbon: "Tr2CapsAL" });
