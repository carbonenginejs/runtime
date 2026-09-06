// Source: trinity/trinityal/stub/Tr2CapsALStub.cpp
// Source: trinity/trinityal/stub/Tr2CapsALStub.h
//
// What the GPU-free backend says it can do.
//
// Every value here is Carbon's stub answer, and the interesting thing about
// them is that they are NOT all "no". The stub claims float16, vertex-shader
// textures, compute, texture arrays and a standalone swap chain, and denies
// GPU buffers, unordered access, buffer shader resources, variable refresh rate
// and ray tracing - and it declares itself a low-performance platform.
//
// That matters because a caller branches on these. A backend that answered "no"
// to everything would drive Trinity down paths a real device never takes, which
// is the opposite of what a headless engine carrying correct data is for.

/**
 * The platform capability constants (`Tr2CapsALStub.h:10-19`).
 *
 * Carbon spells these as preprocessor defines the compiler folds away; here
 * they are values, because nothing folds them away at build time.
 */
export const Tr2StubPlatformCaps = Object.freeze({
  SUPPORTS_BUFFER_SHADER_RESOURCES: false,
  SUPPORTS_BUFFER_COUNTERS: false,
  SUPPORTS_UNORDERED_ACCESS: false,
  SUPPORTS_COMPUTE: true,
  SUPPORTS_TEXTURE_ARRAYS: true,
  SUPPORTS_MSAA_SAMPLE: true,
  SUPPORTS_RENDER_PASS_HINTS: false,
  IS_LOW_PERFORMANCE: true,
  MAX_CONSTANT_BUFFER_SIZE: 4 * 1024,
  SUPPORTS_RAY_TRACING: false
});


/**
 * The capabilities the stub backend reports.
 */
export class Tr2CapsALStub
{
  /**
   * Whether half-precision floats are available.
   *
   * @returns {boolean} True.
   */
  SupportsFloat16()
  {
    return true;
  }

  /**
   * Whether a shader can read a buffer resource.
   *
   * @returns {boolean} False; the stub has no buffer views.
   */
  SupportsGpuBuffer()
  {
    return false;
  }

  /**
   * Whether a swap chain can exist apart from the device's own.
   *
   * @returns {boolean} True.
   */
  SupportsStandaloneSwapChain()
  {
    return true;
  }

  /**
   * Whether a vertex shader can sample a texture.
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
   * @returns {boolean} False; Carbon's stub fails every ray-tracing path.
   */
  SupportsRaytracing()
  {
    return false;
  }
}
